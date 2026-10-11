import * as THREE from 'three';
import type { Kit } from './materials';
import { GLASS, beam, propGroup, rbox, rng } from './propUtils';
import { SNOW, SNOW_SHADE } from './scenery';

/*
 * Exhibition hall whose roof collapsed under snow, and loose debris (roof panels, truss fragments).
 * Low-poly toon boxes; snow layers overlap their panel's thickness instead of touching its face (no z-fighting).
 */

const STEEL = '#5d6a78';
const PRIMER = '#8a4a36';
const CLAD = '#c9d2da';
const CLAD_DARK = '#a3afbb';
const ROOF = '#8f9aa4';
const FLOOR = '#7d7a74';
const WOOL = '#e2c55a'; // mineral wool core of sandwich panels

/**
 * Roof sandwich panel (width `w` along local X) between (za, ya) and (zb, yb) in the YZ plane at `x`,
 * rolled by `roll` about its own length; a snow layer on top unless `bare`.
 */
function slopePanel(kit: Kit, g: THREE.Object3D, x: number, w: number, za: number, ya: number, zb: number, yb: number, roll = 0, bare = false): THREE.Group {
  const len = Math.hypot(zb - za, yb - ya);
  const j = kit.joint(g, x, (ya + yb) / 2, (za + zb) / 2);
  j.rotation.set(Math.atan2(-(yb - ya), zb - za), 0, roll);
  kit.box(w, 0.22, len, ROOF, 0, 0, 0, j);
  if (!bare) {
    kit.box(w - 0.2, 0.34, len - 0.3, SNOW, 0, 0.2, 0, j); // bottom at 0.03 — inside the panel
    kit.box(w - 0.6, 0.12, len - 0.9, SNOW_SHADE, 0.1, 0.41, 0.2, j); // drift ridge
  }
  return j;
}

/** Flat lattice truss in the YZ plane at `x`: chords through the given points (top/bottom), diagonals between. */
function truss(kit: Kit, g: THREE.Object3D, x: number, top: ReadonlyArray<readonly [number, number]>, bottom: ReadonlyArray<readonly [number, number]>, color = STEEL): void {
  const P = (p: readonly [number, number]) => new THREE.Vector3(x, p[1], p[0]);
  for (let i = 0; i + 1 < top.length; i++) beam(kit, 0.16, color, P(top[i]), P(top[i + 1]), g);
  for (let i = 0; i + 1 < bottom.length; i++) beam(kit, 0.14, color, P(bottom[i]), P(bottom[i + 1]), g);
  const n = Math.min(top.length, bottom.length);
  for (let i = 0; i < n; i++) {
    beam(kit, 0.07, color, P(top[i]), P(bottom[i]), g);
    if (i + 1 < n) beam(kit, 0.07, color, P(bottom[i]), P(top[i + 1]), g);
  }
}

/** Fair stand ~2.4 × 2 m on the hall floor: panels, fascia in `color`, counter, shelf with goods. Open towards +z. */
function stand(kit: Kit, g: THREE.Object3D, x: number, z: number, color: string, accent: string): void {
  const WALL = '#f2efe8';
  kit.box(2.36, 0.06, 2.0, '#d8d0c0', x, 0.11, z, g);
  kit.box(2.4, 2.4, 0.06, WALL, x, 1.34, z - 0.97, g);
  kit.box(0.06, 2.4, 1.94, WALL, x - 1.17, 1.34, z + 0.03, g);
  kit.box(0.06, 2.5, 0.06, '#e0e0e0', x + 1.17, 1.39, z + 0.97, g);
  kit.box(2.44, 0.38, 0.08, color, x, 2.55, z + 0.97, g);
  kit.box(1.0, 0.7, 0.02, accent, x - 0.35, 1.9, z - 0.92, g); // poster, 1 cm off the wall
  kit.box(1.2, 0.95, 0.5, color, x + 0.35, 0.615, z + 0.55, g);
  kit.box(1.3, 0.05, 0.6, '#f4f4f4', x + 0.35, 1.115, z + 0.55, g);
  kit.box(1.6, 0.04, 0.28, '#b8b8b8', x + 0.2, 1.3, z - 0.8, g);
  for (let i = 0; i < 4; i++) kit.box(0.22, 0.26, 0.2, [accent, '#3a7cff', '#f2c230', '#2f8a3e'][i], x - 0.3 + i * 0.36, 1.45, z - 0.8, g);
}

