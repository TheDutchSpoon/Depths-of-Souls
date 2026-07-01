export interface SeededRng {
  next(): number
}

/**
 * mulberry32 — small, fast, deterministic PRNG. The only source of randomness
 * allowed in src/engine: never Math.random() (see CONVENTIONS.md).
 */
export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0

  return {
    next(): number {
      state = (state + 0x6d2b79f5) | 0
      let t = Math.imul(state ^ (state >>> 15), 1 | state)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}
