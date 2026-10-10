import { busScenario } from '../bus';
import { concertScenario } from '../concert';
import { festivalScenario } from '../festival';
import { pileupScenario } from '../pileup';
import { tenementScenario } from '../tenement';
import type { PatientPose, Scenario } from '../types';
import type { AgeGroup, Mechanism, Range } from './archetypes';

/**
 * Układy scen dla generatora: stała scena (teren, rekwizyty, punkt zbiórki, odprawa — z wzorca)
 * + miejsca („sloty") na pacjentów + reguły (mechanizmy urazu, liczba poszkodowanych, wiek).
 *
 * Sloty: pozycje wzorcowych pacjentów + dodatkowe, dobrane tak, by WSZYSTKIE były parami ≥ 1,85 m
 * od siebie (wzorcowe między sobą ≥ 1,5 m), poza obrysami rekwizytów (+0,6 m), ≥ 3 m od punktu zbiórki.
 * Sprawdza to test generator.test.ts — dzięki temu dowolny podzbiór slotów spełnia validate.ts.
 */

export interface Slot {
  position: [number, number];
  /** Bazowy obrót (rad); generator dodaje niewielki rozrzut. */
  rotation: number;
  /** Kontekst miejsca (opis), np. „przy autobusie", „na chodniku". */
  context: string;
  /** Blisko wraku / gruzu / barierek — tu częściej leżą ciężej ranni, a chodzący stoją na obrzeżach. */
  core: boolean;
  /** Czy może tu leżeć ktoś niechodzący (false = za blisko punktu zbiórki). */
  lying: boolean;
}

/** Dozwolone pozy w slocie. */
export function slotPoses(s: Slot): PatientPose[] {
  return s.lying ? ['back', 'front', 'sitting', 'standing'] : ['sitting', 'standing'];
}

export interface Role {
  /** Forma męska (brak = rola tylko dla kobiet). */
  m?: string;
  /** Forma żeńska (brak = rola tylko dla mężczyzn). */
  f?: string;
  ages: readonly AgeGroup[];
  /** Najwyżej tyle osób z tą rolą. */
  max?: number;
  weight?: number;
}

export interface Clothes {
  shirts: readonly string[];
  pants: readonly string[];
}

/** Fakty o wylosowanym zestawie — odprawa nie może im przeczyć. */
export interface BriefingInfo {
  children: number;
  infants: number;
  /** Poszkodowani z AVPU P/U (w tym bezdech). */
  unresponsive: number;
  unresponsiveChildren: number;
}

export interface ScenarioLayout {
  id: string;
  /** Prefiks kodu zadania, np. „AUTOBUS". */
  prefix: string;
  template: Scenario;
  mechanisms: readonly Mechanism[];
  /** Liczba poszkodowanych [min, max]. */
  count: Range;
  /** Względna częstość grup wieku. */
  ageWeights: Partial<Record<AgeGroup, number>>;
  /** Widełki wieku (lata; niemowlęta — miesiące 6–11) zastępujące domyślne. */
  ageRanges?: Partial<Record<AgeGroup, Range>>;
  /** Minimalna liczba dzieci (JumpSTART, bez niemowląt). */
  minChildren?: number;
  /** Minimalna liczba dorosłych (nastolatek/dorosły/senior), np. opiekunowie, rodzice. */
  minAdults?: number;
  maxInfants: number;
  roles: readonly Role[];
  /** Szansa, że dorosły/nastolatek ma dopisaną rolę w etykiecie. */
  roleChance: number;
  clothes?: Partial<Record<'adult' | 'child', Clothes>>;
  briefing(info: BriefingInfo): string;
  slots: readonly Slot[];
}

const S = (x: number, z: number, rotation: number, context: string, core: boolean, lying = true): Slot => ({
  position: [x, z],
  rotation,
  context,
  core,
  lying,
});

const lines = (...ls: (string | false | null | undefined)[]) => ls.filter((l): l is string => !!l).join('\n');

