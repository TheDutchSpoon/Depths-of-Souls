import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b2-skipped-turn-refuses-bonus-cast.fixture'
import { expectedEvents } from './golden-b2-skipped-turn-refuses-bonus-cast.fixture'

describe('golden replay: B2.1 -- a skipped turn refuses the granted cast, after rolling (Phase 4.1-C2c)', () => {
  it('matches the committed event log exactly', () => {
    const { initial, events, state } = runGolden(fixture)
    // The caster has exactly the one authored spell, so the refusal is not "nothing to cast".
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
