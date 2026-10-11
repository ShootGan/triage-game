import { triage, type TriageCategory, type Vitals } from '../../engine/triage';
import type { PatientAppearance, PatientPose, Scenario, ScenarioPatient } from '../types';
import { scenarioIssues } from '../validate';
import {
  APPEARS_CHILD,
  ARCHETYPES,
  type AgeGroup,
  type Archetype,
  type Mechanism,
  type Range,
  type Text,
} from './archetypes';
import {
  LAYOUTS,
  layoutById,
  slotPoses,
  type BriefingInfo,
  type PregnancyRule,
  type Role,
  type ScenarioLayout,
  type Slot,
} from './layouts';
import { createRng, type Rng } from './rng';
import { ageText, gender, type Sex } from './text';

/**
 * Generator losowych zestawów poszkodowanych (GDD 8.1).
 *
 * Kod zadania „PREFIKS-XXXX" jest ziarnem: ten sam kod → identyczny scenariusz.
 * „PREFIKS-WZOR" → ręcznie ułożony wzorzec bez zmian.
 *
 * UWAGA: zmiana archetypów, slotów lub algorytmu zmienia scenariusze dla istniejących kodów.
 * Przy większych zmianach podbij GENERATOR_VERSION (wchodzi do ziarna).
 */
export const GENERATOR_VERSION = 1;

/** Alfabet kodów: bez 0/O/1/I/L (łatwe do pomylenia przy przepisywaniu). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 4;
export const TEMPLATE_SUFFIX = 'WZOR';

/** Realistyczny rozkład kategorii w zdarzeniu masowym (ułamki liczby poszkodowanych). */
export const CATEGORY_MIX: Record<TriageCategory, Range> = {
  green: [0.4, 0.55],
  yellow: [0.2, 0.3],
  red: [0.15, 0.25],
  black: [0, 0.1],
};
/** Minimum chodzących zielonych (polecenie „kto może iść…" ma sens) i czerwonych. */
export const MIN_WALKING_GREEN = 2;
export const MIN_RED = 1;

const MAX_ATTEMPTS = 60;

// ════════════════════════════ kody ════════════════════════════

export type ParsedCode = { scenarioId: string; code: string } | { error: string };

export function scenarioIds(): string[] {
  return LAYOUTS.map((l) => l.id);
}

export function codePrefix(scenarioId: string): string | null {
  return LAYOUTS.find((x) => x.id === scenarioId)?.prefix ?? null;
}

export function templateCode(scenarioId: string): string {
  const prefix = codePrefix(scenarioId);
  if (!prefix) throw new Error(`Nieznany scenariusz: ${scenarioId}`);
  return `${prefix}-${TEMPLATE_SUFFIX}`;
}

export function isTemplateCode(code: string): boolean {
  return code.endsWith(`-${TEMPLATE_SUFFIX}`);
}

/** Nowy losowy kod (to jedyne miejsce z niedeterministyczną losowością). */
export function randomCode(scenarioId: string, random: () => number = defaultRandom): string {
  const prefix = codePrefix(scenarioId);
  if (!prefix) throw new Error(`Nieznany scenariusz: ${scenarioId}`);
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return `${prefix}-${s}`;
}

function defaultRandom(): number {
  try {
    const c = globalThis.crypto;
    if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  } catch {
    /* brak crypto — Math.random */
  }
  return Math.random();
}

const PREFIX_LIST = () => LAYOUTS.map((l) => l.prefix).join(', ');

/**
 * Odczyt kodu wpisanego przez użytkownika: wielkość liter bez znaczenia, spacje i brak myślnika tolerowane.
 * Zwraca znormalizowany kod albo komunikat błędu po polsku.
 */