// ───────────────────────────── AUTOBUS ─────────────────────────────
const bus: ScenarioLayout = {
  id: 'bus',
  prefix: 'AUTOBUS',
  template: busScenario,
  mechanisms: ['komunikacyjny'],
  count: [10, 14],
  ageWeights: { child: 6, adult: 2.2, teen: 0.4, elderly: 0.5 },
  ageRanges: { child: [6, 10], adult: [20, 62] },
  minChildren: 4,
  minAdults: 1,
  maxInfants: 0,
  roles: [
    { m: 'kierowca autobusu', ages: ['adult'], max: 1, weight: 2 },
    { m: 'kierowca samochodu', f: 'kierująca samochodem', ages: ['adult', 'elderly'], max: 1, weight: 2 },
    { m: 'pasażer samochodu', f: 'pasażerka samochodu', ages: ['teen', 'adult', 'elderly'], max: 2 },
    { m: 'opiekun wycieczki', f: 'opiekunka wycieczki', ages: ['adult'], weight: 2 },
    { m: 'nauczyciel', f: 'nauczycielka', ages: ['adult'], max: 2, weight: 2 },
    { m: 'pilot wycieczki', f: 'pilotka wycieczki', ages: ['adult'], max: 1 },
  ],
  roleChance: 0.95,
  clothes: {
    child: {
      shirts: ['#ff5fa2', '#f4d03f', '#8e44ad', '#e67e22', '#1abc9c', '#3498db', '#e74c3c', '#2ecc71', '#ff9ff3', '#f39c12'],
      pants: ['#3a7bd5', '#27ae60', '#2874a6', '#e74c3c', '#ff9ff3', '#34495e', '#5d6d7e'],
    },
  },
  briefing: () => busScenario.briefing,
  slots: [
    S(-3, 5, 2.6, 'na poboczu', false),
    S(-1.2, 6.8, 3, 'na poboczu', false),
    S(2.5, 5.5, -2.4, 'na poboczu', false),
    S(-7, 4, 0.4, 'na poboczu', false),
    S(-9.5, 6, 1.2, 'na poboczu', false),
    S(8.2, 3.6, -1.8, 'na poboczu', false),
    S(6, -4.6, 2, 'przy samochodzie', true),
    S(0.6, 3.2, -0.3, 'na poboczu', true),
    S(-8, -5, 0.9, 'za autobusem', true),
    S(-3.5, -5.6, -0.7, 'za autobusem', true),
    S(9.5, -3.8, 1.4, 'na poboczu', false),
    S(-6, -6.6, 2.2, 'za autobusem', true),
    S(-1, 0.7, 1.4, 'przy autobusie', true),
    S(1, 0.7, -1.6, 'na jezdni', true),
    S(-1.5, 2.7, 2.9, 'na jezdni', true),
    S(-3, 1.2, 1.8, 'przy autobusie', true),
    S(1, -1.3, -0.8, 'na jezdni', true),
    S(-3.5, 3.2, 2.3, 'na poboczu', false),
    S(2.5, 2.2, -2, 'na jezdni', true),
    S(3, 0.2, -1.4, 'przy samochodzie', true),
  ],
};

// ───────────────────────────── KARAMBOL ─────────────────────────────
const pileup: ScenarioLayout = {
  id: 'pileup',
  prefix: 'KARAMBOL',
  template: pileupScenario,
  mechanisms: ['komunikacyjny'],
  count: [10, 15],
  ageWeights: { adult: 6, elderly: 1.5, teen: 1, child: 1.3, infant: 0.6 },
  ageRanges: { child: [3, 10] },
  maxInfants: 1,
  roles: [
    { m: 'kierowca ciężarówki', ages: ['adult'], max: 1, weight: 1.5 },
    { m: 'kierowca osobówki', f: 'kierująca osobówką', ages: ['adult', 'elderly'], weight: 2 },
    { m: 'pasażer osobówki', f: 'pasażerka osobówki', ages: ['teen', 'adult', 'elderly'], weight: 2 },
    { m: 'pasażer busa dostawczego', f: 'pasażerka busa dostawczego', ages: ['adult'], max: 2 },
    { m: 'z rodzinnego auta', f: 'z rodzinnego auta', ages: ['infant', 'child'], weight: 1 },
  ],
  roleChance: 0.85,
  briefing: (i) =>
    lines(
      'SWD PRM — zadysponowanie, kod 1.',
      'Zdarzenie masowe: karambol na drodze ekspresowej w gęstej mgle — ciężarówka i kilka samochodów osobowych, kierunek na Warszawę, ok. 3 km za węzłem.',
      `Zgłaszający: wielu poszkodowanych${i.children + i.infants > 0 ? ', w tym dzieci' : ''}; część osób chodzi po jezdni. Widoczność poniżej 50 m — zagrożenie kolejnymi najechaniami.`,
      'PSP zabezpiecza miejsce zdarzenia (wyciek paliwa z ciężarówki), Policja zamyka jezdnię, kolejne ZRM i LPR w drodze.',
      'Jesteś pierwszym zespołem na miejscu — przeprowadź segregację wstępną (START / JumpSTART). Punkt zbiórki dla chodzących na poboczu, na trawie.',
    ),
  slots: [
    S(4.6, 5.6, -2.2, 'na poboczu', false),
    S(-5.5, 4, 1.4, 'na poboczu', false),
    S(-0.4, 4, 0.8, 'przy rodzinnym aucie', true),
    S(-1.5, -4.2, 0.3, 'przy barierze', false),
    S(3, 3.4, -0.6, 'przy rodzinnym aucie', true),
    S(6, 3.6, 1.9, 'na poboczu', false),
    S(10.5, 3, -1.2, 'przy białej osobówce', true),
    S(1.2, 4.6, 2.8, 'przy rodzinnym aucie', true),
    S(4, -4.2, 0.5, 'za barierą', true),
    S(8, -6.5, 2.4, 'za barierą', true),
    S(1.5, -2.2, -1, 'na jezdni', true),
    S(7, -2.8, 1, 'przy srebrnej osobówce', true),
    S(-2, 8.2, 0.6, 'przy aucie w rowie', true),
    S(4, 1.2, -1.5, 'na jezdni', true),
    S(2, 0.2, 0.6, 'na jezdni', true),
    S(5.5, -0.3, -1, 'przy srebrnej osobówce', true),
    S(0, -0.8, 0.9, 'na jezdni', true),
    S(-1.5, 2.2, 1.8, 'na jezdni', true),
    S(2.5, 6.2, 3.1, 'na poboczu', false),
    S(7.5, -0.8, -1.2, 'na jezdni', true),
  ],
};

