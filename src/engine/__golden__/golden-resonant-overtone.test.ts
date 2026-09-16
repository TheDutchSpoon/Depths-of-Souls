import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-resonant-overtone.fixture'

describe('golden replay: Glimmerdark Resonant Overtone echo-cast (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (one echo fires, its own re-observation fails, echo damage lands before the original)', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const { state, events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 80 HP
  })
})
