import type { ScenarioPatient } from '../../scenarios/types';
import { respiratoryDistress, type ProtocolMode, type Vitals } from '../triage';
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
  decompression: 'Odbarcz odmę (igła)',
};

/** Action labels that differ in SALT. */
export function actionLabel(action: ExamActionId, mode: ProtocolMode = 'START'): string {
  if (mode === 'SALT' && action === 'rescue-breaths') return '2 oddechy ratownicze';
  return ACTION_LABEL[action];
}

/** Actions offered in each protocol: SALT has no CRT/AVPU but adds needle decompression. */
export function actionsFor(mode: ProtocolMode): ExamActionId[] {
  return mode === 'SALT'
    ? ['breathing', 'airway', 'rescue-breaths', 'pulse', 'commands', 'bleeding', 'decompression']
    : ['breathing', 'airway', 'rescue-breaths', 'pulse', 'crt', 'commands', 'avpu', 'bleeding'];
}

/** Pulse button/result label: radial for adults (START), peripheral for children, brachial for infants. */
export function pulseLabel(appearsChild: boolean, ageYears: number): string {
  if (!appearsChild) return 'Tętno promieniowe';
  return ageYears < 1 ? 'Tętno obwodowe (ramienne)' : 'Tętno obwodowe';
}

/** Koszt czynności w sekundach czasu gry (pełne wykonanie). */
export const ACTION_SECONDS: Record<ExamActionId, number> = {
  breathing: 10,
  airway: 5,
  'rescue-breaths': 15,
  pulse: 5,
  crt: 3,
  commands: 5,
  avpu: 5,
  bleeding: 10,
  decompression: 10,
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

/** SALT reads breathing as "respiratory distress", not as a rate threshold. */
function distressText(p: ScenarioPatient, mode: ProtocolMode): string {
  if (mode !== 'SALT') return '';
  const fast = respiratoryDistress(p.vitals, p.appearsChild);
  const distress = p.salt?.distress ?? fast;
  if (fast && !distress) return ' — szybko, ale mówi pełnymi zdaniami, bez cech duszności';
  return distress ? ' — duszność' : ' — bez duszności';
}

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

function rescueBreathsResult(p: ScenarioPatient, s: PatientExamState, mode: ProtocolMode): Outcome {
  const b = p.vitals.breathing;
  if (b.spontaneous || (s.airwayOpened && b.afterAirway)) {
    return { text: 'Pacjent oddycha samodzielnie — oddechy ratownicze nie są wskazane', seconds: QUICK_SECONDS };
  }
  if (!s.airwayOpened) {
    return { text: 'Najpierw udrożnij drogi oddechowe', seconds: QUICK_SECONDS };
  }
  const salt = mode === 'SALT';
  const n = salt ? 2 : 5;
  const note = p.appearsChild ? '' : ` (oddechy ratownicze nie są elementem algorytmu ${salt ? 'SALT u dorosłych' : 'START'})`;
  const text = b.afterRescueBreaths
    ? `Po ${n} oddechach ratowniczych pojawił się oddech własny${rateText(b)}`
    : `Brak oddechu po ${n} oddechach ratowniczych`;
  return { text: text + note, patch: { rescueBreathsGiven: true } };
}

/** SALT, under 3 years: no commands — the rescuer looks for purposeful movement instead. */
function purposefulResult(p: ScenarioPatient): Outcome {
  const v = p.vitals;
  if (v.avpu === 'A') return { text: 'Za małe na polecenia — celowe ruchy: wodzi wzrokiem, sięga rączkami' };
  if (v.avpu === 'V') return { text: 'Za małe na polecenia — celowe ruchy: reaguje na głos, odwraca głowę' };
  if (v.avpu === 'P' && v.painResponseAppropriate) return { text: 'Za małe na polecenia — celowe ruchy: odsuwa bodziec bólowy' };
  return { text: 'Za małe na polecenia — brak celowych ruchów' };
}

function commandsResult(p: ScenarioPatient): Outcome {
  const v = p.vitals;
  // Niemowlę / małe dziecko nie wykonuje poleceń z powodu wieku — to nie jest objaw.
  if (p.ageYears < 2 && v.avpu === 'A') {
    return { text: 'Niemowlę — za małe na polecenia; przytomne, wodzi wzrokiem (oceń AVPU)' };
  }
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
        ? { text: 'AVPU: P — reaguje na ból adekwatnie (lokalizuje / odsuwa bodziec)' }
        : { text: 'AVPU: P — reakcja na ból nieadekwatna (jęk, ruchy bezcelowe, ułożenie zgięciowe lub wyprostne)' };
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

function decompressionResult(p: ScenarioPatient, s: PatientExamState): Outcome {
  if (!p.salt?.tensionPneumothorax) return { text: 'Brak objawów odmy prężnej — odbarczenie niewskazane', seconds: QUICK_SECONDS };
  if (s.decompressed) return { text: 'Odma już odbarczona', seconds: QUICK_SECONDS };
  return { text: 'Odbarczono odmę igłą — syk powietrza, oddech nieco lżejszy', patch: { decompressed: true } };
}

function outcome(p: ScenarioPatient, s: PatientExamState, action: ExamActionId, mode: ProtocolMode): Outcome {
  const v = p.vitals;
  switch (action) {
    case 'breathing': {
      const o = breathingResult(p, s);
      return isBreathingNow(p, s) ? { ...o, text: o.text + distressText(p, mode) } : o;
    }
    case 'airway':
      return airwayResult(p, s);
    case 'rescue-breaths':
      return rescueBreathsResult(p, s, mode);
    case 'pulse': {
      // Pulse is checked on an uninjured limb — a bleeding limb could hide a pulse (Romig).
      const site = p.majorBleeding ? ' (na kończynie bez urazu)' : '';
      return {
        text: `${pulseLabel(p.appearsChild, p.ageYears)}${site}: ${v.peripheralPulse ? 'wyczuwalne' : 'niewyczuwalne'}`,
      };
    }
    case 'crt': {
      const b = v.breathing;
      const dead = !b.spontaneous && !b.afterAirway && !b.afterRescueBreaths && !v.peripheralPulse;
      if (dead) return { text: 'Nawrót kapilarny: brak — nieoznaczalny' };
      // Cold skin: falsely prolonged for everyone (deliberately no hint — the debrief explains it).
      if (p.cold) return { text: `Nawrót kapilarny: ${num(Math.max(v.crtSeconds, 3 + (p.id.length % 3) * 0.5))} s` };
      // Ages 9–12 may be triaged with START too, where CRT does count.
      const note = p.appearsChild && p.ageYears < 9 ? ' (JumpSTART nie używa CRT — rozstrzyga tętno obwodowe)' : '';
      return { text: `Nawrót kapilarny: ${num(v.crtSeconds)} s${note}` };
    }
    case 'commands':
      return mode === 'SALT' && p.ageYears < 3 ? purposefulResult(p) : commandsResult(p);
    case 'avpu':
      return avpuResult(v);
    case 'bleeding':
      return bleedingResult(p, s);
    case 'decompression':
      return decompressionResult(p, s);
  }
}

/** Wykonuje czynność przy pacjencie. Czysta funkcja — nie modyfikuje `state`. */
export function performAction(
  p: ScenarioPatient,
  state: PatientExamState,
  action: ExamActionId,
  mode: ProtocolMode = 'START',
): { state: PatientExamState; result: ExamResult } {
  const o = outcome(p, state, action, mode);
  const result: ExamResult = { action, text: o.text, seconds: o.seconds ?? ACTION_SECONDS[action] };
  return { state: { ...state, ...o.patch, log: [...state.log, result] }, result };
}
