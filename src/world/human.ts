import * as THREE from 'three';
import type { Kit } from './materials';
import { makeHair, type HairStyle } from './hair';

export interface HumanOptions {
  skin?: string;
  shirt?: string;
  pants?: string;
  hair?: string;
  shoes?: string;
  hairStyle?: HairStyle;
  female?: boolean;
  child?: boolean;
  sleeves?: 'short' | 'long';
  medic?: boolean;
  beard?: boolean;
}

export interface Arm {
  sh: THREE.Group;
  el: THREE.Group;
  hand: THREE.Group;
}

export interface Leg {
  hip: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
}

/** Uchwyt postaci: korzeń + stawy do pozowania i animacji. */
export interface Human {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  arms: [Arm, Arm];
  legs: [Leg, Leg];
  child: boolean;
  female: boolean;
  /** Spoczynkowa wysokość tułowia (stojąc) — do resetu pozy. */
  baseBodyY: number;
  /** Spoczynkowa skala z tułowia — baza dla animacji oddechu. */
  torsoScaleZ: number;
  /** Spoczynkowe obroty barków (rotation.z). */
  shoulderZ: [number, number];
}

const STRIPE = '#e9ecb8'; // pasy odblaskowe
const GLOVE = '#3a5a9a';

/** Proceduralny generator postaci (port z art-preview/3d-v3.html). */
export function createHuman(kit: Kit, o: HumanOptions = {}): Human {
  const {
    skin = '#f1c27d', shirt = '#3b5dc9', pants = '#41506b', hair = '#5a3b2a', shoes = '#2a2a2e',
    hairStyle = 'short', female = false, child = false, sleeves = 'short', medic = false, beard = false,
  } = o;
  const skinDark = new THREE.Color(skin).multiplyScalar(0.75).getStyle();
  const root = new THREE.Group();
  const body = kit.joint(root, 0, 0.94, 0);
  const sx = female ? 0.9 : 1;

  // Miednica + tułów (profil obrotowy, spłaszczony)
  kit.lathe([[0, -0.1], [0.12, -0.09], [0.17, -0.04], [0.18 + (female ? 0.015 : 0), 0.04], [0.17, 0.12], [0, 0.12]], pants, body, 0.66, sx);
  const belt = kit.part(new THREE.CylinderGeometry(0.172, 0.172, 0.03, 20, 1, true), '#2a2a2e', body, 0, 0.1, 0);
  belt.scale.set(sx, 1, 0.67);
  const torso = kit.lathe(
    [[0, 0.08], [0.165, 0.08], [0.155, 0.2], [0.165, 0.32], [0.19, 0.44], [0.2, 0.52], [0.17, 0.6], [0.1, 0.645], [0.055, 0.66], [0, 0.66]],
    shirt, body, 0.62, sx,
  );
  if (female && !child) kit.sphere(0.075, shirt, body, 0, 0.43, 0.055, 1.9, 0.8, 0.55);
  // Kołnierz
  const collar = kit.part(new THREE.TorusGeometry(0.06, 0.018, 6, 14), medic ? '#8f1d2c' : shirt, body, 0, 0.655, 0);
  collar.rotation.x = Math.PI / 2;
  if (medic) {
    const band = kit.part(new THREE.CylinderGeometry(0.168, 0.168, 0.045, 20, 1, true), STRIPE, body, 0, 0.3, 0);
    band.scale.z = 0.63;
    const band2 = kit.part(new THREE.CylinderGeometry(0.162, 0.162, 0.045, 20, 1, true), STRIPE, body, 0, 0.22, 0);
    band2.scale.z = 0.63;
    const backGeo = kit.own(new THREE.PlaneGeometry(0.3, 0.11));
    const back = new THREE.Mesh(backGeo, kit.textMaterial(['RATOWNIK', 'MEDYCZNY']));
    back.position.set(0, 0.47, -0.128);
    back.rotation.y = Math.PI;
    body.add(back);
    kit.box(0.05, 0.06, 0.01, '#f4f4f4', 0.09, 0.47, 0.125, body); // naszywka
  }

  // Szyja i głowa
  kit.part(new THREE.CylinderGeometry(0.045, 0.052, 0.1, 10), skin, body, 0, 0.7, 0);
  const head = kit.joint(body, 0, 0.82, 0.005);
  kit.sphere(0.105, skin, head, 0, 0.01, 0, 0.88, 1.02, 0.98);
  kit.sphere(0.08, skin, head, 0, -0.045, 0.022, 0.92, 0.82, 0.88); // żuchwa
  kit.box(0.022, 0.04, 0.03, skin, 0, -0.005, 0.1, head); // nos
  for (const s of [-1, 1]) {
    kit.sphere(0.025, skin, head, s * 0.093, 0, -0.005, 0.5, 1, 0.8); // ucho
    kit.sphere(0.016, '#f4f4f4', head, s * 0.038, 0.018, 0.085, 1.2, 0.8, 0.6);
    kit.sphere(0.009, '#2a2030', head, s * 0.038, 0.018, 0.094);
    kit.box(0.034, 0.008, 0.01, hair, s * 0.038, 0.045, 0.092, head).rotation.z = s * -0.12; // brew
  }
  kit.box(0.035, 0.006, 0.01, skinDark, 0, -0.06, 0.088, head); // usta
  makeHair(kit, head, hairStyle, hair);
  if (beard) {
    kit.sphere(0.074, hair, head, 0, -0.06, 0.03, 0.98, 0.78, 0.84);
    kit.box(0.05, 0.012, 0.02, hair, 0, -0.042, 0.095, head); // wąsy
  }
  if (child) head.scale.setScalar(1.3);

  // Ręce i nogi
  const arms: Arm[] = [];
  const legs: Leg[] = [];
  for (const s of [-1, 1]) {
    const sh = kit.joint(body, s * 0.205 * sx, 0.55, 0);
    sh.rotation.z = s * 0.06;
    kit.limb(sh, 0.06, 0.048, 0.27, shirt);
    if (medic) kit.part(new THREE.CylinderGeometry(0.054, 0.054, 0.035, 10, 1, true), STRIPE, sh, 0, -0.18, 0);
    const el = kit.joint(sh, 0, -0.27, 0);
    kit.limb(el, 0.046, 0.036, 0.24, sleeves === 'long' ? shirt : skin);
    if (sleeves === 'long') kit.limb(kit.joint(el, 0, -0.22, 0), 0.034, 0.034, 0.02, medic ? '#2a2a2e' : skin);
    const hand = kit.joint(el, 0, -0.245, 0);
    kit.box(0.035, 0.08, 0.07, medic ? GLOVE : skin, 0, -0.04, 0, hand); // dłoń (ratownik w rękawiczkach)
    kit.box(0.025, 0.04, 0.022, medic ? GLOVE : skin, 0, -0.02, 0.04, hand).rotation.x = 0.5; // kciuk
    arms.push({ sh, el, hand });

    const hip = kit.joint(body, s * 0.095 * (female ? 1.05 : 1), -0.03, 0);
    kit.limb(hip, 0.088, 0.062, 0.42, pants);
    const knee = kit.joint(hip, 0, -0.42, 0);
    kit.limb(knee, 0.06, 0.044, 0.41, pants);
    if (medic) kit.part(new THREE.CylinderGeometry(0.056, 0.052, 0.035, 10, 1, true), STRIPE, knee, 0, -0.22, 0);
    const ankle = kit.joint(knee, 0, -0.43, 0);
    kit.box(0.09, 0.07, 0.2, shoes, 0, -0.01, 0.035, ankle);
    kit.sphere(0.045, shoes, ankle, 0, -0.012, 0.13, 1, 0.75, 1);
    legs.push({ hip, knee, ankle });
    if (child) hip.scale.set(1.1, 0.82, 1.1); // dziecko: krótsze, krępe nogi
  }
  if (child) body.position.y = 0.94 * 0.82;
  root.scale.setScalar(child ? 0.58 : 0.92);

  return {
    root, body, torso, head,
    arms: [arms[0], arms[1]],
    legs: [legs[0], legs[1]],
    child, female,
    baseBodyY: body.position.y,
    torsoScaleZ: torso.scale.z,
    shoulderZ: [arms[0].sh.rotation.z, arms[1].sh.rotation.z],
  };
}
