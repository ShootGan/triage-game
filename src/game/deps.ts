import type { ExamActionId, ExamResult, PatientExamState } from '../engine/exam/types';
import type { GameScore } from '../engine/scoring/types';
import type { TriageCategory } from '../engine/triage';
import type { GameViewFactory } from '../render/types';
import type { Scenario, ScenarioPatient } from '../scenarios/types';

/**
 * Zależności gry wstrzykiwane przy starcie aplikacji.
 * Produkcyjnie: src/game/realDeps.ts (prawdziwe moduły innych warstw).
 * Tryb deweloperski `?stub`: src/ui/dev/stubDeps.ts.
 */
export interface GameDeps {
  scenarios: Scenario[];
  createGameView: GameViewFactory;
  ACTION_LABEL: Record<ExamActionId, string>;
  ACTION_SECONDS: Record<ExamActionId, number>;
  initialExamState: () => PatientExamState;
  performAction: (
    p: ScenarioPatient,
    state: PatientExamState,
    action: ExamActionId,
  ) => { state: PatientExamState; result: ExamResult };
  scoreGame: (
    patients: ScenarioPatient[],
    tags: Record<string, TriageCategory | undefined>,
    exams: Record<string, PatientExamState | undefined>,
    elapsedSec: number,
  ) => GameScore;
  /** Oznaczenie trybu stub (pokazywane w UI). */
  isStub?: boolean;
}

let current: GameDeps | null = null;

export function setDeps(d: GameDeps): void {
  current = d;
}

export function getDeps(): GameDeps {
  if (!current) throw new Error('GameDeps nie zostały zainicjalizowane (setDeps).');
  return current;
}
