import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  ADD,
  ADD_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-rot-sovereign.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Rotcap Hollow Rot Sovereign attrition (Phase 4 Slice H3, real content)', () => {
  it("matches the committed event log exactly (an add's death grows her Attack, feeding her very next hit, plus her own Spore blanket)", () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // createCombat resets currentHp to effective max at fight-start, so ADD's wounded starting
    // HP has to be applied here, after creation -- see the fixture's header comment.
    let state = updateCreature(created, ADD, { currentHp: ADD_STARTING_HP })
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 85 HP
  })
})
