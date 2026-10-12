import type { DecisionStep, SaltInfo, TriageCategory, TriageResult, Vitals } from './types';

/** What SALT needs about a casualty besides the vitals. */
export interface SaltPatient {
  appearsChild: boolean;
  ageYears: number;
  majorBleeding?: boolean;
  /** Already resolved (see `saltInfo`): no field left undefined that matters. */
  salt: Required<Pick<SaltInfo, 'minorOnly'>> & SaltInfo;
}

/** Breathing after the life-saving interventions (airway; in a child also 2 rescue breaths). */
export function breathesAfterLsi(v: Vitals, child: boolean): boolean {
  const b = v.breathing;
  return b.spontaneous || b.afterAirway || (child && !!b.afterRescueBreaths);
}

/**
 * Respiratory distress (SALT has no rate thresholds — this is the game's reading of the vitals):
 * adult > 30 or < 10/min, child < 15 or > 45/min or irregular.
 */
export function respiratoryDistress(v: Vitals, child: boolean): boolean {
  const { rate, irregular } = v.breathing;
  return child ? rate < 15 || rate > 45 || !!irregular : rate > 30 || rate < 10;
}

/**
 * "Obeys commands or makes purposeful movements": under 3 years (too young for commands) a purposeful
 * reaction counts — alert, responds to voice, or localises pain; otherwise obeying commands.
 */
export function purposeful(v: Vitals, ageYears: number): boolean {
  if (ageYears < 3) return v.avpu === 'A' || v.avpu === 'V' || (v.avpu === 'P' && !!v.painResponseAppropriate);
  return v.obeysCommands;
}

const yesNo = (b: boolean) => (b ? 'tak' : 'nie');

/** SALT global sort: 3 = walks (assessed last), 2 = waves / moves purposefully, 1 = still or obvious life threat (first). */
export function saltSortGroup(p: { vitals: Vitals; ageYears: number }): 1 | 2 | 3 {
  if (p.vitals.canWalk) return 3;
  return purposeful(p.vitals, p.ageYears) && p.vitals.breathing.spontaneous ? 2 : 1;
}

/** SALT — one algorithm for children and adults (Lerner et al. 2008, MUCC). */
export function triageSalt(v: Vitals, p: SaltPatient): TriageResult {
  const steps: DecisionStep[] = [];
  const done = (category: TriageCategory): TriageResult => {
    steps[steps.length - 1].result = category;
    return { protocol: 'SALT', category, steps };
  };
  const child = p.appearsChild;
  const b = v.breathing;

  const lsi: string[] = [];
  if (p.majorBleeding) lsi.push('opaska uciskowa');
  if (!b.spontaneous) lsi.push(child && !b.afterAirway ? 'udrożnienie dróg oddechowych, 2 oddechy ratownicze' : 'udrożnienie dróg oddechowych');
  if (p.salt.tensionPneumothorax) lsi.push('odbarczenie odmy');
  steps.push({ id: 'lsi', question: 'Czynności ratujące życie?', answer: lsi.length ? lsi.join(', ') : 'nie są potrzebne' });

  const breathes = breathesAfterLsi(v, child);
  steps.push({
    id: 'salt-breathing',
    question: child ? 'Oddycha (po udrożnieniu i 2 oddechach ratowniczych)?' : 'Oddycha (po udrożnieniu dróg oddechowych)?',
    answer: yesNo(breathes),
  });
  if (!breathes) return done('black');

  const moves = purposeful(v, p.ageYears);
  const pulse = v.peripheralPulse;
  const distress = respiratoryDistress(v, child);
  // Every massive bleed in the game can be controlled with a tourniquet (an LSI above).
  const ok = moves && pulse && !distress;
  steps.push({
    id: 'salt-criteria',
    question: 'Wykonuje polecenia lub celowe ruchy, tętno obwodowe, bez duszności, krwotok opanowany?',
    answer: `polecenia/celowe ruchy: ${yesNo(moves)}, tętno: ${yesNo(pulse)}, duszność: ${yesNo(distress)}${p.majorBleeding ? ', krwotok: opanowany opaską' : ''} — ${ok ? 'wszystkie tak' : 'nie'}`,
  });
  if (ok) {
    steps.push({ id: 'salt-minor', question: 'Tylko drobne obrażenia?', answer: yesNo(p.salt.minorOnly) });
    return done(p.salt.minorOnly ? 'green' : 'yellow');
  }
  const survives = !p.salt.expectant;
  steps.push({ id: 'salt-survive', question: 'Prawdopodobnie przeżyje przy dostępnych siłach i środkach?', answer: yesNo(survives) });
  return done(survives ? 'red' : 'grey');
}
