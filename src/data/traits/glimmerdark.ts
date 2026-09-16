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

/** Blindclaws' Striker (payoff): "+% while acting before its target" (species-locked.md), now
 * the spec'd numeric payoff (PR #60 review, C1) -- a real `conditional-damage-bonus` on the
 * `acted-before-target` condition, made possible by E1 (conditions.ts) completing that
 * condition's non-scripting path. Action-selection (attack-or-Defend) is the scripting layer's
 * job, never a creature-identity trait -- the previous `ambush-strike` script (data/scripts.ts)
 * has been removed; Striker is back on the plain `always-attack` script
 * (species/glimmerdark.ts), and this is its whole identity. Scoped to `actionKind: 'attack'`
 * (species-locked.md's own wording is Attack-specific; Striker has no Cast loadout anyway). */
export const BLINDCLAWS_STRIKER_TRAIT: Trait = {
  id: 'blindclaws-striker-killing-instinct',
  name: 'Killing Instinct',
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

/** Resonant Overtone (rare, amplifier): PR #60 review -- replaces the previous "gain both
 * stats" (a bigger numeric copy of Chorus+Adept) with echo-cast, species-locked.md's actual
 * spec'd mechanic: `on-ally-action (cast) -> 10% the caster echo-casts a random one of its own
 * spells` (non-stacking; echoes are themselves observable -> chains). Built on the `echoCast`
 * primitive (effect-types.ts's `TriggeredDef.echoCast`, CONVENTIONS' H2 addenda) -- NOT a new
 * response verb, reusing the bonus-cast pattern via combat.ts's `runEchoCast`. `response` is a
 * structurally-required but functionally-inert placeholder (a `grant-action-state` with neither
 * flag set is a true no-op) -- never actually executed; firing this effect calls `runEchoCast`
 * instead (see fireHook's own echoCast branch, resolution.ts). `stacks: false` keeps the
 * aggregate 10% chance from compounding when multiple Overtones are on the board. */
export const RESONANT_OVERTONE_TRAIT: Trait = {
  id: 'resonant-overtone-crescendo',
  name: 'Crescendo',
  effects: [
    {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      chancePercent: 10,
      stacks: false,
      echoCast: true,
      response: { kind: 'grant-action-state', target: { kind: 'self' } },
    },
  ],
}

// ---- Sparkeaters (Wit/Violence lean per species-locked.md) -- closed mechanic: stat parasites ----
// species-locked.md: "Drainers (on-attack -> -stat enemy + same +stat self, both
// permanent-for-fight)" -- a flat "stat parasite" identity with no enabler/payoff chain (like
// Resonants above), so each creature drains a different stat. PR #60 review (C2): per-creature
// affinity now matches the stat each one drains, per CLAUDE.md's affinity->stat soft-mapping --
// Leech (Attack) -> violence, Gorger (Defence) -> endurance; Voidmaw stays vitality (species/
// glimmerdark.ts). Side effect: the biome's affinity spread flattens to 4/4/4/4/2.

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

/** Sparkeater Voidmaw (rare, amplifier, Vitality coverage sprinkle): PR #60 review (C3) --
 * replaces the previous "steal Attack+Defence" (a diluted copy of Leech+Gorger, not a distinct
 * mechanic) with a genuinely different one -- a max-HP parasite that feeds the whole team, not
 * just itself. Every attack, it steals 10% max Health from its target (which also clamps the
 * target's CURRENT hp down, resolution.ts's post-stat-modifier clamp -- it bites now) and raises
 * every living ally's (including itself) max Health by 5% (a ceiling raise only -- no auto-heal,
 * same `clampedHp` asymmetry Treant Grovekeep's one-time team +max-HP already established;
 * Voidmaw's version repeats every attack instead of firing once, so a smaller per-hit number). */
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
// PR #60 review (C4): three DISTINCT verbs, superseding species-locked.md's original "single
// shared mechanic (on-damage-dealt -> bonus vs targets below X% HP, self-contained)" framing --
// that doc entry is stale as of this review; see the doc-sync note in the phase record. All three
// verbs were already built (conditional-damage-bonus/Slice E2, apply-stat-modifier/Slice C,
// armor-penetration/Slice B); this is pure content-assembly, no new engine work.

/** Gloomjaw Stalker (common): the finisher -- unchanged, +30% damage to enemies below 30% HP. */
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

/** Gloomjaw Executioner (uncommon): PR #60 review (C4) -- replaces the previous "bigger execute
 * bonus" (a numeric duplicate of Stalker) with a genuinely different verb: snowballs off
 * finishing blows. Every kill permanently raises its own Attack by 15% for the rest of the fight
 * (apply-stat-modifier, same on-kill shape Overgrowth's Rotfeeders will use in H3) -- it doesn't
 * need a low-HP target to pay off, it needs kills. */
export const GLOOMJAW_EXECUTIONER_TRAIT: Trait = {
  id: 'gloomjaw-executioner-finishing-blow',
  name: 'Finishing Blow',
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

/** Gloomjaw Ravager (rare, amplifier): PR #60 review (C4) -- replaces the previous "biggest
 * execute bonus + armor-pen" combo (still numerically anchored to Stalker/Executioner's own
 * verb) with armor-penetration as its WHOLE identity, unconditional -- it doesn't hit low-HP
 * targets harder, it ignores 30% of EVERY target's Defence outright, softening healthy targets
 * into the rest of the species' execute range faster. */
export const GLOOMJAW_RAVAGER_TRAIT: Trait = {
  id: 'gloomjaw-ravager-annihilating-strike',
  name: 'Annihilating Strike',
  effects: [{ category: 'armor-penetration', percent: 0.3 }],
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
