import * as THREE from 'three';
import type { Kit } from './materials';

/** Background scenery shared by terrains: trees, roadside posts, utility poles, signs, a house. Deterministic. */

const hash = (i: number, a: number): number => Math.sin(i * a) * 0.5 + 0.5;

const LEAVES = ['#3f7a34', '#4a8a3a', '#56963f', '#3a6e30'];

/** Snow colours shared by winter scenery (terrain 'snow', hall props). */
export const SNOW = '#f2f6fa';
export const SNOW_SHADE = '#dfe7ef';

/** Deciduous tree ~4–6 m: trunk and a lumpy low-poly crown. `snow`: bare grey-brown winter crown capped with snow. */
export function tree(kit: Kit, g: THREE.Object3D, x: number, z: number, seed: number, snow = false): void {
  const h = 1.6 + hash(seed, 3.3) * 0.9;
  kit.box(0.3, h, 0.3, '#6a4a30', x, h / 2, z, g);
  const crown = kit.own(new THREE.IcosahedronGeometry(1, 0));
  const n = 3 + (seed % 2);
  for (let i = 0; i < n; i++) {
    const a = seed * 1.9 + i * 2.1;
    const r = 1.0 + hash(seed + i, 7.7) * 0.6;
    const cx = x + Math.cos(a) * 0.6;
    const cy = h + 0.9 + i * 0.35;
    const cz = z + Math.sin(a) * 0.6;
    const m = kit.part(crown, snow ? (i % 2 ? '#7a6a5e' : '#8a7a6c') : LEAVES[(seed + i) % LEAVES.length], g, cx, cy, cz);
    m.scale.set(r, r * 0.85, r);
    m.rotation.y = a;
    if (snow) {
      // flattened cap sitting on the upper half of the lump (offset up, so no shared faces)
      const cap = kit.part(crown, SNOW, g, cx, cy + r * 0.38, cz);
      cap.scale.set(r * 0.8, r * 0.45, r * 0.8);
      cap.rotation.y = a + 0.4;
    }
  }
}

/** Conifer ~5 m: three stacked cones. `snow`: the upper half of each tier is covered with snow. */
export function pine(kit: Kit, g: THREE.Object3D, x: number, z: number, seed: number, snow = false): void {
  const s = 0.85 + hash(seed, 5.1) * 0.35;
  kit.box(0.24, 1.0 * s, 0.24, '#5a3e28', x, 0.5 * s, z, g);
  for (let i = 0; i < 3; i++) {
    const r = (1.5 - i * 0.4) * s;
    const h = 1.8 * s;
    const y = (1.4 + i * 1.1) * s;
    kit.part(new THREE.ConeGeometry(r, h, 7), i % 2 ? '#2f5e30' : '#2a5429', g, x, y, z);
    // half-size cone with the same slope, its apex 6 cm above the tier's: a parallel shell over the top half
    if (snow) kit.part(new THREE.ConeGeometry(r * 0.5, h * 0.5, 7), SNOW, g, x, y + h * 0.25 + 0.06, z);
  }
}

/** White roadside delineator post with a black band and an orange reflector. */
export function delineator(kit: Kit, g: THREE.Object3D, x: number, z: number): void {
  kit.box(0.12, 1.0, 0.12, '#f0f0ea', x, 0.5, z, g);
  kit.box(0.13, 0.25, 0.13, '#1e1e24', x, 0.78, z, g);
  kit.box(0.04, 0.12, 0.06, '#ffa020', x, 0.78, z + Math.sign(-z) * 0.07, g);
}

/** Wooden utility pole (~7 m) with a cross-arm; returns the wire anchor heights' x positions via the pole itself. */
export function utilityPole(kit: Kit, g: THREE.Object3D, x: number, z: number): void {
  kit.part(new THREE.CylinderGeometry(0.12, 0.16, 7, 8), '#6e5236', g, x, 3.5, z);
  kit.box(0.12, 0.12, 1.6, '#6e5236', x, 6.6, z, g);
  for (const dz of [-0.65, 0, 0.65]) kit.box(0.08, 0.14, 0.08, '#e8e8e0', x, 6.74, z + dz, g); // insulators
}

/** Sagging-free straight wires between consecutive poles (three conductors). */
export function wires(kit: Kit, g: THREE.Object3D, x0: number, x1: number, z: number): void {
  for (const dz of [-0.65, 0, 0.65]) {
    const w = kit.box(x1 - x0, 0.025, 0.025, '#2a2a2e', (x0 + x1) / 2, 6.78, z + dz, g);
    w.castShadow = false;
  }
}

function signFace(kit: Kit, draw: (c: CanvasRenderingContext2D) => void): THREE.Material {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const c = cv.getContext('2d');
  if (c) draw(c);
  const t = kit.own(new THREE.CanvasTexture(cv));
  t.colorSpace = THREE.SRGBColorSpace;
  return kit.own(new THREE.MeshToonMaterial({ map: t, gradientMap: kit.gradientMap, transparent: true, alphaTest: 0.5 }));
}

