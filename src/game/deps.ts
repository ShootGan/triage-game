import type { ExamActionId, ExamResult, PatientExamState } from '../engine/exam/types';
import type { GameScore, TagEvent } from '../engine/scoring/types';
import type { TriageCategory } from '../engine/triage';
import type { GameViewFactory } from '../render/types';
import type { Scenario, ScenarioPatient } from '../scenarios/types';

/** Kody zadań i losowanie zestawów poszkodowanych (src/scenarios/generator). */
export interface ScenarioCodes {
  /** Nowy losowy kod dla scenariusza, np. „KAMIENICA-4F7K". */
  randomCode(scenarioId: string): string;
  /** Kod ręcznego wzorca, np. „KAMIENICA-WZOR". */
  templateCode(scenarioId: string): string;
  /** Odczyt kodu wpisanego przez gracza (wielkość liter, spacje, brak myślnika — tolerowane). */
  parseCode(input: string): { scenarioId: string; code: string } | { error: string };
  /** Scenariusz z kodu (deterministyczny) albo komunikat błędu po polsku. */
  scenarioFromCode(input: string): Scenario | { error: string };
  /** Widełki liczby poszkodowanych w losowaniu (do opisu w menu). */
  patientCountRange(scenarioId: string): [number, number] | null;
}

/**
 * Zależności gry wstrzykiwane przy starcie aplikacji.
 * Produkcyjnie: src/game/realDeps.ts (prawdziwe moduły innych warstw).
 * Tryb deweloperski `?stub`: src/ui/dev/stubDeps.ts.
 */
export interface GameDeps {
  /** Scenariusze bazowe (wzorce) — tytuły, limity, kolejność w menu. */
  scenarios: Scenario[];
  codes: ScenarioCodes;
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
    /** Moment ostatniego oznaczenia (indeks w dzienniku badania) — do oceny procedury przed opaską. */
    tagEvents?: Record<string, TagEvent | undefined>,
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
