import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-round-end-mid-sweep-poison.fixture'
import { expectedEvents } from './golden-round-end-mid-sweep-poison.fixture'

describe('golden replay: PR #64 fix 2 -- a status born mid-sweep does not tick until the next round', () => {
  it("matches the committed event log exactly (Rotcore's death-Poison does not tick until round 2)", () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
