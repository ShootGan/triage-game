import * as THREE from 'three';
import type { InjuryLook, LimbSite } from '../scenarios/injuryLook';
import type { Human } from './human';
import type { Kit } from './materials';

const BLOOD = '#7a0c0c';
const WOUND = '#2a0303';
const FRESH = '#c01818';
const BURN = '#b4452c';
const BLISTER = '#ead2b4';
const CHAR = '#1e1a18';
const SOOT = '#2e2826';
const DUST = '#bdb7ab';

/** A point on a limb segment: the joint it hangs from, distance along it, limb radius there. */
export interface SegmentPoint {
  joint: THREE.Object3D;
  y: number;
  r: number;
}

/** Wound spot on a segment (mid-segment; at the end of the remaining limb for an amputation). */
export function segmentPoint(h: Human, s: LimbSite, amputated = false): SegmentPoint {
  const leg = h.legs[s.side];
  const arm = h.arms[s.side];
  switch (s.segment) {
    case 'thigh':
      return { joint: leg.hip, y: -0.26, r: 0.079 };
    case 'shin':
      return amputated ? { joint: leg.hip, y: -0.41, r: 0.063 } : { joint: leg.knee, y: -0.2, r: 0.056 };
    case 'foot':
      return { joint: leg.knee, y: -0.4, r: 0.046 };
    case 'arm':
      return { joint: arm.sh, y: -0.15, r: 0.056 };
    case 'forearm':
      return { joint: arm.el, y: -0.12, r: 0.044 };
    case 'hand':
      return { joint: arm.el, y: -0.22, r: 0.037 };
  }
}

/** Joint whose subtree disappears with the amputation. */
function amputatedJoint(h: Human, s: LimbSite): THREE.Object3D | null {
  switch (s.segment) {
    case 'foot':
      return h.legs[s.side].ankle;
    case 'shin':
      return h.legs[s.side].knee;
    case 'hand':
      return h.arms[s.side].hand;
    case 'forearm':
      return h.arms[s.side].el;
    default:
      return null;
  }
}

/** Partial ring around a limb (front half by default) — a patch of burnt skin, soot or blood. */
function ring(kit: Kit, parent: THREE.Object3D, r: number, y: number, h: number, color: string, start = -Math.PI / 2, len = Math.PI): void {
  kit.part(new THREE.CylinderGeometry(r + 0.004, r + 0.004, h, 12, 1, true, start, len), color, parent, 0, y, 0);
}

function burnPatch(kit: Kit, parent: THREE.Object3D, r: number, y: number, h: number): void {
  ring(kit, parent, r, y, h, BURN);
  kit.sphere(0.014, BLISTER, parent, r * 0.3, y + h * 0.2, r + 0.006, 1, 1, 0.6);
  kit.sphere(0.011, BLISTER, parent, -r * 0.4, y - h * 0.25, r + 0.005, 1, 1, 0.6);
}

/** Small smudges on cheeks, forehead and chin — clear of the eyes (y ≈ 0.02, x ≈ ±0.04). */
function facePatches(kit: Kit, h: Human, color: string): void {
  for (const [x, y, z] of [[0.05, -0.035, 0.07], [-0.055, -0.03, 0.068], [0.015, 0.06, 0.082], [-0.025, 0.07, 0.078], [0.01, -0.085, 0.07]] as const) {
    kit.sphere(0.016, color, h.head, x, y, z, 1.3, 0.9, 0.35);
  }
}

/** Front surface depth of the (flattened) torso at height y — see the lathe profile in human.ts. */
function torsoFront(y: number): number {
  const r = y < 0.2 ? 0.16 : y < 0.32 ? 0.16 + (y - 0.2) * 0.04 : y < 0.44 ? 0.165 + (y - 0.32) * 0.2 : 0.19;
  return r * 0.62;
}

/** Irregular blotches on the front of the torso. */
function torsoBlotches(kit: Kit, h: Human, color: string, pts: readonly (readonly [number, number, number])[]): void {
  for (const [x, y, r] of pts) kit.sphere(r, color, h.body, x, y, torsoFront(y) - r * 0.15, 1.2, 0.9, 0.3);
}

