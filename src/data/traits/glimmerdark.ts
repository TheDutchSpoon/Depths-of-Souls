import type { DescribedTrait } from './described'

// ---- Glimmerdark (floors 11-20) -- real per-species content, built entirely
// on primitives the engine already has (no new engine work needed, same discipline as
// Overgrowth). Player-facing plain-language descriptions with exact numbers live in
// .claude/content/glimmerdark.md -- kept in sync with the numbers below.
//
// Same enabler/payoff/amplifier framing as Overgrowth (common/uncommon/rare), except where
// `content/glimmerdark.md#resonants-wit-caster-synergy` names a single shared mechanic instead of a two-role chain (Resonants,
// Gloomjaws) -- there, all three creatures play the SAME mechanic at escalating scope/strength
// by rarity (no separate enabler exists to chain off).

// ---- Flickerlings (Vitality/Wit/Violence) -- closed mechanic: the flame that feeds on itself.
// Names are placeholders; every number below is parked balance. ----

/** Flickerlings' Wick (enabler, Vitality): at the start of its turn it BURNS 10% of its own max
 * Health to heal the lowest-HP injured ally other than itself for 20% of its own max Health --
 * but only while some other ally is below max Health. Both effects carry the
 * trigger-only gate `other-ally-injured`, so with every other ally at full Health (or none alive)
 * it neither burns nor heals, and no stray `TriggerFired` is logged. Order matters: burn, then
 * heal (the burn can't change whether another ally is hurt; a lethal burn skips the heal because
 * `fireHook` re-checks `alive` per effect, and Last Stand can still save it).
 *
 * The burn is a COST: a self-targeted flat `StatPercent` with no `statusId`, so
 * it takes the cost path -- exact, ignoring Defence and modifiers -- and carries the default
 * `'dot'` label (nothing reads the label for the cost test). The heal's target is
 * the engine's `lowest-hp-injured-other-ally`, reading the same pool as the gate. Its amount reads
 * the Wick's OWN effective Health (`resolveFlatTotal` reads the firer). */
export const FLICKERLING_WICK_TRAIT: DescribedTrait = {
  id: 'flickerling-wick-burn-bright',
  name: 'Burn Bright',
  description:
    'At the start of its turn, only while another living ally is below maximum Health, it burns 10% of its own maximum HP to heal its lowest-HP injured ally other than itself for 20% of its own maximum HP. When every other ally is at full health (or none is left), it neither burns nor heals. The burn is a cost: exactly 10% of its maximum HP, whatever its Defence. It can kill the Wick, and then no heal follows (unless Last Stand saves it; the heal then proceeds).',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      condition: { kind: 'other-ally-injured' },
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { ofStat: 'health', percent: 10 },
      },
    },
    {
      category: 'triggered',
      hook: 'on-turn-start',
      condition: { kind: 'other-ally-injured' },
      response: {
        kind: 'heal',
        target: { kind: 'lowest-hp-injured-other-ally' },
        flatAmount: { ofStat: 'health', percent: 20 },
      },
    },
  ],
}

/** Flickerlings' Flare (payoff, Wit): the first trait to watch DAMAGE rather than actions. Whenever
 * an ally damages ITSELF -- a cost, the Wick's burn being the cost it exists for -- every living
 * ally permanently gains 15% Speed. `relationship: 'ally'` includes the Flare itself;
 * `selfInflicted` is the cost classification (never `source === target`), so an ordinary hit or a
 * DoT tick on an ally does not trigger it. Two Flares both fire (no `stacks: false`), so their
 * bonuses multiply (flagged for tuning). */
export const FLICKERLING_FLARE_TRAIT: DescribedTrait = {
  id: 'flickerling-flare-kindle',
  name: 'Kindle',
  description:
    "Whenever an ally damages itself (a cost, like the Wick's burn; never an ordinary hit or a damage-over-time tick), every living ally permanently gains 15% Speed. It counts itself as an ally, and two Flares both react, so their bonuses multiply.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-observed',
      observationFilter: { relationship: 'ally', selfInflicted: true },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'speed',
        factor: 1.15,
      },
    },
  ],
}

/** Flickerlings' Last Gleam (amplifier, Violence): whenever an ally dies, every living ally
 * permanently gains 20% Attack. `on-death-observed` leaves the dying creature out, so a Last
 * Gleam never reacts to its own death; two Gleams both fire and multiply. */
export const FLICKERLING_LAST_GLEAM_TRAIT: DescribedTrait = {
  id: 'flickerling-last-gleam-last-light',
  name: 'Last Light',
  description:
    "Whenever an ally dies, every living ally permanently gains 20% Attack. It doesn't react to its own death. Two Last Gleams both react, so their bonuses multiply.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-death-observed',
      observationFilter: { relationship: 'ally' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'attack',
        factor: 1.2,
      },
    },
  ],
}

