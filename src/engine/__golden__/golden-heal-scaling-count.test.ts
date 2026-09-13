import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-heal-scaling-count.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: heal magnitudeSource mode (Phase 4 Slice E2, Necromoss-shaped)', () => {
  it('matches the committed event log exactly across round 1’s two turns', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits)

    const events: CombatEvent[] = []
    let state = initial
    for (let i = 0; i < 2; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
  })
})
