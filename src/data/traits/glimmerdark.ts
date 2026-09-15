import type { Trait } from '../../engine/effect-types'

// ---- Phase 4 Slice H2: Glimmerdark (floors 11-20) -- real per-species content, built entirely
// on primitives already proven through Slice E2 (no new engine work needed, same discipline as
// H1). Player-facing plain-language descriptions with exact numbers live in
// .claude/content/glimmerdark.md -- kept in sync with the numbers below.
//
// Same enabler/payoff/amplifier framing as Overgrowth (common/uncommon/rare), except where
// species-locked.md names a single shared mechanic instead of a two-role chain (Resonants,
// Gloomjaws) -- there, all three creatures play the SAME mechanic at escalating scope/strength
// by rarity, per that file's own "members ... " / "self-contained" phrasing (no separate
// enabler exists to chain off).

// ---- Glowflies (Wit/Instinct lean) -- closed mechanic: Charge & release (Glow + consume-stacks) ----

/** Glowflies' Charger (enabler): every turn, charges the team's hardest hitter with a stack of
 * Glow (a `damage-modifier` status, +8% dealt per stack -- see data/statuses.ts's GLOW) --
 * `highest-attack-ally` is a deterministic, RNG-free selector (no lookahead-purity concern),
 * and "ally" includes the Charger itself, so a lone Charger just charges itself. */
export const GLOWFLY_CHARGER_TRAIT: Trait = {
  id: 'glowfly-charger-charge-up',
  name: 'Charge Up',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'selector', selector: { kind: 'highest-attack-ally' } },
        status: { statusId: 'glow' },
      },
    },
  ],
}

/** Glowflies' Detonator (payoff): the canonical consume-stacks consumer (effect-types.ts's own
 * doc-comment example) -- reads and clears its OWN Glow stacks on its very next attack, bursting
 * Intelligence-scaled damage scaled by the consumed count. A no-op (0 stacks) until a Charger
 * (or the shared Wit spell, Beacon Charge) has actually charged it. */
export const GLOWFLY_DETONATOR_TRAIT: Trait = {
  id: 'glowfly-detonator-overload',
  name: 'Overload',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'consume-stacks',
        statusId: 'glow',
        effect: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          scalingStat: 'intelligence',
          magnitudeSource: { kind: 'consumed-stacks' },
        },
      },
    },
  ],
}

/** Glowflies' Radiant (amplifier, Vitality coverage sprinkle -- species-locked.md: "Vitality
 * absent at species level ... sprinkling Vitality creatures into these species at stamping"): a
 * genuinely distinct mechanic from BOTH Charger and Detonator -- it never single-target-charges
 * (Charger's job alone) and never consumes-to-burst (Detonator's job alone). Instead, once at
 * fight-start, it charges the WHOLE team with 2 Glow stacks at once -- breadth over depth, a
 * one-time team-wide jolt vs. Charger's repeating single-target trickle. */
export const GLOWFLY_RADIANT_TRAIT: Trait = {
  id: 'glowfly-radiant-swarm-glow',
  name: 'Swarm Glow',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'all-allies' },
        status: { statusId: 'glow', stacks: 2 },
      },
    },
  ],
}

// ---- Blindclaws (Instinct lean) -- closed mechanic: ambush via turn order ----

/** Blindclaws' Setter (enabler): every turn, grants the team's hardest hitter the initiative --
 * `grant-act-first` (turn-order-status, position 'first' -- see data/statuses.ts), so that ally
 * acts first starting NEXT round (re-application refreshes, same "own-turn-start, affects future
 * rounds" pattern as Overgrowth's Weaver Webbing an enemy). */
