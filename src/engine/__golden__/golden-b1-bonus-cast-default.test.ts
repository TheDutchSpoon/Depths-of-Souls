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
} from './golden-b1-bonus-cast-default.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: B1 -- a bonus cast defaults to the lowest-HP enemy (Phase 4.1-C2b)', () => {
  it('matches the committed event log exactly -- slot 1 (lower HP) is hit, not slot 0', () => {
    let state = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts, traits },
    })
    // Fight setup adds no innate spell here: the slot list is exactly the one authored spell.
    expect(state.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

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
