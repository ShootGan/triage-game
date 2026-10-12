import { INFANT_SIGNIFICANT_INJURIES, triageJumpStart } from './jumpstart';
import { breathesAfterLsi, purposeful, respiratoryDistress, saltSortGroup, triageSalt, type SaltPatient } from './salt';
import { triageStart } from './start';
import type { Protocol, ProtocolMode, SaltInfo, TriageResult, Vitals } from './types';

export * from './types';
export { triageStart, triageJumpStart, triageSalt, saltSortGroup, breathesAfterLsi, purposeful, respiratoryDistress, INFANT_SIGNIFICANT_INJURIES };
export type { SaltPatient };

/** Który algorytm stosujemy: JumpSTART, gdy poszkodowany wygląda na dziecko. */
export function protocolFor(appearsChild: boolean): Protocol {
  return appearsChild ? 'JumpSTART' : 'START';
}

export function triage(v: Vitals, appearsChild: boolean): TriageResult {
  return protocolFor(appearsChild) === 'JumpSTART' ? triageJumpStart(v) : triageStart(v);
}

/** What any algorithm needs about a casualty (a ScenarioPatient fits). */
export interface TriagePatient {
  vitals: Vitals;
  appearsChild: boolean;
  ageYears: number;
  majorBleeding?: boolean;
  salt?: SaltInfo;
}

/** SALT facts with defaults: minor injuries only ⇔ GREEN in START/JumpSTART, unless the casualty says otherwise. */
export function saltPatient(p: TriagePatient): SaltPatient {
  const minorOnly = p.salt?.minorOnly ?? triage(p.vitals, p.appearsChild).category === 'green';
  return { appearsChild: p.appearsChild, ageYears: p.ageYears, majorBleeding: p.majorBleeding, salt: { ...p.salt, minorOnly } };
}

/** Algorithm of the game's protocol as a function of the vitals (the scoring tries other vitals with it). */
export function algorithmFor(mode: ProtocolMode, p: TriagePatient, protocol?: Protocol): (v: Vitals) => TriageResult {
  if (mode === 'SALT') {
    const sp = saltPatient(p);
    return v => triageSalt(v, sp);
  }
  return (protocol ?? protocolFor(p.appearsChild)) === 'JumpSTART' ? triageJumpStart : triageStart;
}

export function triageFor(mode: ProtocolMode, p: TriagePatient): TriageResult {
  return algorithmFor(mode, p)(p.vitals);
}
