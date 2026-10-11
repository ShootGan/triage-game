import { describe, expect, it } from 'vitest';
import type { ScenarioPatient } from '../../scenarios/types';
import type { Vitals } from '../triage';
import { ACTION_LABEL, ACTION_SECONDS, initialExamState, isBreathingNow, performAction } from './index';
import type { ExamActionId, PatientExamState } from './types';

type VitalsOver = Partial<Omit<Vitals, 'breathing'>> & { breathing?: Partial<Vitals['breathing']> };

function patient(over: VitalsOver = {}, extra: Partial<ScenarioPatient> = {}): ScenarioPatient {
  const { breathing, ...rest } = over;
  return {
    id: 't',
    label: 'Mężczyzna, ok. 40 lat',
    ageYears: 40,
    appearsChild: false,
    vitals: {
      canWalk: false,
      breathing: { spontaneous: true, afterAirway: true, rate: 20, ...breathing },
      peripheralPulse: true,
      crtSeconds: 1.5,
      obeysCommands: true,
      avpu: 'A',
      ...rest,
    },
    injuries: [],
    appearance: { sex: 'm', child: false, skin: '#f1c27d', hair: '#333333', hairStyle: 'short', shirt: '#336699', pants: '#222222' },
    pose: 'back',
    position: [0, 0],
    rotation: 0,
    ...extra,
  };
}

const apnoeic = (b: Partial<Vitals['breathing']> = {}, rest: VitalsOver = {}) =>
  patient({ avpu: 'U', obeysCommands: false, ...rest, breathing: { spontaneous: false, afterAirway: false, rate: 0, ...b } });

/** Wykonuje kolejno czynności i zwraca stan oraz ostatni wynik. */
function run(p: ScenarioPatient, actions: ExamActionId[], start: PatientExamState = initialExamState()) {
  let state = start;
  let last = { action: actions[0], text: '', seconds: 0 };
  for (const a of actions) {
    const r = performAction(p, state, a);
    state = r.state;
    last = r.result;
  }
  return { state, result: last };
}

describe('stałe', () => {
  it('każda czynność ma etykietę i koszt czasu', () => {
    const ids: ExamActionId[] = ['breathing', 'airway', 'rescue-breaths', 'pulse', 'crt', 'commands', 'avpu', 'bleeding'];
    for (const id of ids) {
      expect(ACTION_LABEL[id]).toBeTruthy();
      expect(ACTION_SECONDS[id]).toBeGreaterThan(0);
    }
    expect(ACTION_LABEL.breathing).toBe('Oceń oddech');
    expect(ACTION_SECONDS).toMatchObject({ breathing: 10, airway: 5, 'rescue-breaths': 15, pulse: 5, crt: 3, commands: 5, avpu: 5, bleeding: 10 });
  });

  it('stan początkowy', () => {
    expect(initialExamState()).toEqual({ airwayOpened: false, rescueBreathsGiven: false, bleedingControlled: false, log: [] });
  });
});

describe('performAction — niezmienność i dziennik', () => {
  it('nie modyfikuje stanu wejściowego, dopisuje wynik do dziennika', () => {
    const s0 = initialExamState();
    const frozen = Object.freeze({ ...s0, log: Object.freeze([]) as unknown as PatientExamState['log'] });
    const { state, result } = performAction(apnoeic({ afterAirway: true }), frozen, 'airway');
    expect(frozen.airwayOpened).toBe(false);
    expect(frozen.log).toHaveLength(0);
    expect(state.airwayOpened).toBe(true);
    expect(state.log).toEqual([result]);
    expect(result.action).toBe('airway');
  });
});

describe('ocena oddechu', () => {
  it('oddycha samodzielnie — podaje częstość', () => {
    const { result } = run(patient({ breathing: { rate: 34 } }), ['breathing']);
    expect(result).toEqual({ action: 'breathing', text: 'Oddycha, 34/min', seconds: 10 });
  });

  it('oddech nieregularny', () => {
    expect(run(patient({ breathing: { rate: 12, irregular: true } }), ['breathing']).result.text).toBe('Oddycha, 12/min, nieregularnie');
  });

  it('bezdech, drogi oddechowe nieudrożnione → „Nie oddycha" (nie zdradza, co da udrożnienie)', () => {
    expect(run(apnoeic({ afterAirway: true, rate: 10 }), ['breathing']).result.text).toBe('Nie oddycha');
    expect(run(apnoeic(), ['breathing']).result.text).toBe('Nie oddycha');
  });

  it('po udrożnieniu: oddycha / nie oddycha', () => {
    expect(run(apnoeic({ afterAirway: true, rate: 10 }), ['airway', 'breathing']).result.text).toBe('Oddycha po udrożnieniu, 10/min');
    expect(run(apnoeic(), ['airway', 'breathing']).result.text).toBe('Nie oddycha mimo udrożnienia dróg oddechowych');
  });

  it('po oddechach ratowniczych: oddycha / nie oddycha', () => {
    expect(run(apnoeic({ afterRescueBreaths: true, rate: 12 }), ['airway', 'rescue-breaths', 'breathing']).result.text).toBe(
      'Oddycha po oddechach ratowniczych, 12/min',
    );
    expect(run(apnoeic({ afterRescueBreaths: false }), ['airway', 'rescue-breaths', 'breathing']).result.text).toBe(
      'Nie oddycha mimo udrożnienia dróg oddechowych i oddechów ratowniczych',
    );
  });
});

