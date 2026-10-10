import type { ScenarioPatient } from '../../scenarios/types';
import type { Vitals } from '../triage';
import type { ExamActionId, ExamResult, PatientExamState } from './types';

export type * from './types';

/** Etykiety przycisków czynności w panelu badania. */
export const ACTION_LABEL: Record<ExamActionId, string> = {
  breathing: 'Oceń oddech',
  airway: 'Udrożnij drogi oddechowe',
  'rescue-breaths': '5 oddechów ratowniczych',
  pulse: 'Tętno promieniowe',
  crt: 'Nawrót kapilarny',
  commands: 'Proste polecenie',
  avpu: 'Ocena AVPU',
  bleeding: 'Opaska uciskowa (krwotok)',
};

/** Koszt czynności w sekundach czasu gry (pełne wykonanie). */
export const ACTION_SECONDS: Record<ExamActionId, number> = {
  breathing: 10,
  airway: 5,
  'rescue-breaths': 10,
  pulse: 5,
  crt: 3,
  commands: 5,
  avpu: 5,
  bleeding: 10,
};

/** Koszt czynności, która okazała się zbędna / niemożliwa (szybkie stwierdzenie). */
const QUICK_SECONDS = 2;
/** Szybkie spojrzenie, gdy nie ma masywnego krwotoku do zatamowania. */
const BLEEDING_LOOK_SECONDS = 3;
/** Sprawdzenie już założonej opaski uciskowej. */
const BLEEDING_RECHECK_SECONDS = 1;

export function initialExamState(): PatientExamState {
  return { airwayOpened: false, rescueBreathsGiven: false, bleedingControlled: false, log: [] };
}

/** Liczba po polsku (przecinek dziesiętny), np. 1.5 → „1,5". */
function num(n: number): string {
  return String(n).replace('.', ',');
}

function rateText(b: Vitals['breathing']): string {
  return `${b.rate > 0 ? `, ${b.rate}/min` : ''}${b.irregular ? ', nieregularnie' : ''}`;
}

/** Czy pacjent oddycha w aktualnym stanie badania (uwzględnia udrożnienie i oddechy ratownicze). */
export function isBreathingNow(p: ScenarioPatient, s: PatientExamState): boolean {
  const b = p.vitals.breathing;
  if (b.spontaneous) return true;
  if (s.airwayOpened && b.afterAirway) return true;
  return s.airwayOpened && s.rescueBreathsGiven && !!b.afterRescueBreaths;
}

type Outcome = { text: string; seconds?: number; patch?: Partial<PatientExamState> };

function breathingResult(p: ScenarioPatient, s: PatientExamState): Outcome {
  const b = p.vitals.breathing;
  if (b.spontaneous) return { text: `Oddycha${rateText(b)}` };
  if (!s.airwayOpened) return { text: 'Nie oddycha' };
  if (b.afterAirway) return { text: `Oddycha po udrożnieniu${rateText(b)}` };
  if (s.rescueBreathsGiven) {
    return b.afterRescueBreaths
      ? { text: `Oddycha po oddechach ratowniczych${rateText(b)}` }
      : { text: 'Nie oddycha mimo udrożnienia dróg oddechowych i oddechów ratowniczych' };
  }
  return { text: 'Nie oddycha mimo udrożnienia dróg oddechowych' };
}

function airwayResult(p: ScenarioPatient, s: PatientExamState): Outcome {
  const b = p.vitals.breathing;
  const patch = { airwayOpened: true };
  if (b.spontaneous) return { text: 'Drogi oddechowe drożne', patch };
  if (s.airwayOpened) {
    return { text: `Drogi oddechowe już udrożnione — ${breathingResult(p, s).text.toLowerCase()}`, seconds: QUICK_SECONDS };
  }
  return b.afterAirway
    ? { text: `Udrożniono drogi oddechowe — pojawił się oddech własny${rateText(b)}`, patch }
    : { text: 'Udrożniono drogi oddechowe — nadal brak oddechu', patch };
}

