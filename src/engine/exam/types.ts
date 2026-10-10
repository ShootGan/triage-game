/** Czynności, które gracz może wykonać przy pacjencie. */
export type ExamActionId =
  | 'breathing'        // ocena oddechu (czy oddycha + częstość)
  | 'airway'           // udrożnienie dróg oddechowych
  | 'rescue-breaths'   // 5 oddechów ratowniczych (dzieci)
  | 'pulse'            // tętno obwodowe (promieniowe)
  | 'crt'              // nawrót kapilarny
  | 'commands'         // proste polecenia
  | 'avpu'             // ocena AVPU (dzieci)
  | 'bleeding';        // tamowanie krwotoku (opaska uciskowa / ucisk)

/** Stan badania jednego pacjenta (to, co gracz już zrobił). */
export interface PatientExamState {
  airwayOpened: boolean;
  rescueBreathsGiven: boolean;
  bleedingControlled: boolean;
  /** Kolejne wykonane czynności z wynikami. */
  log: ExamResult[];
}

export interface ExamResult {
  action: ExamActionId;
  /** Wynik do wyświetlenia, np. „Oddech: 34/min" albo „Tętno promieniowe: niewyczuwalne". */
  text: string;
  /** Ile sekund czasu gry zajęła czynność. */
  seconds: number;
}
