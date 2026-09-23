import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from '../combat'
import { applyStatus, newCascade } from '../resolution'
import {
  SEED,
  WRETCH,
  playerParty,
  enemyParty,
  scripts,
  traits,
  statuses,
  expectedEvents,
  TURN_STEPS,
} from './golden-hollowkin-wretch-self-dot.fixture'
import type { CombatEvent } from '../types'

describe('golden replay: PR #64 fix 3 -- triggering-source never resolves to the firing creature itself', () => {
  it("matches the committed event log exactly (Wretch's own Poison tick does not confuse itself)", () => {
    const created = createCombat(playerParty, enemyParty, SEED, scripts, traits, statuses)
    // Pre-apply Poison to WRETCH before any turn resolves -- into a throwaway events array,
    // mirroring the PR #64 repro's own setup idiom.
    const state = applyStatus(
      WRETCH,
      WRETCH,
      { statusId: 'poison' },
      created,
      [],
      newCascade(),
    )
    let working = state
    const events: CombatEvent[] = []

    for (let i = 0; i < TURN_STEPS; i++) {
      const step = resolveTurn(working)
      working = step.state
      events.push(...step.events)
    }

    expect(events).toEqual(expectedEvents)
    expect(working.result).toBeNull()
  })
})
