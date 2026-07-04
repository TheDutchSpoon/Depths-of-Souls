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

// The v1 hook vocabulary (13, pinned). Declared in full now; Slice A fires none of them.
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
      // Flat mode (DoT): a fixed per-stack magnitude, independent of any stat -- GAME_DESIGN's
      // "own value from the source." Bypasses the OffStat/Defence/affinity/pools formula
      // entirely (not merely zeroing Defence). Mutually exclusive with offStat/spellPower;
      // presence of flatAmount selects this mode. Scales by the firing status's current stacks.
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
  | { readonly kind: 'suppress-action' }

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

// A triggered effect fires its response on `hook` (Slice B). An optional `condition` gates it,
// reusing the serializable scripting `Condition` union — evaluated SELF-scoped against live state
// at fire time (omission = unconditional). This union is self/global-scoped, so it cannot yet
// reference the triggering source (e.g. "retaliate only if the attacker is Body"); that needs a
// hook-context condition variant, deferred until content requires it.
export type TriggeredDef = {
  readonly category: 'triggered'
  readonly hook: Hook
  readonly condition?: Condition
  readonly response: EffectResponse
}

// EffectDef is what a TRAIT authors (stat-modifier/stat-remap/triggered only -- traits are
// permanent-for-fight; timed statuses are a separate, parallel concept below, never authored
// directly on a Trait).
export type EffectDef = StatModifierDef | StatRemapDef | TriggeredDef

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

export type StatusDef = ConditionStatusDef | DamageModifierDef

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

export type ActiveEffect =
  | StatModifierEffect
  | StatRemapEffect
  | TriggeredEffect
  | ConditionStatusEffect
  | DamageModifierEffect

// ---- Trait ----

export interface Trait {
  readonly id: string
  readonly name: string
  readonly effects: readonly EffectDef[]
}
