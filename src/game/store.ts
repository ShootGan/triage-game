import { create } from 'zustand';
import type { ExamActionId, PatientExamState } from '../engine/exam/types';
import type { GameScore, TagEvent } from '../engine/scoring/types';
import { saltSortGroup, type ProtocolMode, type TriageCategory } from '../engine/triage';
import { codeProtocol, withProtocol } from '../scenarios/protocolCode';
import type { IGameView } from '../render/types';
import type { Scenario, ScenarioPatient } from '../scenarios/types';
import { getDeps } from './deps';

export type Phase = 'menu' | 'briefing' | 'playing' | 'debrief';
export type GameMode = 'learn' | 'practice';

export const MODE_LABEL: Record<GameMode, string> = {
  learn: 'Nauka',
  practice: 'Ćwiczenie',
};

/** Skąd pacjenci: losowy zestaw (nowy kod przy każdym starcie) albo ręczny wzorzec scenariusza. */
export type ScenarioVariant = 'random' | 'template';

export const VARIANT_LABEL: Record<ScenarioVariant, string> = {
  random: 'Losowa (nowy kod)',
  template: 'Wzorzec',
};

export interface GameState {
  phase: Phase;
  mode: GameMode;
  scenarioId: string | null;
  scenario: Scenario | null;
  variant: ScenarioVariant;
  /** Kod wczytany w menu — ma pierwszeństwo przed `variant`, dopóki gracz go nie usunie / nie zmieni scenariusza. */
  loadedCode: string | null;
  /** Algorithm chosen in the menu for new codes (a loaded code carries its own). */
  protocolMode: ProtocolMode;

  /** Rzeczywisty czas segregacji w sekundach (stoper od wjazdu na miejsce). */
  clockSec: number;
  /** Panel podpowiedzi (tryb Nauka) rozwinięty. */
  hintOpen: boolean;
  selectedId: string | null;
  /** Pacjent, do którego ratownik właśnie idzie (panel badania otwiera się po dojściu). */
  approachingId: string | null;
  /** Ostatni pacjent, do którego gracz podszedł (koszt dojścia liczony przy zmianie). */
  lastVisitedId: string | null;
  tags: Record<string, TriageCategory | undefined>;
  /** Ostatnie oznaczenie każdego pacjenta z pozycją w dzienniku badania (czy kroki poprzedzały opaskę). */
  tagEvents: Record<string, TagEvent | undefined>;
  exams: Record<string, PatientExamState | undefined>;
  walkersCalled: boolean;
  walkersGroupTagged: boolean;
  /** SALT: "Kto mnie słyszy — pomachaj ręką!" given. */
  waversCalled: boolean;
  /** Patients in the order the player walked up to them (SALT sort scoring). */
  approachOrder: string[];
  score: GameScore | null;

  setMode(mode: GameMode): void;
  setScenario(id: string): void;
  setVariant(v: ScenarioVariant): void;
  setProtocol(mode: ProtocolMode): void;
  /** Wczytuje kod wpisany przez gracza; zwraca komunikat błędu albo null. */
  loadCode(input: string): string | null;
  clearLoadedCode(): void;
  /** Odprawa: scenariusz z wczytanego kodu, wzorca albo nowego losowego kodu. */
  goToBriefing(): void;
  /** Odprawa dla konkretnego kodu (bez zmiany ustawień menu). */
  playCode(code: string): void;
  /** Nowy losowy kod tego samego scenariusza. */
  newRandom(): void;
  startPlaying(): void;
  selectPatient(id: string | null): void;
  doAction(action: ExamActionId): void;
  tagPatient(id: string, cat: TriageCategory): void;
  toggleHint(): void;
  callWalkers(): void;
  /** SALT: everyone who can hear — wave (still ones are assessed first). */
  callWavers(): void;
  tagWalkersGreen(): void;
  endTriage(): void;
  restart(): void;
  toMenu(): void;
}

// ---- Widok 3D: trzymany poza stanem (nieserializowalny), podpinany przez GameCanvas ----
let view: IGameView | null = null;
export function attachView(v: IGameView | null): void {
  view = v;
}
export function getView(): IGameView | null {
  return view;
}

