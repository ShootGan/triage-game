// ATRAPA (tylko tryb ?stub) — uproszczona logika badania.
import type { ExamActionId, ExamResult, PatientExamState } from '../../engine/exam/types';
import type { ScenarioPatient } from '../../scenarios/types';

export const ACTION_LABEL: Record<ExamActionId, string> = {
  breathing: 'Ocena oddechu',
  airway: 'Udrożnij drogi oddechowe',
  'rescue-breaths': '5 oddechów ratowniczych',
  pulse: 'Tętno promieniowe',
  crt: 'Nawrót kapilarny',
  commands: 'Proste polecenia',
  avpu: 'Ocena AVPU',
  bleeding: 'Tamowanie krwotoku',
  decompression: 'Odbarcz odmę',
};

export const ACTION_SECONDS: Record<ExamActionId, number> = {
  breathing: 15, airway: 5, 'rescue-breaths': 10, pulse: 5, crt: 5, commands: 5, avpu: 5, bleeding: 20, decompression: 10,
};

export function initialExamState(): PatientExamState {
  return { airwayOpened: false, rescueBreathsGiven: false, bleedingControlled: false, log: [] };
}

export function performAction(
  p: ScenarioPatient,
  state: PatientExamState,
  action: ExamActionId,
): { state: PatientExamState; result: ExamResult } {
  const v = p.vitals;
  const s: PatientExamState = { ...state, log: [...state.log] };
  let text = '';
  switch (action) {
    case 'breathing': {
      const breathes = v.breathing.spontaneous || (s.airwayOpened && v.breathing.afterAirway);
      text = breathes ? `Oddech: ${v.breathing.rate}/min` : 'Brak oddechu';
      break;
    }
    case 'airway':
      s.airwayOpened = true;
      text = v.breathing.spontaneous || v.breathing.afterAirway ? 'Drogi oddechowe udrożnione — oddycha' : 'Drogi oddechowe udrożnione — nadal nie oddycha';
      break;
    case 'rescue-breaths':
      s.rescueBreathsGiven = true;
      text = v.breathing.afterRescueBreaths ? 'Po oddechach ratowniczych: oddycha' : 'Po oddechach ratowniczych: brak oddechu';
      break;
    case 'pulse':
      text = `Tętno promieniowe: ${v.peripheralPulse ? 'wyczuwalne' : 'niewyczuwalne'}`;
      break;
    case 'crt':
      text = `Nawrót kapilarny: ${v.crtSeconds} s`;
      break;
    case 'commands':
      text = v.obeysCommands ? 'Wykonuje proste polecenia' : 'Nie wykonuje poleceń';
      break;
    case 'avpu':
      text = `AVPU: ${v.avpu}`;
      break;
    case 'bleeding':
      if (p.majorBleeding && !s.bleedingControlled) {
        s.bleedingControlled = true;
        text = 'Założono opaskę uciskową — krwotok opanowany';
      } else text = 'Brak masywnego krwotoku do zatamowania';
      break;
  }
  const result: ExamResult = { action, text, seconds: ACTION_SECONDS[action] };
  s.log.push(result);
  return { state: s, result };
}
