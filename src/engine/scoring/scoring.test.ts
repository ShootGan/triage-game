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
    expect(d.critical).toBe(true);
    expect(d.explanation).toBe(
      'BŁĄD KRYTYCZNY: CZARNY u poszkodowanego z szansą przeżycia (wg START CZERWONY). ' +
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
        'BŁĄD KRYTYCZNY: CZARNY u poszkodowanego z szansą przeżycia (wg JumpSTART CZERWONY). ' +
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

describe('procedura przed oznaczeniem (werdykt „procedure")', () => {
  const childApnoeic = (id: string, b: Partial<Vitals['breathing']> = {}, rest: VitalsOver = {}) => ({
    ...apnoeic(id, b, rest),
    appearsChild: true,
    ageYears: 6,
  });
  /** Liczba czynności przed opaską = długość dziennika po `before`. */
  const tagAfter = (before: ExamActionId[]) => before.length;

  describe('START', () => {
    const dead = apnoeic('a', {}, { peripheralPulse: false, crtSeconds: 6 });

    it('czarny po udrożnieniu → poprawnie', () => {
      const d = debriefPatient(dead, 'black', exam(dead, ['breathing', 'airway']));
      expect(d.verdict).toBe('correct');
      expect(d.explanation).toBe('');
      expect(d.actionsBeforeTag).toBe(2);
    });

    it('czarny bez udrożnienia → procedura', () => {
      const d = debriefPatient(dead, 'black', exam(dead, ['breathing']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation).toBe(
        'Oznaczono jako CZARNY bez udrożnienia dróg oddechowych — wg START pacjent, u którego po udrożnieniu wraca oddech, byłby CZERWONY. Kolor zgodny z algorytmem, ale ustalony bez wymaganego kroku.',
      );
      expect(d.missedLifesaving).toEqual(['Nie udrożniono dróg oddechowych u pacjenta bez oddechu']);
    });

    it('udrożnienie dopiero po opasce się nie liczy', () => {
      const ex = exam(dead, ['breathing', 'airway']);
      const d = debriefPatient(dead, 'black', ex, 1);
      expect(d.verdict).toBe('procedure');
      expect(d.actionsDone).toEqual(['breathing', 'airway']);
      expect(d.actionsBeforeTag).toBe(1);
      expect(d.missedLifesaving).toEqual(['Nie udrożniono dróg oddechowych u pacjenta bez oddechu']);
    });

    it('ponowne oznaczenie po udrożnieniu → liczy się ostatnia opaska', () => {
      const ex = exam(dead, ['breathing', 'airway']);
      expect(debriefPatient(dead, 'black', ex, ex.log.length).verdict).toBe('correct');
    });

    it('bezdech, oddech po udrożnieniu, czerwony bez udrożnienia → procedura', () => {
      const p = apnoeic('b', { afterAirway: true, rate: 10 });
      const d = debriefPatient(p, 'red', exam(p, ['breathing']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation).toMatch(/^Oznaczono jako CZERWONY bez udrożnienia dróg oddechowych — wg START/);
      expect(debriefPatient(p, 'red', exam(p, ['airway'])).verdict).toBe('correct');
    });

    it('trafiony kolor bez oceny rozstrzygającej → procedura (np. czerwony bez CRT)', () => {
      const p = patient('c', { crtSeconds: 3 });
      const d = debriefPatient(p, 'red', exam(p, ['breathing']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation).toBe(
        'Kolor zgodny z algorytmem, ale ustalenia sprzed oznaczenia go nie rozstrzygały — trafienie „na ślepo". Nie wykonano: oceny nawrotu kapilarnego.',
      );
      // START perfusion: one decisive finding is enough — CRT > 2 s without a pulse check.
      expect(debriefPatient(p, 'red', exam(p, ['breathing', 'crt'])).verdict).toBe('correct');
    });

    it('żółty wymaga oceny: oddech, perfuzja (tętno ALBO CRT — zamiennie), polecenia', () => {
      const p = patient('y');
      expect(debriefPatient(p, 'yellow', exam(p, ['breathing', 'pulse', 'commands'])).verdict).toBe('correct');
      expect(debriefPatient(p, 'yellow', exam(p, ['breathing', 'crt', 'commands'])).verdict).toBe('correct');
      const d = debriefPatient(p, 'yellow', exam(p, ['breathing']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation).toMatch(/Nie wykonano: badania tętna, sprawdzenia, czy wykonuje proste polecenia\./);
    });

    it('chodzący zielony nie wymaga żadnej czynności', () => {
      const p = patient('g', { canWalk: true });
      expect(debriefPatient(p, 'green', undefined).verdict).toBe('correct');
    });

    it('zły kolor nadal over/under', () => {
      expect(debriefPatient(dead, 'red', exam(dead, [])).verdict).toBe('over');
      const p = apnoeic('d', { afterAirway: true, rate: 10 });
      expect(debriefPatient(p, 'black', exam(p, [])).verdict).toBe('under');
    });
  });

  describe('JumpSTART', () => {
    const noBreathsWithPulse = childApnoeic('a', { afterRescueBreaths: false });
    const noPulse = childApnoeic('b', {}, { peripheralPulse: false, crtSeconds: 6 });
    const BREATHS_SENTENCE =
      'Oznaczono jako CZARNY bez 5 oddechów ratowniczych u dziecka z zachowanym tętnem — wg JumpSTART dziecko po skutecznych oddechach ratowniczych byłoby CZERWONE.';

    it('pełna procedura (udrożnienie → tętno → 5 oddechów) → poprawnie', () => {
      const d = debriefPatient(noBreathsWithPulse, 'black', exam(noBreathsWithPulse, ['airway', 'pulse', 'rescue-breaths']));
      expect(d.verdict).toBe('correct');
      expect(d.missedLifesaving).toEqual([]);
    });

    it('bez 5 oddechów ratowniczych → procedura (zgłoszony błąd)', () => {
      const p = noBreathsWithPulse;
      const d = debriefPatient(p, 'black', exam(p, ['breathing', 'airway', 'pulse']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation).toBe(`${BREATHS_SENTENCE} Kolor zgodny z algorytmem, ale ustalony bez wymaganego kroku.`);
      expect(d.missedLifesaving).toEqual(['Nie podano 5 oddechów ratowniczych dziecku z zachowanym tętnem przed oznaczeniem jako CZARNY']);
    });

    it('bez badania tętna, ale oddechy ratownicze bez efektu → kolor rozstrzygnięty (tętno nic nie zmienia)', () => {
      const p = noBreathsWithPulse;
      expect(debriefPatient(p, 'black', exam(p, ['airway', 'rescue-breaths'])).verdict).toBe('correct');
    });

    it('bez tętna obwodowego: udrożnienie + tętno wystarczą; bez tętna → procedura', () => {
      expect(debriefPatient(noPulse, 'black', exam(noPulse, ['airway', 'pulse'])).verdict).toBe('correct');
      const d = debriefPatient(noPulse, 'black', exam(noPulse, ['airway']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation).toMatch(/bez badania tętna obwodowego/);
      expect(d.explanation).not.toMatch(/oddechów ratowniczych u dziecka/);
    });

    it('bez udrożnienia → procedura; wymienia wszystkie pominięte kroki', () => {
      const p = noBreathsWithPulse;
      const d = debriefPatient(p, 'black', exam(p, ['breathing']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation).toBe(
        'Oznaczono jako CZARNY bez udrożnienia dróg oddechowych — wg JumpSTART dziecko, u którego po udrożnieniu wraca oddech, byłoby CZERWONE. ' +
          'Przed oznaczeniem nie wykonano też: badania tętna, 5 oddechów ratowniczych. Kolor zgodny z algorytmem, ale ustalony bez wymaganego kroku.',
      );
      expect(d.missedLifesaving).toEqual([
        'Nie udrożniono dróg oddechowych u pacjenta bez oddechu',
        'Nie podano 5 oddechów ratowniczych dziecku z zachowanym tętnem przed oznaczeniem jako CZARNY',
      ]);
    });

    it('5 oddechów ratowniczych dopiero po opasce → procedura; ponowne oznaczenie → poprawnie', () => {
      const p = noBreathsWithPulse;
      const ex = exam(p, ['airway', 'pulse', 'rescue-breaths']);
      expect(debriefPatient(p, 'black', ex, tagAfter(['airway', 'pulse'])).verdict).toBe('procedure');
      expect(debriefPatient(p, 'black', ex, tagAfter(['airway', 'pulse', 'rescue-breaths'])).verdict).toBe('correct');
    });

    it('oddechy ratownicze „przed udrożnieniem" nie liczą się (czynność bez efektu)', () => {
      const p = noBreathsWithPulse;
      const d = debriefPatient(p, 'black', exam(p, ['rescue-breaths', 'airway', 'pulse']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation.startsWith(BREATHS_SENTENCE)).toBe(true);
    });

    it('dziecko oddycha po oddechach ratowniczych: czerwony bez oddechów → procedura; czarny → zaniżenie', () => {
      const p = childApnoeic('c', { afterRescueBreaths: true, rate: 12 });
      expect(debriefPatient(p, 'red', exam(p, ['airway', 'pulse', 'rescue-breaths'])).verdict).toBe('correct');
      const d = debriefPatient(p, 'red', exam(p, ['airway', 'pulse']));
      expect(d.verdict).toBe('procedure');
      expect(d.explanation).toMatch(/^Oznaczono jako CZERWONY bez 5 oddechów ratowniczych — wg JumpSTART/);
      expect(debriefPatient(p, 'black', exam(p, ['airway', 'pulse'])).verdict).toBe('under');
    });
  });

  describe('masywny krwotok przed opaską', () => {
    const p = patient('k', { peripheralPulse: false, crtSeconds: 4 }, { majorBleeding: true });

    it('czerwony bez tamowania → kolor zaliczony, krwotok jako pominięta czynność (kara punktowa)', () => {
      const d = debriefPatient(p, 'red', exam(p, ['breathing', 'pulse']));
      expect(d.verdict).toBe('correct');
      expect(d.missedLifesaving).toEqual(['Nie zatamowano masywnego krwotoku']);
      expect(d.points).toBe(7);
      expect(debriefPatient(p, 'red', exam(p, ['bleeding', 'breathing', 'pulse'])).points).toBe(10);
    });

    it('zatamowany dopiero po oznaczeniu → uwaga o kolejności', () => {
      const d = debriefPatient(p, 'red', exam(p, ['breathing', 'pulse', 'bleeding']), 2);
      expect(d.verdict).toBe('correct');
      expect(d.missedLifesaving).toEqual([
        'Krwotok zatamowano dopiero po oznaczeniu — tamowanie masywnego krwotoku wykonuje się w trakcie oceny, przed nadaniem kategorii',
      ]);
    });
  });

  describe('scoreGame z momentami oznaczeń', () => {
    const ps = [apnoeic('s', {}, { peripheralPulse: false }), childApnoeic('j', { afterRescueBreaths: false }), patient('y')];
    const exams = {
      s: exam(ps[0], ['airway']),
      j: exam(ps[1], ['airway', 'pulse', 'rescue-breaths']),
      y: exam(ps[2], ['breathing', 'pulse', 'crt', 'commands']),
    };
    const tags = { s: 'black', j: 'black', y: 'yellow' } as const;

    it('procedura liczona jako błąd w trafności', () => {
      const s = scoreGame(ps, tags, exams, 60, {
        s: { category: 'black', logIndex: 0 },
        j: { category: 'black', logIndex: 2 },
        y: { category: 'yellow', logIndex: 4 },
      });
      expect(s).toMatchObject({ total: 3, correct: 1, procedure: 2, over: 0, under: 0, untagged: 0, accuracyPct: 33 });
      expect(s.patients.map(p => p.verdict)).toEqual(['procedure', 'procedure', 'correct']);
    });

    it('bez tagEvents → opaska po wszystkich czynnościach (zgodność wstecz)', () => {
      const s = scoreGame(ps, tags, exams, 60);
      expect(s).toMatchObject({ correct: 3, procedure: 0, accuracyPct: 100 });
    });

    it('nieoznaczony pacjent nie dostaje werdyktu procedury', () => {
      const s = scoreGame(ps, {}, exams, 60);
      expect(s).toMatchObject({ procedure: 0, untagged: 3 });
      expect(s.patients[0].actionsBeforeTag).toBeNull();
    });
  });
});

describe('dziecko 9–12 lat — zaliczany kolor wg JumpSTART i START', () => {
  // AVPU P with an inappropriate response: JumpSTART → RED; doesn't obey commands → RED in START too.
  // CRT 3 s with a pulse: JumpSTART ignores CRT (→ YELLOW), START → RED.
  const kid = (ageYears: number) => ({ ...patient('k', { crtSeconds: 3 }), appearsChild: true, ageYears });
  const full = (p: ScenarioPatient) => exam(p, ['breathing', 'pulse', 'crt', 'commands', 'avpu']);

  it('10 lat: ŻÓŁTY (JumpSTART) i CZERWONY (START) — oba poprawne', () => {
    const p = kid(10);
    const y = debriefPatient(p, 'yellow', full(p));
    expect(y).toMatchObject({ verdict: 'correct', protocol: 'JumpSTART', expected: 'yellow' });
    expect(y.alternative).toMatchObject({ protocol: 'START', expected: 'red' });
    const r = debriefPatient(p, 'red', full(p));
    expect(r).toMatchObject({ verdict: 'correct', protocol: 'START', expected: 'red' });
    expect(r.alternative).toMatchObject({ protocol: 'JumpSTART', expected: 'yellow' });
  });

  it('10 lat: zły kolor wg obu — wyjaśnienie wspomina drugi algorytm', () => {
    const p = kid(10);
    const d = debriefPatient(p, 'green', full(p));
    expect(d.verdict).toBe('under');
    expect(d.explanation).toMatch(/Wg START: CZERWONY — dla dziecka 9–12 lat zaliczany jest kolor z każdego z algorytmów\.$/);
  });

  it('10 lat: ten sam kolor wg obu — ustalenia ze ścieżki START wystarczą (zgłoszenie z gry)', () => {
    // Doesn't obey commands, AVPU P with an inappropriate response: RED in both algorithms.
    const p = { ...patient('k', { obeysCommands: false, avpu: 'P', painResponseAppropriate: false }), appearsChild: true, ageYears: 10 };
    const d = debriefPatient(p, 'red', exam(p, ['breathing', 'pulse', 'commands']));
    expect(d.verdict).toBe('correct');
    expect(d.points).toBe(10);
    // 8 years: JumpSTART only — commands don't settle the AVPU step.
    const young = { ...p, ageYears: 8 };
    expect(debriefPatient(young, 'red', exam(young, ['breathing', 'pulse', 'commands'])).verdict).toBe('procedure');
  });

  it('8 lat: tylko JumpSTART', () => {
    const p = kid(8);
    expect(debriefPatient(p, 'red', full(p)).verdict).toBe('over');
    expect(debriefPatient(p, 'yellow', full(p)).alternative).toBeUndefined();
  });
});

describe('uwagi dydaktyczne', () => {
  it('niemowlę — lista istotnych obrażeń wg JumpSTART', () => {
    const inf = { ...patient('i', { nonAmbulatoryByAge: true, avpu: 'A' }), appearsChild: true, ageYears: 0.75 };
    expect(debriefPatient(inf, 'green', undefined).notes?.[0]).toMatch(/^Istotne obrażenia zewnętrzne u niemowlęcia wg JumpSTART: głębokie rany penetrujące/);
  });

  it('ciężarna: segregacja wtórna; we wstrząsie na plecach — lewy bok', () => {
    const base = patient('c', { peripheralPulse: false, crtSeconds: 4 });
    const p = { ...base, appearance: { ...base.appearance, sex: 'f' as const, pregnant: true } };
    const notes = debriefPatient(p, 'red', undefined).notes ?? [];
    expect(notes[0]).toMatch(/^Ciąża nie zmienia kategorii w segregacji wstępnej/);
    expect(notes[1]).toMatch(/ułóż na lewym boku/);
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
    expect(s).toMatchObject({ total: 4, correct: 1, procedure: 0, over: 1, under: 1, untagged: 1, accuracyPct: 25, elapsedSec: 90, avgSecPerPatient: 30 });
    expect(s.patients.map(p => p.verdict)).toEqual(['correct', 'over', 'under', 'untagged']);
  });

  it('zaokrąglenie trafności do liczby całkowitej', () => {
    const exams = { y: exam(ps[1], ['breathing', 'pulse', 'crt', 'commands']) };
    const s = scoreGame(ps.slice(0, 3), { g: 'green', y: 'yellow', r: 'green' }, exams, 60);
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

describe('zimno (hala): nawrót kapilarny niewiarygodny', () => {
  const cold = (over: VitalsOver = {}) => ({ ...patient('h', over), cold: true });

  it('CRT wychodzi wydłużony także przy dobrej perfuzji', () => {
    const p = cold();
    const text = exam(p, ['crt']).log[0].text;
    expect(Number(text.match(/(\d+(,\d+)?) s/)![1].replace(',', '.'))).toBeGreaterThan(2);
  });

  it('żółty: liczy się tylko tętno, CRT nie zastępuje oceny; debrief wyjaśnia dlaczego', () => {
    const p = cold();
    expect(debriefPatient(p, 'yellow', exam(p, ['breathing', 'pulse', 'commands'])).verdict).toBe('correct');
    const d = debriefPatient(p, 'yellow', exam(p, ['breathing', 'crt', 'commands']));
    expect(d.verdict).toBe('procedure');
    expect(d.notes?.[0]).toMatch(/^Zimno: wychłodzona skóra fałszywie wydłuża nawrót kapilarny/);
  });
});

describe('ocena oparta na ustaleniach (kolejność dowolna)', () => {
  it('START: brak tętna u oddychającego → CZERWONY bez liczenia oddechów; uwaga o kolejności', () => {
    const p = patient('t', { peripheralPulse: false, crtSeconds: 4, breathing: { rate: 34 } });
    const d = debriefPatient(p, 'red', exam(p, ['pulse', 'commands']));
    expect(d.verdict).toBe('correct');
    expect(d.points).toBe(10);
    expect(debriefPatient(p, 'red', exam(p, ['pulse', 'breathing'])).notes?.[0]).toMatch(/^Kolejność badania inna niż w START/);
  });

  it('sam brak tętna nie wyklucza bezdechu → kolor zgadnięty', () => {
    const p = patient('t', { peripheralPulse: false, crtSeconds: 4 });
    const d = debriefPatient(p, 'red', exam(p, ['pulse']));
    expect(d.verdict).toBe('procedure');
    expect(d.points).toBe(3);
  });

  it('pacjent mówi (wypowiedź w cudzysłowie) → oddycha; brak tętna wystarcza', () => {
    const p = patient('t', { peripheralPulse: false, crtSeconds: 4 }, { remark: '„Proszę mi pomóc…"' });
    expect(debriefPatient(p, 'red', exam(p, ['pulse'])).verdict).toBe('correct');
  });

  it('ŻÓŁTY wymaga wykluczenia wszystkich kryteriów czerwonych — w dowolnej kolejności', () => {
    const p = patient('y');
    expect(debriefPatient(p, 'yellow', exam(p, ['commands', 'pulse', 'breathing'])).verdict).toBe('correct');
    expect(debriefPatient(p, 'yellow', exam(p, ['pulse', 'breathing'])).verdict).toBe('procedure');
  });

  it('punkty: zawyżenie 2, kolor żywego u zmarłego 0, zaniżenie 0, krytyczny −5, każda pominięta czynność ratująca życie −3', () => {
    const y = patient('y');
    expect(debriefPatient(y, 'red', undefined).points).toBe(2);
    const dead = apnoeic('d', {}, { peripheralPulse: false });
    expect(debriefPatient(dead, 'red', exam(dead, ['airway'])).points).toBe(0);
    expect(debriefPatient(y, 'green', undefined).points).toBe(0);
    const a = apnoeic('a', { afterAirway: true, rate: 10 });
    expect(debriefPatient(a, 'black', undefined).points).toBe(-8);
  });

  it('scoreGame: suma punktów, maksimum, procent nieujemny', () => {
    const ps = [patient('g', { canWalk: true }), patient('y')];
    const s = scoreGame(ps, { g: 'green', y: 'red' }, {}, 60);
    expect(s).toMatchObject({ points: 12, maxPoints: 20, scorePct: 60 });
    const a = apnoeic('a', { afterAirway: true, rate: 10 });
    expect(scoreGame([a], { a: 'black' }, {}, 10).scorePct).toBe(0);
  });
});

describe('poprawki po przeglądzie medycznym', () => {
  const kid = (ageYears: number, b: Partial<Vitals['breathing']>) => ({
    ...apnoeic('k', b),
    appearsChild: true,
    ageYears,
  });

  it('dziecko 9–12 lat w bezdechu z tętnem: CZARNY nie jest zaliczany, choć START daje CZARNY', () => {
    const p = kid(10, { afterRescueBreaths: true, rate: 12 });
    const d = debriefPatient(p, 'black', exam(p, ['airway']));
    expect(d).toMatchObject({ verdict: 'under', critical: true, expected: 'red', protocol: 'JumpSTART' });
    expect(d.alternative).toBeUndefined();
    expect(d.explanation).toMatch(/Wg START byłby CZARNY, ale u dziecka 9–12 lat CZARNY nie jest zaliczany/);
  });

  it('JumpSTART: udrożnienie → tętno → 5 oddechów to właściwa kolejność (bez uwagi)', () => {
    const p = { ...apnoeic('c', { afterRescueBreaths: false }), appearsChild: true, ageYears: 6 };
    const d = debriefPatient(p, 'black', exam(p, ['airway', 'pulse', 'rescue-breaths']));
    expect(d.verdict).toBe('correct');
    expect(d.notes ?? []).toEqual([]);
  });

  it('oddech wraca po oddechach ratowniczych → krążenie jest, CZERWONY rozstrzygnięty bez badania tętna', () => {
    const p = { ...apnoeic('c', { afterRescueBreaths: true, rate: 12 }), appearsChild: true, ageYears: 3 };
    expect(debriefPatient(p, 'red', exam(p, ['airway', 'rescue-breaths'])).verdict).toBe('correct');
  });

  it('zimno: debrief nie podaje wartości CRT, której gracz nie widział', () => {
    const p = { ...patient('h'), cold: true };
    const d = debriefPatient(p, 'red', exam(p, ['breathing', 'crt', 'commands']));
    expect(d.verdict).toBe('over');
    expect(d.explanation).toMatch(/CRT niewiarygodny \(zimno\)/);
    expect(d.explanation).not.toMatch(/CRT 1,5 s/);
    expect(d.steps.find(st => st.id === 'perfusion')?.answer).toMatch(/^tętno wyczuwalne, CRT niewiarygodny \(zimno\) — nie$/);
  });
});

describe('rana brzucha', () => {
  it('ŻÓŁTY z raną brzucha → uwaga o pilnej ocenie chirurgicznej', () => {
    const p = patient('b', {}, { injuries: ['rana brzucha od odłamka, niewielkie krwawienie, brzuch miękki'] });
    expect(debriefPatient(p, 'yellow', undefined).notes?.join(' ')).toMatch(/pilna ocena chirurgiczna/);
  });
});

describe('zespół zmiażdżenia', () => {
  it('długo przygniecona kończyna → uwaga o segregacji wtórnej', () => {
    const p = patient('z', {}, { injuries: ['kończyna dolna prawa długo przygniecona gruzem — obrzęk, zasinienie, osłabione czucie'] });
    expect(debriefPatient(p, 'yellow', undefined).notes?.join(' ')).toMatch(/zespół zmiażdżenia/);
  });
});

describe('JumpSTART: proste polecenie zamiast AVPU', () => {
  it('dziecko wykonuje polecenia → AVPU A/V wiadomo, ŻÓŁTY rozstrzygnięty (zgłoszenie z gry)', () => {
    const p = { ...patient('k', { breathing: { rate: 28 } }), appearsChild: true, ageYears: 10 };
    const d = debriefPatient(p, 'yellow', exam(p, ['breathing', 'pulse', 'commands']));
    expect(d.verdict).toBe('correct');
    expect(d.points).toBe(10);
    const young = { ...p, ageYears: 6 };
    expect(debriefPatient(young, 'yellow', exam(young, ['breathing', 'pulse', 'commands'])).verdict).toBe('correct');
  });
});

describe('niemowlę: proste polecenie', () => {
  it('za małe na polecenia także gdy nie jest przytomne — wynik nie udaje objawu', () => {
    const p = { ...patient('n', { avpu: 'P', obeysCommands: false, painResponseAppropriate: false }), appearsChild: true, ageYears: 0.5 };
    const r = performAction(p, initialExamState(), 'commands').result;
    expect(r.text).toBe('Niemowlę — za małe na polecenia (oceń AVPU)');
  });
});

describe('SALT — ocena', () => {
  const salt = (p: ScenarioPatient, given: Parameters<typeof debriefPatient>[1], actions: ExamActionId[], idx?: number) =>
    debriefPatient(p, given, examSalt(p, actions), idx, 'SALT');
  const examSalt = (p: ScenarioPatient, actions: ExamActionId[]) =>
    actions.reduce((s, a) => performAction(p, s, a, 'SALT').state, initialExamState());

  it('niechodzący w normie: ŻÓŁTY po oddechu, tętnie i poleceniach', () => {
    const p = patient('y');
    expect(salt(p, 'yellow', ['breathing', 'pulse', 'commands'])).toMatchObject({ protocol: 'SALT', expected: 'yellow', verdict: 'correct' });
    expect(salt(p, 'yellow', ['breathing', 'pulse']).verdict).toBe('procedure');
  });

  it('chodzący: ZIELONY tylko przy drobnych obrażeniach; złamanie → ŻÓŁTY', () => {
    const minor = patient('g', { canWalk: true });
    expect(salt(minor, 'green', ['breathing', 'pulse', 'commands']).verdict).toBe('correct');
    const fracture = patient('f', { canWalk: true }, { salt: { minorOnly: false } });
    const d = salt(fracture, 'green', ['breathing', 'pulse', 'commands']);
    expect(d).toMatchObject({ expected: 'yellow', verdict: 'under' });
    expect(d.explanation).toMatch(/obrażenia nie tylko drobne — mimo że chodzi → ŻÓŁTY/);
  });

  it('duszność → CZERWONY; wynik oddechu pokazuje objawy, a ocenę zostawia graczowi', () => {
    const p = patient('r', { breathing: { rate: 34 } });
    const ex = examSalt(p, ['breathing']);
    expect(ex.log[0].text).toBe('Oddycha, 34/min — mówi pojedynczymi słowami, łapie powietrze');
    expect(ex.log[0].text).not.toMatch(/duszność/);
    expect(salt(p, 'red', ['breathing']).verdict).toBe('correct');
    expect(salt(p, 'yellow', ['breathing']).explanation).toMatch(/^Duszność \(mówi pojedynczymi słowami, łapie powietrze\) → CZERWONY/);
    const panic = patient('h', { canWalk: true, breathing: { rate: 36 } }, { salt: { distress: false } });
    expect(examSalt(panic, ['breathing']).log[0].text).toBe('Oddycha, 36/min — oddycha szybko, ale mówi pełnymi zdaniami, bez wysiłku oddechowego');
    expect(salt(panic, 'green', ['breathing', 'pulse', 'commands']).notes?.[0]).toMatch(/^Szybki oddech bez wysiłku oddechowego/);
  });

  it('SZARY albo CZARNY u przeżywającego = błąd krytyczny', () => {
    const p = patient('r', { peripheralPulse: false, crtSeconds: 4 });
    const d = salt(p, 'grey', ['breathing', 'pulse']);
    expect(d).toMatchObject({ verdict: 'under', critical: true });
    expect(d.explanation).toMatch(/^BŁĄD KRYTYCZNY: SZARY u poszkodowanego z szansą przeżycia/);
    const e = { ...p, salt: { expectant: true } };
    expect(salt(e, 'grey', ['breathing', 'pulse'])).toMatchObject({ expected: 'grey', verdict: 'correct' });
    expect(salt(e, 'red', ['breathing', 'pulse']).verdict).toBe('over');
  });

  it('dziecko w bezdechu: 2 oddechy ratownicze; bez nich CZARNY zgadnięty + pominięta czynność', () => {
    const c = { ...apnoeic('c', { afterRescueBreaths: false }), appearsChild: true, ageYears: 6 };
    expect(salt(c, 'black', ['airway', 'rescue-breaths']).verdict).toBe('correct');
    const d = salt(c, 'black', ['airway']);
    expect(d.verdict).toBe('procedure');
    expect(d.missedLifesaving).toContain('Nie podano 2 oddechów ratowniczych dziecku w bezdechu');
    expect(examSalt(c, ['airway', 'rescue-breaths']).log[1].text).toBe('Brak oddechu po 2 oddechach ratowniczych');
  });

  it('odma prężna: brak odbarczenia = pominięta czynność ratująca życie', () => {
    const p = patient('o', { breathing: { rate: 36 } }, { salt: { tensionPneumothorax: true } });
    expect(salt(p, 'red', ['breathing']).missedLifesaving).toEqual(['Nie odbarczono odmy prężnej (czynność ratująca życie w SALT)']);
    expect(salt(p, 'red', ['decompression', 'breathing']).missedLifesaving).toEqual([]);
  });

  it('sortowanie: kolejność nieruchomi → machający → chodzący', () => {
    const still = apnoeic('s', {}, { peripheralPulse: false });
    const waver = patient('w');
    const walker = patient('g', { canWalk: true });
    const ps = [still, waver, walker];
    const tags = { s: 'black', w: 'yellow', g: 'green' } as const;
    const ok = scoreGame(ps, tags, {}, 60, {}, { mode: 'SALT', sort: { walkersCalled: true, waversCalled: true, approachOrder: ['s', 'w', 'g'] } });
    expect(ok.patients.map(p => p.sortLate ?? false)).toEqual([false, false, false]);
    expect(ok.sortNotes).toEqual([]);
    const bad = scoreGame(ps, tags, {}, 60, {}, { mode: 'SALT', sort: { walkersCalled: true, waversCalled: true, approachOrder: ['g', 'w', 's'] } });
    expect(bad.patients.map(p => p.sortLate ?? false)).toEqual([false, true, true]);
    expect(bad.sortNotes?.[0]).toMatch(/^Kolejność oceny: 2 poszkodowanych/);
    // bez komendy „pomachaj" nieruchomi i machający wyglądają tak samo
    const noWave = scoreGame(ps, tags, {}, 60, {}, { mode: 'SALT', sort: { walkersCalled: true, waversCalled: false, approachOrder: ['w', 's', 'g'] } });
    expect(noWave.patients.map(p => p.sortLate ?? false)).toEqual([false, false, false]);
    expect(noWave.sortNotes?.[0]).toMatch(/pomachaj ręką/);
  });

  it('START bez zmian: tryb domyślny', () => {
    expect(scoreGame([patient('y')], { y: 'yellow' }, {}, 10).protocol).toBe('START');
  });
});

describe('SALT — dziecko < 3 lat: celowe ruchy zamiast poleceń', () => {
  const examSalt = (p: ScenarioPatient, actions: ExamActionId[]) =>
    actions.reduce((s, a) => performAction(p, s, a, 'SALT').state, initialExamState());
  it('„Proste polecenie" pokazuje celowe ruchy i rozstrzyga kryterium', () => {
    const inf = { ...patient('i', { nonAmbulatoryByAge: true, obeysCommands: false, avpu: 'A', breathing: { rate: 34 } }), appearsChild: true, ageYears: 0.75 };
    const ex = examSalt(inf, ['breathing', 'pulse', 'commands']);
    expect(ex.log[2].text).toBe('Za małe na polecenia — celowe ruchy: wodzi wzrokiem, sięga rączkami');
    const d = debriefPatient(inf, 'green', ex, undefined, 'SALT');
    expect(d).toMatchObject({ expected: 'green', verdict: 'correct' });
    const still = { ...inf, vitals: { ...inf.vitals, avpu: 'P' as const, painResponseAppropriate: false } };
    const e2 = debriefPatient(still, 'yellow', examSalt(still, ['breathing', 'pulse', 'commands']), undefined, 'SALT');
    expect(e2.explanation).toMatch(/^Brak celowych ruchów → CZERWONY/);
  });
});
