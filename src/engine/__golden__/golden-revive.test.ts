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
} from './golden-revive.fixture'

describe('golden replay: revive (Phase 4 Slice B)', () => {
  it('matches the committed event log exactly', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
