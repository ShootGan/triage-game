import * as THREE from 'three';
import type { Kit } from './materials';
import { buildTenement } from './buildings';
import { buildGirder, buildHall, buildRoofPanel } from './hall';
import { buildBelongings, buildDust, buildLitter, buildSpeaker, buildStall } from './dressing';
import { GLASS, GLASS_CRACKED, HAZARD, SIGNAL_BLUE, beam, blinkLight, canvasMat, propGroup, rbox, rng, sideText } from './propUtils';
import { buildTrain } from './train';
import { buildExtrication, buildFirefighter, buildFiretruck } from './vehicles';
import { PROP_HALF_SIZE, type PropKind } from '../scenarios/propSizes';

export type { PropKind } from '../scenarios/propSizes';

/** Prostokątny obrys rekwizytu na ziemi (do omijania przy rozmieszczaniu ratownika). */
export interface Footprint {
  x: number;
  z: number;
  rotY: number;
  halfW: number; // wzdłuż lokalnej osi X
  halfD: number; // wzdłuż lokalnej osi Z
}

/** Obrys z kontraktu PROP_HALF_SIZE (wspólnego z walidacją scenariuszy). */
export function propFootprint(kind: PropKind, x: number, z: number, rotY: number): Footprint | null {
  const f = PROP_HALF_SIZE[kind];
  return f ? { x, z, rotY, halfW: f[0], halfD: f[1] } : null;
}

export function insideFootprint(f: Footprint, x: number, z: number, margin = 0): boolean {
  const dx = x - f.x;
  const dz = z - f.z;
  const c = Math.cos(f.rotY);
  const s = Math.sin(f.rotY);
  // obrót do układu lokalnego (odwrotność rotacji Y)
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  return Math.abs(lx) < f.halfW + margin && Math.abs(lz) < f.halfD + margin;
}

/**
 * Autobus szkolny (przewrócony lekko na bok — pochylenie jak w prototypie). Front at +x.
 * Variant 'crash': crumpled front, cracked windscreen and front side windows, hazard lights.
 */
export function buildBus(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, color = '#f2c230', variant?: string): THREE.Group {
  const bus = new THREE.Group();
  parent.add(bus);
  const crash = variant === 'crash';
  kit.box(crash ? 9.4 : 10, 2.6, 2.6, color, crash ? -0.3 : 0, 1.8, 0, bus);
  // r186: CapsuleGeometry(radius, height, capSegments, radialSegments) — `height` = długość części środkowej, jak `length` w r160
  const roof = kit.part(new THREE.CapsuleGeometry(1.3, 7.4, 6, 12), color, bus, 0, 2.9, 0);
  if (color !== '#f2c230') kit.box(10.04, 0.3, 2.64, '#2f5fb0', 0, 1.15, 0, bus); // pas boczny autokaru
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(0.35, 1, 1);
  kit.box(10.05, 0.35, 2.65, '#2a2a2e', 0, 0.62, 0, bus);
  kit.box(10.06, 0.12, 2.66, '#2a2a2e', 0, 1.55, 0, bus);
  for (let i = 0; i < 7; i++) kit.box(1.0, 0.9, 2.66, crash && i >= 5 ? GLASS_CRACKED : GLASS, -4 + i * 1.25, 2.3, 0, bus);
  kit.box(0.1, 1.2, 2.2, crash ? GLASS_CRACKED : GLASS, 5.0, 2.2, 0, bus);
  const wheel = kit.own(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 14));
  for (const wx of [-3.4, 3.4]) for (const wz of [-1.3, 1.3]) kit.part(wheel, '#22232a', bus, wx, 0.55, wz).rotation.x = Math.PI / 2;
  if (crash) {
    // Front pushed in: dark crumple zone, bent body panels and a hanging bumper.
    kit.box(0.7, 2.2, 2.5, '#2a2a2e', 4.75, 1.5, 0, bus);
    rbox(kit, 0.9, 1.1, 0.12, color, 4.6, 1.6, 1.28, bus, 0, 0.35, 0.2);
    rbox(kit, 0.8, 0.9, 0.12, color, 4.7, 2.2, -1.28, bus, 0, -0.3, -0.15);
    rbox(kit, 0.2, 0.3, 2.4, '#2a2a2e', 5.05, 0.45, 0.15, bus, 0.25, 0.2, 0);
    for (const lx of [5.1, -5.06]) for (const lz of [-1.1, 1.1]) blinkLight(kit, bus, 0.06, 0.16, 0.22, HAZARD, lx, 1.0, lz, 'hazard');
  }
  // Slight sideways lean on the suspension (roll about the bus's own long axis, applied before the yaw);
  // lifted just enough that the lower wheels touch the ground.
  bus.rotation.order = 'YXZ';
  bus.rotation.set(0.04, rotY, 0);
  bus.position.set(x, 1.3 * Math.sin(0.04), z);
  return bus;
}

const CAR_COLORS = ['#b03a3a', '#c8c8cc', '#2f4f8a', '#1e1e24', '#3f7a4a', '#d8d2c0', '#8a5a2a'];

type CarShape = 'sedan' | 'hatch' | 'suv' | 'van';
const CAR_SHAPES: CarShape[] = ['sedan', 'hatch', 'suv', 'sedan', 'hatch'];

/**
 * Samochód osobowy (obrys 3.8 × 1.9 m). Wariant: 'sedan' | 'hatch' | 'suv' | 'van', z dopiskiem '-crash'
 * (zgnieciony przód, pęknięta szyba, światła awaryjne) albo 'roof' (na dachu). Bez wariantu — kształt i kolor z pozycji.
 */