// ---- Blindclaws (Instinct lean) -- closed mechanic: ambush via turn order ----

/** Blindclaws' Setter (enabler): every turn, grants the team's hardest hitter the initiative --
 * `grant-act-first` (a `turn-order` effect, position 'first' -- see data/statuses.ts), so that ally
 * acts first starting NEXT round (re-application refreshes; it affects future rounds' turn order
 * only, like Overgrowth's Weaver Webbing an enemy -- though the Weaver places its Web in its
 * turn-end hooks, so its own cleanup never rolls it; this grant stays at turn start). */
export const BLINDCLAWS_SETTER_TRAIT: DescribedTrait = {
  id: 'blindclaws-setter-mark-the-prey',
  name: 'Mark the Prey',
  description:
    'At the start of its own turn, grants Grant Act First to the living ally (itself included) with the highest Attack.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'selector', selector: { kind: 'highest-attack-ally' } },
        status: { statusId: 'grant-act-first' },
      },
    },
  ],
}

/** Blindclaws' Striker (payoff): a damage bonus while acting before its target
 * (`content/glimmerdark.md#blindclaws-striker`), the spec'd numeric payoff -- a real `conditional-damage-bonus` on the
 * `acted-before-target` condition, made possible by conditions.ts completing that
 * condition's non-scripting path. Action-selection (attack-or-Defend) is the scripting layer's
 * job, never a creature-identity trait -- Striker runs the plain `striker` role
 * (species/glimmerdark.ts), and this is its whole identity. Scoped to `actionKind: 'attack'`
 * (`content/glimmerdark.md#blindclaws-striker` is Attack-specific; the gems it casts when Pacified get no
 * bonus). */
export const BLINDCLAWS_STRIKER_TRAIT: DescribedTrait = {
  id: 'blindclaws-striker-killing-instinct',
  name: 'Killing Instinct',
  description:
    "Deals 35% more damage with its attacks when it acts before the enemy it is attacking this round (from its own Speed, or a Setter's or Vanguard's grant).",
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.35,
      actionKind: 'attack',
      condition: { kind: 'acted-before-target' },
    },
  ],
}

/** Blindclaws' Vanguard (amplifier): a genuinely distinct mechanic from both Setter and Striker
 * -- self-sufficient initiative, re-granting itself act-first every turn (so it never needs a
 * Setter's help, unlike Striker), with a plain attack script rather than Striker's conditional
 * ambush-or-Defend one (it doesn't need to gate on initiative -- it always has it). */
export const BLINDCLAWS_VANGUARD_TRAIT: DescribedTrait = {
  id: 'blindclaws-vanguard-always-ahead',
  name: 'Always Ahead',
  description:
    "At the start of each of its turns, grants itself Grant Act First, so it is always at the front of the next round's turn order without a Setter's help.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'grant-act-first' },
      },
    },
  ],
}

// ---- Resonants (Wit lean) -- closed mechanic: caster synergy (on-action-observed) ----
// `content/glimmerdark.md#resonants-wit-caster-synergy` names ONE shared mechanic (when an ally
// casts, the Resonant gains stats), not a two-role enabler/payoff chain -- all three
// creatures share the same on-action-observed reaction, escalating scope/strength by rarity
// (common/uncommon/rare). Resonants are the ONLY on-action-observed
// consumer across every species/starter/spec tree (`spec/effects.md#action-reactions-actor-self-hooks-or-observation`).

/** Resonant Chorus (common): a `caster` (species/glimmerdark.ts), one of the biome's cast roles
 * -- reinforces its own "caster synergy" identity by being a caster
 * itself. +5% Attack whenever an ally (including itself) casts. */
export const RESONANT_CHORUS_TRAIT: DescribedTrait = {
  id: 'resonant-chorus-harmonize',
  name: 'Harmonize',
  description: 'Whenever an ally casts a spell, its Attack permanently rises by 5%.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.05,
      },
    },
  ],
}

/** Resonant Adept (uncommon): the same reaction, favoring Intelligence instead of Attack, at a
 * slightly higher rate. */
export const RESONANT_ADEPT_TRAIT: DescribedTrait = {
  id: 'resonant-adept-resonate',
  name: 'Resonate',
  description:
    'Whenever an ally casts a spell, its Intelligence permanently rises by 8%.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'intelligence',
        factor: 1.08,
      },
    },
  ],
}