export function parseCode(input: string): ParsedCode {
  const raw = (input ?? '').trim().toUpperCase().replace(/[\s_–—]+/g, (m) => (/[_–—]/.test(m) ? '-' : ''));
  if (!raw) return { error: 'Wpisz kod zadania, np. KAMIENICA-4F7K.' };

  let prefix: string;
  let suffix: string;
  const dash = raw.lastIndexOf('-');
  if (dash >= 0) {
    prefix = raw.slice(0, dash).replace(/-+$/, '');
    suffix = raw.slice(dash + 1);
  } else {
    const l = [...LAYOUTS].sort((a, b) => b.prefix.length - a.prefix.length).find((x) => raw.startsWith(x.prefix));
    if (!l) return { error: `Nieznany scenariusz w kodzie „${input.trim()}". Kod zaczyna się od nazwy scenariusza: ${PREFIX_LIST()}.` };
    prefix = l.prefix;
    suffix = raw.slice(l.prefix.length);
  }

  const layout = LAYOUTS.find((l) => l.prefix === prefix);
  if (!layout) {
    return { error: `Nieznany scenariusz „${prefix || '?'}". Kod zaczyna się od nazwy scenariusza: ${PREFIX_LIST()}.` };
  }
  if (suffix === TEMPLATE_SUFFIX) return { scenarioId: layout.id, code: `${prefix}-${TEMPLATE_SUFFIX}` };
  if (suffix.length !== CODE_LENGTH) {
    return { error: `Po nazwie scenariusza musi być ${CODE_LENGTH} znaki, np. ${prefix}-4F7K (albo ${prefix}-${TEMPLATE_SUFFIX} — wzorzec).` };
  }
  const bad = [...suffix].filter((ch) => !CODE_ALPHABET.includes(ch));
  if (bad.length > 0) {
    const confusing = bad.filter((ch) => '0O1IL'.includes(ch));
    return {
      error: confusing.length
        ? `W kodach nie ma znaków 0, O, 1, I ani L (łatwo je pomylić) — sprawdź „${confusing.join('')}".`
        : `Niedozwolony znak w kodzie: „${bad.join('')}". Dozwolone: cyfry 2–9 i litery (bez O, I, L).`,
    };
  }
  return { scenarioId: layout.id, code: `${prefix}-${suffix}` };
}

/** Scenariusz z kodu wpisanego przez użytkownika (albo komunikat błędu). */
export function scenarioFromCode(input: string): Scenario | { error: string } {
  const p = parseCode(input);
  if ('error' in p) return p;
  return generateScenario(p.scenarioId, p.code);
}

/** Widełki liczby poszkodowanych scenariusza (do menu). */
export function patientCountRange(scenarioId: string): [number, number] | null {
  const l = layoutById(scenarioId);
  return l ? [l.count[0], l.count[1]] : null;
}

// ════════════════════════════ generator ════════════════════════════

/**
 * Deterministycznie buduje scenariusz z kodu (kod już znormalizowany, np. z parseCode).
 * Rzuca wyjątek tylko dla nieznanego scenarioId lub kodu z innym prefiksem (błąd programisty).
 */
export function generateScenario(scenarioId: string, code: string): Scenario {
  return generateDetailed(scenarioId, code).scenario;
}

/** Jak generateScenario, plus identyfikatory archetypów (testy, narzędzia deweloperskie). */
export function generateDetailed(scenarioId: string, code: string): Generated & { attempts: number } {
  const layout = layoutById(scenarioId);
  if (!layout) throw new Error(`Nieznany scenariusz: ${scenarioId}`);
  const norm = code.trim().toUpperCase();
  if (!norm.startsWith(`${layout.prefix}-`)) throw new Error(`Kod ${code} nie pasuje do scenariusza ${scenarioId}`);
  const template = (): Generated => ({ scenario: { ...structuredCloneScenario(layout.template), code: norm }, archetypeIds: null });
  if (norm.endsWith(`-${TEMPLATE_SUFFIX}`)) return { ...template(), attempts: 0 };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng(`v${GENERATOR_VERSION}|${norm}|${attempt}`);
    const g = tryGenerate(layout, norm, rng);
    if (g) return { ...g, attempts: attempt + 1 };
  }
  // Nie powinno się zdarzyć (pokrywa to test właściwości) — bezpieczny powrót do wzorca.
  return { ...template(), attempts: MAX_ATTEMPTS };
}

function structuredCloneScenario(s: Scenario): Scenario {
  return JSON.parse(JSON.stringify(s)) as Scenario;
}

/** Wszystkie dopuszczalne rozkłady [zielony, żółty, czerwony, czarny] dla n poszkodowanych. */
export function categoryMixes(n: number): [number, number, number, number][] {
  const ok = (c: TriageCategory, k: number) => k >= CATEGORY_MIX[c][0] * n - 1e-9 && k <= CATEGORY_MIX[c][1] * n + 1e-9;
  const out: [number, number, number, number][] = [];
  for (let r = MIN_RED; r <= n; r++) {
    for (let y = 0; y <= n - r; y++) {
      for (let b = 0; b <= n - r - y; b++) {
        const g = n - r - y - b;
        if (g >= MIN_WALKING_GREEN && ok('green', g) && ok('yellow', y) && ok('red', r) && ok('black', b)) out.push([g, y, r, b]);
      }
    }
  }
  return out;
}