/**
 * Exhibition hall 28 × 10 m (local x −14..14, z −5..5), walls ~6 m, front (+z) towards the camera.
 * x −14..−2: intact — cladding, entrance with canopy, sign, snow-laden flat roof.
 * x −2..8: roof collapsed into a V under snow — panels down to the floor, bent front columns and eave beam,
 *          snapped trusses and purlins sticking out, torn cladding and snow spilled at the front.
 * x 8..14: front wall torn off and roof gone — bare truss and purlins, a panel hanging from the back wall,
 *          fair stands visible inside, snow on the floor.
 */
export function buildHall(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const H = 6;
  const rand = rng(2006);

  // floor slab and enclosing walls (back + sides)
  kit.box(28, 0.08, 10, FLOOR, 0, 0.04, 0, g);
  kit.box(28, H, 0.2, CLAD_DARK, 0, H / 2, -4.9, g);
  for (const s of [-1, 1]) kit.box(0.2, H, 9.96, CLAD, s * 13.9, H / 2, 0, g); // ends 2 cm short of the front/back wall faces
  for (const y of [2, 4]) for (const s of [-1, 1]) kit.box(0.24, 0.28, 10.02, CLAD_DARK, s * 13.9, y, 0, g);

  // columns: front row (z 4.8) and back row (z −4.8) every 4 m; the two front ones in the collapse are bent
  for (const cx of [-14, -10, -6, -2, 10, 14]) kit.box(0.35, H, 0.35, STEEL, cx === 14 ? 13.78 : cx === -14 ? -13.78 : cx, H / 2, 4.8, g);
  for (const cx of [-10, -6, -2, 2, 6, 10]) kit.box(0.35, H, 0.35, STEEL, cx, H / 2, -4.6, g);
  for (const [cx, lean] of [[2, 0.6], [6, 0.35]] as const) {
    const a = new THREE.Vector3(cx, 0.08, 4.8);
    const b = new THREE.Vector3(cx + 0.15, 2.0, 4.8 - lean * 0.6);
    const c = new THREE.Vector3(cx + 0.5, 3.0 + lean, 4.8 - lean * 2.2);
    beam(kit, 0.32, STEEL, a, b, g);
    beam(kit, 0.32, STEEL, b, c, g);
  }

  // ── intact part (x −14..−2)
  kit.box(12, H, 0.2, CLAD, -8, H / 2, 4.9, g);
  for (const y of [2, 4]) kit.box(12.02, 0.3, 0.24, CLAD_DARK, -8, y, 4.9, g);
  kit.box(4, 2.6, 0.06, GLASS, -8, 1.38, 5.02, g); // entrance doors
  for (const dx of [-1, 0, 1]) kit.box(0.08, 2.6, 0.1, STEEL, -8 + dx, 1.38, 5.03, g);
  kit.box(5, 0.2, 1.0, STEEL, -8, 3.0, 5.5, g); // canopy
  kit.box(4.8, 0.26, 0.85, SNOW, -8, 3.17, 5.5, g);
  const sign = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(5.6, 2.1)), kit.textMaterial(['HALA WYSTAWOWA', 'TARGI ZIMOWE'], '#1f4fa8', '#f4f4f4'));
  sign.position.set(-8, 4.95, 5.035);
  g.add(sign);
  kit.box(12.4, 0.25, 10.4, ROOF, -8, H + 0.125, 0, g);
  kit.box(12.1, 0.36, 10.1, SNOW, -8, H + 0.37, 0, g); // heavy snow layer (bottom inside the roof slab)
  kit.box(9, 0.14, 7, SNOW_SHADE, -8.6, H + 0.6, -0.5, g); // wind-blown drift
  // torn roof edge over the collapse: the last panels hang down into it
  rbox(kit, 1.6, 0.22, 3.4, ROOF, -1.4, 5.1, 2.6, g, 0, 0, -0.75);
  rbox(kit, 1.4, 0.22, 3.0, ROOF, -1.5, 4.9, -1.8, g, 0.1, 0, -0.95);
  rbox(kit, 1.2, 0.3, 2.6, SNOW, -1.25, 5.3, 2.6, g, 0, 0, -0.75);

  // ── collapse (x −2..8): V-shaped roof, valley at z ≈ 0.6
  const strips: Array<[number, number, number, number]> = [
    // [x centre, width, valley height, roll]
    [-0.35, 3.1, 0.35, 0.04],
    [2.95, 3.3, 0.3, -0.05],
    [6.35, 3.2, 0.45, 0.07],
  ];
  strips.forEach(([sx, w, vy, roll], i) => {
    const vz = 0.6 + i * 0.25;
    slopePanel(kit, g, sx, w, -4.7, H - 0.2 - i * 0.3, vz, vy, roll);
    slopePanel(kit, g, sx, w, vz - 0.1, vy + 0.05, 4.7, 3.4 - i * 0.35 + (i === 2 ? 0.8 : 0), -roll * 0.8);
  });
  // eave beam sagging between the intact corner and the open part
  const eave = [new THREE.Vector3(-2, H, 4.8), new THREE.Vector3(2.6, 3.45, 4.95), new THREE.Vector3(8, 4.3, 4.8)];
  beam(kit, 0.3, STEEL, eave[0], eave[1], g);
  beam(kit, 0.3, STEEL, eave[1], eave[2], g);
  // snapped trusses / purlins poking out of the gaps between strips
  beam(kit, 0.16, PRIMER, new THREE.Vector3(1.25, 0.5, 0.9), new THREE.Vector3(1.0, 3.1, 2.3), g);
  beam(kit, 0.16, PRIMER, new THREE.Vector3(1.3, 0.6, 0.4), new THREE.Vector3(1.5, 3.6, -1.6), g);
  beam(kit, 0.14, PRIMER, new THREE.Vector3(4.65, 0.5, 1.0), new THREE.Vector3(5.2, 2.7, 3.4), g);
  beam(kit, 0.12, STEEL, new THREE.Vector3(4.6, 2.2, -2.5), new THREE.Vector3(3.6, 4.0, -3.9), g);
  // bent truss along the open edge (x = 8): follows the V
  truss(kit, g, 8, [[-4.7, H - 0.1], [-2.2, 3.6], [0.7, 1.0], [2.8, 2.6], [4.7, 4.3]], [[-4.4, H - 0.8], [-2.0, 2.9], [0.9, 0.4], [2.7, 1.9], [4.5, 3.6]], PRIMER);
  // torn front cladding fallen outwards / leaning, snow spilled off the roof along the front
  rbox(kit, 3.0, 2.2, 0.12, CLAD, 0.6, 0.55, 4.0, g, -1.25, 0.1, 0.05);
  rbox(kit, 2.6, 1.8, 0.12, CLAD, 4.4, 0.9, 4.2, g, -0.9, -0.2, -0.1);
  rbox(kit, 2.2, 1.4, 0.12, CLAD_DARK, 7.0, 0.35, 4.2, g, -1.45, 0.3, 0);
  const lump = kit.own(new THREE.DodecahedronGeometry(1, 0));
  for (let i = 0; i < 7; i++) {
    const m = kit.part(lump, i % 3 ? SNOW : SNOW_SHADE, g, -1.5 + i * 1.4 + rand() * 0.4, 0.05, 4.1 + rand() * 0.6);
    m.scale.set(0.8 + rand() * 0.5, 0.35 + rand() * 0.2, 0.6 + rand() * 0.3);
    m.rotation.y = rand() * 3;
  }
  // a wrecked stand's fascia sticking out from under the roof
  rbox(kit, 2.2, 0.4, 0.08, '#d6303a', 3.4, 0.75, 3.6, g, 0.3, 0.25, 0.35);
  rbox(kit, 1.6, 0.36, 0.08, '#2f8a3e', -0.6, 0.6, 3.3, g, -0.2, -0.3, -0.25);

  // ── open part (x 8..14): bare structure, stands inside
  truss(kit, g, 11, [[-4.7, H], [-2.35, H], [0, H], [2.35, H], [4.7, H]], [[-4.7, H - 0.7], [-2.35, H - 0.7], [0, H - 0.7], [2.35, H - 0.7], [4.7, H - 0.7]]);
  kit.box(5.8, 0.3, 0.3, STEEL, 11, H - 0.15, 4.8, g); // eave beam
  for (const pz of [-3.6, -1.2, 1.2]) kit.box(5.8, 0.16, 0.12, STEEL, 11, H + 0.08, pz, g); // purlins
  // purlin torn off, hanging from the eave towards the floor
  beam(kit, 0.12, STEEL, new THREE.Vector3(9.0, H, 3.6), new THREE.Vector3(8.3, 0.9, 4.3), g);
  // panel hanging from the back wall top down to the floor
  slopePanel(kit, g, 12.6, 2.4, -4.6, H - 0.1, -1.4, 0.15, 0.05);
  // snow fallen onto the floor where the roof is open (low, above the 0.08 floor)
  kit.box(4.5, 0.12, 2.2, SNOW, 10.6, 0.1, -2.6, g);
  kit.box(2.6, 0.1, 1.6, SNOW_SHADE, 9.6, 0.12, 0.2, g);
  stand(kit, g, 9.6, 2.6, '#d6303a', '#f2c230');
  stand(kit, g, 12.4, 2.8, '#3a7cff', '#f4f4f4');
  // banners/stands at the back, half buried
  rbox(kit, 2.0, 1.6, 0.06, '#2f8a3e', 9.6, 0.9, -1.0, g, -0.4, 0, 0.1);
  return g;
}

