import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory } from '../engine/triage';
import { RAILWAY, insidePropFootprint } from './propSizes';
import { trainScenario } from './train';
import { scenarioIssues } from './validate';

/** Źródło prawdy: zamierzona kategoria każdego pacjenta. */
const EXPECTED: Record<string, TriageCategory> = {
  k01: 'green',
  k02: 'green',
  k03: 'green',
  k04: 'green',
  k05: 'yellow',
  k06: 'yellow',
  k07: 'yellow',
  k08: 'yellow',
  k09: 'red',
  k10: 'red',
  k11: 'red',
  k12: 'red',
  k13: 'red',
  k14: 'red',
  k15: 'black',
  k16: 'black',
};

const patients = trainScenario.patients;
const byId = (id: string) => {
  const p = patients.find((x) => x.id === id);
  if (!p) throw new Error(`brak pacjenta ${id}`);
  return p;
};
const resultOf = (id: string) => {
  const p = byId(id);
  return triage(p.vitals, p.appearsChild);
};

describe('scenariusz: katastrofa kolejowa', () => {
  it('ogólne reguły poprawności (validate.ts)', () => {
    expect(scenarioIssues(trainScenario)).toEqual([]);
  });

  it('16 pacjentów, unikalne identyfikatory zgodne z EXPECTED', () => {
    expect(patients).toHaveLength(16);
    expect(patients.map((p) => p.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(patients.map((p) => [p.id, p.label, p] as const))('%s (%s) — kategoria zgodna z zamierzoną', (id, _label, p) => {
    expect(triage(p.vitals, p.appearsChild).category).toBe(EXPECTED[id]);
  });

  it('rozkład kategorii', () => {
    const count = (c: TriageCategory) => Object.values(EXPECTED).filter((x) => x === c).length;
    expect({ green: count('green'), yellow: count('yellow'), red: count('red'), black: count('black') }).toEqual({
      green: 4,
      yellow: 4,
      red: 6,
      black: 2,
    });
  });

  it('nasyp kolejowy: trzy wagony (rozbity czołowy, przewrócony, stojący na torze), nikt nie leży na nasypie', () => {
    expect(trainScenario.terrain).toBe('railway');
    const variants = trainScenario.props.filter((p) => p.kind === 'train').map((p) => p.variant).sort();
    expect(variants).toEqual(['crash', 'derailed', 'upright']);
    for (const p of patients) expect(p.position[1]).toBeGreaterThan(RAILWAY.toeFront + 1);
    // emergency vehicles stand on the dirt road, beyond the patient zone
    for (const v of trainScenario.props.filter((p) => ['firetruck', 'ambulance', 'police'].includes(p.kind))) {
      expect(v.position[1]).toBeGreaterThan(RAILWAY.roadZ[0]);
      expect(v.position[1]).toBeLessThan(RAILWAY.roadZ[1]);
    }
  });

  it('strażacy przy wagonach nie stoją na poszkodowanych', () => {
    for (const f of trainScenario.props.filter((p) => p.kind === 'firefighter')) {
      for (const p of patients) {
        expect(insidePropFootprint('firefighter', f.position[0], f.position[1], f.rotation, p.position[0], p.position[1], 0.6)).toBe(false);
      }
    }
  });

  describe('dorośli (START)', () => {
    it('maszynista: wiotka klatka, oddechy > 30 → CZERWONY', () => {
      expect(byId('k09').label).toContain('maszynista');
      expect(resultOf('k09').steps.at(-1)?.id).toBe('resp-rate');
    });
    it('amputacja urazowa z masywnym krwotokiem: brak tętna promieniowego → CZERWONY (perfuzja)', () => {
      expect(patients.filter((p) => p.majorBleeding).map((p) => p.id)).toEqual(['k10']);
      expect(resultOf('k10').steps.at(-1)?.id).toBe('perfusion');
    });
    it('uraz głowy, AVPU „P" → CZERWONY (stan świadomości)', () => {
      expect(resultOf('k12').steps.at(-1)?.id).toBe('mental');
    });
    it('bezdech ustępujący po udrożnieniu → CZERWONY; bez oddechu mimo udrożnienia → CZARNY', () => {
      expect(resultOf('k14').category).toBe('red');
      for (const id of ['k15', 'k16']) expect(resultOf(id).steps.at(-1)?.id).toBe('airway');
    });
    it('nastolatka wygląda na dorosłą → START', () => {
      expect(resultOf('k07').protocol).toBe('START');
    });
  });

  describe('dzieci (JumpSTART)', () => {
    it('2 dzieci', () => expect(patients.filter((p) => p.appearsChild)).toHaveLength(2));
    it('dziewczynka z bezdechem: oddycha po udrożnieniu → CZERWONE', () => {
      const r = resultOf('k13');
      expect(r.protocol).toBe('JumpSTART');
      expect(r.category).toBe('red');
    });
    it('chłopiec chodzący → ZIELONE', () => {
      expect(resultOf('k03').protocol).toBe('JumpSTART');
      expect(resultOf('k03').steps.at(-1)?.id).toBe('walk');
    });
  });
});
