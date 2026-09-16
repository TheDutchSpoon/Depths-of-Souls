import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
  TURN_STEPS,
} from './golden-leech-sovereign.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: the Leech Sovereign, Glimmerdark boss (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (Attack steal compounds across two hits)', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 32 HP
  })
})