const DEFAULT_AGE: Record<AgeGroup, Range> = {
  infant: [6, 11], // miesiące
  child: [3, 10],
  teen: [13, 17],
  adult: [18, 64],
  elderly: [65, 88],
};

function ageRangeFor(layout: ScenarioLayout, arch: Archetype, g: AgeGroup): Range | null {
  const base = layout.ageRanges?.[g] ?? DEFAULT_AGE[g];
  if (!arch.ageRange || g === 'infant') return base;
  const lo = Math.max(base[0], arch.ageRange[0]);
  const hi = Math.min(base[1], arch.ageRange[1]);
  return lo <= hi ? [lo, hi] : null;
}

/** Widełki wieku kobiety w ciąży dla archetypu (część wspólna z PregnancyRule.age). */
function pregnantAgeRange(rule: PregnancyRule, arch: Archetype): Range | null {
  const lo = Math.max(rule.age[0], arch.ageRange?.[0] ?? -Infinity);
  const hi = Math.min(rule.age[1], arch.ageRange?.[1] ?? Infinity);
  return lo <= hi ? [lo, hi] : null;
}

/** Liczby całkowite k z udziałem k/n w widełkach [min, max]. */
function shareBounds(share: Range, n: number): [number, number] {
  return [Math.ceil(share[0] * n - 1e-9), Math.floor(share[1] * n + 1e-9)];
}

function mechOk(t: Text, mechs: readonly Mechanism[], g: AgeGroup, pose: PatientPose, pregnant: boolean): string | null {
  if (typeof t === 'string') return t;
  if (t.mech && !t.mech.some((m) => mechs.includes(m))) return null;
  if (t.ages && !t.ages.includes(g)) return null;
  if (t.poses && !t.poses.includes(pose)) return null;
  if (t.notPregnant && pregnant) return null;
  return t.t;
}

function eligibleTexts(
  ts: readonly Text[] | undefined,
  mechs: readonly Mechanism[],
  g: AgeGroup,
  pose: PatientPose,
  pregnant = false,
): string[] {
  return (ts ?? []).map((t) => mechOk(t, mechs, g, pose, pregnant)).filter((t): t is string => t !== null);
}

// ── ciąża ──

/**
 * Objaw ciąży zgodny z kategorią i kryterium rozstrzygającym (ostatni krok START) — nie przeczy parametrom:
 * chodzący — skurcze / niepokój, żółci — ból podbrzusza przy miękkim brzuchu,
 * czerwoni przez perfuzję — krwawienie z dróg rodnych i twardy brzuch (wstrząs), pozostali czerwoni — bez objawów wstrząsu.
 */
function pregnancyFindings(v: Vitals, rng: Rng): string[] {
  const r = triage(v, false);
  const step = r.steps.at(-1)?.id;
  const contractions = () => `skurcze co ok. ${rng.int(4, 15)} min`;
  if (r.category === 'green') {
    return ['brzuch miękki, niebolesny', 'pobolewanie podbrzusza, brzuch miękki', 'twardnienie brzucha przy chodzeniu, ustępuje w spoczynku', contractions()];
  }
  if (r.category === 'yellow') {
    return ['ból podbrzusza, brzuch miękki', 'pobolewanie podbrzusza przy ruchu', 'twardnienie brzucha co kilka minut', contractions()];
  }
  if (step === 'perfusion') {
    return ['krwawienie z dróg rodnych, twardy, bolesny brzuch', 'twardy, napięty, bolesny brzuch, plamienie z dróg rodnych'];
  }
  if (step === 'resp-rate') return ['brzuch miękki, niebolesny', 'duszność nasila się w pozycji na plecach'];
  if (r.category === 'black') return ['widoczna ciąża'];
  return ['widoczna ciąża, brzuch miękki'];
}

/** Wypowiedzi ciężarnych (tylko przytomne, wykonujące polecenia). */
const PREGNANT_REMARKS: Record<'green' | 'yellow' | 'red', readonly string[]> = {
  green: [
    'Trzyma się za brzuch: „Czy z dzieckiem wszystko dobrze? Ono się rusza… chyba się rusza!"',
    '„Położna mówiła, żeby oddychać spokojnie… Oddychamy, oddychamy…"',
    'Krzyczy: „Moje dziecko! Nie czuję ruchów! Zróbcie coś!"',
    '„Mąż mnie zabije — mówił, żebym nie jechała na tę wycieczkę!"',
  ],
  yellow: ['„Nie mogę wstać… Czy dziecku nic nie będzie?"', 'Obejmuje brzuch: „Dziecko kopie… to dobry znak, prawda?"'],
  red: ['Szepcze: „Ratujcie… dziecko…"', 'Mówi z trudem: „Proszę… najpierw… dziecko…"'],
};

