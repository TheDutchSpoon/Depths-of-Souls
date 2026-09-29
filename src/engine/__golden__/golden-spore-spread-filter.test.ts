import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-spore-spread-filter.fixture'
import { expectedEvents } from './golden-spore-spread-filter.fixture'

describe('golden replay: Spore spread-on-death filters already-Spored allies before drawing (real content)', () => {
  it('matches the committed event log exactly (a genuine 2-candidate draw, not a degenerate pick)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
