import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  SEED_SUCCESS,
  SEED_FAIL,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEventsSuccess,
  expectedResultSuccess,
  expectedEventsFail,
  expectedResultFail,
} from './golden-cheat-death.fixture'

describe('golden replay: cheat-death (Phase 4 Slice D, Last Stand-shaped)', () => {
  it('a successful roll (SEED 7) survives at 1 HP -- no CreatureDied for the bearer', () => {
    const initial = createCombat(playerParty, enemyParty, SEED_SUCCESS, scripts, traits)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEventsSuccess)
    expect(state.result).toBe(expectedResultSuccess)
  })

  it('a failed roll (SEED 1) dies normally, unaffected', () => {
    const initial = createCombat(playerParty, enemyParty, SEED_FAIL, scripts, traits)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEventsFail)
    expect(state.result).toBe(expectedResultFail)
  })
})