/** Czy limit czasu jest egzekwowany (Nauka = bez presji czasu, wg GDD). */
export function timeLimitEnforced(mode: GameMode): boolean {
  return mode !== 'learn';
}

function findPatient(s: GameState, id: string): ScenarioPatient | undefined {
  return s.scenario?.patients.find((p) => p.id === id);
}

const freshRound = {
  clockSec: 0,
  selectedId: null,
  approachingId: null,
  lastVisitedId: null,
  tags: {},
  tagEvents: {},
  exams: {},
  walkersCalled: false,
  walkersGroupTagged: false,
  waversCalled: false,
  approachOrder: [] as string[],
  score: null,
} satisfies Partial<GameState>;

/** Algorithm of the game being played. */
export function gameProtocol(s: Pick<GameState, 'scenario'>): ProtocolMode {
  return s.scenario?.protocol ?? 'START';
}

// ---- Stoper: rzeczywisty czas od wjazdu na miejsce ----
let clockTimer: ReturnType<typeof setInterval> | null = null;
let clockStart = 0;
function stopClock(): void {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
}

export const useGame = create<GameState>()((set, get) => {
  const elapsedNow = () => (performance.now() - clockStart) / 1000;

  /** Uruchamia stoper; po przekroczeniu limitu (Ćwiczenie) kończy segregację. */
  const startClock = () => {
    stopClock();
    clockStart = performance.now();
    clockTimer = setInterval(() => {
      const s = get();
      if (s.phase !== 'playing') return stopClock();
      const clockSec = elapsedNow();
      set({ clockSec });
      if (s.scenario && timeLimitEnforced(s.mode) && clockSec >= s.scenario.timeLimitSec) get().endTriage();
    }, 250);
  };

  return {
    phase: 'menu',
    mode: 'learn',
    scenarioId: null,
    scenario: null,
    variant: 'random',
    loadedCode: null,
    protocolMode: 'START',
    hintOpen: false,
    ...freshRound,

    setMode(mode) {
      set({ mode });
    },

    setScenario(id) {
      const { loadedCode } = get();
      const keep = loadedCode !== null && getDeps().codes.parseCode(loadedCode);
      set({ scenarioId: id, loadedCode: keep && !('error' in keep) && keep.scenarioId === id ? loadedCode : null });
    },

    setVariant(variant) {
      set({ variant, loadedCode: null });
    },

    setProtocol(protocolMode) {
      const { loadedCode } = get();
      set({ protocolMode, loadedCode: loadedCode && withProtocol(loadedCode, protocolMode) });
    },

    loadCode(input) {
      const p = getDeps().codes.parseCode(input);
      if ('error' in p) return p.error;
      set({ scenarioId: p.scenarioId, loadedCode: p.code, protocolMode: codeProtocol(p.code) });
      return null;
    },

    clearLoadedCode() {
      set({ loadedCode: null });
    },

    goToBriefing() {
      const s = get();
      const { scenarios, codes } = getDeps();
      if (s.loadedCode) return get().playCode(s.loadedCode);
      const id = s.scenarioId ?? scenarios[0]?.id;
      if (!id || !scenarios.some((x) => x.id === id)) return;
      get().playCode(withProtocol(s.variant === 'template' ? codes.templateCode(id) : codes.randomCode(id), s.protocolMode));
    },

    playCode(code) {
      const result = getDeps().codes.scenarioFromCode(code);
      if ('error' in result) {
        console.error(`Nie udało się zbudować scenariusza z kodu ${code}: ${result.error}`);
        return;
      }
      stopClock();
      set({ ...freshRound, scenarioId: result.id, scenario: result, phase: 'briefing' });
    },

    newRandom() {
      const id = get().scenario?.id ?? get().scenarioId;
      if (!id) return;
      get().playCode(withProtocol(getDeps().codes.randomCode(id), get().scenario?.protocol ?? get().protocolMode));
    },

    startPlaying() {
      if (!get().scenario) return;
      set({ ...freshRound, phase: 'playing' });
      startClock();
    },

    toggleHint() {
      set({ hintOpen: !get().hintOpen });
    },

    selectPatient(id) {
      const s = get();
      if (s.phase !== 'playing') return;
      if (id !== null && (id === s.selectedId || id === s.approachingId)) return;
      if (id === null) {
        set({ selectedId: null, approachingId: null });
        view?.focusPatient(null);
        return;
      }
      if (!findPatient(s, id)) return;
      set({ selectedId: null, approachingId: id, lastVisitedId: id, approachOrder: [...s.approachOrder, id] });
      const arrive = () => {
        const now = get();
        if (now.phase === 'playing' && now.approachingId === id) set({ selectedId: id, approachingId: null });
      };
      if (view) view.focusPatient(id, arrive);
      else arrive();
    },

    doAction(action) {
      const s = get();
      if (s.phase !== 'playing' || !s.selectedId) return;
      const p = findPatient(s, s.selectedId);
      if (!p) return;
      const d = getDeps();
      const prev = s.exams[p.id] ?? d.initialExamState();
      const { state } = d.performAction(p, prev, action, gameProtocol(s));
      set({ exams: { ...s.exams, [p.id]: state } });
      if (action === 'bleeding' && state.bleedingControlled && !prev.bleedingControlled) {
        view?.setBleedingControlled(p.id);
      }
    },

    tagPatient(id, cat) {
      const s = get();
      if (s.phase !== 'playing' || !findPatient(s, id)) return;
      set({
        tags: { ...s.tags, [id]: cat },
        tagEvents: { ...s.tagEvents, [id]: { category: cat, logIndex: s.exams[id]?.log.length ?? 0 } },
      });
      view?.setTag(id, cat);
      // kategoria nadana — zamykamy panel badania i wracamy do przeglądu
      if (s.selectedId === id) get().selectPatient(null);
    },

    callWalkers() {
      const s = get();
      if (s.phase !== 'playing' || s.walkersCalled) return;
      set({ walkersCalled: true });
      view?.sendWalkersToCollectionPoint();
    },

    callWavers() {
      const s = get();
      if (s.phase !== 'playing' || !s.walkersCalled || s.waversCalled || !s.scenario || gameProtocol(s) !== 'SALT') return;
      set({ waversCalled: true });
      view?.wave(s.scenario.patients.filter((p) => saltSortGroup(p) === 2).map((p) => p.id));
    },

    tagWalkersGreen() {
      const s = get();
      // SALT: walkers are assessed one by one (they may be DELAYED), never tagged as a group.
      if (s.phase !== 'playing' || !s.walkersCalled || s.walkersGroupTagged || !s.scenario || gameProtocol(s) === 'SALT') return;
      const tags = { ...s.tags };
      const tagEvents = { ...s.tagEvents };
      for (const p of s.scenario.patients) {
        // Nie nadpisujemy opasek założonych już ręcznie przez gracza.
        if (p.vitals.canWalk && !tags[p.id]) {
          tags[p.id] = 'green';
          tagEvents[p.id] = { category: 'green', logIndex: s.exams[p.id]?.log.length ?? 0 };
          view?.setTag(p.id, 'green');
        }
      }
      set({ tags, tagEvents, walkersGroupTagged: true });
    },

    endTriage() {
      const s = get();
      if (s.phase !== 'playing' || !s.scenario) return;
      stopClock();
      const now = Math.round(elapsedNow());
      const elapsed = timeLimitEnforced(s.mode) ? Math.min(now, s.scenario.timeLimitSec) : now;
      const score = getDeps().scoreGame(s.scenario.patients, s.tags, s.exams, elapsed, s.tagEvents, {
        mode: gameProtocol(s),
        sort: { walkersCalled: s.walkersCalled, waversCalled: s.waversCalled, approachOrder: s.approachOrder },
      });
      view?.focusPatient(null);
      set({ score, selectedId: null, approachingId: null, phase: 'debrief' });
    },

    /** Ta sama sytuacja jeszcze raz (ten sam kod → identyczni pacjenci). */
    restart() {
      const code = get().scenario?.code;
      if (code) get().playCode(code);
      else get().goToBriefing();
    },

    toMenu() {
      stopClock();
      set({ ...freshRound, phase: 'menu' });
    },
  };
});
