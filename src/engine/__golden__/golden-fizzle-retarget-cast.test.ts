import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-fizzle-retarget-cast.fixture'
import { expectedEvents } from './golden-fizzle-retarget-cast.fixture'

describe('golden replay: the pre-hit-hook fizzle on the Cast path -- fizzle + rule 4 re-target', () => {
  it('matches the committed event log exactly -- no payload or status on the corpse, instance 2 lands on the lowest-HP survivor', () => {
    const { initial, events, state } = runGolden(fixture)
    // Fight setup adds no innate spell here: the slot list is exactly the one authored spell.
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'smite-fixture',
    ])

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
