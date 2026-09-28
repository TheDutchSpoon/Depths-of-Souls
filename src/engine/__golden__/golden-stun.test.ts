import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  expectedResult,
} from './golden-stun.fixture'

describe('golden replay: Stun (condition-status suppress-action via a trait apply-status)', () => {
  it('skips the stunned creature’s very next turn via the empty bracket, then expires', () => {
    const initial = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits, statuses: statuses },
    })
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
