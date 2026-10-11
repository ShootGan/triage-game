import * as THREE from 'three';
import type { Kit } from './materials';
import type { TerrainKind } from '../scenarios/types';
import { SNOW, SNOW_SHADE, cropField, delineator, house, pine, roadSign, tree, utilityPole, wires } from './scenery';

export type { TerrainKind } from '../scenarios/types';

/*
 * Wysokości powierzchni: wszystko, po czym leżą pacjenci, ma wierzch ≤ 0.02 m
 * (kałuże krwi rysowane są na y = 0.025). Wyżej wystają tylko krawężniki i detale poza strefą poszkodowanych.
 */

/** Strefa wolna od dekoracji terenu: [x, z, promień] (pacjenci, rekwizyty, punkt zbiórki). */
export type KeepOut = ReadonlyArray<readonly [number, number, number]>;

/**
 * Teren wg rodzaju otoczenia (patrz TerrainKind w scenarios/types.ts).
 * `size` — bok kwadratu terenu (min. 40 m jak w prototypie).
 * `keepOut` — miejsca, w których nie stawiamy wystających dekoracji (krzaki, latarnie, ławki, kosze).
 */
export function buildTerrain(kit: Kit, parent: THREE.Object3D, size = 40, kind: TerrainKind = 'road', keepOut: KeepOut = []): THREE.Group {
  const g = new THREE.Group();
  parent.add(g);
  const free = (x: number, z: number, r: number): boolean => keepOut.every(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) > kr + r);
  switch (kind) {
    case 'road': buildRoad(kit, g, size, free); break;
    case 'street': buildStreet(kit, g, size, free); break;
    case 'field': buildField(kit, g, size, free); break;
    case 'highway': buildHighway(kit, g, size, free); break;
    case 'snow': buildSnow(kit, g, size, free); break;
  }
  return g;
}

type FreeFn = (x: number, z: number, r: number) => boolean;

// ---------- Pomocnicze ----------

/** Materiał toon z powtarzalną teksturą z canvasa (`px` × `px`), powtórzoną repX × repY razy na ścianie. */
function patternMat(kit: Kit, px: number, draw: (c: CanvasRenderingContext2D, px: number) => void, repX: number, repY: number): THREE.Material {
  const cv = document.createElement('canvas');
  cv.width = px;
  cv.height = px;
  const ctx = cv.getContext('2d');
  if (ctx) draw(ctx, px);
  const t = kit.own(new THREE.CanvasTexture(cv));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.anisotropy = 4;
  return kit.own(new THREE.MeshToonMaterial({ map: t, gradientMap: kit.gradientMap }));
}

/** Deterministyczny „szum" 0..1 (jak w prototypie). */
const hash = (i: number, a: number): number => Math.sin(i * a) * 0.5 + 0.5;

/** Jezdnia wzdłuż X (|z| < 3) z krawężnikami i przerywaną linią środkową. */
function carriageway(kit: Kit, g: THREE.Object3D, size: number, asphalt: string, gap?: [number, number]): void {
  kit.box(size, 0.22, 6, asphalt, 0, -0.09, 0, g);
  kit.box(size, 0.25, 0.35, '#a8a8a0', 0, 0, 3.15, g);
  kit.box(size, 0.25, 0.35, '#a8a8a0', 0, 0, -3.15, g);
  const half = size / 2;
  const laneGeo = kit.own(new THREE.BoxGeometry(1.4, 0.23, 0.18));
  for (let x = -half + 2; x < half - 1; x += 3) {
    if (gap && x > gap[0] - 0.8 && x < gap[1] + 0.8) continue; // bez linii na przejściu dla pieszych
    kit.part(laneGeo, '#f0f0e0', g, x, -0.08, 0);
  }
}

