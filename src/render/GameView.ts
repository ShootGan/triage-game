import * as THREE from 'three';
import type { TriageCategory } from '../engine/triage';
import type { Scenario, ScenarioPatient, PatientPose } from '../scenarios/types';
import type { GameViewFactory, IGameView, ScreenPoint } from './types';
import { PixelPipeline, type PixelPipelineOptions } from './pixelPipeline';
import { CameraRig } from './camera';
import { Kit } from '../world/materials';
import { buildTerrain } from '../world/terrain';
import { PROP_HALF_SIZE } from '../scenarios/propSizes';
import { buildCollectionPoint, buildMedBag, buildProp, insideFootprint, propFootprint, type Footprint } from '../world/props';
import { createHuman, type Human } from '../world/human';
import { applyPose, placeHuman, walkCycle, type LyingBackOptions, type PoseName } from '../world/poses';

export type GameViewOptions = PixelPipelineOptions & {
  /** Tylko do debugowania (render-demo): rysuje obrysy rekwizytów (PROP_HALF_SIZE) na ziemi. */
  debugFootprints?: boolean;
};

const TAG_COLOR: Record<TriageCategory, string> = {
  red: '#d6303a',
  yellow: '#f2c230',
  green: '#3fa34d',
  black: '#1a1c2c',
};

const POSE_MAP: Record<PatientPose, PoseName> = {
  back: 'lyingBack',
  front: 'lyingFront',
  sitting: 'sitting',
  standing: 'standing',
};

const OVERVIEW_ELEV = 20;
const FOCUS_ELEV = 22;
const CLICK_SLOP_PX = 5;
/** Przesunięcie kadru przy badaniu (ułamek połowy szerokości widoku) — miejsce na panel po prawej. */
const FOCUS_PANEL_SHIFT = 0.4;
/** Przesunięcie kadru przeglądu w dół (ułamek połowy wysokości widoku) — miejsce na pasek HUD. */
const OVERVIEW_HUD_SHIFT = 0.12;
const POOL_COLOR = '#7a1010';
const POOL_START = 0.7;
const POOL_MAX = 1.6;
const POOL_GROW_PER_SEC = 0.008;
const MEDIC_SPEED = 2.4; // m/s — szybki marsz
const BLEED_BEAT_HZ = 2.2; // wytryski krwi na sekundę (tachykardia)
const WALKER_GAP = 0.9;

interface WalkState {
  /** Kolejne punkty trasy (omijanie pojazdów i leżących); ostatni = cel. */
  path: THREE.Vector3[];
  faceY: number;
  speed: number;
  phase: number;
  delay: number;
}

interface MedicMove {
  path: THREE.Vector3[];
  rotY: number;
  pose: PoseName;
  phase: number;
}

/** Widoczny krwotok tętniczy: rana na udzie + pulsujące krople krwi. */
interface Bleed {
  wound: THREE.Object3D;   // punkt rany (na powierzchni uda)
  axis: THREE.Object3D;    // środek uda na wysokości rany — kierunek wytrysku = rana − oś
  drops: THREE.Mesh[];
  vel: THREE.Vector3[];
  beat: number;
}

interface PatientEntity {
  data: ScenarioPatient;
  bleed: Bleed | null;
  human: Human;
  breathOmega: number; // rad/s (0 = brak oddechu)
  breathOffset: number;
  pool: THREE.Mesh | null;
  bleedingControlled: boolean;
  tourniquet: THREE.Group | null;
  tag: THREE.Mesh | null;
  walk: WalkState | null;
  walked: boolean;
}

