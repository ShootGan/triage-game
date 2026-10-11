import type { ExamActionId } from '../exam/types';
import type { DecisionStep, Protocol, TriageCategory } from '../triage';

/**
 * - `correct`   — właściwy kolor i wymagane kroki algorytmu wykonane przed oznaczeniem;
 * - `procedure` — kolor właściwy, ale przed oznaczeniem pominięto krok algorytmu, który mógł
 *                 zmienić kategorię (np. CZARNY bez udrożnienia dróg oddechowych) — liczony jako błąd;
 *                 also a correct colour without the assessment that decides it, or with major
 *                 bleeding left uncontrolled;
 * - `over` / `under` — kolor zawyżony / zaniżony;
 * - `untagged`  — brak opaski.
 */
export type Verdict = 'correct' | 'procedure' | 'over' | 'under' | 'untagged';

/** Moment nadania (ostatniej) opaski względem czynności z dziennika badania. */
export interface TagEvent {
  category: TriageCategory;
  /** Liczba wpisów w `PatientExamState.log` w chwili oznaczenia — czynności o indeksie < logIndex poprzedzały opaskę. */
  logIndex: number;
}

export interface PatientDebrief {
  patientId: string;
  label: string;
  protocol: Protocol;
  expected: TriageCategory;
  given: TriageCategory | null;
  verdict: Verdict;
  /** BLACK given to a patient with a chance of survival. Optional for compatibility with mock scores. */
  critical?: boolean;
  /** Poprawna ścieżka algorytmu (z silnika triage). */
  steps: DecisionStep[];
  /** Ages 9–12: the other algorithm's result, also accepted (only when its colour differs). */
  alternative?: { protocol: Protocol; expected: TriageCategory; steps: DecisionStep[] };
  /** Czynności wykonane przez gracza (w kolejności). */
  actionsDone: ExamActionId[];
  /**
   * Ile czynności z `actionsDone` wykonano przed (ostatnim) oznaczeniem; null, gdy pacjenta nie oznaczono.
   * Opcjonalne dla zgodności z atrapami ocen.
   */
  actionsBeforeTag?: number | null;
  /** Pominięte czynności ratujące życie, np. „Nie zatamowano masywnego krwotoku". */
  missedLifesaving: string[];
  /** Teaching notes that are not errors (e.g. pregnancy, infant injury criteria). */
  notes?: string[];
  /** Krótkie wyjaśnienie błędu po polsku (puste, gdy poprawnie). */
  explanation: string;
}

export interface GameScore {
  total: number;
  correct: number;
  /** Kolor poprawny, niepełna procedura (liczone jako błąd). */
  procedure: number;
  /** Critical errors: BLACK for a patient with a chance of survival (also counted in `under`). */
  critical?: number;
  over: number;
  under: number;
  untagged: number;
  accuracyPct: number;
  elapsedSec: number;
  avgSecPerPatient: number;
  patients: PatientDebrief[];
}
