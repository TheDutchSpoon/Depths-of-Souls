import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b2-confused-bonus-cast-redirects.fixture'
import { expectedEvents } from './golden-b2-confused-bonus-cast-redirects.fixture'

describe("golden replay: B2.3 -- a confused caster's bonus cast can redirect (Phase 4.1-C2c)", () => {
  it('matches the committed event log exactly -- the cast lands on an ally, not the default enemy', () => {
    const { initial, events, state } = runGolden(fixture)
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
