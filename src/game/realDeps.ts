import { ACTION_LABEL, ACTION_SECONDS, initialExamState, performAction } from '../engine/exam';
import { scoreGame } from '../engine/scoring';
import { createGameView } from '../render/GameView';
import { busScenario } from '../scenarios/bus';
import { busesScenario } from '../scenarios/buses';
import { parseCode, patientCountRange, randomCode, scenarioFromCode, templateCode } from '../scenarios/generator';
import { concertScenario } from '../scenarios/concert';
import { festivalScenario } from '../scenarios/festival';
import { pileupScenario } from '../scenarios/pileup';
import { tenementScenario } from '../scenarios/tenement';
import type { GameDeps } from './deps';

/** Prawdziwe moduły (3D, badanie, ocena, scenariusze). */
export const realDeps: GameDeps = {
  scenarios: [busScenario, pileupScenario, tenementScenario, concertScenario, festivalScenario, { ...busesScenario, special: true }],
  codes: { randomCode, templateCode, parseCode, scenarioFromCode, patientCountRange },
  createGameView,
  ACTION_LABEL,
  ACTION_SECONDS,
  initialExamState,
  performAction,
  scoreGame,
};
