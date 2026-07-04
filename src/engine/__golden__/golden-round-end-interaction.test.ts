import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  expectedResult,
} from './golden-round-end-interaction.fixture'

describe('golden replay: round-end sweep interaction rules', () => {
  it(
    'on-death fires for a mid-sweep kill, the dying creature’s own remaining tick is skipped, ' +
      'a status born mid-sweep keeps full duration, and win/loss is checked after the full sweep',
    () => {
      const initial = createCombat(
        playerParty,
        enemyParty,
        SEED,
        scripts,
        traits,
        statuses,
      )
      const { state, events } = resolveFight(initial)

      expect(events).toEqual(expectedEvents)
      expect(state.result).toBe(expectedResult)
    },
  )
})
