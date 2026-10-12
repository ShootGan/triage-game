// ATRAPA (tylko tryb ?stub) — uproszczona ocena oparta na prawdziwym silniku triage
// (tylko kolor; bez werdyktu 'procedure' i bez momentu oznaczenia).
import type { PatientExamState } from '../../engine/exam/types';
import type { GameScore, PatientDebrief, Verdict } from '../../engine/scoring/types';
import { CATEGORY_LABEL, triage, type TriageCategory } from '../../engine/triage';
import type { ScenarioPatient } from '../../scenarios/types';

const RANK: Record<TriageCategory, number> = { green: 0, yellow: 1, red: 2, grey: -0.5, black: -1 };

export function scoreGame(
  patients: ScenarioPatient[],
  tags: Record<string, TriageCategory | undefined>,
  exams: Record<string, PatientExamState | undefined>,
  elapsedSec: number,
): GameScore {
  const list: PatientDebrief[] = patients.map((p) => {
    const r = triage(p.vitals, p.appearsChild);
    const given = tags[p.id] ?? null;
    let verdict: Verdict;
    if (!given) verdict = 'untagged';
    else if (given === r.category) verdict = 'correct';
    else verdict = RANK[given] > RANK[r.category] ? 'over' : 'under';
    const exam = exams[p.id];
    const missed: string[] = [];
    if (p.majorBleeding && !exam?.bleedingControlled) missed.push('Nie zatamowano masywnego krwotoku');
    return {
      patientId: p.id,
      label: p.label,
      protocol: r.protocol,
      expected: r.category,
      given,
      verdict,
      steps: r.steps,
      actionsDone: exam?.log.map((l) => l.action) ?? [],
      missedLifesaving: missed,
      explanation:
        verdict === 'correct' ? '' : `(atrapa) Oczekiwano: ${CATEGORY_LABEL[r.category]}.`,
    };
  });
  const count = (v: Verdict) => list.filter((d) => d.verdict === v).length;
  const tagged = list.length - count('untagged');
  return {
    total: list.length,
    correct: count('correct'),
    procedure: count('procedure'),
    over: count('over'),
    under: count('under'),
    untagged: count('untagged'),
    accuracyPct: list.length ? (count('correct') / list.length) * 100 : 0,
    elapsedSec,
    avgSecPerPatient: tagged ? elapsedSec / tagged : 0,
    patients: list,
  };
}
