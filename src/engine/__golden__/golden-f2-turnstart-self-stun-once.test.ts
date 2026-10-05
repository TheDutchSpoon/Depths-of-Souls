import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-f2-turnstart-self-stun-once.fixture'
import {
  expectedEvents,
  expectedResult,
} from './golden-f2-turnstart-self-stun-once.fixture'

describe('golden replay: a Stun 1 gained in the own turn-start hooks skips exactly one turn', () => {
  it('matches the committed event log exactly', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
