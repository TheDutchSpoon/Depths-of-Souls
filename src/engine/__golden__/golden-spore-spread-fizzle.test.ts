import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  ALLY,
  BEARER,
  BEARER_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-spore-spread-fizzle.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Spore spread-on-death fizzles when every living ally is already Spored (real content)', () => {
  it('matches the committed event log exactly (TriggerFired still fires; nothing follows it)', () => {
    const created = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits, statuses: statuses },
    })
    // Pre-apply Spore to BOTH BEARER (its own on-death spread trigger only exists while it
    // carries the status) and ALLY (so the filtered pool is empty), then wound BEARER -- all
    // before any turn resolves, into a throwaway events array.
    let state = applyStatus(
      BEARER,
      BEARER,
      { statusId: 'spore' },
      created,
      createResolutionContext([], newCascade()),
    )
    state = applyStatus(
      BEARER,
      ALLY,
      { statusId: 'spore' },
      state,
      createResolutionContext([], newCascade()),
    )
    state = updateCreature(state, BEARER, { currentHp: BEARER_STARTING_HP })
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
    // Proves the "no RNG draw at all" claim, not just asserts it: if anything in the run above
    // had consumed a draw, the plain-data bookmark's position would have advanced away from its
    // starting seed value.
    expect(state.rng.position).toBe(SEED)
  })
})
