import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-consume-stacks.fixture'
import { expectedEvents, expectedResult } from './golden-consume-stacks.fixture'

describe('golden replay: consume-stacks (Phase 4 Slice D, Detonator-shaped)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
