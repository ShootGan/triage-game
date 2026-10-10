import { describe, expect, it } from 'vitest';
import type { ScenarioPatient } from '../../scenarios/types';
import { initialExamState, performAction } from '../exam';
import type { ExamActionId, PatientExamState } from '../exam/types';
import type { Vitals } from '../triage';
import { debriefPatient, scoreGame, verdictFor } from './index';

type VitalsOver = Partial<Omit<Vitals, 'breathing'>> & { breathing?: Partial<Vitals['breathing']> };

function patient(id: string, over: VitalsOver = {}, extra: Partial<ScenarioPatient> = {}): ScenarioPatient {
  const { breathing, ...rest } = over;
  return {
    id,
    label: `Pacjent ${id}`,
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

const apnoeic = (id: string, b: Partial<Vitals['breathing']> = {}, rest: VitalsOver = {}, extra: Partial<ScenarioPatient> = {}) =>
  patient(id, { avpu: 'U', obeysCommands: false, ...rest, breathing: { spontaneous: false, afterAirway: false, rate: 0, ...b } }, extra);

function exam(p: ScenarioPatient, actions: ExamActionId[]): PatientExamState {
  return actions.reduce((s, a) => performAction(p, s, a).state, initialExamState());
}

describe('verdictFor', () => {
  it('zgodne / brak opaski', () => {
    expect(verdictFor('red', 'red')).toBe('correct');
    expect(verdictFor('red', null)).toBe('untagged');
  });

  it('ranga: zielony < żółty < czerwony', () => {
    expect(verdictFor('yellow', 'red')).toBe('over');
    expect(verdictFor('yellow', 'green')).toBe('under');
    expect(verdictFor('red', 'green')).toBe('under');
    expect(verdictFor('green', 'red')).toBe('over');
  });

  it('CZARNY u pacjenta żywego → zaniżenie; brak CZARNEGO u zmarłego → zawyżenie', () => {
    expect(verdictFor('green', 'black')).toBe('under');
    expect(verdictFor('red', 'black')).toBe('under');
    expect(verdictFor('black', 'red')).toBe('over');
    expect(verdictFor('black', 'green')).toBe('over');
  });
});

describe('debriefPatient — wyjaśnienia', () => {
  it('poprawnie → puste wyjaśnienie, ścieżka i protokół z silnika', () => {
    const p = patient('a', { breathing: { rate: 34 } });
    const d = debriefPatient(p, 'red', exam(p, ['breathing']));
    expect(d).toMatchObject({ patientId: 'a', label: 'Pacjent a', protocol: 'START', expected: 'red', given: 'red', verdict: 'correct', explanation: '' });
    expect(d.steps.map(s => s.id)).toEqual(['walk', 'breathing', 'resp-rate']);
    expect(d.actionsDone).toEqual(['breathing']);
  });

  it('START: RR > 30 oznaczony jako żółty', () => {
    const p = patient('a', { breathing: { rate: 34 } });
    const d = debriefPatient(p, 'yellow', exam(p, ['breathing']));
    expect(d.verdict).toBe('under');
    expect(d.explanation).toBe('Oddechy 34/min (> 30) → CZERWONY. Oznaczono jako ŻÓŁTY — zaniżenie.');
  });

  it('wspomina o niewykonanej czynności, która ujawnia kluczowe ustalenie', () => {
    const p = patient('a', { breathing: { rate: 34 } });
    const d = debriefPatient(p, 'yellow', exam(p, ['pulse']));
    expect(d.explanation).toContain('Nie wykonano: oceny oddechu.');
  });

  it('START: brak tętna / CRT', () => {
    const p1 = patient('a', { peripheralPulse: false, crtSeconds: 4 });
    expect(debriefPatient(p1, 'yellow', exam(p1, ['breathing', 'pulse'])).explanation).toBe(
      'Brak tętna promieniowego → CZERWONY. Oznaczono jako ŻÓŁTY — zaniżenie.',
    );
    const p2 = patient('b', { crtSeconds: 3 });
    const d2 = debriefPatient(p2, 'yellow', exam(p2, ['breathing', 'pulse']));
    expect(d2.explanation).toBe('Nawrót kapilarny 3 s (> 2 s) → CZERWONY. Oznaczono jako ŻÓŁTY — zaniżenie. Nie wykonano: oceny nawrotu kapilarnego.');
  });

  it('START: nie wykonuje poleceń; żółty zawyżony do czerwonego', () => {
    const p = patient('a', { obeysCommands: false, avpu: 'V' });
    expect(debriefPatient(p, 'yellow', undefined).explanation).toMatch(/^Nie wykonuje prostych poleceń → CZERWONY\. Oznaczono jako ŻÓŁTY — zaniżenie\./);
    const y = patient('b');
    const d = debriefPatient(y, 'red', exam(y, ['breathing', 'pulse', 'crt', 'commands']));
    expect(d.verdict).toBe('over');
    expect(d.explanation).toBe(
      'Nie chodzi; oddechy 20/min (≤ 30), tętno promieniowe obecne, CRT 1,5 s (≤ 2 s), wykonuje polecenia → ŻÓŁTY. Oznaczono jako CZERWONY — zawyżenie.',
    );
  });

  it('chodzący oznaczony jako żółty', () => {
    const p = patient('a', { canWalk: true });
    expect(debriefPatient(p, 'yellow', undefined).explanation).toBe('Chodzi samodzielnie → ZIELONY. Oznaczono jako ŻÓŁTY — zawyżenie.');
  });

  it('nieoznaczony pacjent', () => {
    const p = patient('a', { breathing: { rate: 34 } });
    const d = debriefPatient(p, null, undefined);
    expect(d.verdict).toBe('untagged');
    expect(d.given).toBeNull();
    expect(d.explanation).toBe('Oddechy 34/min (> 30) → CZERWONY. Pacjenta nie oznaczono. Nie wykonano: oceny oddechu.');
  });

  it('START: bezdech, oddech po udrożnieniu, oznaczony jako czarny bez udrożnienia', () => {
    const p = apnoeic('a', { afterAirway: true, rate: 10 });
    const d = debriefPatient(p, 'black', exam(p, ['breathing']));
    expect(d.verdict).toBe('under');
    expect(d.explanation).toBe(
      'Bezdech, oddech wraca po udrożnieniu dróg oddechowych → CZERWONY. Oznaczono jako CZARNY — zaniżenie. Nie wykonano: udrożnienia dróg oddechowych.',
    );
    expect(d.missedLifesaving).toEqual(['Nie udrożniono dróg oddechowych u pacjenta bez oddechu']);
  });

  it('START: zmarły oznaczony jako czerwony → zawyżenie', () => {
    const p = apnoeic('a', {}, { peripheralPulse: false, crtSeconds: 6 });
    const d = debriefPatient(p, 'red', exam(p, ['breathing', 'airway']));
    expect(d.verdict).toBe('over');
    expect(d.explanation).toBe('Bezdech mimo udrożnienia dróg oddechowych → CZARNY. Oznaczono jako CZERWONY — zawyżenie.');
    expect(d.missedLifesaving).toEqual([]);
  });

  describe('JumpSTART', () => {
    const child = (id: string, over: VitalsOver) => ({ ...patient(id, over), appearsChild: true, ageYears: 6 });

    it('oddechy < 15 i > 45, nieregularny', () => {
      expect(debriefPatient(child('a', { breathing: { rate: 12 } }), 'yellow', undefined).explanation).toMatch(/^Oddechy 12\/min \(< 15\) → CZERWONY/);
      expect(debriefPatient(child('b', { breathing: { rate: 50 } }), 'yellow', undefined).explanation).toMatch(/^Oddechy 50\/min \(> 45\) → CZERWONY/);
      expect(debriefPatient(child('c', { breathing: { rate: 30, irregular: true } }), 'yellow', undefined).explanation).toMatch(
        /^Oddech nieregularny \(30\/min\) → CZERWONY/,
      );
    });

    it('brak tętna obwodowego; AVPU P nieadekwatne / U; żółty', () => {
      expect(debriefPatient(child('a', { peripheralPulse: false }), 'yellow', undefined).explanation).toMatch(/^Brak tętna obwodowego → CZERWONY/);
      expect(
        debriefPatient(child('b', { avpu: 'P', painResponseAppropriate: false, obeysCommands: false }), 'yellow', undefined).explanation,
      ).toMatch(/^AVPU: P z nieadekwatną reakcją na ból → CZERWONY.*Nie wykonano: oceny oddechu, badania tętna, oceny AVPU\.$/);
      expect(debriefPatient(child('c', { avpu: 'U', obeysCommands: false }), 'yellow', undefined).explanation).toMatch(/^AVPU: U → CZERWONY/);
      expect(debriefPatient(child('d', { avpu: 'V', obeysCommands: false }), 'red', undefined).explanation).toMatch(
        /^Nie chodzi; oddechy 20\/min \(15–45\), tętno obwodowe obecne, AVPU: V → ŻÓŁTY\. Oznaczono jako CZERWONY — zawyżenie\./,
      );
    });

    it('niemowlę niechodzące z powodu wieku', () => {
      const inf = child('a', { nonAmbulatoryByAge: true });
      expect(debriefPatient(inf, 'yellow', undefined).explanation).toMatch(/bez kryteriów czerwonych i istotnych obrażeń → ZIELONY/);
      const inj = child('b', { nonAmbulatoryByAge: true, significantExternalInjury: true });
      expect(debriefPatient(inj, 'green', undefined).explanation).toMatch(/z istotnymi obrażeniami → ŻÓŁTY/);
    });

    it('bezdech bez tętna → czarny; oznaczony jako czerwony', () => {
      const p = { ...apnoeic('a', {}, { peripheralPulse: false, crtSeconds: 6 }), appearsChild: true };
      const d = debriefPatient(p, 'red', exam(p, ['airway']));
      expect(d.protocol).toBe('JumpSTART');
      expect(d.explanation).toBe(
        'Bezdech po udrożnieniu dróg oddechowych i brak tętna obwodowego → CZARNY. Oznaczono jako CZERWONY — zawyżenie. Nie wykonano: badania tętna.',
      );
    });

    it('bezdech z tętnem, oddycha po oddechach ratowniczych — oznaczony jako czarny bez oddechów ratowniczych', () => {
      const p = { ...apnoeic('a', { afterRescueBreaths: true, rate: 12 }), appearsChild: true };
      const d = debriefPatient(p, 'black', exam(p, ['breathing', 'airway', 'pulse']));
      expect(d.verdict).toBe('under');
      expect(d.explanation).toBe(
        'Bezdech po udrożnieniu, tętno obecne, oddech wraca po 5 oddechach ratowniczych → CZERWONY. Oznaczono jako CZARNY — zaniżenie. Nie wykonano: 5 oddechów ratowniczych.',
      );
      expect(d.missedLifesaving).toEqual(['Nie podano 5 oddechów ratowniczych dziecku z zachowanym tętnem przed oznaczeniem jako CZARNY']);
    });

    it('bezdech z tętnem, bez oddechu po oddechach ratowniczych → czarny (poprawnie, bez uwag)', () => {
      const p = { ...apnoeic('a', { afterRescueBreaths: false }), appearsChild: true };
      const d = debriefPatient(p, 'black', exam(p, ['breathing', 'airway', 'pulse', 'rescue-breaths']));
      expect(d.verdict).toBe('correct');
      expect(d.missedLifesaving).toEqual([]);
    });
  });
});

describe('missedLifesaving', () => {
  it('niezatamowany masywny krwotok — niezależnie od opaski', () => {
    const p = patient('a', { peripheralPulse: false, crtSeconds: 4 }, { majorBleeding: true });
    expect(debriefPatient(p, 'red', exam(p, ['pulse'])).missedLifesaving).toEqual(['Nie zatamowano masywnego krwotoku']);
    expect(debriefPatient(p, 'red', exam(p, ['pulse', 'bleeding'])).missedLifesaving).toEqual([]);
  });

  it('bezdech bez udrożnienia — tylko gdy oznaczony jako czarny lub nieoznaczony', () => {
    const p = apnoeic('a', { afterAirway: true, rate: 10 });
    expect(debriefPatient(p, null, undefined).missedLifesaving).toEqual(['Nie udrożniono dróg oddechowych u pacjenta bez oddechu']);
    expect(debriefPatient(p, 'red', undefined).missedLifesaving).toEqual([]);
    expect(debriefPatient(p, 'black', exam(p, ['airway'])).missedLifesaving).toEqual([]);
  });

  it('dziecko w bezdechu z tętnem, nieoznaczone, bez oddechów ratowniczych', () => {
    const p = { ...apnoeic('a', { afterRescueBreaths: false }), appearsChild: true };
    expect(debriefPatient(p, null, exam(p, ['airway'])).missedLifesaving).toEqual([
      'Nie podano 5 oddechów ratowniczych dziecku z zachowanym tętnem',
    ]);
  });

  it('dorosły w bezdechu z tętnem — oddechy ratownicze nie są wymagane', () => {
    const p = apnoeic('a');
    expect(debriefPatient(p, 'black', exam(p, ['airway'])).missedLifesaving).toEqual([]);
  });
});

describe('scoreGame', () => {
  const ps = [
    patient('g', { canWalk: true }),
    patient('y'),
    patient('r', { breathing: { rate: 34 } }),
    apnoeic('b'),
  ];

  it('zlicza werdykty, trafność, czas na pacjenta', () => {
    const s = scoreGame(ps, { g: 'green', y: 'red', r: 'yellow' }, { b: undefined }, 90);
    expect(s).toMatchObject({ total: 4, correct: 1, over: 1, under: 1, untagged: 1, accuracyPct: 25, elapsedSec: 90, avgSecPerPatient: 30 });
    expect(s.patients.map(p => p.verdict)).toEqual(['correct', 'over', 'under', 'untagged']);
  });

  it('zaokrąglenie trafności do liczby całkowitej', () => {
    const s = scoreGame(ps.slice(0, 3), { g: 'green', y: 'yellow', r: 'green' }, {}, 60);
    expect(s.accuracyPct).toBe(67);
    expect(s.avgSecPerPatient).toBe(20);
  });

  it('brak oznaczeń → średni czas 0', () => {
    const s = scoreGame(ps, {}, {}, 120);
    expect(s.untagged).toBe(4);
    expect(s.avgSecPerPatient).toBe(0);
    expect(s.accuracyPct).toBe(0);
  });

  it('pusty scenariusz', () => {
    expect(scoreGame([], {}, {}, 0)).toMatchObject({ total: 0, accuracyPct: 0, avgSecPerPatient: 0, patients: [] });
  });
});
