import type { ProtocolMode, SaltInfo, Vitals } from '../engine/triage';
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
  /** SALT judgement facts from the description (minor injuries only, expectant, tension pneumothorax). */
  salt?: SaltInfo;
  /**
   * Trapped in a vehicle being cut open by firefighters: sits in the driver's seat (see `driverSeat`),
   * may be inside the car's footprint, can't walk. Exam works as usual (roof already removed).
   */
  trapped?: boolean;
  /**
   * Found in freezing cold: capillary refill on the hands is falsely prolonged in everyone, so CRT reads
   * long regardless of perfusion and only the radial pulse counts as a perfusion check.
   */
  cold?: boolean;
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
  /**
   * Wariant modelu. Auto: 'sedan' | 'hatch' | 'suv' | 'van', z dopiskiem '-crash' (zgnieciony przód) lub 'roof'
   * (na dachu); domyślnie losowany z pozycji. Ciężarówka: 'jackknife' (złożona w scyzoryk).
   * Bus: 'crash' (crumpled front, cracked windscreen, hazard lights). Barrier: 'down' (knocked over).
   * Stall: 'balloons' | 'food'. Dust: 'smoke'. Train: 'upright' | 'derailed' | 'crash'.
   */
  variant?: string;
}

/**
 * Otoczenie:
 * - 'road'   — trawa + droga wzdłuż osi X (|z| < 3) z krawężnikami (domyślne, jak w scenariuszu autobusu)
 * - 'street' — ulica w mieście: jezdnia wzdłuż osi X (|z| < 3), chodniki z płyt 3 < |z| < 6, dalej bruk/plac
 * - 'field'  — plener: trawa bez drogi, utwardzona alejka wzdłuż osi X (|z| < 1)
 * - 'highway' — autostrada: jezdnia −5,6 < z < 4,6 (2 pasy + pas awaryjny przy z > 1,9), pas rozdziału z trawą
 *               i podwójną stalową barierą przy z ≈ −7,5, przeciwna jezdnia z < −9,4; za poboczem trawa,
 *               bariera na poboczu (z ≈ 5,1) tylko przy |x| > 11
 * - 'railway' — railway embankment along X (track at z = −6, crest −8 < z < −4, slopes down to z = −10 and z = −2),
 *               catenary masts behind the track, flat grass in front, dirt service road at 9,2 < z < 12,6
 *               (see RAILWAY in propSizes.ts)
 * - 'snow'   — zima: odśnieżony plac/parking przed halą (−8 < z < 6) i droga dojazdowa (6 < z < 12) wzdłuż X,
 *               dalej śnieg, pryzmy odgarniętego śniegu, ośnieżone drzewa i latarnie
 */
export type TerrainKind = 'road' | 'street' | 'field' | 'highway' | 'railway' | 'snow';

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
  /** Half-extents [x, z] of the area patients may occupy; default [12, 9] (validate.ts). Larger for big scenes. */
  bounds?: [number, number];
  /** Algorithm the game is scored with; from the code suffix (KAMIENICA-4F7K-SALT). Default START. */
  protocol?: ProtocolMode;
  /** Punkt zbiórki dla chodzących (x, z). */
  collectionPoint: [number, number];
  props: ScenarioProp[];
  patients: ScenarioPatient[];
}
