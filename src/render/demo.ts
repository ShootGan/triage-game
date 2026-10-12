// Strona deweloperska do weryfikacji warstwy 3D: /render-demo.html
import type { Vitals } from '../engine/triage';
import type { Scenario, ScenarioPatient, TerrainKind } from '../scenarios/types';
import { GameView } from './GameView';

function vitals(o: Partial<Vitals> & { rate?: number; spontaneous?: boolean } = {}): Vitals {
  const { rate = 18, spontaneous = true, ...rest } = o;
  return {
    canWalk: false,
    breathing: { spontaneous, afterAirway: spontaneous, rate: spontaneous ? rate : 0 },
    peripheralPulse: true,
    crtSeconds: 1.5,
    obeysCommands: true,
    avpu: 'A',
    ...rest,
  };
}

type P = Omit<ScenarioPatient, 'injuries' | 'label' | 'appearsChild'> & Partial<ScenarioPatient>;
const pt = (p: P): ScenarioPatient => ({ label: p.id, injuries: [], appearsChild: p.appearance.child, ...p });

const crashScenario: Scenario = {
  id: 'demo',
  title: 'Demo renderu',
  briefing: 'Zderzenie autobusu szkolnego z samochodem osobowym.',
  timeLimitSec: 600,
  collectionPoint: [9, 9],
  props: [
    { kind: 'bus', position: [-5, -0.8], rotation: 0.3 },
    { kind: 'car', position: [5, -1.6], rotation: -0.9 },
    { kind: 'glass', position: [3, -0.2], rotation: 0 },
  ],
  patients: [
    pt({
      id: 'p1', label: 'Mężczyzna, ok. 40 lat', ageYears: 40, majorBleeding: true, vitals: vitals({ rate: 32, crtSeconds: 3 }),
      appearance: { sex: 'm', child: false, skin: '#f1c27d', hair: '#4a3020', hairStyle: 'short', beard: true, shirt: '#3b5dc9', pants: '#41506b' },
      pose: 'back', position: [2.2, 4.6], rotation: 0.5,
    }),
    pt({
      id: 'p2', label: 'Dziewczynka, ok. 7 lat', ageYears: 7, vitals: vitals({ rate: 40, obeysCommands: false, avpu: 'V' }),
      appearance: { sex: 'f', child: true, skin: '#f1c27d', hair: '#e0b050', hairStyle: 'ponytail', shirt: '#f2a23c', pants: '#c04a7a' },
      pose: 'back', position: [-1.4, 4.9], rotation: -0.7,
    }),
    pt({
      id: 'p3', label: 'Kobieta, ok. 30 lat', ageYears: 30, vitals: vitals({ rate: 12, avpu: 'P', obeysCommands: false }),
      appearance: { sex: 'f', child: false, skin: '#f1c27d', hair: '#1a1c2c', hairStyle: 'long', shirt: '#7a3b8a', pants: '#333c57', sleeves: 'long' },
      pose: 'front', position: [-6, 4.2], rotation: 1.9,
    }),
    pt({
      id: 'p4', label: 'Chłopiec, ok. 9 lat', ageYears: 9, vitals: vitals({ canWalk: true, rate: 24 }),
      appearance: { sex: 'm', child: true, skin: '#f1c27d', hair: '#3a2a20', hairStyle: 'short', shirt: '#3fa34d', pants: '#41506b' },
      pose: 'sitting', position: [6.5, 4.4], rotation: -2.4,
    }),
    pt({
      id: 'p5', label: 'Mężczyzna, ok. 65 lat', ageYears: 65, vitals: vitals({ spontaneous: false, peripheralPulse: false, avpu: 'U', obeysCommands: false }),
      appearance: { sex: 'm', child: false, skin: '#c68e5f', hair: '#b8b8b8', hairStyle: 'bald', shirt: '#d0d0d0', pants: '#333c57', sleeves: 'long' },
      pose: 'back', position: [2, -4.8], rotation: 2.6,
    }),
    pt({
      id: 'p6', label: 'Kobieta, ok. 25 lat', ageYears: 25, vitals: vitals({ canWalk: true, rate: 20 }),
      appearance: { sex: 'f', child: false, skin: '#f1c27d', hair: '#6a4a30', hairStyle: 'long', shirt: '#e0d050', pants: '#41506b' },
      pose: 'standing', position: [8.5, 6.5], rotation: -2.6,
    }),
  ],
};