/** Kępki trawy — deterministyczny rozrzut (gęstość: `per40` sztuk na 40 × 40 m), pomijane gdzie `skip`. */
function tufts(kit: Kit, g: THREE.Object3D, size: number, per40: number, skip: (x: number, z: number) => boolean): void {
  const tuftGeo = kit.own(new THREE.ConeGeometry(0.06, 0.25, 4));
  const k = size / 40;
  const count = Math.round(per40 * k * k);
  for (let i = 0; i < count; i++) {
    const x = (hash(i, 91.7) * 36 - 18) * k;
    const z = (hash(i, 37.3) * 30 - 15) * k;
    if (skip(x, z)) continue;
    kit.part(tuftGeo, i % 3 ? '#4f8a3c' : '#77b05a', g, x, 0.12, z);
  }
}

// ---------- 'road' ----------

/** Rural road half-widths: asphalt, white edge line, gravel shoulder. */
const ROAD = { asphalt: 3.5, edgeLine: 3.25, shoulder: 4.3 } as const;

/**
 * Polish rural road along X: two 3.5 m lanes (|z| < 3.5), white edge lines, flush gravel shoulders
 * (no kerbs, so patients lie flat), dashed centre line. Scenery outside the patient zone:
 * delineator posts, tree rows, utility poles with wires, road signs, a house and a crop field.
 */
function buildRoad(kit: Kit, g: THREE.Object3D, size: number, free: FreeFn): void {
  const half = size / 2;
  kit.box(size, 0.2, size, '#5f9a4a', 0, -0.1, 0, g);
  kit.box(size, 0.22, ROAD.asphalt * 2, '#55585f', 0, -0.09, 0, g);
  for (const s of [-1, 1]) {
    kit.box(size, 0.21, ROAD.shoulder - ROAD.asphalt, '#a89c84', 0, -0.095, s * (ROAD.asphalt + ROAD.shoulder) / 2, g).castShadow = false;
    kit.box(size, 0.225, 0.12, '#f0f0e0', 0, -0.0875, s * ROAD.edgeLine, g).castShadow = false;
  }
  const laneGeo = kit.own(new THREE.BoxGeometry(2, 0.23, 0.12));
  for (let x = -half + 2; x < half - 1; x += 6) kit.part(laneGeo, '#f0f0e0', g, x, -0.08, 0).castShadow = false;
  tufts(kit, g, size, 160, (_x, z) => Math.abs(z) < ROAD.shoulder + 0.3);

  // The overview camera frames the patients tightly, so scenery sits right at the edge of the
  // patient zone (|z| ≈ 9–12) and between patients wherever `free` allows — never on top of them.
  for (let x = -half + 4; x < half - 2; x += 10) {
    for (const z of [-4.8, 4.8]) if (free(x, z, 0.8)) delineator(kit, g, x, z);
  }
  // tree rows on both sides, about a third conifers
  for (const side of [-1, 1]) {
    for (let i = 0, x = -half + 3; x < half - 3; i++, x += 4 + hash(i, 4.7) * 2.5) {
      const z = side * (9.3 + hash(i * side + 50, 2.9) * 3);
      if (!free(x, z, 2.2)) continue;
      if (hash(i, 8.3) < 0.33) pine(kit, g, x, z, i);
      else tree(kit, g, x, z, i);
    }
  }
  // bushes on the verges between patients
  for (let i = 0; i < 28; i++) {
    const x = (hash(i, 61.3) * 2 - 1) * 16;
    const z = (hash(i, 23.9) > 0.5 ? 1 : -1) * (5.5 + hash(i, 14.1) * 4);
    if (free(x, z, 1.8)) bushCluster(kit, g, x, z, i);
  }
  // utility line along the far side
  let prev: number | null = null;
  for (let x = -half + 6; x < half - 4; x += 15) {
    const z = -11.5;
    if (free(x, z, 1)) {
      utilityPole(kit, g, x, z);
      if (prev !== null) wires(kit, g, prev, x, z);
      prev = x;
    } else prev = null;
  }
  if (free(-16, 5, 1)) roadSign(kit, g, -16, 5, 'speed70');
  if (free(16, -5, 1)) roadSign(kit, g, 16, -5, 'children');
  if (half > 24) {
    house(kit, g, 20, 21);
    cropField(kit, g, -half + 2, half - 2, -half + 2, -17);
  }
}