export function buildCar(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, color?: string, variant?: string): THREE.Group {
  const outer = propGroup(parent, x, z, rotY);
  const seed = Math.abs(Math.round(x * 7 + z * 13));
  const body = color ?? CAR_COLORS[seed % CAR_COLORS.length];
  const roof = variant === 'roof';
  const cut = !!variant?.endsWith('-cut');
  const crash = !!variant?.endsWith('-crash') || roof || cut;
  const shape = (variant?.replace(/-(crash|cut)$/, '') as CarShape | 'roof' | undefined);
  const s: CarShape = shape && shape !== 'roof' ? shape : CAR_SHAPES[seed % CAR_SHAPES.length];
  // auto na dachu: cała bryła odwrócona wokół osi X, podniesiona o wysokość
  const car = kit.joint(outer, 0, 0, 0);
  const glass = crash ? GLASS_CRACKED : GLASS;
  const wheelR = s === 'suv' ? 0.4 : 0.34;
  let height = 1.6;

  // Uwaga: unikamy ścian w tej samej płaszczyźnie (migotanie przy dalekiej kamerze) —
  // elementy stykające się bokami są węższe/szersze o ≥ 3 cm, szyby wystają ≥ 3 cm.
  if (s === 'van') {
    kit.box(2.75, 1.6, 1.8, body, -0.525, 1.2, 0, car);    // skrzynia ładunkowa (x −1.9..0.85)
    kit.box(1.0, 1.15, 1.74, body, 1.35, 0.95, 0, car);    // kabina (x 0.85..1.85), węższa od skrzyni
    kit.box(0.06, 0.55, 1.56, glass, 1.88, 1.25, 0, car);  // szyba czołowa
    kit.box(0.6, 0.45, 1.8, glass, 1.3, 1.3, 0, car);      // szyby boczne kabiny
    height = 2.0;
  } else {
    const dims = {
      sedan: { len: 3.6, bodyH: 0.7, cabL: 1.9, cabX: -0.3, cabH: 0.6 },
      hatch: { len: 3.4, bodyH: 0.75, cabL: 2.0, cabX: -0.55, cabH: 0.62 },
      suv: { len: 3.7, bodyH: 0.9, cabL: 2.3, cabX: -0.45, cabH: 0.65 },
    }[s];
    const by = wheelR + dims.bodyH / 2 + 0.02;
    const cy = by + dims.bodyH / 2 + dims.cabH / 2;
    if (cut) {
      openCabin(kit, car, body, dims, by);
      height = by + dims.bodyH / 2;
    } else {
      kit.box(dims.len, dims.bodyH, 1.75, body, 0, by, 0, car);
      kit.box(dims.cabL, dims.cabH, 1.62, body, dims.cabX, cy, 0, car);
      kit.box(dims.cabL + 0.06, dims.cabH * 0.7, 1.68, glass, dims.cabX, cy + 0.02, 0, car);
      if (s === 'suv') kit.box(dims.cabL - 0.2, 0.06, 1.3, '#2a2a2e', dims.cabX, cy + dims.cabH / 2 + 0.03, 0, car); // relingi
      height = cy + dims.cabH / 2;
    }
  }
  // reflektory, tylne światła, zderzaki — przy faktycznych krawędziach danego kształtu (wysunięte o 3–4 cm)
  const [front, rear] = ({ sedan: [1.8, -1.8], hatch: [1.7, -1.7], suv: [1.85, -1.85], van: [1.85, -1.9] } as const)[s];
  kit.box(0.08, 0.2, 1.4, '#e8e8d0', front + 0.04, 0.75, 0, car);
  kit.box(0.08, 0.16, 1.5, '#8a1a1a', rear - 0.04, 0.85, 0, car);
  kit.box(0.16, 0.18, 1.8, '#2a2a2e', front + 0.04, 0.48, 0, car);
  kit.box(0.16, 0.18, 1.8, '#2a2a2e', rear - 0.04, 0.48, 0, car);
  const wheel = kit.own(new THREE.CylinderGeometry(wheelR, wheelR, 0.25, 12));
  for (const wx of [-1.2, 1.2]) for (const wz of [-0.85, 0.85]) kit.part(wheel, '#22232a', car, wx, wheelR, wz).rotation.x = Math.PI / 2;

  if (crash && !roof) {
    // zgnieciony przód: ciemne zgniecenie (+ u osobówek maska wygięta do góry)
    kit.box(0.45, 0.55, 1.66, '#2a2a2e', 1.78, 0.65, 0, car);
    if (s !== 'van') {
      const hood = kit.box(0.95, 0.07, 1.56, body, 1.35, 1.14, 0, car);
      hood.rotation.z = 0.38;
    }
  }
  if (crash) {
    // światła awaryjne (4 narożniki)
    for (const lx of [front + 0.06, rear - 0.06]) for (const lz of [-0.72, 0.72]) blinkLight(kit, car, 0.06, 0.1, 0.18, HAZARD, lx, 0.95, lz, 'hazard');
  }
  if (roof) {
    car.rotation.x = Math.PI;
    car.position.y = height + 0.02;
  }
  return outer;
}

/** Seat cushion height of a cut-open car — where a trapped patient sits (see GameView). */
export const CAR_SEAT_Y = 0.5;

/**
 * Body of a car whose roof firefighters have cut off: solid hood and boot, an open cabin tub with
 * seats, dashboard and steering wheel; no door on the driver's side (−z), pillar stubs left over.
 */
function openCabin(
  kit: Kit, car: THREE.Object3D, body: string,
  d: { len: number; bodyH: number; cabL: number; cabX: number }, by: number,
): void {
  const bottom = by - d.bodyH / 2;
  const top = by + d.bodyH / 2;
  const cabFront = d.cabX + d.cabL / 2;
  const cabRear = d.cabX - d.cabL / 2;
  const half = d.len / 2;
  kit.box(half - cabFront, d.bodyH, 1.75, body, (half + cabFront) / 2, by, 0, car);   // hood section
  kit.box(cabRear + half, d.bodyH, 1.75, body, (cabRear - half) / 2, by, 0, car);     // boot section
  kit.box(d.cabL, 0.14, 1.75, '#2a2a2e', d.cabX, bottom + 0.07, 0, car);             // floor
  kit.box(d.cabL, d.bodyH, 0.08, body, d.cabX, by, 0.835, car);                       // passenger side, door still on
  kit.box(d.cabL, 0.16, 0.08, body, d.cabX, bottom + 0.08, -0.835, car);              // driver side: only the sill
  const SEAT = '#3a3d44';
  for (const z of [-0.4, 0.4]) {
    kit.box(0.5, 0.12, 0.46, SEAT, -0.1, CAR_SEAT_Y + 0.06, z, car);
    rbox(kit, 0.12, 0.62, 0.46, SEAT, -0.42, CAR_SEAT_Y + 0.38, z, car, 0, 0, 0.15);
  }
  kit.box(0.5, 0.12, 1.4, SEAT, -0.95, CAR_SEAT_Y + 0.06, 0, car);                    // rear bench
  kit.box(0.28, 0.28, 1.6, '#2a2a2e', cabFront - 0.14, top - 0.02, 0, car);           // dashboard
  const wheel = kit.part(new THREE.TorusGeometry(0.17, 0.03, 6, 12), '#1e1e24', car, cabFront - 0.38, top + 0.04, -0.4);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = 0.5;
  // stubs of the cut pillars
  for (const px of [cabFront - 0.05, cabRear + 0.05]) for (const pz of [-0.8, 0.8]) kit.box(0.08, 0.18, 0.08, body, px, top + 0.09, pz, car);
}

const POLICE_BLUE = '#1f50c8';
const POLICE_LIME = '#c6e41a';

/** White-and-blue checker strip along the doors (current Polish police livery). */
function checkerMat(kit: Kit): THREE.Material {
  return canvasMat(kit, 96, 4, (c) => {
    c.fillStyle = '#f4f4f4';
    c.fillRect(0, 0, 96, 4);
    c.fillStyle = POLICE_BLUE;
    for (let i = 0; i < 48; i++) c.fillRect(i * 2, (i % 2) * 2, 2, 2);
  });
}

/**
 * Police patrol car in the current Polish livery: blue crossover, fluorescent yellow-green sills
 * and roof edges, white-blue checker strip, white "POLICJA" on the doors, blue light bar.
 */
export function buildPolice(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = buildCar(kit, parent, x, z, rotY, POLICE_BLUE, 'suv');
  // suv body: 3.7 × 1.75 m, y 0.42..1.32; cabin y 1.32..1.97, x −1.6..0.7
  kit.box(3.74, 0.24, 1.79, POLICE_LIME, 0, 0.56, 0, g);
  sideText(kit, g, checkerMat(kit), 3.6, 0.08, 0, 1.25, 0.9);
  const label = canvasMat(kit, 160, 32, (c) => {
    c.fillStyle = POLICE_BLUE;
    c.fillRect(0, 0, 160, 32);
    c.fillStyle = '#f4f4f4';
    c.font = 'bold 26px sans-serif';
    c.textAlign = 'center';
    c.fillText('POLICJA', 80, 26);
  });
  sideText(kit, g, label, 1.25, 0.25, 0.3, 0.95, 0.9);
  for (const lz of [-0.76, 0.76]) kit.box(2.2, 0.04, 0.1, POLICE_LIME, -0.45, 1.99, lz, g); // roof edges
  // light bar across the roof: dark base, blue ends flashing in turn
  kit.box(0.26, 0.1, 1.36, '#3a3d44', -0.2, 2.08, 0, g);
  for (const [i, lz] of [-0.46, 0.46].entries()) blinkLight(kit, g, 0.24, 0.12, 0.4, SIGNAL_BLUE, -0.2, 2.17, lz, i ? 'blueA' : 'blueB');
  return g;
}