// Przegląd wszystkich rekwizytów z pacjentami tuż przy obrysach (skala i obrysy).
const look = (shirt: string, o: Partial<ScenarioPatient['appearance']> = {}): ScenarioPatient['appearance'] => ({
  sex: 'm', child: false, skin: '#f1c27d', hair: '#4a3020', hairStyle: 'short', shirt, pants: '#41506b', ...o,
});
const propsScenario: Scenario = {
  id: 'demo-props',
  title: 'Demo rekwizytów',
  briefing: 'Wszystkie rekwizyty.',
  timeLimitSec: 600,
  collectionPoint: [17, 9],
  props: [
    { kind: 'building', position: [-15, -10], rotation: 0 },
    { kind: 'stage', position: [0, -10], rotation: 0 },
    { kind: 'bleachers', position: [13, -10], rotation: 0 },
    { kind: 'truck', position: [-12, 0], rotation: 0 },
    { kind: 'car', position: [-3, 0], rotation: 0 },
    { kind: 'bus', position: [8, 0], rotation: 0 },
    { kind: 'rubble', position: [-14, 8], rotation: 0.3 },
    { kind: 'tent', position: [-7, 8], rotation: 0 },
    { kind: 'barrier', position: [0, 8], rotation: 0 },
    { kind: 'barrier', position: [5, 8], rotation: 0.5 },
    { kind: 'glass', position: [10, 8], rotation: 0 },
  ],
  patients: [
    pt({ id: 'bud', ageYears: 40, vitals: vitals(), appearance: look('#3b5dc9'), pose: 'back', position: [-13, -5.2], rotation: Math.PI / 2 }),
    pt({ id: 'scn', ageYears: 22, vitals: vitals(), appearance: look('#7a3b8a', { sex: 'f', hairStyle: 'long' }), pose: 'front', position: [1, -6.3], rotation: Math.PI / 2 }),
    pt({ id: 'trb', ageYears: 30, vitals: vitals(), appearance: look('#e0d050'), pose: 'sitting', position: [13, -7.3], rotation: 0 }),
    pt({ id: 'trk', ageYears: 50, vitals: vitals({ canWalk: true }), appearance: look('#3fa34d'), pose: 'standing', position: [-12, 1.8], rotation: 0.6 }),
    pt({ id: 'bus', ageYears: 9, vitals: vitals(), appearance: look('#f2a23c', { child: true }), pose: 'back', position: [8, 2.1], rotation: Math.PI / 2 }),
    pt({ id: 'gruz', ageYears: 60, vitals: vitals(), appearance: look('#d0d0d0', { hairStyle: 'bald' }), pose: 'back', position: [-11.9, 8.4], rotation: 0 }),
    pt({ id: 'nam', ageYears: 35, vitals: vitals({ canWalk: true }), appearance: look('#c04a4a'), pose: 'standing', position: [-7, 10], rotation: 0 }),
    pt({ id: 'bar', ageYears: 19, vitals: vitals(), appearance: look('#3b9dc9', { sex: 'f', hairStyle: 'ponytail' }), pose: 'back', position: [0, 9.0], rotation: Math.PI / 2 }),
  ],
};

