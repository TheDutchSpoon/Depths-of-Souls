import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
  TURN_STEPS,
} from './golden-b2-provoke-redirects-echo.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: B2.3 -- a Provoke redirects an echo (Phase 4.1-C2c)', () => {
  it('matches the committed event log exactly -- exactly one echo, on the provoker', () => {
    let state = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts, traits },
    })
    expect(state.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

    const events: CombatEvent[] = []
    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }
    expect(events).toEqual(expectedEvents)
    expect(events.filter((e) => e.type === 'EchoCastGranted')).toHaveLength(1)
    expect(events.some((e) => e.type === 'CascadeTruncated')).toBe(false)
    expect(state.result).toBeNull()
  })
})
