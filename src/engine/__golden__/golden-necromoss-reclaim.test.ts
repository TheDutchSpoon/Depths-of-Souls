import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  WISP,
  WISP_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-necromoss-reclaim.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Rotcap Hollow Necromoss Wisp heal-off-dead-allies (Phase 4 Slice H3, real content)', () => {
  it('matches the committed event log exactly (heal magnitude scales with the live dead-ally count)', () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // createCombat resets currentHp to effective max at fight-start, so WISP's wounded starting
    // HP has to be applied here, after creation -- see the fixture's header comment.
    let state = updateCreature(created, WISP, { currentHp: WISP_STARTING_HP })
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