/** Pojazdy i detale karambolu: wszystkie warianty aut, ciężarówka w scyzoryk, karetka, ładunek, ślady, plama, trójkąty. */
const vehiclesScenario: Scenario = {
  id: 'demo-vehicles',
  title: 'Demo pojazdów',
  briefing: 'Warianty pojazdów.',
  timeLimitSec: 600,
  terrain: 'highway',
  collectionPoint: [14, 7.5],
  props: [
    { kind: 'car', position: [-12, -3.5], rotation: 0, variant: 'sedan', color: '#2f4f8a' },
    { kind: 'car', position: [-7, -3.5], rotation: 0, variant: 'hatch', color: '#b03a3a' },
    { kind: 'car', position: [-2, -3.5], rotation: 0, variant: 'suv', color: '#1e1e24' },
    { kind: 'car', position: [3, -3.5], rotation: 0, variant: 'van', color: '#d8d2c0' },
    { kind: 'car', position: [-12, 0.5], rotation: 0, variant: 'sedan-crash', color: '#c8c8cc' },
    { kind: 'car', position: [-7, 0.5], rotation: 0, variant: 'hatch-crash', color: '#e8e8ea' },
    { kind: 'car', position: [-2, 0.5], rotation: 0, variant: 'suv-crash', color: '#3f7a4a' },
    { kind: 'car', position: [3, 0.5], rotation: 0, variant: 'van-crash', color: '#8a5a2a' },
    { kind: 'car', position: [8, 0.5], rotation: 0.3, variant: 'roof', color: '#b03a3a' },
    { kind: 'truck', position: [9, -3.5], rotation: 0, variant: 'jackknife' },
    { kind: 'ambulance', position: [0, 3.4], rotation: 0 },
    { kind: 'cargo', position: [-9, 3.4], rotation: 0 },
    { kind: 'skid', position: [4, 3.2], rotation: 0 },
    { kind: 'spill', position: [11, 3.3], rotation: 0 },
    { kind: 'triangle', position: [-15, 3.5], rotation: Math.PI / 2 },
  ],
  patients: [
    pt({ id: 'v1', ageYears: 40, vitals: vitals({ canWalk: true }), appearance: look('#3fa34d'), pose: 'standing', position: [-4.5, -1.5], rotation: 0.4 }),
    pt({ id: 'v2', ageYears: 30, vitals: vitals(), appearance: look('#7a3b8a', { sex: 'f', hairStyle: 'long' }), pose: 'back', position: [6, -1.5], rotation: Math.PI / 2 }),
    pt({ id: 'karetka', ageYears: 35, vitals: vitals({ canWalk: true }), appearance: look('#d6303a'), pose: 'standing', position: [4.2, 5.6], rotation: Math.PI }),
  ],
};

/** New models: emergency vehicles, crashed bus, event equipment and scattered details. Patients double as zoom targets. */
const modelsScenario: Scenario = {
  id: 'demo-models',
  title: 'Demo modeli',
  briefing: 'Nowe modele.',
  timeLimitSec: 600,
  collectionPoint: [16, 9],
  props: [
    { kind: 'firetruck', position: [-10, -4], rotation: 0 },
    { kind: 'police', position: [-2, -4], rotation: 0 },
    { kind: 'bus', position: [7, -4], rotation: 0, variant: 'crash' },
    { kind: 'speaker', position: [15, -4], rotation: 0 },
    { kind: 'stall', position: [-12, 5], rotation: 0, variant: 'balloons' },
    { kind: 'stall', position: [-7, 5], rotation: 0, variant: 'food' },
    { kind: 'litter', position: [-1, 5], rotation: 0 },
    { kind: 'belongings', position: [5, 5], rotation: 0 },
    { kind: 'barrier', position: [10, 5], rotation: 0, variant: 'down' },
    { kind: 'dust', position: [-16, -12], rotation: 0 },
    { kind: 'dust', position: [4, -13], rotation: 0, variant: 'smoke' },
  ],
  patients: [
    pt({ id: 'psp', ageYears: 40, vitals: vitals({ canWalk: true }), appearance: look('#3fa34d'), pose: 'standing', position: [-10, -1.8], rotation: 0 }),
    pt({ id: 'policja', ageYears: 40, vitals: vitals({ canWalk: true }), appearance: look('#3b5dc9'), pose: 'standing', position: [-2, -2.2], rotation: 0 }),
    pt({ id: 'autobus', ageYears: 9, vitals: vitals(), appearance: look('#f2a23c', { child: true }), pose: 'back', position: [12.6, -2.6], rotation: 0 }),
    pt({ id: 'glosnik', ageYears: 22, vitals: vitals({ canWalk: true }), appearance: look('#7a3b8a', { sex: 'f', hairStyle: 'long' }), pose: 'standing', position: [16.5, -2.5], rotation: 0 }),
    pt({ id: 'stragany', ageYears: 30, vitals: vitals({ canWalk: true }), appearance: look('#e0d050'), pose: 'standing', position: [-9.5, 7], rotation: 0 }),
    pt({ id: 'smieci', ageYears: 19, vitals: vitals(), appearance: look('#3b9dc9', { sex: 'f', hairStyle: 'ponytail' }), pose: 'back', position: [1.8, 7.5], rotation: 0 }),
    pt({ id: 'bariera', ageYears: 25, vitals: vitals(), appearance: look('#c04a4a'), pose: 'front', position: [10, 7.5], rotation: 0 }),
    pt({ id: 'dym', ageYears: 50, vitals: vitals({ canWalk: true }), appearance: look('#d0d0d0'), pose: 'standing', position: [-8, -9.5], rotation: 0 }),
  ],
};

