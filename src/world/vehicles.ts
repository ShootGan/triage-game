import * as THREE from 'three';
import type { Kit } from './materials';
import { GLASS, SIGNAL_BLUE, blinkLight, propGroup, sideText } from './propUtils';

const PSP_RED = '#c41e24';
const DARK = '#26272c';
const SHUTTER = '#c8ccd2';

/**
 * Fire engine (Polish PSP, medium class) — 8 × 2.5 m, ~3.3 m tall, front at +x.
 * Red body with aluminium roller shutters, white reflective band, roof ladder, blue signals.
 */
export function buildFiretruck(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const W = 2.45;
  kit.box(7.9, 0.4, 2.2, DARK, 0, 0.75, 0, g); // chassis
  // cab x 2.3..4.0
  kit.box(1.7, 2.0, W, PSP_RED, 3.15, 1.95, 0, g);
  kit.box(0.06, 0.9, W - 0.3, GLASS, 4.03, 2.4, 0, g);        // windscreen
  kit.box(0.9, 0.7, W + 0.06, GLASS, 3.45, 2.45, 0, g);        // side windows
  kit.box(0.18, 0.4, W + 0.06, DARK, 4.05, 0.85, 0, g);        // bumper
  kit.box(0.05, 0.5, 1.4, '#3a3a40', 4.03, 1.35, 0, g);        // grille
  for (const s of [-1, 1]) kit.box(0.05, 0.18, 0.4, '#f4f0c0', 4.03, 1.3, s * 0.85, g); // headlights
  // body x -3.95..2.25 with roller shutters (3 per side) and dark seams between them
  kit.box(6.2, 2.3, W, PSP_RED, -0.85, 2.05, 0, g);
  for (const sx of [-2.9, -0.85, 1.2]) {
    kit.box(1.8, 1.7, W + 0.06, SHUTTER, sx, 2.15, 0, g);
    for (let i = 1; i < 6; i++) kit.box(1.8, 0.02, W + 0.08, '#a8acb4', sx, 1.3 + i * 0.29, 0, g); // slats
  }
  kit.box(8.0, 0.16, W + 0.1, '#f4f4f4', 0.05, 1.12, 0, g);    // reflective band
  // roof: ladder and equipment box
  for (const lz of [-0.45, 0.45]) kit.box(5.6, 0.06, 0.08, '#b8bcc4', -1.0, 3.3, lz, g);
  for (let i = 0; i < 12; i++) kit.box(0.05, 0.05, 0.9, '#b8bcc4', -3.6 + i * 0.47, 3.3, 0, g);
  kit.box(1.2, 0.3, 0.8, '#9a9ea6', 1.4, 3.35, 0.6, g);
  // "STRAŻ" on the cab doors
  sideText(kit, g, kit.textMaterial(['STRAŻ'], PSP_RED, '#f4f4f4'), 1.3, 0.45, 3.05, 1.55, W / 2 + 0.04);
  // blue signals: cab bar (two phases) and rear corners
  kit.box(0.3, 0.1, 1.8, '#e8e8ec', 3.2, 3.0, 0, g);
  for (const [i, lz] of [-0.65, -0.25, 0.25, 0.65].entries()) blinkLight(kit, g, 0.24, 0.12, 0.3, SIGNAL_BLUE, 3.2, 3.1, lz, i % 2 ? 'blueA' : 'blueB');
  for (const [i, lz] of [-1.05, 1.05].entries()) blinkLight(kit, g, 0.14, 0.16, 0.2, SIGNAL_BLUE, -3.98, 3.0, lz, i ? 'blueA' : 'blueB');
  const wheel = kit.own(new THREE.CylinderGeometry(0.52, 0.52, 0.36, 14));
  for (const wx of [3.0, -1.7, -2.85]) for (const wz of [-1.1, 1.1]) kit.part(wheel, '#1c1d22', g, wx, 0.52, wz).rotation.x = Math.PI / 2;
  return g;
}
