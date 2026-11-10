// Seeded randomness for the mini-games (mulberry32): the same seed always plays the same game.
export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [0, n) */
  int(n: number): number;
  /** true with probability p */
  chance(p: number): boolean;
  /** float in [a, b) */
  range(a: number, b: number): number;
  pick<T>(xs: readonly T[]): T;
}

export function makeRng(seed: number): Rng {
  let a = (seed | 0) ^ 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    range: (a0, b0) => a0 + next() * (b0 - a0),
    pick: (xs) => xs[Math.floor(next() * xs.length)],
  };
}