/** Resonant Overtone (rare, amplifier): echo-cast (`content/glimmerdark.md#resonant-overtone`):
 * `on-ally-action (cast) -> 10% the caster echo-casts a random one of its own
 * spells` (non-stacking; echoes are themselves observable -> chains). A
 * `perform-action(triggering-source, cast gemSlot 'random' at a 'random' target)` response -- the
 * observed caster (the bearer included: an `ally` observation includes self) casts again once the
 * original cast, payload and all, has completed (the grant is queued and drained after the
 * action). The chain passes through the same Overtone again each hop; only cascade depth bounds
 * it. `stacks: false` keeps the aggregate 10% chance from compounding when multiple Overtones
 * are on the board. */
export const RESONANT_OVERTONE_TRAIT: DescribedTrait = {
  id: 'resonant-overtone-crescendo',
  name: 'Crescendo',
  description:
    "Whenever an ally casts a spell, there's a 10% chance the caster casts again: a random one of its own equipped spells (possibly the same one), at a random valid target. The echo comes after the original cast has fully resolved, and it obeys every action rule: a Silenced caster can't echo, and a caster killed during its own cast (by a retaliation, say) loses the echo. An echo is observed like any cast (by a Chorus, an Adept, even an Overtone again), so it can chain into another echo. Only one Overtone echo can follow a cast, however many Overtones are on the field.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      chancePercent: 10,
      stacks: false,
      response: {
        kind: 'perform-action',
        actor: 'triggering-source',
        intent: {
          action: { kind: 'cast', gemSlot: 'random' },
          targeting: { kind: 'random' },
        },
      },
    },
  ],
}

// ---- Sparkeaters (Wit/Violence lean per `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites`) -- closed mechanic: stat parasites ----
// `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites`: a flat "stat
// parasite" identity with no enabler/payoff chain (like
// Resonants above), so each creature drains a different stat. Per-creature
// affinity matches the stat each one drains (`spec/creatures.md#affinity`) --
// Leech (Attack) -> violence, Gorger (Defence) -> endurance; Voidmaw stays vitality (species/
// glimmerdark.ts). Side effect: it shapes the biome's affinity spread
// (`content/glimmerdark.md#affinity-spread`).

/** Sparkeater Leech (common): every attack, permanently steals 10% Attack from its target to
 * itself (two apply-stat-modifier responses on the same hook, no new primitive;
 * `content/glimmerdark.md#sparkeater-leech`). */
export const SPARKEATER_LEECH_TRAIT: DescribedTrait = {
  id: 'sparkeater-leech-drain',
  name: 'Drain',
  description:
    'When it attacks, it permanently drains 10% Attack from its target into itself.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'triggering-source' },
        stat: 'attack',
        factor: 0.9,
      },
    },
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.1,
      },
    },
  ],
}

/** Sparkeater Gorger (uncommon): the same shape, draining Defence instead of Attack. */
export const SPARKEATER_GORGER_TRAIT: DescribedTrait = {
  id: 'sparkeater-gorger-gorge',
  name: 'Gorge',
  description:
    'When it attacks, it permanently drains 10% Defence from its target into itself.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'triggering-source' },
        stat: 'defence',
        factor: 0.9,
      },
    },
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'defence',
        factor: 1.1,
      },
    },
  ],
}

/** Sparkeater Voidmaw (rare, amplifier, Vitality coverage sprinkle): a max-HP parasite that
 * feeds the whole team, not just itself (a distinct mechanic from Leech's and Gorger's stat
 * steals). Every attack, it steals 10% max Health from its target (which also clamps the
 * target's CURRENT hp down, resolution.ts's post-stat-modifier clamp -- it bites) and raises
 * every living ally's (including itself) max Health by 5% (a ceiling raise only -- no auto-heal,
 * same `clampedHp` asymmetry Treant Grovekeep's one-time team +max-HP already established;
 * Voidmaw's version repeats every attack instead of firing once, so a smaller per-hit number). */
export const SPARKEATER_VOIDMAW_TRAIT: DescribedTrait = {
  id: 'sparkeater-voidmaw-consume',
  name: 'Consume',
  description:
    "When it attacks, it permanently drains 10% of its target's maximum HP (clamping the target's current HP down if it is above the new maximum) and raises every living ally's maximum HP, its own included, by 5%: a ceiling raise only, not a heal.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'triggering-source' },
        stat: 'health',
        factor: 0.9,
      },
    },
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'health',
        factor: 1.05,
      },
    },
  ],
}

// ---- Gloomjaws (Violence lean) -- closed mechanic: execute the weak ----
// Three distinct verbs toward one theme (`content/glimmerdark.md#gloomjaws-violence-execute-the-weak`):
// the Stalker executes (conditional-damage-bonus), the Executioner snowballs (a triggered apply-stat-modifier),
// the Ravager softens (armor-penetration). All three are existing primitives.