const AMB_YELLOW = '#f2dd1a';
const AMB_RED = '#c8202a';
const AMB_BLUE = '#1f4fb0';

/** Oklejenie boku karetki: czerwono-niebieskie skośne pasy, logo „P", gwiazda życia (wg polskich ZRM). */
function ambulanceSide(kit: Kit): THREE.Material {
  return canvasMat(kit, 256, 104, (c) => {
    c.fillStyle = AMB_YELLOW;
    c.fillRect(0, 0, 256, 104);
    // pasy: wzdłuż dołu, unoszące się skośnie ku przodowi (przód = prawa strona tekstury)
    const band = (color: string, y0: number, h: number) => {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, y0);
      c.lineTo(150, y0);
      c.lineTo(230, y0 - 46);
      c.lineTo(256, y0 - 46);
      c.lineTo(256, y0 - 46 + h);
      c.lineTo(236, y0 - 46 + h);
      c.lineTo(156, y0 + h);
      c.lineTo(0, y0 + h);
      c.closePath();
      c.fill();
    };
    band(AMB_RED, 70, 10);
    band(AMB_BLUE, 80, 9);
    band(AMB_RED, 89, 6);
    // logo „P" w czerwonym kółku i gwiazda życia
    c.strokeStyle = AMB_RED;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(70, 34, 13, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = AMB_RED;
    c.font = 'bold 18px sans-serif';
    c.textAlign = 'center';
    c.fillText('P', 70, 41);
    c.fillStyle = AMB_BLUE;
    for (let i = 0; i < 3; i++) {
      c.save();
      c.translate(118, 36);
      c.rotate((i * Math.PI) / 3);
      c.fillRect(-3, -11, 6, 22);
      c.restore();
    }
  });
}

/** Karetka ZRM — wysoki furgon (obrys 6.2 × 2.5 m), przód przy +x, migające niebieskie sygnały. */
export function buildAmbulance(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const DARK = '#26272c';
  const W = 2.2; // szerokość nadwozia
  // Sylwetka z boku (x — długość, y — wysokość), wyciągnięta na szerokość: tył, wysoki dach,
  // zaokrąglone przejście nad szybą, pochylona szyba płynnie w krótką, opadającą maskę.
  const s = new THREE.Shape();
  s.moveTo(-3.1, 0.45);
  s.lineTo(-3.1, 2.8);
  s.quadraticCurveTo(-3.1, 2.95, -2.95, 2.95);
  s.lineTo(1.45, 2.95);
  s.quadraticCurveTo(1.85, 2.95, 2.0, 2.7);   // zaokrąglona krawędź dachu nad szybą
  s.lineTo(2.45, 1.45);                         // szyba czołowa (mocno pochylona)
  s.quadraticCurveTo(2.52, 1.36, 2.65, 1.33);  // przejście szyby w maskę
  s.lineTo(3.08, 1.12);                         // krótka, opadająca maska
  s.quadraticCurveTo(3.14, 1.08, 3.14, 0.98);
  s.lineTo(3.14, 0.45);
  s.lineTo(-3.1, 0.45);
  const geo = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 6 });
  geo.translate(0, 0, -W / 2);
  kit.part(geo, AMB_YELLOW, g);
  // szyba czołowa i boczne szyby kabiny
  // szyba leży na pochyłej ścianie bryły — odsunięta na zewnątrz (wzdłuż normalnej) o fazę + grubość,
  // inaczej chowa się w nadwoziu
  const ws = kit.box(1.25, 0.05, W - 0.15, '#2e4560', 2.225 + 0.12 * 0.941, 2.075 + 0.12 * 0.339, 0, g);
  ws.rotation.z = Math.atan2(1.25, -0.45);
  for (const sz of [-1, 1]) {
    const side = new THREE.Mesh(kit.own(new THREE.ShapeGeometry(new THREE.Shape([
      new THREE.Vector2(1.5, 1.62), new THREE.Vector2(2.3, 1.62), new THREE.Vector2(1.94, 2.58), new THREE.Vector2(1.5, 2.58),
    ]))), kit.toon(GLASS));
    side.position.z = sz * (W / 2 + 0.075); // wyraźnie przed ścianą (faza 0,05) — bez migotania
    if (sz < 0) side.rotation.y = Math.PI, side.scale.x = -1;
    g.add(side);
  }
  // przód: ciemny zderzak i grill, reflektory
  kit.box(0.16, 0.42, W + 0.06, DARK, 3.12, 0.64, 0, g);
  kit.box(0.05, 0.22, 1.0, DARK, 3.17, 0.98, 0, g);
  for (const sz of [-1, 1]) kit.box(0.06, 0.12, 0.42, '#f4f4e8', 3.13, 1.02, sz * 0.78, g);
  kit.box(6.3, 0.4, W + 0.08, DARK, 0, 0.66, 0, g);         // ciemny pas dolny (progi, nadkola)
  // oklejenie boków
  const side = ambulanceSide(kit);
  for (const s of [1, -1]) {
    // oklejenie powyżej ciemnego pasa dolnego (y > 0,86), więc nie zachodzi na koła
    const p = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(4.5, 2.0)), side);
    p.position.set(-0.8, 1.87, s * (W / 2 + 0.075));
    if (s < 0) { p.rotation.y = Math.PI; p.scale.x = -1; } // przód tekstury zawsze przy +x
    g.add(p);
  }
  // przód dachu: czerwono-biała jodełka
  const chevron = canvasMat(kit, 64, 16, (c) => {
    for (let i = -2; i < 10; i++) {
      c.fillStyle = i % 2 ? '#f4f4f4' : AMB_RED;
      c.beginPath();
      c.moveTo(i * 8, 16);
      c.lineTo(i * 8 + 8, 16);
      c.lineTo(i * 8 + 16, 0);
      c.lineTo(i * 8 + 8, 0);
      c.closePath();
      c.fill();
    }
  });
  // na zaokrągleniu dachu nad szybą — pochylona ku przodowi
  const chevJ = kit.joint(g, 1.86, 2.86, 0);
  chevJ.rotation.z = 0.7;
  const chev = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(W, 0.34)), chevron);
  chev.position.x = 0.06;
  chev.rotation.y = Math.PI / 2;
  chevJ.add(chev);
  // „AMBULANS" w lustrzanym odbiciu na masce (opadającej ku przodowi)
  const hoodJ = kit.joint(g, 2.87, 1.28, 0);
  hoodJ.rotation.z = -0.45;
  const hoodTxt = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(1.5, 0.38)), kit.textMaterial(['AMBULANS'], AMB_YELLOW, AMB_RED));
  hoodTxt.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  hoodTxt.scale.x = -1;
  hoodJ.add(hoodTxt);
  // belka sygnałowa na przedniej krawędzi dachu + lampy z tyłu (dwie fazy niebieskich)
  kit.box(0.32, 0.12, 1.7, '#e8e8ec', 1.4, 3.04, 0, g);
  for (const [i, lz] of [-0.65, -0.25, 0.25, 0.65].entries()) blinkLight(kit, g, 0.26, 0.12, 0.3, '#3a7cff', 1.4, 3.14, lz, i % 2 ? 'blueA' : 'blueB');
  for (const [i, lz] of [-0.95, 0.95].entries()) blinkLight(kit, g, 0.16, 0.16, 0.2, '#3a7cff', -3.1, 2.82, lz, i ? 'blueA' : 'blueB');
  // koła wystają poza ciemny pas dolny (zewnętrzna ściana opony z = ±1,22), felgi jaśniejsze
  const wheel = kit.own(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 14));
  const rim = kit.own(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10));
  for (const wx of [2.05, -2.0]) for (const wz of [-1, 1]) {
    kit.part(wheel, '#1c1d22', g, wx, 0.4, wz * 1.08).rotation.x = Math.PI / 2;
    kit.part(rim, '#9a9ea6', g, wx, 0.4, wz * 1.09).rotation.x = Math.PI / 2;
  }
  return g;
}

