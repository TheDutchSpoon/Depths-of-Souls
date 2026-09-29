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
} from './golden-b2-skipped-turn-refuses-bonus-cast.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: B2.1 -- a skipped turn refuses the granted cast, after rolling (Phase 4.1-C2c)', () => {
  it('matches the committed event log exactly', () => {
    let state = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts, traits, statuses },
    })
    // The caster has exactly the one authored spell, so the refusal is not "nothing to cast".
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
