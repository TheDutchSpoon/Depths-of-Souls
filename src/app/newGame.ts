// Phase 4.1-G2 (§6, ASSUMPTION 87): a new game's run seed is generated HERE, in the app layer --
// never in the store or the engine (the engine has no `crypto`/`Math.random`, and the store takes
// its seed as an argument so `newGame({ seed })` stays deterministic). Not wired into the UI yet:
// the app is still the combat demo.

import type { GameActions } from '../state/store'

/** Fills the array in place, like `crypto.getRandomValues` (whose return value is ignored). */
export type RandomSource = (array: Uint32Array<ArrayBuffer>) => unknown

const cryptoSource: RandomSource = (array) => globalThis.crypto.getRandomValues(array)

/** A uint32, the range `newGame` accepts (the RNG takes `seed >>> 0`). */
export function generateRunSeed(source: RandomSource = cryptoSource): number {
  const values = new Uint32Array(1)
  source(values)
  return values[0]!
}

/** Starts a fresh game on `store` with a freshly generated seed; returns the seed (so the UI can
 * show or save it). */
export function startNewGame(
  store: Pick<GameActions, 'newGame'>,
  source?: RandomSource,
): number {
  const seed = generateRunSeed(source)
  store.newGame({ seed })
  return seed
}