/** Rozsypany ładunek: kartony i palety w promieniu ok. 2 m (niski, bez obrysu). */
export function buildCargo(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const box = kit.own(new THREE.BoxGeometry(0.5, 0.4, 0.45));
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39;
    const r = 0.4 + (i % 4) * 0.45;
    const m = kit.part(box, i % 3 ? '#b58a52' : '#c89b62', g, Math.cos(a) * r, 0.2, Math.sin(a) * r);
    m.rotation.y = a * 0.7;
    if (i % 4 === 3) { m.rotation.z = Math.PI / 2; m.position.y = 0.23; }
  }
  for (let i = 0; i < 2; i++) {
    const p = kit.joint(g, -1.2 + i * 2.1, 0, 1.1 - i * 2.0);
    p.rotation.y = 0.4 + i;
    for (let k = 0; k < 4; k++) kit.box(1.2, 0.03, 0.12, '#a07a4a', 0, 0.12, -0.36 + k * 0.24, p);
    for (const bx of [-0.5, 0, 0.5]) kit.box(0.1, 0.1, 0.8, '#8a6a3e', bx, 0.05, 0, p);
  }
  return g;
}

/** Ślady hamowania: dwa równoległe ciemne pasy po łuku (płasko na asfalcie). */
export function buildSkid(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const seg = kit.own(new THREE.BoxGeometry(1.05, 0.23, 0.22));
  for (let i = 0; i < 9; i++) {
    const t = i - 4;
    const bend = t * t * 0.03;
    for (const lz of [-0.75, 0.75]) {
      const m = kit.part(seg, '#2c2d31', g, t, -0.082, lz + bend);
      m.rotation.y = -t * 0.06;
      m.castShadow = false;
    }
  }
  return g;
}

/** Plama paliwa/płynów (płaska, ciemna z opalizującym połyskiem). */
export function buildSpill(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const disc = kit.own(new THREE.CircleGeometry(1, 10));
  const parts: Array<[number, number, number, string]> = [[0, 0, 0.9, '#3a3742'], [0.8, 0.45, 0.5, '#3a3742'], [-0.6, -0.35, 0.55, '#3a3742'], [0.15, 0.1, 0.38, '#5a5070'], [-0.3, 0.25, 0.2, '#6a7a5a']];
  parts.forEach(([px, pz, r, c], i) => {
    const m = kit.part(disc, c, g, px, 0.021 + i * 0.0005, pz);
    m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(r);
    m.castShadow = false;
  });
  return g;
}

/** Trójkąt ostrzegawczy (czerwona rama z białym środkiem na nóżkach). */
export function buildTriangle(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const outer = kit.part(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 3), '#d6303a', g, 0, 0.32, 0);
  outer.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  const inner = kit.part(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 3), '#f4f4f4', g, 0, 0.32, 0);
  inner.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  kit.box(0.04, 0.05, 0.4, '#555a60', 0, 0.03, 0, g);
  kit.box(0.4, 0.05, 0.04, '#555a60', 0, 0.03, 0.15, g);
  return g;
}

/** Odłamki szkła rozsypane wokół punktu. */
export function buildGlass(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = new THREE.Group();
  parent.add(g);
  const shard = kit.own(new THREE.BoxGeometry(0.12, 0.04, 0.1));
  for (let i = 0; i < 18; i++) {
    kit.part(shard, '#cfe3ea', g, Math.sin(i * 3) * 1.5, 0.02, Math.cos(i * 5) * 1.2);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

// ---------- Pomocnicze ----------

/**
 * Rozrzut gruzu: bryły betonu i cegły na kopcu o promieniu `r` i wysokości `h`
 * (wysokość powierzchni maleje liniowo od środka). Wszystko w granicach |x|<=lim[0], |z|<=lim[1] (lokalnie).
 */
function scatterDebris(
  kit: Kit, g: THREE.Object3D, rand: () => number, cx: number, cz: number, r: number, h: number,
  chunks: number, bricks: number, lim: [number, number],
): void {
  const brickGeo = kit.own(new THREE.BoxGeometry(0.25, 0.07, 0.12));
  const place = (pad: number): [number, number, number] => {
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (Math.abs(x) <= lim[0] - pad && Math.abs(z) <= lim[1] - pad) return [x, z, h * Math.max(0, 1 - d / r)];
    }
    return [cx, cz, h];
  };
  const concrete = ['#a8a39a', '#8f8a82', '#b4ada2', '#7d7870'];
  for (let i = 0; i < chunks; i++) {
    const s = 0.25 + rand() * 0.45;
    const [x, z, y] = place(s * 0.6);
    rbox(kit, s, s * (0.4 + rand() * 0.4), s * (0.6 + rand() * 0.5), concrete[i % concrete.length], x, y + s * 0.15, z, g,
      rand() * 0.8 - 0.4, rand() * Math.PI, rand() * 0.8 - 0.4);
  }
  const brick = ['#a8553a', '#8e4630', '#b86448'];
  for (let i = 0; i < bricks; i++) {
    const [x, z, y] = place(0.15);
    const m = kit.part(brickGeo, brick[i % brick.length], g, x, y + 0.04, z);
    m.rotation.set(rand() * 0.9 - 0.45, rand() * Math.PI, rand() * 0.9 - 0.45);
  }
}

// ---------- Ciężarówka ----------

/** Ciężarówka: kabina (biała z niebieskim pasem, przód w +x) + skrzynia ładunkowa. 9 × 2.6 m, wys. ~3.8 m. */
export function buildTruck(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, variant?: string): THREE.Group {
  const root = propGroup(parent, x, z, rotY);
  const jack = variant === 'jackknife';
  // złożona w scyzoryk: kabina obrócona względem naczepy wokół sprzęgu (x ≈ 2.45)
  const cab = kit.joint(root, jack ? 2.45 : 0, 0, 0);
  if (jack) cab.rotation.y = -0.55; // kabina skręcona w stronę lokalnego +z
  const cx = jack ? -2.45 : 0; // przesunięcie, by elementy kabiny liczyć w układzie całej ciężarówki
  const g = root;
  kit.box(jack ? 6.9 : 8.6, 0.3, 1.5, '#2a2a2e', jack ? -0.95 : -0.1, 0.78, 0, g); // rama
  // kabina x 2.55..4.45
  const C = (w: number, h: number, d: number, c: string, bx: number, by: number, bz: number) => kit.box(w, h, d, c, bx + cx, by, bz, cab);
  C(1.9, 2.0, 2.45, '#e8ecf0', 3.5, 1.95, 0);
  C(1.6, 0.45, 2.35, '#e8ecf0', 3.35, 3.17, 0); // owiewka dachowa
  C(1.96, 0.28, 2.51, '#2f5fb0', 3.5, 1.45, 0); // pas
  C(0.06, 0.85, 2.2, jack ? GLASS_CRACKED : '#3d5470', 4.48, 2.45, 0); // szyba czołowa
  C(0.8, 0.7, 2.51, '#3d5470', 3.75, 2.5, 0);   // szyby boczne
  C(0.05, 0.55, 1.3, '#3a3a40', 4.49, 1.3, 0);  // grill
  C(0.18, 0.35, 2.5, '#2a2a2e', 4.41, 0.9, 0);  // zderzak
  C(1.5, 0.3, 1.2, '#2a2a2e', 3.4, 0.78, 0);    // rama pod kabiną
  for (const s of [-1, 1]) {
    C(0.05, 0.18, 0.4, '#f4f0c0', 4.49, 1.25, s * 0.85); // reflektory
    C(0.12, 0.3, 0.06, '#2a2a2e', 4.0, 2.6, s * 1.27);  // lusterka
    if (jack) for (const lx of [4.5, -4.56]) blinkLight(kit, lx > 0 ? cab : g, 0.06, 0.12, 0.2, HAZARD, lx > 0 ? lx + cx : lx, lx > 0 ? 1.0 : 1.3, s * 1.1, 'hazard');
  }
  const cabWheel = kit.own(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 14));
  for (const wz of [-1.08, 1.08]) kit.part(cabWheel, '#22232a', cab, 3.55 + cx, 0.5, wz).rotation.x = Math.PI / 2;
  if (!jack) return buildTrailer(kit, g);
  buildTrailer(kit, g);
  return root;
}