// ---------- 'highway' ----------

const HW = {
  edgeIn: -5.6,     // krawędź jezdni od pasa rozdziału
  lane: -1.8,       // linia przerywana między pasami
  shoulder: 1.9,    // linia ciągła pasa awaryjnego
  edgeOut: 4.6,     // zewnętrzna krawędź pasa awaryjnego
  barrierMid: -7.5, // bariera w pasie rozdziału
  oppIn: -9.4,      // krawędź przeciwnej jezdni (od pasa rozdziału)
  oppOut: -19.6,    // zewnętrzna krawędź przeciwnej jezdni (lustro głównej: 2 pasy + pas awaryjny)
  barrierOut: 5.1,  // bariera na poboczu (tylko na obrzeżach sceny)
};

/**
 * Autostrada: jezdnia z 2 pasami i pasem awaryjnym, pas rozdziału z trawą i podwójną stalową barierą,
 * przeciwna jezdnia, za poboczem trawa ze słupkiem kilometrowym i znakiem. Bariera na poboczu zerwana na środku
 * (tam auto wypadło do rowu i tamtędy chodzący idą na punkt zbiórki).
 */
function buildHighway(kit: Kit, g: THREE.Object3D, size: number, free: FreeFn): void {
  const ASPH = '#53565c';
  const LINE = '#f0f0e0';
  kit.box(size, 0.2, size, '#5f9a4a', 0, -0.1, 0, g);
  // jezdnia główna i przeciwna (wierzch y = 0.02)
  const mainD = HW.edgeOut - HW.edgeIn;
  kit.box(size, 0.22, mainD, ASPH, 0, -0.09, (HW.edgeIn + HW.edgeOut) / 2, g);
  kit.box(size, 0.22, HW.oppIn - HW.oppOut, ASPH, 0, -0.09, (HW.oppIn + HW.oppOut) / 2, g);

  // oznakowanie poziome
  const solid = (z: number) => kit.box(size, 0.23, 0.15, LINE, 0, -0.085, z, g);
  solid(HW.edgeIn + 0.3);
  solid(HW.shoulder);
  solid(HW.edgeOut - 0.2);
  const dash = kit.own(new THREE.BoxGeometry(4, 0.23, 0.15));
  const half = size / 2;
  for (let x = -half + 2; x < half - 2; x += 12) kit.part(dash, LINE, g, x, -0.085, HW.lane);
  // przeciwna jezdnia (lustro głównej): krawędź od pasa rozdziału, linia przerywana, pas awaryjny, krawędź zewnętrzna
  solid(HW.oppIn - 0.3);
  for (let x = -half + 8; x < half - 2; x += 12) kit.part(dash, LINE, g, x, -0.085, HW.oppIn - 3.8);
  solid(HW.oppIn - 7.3);
  solid(HW.oppOut + 0.2);
  // bariera za poboczem przeciwnej jezdni
  guardrail(kit, g, -half, half, HW.oppOut - 0.5, false);

  // podwójna bariera w pasie rozdziału (prowadnice z obu stron słupków)
  guardrail(kit, g, -half, half, HW.barrierMid, true);
  // bariera na poboczu — tylko na obrzeżach; na środku zerwana (wygięty fragment przy rowie)
  guardrail(kit, g, -half, -11, HW.barrierOut, false);
  guardrail(kit, g, 12, half, HW.barrierOut, false);
  if (free(-9.5, 5.6, 1.5)) {
    const bent = kit.joint(g, -9.5, 0, 5.6);
    bent.rotation.y = 0.5;
    bent.rotation.z = 0.25;
    kit.box(3, 0.3, 0.06, '#aeb3b8', 0, 0.35, 0, bent);
  }

  // kępki trawy poza jezdniami (pas rozdziału też)
  tufts(kit, g, size, 170, (_x, z) =>
    (z > HW.edgeIn - 0.2 && z < HW.edgeOut + 0.3) || (z < HW.oppIn + 0.2 && z > HW.oppOut - 0.8) || Math.abs(z - HW.barrierMid) < 0.4);
  // słupek kilometrowy i znak autostrady
  if (free(13.5, 5.6, 0.4)) kmPost(kit, g, 13.5, 5.6);
  if (free(-15, 7.5, 1.2)) motorwaySign(kit, g, -15, 7.5);
}

