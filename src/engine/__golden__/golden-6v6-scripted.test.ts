import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../combat'
import type { CombatEvent } from '../types'
import {
  SEED,
  playerParty,
  enemyParty,
  scripts,
  expectedResult,
  expectedRoundCount,
  expectedRound1TurnOrder,
  expectedEventTypeCounts,
  expectedSpotCheckDamage,
  expectedProvokeRedirects,
} from './golden-6v6-scripted.fixture'

describe('golden replay: 6v6 scripted integration (generated, checkpoint-verified)', () => {
  it('matches the checkpointed structural properties of the real run', () => {
    const initial = createCombat(playerParty, enemyParty, SEED, scripts)
    const { state, events } = resolveFight(initial)

    expect(state.result).toBe(expectedResult)
    expect(state.round).toBe(expectedRoundCount)

    const round2Index = events.findIndex(
      (e) => e.type === 'RoundStarted' && e.round === 2,
    )
    const round1TurnOrder = events
      .slice(0, round2Index)
      .filter((e) => e.type === 'TurnStarted')
      .map((e) => e.creatureId)
    expect(round1TurnOrder).toEqual(expectedRound1TurnOrder)

    const counts: Partial<Record<CombatEvent['type'], number>> = {}
    for (const event of events) counts[event.type] = (counts[event.type] ?? 0) + 1
    expect(counts).toEqual(expectedEventTypeCounts)

    for (const expectedDamage of expectedSpotCheckDamage) {
      expect(events).toContainEqual(expectedDamage)
    }

    for (const redirect of expectedProvokeRedirects) {
      expect(events).toContainEqual({
        type: 'AttackDeclared',
        attackerId: redirect.attackerId,
        targetId: redirect.targetId,
      })
    }
  })
})