/** Skrzynia/naczepa ciężarówki (x −4.5..2.35) z kołami tylnymi. */
function buildTrailer(kit: Kit, g: THREE.Group): THREE.Group {
  // skrzynia x -4.5..2.35, y 1.1..3.8
  kit.box(6.85, 2.7, 2.55, '#c8ccd2', -1.075, 2.45, 0, g);
  kit.box(6.91, 0.45, 2.61, '#e8641e', -1.075, 3.3, 0, g); // pas firmowy
  kit.box(6.91, 0.1, 2.61, '#9a9ea6', -1.075, 1.12, 0, g);
  kit.box(0.05, 2.5, 0.06, '#7a7e86', -4.54, 2.45, 0, g);  // szczelina drzwi tylnych
  kit.box(0.04, 0.12, 2.3, '#7a7e86', -4.54, 1.9, 0, g);   // rygle
  kit.box(0.04, 0.12, 2.3, '#7a7e86', -4.54, 3.0, 0, g);
  // koła
  const wheel = kit.own(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 14));
  for (const wx of [-2.4, -3.5]) for (const wz of [-1.08, 1.08]) kit.part(wheel, '#22232a', g, wx, 0.5, wz).rotation.x = Math.PI / 2;
  return g;
}

// ---------- Gruz ----------

/** Gruzowisko ok. 3 × 3 m, wys. do ~0.9 m: kopiec pyłu, bryły betonu, cegły, dwie belki, pręty zbrojeniowe. */
export function buildRubble(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const rand = rng(1234);
  const lump = kit.own(new THREE.DodecahedronGeometry(1, 0));
  kit.part(lump, '#8a857c', g, -0.15, 0.05, 0.1).scale.set(1.25, 0.6, 1.15);
  kit.part(lump, '#9b9488', g, 0.55, 0.0, -0.45).scale.set(0.8, 0.7, 0.8);
  kit.part(lump, '#a39c90', g, -0.6, 0.0, -0.6).scale.set(0.7, 0.4, 0.7);
  scatterDebris(kit, g, rand, 0, 0, 1.35, 0.6, 12, 28, [1.5, 1.5]);
  // belki
  rbox(kit, 2.6, 0.16, 0.18, '#7a5a38', 0.1, 0.55, 0.3, g, 0, 0.45, 0.28);
  rbox(kit, 2.1, 0.14, 0.16, '#6a4c2e', -0.2, 0.35, -0.4, g, 0.1, -0.9, -0.15);
  // pręty zbrojeniowe
  for (const [rx, rz, a] of [[0.4, 0.1, 0.5], [0.5, -0.1, 0.9], [-0.3, 0.6, -0.6]] as const) {
    rbox(kit, 0.03, 0.8, 0.03, '#5a4a40', rx, 0.75, rz, g, a * 0.6, 0, a);
  }
  return g;
}

// ---------- Kamienica ----------

/**
 * Kamienica 12 × 8 m (lokalnie x -6..6, z -4..4), 3 kondygnacje (~9 m), fasada od +z.
 * Prawy przedni narożnik (x > 1.5) zawalony: odsłonięte stropy, poszarpane krawędzie, gruz.
 * Tył (−z) prosty — rekwizyt stoi na skraju sceny.
 */