function rescueBreathsResult(p: ScenarioPatient, s: PatientExamState): Outcome {
  const b = p.vitals.breathing;
  if (b.spontaneous || (s.airwayOpened && b.afterAirway)) {
    return { text: 'Pacjent oddycha samodzielnie — oddechy ratownicze nie są wskazane', seconds: QUICK_SECONDS };
  }
  if (!s.airwayOpened) {
    return { text: 'Najpierw udrożnij drogi oddechowe', seconds: QUICK_SECONDS };
  }
  const note = p.appearsChild ? '' : ' (oddechy ratownicze nie są elementem algorytmu START)';
  const text = b.afterRescueBreaths
    ? `Po 5 oddechach ratowniczych pojawił się oddech własny${rateText(b)}`
    : 'Brak oddechu po 5 oddechach ratowniczych';
  return { text: text + note, patch: { rescueBreathsGiven: true } };
}

function commandsResult(v: Vitals): Outcome {
  if (v.obeysCommands) return { text: 'Wykonuje proste polecenia' };
  switch (v.avpu) {
    case 'A':
      return { text: 'Przytomny, ale splątany — nie wykonuje prostych poleceń' };
    case 'V':
      return { text: 'Reaguje na głos, ale nie wykonuje prostych poleceń' };
    default:
      return { text: 'Nie reaguje na głos ani na polecenia' };
  }
}

function avpuResult(v: Vitals): Outcome {
  switch (v.avpu) {
    case 'A':
      return { text: 'AVPU: A — przytomny' };
    case 'V':
      return { text: 'AVPU: V — reaguje na głos' };
    case 'P':
      return v.painResponseAppropriate
        ? { text: 'AVPU: P — reaguje na ból (adekwatnie: lokalizuje)' }
        : { text: 'AVPU: P — reaguje na ból nieadekwatnie (ułożenie wyprostne)' };
    case 'U':
      return { text: 'AVPU: U — nie reaguje' };
  }
}

function bleedingResult(p: ScenarioPatient, s: PatientExamState): Outcome {
  if (!p.majorBleeding) return { text: 'Brak masywnego krwotoku zewnętrznego', seconds: BLEEDING_LOOK_SECONDS };
  if (s.bleedingControlled) {
    return { text: 'Krwotok już zatamowany — opaska uciskowa założona', seconds: BLEEDING_RECHECK_SECONDS };
  }
  return { text: 'Krwotok zatamowany opaską uciskową', patch: { bleedingControlled: true } };
}

function outcome(p: ScenarioPatient, s: PatientExamState, action: ExamActionId): Outcome {
  const v = p.vitals;
  switch (action) {
    case 'breathing':
      return breathingResult(p, s);
    case 'airway':
      return airwayResult(p, s);
    case 'rescue-breaths':
      return rescueBreathsResult(p, s);
    case 'pulse':
      return {
        text: `${p.appearsChild ? 'Tętno obwodowe' : 'Tętno promieniowe'}: ${v.peripheralPulse ? 'wyczuwalne' : 'niewyczuwalne'}`,
      };
    case 'crt':
      return { text: `Nawrót kapilarny: ${num(v.crtSeconds)} s` };
    case 'commands':
      return commandsResult(v);
    case 'avpu':
      return avpuResult(v);
    case 'bleeding':
      return bleedingResult(p, s);
  }
}

/** Wykonuje czynność przy pacjencie. Czysta funkcja — nie modyfikuje `state`. */
export function performAction(
  p: ScenarioPatient,
  state: PatientExamState,
  action: ExamActionId,
): { state: PatientExamState; result: ExamResult } {
  const o = outcome(p, state, action);
  const result: ExamResult = { action, text: o.text, seconds: o.seconds ?? ACTION_SECONDS[action] };
  return { state: { ...state, ...o.patch, log: [...state.log, result] }, result };
}
