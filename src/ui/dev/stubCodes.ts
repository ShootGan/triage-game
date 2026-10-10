// ATRAPA (tylko tryb ?stub) — kody zadań bez prawdziwego generatora: każdy kod daje ten sam mały scenariusz.
import type { ScenarioCodes } from '../../game/deps';
import { stubScenario } from './stubScenario';

const PREFIX = 'ATRAPA';
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const stubCodes: ScenarioCodes = {
  randomCode: () => {
    let s = '';
    for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return `${PREFIX}-${s}`;
  },
  templateCode: () => `${PREFIX}-WZOR`,
  parseCode: (input) => {
    const raw = input.trim().toUpperCase().replace(/\s+/g, '');
    const m = /^ATRAPA-?([A-Z0-9]{4})$/.exec(raw);
    if (!m) return { error: `Atrapa: kod ma postać ${PREFIX}-XXXX.` };
    return { scenarioId: stubScenario.id, code: `${PREFIX}-${m[1]}` };
  },
  scenarioFromCode(input) {
    const p = this.parseCode(input);
    return 'error' in p ? p : { ...stubScenario, code: p.code };
  },
  patientCountRange: () => [stubScenario.patients.length, stubScenario.patients.length],
};