/** Archetypy dostępne w danym scenariuszu (mechanizm urazu). */
export function archetypesFor(layout: ScenarioLayout): Archetype[] {
  return ARCHETYPES.filter((a) => a.mechanisms.some((m) => layout.mechanisms.includes(m)));
}

// ── parametry życiowe ──

function rateRange(arch: Archetype, g: AgeGroup, age: number): Range {
  const r = arch.vitals.rate;
  if (typeof r !== 'string') return r;
  const young = g === 'child' && age <= 5;
  const table: Record<AgeGroup, { normal: Range; stressed: Range }> = {
    infant: { normal: [30, 40], stressed: [34, 44] },
    child: young ? { normal: [22, 30], stressed: [24, 36] } : { normal: [18, 26], stressed: [20, 30] },
    teen: { normal: [14, 20], stressed: [18, 28] },
    adult: { normal: [14, 20], stressed: [18, 28] },
    elderly: { normal: [14, 20], stressed: [16, 26] },
  };
  return table[g][r];
}

function buildVitals(arch: Archetype, g: AgeGroup, rate: number, crt: number): Vitals {
  const v = arch.vitals;
  const child = APPEARS_CHILD[g];
  const breathing: Vitals['breathing'] = {
    spontaneous: v.breathing === 'spontaneous',
    afterAirway: v.breathing === 'spontaneous' || v.breathing === 'airway',
    rate,
  };
  if (v.breathing === 'rescue') breathing.afterRescueBreaths = true;
  else if (v.breathing === 'none' && child) breathing.afterRescueBreaths = false;
  if (v.irregular) breathing.irregular = true;

  const out: Vitals = {
    canWalk: v.walk,
    breathing,
    peripheralPulse: v.pulse,
    crtSeconds: crt,
    obeysCommands: v.obeys,
    avpu: v.avpu,
  };
  if (g === 'infant' && !v.walk) {
    out.nonAmbulatoryByAge = true;
    out.significantExternalInjury = !!v.infantInjury;
  }
  if (v.avpu === 'P') out.painResponseAppropriate = !!v.painAppropriate;
  return out;
}

/** Losuje parametry w widełkach archetypu. */
export function sampleVitals(arch: Archetype, g: AgeGroup, age: number, rng: Rng): Vitals {
  const [r0, r1] = rateRange(arch, g, age);
  const [c0, c1] = arch.vitals.crt;
  const rate = rng.int(r0, r1);
  const crt = (Math.round(c0 * 2) + rng.int(0, Math.round((c1 - c0) * 2))) / 2;
  return buildVitals(arch, g, rate, crt);
}

/** Skrajne kombinacje widełek (do testów: każda musi dać zamierzoną kategorię). */
export function vitalsCorners(arch: Archetype, g: AgeGroup, age: number): Vitals[] {
  const [r0, r1] = rateRange(arch, g, age);
  const [c0, c1] = arch.vitals.crt;
  const out: Vitals[] = [];
  for (const r of [r0, r1]) for (const c of [c0, c1]) out.push(buildVitals(arch, g, r, c));
  return out;
}

// ── wygląd ──

