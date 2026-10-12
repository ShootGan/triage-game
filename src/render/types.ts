import type { TriageCategory } from '../engine/triage';
import type { Scenario } from '../scenarios/types';

export interface ScreenPoint {
  x: number;       // px względem lewego górnego rogu canvasa (CSS)
  y: number;
  visible: boolean;
}

/** Marginesy ekranu zasłonięte przez interfejs (px CSS od krawędzi canvasa). */
export interface ViewInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Kontrakt warstwy 3D. Implementacja: src/render/GameView.ts
 * UI (React) tworzy GameView na <canvas> i rozmawia z nim tylko przez to API.
 */
export interface IGameView {
  /** Pozycje ekranowe pacjentów (nad tułowiem) — dla znaczników triage w UI. Wołane co klatkę. */
  getPatientScreenPositions(): Record<string, ScreenPoint>;
  /**
   * Zbliżenie kamery na pacjenta (widok badania) lub powrót do przeglądu (null). Płynna animacja.
   * onArrive — wywoływane, gdy ratownik dojdzie do pacjenta (nie jest wywoływane, jeśli w międzyczasie
   * wybrano innego pacjenta lub wrócono do przeglądu).
   */
  focusPatient(id: string | null, onArrive?: () => void): void;
  /** Kliknięcie pacjenta na scenie. */
  onPatientClick(cb: (id: string) => void): void;
  /** Wywoływane po każdej narysowanej klatce (np. do aktualizacji znaczników). */
  onFrame(cb: () => void): void;
  /** Komenda „Kto może chodzić — do mnie!": chodzący (vitals.canWalk) wstają i idą do punktu zbiórki. */
  sendWalkersToCollectionPoint(): void;
  /** SALT sort: these casualties raise an arm and wave (they can hear and move purposefully). */
  wave(ids: string[]): void;
  /** Zatamowany krwotok: kałuża przestaje rosnąć, na kończynie pojawia się opaska uciskowa. */
  setBleedingControlled(id: string): void;
  /** Opcjonalne podświetlenie kategorii na postaci (np. kolorowa opaska na ramieniu). */
  setTag(id: string, category: TriageCategory | null): void;
  /**
   * Opcjonalne: obszar ekranu zasłonięty przez UI (HUD u góry, panel badania z prawej lub od dołu).
   * Kadr przeglądu i badania jest centrowany w odsłoniętej części. Wołane po każdej zmianie układu.
   */
  setViewInsets?(insets: ViewInsets): void;
  dispose(): void;
}

export type GameViewFactory = (canvas: HTMLCanvasElement, scenario: Scenario) => IGameView;
