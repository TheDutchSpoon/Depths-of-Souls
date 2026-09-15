import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-treant-grovekeep.fixture'

describe('golden replay: Treants Grovekeep (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly (one-time team-wide Health raise)', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const { events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
  })
})
