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
} from './golden-lullpollen-dozer.fixture'

describe('golden replay: Lullpollen Dozer (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly (bonus hit scaled by live Sleeping-enemy count)', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const { state, events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // OTHERFOE (1000 HP) survives
  })
})
