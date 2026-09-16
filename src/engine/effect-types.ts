// The unified effect framework's type surface (GAME_DESIGN §6, CONVENTIONS "Unified effect
// framework"). Traits, statuses, and (later) gem augments / artifact infusions are all
// instances of this ONE data-driven, hook-based model.
//
// Phase 3 lands in three slices. Slice A (this) implements the PASSIVE categories only —
// `stat-modifier` and `stat-remap`, folded on read. The 13-hook `Hook` vocabulary and the
// triggered `EffectResponse` / `StatusSpec` surface are declared here now (front-loaded for a
// stable type surface) but are wired in Slice B (triggers + cascade safety) and Slice C
// (statuses + round-end sweep). The `ActiveEffect` union itself grows across slices — that is
// engine-internal and golden-invisible, so it need not be complete now.

import type { Creature, Stat } from './types'
import type { Condition, TargetSelector } from './scripting-types'

// Stable per-fight identity for an effect instance. Deterministic (never RNG) so goldens
// reproduce; the stack-scoped self-re-entry guard (Slice B) keys on this.
export type EffectInstanceId = string & { readonly __brand: 'EffectInstanceId' }

export function createEffectInstanceId(value: string): EffectInstanceId {
  return value as EffectInstanceId
}

// The v1 hook vocabulary (13, pinned) plus Phase 4 Slice B's on-[action] family (+4, -> 17).
// on-wait is deliberately omitted (CONVENTIONS' Phase 4 addenda). Phase 4 Slice E2: the
// originally-listed on-ally-action/on-enemy-action pair was NEVER WIRED (confirmed dead -- no
// fireHook call site anywhere referenced them) and is superseded here by a single general
// on-action-observed (see the actor-vs-observer routing rule, CONVENTIONS).
export type Hook =
  | 'on-fight-start'
  | 'on-turn-start'
  | 'on-turn-end'
  | 'on-round-end'
  | 'on-damage-dealt'
  | 'on-damage-taken'
  | 'on-kill'
  | 'on-death'
  | 'on-action-observed'
  | 'on-ally-death'
  | 'on-enemy-death'
  | 'on-status-applied'
  | 'on-attack'
  | 'on-cast'
  | 'on-defend'
  | 'on-provoke'

// A damage-formula slot whose source stat a `stat-remap` can redirect. Structurally identical
// to effective-stats' ActionKind ('attack' | 'cast').
export type RemapSlot = 'attack' | 'cast'

// ---- Forward surface for Slices B/C (declared, not yet consumed) ----

// ---- Phase 4 Slice D: the count-scaling / resource-primitive vocabulary ----
// CONVENTIONS "count-scaling" + the brief's magnitudeSource vocabulary-table row.

/** The six live "board counts" resolveCount (effects.ts) reads, all resolved relative to the
 * READING creature's own side/affinity/species (matching targeting.ts's livingAlliesOf
 * convention: "ally" includes the acting creature) -- recomputed fresh on every read, never
 * cached. 'enemies-with-status' additionally needs a statusId (MagnitudeSource's own sibling
 * field below), since the count itself doesn't say WHICH status. */
export type CountOf =
  | 'living-allies'
  | 'living-allies-of-affinity'
  | 'living-allies-of-species'
  | 'enemies-with-status'
  | 'dead-allies'
  | 'self-defend-count'

/** ASSUMPTION (Slice D, not literally shaped by the brief -- CONVENTIONS/the vocabulary table
 * name the mechanism, "a modifier... may declare magnitudeSource... instead of a flat number,"
 * but not how it composes with a host's EXISTING per-stack formula). Interpreted here as an
 * ALTERNATIVE SOURCE for whatever repetition count a host field already multiplies/exponentiates
 * its own authored rate by (deal-damage's flatAmount×stacks / spellPower, damage-modifier's
 * magnitude×stacks or magnitude**stacks) -- i.e. it substitutes for "stacks", not for the rate
 * itself. This keeps every existing formula SHAPE unchanged and every Phase 1-3 call site
 * byte-identical when magnitudeSource is absent (ASSUMPTION 16), while letting the substituted
 * count be a LIVE board count instead of an applied-status's own bookkeeping. `flat` is "the
 * existing implicit behavior, made explicit" (CONVENTIONS); `consumed-stacks` is resolved only
 * inside a consume-stacks response's wrapped `effect` (a resolver-invariant error otherwise --
 * see resolveMagnitudeCount). Flagged for review: `stat-modifier`'s `factor` is NOT wired to
 * this source in this slice (see StatModifierDef's own comment) -- deferred to whichever slice
 * first authors a count-scaled stat-modifier (H1's Swarmhive Striker). */
export type MagnitudeSource =
  | { readonly kind: 'flat'; readonly value: number }
  | { readonly kind: 'count'; readonly of: CountOf; readonly statusId?: string }
  | { readonly kind: 'consumed-stacks' }

export type ResponseTarget =
  | { readonly kind: 'self' }
  | { readonly kind: 'triggering-source' }
  | { readonly kind: 'triggering-ally' }
  | { readonly kind: 'all-enemies' }
  // Phase 4 Slice F / ASSUMPTION 22 (Shieldbarer starter's "your creatures gain +35% Defence"
  // team-wide buff): the ally-side mirror of all-enemies, resolved via livingAlliesOf(self) --
  // "ally" includes the firing creature itself, matching every other ally-side convention.
  | { readonly kind: 'all-allies' }
  // Phase 4 Slice H1 (Swarmhive Queen's "increase Attack of every Swarmhive ally every turn"):
  // the species-scoped mirror of all-allies -- resolved via livingAlliesOf(self) further filtered
  // to creatures sharing the firing creature's own speciesId (same filter resolveCount's
  // 'living-allies-of-species' count kind already uses, now as a target list instead of a count).
  // Includes the firing creature itself, matching every other ally-side convention. Inert (empty)
  // for a bearer with no speciesId set, same dormant-until-wired precedent as the count kind.
  | { readonly kind: 'all-allies-of-species' }
  | { readonly kind: 'selector'; readonly selector: TargetSelector }
  // Phase 4 Slice B / ASSUMPTION 7: v1 TargetSelectors are alive-only, so `revive` (whose target
  // must be DEAD) needs its own resolution path -- a random dead member of the firing creature's
  // OWN side (the Unicorn's "resurrects a random dead ally" wording).
  | { readonly kind: 'random-dead-ally' }

