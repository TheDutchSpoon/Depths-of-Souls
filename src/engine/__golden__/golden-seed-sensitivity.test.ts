import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  playerParty,
  enemyParty,
  scripts,
  SEED_A,
  SEED_B,
} from './golden-seed-sensitivity.fixture'

function runWith(seed: number) {
  const { events, state } = resolveFight(
    createCombat(playerParty, enemyParty, seed, scripts),
  )
  return { events, result: state.result }
}

describe('golden replay: seed sensitivity', () => {
  it('the same seed is stable across repeat runs, but different seeds diverge', () => {
    const runA1 = runWith(SEED_A)
    const runA2 = runWith(SEED_A)
    const runB1 = runWith(SEED_B)
    const runB2 = runWith(SEED_B)

    // Each seed is individually stable (determinism, proven per-mechanism elsewhere --
    // this is the same-seed half of the sanity check).
    expect(runA1.events).toEqual(runA2.events)
    expect(runB1.events).toEqual(runB2.events)

    // Proves the RNG is threaded end-to-end through the resolver + interpreter, not just
    // that one mechanism works once in isolation.
    expect(runA1.events).not.toEqual(runB1.events)
  })
})
