import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedFirstTurnEvents,
} from './golden-shieldbarer-starter.fixture'

describe('golden replay: Shieldbarer starter team-wide Defence buff (Phase 4 Slice F, real content)', () => {
  it("matches the committed event log for the provoker's first turn exactly", () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const { events } = resolveTurn(initial)

    expect(events).toEqual(expectedFirstTurnEvents)
  })
})
