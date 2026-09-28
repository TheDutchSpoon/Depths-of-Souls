// Phase 4.1-B (B-2): a test-only helper replacing the old `countingRng` (a closure wrapper
// around `SeededRng.next()`, impossible once `CombatState.rng` is a plain `{ position }` bookmark
// with no method to wrap). Every `nextRandom` draw adds a FIXED increment (0x6d2b79f5, mod 2**32)
// to `position`, so the number of draws between two bookmarks is exact and derivable from the
// bookmarks alone -- no spying on the module, which would depend on how the test runner rewrites
// ESM imports.

import type { RngState } from '../rng'
import { nextRandom } from '../rng'

const MAX_DRAWS = 100_000

/**
 * The exact number of `nextRandom` draws between `before` and `after` (both read-only; neither
 * is mutated). Steps a scratch copy of `before` forward, comparing `.position` after each draw,
 * until it matches `after.position` or `maxDraws` is exceeded (a mismatch -- e.g. `after` came
 * from an unrelated seed -- throws rather than looping forever).
 */
export function countDraws(
  before: RngState,
  after: RngState,
  maxDraws: number = MAX_DRAWS,
): number {
  if (before.position === after.position) return 0
  const scratch: RngState = { position: before.position }
  for (let draws = 1; draws <= maxDraws; draws++) {
    nextRandom(scratch)
    if (scratch.position === after.position) return draws
  }
  throw new Error(
    `countDraws: no draw count within ${maxDraws} steps advances ${before.position} to ${after.position} -- are these bookmarks from the same stream?`,
  )
}
