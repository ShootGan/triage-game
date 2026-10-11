import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory, type Vitals } from '../engine/triage';
import { busScenario } from './bus';
import type { PropKind } from './propSizes';

/** Źródło prawdy: zamierzona kategoria każdego pacjenta. */
const EXPECTED: Record<string, TriageCategory> = {
  p01: 'green',
  p02: 'green',
  p03: 'green',
  p04: 'yellow',
  p05: 'yellow',
  p06: 'red',
  p07: 'red',
  p08: 'red',
  p09: 'red',
  p10: 'red',
  p11: 'black',
  p12: 'black',
};

const patients = busScenario.patients;

describe('scenariusz: wypadek autobusu szkolnego', () => {
  it('12 pacjentów, unikalne identyfikatory', () => {
    expect(patients).toHaveLength(12);
    expect(new Set(patients.map(p => p.id)).size).toBe(patients.length);
    expect(patients.map(p => p.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(patients.map(p => [p.id, p.label, p] as const))('%s (%s) — kategoria zgodna z zamierzoną', (id, _label, p) => {
    expect(triage(p.vitals, p.appearsChild).category).toBe(EXPECTED[id]);
  });

  it('rozkład kategorii', () => {
    const count = (c: TriageCategory) => Object.values(EXPECTED).filter(x => x === c).length;
    expect({ green: count('green'), yellow: count('yellow'), red: count('red'), black: count('black') }).toEqual({
      green: 3,
      yellow: 2,
      red: 5,
      black: 2,
    });
  });

  it('dzieci: co najmniej 5, w tym ≤ 8 lat; nastolatek oceniany START-em (przypadek brzegowy)', () => {
    const kids = patients.filter(p => p.appearsChild);
    expect(kids.length).toBeGreaterThanOrEqual(5);
    expect(kids.some(p => p.ageYears <= 8)).toBe(true);
    const teen = patients.find(p => p.ageYears >= 13 && p.ageYears < 18);
    expect(teen?.appearsChild).toBe(false);
    // W JumpSTART ten sam pacjent byłby ŻÓŁTY — dlatego jest dobrym przypadkiem brzegowym.
    expect(triage(teen!.vitals, true).category).not.toBe(triage(teen!.vitals, false).category);
  });

  it('pozycje: w granicach sceny, ≥ 1,5 m od siebie', () => {
    for (const p of patients) {
      expect(Math.abs(p.position[0])).toBeLessThanOrEqual(12);
      expect(Math.abs(p.position[1])).toBeLessThanOrEqual(9);
    }
    for (let i = 0; i < patients.length; i++) {
      for (let j = i + 1; j < patients.length; j++) {
        const [a, b] = [patients[i].position, patients[j].position];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${patients[i].id}–${patients[j].id}`).toBeGreaterThanOrEqual(1.5);
      }
    }
  });

  it('kierowca samochodu uwięziony w aucie (siedzi, nie chodzi)', () => {
    const trapped = patients.filter((p) => p.trapped);
    expect(trapped.map((p) => p.id)).toEqual(['p07']);
    expect(trapped[0]).toMatchObject({ pose: 'sitting' });
    expect(trapped[0].vitals.canWalk).toBe(false);
  });

  it('pozycje: nikt w obrysie pojazdu', () => {
    // Prostokąt pojazdu w jego lokalnym układzie (z zapasem).
    const footprint: Partial<Record<PropKind, readonly [number, number]>> = { bus: [5.5, 1.8], car: [2.6, 1.3] };
    for (const prop of busScenario.props) {
      const f = footprint[prop.kind];
      if (!f) continue;
      const [hl, hw] = f;
      for (const p of patients) {
        if (p.trapped && prop.kind === 'car') continue; // the driver trapped inside the car
        const dx = p.position[0] - prop.position[0];
        const dz = p.position[1] - prop.position[1];
        const c = Math.cos(prop.rotation);
        const s = Math.sin(prop.rotation);
        // Sprawdzenie dla obu konwencji znaku obrotu.
        for (const sign of [1, -1]) {
          const lx = dx * c + sign * dz * s;
          const lz = -sign * dx * s + dz * c;
          expect(Math.abs(lx) > hl || Math.abs(lz) > hw, `${p.id} w obrysie: ${prop.kind}`).toBe(true);
        }
      }
    }
  });

  it('spójność parametrów z obrazem klinicznym', () => {
    for (const p of patients) {
      const v = p.vitals;
      if (v.obeysCommands) expect(v.avpu, p.id).toBe('A');
      if (v.canWalk) expect(['sitting', 'standing'], p.id).toContain(p.pose);
      if (!v.breathing.spontaneous) {
        expect(v.avpu, p.id).toBe('U');
        expect(v.obeysCommands, p.id).toBe(false);
        expect(['back', 'front'], p.id).toContain(p.pose);
        const resumes = v.breathing.afterAirway || !!v.breathing.afterRescueBreaths;
        if (!resumes) expect(v.breathing.rate, p.id).toBe(0);
      }
      if (!v.peripheralPulse) expect(v.crtSeconds, p.id).toBeGreaterThan(2);
      expect(p.appearance.child, p.id).toBe(p.appearsChild);
    }
    const bleeders = patients.filter(p => p.majorBleeding);
    expect(bleeders.length).toBeGreaterThanOrEqual(1);
    for (const b of bleeders) {
      expect(b.vitals.canWalk).toBe(false);
      expect(!b.vitals.peripheralPulse || b.vitals.crtSeconds > 2).toBe(true);
    }
  });

  describe('pokrycie kryteriów CZERWONYCH i CZARNYCH', () => {
    const results = patients.map(p => ({ p, r: triage(p.vitals, p.appearsChild) }));
    const decisive = (protocol: 'START' | 'JumpSTART', cat: TriageCategory, stepId: string, pred: (v: Vitals) => boolean = () => true) =>
      results.some(
        ({ p, r }) => r.protocol === protocol && r.category === cat && r.steps.at(-1)?.id === stepId && pred(p.vitals),
      );
    /** Kryterium spełnione u pacjenta CZERWONEGO danego algorytmu (niekoniecznie rozstrzygające). */
    const present = (protocol: 'START' | 'JumpSTART', pred: (v: Vitals) => boolean) =>
      results.some(({ p, r }) => r.protocol === protocol && r.category === 'red' && p.vitals.breathing.spontaneous && pred(p.vitals));

    it('START: oddechy > 30', () => expect(decisive('START', 'red', 'resp-rate')).toBe(true));
    it('START: brak tętna promieniowego / CRT > 2 s', () => expect(decisive('START', 'red', 'perfusion')).toBe(true));
    it('START: nie wykonuje poleceń (u pacjenta czerwonego)', () => expect(present('START', v => !v.obeysCommands)).toBe(true));
    it('START: bezdech, oddycha po udrożnieniu', () => expect(decisive('START', 'red', 'airway')).toBe(true));
    it('JumpSTART: oddechy < 15 lub > 45', () =>
      expect(decisive('JumpSTART', 'red', 'resp-rate', v => v.breathing.rate < 15 || v.breathing.rate > 45)).toBe(true));
    it('JumpSTART: AVPU P nieadekwatne (u dziecka czerwonego)', () =>
      expect(present('JumpSTART', v => v.avpu === 'P' && !v.painResponseAppropriate)).toBe(true));
    it('JumpSTART: bezdech z tętnem, oddycha po 5 oddechach ratowniczych', () =>
      expect(decisive('JumpSTART', 'red', 'rescue-breaths')).toBe(true));
    it('START: bezdech po udrożnieniu → CZARNY', () => expect(decisive('START', 'black', 'airway')).toBe(true));
    it('JumpSTART: bezdech bez tętna → CZARNY', () => expect(decisive('JumpSTART', 'black', 'apneic-pulse')).toBe(true));
  });

  it('chodzący — w tym krzyczące, lekko ranne dziecko (dystraktor)', () => {
    const walkers = patients.filter(p => p.vitals.canWalk);
    expect(walkers.length).toBeGreaterThanOrEqual(3);
    expect(walkers.some(p => p.appearsChild && p.remark)).toBe(true);
  });
});
