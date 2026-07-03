import type { Trait } from '../engine/effect-types'
import { effectiveMaxHp } from '../engine/effects'

// Representative & temporary Phase 3 trait content — real data (with tests), exercising each
// Slice-A passive shape, until the actual creature roster is designed (Phase 4+) and replaces
// it. Triggered traits (retaliate etc.) land with Slice B; status-applying traits with Slice C.

/** Flat passive stat-modifier: always-on +30% Attack. */
export const BRUTISH: Trait = {
  id: 'brutish',
  name: 'Brutish',
  effects: [{ category: 'stat-modifier', stat: 'attack', factor: 1.3 }],
}

/**
 * Conditional passive: +25% Attack while at full HP. The predicate is evaluated at read-time
 * during stat folding; it reads currentHp + effective max Health (never Attack — no read-cycle).
 * currentHp is clamped to effective max, so `>=` means exactly "at full HP".
 */
export const BLOODLUST: Trait = {
  id: 'bloodlust',
  name: 'Bloodlust',
  effects: [
    {
      category: 'stat-modifier',
      stat: 'attack',
      factor: 1.25,
      predicate: (c) => c.currentHp >= effectiveMaxHp(c),
    },
  ],
}

/** Stat-remap: the Attack action reads Speed instead of Attack (a Speed-attacker build). */
export const SWIFT_STRIKER: Trait = {
  id: 'swift-striker',
  name: 'Swift Striker',
  effects: [{ category: 'stat-remap', slot: 'attack', fromStat: 'speed' }],
}

export const STOCK_TRAITS: readonly Trait[] = [BRUTISH, BLOODLUST, SWIFT_STRIKER]

/** Ready to pass directly as createCombat's `traits` argument. */
export const TRAIT_REGISTRY: ReadonlyMap<string, Trait> = new Map(
  STOCK_TRAITS.map((t) => [t.id, t]),
)
