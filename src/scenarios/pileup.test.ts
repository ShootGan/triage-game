import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory, type Vitals } from '../engine/triage';
import { pileupScenario } from './pileup';
import { scenarioIssues } from './validate';

/** Źródło prawdy: zamierzona kategoria każdego pacjenta. */
const EXPECTED: Record<string, TriageCategory> = {
  a01: 'green',
  a02: 'green',
  a03: 'green',
  a04: 'green',
  a05: 'yellow',
  a06: 'yellow',
  a07: 'yellow',
  a08: 'red',
  a09: 'red',
  a10: 'red',
  a11: 'red',
  a12: 'red',
  a13: 'black',
};

const patients = pileupScenario.patients;
const byId = (id: string) => {
  const p = patients.find(x => x.id === id);
  if (!p) throw new Error(`brak pacjenta ${id}`);
  return p;
};
const decisiveStep = (id: string) => {
  const p = byId(id);
  return triage(p.vitals, p.appearsChild).steps.at(-1)?.id;
};

describe('scenariusz: karambol na drodze ekspresowej', () => {
  it('ogólne reguły poprawności (validate.ts)', () => {
    expect(scenarioIssues(pileupScenario)).toEqual([]);
  });

  it('13 pacjentów, unikalne identyfikatory zgodne z EXPECTED', () => {
    expect(patients).toHaveLength(13);
    expect(new Set(patients.map(p => p.id)).size).toBe(patients.length);
    expect(patients.map(p => p.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('teren drogowy, punkt zbiórki na trawie z dala od jezdni', () => {
    expect(pileupScenario.terrain).toBe('road');
    expect(Math.abs(pileupScenario.collectionPoint[1])).toBeGreaterThanOrEqual(5);
    const kinds = pileupScenario.props.map(p => p.kind);
    expect(kinds.filter(k => k === 'truck')).toHaveLength(1);
    expect(kinds.filter(k => k === 'car').length).toBeGreaterThanOrEqual(4);
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
      black: 1,
    });
  });

  describe('pokrycie kryteriów START', () => {
    const results = patients.map(p => ({ p, r: triage(p.vitals, p.appearsChild) }));
    const decisive = (cat: TriageCategory, stepId: string, pred: (v: Vitals) => boolean = () => true) =>
      results.some(({ p, r }) => r.protocol === 'START' && r.category === cat && r.steps.at(-1)?.id === stepId && pred(p.vitals));

    it('oddechy > 30', () => expect(decisive('red', 'resp-rate')).toBe(true));
    it('brak tętna promieniowego', () => expect(decisive('red', 'perfusion', v => !v.peripheralPulse)).toBe(true));
    it('tętno obecne, ale CRT > 2 s', () => expect(decisive('red', 'perfusion', v => v.peripheralPulse && v.crtSeconds > 2)).toBe(true));
    it('nie wykonuje poleceń', () => expect(decisive('red', 'mental')).toBe(true));
    it('bezdech, oddycha po udrożnieniu', () => expect(decisive('red', 'airway')).toBe(true));
    it('bezdech po udrożnieniu → CZARNY', () => expect(decisive('black', 'airway')).toBe(true));
  });

  describe('przypadki dydaktyczne', () => {
    it('niemowlę ~10 mies.: pełna ocena JumpSTART → ZIELONY w kroku „infant-injury"', () => {
      const infant = byId('a03');
      expect(infant.appearsChild).toBe(true);
      expect(infant.ageYears).toBeLessThan(1);
      expect(infant.vitals.nonAmbulatoryByAge).toBe(true);
      const r = triage(infant.vitals, true);
      expect(r.protocol).toBe('JumpSTART');
      expect(r.category).toBe('green');
      expect(r.steps.at(-1)?.id).toBe('infant-injury');
      // Bez reguły niemowlęcej to samo dziecko byłoby ŻÓŁTE (niechodzące).
      expect(triage({ ...infant.vitals, nonAmbulatoryByAge: false }, true).category).toBe('yellow');
      // Niemowlę leży przy matce.
      const mother = byId('a08');
      expect(Math.hypot(infant.position[0] - mother.position[0], infant.position[1] - mother.position[1])).toBeLessThan(2.5);
    });

    it('dziecko ~5 lat niechodzące z prawidłowymi parametrami → JumpSTART ŻÓŁTY', () => {
      const r = triage(byId('a05').vitals, true);
      expect(r.protocol).toBe('JumpSTART');
      expect(r.category).toBe('yellow');
      expect(decisiveStep('a05')).toBe('mental');
    });

    it('masywny krwotok: niechodzący, brak tętna promieniowego → CZERWONY (perfuzja)', () => {
      const bleeders = patients.filter(p => p.majorBleeding);
      expect(bleeders.map(p => p.id)).toEqual(['a09']);
      expect(decisiveStep('a09')).toBe('perfusion');
    });

    it('dystraktory: pobudzony chodzący i krwawa, ale niegroźna rana → ZIELONI', () => {
      for (const id of ['a01', 'a02']) {
        const p = byId(id);
        expect(p.vitals.canWalk, id).toBe(true);
        expect(p.majorBleeding, id).toBeFalsy();
        expect(p.remark, id).toBeTruthy();
        expect(decisiveStep(id), id).toBe('walk');
      }
    });

    it('osoba starsza i kierowca ciężarówki obecni', () => {
      expect(patients.some(p => p.ageYears >= 75)).toBe(true);
      expect(patients.some(p => p.label.includes('ciężarówki'))).toBe(true);
    });
  });
});