// Applied via a spell or a triggered apply-status response (Slice C).
export interface StatusSpec {
  readonly statusId: string
  /** Phase 4 Slice F (review amendment): OPTIONAL -- an omitted duration inherits the target
   * status's own `StatusDef.defaultDuration`; an explicit value here overrides it. Lets the same
   * status land with a consistent duration everywhere it's applied without every producer
   * (traits/perks/spells) having to repeat the same number. */
  readonly duration?: number
  /** Stacks added per application; defaults to 1. */
  readonly stacks?: number
}

// The v1 triggered-response vocabulary (Slice B/C). Each is parameterized by target + magnitude.
export type EffectResponse =
  | {
      readonly kind: 'deal-damage'
      readonly target: ResponseTarget
      // Formula mode (the default): a real Attack/Cast-flavored hit -- reads the source's live
      // effective Attack/Intelligence through the real damage formula (OffStat, Defence,
      // affinity, pools). Used by trait retaliation etc.
      readonly offStat?: RemapSlot
      readonly spellPower?: number
      // Phase 4 Slice B: an alternative to offStat -- an arbitrary Stat (e.g. Defence for
      // Thorns/Shield Bash), read directly via getEffectiveStat (no stat-remap resolution,
      // unlike offStat/RemapSlot) then × spellPower, through the SAME downstream formula.
      // Mutually exclusive with offStat/flatAmount -- ASSUMPTION 6: setting more than one of
      // offStat/scalingStat/flatAmount throws a resolver-invariant error, mirroring how
      // applyStatus treats an unknown statusId, rather than silently picking one.
      readonly scalingStat?: Stat
      // Flat mode (DoT): a fixed per-stack magnitude, independent of any stat -- GAME_DESIGN's
      // "own value from the source." Bypasses the OffStat/Defence/affinity/pools formula
      // entirely (not merely zeroing Defence). Mutually exclusive with offStat/scalingStat
      // (enforced -- see ASSUMPTION 6 above); presence of flatAmount selects this mode and its
      // sibling spellPower field is simply never read. Scales by the firing status's current
      // stacks.
      readonly flatAmount?: number
      /** DoT ticks emit no TriggerFired (their StatusApplied already announced them); default true. */
      readonly emitTriggerFired?: boolean
      /** Overrides the DamageDealt tag; default derived from offStat ('dot' when flatAmount is set). */
      readonly damageSource?: 'attack' | 'cast' | 'dot'
      /** Phase 4 Slice D: an alternative source for the repetition count this response's own
       * magnitude is scaled by -- flatAmount's `× stacks` or (in offStat/scalingStat mode)
       * spellPower's own `× 1` -- see MagnitudeSource's doc comment for the exact composition.
       * Absent (the common case) is byte-identical to pre-Slice-D behavior (stacks / no-op ×1).
       * Detonator-shaped: `{ scalingStat: 'intelligence', magnitudeSource: { kind:
       * 'consumed-stacks' } }` scales the burst's spellPower by the just-consumed Glow count. */
      readonly magnitudeSource?: MagnitudeSource
    }
  | {
      readonly kind: 'heal'
      readonly target: ResponseTarget
      /** Flat per-stack heal amount (Regen); scales by the firing status's current stacks.
       * Mutually exclusive with `scalingStat` -- ASSUMPTION (Slice E2, mirrors deal-damage's own
       * ASSUMPTION 6): setting both throws a resolver-invariant error rather than silently
       * picking one. */
      readonly amountPerStack?: number
      /** Phase 4 Slice E2 (Treants Elder): stat-scaled mode -- `getEffectiveStat(HEALER,
       * scalingStat) × (spellPower ?? 1)`, mirroring deal-damage's own scalingStat/spellPower
       * pairing exactly. Reads the HEALER's (the firing creature's) own stat, never the
       * target's -- same "attacker's own stat" precedent as deal-damage; target-%-max-HP heals
       * (reading the TARGET's max HP) are deferred, no locked content needs them. */
      readonly scalingStat?: Stat
      /** Coefficient on `scalingStat`; only read in that mode. Default 1.0. */
      readonly spellPower?: number
      /** Phase 4 Slice E2 (Necromoss): an alternative source for the repetition count this
       * response's own magnitude is scaled by -- `amountPerStack`'s `× stacks` (flat mode) or,
       * in `scalingStat` mode, `spellPower`'s own implicit `× 1` -- see deal-damage's own
       * `magnitudeSource` doc comment for the exact composition (identical shape here). Absent
       * is byte-identical to pre-Slice-E2 behavior. */
      readonly magnitudeSource?: MagnitudeSource
      /** Regen ticks emit no TriggerFired, matching DoT; default true. */
      readonly emitTriggerFired?: boolean
    }
  | {
      readonly kind: 'apply-status'
      readonly target: ResponseTarget
      readonly status: StatusSpec
    }
  | {
      readonly kind: 'apply-stat-modifier'
      readonly target: ResponseTarget
      readonly stat: Stat
      readonly factor: number
      /** Phase 4 Slice E2 (Swarmhive Striker / Necromoss): FREEZE-AT-APPLICATION -- when
       * present, the live resolveMagnitudeCount(...) reading is resolved ONCE, at the moment
       * this response executes (e.g. an on-fight-start trigger), and combined with `factor` as
       * `finalFactor = 1 + (factor - 1) * count` -- `factor` is reinterpreted as "the per-unit
       * rate" only in this mode (mirrors how a Slice D magnitudeSource substitutes for a
       * repetition count elsewhere, never the rate itself). The resulting StatModifierEffect
       * carries only the flat, already-computed `finalFactor` -- there is no live recompute
       * afterward (contrast Bulwark's damage-modifier, which DOES recompute on every read); a
       * later change in the live count (e.g. an ally dying) does NOT retroactively change an
       * already-applied modifier. Absent -- `factor` used directly, byte-identical to pre-Slice-
       * E2 behavior. This is why Striker is authored as an apply-stat-modifier RESPONSE (fires
       * once), not a live passive `StatModifierDef` sitting directly in `Trait.effects` (which
       * would fold LIVE on every getEffectiveStat read -- no "application moment" to freeze at). */
      readonly magnitudeSource?: MagnitudeSource
    }
  // Undeclared (or 'all') scope preserves the exact pre-Slice-B behavior: the whole turn is
  // skipped via resolveTurn's on-turn-start `suppressed` flag (Stun). A scoped suppression
  // ('attack' | 'cast', e.g. Pacified/Silenced) does NOT set that flag -- it is instead read
  // passively by the INTERPRETER (interpreter.ts, not resolution.ts) at rule-validity time,
  // gating only that one action kind while leaving the rest of the turn choosable.
  | { readonly kind: 'suppress-action'; readonly scope?: 'all' | 'attack' | 'cast' }
  // Phase 4 Slice B. Target must be DEAD (see ResponseTarget's random-dead-ally). Returns the
  // target to its slot at the DEATH-RESET baseline (a fresh instantiation of innateTraitIds --
  // no ramp preserved) with currentHp = round(baselineMaxHp * pct), computed from that fresh
  // baseline (Unicorn: pct 0.2).
  | { readonly kind: 'revive'; readonly target: ResponseTarget; readonly pct: number }
  // Phase 4 Slice B. Sets `defending`/`provoking` true on the target(s) -- reuses Defend's
  // existing ×1.5/×0.65 math and Provoke's existing redirect verbatim; only ever sets true
  // (never clears), mirroring the resolver's existing "until its next turn" expiry.
  | {
      readonly kind: 'grant-action-state'
      readonly target: ResponseTarget
      readonly defending?: boolean
      readonly provoking?: boolean
    }
  // Phase 4 Slice D (Glowflies' Detonator). SELF-scoped (no target field, unlike every other
  // response) -- reads and clears the FIRING creature's own statusId stacks, matching the
  // condition-status/triggered-response convention that trigger evaluation is self-scoped.
  // ASSUMPTION 18: emits StatusExpired for the consumed status (it's genuinely gone, not merely
  // decremented). 0/absent stacks is a full no-op per CONVENTIONS ("applyStatus's cap-driven
  // model means 'no status present' and '0 stacks' are the same state") -- resolution.ts skips
  // BOTH the removal and the wrapped `effect` entirely in that case, not just the removal.
  | {
      readonly kind: 'consume-stacks'
      readonly statusId: string
      readonly effect: EffectResponse
    }
  // Phase 4 Slice E2. The 9th and (per CONVENTIONS' "hold the line at nine") final response
  // verb: clear a status from a target, reusing the existing StatusExpired path (death-reset and
  // the round-end sweep stay consistent) -- a no-op, no-event when the target doesn't carry it
  // (mirrors revive's "target must be dead" / consume-stacks' "0 stacks" skip style). `target`
  // reuses the full ResponseTarget vocabulary, so "cleanse lowest-hp-ally" / "dispel all-enemies"
  // get targeting for free. `filter` is a plain statusId for now -- a polarity-based filter
  // (`'buff' | 'debuff'`, reading StatusDef.polarity) is a natural future widening for the first
  // cleanse/dispel spell, deliberately not built until there's a real producer/consumer to test
  // against (no dead union branch).
  | {
      readonly kind: 'remove-status'
      readonly target: ResponseTarget
      readonly filter: { readonly statusId: string }
    }