// ───────────────────────────── KAMIENICA ─────────────────────────────
const tenement: ScenarioLayout = {
  id: 'tenement',
  prefix: 'KAMIENICA',
  template: tenementScenario,
  mechanisms: ['wybuch', 'zmiazdzenie', 'upadek', 'oparzenie'],
  count: [11, 15],
  ageWeights: { adult: 4, elderly: 2, child: 2, teen: 1, infant: 0.5 },
  ageRanges: { child: [3, 10] },
  maxInfants: 1,
  roles: [
    { m: 'mieszkaniec kamienicy', f: 'mieszkanka kamienicy', ages: ['child', 'teen', 'adult', 'elderly'], weight: 2 },
    { m: 'mieszkaniec parteru', f: 'mieszkanka parteru', ages: ['teen', 'adult', 'elderly'] },
    { m: 'mieszkaniec I piętra', f: 'mieszkanka I piętra', ages: ['teen', 'adult', 'elderly'] },
    { m: 'mieszkaniec II piętra', f: 'mieszkanka II piętra', ages: ['teen', 'adult', 'elderly'] },
    { m: 'mieszkaniec III piętra', f: 'mieszkanka III piętra', ages: ['adult', 'elderly'] },
    { m: 'przechodzień', ages: ['teen', 'adult', 'elderly'], weight: 1.5 },
    { m: 'sąsiad z naprzeciwka', f: 'sąsiadka z naprzeciwka', ages: ['adult', 'elderly'] },
    { m: 'dozorca', ages: ['adult', 'elderly'], max: 1 },
    { m: 'kierowca zaparkowanego auta', f: 'kierująca zaparkowanym autem', ages: ['adult', 'elderly'], max: 1 },
  ],
  roleChance: 0.85,
  briefing: (i) =>
    lines(
      'SWD PRM — zadysponowanie, kod 1.',
      'Zdarzenie masowe: wybuch gazu w kamienicy przy ul. Długiej, częściowe zawalenie fasady na jezdnię i chodnik.',
      `Zgłaszający: wielu poszkodowanych — mieszkańcy${i.children + i.infants > 0 ? ', w tym dzieci,' : ''} oraz przechodnie; osoby wydobywane spod gruzu przez świadków.`,
      'UWAGA: ryzyko dalszego zawalenia budynku i ponownego wybuchu — nie wchodzić do kamienicy ani na gruzowisko. PSP odcina dopływ gazu i zabezpiecza strefę, Policja kieruje ruchem.',
      'Kolejne ZRM w drodze. Jesteś pierwszym zespołem na miejscu — przeprowadź segregację wstępną (START / JumpSTART). Punkt zbiórki dla chodzących po przeciwnej stronie ulicy.',
    ),
  slots: [
    S(3, 5.5, 2.8, 'na chodniku', false),
    S(5.5, 4, -2.5, 'na chodniku', false),
    S(-1, 7, 3, 'na placu', false),
    S(10, 4.5, -2, 'na chodniku', false),
    S(-10.5, -3.5, 1.2, 'pod kamienicą', true),
    S(-1, -0.8, 0.4, 'przy gruzowisku', true),
    S(-6.5, 4, -1.6, 'na chodniku', false),
    S(-7.5, -0.8, 1.5, 'przy gruzowisku', true),
    S(2.5, 1.8, -2.8, 'na jezdni', true),
    S(-3, 2.5, 0.2, 'przy gruzowisku', true),
    S(4.5, -1, 2.2, 'przy samochodzie', true),
    S(-10, 0.5, 0.9, 'na jezdni', true),
    S(4.5, -4.6, -0.5, 'pod kamienicą', true),
    S(-5, -1.2, 2.6, 'przy gruzowisku', true),
    S(-1, 1.2, -0.4, 'na jezdni', true),
    S(-1, 3.2, -3.1, 'na chodniku', false),
    S(1, 0.7, -1.3, 'na jezdni', true),
    S(-3, 0.2, 1.1, 'przy gruzowisku', true),
    S(1, 3.2, -2.3, 'na chodniku', false),
    S(1.5, -1.3, -0.8, 'przy gruzowisku', true),
  ],
};

