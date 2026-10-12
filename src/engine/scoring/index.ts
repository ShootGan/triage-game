import type { ScenarioPatient } from '../../scenarios/types';
import { breathingSigns, inDistress, initialExamState, performAction } from '../exam';
import type { ExamActionId, PatientExamState } from '../exam/types';
import {
  CATEGORY_LABEL,
  INFANT_SIGNIFICANT_INJURIES,
  algorithmFor,
  purposeful,
  respiratoryDistress,
  saltSortGroup,
  triage,
  triageFor,
  type DecisionStep,
  type Protocol,
  type ProtocolMode,
  type TriageCategory,
  type TriageResult,
  type Vitals,
} from '../triage';
import { isDetermined, knownFindings } from './findings';
import { POINTS } from './points';
import type { GameScore, PatientDebrief, SortInput, TagEvent, Verdict } from './types';

export type * from './types';
export { POINTS };

/** Priority of care: BLACK and GREY (SALT expectant) get none or palliative care only. */
const RANK: Record<TriageCategory, number> = { red: 4, yellow: 3, green: 2, grey: 1, black: 0 };

export function verdictFor(expected: TriageCategory, given: TriageCategory | null): Verdict {
  if (given === null) return 'untagged';
  if (given === expected) return 'correct';
  return RANK[given] > RANK[expected] ? 'over' : 'under';
}

/** BLACK or GREY given to someone the algorithm expects to survive — the gravest undertriage. */
function isGiveUp(c: TriageCategory | null): boolean {
  return c === 'black' || c === 'grey';
}

/** Rzeczowniki do zdania „Nie wykonano: …". */
const ACTION_NOUN: Record<ExamActionId, string> = {
  breathing: 'oceny oddechu',
  airway: 'udrożnienia dróg oddechowych',
  'rescue-breaths': '5 oddechów ratowniczych',
  pulse: 'badania tętna',
  crt: 'oceny nawrotu kapilarnego',
  commands: 'sprawdzenia, czy wykonuje proste polecenia',
  avpu: 'oceny AVPU',
  bleeding: 'tamowania krwotoku',
  decompression: 'odbarczenia odmy',
};

/** Noun for the protocol being scored (SALT gives 2 rescue breaths, not 5). */
function noun(a: ExamActionId, mode: ProtocolMode): string {
  return a === 'rescue-breaths' && mode === 'SALT' ? '2 oddechów ratowniczych' : ACTION_NOUN[a];
}

const num = (n: number) => String(n).replace('.', ',');

/** Czynności potrzebne, by ustalić odpowiedź w danym kroku algorytmu. */
function actionsForStep(step: DecisionStep, protocol: Protocol, v: Vitals, who: Who): ExamActionId[] {
  switch (step.id) {
    case 'breathing':
      // Bezdech ujawnia też samo udrożnienie (krok 'airway') — nie wymagamy osobnej oceny oddechu.
      return v.breathing.spontaneous ? ['breathing'] : [];
    case 'resp-rate':
      return ['breathing'];
    case 'airway':
      return ['airway'];
    case 'apneic-pulse':
      return ['pulse'];
    case 'rescue-breaths':
      return ['rescue-breaths'];
    case 'perfusion':
      // START: brak tętna rozstrzyga sam; przy obecnym tętnie trzeba jeszcze CRT.
      return protocol === 'START' && v.peripheralPulse ? ['pulse', 'crt'] : ['pulse'];
    case 'mental':
      return [protocol === 'START' ? 'commands' : 'avpu'];
    case 'walk':
    case 'infant-injury':
    case 'lsi':
    case 'salt-minor':
    case 'salt-survive':
      return [];
    case 'salt-breathing':
      if (v.breathing.spontaneous) return ['breathing'];
      return v.breathing.afterAirway || !who.appearsChild ? ['airway'] : ['airway', 'rescue-breaths'];
    case 'salt-criteria':
      return ['breathing', 'pulse', 'commands'];
  }
}