export function buildBuilding(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const PL = '#d9c3a0';
  const BAND = '#c4ab86';
  const PLINTH = '#a89a84';
  const WIN = '#2e3a4f';
  const HOLE = '#14161e';
  const FR = '#f0ebe0';
  const SLAB = '#9a968e';
  const rand = rng(77);

  // --- część cała: x -6..1.5
  kit.box(7.5, 9, 8, PL, -2.25, 4.5, 0, g);
  kit.box(7.56, 1.0, 8.06, PLINTH, -2.25, 0.5, 0, g); // cokół
  for (const y of [3, 6]) kit.box(7.56, 0.18, 8.08, BAND, -2.25, y, 0, g); // gzymsy kondygnacji
  kit.box(7.7, 0.4, 8.2, BAND, -2.25, 8.95, 0, g); // gzyms wieńczący
  kit.box(0.6, 1.2, 0.6, '#9a5a44', -4.6, 9.6, -2.4, g); // kominy
  kit.box(0.6, 1.0, 0.6, '#9a5a44', -1.2, 9.5, -0.6, g);

  // okna fasady (piętra 1 i 2)
  const frameGeo = kit.own(new THREE.BoxGeometry(1.06, 1.62, 0.08));
  const glassGeo = kit.own(new THREE.BoxGeometry(0.9, 1.46, 0.1));
  const sillGeo = kit.own(new THREE.BoxGeometry(1.2, 0.1, 0.22));
  for (const wy of [4.5, 7.5]) {
    for (const wx of [-5.0, -3.4, -1.8, -0.2]) {
      const broken = wx > -1; // przy zawaleniu — wybite szyby
      kit.part(frameGeo, FR, g, wx, wy, 4.0);
      kit.part(glassGeo, broken ? HOLE : WIN, g, wx, wy, 4.01);
      kit.part(sillGeo, BAND, g, wx, wy - 0.84, 4.08);
      if (!broken) kit.box(0.05, 1.46, 0.11, FR, wx, wy, 4.02, g); // słupek okna
    }
  }
  // parter: witryna sklepu z markizą + brama
  kit.box(2.6, 2.0, 0.08, FR, -4.2, 1.6, 4.0, g);
  kit.box(2.4, 1.8, 0.1, WIN, -4.2, 1.6, 4.01, g);
  kit.box(2.9, 0.4, 0.2, '#2f8a3e', -4.2, 2.75, 4.08, g);
  kit.box(1.4, 2.4, 0.1, '#5a3a24', -1.2, 1.2, 4.01, g);
  kit.box(1.6, 0.25, 0.14, FR, -1.2, 2.5, 4.03, g);
  // okna boczne od strony −x (tylko kilka)
  for (const wy of [4.5, 7.5]) for (const wz of [-2, 1.5]) kit.box(0.1, 1.46, 0.9, WIN, -6.01, wy, wz, g);

  // --- strefa zawalenia: x 1.5..6
  // odsłonięte wnętrze na ścianie przy zawaleniu (tapety różnych mieszkań)
  kit.box(0.04, 2.7, 3.6, '#b9ab92', 1.52, 4.5, -1.8, g);
  kit.box(0.04, 2.7, 3.0, '#c9a77a', 1.52, 4.5, 2.2, g);
  kit.box(0.04, 2.7, 4.0, '#9fb0a0', 1.52, 7.5, -1.0, g);
  kit.box(0.04, 2.7, 2.8, '#b49aa8', 1.52, 7.5, 2.4, g);
  // wystające, połamane stropy
  kit.box(0.9, 0.25, 6.4, SLAB, 1.9, 6.0, -0.6, g);
  kit.box(0.6, 0.25, 7.2, SLAB, 1.75, 8.75, -0.3, g);
  rbox(kit, 2.0, 0.22, 2.6, SLAB, 2.4, 5.4, 2.3, g, 0.05, 0, -0.75); // zwisający fragment stropu
  // poszarpane krawędzie ścian frontowej i tylnej
  kit.box(1.0, 1.6, 0.45, PL, 2.0, 6.8, -3.78, g);
  kit.box(0.6, 0.9, 0.45, PL, 1.8, 8.0, -3.78, g);
  kit.box(0.7, 2.2, 0.45, PL, 1.85, 4.1, 3.78, g);
  kit.box(0.45, 1.0, 0.45, PL, 1.72, 7.3, 3.78, g);
  // tylna część parteru i resztka 1. piętra
  kit.box(4.5, 3, 4, PL, 3.75, 1.5, -2, g);
  kit.box(4.56, 1.0, 4.06, PLINTH, 3.75, 0.5, -2, g);
  kit.box(4.3, 2.6, 0.04, '#b9ab92', 3.75, 1.55, 0.01, g); // odsłonięta ściana wewnętrzna parteru
  kit.box(0.9, 2.0, 0.05, '#6a4a30', 4.6, 1.0, 0.03, g);   // drzwi wewnętrzne
  kit.box(2.7, 2.4, 2.5, PL, 2.85, 4.2, -2.75, g);
  kit.box(2.0, 0.6, 1.8, PL, 2.6, 5.7, -3.0, g);
  kit.box(4.6, 0.25, 4.2, SLAB, 3.8, 3.05, -2.0, g); // strop nad parterem
  for (const wz of [-3.0, -1.0]) kit.box(0.1, 1.3, 0.9, WIN, 6.01, 1.6, wz, g); // okna boczne parteru
  kit.box(0.1, 1.3, 0.9, HOLE, 4.21, 4.3, -2.2, g);
  // poszarpane wierzchołki murów
  for (let i = 0; i < 6; i++) {
    const s = 0.3 + rand() * 0.4;
    rbox(kit, s, s, s, PL, 1.7 + rand() * 2.4, 5.3 + rand() * 0.6, -3.6 + rand() * 2.0, g, rand(), rand(), rand());
  }
  // kikut ściany frontowej parteru
  kit.box(1.4, 1.5, 0.45, PL, 2.2, 0.75, 3.78, g);
  // gruzowisko w zawalonym narożniku (x 2.6..6, z 0..4)
  const lump = kit.own(new THREE.DodecahedronGeometry(1, 0));
  kit.part(lump, '#a09888', g, 4.3, 0.1, 1.9).scale.set(1.6, 1.15, 1.85);
  kit.part(lump, '#8f877a', g, 3.2, 0.0, 0.8).scale.set(1.1, 1.4, 1.0);
  kit.part(lump, '#b0a898', g, 5.1, 0.0, 3.0).scale.set(0.8, 0.6, 0.8);
  rbox(kit, 3.2, 0.25, 3.0, SLAB, 4.2, 1.9, 0.9, g, 0.5, 0.1, 0.15); // osunięty strop
  rbox(kit, 2.8, 0.16, 0.18, '#7a5a38', 4.0, 1.3, 2.6, g, 0.3, 0.6, 0.25); // belki
  rbox(kit, 2.4, 0.16, 0.18, '#6a4c2e', 4.8, 1.6, 1.4, g, -0.2, -0.8, 0.4);
  scatterDebris(kit, g, rand, 4.2, 2.0, 1.8, 1.1, 14, 30, [6, 4]);
  return g;
}

// ---------- Scena koncertowa ----------

/** Scena 10 × 6 m: podest 1.2 m, kratownica z dachem (~7.6 m), kolumny głośnikowe, baner. Przód od +z. */
export function buildStage(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const TRUSS = '#b0b4bc';
  kit.box(10, 1.2, 6, '#2a2a30', 0, 0.6, 0, g);
  kit.box(10.02, 0.06, 6.02, '#3a3a42', 0, 1.23, 0, g);
  kit.box(10.04, 1.1, 0.04, '#18181c', 0, 0.58, 3.01, g); // osłona przodu

  // słupy kratownicy (4 pręty + szczeble)
  const rod = kit.own(new THREE.BoxGeometry(0.05, 7.2, 0.05));
  const rung = kit.own(new THREE.BoxGeometry(0.34, 0.04, 0.04));
  const rungZ = kit.own(new THREE.BoxGeometry(0.04, 0.04, 0.34));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * 4.75;
    const cz = sz * 2.75;
    for (const dx of [-0.15, 0.15]) for (const dz of [-0.15, 0.15]) kit.part(rod, TRUSS, g, cx + dx, 3.6, cz + dz);
    for (let y = 0.4; y < 7.0; y += 0.6) {
      kit.part(rung, TRUSS, g, cx, y, cz + 0.15);
      kit.part(rungZ, TRUSS, g, cx + 0.15, y + 0.3, cz);
    }
    kit.box(0.6, 0.06, 0.6, '#55585f', cx, 0.03, cz, g); // stopa
  }
  // belki górne (kratownice wzdłuż x i z)
  const chordX = kit.own(new THREE.BoxGeometry(9.8, 0.06, 0.06));
  const chordZ = kit.own(new THREE.BoxGeometry(0.06, 0.06, 5.8));
  for (const s of [-1, 1]) {
    for (const dy of [6.75, 7.05]) for (const d of [-0.15, 0.15]) {
      kit.part(chordX, TRUSS, g, 0, dy, s * 2.75 + d);
      kit.part(chordZ, TRUSS, g, s * 4.75 + d, dy, 0);
    }
  }
  // dach dwuspadowy
  for (const s of [-1, 1]) rbox(kit, 10.0, 0.12, 3.2, '#202026', 0, 7.45, s * 1.5, g, s * 0.2, 0, 0);
  // reflektory na przedniej belce
  const lamp = kit.own(new THREE.CylinderGeometry(0.13, 0.11, 0.3, 8));
  for (let i = 0; i < 6; i++) {
    kit.part(lamp, i % 2 ? '#2a2a2e' : '#3a3a42', g, -3.5 + i * 1.4, 6.5, 2.75).rotation.x = 0.6;
    kit.box(0.14, 0.03, 0.03, '#f2c230', -3.5 + i * 1.4, 6.43, 2.87, g);
  }
  // tło sceny
  kit.box(9.0, 5.4, 0.08, '#141418', 0, 3.95, -2.75, g);
  // baner pod przednią belką
  kit.box(5.7, 1.0, 0.04, '#5a2a6a', 0, 5.7, 2.88, g);
  for (const sx of [-2.6, 2.6]) kit.box(0.02, 0.9, 0.02, '#55585f', sx, 6.6, 2.88, g); // linki
  const ban = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(5.6, 0.9)), kit.textMaterial(['FESTIWAL'], '#7a3b8a', '#f2c230'));
  ban.position.set(0, 5.7, 2.91);
  g.add(ban);
  // kolumny głośnikowe
  const cone = kit.own(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12));
  for (const sx of [-1, 1]) {
    kit.box(1.0, 2.0, 0.8, '#1a1a1e', sx * 4.0, 2.25, 2.3, g);
    kit.box(1.0, 0.8, 0.8, '#1a1a1e', sx * 4.0, 3.65, 2.3, g);
    for (const cy of [1.75, 2.65, 3.65]) kit.part(cone, '#3a3a42', g, sx * 4.0, cy, 2.71).rotation.x = Math.PI / 2;
  }
  // podest perkusji, bęben, wzmacniacz, statyw mikrofonu
  kit.box(2.6, 0.4, 1.8, '#2a2a30', 0, 1.45, -1.5, g);
  kit.part(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 10), '#c02828', g, -0.5, 1.8, -1.2);
  kit.box(0.7, 0.5, 0.4, '#e8641e', 0.4, 1.9, -1.4, g);
  kit.box(0.8, 0.7, 0.45, '#1a1a1e', 2.3, 1.6, -1.8, g);
  kit.box(0.03, 1.5, 0.03, '#55585f', 0.4, 2.0, 1.2, g);
  return g;
}