// ---- Effect definitions (as authored in a Trait; no instance identity yet) ----

// Read-time activation predicate for a conditional passive. Self-only; may read OTHER
// effective stats via getEffectiveStat but MUST NOT read the stat it gates (no read-cycle).
// This is the one deliberately non-serializable spot — acceptable because traits are compiled
// src/data/ TS content, not saved per-instance state. If traits ever become runtime/moddable
// data, convert this to a declarative Condition-like structure.
export type ActivationPredicate = (creature: Creature) => boolean

// NOTE (Phase 4 Slice D, resolved in Slice E2): CONVENTIONS' count-scaling primitive names
// stat-modifier as an eligible magnitudeSource host too ("a stat/damage-modifier whose factor
// reads a live board count", species-locked.md's Swarmhive Striker). Deliberately NOT wired
// HERE, on the standalone EffectDef -- getEffectiveStat(creature, stat) is a pure (creature,
// stat) function called from ~15+ sites across the codebase (conditions.ts, turn-order.ts,
// target-selectors.ts, ...), several of which have no CombatState in scope at all; giving it
// access to live board counts would mean an invasive, CombatState-aware signature change to a
// function the whole damage-formula/scripting pipeline depends on. Slice E2 resolves this
// WITHOUT that invasive change: `magnitudeSource` lands on the `apply-stat-modifier`
// EffectResponse instead (see its own doc comment), freeze-at-application -- Swarmhive Striker/
// Necromoss are authored as a triggered response (fires once, e.g. on-fight-start), never as a
// live-folding passive `StatModifierDef` sitting directly in a Trait's `effects` array.
export type StatModifierDef = {
  readonly category: 'stat-modifier'
  readonly stat: Stat
  readonly factor: number
  readonly predicate?: ActivationPredicate
}

