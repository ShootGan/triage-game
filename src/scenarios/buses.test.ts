import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory } from '../engine/triage';
import { busesScenario } from './buses';
import { scenarioIssues } from './validate';

/** Źródło prawdy: zamierzona kategoria każdego pacjenta. */
const EXPECTED: Record<string, TriageCategory> = {
  z01: 'green',
  z02: 'green',
  z03: 'green',
  z04: 'green',
  z05: 'green',
  z06: 'green',
  z07: 'green',
  z08: 'yellow',
  z09: 'yellow',
  z10: 'yellow',
  z11: 'yellow',
  z12: 'yellow',
  z13: 'red',
  z14: 'red',
  z15: 'red',
  z16: 'red',
  z17: 'black',
  z18: 'green',
  z19: 'green',
  z20: 'yellow',
  z21: 'green',
  z22: 'red',
};

const patients = busesScenario.patients;
const byId = (id: string) => patients.find(p => p.id === id)!;

describe('scenariusz: zderzenie autobusów — ciężarne i dzieci', () => {
  it('scenariusz spełnia ogólne reguły poprawności', () => {
    expect(scenarioIssues(busesScenario)).toEqual([]);
  });

  it('22 pacjentów, unikalne identyfikatory, teren „road", 2 autobusy', () => {
    expect(busesScenario.id).toBe('buses');
    expect(busesScenario.terrain).toBe('road');
    expect(patients).toHaveLength(22);
    expect(new Set(patients.map(p => p.id)).size).toBe(patients.length);
    expect(patients.map(p => p.id).sort()).toEqual(Object.keys(EXPECTED).sort());
    expect(busesScenario.props.filter(pr => pr.kind === 'bus')).toHaveLength(2);
    expect(Math.abs(busesScenario.collectionPoint[1])).toBeGreaterThanOrEqual(6);
  });

  it.each(patients.map(p => [p.id, p.label, p] as const))('%s (%s) — kategoria zgodna z zamierzoną', (id, _label, p) => {
    expect(triage(p.vitals, p.appearsChild).category).toBe(EXPECTED[id]);
  });

  it('rozkład kategorii', () => {
    const count = (c: TriageCategory) => Object.values(EXPECTED).filter(x => x === c).length;
    expect({ green: count('green'), yellow: count('yellow'), red: count('red'), black: count('black') }).toEqual({
      green: 10,
      yellow: 6,
      red: 5,
      black: 1,
    });
  });

  it('kobiety w ciąży: ≥ 8, dorosłe kobiety oceniane START-em; ciąża nie zmienia kategorii', () => {
    const pregnant = patients.filter(p => p.appearance.pregnant);
    expect(pregnant.length).toBeGreaterThanOrEqual(8);
    for (const p of pregnant) {
      expect(p.appearance.sex, p.id).toBe('f');
      expect(p.appearsChild, p.id).toBe(false);
      expect(p.ageYears, p.id).toBeGreaterThanOrEqual(18);
      expect(p.label, p.id).toContain('ciąży');
      expect(triage(p.vitals, p.appearsChild).protocol, p.id).toBe('START');
    }
    // różne kategorie wśród ciężarnych — o kategorii decydują parametry, nie ciąża
    expect(new Set(pregnant.map(p => EXPECTED[p.id])).size).toBeGreaterThanOrEqual(3);
  });

  it('dzieci szkolne (JumpSTART) i obaj kierowcy oraz wychowawczyni', () => {
    const kids = patients.filter(p => p.appearsChild);
    expect(kids.length).toBeGreaterThanOrEqual(9);
    for (const k of kids) expect(k.ageYears, k.id).toBeGreaterThanOrEqual(6);
    expect(patients.filter(p => p.label.startsWith('Kierowca'))).toHaveLength(2);
    expect(patients.some(p => p.label.includes('wychowawczyni'))).toBe(true);
  });

  describe('przypadki progowe i dydaktyczne', () => {
    it('START: oddechy dokładnie 30/min → ŻÓŁTA (czerwony dopiero > 30)', () => {
      const p = byId('z08');
      expect(p.vitals.breathing.rate).toBe(30);
      const r = triage(p.vitals, false);
      expect(r.category).toBe('yellow');
      expect(r.steps.find(s => s.id === 'resp-rate')?.result).toBeUndefined();
    });

    it('START: CRT dokładnie 2 s przy obecnym tętnie → ŻÓŁTA', () => {
      const p = byId('z10');
      expect(p.vitals.crtSeconds).toBe(2);
      expect(p.vitals.peripheralPulse).toBe(true);
      const r = triage(p.vitals, false);
      expect(r.category).toBe('yellow');
      expect(r.steps.at(-1)?.id).toBe('mental');
    });

    it('ciężarna z krwawieniem wewnętrznym: brak tętna promieniowego → CZERWONA (perfusion), bez krwotoku zewnętrznego', () => {
      const p = byId('z13');
      expect(p.majorBleeding).toBeFalsy();
      expect(triage(p.vitals, false).steps.at(-1)?.id).toBe('perfusion');
    });

    it('kierowca autokaru: masywny krwotok zewnętrzny → CZERWONY (perfusion)', () => {
      const p = byId('z14');
      expect(p.majorBleeding).toBe(true);
      const r = triage(p.vitals, false);
      expect(r.category).toBe('red');
      expect(r.steps.at(-1)?.id).toBe('perfusion');
    });

    it('JumpSTART: oddechy > 45/min → CZERWONA', () => {
      const r = triage(byId('z15').vitals, true);
      expect(r.steps.at(-1)?.id).toBe('resp-rate');
      expect(r.category).toBe('red');
    });

    it('JumpSTART: oddycha po 5 oddechach ratowniczych → CZERWONY', () => {
      const r = triage(byId('z16').vitals, true);
      expect(r.steps.at(-1)?.id).toBe('rescue-breaths');
      expect(r.category).toBe('red');
    });

    it('JumpSTART: AVPU „P" z nieadekwatną reakcją na ból → CZERWONA', () => {
      const p = byId('z22');
      expect(p.vitals.avpu).toBe('P');
      const r = triage(p.vitals, true);
      expect(r.steps.at(-1)?.id).toBe('mental');
      expect(r.category).toBe('red');
    });

    it('START: bezdech po udrożnieniu → CZARNY', () => {
      const r = triage(byId('z17').vitals, false);
      expect(r.steps.at(-1)?.id).toBe('airway');
      expect(r.category).toBe('black');
    });
  });

  it('chodzący (≥ 4), w tym krzyczące dziecko i krzycząca ciężarna (dystraktory)', () => {
    const walkers = patients.filter(p => p.vitals.canWalk);
    expect(walkers.length).toBeGreaterThanOrEqual(4);
    expect(walkers.some(p => p.appearsChild && p.remark)).toBe(true);
    expect(walkers.some(p => p.appearance.pregnant && p.remark)).toBe(true);
  });
});