/** Fallen roof sandwich panel (~2.6 × 1.6 m), bent up over a lump, torn wool core, purlin, snow on top. */
export function buildRoofPanel(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  rbox(kit, 1.6, 0.14, 1.6, ROOF, -0.5, 0.12, 0, g, 0, 0, 0.06);
  rbox(kit, 1.4, 0.24, 1.3, SNOW, -0.6, 0.24, 0.02, g, 0, 0, 0.06); // bottom inside the panel
  rbox(kit, 1.1, 0.14, 1.55, ROOF, 0.75, 0.45, 0.03, g, 0.04, 0, 0.55);
  rbox(kit, 0.9, 0.2, 1.2, SNOW, 0.7, 0.58, 0.05, g, 0.04, 0, 0.55);
  rbox(kit, 0.16, 0.16, 1.5, WOOL, 0.18, 0.2, 0.02, g, 0, 0, 0.3); // torn edge, wool showing
  beam(kit, 0.1, PRIMER, new THREE.Vector3(-1.3, 0.08, -0.72), new THREE.Vector3(1.2, 0.7, -0.68), g);
  return g;
}

/** Bent fragment of a lattice roof truss (~3.6 m) lying on its side, kinked up in the middle, snow in the web. */
export function buildGirder(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const xs = [-1.75, -0.9, 0, 0.9, 1.7];
  const ys = [0.1, 0.2, 0.55, 0.3, 0.1];
  const zc = [0, 0.04, 0.1, 0, -0.1];
  const A = xs.map((px, i) => new THREE.Vector3(px, ys[i], zc[i] - 0.22));
  const B = xs.map((px, i) => new THREE.Vector3(px + 0.05, ys[i] + 0.04, zc[i] + 0.22));
  for (let i = 0; i + 1 < xs.length; i++) {
    beam(kit, 0.12, PRIMER, A[i], A[i + 1], g);
    beam(kit, 0.1, PRIMER, B[i], B[i + 1], g);
    beam(kit, 0.06, PRIMER, A[i], B[i + 1], g);
  }
  for (let i = 0; i < xs.length; i++) beam(kit, 0.06, PRIMER, A[i], B[i], g);
  const lump = kit.own(new THREE.DodecahedronGeometry(0.3, 0));
  for (const [lx, ly] of [[-1.2, 0.18], [0.5, 0.42], [1.3, 0.2]] as const) kit.part(lump, SNOW, g, lx, ly, 0.02).scale.set(1.3, 0.6, 1);
  return g;
}
