import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-heal-scaling-stat.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: heal scalingStat mode (Phase 4 Slice E2, Treants Elder-shaped)', () => {
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
