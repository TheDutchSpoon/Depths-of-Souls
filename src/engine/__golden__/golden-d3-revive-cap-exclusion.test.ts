import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { updateCreature } from '../creature-lookup'
import {
  SEED,
  CAPPED,
  ELIGIBLE,
  playerParty,
  enemyParty,
  scripts,
  traits,
  expectedEvents,
} from './golden-d3-revive-cap-exclusion.fixture'
import { MAX_REVIVES_PER_CREATURE } from '../config'

describe('golden replay: D3 revive cap -- mixed-pool exclusion (Phase 4.1-B, PR #69 R5)', () => {
  it('excludes the capped dead ally from the pool, always reviving the eligible one', () => {
    const created = createCombat({
      seed: SEED,
      player: { party: playerParty },
      enemy: { party: enemyParty },
      registries: { scripts: scripts, traits: traits },
    })
    // createCombat resets currentHp/revivesUsed at fight-setup (S1/D3), so the pre-capped,
    // pre-dead starting state has to be applied here, after creation -- see this fixture's own
    // header comment (mirrors golden-dot.fixture.ts's identical constraint).
    const withCapped = updateCreature(created, CAPPED, {
      alive: false,
      currentHp: 0,
      revivesUsed: MAX_REVIVES_PER_CREATURE,
    })
    const initial = updateCreature(withCapped, ELIGIBLE, { alive: false, currentHp: 0 })

    const { events } = resolveTurn(initial)

    expect(events).toEqual(expectedEvents)
  })
})