/** Stalowa bariera energochłonna (prowadnica na słupkach co 2 m), opcjonalnie dwustronna. */
function guardrail(kit: Kit, g: THREE.Object3D, x0: number, x1: number, z: number, both: boolean): void {
  const STEEL = '#aeb3b8';
  const len = x1 - x0;
  if (len <= 0) return;
  const post = kit.own(new THREE.BoxGeometry(0.1, 0.75, 0.1));
  for (let x = x0 + 1; x < x1; x += 2) kit.part(post, '#7d8288', g, x, 0.375, z);
  for (const s of both ? [-1, 1] : [1]) {
    kit.box(len, 0.3, 0.06, STEEL, (x0 + x1) / 2, 0.55, z + s * 0.09, g);
    kit.box(len, 0.06, 0.08, '#c8ccd0', (x0 + x1) / 2, 0.68, z + s * 0.09, g); // górna krawędź (połysk)
  }
}

function kmPost(kit: Kit, g: THREE.Object3D, x: number, z: number): void {
  kit.box(0.12, 1.1, 0.12, '#f4f4f4', x, 0.55, z, g);
  kit.box(0.13, 0.25, 0.13, '#2a2a2e', x, 0.95, z, g);
}

function motorwaySign(kit: Kit, g: THREE.Object3D, x: number, z: number): void {
  for (const dx of [-0.9, 0.9]) kit.box(0.08, 2.4, 0.08, '#7d8288', x + dx, 1.2, z, g);
  const board = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(2.4, 1.0)), kit.textMaterial(['AUTOSTRADA', 'A2  km 312'], '#1f4fa8', '#f4f4f4'));
  board.position.set(x, 2.3, z + 0.01); // lico w stronę kamery (+z)
  g.add(board);
  const back = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(2.4, 1.0)), kit.textMaterial(['AUTOSTRADA', 'A2  km 312'], '#1f4fa8', '#f4f4f4'));
  back.position.set(x, 2.3, z - 0.01);
  back.rotation.y = Math.PI;
  g.add(back);
}

// ---------- 'street' ----------

/**
 * Ulica w mieście: jezdnia |z| < 3 (krawężniki, pasy, przejście dla pieszych przy x ≈ 13),
 * chodniki z płyt 3.3 < |z| < 6, dalej plac z kostki. Latarnie, ławka i kosz przy |z| ≈ 5.7, |x| > 10.
 */