/**
 * Actions without which a correct colour is just a guess: every step the algorithm passed through,
 * in order. START perfusion: radial pulse and CRT are alternatives — when perfusion is adequate either
 * one is enough; when the step ends the algorithm, one decisive finding (absent pulse or CRT > 2 s) is.
 * In the cold (`cold`) CRT is falsely prolonged, so only the radial pulse counts.
 * Returns the first missing action of each unmet requirement.
 */
type Who = { appearsChild: boolean; ageYears: number };

function assessmentActions(r: TriageResult, v: Vitals, done: ExamActionId[], cold: boolean | undefined, who: Who): ExamActionId[] {
  const out: ExamActionId[] = [];
  for (const step of r.steps) {
    let need = actionsForStep(step, r.protocol, v, who);
    if (step.id === 'perfusion' && r.protocol === 'START') {
      const options: ExamActionId[] = cold
        ? ['pulse']
        : step.result
          ? [...(!v.peripheralPulse ? ['pulse' as const] : []), ...(v.crtSeconds > 2 ? ['crt' as const] : [])]
          : ['pulse', 'crt'];
      need = options.some(a => done.includes(a)) ? [] : options.slice(0, 1);
    }
    for (const a of need) if (!out.includes(a)) out.push(a);
  }
  return out;
}

/** Opis rozstrzygającego ustalenia, np. „Oddechy 34/min (> 30) → CZERWONY". */
function saltFinding(p: ScenarioPatient, category: TriageCategory, last: DecisionStep): string {
  const v = p.vitals;
  const cat = CATEGORY_LABEL[category];
  const moves = p.ageYears < 3 ? 'Celowe ruchy' : 'Wykonuje polecenia';
  switch (last.id) {
    case 'salt-breathing':
      return `Nie oddycha mimo udrożnienia dróg oddechowych${p.appearsChild ? ' i 2 oddechów ratowniczych' : ''} → ${cat}`;
    case 'salt-minor': {
      const what = p.injuries[0] ? ` (${p.injuries[0]})` : '';
      return category === 'green'
        ? `${moves}, tętno obecne, bez duszności, tylko drobne obrażenia → ${cat}`
        : `${moves}, tętno obecne, bez duszności, ale obrażenia nie tylko drobne${what}${v.canWalk ? ' — mimo że chodzi' : ''} → ${cat}`;
    }
    case 'salt-survive': {
      const why: string[] = [];
      if (!purposeful(v, p.ageYears)) why.push(p.ageYears < 3 ? 'brak celowych ruchów' : 'nie wykonuje poleceń');
      if (!v.peripheralPulse) why.push('brak tętna obwodowego');
      if (inDistress(p)) why.push(`duszność (${breathingSigns(p)})`);
      const reason = why.join(', ');
      return category === 'grey' ? `${reason}; przy dostępnych siłach i środkach nie przeżyje → ${cat}` : `${reason[0].toUpperCase()}${reason.slice(1)} → ${cat}`;
    }
    default:
      return `→ ${cat}`;
  }
}

