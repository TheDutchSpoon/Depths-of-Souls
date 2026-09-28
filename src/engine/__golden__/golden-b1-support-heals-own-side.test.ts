import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  expectedEvents,
  TURN_STEPS,
} from './golden-b1-support-heals-own-side.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: B1 -- an enemy support caster under always-cast heals its own lowest-HP ally (Phase 4.1-C2b)', () => {
  it('matches the committed event log exactly across one round', () => {
    let state = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts },
    })
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
