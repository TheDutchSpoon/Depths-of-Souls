import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-b6-provoke-stun-cleanup.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: B6 -- a provoking creature Stunned before its next turn stops provoking at that turn start (Phase 4.1-C, D6)', () => {
  it('matches the committed event log exactly across 2 rounds, with no stale Provoke redirect', () => {
    let state = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits, statuses: statuses },
    })
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // PROVOKER survives -- the fight isn't over
  })
})
