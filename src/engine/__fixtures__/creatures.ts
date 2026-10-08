// Test-only fixtures. Not real content — see src/data/ for that (deferred). Never imported
// by src/app or src/ui.

import { createCreatureId } from '../ids'
import { DEFAULT_GEM_SLOT_COUNT } from '../config'
import type { Affinity, Creature, CreatureOrigin, Side, Spell } from '../types'
import type { ActiveEffect, BaselineEffectEntry } from '../effect-types'

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
  scriptId?: string | null
  equippedSpells?: readonly (Spell | null)[]
  defending?: boolean
  provoking?: boolean
  innateTraitIds?: readonly string[]
  activeEffects?: readonly ActiveEffect[]
  defendCount?: number
  speciesId?: string
  /** Phase 4.1-A (A5): defaults to `{ templateId: <this creature's id>, level: 1 }` so the ~140
   * existing golden/fixture files that build creatures through this helper don't need to churn
   * now that Creature.origin is required. */
  origin?: CreatureOrigin
  /** Phase 4.1-H2a (ASSUMPTION 133): the engine-visible level the Additional reads. Defaults to
   * `DEFAULT_FIXTURE_LEVEL` (11), where the Additional is 0 for every target, so a fixture fight
   * keeps its direct-formula numbers unless it sets a level. Deliberately NOT tied to
   * `origin.level` (which keeps defaulting to 1 so XP-reading tests don't move); production keeps
   * the two equal via `materializeCreature`. */
  level?: number
  /** Phase 4.1-B (S1): defaults to `[]` -- most fixtures pass creatures through `createCombat`,
   * which ALWAYS recomputes this from `innateTraitIds` (never trusts the input), so an explicit
   * override is only useful for a test constructing a post-fight-setup `Creature` directly. */
  baselineEffects?: readonly BaselineEffectEntry[]
  /** Phase 4.1-B (D3): defaults to `0`, matching `createCombat`'s own always-reset-to-0 rule. */
  revivesUsed?: number
}

/** The level at which the Additional is 0 (the cap falls to 0 from level 11, config). */
export const DEFAULT_FIXTURE_LEVEL = 11

/** A flat, unremarkable baseline creature (all stats 20) for tests that don't care about specifics. */
export function makeCreature(overrides: CreatureOverrides = {}): Creature {
  const health = overrides.health ?? 20
  const id = overrides.id ?? 'test-creature'
  return {
    id: createCreatureId(id),
    side: overrides.side ?? 'player',
    slot: overrides.slot ?? 0,
    baseStats: {
      health,
      attack: overrides.attack ?? 20,
      intelligence: overrides.intelligence ?? 20,
      defence: overrides.defence ?? 20,
      speed: overrides.speed ?? 20,
    },
    affinity: overrides.affinity ?? 'vitality',
    currentHp: overrides.currentHp ?? health,
    alive: overrides.alive ?? true,
    scriptId: overrides.scriptId ?? null,
    equippedSpells:
      overrides.equippedSpells ??
      Array.from({ length: DEFAULT_GEM_SLOT_COUNT }, () => null),
    defending: overrides.defending ?? false,
    provoking: overrides.provoking ?? false,
    innateTraitIds: overrides.innateTraitIds ?? [],
    activeEffects: overrides.activeEffects ?? [],
    defendCount: overrides.defendCount ?? 0,
    speciesId: overrides.speciesId,
    origin: overrides.origin ?? { templateId: id, level: 1 },
    level: overrides.level ?? DEFAULT_FIXTURE_LEVEL,
    baselineEffects: overrides.baselineEffects ?? [],
    revivesUsed: overrides.revivesUsed ?? 0,
  }
}

/** Builds a full side's party array with correct sequential slots. */
export function makeParty(side: Side, creatures: CreatureOverrides[]): Creature[] {
  return creatures.map((overrides, slot) => makeCreature({ ...overrides, side, slot }))
}
