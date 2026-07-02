// Test-only fixtures. Not real content — see src/data/ for that (deferred). Never imported
// by src/app or src/ui.

import { createCreatureId } from '../ids'
import type { Affinity, Creature, Side } from '../types'

export interface CreatureOverrides {
  id?: string
  side?: Side
  slot?: number
  health?: number
  attack?: number
  intelligence?: number
  defence?: number
  speed?: number
  affinity?: Affinity
  currentHp?: number
  alive?: boolean
}

/** A flat, unremarkable baseline creature (all stats 20) for tests that don't care about specifics. */
export function makeCreature(overrides: CreatureOverrides = {}): Creature {
  const health = overrides.health ?? 20
  return {
    id: createCreatureId(overrides.id ?? 'test-creature'),
    side: overrides.side ?? 'player',
    slot: overrides.slot ?? 0,
    baseStats: {
      health,
      attack: overrides.attack ?? 20,
      intelligence: overrides.intelligence ?? 20,
      defence: overrides.defence ?? 20,
      speed: overrides.speed ?? 20,
    },
    affinity: overrides.affinity ?? 'body',
    currentHp: overrides.currentHp ?? health,
    alive: overrides.alive ?? true,
  }
}

/** Builds a full side's party array with correct sequential slots. */
export function makeParty(side: Side, creatures: CreatureOverrides[]): Creature[] {
  return creatures.map((overrides, slot) => makeCreature({ ...overrides, side, slot }))
}
