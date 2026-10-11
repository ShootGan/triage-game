import * as THREE from 'three';
import type { Kit } from './materials';
import { GLASS, GLASS_CRACKED, beam, propGroup, rbox, rng } from './propUtils';
import { RAILWAY } from '../scenarios/propSizes';

/*
 * Regional EMU car (~20 × 2.9 m), low-poly toon boxes. Local frame: length along X (cab end at +x),
 * width along Z, y = 0 at the bottom of the wheels. Livery: white body, red skirt band and doors.
 * Variants:
 * - 'upright'  — intermediate car standing on the rails of the railway embankment (lifted to RAILWAY.railTop),
 *                with a raised pantograph; place it at z = RAILWAY.trackZ.
 * - 'derailed' — intermediate car rolled onto its side at the foot of the embankment, roof towards +z,
 *                undercarriage towards the track; a rescue opening cut in the roof.
 * - 'crash'    — leading car with the cab end crushed, derailed and standing askew on the ground.
 */

const WHITE = '#eef0f2';
const RED = '#c8242c';
const DARK = '#2a2a2e';
const ROOF = '#b5bac0';

/** Half length of the body (x from −L to +L). */
const L = 10.05;
/** Half width of the body. */
const W = 1.45;
const BODY_BOTTOM = 1.2;
const BODY_TOP = 3.95;

export function buildTrain(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, variant?: string): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  switch (variant) {
    case 'derailed': return derailed(kit, g);
    case 'crash': return crashed(kit, g);
    default: {
      const car = kit.joint(g, 0, RAILWAY.railTop, 0);
      carBody(kit, car, { crushed: false, cab: false });
      pantograph(kit, car, -5.5);
      return g;
    }
  }
}

interface CarOpts {
  /** Front (+x) cab end crushed. */
  crushed: boolean;
  /** Driver's cab with windscreen and headlights at +x (otherwise a gangway). */
  cab: boolean;
}

/** The car itself, standing upright in `p`'s frame (wheels on y = 0). */
function carBody(kit: Kit, p: THREE.Object3D, o: CarOpts): void {
  // the crushed cab loses ~2.4 m of length; the remaining body ends at `front`
  const front = o.crushed ? 7.6 : L;
  const len = front + L;
  const cx = (front - L) / 2;

  bogie(kit, p, -6.8, 0, 0);
  if (o.crushed) bogie(kit, p, 6.2, 0.35, 0.28); // knocked askew under the crushed end
  else bogie(kit, p, 6.8, 0, 0);

  kit.box(len - 0.6, 0.4, 2.6, '#3a3d42', cx, 1.0, 0, p); // underframe
  kit.box(len, BODY_TOP - BODY_BOTTOM, W * 2, WHITE, cx, (BODY_BOTTOM + BODY_TOP) / 2, 0, p);
  kit.box(len + 0.04, 0.75, W * 2 + 0.04, RED, cx, 1.55, 0, p); // skirt band
  kit.box(len - 1.6, 0.95, W * 2 + 0.03, GLASS, cx, 2.75, 0, p); // window band

  // window pillars, skipping the door bays
  const doors = [-5.6, 4.2];
  const pillar = kit.own(new THREE.BoxGeometry(0.16, 0.97, W * 2 + 0.05));
  for (let px = -L + 1.2; px < front - 0.9; px += 1.45) {
    if (doors.some((d) => Math.abs(px - d) < 1.0)) continue;
    kit.part(pillar, WHITE, p, px, 2.75, 0);
  }
  for (const d of doors) {
    if (d > front - 1) continue;
    kit.box(1.4, 2.2, W * 2 + 0.06, RED, d, 2.33, 0, p);
    kit.box(1.0, 0.85, W * 2 + 0.08, GLASS, d, 2.85, 0, p);
    kit.box(0.04, 2.0, W * 2 + 0.1, '#7a1418', d, 2.3, 0, p); // gap between the two door leaves
  }
  // roof and roof equipment
  kit.box(len - 0.2, 0.3, 2.7, ROOF, cx, 4.0, 0, p);
  for (const rx of [-2.5, 2.5]) if (rx < front - 2) kit.box(3, 0.35, 1.6, '#8a9097', rx, 4.3, 0, p);

  // rear end: gangway bellows and coupler
  kit.box(0.3, 2.3, 1.3, '#1e1e22', -L - 0.12, 2.4, 0, p);
  kit.box(0.4, 0.3, 0.4, DARK, -L - 0.2, 1.0, 0, p);

  if (o.crushed) crushedCab(kit, p, front);
  else if (o.cab) cab(kit, p);
  else {
    kit.box(0.3, 2.3, 1.3, '#1e1e22', L + 0.12, 2.4, 0, p);
    kit.box(0.4, 0.3, 0.4, DARK, L + 0.2, 1.0, 0, p);
  }
}

function bogie(kit: Kit, p: THREE.Object3D, bx: number, dz: number, yaw: number): void {
  const b = kit.joint(p, bx, 0, dz);
  b.rotation.y = yaw;
  kit.box(2.8, 0.45, 2.1, DARK, 0, 0.6, 0, b);
  const wheel = kit.own(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12));
  for (const wx of [-0.95, 0.95]) {
    for (const wz of [-0.72, 0.72]) kit.part(wheel, '#4a4d52', b, wx, 0.42, wz).rotation.x = Math.PI / 2;
    kit.box(0.14, 0.14, 1.6, '#55585e', wx, 0.42, 0, b); // axle
  }
}

