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
} from './golden-web-break-free.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Web break-free (Phase 4 Slice E2)', () => {
  it('matches the committed event log exactly across round 1’s two turns', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)

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