// ---------- Barierka ----------

/**
 * Segment barierek koncertowych 4 × 0.6 m (dwa przęsła po 2 m), wys. 1.1 m, stopy w poprzek.
 * Variant 'down': pushed over by the crowd, lying flat towards +z.
 */
export function buildBarrier(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, variant?: string): THREE.Group {
  const outer = propGroup(parent, x, z, rotY);
  const g = kit.joint(outer, 0, 0, 0);
  if (variant === 'down') {
    g.rotation.x = Math.PI / 2 - 0.08;
    g.position.set(0, 0.08, -0.45);
  }
  const MET = '#b8bcc4';
  const rail = kit.own(new THREE.BoxGeometry(1.95, 0.05, 0.05));
  const post = kit.own(new THREE.BoxGeometry(0.05, 1.08, 0.05));
  const bar = kit.own(new THREE.BoxGeometry(0.025, 0.86, 0.025));
  const foot = kit.own(new THREE.BoxGeometry(0.06, 0.04, 0.6));
  for (const cx of [-1, 1]) {
    kit.part(rail, MET, g, cx, 1.07, 0);
    kit.part(rail, MET, g, cx, 0.18, 0);
    for (const ex of [-0.95, 0.95]) {
      kit.part(post, MET, g, cx + ex, 0.56, 0);
      kit.part(foot, '#6a6e76', g, cx + ex, 0.02, 0);
    }
    for (let i = 1; i < 13; i++) kit.part(bar, MET, g, cx - 0.95 + i * 0.146, 0.625, 0);
  }
  return outer;
}

// ---------- Zawalona trybuna ----------

/**
 * Trybuna 8 × 4 m (widownia patrzy w +z, najwyższy rząd przy −z, do ~2.2 m).
 * Lewa połowa (x < 0) stoi przekrzywiona, prawa zawalona: połamane deski, wygięte podpory.
 */
export function buildBleachers(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const WOOD = ['#b08850', '#9c7644', '#c09a60'];
  const MET = '#8a8e96';
  const rand = rng(4242);
  const ROWS = 5;
  const rowZ = (i: number): number => 1.55 - i * 0.78;
  const rowY = (i: number): number => 0.42 + i * 0.42;

  // lewa część — stoi, lekko przechylona
  const left = kit.joint(g, -2.0, 0, 0);
  left.rotation.z = 0.05;
  for (let i = 0; i < ROWS; i++) {
    kit.box(3.9, 0.07, 0.34, WOOD[i % 3], 0, rowY(i), rowZ(i), left);
    kit.box(3.9, 0.05, 0.3, WOOD[(i + 1) % 3], 0, rowY(i) - 0.32, rowZ(i) + 0.32, left); // podnóżek
  }
  for (const px of [-1.85, 0, 1.85]) {
    // podpory: pionowe słupki + skośna belka
    for (let i = 0; i < ROWS; i++) kit.box(0.07, rowY(i), 0.07, MET, px, rowY(i) / 2, rowZ(i) - 0.1, left);
    beam(kit, 0.07, MET, { x: px, y: 0, z: rowZ(0) + 0.1 }, { x: px, y: rowY(ROWS - 1), z: rowZ(ROWS - 1) - 0.1 }, left);
  }
  // pęknięte końce desek nad strefą zawalenia (zwisają w dół)
  for (let i = 1; i < ROWS; i++) {
    rbox(kit, 1.1, 0.07, 0.32, WOOD[i % 3], 0.4, rowY(i) - 0.25 - i * 0.05, rowZ(i), g, 0, 0, -0.45 - rand() * 0.3);
  }

  // prawa część — zawalona: każdy rząd złamany na 2 kawałki pod różnymi kątami
  for (let i = 0; i < ROWS; i++) {
    const base = 0.12 + i * 0.1;
    const split = 1.2 + rand() * 1.4;
    for (const [cx, len] of [[0.5 + split / 2, split], [0.5 + split + (3.4 - split) / 2, 3.4 - split]]) {
      rbox(kit, len - 0.1, 0.07, 0.34, WOOD[(i + Math.round(cx)) % 3], cx, base + rand() * 0.25, rowZ(i) * 0.85 + (rand() - 0.5) * 0.3, g,
        (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.35, (rand() - 0.5) * 0.5);
    }
  }
  // wygięte podpory
  for (const [px, pz, h, rx, rz] of [
    [1.4, -1.5, 1.6, 0.5, -0.7], [3.4, -1.4, 1.4, -0.3, 0.9], [2.4, 0.2, 1.1, 0.9, 0.3], [3.6, 1.1, 0.9, -0.6, -0.5],
  ] as const) {
    rbox(kit, 0.07, h, 0.07, MET, px, h * 0.35, pz, g, rx, 0, rz);
  }
  // sterczący fragment tylnej ramy
  beam(kit, 0.07, MET, { x: 0.3, y: 0, z: -1.7 }, { x: 0.8, y: 1.9, z: -1.7 }, g);
  beam(kit, 0.07, MET, { x: 0.8, y: 1.9, z: -1.7 }, { x: 2.8, y: 0.4, z: -1.6 }, g);
  // deski na ziemi
  for (let i = 0; i < 6; i++) {
    const px = 0.9 + rand() * 2.4;
    const pz = -1.4 + rand() * 2.8;
    rbox(kit, 1.0 + rand() * 0.6, 0.06, 0.3, WOOD[i % 3], px, 0.04, pz, g, 0, rand() * Math.PI, 0);
  }
  return g;
}

// ---------- Namiot ----------

/** Pawilon 3 × 3 m: 4 słupki, dach czterospadowy (biały), lambrekin w czerwono-białe pasy, stół w środku. */
export function buildTent(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const pole = kit.own(new THREE.BoxGeometry(0.06, 2.2, 0.06));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.part(pole, '#b0b4bc', g, sx * 1.42, 1.1, sz * 1.42);
  // ConeGeometry z 4 segmentami ma wierzchołki na osiach — obrót o 45° daje kwadrat 3 × 3 m
  kit.part(new THREE.ConeGeometry(2.12, 0.9, 4), '#f2f2ee', g, 0, 2.2 + 0.45, 0).rotation.y = Math.PI / 4;
  // lambrekin — pasy po 0.5 m
  const flap = kit.own(new THREE.BoxGeometry(0.5, 0.28, 0.02));
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 6; i++) {
      const t = -1.25 + i * 0.5;
      const m = kit.part(flap, i % 2 ? '#f2f2ee' : '#d6303a', g);
      // bok 0: +z, 1: +x, 2: −z, 3: −x
      const ox = side === 1 ? 1.49 : side === 3 ? -1.49 : t;
      const oz = side === 0 ? 1.49 : side === 2 ? -1.49 : t;
      m.position.set(ox, 2.08, oz);
      m.rotation.y = (side * Math.PI) / 2;
    }
  }
  // stół z kartonami
  kit.box(1.6, 0.05, 0.7, '#f4f4f4', 0, 0.75, -0.3, g);
  for (const sx of [-0.72, 0.72]) for (const sz of [-0.6, 0.0]) kit.box(0.04, 0.73, 0.04, '#7a7e86', sx, 0.37, sz, g);
  kit.box(0.4, 0.25, 0.3, '#c8a070', -0.4, 0.9, -0.35, g);
  kit.box(0.3, 0.2, 0.25, '#2f5fb0', 0.35, 0.88, -0.25, g);
  return g;
}