/**
 * Draws what the injury texts describe: missing limb parts with a stump, burns, charred clothes,
 * soot, dust and impaled objects. Bleeding (drops, pool, tourniquet) is animated by the game view.
 */
export function applyInjuryLook(kit: Kit, h: Human, look: InjuryLook): void {
  if (look.amputation) {
    const gone = amputatedJoint(h, look.amputation);
    if (gone) gone.visible = false;
    const p = segmentPoint(h, look.amputation, true);
    // stump: blood-soaked end of the limb, raw wound face
    kit.part(new THREE.CylinderGeometry(p.r + 0.006, p.r + 0.004, 0.09, 12), BLOOD, p.joint, 0, p.y + 0.03, 0);
    kit.part(new THREE.CylinderGeometry(p.r, p.r * 0.8, 0.02, 12), WOUND, p.joint, 0, p.y - 0.02, 0);
    kit.sphere(p.r * 0.45, FRESH, p.joint, 0, p.y - 0.025, 0, 1, 0.4, 1);
  }

  for (const region of look.burns) {
    if (region === 'legs') {
      for (const leg of h.legs) {
        burnPatch(kit, leg.knee, 0.054, -0.18, 0.16);
        burnPatch(kit, leg.hip, 0.078, -0.3, 0.12);
      }
    } else if (region === 'arms') {
      for (const arm of h.arms) burnPatch(kit, arm.el, 0.044, -0.1, 0.14);
    } else if (region === 'torso') {
      torsoBlotches(kit, h, BURN, [[0.04, 0.3, 0.07], [-0.06, 0.36, 0.06], [0.02, 0.44, 0.055], [-0.04, 0.24, 0.05]]);
      torsoBlotches(kit, h, BLISTER, [[0.05, 0.33, 0.016], [-0.05, 0.4, 0.014]]);
    } else if (region === 'face') {
      facePatches(kit, h, BURN);
    }
  }

  if (look.charred) {
    for (const leg of h.legs) {
      ring(kit, leg.knee, 0.058, -0.3, 0.14, CHAR, 0, Math.PI * 1.4);
      ring(kit, leg.hip, 0.083, -0.36, 0.08, CHAR, Math.PI, Math.PI);
    }
  }
  if (look.soot) {
    facePatches(kit, h, SOOT);
    torsoBlotches(kit, h, SOOT, [[-0.05, 0.46, 0.035], [0.06, 0.4, 0.028], [0.0, 0.3, 0.025]]);
  }
  if (look.dust) {
    facePatches(kit, h, DUST);
    kit.sphere(0.06, DUST, h.head, 0, 0.09, 0, 1.4, 0.45, 1.3); // dust on the hair
    for (const arm of h.arms) ring(kit, arm.sh, 0.062, -0.06, 0.08, DUST, 0, Math.PI * 2);
    torsoBlotches(kit, h, DUST, [[0.05, 0.42, 0.05], [-0.06, 0.32, 0.045], [0.02, 0.22, 0.04]]);
  }

  if (look.impaled) {
    const glass = look.impaled.kind === 'glass';
    const g = new THREE.Group();
    if (glass) {
      kit.box(0.014, 0.17, 0.065, '#cfeef8', 0, 0.08, 0, g).rotation.y = 0.6;
    } else {
      kit.part(new THREE.CylinderGeometry(0.011, 0.011, 0.28, 8), '#6d7076', g, 0, 0.12, 0);
    }
    kit.sphere(0.022, BLOOD, g, 0, 0, 0, 1.2, 0.5, 1.2); // blood around the entry
    if (look.impaled.site === 'buttock') {
      g.position.set(-0.07, -0.02, -0.17);
      g.rotation.x = -1.2;
      h.body.add(g);
    } else {
      const p = segmentPoint(h, look.impaled.site);
      g.position.set(0, p.y, p.r);
      g.rotation.x = 1.3; // sticks out of the front of the limb
      p.joint.add(g);
    }
  }
}
