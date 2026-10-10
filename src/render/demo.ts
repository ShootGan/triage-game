// Strona deweloperska do weryfikacji warstwy 3D: /render-demo.html
import type { Vitals } from '../engine/triage';
import type { Scenario, ScenarioPatient } from '../scenarios/types';
import { createGameView } from './GameView';

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

const scenario: Scenario = {
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

const canvas = document.getElementById('c') as HTMLCanvasElement;
const markerLayer = document.getElementById('markers') as HTMLDivElement;
const bar = document.getElementById('bar') as HTMLDivElement;
const log = document.getElementById('log') as HTMLDivElement;

const view = createGameView(canvas, scenario);

const markers = new Map<string, HTMLDivElement>();
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

let selected: string | null = null;
view.onPatientClick((id) => {
  selected = id;
  log.textContent = `klik: ${id}`;
  view.focusPatient(id);
});

function button(label: string, fn: () => void): void {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = fn;
  bar.append(b);
}
button('Przegląd', () => { selected = null; view.focusPatient(null); });
for (const p of scenario.patients) button(p.id, () => { selected = p.id; view.focusPatient(p.id); });
button('Chodzący do mnie', () => view.sendWalkersToCollectionPoint());
button('Zatamuj krwotok', () => view.setBleedingControlled('p1'));
button('Tag red', () => view.setTag(selected ?? 'p1', 'red'));
button('Tag yellow', () => view.setTag(selected ?? 'p2', 'yellow'));
button('Tag zdejmij', () => view.setTag(selected ?? 'p1', null));
button('Dispose', () => view.dispose());

// dostęp z konsoli przy debugowaniu
(window as unknown as { gameView: typeof view }).gameView = view;