export type StatRemapDef = {
  readonly category: 'stat-remap'
  readonly slot: RemapSlot
  readonly fromStat: Stat
}

// Phase 4 Slice B: permanent-for-fight passives, additive across stacked sources, never
// surfaced as a status (the stat-modifier-adjacent treatment) -- gathered read-time by
// gatherArmorPenetration/gatherCrossStatContribution (effects.ts), consulted by
// calculateDamage/dealDamage (damage.ts/resolution.ts), never fired via a hook.

/** Ignore `percent` of the TARGET's Defence, applied before the subtractive core
 * (`effDefForCore = effDef × (1 − Σpercent)`). Summed across sources, clamped to [0,1]. */
export type ArmorPenetrationDef = {
  readonly category: 'armor-penetration'
  readonly percent: number
}

/** Adds `percentPerRank × getEffectiveStat(bearer, fromStat)` to the bearer's own effOffStat,
 * post-spellPower, before the subtractive core -- for actions matching `appliesTo`
 * ('attack' | 'cast' | 'both'). E.g. Shield Bash: fromStat 'defence' feeds attacks & spells. */
export type CrossStatDef = {
  readonly category: 'cross-stat'
  readonly fromStat: Stat
  readonly percentPerRank: number
  readonly appliesTo: 'attack' | 'cast' | 'both'
}

// Phase 4 Slice B: the action instance-list model's own gather primitive (CONVENTIONS' "action
// instance-list", locked). NOT explicitly named/shaped by the brief -- its prose only specifies
// the RESOLVER mechanism (assemble a [{powerPercent}] list once, up front, from the actor's
// "active count/power modifiers"), leaving the authoring shape open. ASSUMPTION (Slice B,
// inline): a permanent-for-fight passive, structurally identical to armor-penetration/cross-stat
// above (never a status, additive across stacked sources -- each matching effect appends exactly
// one instance), gathered by gatherExtraInstances(creature, actionKind) in canonical
// active-effects order and appended AFTER the base [100] entry -- satisfies the locked semantics
// (linear composition, e.g. Echo's "an additional time" = {actionKind:'attack', powerPercent:100};
// the Brute starter's "attack again for 30%" = {actionKind:'attack', powerPercent:30}) without
// deciding anything the design owner hasn't already locked. Flag for confirmation alongside the
// rest of this slice's checklist.
export type ActionInstanceDef = {
  readonly category: 'action-instance'
  readonly actionKind: 'attack' | 'cast' | 'both'
  readonly powerPercent: number
}

// A triggered effect fires its response on `hook` (Slice B). An optional `condition` gates it,
// reusing the serializable scripting `Condition` union — evaluated SELF-scoped against live state
// at fire time (omission = unconditional). This union is self/global-scoped, so it cannot yet
// reference the triggering source (e.g. "retaliate only if the attacker is Vitality"); that needs a
// hook-context condition variant, deferred until content requires it.
/** Phase 4 Slice E2 (`on-action-observed`, general action-observation system): meaningful only
 * when the owning TriggeredDef's `hook` is `'on-action-observed'`; ignored otherwise. Reacting
 * effects filter on THEMSELVES, not on the hook name -- absent fields match everything
 * (permissive default, matching this project's "unspecified magnitude means 100%" convention).
 * `relationship` compares the OBSERVER (self) to the ACTOR (the hook's `source`); 'ally' includes
 * self (matches livingAlliesOf's own convention). `excludeActor` drops the case where the
 * observer IS the actor (relevant when relationship is 'any' and a creature would otherwise
 * observe its own action). Resonants (H2) is the only locked consumer:
 * `{ relationship: 'ally', actionKind: 'cast' }`. */
export type ObservationFilter = {
  readonly relationship?: 'self' | 'ally' | 'enemy' | 'any'
  readonly actionKind?: 'attack' | 'cast' | 'defend' | 'provoke'
  readonly excludeActor?: boolean
}

export type TriggeredDef = {
  readonly category: 'triggered'
  readonly hook: Hook
  readonly condition?: Condition
  /** Phase 4 Slice E2: meaningful only when `hook` is `'on-action-observed'`. See
   * ObservationFilter's own doc comment. */
  readonly observationFilter?: ObservationFilter
  /** Phase 4 Slice E2 (Concussive Blows / Sleeper): an optional probabilistic gate, a sibling of
   * `condition` -- one is deterministic, the other a roll. Plain number, baked at instantiation
   * (the perk/trait model does any rank arithmetic and stores the result; the engine carries no
   * rank concept, mirroring cross-stat's percentPerRank). Rolled ONCE per firing, at execution on
   * the winning path, AFTER the cascade-depth check (a depth-capped effect isn't firing, so it
   * must draw zero RNG -- cheat-death's "only when it actually fires" discipline) and BEFORE
   * TriggerFired/execution -- a failed roll skips silently, exactly like a false `condition`. Only
   * ever rolled when present; a creature/effect without it never touches state.rng here. */
  readonly chancePercent?: number
  /** Phase 4 Slice H2 (PR #60 review, E2.1): a general dedup flag -- default absent/`true`
   * (today's behavior, every matching effect fires independently). `false` means: across ALL
   * living creatures, at most ONE instance of this exact effect (matched by `sourceTraitId`) is
   * even given a chance to roll `chancePercent` per firing of this hook -- the "claim" happens
   * BEFORE the roll (fireHook, resolution.ts), not just on success, so the AGGREGATE probability
   * of the effect firing at all stays exactly `chancePercent` regardless of how many creatures
   * carry it (two Overtones must not raise the echo chance above 10% -- branching factor stays
   * 1). Kept general (not echo-cast-specific), though Resonant Overtone is its only v1 consumer. */
  readonly stacks?: boolean
  /** Phase 4 Slice H2 (PR #60 review, E2 -- Resonant Overtone's echo-cast). When true, firing
   * this effect does NOT call `executeResponse` on `response` at all -- `response` is a
   * structurally-required, functionally-inert placeholder (a `grant-action-state` with neither
   * flag set is the convention; see RESONANT_OVERTONE_TRAIT). Instead, fireHook invokes its
   * caller-supplied `onEchoCast` callback with the hook's own `source` (the OBSERVED actor, e.g.
   * the ally who just cast -- NOT this effect's own bearer) as the one who casts again. This is
   * deliberately NOT a 10th `EffectResponse` verb -- `executeResponse` (resolution.ts) cannot
   * reach `executeCastSingle`/`executeCastAoe` (combat.ts) without a resolution.ts -> combat.ts
   * import cycle, the same reason `bonus-cast` (a passive EffectDef, not a response) exists.
   * `onEchoCast` is combat.ts's injected escape hatch for this one case; every fireHook call site
   * except the two `on-action-observed` dispatches (combat.ts) omits it, so `echoCast` is inert
   * (never fires) anywhere else. Also exempted from the self-re-entry guard (fireHook does not
   * add this effect's `instanceId` to `cascade.activeInstances` around the callback) so a chain
   * can revisit the SAME Overtone instance on a later hop -- termination relies on
   * `cascade.depth`/`MAX_TRIGGER_CASCADE_DEPTH`, which the callback still increments, never on
   * self-re-entry. Meaningful only when `hook` is `'on-action-observed'`. */
  readonly echoCast?: boolean
  readonly response: EffectResponse
}

