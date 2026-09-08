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
// on-wait is deliberately omitted (CONVENTIONS' Phase 4 addenda).
export type Hook =
  | 'on-fight-start'
  | 'on-turn-start'
  | 'on-turn-end'
  | 'on-round-end'
  | 'on-damage-dealt'
  | 'on-damage-taken'
  | 'on-kill'
  | 'on-death'
  | 'on-ally-action'
  | 'on-enemy-action'
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

export type ResponseTarget =
  | { readonly kind: 'self' }
  | { readonly kind: 'triggering-source' }
  | { readonly kind: 'triggering-ally' }
  | { readonly kind: 'all-enemies' }
  | { readonly kind: 'selector'; readonly selector: TargetSelector }
  // Phase 4 Slice B / ASSUMPTION 7: v1 TargetSelectors are alive-only, so `revive` (whose target
  // must be DEAD) needs its own resolution path -- a random dead member of the firing creature's
  // OWN side (the Unicorn's "resurrects a random dead ally" wording).
  | { readonly kind: 'random-dead-ally' }

// Applied via a spell or a triggered apply-status response (Slice C).
export interface StatusSpec {
  readonly statusId: string
  readonly duration: number
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
    }
  | {
      readonly kind: 'heal'
      readonly target: ResponseTarget
      /** Flat per-stack heal amount (Regen); scales by the firing status's current stacks. */
      readonly amountPerStack: number
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

// ---- Effect definitions (as authored in a Trait; no instance identity yet) ----

// Read-time activation predicate for a conditional passive. Self-only; may read OTHER
// effective stats via getEffectiveStat but MUST NOT read the stat it gates (no read-cycle).
// This is the one deliberately non-serializable spot — acceptable because traits are compiled
// src/data/ TS content, not saved per-instance state. If traits ever become runtime/moddable
// data, convert this to a declarative Condition-like structure.
export type ActivationPredicate = (creature: Creature) => boolean

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
export type TriggeredDef = {
  readonly category: 'triggered'
  readonly hook: Hook
  readonly condition?: Condition
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

/** Proficient Warrior: after a single-target Attack/Cast's main hit resolves, also strike each
 * living enemy ADJACENT to that target (targeting.ts's adjacentLivingTargets) for its own
 * recomputed damage -- own Defence/affinity/pools, never a copy of the main hit's number
 * (ASSUMPTION 15). Upgraded to all-other-living-enemies by a simultaneously-active
 * AnnihilateDef. Never emits TriggerFired -- it's the same action, not a triggered response. */
export type SplashingDef = {
  readonly category: 'splashing'
}

/** Annihilate: upgrades an active SplashingDef's target set from "adjacent" to "all other
 * living enemies". Inert without Splashing also active on the same bearer. */
export type AnnihilateDef = {
  readonly category: 'annihilate'
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

// ---- Statuses (Slice C): timed effects applied IN-FIGHT by a trait's apply-status response or
// a spell's appliesStatus, never innate. Declared in a separate status registry (data/statuses.ts),
// looked up by statusId at application time -- NOT part of a Trait's own EffectDef union. ----

export type DamageModifierDirection = 'dealt' | 'taken'

/** DoT (Poison/Burn), Regen, Stun: fires `response` on `hook`, same machinery as any trigger.
 * `condition` mirrors TriggeredDef's (self-scoped, optional) so fireHook checks both uniformly;
 * no v1 status content uses it. */
export type ConditionStatusDef = {
  readonly category: 'condition-status'
  readonly statusId: string
  /** Max stacks a re-application can reach. */
  readonly cap: number
  readonly hook: Hook
  readonly condition?: Condition
  readonly response: EffectResponse
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
export type TurnOrderStatusEffect = TurnOrderStatusDef &
  InstanceIdentity &
  StatusInstanceState
export type FriendlyFireStatusEffect = FriendlyFireStatusDef &
  InstanceIdentity &
  StatusInstanceState

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
  | TurnOrderStatusEffect
  | FriendlyFireStatusEffect

// ---- Trait ----

export interface Trait {
  readonly id: string
  readonly name: string
  readonly effects: readonly EffectDef[]
}
