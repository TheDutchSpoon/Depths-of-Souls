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
} from './golden-castable-draw.fixture'

describe('golden replay: castable-filtered gem draw (Phase 4.1-C2b, ASSUMPTION 13)', () => {
  it('a bonus cast after the killing blow lands the ally heal, not the fizzled enemy spell', () => {
    const initial = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts, traits },
    })
    // The slot order the derivation depends on comes from fight setup (innate spells prepend).
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'enemy-bolt-fixture',
      'heal-fixture',
    ])

    const { state, events } = resolveFight(initial)
    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
