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
} from './golden-chance-percent.fixture'

describe('golden replay: chancePercent probabilistic trigger (Phase 4 Slice E2)', () => {
  it('rolls succeed at the rigged seed: TriggerFired + response fire before the lethal hit', () => {
    const initial = createCombat(playerParty, enemyParty, SEED_SUCCESS, scripts, traits)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEventsSuccess)
    expect(state.result).toBe(expectedResultSuccess)
  })

  it('rolls fail at the rigged seed: skipped silently, straight to the identical lethal hit', () => {
    const initial = createCombat(playerParty, enemyParty, SEED_FAIL, scripts, traits)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEventsFail)
    expect(state.result).toBe(expectedResultFail)
  })
})
