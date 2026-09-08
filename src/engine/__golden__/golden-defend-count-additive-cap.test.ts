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
} from './golden-defend-count-additive-cap.fixture'

describe('golden replay: defend-count additive-cap accumulation (Phase 4 Slice D, PR #47 review amendment, real Bulwark-shaped)', () => {
  it('matches the committed event log exactly, reaching AND holding the hard cap', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
