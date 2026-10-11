import * as THREE from 'three';
import type { Kit } from './materials';
import { propGroup, rbox, rng } from './propUtils';

/** Scene dressing: event equipment and small scattered items. Seeds come from the position, so a scene always looks the same. */

const seedOf = (x: number, z: number) => Math.abs(Math.round(x * 97 + z * 31)) + 11;

/** Concert speaker tower: weighted base, vertical truss, arm towards +z with a hanging line array (~7 m). */
export function buildSpeaker(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const TRUSS = '#b0b4bc';
  kit.box(1.2, 0.12, 1.2, '#55585f', 0, 0.06, 0, g);
  for (const bx of [-0.4, 0.4]) kit.box(0.35, 0.3, 0.35, '#3a3a40', bx, 0.27, -0.4, g); // ballast blocks
  const rod = kit.own(new THREE.BoxGeometry(0.05, 6.8, 0.05));
  for (const dx of [-0.15, 0.15]) for (const dz of [-0.15, 0.15]) kit.part(rod, TRUSS, g, dx, 3.5, dz);
  const rung = kit.own(new THREE.BoxGeometry(0.34, 0.04, 0.04));
  for (let y = 0.5; y < 6.8; y += 0.6) kit.part(rung, TRUSS, g, 0, y, 0.15);
  // arm reaching forward, and the array hanging from it, angled down towards the audience
  for (const dx of [-0.12, 0.12]) kit.box(0.05, 0.05, 1.6, TRUSS, dx, 6.85, 0.7, g);
  const array = kit.joint(g, 0, 6.75, 1.3);
  for (let i = 0; i < 6; i++) {
    const box = rbox(kit, 0.9, 0.32, 0.55, '#1a1a1e', 0, -0.2 - i * 0.33, i * 0.04, array, 0.06 * i, 0, 0);
    box.castShadow = true;
    kit.box(0.8, 0.22, 0.02, '#2e2e36', 0, -0.2 - i * 0.33, i * 0.04 + 0.28, array);
  }
  return g;
}

const AWNINGS: Record<string, [string, string]> = {
  balloons: ['#2f8fd6', '#f4f4f4'],
  food: ['#e8641e', '#f2dd1a'],
};

/** Festival stall 2.4 × 1.4 m: striped awning, counter at +z, sign; 'balloons' adds a bunch of balloons. */
export function buildStall(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, variant = 'food'): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const [c1, c2] = AWNINGS[variant] ?? AWNINGS.food;
  const pole = kit.own(new THREE.BoxGeometry(0.06, 2.3, 0.06));
  for (const sx of [-1.15, 1.15]) for (const sz of [-0.65, 0.65]) kit.part(pole, '#9a9ea6', g, sx, 1.15, sz);
  // awning sloping down towards the counter
  const awning = kit.joint(g, 0, 2.35, 0.05);
  awning.rotation.x = 0.22;
  for (let i = 0; i < 6; i++) kit.box(0.4, 0.05, 1.7, i % 2 ? c2 : c1, -1.0 + i * 0.4, 0, 0, awning);
  kit.box(2.3, 0.9, 0.5, '#e8e2d4', 0, 0.45, 0.45, g);             // counter
  kit.box(2.34, 0.06, 0.56, '#a07a4a', 0, 0.93, 0.45, g);
  kit.box(2.2, 1.0, 0.04, '#d8d2c4', 0, 1.0, -0.66, g);            // back panel
  const sign = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(1.4, 0.4)), kit.textMaterial([variant === 'balloons' ? 'BALONY' : 'GOFRY'], c1, '#f4f4f4'));
  sign.position.set(0, 1.85, 0.72);
  g.add(sign);
  if (variant === 'balloons') {
    const colors = ['#d6303a', '#f2c230', '#2f8fd6', '#3fa34d', '#e86aa8', '#f4f4f4'];
    const rand = rng(seedOf(x, z));
    for (let i = 0; i < 9; i++) {
      const bx = 1.3 + (rand() - 0.5) * 0.9;
      const by = 2.9 + rand() * 0.9;
      const bz = 0.7 + (rand() - 0.5) * 0.7;
      kit.sphere(0.18, colors[i % colors.length], g, bx, by, bz, 1, 1.2, 1);
      kit.box(0.01, by - 1.0, 0.01, '#e8e8e8', (bx + 1.2) / 2, (by + 1.0) / 2, (bz + 0.65) / 2, g); // string to the pole
    }
  } else {
    for (let i = 0; i < 5; i++) kit.box(0.25, 0.08, 0.25, '#d8a860', -0.8 + i * 0.4, 1.0, 0.45, g); // waffles
  }
  return g;
}

