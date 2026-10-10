import type { DecisionStep, TriageCategory, TriageResult, Vitals } from './types';

/** START — dorośli. */
export function triageStart(v: Vitals): TriageResult {
  const steps: DecisionStep[] = [];
  const done = (category: TriageCategory): TriageResult => {
    steps[steps.length - 1].result = category;
    return { protocol: 'START', category, steps };
  };

  steps.push({ id: 'walk', question: 'Czy chodzi?', answer: v.canWalk ? 'Tak' : 'Nie' });
  if (v.canWalk) return done('green');

  steps.push({ id: 'breathing', question: 'Czy oddycha?', answer: v.breathing.spontaneous ? 'Tak' : 'Nie' });
  if (!v.breathing.spontaneous) {
    steps.push({
      id: 'airway',
      question: 'Czy oddycha po udrożnieniu dróg oddechowych?',
      answer: v.breathing.afterAirway ? 'Tak' : 'Nie',
    });
    return done(v.breathing.afterAirway ? 'red' : 'black');
  }

  const fast = v.breathing.rate > 30;
  steps.push({ id: 'resp-rate', question: 'Oddechy > 30/min?', answer: `${v.breathing.rate}/min — ${fast ? 'tak' : 'nie'}` });
  if (fast) return done('red');

  const poorPerfusion = !v.peripheralPulse || v.crtSeconds > 2;
  steps.push({
    id: 'perfusion',
    question: 'Brak tętna promieniowego lub nawrót kapilarny > 2 s?',
    answer: `tętno ${v.peripheralPulse ? 'wyczuwalne' : 'niewyczuwalne'}, CRT ${v.crtSeconds} s — ${poorPerfusion ? 'tak' : 'nie'}`,
  });
  if (poorPerfusion) return done('red');

  steps.push({ id: 'mental', question: 'Czy wykonuje proste polecenia?', answer: v.obeysCommands ? 'Tak' : 'Nie' });
  return done(v.obeysCommands ? 'yellow' : 'red');
}
