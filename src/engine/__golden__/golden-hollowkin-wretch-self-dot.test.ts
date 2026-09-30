import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-hollowkin-wretch-self-dot.fixture'
import { expectedEvents } from './golden-hollowkin-wretch-self-dot.fixture'

describe('golden replay: PR #64 fix 3 -- triggering-source never resolves to the firing creature itself', () => {
  it("matches the committed event log exactly (Wretch's own Poison tick does not confuse itself)", () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
