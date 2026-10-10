// ATRAPY wszystkich zależności gry — ładowane wyłącznie przy `?stub` w adresie.
import type { GameDeps } from '../../game/deps';
import { ACTION_LABEL, ACTION_SECONDS, initialExamState, performAction } from './stubExam';
import { stubScenario } from './stubScenario';
import { scoreGame } from './stubScoring';
import { createStubGameView } from './stubView';

export const stubDeps: GameDeps = {
  scenarios: [stubScenario],
  createGameView: createStubGameView,
  ACTION_LABEL,
  ACTION_SECONDS,
  initialExamState,
  performAction,
  scoreGame,
  isStub: true,
};
