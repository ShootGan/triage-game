import type { ScenarioPatient } from '../../scenarios/types';
import { initialExamState, performAction } from '../exam';
import type { ExamActionId, PatientExamState } from '../exam/types';
import {
  CATEGORY_LABEL,
  triage,
  type DecisionStep,
  type Protocol,
  type TriageCategory,
  type TriageResult,
  type Vitals,
} from '../triage';
import type { GameScore, PatientDebrief, TagEvent, Verdict } from './types';

export type * from './types';

const RANK: Record<Exclude<TriageCategory, 'black'>, number> = { green: 1, yellow: 2, red: 3 };

export function verdictFor(expected: TriageCategory, given: TriageCategory | null): Verdict {
  if (given === null) return 'untagged';
  if (given === expected) return 'correct';
  // CZARNY u pacjenta z szansą przeżycia — najgroźniejsze zaniżenie.
  if (given === 'black') return 'under';
  if (expected === 'black') return 'over';
  return RANK[given] > RANK[expected] ? 'over' : 'under';
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
};

const num = (n: number) => String(n).replace('.', ',');

/** Czynności potrzebne, by ustalić odpowiedź w danym kroku algorytmu. */
function actionsForStep(step: DecisionStep, protocol: Protocol, v: Vitals): ExamActionId[] {
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
      return [];
  }
}

/** Opis rozstrzygającego ustalenia, np. „Oddechy 34/min (> 30) → CZERWONY". */
function decisiveFinding(protocol: Protocol, category: TriageCategory, v: Vitals, last: DecisionStep): string {
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
          ? `Nie chodzi; oddechy ${b.rate}/min (≤ 30), tętno promieniowe obecne, CRT ${num(v.crtSeconds)} s (≤ 2 s), wykonuje polecenia → ${cat}`
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
      // Krok „Czy oddycha?" nigdy nie kończy algorytmu — zabezpieczenie.
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

function procedureExplanation(gaps: ProcedureGap[]): string {
  const [first, ...rest] = gaps;
  const parts = [first.sentence];
  if (rest.length) parts.push(`Przed oznaczeniem nie wykonano też: ${rest.map(g => ACTION_NOUN[g.action]).join(', ')}.`);
  parts.push('Kolor zgodny z algorytmem, ale ustalony bez wymaganego kroku.');
  return parts.join(' ');
}

function missedLifesaving(
  p: ScenarioPatient,
  final: PatientExamState,
  atTag: PatientExamState,
  given: TriageCategory | null,
): string[] {
  const v = p.vitals;
  const out: string[] = [];
  if (p.majorBleeding && !final.bleedingControlled) out.push('Nie zatamowano masywnego krwotoku');
  else if (p.majorBleeding && !atTag.bleedingControlled) {
    out.push('Krwotok zatamowano dopiero po oznaczeniu — tamowanie masywnego krwotoku wykonuje się w trakcie oceny, przed nadaniem kategorii');
  }
  const apnoeic = !v.breathing.spontaneous;
  const gaveUp = given === 'black' || given === null;
  if (apnoeic && !atTag.airwayOpened && gaveUp) {
    out.push('Nie udrożniono dróg oddechowych u pacjenta bez oddechu');
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
): PatientDebrief {
  const ex = exam ?? initialExamState();
  const r = triage(p.vitals, p.appearsChild);
  const actionsDone = ex.log.map(l => l.action);
  const tagIdx = given === null ? ex.log.length : Math.min(tagLogIndex ?? ex.log.length, ex.log.length);
  const atTag = examStateAt(p, ex, tagIdx);
  const actionsBefore = actionsDone.slice(0, tagIdx);

  let verdict = verdictFor(r.category, given);
  let explanation = '';
  if (verdict === 'correct' && given !== null) {
    const gaps = procedureGaps(p, r, given, atTag, actionsBefore);
    if (gaps.length) {
      verdict = 'procedure';
      explanation = procedureExplanation(gaps);
    }
  } else if (verdict !== 'correct') {
    const last = r.steps[r.steps.length - 1];
    const parts = [`${decisiveFinding(r.protocol, r.category, p.vitals, last)}.`];
    parts.push(
      given === null
        ? 'Pacjenta nie oznaczono.'
        : `Oznaczono jako ${CATEGORY_LABEL[given]} — ${VERDICT_SUFFIX[verdict as 'over' | 'under']}.`,
    );
    const needed = [...new Set(r.steps.flatMap(s => actionsForStep(s, r.protocol, p.vitals)))];
    const missing = needed.filter(a => !actionsBefore.includes(a));
    if (missing.length) parts.push(`Nie wykonano: ${missing.map(a => ACTION_NOUN[a]).join(', ')}.`);
    explanation = parts.join(' ');
  }

  return {
    patientId: p.id,
    label: p.label,
    protocol: r.protocol,
    expected: r.category,
    given,
    verdict,
    steps: r.steps,
    actionsDone,
    actionsBeforeTag: given === null ? null : tagIdx,
    missedLifesaving: missedLifesaving(p, ex, atTag, given),
    explanation,
  };
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
): GameScore {
  const debriefs = patients.map(p => debriefPatient(p, tags[p.id] ?? null, exams[p.id], tagEvents[p.id]?.logIndex));
  const count = (v: Verdict) => debriefs.filter(d => d.verdict === v).length;
  const total = debriefs.length;
  const correct = count('correct');
  const tagged = total - count('untagged');
  return {
    total,
    correct,
    procedure: count('procedure'),
    over: count('over'),
    under: count('under'),
    untagged: count('untagged'),
    accuracyPct: total ? Math.round((correct / total) * 100) : 0,
    elapsedSec,
    avgSecPerPatient: tagged ? elapsedSec / tagged : 0,
    patients: debriefs,
  };
}
