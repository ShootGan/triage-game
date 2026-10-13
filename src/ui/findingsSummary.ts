import type { PatientExamState } from '../engine/exam/types';
import { knownFindings } from '../engine/scoring/findings';
import type { ProtocolMode } from '../engine/triage';
import type { ScenarioPatient } from '../scenarios/types';

const num = (n: number) => String(n).replace('.', ',');

/**
 * Everything established about a patient so far, as short phrases — so a small screen that shows only
 * the latest result still keeps the earlier ones (breathing, pulse, CRT, …) in view.
 */
export function findingsSummary(p: ScenarioPatient, exam: PatientExamState | undefined, mode: ProtocolMode): string[] {
  if (!exam?.log.length) return [];
  const actions = exam.log.map((r) => r.action);
  const f = knownFindings(p, actions, mode);
  const out: string[] = [];
  const rate = f.rate !== undefined ? ` ${f.rate}/min${f.irregular ? ', nieregularny' : ''}` : '';
  // Without a breathing check, spontaneous breathing is known only because the patient talks.
  if (f.spontaneous) out.push(rate ? `oddech${rate}` : 'mówi, więc oddycha');
  else if (f.spontaneous === false) {
    if (f.afterAirway) out.push(`oddycha po udrożnieniu${rate}`);
    else if (f.afterRescueBreaths) out.push(`oddycha po oddechach ratowniczych${rate}`);
    else if (f.afterRescueBreaths === false) out.push('bezdech mimo udrożnienia i oddechów ratowniczych');
    else if (f.afterAirway === false) out.push('bezdech mimo udrożnienia');
    else out.push('bezdech');
  }
  if (f.pulse !== undefined) out.push(f.pulse ? 'tętno obecne' : 'brak tętna');
  if (f.crtSeconds !== undefined) out.push(`CRT ${num(f.crtSeconds)} s`);
  if (f.obeys !== undefined) out.push(f.obeys ? 'wykonuje polecenia' : 'nie wykonuje poleceń');
  // Consciousness seen during the commands check (no AVPU done): describe it, don't label it as an AVPU score.
  if (f.avpu !== undefined && !actions.includes('avpu')) {
    if (f.avpu === 'V') out.push('reaguje na głos');
    else if (f.avpu === 'A') out.push(p.ageYears < 2 ? 'przytomne' : 'przytomny');
  } else if (f.avpu !== undefined) {
    const pain = f.avpu === 'P' && f.painAppropriate !== undefined ? (f.painAppropriate ? ' adekwatnie' : ' nieadekwatnie') : '';
    out.push(`AVPU ${f.avpu}${pain}`);
  }
  if (exam.bleedingControlled) out.push('staza założona');
  if (exam.decompressed) out.push('odma odbarczona');
  return out;
}