// Phase 4 Slice C: permanent-for-fight passives (the same treatment as ArmorPenetrationDef/
// CrossStatDef/ActionInstanceDef above) -- always perk-granted (Slice F) in the locked seed
// content, never surfaced as a status themselves, gathered read-time and consulted at each
// mechanism's own site (never a hook, never applyStatus).

/** Clear Mind / Aggressive / Lucidity: consulted at each STATUS'S OWN effect-execution site --
 * suppress-action's scope check in the interpreter (isActionSuppressed), Confusion's
 * friendly-fire roll in targeting.ts -- never at applyStatus. Per CONVENTIONS' "immunity
 * suppresses the effect, not the application": the status still applies/stacks/counts for
 * has-status; only its effect is skipped for an immune bearer. */
export type StatusImmunityDef = {
  readonly category: 'status-immunity'
  readonly statusId: string
}

/** Tunnel Vision: the bearer's single-target offensive actions skip the enemy Provoke redirect
 * entirely at target-selection (targeting.ts's override pipeline), going straight to normal
 * resolution. Distinct from StatusImmunityDef -- Provoke is a redirect BY the enemy, not a
 * status ON the bearer, so there is no statusId to key off. */
export type ProvokeImmunityDef = {
  readonly category: 'provoke-immunity'
}

/** Proficient Warrior: after a single-target Attack's main hit resolves, also strike each
 * living enemy ADJACENT to that target (targeting.ts's adjacentLivingTargets) for its own
 * recomputed damage -- own Defence/affinity/pools, never a copy of the main hit's number
 * (ASSUMPTION 15). Attacks only -- brute.md: "attacks deal 100% of their damage to enemies
 * adjacent to the target"; Cast never splashes. Upgraded to all-other-living-enemies by a
 * simultaneously-active AnnihilateDef. Never emits TriggerFired -- it's the same action, not
 * a triggered response. */
export type SplashingDef = {
  readonly category: 'splashing'
}

/** Annihilate: upgrades an active SplashingDef's target set from "adjacent" to "all other
 * living enemies". Inert without Splashing also active on the same bearer. */
export type AnnihilateDef = {
  readonly category: 'annihilate'
}

/** Phase 4 Slice E2 (Cull the Weak / Ambusher / Gloomjaws / Sporch's Reaper): "+% damage to
 * [Weakened / Webbed / Sleeping / low-HP] targets" -- a permanent-for-fight passive, structurally
 * identical to ArmorPenetrationDef/CrossStatDef (additive across stacked sources, never a status,
 * never fired via a hook), DEALT-only. `condition` is evaluated with `subject: 'target'` bound to
 * the CURRENT damage target (gatherConditionalDamageBonus, effects.ts) -- this is what lets the
 * bonus land as ONE clean modified hit (folded into dealtMods alongside gatherDealtMods) rather
 * than a second on-damage-dealt follow-up instance, which would re-fire on-damage-dealt,
 * re-splash, and double-count on-hit effects (CONVENTIONS' locked "option a" consumption model). */
export type ConditionalDamageBonusDef = {
  readonly category: 'conditional-damage-bonus'
  readonly percent: number
  readonly condition: Condition
  /** Phase 4 Slice F (review amendment): which action kind(s) this bonus applies to, mirroring
   * `CrossStatDef.appliesTo`. Absent = `'both'` (byte-identical to pre-amendment behavior -- no
   * existing content sets this, so Cull the Weak/Ambusher/Gloomjaws/Sporch's Reaper are
   * unaffected). First scoped consumers: Brute Force (`'attack'`) and Spell Focus (`'cast'`) --
   * each an unconditional "+% damage" perk that must NOT leak onto the other action kind. */
  readonly actionKind?: 'attack' | 'cast' | 'both'
}

