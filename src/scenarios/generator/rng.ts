/**
 * Deterministyczny generator liczb pseudolosowych (ziarno = tekst).
 * Hash: cyrb128 → ziarno 32-bit; generator: mulberry32. Bez zależności od Math.random —
 * ten sam tekst daje zawsze ten sam ciąg liczb (w każdej przeglądarce i w Node).
 */

/** cyrb128 — szybki hash tekstu do 4 × 32 bity; bierzemy XOR-a wszystkich części. */
export function hashString(str: string): number {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return ((h1 ^ h2 ^ h3 ^ h4) >>> 0);
}

export interface Rng {
  /** Liczba z [0, 1). */
  next(): number;
  /** Liczba całkowita z [min, max] (włącznie). */
  int(min: number, max: number): number;
  /** Liczba rzeczywista z [min, max). */
  float(min: number, max: number): number;
  /** true z prawdopodobieństwem p. */
  chance(p: number): boolean;
  /** Losowy element niepustej tablicy. */
  pick<T>(arr: readonly T[]): T;
  /** Losowy element wg wag (wagi ≥ 0, co najmniej jedna > 0). */
  weighted<T>(items: readonly T[], weight: (t: T) => number): T;
  /** Nowa, przetasowana kopia tablicy. */
  shuffle<T>(arr: readonly T[]): T[];
}

export function createRng(seed: string): Rng {
  let a = hashString(seed);
  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (arr) => {
      if (arr.length === 0) throw new Error('rng.pick: pusta tablica');
      return arr[Math.floor(next() * arr.length)];
    },
    weighted: (items, weight) => {
      const ws = items.map((t) => Math.max(0, weight(t)));
      const total = ws.reduce((s, w) => s + w, 0);
      if (items.length === 0 || total <= 0) throw new Error('rng.weighted: brak elementów o dodatniej wadze');
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= ws[i];
        if (r < 0 && ws[i] > 0) return items[i];
      }
      // zaokrąglenia — ostatni element o dodatniej wadze
      for (let i = items.length - 1; i >= 0; i--) if (ws[i] > 0) return items[i];
      return items[items.length - 1];
    },
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
  return rng;
}
