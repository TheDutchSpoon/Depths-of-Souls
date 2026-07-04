import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
  expectedResult,
} from './golden-conditional-trigger.fixture'

describe('golden replay: conditional trigger (retaliate gated on self HP% < 50)', () => {
  it('stays silent while healthy, then fires once a hit crosses the threshold, not on death', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
