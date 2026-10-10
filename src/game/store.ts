import { create } from 'zustand';
import type { ExamActionId, PatientExamState } from '../engine/exam/types';
import type { GameScore } from '../engine/scoring/types';
import type { TriageCategory } from '../engine/triage';
import type { IGameView } from '../render/types';
import type { Scenario, ScenarioPatient } from '../scenarios/types';
import { getDeps } from './deps';

export type Phase = 'menu' | 'briefing' | 'playing' | 'debrief';
export type GameMode = 'learn' | 'practice' | 'exam';

export const MODE_LABEL: Record<GameMode, string> = {
  learn: 'Nauka',
  practice: 'Ćwiczenie',
  exam: 'Egzamin',
};

export interface GameState {
  phase: Phase;
  mode: GameMode;
  scenarioId: string | null;
  scenario: Scenario | null;

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
  exams: Record<string, PatientExamState | undefined>;
  walkersCalled: boolean;
  walkersGroupTagged: boolean;
  score: GameScore | null;

  setMode(mode: GameMode): void;
  setScenario(id: string): void;
  goToBriefing(): void;
  startPlaying(): void;
  selectPatient(id: string | null): void;
  doAction(action: ExamActionId): void;
  tagPatient(id: string, cat: TriageCategory): void;
  toggleHint(): void;
  callWalkers(): void;
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
  exams: {},
  walkersCalled: false,
  walkersGroupTagged: false,
  score: null,
} satisfies Partial<GameState>;

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
    hintOpen: false,
    ...freshRound,

    setMode(mode) {
      if (mode === 'exam') return; // „wkrótce"
      set({ mode });
    },

    setScenario(id) {
      set({ scenarioId: id });
    },

    goToBriefing() {
      const { scenarios } = getDeps();
      const id = get().scenarioId ?? scenarios[0]?.id;
      const scenario = scenarios.find((s) => s.id === id) ?? null;
      if (!scenario) return;
      stopClock();
      set({ ...freshRound, scenarioId: scenario.id, scenario, phase: 'briefing' });
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
      set({ selectedId: null, approachingId: id, lastVisitedId: id });
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
      const { state } = d.performAction(p, prev, action);
      set({ exams: { ...s.exams, [p.id]: state } });
      if (action === 'bleeding' && state.bleedingControlled && !prev.bleedingControlled) {
        view?.setBleedingControlled(p.id);
      }
    },

    tagPatient(id, cat) {
      const s = get();
      if (s.phase !== 'playing' || !findPatient(s, id)) return;
      set({ tags: { ...s.tags, [id]: cat } });
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

    tagWalkersGreen() {
      const s = get();
      if (s.phase !== 'playing' || !s.walkersCalled || s.walkersGroupTagged || !s.scenario) return;
      const tags = { ...s.tags };
      for (const p of s.scenario.patients) {
        // Nie nadpisujemy opasek założonych już ręcznie przez gracza.
        if (p.vitals.canWalk && !tags[p.id]) {
          tags[p.id] = 'green';
          view?.setTag(p.id, 'green');
        }
      }
      set({ tags, walkersGroupTagged: true });
    },

    endTriage() {
      const s = get();
      if (s.phase !== 'playing' || !s.scenario) return;
      stopClock();
      const now = Math.round(elapsedNow());
      const elapsed = timeLimitEnforced(s.mode) ? Math.min(now, s.scenario.timeLimitSec) : now;
      const score = getDeps().scoreGame(s.scenario.patients, s.tags, s.exams, elapsed);
      view?.focusPatient(null);
      set({ score, selectedId: null, approachingId: null, phase: 'debrief' });
    },

    restart() {
      get().goToBriefing();
    },

    toMenu() {
      stopClock();
      set({ ...freshRound, phase: 'menu' });
    },
  };
});
