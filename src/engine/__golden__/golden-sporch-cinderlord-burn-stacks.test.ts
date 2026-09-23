import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { applyStatus, newCascade } from '../resolution'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  ENEMY_B,
  VICTIM,
  VICTIM_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-sporch-cinderlord-burn-stacks.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: PR #64 fix 6 -- Sporch Cinderlord applies Burn with an explicit stacks:1 (real content)', () => {
  it('matches the committed event log exactly (a fresh target ends at 1 stack, a stacked target caps at 3 with duration visibly refreshed 1 -> 3)', () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // Pre-apply 2 Burn stacks to ENEMY_B at duration:1 (not Burn's own default of 3) and wound
    // VICTIM, both before any turn resolves -- into a throwaway events array. Duration 1 (rather
    // than the default 3) is what makes Cinderlord's own re-application visibly REFRESH it back
    // up to 3, instead of landing on the same value it already had.
    let state = applyStatus(
      ENEMY_B,
      ENEMY_B,
      { statusId: 'burn', stacks: 2, duration: 1 },
      created,
      [],
      newCascade(),
    )
    state = updateCreature(state, VICTIM, { currentHp: VICTIM_STARTING_HP })
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
