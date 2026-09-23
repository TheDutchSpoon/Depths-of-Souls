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
} from './golden-hollowkin-wretch.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Rotcap Hollow Hollowkin Wretch retaliatory Confusion (Phase 4 Slice H3, real content)', () => {
  it('matches the committed event log exactly (a chip-only hit provokes a Confusion retaliation)', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // WRETCH survives at 19 HP
  })
})
