import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-round-end-interaction.fixture'
import { expectedEvents, expectedResult } from './golden-round-end-interaction.fixture'

describe('golden replay: round-end sweep interaction rules', () => {
  it(
    'on-death fires for a mid-sweep kill, the dying creature’s own remaining tick is skipped, ' +
      'a status born mid-sweep keeps full duration, and win/loss is checked after the full sweep',
    () => {
      const { events, state } = runGolden(fixture)

      expect(events).toEqual(expectedEvents)
      expect(state.result).toBe(expectedResult)
    },
  )
})
