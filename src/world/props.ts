import * as THREE from 'three';
import type { Kit } from './materials';

export type PropKind = 'bus' | 'car' | 'glass';

/** Prostokątny obrys rekwizytu na ziemi (do omijania przy rozmieszczaniu ratownika). */
export interface Footprint {
  x: number;
  z: number;
  rotY: number;
  halfW: number; // wzdłuż lokalnej osi X
  halfD: number; // wzdłuż lokalnej osi Z
}

const FOOTPRINT: Record<PropKind, [number, number] | null> = {
  bus: [5.2, 1.5],
  car: [1.9, 0.95],
  glass: null,
};

export function propFootprint(kind: PropKind, x: number, z: number, rotY: number): Footprint | null {
  const f = FOOTPRINT[kind];
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

/** Autobus szkolny (przewrócony lekko na bok — pochylenie jak w prototypie). */
export function buildBus(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const bus = new THREE.Group();
  parent.add(bus);
  kit.box(10, 2.6, 2.6, '#f2c230', 0, 1.8, 0, bus);
  // r186: CapsuleGeometry(radius, height, capSegments, radialSegments) — `height` = długość części środkowej, jak `length` w r160
  const roof = kit.part(new THREE.CapsuleGeometry(1.3, 7.4, 6, 12), '#f2c230', bus, 0, 2.9, 0);
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(0.35, 1, 1);
  kit.box(10.05, 0.35, 2.65, '#2a2a2e', 0, 0.62, 0, bus);
  kit.box(10.06, 0.12, 2.66, '#2a2a2e', 0, 1.55, 0, bus);
  for (let i = 0; i < 7; i++) kit.box(1.0, 0.9, 2.66, '#3d5470', -4 + i * 1.25, 2.3, 0, bus);
  kit.box(0.1, 1.2, 2.2, '#3d5470', 5.0, 2.2, 0, bus);
  const wheel = kit.own(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 14));
  for (const wx of [-3.4, 3.4]) for (const wz of [-1.3, 1.3]) kit.part(wheel, '#22232a', bus, wx, 0.55, wz).rotation.x = Math.PI / 2;
  bus.position.set(x, 0.15, z);
  bus.rotation.set(0, rotY, 0.12);
  return bus;
}

export function buildCar(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const car = new THREE.Group();
  parent.add(car);
  kit.box(3.6, 0.7, 1.7, '#b03a3a', 0, 0.7, 0, car);
  kit.box(1.9, 0.6, 1.6, '#b03a3a', -0.3, 1.3, 0, car);
  kit.box(1.92, 0.42, 1.62, '#3d5470', -0.3, 1.32, 0, car);
  kit.box(0.1, 0.25, 1.4, '#e8e8d0', 1.8, 0.8, 0, car);
  const wheel = kit.own(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 12));
  for (const wx of [-1.2, 1.2]) for (const wz of [-0.85, 0.85]) kit.part(wheel, '#22232a', car, wx, 0.34, wz).rotation.x = Math.PI / 2;
  car.position.set(x, 0, z);
  car.rotation.y = rotY;
  return car;
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

export function buildProp(kit: Kit, parent: THREE.Object3D, kind: PropKind, x: number, z: number, rotY: number): THREE.Group {
  switch (kind) {
    case 'bus': return buildBus(kit, parent, x, z, rotY);
    case 'car': return buildCar(kit, parent, x, z, rotY);
    case 'glass': return buildGlass(kit, parent, x, z, rotY);
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
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = kit.joint(g, sx * (size / 2 + 0.25), 0, sz * (size / 2 + 0.25));
    kit.box(0.3, 0.03, 0.3, '#e8641e', 0, 0.015, 0, c);
    kit.part(new THREE.ConeGeometry(0.12, 0.45, 10), '#e8641e', c, 0, 0.25, 0);
    kit.part(new THREE.CylinderGeometry(0.075, 0.095, 0.08, 10), '#f4f4f4', c, 0, 0.26, 0);
  }
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

/** Torba medyczna (czerwona z białym krzyżem). Lokalny środek na ziemi. */
export function buildMedBag(kit: Kit, parent: THREE.Object3D): THREE.Group {
  const g = new THREE.Group();
  parent.add(g);
  kit.box(0.45, 0.28, 0.25, '#c02828', 0, 0.14, 0, g);
  kit.box(0.12, 0.12, 0.26, '#f4f4f4', 0, 0.16, 0, g);
  kit.box(0.04, 0.12, 0.27, '#f4f4f4', 0, 0.16, 0, g);
  return g;
}
