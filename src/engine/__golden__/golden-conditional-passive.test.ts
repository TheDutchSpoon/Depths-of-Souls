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
} from './golden-conditional-passive.fixture'

describe('golden replay: conditional passive folded at read time', () => {
  it('re-evaluates +25%-Attack-at-full-HP on each read, weakening the hit after damage', () => {
    const initial = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits },
    })
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