const SKIN = ['#ffe0bd', '#f3d2b8', '#f5d0b0', '#f0d5be', '#f1c27d', '#e8b98f', '#e0ac69', '#c68642', '#8d5524'];
const SKIN_W = [3, 3, 3, 2, 3, 2, 2, 0.8, 0.8];
const DARK_SKIN = new Set(['#c68642', '#8d5524']);
const HAIR_DARK = ['#0f0f0f', '#1a1a1a', '#1b1b1b', '#2b1d0e'];
const HAIR_ANY = ['#1a1a1a', '#2b1d0e', '#3d2b1f', '#4a2c1a', '#6b4423', '#8b5a2b', '#a0522d', '#b5651d', '#c97f3d', '#d9a441', '#e3c48f', '#e8c07a'];
const HAIR_GREY = ['#7a7a7a', '#9e9e9e', '#bdbdbd', '#e5e5e5'];
const ADULT_SHIRTS = ['#7a8f5c', '#c0392b', '#2e86c1', '#111111', '#ecf0f1', '#1f618d', '#7d3c98', '#5d6d7e', '#e67e22', '#16a085', '#95a5a6', '#d35400', '#27ae60', '#9b59b6', '#5dade2', '#2c3e50', '#8e6e9f', '#f5b7b1', '#a04000', '#e8e8e8'];
const ADULT_PANTS = ['#2f3a4a', '#3b3b3b', '#1c2833', '#34495e', '#212f3d', '#4d4d4d', '#2e4053', '#5b4636', '#283747', '#424949', '#566573', '#1a1a1a', '#7f8c8d'];
const CHILD_SHIRTS = ['#ff5fa2', '#f4d03f', '#8e44ad', '#e67e22', '#1abc9c', '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#ff7eb9', '#f1c40f', '#27ae60'];
const CHILD_PANTS = ['#3a7bd5', '#27ae60', '#2874a6', '#e74c3c', '#ff9ff3', '#34495e', '#1abc9c', '#f39c12', '#1f3a93'];
const INFANT_CLOTHES = ['#ffb3d9', '#fff3a8', '#f8c8dc', '#bde0fe', '#caffbf', '#ffd6a5', '#e0e0ff'];

function sampleAppearance(layout: ScenarioLayout, g: AgeGroup, sex: Sex, rng: Rng): PatientAppearance {
  const child = APPEARS_CHILD[g];
  const skin = g === 'infant' ? rng.pick(['#f8dcc4', '#ffe0bd', '#f3d2b8', '#e0ac69', '#c68642']) : rng.weighted(SKIN, (s) => SKIN_W[SKIN.indexOf(s)]);
  let hair: string;
  if (g === 'elderly') hair = rng.pick(HAIR_GREY);
  else if (DARK_SKIN.has(skin)) hair = rng.pick(HAIR_DARK);
  else if (g === 'adult' && rng.chance(0.12)) hair = rng.pick(HAIR_GREY.slice(0, 2));
  else hair = rng.pick(HAIR_ANY);

  type HS = PatientAppearance['hairStyle'];
  const style = (opts: [HS, number][]): HS => rng.weighted(opts, (o) => o[1])[0];
  let hairStyle: HS;
  if (g === 'infant') hairStyle = style([['short', 1], ['bald', 1]]);
  else if (sex === 'm') {
    hairStyle =
      g === 'child' ? style([['short', 9], ['long', 1]])
      : g === 'teen' ? style([['short', 7], ['long', 3]])
      : g === 'adult' ? style([['short', 7.5], ['bald', 1.5], ['long', 1]])
      : style([['short', 1], ['bald', 1]]);
  } else {
    hairStyle =
      g === 'elderly' ? style([['short', 8], ['long', 2]])
      : g === 'adult' ? style([['long', 5], ['ponytail', 2.5], ['short', 2.5]])
      : style([['long', 5], ['ponytail', 5], ['short', 1]]);
  }

  const palette =
    g === 'infant'
      ? { shirts: INFANT_CLOTHES, pants: INFANT_CLOTHES }
      : child
        ? (layout.clothes?.child ?? { shirts: CHILD_SHIRTS, pants: CHILD_PANTS })
        : (layout.clothes?.adult ?? { shirts: ADULT_SHIRTS, pants: ADULT_PANTS });
  const shirt = rng.pick(palette.shirts);
  const pants = g === 'infant' && rng.chance(0.5) ? shirt : rng.pick(palette.pants);

  const a: PatientAppearance = {
    sex,
    child,
    skin,
    hair,
    hairStyle,
    shirt,
    pants,
    sleeves: g === 'infant' ? 'long' : g === 'elderly' ? (rng.chance(0.8) ? 'long' : 'short') : rng.chance(0.5) ? 'long' : 'short',
  };
  if (sex === 'm' && (g === 'adult' || g === 'elderly')) a.beard = rng.chance(0.3);
  return a;
}

// ── etykieta ──

function noun(g: AgeGroup, sex: Sex, arch: Archetype): string {
  if (arch.labelNoun) return arch.labelNoun;
  switch (g) {
    case 'infant':
      return 'Niemowlę';
    case 'child':
      return sex === 'm' ? 'Chłopiec' : 'Dziewczynka';
    case 'teen':
      return sex === 'm' ? 'Nastolatek' : 'Nastolatka';
    default:
      return sex === 'm' ? 'Mężczyzna' : 'Kobieta';
  }
}

