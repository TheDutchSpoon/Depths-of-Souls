import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-castable-draw.fixture'
import { expectedEvents, expectedResult } from './golden-castable-draw.fixture'

describe('golden replay: castable-filtered gem draw (Phase 4.1-C2b, ASSUMPTION 13)', () => {
  it('a bonus cast after the killing blow lands the ally heal, not the fizzled enemy spell', () => {
    const { initial, events, state } = runGolden(fixture)
    // Fight setup prepends the innate spell, so the slot order the fixture derives its draw from
    // is asserted here, not assumed.
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'enemy-bolt-fixture',
      'heal-fixture',
    ])
    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