function decisiveFinding(protocol: Protocol, category: TriageCategory, v: Vitals, last: DecisionStep, cold = false): string {
  const crt = cold ? 'CRT niewiarygodny (zimno)' : `CRT ${num(v.crtSeconds)} s (≤ 2 s)`;
  const b = v.breathing;
  const cat = CATEGORY_LABEL[category];
  switch (last.id) {
    case 'walk':
      return `Chodzi samodzielnie → ${cat}`;
    case 'airway':
      return b.afterAirway
        ? `Bezdech, oddech wraca po udrożnieniu dróg oddechowych → ${cat}`
        : `Bezdech mimo udrożnienia dróg oddechowych → ${cat}`;
    case 'apneic-pulse':
      return `Bezdech po udrożnieniu dróg oddechowych i brak tętna obwodowego → ${cat}`;
    case 'rescue-breaths':
      return b.afterRescueBreaths
        ? `Bezdech po udrożnieniu, tętno obecne, oddech wraca po 5 oddechach ratowniczych → ${cat}`
        : `Bezdech po udrożnieniu i po 5 oddechach ratowniczych (mimo tętna) → ${cat}`;
    case 'resp-rate':
      if (protocol === 'START') return `Oddechy ${b.rate}/min (> 30) → ${cat}`;
      if (b.rate < 15) return `Oddechy ${b.rate}/min (< 15) → ${cat}`;
      if (b.rate > 45) return `Oddechy ${b.rate}/min (> 45) → ${cat}`;
      return `Oddech nieregularny (${b.rate}/min) → ${cat}`;
    case 'perfusion':
      if (!v.peripheralPulse) return `Brak tętna ${protocol === 'START' ? 'promieniowego' : 'obwodowego'} → ${cat}`;
      return `Nawrót kapilarny ${num(v.crtSeconds)} s (> 2 s) → ${cat}`;
    case 'mental':
      if (protocol === 'START') {
        return v.obeysCommands
          ? `Nie chodzi; oddechy ${b.rate}/min (≤ 30), tętno promieniowe obecne, ${crt}, wykonuje polecenia → ${cat}`
          : `Nie wykonuje prostych poleceń → ${cat}`;
      }
      if (category === 'red') {
        return v.avpu === 'U' ? `AVPU: U → ${cat}` : `AVPU: P z nieadekwatną reakcją na ból → ${cat}`;
      }
      return `Nie chodzi; oddechy ${b.rate}/min (15–45), tętno obwodowe obecne, AVPU: ${v.avpu}${v.avpu === 'P' ? ' (adekwatnie)' : ''} → ${cat}`;
    case 'infant-injury':
      return v.significantExternalInjury
        ? `Dziecko niechodzące z powodu wieku, bez kryteriów czerwonych, z istotnymi obrażeniami → ${cat}`
        : `Dziecko niechodzące z powodu wieku, bez kryteriów czerwonych i istotnych obrażeń → ${cat}`;
    case 'breathing':
    case 'lsi':
    case 'salt-breathing':
    case 'salt-criteria':
    case 'salt-minor':
    case 'salt-survive':
      // Never the last START/JumpSTART step (SALT has saltFinding) — a fallback.
      return `→ ${cat}`;
  }
}

const VERDICT_SUFFIX: Record<'over' | 'under', string> = {
  over: 'zawyżenie',
  under: 'zaniżenie',
};

/**
 * Stan badania w chwili oznaczenia: odtwarza czynności z dziennika poprzedzające opaskę.
 * Gdy opaskę założono po wszystkich czynnościach, zwraca stan końcowy bez zmian
 * (zgodność ze stanami zbudowanymi ręcznie, bez pełnego dziennika).
 */
export function examStateAt(p: ScenarioPatient, exam: PatientExamState, logIndex: number): PatientExamState {
  if (logIndex >= exam.log.length) return exam;
  return exam.log
    .slice(0, Math.max(0, logIndex))
    .reduce((s, l) => performAction(p, s, l.action).state, initialExamState());
}

/** Krok algorytmu pominięty przed oznaczeniem (gałąź bezdechu). */
interface ProcedureGap {
  action: ExamActionId;
  sentence: string;
}

/**
 * Gałąź bezdechu START/JumpSTART: kolor zależy od wyniku zabiegów (udrożnienie, tętno,
 * oddechy ratownicze). Oznaczenie właściwym kolorem bez tych kroków to trafienie „na ślepo"
 * — a pominięty zabieg sam w sobie ratuje życie. Zwraca pominięte kroki w kolejności algorytmu.
 */
