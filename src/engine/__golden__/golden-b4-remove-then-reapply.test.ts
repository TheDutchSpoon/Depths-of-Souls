import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
} from './golden-b4-remove-then-reapply.fixture'

describe('golden replay: B4 exact-instance rule -- remove-then-reapply (Phase 4.1-B, PR #69 R5)', () => {
  it('matches the committed event log exactly across fight-start and the bearer’s own first turn', () => {
    const initial = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits, statuses: statuses },
    })

    const { events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
  })
})
