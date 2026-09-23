import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { applyStatus, newCascade } from '../resolution'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  BEARER,
  BEARER_STARTING_HP,
  P,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-spore-spread-dot-kill.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: PR #64 fix 1 -- Spore spreads when its OWN round-end DoT tick kills the host', () => {
  it('matches the committed event log exactly (per-trigger guard identity, not the shared status instanceId)', () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // Pre-apply Spore to BEARER and wound it to 1 HP, both before any turn resolves -- into a
    // throwaway events array, mirroring the PR #64 repro's own setup idiom (see the fixture's
    // header comment).
    let state = applyStatus(P, BEARER, { statusId: 'spore' }, created, [], newCascade())
    state = updateCreature(state, BEARER, { currentHp: BEARER_STARTING_HP })
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // MATE survives (now carrying Spore); fight continues
  })
})
