import type { ScenarioPatient } from '../../scenarios/types';
import { initialExamState, performAction } from '../exam';
import type { ExamActionId, PatientExamState } from '../exam/types';
import type { Avpu, TriageCategory, TriageResult, Vitals } from '../triage';

/**
 * What the player has established about a patient before tagging. Unset field = unknown.
 * Walking and the infant's visible injuries are always known (seen without any action).
 */
export interface Findings {
  spontaneous?: boolean;
  afterAirway?: boolean;
  afterRescueBreaths?: boolean;
  /** Rate and regularity are learned together. */
  rate?: number;
  irregular?: boolean;
  pulse?: boolean;
  crtSeconds?: number;
  obeys?: boolean;
  avpu?: Avpu;
  painAppropriate?: boolean;
}

/** Findings revealed by one action, given the exam state before it. */
function reveal(p: ScenarioPatient, s: PatientExamState, action: ExamActionId, f: Findings): void {
  const v = p.vitals;
  const b = v.breathing;
  const rate = () => {
    f.rate = b.rate;
    f.irregular = !!b.irregular;
  };
  switch (action) {
    case 'breathing':
      if (b.spontaneous) {
        f.spontaneous = true;
        rate();
        return;
      }
      f.spontaneous = false;
      if (!s.airwayOpened) return;
      f.afterAirway = b.afterAirway;
      if (b.afterAirway) return rate();
      if (s.rescueBreathsGiven) {
        f.afterRescueBreaths = !!b.afterRescueBreaths;
        if (b.afterRescueBreaths) rate();
      }
      return;
    case 'airway':
      // A patent airway in a breathing patient says nothing new; in apnoea the result shows whether breathing returns.
      if (b.spontaneous) return;
      f.spontaneous = false;
      f.afterAirway = b.afterAirway;
      if (b.afterAirway) rate();
      else if (s.airwayOpened && s.rescueBreathsGiven) {
        f.afterRescueBreaths = !!b.afterRescueBreaths;
        if (b.afterRescueBreaths) rate();
      }
      return;
    case 'rescue-breaths':
      if (b.spontaneous) {
        f.spontaneous = true;
        return;
      }
      if (!s.airwayOpened) return; // no effect before opening the airway
      f.spontaneous = false;
      f.afterAirway = b.afterAirway;
      if (b.afterAirway) return rate();
      f.afterRescueBreaths = !!b.afterRescueBreaths;
      if (b.afterRescueBreaths) rate();
      return;
    case 'pulse':
      f.pulse = v.peripheralPulse;
      return;
    case 'crt':
      // Cold skin falsely prolongs CRT for everyone — the reading proves nothing.
      if (!p.cold) f.crtSeconds = v.crtSeconds;
      return;
    case 'commands':
      // Infant: too young for commands — only shows it is alert.
      if (p.ageYears < 2 && v.avpu === 'A') {
        f.avpu = 'A';
        return;
      }
      f.obeys = v.obeysCommands;
      if (!v.obeysCommands && (v.avpu === 'A' || v.avpu === 'V')) f.avpu = v.avpu;
      return;
    case 'avpu':
      f.avpu = v.avpu;
      if (v.avpu === 'P') f.painAppropriate = !!v.painResponseAppropriate;
      return;
    case 'bleeding':
      return;
  }
}

/** Findings from the actions logged before the tag (replayed in order, each with the state it was done in). */
export function knownFindings(p: ScenarioPatient, actionsBefore: ExamActionId[]): Findings {
  const f: Findings = {};
  // A patient who speaks (remark with a quote, as the exam panel shows it) is visibly breathing.
  if (p.remark && /[„"“”]/.test(p.remark) && p.vitals.breathing.spontaneous) f.spontaneous = true;
  let s = initialExamState();
  for (const a of actionsBefore) {
    reveal(p, s, a, f);
    s = performAction(p, s, a).state;
  }
  return f;
}

const opts = <T>(known: T | undefined, domain: readonly T[]): readonly T[] => (known === undefined ? domain : [known]);

/** Rate classes covering every START / JumpSTART threshold. */
const RATES: readonly { rate: number; irregular: boolean }[] = [
  { rate: 10, irregular: false },
  { rate: 20, irregular: false },
  { rate: 20, irregular: true },
  { rate: 34, irregular: false },
  { rate: 50, irregular: false },
];
const AVPU: readonly { avpu: Avpu; pain?: boolean }[] = [
  { avpu: 'A' },
  { avpu: 'V' },
  { avpu: 'P', pain: true },
  { avpu: 'P', pain: false },
  { avpu: 'U' },
];

/**
 * Every patient state consistent with the findings (always including the true one). Unknown fields
 * range over small domains that cover all algorithm thresholds; implausible combinations are pruned
 * (someone who isn't breathing is unresponsive; someone who obeys commands is A or V).
 */
export function candidateVitals(truth: Vitals, f: Findings): Vitals[] {
  const out: Vitals[] = [truth];
  for (const spontaneous of opts(f.spontaneous, [true, false])) {
    const airwayOpts = spontaneous ? [true] : opts(f.afterAirway, [true, false]);
    for (const afterAirway of airwayOpts) {
      const rescueOpts = spontaneous || afterAirway ? [false] : opts(f.afterRescueBreaths, [true, false]);
      for (const afterRescueBreaths of rescueOpts) {
        const breathes = spontaneous || afterAirway || afterRescueBreaths;
        const rates = !breathes ? [{ rate: 0, irregular: false }] : f.rate === undefined ? RATES : [{ rate: f.rate, irregular: !!f.irregular }];
        // START perfusion: a radial pulse OR CRT ≤ 2 s each shows adequate perfusion (1996 revision),
        // so one normal finding settles the step without the other.
        const pulseOpts = f.pulse === undefined && f.crtSeconds !== undefined && f.crtSeconds <= 2 ? [true] : opts(f.pulse, [true, false]);
        const crtOpts = f.crtSeconds === undefined && f.pulse === true ? [1] : opts(f.crtSeconds, [1, 3]);
        for (const r of rates)
          for (const peripheralPulse of pulseOpts)
            for (const crtSeconds of crtOpts)
              for (const obeysCommands of opts(f.obeys, [true, false]))
                for (const a of AVPU) {
                  if (f.avpu !== undefined && a.avpu !== f.avpu) continue;
                  if (f.painAppropriate !== undefined && a.avpu === 'P' && a.pain !== f.painAppropriate) continue;
                  if (!spontaneous && (a.avpu !== 'U' || obeysCommands)) continue;
                  if (obeysCommands && a.avpu !== 'A' && a.avpu !== 'V') continue;
                  out.push({
                    ...truth,
                    breathing: { spontaneous, afterAirway, afterRescueBreaths, rate: r.rate, irregular: r.irregular },
                    peripheralPulse,
                    crtSeconds,
                    obeysCommands,
                    avpu: a.avpu,
                    painResponseAppropriate: a.avpu === 'P' ? (f.painAppropriate ?? a.pain) : truth.painResponseAppropriate,
                  });
                }
      }
    }
  }
  return out;
}

/**
 * Whether the findings settle the category: every consistent patient state gives `category` under
 * the given algorithm. Order of assessment doesn't matter — only what was established.
 */
export function isDetermined(
  algorithm: (v: Vitals) => TriageResult,
  truth: Vitals,
  f: Findings,
  category: TriageCategory,
): boolean {
  return candidateVitals(truth, f).every(v => algorithm(v).category === category);
}
