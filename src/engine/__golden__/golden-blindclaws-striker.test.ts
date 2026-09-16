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
} from './golden-blindclaws-striker.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Glimmerdark Blindclaws Setter -> Striker (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (Defends without the initiative, Attacks with it)', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 57 HP
  })
})