function procedureGaps(
  p: ScenarioPatient,
  r: TriageResult,
  given: TriageCategory,
  atTag: PatientExamState,
  actionsBefore: ExamActionId[],
): ProcedureGap[] {
  const ids = r.steps.map(s => s.id);
  if (r.protocol === 'SALT') {
    if (p.vitals.breathing.spontaneous) return [];
    const gaps: ProcedureGap[] = [];
    if (!atTag.airwayOpened) {
      gaps.push({
        action: 'airway',
        sentence: `Oznaczono jako ${CATEGORY_LABEL[given]} bez udrożnienia dróg oddechowych — wg SALT o kategorii decyduje oddech po udrożnieniu (czynność ratująca życie).`,
      });
    }
    if (p.appearsChild && !p.vitals.breathing.afterAirway && !atTag.rescueBreathsGiven) {
      gaps.push({
        action: 'rescue-breaths',
        sentence: `Oznaczono jako ${CATEGORY_LABEL[given]} bez 2 oddechów ratowniczych — wg SALT u dziecka w bezdechu po udrożnieniu podaje się 2 oddechy i dopiero potem ocenia oddech.`,
      });
    }
    return gaps;
  }
  if (!ids.includes('airway')) return []; // pacjent oddycha samodzielnie — reguła nie dotyczy
  const child = r.protocol === 'JumpSTART';
  const gaps: ProcedureGap[] = [];

  if (given === 'black') {
    if (!atTag.airwayOpened) {
      gaps.push({
        action: 'airway',
        sentence: `Oznaczono jako CZARNY bez udrożnienia dróg oddechowych — wg ${r.protocol} ${
          child ? 'dziecko, u którego po udrożnieniu wraca oddech, byłoby CZERWONE' : 'pacjent, u którego po udrożnieniu wraca oddech, byłby CZERWONY'
        }.`,
      });
    }
    if (child && !actionsBefore.includes('pulse')) {
      gaps.push({
        action: 'pulse',
        sentence:
          'Oznaczono jako CZARNY bez badania tętna obwodowego — wg JumpSTART dziecko w bezdechu z zachowanym tętnem otrzymuje 5 oddechów ratowniczych, a jeśli zacznie oddychać, jest CZERWONE.',
      });
    }
    if (child && p.vitals.peripheralPulse && !atTag.rescueBreathsGiven) {
      gaps.push({
        action: 'rescue-breaths',
        sentence:
          'Oznaczono jako CZARNY bez 5 oddechów ratowniczych u dziecka z zachowanym tętnem — wg JumpSTART dziecko po skutecznych oddechach ratowniczych byłoby CZERWONE.',
      });
    }
  } else if (given === 'red') {
    if (!atTag.airwayOpened) {
      gaps.push({
        action: 'airway',
        sentence: `Oznaczono jako CZERWONY bez udrożnienia dróg oddechowych — wg ${r.protocol} o kategorii ${child ? 'dziecka' : 'pacjenta'} w bezdechu decyduje oddech po udrożnieniu, a bez udrożnienia ${child ? 'dziecko' : 'pacjent'} pozostaje bez oddechu.`,
      });
    }
    if (ids.includes('rescue-breaths') && !atTag.rescueBreathsGiven) {
      gaps.push({
        action: 'rescue-breaths',
        sentence: `Oznaczono jako CZERWONY bez 5 oddechów ratowniczych — wg JumpSTART dziecko z tętnem, które nie zaczyna oddychać po oddechach ratowniczych, byłoby CZARNE.`,
      });
    }
  }
  return gaps;
}

/**
 * Why a correct colour was a guess: apnoea-branch steps (with their own sentences), then the
 * algorithm-path assessments that were skipped. Only called when the findings didn't settle the colour.
 */
function allGaps(
  p: ScenarioPatient,
  r: TriageResult,
  given: TriageCategory,
  atTag: PatientExamState,
  actionsBefore: ExamActionId[],
): ProcedureGap[] {
  const gaps = procedureGaps(p, r, given, atTag, actionsBefore);
  const covered = new Set(gaps.map(g => g.action));
  // Apnoea branch: breaths given before opening the airway have no effect, so they don't count.
  const effective = actionsBefore.filter(a => a !== 'rescue-breaths' || atTag.rescueBreathsGiven);
  for (const a of assessmentActions(r, p.vitals, effective, p.cold, p)) {
    if (!covered.has(a) && !effective.includes(a)) gaps.push({ action: a, sentence: '' });
  }
  return gaps;
}

