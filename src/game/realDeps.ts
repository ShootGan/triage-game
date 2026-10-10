import { ACTION_LABEL, ACTION_SECONDS, initialExamState, performAction } from '../engine/exam';
import { scoreGame } from '../engine/scoring';
import { createGameView } from '../render/GameView';
import { busScenario } from '../scenarios/bus';
import type { GameDeps } from './deps';

/** Prawdziwe moduły (3D, badanie, ocena, scenariusz). */
export const realDeps: GameDeps = {
  scenarios: [busScenario],
  createGameView,
  ACTION_LABEL,
  ACTION_SECONDS,
  initialExamState,
  performAction,
  scoreGame,
};
