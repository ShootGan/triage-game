import * as THREE from 'three';
import type { Kit } from './materials';

/** Shared building blocks for prop builders (props.ts, vehicles.ts, dressing.ts). */

export const GLASS = '#3d5470';
export const GLASS_CRACKED = '#8ea6ba';
export const HAZARD = '#ffa020';
export const SIGNAL_BLUE = '#3a7cff';

/** Lampka migająca (światła awaryjne / sygnały) — nieoświetlany jaskrawy kolor; GameView przełącza `visible`. */
export function blinkLight(kit: Kit, parent: THREE.Object3D, w: number, h: number, d: number, color: string, x: number, y: number, z: number, group: string): THREE.Mesh {
  const m = new THREE.Mesh(kit.own(new THREE.BoxGeometry(w, h, d)), kit.own(new THREE.MeshBasicMaterial({ color })));
  m.position.set(x, y, z);
  m.userData.blink = group;
  parent.add(m);
  return m;
}

/** Tekstura z canvasa (rysowana raz na pojazd) jako materiał toon. */
export function canvasMat(kit: Kit, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.Material {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  if (c) draw(c);
  const t = kit.own(new THREE.CanvasTexture(cv));
  t.colorSpace = THREE.SRGBColorSpace;
  return kit.own(new THREE.MeshToonMaterial({ map: t, gradientMap: kit.gradientMap }));
}

/** Deterministyczny generator pseudolosowy (ten sam wygląd przy każdym uruchomieniu). */
export function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Grupa rekwizytu ustawiona w świecie. */
export function propGroup(parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

/** Prostopadłościan z obrotem (rx, ry, rz). */
export function rbox(
  kit: Kit, w: number, h: number, d: number, c: string, x: number, y: number, z: number, p: THREE.Object3D,
  rx = 0, ry = 0, rz = 0,
): THREE.Mesh {
  const m = kit.box(w, h, d, c, x, y, z, p);
  m.rotation.set(rx, ry, rz);
  return m;
}

/** Belka/pręt (przekrój t × t) między dwoma punktami (lokalnie). */
export function beam(kit: Kit, t: number, c: string, a: THREE.Vector3Like, b: THREE.Vector3Like, p: THREE.Object3D): THREE.Mesh {
  const d = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const m = kit.box(t, d.length(), t, c, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, p);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/** Flat text plane on a vehicle side; mirrored on the far side so text reads front-to-back correctly. */
export function sideText(kit: Kit, parent: THREE.Object3D, mat: THREE.Material, w: number, h: number, x: number, y: number, halfWidth: number): void {
  for (const s of [1, -1]) {
    const p = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(w, h)), mat);
    p.position.set(x, y, s * halfWidth);
    if (s < 0) p.rotation.y = Math.PI;
    parent.add(p);
  }
}
