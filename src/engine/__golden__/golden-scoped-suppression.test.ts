import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
  expectedResult,
} from './golden-scoped-suppression.fixture'

describe('golden replay: scoped suppress-action (Phase 4 Slice B)', () => {
  it('matches the committed event log exactly -- Cast skipped, Attack still fires, no SpellCast ever emitted', () => {
    const initial = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits },
    })
    const { state, events } = resolveFight(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
    expect(events.some((e) => e.type === 'SpellCast')).toBe(false)
  })
})