describe('udrożnienie dróg oddechowych', () => {
  it('pacjent oddychający → drogi drożne', () => {
    const { state, result } = run(patient(), ['airway']);
    expect(result).toEqual({ action: 'airway', text: 'Drogi oddechowe drożne', seconds: 5 });
    expect(state.airwayOpened).toBe(true);
  });

  it('bezdech → oddech wraca po udrożnieniu', () => {
    const { state, result } = run(apnoeic({ afterAirway: true, rate: 8 }), ['airway']);
    expect(result.text).toBe('Udrożniono drogi oddechowe — pojawił się oddech własny, 8/min');
    expect(state.airwayOpened).toBe(true);
    expect(isBreathingNow(apnoeic({ afterAirway: true }), state)).toBe(true);
  });

  it('bezdech → nadal brak oddechu', () => {
    const { state, result } = run(apnoeic(), ['airway']);
    expect(result.text).toBe('Udrożniono drogi oddechowe — nadal brak oddechu');
    expect(isBreathingNow(apnoeic(), state)).toBe(false);
  });

  it('ponowne udrożnienie — krótko, informuje o stanie', () => {
    const { result } = run(apnoeic(), ['airway', 'airway']);
    expect(result.seconds).toBeLessThan(ACTION_SECONDS.airway);
    expect(result.text).toContain('już udrożnione');
  });
});

describe('5 oddechów ratowniczych', () => {
  const child = (b: Partial<Vitals['breathing']>, rest: VitalsOver = {}) => ({ ...apnoeic(b, rest), appearsChild: true });

  it('bez udrożnienia dróg oddechowych → komunikat, krótszy czas, brak zmiany stanu', () => {
    const { state, result } = run(child({ afterRescueBreaths: true }), ['rescue-breaths']);
    expect(result.text).toBe('Najpierw udrożnij drogi oddechowe');
    expect(result.seconds).toBeLessThan(ACTION_SECONDS['rescue-breaths']);
    expect(state.rescueBreathsGiven).toBe(false);
  });

  it('dziecko z tętnem: oddech wraca', () => {
    const { state, result } = run(child({ afterRescueBreaths: true, rate: 12 }), ['airway', 'rescue-breaths']);
    expect(result).toEqual({ action: 'rescue-breaths', text: 'Po 5 oddechach ratowniczych pojawił się oddech własny, 12/min', seconds: 15 });
    expect(state.rescueBreathsGiven).toBe(true);
  });

  it('dziecko: oddech nie wraca', () => {
    const { state, result } = run(child({ afterRescueBreaths: false }), ['airway', 'rescue-breaths']);
    expect(result.text).toBe('Brak oddechu po 5 oddechach ratowniczych');
    expect(state.rescueBreathsGiven).toBe(true);
  });

  it('dorosły: wynik ujawniony, z adnotacją, że to nie START (pełny koszt czasu)', () => {
    const { state, result } = run(apnoeic(), ['airway', 'rescue-breaths']);
    expect(result.text).toBe('Brak oddechu po 5 oddechach ratowniczych (oddechy ratownicze nie są elementem algorytmu START)');
    expect(result.seconds).toBe(15);
    expect(state.rescueBreathsGiven).toBe(true);
  });

  it('pacjent oddychający (samodzielnie lub po udrożnieniu) → niewskazane', () => {
    expect(run(patient(), ['rescue-breaths']).result.text).toContain('nie są wskazane');
    const r = run(child({ afterAirway: true, rate: 20 }), ['airway', 'rescue-breaths']);
    expect(r.result.text).toContain('nie są wskazane');
    expect(r.state.rescueBreathsGiven).toBe(false);
  });
});

