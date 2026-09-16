import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
  expectedResult,
  TURN_STEPS,
} from './golden-gloomjaw-executioner.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Glimmerdark Gloomjaws Executioner (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (Attack snowballs, compounding, across two kills)', () => {
    let state = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