function pickRole(layout: ScenarioLayout, g: AgeGroup, sex: Sex, used: Map<Role, number>, rng: Rng): string | null {
  const fits = layout.roles.filter((r) => r.ages.includes(g) && (sex === 'm' ? r.m : r.f) && (r.max === undefined || (used.get(r) ?? 0) < r.max));
  if (fits.length === 0 || !rng.chance(layout.roleChance)) return null;
  const r = rng.weighted(fits, (x) => x.weight ?? 1);
  used.set(r, (used.get(r) ?? 0) + 1);
  return (sex === 'm' ? r.m : r.f) ?? null;
}

// ── złożenie scenariusza ──

interface Draft {
  arch: Archetype;
  group: AgeGroup;
  ageYears: number;
  months?: number;
  sex: Sex;
  vitals: Vitals;
  /** Tydzień ciąży (tylko kobiety w ciąży — układy z `pregnancy`). */
  pregnancyWeek?: number;
}

interface Generated {
  scenario: Scenario;
  /** Archetyp każdego pacjenta (w kolejności `patients`); null dla wzorca. */
  archetypeIds: string[] | null;
}

function tryGenerate(layout: ScenarioLayout, code: string, rng: Rng): Generated | null {
  const mechs = layout.mechanisms;
  const pool = archetypesFor(layout);
  const n = rng.int(layout.count[0], layout.count[1]);
  const mixes = categoryMixes(n);
  if (mixes.length === 0) return null;
  const [g, y, r, b] = rng.pick(mixes);
  const cats: TriageCategory[] = rng.shuffle([
    ...Array<TriageCategory>(g).fill('green'),
    ...Array<TriageCategory>(y).fill('yellow'),
    ...Array<TriageCategory>(r).fill('red'),
    ...Array<TriageCategory>(b).fill('black'),
  ]);

  // Wymuszone dzieci (np. autobus szkolny, festyn) i dorośli (opiekunowie) — losowe pozycje na liście.
  const order0 = rng.shuffle(cats.map((_, i) => i));
  const preg = layout.pregnancy;
  let nChild = layout.minChildren ?? 0;
  if (layout.childShare) {
    // udział dzieci — z zapasem miejsca na minimalną liczbę ciężarnych i obsługi
    const reserve = preg ? shareBounds(preg.share, n)[0] + preg.minOtherAdults : 0;
    const [lo, hi] = shareBounds(layout.childShare, n);
    nChild = rng.int(lo, Math.max(lo, Math.min(hi, n - reserve)));
  }
  const forcedChild = new Set(order0.slice(0, nChild));
  const forcedAdult = new Set(order0.slice(nChild, nChild + (layout.minAdults ?? 0)));
  const ADULT_GROUPS: AgeGroup[] = ['teen', 'adult', 'elderly'];
  // Kobiety w ciąży — tylko w układach z `pregnancy` (inne układy: bez zmian i bez zużycia RNG).
  let forcedPregnant = new Set<number>();
  if (preg) {
    const [lo, hi] = shareBounds(preg.share, n);
    const nPreg = rng.int(lo, Math.max(lo, Math.min(hi, n - nChild - preg.minOtherAdults)));
    forcedPregnant = new Set(order0.slice(nChild).filter((i) => preg.categories.includes(cats[i])).slice(0, nPreg));
    if (forcedPregnant.size < lo) return null;
  }

  const used = new Map<string, number>();
  let infants = 0;
  const drafts: Draft[] = [];
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const pregnant = forcedPregnant.has(i);
    const candidatesFor = (grp: AgeGroup) =>
      pool.filter(
        (a) =>
          a.category === cat &&
          a.ages.includes(grp) &&
          !(a.unique && used.has(a.id)) &&
          (pregnant
            ? !!a.pregnancy && a.sex !== 'm' && pregnantAgeRange(preg!, a) !== null
            : ageRangeFor(layout, a, grp) !== null && !(preg && a.pregnancy === 'only')),
      );
    let group: AgeGroup;
    if (forcedChild.has(i)) {
      group = 'child';
    } else if (pregnant) {
      group = 'adult';
    } else {
      const groups = (Object.keys(layout.ageWeights) as AgeGroup[]).filter(
        (grp) =>
          (layout.ageWeights[grp] ?? 0) > 0 &&
          (!forcedAdult.has(i) || ADULT_GROUPS.includes(grp)) &&
          (grp !== 'infant' || infants < layout.maxInfants) &&
          candidatesFor(grp).length > 0,
      );
      if (groups.length === 0) return null;
      group = rng.weighted(groups, (grp) => layout.ageWeights[grp] ?? 0);
    }
    const cands = candidatesFor(group);
    if (cands.length === 0) return null;
    const arch = rng.weighted(cands, (a) => (a.weight ?? 1) * Math.pow(0.3, used.get(a.id) ?? 0));
    used.set(arch.id, (used.get(arch.id) ?? 0) + 1);
    if (group === 'infant') infants++;

    const range = pregnant ? pregnantAgeRange(preg!, arch)! : ageRangeFor(layout, arch, group)!;
    const sex: Sex = pregnant ? 'f' : (arch.sex ?? (rng.chance(0.5) ? 'm' : 'f'));
    let ageYears: number;
    let months: number | undefined;
    if (group === 'infant') {
      months = rng.int(range[0], range[1]);
      ageYears = Math.round((months / 12) * 100) / 100;
    } else {
      ageYears = rng.int(range[0], range[1]);
    }

    // Losowanie parametrów + weryfikacja silnikiem triage (ponawiane).
    let vitals: Vitals | null = null;
    for (let k = 0; k < 8 && !vitals; k++) {
      const v = sampleVitals(arch, group, ageYears, rng);
      if (triage(v, APPEARS_CHILD[group]).category === arch.category) vitals = v;
    }
    if (!vitals) return null;
    const d: Draft = { arch, group, ageYears, months, sex, vitals };
    if (pregnant) d.pregnancyWeek = rng.int(preg!.weeks[0], preg!.weeks[1]);
    drafts.push(d);
  }

  const walkingGreens = drafts.filter((d) => d.vitals.canWalk).length;
  if (walkingGreens < MIN_WALKING_GREEN) return null;
  const childCount = drafts.filter((d) => d.group === 'child').length;
  if (childCount < (layout.minChildren ?? 0)) return null;
  if (drafts.filter((d) => ADULT_GROUPS.includes(d.group)).length < (layout.minAdults ?? 0)) return null;

  // ── miejsca: najpierw niechodzący (potrzebują slotów „lying"), potem chodzący ──
  const free = new Set<Slot>(layout.slots);
  const placement = new Map<Draft, { slot: Slot; pose: PatientPose }>();
  const order = [...drafts.filter((d) => !d.vitals.canWalk), ...drafts.filter((d) => d.vitals.canWalk)];
  for (const d of order) {
    const walker = d.vitals.canWalk;
    // niechodzący tylko w slotach „lying" (≥ 3 m od punktu zbiórki — reguła validate.ts)
    const options = [...free].filter((s) => (walker || s.lying) && d.arch.poses.some((p) => slotPoses(s).includes(p)));
    if (options.length === 0) return null;
    const slot = rng.weighted(options, (s) => (walker ? (s.core ? 1 : 3) : s.core ? 3 : 1));
    const poses = d.arch.poses.filter((p) => slotPoses(slot).includes(p));
    free.delete(slot);
    placement.set(d, { slot, pose: rng.pick(poses) });
  }

  // ── pacjenci ──
  const roleUse = new Map<Role, number>();
  // Role obowiązkowe (np. obaj kierowcy) — z góry, losowym dorosłym bez ciąży. Płeć tej osoby losowana
  // od nowa wg `prefer` (np. kierowca częściej mężczyzna) — teksty i wygląd powstają dopiero niżej.
  const fixedRole = new Map<Draft, string>();
  const required = layout.roles.filter((ro) => ro.required);
  if (required.length > 0) {
    const staff = rng.shuffle(drafts.filter((d) => d.pregnancyWeek === undefined && !APPEARS_CHILD[d.group]));
    for (const ro of required) {
      const who = staff.find((d) => !fixedRole.has(d) && ro.ages.includes(d.group) && !d.arch.sex);
      if (!who) return null;
      if (ro.prefer) {
        const other: Sex = ro.prefer.sex === 'm' ? 'f' : 'm';
        who.sex = rng.chance(ro.prefer.p) ? ro.prefer.sex : other;
      }
      if (!(who.sex === 'm' ? ro.m : ro.f)) who.sex = who.sex === 'm' ? 'f' : 'm';
      fixedRole.set(who, (who.sex === 'm' ? ro.m : ro.f)!);
      roleUse.set(ro, (roleUse.get(ro) ?? 0) + 1);
    }
  }
  // Teksty już użyte w tym scenariuszu — losujemy z preferencją dla nowych (mniej powtórzeń).
  const usedText = new Map<string, number>();
  const pickFresh = (opts: string[]): string => {
    const t = rng.weighted(opts, (o) => Math.pow(0.1, usedText.get(o) ?? 0));
    usedText.set(t, (usedText.get(t) ?? 0) + 1);
    return t;
  };
  const patients: ScenarioPatient[] = drafts.map((d, i) => {
    const { slot, pose } = placement.get(d)!;
    const pregnant = d.pregnancyWeek !== undefined;
    const injuries: string[] = [];
    for (const line of d.arch.injuries) {
      const opts = eligibleTexts(line, mechs, d.group, pose, pregnant).filter((t) => !injuries.includes(gender(t, d.sex)));
      if (opts.length) injuries.push(gender(pickFresh(opts), d.sex));
    }
    if (pregnant) {
      const opts = pregnancyFindings(d.vitals, rng).filter((t) => !injuries.includes(t));
      if (opts.length) injuries.push(pickFresh(opts));
    }
    const extras = eligibleTexts(d.arch.extraInjuries, mechs, d.group, pose, pregnant).filter((t) => !injuries.includes(gender(t, d.sex)));
    if (extras.length && rng.chance(0.6)) injuries.push(gender(pickFresh(extras), d.sex));

    // Wypowiedź: gdy wszystkie warianty już padły — część pacjentów po prostu milczy.
    // Ciężarna, przytomna: często mówi o dziecku.
    const cat = d.arch.category;
    const pregnantRemarks = pregnant && d.vitals.obeysCommands && cat !== 'black' ? PREGNANT_REMARKS[cat] : [];
    const remarks = pregnantRemarks.length && rng.chance(0.5) ? [...pregnantRemarks] : eligibleTexts(d.arch.remarks, mechs, d.group, pose, pregnant);
    const allUsed = remarks.length > 0 && remarks.every((r) => usedText.has(r));
    const remark = remarks.length && !(allUsed && rng.chance(0.5)) ? gender(pickFresh(remarks), d.sex) : undefined;

    const role = pregnant ? null : (fixedRole.get(d) ?? pickRole(layout, d.group, d.sex, roleUse, rng));
    const label = pregnant
      ? `Kobieta w ciąży, ${ageText(d.ageYears)} (ok. ${d.pregnancyWeek}. tydzień)`
      : `${noun(d.group, d.sex, d.arch)}, ${ageText(d.ageYears, d.months)}${role ? ` (${role})` : ''}`;

    const p: ScenarioPatient = {
      id: `r${String(i + 1).padStart(2, '0')}`,
      label,
      ageYears: d.ageYears,
      appearsChild: APPEARS_CHILD[d.group],
      vitals: d.vitals,
      injuries,
      appearance: sampleAppearance(layout, d.group, d.sex, rng),
      pose,
      position: [slot.position[0], slot.position[1]],
      rotation: Math.round((slot.rotation + rng.float(-0.6, 0.6)) * 100) / 100,
    };
    if (pregnant) p.appearance.pregnant = true;
    if (d.arch.majorBleeding) p.majorBleeding = true;
    if (remark) p.remark = remark;
    return p;
  });

  const info: BriefingInfo = {
    children: drafts.filter((d) => d.group === 'child').length,
    infants: drafts.filter((d) => d.group === 'infant').length,
    unresponsive: patients.filter((p) => p.vitals.avpu === 'P' || p.vitals.avpu === 'U').length,
    unresponsiveChildren: patients.filter((p) => p.appearsChild && (p.vitals.avpu === 'P' || p.vitals.avpu === 'U')).length,
    pregnant: patients.filter((p) => p.appearance.pregnant).length,
  };

  const t = layout.template;
  const timeLimitSec = Math.max(480, Math.min(900, Math.round(((t.timeLimitSec / t.patients.length) * n) / 30) * 30));
  const scenario: Scenario = {
    id: t.id,
    code,
    title: t.title,
    briefing: layout.briefing(info),
    timeLimitSec,
    collectionPoint: [t.collectionPoint[0], t.collectionPoint[1]],
    props: t.props.map((p) => ({ ...p, position: [p.position[0], p.position[1]] })),
    patients,
  };
  if (t.terrain) scenario.terrain = t.terrain;
  if (t.special) scenario.special = true;

  // ── weryfikacja końcowa ──
  if (scenarioIssues(scenario).length > 0) return null;
  for (let i = 0; i < patients.length; i++) {
    if (triage(patients[i].vitals, patients[i].appearsChild).category !== drafts[i].arch.category) return null;
  }
  return { scenario, archetypeIds: drafts.map((d) => d.arch.id) };
}