describe('tętno, CRT', () => {
  it('dorosły: tętno promieniowe', () => {
    expect(run(patient(), ['pulse']).result).toEqual({ action: 'pulse', text: 'Tętno promieniowe: wyczuwalne', seconds: 5 });
    expect(run(patient({ peripheralPulse: false }), ['pulse']).result.text).toBe('Tętno promieniowe: niewyczuwalne');
  });

  it('dziecko: tętno obwodowe', () => {
    const p = { ...patient({ peripheralPulse: false }), appearsChild: true };
    expect(run(p, ['pulse']).result.text).toBe('Tętno obwodowe: niewyczuwalne');
  });

  it('CRT z przecinkiem dziesiętnym', () => {
    expect(run(patient({ crtSeconds: 3 }), ['crt']).result).toEqual({ action: 'crt', text: 'Nawrót kapilarny: 3 s', seconds: 3 });
    expect(run(patient({ crtSeconds: 1.5 }), ['crt']).result.text).toBe('Nawrót kapilarny: 1,5 s');
  });

  it('pacjent w bezdechu — wyniki zgodne z parametrami', () => {
    const p = apnoeic({}, { peripheralPulse: false, crtSeconds: 6 });
    expect(run(p, ['pulse']).result.text).toBe('Tętno promieniowe: niewyczuwalne');
    expect(run(p, ['crt']).result.text).toBe('Nawrót kapilarny: brak — nieoznaczalny');
    expect(run(p, ['commands']).result.text).toBe('Nie reaguje na głos ani na polecenia');
    expect(run(p, ['avpu']).result.text).toBe('AVPU: U — nie reaguje');
  });
});

describe('proste polecenia', () => {
  it('wykonuje', () => {
    expect(run(patient(), ['commands']).result).toEqual({ action: 'commands', text: 'Wykonuje proste polecenia', seconds: 5 });
  });

  it('nie wykonuje — opis zgodny z AVPU', () => {
    expect(run(patient({ obeysCommands: false, avpu: 'A' }), ['commands']).result.text).toContain('splątany');
    expect(run(patient({ obeysCommands: false, avpu: 'V' }), ['commands']).result.text).toBe('Reaguje na głos, ale nie wykonuje prostych poleceń');
    expect(run(patient({ obeysCommands: false, avpu: 'P' }), ['commands']).result.text).toBe('Nie reaguje na głos ani na polecenia');
    expect(run(patient({ obeysCommands: false, avpu: 'U' }), ['commands']).result.text).toBe('Nie reaguje na głos ani na polecenia');
  });

  it('niemowlę: brak wykonywania poleceń wynika z wieku, a nie ze splątania', () => {
    const infant = patient({ obeysCommands: false, avpu: 'A', nonAmbulatoryByAge: true }, { ageYears: 0.8, appearsChild: true });
    const text = run(infant, ['commands']).result.text;
    expect(text).toContain('Niemowlę');
    expect(text).not.toContain('splątany');
  });
});

describe('AVPU', () => {
  it.each([
    [{ avpu: 'A' } as VitalsOver, 'AVPU: A — przytomny'],
    [{ avpu: 'V' } as VitalsOver, 'AVPU: V — reaguje na głos'],
    [{ avpu: 'P', painResponseAppropriate: true } as VitalsOver, 'AVPU: P — reaguje na ból adekwatnie (lokalizuje / odsuwa bodziec)'],
    [{ avpu: 'P', painResponseAppropriate: false } as VitalsOver, 'AVPU: P — reakcja na ból nieadekwatna (jęk, ruchy bezcelowe, ułożenie zgięciowe lub wyprostne)'],
    [{ avpu: 'P' } as VitalsOver, 'AVPU: P — reakcja na ból nieadekwatna (jęk, ruchy bezcelowe, ułożenie zgięciowe lub wyprostne)'],
    [{ avpu: 'U' } as VitalsOver, 'AVPU: U — nie reaguje'],
  ])('%o → %s', (v, text) => {
    expect(run(patient(v), ['avpu']).result).toEqual({ action: 'avpu', text, seconds: 5 });
  });
});

describe('tamowanie krwotoku', () => {
  const bleeder = patient({ peripheralPulse: false, crtSeconds: 4 }, { majorBleeding: true });

  it('masywny krwotok → zatamowany', () => {
    const { state, result } = run(bleeder, ['bleeding']);
    expect(result).toEqual({ action: 'bleeding', text: 'Krwotok zatamowany opaską uciskową', seconds: 10 });
    expect(state.bleedingControlled).toBe(true);
  });

  it('już zatamowany → 1 s', () => {
    const { result } = run(bleeder, ['bleeding', 'bleeding']);
    expect(result.seconds).toBe(1);
    expect(result.text).toContain('już zatamowany');
  });

  it('brak masywnego krwotoku', () => {
    const { state, result } = run(patient(), ['bleeding']);
    expect(result.text).toBe('Brak masywnego krwotoku zewnętrznego');
    expect(result.seconds).toBeLessThan(ACTION_SECONDS.bleeding);
    expect(state.bleedingControlled).toBe(false);
  });
});
