import * as THREE from 'three';
import type { Kit } from './materials';

/**
 * Teren: trawa, droga wzdłuż osi X (|z| < 3), krawężniki, pasy, kępki trawy.
 * `size` — bok kwadratu terenu (min. 40 m jak w prototypie).
 */
export function buildTerrain(kit: Kit, parent: THREE.Object3D, size = 40): THREE.Group {
  const g = new THREE.Group();
  parent.add(g);
  kit.box(size, 0.2, size, '#5f9a4a', 0, -0.1, 0, g);
  kit.box(size, 0.22, 6, '#55585f', 0, -0.09, 0, g);
  kit.box(size, 0.25, 0.35, '#a8a8a0', 0, 0, 3.15, g);
  kit.box(size, 0.25, 0.35, '#a8a8a0', 0, 0, -3.15, g);

  // Pasy (współdzielona geometria)
  const half = size / 2;
  const laneGeo = kit.own(new THREE.BoxGeometry(1.4, 0.23, 0.18));
  for (let x = -half + 2; x < half - 1; x += 3) kit.part(laneGeo, '#f0f0e0', g, x, -0.08, 0);

  // Kępki trawy — deterministyczny rozrzut jak w prototypie (160 na 40×40 m)
  const tuftGeo = kit.own(new THREE.ConeGeometry(0.06, 0.25, 4));
  const k = size / 40;
  const count = Math.round(160 * k * k);
  for (let i = 0; i < count; i++) {
    const x = ((Math.sin(i * 91.7) * 0.5 + 0.5) * 36 - 18) * k;
    const z = ((Math.sin(i * 37.3) * 0.5 + 0.5) * 30 - 15) * k;
    if (Math.abs(z) < 3.6) continue;
    kit.part(tuftGeo, i % 3 ? '#4f8a3c' : '#77b05a', g, x, 0.12, z);
  }
  return g;
}