/** Concert litter within ~2.5 m: cups, bottles, flyers, a cap and a lost shoe. Flat, walkable. */
export function buildLitter(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const rand = rng(seedOf(x, z));
  const spot = (): [number, number] => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 2.5;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const cup = kit.own(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8));
  const bottle = kit.own(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 8));
  const flyer = kit.own(new THREE.BoxGeometry(0.2, 0.005, 0.28));
  const flat = (m: THREE.Mesh) => { m.castShadow = false; return m; };
  for (let i = 0; i < 14; i++) {
    const [px, pz] = spot();
    const m = flat(kit.part(cup, i % 3 ? '#f4f4f4' : '#d6303a', g, px, 0.05, pz));
    m.rotation.set(0, rand() * Math.PI, Math.PI / 2);
  }
  for (let i = 0; i < 6; i++) {
    const [px, pz] = spot();
    const m = flat(kit.part(bottle, i % 2 ? '#3f7a4a' : '#7a4a22', g, px, 0.04, pz));
    m.rotation.set(0, rand() * Math.PI, Math.PI / 2);
  }
  for (let i = 0; i < 10; i++) {
    const [px, pz] = spot();
    flat(kit.part(flyer, i % 2 ? '#f2dd1a' : '#e86aa8', g, px, 0.012, pz)).rotation.y = rand() * Math.PI;
  }
  const [hx, hz] = spot();
  kit.sphere(0.13, '#1c2f6b', g, hx, 0.04, hz, 1, 0.45, 1).castShadow = false; // cap
  kit.box(0.14, 0.02, 0.1, '#1c2f6b', hx + 0.14, 0.02, hz, g).castShadow = false;
  const [sx, sz] = spot();
  rbox(kit, 0.28, 0.1, 0.1, '#2a2a2e', sx, 0.05, sz, g, 0, rand() * Math.PI, 0); // lost shoe
  return g;
}

/** Scattered belongings within ~1.8 m: school backpacks, jackets, books, a water bottle. */
export function buildBelongings(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const rand = rng(seedOf(x, z));
  const spot = (): [number, number] => {
    const a = rand() * Math.PI * 2;
    const r = 0.3 + Math.sqrt(rand()) * 1.5;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const packs = ['#d6303a', '#2f8fd6', '#f2c230', '#7a3b8a', '#3fa34d'];
  for (let i = 0; i < 4; i++) {
    const [px, pz] = spot();
    const pack = kit.joint(g, px, 0.1, pz);
    pack.rotation.set(Math.PI / 2 - 0.15, rand() * Math.PI, 0);
    kit.box(0.34, 0.4, 0.18, packs[i % packs.length], 0, 0, 0, pack);
    kit.box(0.26, 0.18, 0.06, '#2a2a2e', 0, -0.06, 0.11, pack); // front pocket
  }
  const jackets = ['#41506b', '#c04a7a', '#3a5a3a'];
  for (let i = 0; i < 2; i++) {
    const [px, pz] = spot();
    rbox(kit, 0.62, 0.04, 0.46, jackets[i], px, 0.03, pz, g, 0, rand() * Math.PI, 0).castShadow = false;
    rbox(kit, 0.5, 0.04, 0.14, jackets[i], px + 0.2, 0.05, pz + 0.25, g, 0, rand() * Math.PI, 0).castShadow = false; // sleeve
  }
  for (let i = 0; i < 3; i++) {
    const [px, pz] = spot();
    rbox(kit, 0.2, 0.03, 0.27, i % 2 ? '#e8e2d4' : '#2f8a3e', px, 0.02, pz, g, 0, rand() * Math.PI, 0).castShadow = false;
  }
  const [bx, bz] = spot();
  const b = kit.part(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), '#5ab0e0', g, bx, 0.04, bz);
  b.rotation.set(0, rand() * Math.PI, Math.PI / 2);
  return g;
}

/**
 * Dust cloud hanging low over a collapse (~3 m across), or with variant 'smoke' a dark column
 * rising ~9 m and drifting towards +x. Semi-transparent, casts no shadow.
 */
export function buildDust(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, variant?: string): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const smoke = variant === 'smoke';
  const mat = kit.own(new THREE.MeshToonMaterial({
    color: smoke ? '#4a4a52' : '#c9c0b0',
    gradientMap: kit.gradientMap,
    transparent: true,
    opacity: smoke ? 0.6 : 0.32,
    depthWrite: false,
  }));
  const puff = kit.own(new THREE.SphereGeometry(1, 10, 8));
  const rand = rng(seedOf(x, z));
  const n = smoke ? 12 : 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = smoke ? 0.6 + t * 1.6 : 0.8 + rand() * 0.9;
    const px = smoke ? t * 3.5 + (rand() - 0.5) * 0.6 : (rand() - 0.5) * 3;
    const py = smoke ? 1.0 + t * 8.5 : 0.4 + rand() * 1.4;
    const pz = (rand() - 0.5) * (smoke ? 0.8 : 3);
    const m = new THREE.Mesh(puff, mat);
    m.position.set(px, py, pz);
    m.scale.set(r, r * (smoke ? 0.8 : 0.55), r);
    m.renderOrder = 2;
    g.add(m);
  }
  return g;
}