function procedureExplanation(gaps: ProcedureGap[], mode: ProtocolMode): string {
  const guess = 'Kolor zgodny z algorytmem, ale ustalenia sprzed oznaczenia go nie rozstrzygały — trafienie „na ślepo".';
  if (!gaps.length) return guess;
  const [first, ...rest] = gaps;
  if (!first.sentence) return `${guess} Nie wykonano: ${gaps.map(g => noun(g.action, mode)).join(', ')}.`;
  const parts = [first.sentence];
  if (rest.length) parts.push(`Przed oznaczeniem nie wykonano też: ${rest.map(g => noun(g.action, mode)).join(', ')}.`);
  parts.push('Kolor zgodny z algorytmem, ale ustalony bez wymaganego kroku.');
  return parts.join(' ');
}

function missedLifesaving(
  p: ScenarioPatient,
  final: PatientExamState,
  atTag: PatientExamState,
  given: TriageCategory | null,
  mode: ProtocolMode,
): string[] {
  const v = p.vitals;
  const out: string[] = [];
  if (p.majorBleeding && !final.bleedingControlled) out.push('Nie zatamowano masywnego krwotoku');
  else if (p.majorBleeding && !atTag.bleedingControlled) {
    out.push('Krwotok zatamowano dopiero po oznaczeniu — tamowanie masywnego krwotoku wykonuje się w trakcie oceny, przed nadaniem kategorii');
  }
  const apnoeic = !v.breathing.spontaneous;
  const gaveUp = isGiveUp(given) || given === null;
  if (apnoeic && !atTag.airwayOpened && gaveUp) {
    out.push('Nie udrożniono dróg oddechowych u pacjenta bez oddechu');
  }
  if (mode === 'SALT') {
    if (p.appearsChild && apnoeic && !v.breathing.afterAirway && !atTag.rescueBreathsGiven && gaveUp) {
      out.push('Nie podano 2 oddechów ratowniczych dziecku w bezdechu');
    }
    if (p.salt?.tensionPneumothorax && !atTag.decompressed) out.push('Nie odbarczono odmy prężnej (czynność ratująca życie w SALT)');
    return out;
  }
  if (p.appearsChild && apnoeic && !v.breathing.afterAirway && v.peripheralPulse && !atTag.rescueBreathsGiven && gaveUp) {
    out.push(
      given === 'black'
        ? 'Nie podano 5 oddechów ratowniczych dziecku z zachowanym tętnem przed oznaczeniem jako CZARNY'
        : 'Nie podano 5 oddechów ratowniczych dziecku z zachowanym tętnem',
    );
  }
  return out;
}

/**
 * @param tagLogIndex liczba wpisów dziennika badania w chwili (ostatniego) oznaczenia —
 *   czynności późniejsze nie liczą się do procedury. Domyślnie: opaska po wszystkich czynnościach.
 */
