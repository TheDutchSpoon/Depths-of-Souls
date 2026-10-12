import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-granted-cast-refused-by-fixture-lock.fixture'
import { expectedEvents } from './golden-granted-cast-refused-by-fixture-lock.fixture'

describe('golden replay: Silence refuses a granted cast and draws nothing', () => {
  it('matches the committed event log exactly', () => {
    const { initial, events, state } = runGolden(fixture)
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
