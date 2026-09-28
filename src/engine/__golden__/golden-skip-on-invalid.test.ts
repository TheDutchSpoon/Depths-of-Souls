import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  expectedEvents,
  expectedResult,
} from './golden-skip-on-invalid.fixture'

describe('golden replay: skip on invalid (empty gem slot)', () => {
  it('matches the committed event log exactly, with zero SpellCast events', () => {
    const initial = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts },
    })
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(events.some((e) => e.type === 'SpellCast')).toBe(false)
    expect(state.result).toBe(expectedResult)
  })
})
