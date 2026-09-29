import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-round-end-mid-sweep-poison-refresh.fixture'
import { expectedEvents } from './golden-round-end-mid-sweep-poison-refresh.fixture'

describe('golden replay: PR #64 fix 2 refresh path -- a status refreshed mid-sweep does not tick until the next round', () => {
  it("matches the committed event log exactly (Rotcore's death-Poison refreshes E1's existing Poison, which does not tick until round 2)", () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
