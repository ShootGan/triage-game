import { insidePropFootprint } from './propSizes';
import type { Scenario } from './types';

/** Granice sceny: |x| ≤ 12, |z| ≤ 9 (kamera przeglądu i teren są do tego dobrane). */
export const SCENE_HALF_X = 12;
export const SCENE_HALF_Z = 9;
export const MIN_PATIENT_SPACING = 1.5;

/**
 * Ogólne reguły poprawności scenariusza (geometria + spójność kliniczna).
 * Zwraca listę problemów — pusta = scenariusz poprawny.
 */
export function scenarioIssues(s: Scenario): string[] {
  const out: string[] = [];
  const ps = s.patients;

  // identyfikatory
  const ids = new Set<string>();
  for (const p of ps) {
    if (ids.has(p.id)) out.push(`powtórzony id: ${p.id}`);
    ids.add(p.id);
  }

  // granice i odstępy
  const [hx, hz] = s.bounds ?? [SCENE_HALF_X, SCENE_HALF_Z];
  const inBounds = (x: number, z: number) => Math.abs(x) <= hx && Math.abs(z) <= hz;
  for (const p of ps) if (!inBounds(...p.position)) out.push(`${p.id}: poza granicami sceny`);
  if (!inBounds(...s.collectionPoint)) out.push('punkt zbiórki poza granicami sceny');
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const [a, b] = [ps[i].position, ps[j].position];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d < MIN_PATIENT_SPACING) out.push(`${ps[i].id}–${ps[j].id}: za blisko (${d.toFixed(2)} m)`);
    }
  }

  // nikt w obrysie rekwizytu (margines 0,4 m — postać ma swoją długość); punkt zbiórki też wolny
  for (const pr of s.props) {
    for (const p of ps) {
      if (p.trapped && pr.kind === 'car') continue; // sits inside the car being cut open
      if (insidePropFootprint(pr.kind, pr.position[0], pr.position[1], pr.rotation, p.position[0], p.position[1], 0.4)) {
        out.push(`${p.id}: w obrysie rekwizytu ${pr.kind}`);
      }
    }
    const [cx, cz] = s.collectionPoint;
    if (insidePropFootprint(pr.kind, pr.position[0], pr.position[1], pr.rotation, cx, cz, 2)) {
      out.push(`punkt zbiórki koliduje z rekwizytem ${pr.kind}`);
    }
  }
  // punkt zbiórki z dala od leżących (plandeka ~3,7 m)
  for (const p of ps) {
    if (!p.vitals.canWalk && Math.hypot(p.position[0] - s.collectionPoint[0], p.position[1] - s.collectionPoint[1]) < 3) {
      out.push(`${p.id}: leży na punkcie zbiórki`);
    }
  }

  // spójność kliniczna
  for (const p of ps) {
    const v = p.vitals;
    const id = p.id;
    if (p.appearance.child !== p.appearsChild) out.push(`${id}: appearance.child ≠ appearsChild`);
    // A drowsy patient who opens eyes to voice (V) can still follow simple commands; P/U cannot.
    if (v.obeysCommands && (v.avpu === 'P' || v.avpu === 'U')) out.push(`${id}: wykonuje polecenia, ale AVPU = ${v.avpu}`);
    if (v.canWalk && !['sitting', 'standing'].includes(p.pose)) out.push(`${id}: chodzący powinien siedzieć/stać`);
    if (v.canWalk && (!v.breathing.spontaneous || !v.obeysCommands)) out.push(`${id}: chodzący musi oddychać i wykonywać polecenia`);
    if (!v.breathing.spontaneous) {
      if (v.avpu !== 'U') out.push(`${id}: bezdech, ale AVPU ≠ U`);
      if (v.obeysCommands) out.push(`${id}: bezdech, ale wykonuje polecenia`);
      if (!['back', 'front'].includes(p.pose)) out.push(`${id}: bezdech — powinien leżeć`);
      const resumes = v.breathing.afterAirway || !!v.breathing.afterRescueBreaths;
      if (!resumes && v.breathing.rate !== 0) out.push(`${id}: brak oddechu — rate powinien być 0`);
    } else if (v.breathing.rate <= 0) {
      out.push(`${id}: oddycha, ale rate ≤ 0`);
    }
    if (!v.peripheralPulse && v.crtSeconds <= 2) out.push(`${id}: brak tętna obwodowego przy CRT ≤ 2 s`);
    // Pulse and CRT are interchangeable perfusion checks (and JumpSTART ignores CRT): they must agree,
    // or a correct check of one gives a different answer than the algorithm.
    if (v.peripheralPulse && v.breathing.spontaneous && v.crtSeconds > 2) out.push(`${id}: tętno obecne, ale CRT > 2 s`);
    if (v.nonAmbulatoryByAge && (!p.appearsChild || p.ageYears > 2)) out.push(`${id}: nonAmbulatoryByAge tylko dla niemowląt`);
    if (p.majorBleeding && v.canWalk) out.push(`${id}: masywny krwotok, a chodzi`);
    if (p.injuries.length === 0) out.push(`${id}: brak opisu obrażeń`);
    if (p.appearance.pregnant && (p.appearance.sex !== 'f' || p.appearsChild)) out.push(`${id}: ciąża tylko u dorosłej kobiety`);
    if (p.trapped) {
      if (p.pose !== 'sitting' || v.canWalk) out.push(`${id}: uwięziony w aucie — siedzi, nie chodzi`);
      if (!s.props.some((pr) => pr.kind === 'car' && insidePropFootprint('car', pr.position[0], pr.position[1], pr.rotation, p.position[0], p.position[1]))) {
        out.push(`${id}: uwięziony, ale poza autem`);
      }
    }
  }
  if (!ps.some((p) => p.vitals.canWalk)) out.push('brak chodzących poszkodowanych');
  return out;
}