/** Injury visuals read from the injury texts (src/scenarios/injuryLook.ts): bleeding sites, amputations, burns, soot, dust, impaled objects. */
const inj = (id: string, x: number, injuries: string[], o: Partial<ScenarioPatient> = {}, shirt = '#3b5dc9'): ScenarioPatient =>
  pt({ id, ageYears: 35, vitals: vitals(), appearance: look(shirt), pose: 'back', position: [x, 0], rotation: Math.PI / 2, injuries, ...o });
const injuriesScenario: Scenario = {
  id: 'demo-injuries',
  title: 'Demo obrażeń',
  briefing: 'Wygląd obrażeń.',
  timeLimitSec: 600,
  collectionPoint: [14, 8],
  props: [],
  patients: [
    inj('udo-L', -12, ['rana szarpana uda lewego z obfitym, pulsującym krwawieniem — kałuża krwi'], { majorBleeding: true }),
    inj('podudzie', -9, ['rana szarpana podudzia lewego z obfitym krwawieniem — przesiąknięta nogawka'], { majorBleeding: true }),
    inj('ramie', -6, ['głęboka rana ramienia prawego z tryskającym krwawieniem — kałuża krwi'], { majorBleeding: true }),
    inj('przedramie', -3, ['rana cięta przedramienia od szkła, krew tryska strumieniem'], { majorBleeding: true }, '#e0d050'),
    inj('amp-stopa', 0, ['amputacja urazowa stopy prawej, obfite krwawienie z kikuta'], { majorBleeding: true }),
    inj('amp-podudzie', 3, ['amputacja urazowa podudzia lewego poniżej kolana, obfite krwawienie'], { majorBleeding: true }, '#3fa34d'),
    inj('amp-dlon', 6, ['częściowa amputacja przedramienia prawego, tryskające krwawienie'], { majorBleeding: true }, '#d0d0d0'),
    inj('oparzenia', 9, ['rozległe oparzenia II i III stopnia tułowia i ramion', 'oparzenia twarzy i szyi, osmalone brwi i rzęsy'], {}, '#7a3b8a'),
    inj('nogi-nadpalone', 12, ['oparzenia II stopnia podudzia lewego i stopy, nadpalone nogawki', 'osmalone brwi i włosy']),
    inj('sadza', -12, ['sadza wokół nosa i ust, bez oparzeń skóry'], { position: [-12, 4] }, '#d0d0d0'),
    inj('pyl', -9, ['twarz, usta i nos zasypane pyłem'], { position: [-9, 4] }, '#c04a4a'),
    inj('szklo-udo', -6, ['kawałek szkła wbity w udo prawe, niewielkie krwawienie wokół — nie usuwać'], { position: [-6, 4] }),
    inj('pret-lydka', -3, ['metalowy odłamek wbity w łydkę lewą, krwawienie sączące'], { position: [-3, 4] }, '#e0d050'),
    inj('pret-posladek', 0, ['pręt wbity w pośladek, niewielkie krwawienie — nie usuwać'], { position: [0, 4], pose: 'front' }, '#3fa34d'),
  ],
};

const canvas = document.getElementById('c') as HTMLCanvasElement;
const markerLayer = document.getElementById('markers') as HTMLDivElement;
const bar = document.getElementById('bar') as HTMLDivElement;
const log = document.getElementById('log') as HTMLDivElement;

// stan demo — z parametrów URL (?terrain=street&scene=props&fp=1), żeby łatwo linkować widoki
const params = new URLSearchParams(location.search);
let terrain: TerrainKind = (['road', 'street', 'field', 'highway', 'railway', 'snow'] as const).find((t) => t === params.get('terrain')) ?? 'road';
type SceneKind = 'crash' | 'props' | 'vehicles' | 'models' | 'injuries';
let sceneKind: SceneKind = (['props', 'vehicles', 'models', 'injuries'] as const).find((k) => k === params.get('scene')) ?? 'crash';
let showFootprints = params.get('fp') !== '0';

