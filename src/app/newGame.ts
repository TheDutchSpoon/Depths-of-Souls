// A new game's run seed is generated HERE, in the app layer --
// never in the store or the engine (the engine has no `crypto`/`Math.random`, and the store takes
// its seed as an argument so `newGame({ seed })` stays deterministic). `startRun.ts` is the one
// path that starts a game from it.

/** Fills the array in place, like `crypto.getRandomValues` (whose return value is ignored). */
export type RandomSource = (array: Uint32Array<ArrayBuffer>) => unknown

const cryptoSource: RandomSource = (array) => globalThis.crypto.getRandomValues(array)

/** A uint32, the range `newGame` accepts (the RNG takes `seed >>> 0`). */
export function generateRunSeed(source: RandomSource = cryptoSource): number {
  const values = new Uint32Array(1)
  source(values)
  return values[0]!
}
