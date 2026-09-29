import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-necromoss-reclaim.fixture'
import { expectedEvents } from './golden-necromoss-reclaim.fixture'

describe('golden replay: Rotcap Hollow Necromoss Wisp heal-off-dead-allies (Phase 4 Slice H3, real content)', () => {
  it('matches the committed event log exactly (heal magnitude scales with the live dead-ally count)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
