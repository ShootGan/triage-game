import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory, type Vitals } from '../engine/triage';
import { concertScenario } from './concert';
import { scenarioIssues } from './validate';

/** Źródło prawdy: zamierzona kategoria każdego pacjenta. */
const EXPECTED: Record<string, TriageCategory> = {
  c01: 'green',
  c02: 'green',
  c03: 'green',
  c04: 'green',
  c05: 'green',
  c06: 'yellow',
  c07: 'yellow',
  c08: 'yellow',
  c09: 'red',
  c10: 'red',
  c11: 'red',
  c12: 'red',
  c13: 'red',
  c14: 'black',
};

const patients = concertScenario.patients;
const byId = (id: string) => patients.find(p => p.id === id)!;

describe('scenariusz: panika na koncercie plenerowym', () => {
  it('scenariusz spełnia ogólne reguły poprawności', () => {
    expect(scenarioIssues(concertScenario)).toEqual([]);
  });

  it('14 pacjentów, unikalne identyfikatory, teren „field"', () => {
    expect(concertScenario.id).toBe('concert');
    expect(concertScenario.terrain).toBe('field');
    expect(patients).toHaveLength(14);
    expect(new Set(patients.map(p => p.id)).size).toBe(patients.length);
    expect(patients.map(p => p.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(patients.map(p => [p.id, p.label, p] as const))('%s (%s) — kategoria zgodna z zamierzoną', (id, _label, p) => {
    expect(triage(p.vitals, p.appearsChild).category).toBe(EXPECTED[id]);
  });

  it('rozkład kategorii (tłum → dużo zielonych)', () => {
    const count = (c: TriageCategory) => Object.values(EXPECTED).filter(x => x === c).length;
    expect({ green: count('green'), yellow: count('yellow'), red: count('red'), black: count('black') }).toEqual({
      green: 5,
      yellow: 3,
      red: 5,
      black: 1,
    });
  });

  it('rekwizyty: scena po stronie ujemnego z, 4–6 barierek, 1–2 namioty', () => {
    const kinds = concertScenario.props.map(p => p.kind);
    const stage = concertScenario.props.filter(p => p.kind === 'stage');
    expect(stage).toHaveLength(1);
    expect(stage[0].position[1]).toBeLessThan(0);
    const barriers = kinds.filter(k => k === 'barrier').length;
    expect(barriers).toBeGreaterThanOrEqual(4);
    expect(barriers).toBeLessThanOrEqual(6);
    expect(concertScenario.props.some(p => p.kind === 'barrier' && p.rotation !== 0)).toBe(true);
    const tents = kinds.filter(k => k === 'tent').length;
    expect(tents).toBeGreaterThanOrEqual(1);
    expect(tents).toBeLessThanOrEqual(2);
    // punkt zbiórki po przeciwnej stronie niż scena
    expect(concertScenario.collectionPoint[1]).toBeGreaterThan(0);
  });

  it('młodzież oceniana START-em, małe dzieci JumpSTART-em', () => {
    for (const p of patients) {
      if (p.ageYears >= 13) expect(p.appearsChild, p.id).toBe(false);
    }
    const kids = patients.filter(p => p.appearsChild);
    expect(kids.length).toBeGreaterThanOrEqual(1);
    expect(kids.length).toBeLessThanOrEqual(2);
    for (const k of kids) expect(k.ageYears, k.id).toBeLessThanOrEqual(8);
    expect(patients.filter(p => p.ageYears >= 16 && p.ageYears <= 30).length).toBeGreaterThanOrEqual(10);
  });

  it('ofiary zgniecenia leżą przed barierkami (strona publiczności)', () => {
    for (const id of ['c09', 'c10', 'c12', 'c14']) {
      const p = byId(id);
      expect(p.position[1], id).toBeGreaterThan(-2);
      expect(p.position[1], id).toBeLessThan(1);
    }
  });

  it('spójność parametrów z obrazem klinicznym', () => {
    const bleeders = patients.filter(p => p.majorBleeding);
    expect(bleeders.map(p => p.id)).toEqual(['c12']);
    for (const b of bleeders) {
      expect(b.vitals.canWalk).toBe(false);
      expect(!b.vitals.peripheralPulse || b.vitals.crtSeconds > 2).toBe(true);
    }
    // asfiksja urazowa: sinica + wybroczyny w opisie
    for (const id of ['c09', 'c10', 'c14']) {
      expect(byId(id).injuries.join(' '), id).toMatch(/sini|sinoniebiesk/);
      expect(byId(id).injuries.join(' '), id).toMatch(/wybroczyn/);
    }
  });

  describe('przypadki dydaktyczne', () => {
    const results = patients.map(p => ({ p, r: triage(p.vitals, p.appearsChild) }));
    const decisive = (protocol: 'START' | 'JumpSTART', cat: TriageCategory, stepId: string, pred: (v: Vitals) => boolean = () => true) =>
      results.some(
        ({ p, r }) => r.protocol === protocol && r.category === cat && r.steps.at(-1)?.id === stepId && pred(p.vitals),
      );

    it('hiperwentylacja 36/min, ale chodzi → ZIELONY (krok „chodzi" rozstrzyga)', () => {
      const p = byId('c01');
      const r = triage(p.vitals, p.appearsChild);
      expect(p.vitals.breathing.rate).toBeGreaterThan(30);
      expect(r.protocol).toBe('START');
      expect(r.category).toBe('green');
      expect(r.steps.at(-1)?.id).toBe('walk');
      expect(r.steps).toHaveLength(1);
    });

    it('nietrzeźwy / omdlały, nie wykonuje poleceń → CZERWONY (stan świadomości)', () => {
      const p = byId('c11');
      const r = triage(p.vitals, p.appearsChild);
      expect(r.category).toBe('red');
      expect(r.steps.at(-1)?.id).toBe('mental');
      expect(p.vitals.obeysCommands).toBe(false);
      expect(p.vitals.breathing.rate).toBeLessThanOrEqual(30);
    });

    it('chodzący poszkodowani: 4–5, w tym dziecko', () => {
      const walkers = patients.filter(p => p.vitals.canWalk);
      expect(walkers.length).toBeGreaterThanOrEqual(4);
      expect(walkers.length).toBeLessThanOrEqual(5);
      expect(walkers.some(p => p.appearsChild && p.remark)).toBe(true);
    });

    it('START: oddechy > 30 (asfiksja urazowa)', () =>
      expect(decisive('START', 'red', 'resp-rate', v => v.breathing.rate > 30)).toBe(true));
    it('START: brak tętna promieniowego / CRT > 2 s (krwotok)', () =>
      expect(decisive('START', 'red', 'perfusion', v => !v.peripheralPulse)).toBe(true));
    it('START: bezdech, oddycha po udrożnieniu → CZERWONY', () => expect(decisive('START', 'red', 'airway')).toBe(true));
    it('START: bezdech po udrożnieniu → CZARNY', () => expect(decisive('START', 'black', 'airway')).toBe(true));
    it('START: ŻÓŁTY — nie chodzi, parametry prawidłowe', () => expect(decisive('START', 'yellow', 'mental')).toBe(true));
    it('JumpSTART: chodzące dziecko → ZIELONY', () => expect(decisive('JumpSTART', 'green', 'walk')).toBe(true));
    it('JumpSTART: niechodzące dziecko, parametry w normie → ŻÓŁTY', () =>
      expect(decisive('JumpSTART', 'yellow', 'mental')).toBe(true));
  });
});