export function debriefPatient(
  p: ScenarioPatient,
  given: TriageCategory | null,
  exam: PatientExamState | undefined,
  tagLogIndex?: number,
  mode: ProtocolMode = 'START',
): PatientDebrief {
  const ex = exam ?? initialExamState();
  const salt = mode === 'SALT';
  const primary = salt ? triageFor('SALT', p) : triage(p.vitals, p.appearsChild);
  // Ages 9–12: schools differ on the JumpSTART age limit, so a colour from either algorithm counts.
  const alt = !salt && isBorderlineAge(p) ? triage(p.vitals, !p.appearsChild) : undefined;
  const alternative = alt && alt.category !== primary.category ? alt : undefined;
  // ...except BLACK while either algorithm gives a living colour (e.g. apnoea with a pulse:
  // JumpSTART gives 5 rescue breaths, START would give BLACK) — then the living colour is expected.
  const living = alternative && given === 'black' && [primary, alternative].find(x => x.category !== 'black');
  const r = living || (alternative && given === alternative.category ? alternative : primary);
  const actionsDone = ex.log.map(l => l.action);
  const tagIdx = given === null ? ex.log.length : Math.min(tagLogIndex ?? ex.log.length, ex.log.length);
  const atTag = examStateAt(p, ex, tagIdx);
  const actionsBefore = actionsDone.slice(0, tagIdx);

  let verdict = verdictFor(r.category, given);
  let explanation = '';
  const critical = isGiveUp(given) && !isGiveUp(r.category);
  if (verdict === 'correct' && given !== null) {
    const algorithm = algorithmFor(mode, p, r.protocol);
    if (!isDetermined(algorithm, p.vitals, knownFindings(p, actionsBefore, mode), given)) {
      verdict = 'procedure';
      explanation = procedureExplanation(allGaps(p, r, given, atTag, actionsBefore), mode);
    }
  } else if (verdict !== 'correct') {
    const last = r.steps[r.steps.length - 1];
    const parts = [`${salt ? saltFinding(p, r.category, last) : decisiveFinding(r.protocol, r.category, p.vitals, last, p.cold)}.`];
    parts.push(
      given === null
        ? 'Pacjenta nie oznaczono.'
        : `Oznaczono jako ${CATEGORY_LABEL[given]} — ${VERDICT_SUFFIX[verdict as 'over' | 'under']}.`,
    );
    const missing = assessmentActions(r, p.vitals, actionsBefore, p.cold, p).filter(a => !actionsBefore.includes(a));
    if (missing.length) parts.push(`Nie wykonano: ${missing.map(a => noun(a, mode)).join(', ')}.`);
    const other = alternative && (r === alternative ? primary : alternative);
    if (other && living) {
      parts.push(`Wg ${other.protocol} byłby CZARNY, ale u dziecka 9–12 lat CZARNY nie jest zaliczany, gdy wg ${r.protocol} ma szansę przeżycia.`);
    } else if (other) {
      parts.push(`Wg ${other.protocol}: ${CATEGORY_LABEL[other.category]} — dla dziecka 9–12 lat zaliczany jest kolor z każdego z algorytmów.`);
    }
    explanation = parts.join(' ');
  }
  const missed = missedLifesaving(p, ex, atTag, given, mode);
  if (critical) {
    explanation = `BŁĄD KRYTYCZNY: ${CATEGORY_LABEL[given!]} u poszkodowanego z szansą przeżycia (wg ${r.protocol} ${CATEGORY_LABEL[r.category]}). ${explanation}`;
  }

  return {
    patientId: p.id,
    label: p.label,
    protocol: r.protocol,
    expected: r.category,
    given,
    verdict,
    critical,
    steps: shownSteps(r.steps, p.cold),
    alternative: living ? undefined : alternative && {
      protocol: (r === alternative ? primary : alternative).protocol,
      expected: (r === alternative ? primary : alternative).category,
      steps: shownSteps((r === alternative ? primary : alternative).steps, p.cold),
    },
    actionsDone,
    actionsBeforeTag: given === null ? null : tagIdx,
    missedLifesaving: missed,
    notes: [...(salt ? [] : orderNote(r, verdict, actionsBefore)), ...teachingNotes(p, r, actionsDone)],
    explanation,
    points: patientPoints(verdict, critical, missed.length, r.category),
  };
}

function patientPoints(verdict: Verdict, critical: boolean, missed: number, expected: TriageCategory): number {
  const base = critical
    ? POINTS.critical
    : verdict === 'procedure'
      ? POINTS.guessed
      : verdict === 'over' && expected === 'black'
        ? POINTS.overDead
        : POINTS[verdict];
  return base + missed * POINTS.missedLifesaving;
}

/** Algorithm stage of an assessment action (bleeding control is done whenever found). */
// Airway and rescue breaths are left out: in the apnoea branch JumpSTART checks the pulse before the breaths.
const STAGE: Partial<Record<ExamActionId, number>> = {
  breathing: 0, pulse: 1, crt: 1, commands: 2, avpu: 2,
};

