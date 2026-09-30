import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-scripted-1v1.fixture'
import { expectedEvents, expectedResult } from './golden-scripted-1v1.fixture'

describe('golden replay: scripted 1v1 (Defend + round-number)', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