/** Phase 4 Slice F (review amendment): the TAKEN-pool mirror of `ConditionalDamageBonusDef` --
 * a permanent-for-fight passive damage REDUCTION, never a status (no `statusId`/`polarity`,
 * unlike `DamageModifierDef`; not surfaced as a status icon). Carries the exact same
 * accumulation shape `DamageModifierDef`'s own `taken` direction already proved (Slice D's
 * `golden-defend-count-additive-cap`): `magnitude` (the per-unit factor), an optional
 * `magnitudeSource` (a live count substituting for a re-application-driven `stacks` -- absent
 * means a flat single application, count 1), `accumulation` (`'multiplicative'` default /
 * `'additive'`-with-`reductionCap`), and `reductionCap` (meaningful only for `'additive'`).
 * First (and so far only) consumer: Bulwark, now authored as a genuine perk-granted PASSIVE
 * (`{ category: 'taken-reduction', magnitude: 0.95, magnitudeSource: {kind:'count',
 * of:'self-defend-count'}, accumulation: 'additive', reductionCap: 0.8 }`) rather than a status
 * applied via an `on-fight-start` trigger -- a perk's own effect belongs directly in `effects:
 * []`, like every other perk, not smuggled in as a triggered status application. Gathered by
 * `gatherTakenFactors` (effects.ts) alongside `DamageModifierDef`'s own `taken` entries, reusing
 * the exact same `takenFactorFor`/`damageModifierCount` helpers (both generalized to a shared
 * structural shape so neither DamageModifierEffect's nor this type's behavior changes). */
export type TakenReductionDef = {
  readonly category: 'taken-reduction'
  readonly magnitude: number
  readonly magnitudeSource?: MagnitudeSource
  readonly accumulation?: 'multiplicative' | 'additive'
  readonly reductionCap?: number
}

/** Phase 4 Slice D (Last Stand): checked inside applyDamageAndEmit (resolution.ts) at the
 * instant a hit would reduce a living target to 0 HP, BEFORE CreatureDied/on-death fire -- one
 * seeded RNG roll (drawn only when the summed chancePercent is > 0 and the hit would otherwise
 * be lethal, mirroring Confusion's "draws nothing when inactive" discipline); on success,
 * currentHp is set to EXACTLY 1 (ASSUMPTION 19 -- not finalDamage-1 or any other derived value)
 * and no death events/hooks fire at all -- resolution continues exactly as a non-lethal hit
 * would. Additive across stacked sources, clamped to [0, 100] (gatherCheatDeathChance,
 * effects.ts) -- the percent-scale mirror of ArmorPenetrationDef's [0,1] clamp. Never surfaced
 * as a status, gathered read-time like ArmorPenetrationDef/ProvokeImmunityDef. */
export type CheatDeathDef = {
  readonly category: 'cheat-death'
  readonly chancePercent: number
}

/** Phase 4 Slice F (Sorcerer starter's "50% on-turn-end, cast a random equipped spell") --
 * NEW PRIMITIVE, surfaced by this starter's content, flagged for design-owner sign-off. NOT
 * modeled as a 10th `EffectResponse` verb: CONVENTIONS' "hold the line at nine" pins the
 * RESPONSE vocabulary specifically, and a real Cast needs combat.ts's own executor functions
 * (executeCastSingle/executeCastAoe) plus its target-resolution helpers -- resolution.ts's
 * generic executeResponse has no access to those (and gaining it would mean a resolution.ts ->
 * combat.ts import cycle). So this is a permanent-for-fight passive `EffectDef` category
 * instead, structurally in the same family as ArmorPenetrationDef/CrossStatDef/etc. (gathered
 * read-time, never a status) but consulted directly by combat.ts's resolveTurn -- immediately
 * after the actor's ordinary on-turn-end hook fires -- rather than through fireHook/
 * executeResponse. On a successful roll it reuses the EXACT Cast-execution path a chosen action
 * would (on-cast/on-action-observed still fire, payload/appliesStatus/instance-list all apply
 * unchanged), picking uniformly among the actor's non-null equipped slots. */
export type BonusCastDef = {
  readonly category: 'bonus-cast'
  readonly chancePercent: number
}

// EffectDef is what a TRAIT authors (permanent-for-fight passives/triggers -- timed statuses are
// a separate, parallel concept below, never authored directly on a Trait).
export type EffectDef =
  | StatModifierDef
  | StatRemapDef
  | TriggeredDef
  | ArmorPenetrationDef
  | CrossStatDef
  | ActionInstanceDef
  | StatusImmunityDef
  | ProvokeImmunityDef
  | SplashingDef
  | AnnihilateDef
  | CheatDeathDef
  | ConditionalDamageBonusDef
  | TakenReductionDef
  | BonusCastDef

// ---- Statuses (Slice C): timed effects applied IN-FIGHT by a trait's apply-status response or
// a spell's appliesStatus, never innate. Declared in a separate status registry (data/statuses.ts),
// looked up by statusId at application time -- NOT part of a Trait's own EffectDef union. ----

export type DamageModifierDirection = 'dealt' | 'taken'

/** Phase 4 Slice E2: one hook reaction a `ConditionStatusDef` subscribes to. A status may need
 * MORE THAN ONE (Sleep: `on-turn-start -> suppress-action` so the sleeper's turn is actually
 * skipped, like Stun, PLUS `on-damage-taken -> remove-status(self)` for the wake-up) -- unlike a
 * `Trait`, whose `effects: EffectDef[]` already gets multiplicity for free from its own array, a
 * single `ConditionStatusDef` object had no such list before this slice. `chancePercent` mirrors
 * `TriggeredDef`'s own field (Slice E2) -- no v1 status content sets it yet, but the unified
 * resolved-trigger record (effectsForHook) reads it uniformly regardless of source. */
export type StatusTrigger = {
  readonly hook: Hook
  readonly condition?: Condition
  readonly chancePercent?: number
  readonly response: EffectResponse
}

/** DoT (Poison/Burn), Regen, Stun: fires each of `triggers`' responses on its own declared hook,
 * same machinery as any trigger. `condition`/`chancePercent` mirror TriggeredDef's (self-scoped,
 * optional) so fireHook checks both uniformly; no v1 status content uses more than one trigger
 * yet except Sleep (H1). */
