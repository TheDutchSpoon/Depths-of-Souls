import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-action-observed.fixture'

describe('golden replay: on-action-observed (Phase 4 Slice E2, Resonants-shaped)', () => {
  it('matches the committed event log exactly -- fires once per cast instance, ally only', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts, traits)
    const { events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
  })
})