/** Intact driver's cab at +x: windscreen, headlights, red tail lights, coupler. */
function cab(kit: Kit, p: THREE.Object3D): void {
  kit.box(0.06, 1.0, 2.5, GLASS, L + 0.04, 3.05, 0, p);
  for (const s of [-1, 1]) {
    kit.box(0.06, 0.18, 0.35, '#fff7d0', L + 0.05, 1.55, s * 0.95, p);
    kit.box(0.06, 0.12, 0.18, '#ff3030', L + 0.05, 1.85, s * 1.15, p);
  }
  kit.box(0.4, 0.3, 0.4, DARK, L + 0.2, 1.0, 0, p);
}

/** Crushed cab: crumpled side sheets, roof folded down, smashed windscreen, exposed frame. */
function crushedCab(kit: Kit, p: THREE.Object3D, front: number): void {
  const r = rng(77);
  // exposed frame members sticking out of the torn end
  for (const s of [-1, 1]) beam(kit, 0.16, DARK, { x: front - 0.2, y: 1.0, z: s * 1.0 }, { x: front + 1.9, y: 0.7 + r() * 0.3, z: s * 1.3 }, p);
  // crumpled skirt and body sheets (white / red), each bent at a different angle
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1;
    const sx = front + 0.3 + (i >> 1) * 0.6;
    const c = i < 2 ? RED : WHITE;
    rbox(kit, 0.8, 1.5 - (i >> 1) * 0.3, 0.08, c, sx, 1.7 + r() * 0.6, s * (1.3 - (i >> 1) * 0.15), p, r() * 0.5 - 0.25, s * (0.3 + r() * 0.4), r() * 0.6 - 0.3);
  }
  // roof folded down over the cab
  rbox(kit, 2.2, 0.12, 2.6, ROOF, front + 0.9, 3.3, 0, p, 0.05, 0, -0.6);
  // smashed windscreen, tilted back, and the cab front pushed in
  rbox(kit, 0.06, 1.0, 2.1, GLASS_CRACKED, front + 1.2, 2.5, 0.1, p, 0.15, 0, 0.5);
  rbox(kit, 0.5, 1.4, 2.4, WHITE, front + 1.7, 1.6, -0.1, p, 0.1, 0.2, 0.25);
  kit.box(0.08, 0.2, 2.42, RED, front + 1.97, 1.2, -0.1, p).rotation.set(0.1, 0.2, 0.25);
  // debris on the ground in front of the cab
  for (let i = 0; i < 8; i++) {
    rbox(kit, 0.2 + r() * 0.5, 0.06, 0.15 + r() * 0.4, i % 3 ? WHITE : RED, front + 2.2 + r() * 1.8, 0.04, (r() - 0.5) * 3.2, p, 0, r() * 3, 0);
  }
}

/** Pantograph raised towards the contact wire (car on the rails only). */
function pantograph(kit: Kit, p: THREE.Object3D, px: number): void {
  kit.box(1.6, 0.2, 1.2, '#6a6f75', px, 4.25, 0, p);
  for (const s of [-1, 1]) {
    beam(kit, 0.07, '#4a4d52', { x: px - 0.6, y: 4.35, z: s * 0.4 }, { x: px, y: 5.0, z: s * 0.3 }, p);
    beam(kit, 0.06, '#4a4d52', { x: px, y: 5.0, z: s * 0.3 }, { x: px + 0.5, y: 5.5, z: s * 0.2 }, p);
  }
  kit.box(0.2, 0.06, 1.8, '#3a3d42', px + 0.5, 5.53, 0, p);
}

/** Car rolled onto its +z side at the foot of the embankment, roof facing +z (the camera). */
function derailed(kit: Kit, g: THREE.Group): THREE.Group {
  const tilt = new THREE.Group();
  carBody(kit, tilt, { crushed: false, cab: false });
  // rescue opening cut by firefighters in the roof (black hole proud of both roof faces)
  kit.box(1.8, 0.34, 1.1, '#141416', -2.2, 4.0, 0, tilt);
  // cracked windows on the upward-facing (−z) side
  for (const wx of [-8.3, -3.2, 1.7, 6.6]) kit.box(1.2, 0.8, 0.04, GLASS_CRACKED, wx, 2.75, -W - 0.05, tilt);
  tilt.rotation.set(1.35, 0.03, 0);
  tilt.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(tilt);
  // rest it on the ground (slightly dug in), centred on the prop footprint
  tilt.position.set(0, -bb.min.y - 0.1, -(bb.min.z + bb.max.z) / 2);
  g.add(tilt);

  // ballast and a torn-off roof panel scattered in front
  const r = rng(31);
  const stone = kit.own(new THREE.BoxGeometry(0.14, 0.08, 0.12));
  for (let i = 0; i < 26; i++) {
    const m = kit.part(stone, i % 2 ? '#8d8780' : '#a19b92', g, (r() - 0.5) * 18, 0.04, 2.0 + r() * 0.35);
    m.rotation.y = r() * 3;
  }
  rbox(kit, 1.6, 0.06, 1.1, ROOF, 4.5, 0.05, 2.15, g, 0, 0.4, 0.05);
  return g;
}

/** Leading car: crushed cab, derailed, standing on the ground with a slight roll and the nose dipped. */
function crashed(kit: Kit, g: THREE.Group): THREE.Group {
  const car = kit.joint(g, 0, -0.12, 0);
  car.rotation.set(0.05, 0, -0.012);
  carBody(kit, car, { crushed: true, cab: true });
  return g;
}
