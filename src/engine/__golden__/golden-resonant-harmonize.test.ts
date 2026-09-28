import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-resonant-harmonize.fixture'

describe('golden replay: Glimmerdark Resonants Harmonize/Resonate (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (a cast is observed by the caster itself and an ally)', () => {
    const initial = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits },
    })
    const { state, events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 88 HP
  })
})