function buildStreet(kit: Kit, g: THREE.Object3D, size: number, free: FreeFn): void {
  // plac — kostka granitowa w półcegłę (kafel tekstury = 1 m, kostki 0.25 × 0.5 m)
  const cobble = patternMat(kit, 64, (c, px) => {
    c.fillStyle = '#7f7a72';
    c.fillRect(0, 0, px, px);
    const tones = ['#9a958c', '#a39e94', '#928d84', '#aaa59b'];
    const rows = 4;
    const h = px / rows;
    const w = px / 2;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? w / 2 : 0;
      for (let k = -1; k < 3; k++) {
        c.fillStyle = tones[(r * 3 + k + 4) % tones.length];
        c.fillRect(k * w + off + 1, r * h + 1, w - 2, h - 2);
      }
    }
  }, size, size);
  kit.part(new THREE.BoxGeometry(size, 0.2, size), cobble, g, 0, -0.1, 0);

  // chodniki z płyt 1 × 0.9 m (wierzch y = 0.02)
  const sideD = 2.7;
  const slabs = patternMat(kit, 32, (c, px) => {
    c.fillStyle = '#9c988f';
    c.fillRect(0, 0, px, px);
    c.fillStyle = '#c2beb4';
    c.fillRect(1, 1, px - 2, px - 2);
  }, size, sideD / 0.9);
  for (const s of [-1, 1]) kit.part(new THREE.BoxGeometry(size, 0.22, sideD), slabs, g, 0, -0.09, s * (3.3 + sideD / 2));
  // obrzeża chodnika od strony placu
  for (const s of [-1, 1]) kit.box(size, 0.05, 0.12, '#8a867e', 0, 0.0, s * 6.04, g);

  carriageway(kit, g, size, '#4f5258', [12.2, 14.8]);
  // przejście dla pieszych (zebra) przy prawej krawędzi sceny
  const zebra = kit.own(new THREE.BoxGeometry(2.6, 0.23, 0.45));
  for (let i = 0; i < 6; i++) kit.part(zebra, '#f0f0e0', g, 13.5, -0.085, -2.5 + i * 1.0);
  // studzienki
  const drain = kit.own(new THREE.BoxGeometry(0.5, 0.23, 0.35));
  for (const [dx, dz] of [[-9, 2.7], [6, -2.7], [-16, -2.7]] as const) kit.part(drain, '#2a2a2e', g, dx, -0.085, dz);

  // latarnie
  for (const [lx, lz] of [[-12, -5.75], [12, -5.75], [-17, 5.75], [17, 5.75]] as const) if (free(lx, lz, 0.3)) streetLamp(kit, g, lx, lz);
  // ławki (tyłem do placu, przodem do jezdni) i kosze
  if (free(15, -5.6, 0.9)) bench(kit, g, 15, -5.6, 0);
  if (free(-14.5, 5.6, 0.9)) bench(kit, g, -14.5, 5.6, Math.PI);
  for (const [bx, bz] of [[-10.6, 5.7], [11, -5.7]] as const) if (free(bx, bz, 0.3)) bin(kit, g, bx, bz);
}

function streetLamp(kit: Kit, g: THREE.Object3D, x: number, z: number): void {
  const POST = '#3a4a44';
  const s = Math.sign(z) || 1; // ramię nad jezdnię
  kit.part(new THREE.CylinderGeometry(0.12, 0.14, 0.4, 8), POST, g, x, 0.2, z);
  kit.part(new THREE.CylinderGeometry(0.06, 0.08, 4.6, 8), POST, g, x, 2.5, z);
  kit.box(0.07, 0.07, 1.0, POST, x, 4.75, z - s * 0.45, g);
  kit.box(0.28, 0.14, 0.5, '#2a2a2e', x, 4.7, z - s * 0.95, g);
  kit.box(0.22, 0.04, 0.4, '#f4f0c0', x, 4.62, z - s * 0.95, g);
}

function bench(kit: Kit, g: THREE.Object3D, x: number, z: number, rotY: number): void {
  const b = kit.joint(g, x, 0, z);
  b.rotation.y = rotY;
  for (let i = 0; i < 3; i++) kit.box(1.6, 0.04, 0.12, '#9c7644', 0, 0.45, -0.13 + i * 0.14, b); // siedzisko
  kit.box(1.6, 0.25, 0.04, '#9c7644', 0, 0.75, -0.22, b).rotation.x = -0.15; // oparcie
  for (const sx of [-0.7, 0.7]) {
    kit.box(0.05, 0.45, 0.4, '#2a2a2e', sx, 0.22, 0, b);
    kit.box(0.05, 0.4, 0.05, '#2a2a2e', sx, 0.65, -0.2, b);
  }
}

