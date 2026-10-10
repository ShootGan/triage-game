import { describe, expect, it } from 'vitest';
import { triage, triageJumpStart, triageStart, type Vitals } from './index';

/** Pacjent „żółty" w obu algorytmach — każdy test zmienia tylko to, co sprawdza. */
function vitals(over: Partial<Omit<Vitals, 'breathing'>> & { breathing?: Partial<Vitals['breathing']> } = {}): Vitals {
  const { breathing, ...rest } = over;
  return {
    canWalk: false,
    breathing: { spontaneous: true, afterAirway: true, rate: 20, ...breathing },
    peripheralPulse: true,
    crtSeconds: 1.5,
    obeysCommands: true,
    avpu: 'A',
    ...rest,
  };
}

const stepIds = (r: { steps: { id: string }[] }) => r.steps.map(s => s.id);

describe('START (dorośli)', () => {
  it('chodzący → zielony', () => {
    expect(triageStart(vitals({ canWalk: true })).category).toBe('green');
  });

  it('nie oddycha, oddycha po udrożnieniu → czerwony', () => {
    const r = triageStart(vitals({ breathing: { spontaneous: false, afterAirway: true } }));
    expect(r.category).toBe('red');
    expect(stepIds(r)).toEqual(['walk', 'breathing', 'airway']);
  });

  it('nie oddycha po udrożnieniu → czarny', () => {
    expect(triageStart(vitals({ breathing: { spontaneous: false, afterAirway: false } })).category).toBe('black');
  });

  it('oddechy > 30 → czerwony; dokładnie 30 → dalsza ocena', () => {
    expect(triageStart(vitals({ breathing: { rate: 31 } })).category).toBe('red');
    expect(triageStart(vitals({ breathing: { rate: 30 } })).category).toBe('yellow');
  });

  it('niska częstość oddechów nie jest kryterium w START', () => {
    expect(triageStart(vitals({ breathing: { rate: 8 } })).category).toBe('yellow');
  });

  it('brak tętna promieniowego → czerwony', () => {
    expect(triageStart(vitals({ peripheralPulse: false })).category).toBe('red');
  });

  it('CRT > 2 s → czerwony; dokładnie 2 s → dalsza ocena', () => {
    expect(triageStart(vitals({ crtSeconds: 3 })).category).toBe('red');
    expect(triageStart(vitals({ crtSeconds: 2 })).category).toBe('yellow');
  });

  it('nie wykonuje poleceń → czerwony', () => {
    const r = triageStart(vitals({ obeysCommands: false }));
    expect(r.category).toBe('red');
    expect(r.steps.at(-1)).toMatchObject({ id: 'mental', result: 'red' });
  });

  it('wszystko w normie, nie chodzi → żółty, pełna ścieżka', () => {
    const r = triageStart(vitals());
    expect(r.category).toBe('yellow');
    expect(stepIds(r)).toEqual(['walk', 'breathing', 'resp-rate', 'perfusion', 'mental']);
  });

  it('tylko ostatni krok ma wynik', () => {
    const r = triageStart(vitals({ crtSeconds: 4 }));
    expect(r.steps.filter(s => s.result)).toHaveLength(1);
  });
});

describe('JumpSTART (dzieci)', () => {
  it('chodzące → zielone', () => {
    expect(triageJumpStart(vitals({ canWalk: true })).category).toBe('green');
  });

  it('nie oddycha, oddycha po udrożnieniu → czerwony', () => {
    expect(triageJumpStart(vitals({ breathing: { spontaneous: false, afterAirway: true } })).category).toBe('red');
  });

  it('bezdech po udrożnieniu, brak tętna → czarny (bez oddechów ratowniczych)', () => {
    const r = triageJumpStart(vitals({ breathing: { spontaneous: false, afterAirway: false }, peripheralPulse: false }));
    expect(r.category).toBe('black');
    expect(stepIds(r)).toEqual(['walk', 'breathing', 'airway', 'apneic-pulse']);
  });

  it('bezdech, tętno obecne, oddycha po 5 oddechach → czerwony', () => {
    const r = triageJumpStart(vitals({ breathing: { spontaneous: false, afterAirway: false, afterRescueBreaths: true } }));
    expect(r.category).toBe('red');
    expect(stepIds(r)).toContain('rescue-breaths');
  });

  it('bezdech, tętno obecne, nie oddycha po 5 oddechach → czarny', () => {
    expect(triageJumpStart(vitals({ breathing: { spontaneous: false, afterAirway: false, afterRescueBreaths: false } })).category).toBe('black');
  });

  it('oddechy < 15 lub > 45 → czerwony; granice 15 i 45 → dalsza ocena', () => {
    expect(triageJumpStart(vitals({ breathing: { rate: 14 } })).category).toBe('red');
    expect(triageJumpStart(vitals({ breathing: { rate: 46 } })).category).toBe('red');
    expect(triageJumpStart(vitals({ breathing: { rate: 15 } })).category).toBe('yellow');
    expect(triageJumpStart(vitals({ breathing: { rate: 45 } })).category).toBe('yellow');
  });

  it('oddech nieregularny → czerwony', () => {
    expect(triageJumpStart(vitals({ breathing: { irregular: true } })).category).toBe('red');
  });

  it('brak tętna obwodowego → czerwony', () => {
    expect(triageJumpStart(vitals({ peripheralPulse: false })).category).toBe('red');
  });

  it('CRT nie jest kryterium w JumpSTART', () => {
    expect(triageJumpStart(vitals({ crtSeconds: 4 })).category).toBe('yellow');
  });

  it('AVPU: A i V → żółty', () => {
    expect(triageJumpStart(vitals({ avpu: 'A' })).category).toBe('yellow');
    expect(triageJumpStart(vitals({ avpu: 'V' })).category).toBe('yellow');
  });

  it('AVPU: P adekwatne → żółty, P nieadekwatne → czerwony, U → czerwony', () => {
    expect(triageJumpStart(vitals({ avpu: 'P', painResponseAppropriate: true })).category).toBe('yellow');
    expect(triageJumpStart(vitals({ avpu: 'P', painResponseAppropriate: false })).category).toBe('red');
    expect(triageJumpStart(vitals({ avpu: 'U' })).category).toBe('red');
  });

  it('niemowlę niechodzące rozwojowo, bez istotnych obrażeń → zielony', () => {
    const r = triageJumpStart(vitals({ nonAmbulatoryByAge: true, breathing: { rate: 35 } }));
    expect(r.category).toBe('green');
    expect(r.steps.at(-1)).toMatchObject({ id: 'infant-injury', result: 'green' });
  });

  it('niemowlę z istotnymi obrażeniami → żółty', () => {
    expect(triageJumpStart(vitals({ nonAmbulatoryByAge: true, significantExternalInjury: true })).category).toBe('yellow');
  });

  it('niemowlę z kryterium czerwonym → czerwony (pełna ocena ma pierwszeństwo)', () => {
    expect(triageJumpStart(vitals({ nonAmbulatoryByAge: true, breathing: { rate: 60 } })).category).toBe('red');
  });
});

describe('wybór algorytmu', () => {
  it('dziecko → JumpSTART, dorosły → START', () => {
    const v = vitals({ breathing: { rate: 40 } });
    expect(triage(v, true)).toMatchObject({ protocol: 'JumpSTART', category: 'yellow' });
    expect(triage(v, false)).toMatchObject({ protocol: 'START', category: 'red' });
  });
});
