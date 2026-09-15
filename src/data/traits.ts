import type { Trait } from '../engine/effect-types'
import { effectiveMaxHp } from '../engine/effects'
import { STARTER_TRAITS } from './species/starters'

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

/** Triggered + apply-status: when dealt damage, this creature is stunned (reeling) for 1 round.
 * Exercises Stun's condition-status suppress-action end-to-end from a trait's apply-status
 * response (Slice C). */
export const REELING: Trait = {
  id: 'reeling',
  name: 'Reeling',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'stun', duration: 1 },
      },
    },
  ],
}

/** Triggered edge-case content, for the round-end-interaction golden: three effects on one
 * trait. (1) on-round-end: a lethal self-hit. (2) on-round-end: would damage the lowest-HP ally
 * -- MUST be skipped when (1) already killed the bearer this same sweep (fireHook's fresh
 * per-effect alive-check). (3) on-death: applies Weaken to the lowest-HP ally -- fires
 * regardless, proving on-death still runs for a creature that died mid-sweep. */
export const CATASTROPHIC_COLLAPSE: Trait = {
  id: 'catastrophic-collapse',
  name: 'Catastrophic Collapse',
  effects: [
    {
      category: 'triggered',
      hook: 'on-round-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: 999,
        emitTriggerFired: false,
        damageSource: 'dot',
      },
    },
    {
      category: 'triggered',
      hook: 'on-round-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
        offStat: 'attack',
        spellPower: 0.5,
      },
    },
    {
      category: 'triggered',
      hook: 'on-death',
      response: {
        kind: 'apply-status',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
        status: { statusId: 'weaken', duration: 2 },
      },
    },
  ],
}

// ---- Phase 4 Slice H1: The Overgrowth (floors 1-10) -- real per-species content, additive
// (same guardrail as STARTER_TRAITS above). Every creature's own doc comment in
// data/species/overgrowth.ts explains its ROLE within its species; the mechanism doc comments
// here explain the trait's own shape. Player-facing plain-language descriptions with exact
// numbers live in .claude/content/overgrowth.md -- kept in sync with the numbers below.

/** Spiders' Weaver (enabler): at the start of its own turn, Webs a random living enemy --
 * unconditional, decoupled from whatever action it then takes (unlike Lullpollen's Sleeper,
 * which is attack-triggered). Fires on-turn-start -> apply-status(random-enemy selector). */
export const SPIDER_WEAVER_TRAIT: Trait = {
  id: 'spider-weaver-web-strike',
  name: 'Web Strike',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'selector', selector: { kind: 'random-enemy' } },
        status: { statusId: 'web' },
      },
    },
  ],
}

/** Spiders' Ambusher (payoff): a passive conditional-damage-bonus (Slice E2), condition subject
 * 'target' -- folds straight into the attacker's own dealtMods pool for whichever hit lands on a
 * Webbed target. Applies to both Attack and Cast (actionKind left unset -> 'both'). */
export const SPIDER_AMBUSHER_TRAIT: Trait = {
  id: 'spider-ambusher-exploit',
  name: 'Exploit',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.4,
      condition: { kind: 'has-status', subject: 'target', statusId: 'web' },
    },
  ],
}

/** Spiders' Broodwarden (amplifier): a genuinely distinct mechanic from BOTH Weaver and
 * Ambusher, not the two of them combined -- it never applies Web itself (that's Weaver's job
 * alone) and never reads a flat conditional bonus off ITS OWN hit (that's Ambusher's job alone).
 * Instead, every attack lands a SEPARATE bonus hit whose power grows with how many enemies are
 * CURRENTLY Webbed -- "rewards multiple Webs out" read as a live count-scaling bonus (deal-
 * damage's own magnitudeSource, Slice D), a payoff-of-the-payoff that depends entirely on its
 * species-mates having done their own jobs, rather than doing any part of those jobs itself. */
export const SPIDER_BROODWARDEN_TRAIT: Trait = {
  id: 'spider-broodwarden-entangling-brood',
  name: 'Entangling Brood',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        scalingStat: 'attack',
        spellPower: 0.25,
        magnitudeSource: { kind: 'count', of: 'enemies-with-status', statusId: 'web' },
      },
    },
  ],
}

/** Swarmhive's Drone (enabler): species-locked.md calls it a "cheap body," but every creature
 * needs its own real mechanic (no trait-less filler) -- a small on-death parting sting fits a
 * cheap, expendable swarm body without stepping on Striker/Queen's own count-scaling payoff.
 * Strikes a RANDOM living enemy, not necessarily its own killer. */
export const SWARMHIVE_DRONE_TRAIT: Trait = {
  id: 'swarmhive-drone-final-sting',
  name: 'Final Sting',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death',
      response: {
        kind: 'deal-damage',
        target: { kind: 'selector', selector: { kind: 'random-enemy' } },
        offStat: 'attack',
        spellPower: 0.3,
      },
    },
  ],
}