function bin(kit: Kit, g: THREE.Object3D, x: number, z: number): void {
  kit.part(new THREE.CylinderGeometry(0.22, 0.2, 0.75, 10), '#3a5a44', g, x, 0.375, z);
  kit.part(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 10), '#2a3a30', g, x, 0.78, z);
}

// ---------- 'field' ----------

/** Plener: trawa (gęstsze kępki), żwirowa alejka wzdłuż X (|z| < 1), krzaki i kwiaty na obrzeżach. */
function buildField(kit: Kit, g: THREE.Object3D, size: number, free: FreeFn): void {
  kit.box(size, 0.2, size, '#649e4c', 0, -0.1, 0, g);
  const gravel = patternMat(kit, 32, (c, px) => {
    c.fillStyle = '#c2b28e';
    c.fillRect(0, 0, px, px);
    const tones = ['#a8987a', '#d4c6a4', '#b4a482'];
    for (let i = 0; i < 70; i++) {
      c.fillStyle = tones[i % 3];
      c.fillRect(Math.floor(hash(i, 12.9) * px), Math.floor(hash(i, 78.2) * px), 2, 2);
    }
  }, size / 1.5, 2 / 1.5);
  kit.part(new THREE.BoxGeometry(size, 0.21, 2), gravel, g, 0, -0.085, 0);
  // obrzeża alejki
  for (const s of [-1, 1]) kit.box(size, 0.22, 0.1, '#8a8a80', 0, -0.08, s * 1.04, g);

  tufts(kit, g, size, 300, (_x, z) => Math.abs(z) < 1.4);
  // ciemniejsze łaty trawy (bez wysokości — tylko kolor)
  const patch = kit.own(new THREE.CircleGeometry(1, 7));
  for (let i = 0; i < 14; i++) {
    const x = (hash(i, 53.1) * 36 - 18) * (size / 40);
    const z = (hash(i, 17.7) * 30 - 15) * (size / 40);
    if (Math.abs(z) < 2) continue;
    const m = kit.part(patch, i % 2 ? '#5a9244' : '#6aa652', g, x, 0.004 + i * 0.0003, z);
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(1.2 + hash(i, 5.3) * 1.8);
    m.castShadow = false;
  }

  // krzaki z kwiatami — tylko na obrzeżach (|x| > 11 lub |z| > 8.5)
  const clusters: Array<[number, number]> = [
    [-14, -10], [13.5, 9.5], [-12.5, 11], [15, -11.5], [-16.5, 3.5], [16.5, 2.5], [3, -12.5], [-5, 13], [8, 12.5], [-8, -12.5],
  ];
  const k = size / 40;
  if (k > 1.2) for (const [cx, cz] of [[-24, -18], [22, 20], [-26, 16], [25, -14]] as const) clusters.push([cx, cz]);
  clusters.forEach(([cx, cz], i) => { if (free(cx, cz, 1.6)) bushCluster(kit, g, cx, cz, i); });
}

