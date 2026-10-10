import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory, type Vitals } from '../engine/triage';
import { festivalScenario } from './festival';
import { scenarioIssues } from './validate';

/** Źródło prawdy: zamierzona kategoria każdego pacjenta. */
const EXPECTED: Record<string, TriageCategory> = {
  f01: 'green',
  f02: 'green',
  f03: 'yellow',
  f04: 'yellow',
  f05: 'yellow',
  f06: 'red',
  f07: 'red',
  f08: 'red',
  f09: 'red',
  f10: 'red',
  f11: 'red',
  f12: 'red',
  f13: 'red',
  f14: 'black',
};

const patients = festivalScenario.patients;
const byId = (id: string) => patients.find(p => p.id === id)!;

describe('scenariusz: zawalenie trybuny na festynie szkolnym', () => {
  it('scenariusz spełnia ogólne reguły poprawności', () => {
    expect(scenarioIssues(festivalScenario)).toEqual([]);
  });

  it('14 pacjentów, unikalne identyfikatory, teren „field"', () => {
    expect(festivalScenario.id).toBe('festival');
    expect(festivalScenario.terrain).toBe('field');
    expect(patients).toHaveLength(14);
    expect(new Set(patients.map(p => p.id)).size).toBe(patients.length);
    expect(patients.map(p => p.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(patients.map(p => [p.id, p.label, p] as const))('%s (%s) — kategoria zgodna z zamierzoną', (id, _label, p) => {
    expect(triage(p.vitals, p.appearsChild).category).toBe(EXPECTED[id]);
  });

  it('rozkład kategorii', () => {
    const count = (c: TriageCategory) => Object.values(EXPECTED).filter(x => x === c).length;
    expect({ green: count('green'), yellow: count('yellow'), red: count('red'), black: count('black') }).toEqual({
      green: 2,
      yellow: 3,
      red: 8,
      black: 1,
    });
  });

  it('większość to dzieci 6–10 lat (JumpSTART), są też dorośli (START)', () => {
    const kids = patients.filter(p => p.appearsChild);
    expect(kids.length).toBeGreaterThan(patients.length / 2);
    expect(patients.filter(p => p.appearsChild && p.ageYears >= 6 && p.ageYears <= 10).length).toBeGreaterThanOrEqual(8);
    expect(patients.filter(p => !p.appearsChild && p.ageYears >= 18).length).toBeGreaterThanOrEqual(2);
  });

  it('przypadek brzegowy: 12-latek wyglądający na dziecko → JumpSTART ŻÓŁTY (START dałby CZERWONY)', () => {
    const teen = byId('f04');
    expect(teen.ageYears).toBeGreaterThanOrEqual(12);
    expect(teen.appearsChild).toBe(true);
    expect(triage(teen.vitals, true).category).toBe('yellow');
    expect(triage(teen.vitals, false).category).toBe('red');
  });

  it('rekwizyty: zawalona trybuna w centrum-tyle, namioty, bus organizatora', () => {
    const bleachers = festivalScenario.props.filter(p => p.kind === 'bleachers');
    expect(bleachers).toHaveLength(1);
    expect(bleachers[0].position[1]).toBeLessThan(0);
    const tents = festivalScenario.props.filter(p => p.kind === 'tent').length;
    expect(tents).toBeGreaterThanOrEqual(2);
    expect(tents).toBeLessThanOrEqual(3);
  });

  it('spójność parametrów z obrazem klinicznym', () => {
    const bleeders = patients.filter(p => p.majorBleeding);
    expect(bleeders).toHaveLength(1);
    for (const b of bleeders) {
      expect(b.vitals.canWalk).toBe(false);
      expect(!b.vitals.peripheralPulse || b.vitals.crtSeconds > 2).toBe(true);
    }
  });

  describe('pokrycie kryteriów JumpSTART', () => {
    const results = patients.map(p => ({ p, r: triage(p.vitals, p.appearsChild) }));
    const decisive = (protocol: 'START' | 'JumpSTART', cat: TriageCategory, stepId: string, pred: (v: Vitals) => boolean = () => true) =>
      results.some(
        ({ p, r }) => r.protocol === protocol && r.category === cat && r.steps.at(-1)?.id === stepId && pred(p.vitals),
      );

    it('chodzące dziecko → ZIELONY, w tym płaczący dystraktor', () => {
      expect(decisive('JumpSTART', 'green', 'walk')).toBe(true);
      expect(patients.some(p => p.appearsChild && p.vitals.canWalk && p.remark)).toBe(true);
    });
    it('oddechy < 15 → CZERWONY', () =>
      expect(decisive('JumpSTART', 'red', 'resp-rate', v => v.breathing.rate < 15 && !v.breathing.irregular)).toBe(true));
    it('oddechy > 45 → CZERWONY', () =>
      expect(decisive('JumpSTART', 'red', 'resp-rate', v => v.breathing.rate > 45 && !v.breathing.irregular)).toBe(true));
    it('oddech nieregularny (częstość w normie) → CZERWONY', () =>
      expect(
        decisive('JumpSTART', 'red', 'resp-rate', v => !!v.breathing.irregular && v.breathing.rate >= 15 && v.breathing.rate <= 45),
      ).toBe(true));
    it('brak tętna obwodowego → CZERWONY', () =>
      expect(decisive('JumpSTART', 'red', 'perfusion', v => !v.peripheralPulse)).toBe(true));
    it('AVPU P nieadekwatne → CZERWONY', () =>
      expect(decisive('JumpSTART', 'red', 'mental', v => v.avpu === 'P' && !v.painResponseAppropriate)).toBe(true));
    it('AVPU U (oddycha) → CZERWONY', () =>
      expect(decisive('JumpSTART', 'red', 'mental', v => v.avpu === 'U' && v.breathing.spontaneous)).toBe(true));
    it('bezdech, oddycha po udrożnieniu → CZERWONY', () => expect(decisive('JumpSTART', 'red', 'airway')).toBe(true));
    it('bezdech z tętnem, oddycha po 5 oddechach ratowniczych → CZERWONY', () =>
      expect(decisive('JumpSTART', 'red', 'rescue-breaths')).toBe(true));
    it('bezdech bez tętna → CZARNY', () => expect(decisive('JumpSTART', 'black', 'apneic-pulse')).toBe(true));
    it('dziecko ŻÓŁTE: nie chodzi, AVPU A lub V', () =>
      expect(decisive('JumpSTART', 'yellow', 'mental', v => v.avpu === 'A' || v.avpu === 'V')).toBe(true));
    it('niemowlę niechodzące z powodu wieku, istotne obrażenia → ŻÓŁTY (krok „infant-injury")', () => {
      const infant = byId('f03');
      expect(infant.ageYears).toBeLessThan(1);
      expect(infant.vitals.nonAmbulatoryByAge).toBe(true);
      const r = triage(infant.vitals, infant.appearsChild);
      expect(r.category).toBe('yellow');
      expect(r.steps.at(-1)?.id).toBe('infant-injury');
      // bez istotnych obrażeń byłoby ZIELONE
      expect(triage({ ...infant.vitals, significantExternalInjury: false }, true).category).toBe('green');
    });
    it('START (dorośli): chodzący ZIELONY, niechodzący z prawidłowymi parametrami ŻÓŁTY', () => {
      expect(decisive('START', 'green', 'walk')).toBe(true);
      expect(decisive('START', 'yellow', 'mental')).toBe(true);
    });
  });
});
