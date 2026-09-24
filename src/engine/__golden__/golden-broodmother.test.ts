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
} from './golden-broodmother.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Overgrowth Broodmother Swarm Call count-scaling (Phase 4 Slice I, PR #65 review, real content)', () => {
  it('matches the committed event log exactly (count 3 while both spiderlings live, count 2 the moment one has died)', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // STRIKER survives at 22 HP -- fight not over
  })
})