function bushCluster(kit: Kit, g: THREE.Object3D, x: number, z: number, seed: number): void {
  const bushGeo = kit.own(new THREE.IcosahedronGeometry(0.5, 0));
  const n = 2 + (seed % 2);
  for (let i = 0; i < n; i++) {
    const a = seed * 1.7 + i * 2.2;
    const r = 0.45 + hash(seed + i, 3.1) * 0.25;
    const b = kit.part(bushGeo, i % 2 ? '#3f7a34' : '#4a8a3a', g, x + Math.cos(a) * 0.5, r * 0.6, z + Math.sin(a) * 0.5);
    b.scale.set(r * 2, r * 1.5, r * 2);
  }
  const flowerGeo = kit.own(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  const stemGeo = kit.own(new THREE.BoxGeometry(0.02, 0.22, 0.02));
  const colors = ['#f2c230', '#f4f4f4', '#d65aa0', '#e8641e'];
  for (let i = 0; i < 7; i++) {
    const a = seed * 2.3 + i * 0.9;
    const d = 0.9 + hash(seed * 7 + i, 9.7) * 0.6;
    const fx = x + Math.cos(a) * d;
    const fz = z + Math.sin(a) * d;
    kit.part(stemGeo, '#3f7a34', g, fx, 0.11, fz);
    kit.part(flowerGeo, colors[(seed + i) % colors.length], g, fx, 0.24, fz);
  }
}

// ---------- 'snow' ----------

const SNOWY = {
  apronBack: -8,  // ploughed apron starts at the hall front
  roadIn: 6,      // access road (along X) between roadIn and roadOut
  roadOut: 12,
} as const;

/**
 * Winter: snow-covered ground, a ploughed car park / apron in front of the exhibition hall (−8 < z < 6)
 * with parking bays and patches of packed snow, a ploughed access road along X (6 < z < 12), snow piles
 * pushed to the edges, car park lamps and snowy trees beyond. Asphalt top y = 0.015, markings and
 * packed-snow patches ≤ 0.02 (patients lie on them); piles, lamps and trees only where `free` allows.
 */
function buildSnow(kit: Kit, g: THREE.Object3D, size: number, free: FreeFn): void {
  const half = size / 2;
  const ASPH = '#5c6068';
  const LINE = '#e4e6e2';
  kit.box(size, 0.2, size, SNOW, 0, -0.1, 0, g);
  // ploughed surface (apron + road as one slab, top 0.015 — just above the snow, below the markings)
  const d = SNOWY.roadOut - SNOWY.apronBack;
  kit.box(size, 0.2, d, ASPH, 0, -0.085, (SNOWY.apronBack + SNOWY.roadOut) / 2, g).castShadow = false;
  const mark = (w: number, dd: number, x: number, z: number) => {
    kit.box(w, 0.2, dd, LINE, x, -0.08, z, g).castShadow = false; // top 0.02
  };
  // road edge line, dashed centre line
  mark(size, 0.12, 0, SNOWY.roadIn + 0.2);
  mark(size, 0.12, 0, SNOWY.roadOut - 0.2);
  for (let x = -half + 2; x < half - 1; x += 5) mark(2.2, 0.12, x, (SNOWY.roadIn + SNOWY.roadOut) / 2);
  // parking bays along the apron's front edge and on both sides of the hall
  for (let x = -half + 3; x < half - 2; x += 2.6) {
    if (Math.abs(x) < 15) continue; // the apron in front of the hall stays clear (fire access)
    mark(0.1, 4.8, x, 2.8);
    mark(0.1, 4.8, x, -4.5);
  }

  // packed snow / slush patches on the asphalt (flat; two heights 1 mm apart, tyre tracks 0.0185, markings 0.02)
  const patch = kit.own(new THREE.CircleGeometry(1, 8));
  for (let i = 0; i < 22; i++) {
    const x = (hash(i, 41.3) * 2 - 1) * half * 0.9;
    const z = SNOWY.apronBack + 0.5 + hash(i, 19.7) * (d - 1);
    const m = kit.part(patch, i % 3 ? SNOW_SHADE : '#c8d0d8', g, x, i % 2 ? 0.016 : 0.017, z);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = i;
    m.scale.set(0.6 + hash(i, 7.1) * 1.4, 0.4 + hash(i, 3.9) * 0.8, 1);
    m.castShadow = false;
  }
  // tyre tracks on the access road
  for (const dz of [-1.6, -0.9, 0.9, 1.6]) {
    kit.box(size, 0.003, 0.25, '#4e5258', 0, 0.017, (SNOWY.roadIn + SNOWY.roadOut) / 2 + dz, g).castShadow = false;
  }

  // ploughed snow piles along the edges of the cleared area (never on patients)
  const piles: Array<[number, number]> = [
    [-17.5, -6.5], [17.5, -6.5], [-19, 4.5], [19, 4.5], [-13, 13], [-4, 13.2], [5, 13], [14, 13.3],
    [-24, -7], [24, -7], [-26, 13], [26, 13],
  ];
  piles.forEach(([px, pz], i) => { if (free(px, pz, 1.8)) snowPile(kit, g, px, pz, i); });

  // car park lamps (two-armed) at the apron edges
  for (const [lx, lz] of [[-15.5, -1], [15.5, 1.5], [-9, 12.6], [9, 12.6], [-22, 5.5], [22, -1]] as const) {
    if (free(lx, lz, 0.6)) parkLamp(kit, g, lx, lz);
  }
  // snowy trees beyond the road and beside the hall
  for (let i = 0, x = -half + 3; x < half - 3; i++, x += 3.5 + hash(i, 4.7) * 2.5) {
    const z = 14.5 + hash(i + 50, 2.9) * 4;
    if (!free(x, z, 2.2)) continue;
    if (hash(i, 8.3) < 0.55) pine(kit, g, x, z, i, true);
    else tree(kit, g, x, z, i, true);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = side * (17.5 + hash(i + side * 9, 3.1) * 5);
      const z = -10 - i * 3.2;
      if (free(x, z, 2)) pine(kit, g, x, z, i + 20 + side, true);
    }
  }
  // snow drifts scattered on the open snow (low mounds, away from the cleared area)
  const drift = kit.own(new THREE.SphereGeometry(1, 9, 6));
  for (let i = 0; i < 18; i++) {
    const x = (hash(i, 27.1) * 2 - 1) * half * 0.85;
    const z = SNOWY.roadOut + 1 + hash(i, 65.3) * (half - SNOWY.roadOut - 2);
    if (!free(x, z, 1.5)) continue;
    const m = kit.part(drift, i % 2 ? SNOW : SNOW_SHADE, g, x, -0.05, z);
    m.scale.set(1 + hash(i, 5.5) * 1.5, 0.35, 0.8 + hash(i, 2.2));
  }
}

