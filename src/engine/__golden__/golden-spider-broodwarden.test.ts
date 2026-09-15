import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
} from './golden-spider-broodwarden.fixture'

describe('golden replay: Spiders Broodwarden (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly (bonus hit scaled by live Webbed-enemy count)', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const { state, events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // OTHERFOE (1000 HP) survives
  })
})