let view: GameView;
let scenario: Scenario;
let selected: string | null = null;
const markers = new Map<string, HTMLDivElement>();

function mount(): void {
  view?.dispose();
  scenario = sceneKind === 'vehicles'
    ? vehiclesScenario
    : sceneKind === 'injuries'
    ? injuriesScenario
    : sceneKind === 'models'
    ? modelsScenario
    : { ...(sceneKind === 'props' ? propsScenario : crashScenario), terrain };
  view = new GameView(canvas, scenario, { debugFootprints: showFootprints });
  markerLayer.replaceChildren();
  markers.clear();
  for (const p of scenario.patients) {
    const el = document.createElement('div');
    el.className = 'mk';
    const s = document.createElement('span');
    s.textContent = p.id;
    el.append(s);
    markerLayer.append(el);
    markers.set(p.id, el);
  }
  view.onFrame(() => {
    const pos = view.getPatientScreenPositions();
    for (const [id, el] of markers) {
      const p = pos[id];
      el.style.display = p && p.visible ? '' : 'none';
      if (p) el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
    }
  });
  view.onPatientClick((id) => {
    selected = id;
    log.textContent = `klik: ${id}`;
    view.focusPatient(id);
  });
  selected = null;
  renderBar();
  const q = new URLSearchParams({ terrain, scene: sceneKind, fp: showFootprints ? '1' : '0' });
  history.replaceState(null, '', `?${q}`);
  // dostęp z konsoli przy debugowaniu
  (window as unknown as { gameView: GameView }).gameView = view;
}

function button(label: string, fn: () => void, active = false): void {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = fn;
  if (active) b.style.background = '#5a6988';
  bar.append(b);
}

function renderBar(): void {
  bar.replaceChildren();
  for (const t of ['road', 'street', 'field', 'highway', 'railway', 'snow'] as const) button(t, () => { terrain = t; mount(); }, t === terrain);
  button('Wypadek', () => { sceneKind = 'crash'; mount(); }, sceneKind === 'crash');
  button('Rekwizyty', () => { sceneKind = 'props'; mount(); }, sceneKind === 'props');
  button('Pojazdy', () => { sceneKind = 'vehicles'; mount(); }, sceneKind === 'vehicles');
  button('Nowe modele', () => { sceneKind = 'models'; mount(); }, sceneKind === 'models');
  button('Obrażenia', () => { sceneKind = 'injuries'; mount(); }, sceneKind === 'injuries');
  button('Obrysy', () => { showFootprints = !showFootprints; mount(); }, showFootprints);
  button('Przegląd', () => { selected = null; view.focusPatient(null); });
  if (sceneKind === 'models') {
    // one button per model: frame it from a closer, steeper camera
    for (const pr of scenario.props) {
      const big = ['firetruck', 'bus', 'dust'].includes(pr.kind);
      button(`🔍 ${pr.kind}${pr.variant ? `/${pr.variant}` : ''}`, () => view.lookAt(pr.position[0], pr.position[1], big ? 5 : 3, 35));
    }
  } else {
    for (const p of scenario.patients) button(p.id, () => { selected = p.id; view.focusPatient(p.id); });
  }
  button('Chodzący do mnie', () => view.sendWalkersToCollectionPoint());
  if (sceneKind === 'injuries') {
    for (const p of scenario.patients) button(`🔍 ${p.id}`, () => view.lookAt(p.position[0], p.position[1], 1.4, 40));
    button('Zatamuj wszystkie', () => scenario.patients.forEach((p) => p.majorBleeding && view.setBleedingControlled(p.id)));
    button('Pomachaj (SALT)', () => view.wave(scenario.patients.map((p) => p.id)));
  }
  if (sceneKind === 'crash') {
    button('Zatamuj krwotok', () => view.setBleedingControlled('p1'));
    button('Tag red', () => view.setTag(selected ?? 'p1', 'red'));
    button('Tag yellow', () => view.setTag(selected ?? 'p2', 'yellow'));
    button('Tag zdejmij', () => view.setTag(selected ?? 'p1', null));
  }
  button('Dispose', () => view.dispose());
}

mount();
