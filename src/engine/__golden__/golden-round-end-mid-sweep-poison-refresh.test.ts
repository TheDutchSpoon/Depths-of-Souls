import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { applyStatus, newCascade } from '../resolution'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  E1,
  ROTCORE,
  ROTCORE_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-round-end-mid-sweep-poison-refresh.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: PR #64 fix 2 refresh path -- a status refreshed mid-sweep does not tick until the next round', () => {
  it("matches the committed event log exactly (Rotcore's death-Poison refreshes E1's existing Poison, which does not tick until round 2)", () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // Pre-apply Poison to both ROTCORE and E1, and wound ROTCORE to 1 HP, all before any turn
    // resolves -- into a throwaway events array, mirroring the PR #64 repro's own setup idiom.
    let state = applyStatus(
      ROTCORE,
      ROTCORE,
      { statusId: 'poison' },
      created,
      [],
      newCascade(),
    )
    state = applyStatus(ROTCORE, E1, { statusId: 'poison' }, state, [], newCascade())
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
