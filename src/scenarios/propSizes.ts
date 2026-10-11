/**
 * Rekwizyty scenariuszy i ich obrysy na ziemi — wspólne dla świata 3D (src/world)
 * i testów scenariuszy (pacjent nie może leżeć w obrysie).
 * Wymiary to połowy długości [wzdłuż lokalnej osi X, wzdłuż lokalnej osi Z] w metrach.
 */
export type PropKind =
  | 'bus'        // autobus szkolny 10 × 2.6 m, lekko przechylony
  | 'car'        // samochód osobowy 3.6 × 1.7 m
  | 'truck'      // ciężarówka (kabina + naczepa) 9 × 2.6 m
  | 'glass'      // rozsypane szkło (bez obrysu, można po nim chodzić)
  | 'rubble'     // gruzowisko ok. 3 × 3 m (cegły, belki)
  | 'building'   // fasada kamienicy z zawaloną częścią, 12 × 8 m, wys. ~9 m
  | 'stage'      // scena koncertowa z dachem 10 × 6 m
  | 'barrier'    // segment barierek koncertowych 4 × 0.6 m
  | 'bleachers'  // zawalona trybuna 8 × 4 m
  | 'tent'       // namiot / pawilon 3 × 3 m
  | 'ambulance'  // karetka ZRM 6.2 × 2.5 m
  | 'cargo'      // rozsypany ładunek (kartony, palety) — niski, bez obrysu
  | 'skid'       // ślady hamowania na asfalcie — bez obrysu
  | 'spill'      // plama paliwa/płynów — bez obrysu
  | 'triangle'   // trójkąt ostrzegawczy — bez obrysu
  | 'firetruck'  // fire engine (PSP) 8 × 2.5 m
  | 'police'     // police car 3.8 × 1.9 m
  | 'speaker'    // concert speaker tower (truss + line array) on a 1.2 × 1.2 m base
  | 'stall'      // festival stall with awning 2.4 × 1.4 m (variant 'balloons' | 'food')
  | 'litter'     // cups, bottles, lost items — flat, no footprint
  | 'belongings' // scattered backpacks, jackets, books — flat, no footprint
  | 'dust'       // dust cloud (variant 'smoke' — dark rising column) — no footprint
  | 'cones';     // row of 4 traffic cones along local z (~3 m), closing a lane — no footprint

export const PROP_HALF_SIZE: Record<PropKind, [number, number] | null> = {
  bus: [5.2, 1.5],
  car: [1.9, 0.95],
  truck: [4.6, 1.4],
  glass: null,
  rubble: [1.5, 1.5],
  building: [6, 4],
  stage: [5, 3],
  barrier: [2, 0.3],
  bleachers: [4, 2],
  tent: [1.5, 1.5],
  ambulance: [3.1, 1.25],
  cargo: null,
  skid: null,
  spill: null,
  triangle: null,
  firetruck: [4.1, 1.3],
  police: [1.9, 0.95],
  speaker: [0.6, 0.6],
  stall: [1.2, 0.7],
  litter: null,
  belongings: null,
  dust: null,
  cones: null,
};

/** Czy punkt (x, z) leży w obrysie rekwizytu (z marginesem). */
export function insidePropFootprint(
  kind: PropKind, px: number, pz: number, rotY: number, x: number, z: number, margin = 0,
): boolean {
  const f = PROP_HALF_SIZE[kind];
  if (!f) return false;
  const dx = x - px;
  const dz = z - pz;
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  return Math.abs(lx) < f[0] + margin && Math.abs(lz) < f[1] + margin;
}
