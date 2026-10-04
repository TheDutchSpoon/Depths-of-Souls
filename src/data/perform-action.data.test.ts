// Phase 4.1-E (A2): the loop-safety lint for `perform-action` grants (CONVENTIONS "perform-action").
// Every `perform-action` trigger in every registry -- traits, specialization perks (at every level)
// and status triggers -- must carry a REAL guard: a `chancePercent` below 100, or a `condition`
// other than `always`. The depth bound is what guarantees termination; this is a lint against
// authoring an unconditional self-perpetuating grant. It reads the registries, never a hand list.

import { describe, expect, it } from 'vitest'
import {
  findUnguardedPerformActions,
  findUnguardedStatusPerformActions,
  performActionTriggers,
  statusPerformActionTriggers,
} from '../engine/effect-types'
import { TRAIT_REGISTRY } from './traits'
import { STATUS_REGISTRY } from './statuses'
import { SPECIALIZATIONS, resolvePerkEffects } from './specializations'

describe('perform-action guard lint (4.1-E)', () => {
  it('every perform-action trigger in the trait registry carries a real guard', () => {
    const unguarded: string[] = []
    for (const trait of TRAIT_REGISTRY.values()) {
      if (findUnguardedPerformActions(trait.effects).length > 0) unguarded.push(trait.id)
    }
    expect(unguarded).toEqual([])
  })

  it('every perform-action trigger in every perk (at every level) carries a real guard', () => {
    const unguarded: string[] = []
    for (const spec of SPECIALIZATIONS) {
      for (const perk of spec.perks) {
        for (let level = 1; level <= perk.maxLevel; level++) {
          const effects = resolvePerkEffects(perk, level)
          if (findUnguardedPerformActions(effects).length > 0) {
            unguarded.push(`${spec.id}/${perk.id}@${level}`)
          }
        }
      }
    }
    expect(unguarded).toEqual([])
  })

  it('every perform-action trigger in the status registry carries a real guard', () => {
    const unguarded: string[] = []
    for (const status of STATUS_REGISTRY.values()) {
      if (findUnguardedStatusPerformActions(status).length > 0)
        unguarded.push(status.statusId)
    }
    expect(unguarded).toEqual([])
  })

  it('is not vacuous: the lint sees the shipped grants (Arcane Surge and Resonant Overtone)', () => {
    const traitIds = [...TRAIT_REGISTRY.values()]
      .filter((t) => performActionTriggers(t.effects).length > 0)
      .map((t) => t.id)
      .sort()
    expect(traitIds).toEqual([
      'resonant-overtone-crescendo',
      'sorcerer-starter-arcane-surge',
    ])
    // No perk or status carries one today; if one is added, the lint above covers it.
    const statusCount = [...STATUS_REGISTRY.values()].reduce(
      (n, s) => n + statusPerformActionTriggers(s).length,
      0,
    )
    expect(statusCount).toBe(0)
  })
})