// ───────────────────────────── KONCERT ─────────────────────────────
const DARK_SHIRTS = ['#111111', '#1e1e1e', '#2d3436', '#0b0b0b', '#1a1a2e', '#14213d', '#3d0c02', '#22313f', '#4a148c', '#7b1e1e', '#556b2f', '#000000'];
const concert: ScenarioLayout = {
  id: 'concert',
  prefix: 'KONCERT',
  template: concertScenario,
  mechanisms: ['tlum', 'upadek'],
  count: [11, 15],
  ageWeights: { teen: 3, adult: 5, child: 0.6 },
  ageRanges: { adult: [18, 35], child: [5, 10] },
  maxInfants: 0,
  roles: [
    { m: 'ochroniarz', f: 'pracownica ochrony', ages: ['adult'], max: 1 },
    { m: 'z rodzicami', f: 'z rodzicami', ages: ['child'] },
  ],
  roleChance: 0.15,
  clothes: {
    adult: { shirts: DARK_SHIRTS, pants: ['#1a1a1a', '#2c2c54', '#3b5998', '#4b4b4b', '#212121', '#2f3640', '#3c3c3c'] },
  },
  briefing: (i) =>
    lines(
      'SWD PRM — zadysponowanie, kod 1.',
      'Zdarzenie masowe: koncert plenerowy na błoniach miejskich, ok. 3 tys. uczestników. Po awarii pirotechniki na scenie wybuchła panika, tłum naparł na barierki pod sceną.',
      `Zgłaszający (ochrona imprezy): wielu poszkodowanych przygniecionych przy barierkach, część stratowana${i.unresponsive > 0 ? ', są osoby nieprzytomne' : ''}. Wśród publiczności głównie młodzież, są też małe dzieci.`,
      'PSP i Policja zadysponowane, kolejne ZRM w drodze. Jesteś pierwszym zespołem na miejscu — przeprowadź segregację wstępną (START / JumpSTART).',
    ),
  slots: [
    S(4, 4, 2.4, 'na trawie', false),
    S(7, 4.2, -2.2, 'przy punkcie zbiórki', false, false),
    S(1.5, 5, 3, 'na trawie', false),
    S(-2, 4.5, 2.8, 'na trawie', false),
    S(-4, 6.2, 2.2, 'na trawie', false),
    S(-5, 1.5, 0.7, 'w tłumie', true),
    S(3, 1.8, -0.9, 'w tłumie', true),
    S(-6, 7.6, 1.8, 'przy namiocie gastronomicznym', false),
    S(-2, -0.6, 1.5, 'przy barierkach', true),
    S(1.2, -0.3, -1.3, 'przy barierkach', true),
    S(-6.8, 3.6, 2.6, 'przy namiocie gastronomicznym', false),
    S(5, -0.6, 0.4, 'przy przewróconej barierce', true),
    S(8.6, -1.2, -2, 'przy barierkach', true),
    S(-5.5, -0.8, 0.2, 'przy barierkach', true),
    S(0, 2.7, -2.8, 'w tłumie', true),
    S(-0.5, 0.7, 0.2, 'przy barierkach', true),
    S(-2, 2.2, 1.4, 'w tłumie', true),
    S(-0.5, 5.7, 3, 'na trawie', false),
    S(-4, 3.2, 1.7, 'na trawie', false),
    S(3, -0.8, -0.8, 'przy przesuniętej barierce', true),
  ],
};

