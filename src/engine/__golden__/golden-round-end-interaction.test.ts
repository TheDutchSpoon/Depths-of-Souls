import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-round-end-interaction.fixture'
import { expectedEvents, expectedResult } from './golden-round-end-interaction.fixture'

describe('golden replay: round-end trait pass interaction rules', () => {
  it(
    'on-death fires for a mid-pass kill, the dying creature’s own remaining trigger is skipped, ' +
      'a status applied at round end counts down in its bearer’s own turns, and win/loss is checked after the pass',
    () => {
      const { events, state } = runGolden(fixture)

      expect(events).toEqual(expectedEvents)
      expect(state.result).toBe(expectedResult)
    },
  )
})
