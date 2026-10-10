import { triageJumpStart } from './jumpstart';
import { triageStart } from './start';
import type { Protocol, TriageResult, Vitals } from './types';

export * from './types';
export { triageStart, triageJumpStart };

/** Który algorytm stosujemy: JumpSTART, gdy poszkodowany wygląda na dziecko. */
export function protocolFor(appearsChild: boolean): Protocol {
  return appearsChild ? 'JumpSTART' : 'START';
}

export function triage(v: Vitals, appearsChild: boolean): TriageResult {
  return protocolFor(appearsChild) === 'JumpSTART' ? triageJumpStart(v) : triageStart(v);
}