export type ConditionStatusDef = {
  readonly category: 'condition-status'
  readonly statusId: string
  /** Max stacks a re-application can reach. */
  readonly cap: number
  readonly triggers: readonly StatusTrigger[]
  /** Phase 4 Slice E2: a status's beneficial/harmful nature isn't mechanically derivable, so it's
   * declared explicitly on every status from birth -- consumed by `remove-status`'s future
   * polarity-filter branch (cleanse/dispel spells, not yet built; see remove-status's own doc
   * comment) and inert everywhere else this slice. */
  readonly polarity: 'buff' | 'debuff'
  /** Phase 4 Slice F (review amendment): the duration a fresh application (or re-application)
   * uses when its own `StatusSpec.duration` is omitted -- so the same status lands consistently
   * everywhere it's applied without every producer (traits/perks/spells) repeating the same
   * number. An explicit `StatusSpec.duration` always overrides this. See `applyStatus`
   * (resolution.ts) for the exact `spec.duration ?? def.defaultDuration` resolution. */
  readonly defaultDuration: number
}

/** Weaken/Vulnerability: read PASSIVELY by the damage formula's pools, never fired via a hook. */
export type DamageModifierDef = {
  readonly category: 'damage-modifier'
  readonly statusId: string
  readonly cap: number
  readonly direction: DamageModifierDirection
  /** Per-stack term: for 'dealt', an ADDITIVE contribution to (1 + Σ dealtMods); for 'taken', a
   * per-stack MULTIPLICATIVE factor compounding via magnitude ** stacks into Π(takenFactors). */
  readonly magnitude: number
  /** Phase 4 Slice D (Bulwark-shaped): when present, the live resolveCount(...) reading
   * REPLACES the applied status's own `stacks` bookkeeping as the exponent/multiplier `magnitude`
   * is raised to/multiplied by -- `magnitude ** resolveCount(...)` ('taken') or `magnitude *
   * resolveCount(...)` ('dealt'), recomputed every read (never cached, unlike `stacks`). Lets a
   * status applied ONCE (e.g. at on-fight-start) keep scaling off live state -- e.g.
   * self-defend-count -- instead of needing repeated re-application to grow its `stacks`. Absent
   * is byte-identical to pre-Slice-D behavior (uses `stacks` exactly as before). */
  readonly magnitudeSource?: MagnitudeSource
  /** Phase 4 Slice D, PR #47 review amendment -- ASSUMPTION (field shape proposed here, per the
   * design agent's request; CONVENTIONS' "Taken-reduction accumulation" bullet pins the decided
   * SEMANTICS, not this exact shape). How a `magnitudeSource`-driven count combines with
   * `magnitude` for a `direction: 'taken'` effect. `'multiplicative'` (default, byte-identical to
   * every pre-amendment read): `magnitude ** count`, asymptoting toward 0, never clamped -- the
   * model for ordinary stacking taken-reductions and every FUTURE count-scaled taken source.
   * `'additive'` (Bulwark: "-5% per Defend, cap 80%"): the per-unit reduction `(1 - magnitude)` is
   * SUMMED × count, then hard-clamped at `reductionCap` -- `factor = 1 - min((1 - magnitude) ×
   * count, reductionCap)`. `magnitude` keeps the SAME per-unit-factor meaning in both modes (0.95
   * = "this source's own single-unit factor is x0.95") so an author picking a value doesn't need
   * a different sign/scale convention per mode -- only the COMBINATION rule differs. Additive
   * within a source, multiplicative across sources: the collapsed single factor still enters
   * Π(takenFactors) alongside every other active taken source, never bypassing it. Ignored (reads
   * as multiplicative) for `direction: 'dealt'` or when no `magnitudeSource` is present -- the
   * dealt pool is already additive-across-sources by construction (Σ dealtMods), so this axis is
   * taken-only. */
  readonly accumulation?: 'multiplicative' | 'additive'
  /** Required (meaningful) only when `accumulation` is `'additive'` -- the hard clamp on TOTAL
   * reduction, a fraction (e.g. 0.8 for Bulwark's "cap 80%"). Distinct from `cap` above, which
   * bounds the STACK COUNT a re-application can reach (applyStatus's cap-driven stacking model,
   * an unrelated axis a magnitudeSource-driven source doesn't use -- Bulwark is applied once and
   * never re-stacked; its own `cap` is 1). */
  readonly reductionCap?: number
  /** Phase 4 Slice E2: see ConditionStatusDef's own doc comment. */
  readonly polarity: 'buff' | 'debuff'
  /** Phase 4 Slice F: see ConditionStatusDef's own doc comment. */
  readonly defaultDuration: number
}

/** Web (act-last) / Blindclaws' grant-act-first (act-first) -- same primitive, opposite pole
 * (species-locked.md). Read PASSIVELY by buildTurnQueue (turn-order.ts) at round-start queue
 * build, never fired via a hook. ASSUMPTION 9: a bearer carrying both poles at once (two
 * independently-applied turn-order statuses, or a re-application with a different position)
 * resolves to 'first' -- first wins over last when both are simultaneously active. */
export type TurnOrderStatusDef = {
  readonly category: 'turn-order-status'
  readonly statusId: string
  readonly cap: number
  readonly position: 'first' | 'last'
  /** Phase 4 Slice E2 (Web): the per-GLOBAL-turn break-free chance -- rolled in the turn loop
   * (combat.ts's rollWebBreakFree) at EVERY creature's turn-start against every bearer of this
   * status, NOT the bearer's own hook (that's why this is a status field, not a triggered
   * response). Uses the chancePercent discipline: rolled only when present, so a board with no
   * Web never touches state.rng. Absent for a position with no break-free mechanic (e.g.
   * Blindclaws' grant-act-first). */
  readonly breakChancePercent?: number
  /** Phase 4 Slice E2: see ConditionStatusDef's own doc comment. */
  readonly polarity: 'buff' | 'debuff'
  /** Phase 4 Slice F: see ConditionStatusDef's own doc comment. */
  readonly defaultDuration: number
}

