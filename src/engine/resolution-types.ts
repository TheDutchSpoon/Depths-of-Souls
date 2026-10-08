// Phase 4.1-C2a (A1): a LEAF types module. `resolution.ts` imports `CascadeState`/
// `ResolutionContext` from here (types only) and never imports `actions.ts` or `combat.ts` --
// it never runs an action: a `perform-action` response (4.1-E) only enqueues onto `ctx.grants`,
// and the scope that created the context drains it with `actions.ts`'s `drainGrantedActions`
// (`ctx.runAction`, constructed in `actions.ts` and handed down, is what the drain calls).
// This file itself imports only the other leaf modules (`types.ts`, `ids.ts`, `effect-types.ts`,
// `scripting-types.ts`), never `resolution.ts`/`actions.ts`/`combat.ts`, so there is no cycle in
// either direction.

import type { CreatureId } from './ids'
import type { Intent } from './scripting-types'
import type { CombatEvent, CombatState } from './types'
import type { EffectInstanceId } from './effect-types'

/**
 * Phase 4.1-H2a (ASSUMPTIONS 112, 130): which damage channel a `deal-damage` response runs in.
 * `'direct'` = an Attack or Cast action (a spell's own effect list; a granted action runs through
 * the same executors) -- the chip-floor formula plus the Additional. `'indirect'` = any other
 * damage (a trait, status or perk response) -- the magnitude formula against a fifth of Defence.
 * Stated explicitly by every caller; it is never inferred from `damageSource` (a display tag) or
 * from `castTarget`.
 */
export type DamageChannel = 'direct' | 'indirect'

/** Trigger-cascade bookkeeping for one top-level action: chain depth (bounds
 * `MAX_TRIGGER_CASCADE_DEPTH`) and the self-re-entry guard (an effect instance already unwinding
 * on the stack is skipped). Lives on the call stack only -- never in `CombatState`, never
 * serialized (Phase 3). */
export interface CascadeState {
  depth: number
  readonly activeInstances: Set<EffectInstanceId>
}

export interface RunActionOptions {
  /** An event to push AFTER the intent resolves (gem/target draws happened) but BEFORE the
   * resolved action executes -- `ActionGranted` for a drained `perform-action` grant. */
  readonly announce?: CombatEvent
}

/**
 * Phase 4.1-E (A2): one queued `perform-action` grant. `executeResponse` pushes it onto
 * `ResolutionContext.grants`; the scope that created the context drains the queue at its end
 * (`actions.ts` `drainGrantedActions`), first in, first out. `depth` is the granting trigger's
 * cascade depth (it already includes that trigger's +1): the granted action runs at that depth, so
 * a chain of grants stays bounded by `MAX_TRIGGER_CASCADE_DEPTH` even though the granting trigger
 * has unwound by then.
 */
export interface QueuedGrant {
  /** The effect's bearer (`ActionGranted.sourceId`). */
  readonly sourceId: CreatureId
  /** Who acts. */
  readonly actorId: CreatureId
  readonly intent: Intent
  /** The granting effect's definition id (`ActionGranted.effectId`, same as its `TriggerFired`). */
  readonly effectId: string
  readonly depth: number
}

/**
 * Phase 4.1-C2a (A1): the effect -> action seam. Created per top-level action by the action
 * layer (`actions.ts`'s `createResolutionContext`) and threaded through the whole resolver,
 * replacing the separate `events`/`cascade` arguments every resolution.ts function used to take,
 * and replacing the old echo callback. A response that needs an action run (`perform-action`, Phase 4.1-E)
 * ENQUEUES onto `grants`; the scope that created the context runs `runAction` itself, draining the
 * queue at its end. Never stored in `CombatState` (transient, call-stack-scoped, like `CascadeState`).
 */
export interface ResolutionContext {
  readonly events: CombatEvent[]
  readonly cascade: CascadeState
  /** The `perform-action` grants raised in this scope and not yet run (see `QueuedGrant`). A
   * response only ever enqueues here -- `resolution.ts` never runs an action itself. */
  readonly grants: QueuedGrant[]
  /** Checks `intent` is legal for `actorId` (locks included, every source), resolves it against
   * `state` (target/gem draws) and, if it resolves to a real `Action`, pushes `options.announce`
   * (if given) then executes it. A no-op (returns `state` unchanged, nothing drawn, nothing pushed)
   * if the actor is dead or unknown, the intent is illegal (a lock, no castable gem, no valid
   * target), or it fails to resolve -- a refused granted action emits nothing of its own
   * (CONVENTIONS B2 rule 2). */
  readonly runAction: (
    actorId: CreatureId,
    intent: Intent,
    state: CombatState,
    options?: RunActionOptions,
  ) => CombatState
}