/** Heap of ploughed snow (~1.2 m) with a dirty grey base. */
function snowPile(kit: Kit, g: THREE.Object3D, x: number, z: number, seed: number): void {
  const lump = kit.own(new THREE.DodecahedronGeometry(1, 0));
  kit.part(lump, '#b8c0c8', g, x, 0.05, z).scale.set(1.9, 0.45, 1.3);
  for (let i = 0; i < 3; i++) {
    const a = seed * 1.3 + i * 2.1;
    const m = kit.part(lump, i % 2 ? SNOW_SHADE : SNOW, g, x + Math.cos(a) * 0.6, 0.35 + i * 0.12, z + Math.sin(a) * 0.4);
    m.scale.set(1.1 - i * 0.15, 0.6 - i * 0.1, 0.9 - i * 0.1);
    m.rotation.y = a;
  }
}

/** Car park lamp ~7 m with two arms (along X) and snow on the luminaires. */
function parkLamp(kit: Kit, g: THREE.Object3D, x: number, z: number): void {
  const POST = '#5a646e';
  kit.part(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), '#8a8e96', g, x, 0.25, z);
  kit.part(new THREE.CylinderGeometry(0.07, 0.1, 6.6, 8), POST, g, x, 3.5, z);
  kit.box(1.8, 0.07, 0.07, POST, x, 6.75, z, g);
  for (const s of [-1, 1]) {
    kit.box(0.6, 0.14, 0.3, '#2a2a2e', x + s * 0.9, 6.68, z, g);
    kit.box(0.5, 0.03, 0.24, '#f4f0c0', x + s * 0.9, 6.6, z, g);
    kit.box(0.52, 0.08, 0.26, SNOW, x + s * 0.9, 6.77, z, g);
  }
}