// ───────────────────────────── FESTYN ─────────────────────────────
const festival: ScenarioLayout = {
  id: 'festival',
  prefix: 'FESTYN',
  template: festivalScenario,
  mechanisms: ['upadek', 'zmiazdzenie'],
  count: [11, 15],
  ageWeights: { child: 7, adult: 2.5, elderly: 0.4, teen: 0.3, infant: 0.4 },
  ageRanges: { child: [6, 10], adult: [25, 55] },
  minChildren: 6,
  minAdults: 1,
  maxInfants: 1,
  roles: [
    { m: 'ojciec ucznia', f: 'matka ucznia', ages: ['adult'], weight: 2 },
    { m: 'nauczyciel', f: 'nauczycielka', ages: ['adult'], max: 2, weight: 1.5 },
    { m: 'nauczyciel WF', f: 'nauczycielka WF', ages: ['adult'], max: 1 },
    { m: 'dziadek ucznia', f: 'babcia ucznia', ages: ['elderly'] },
    { m: 'starszy brat ucznia', f: 'starsza siostra ucznia', ages: ['teen'] },
  ],
  roleChance: 0.9,
  clothes: {
    // strój galowy/sportowy szkoły + kolorowe bluzki
    child: {
      shirts: ['#ffffff', '#ffffff', '#1f3a93', '#f1c40f', '#27ae60', '#e67e22', '#c0392b', '#2e86c1', '#ff7eb9'],
      pants: ['#1f3a93', '#1f3a93', '#ffffff', '#1c1c1c', '#c0392b', '#2e86c1'],
    },
  },
  briefing: (i) =>
    lines(
      'SWD PRM — zadysponowanie, kod 1.',
      'Zdarzenie masowe: podczas festynu sportowego szkoły podstawowej zawaliła się tymczasowa trybuna z widzami (boisko szkolne).',
      `Zgłaszający (dyrektor szkoły): na trybunie siedziały głównie dzieci z klas 1–4, są też rodzice i nauczyciele. Część dzieci przygnieciona elementami konstrukcji${
        i.unresponsiveChildren >= 2 ? ', kilkoro nie reaguje' : i.unresponsiveChildren === 1 ? ', jedno nie reaguje' : ''
      }.`,
      'PSP i Policja zadysponowane, kolejne ZRM w drodze, LPR powiadomione. Jesteś pierwszym zespołem na miejscu — przeprowadź segregację wstępną (START / JumpSTART).',
    ),
  slots: [
    S(5, 4, 2.8, 'na trawie', false),
    S(2.2, 3.8, -2.6, 'na trawie', false),
    S(0.5, 2.8, 0.3, 'na trawie', false),
    S(-2.5, 1.6, 1.1, 'przed trybuną', true),
    S(3.8, -0.8, -1.6, 'przy trybunie', true),
    S(-4.5, -0.9, 0.6, 'przed trybuną', true),
    S(-1.5, -0.8, -0.4, 'przed trybuną', true),
    S(1.5, -0.9, 2, 'przed trybuną', true),
    S(3.4, -3, -1, 'przy trybunie', true),
    S(-7.2, -2.5, 1.3, 'przy trybunie', true),
    S(-6.9, -0.4, 2.4, 'przy trybunie', true),
    S(-3, -7.2, -0.5, 'za trybuną', true),
    S(0.5, -7.3, 1, 'za trybuną', true),
    S(-5.5, -7.4, 0.8, 'za trybuną', true),
    S(0, 0.7, -2.7, 'na alejce', false),
    S(2, 1.2, -2.3, 'przed trybuną', true),
    S(-4.5, 1.2, 2.2, 'przed trybuną', true),
    S(-1.5, 3.2, 3, 'na trawie', false),
    S(-3.5, 3.2, 2.6, 'na trawie', false),
    S(3, -5.3, -0.8, 'przy trybunie', true),
  ],
};

export const LAYOUTS: readonly ScenarioLayout[] = [bus, pileup, tenement, concert, festival];

export function layoutById(id: string): ScenarioLayout | undefined {
  return LAYOUTS.find((l) => l.id === id);
}
