import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { applyStatus, newCascade } from '../resolution'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  ROTCORE,
  ROTCORE_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-round-end-mid-sweep-poison.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: PR #64 fix 2 -- a status born mid-sweep does not tick until the next round', () => {
  it("matches the committed event log exactly (Rotcore's death-Poison does not tick until round 2)", () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // Pre-apply Poison to ROTCORE and wound it to 1 HP, both before any turn resolves -- into a
    // throwaway events array, mirroring the PR #64 repro's own setup idiom.
    let state = applyStatus(
      ROTCORE,
      ROTCORE,
      { statusId: 'poison' },
      created,
      [],
      newCascade(),
    )
    state = updateCreature(state, ROTCORE, { currentHp: ROTCORE_STARTING_HP })
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
