import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-attack-instance-list.fixture'
import { expectedEvents, expectedResult } from './golden-attack-instance-list.fixture'

describe('golden replay: attack instance-list (Phase 4 Slice B)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
