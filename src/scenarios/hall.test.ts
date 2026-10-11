import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory } from '../engine/triage';
import { hallScenario } from './hall';
import { scenarioIssues } from './validate';

/** Source of truth: intended category of every patient. */
const EXPECTED: Record<string, TriageCategory> = {
  h01: 'green',
  h02: 'green',
  h03: 'green',
  h04: 'green',
  h05: 'yellow',
  h06: 'yellow',
  h07: 'yellow',
  h08: 'yellow',
  h09: 'yellow',
  h10: 'red',
  h11: 'red',
  h12: 'red',
  h13: 'red',
  h14: 'red',
  h15: 'black',
  h16: 'black',
};

const patients = hallScenario.patients;
const byId = (id: string) => {
  const p = patients.find((x) => x.id === id);
  if (!p) throw new Error(`brak pacjenta ${id}`);
  return p;
};
const resultOf = (id: string) => {
  const p = byId(id);
  return triage(p.vitals, p.appearsChild);
};

describe('scenariusz: zawalenie dachu hali wystawowej', () => {
  it('ogólne reguły poprawności (validate.ts)', () => {
    expect(scenarioIssues(hallScenario)).toEqual([]);
  });

  it('16 pacjentów, unikalne identyfikatory zgodne z EXPECTED', () => {
    expect(patients).toHaveLength(16);
    expect(patients.map((p) => p.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('zima: teren śnieżny, hala z tyłu sceny frontem do kamery, punkt zbiórki przed halą', () => {
    expect(hallScenario.terrain).toBe('snow');
    const hall = hallScenario.props.filter((p) => p.kind === 'hall');
    expect(hall).toHaveLength(1);
    expect(hall[0].rotation).toBe(0);
    expect(hall[0].position[1]).toBeLessThan(-10);
    // everybody has been brought out in front of the hall (front face at z = −7.5)
    for (const p of patients) expect(p.position[1], p.id).toBeGreaterThan(-7);
    expect(hallScenario.collectionPoint[1]).toBeGreaterThan(0);
  });

  it.each(patients.map((p) => [p.id, p.label, p] as const))('%s (%s) — kategoria zgodna z zamierzoną', (id, _label, p) => {
    expect(triage(p.vitals, p.appearsChild).category).toBe(EXPECTED[id]);
  });

  it('rozkład kategorii', () => {
    const count = (c: TriageCategory) => Object.values(EXPECTED).filter((x) => x === c).length;
    expect({ green: count('green'), yellow: count('yellow'), red: count('red'), black: count('black') }).toEqual({
      green: 4,
      yellow: 5,
      red: 5,
      black: 2,
    });
  });

  it('chodzący zieloni (w tym dziecko) — zmarznięci, ale zimno nie zmienia kategorii', () => {
    const walkers = patients.filter((p) => p.vitals.canWalk);
    expect(walkers.map((p) => p.id).sort()).toEqual(['h01', 'h02', 'h03', 'h04']);
    expect(walkers.some((p) => p.appearsChild)).toBe(true);
    expect(walkers.some((p) => p.injuries.join(' ').match(/zimn|drż|trzęs/))).toBe(true);
  });

  describe('dzieci', () => {
    it('3 dzieci (JumpSTART), rodziny na targach', () => {
      expect(patients.filter((p) => p.appearsChild).map((p) => p.id).sort()).toEqual(['h03', 'h07', 'h13']);
    });

    it('10-latek: ŻÓŁTY w obu algorytmach (wiek 9–12 — akceptowany każdy)', () => {
      const p = byId('h07');
      expect(triage(p.vitals, true).category).toBe('yellow');
      expect(triage(p.vitals, false).category).toBe('yellow');
    });

    it('dziecko bez tętna obwodowego, oddech w normie JumpSTART → CZERWONE (perfuzja)', () => {
      const r = resultOf('h13');
      expect(r.protocol).toBe('JumpSTART');
      expect(r.steps.at(-1)?.id).toBe('perfusion');
    });
  });

  describe('dorośli (START)', () => {
    it('zmiażdżenie klatki piersiowej: oddechy > 30 → CZERWONY', () => {
      expect(resultOf('h10').steps.at(-1)?.id).toBe('resp-rate');
      expect(byId('h10').vitals.breathing.rate).toBeGreaterThan(30);
    });
    it('masywny krwotok: brak tętna promieniowego → CZERWONY', () => {
      expect(patients.filter((p) => p.majorBleeding).map((p) => p.id)).toEqual(['h11']);
      expect(resultOf('h11').steps.at(-1)?.id).toBe('perfusion');
    });
    it('uraz głowy, nie wykonuje poleceń → CZERWONY', () => {
      expect(resultOf('h12').steps.at(-1)?.id).toBe('mental');
    });
    it('wydobyty spod śniegu: oddycha dopiero po udrożnieniu → CZERWONY', () => {
      expect(resultOf('h14').steps.at(-1)?.id).toBe('airway');
      expect(resultOf('h14').category).toBe('red');
    });
    it('bezdech mimo udrożnienia → CZARNY', () => {
      for (const id of ['h15', 'h16']) expect(resultOf(id).steps.at(-1)?.id, id).toBe('airway');
    });
    it('zmiażdżenia i złamania obecne', () => {
      const all = patients.flatMap((p) => p.injuries).join(' ');
      expect(all).toMatch(/przygnieci|zmiażdż/);
      expect(all).toMatch(/złamani/);
    });
  });
});