/** Swarmhive's Striker (payoff): "scales per hive-mate in the team" -- the Slice E2-DECIDED
 * shape for this exact species (CONVENTIONS' own Phase 4 addenda names Swarmhive Striker as
 * apply-stat-modifier's magnitudeSource consumer): fires once on-fight-start, freeze-at-
 * application, count = living-allies-of-species (INCLUDES self) at that moment -- never
 * re-reads live after. */
export const SWARMHIVE_STRIKER_TRAIT: Trait = {
  id: 'swarmhive-striker-hive-mind',
  name: 'Hive Mind',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.2,
        magnitudeSource: { kind: 'count', of: 'living-allies-of-species' },
      },
    },
  ],
}

/** Swarmhive's Queen (amplifier): the anchor -- a genuinely distinct mechanic from Striker
 * (design note: an amplifier should never just combine its species-mates' own effects). Every
 * time her own turn starts, she permanently buffs the WHOLE Swarmhive team's Attack by a flat
 * 10% -- the new `all-allies-of-species` ResponseTarget (effect-types.ts), a fresh
 * StatModifierEffect appended to every qualifying ally each firing, compounding round over
 * round for as long as she's alive and acting. */
export const SWARMHIVE_QUEEN_TRAIT: Trait = {
  id: 'swarmhive-queen-hive-anchor',
  name: 'Hive Anchor',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies-of-species' },
        stat: 'attack',
        factor: 1.1,
      },
    },
  ],
}

/** Treants' Sapling (enabler): permanently grows its own max Health every round-end (a fresh
 * StatModifierEffect instance each firing, compounding multiplicatively -- base x Pi(factors),
 * per the unified effect framework's own fold rule). */
export const TREANT_SAPLING_TRAIT: Trait = {
  id: 'treant-sapling-taking-root',
  name: 'Taking Root',
  effects: [
    {
      category: 'triggered',
      hook: 'on-round-end',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'health',
        factor: 1.1,
      },
    },
  ],
}

/** Treants' Elder (payoff): "heals the line" -- heal's own scalingStat mode (Slice E2, Treants
 * Elder is the CANONICAL example in that mechanism's own doc comment), scaling off the HEALER's
 * own effective Health, landing on the lowest-HP ally every round-end. */
export const TREANT_ELDER_TRAIT: Trait = {
  id: 'treant-elder-verdant-ward',
  name: 'Verdant Ward',
  effects: [
    {
      category: 'triggered',
      hook: 'on-round-end',
      response: {
        kind: 'heal',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
        scalingStat: 'health',
        spellPower: 0.15,
      },
    },
  ],
}

/** Treants' Grovekeep (amplifier): "huge sustained wall" via its OWN mechanic, not Sapling's
 * self-growth or Elder's single-ally heal-over-time reused -- once, at fight-start, it roots the
 * WHOLE team into the grove, permanently raising every living ally's max Health at once. Neither
 * self-only (like Sapling) nor round-repeating (like Elder/Sapling) -- a one-time, team-wide
 * effect instead. */
export const TREANT_GROVEKEEP_TRAIT: Trait = {
  id: 'treant-grovekeep-ancient-growth',
  name: 'Ancient Growth',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'health',
        factor: 1.15,
      },
    },
  ],
}

/** Pollinators' Duster (enabler): spreads a permanent, non-health stat-buff to the whole team
 * once, at fight-start. */
export const POLLINATOR_DUSTER_TRAIT: Trait = {
  id: 'pollinator-duster-pollen-drift',
  name: 'Pollen Drift',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'speed',
        factor: 1.25,
      },
    },
  ],
}

/** Pollinators' Beneficiary (payoff): "capitalizes on a buffed team" -- reads its OWN
 * (Duster-buffed) effective Speed as bonus Attack via cross-stat (Slice B), so raising the
 * team's Speed literally raises this creature's own damage; never a status/trigger, folded
 * straight into the formula. */
export const POLLINATOR_BENEFICIARY_TRAIT: Trait = {
  id: 'pollinator-beneficiary-thriving',
  name: 'Thriving',
  effects: [
    {
      category: 'cross-stat',
      fromStat: 'speed',
      percentPerRank: 0.3,
      appliesTo: 'attack',
    },
  ],
}

/** Pollinators' Pollenlord (amplifier): a genuinely distinct mechanic from Duster, not a bigger
 * copy of it -- instead of one buff at fight-start, a SMALLER team Speed buff repeats every time
 * Pollenlord's own turn comes around, compounding round over round for as long as it's alive and
 * acting. */