/** Gloomjaw Stalker (common): the finisher -- +30% damage to enemies below 30% HP. */
export const GLOOMJAW_STALKER_TRAIT: DescribedTrait = {
  id: 'gloomjaw-stalker-predatory-instinct',
  name: 'Predatory Instinct',
  description: 'Deals 30% more damage to enemies below 30% HP.',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.3,
      condition: {
        kind: 'hp-percent',
        subject: 'target',
        qualifier: 'any',
        comparator: '<',
        thresholdPercent: 30,
      },
    },
  ],
}

/** Gloomjaw Executioner (uncommon): a different verb from Stalker's execute bonus: snowballs off
 * finishing blows. Every kill permanently raises its own Attack by 15% for the rest of the fight
 * (apply-stat-modifier, same on-kill shape as the Rotfeeders') -- it doesn't
 * need a low-HP target to pay off, it needs kills. */
export const GLOOMJAW_EXECUTIONER_TRAIT: DescribedTrait = {
  id: 'gloomjaw-executioner-finishing-blow',
  name: 'Finishing Blow',
  description:
    'Every kill permanently raises its own Attack by 15% for the rest of the fight.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-kill',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.15,
      },
    },
  ],
}

/** Gloomjaw Ravager (rare, amplifier): armor-penetration is its WHOLE identity, unconditional --
 * it doesn't hit low-HP
 * targets harder, it ignores 30% of EVERY target's Defence outright, softening healthy targets
 * into the rest of the species' execute range faster. */
export const GLOOMJAW_RAVAGER_TRAIT: DescribedTrait = {
  id: 'gloomjaw-ravager-annihilating-strike',
  name: 'Annihilating Strike',
  description: "Ignores 30% of every target's Defence, unconditionally.",
  effects: [{ category: 'armor-penetration', percent: 0.3 }],
}

// ---- Shellbacks (Endurance lean) -- closed mechanic: armor-as-weapon ----

/** Shellback Warden (enabler/"Builder"): every turn, permanently raises the whole team's Defence
 * by 10% -- compounding round over round, same shape as Overgrowth's Pollenlord/Queen. */
export const SHELLBACK_WARDEN_TRAIT: DescribedTrait = {
  id: 'shellback-warden-fortify',
  name: 'Fortify',
  description:
    "At the start of each of its turns, permanently raises the whole team's Defence by 10%, again every round it acts, so it compounds.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'defence',
        factor: 1.1,
      },
    },
  ],
}

/** Shellback Brawler (payoff, attacker): `content/glimmerdark.md#shellback-brawler` -- its
 * Attack action reads its own (high) effective Defence instead of Attack
 * entirely, armor-as-weapon literally. Pairs with a correspondingly high-Defence/low-Attack
 * base stat line (species/glimmerdark.ts). */
export const SHELLBACK_BRAWLER_TRAIT: DescribedTrait = {
  id: 'shellback-brawler-shell-fist',
  name: 'Shell Fist',
  description: 'Its Attack action reads its own Defence instead of Attack.',
  effects: [{ category: 'stat-remap', slot: 'attack', fromStat: 'defence' }],
}

/** Shellback Bulwark (amplifier): a genuinely distinct mechanic from Brawler's OFFENSIVE
 * armor-as-weapon -- this is the DEFENSIVE mirror (Thorns/Shield Bash-shaped, `deal-damage`'s
 * `scalingStat`, per the example in `spec/responses.md#magnitude-modes`): whenever it takes damage from an
 * attack or spell, it retaliates for damage scaled off its own Defence, not Attack. */
export const SHELLBACK_BULWARK_TRAIT: DescribedTrait = {
  id: 'shellback-bulwark-retaliating-shell',
  name: 'Retaliating Shell',
  description:
    "Whenever an attack or spell hits it, it strikes back for 50% of its own Defence, as indirect damage. It doesn't answer a tick, a cost or another creature's trait, status or perk damage.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      damageChannel: 'direct',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        scalingStat: 'defence',
        spellPower: 0.5,
      },
    },
  ],
}

// ---- The Leech Sovereign (floor-20 boss) ----
// `content/glimmerdark.md#leech-sovereign`: a single, bigger-magnitude version of Sparkeaters' own
// steal shape (Leech's exact mechanism, at boss scale) -- deliberately ONE mechanic, no second
// effect (a lean boss).

export const LEECH_SOVEREIGN_TRAIT: DescribedTrait = {
  id: 'leech-sovereign-vital-siphon',
  name: 'Vital Siphon',
  description:
    "Every time she attacks, she permanently steals 20% of her target's Attack: the target's Attack falls by 20% and hers rises by 20%, on every hit.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'triggering-source' },
        stat: 'attack',
        factor: 0.8,
      },
    },
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.2,
      },
    },
  ],
}
