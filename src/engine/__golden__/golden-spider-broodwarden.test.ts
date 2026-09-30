import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-spider-broodwarden.fixture'
import { expectedEvents } from './golden-spider-broodwarden.fixture'

describe('golden replay: Spiders Broodwarden (Phase 4 Slice H1, real content)', () => {
  it('matches the committed event log exactly (bonus hit scaled by live Webbed-enemy count)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // OTHERFOE (1000 HP) survives
  })
})
