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
} from './golden-on-action-hooks.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: on-[action] hooks (Phase 4 Slice B)', () => {
  it('matches the committed event log exactly across 4 rounds (on-defend/on-provoke/on-cast/on-attack)', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // DUMMY's 1000 HP survives all 4 rounds -- fight not over
  })
})
