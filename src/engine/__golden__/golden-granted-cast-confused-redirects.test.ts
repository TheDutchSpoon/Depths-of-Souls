import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-granted-cast-confused-redirects.fixture'
import { expectedEvents } from './golden-granted-cast-confused-redirects.fixture'

describe("golden replay: a confused caster's granted cast can redirect", () => {
  it('matches the committed event log exactly -- the cast lands on an ally, not the default enemy', () => {
    const { initial, events, state } = runGolden(fixture)
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
