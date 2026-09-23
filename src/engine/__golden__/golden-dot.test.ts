import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  TARGET,
  TARGET_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  statuses,
  expectedEvents,
  expectedResult,
} from './golden-dot.fixture'

describe('golden replay: DoT lifecycle (spell-applied Poison, ticks, expiry, round-end win-check)', () => {
  it('applies Poison via a Cast, ticks it flat at round-end, and expires it on the killing tick', () => {
    const created = createCombat(
      playerParty,
      enemyParty,
      SEED,
      scripts,
      new Map(),
      statuses,
    )
    // createCombat resets currentHp to effective max at fight-start (GAME_DESIGN), so TARGET's
    // wounded starting HP has to be applied here, after creation -- see golden-dot.fixture.ts's
    // header comment.
    const initial = updateCreature(created, TARGET, { currentHp: TARGET_STARTING_HP })
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