/** Confusion: a chancePercent roll, consulted once per the bearer's harmful offensive action
 * (single-target AND AOE alike -- targeting.ts's override pipeline / combat.ts's AOE cast),
 * that redirects the whole action to the bearer's own living side instead of the enemy side.
 * Read PASSIVELY like TurnOrderStatusDef, never fired via a hook. ASSUMPTION (Slice C): the
 * roll always happens exactly once for a confused, non-immune bearer's harmful action -- win or
 * lose -- per species-locked.md's "Confusion consumes combat RNG"; an immune bearer (Lucidity)
 * never rolls at all (the effect, including its RNG consumption, is fully suppressed). */
export type FriendlyFireStatusDef = {
  readonly category: 'friendly-fire-status'
  readonly statusId: string
  readonly cap: number
  readonly chancePercent: number
  /** Phase 4 Slice E2: see ConditionStatusDef's own doc comment. */
  readonly polarity: 'buff' | 'debuff'
  /** Phase 4 Slice F: see ConditionStatusDef's own doc comment. */
  readonly defaultDuration: number
}

export type StatusDef =
  ConditionStatusDef | DamageModifierDef | TurnOrderStatusDef | FriendlyFireStatusDef

// ---- Active effect instances (what lives on Creature.activeEffects) ----

interface InstanceIdentity {
  readonly instanceId: EffectInstanceId
  /** Stable definition id (the owning trait, or the statusId for a status) for TriggerFired
   * legibility / debugging. */
  readonly sourceTraitId: string
}

/** Statuses additionally carry live, mutable duration/stack bookkeeping (absent from the
 * static StatusDef, which only declares the cap/mechanism). */
interface StatusInstanceState {
  readonly remainingDuration: number
  readonly stacks: number
}

export type StatModifierEffect = StatModifierDef & InstanceIdentity
export type StatRemapEffect = StatRemapDef & InstanceIdentity
export type TriggeredEffect = TriggeredDef & InstanceIdentity
export type ConditionStatusEffect = ConditionStatusDef &
  InstanceIdentity &
  StatusInstanceState
export type DamageModifierEffect = DamageModifierDef &
  InstanceIdentity &
  StatusInstanceState
export type ArmorPenetrationEffect = ArmorPenetrationDef & InstanceIdentity
export type CrossStatEffect = CrossStatDef & InstanceIdentity
export type ActionInstanceEffect = ActionInstanceDef & InstanceIdentity
export type StatusImmunityEffect = StatusImmunityDef & InstanceIdentity
export type ProvokeImmunityEffect = ProvokeImmunityDef & InstanceIdentity
export type SplashingEffect = SplashingDef & InstanceIdentity
export type AnnihilateEffect = AnnihilateDef & InstanceIdentity
export type CheatDeathEffect = CheatDeathDef & InstanceIdentity
export type ConditionalDamageBonusEffect = ConditionalDamageBonusDef & InstanceIdentity
export type TakenReductionEffect = TakenReductionDef & InstanceIdentity
export type BonusCastEffect = BonusCastDef & InstanceIdentity
export type TurnOrderStatusEffect = TurnOrderStatusDef &
  InstanceIdentity &
  StatusInstanceState
export type FriendlyFireStatusEffect = FriendlyFireStatusDef &
  InstanceIdentity &
  StatusInstanceState

/** Phase 4 Slice E2: what `effectsForHook` (effects.ts) returns -- a single hook reaction,
 * already resolved down to a uniform shape regardless of whether it came from a `TriggeredEffect`
 * (one hook per effect) or one entry of a `ConditionStatusEffect`'s `triggers[]` (a status may
 * have several). `fireHook` (resolution.ts) consumes this shape uniformly, never branching on
 * which one supplied it. `stacks`/`statusId` are present only when the source was a status. */
export type ResolvedHookEffect = {
  readonly instanceId: EffectInstanceId
  readonly sourceTraitId: string
  readonly condition?: Condition
  readonly chancePercent?: number
  /** Phase 4 Slice E2: meaningful only when this resolved trigger's hook is
   * 'on-action-observed'. Only a TriggeredDef can declare it (no locked status content
   * observes actions), so this is always undefined when the source was a status trigger. */
  readonly observationFilter?: ObservationFilter
  readonly response: EffectResponse
  readonly stacks?: number
  readonly statusId?: string
  /** Phase 4 Slice H2 (PR #60 review, E2.1): derived from a `TriggeredDef`'s own `stacks: false`
   * (renamed here to avoid colliding with the STATUS stack-count field above, which is an
   * unrelated number) -- `true` iff this effect must claim a fireHook-call-scoped dedup slot
   * before it's even allowed to roll `chancePercent`. Always undefined for a status-sourced
   * entry (no v1 status declares it). */
  readonly nonStacking?: boolean
  /** Phase 4 Slice H2 (PR #60 review, E2): mirrors a `TriggeredDef`'s own `echoCast`. Always
   * undefined for a status-sourced entry. */
  readonly echoCast?: boolean
}

export type ActiveEffect =
  | StatModifierEffect
  | StatRemapEffect
  | TriggeredEffect
  | ConditionStatusEffect
  | DamageModifierEffect
  | ArmorPenetrationEffect
  | CrossStatEffect
  | ActionInstanceEffect
  | StatusImmunityEffect
  | ProvokeImmunityEffect
  | SplashingEffect
  | AnnihilateEffect
  | CheatDeathEffect
  | TurnOrderStatusEffect
  | FriendlyFireStatusEffect
  | ConditionalDamageBonusEffect
  | TakenReductionEffect
  | BonusCastEffect

// ---- Trait ----

export interface Trait {
  readonly id: string
  readonly name: string
  readonly effects: readonly EffectDef[]
}
