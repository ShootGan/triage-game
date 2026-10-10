import type { DecisionStep, TriageCategory, TriageResult, Vitals } from './types';

/** JumpSTART — dzieci (ok. 1–8 lat lub „wygląda na dziecko"). */
export function triageJumpStart(v: Vitals): TriageResult {
  const steps: DecisionStep[] = [];
  const done = (category: TriageCategory): TriageResult => {
    steps[steps.length - 1].result = category;
    return { protocol: 'JumpSTART', category, steps };
  };

  const infant = !v.canWalk && !!v.nonAmbulatoryByAge;
  steps.push({
    id: 'walk',
    question: 'Czy chodzi?',
    answer: v.canWalk ? 'Tak' : infant ? 'Nie — z powodu wieku (pełna ocena)' : 'Nie',
  });
  if (v.canWalk) return done('green');

  steps.push({ id: 'breathing', question: 'Czy oddycha?', answer: v.breathing.spontaneous ? 'Tak' : 'Nie' });
  if (!v.breathing.spontaneous) {
    steps.push({
      id: 'airway',
      question: 'Czy oddycha po udrożnieniu dróg oddechowych?',
      answer: v.breathing.afterAirway ? 'Tak' : 'Nie',
    });
    if (v.breathing.afterAirway) return done('red');

    steps.push({ id: 'apneic-pulse', question: 'Czy jest wyczuwalne tętno obwodowe?', answer: v.peripheralPulse ? 'Tak' : 'Nie' });
    if (!v.peripheralPulse) return done('black');

    const resumed = !!v.breathing.afterRescueBreaths;
    steps.push({ id: 'rescue-breaths', question: 'Czy oddycha po 5 oddechach ratowniczych?', answer: resumed ? 'Tak' : 'Nie' });
    return done(resumed ? 'red' : 'black');
  }

  const rate = v.breathing.rate;
  const abnormal = rate < 15 || rate > 45 || !!v.breathing.irregular;
  steps.push({
    id: 'resp-rate',
    question: 'Oddechy < 15 lub > 45/min albo nieregularne?',
    answer: `${rate}/min${v.breathing.irregular ? ', nieregularne' : ''} — ${abnormal ? 'tak' : 'nie'}`,
  });
  if (abnormal) return done('red');

  steps.push({ id: 'perfusion', question: 'Czy jest wyczuwalne tętno obwodowe?', answer: v.peripheralPulse ? 'Tak' : 'Nie' });
  if (!v.peripheralPulse) return done('red');

  const inappropriate = v.avpu === 'U' || (v.avpu === 'P' && !v.painResponseAppropriate);
  steps.push({
    id: 'mental',
    question: 'AVPU: „P" z nieadekwatną reakcją lub „U"?',
    answer: `${v.avpu}${v.avpu === 'P' ? (v.painResponseAppropriate ? ' (adekwatna)' : ' (nieadekwatna)') : ''} — ${inappropriate ? 'tak' : 'nie'}`,
  });
  if (inappropriate) return done('red');

  if (infant) {
    const injured = !!v.significantExternalInjury;
    steps.push({ id: 'infant-injury', question: 'Istotne obrażenia zewnętrzne?', answer: injured ? 'Tak' : 'Nie' });
    return done(injured ? 'yellow' : 'green');
  }
  return done('yellow');
}
