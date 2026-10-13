import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-hp-percent-lowest-picks-by-percent.fixture'
import { expectedEvents } from './golden-hp-percent-lowest-picks-by-percent.fixture'

describe('golden replay: an hp-percent lowest qualifier picks by HP%, not current HP', () => {
  it('matches the committed event log exactly (W Provokes for the 30% ally)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
