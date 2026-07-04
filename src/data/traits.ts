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

/** Triggered: when dealt damage, strike the attacker back for 30% Attack (the real Attack
 * formula). Death pre-empts it — a creature killed by the hit does not retaliate. */
export const RETALIATE: Trait = {
  id: 'retaliate',
  name: 'Retaliate',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        offStat: 'attack',
        spellPower: 0.3,
      },
    },
  ],
}

/** Triggered: when an ally dies, permanently gain +50% Attack for the rest of the fight
 * (a multiplicative stat-modifier; stacks if multiple allies fall). */
export const GRUDGE: Trait = {
  id: 'grudge',
  name: 'Grudge',
  effects: [
    {
      category: 'triggered',
      hook: 'on-ally-death',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.5,
      },
    },
  ],
}

/** Triggered: when dealt damage, lashes out at ITSELF for 30% Attack. Its own on-damage-taken
 * would re-fire this same instance, but the stack-scoped self-re-entry guard blocks that — so it
 * strikes once, not forever. (Exists to exercise loop safety.) */
export const RECKLESS: Trait = {
  id: 'reckless',
  name: 'Reckless',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        offStat: 'attack',
        spellPower: 0.3,
      },
    },
  ],
}

/** Triggered + CONDITIONAL: retaliates for 30% Attack, but only while below half HP. The
 * condition (self HP% < 50) reuses the scripting Condition union, evaluated self-scoped at fire
 * time -- so it stays silent while healthy and kicks in once wounded. */
export const VENGEFUL: Trait = {
  id: 'vengeful',
  name: 'Vengeful',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      condition: {
        kind: 'hp-percent',
        subject: 'self',
        qualifier: 'any',
        comparator: '<',
        thresholdPercent: 50,
      },
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        offStat: 'attack',
        spellPower: 0.3,
      },
    },
  ],
}

export const STOCK_TRAITS: readonly Trait[] = [
  BRUTISH,
  BLOODLUST,
  SWIFT_STRIKER,
  RETALIATE,
  GRUDGE,
  RECKLESS,
  VENGEFUL,
]

/** Ready to pass directly as createCombat's `traits` argument. */
export const TRAIT_REGISTRY: ReadonlyMap<string, Trait> = new Map(
  STOCK_TRAITS.map((t) => [t.id, t]),
)
