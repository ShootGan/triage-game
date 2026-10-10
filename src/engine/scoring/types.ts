import type { ExamActionId } from '../exam/types';
import type { DecisionStep, Protocol, TriageCategory } from '../triage';

export type Verdict = 'correct' | 'over' | 'under' | 'untagged';

export interface PatientDebrief {
  patientId: string;
  label: string;
  protocol: Protocol;
  expected: TriageCategory;
  given: TriageCategory | null;
  verdict: Verdict;
  /** Poprawna ścieżka algorytmu (z silnika triage). */
  steps: DecisionStep[];
  /** Czynności wykonane przez gracza (w kolejności). */
  actionsDone: ExamActionId[];
  /** Pominięte czynności ratujące życie, np. „Nie zatamowano masywnego krwotoku". */
  missedLifesaving: string[];
  /** Krótkie wyjaśnienie błędu po polsku (puste, gdy poprawnie). */
  explanation: string;
}

export interface GameScore {
  total: number;
  correct: number;
  over: number;
  under: number;
  untagged: number;
  accuracyPct: number;
  elapsedSec: number;
  avgSecPerPatient: number;
  patients: PatientDebrief[];
}
