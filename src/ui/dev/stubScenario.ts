// ATRAPA (tylko tryb ?stub) — mały scenariusz testowy dla UI.
import type { PatientAppearance, Scenario, ScenarioPatient } from '../../scenarios/types';
import type { Vitals } from '../../engine/triage';

const look = (o: Partial<PatientAppearance> = {}): PatientAppearance => ({
  sex: 'm', child: false, skin: '#f1c27d', hair: '#3b2a1a', hairStyle: 'short',
  shirt: '#55606e', pants: '#333c57', ...o,
});

const vit = (o: Partial<Vitals> & { rate?: number } = {}): Vitals => ({
  canWalk: false,
  breathing: { spontaneous: true, afterAirway: true, rate: o.rate ?? 18 },
  peripheralPulse: true,
  crtSeconds: 1.5,
  obeysCommands: true,
  avpu: 'A',
  ...o,
});

const P = (p: Omit<ScenarioPatient, 'rotation'> & { rotation?: number }): ScenarioPatient => ({ rotation: 0, ...p });

export const stubScenario: Scenario = {
  id: 'stub-bus',
  title: 'Wypadek autobusu (ATRAPA)',
  briefing:
    'ZRM S-01, zgłoszenie: zderzenie autobusu szkolnego z samochodem osobowym, droga wojewódzka 780, km 12. ' +
    'Według świadków kilkunastu poszkodowanych, w tym dzieci. Straż pożarna w drodze, ETA 6 minut. ' +
    'Jesteście pierwszym zespołem na miejscu. Przeprowadźcie segregację wstępną i przekażcie meldunek. Odbiór.',
  timeLimitSec: 300,
  collectionPoint: [8, -2],
  props: [{ kind: 'bus', position: [0, 0], rotation: 0 }],
  patients: [
    P({
      id: 'p1', label: 'Mężczyzna, ok. 40 lat', ageYears: 40, appearsChild: false,
      vitals: vit({ rate: 24, peripheralPulse: false, crtSeconds: 3 }),
      injuries: ['rana uda z obfitym krwawieniem'], majorBleeding: true,
      remark: 'Moja noga… nie czuję nogi!', appearance: look(), pose: 'back', position: [-5, 1.5],
    }),
    P({
      id: 'p2', label: 'Kobieta, ok. 30 lat', ageYears: 30, appearsChild: false,
      vitals: vit({ canWalk: true, rate: 20 }), injuries: ['otarcia przedramienia'],
      remark: 'Gdzie jest mój syn?!', appearance: look({ sex: 'f', hairStyle: 'long' }), pose: 'standing', position: [-2, -2],
    }),
    P({
      id: 'p3', label: 'Chłopiec, ok. 7 lat', ageYears: 7, appearsChild: true,
      vitals: vit({ rate: 50 }), injuries: ['zasinienie klatki piersiowej'],
      appearance: look({ child: true }), pose: 'back', position: [2, 2],
    }),
    P({
      id: 'p4', label: 'Mężczyzna, ok. 65 lat', ageYears: 65, appearsChild: false,
      vitals: vit({ breathing: { spontaneous: false, afterAirway: false, rate: 0 }, peripheralPulse: false, crtSeconds: 5, obeysCommands: false, avpu: 'U' }),
      injuries: ['rozległy uraz głowy'], appearance: look({ hairStyle: 'bald' }), pose: 'front', position: [4, -1.5],
    }),
    P({
      id: 'p5', label: 'Dziewczynka, ok. 5 lat', ageYears: 5, appearsChild: true,
      vitals: vit({ canWalk: true, rate: 26 }), injuries: [], remark: 'Mamo!',
      appearance: look({ sex: 'f', child: true, hairStyle: 'ponytail' }), pose: 'sitting', position: [-6, -2.5],
    }),
    P({
      id: 'p6', label: 'Kobieta, ok. 50 lat', ageYears: 50, appearsChild: false,
      vitals: vit({ rate: 22 }), injuries: ['zniekształcenie podudzia'], remark: 'Nie mogę wstać…',
      appearance: look({ sex: 'f', hairStyle: 'ponytail' }), pose: 'sitting', position: [6, 2.5],
    }),
  ],
};
