import type { Vitals } from '../engine/triage';
import type { PropKind } from './propSizes';

export type { PropKind } from './propSizes';

/** Wygląd postaci — parametry generatora proceduralnego (src/world). */
export interface PatientAppearance {
  sex: 'm' | 'f';
  child: boolean;
  skin: string;          // kolor hex, np. '#f1c27d'
  hair: string;
  hairStyle: 'short' | 'long' | 'ponytail' | 'bald' | 'none';
  beard?: boolean;
  shirt: string;
  pants: string;
  sleeves?: 'short' | 'long';
  /** Widoczna ciąża (zaokrąglony brzuch) — tylko dorosłe kobiety. */
  pregnant?: boolean;
}

export type PatientPose = 'back' | 'front' | 'sitting' | 'standing';

export interface ScenarioPatient {
  id: string;
  /** Opis widoczny dla gracza, np. „Mężczyzna, ok. 40 lat". */
  label: string;
  ageYears: number;
  /** Decyduje o algorytmie: true → JumpSTART. */
  appearsChild: boolean;
  vitals: Vitals;
  /** Widoczne obrażenia (opis do panelu badania), np. „rana uda z obfitym krwawieniem". */
  injuries: string[];
  /** Masywny krwotok zewnętrzny — kałuża krwi na scenie; da się zatamować. */
  majorBleeding?: boolean;
  /** Co mówi/robi pacjent, gdy gracz podchodzi (opcjonalny „klimat"). */
  remark?: string;
  appearance: PatientAppearance;
  pose: PatientPose;
  /** Pozycja na scenie (x, z) w metrach. Droga biegnie wzdłuż osi X, |z| < 3. */
  position: [number, number];
  /** Obrót wokół osi Y w radianach. */
  rotation: number;
}

export interface ScenarioProp {
  kind: PropKind;
  position: [number, number];
  rotation: number;
  /** Kolor nadwozia (pojazdy) — domyślnie wg rodzaju (autobus szkolny żółty). */
  color?: string;
}

/**
 * Otoczenie:
 * - 'road'   — trawa + droga wzdłuż osi X (|z| < 3) z krawężnikami (domyślne, jak w scenariuszu autobusu)
 * - 'street' — ulica w mieście: jezdnia wzdłuż osi X (|z| < 3), chodniki z płyt 3 < |z| < 6, dalej bruk/plac
 * - 'field'  — plener: trawa bez drogi, utwardzona alejka wzdłuż osi X (|z| < 1)
 */
export type TerrainKind = 'road' | 'street' | 'field';

export interface Scenario {
  id: string;
  /**
   * Kod zadania, z którego powstał zestaw pacjentów (np. „KAMIENICA-4F7K"; „KAMIENICA-WZOR" = ręczny wzorzec).
   * Ten sam kod → identyczna sytuacja. Brak = scenariusz bazowy (wzorzec) prosto z pliku.
   */
  code?: string;
  title: string;
  /** Komunikat dyspozytora na start. */
  briefing: string;
  /** Limit czasu gry w sekundach (czas gry, nie rzeczywisty). */
  timeLimitSec: number;
  /** Scenariusz specjalny (odznaka w menu, easter egg przy ciężarnych) — wzorzec i kody losowe. */
  special?: boolean;
  /** Otoczenie (domyślnie 'road'). */
  terrain?: TerrainKind;
  /** Punkt zbiórki dla chodzących (x, z). */
  collectionPoint: [number, number];
  props: ScenarioProp[];
  patients: ScenarioPatient[];
}
