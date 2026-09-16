import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-sparkeater-voidmaw.fixture'

describe('golden replay: Glimmerdark Sparkeater Voidmaw (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (target max-HP down + clamp, team max-HP up, no auto-heal)', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const { state, events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 25 HP
  })
})
