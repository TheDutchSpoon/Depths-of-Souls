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
} from './golden-turn-order-status.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: turn-order status (Phase 4 Slice C)', () => {
  it('matches the committed event log exactly across round 1 (act-first / normal / act-last)', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // nobody dies -- fight not over
  })
})