/** Not an error: the colour counts because the findings settled it, but the algorithm's order is faster. */
function orderNote(r: TriageResult, verdict: Verdict, actionsBefore: ExamActionId[]): string[] {
  if (verdict !== 'correct') return [];
  const stages = actionsBefore.map(a => STAGE[a]).filter((x): x is number => x !== undefined);
  if (stages.every((x, i) => i === 0 || x >= stages[i - 1])) return [];
  const mental = r.protocol === 'START' ? 'proste polecenia' : 'AVPU';
  return [
    `Kolejność badania inna niż w ${r.protocol} (oddech → perfuzja → ${mental}). Kolor zaliczony, bo ustalenia go rozstrzygały — ale zaczynaj od oddechu: to najszybsza ocena i najczęściej sama rozstrzyga.`,
  ];
}

/** In the cold the player saw a falsely long CRT, so the debrief path doesn't quote the true value. */
function shownSteps(steps: DecisionStep[], cold = false): DecisionStep[] {
  if (!cold) return steps;
  return steps.map(s => (s.id === 'perfusion' ? { ...s, answer: s.answer.replace(/CRT [\d,]+ s/, 'CRT niewiarygodny (zimno)') } : s));
}

/** Child who may be triaged with either algorithm (JumpSTART age limit differs between sources). */
export function isBorderlineAge(p: ScenarioPatient): boolean {
  return p.ageYears >= 9 && p.ageYears <= 12;
}

/** Teaching notes that are not errors (pregnancy, infant criteria). */
function teachingNotes(p: ScenarioPatient, r: TriageResult, actions: ExamActionId[]): string[] {
  const out: string[] = [];
  if (p.cold && actions.includes('crt') && r.protocol === 'START') {
    out.push('Zimno: wychłodzona skóra fałszywie wydłuża nawrót kapilarny u każdego — perfuzję oceniaj tętnem promieniowym (modyfikacja START z 1996 r.). Nawrót kapilarny nie jest tu wiarygodny.');
  }
  if (r.category === 'yellow' && p.injuries.some(t => /^rana (brzucha|cięta boku)/.test(t))) {
    out.push(`Rana brzucha przy prawidłowych parametrach to wg ${r.protocol} ŻÓŁTY, ale algorytm nie wykrywa krwawienia, które dopiero narasta. W segregacji wtórnej — pilna ocena chirurgiczna.`);
  }
  if (r.category !== 'black' && p.injuries.some(t => /długo przygniec/.test(t))) {
    out.push(`Długie przygniecenie kończyny: po uwolnieniu grozi zespół zmiażdżenia (hiperkaliemia, zaburzenia rytmu, nagłe zatrzymanie krążenia). Kolor wg ${r.protocol} się nie zmienia, ale pacjent wymaga pilnej segregacji wtórnej i obserwacji.`);
  }
  if (r.protocol === 'SALT' && p.salt?.distress === false && respiratoryDistress(p.vitals, p.appearsChild)) {
    out.push('Szybki oddech bez wysiłku oddechowego (np. hiperwentylacja z paniki) to nie duszność — SALT ocenia wysiłek oddechowy i mowę, nie samą częstość.');
  }
  if (r.steps.some(s => s.id === 'infant-injury')) {
    out.push(`Istotne obrażenia zewnętrzne u niemowlęcia wg JumpSTART: ${INFANT_SIGNIFICANT_INJURIES.join(', ')}.`);
  }
  if (p.appearance.pregnant && r.category !== 'black') {
    out.push(
      'Ciąża nie zmienia kategorii w segregacji wstępnej. Ciężarna z bólem brzucha, skurczami, brakiem ruchów płodu lub krwawieniem z dróg rodnych wymaga jednak pilnej segregacji wtórnej i oceny położniczej (ryzyko oddzielenia łożyska po urazie).',
    );
    if (r.category === 'red' && p.pose === 'back') {
      out.push('Leżąca na plecach ciężarna (widoczna ciąża) — ułóż na lewym boku lub unieś prawe biodro: macica uciska żyłę główną dolną i pogłębia wstrząs.');
    }
  }
  return out;
}

