import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory, type Vitals } from '../engine/triage';
import { tenementScenario } from './tenement';
import { scenarioIssues } from './validate';

/** Źródło prawdy: zamierzona kategoria każdego pacjenta. */
const EXPECTED: Record<string, TriageCategory> = {
  t01: 'green',
  t02: 'green',
  t03: 'green',
  t04: 'green',
  t05: 'yellow',
  t06: 'yellow',
  t07: 'yellow',
  t08: 'red',
  t09: 'red',
  t10: 'red',
  t11: 'red',
  t12: 'red',
  t13: 'black',
  t14: 'black',
};

const patients = tenementScenario.patients;
const byId = (id: string) => {
  const p = patients.find(x => x.id === id);
  if (!p) throw new Error(`brak pacjenta ${id}`);
  return p;
};
const resultOf = (id: string) => {
  const p = byId(id);
  return triage(p.vitals, p.appearsChild);
};

describe('scenariusz: wybuch gazu w kamienicy', () => {
  it('ogólne reguły poprawności (validate.ts)', () => {
    expect(scenarioIssues(tenementScenario)).toEqual([]);
  });

  it('14 pacjentów, unikalne identyfikatory zgodne z EXPECTED', () => {
    expect(patients).toHaveLength(14);
    expect(new Set(patients.map(p => p.id)).size).toBe(patients.length);
    expect(patients.map(p => p.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('teren miejski: kamienica po stronie z < 0, punkt zbiórki po przeciwnej stronie ulicy', () => {
    expect(tenementScenario.terrain).toBe('street');
    const building = tenementScenario.props.filter(p => p.kind === 'building');
    expect(building).toHaveLength(1);
    expect(building[0].position[1]).toBeLessThan(0);
    const rubble = tenementScenario.props.filter(p => p.kind === 'rubble');
    expect(rubble.length).toBeGreaterThanOrEqual(3);
    expect(rubble.length).toBeLessThanOrEqual(5);
    expect(tenementScenario.collectionPoint[1]).toBeGreaterThanOrEqual(6);
  });

  it.each(patients.map(p => [p.id, p.label, p] as const))('%s (%s) — kategoria zgodna z zamierzoną', (id, _label, p) => {
    expect(triage(p.vitals, p.appearsChild).category).toBe(EXPECTED[id]);
  });

  it('rozkład kategorii', () => {
    const count = (c: TriageCategory) => Object.values(EXPECTED).filter(x => x === c).length;
    expect({ green: count('green'), yellow: count('yellow'), red: count('red'), black: count('black') }).toEqual({
      green: 4,
      yellow: 3,
      red: 5,
      black: 2,
    });
  });

  describe('dzieci (JumpSTART)', () => {
    it('3–4 dzieci', () => {
      const kids = patients.filter(p => p.appearsChild);
      expect(kids.length).toBeGreaterThanOrEqual(3);
      expect(kids.length).toBeLessThanOrEqual(4);
    });

    it('dziecko spod gruzu: bezdech z tętnem → oddycha po 5 oddechach ratowniczych → CZERWONE', () => {
      const r = resultOf('t08');
      expect(r.protocol).toBe('JumpSTART');
      expect(r.category).toBe('red');
      expect(r.steps.at(-1)?.id).toBe('rescue-breaths');
      // W START (dorosły) ten sam pacjent byłby CZARNY — oddechy ratownicze nie należą do START.
      expect(triage(byId('t08').vitals, false).category).toBe('black');
    });

    it('dziecko z oddechem > 45/min → CZERWONE', () => {
      const r = resultOf('t09');
      expect(r.category).toBe('red');
      expect(r.steps.at(-1)?.id).toBe('resp-rate');
      expect(byId('t09').vitals.breathing.rate).toBeGreaterThan(45);
    });

    it('dziecko z AVPU „P" nieadekwatnym → CZERWONE', () => {
      const r = resultOf('t10');
      expect(r.category).toBe('red');
      expect(r.steps.at(-1)?.id).toBe('mental');
      expect(byId('t10').vitals.avpu).toBe('P');
      expect(byId('t10').vitals.painResponseAppropriate).toBe(false);
    });

    it('dziecko chodzące → ZIELONE', () => {
      const r = resultOf('t01');
      expect(r.protocol).toBe('JumpSTART');
      expect(r.category).toBe('green');
      expect(r.steps.at(-1)?.id).toBe('walk');
    });
  });

  describe('dorośli (START)', () => {
    const results = patients.map(p => ({ p, r: triage(p.vitals, p.appearsChild) }));
    const decisive = (cat: TriageCategory, stepId: string, pred: (v: Vitals) => boolean = () => true) =>
      results.some(({ p, r }) => r.protocol === 'START' && r.category === cat && r.steps.at(-1)?.id === stepId && pred(p.vitals));

    it('wdychanie pyłu: oddechy > 30 → CZERWONY', () => expect(decisive('red', 'resp-rate')).toBe(true));
    it('masywny krwotok: brak tętna promieniowego → CZERWONY (perfuzja)', () => {
      const bleeders = patients.filter(p => p.majorBleeding);
      expect(bleeders.map(p => p.id)).toEqual(['t11']);
      expect(resultOf('t11').steps.at(-1)?.id).toBe('perfusion');
    });
    it('kobieta w ciąży: START, niechodząca z prawidłowymi parametrami → ŻÓŁTA', () => {
      const r = resultOf('t05');
      expect(byId('t05').label).toContain('ciąży');
      expect(r.protocol).toBe('START');
      expect(r.category).toBe('yellow');
      expect(r.steps.at(-1)?.id).toBe('mental');
    });
    it('osoba starsza z bezdechem po udrożnieniu → CZARNA', () => {
      expect(byId('t13').ageYears).toBeGreaterThanOrEqual(75);
      expect(resultOf('t13').steps.at(-1)?.id).toBe('airway');
      expect(resultOf('t13').category).toBe('black');
    });
    it('oparzenia i zmiażdżenia obecne', () => {
      const all = patients.flatMap(p => p.injuries).join(' ');
      expect(all).toMatch(/oparzeni/);
      expect(all).toMatch(/zmiażdż/);
    });
  });

  it('chodzący — co najmniej 3, w tym dziecko z okrzykiem o pomoc', () => {
    const walkers = patients.filter(p => p.vitals.canWalk);
    expect(walkers.length).toBeGreaterThanOrEqual(3);
    expect(walkers.some(p => p.appearsChild && p.remark)).toBe(true);
  });
});