export const POLLINATOR_POLLENLORD_TRAIT: Trait = {
  id: 'pollinator-pollenlord-bloom-surge',
  name: 'Bloom Surge',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'speed',
        factor: 1.1,
      },
    },
  ],
}

/** Snapjaws' Lure (enabler): Provoking also grants itself Defending -- pulls aggro AND tanks the
 * redirected hits (grant-action-state, reusing Defend's existing math verbatim). Needs an
 * always-provoke script to actually fire on-provoke each turn. */
export const SNAPJAW_LURE_TRAIT: Trait = {
  id: 'snapjaw-lure-maw-of-thorns',
  name: 'Maw of Thorns',
  effects: [
    {
      category: 'triggered',
      hook: 'on-provoke',
      response: { kind: 'grant-action-state', target: { kind: 'self' }, defending: true },
    },
  ],
}

/** Snapjaws' Jaws (payoff): a bigger retaliate than the Phase 3 representative RETALIATE trait
 * (0.3) -- a real "big retaliate" per species-locked.md. */
export const SNAPJAW_JAWS_TRAIT: Trait = {
  id: 'snapjaw-jaws-snapback',
  name: 'Snapback',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        offStat: 'attack',
        spellPower: 0.6,
      },
    },
  ],
}

/** Snapjaws' Ironjaw (amplifier): a genuinely distinct mechanic from Lure and Jaws, not a
 * combination of the two -- a self-ramping wall, permanently raising its own Defence by 20%
 * every time its own turn comes around, compounding round over round. */
export const SNAPJAW_IRONJAW_TRAIT: Trait = {
  id: 'snapjaw-ironjaw-iron-maw',
  name: 'Iron Maw',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'defence',
        factor: 1.2,
      },
    },
  ],
}

/** Lullpollen's Sleeper (enabler): a CHANCE (unlike Spiders' unconditional Web) to Sleep its
 * target on attack -- species-locked.md explicitly calls out "chance" for Sleeper, unlike
 * Weaver. */
export const LULLPOLLEN_SLEEPER_TRAIT: Trait = {
  id: 'lullpollen-sleeper-lulling-touch',
  name: 'Lulling Touch',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      chancePercent: 40,
      response: {
        kind: 'apply-status',
        target: { kind: 'triggering-source' },
        status: { statusId: 'sleep' },
      },
    },
  ],
}

/** Lullpollen's Reaper (payoff): "+% dmg to Sleeping" -- the same conditional-damage-bonus shape
 * as Spiders' Ambusher, gated on Sleep instead of Web. */
export const LULLPOLLEN_REAPER_TRAIT: Trait = {
  id: 'lullpollen-reaper-dream-reaper',
  name: 'Dream Reaper',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.5,
      condition: { kind: 'has-status', subject: 'target', statusId: 'sleep' },
    },
  ],
}

/** Lullpollen's Dozer (amplifier): a genuinely distinct mechanic from BOTH Sleeper and Reaper --
 * it never rolls to apply Sleep itself (Sleeper's job alone) and never reads a flat conditional
 * bonus off its OWN hit (Reaper's job alone). Instead, every attack lands a SEPARATE bonus hit
 * whose power grows with how many enemies are CURRENTLY Sleeping -- the exact same live
 * count-scaling shape as Spiders' Broodwarden (deal-damage's magnitudeSource, Slice D), reused
 * for a different status: a payoff-of-the-payoff that depends entirely on its species-mates
 * having done their own jobs. */
export const LULLPOLLEN_DOZER_TRAIT: Trait = {
  id: 'lullpollen-dozer-drowsy-bloom',
  name: 'Drowsy Bloom',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        scalingStat: 'attack',
        spellPower: 0.25,
        magnitudeSource: { kind: 'count', of: 'enemies-with-status', statusId: 'sleep' },
      },
    },
  ],
}

/** The Broodmother (floor-10 boss, `data/species/overgrowth.ts`'s `BROODMOTHER`). Live
 * count-scaling (NOT frozen, unlike Swarmhive Striker/Queen): every attack lands a second,
 * scaled hit whose power grows with her OWN living-allies-of-species count (herself + living
 * spiderling adds) -- "kill adds to weaken her" requires a LIVE recompute, so this reuses the
 * exact same on-attack magnitudeSource trick as Broodwarden above, just keyed on her own side's
 * count instead of the enemy Webbed count. A second effect Webs the whole party each round-end,
 * at a chance. */
export const BROODMOTHER_TRAIT: Trait = {
  id: 'broodmother-swarm-call',
  name: 'Swarm Call',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        scalingStat: 'attack',
        spellPower: 0.25,
        magnitudeSource: { kind: 'count', of: 'living-allies-of-species' },
      },
    },
    {
      category: 'triggered',
      hook: 'on-round-end',
      chancePercent: 40,
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'web' },
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
