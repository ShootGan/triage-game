/** `grey` (expectant) exists only in SALT. */
export type TriageCategory = 'green' | 'yellow' | 'red' | 'black' | 'grey';

/** Categories of START / JumpSTART (no expectant). */
export type StartCategory = Exclude<TriageCategory, 'grey'>;

export type Protocol = 'START' | 'JumpSTART' | 'SALT';

/** Algorithm family chosen for a game: START (with JumpSTART for children) or SALT. */
export type ProtocolMode = 'START' | 'SALT';

/** SALT facts that come from the casualty description, not from an exam (judgement calls). */
export interface SaltInfo {
  /** Minor injuries only (self-limited without treatment) — MINIMAL instead of DELAYED. */
  minorOnly?: boolean;
  /** Unlikely to survive given current resources — EXPECTANT. */
  expectant?: boolean;
  /** Tension pneumothorax: needle decompression is a life-saving intervention in SALT. */
  tensionPneumothorax?: boolean;
}

export type Avpu = 'A' | 'V' | 'P' | 'U';

/** Stan kliniczny pacjenta w chwili oceny — wejście dla algorytmów. */
export interface Vitals {
  canWalk: boolean;
  /** Dziecko, które nie chodzi z powodu wieku rozwojowego (niemowlę), a nie z powodu urazu. */
  nonAmbulatoryByAge?: boolean;
  breathing: {
    spontaneous: boolean;
    /** Czy oddycha po udrożnieniu dróg oddechowych (istotne tylko, gdy !spontaneous). */
    afterAirway: boolean;
    /** JumpSTART: czy oddycha po 5 oddechach ratowniczych (istotne, gdy !afterAirway i jest tętno). */
    afterRescueBreaths?: boolean;
    /** Oddechy na minutę (po ewentualnym udrożnieniu). */
    rate: number;
    irregular?: boolean;
  };
  /** Wyczuwalne tętno obwodowe (u dorosłych: na tętnicy promieniowej). */
  peripheralPulse: boolean;
  /** Nawrót kapilarny w sekundach. */
  crtSeconds: number;
  obeysCommands: boolean;
  avpu: Avpu;
  /** Przy AVPU = P: czy reakcja na ból jest adekwatna (lokalizuje / odsuwa), a nie np. ułożenie patologiczne. */
  painResponseAppropriate?: boolean;
  /** JumpSTART, niemowlęta: istotne obrażenia zewnętrzne. */
  significantExternalInjury?: boolean;
}

export type StepId =
  | 'walk'
  | 'breathing'
  | 'airway'
  | 'apneic-pulse'
  | 'rescue-breaths'
  | 'resp-rate'
  | 'perfusion'
  | 'mental'
  | 'infant-injury'
  // SALT
  | 'lsi'
  | 'salt-breathing'
  | 'salt-criteria'
  | 'salt-minor'
  | 'salt-survive';

/** Jeden krok ścieżki decyzji — do debriefu. */
export interface DecisionStep {
  id: StepId;
  question: string;
  answer: string;
  /** Kategoria, jeśli ten krok zakończył algorytm. */
  result?: TriageCategory;
}

export interface TriageResult {
  protocol: Protocol;
  category: TriageCategory;
  steps: DecisionStep[];
}

export const CATEGORY_LABEL: Record<TriageCategory, string> = {
  green: 'ZIELONY',
  yellow: 'ŻÓŁTY',
  red: 'CZERWONY',
  black: 'CZARNY',
  grey: 'SZARY',
};
