import type { Trait } from '../../engine/effect-types'
import {
  BRUTISH,
  BLOODLUST,
  SWIFT_STRIKER,
  RETALIATE,
  GRUDGE,
  RECKLESS,
  VENGEFUL,
  REELING,
  CATASTROPHIC_COLLAPSE,
} from './core'
import { STARTER_TRAITS } from './starters'
import {
  SPIDER_WEAVER_TRAIT,
  SPIDER_AMBUSHER_TRAIT,
  SPIDER_BROODWARDEN_TRAIT,
  SWARMHIVE_DRONE_TRAIT,
  SWARMHIVE_STRIKER_TRAIT,
  SWARMHIVE_QUEEN_TRAIT,
  TREANT_SAPLING_TRAIT,
  TREANT_ELDER_TRAIT,
  TREANT_GROVEKEEP_TRAIT,
  POLLINATOR_DUSTER_TRAIT,
  POLLINATOR_BENEFICIARY_TRAIT,
  POLLINATOR_POLLENLORD_TRAIT,
  SNAPJAW_LURE_TRAIT,
  SNAPJAW_JAWS_TRAIT,
  SNAPJAW_IRONJAW_TRAIT,
  LULLPOLLEN_SLEEPER_TRAIT,
  LULLPOLLEN_REAPER_TRAIT,
  LULLPOLLEN_DOZER_TRAIT,
  BROODMOTHER_TRAIT,
} from './overgrowth'

// The library barrel (CONVENTIONS "Data layer — carriers vs. composition"): re-exports every
// individual trait const from its grouping file, and assembles the stable STOCK_TRAITS/
// TRAIT_REGISTRY names every consumer imports.
export * from './core'
export * from './starters'
export * from './overgrowth'

export const STOCK_TRAITS: readonly Trait[] = [
  BRUTISH,
  BLOODLUST,
  SWIFT_STRIKER,
  RETALIATE,
  GRUDGE,
  RECKLESS,
  VENGEFUL,
  REELING,
  CATASTROPHIC_COLLAPSE,
  // Phase 4 Slice F: the three starter creatures' + the Unicorn's signature traits (additive --
  // see the guardrail in phase-4-implementation-plan.md: real per-species/starter content gets
  // its own registry entries alongside the Phase 3 representative-and-temporary set above,
  // never replacing it).
  ...STARTER_TRAITS,
  // Phase 4 Slice H1: The Overgrowth's 18 species-creature traits + the Broodmother boss trait.
  SPIDER_WEAVER_TRAIT,
  SPIDER_AMBUSHER_TRAIT,
  SPIDER_BROODWARDEN_TRAIT,
  SWARMHIVE_DRONE_TRAIT,
  SWARMHIVE_STRIKER_TRAIT,
  SWARMHIVE_QUEEN_TRAIT,
  TREANT_SAPLING_TRAIT,
  TREANT_ELDER_TRAIT,
  TREANT_GROVEKEEP_TRAIT,
  POLLINATOR_DUSTER_TRAIT,
  POLLINATOR_BENEFICIARY_TRAIT,
  POLLINATOR_POLLENLORD_TRAIT,
  SNAPJAW_LURE_TRAIT,
  SNAPJAW_JAWS_TRAIT,
  SNAPJAW_IRONJAW_TRAIT,
  LULLPOLLEN_SLEEPER_TRAIT,
  LULLPOLLEN_REAPER_TRAIT,
  LULLPOLLEN_DOZER_TRAIT,
  BROODMOTHER_TRAIT,
]

/** Ready to pass directly as createCombat's `traits` argument. */
export const TRAIT_REGISTRY: ReadonlyMap<string, Trait> = new Map(
  STOCK_TRAITS.map((t) => [t.id, t]),
)
