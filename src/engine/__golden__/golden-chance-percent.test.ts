import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-chance-percent.fixture'
import {
  SEED_SUCCESS,
  SEED_FAIL,
  expectedEventsSuccess,
  expectedResultSuccess,
  expectedEventsFail,
  expectedResultFail,
} from './golden-chance-percent.fixture'

describe('golden replay: chancePercent probabilistic trigger (Phase 4 Slice E2)', () => {
  it('rolls succeed at the rigged seed: TriggerFired + response fire before the lethal hit', () => {
    const { state, events } = runGolden(fixture, { seed: SEED_SUCCESS })

    expect(events).toEqual(expectedEventsSuccess)
    expect(state.result).toBe(expectedResultSuccess)
  })

  it('rolls fail at the rigged seed: skipped silently, straight to the identical lethal hit', () => {
    const { state, events } = runGolden(fixture, { seed: SEED_FAIL })

    expect(events).toEqual(expectedEventsFail)
    expect(state.result).toBe(expectedResultFail)
  })
})
