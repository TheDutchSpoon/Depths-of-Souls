import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  CAPPED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-d3-revive-cap-fizzle.fixture'
import { MAX_REVIVES_PER_CREATURE } from '../config'

describe('golden replay: D3 revive cap -- 11th-attempt fizzle (Phase 4.1-B, PR #69 R5)', () => {
  it('emits TriggerFired only, and draws zero RNG, when the sole dead ally is already at the cap', () => {
    const created = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits },
    })
    const initial = updateCreature(created, CAPPED, {
      alive: false,
      currentHp: 0,
      revivesUsed: MAX_REVIVES_PER_CREATURE,
    })

    const { events, state } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
    // Zero draws -- proves the pool-empty check runs BEFORE any random() call, not merely that
    // the outcome happens to match.
    expect(state.rng.position).toBe(initial.rng.position)
  })
})