/** Deterministyczny pseudolosowy [0,1) z id pacjenta — wariacje pozy. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function lyingVariation(id: string): LyingBackOptions {
  const r = hash01(id + '#k');
  return {
    kneeUp: r < 0.35 ? -1 : r < 0.7 ? 0 : 1,
    armOut: [0.2 + hash01(id + '#a0') * 1.0, 0.1 + hash01(id + '#a1') * 0.8],
    headTurn: (hash01(id + '#h') - 0.5) * 1.0,
  };
}

const _v = new THREE.Vector3();
const _chest = new THREE.Vector3(0, 0.35, 0);

export class GameView implements IGameView {
  private readonly pipe: PixelPipeline;
  private readonly rig = new CameraRig();
  private readonly kit = new Kit();
  private readonly scene = new THREE.Scene();
  private readonly patients = new Map<string, PatientEntity>();
  private readonly patientRoots: THREE.Object3D[] = [];
  private readonly footprints: Footprint[] = [];
  private readonly medic: Human;
  private readonly bag: THREE.Group;
  private readonly poolGeo: THREE.CircleGeometry;
  private readonly dropGeo = this.kit.own(new THREE.BoxGeometry(0.045, 0.045, 0.045));
  private readonly centre = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly clickCbs: Array<(id: string) => void> = [];
  private readonly frameCbs: Array<() => void> = [];
  private focusedId: string | null = null;
  private medicMove: MedicMove | null = null;
  private arriveCb: (() => void) | null = null;
  /** Docelowe miejsce ratownika (po dojściu). */
  private readonly medicGoal = new THREE.Vector3();
  private lastTime = -1;
  private elapsed = 0;
  private disposed = false;

  // wejście
  private pointerDown: { id: number; x: number; y: number; lastX: number; dragging: boolean } | null = null;
  private hoverPos: { x: number; y: number } | null = null;
  private hoverDirty = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly scenario: Scenario, opts: GameViewOptions = {}) {
    this.pipe = new PixelPipeline(canvas, opts);
    this.pipe.onResize = () => {
      this.rig.aspect = this.pipe.aspect;
      this.rig.apply();
    };
    this.rig.aspect = this.pipe.aspect;

    const scene = this.scene;
    scene.background = new THREE.Color('#9fc4d8');
    this.computeCentre();

    // Światło
    scene.add(new THREE.HemisphereLight('#d8e6ff', '#4a4a3a', 1.3));
    const sun = new THREE.DirectionalLight('#fff0d8', 2.8);
    const c = this.centre;
    sun.position.set(c.x + 8, 18, c.z + 10);
    sun.target.position.set(c.x, 0, c.z);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    const ext = Math.max(14, this.sceneRadius() + 4);
    Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext });
    scene.add(sun, sun.target);

    // Teren i rekwizyty
    let maxAbs = 0;
    for (const p of [...scenario.patients.map((x) => x.position), ...scenario.props.map((x) => x.position), scenario.collectionPoint]) {
      maxAbs = Math.max(maxAbs, Math.abs(p[0]), Math.abs(p[1]));
    }
    // dekoracje terenu omijają pacjentów, rekwizyty i punkt zbiórki
    const keepOut: Array<[number, number, number]> = [
      ...scenario.patients.map((p): [number, number, number] => [p.position[0], p.position[1], 1.6]),
      ...scenario.props.map((p): [number, number, number] => {
        const f = PROP_HALF_SIZE[p.kind];
        return [p.position[0], p.position[1], f ? Math.hypot(f[0], f[1]) + 0.5 : 1.5];
      }),
      [scenario.collectionPoint[0], scenario.collectionPoint[1], 4],
    ];
    buildTerrain(this.kit, scene, Math.max(80, Math.ceil((maxAbs + 30) / 10) * 20), scenario.terrain ?? 'road', keepOut);
    for (const pr of scenario.props) {
      buildProp(this.kit, scene, pr.kind, pr.position[0], pr.position[1], pr.rotation);
      const f = propFootprint(pr.kind, pr.position[0], pr.position[1], pr.rotation);
      if (f) this.footprints.push(f);
    }
    if (opts.debugFootprints) this.drawFootprints();

    // Punkt zbiórki — plandeka mieści wszystkich chodzących w siatce
    const walkers = scenario.patients.filter((p) => p.vitals.canWalk).length;
    const cols = Math.max(2, Math.ceil(Math.sqrt(walkers)));
    buildCollectionPoint(this.kit, scene, scenario.collectionPoint[0], scenario.collectionPoint[1], cols * WALKER_GAP + 1.0);

    // Pacjenci
    this.poolGeo = this.kit.own(new THREE.CircleGeometry(0.42, 12));
    scenario.patients.forEach((p, i) => this.addPatient(p, i));

    // Ratownik + torba
    this.medic = createHuman(this.kit, { shirt: '#d6303a', pants: '#8f1d2c', hair: '#3a2a20', sleeves: 'long', medic: true, shoes: '#1a1a1e' });
    scene.add(this.medic.root);
    this.bag = buildMedBag(this.kit, scene);
    this.placeMedicOverview(true);

    // Kamera — przegląd od razu, bez animacji
    this.setOverviewGoal();
    this.rig.snap();
    this.pipe.setOutlineZoom(this.rig.cur.zoom);

    // Wejście
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.pipe.renderer.setAnimationLoop(this.tick);
  }

  // ---------- Budowa ----------

  /** Debug: żółte prostokąty obrysów (ten sam obrys, którego używa planowanie tras). */
  private drawFootprints(): void {
    const mat = this.kit.own(new THREE.LineBasicMaterial({ color: '#f2e030', depthTest: false }));
    for (const f of this.footprints) {
      const c = Math.cos(f.rotY);
      const s = Math.sin(f.rotY);
      // lokalny (lx, lz) → świat: x = c·lx + s·lz, z = −s·lx + c·lz (rotacja Y jak w Object3D)
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
        const lx = a * f.halfW;
        const lz = b * f.halfD;
        return new THREE.Vector3(f.x + c * lx + s * lz, 0.06, f.z - s * lx + c * lz);
      });
      const line = new THREE.LineLoop(this.kit.own(new THREE.BufferGeometry().setFromPoints(pts)), mat);
      line.renderOrder = 10;
      this.scene.add(line);
    }
  }

  private computeCentre(): void {
    const ps = this.scenario.patients;
    this.centre.set(0, 0, 0);
    if (ps.length === 0) return;
    for (const p of ps) this.centre.add(_v.set(p.position[0], 0, p.position[1]));
    this.centre.divideScalar(ps.length);
  }

  private sceneRadius(): number {
    let r = 0;
    const c = this.centre;
    for (const p of [...this.scenario.patients.map((x) => x.position), ...this.scenario.props.map((x) => x.position)]) {
      r = Math.max(r, Math.hypot(p[0] - c.x, p[1] - c.z));
    }
    return r;
  }

  private addPatient(p: ScenarioPatient, index: number): void {
    const a = p.appearance;
    const h = createHuman(this.kit, {
      skin: a.skin,
      hair: a.hair,
      hairStyle: a.hairStyle,
      beard: a.beard,
      shirt: a.shirt,
      pants: a.pants,
      sleeves: a.sleeves ?? 'short',
      female: a.sex === 'f',
      child: a.child,
    });
    h.root.userData.patientId = p.id;
    this.scene.add(h.root);
    this.patientRoots.push(h.root);
    applyPose(h, POSE_MAP[p.pose], lyingVariation(p.id));
    placeHuman(h, p.position[0], p.position[1], p.rotation);
    h.root.updateMatrixWorld(true);

    const br = p.vitals.breathing;
    const ent: PatientEntity = {
      data: p,
      bleed: null,
      human: h,
      breathOmega: br.spontaneous && br.rate > 0 ? (2 * Math.PI * br.rate) / 60 : 0,
      breathOffset: hash01(p.id + '#b') * Math.PI * 2,
      pool: null,
      bleedingControlled: false,
      tourniquet: null,
      tag: null,
      walk: null,
      walked: false,
    };

    if (p.majorBleeding) {
      // kałuża pod udem (na tej nodze później opaska uciskowa)
      h.legs[0].hip.localToWorld(_v.set(0, -0.22, 0));
      const pool = new THREE.Mesh(this.poolGeo, this.kit.toon(POOL_COLOR));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(_v.x, 0.025 + index * 0.0008, _v.z);
      pool.scale.setScalar(POOL_START);
      pool.receiveShadow = true;
      this.scene.add(pool);
      ent.pool = pool;
      ent.bleed = this.buildWound(h);
    }
    this.patients.set(p.id, ent);
  }

  /** Rana na przedniej powierzchni uda (prawa noga = legs[0]): przesiąknięta krwią nogawka, rana, krople. */
  private buildWound(h: Human): Bleed {
    const hip = h.legs[0].hip;
    const y = -0.26;
    this.kit.part(new THREE.CylinderGeometry(0.079, 0.075, 0.17, 12), '#7a0c0c', hip, 0, y, 0); // nogawka we krwi
    this.kit.box(0.05, 0.085, 0.02, '#2a0303', 0, y, 0.077, hip); // rana
    this.kit.box(0.03, 0.05, 0.012, '#c01818', 0.01, y, 0.086, hip); // świeża krew w ranie
    const wound = this.kit.joint(hip, 0, y, 0.09);
    const axis = this.kit.joint(hip, 0, y, 0);
    const geo = this.dropGeo;
    const mat = this.kit.toon('#c01818');
    const drops: THREE.Mesh[] = [];
    const vel: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const d = new THREE.Mesh(geo, mat);
      d.visible = false;
      this.scene.add(d);
      drops.push(d);
      vel.push(new THREE.Vector3());
    }
    return { wound, axis, drops, vel, beat: 0 };
  }

  private stepBleed(e: PatientEntity, b: Bleed, dt: number): void {
    // wytrysk w rytm tętna (ok. 130/min), dopóki krwotok nie jest zatamowany
    if (!e.bleedingControlled) {
      const prev = Math.floor(b.beat);
      b.beat += dt * BLEED_BEAT_HZ;
      if (Math.floor(b.beat) !== prev) {
        const p = b.wound.getWorldPosition(new THREE.Vector3());
        const dir = p.clone().sub(b.axis.getWorldPosition(_v)).normalize();
        let n = 4;
        for (let i = 0; i < b.drops.length && n > 0; i++) {
          const d = b.drops[i];
          if (d.visible) continue;
          d.visible = true;
          d.position.copy(p);
          b.vel[i].copy(dir).multiplyScalar(0.7 + Math.random() * 0.6)
            .add(_v.set((Math.random() - 0.5) * 0.5, 0.9 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5));
          n--;
        }
      }
    }
    for (let i = 0; i < b.drops.length; i++) {
      const d = b.drops[i];
      if (!d.visible) continue;
      const v = b.vel[i];
      v.y -= 9.8 * dt;
      d.position.addScaledVector(v, dt);
      if (d.position.y <= 0.03) d.visible = false;
    }
  }

  // ---------- Ratownik ----------

  private placeMedicAt(x: number, z: number, rotY: number, pose: PoseName): void {
    const m = this.medic;
    applyPose(m, pose);
    placeHuman(m, x, z, rotY);
    // torba obok ratownika (z boku, lekko z tyłu — nie wchodzi na pacjenta)
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const lx = -0.6, lz = -0.2;
    this.bag.position.set(x + c * lx + s * lz, 0, z - s * lx + c * lz);
    this.bag.rotation.y = rotY + 0.4;
  }

  /** Ratownik idzie na miejsce (z torbą), po dojściu przyjmuje pozę. instant = bez animacji. */
  private moveMedic(x: number, z: number, rotY: number, pose: PoseName, instant = false): void {
    this.medicGoal.set(x, 0, z);
    const from = this.medic.root.position;
    if (instant || Math.hypot(x - from.x, z - from.z) < 0.3) {
      this.medicMove = null;
      this.placeMedicAt(x, z, rotY, pose);
      return;
    }
    applyPose(this.medic, 'standing');
    this.medicMove = { path: this.planPath(from, this.medicGoal, null), rotY, pose, phase: 0 };
  }

  private spotFree(x: number, z: number, ignore: string | null, clearance: number): boolean {
    for (const f of this.footprints) if (insideFootprint(f, x, z, 0.5)) return false;
    for (const e of this.patients.values()) {
      if (e.data.id === ignore) continue;
      const r = e.human.root.position;
      if (Math.hypot(r.x - x, r.z - z) < clearance) return false;
    }
    return true;
  }

  /** Odcinek wolny od pojazdów i innych pacjentów (końcówki pomijane — tam stoi idący i cel). */
  private segmentClear(a: THREE.Vector3, b: THREE.Vector3, ignore: string | null): boolean {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.ceil(len / 0.25);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (t * len < 0.6 || (1 - t) * len < 0.9) continue;
      if (!this.spotFree(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, ignore, 0.6)) return false;
    }
    return true;
  }

  /** Prosta trasa z jednym lub dwoma punktami pośrednimi, jeśli coś stoi na drodze. */
  private planPath(from: THREE.Vector3, to: THREE.Vector3, ignore: string | null): THREE.Vector3[] {
    const a = new THREE.Vector3(from.x, 0, from.z);
    const b = to.clone();
    if (this.segmentClear(a, b, ignore)) return [b];
    const dir = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    // jeden punkt pośredni z boku
    for (const off of [1.2, 2.2, 3.5, 5, 7]) {
      for (const s of [1, -1]) {
        const w = mid.clone().addScaledVector(perp, off * s);
        if (this.spotFree(w.x, w.z, ignore, 0.6) && this.segmentClear(a, w, ignore) && this.segmentClear(w, b, ignore)) return [w, b];
      }
    }
    // dwa punkty pośrednie (obejście dłuższej przeszkody, np. autobusu)
    for (const off of [2.5, 4, 6, 8]) {
      for (const s of [1, -1]) {
        const w1 = a.clone().lerp(b, 0.25).addScaledVector(perp, off * s);
        const w2 = a.clone().lerp(b, 0.75).addScaledVector(perp, off * s);
        if (this.segmentClear(a, w1, ignore) && this.segmentClear(w1, w2, ignore) && this.segmentClear(w2, b, ignore)) return [w1, w2, b];
      }
    }
    return [b];
  }

  private placeMedicOverview(instant = false): void {
    const c = this.centre;
    let best: [number, number] = [c.x, c.z];
    // spirala wokół środka sceny — pierwsze wolne miejsce
    outer: for (let ring = 0; ring < 12; ring++) {
      const n = Math.max(1, ring * 8);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const x = c.x + Math.cos(a) * ring * 0.6;
        const z = c.z + Math.sin(a) * ring * 0.6;
        if (this.spotFree(x, z, null, 1.6)) { best = [x, z]; break outer; }
      }
    }
    // twarzą do najbliższego pacjenta
    let rotY = 0;
    let dMin = Infinity;
    for (const e of this.patients.values()) {
      const r = e.human.root.position;
      const d = Math.hypot(r.x - best[0], r.z - best[1]);
      if (d < dMin) { dMin = d; rotY = Math.atan2(r.x - best[0], r.z - best[1]); }
    }
    this.moveMedic(best[0], best[1], rotY, 'standing', instant);
  }

  private placeMedicBeside(e: PatientEntity): void {
    const h = e.human;
    h.root.updateMatrixWorld(true);
    const chest = h.torso.localToWorld(_v.copy(_chest)).clone();
    const rot = h.root.rotation.y;
    const lying = !e.walked && (e.data.pose === 'back' || e.data.pose === 'front');
    const upright = e.walked || e.data.pose === 'standing';
    const dist = upright ? 0.9 : h.child ? 0.7 : 0.88;
    // leżący / idący: z boku (lokalna oś X); siedzący/stojący: z przodu (lokalna oś Z)
    const axis = lying || e.walked ? new THREE.Vector3(Math.cos(rot), 0, -Math.sin(rot)) : new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));
    const camDir = new THREE.Vector3(Math.cos(this.rig.cur.angle), 0, Math.sin(this.rig.cur.angle));
    // preferuj stronę dalszą od kamery — ratownik nie zasłania pacjenta
    const sides = lying && axis.dot(camDir) > 0 ? [-1, 1] : [1, -1];
    let pos = chest.clone().addScaledVector(axis, dist * sides[0]);
    if (!this.spotFree(pos.x, pos.z, e.data.id, 0.45)) {
      const alt = chest.clone().addScaledVector(axis, dist * sides[1]);
      if (this.spotFree(alt.x, alt.z, e.data.id, 0.45)) pos = alt;
    }
    this.moveMedic(pos.x, pos.z, Math.atan2(chest.x - pos.x, chest.z - pos.z), upright ? 'standing' : 'kneeling');
  }

  // ---------- Kamera ----------

  private chestWorld(e: PatientEntity, out: THREE.Vector3): THREE.Vector3 {
    return e.human.torso.localToWorld(out.copy(_chest));
  }

  private setOverviewGoal(): void {
    const pts: THREE.Vector3[] = [];
    for (const e of this.patients.values()) {
      const r = e.human.root.position;
      pts.push(new THREE.Vector3(r.x, 0, r.z), new THREE.Vector3(r.x, 1.2, r.z));
    }
    // punkt zbiórki też w kadrze — chodzący nie znikają z przeglądu
    const [cx, cz] = this.scenario.collectionPoint;
    pts.push(new THREE.Vector3(cx, 0, cz), new THREE.Vector3(cx, 1.2, cz));
    const f = this.rig.frame(pts, this.rig.goal.angle, OVERVIEW_ELEV, 1.4);
    // Górny pasek HUD zasłania górę kadru — przesuwamy kadr tak, by scena leżała niżej na ekranie
    // (cel kamery odsunięty od kamery po ziemi; ~0,6 = sin kąta patrzenia ≈ 38°).
    const a = this.rig.goal.angle;
    const d = (f.zoom * OVERVIEW_HUD_SHIFT) / 0.62;
    f.target.x -= Math.cos(a) * d;
    f.target.z -= Math.sin(a) * d;
    this.rig.setGoal(f.target, f.zoom, OVERVIEW_ELEV);
  }

  // ---------- IGameView ----------

  getPatientScreenPositions(): Record<string, ScreenPoint> {
    const out: Record<string, ScreenPoint> = {};
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const cam = this.rig.camera;
    for (const [id, e] of this.patients) {
      this.chestWorld(e, _v).project(cam);
      out[id] = {
        x: ((_v.x + 1) / 2) * w,
        y: ((1 - _v.y) / 2) * h,
        visible: Math.abs(_v.x) <= 1 && Math.abs(_v.y) <= 1 && _v.z >= -1 && _v.z <= 1,
      };
    }
    return out;
  }

  focusPatient(id: string | null, onArrive?: () => void): void {
    const e = id !== null ? this.patients.get(id) : undefined;
    this.arriveCb = null;
    if (!e) {
      this.focusedId = null;
      // ratownik wstaje i zostaje przy ostatnim pacjencie (dokąd szedł, jeśli był w drodze)
      const r = this.medic.root;
      if (this.medicMove) this.medicMove.pose = 'standing';
      else this.placeMedicAt(r.position.x, r.position.z, r.rotation.y, 'standing');
      this.setOverviewGoal();
      return;
    }
    this.focusedId = e.data.id;
    this.placeMedicBeside(e);
    if (onArrive) {
      if (this.medicMove) this.arriveCb = onArrive;
      else onArrive();
    }
    const t = this.chestWorld(e, new THREE.Vector3());
    // cel lekko przesunięty w stronę ratownika — obaj w kadrze (jak widok „badanie" w prototypie)
    const m = this.medicGoal;
    t.x += (m.x - t.x) * 0.3;
    t.z += (m.z - t.z) * 0.3;
    // Panel badania zajmuje prawą część ekranu — pacjent w lewej, odsłoniętej części kadru.
    const zoom = e.human.child ? 1.15 : 1.5;
    const a = this.rig.goal.angle;
    const shift = zoom * this.rig.aspect * FOCUS_PANEL_SHIFT;
    t.x += Math.sin(a) * shift;
    t.z -= Math.cos(a) * shift;
    this.rig.setGoal(t, zoom, FOCUS_ELEV);
  }

  onPatientClick(cb: (id: string) => void): void {
    this.clickCbs.push(cb);
  }

  onFrame(cb: () => void): void {
    this.frameCbs.push(cb);
  }

  sendWalkersToCollectionPoint(): void {
    const walkers = [...this.patients.values()].filter((e) => e.data.vitals.canWalk && !e.walked);
    if (walkers.length === 0) return;
    const [cx, cz] = this.scenario.collectionPoint;
    const total = this.scenario.patients.filter((p) => p.vitals.canWalk).length;
    const cols = Math.max(2, Math.ceil(Math.sqrt(total)));
    const rows = Math.ceil(walkers.length / cols);
    const gap = WALKER_GAP;
    // najbliżsi idą na najbliższe miejsca — mniej krzyżujących się ścieżek
    walkers.sort((a, b) => a.data.position[0] - b.data.position[0]);
    walkers.forEach((e, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const to = new THREE.Vector3(cx + (col - (cols - 1) / 2) * gap, 0, cz + (row - (rows - 1) / 2) * gap);
      const faceY = Math.atan2(this.centre.x - to.x, this.centre.z - to.z);
      applyPose(e.human, 'standing');
      e.walk = { path: this.planPath(e.human.root.position, to, e.data.id), faceY, speed: e.human.child ? 0.9 : 1.15, phase: 0, delay: 0.4 + i * 0.35 };
      e.walked = true;
    });
  }

  setBleedingControlled(id: string): void {
    const e = this.patients.get(id);
    if (!e || e.bleedingControlled) return;
    e.bleedingControlled = true;
    // opaska uciskowa „wysoko i ciasno" na udzie: czarny pas, pręt skręcający, czerwony znacznik czasu
    const g = new THREE.Group();
    this.kit.part(new THREE.CylinderGeometry(0.104, 0.1, 0.075, 14), '#141416', g);
    this.kit.part(new THREE.CylinderGeometry(0.107, 0.103, 0.02, 14), '#3a3a40', g, 0, 0.03, 0); // rzep
    this.kit.box(0.07, 0.07, 0.05, '#2a2a2e', 0, 0, 0.115, g); // klamra
    const rod = this.kit.part(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 8), '#3a3a40', g, 0, 0, 0.15); // pręt
    rod.rotation.z = Math.PI / 2;
    this.kit.box(0.09, 0.05, 0.012, '#e0302a', 0.07, -0.05, 0.11, g); // znacznik czasu (czerwony)
    this.kit.box(0.05, 0.02, 0.013, '#f4f4f4', 0.07, -0.05, 0.112, g); // „T"
    g.position.set(0, -0.08, 0);
    e.human.legs[0].hip.add(g);
    e.tourniquet = g;
    // kałuża ciemnieje i przestaje rosnąć
    if (e.pool) e.pool.material = this.kit.toon('#5a0c0c');
  }

  setTag(id: string, category: TriageCategory | null): void {
    const e = this.patients.get(id);
    if (!e) return;
    if (e.tag) {
      e.tag.removeFromParent();
      this.kit.release(e.tag.geometry);
      e.tag = null;
    }
    if (category === null) return;
    const geo = new THREE.CylinderGeometry(0.066, 0.064, 0.075, 12);
    e.tag = this.kit.part(geo, TAG_COLOR[category], e.human.arms[1].sh, 0, -0.1, 0);
  }

  /** Poza kontraktem: włącza kontur z głębokości (domyślnie wyłączony). */
  setOutline(on: boolean): void {
    this.pipe.setOutline(on);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pipe.renderer.setAnimationLoop(null);
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointercancel', this.onPointerCancel);
    c.removeEventListener('pointerleave', this.onPointerLeave);
    c.removeEventListener('wheel', this.onWheel);
    c.style.cursor = '';
    this.clickCbs.length = 0;
    this.frameCbs.length = 0;
    this.scene.traverse((o) => { if (o instanceof THREE.Light) o.dispose(); }); // mapy cieni
    this.scene.clear();
    this.kit.dispose();
    this.pipe.dispose();
  }

  // ---------- Pętla ----------

  private readonly tick = (time: number): void => {
    if (this.disposed) return;
    const dt = this.lastTime < 0 ? 0 : Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.elapsed += dt;
    const t = this.elapsed;

    for (const e of this.patients.values()) {
      const h = e.human;
      // oddech
      if (e.breathOmega > 0) h.torso.scale.z = h.torsoScaleZ * (1 + Math.sin(t * e.breathOmega + e.breathOffset) * 0.07);
      // krwotok
      if (e.pool && !e.bleedingControlled && e.pool.scale.x < POOL_MAX) {
        e.pool.scale.setScalar(Math.min(POOL_MAX, e.pool.scale.x + dt * POOL_GROW_PER_SEC));
      }
      if (e.walk) this.stepWalk(e, e.walk, dt);
      if (e.bleed) this.stepBleed(e, e.bleed, dt);
    }
    if (this.medicMove) this.stepMedic(this.medicMove, dt);

    if (this.focusedId) {
      const e = this.patients.get(this.focusedId);
      if (e && e.walk) this.chestWorld(e, this.rig.goal.target);
    }
    this.rig.update(dt);
    this.pipe.setOutlineZoom(this.rig.cur.zoom);

    if (this.hoverDirty) {
      this.hoverDirty = false;
      const id = this.hoverPos ? this.pick(this.hoverPos.x, this.hoverPos.y) : null;
      this.canvas.style.cursor = id ? 'pointer' : '';
    }

    this.pipe.render(this.scene, this.rig.camera);
    for (const cb of this.frameCbs) cb();
  };

  /** Krok marszu po trasie. Zwraca true po dojściu do ostatniego punktu. */
  private advanceAlong(r: THREE.Object3D, path: THREE.Vector3[], dist: number): boolean {
    while (path.length > 0) {
      const to = path[0];
      const dx = to.x - r.position.x;
      const dz = to.z - r.position.z;
      const d = Math.hypot(dx, dz);
      if (d > dist) {
        r.position.x += (dx / d) * dist;
        r.position.z += (dz / d) * dist;
        // płynny obrót w kierunku marszu
        let diff = Math.atan2(dx, dz) - r.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        r.rotation.y += diff * Math.min(1, dist * 6);
        return false;
      }
      r.position.set(to.x, 0, to.z);
      dist -= d;
      path.shift();
    }
    return true;
  }

  private stepWalk(e: PatientEntity, w: WalkState, dt: number): void {
    if (w.delay > 0) { w.delay -= dt; return; }
    const r = e.human.root;
    if (this.advanceAlong(r, w.path, w.speed * dt)) {
      r.rotation.y = w.faceY;
      applyPose(e.human, 'standing');
      e.walk = null;
      return;
    }
    w.phase += dt * w.speed * (e.human.child ? 7.5 : 5.5);
    walkCycle(e.human, w.phase);
  }

  private stepMedic(m: MedicMove, dt: number): void {
    const r = this.medic.root;
    if (this.advanceAlong(r, m.path, MEDIC_SPEED * dt)) {
      this.medicMove = null;
      this.placeMedicAt(r.position.x, r.position.z, m.rotY, m.pose);
      const cb = this.arriveCb;
      this.arriveCb = null;
      cb?.();
      return;
    }
    m.phase += dt * MEDIC_SPEED * 4.2;
    walkCycle(this.medic, m.phase);
    // torba niesiona w prawej ręce
    const rot = r.rotation.y;
    this.bag.position.set(r.position.x - Math.cos(rot) * 0.32, 0.32, r.position.z + Math.sin(rot) * 0.32);
    this.bag.rotation.y = rot + Math.PI / 2;
  }

  // ---------- Wejście ----------

  private pick(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.rig.camera);
    const hits = this.raycaster.intersectObjects(this.patientRoots, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        const id = o.userData.patientId as string | undefined;
        if (id) return id;
        o = o.parent;
      }
    }
    return null;
  }

  private readonly onPointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0) return;
    this.pointerDown = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, lastX: ev.clientX, dragging: false };
    try { this.canvas.setPointerCapture(ev.pointerId); } catch { /* ignoruj */ }
  };

  private readonly onPointerMove = (ev: PointerEvent): void => {
    const d = this.pointerDown;
    if (d && d.id === ev.pointerId) {
      if (!d.dragging && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > CLICK_SLOP_PX) {
        d.dragging = true;
        d.lastX = d.x;
        this.canvas.style.cursor = 'grabbing';
      }
      if (d.dragging) {
        this.rig.rotate((ev.clientX - d.lastX) * 0.01);
        d.lastX = ev.clientX;
      }
      return;
    }
    this.hoverPos = { x: ev.clientX, y: ev.clientY };
    this.hoverDirty = true;
  };

  private readonly onPointerUp = (ev: PointerEvent): void => {
    const d = this.pointerDown;
    if (!d || d.id !== ev.pointerId) return;
    this.pointerDown = null;
    try { this.canvas.releasePointerCapture(ev.pointerId); } catch { /* ignoruj */ }
    if (d.dragging) {
      this.canvas.style.cursor = '';
      this.hoverPos = { x: ev.clientX, y: ev.clientY };
      this.hoverDirty = true;
      return;
    }
    const id = this.pick(ev.clientX, ev.clientY);
    if (id) for (const cb of this.clickCbs) cb(id);
  };

  private readonly onPointerCancel = (): void => {
    this.pointerDown = null;
    this.canvas.style.cursor = '';
  };

  private readonly onPointerLeave = (): void => {
    if (this.pointerDown) return;
    this.hoverPos = null;
    this.hoverDirty = true;
  };

  private readonly onWheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    this.rig.zoomBy(ev.deltaY > 0 ? 1.15 : 0.87);
  };
}

export const createGameView: GameViewFactory = (canvas, scenario) => new GameView(canvas, scenario);