export function buildProp(kit: Kit, parent: THREE.Object3D, kind: PropKind, x: number, z: number, rotY: number, color?: string, variant?: string): THREE.Group {
  switch (kind) {
    case 'bus': return buildBus(kit, parent, x, z, rotY, color, variant);
    case 'car': return buildCar(kit, parent, x, z, rotY, color, variant);
    case 'glass': return buildGlass(kit, parent, x, z, rotY);
    case 'truck': return buildTruck(kit, parent, x, z, rotY, variant);
    case 'ambulance': return buildAmbulance(kit, parent, x, z, rotY);
    case 'cargo': return buildCargo(kit, parent, x, z, rotY);
    case 'skid': return buildSkid(kit, parent, x, z, rotY);
    case 'spill': return buildSpill(kit, parent, x, z, rotY);
    case 'triangle': return buildTriangle(kit, parent, x, z, rotY);
    case 'rubble': return buildRubble(kit, parent, x, z, rotY);
    case 'building': return buildBuilding(kit, parent, x, z, rotY);
    case 'stage': return buildStage(kit, parent, x, z, rotY);
    case 'barrier': return buildBarrier(kit, parent, x, z, rotY, variant);
    case 'bleachers': return buildBleachers(kit, parent, x, z, rotY);
    case 'tent': return buildTent(kit, parent, x, z, rotY);
    case 'firetruck': return buildFiretruck(kit, parent, x, z, rotY);
    case 'police': return buildPolice(kit, parent, x, z, rotY);
    case 'speaker': return buildSpeaker(kit, parent, x, z, rotY);
    case 'stall': return buildStall(kit, parent, x, z, rotY, variant);
    case 'litter': return buildLitter(kit, parent, x, z, rotY);
    case 'belongings': return buildBelongings(kit, parent, x, z, rotY);
    case 'dust': return buildDust(kit, parent, x, z, rotY, variant);
    case 'cones': return buildCones(kit, parent, x, z, rotY);
    case 'extrication': return buildExtrication(kit, parent, x, z, rotY, color);
    case 'tenement': return buildTenement(kit, parent, x, z, rotY, variant);
    case 'firefighter': return buildFirefighter(kit, parent, x, z, rotY, variant);
    case 'train': return buildTrain(kit, parent, x, z, rotY, variant);
    case 'hall': return buildHall(kit, parent, x, z, rotY);
    case 'roofpanel': return buildRoofPanel(kit, parent, x, z, rotY);
    case 'girder': return buildGirder(kit, parent, x, z, rotY);
  }
}

/**
 * Punkt zbiórki poszkodowanych: zielona plandeka, pachołki w narożnikach,
 * tablica „PUNKT ZBIÓRKI". size = bok plandeki w metrach.
 */
export function buildCollectionPoint(kit: Kit, parent: THREE.Object3D, x: number, z: number, size: number, rotY = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  const tarp = kit.box(size, 0.02, size, '#2f8a3e', 0, 0.012, 0, g);
  tarp.castShadow = false;
  // obszycie plandeki
  for (const s of [-1, 1]) {
    kit.box(size, 0.025, 0.08, '#1f6a2c', 0, 0.014, s * (size / 2 - 0.04), g).castShadow = false;
    kit.box(0.08, 0.025, size, '#1f6a2c', s * (size / 2 - 0.04), 0.014, 0, g).castShadow = false;
  }
  // pachołki
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) buildCone(kit, g, sx * (size / 2 + 0.25), sz * (size / 2 + 0.25));
  // tablica na słupku (przy przedniej krawędzi)
  const post = kit.joint(g, -size / 2 + 0.3, 0, size / 2 + 0.35);
  kit.box(0.06, 1.7, 0.06, '#9a9a9a', 0, 0.85, 0, post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.04), kit.toon('#2f8a3e'));
  board.position.set(0, 1.55, 0);
  board.castShadow = true;
  post.add(board);
  kit.own(board.geometry);
  for (const side of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.49), kit.textMaterial(['PUNKT', 'ZBIÓRKI'], '#2f8a3e', '#f4f4f4'));
    kit.own(face.geometry);
    face.position.set(0, 1.55, side * 0.022);
    if (side < 0) face.rotation.y = Math.PI;
    post.add(face);
  }
  return g;
}

/** Traffic cone (orange with a white reflective band) standing on a square base. */
function buildCone(kit: Kit, parent: THREE.Object3D, x: number, z: number, scale = 1): THREE.Group {
  const c = kit.joint(parent, x, 0, z);
  c.scale.setScalar(scale);
  kit.box(0.3, 0.03, 0.3, '#e8641e', 0, 0.015, 0, c);
  kit.part(new THREE.ConeGeometry(0.12, 0.45, 10), '#e8641e', c, 0, 0.25, 0);
  kit.part(new THREE.CylinderGeometry(0.075, 0.095, 0.08, 10), '#f4f4f4', c, 0, 0.26, 0);
  return c;
}

/** Row of 4 road cones, 1 m apart along local z, slightly larger than the collection-point ones. */
export function buildCones(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  for (let i = 0; i < 4; i++) buildCone(kit, g, (i % 2) * 0.15, -1.5 + i, 1.4);
  return g;
}

/** Torba medyczna (czerwona z białym krzyżem). Lokalny środek na ziemi. */
export function buildMedBag(kit: Kit, parent: THREE.Object3D): THREE.Group {
  const g = new THREE.Group();
  parent.add(g);
  kit.box(0.45, 0.28, 0.25, '#c02828', 0, 0.14, 0, g);
  kit.box(0.12, 0.12, 0.26, '#f4f4f4', 0, 0.16, 0, g);
  kit.box(0.04, 0.12, 0.27, '#f4f4f4', 0, 0.16, 0, g);
  return g;
}
