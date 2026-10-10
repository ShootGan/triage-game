import type { Human } from './human';

export type PoseName = 'lyingBack' | 'lyingFront' | 'sitting' | 'kneeling' | 'standing';

export interface LyingBackOptions {
  /** Która noga zgięta w kolanie (-1 = żadna). */
  kneeUp?: -1 | 0 | 1;
  armOut?: [number, number];
  headTurn?: number;
}

/** Przywraca wszystkie stawy do pozycji spoczynkowej (stojąc, ręce wzdłuż ciała). */
export function resetPose(h: Human): void {
  h.body.position.y = h.baseBodyY;
  h.body.rotation.set(0, 0, 0);
  h.head.rotation.set(0, 0, 0);
  h.arms.forEach((a, i) => {
    a.sh.rotation.set(0, 0, h.shoulderZ[i]);
    a.el.rotation.set(0, 0, 0);
    a.hand.rotation.set(0, 0, 0);
  });
  h.legs.forEach((l) => {
    l.hip.rotation.set(0, 0, 0);
    l.knee.rotation.set(0, 0, 0);
    l.ankle.rotation.set(0, 0, 0);
  });
}

export function placeHuman(h: Human, x: number, z: number, rotY: number): void {
  h.root.position.set(x, 0, z);
  h.root.rotation.y = rotY;
}

export function lyingBack(h: Human, o: LyingBackOptions = {}): void {
  const { kneeUp = -1, armOut = [0.35, 0.35], headTurn = 0 } = o;
  h.body.position.y = 0.13;
  h.body.rotation.x = -Math.PI / 2;
  h.arms.forEach((a, i) => { a.sh.rotation.z = (i ? 1 : -1) * armOut[i]; a.el.rotation.x = -0.15; });
  h.legs.forEach((l, i) => { l.hip.rotation.z = (i ? 1 : -1) * 0.06; l.ankle.rotation.x = 0.9; l.ankle.rotation.z = (i ? 1 : -1) * 0.4; });
  if (kneeUp !== -1) {
    const l = h.legs[kneeUp];
    l.hip.rotation.x = -0.8;
    l.knee.rotation.x = 1.4;
    l.ankle.rotation.set(-0.3, 0, 0);
  }
  h.head.rotation.y = headTurn;
}

export function lyingFront(h: Human): void {
  h.body.position.y = 0.14;
  h.body.rotation.x = Math.PI / 2;
  h.head.rotation.y = 1.3;
  h.arms[0].sh.rotation.z = -1.5;
  h.arms[0].el.rotation.z = -1.3;
  h.arms[1].sh.rotation.z = 0.25;
  h.legs[1].hip.rotation.set(-0.5, 0, 0.25);
  h.legs[1].knee.rotation.x = 0.9;
  h.legs.forEach((l) => { l.ankle.rotation.x = 0.6; });
}

export function sitting(h: Human): void {
  h.body.position.y = 0.14;
  h.body.rotation.x = 0.25;
  h.legs.forEach((l) => { l.hip.rotation.x = -1.45 - 0.25; l.knee.rotation.x = 1.9; l.ankle.rotation.x = -0.4; });
  h.arms.forEach((a, i) => { a.sh.rotation.set(-1.0, 0, (i ? -1 : 1) * 0.3); a.el.rotation.x = -1.1; });
  h.head.rotation.x = 0.55;
}

export function kneeling(h: Human): void {
  const lean = 0.45;
  h.body.position.y = 0.5;
  h.body.rotation.x = lean;
  h.legs[0].hip.rotation.x = -1.55 - lean; h.legs[0].knee.rotation.x = 1.55; h.legs[0].ankle.rotation.x = 0.05;
  h.legs[1].hip.rotation.x = 0.05 - lean; h.legs[1].knee.rotation.x = 1.55; h.legs[1].ankle.rotation.x = 1.2;
  h.arms.forEach((a, i) => { a.sh.rotation.set(-1.15, 0, (i ? -1 : 1) * 0.12); a.el.rotation.x = -0.35; });
  h.head.rotation.x = 0.45;
}

export function standing(h: Human): void {
  h.arms.forEach((a, i) => { a.sh.rotation.z = (i ? 1 : -1) * 0.08; a.el.rotation.x = -0.2; });
}

/** Ustawia pozę od zera (reset + poza). */
export function applyPose(h: Human, pose: PoseName, opts?: LyingBackOptions): void {
  resetPose(h);
  switch (pose) {
    case 'lyingBack': lyingBack(h, opts); break;
    case 'lyingFront': lyingFront(h); break;
    case 'sitting': sitting(h); break;
    case 'kneeling': kneeling(h); break;
    case 'standing': standing(h); break;
  }
}

/** Faza cyklu chodu (radiany) → wymach nóg i rąk. Zakłada pozę 'standing'. */
export function walkCycle(h: Human, phase: number): void {
  const s = Math.sin(phase);
  h.legs.forEach((l, i) => {
    const k = i ? -s : s;
    l.hip.rotation.x = k * 0.5;
    l.knee.rotation.x = Math.max(0, -k) * 0.7 + 0.05;
    l.ankle.rotation.x = 0;
  });
  h.arms.forEach((a, i) => {
    const k = i ? s : -s;
    a.sh.rotation.x = k * 0.4;
    a.el.rotation.x = -0.25 - Math.max(0, -k) * 0.3;
  });
  h.body.position.y = h.baseBodyY - Math.abs(Math.cos(phase)) * 0.02;
}
