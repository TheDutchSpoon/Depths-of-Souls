import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  BEARER,
  BEARER_STARTING_HP,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-spore-spread.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: Rotcap Hollow Spore contagion, infect -> kill -> spread (Phase 4 Slice H3, real content)', () => {
  it('matches the committed event log exactly (Seeder infects and kills, Spore spreads on death)', () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // createCombat resets currentHp to effective max at fight-start, so BEARER's wounded
    // starting HP has to be applied here, after creation -- see the fixture's header comment.
    let state = updateCreature(created, BEARER, { currentHp: BEARER_STARTING_HP })
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // ALLY survives (now carrying Spore); fight continues
  })
})
