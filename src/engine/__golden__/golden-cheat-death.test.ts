import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-cheat-death.fixture'
import {
  SEED_SUCCESS,
  SEED_FAIL,
  expectedEventsSuccess,
  expectedResultSuccess,
  expectedEventsFail,
  expectedResultFail,
} from './golden-cheat-death.fixture'

describe('golden replay: cheat-death (Phase 4 Slice D, Last Stand-shaped)', () => {
  it('a successful roll (SEED 7) survives at 1 HP -- no CreatureDied for the bearer', () => {
    const { state, events } = runGolden(fixture, { seed: SEED_SUCCESS })

    expect(events).toEqual(expectedEventsSuccess)
    expect(state.result).toBe(expectedResultSuccess)
  })

  it('a failed roll (SEED 1) dies normally, unaffected', () => {
    const { state, events } = runGolden(fixture, { seed: SEED_FAIL })

    expect(events).toEqual(expectedEventsFail)
    expect(state.result).toBe(expectedResultFail)
  })
})