export const BLINDCLAWS_SETTER_TRAIT: Trait = {
  id: 'blindclaws-setter-mark-the-prey',
  name: 'Mark the Prey',
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

/** Blindclaws' Striker (payoff): "+% while acting before its target" (species-locked.md) --
 * ASSUMPTION (H2, flagged): `acted-before-target` (Slice C) can only ever evaluate true when
 * checked against a scripting RULE's own `targeting` selector (`evaluateCondition`'s
 * `ruleTargeting` parameter) -- every OTHER call site (a `TriggeredDef`/`conditional-damage-
 * bonus`'s own condition, resolution.ts:220/449) passes no rule context, so the condition is
 * always false there by construction. There is therefore no way to express "+% damage while
 * acting first" as a passive trait effect; the only legal, engine-real way to consume this
 * condition as actual content is via the creature's own SCRIPT. Built here as a real behavioral
 * difference instead of a numeric one: Striker's `defaultScriptId` (species/glimmerdark.ts) is
 * the new `ambush-strike` stock script (data/scripts.ts) -- it strikes the lowest-HP enemy only
 * when it can act before that enemy this round (i.e. it has the initiative, whether from raw
 * Speed or a Setter/Vanguard grant), and holds position (Defends) otherwise. This is the first
 * real roster use of `acted-before-target`, per species-locked.md's own "first roster use" note.
 * Its OWN trait is a small, separate, legal mechanic that complements the ambush identity without
 * touching the blocked condition: bonus Attack scaled off its own (high) Speed. */
export const BLINDCLAWS_STRIKER_TRAIT: Trait = {
  id: 'blindclaws-striker-killing-instinct',
  name: 'Killing Instinct',
  effects: [
    {
      category: 'cross-stat',
      fromStat: 'speed',
      percentPerRank: 0.2,
      appliesTo: 'attack',
    },
  ],
}

/** Blindclaws' Vanguard (amplifier): a genuinely distinct mechanic from both Setter and Striker
 * -- self-sufficient initiative, re-granting itself act-first every turn (so it never needs a
 * Setter's help, unlike Striker), with a plain attack script rather than Striker's conditional
 * ambush-or-Defend one (it doesn't need to gate on initiative -- it always has it). */
export const BLINDCLAWS_VANGUARD_TRAIT: Trait = {
  id: 'blindclaws-vanguard-always-ahead',
  name: 'Always Ahead',
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
// species-locked.md names ONE shared mechanic ("members on-ally-action(cast) -> gain
// Attack/Int"), not a two-role enabler/payoff chain -- all three creatures share the same
// on-action-observed reaction, escalating scope/strength by rarity (common/uncommon/rare), per
// the file's own "power up around casters" framing. Resonants are the ONLY locked
// on-action-observed consumer across every species/starter/spec tree (CONVENTIONS).

/** Resonant Chorus (common): the biome's one cast-role creature (defaultScriptId 'always-cast',
 * species/glimmerdark.ts) -- reinforces its own "caster synergy" identity by being a caster
 * itself. +5% Attack whenever an ally (including itself) casts. */
export const RESONANT_CHORUS_TRAIT: Trait = {
  id: 'resonant-chorus-harmonize',
  name: 'Harmonize',
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
export const RESONANT_ADEPT_TRAIT: Trait = {
  id: 'resonant-adept-resonate',
  name: 'Resonate',
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

/** Resonant Overtone (rare, amplifier): gains BOTH stats per ally cast -- literally "gain
 * Attack/Int" (species-locked.md), the fullest harmonization. Two separate TriggeredDef entries
 * on the same hook, same shape as Sparkeaters' two-stat steal below. */
export const RESONANT_OVERTONE_TRAIT: Trait = {
  id: 'resonant-overtone-crescendo',
  name: 'Crescendo',
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
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'intelligence',
        factor: 1.05,
      },
    },
  ],
}

// ---- Sparkeaters (Wit/Violence lean) -- closed mechanic: stat parasites ----
// species-locked.md: "Drainers (on-attack -> -stat enemy + same +stat self, both
// permanent-for-fight)" -- a flat "stat parasite" identity with no enabler/payoff chain (like
// Resonants above), so each creature drains a different stat, escalating to both at once for the
// amplifier -- broader, not merely bigger, per this species' own identity (no exploit chain to
// keep distinct from, unlike Overgrowth's trap->exploit species).

/** Sparkeater Leech (common): every attack, permanently steals 10% Attack from its target to
 * itself (two apply-stat-modifier responses on the same hook -- "free", per species-locked.md's
 * own "~free (2x apply-stat-modifier)" note). */
export const SPARKEATER_LEECH_TRAIT: Trait = {
  id: 'sparkeater-leech-drain',
  name: 'Drain',
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
export const SPARKEATER_GORGER_TRAIT: Trait = {
  id: 'sparkeater-gorger-gorge',
  name: 'Gorge',
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

/** Sparkeater Voidmaw (rare, amplifier, Vitality coverage sprinkle): drains BOTH Attack and
 * Defence in the same hit -- broader than either specialist, not a bigger single steal. Four
 * apply-stat-modifier responses on the same hook. */
export const SPARKEATER_VOIDMAW_TRAIT: Trait = {
  id: 'sparkeater-voidmaw-consume',
  name: 'Consume',
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

// ---- Gloomjaws (Violence lean) -- closed mechanic: execute the weak ----
// species-locked.md: "on-damage-dealt -> bonus vs targets below X% HP (self-contained)" -- a
// single shared mechanic (like Resonants), escalating threshold/magnitude by rarity. Built as
// `conditional-damage-bonus` (Slice E2), condition subject 'target' -- the exact primitive
// CONVENTIONS names Gloomjaws under.

/** Gloomjaw Stalker (common): +30% damage to enemies below 30% HP. */
export const GLOOMJAW_STALKER_TRAIT: Trait = {
  id: 'gloomjaw-stalker-predatory-instinct',
  name: 'Predatory Instinct',
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

/** Gloomjaw Executioner (uncommon): a bigger bonus at a tighter threshold. */
export const GLOOMJAW_EXECUTIONER_TRAIT: Trait = {
  id: 'gloomjaw-executioner-finishing-blow',
  name: 'Finishing Blow',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.5,
      condition: {
        kind: 'hp-percent',
        subject: 'target',
        qualifier: 'any',
        comparator: '<',
        thresholdPercent: 20,
      },
    },
  ],
}

/** Gloomjaw Ravager (rare, amplifier): a genuinely distinct ANGLE, not just a bigger number --
 * on top of the biggest execute bonus, it also ignores 20% of every target's Defence outright
 * (armor-penetration, Slice B), unconditionally -- it doesn't just hit low-HP targets harder, it
 * gets through armor to put them there faster. */
export const GLOOMJAW_RAVAGER_TRAIT: Trait = {
  id: 'gloomjaw-ravager-annihilating-strike',
  name: 'Annihilating Strike',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.7,
      condition: {
        kind: 'hp-percent',
        subject: 'target',
        qualifier: 'any',
        comparator: '<',
        thresholdPercent: 15,
      },
    },
    { category: 'armor-penetration', percent: 0.2 },
  ],
}

// ---- Shellbacks (Endurance lean) -- closed mechanic: armor-as-weapon ----

/** Shellback Warden (enabler/"Builder"): every turn, permanently raises the whole team's Defence
 * by 10% -- compounding round over round, same shape as Overgrowth's Pollenlord/Queen. */
export const SHELLBACK_WARDEN_TRAIT: Trait = {
  id: 'shellback-warden-fortify',
  name: 'Fortify',
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

/** Shellback Brawler (payoff/"attacker"): species-locked.md's "attacker uses stat-remap
 * Defence->Attack" -- its Attack action reads its own (high) effective Defence instead of Attack
 * entirely, "armor-as-weapon" literally. Pairs with a correspondingly high-Defence/low-Attack
 * base stat line (species/glimmerdark.ts). */
export const SHELLBACK_BRAWLER_TRAIT: Trait = {
  id: 'shellback-brawler-shell-fist',
  name: 'Shell Fist',
  effects: [{ category: 'stat-remap', slot: 'attack', fromStat: 'defence' }],
}

/** Shellback Bulwark (amplifier): a genuinely distinct mechanic from Brawler's OFFENSIVE
 * armor-as-weapon -- this is the DEFENSIVE mirror (Thorns/Shield Bash-shaped, `deal-damage`'s
 * `scalingStat`, per CONVENTIONS' own named example): whenever it takes damage, it retaliates
 * for damage scaled off its own Defence, not Attack. */
export const SHELLBACK_BULWARK_TRAIT: Trait = {
  id: 'shellback-bulwark-retaliating-shell',
  name: 'Retaliating Shell',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
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
// species-locked.md: "Every hit steals a stat (permanent -you/+it, same as Sparkeaters); you
// hollow out over time -- answer is raw burst. Lean identity (no heavy add layer)." A single,
// bigger-magnitude version of Sparkeaters' own steal shape (Leech's exact mechanism, at boss
// scale) -- deliberately ONE mechanic, no second effect, per the design doc's own "lean identity."

export const LEECH_SOVEREIGN_TRAIT: Trait = {
  id: 'leech-sovereign-vital-siphon',
  name: 'Vital Siphon',
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
