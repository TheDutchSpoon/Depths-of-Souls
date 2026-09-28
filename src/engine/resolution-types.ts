// Phase 4.1-C2a (A1): a LEAF types module. `resolution.ts` imports `CascadeState`/
// `ResolutionContext` from here (types only) and never imports `actions.ts` or `combat.ts` --
// it reaches action resolution only through `ctx.runAction`, whose concrete implementation
// (backed by `resolveIntent`/`executeAction`) is constructed in `actions.ts` and handed down.
// This file itself imports only the other leaf modules (`types.ts`, `ids.ts`, `effect-types.ts`,
// `scripting-types.ts`), never `resolution.ts`/`actions.ts`/`combat.ts`, so there is no cycle in
// either direction.

import type { CreatureId } from './ids'
import type { Intent } from './scripting-types'
import type { CombatEvent, CombatState } from './types'
import type { EffectInstanceId } from './effect-types'

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
   * resolved action executes -- e.g. `EchoCastGranted`, matching today's exact emission point. */
  readonly announce?: CombatEvent
  /** C2a-only. Deleted in C2c (B2.3), whose goldens prove the flip. Skips the Confusion -> Tunnel
   * Vision -> Provoke override pipeline for an enemy-side single target -- resolves it via the
   * explicit-selector-or-default path directly, matching today's exact bonus-cast/echo behaviour
   * (neither goes through that pipeline on `main`). Passed only by `maybeFireBonusCast`
   * (combat.ts) and `fireHook`'s `echoCast` branch (resolution.ts) -- no other `runAction` caller
   * sets it. */
  readonly legacyGrantedTargeting?: true
}

/**
 * Phase 4.1-C2a (A1): the effect -> action seam. Created per top-level action by the action
 * layer (`actions.ts`'s `createResolutionContext`) and threaded through the whole resolver,
 * replacing the separate `events`/`cascade` arguments every resolution.ts function used to take,
 * and replacing `onEchoCast` -- a triggered response that needs to run a real action (echo-cast
 * today; `perform-action` from Phase 4.1-E) calls `ctx.runAction` instead of a hook-specific
 * callback. Never stored in `CombatState` (transient, call-stack-scoped, like `CascadeState`).
 */
export interface ResolutionContext {
  readonly events: CombatEvent[]
  readonly cascade: CascadeState
  /** Resolves `intent` for `actorId` against `state` (target/gem draws) and, if it resolves to a
   * real `Action`, pushes `options.announce` (if given) then executes it. A no-op (returns
   * `state` unchanged, nothing pushed) if the actor is dead or `unknown`, or if the intent fails
   * to resolve to an action at all (e.g. no castable gem) -- the SAME "fizzle silently" discipline
   * every other "no valid target" path in the engine already uses. */
  readonly runAction: (
    actorId: CreatureId,
    intent: Intent,
    state: CombatState,
    options?: RunActionOptions,
  ) => CombatState
}
