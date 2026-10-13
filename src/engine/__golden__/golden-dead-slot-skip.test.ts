import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import { countDraws } from '../test-utils/rng-draw-count'
import * as fixture from './golden-dead-slot-skip.fixture'
import {
  expectedCursor,
  expectedDraws,
  expectedEvents,
  expectedQueue,
} from './golden-dead-slot-skip.fixture'

describe('golden replay: a dead creature’s slot emits nothing and rolls nothing', () => {
  it('matches the committed event log exactly, with no Web roll for the dead slot', () => {
    const { initial, state, events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(countDraws(initial.rng, state.rng)).toBe(expectedDraws)
    expect(state.turnQueue).toEqual(expectedQueue)
    expect(state.turnCursor).toBe(expectedCursor)
  })
})