/**
 * @param tagEvents moment ostatniego oznaczenia każdego pacjenta (indeks w dzienniku badania).
 *   Brak wpisu = opaska założona po wszystkich czynnościach (zgodność wstecz).
 */
export function scoreGame(
  patients: ScenarioPatient[],
  tags: Record<string, TriageCategory | undefined>,
  exams: Record<string, PatientExamState | undefined>,
  elapsedSec: number,
  tagEvents: Record<string, TagEvent | undefined> = {},
  opts: { mode?: ProtocolMode; sort?: SortInput } = {},
): GameScore {
  const mode = opts.mode ?? 'START';
  const debriefs = patients.map(p => debriefPatient(p, tags[p.id] ?? null, exams[p.id], tagEvents[p.id]?.logIndex, mode));
  const sortNotes = mode === 'SALT' ? applySortOrder(patients, debriefs, opts.sort) : undefined;
  const count = (v: Verdict) => debriefs.filter(d => d.verdict === v).length;
  const total = debriefs.length;
  const correct = count('correct');
  const tagged = total - count('untagged');
  const points = debriefs.reduce((sum, d) => sum + (d.points ?? 0), 0);
  const maxPoints = total * POINTS.correct;
  return {
    total,
    correct,
    procedure: count('procedure'),
    critical: debriefs.filter(d => d.critical).length,
    over: count('over'),
    under: count('under'),
    untagged: count('untagged'),
    accuracyPct: total ? Math.round((correct / total) * 100) : 0,
    points,
    maxPoints,
    scorePct: maxPoints ? Math.round((Math.max(0, points) / maxPoints) * 100) : 0,
    elapsedSec,
    avgSecPerPatient: tagged ? elapsedSec / tagged : 0,
    patients: debriefs,
    protocol: mode,
    sortNotes,
  };
}

/**
 * SALT sort: still casualties first, then those who waved, walkers last. A patient approached while
 * someone from a more urgent group (as far as the player's commands revealed the groups) still waited
 * untouched costs `POINTS.sortOrder`.
 */
function applySortOrder(patients: ScenarioPatient[], debriefs: PatientDebrief[], sort: SortInput | undefined): string[] {
  const notes: string[] = [];
  if (!sort?.walkersCalled) {
    notes.push('Nie wydano komendy „Kto może chodzić — do mnie!" — w SALT sortowanie zaczyna się od niej (chodzący są oceniani na końcu).');
    return notes;
  }
  if (!sort.waversCalled) {
    notes.push('Nie wydano komendy „Kto mnie słyszy — pomachaj ręką!" — bez niej nie wiadomo, kto leży nieruchomo i wymaga oceny jako pierwszy.');
  }
  // Groups the player could know: without the wave command, still and waving look alike.
  const group = (p: ScenarioPatient) => {
    const g = saltSortGroup(p);
    return !sort.waversCalled && g === 2 ? 1 : g;
  };
  const byId = new Map(patients.map(p => [p.id, p]));
  const seen = new Set<string>();
  let late = 0;
  for (const id of sort.approachOrder) {
    if (seen.has(id)) continue;
    const p = byId.get(id);
    if (!p) continue;
    const g = group(p);
    const skipped = patients.filter(o => o.id !== id && !seen.has(o.id) && group(o) < g);
    seen.add(id);
    if (!skipped.length) continue;
    const d = debriefs.find(x => x.patientId === id)!;
    d.sortLate = true;
    d.points = (d.points ?? 0) + POINTS.sortOrder;
    d.notes = [
      ...(d.notes ?? []),
      `Sortowanie SALT: oceniony, gdy ${skipped.length === 1 ? 'czekał jeszcze 1 poszkodowany' : `czekało jeszcze ${skipped.length} poszkodowanych`} z pilniejszej grupy (nieruchomi → machający → chodzący).`,
    ];
    late++;
  }
  if (late) notes.push(`Kolejność oceny: ${late} ${late === 1 ? 'poszkodowany oceniony' : 'poszkodowanych ocenionych'} przed pilniejszą grupą (${POINTS.sortOrder} pkt za każdego).`);
  return notes;
}
