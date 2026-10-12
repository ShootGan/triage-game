import type { ExamActionId } from '../engine/exam/types';
import type { ProtocolMode, TriageCategory } from '../engine/triage';

/** Kolejność czynności w panelu badania + skróty klawiszowe. */
export const ACTION_ORDER: { id: ExamActionId; key: string }[] = [
  { id: 'breathing', key: 'Q' },
  { id: 'airway', key: 'W' },
  { id: 'rescue-breaths', key: 'E' },
  { id: 'pulse', key: 'R' },
  { id: 'crt', key: 'T' },
  { id: 'commands', key: 'Y' },
  { id: 'avpu', key: 'U' },
  { id: 'bleeding', key: 'I' },
  { id: 'decompression', key: 'O' },
];

/** Kolejność kategorii (R/Ż/Z/C) + skróty 1–4. */
export const CATEGORY_ORDER: { id: TriageCategory; key: string; short: string }[] = [
  { id: 'red', key: '1', short: 'R' },
  { id: 'yellow', key: '2', short: 'Ż' },
  { id: 'green', key: '3', short: 'Z' },
  { id: 'black', key: '4', short: 'C' },
];

/** SALT adds GREY (expectant) on key 5 — the START keys stay where players learned them. */
const GREY = { id: 'grey' as const, key: '5', short: 'S' };

export function categoriesFor(mode: ProtocolMode): typeof CATEGORY_ORDER {
  return mode === 'SALT' ? [...CATEGORY_ORDER.slice(0, 3), GREY, CATEGORY_ORDER[3]] : CATEGORY_ORDER;
}

export const CATEGORY_COLOR: Record<TriageCategory, string> = {
  red: '#d6303a',
  yellow: '#f2c230',
  green: '#3fa34d',
  black: '#1a1c2c',
  grey: '#8a8f98',
};

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
