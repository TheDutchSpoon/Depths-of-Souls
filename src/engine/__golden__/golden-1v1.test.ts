import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  expectedEvents,
  expectedResult,
} from './golden-1v1.fixture'

describe('golden replay: 1v1', () => {
  it('matches the committed event log exactly', () => {
    const initial = createCombat(playerParty, enemyParty, SEED)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
