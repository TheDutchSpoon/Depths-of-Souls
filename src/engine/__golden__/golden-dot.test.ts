import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  statuses,
  expectedEvents,
  expectedResult,
} from './golden-dot.fixture'

describe('golden replay: DoT lifecycle (spell-applied Poison, ticks, expiry, round-end win-check)', () => {
  it('applies Poison via a Cast, ticks it flat at round-end, and expires it on the killing tick', () => {
    const initial = createCombat(
      playerParty,
      enemyParty,
      SEED,
      scripts,
      new Map(),
      statuses,
    )
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
