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
} from './golden-snapjaw-ironjaw.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Snapjaws Ironjaw (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly across 2 rounds', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
