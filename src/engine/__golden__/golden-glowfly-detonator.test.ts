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
  TURN_STEPS,
} from './golden-glowfly-detonator.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Glimmerdark Glowflies Charger -> Detonator (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (Glow charged by an ally, then consumed for a burst)', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 48 HP
  })
})
