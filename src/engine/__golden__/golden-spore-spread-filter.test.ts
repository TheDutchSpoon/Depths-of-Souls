import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { applyStatus, newCascade } from '../resolution'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  ALLY_SPORED,
  BEARER,
  BEARER_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-spore-spread-filter.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Spore spread-on-death filters already-Spored allies before drawing (real content)', () => {
  it('matches the committed event log exactly (a genuine 2-candidate draw, not a degenerate pick)', () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // Pre-apply Spore to BEARER itself (its own on-death spread trigger only exists while it
    // carries the status) and to ALLY_SPORED (the one candidate the filter must exclude), then
    // wound BEARER -- all before any turn resolves, into a throwaway events array, mirroring the
    // PR #64 repro's own setup idiom.
    let state = applyStatus(
      BEARER,
      BEARER,
      { statusId: 'spore' },
      created,
      [],
      newCascade(),
    )
    state = applyStatus(
      BEARER,
      ALLY_SPORED,
      { statusId: 'spore' },
      state,
      [],
      newCascade(),
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
  })
})
