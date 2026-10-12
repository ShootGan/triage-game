import type { ProtocolMode } from '../engine/triage';

/** Code suffix of a SALT game: KAMIENICA-4F7K-SALT is the same casualties as KAMIENICA-4F7K, scored with SALT. */
export const SALT_SUFFIX = '-SALT';

export function codeProtocol(code: string): ProtocolMode {
  return code.toUpperCase().trim().endsWith(SALT_SUFFIX) ? 'SALT' : 'START';
}

/** The code without the protocol suffix (what seeds the casualties). */
export function baseCode(code: string): string {
  return codeProtocol(code) === 'SALT' ? code.trim().slice(0, -SALT_SUFFIX.length) : code;
}

export function withProtocol(code: string, mode: ProtocolMode): string {
  const base = baseCode(code);
  return mode === 'SALT' ? `${base}${SALT_SUFFIX}` : base;
}
