import { describe, expect, it } from 'vitest';
import { busScenario } from './bus';
import { scenarioIssues } from './validate';

describe('walidator scenariuszy', () => {
  it('scenariusz autobusu jest poprawny', () => {
    expect(scenarioIssues(busScenario)).toEqual([]);
  });

  it('wykrywa kolizje i niespójności', () => {
    const p = busScenario.patients[0];
    const broken = {
      ...busScenario,
      patients: [
        { ...p, id: 'x1', position: [0, 0] as [number, number] },
        { ...p, id: 'x1', position: [0.5, 0] as [number, number], vitals: { ...p.vitals, obeysCommands: true, avpu: 'V' as const } },
      ],
    };
    const issues = scenarioIssues(broken);
    expect(issues.some((i) => i.includes('powtórzony id'))).toBe(true);
    expect(issues.some((i) => i.includes('za blisko'))).toBe(true);
    expect(issues.some((i) => i.includes('AVPU ≠ A'))).toBe(true);
  });
});
