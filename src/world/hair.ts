import * as THREE from 'three';
import type { Kit } from './materials';

export type HairStyle = 'short' | 'long' | 'ponytail' | 'bald' | 'none';

// Włosy: jedna gładka powłoka dopasowana do czaszki
export const SKULL_R = 0.105;
export const SKULL_SCALE: readonly [number, number, number] = [0.88, 1.02, 0.98];
export const SKULL_Y = 0.01;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface HairShellOptions {
  /** Linia włosów (w jednostkach promienia czaszki, oś y) z przodu / z boku / z tyłu. */
  front: number;
  side: number;
  back: number;
  thick?: number;
  /** Wysokość łysiny na czubku (null = brak). */
  crown?: number | null;
  volume?: number;
  /** Przedziałek / grzywka na bok. */
  sweep?: number;
}

/** Linia włosów: wysokość zależna od kierunku: przód / bok / tył. */
export function hairShell(kit: Kit, head: THREE.Object3D, color: string, o: HairShellOptions): THREE.Mesh {
  const { front, side, back, thick = 0.1, crown = null, volume = 0.06, sweep = 0 } = o;
  const g = new THREE.SphereGeometry(1, 40, 30);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const a = Math.abs(Math.atan2(v.x, v.z)); // 0 = przód, π = tył
    let hl = a < Math.PI / 2
      ? front + (side - front) * smooth(0, Math.PI / 2, a)
      : side + (back - side) * smooth(Math.PI / 2, Math.PI, a);
    if (sweep) hl -= sweep * Math.max(0, v.x) * (a < Math.PI / 2 ? 1 : 0);
    let s = smooth(hl - 0.08, hl + 0.06, v.y);
    if (crown !== null) s *= 1 - smooth(crown - 0.1, crown + 0.05, v.y); // łysina na czubku
    const r = 0.9 + s * (0.1 + thick + volume * Math.max(0, v.y));
    p.setXYZ(i, v.x * r * SKULL_R, v.y * r * SKULL_R, v.z * r * SKULL_R);
  }
  g.computeVertexNormals();
  const m = kit.part(g, color, head, 0, SKULL_Y, 0);
  m.scale.set(SKULL_SCALE[0], SKULL_SCALE[1], SKULL_SCALE[2]);
  return m;
}

export function makeHair(kit: Kit, head: THREE.Object3D, style: HairStyle, color: string): void {
  if (style === 'none') return;
  if (style === 'bald') {
    hairShell(kit, head, color, { front: 5, side: -0.3, back: -0.55, thick: 0.05, crown: 0.15, volume: 0 });
    return;
  }
  if (style === 'short') {
    hairShell(kit, head, color, { front: 0.5, side: 0.15, back: -0.5, thick: 0.1 });
    return;
  }
  // long / ponytail
  hairShell(kit, head, color, { front: 0.42, side: style === 'long' ? -0.35 : 0.05, back: -0.6, thick: 0.1, sweep: 0.1 });
  if (style === 'long') {
    // spływające włosy: jedna gładka bryła z tyłu, zachodząca na powłokę (bez szczelin)
    const drape = kit.part(new THREE.CapsuleGeometry(0.085, 0.17, 8, 16), color, head, 0, -0.08, -0.052);
    drape.scale.set(1.12, 1, 0.62);
    drape.rotation.x = 0.1;
    for (const s of [-1, 1]) {
      const strand = kit.part(new THREE.CapsuleGeometry(0.03, 0.12, 6, 10), color, head, s * 0.082, -0.06, -0.01);
      strand.scale.set(0.8, 1, 1);
      strand.rotation.z = s * 0.06;
    }
  } else {
    kit.part(new THREE.TorusGeometry(0.02, 0.008, 6, 12), '#d02a6a', head, 0, 0.03, -0.112).rotation.x = 0.3;
    const tail = kit.part(new THREE.CapsuleGeometry(0.03, 0.1, 6, 10), color, head, 0, -0.03, -0.135);
    tail.rotation.x = 0.35;
    tail.scale.set(1, 1, 0.85);
  }
}
