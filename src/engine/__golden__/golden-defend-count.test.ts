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
} from './golden-defend-count.fixture'

describe('golden replay: defend-count magnitudeSource (Phase 4 Slice D, Bulwark-shaped)', () => {
  it('matches the committed event log exactly', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