/**
 * Road sign on a grey post, face towards +z (the camera side) unless `faceZ` is -1.
 * 'speed70' — B-33 speed limit; 'children' — A-17 warning (children).
 */
export function roadSign(kit: Kit, g: THREE.Object3D, x: number, z: number, kind: 'speed70' | 'children', faceZ: 1 | -1 = 1): void {
  kit.box(0.07, 2.2, 0.07, '#8a8e96', x, 1.1, z, g);
  const mat = signFace(kit, (c) => {
    if (kind === 'speed70') {
      c.fillStyle = '#d6303a';
      c.beginPath(); c.arc(32, 32, 31, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f4f4f4';
      c.beginPath(); c.arc(32, 32, 23, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1e1e24';
      c.font = 'bold 24px sans-serif';
      c.textAlign = 'center';
      c.fillText('70', 32, 41);
    } else {
      c.fillStyle = '#d6303a';
      c.beginPath(); c.moveTo(32, 2); c.lineTo(62, 58); c.lineTo(2, 58); c.closePath(); c.fill();
      c.fillStyle = '#f2c230';
      c.beginPath(); c.moveTo(32, 14); c.lineTo(52, 51); c.lineTo(12, 51); c.closePath(); c.fill();
      c.fillStyle = '#1e1e24'; // two running children, as blocks
      c.fillRect(25, 30, 5, 12); c.fillRect(34, 33, 4, 9);
      c.beginPath(); c.arc(27.5, 26, 3, 0, Math.PI * 2); c.arc(36, 29.5, 2.5, 0, Math.PI * 2); c.fill();
    }
  });
  const face = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(0.8, 0.8)), mat);
  face.position.set(x, 2.05, z + faceZ * 0.05);
  if (faceZ < 0) face.rotation.y = Math.PI;
  g.add(face);
  kit.box(0.76, 0.76, 0.03, '#8a8e96', x, 2.05, z, g).castShadow = true; // back plate
}

/** Single-storey house with a gabled roof and a wooden fence in front (towards −z). */
export function house(kit: Kit, g: THREE.Object3D, x: number, z: number, wall = '#e8dcc4', roof = '#9a3a2a'): void {
  const hs = kit.joint(g, x, 0, z);
  kit.box(7, 3, 5, wall, 0, 1.5, 0, hs);
  // gable walls: a triangular prism on top of the walls (ridge 1.8 m above them, along x)
  const gable = new THREE.ExtrudeGeometry(new THREE.Shape([
    new THREE.Vector2(-2.5, 0), new THREE.Vector2(2.5, 0), new THREE.Vector2(0, 1.8),
  ]), { depth: 7, bevelEnabled: false });
  gable.translate(0, 0, -3.5);
  kit.part(gable, wall, hs, 0, 3, 0).rotation.y = Math.PI / 2;
  // roof slopes: outer edges down (rotation sign matches the side), eaves overhang the walls
  const slope = Math.atan2(1.8, 2.5);
  const run = Math.hypot(2.5, 1.8) + 0.35;
  for (const s of [-1, 1]) {
    const r = kit.box(7.5, 0.15, run, roof, 0, 3 + 0.9 + 0.08, s * 1.25, hs);
    r.rotation.x = s * slope;
  }
  for (const wx of [-2.2, 0.6, 2.4]) kit.box(1.0, 1.0, 0.06, '#3d5470', wx, 1.7, -2.52, hs);
  kit.box(0.9, 2.0, 0.06, '#6a4a30', -0.8, 1.0, -2.52, hs);
  kit.box(0.6, 1.4, 0.6, '#9a5a44', 2.0, 4.4, 0.6, hs); // chimney
  // fence 2 m in front of the house
  for (let i = 0; i <= 10; i++) kit.box(0.1, 0.9, 0.1, '#8a6a44', -5 + i, 0.45, -4.5, hs);
  for (const y of [0.35, 0.75]) kit.box(10, 0.08, 0.05, '#9c7a50', 0, y, -4.5, hs);
}

/** Ploughed field: alternating brown furrows / green crop rows, flat, filling [x0..x1] × [z0..z1]. */
export function cropField(kit: Kit, g: THREE.Object3D, x0: number, x1: number, z0: number, z1: number): void {
  const rows = Math.floor((z1 - z0) / 0.8);
  const len = x1 - x0;
  for (let i = 0; i < rows; i++) {
    const m = kit.box(len, 0.02, 0.4, i % 2 ? '#7a5a3a' : '#6e8a3a', (x0 + x1) / 2, 0.005, z0 + 0.4 + i * 0.8, g);
    m.castShadow = false;
  }
}
