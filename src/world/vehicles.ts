import * as THREE from 'three';
import { createHuman } from './human';
import type { Kit } from './materials';
import { applyPose } from './poses';
import { GLASS, SIGNAL_BLUE, beam, blinkLight, propGroup, rbox, sideText } from './propUtils';

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

const TOOL = '#e8a020';
const HOSE = '#e8641e';

/**
 * Firefighters freeing a trapped driver, placed on the same position/rotation as the car ('-cut' variant):
 * one kneels at the driver's side cutting the A-pillar, one at the front with a spreader; hydraulic
 * power unit with hoses, the cut-off roof behind the car, the driver's door on the ground, cribbing under
 * the sills. Leaves the spot at the driver's door (local x ≈ −0.2, z ≈ −1.55) free for the medic.
 */
export function buildExtrication(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, color = '#2f4f8a'): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const firefighter = (lx: number, lz: number, face: number, pose: 'kneeling' | 'standing') => {
    const h = createHuman(kit, { firefighter: true, skin: '#e0b088' });
    applyPose(h, pose);
    // both arms reaching forward to hold the tool
    h.arms.forEach((a, i) => { a.sh.rotation.set(pose === 'kneeling' ? -1.2 : -1.0, 0, (i ? -1 : 1) * 0.15); a.el.rotation.x = -0.4; });
    h.root.position.set(lx, 0, lz);
    h.root.rotation.y = face;
    g.add(h.root);
  };
  firefighter(1.0, -1.35, 0, 'kneeling');        // at the A-pillar, facing the car (+z)
  firefighter(2.55, 0.45, -Math.PI / 2, 'standing'); // in front of the car, facing it (−x)

  // cutter at the driver-side A-pillar, spreader at the front wing
  beam(kit, 0.1, TOOL, { x: 1.0, y: 0.82, z: -0.95 }, { x: 0.68, y: 1.08, z: -0.82 }, g);
  kit.box(0.08, 0.12, 0.14, '#2a2a2e', 0.64, 1.12, -0.8, g);
  beam(kit, 0.1, TOOL, { x: 2.15, y: 0.95, z: 0.45 }, { x: 1.85, y: 0.72, z: 0.55 }, g);
  kit.box(0.12, 0.08, 0.16, '#2a2a2e', 1.82, 0.7, 0.56, g);

  // hydraulic power unit and hoses along the ground
  kit.box(0.6, 0.45, 0.42, '#d6303a', -1.2, 0.23, -2.4, g);
  kit.box(0.5, 0.06, 0.06, '#2a2a2e', -1.2, 0.5, -2.4, g);
  const hose = (pts: Array<[number, number, number]>) => {
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      beam(kit, 0.035, HOSE, { x: a[0], y: a[1], z: a[2] }, { x: b[0], y: b[1], z: b[2] }, g).castShadow = false;
    }
  };
  hose([[-0.9, 0.2, -2.3], [0.4, 0.03, -2.0], [1.05, 0.03, -1.7], [1.05, 0.75, -1.05]]);
  hose([[-0.9, 0.15, -2.45], [1.6, 0.03, -2.3], [2.9, 0.03, -0.6], [2.25, 0.9, 0.42]]);

  // cut-off roof behind the car, driver's door on the ground, cribbing under the sills
  const roof = kit.joint(g, -3.3, 0.04, -1.2);
  roof.rotation.y = 0.3;
  kit.box(1.9, 0.06, 1.55, color, 0, 0, 0, roof);
  for (const px of [-0.9, 0.9]) for (const pz of [-0.72, 0.72]) kit.box(0.08, 0.16, 0.08, color, px, 0.08, pz, roof);
  rbox(kit, 1.0, 0.06, 0.75, color, -1.65, 0.03, -1.95, g, 0, 0.5, 0);
  for (const px of [-1.0, 1.0]) for (const pz of [-0.95, 0.95]) kit.box(0.3, 0.3, 0.2, '#b08850', px, 0.15, pz, g);
  return g;
}
