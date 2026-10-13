import { describe, expect, it } from 'vitest';
import { initialExamState, performAction } from '../engine/exam';
import type { ExamActionId } from '../engine/exam/types';
import type { ScenarioPatient } from '../scenarios/types';
import { findingsSummary } from './findingsSummary';

const base: ScenarioPatient = {
  id: 'p',
  label: 'Pacjent',
  ageYears: 40,
  appearsChild: false,
  vitals: {
    canWalk: false,
    breathing: { spontaneous: true, afterAirway: true, rate: 18 },
    peripheralPulse: true,
    crtSeconds: 1.5,
    obeysCommands: true,
    avpu: 'A',
  },
  injuries: [],
  appearance: { sex: 'm', child: false, skin: '#f1c27d', hair: '#333333', hairStyle: 'short', shirt: '#336699', pants: '#222222' },
  pose: 'back',
  position: [0, 0],
  rotation: 0,
};

const examOf = (p: ScenarioPatient, actions: ExamActionId[]) =>
  actions.reduce((s, a) => performAction(p, s, a).state, initialExamState());

describe('findingsSummary', () => {
  it('keeps every finding, not just the latest result', () => {
    expect(findingsSummary(base, examOf(base, ['breathing', 'pulse', 'crt', 'commands']), 'START')).toEqual([
      'oddech 18/min',
      'tętno obecne',
      'CRT 1,5 s',
      'wykonuje polecenia',
    ]);
  });

  it('apnoea: shows what happened after opening the airway', () => {
    const p = { ...base, vitals: { ...base.vitals, avpu: 'U' as const, obeysCommands: false, breathing: { spontaneous: false, afterAirway: false, rate: 0 } } };
    expect(findingsSummary(p, examOf(p, ['breathing', 'airway']), 'START')).toEqual(['bezdech mimo udrożnienia']);
  });

  it('nothing done yet → nothing to show', () => {
    expect(findingsSummary(base, undefined, 'START')).toEqual([]);
  });
});

describe('findingsSummary — skąd wiadomo', () => {
  it('commands only: consciousness described, not shown as an AVPU score', () => {
    const p = { ...base, vitals: { ...base.vitals, obeysCommands: false, avpu: 'V' as const } };
    expect(findingsSummary(p, examOf(p, ['commands']), 'START')).toEqual(['nie wykonuje poleceń', 'reaguje na głos']);
  });

  it('a talking patient: breathing known from speech', () => {
    const p = { ...base, remark: '„Boli mnie noga!”' };
    expect(findingsSummary(p, examOf(p, ['pulse']), 'START')).toEqual(['mówi, więc oddycha', 'tętno obecne']);
  });
});
