// Phase 4.1-C2a (A1): the one action pipeline. Every action source -- a script rule, the
// implicit fallback, a `perform-action` grant (4.1-E) -- goes through this module:
// `checkLegality` (pure, draws nothing), `resolveIntent` (the only place action-level draws
// happen), `executeAction` (the executors, moved here from combat.ts).
// `createResolutionContext` builds the `ResolutionContext` (resolution-types.ts) the resolver
// threads; `drainGrantedActions` (4.1-E) runs the `perform-action` grants it queued.
//
// Phase 4.1-C2b (B1): `resolveIntent`'s default target is the side-aware one (`defaultTargetingFor`,
// derived from the RESOLVED action -- a `gemSlot: 'random'` cast defaults by the drawn spell's
// side), and `gemSlot: 'random'` draws over `castableGemSlots` (ASSUMPTION 13).
//
// Phase 4.1-C2c (B2, B5): `runAction` calls `checkLegality` before `resolveIntent` for EVERY source,
// so a lock refuses a chosen or granted action alike and a refused action draws nothing; granted
// casts go through Confusion -> Tunnel Vision -> Provoke like any action; rule 4's instance
// fallback is the side-aware default then Provoke; and a hit whose target died in its own pre-hit
// hooks fizzles (B5).

import { getCreature, findCreature, updateCreature } from './creature-lookup'
import {
  gatherExtraInstances,
  hasAnnihilate,
  hasSplashing,
  hasProvokeImmunity,
  isActionLocked,
} from './effects'
import { dealDamage, executeResponse, fireHook } from './resolution'
import {
  livingAlliesOf,
  livingEnemiesOf,
  resolveOffensiveTarget,
  resolveProvoke,
  shouldRedirectAoeToAllies,
} from './targeting'
import { resolveTargetSelector, targetSelectorHasCandidate } from './target-selectors'
import { nextRandom } from './rng'
import type {
  CascadeState,
  ResolutionContext,
  RunActionOptions,
} from './resolution-types'
import type { CreatureId } from './ids'
import type { Intent, RuleAction, TargetSelector } from './scripting-types'
import type { Action, CombatEvent, CombatState, Creature, Spell } from './types'

// ---- ResolutionContext factory ----

/**
 * Builds a fresh ResolutionContext over `events` (shared, mutated in place by push) and
 * `cascade` (fresh per top-level action; see resolveTurn's own "fresh cascade per top-level
 * action" discipline). `runAction` is the one-action entry the scopes in combat.ts and
 * `drainGrantedActions` call (resolution.ts only enqueues grants, 4.1-E): it
 * checks `intent` is legal for `actorId` (locks included -- B2.2, every source), resolves it, pushes
 * `options.announce` (if the intent resolved) right before executing, then executes -- a silent
 * no-op (nothing drawn, nothing pushed) if the actor is dead/unknown, the intent is illegal, or it
 * doesn't resolve to an action (no castable gem, no valid target).
 */
export function createResolutionContext(
  events: CombatEvent[],
  cascade: CascadeState,
): ResolutionContext {
  // One context object, shared by every executor `runAction` starts, so they all enqueue onto the
  // SAME `grants` queue (4.1-E) -- built first, `runAction` closes over it.
  const ctx: ResolutionContext = { events, cascade, grants: [], runAction }
  function runAction(
    actorId: CreatureId,
    intent: Intent,
    state: CombatState,
    options?: RunActionOptions,
  ): CombatState {
    const actor = findCreature(state, actorId)
    if (!actor || !actor.alive) return state // the dead-actor refusal (a queued grant's too)
    if (!checkLegality(actor, intent, state)) return state
    const action = resolveIntent(actor, intent, state)
    if (!action) return state
    if (options?.announce) events.push(options.announce)
    return executeAction(actor, action, state, ctx)
  }
  return ctx
}

export interface DrainGrantsOptions {
  /** The creature whose turn was skipped this turn, if any (B2 rule 1): a grant whose actor is
   * that creature is refused, even if the lock that skipped the turn is gone by now. The chance
   * roll already happened at trigger time, so the RNG stream doesn't depend on the skip. Supplied
   * by `resolveTurn` from its `'all'`-lock skip read (4.1-F1); transient, never in `CombatState`. */
  readonly skippedTurnOf?: CreatureId
}

/**
 * Phase 4.1-E (A2): runs `ctx.grants` -- the `perform-action` grants raised in this context's
 * scope -- FIRST IN, FIRST OUT, once the scope's own work is done (the chosen action, a hook pass,
 * ...). Actions are atomic: a granted action starts only now, after the granting action completed.
 * A grant raised BY a granted action goes to the back of the queue, behind those already waiting.
 *
 * Each entry runs at its granting trigger's cascade depth (`grant.depth`, which already includes
 * that trigger's +1), restored afterwards -- the granting trigger has unwound, so without carrying
 * the depth an echo chain would restart at 0 and never truncate. The re-entry guard needs no
 * exemption: it is empty by now.
 *
 * Refusals emit nothing of their own (the earlier `TriggerFired` stays): the skipped-turn gate
 * (here), then everything `runAction` checks -- a dead actor, a lock, no castable gem / valid
 * target. RNG draws, in order: gem, target, Confusion/Provoke (chance was rolled at trigger time).
 * `ActionGranted` is announced only once the grant is accepted, right before the action's first event.
 */
export function drainGrantedActions(
  ctx: ResolutionContext,
  state: CombatState,
  options: DrainGrantsOptions = {},
): CombatState {
  let working = state
  // Index loop on purpose: a granted action may append to `ctx.grants` while it runs (FIFO).
  for (let i = 0; i < ctx.grants.length; i++) {
    const grant = ctx.grants[i]
    if (!grant) continue
    if (grant.actorId === options.skippedTurnOf) continue // B2 rule 1
    const outerDepth = ctx.cascade.depth
    ctx.cascade.depth = grant.depth
    working = ctx.runAction(grant.actorId, grant.intent, working, {
      announce: {
        type: 'ActionGranted',
        sourceId: grant.sourceId,
        actorId: grant.actorId,
        effectId: grant.effectId,
      },
    })
    ctx.cascade.depth = outerDepth
  }
  ctx.grants.length = 0
  return working
}

// ---- Legality (pure, draws nothing) ----

/** The `enemy`/`ally` pool for `intendedSide`, relative to `actor`'s own side (mirrors
 * livingEnemiesOf/livingAlliesOf's own "relative to the acting creature" convention). */
function livingPoolFor(
  actor: Creature,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): readonly Creature[] {
  return intendedSide === 'ally'
    ? livingAlliesOf(actor, state)
    : livingEnemiesOf(actor, state)
}

/** Existence-only (no RNG): does `targeting` (or, absent, the intended side's default) have a
 * candidate at all? Absent targeting is legal whenever the intended side has >=1 living member
 * (B1: the side-aware default always exists then). */
function hasValidTarget(
  actor: Creature,
  targeting: TargetSelector | undefined,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): boolean {
  if (targeting) {
    if (targeting.kind === 'random')
      return livingPoolFor(actor, intendedSide, state).length > 0
    return targetSelectorHasCandidate(targeting, actor, state)
  }
  return livingPoolFor(actor, intendedSide, state).length > 0
}

/**
 * Phase 4.1-C2a (A1): every equipped slot (innate spells included -- they're bare entries in
 * `equippedSpells` like any gem, A8) whose spell is castable right now: non-empty, and (for a
 * single-target spell) has a valid target on its own intended side. An AOE spell is always
 * castable -- it "happens" even against an empty side (matches executeCastAoe's own contract).
 */
export function castableGemSlots(actor: Creature, state: CombatState): number[] {
  const slots: number[] = []
  actor.equippedSpells.forEach((spell, slot) => {
    if (!spell) return
    if (spell.targetShape === 'aoe') {
      slots.push(slot)
      return
    }
    const intendedSide = spell.targetSide
    if (livingPoolFor(actor, intendedSide, state).length > 0) slots.push(slot)
  })
  return slots
}

/**
 * `checkLegality(actor, intent, state)` -- pure, draws nothing. Can the actor take this action
 * at all: an `action-lock` (4.1-F1: an `'all'` lock refuses EVERY kind, Attack/Cast/Defend/Provoke/
 * Wait; a scoped lock only its own -- read through the effect iterator, so an immune bearer's
 * status lock doesn't count), an empty slot, no castable gem for `gemSlot: 'random'`, no valid
 * target? Used by the interpreter's lookahead over script rules, and by the implicit
 * fallback to decide whether Attack is legal at all before resolving it.
 */
export function checkLegality(
  actor: Creature,
  intent: Intent,
  state: CombatState,
): boolean {
  if (isActionLocked(actor, intent.action.kind)) return false
  switch (intent.action.kind) {
    case 'attack':
      return hasValidTarget(actor, intent.targeting, 'enemy', state)
    case 'cast': {
      const gemSlot = intent.action.gemSlot
      if (gemSlot === 'random') return castableGemSlots(actor, state).length > 0
      const spell = actor.equippedSpells[gemSlot]
      if (!spell) return false
      if (spell.targetShape === 'aoe') return true
      const intendedSide = spell.targetSide
      return hasValidTarget(actor, intent.targeting, intendedSide, state)
    }
    case 'defend':
    case 'provoke':
    case 'wait':
      return true
    default: {
      const exhaustive: never = intent.action
      throw new Error(`Unhandled rule action kind: ${String(exhaustive)}`)
    }
  }
}

// ---- Default targeting (B1) ----

/**
 * The side-aware default target SELECTOR for `action` on `actor`: `lowest-hp-enemy` for Attack
 * and an enemy-side spell, `lowest-hp-ally` for an ally-side spell. `undefined` for an AOE cast
 * (no single default target -- the whole side is hit), a `gemSlot: 'random'` cast (which spell
 * ends up chosen, and therefore which side is "intended", isn't known until gem resolution), and
 * a self-only action (Defend/Provoke/Wait). `resolveIntent` calls it with the RESOLVED gem slot, so
 * the `gemSlot: 'random'` case never reaches it unresolved there; the interpreter's
 * `acted-before-target` peek calls it pre-draw and treats `undefined` as "no default, no peek". */
export function defaultTargetingFor(
  actor: Creature,
  action: RuleAction,
): TargetSelector | undefined {
  switch (action.kind) {
    case 'attack':
      return { kind: 'lowest-hp-enemy' }
    case 'cast': {
      if (action.gemSlot === 'random') return undefined
      const spell = actor.equippedSpells[action.gemSlot]
      if (!spell || spell.targetShape === 'aoe') return undefined
      return spell.targetSide === 'ally'
        ? { kind: 'lowest-hp-ally' }
        : { kind: 'lowest-hp-enemy' }
    }
    case 'defend':
    case 'provoke':
    case 'wait':
      return undefined
    default: {
      const exhaustive: never = action
      throw new Error(`Unhandled rule action kind: ${String(exhaustive)}`)
    }
  }
}

// ---- Resolution (the only place action-level draws happen) ----

/** The `'random'` selector's own draw: uniform over living creatures on `intendedSide`, same
 * pool/order as today's `random-enemy`/`random-ally` (`livingEnemiesOf`/`livingAlliesOf`). */
function resolveRandomTarget(
  actor: Creature,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): CreatureId | null {
  const pool = livingPoolFor(actor, intendedSide, state)
  if (pool.length === 0) return null
  const index = Math.floor(nextRandom(state.rng) * pool.length)
  return pool[index]?.id ?? null
}

/** Resolves an already-defaulted selector (`intent.targeting ?? defaultTargetingFor(...)`).
 * `'random'` draws over the intended side; an absent selector (no single default exists) is null. */
function resolveSelectorTarget(
  actor: Creature,
  targeting: TargetSelector | undefined,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): CreatureId | null {
  if (!targeting) return null
  if (targeting.kind === 'random') return resolveRandomTarget(actor, intendedSide, state)
  return resolveTargetSelector(targeting, actor, state)
}

/** Phase 4.1-C2b (ASSUMPTION 13): uniform among the actor's CASTABLE slots (innate included) --
 * `castableGemSlots`, the same set `checkLegality` uses. No castable slot means no draw. */
function resolveGemSlot(
  actor: Creature,
  gemSlot: number | 'random',
  state: CombatState,
): number | null {
  if (gemSlot !== 'random') return gemSlot
  const castable = castableGemSlots(actor, state)
  if (castable.length === 0) return null
  const index = Math.floor(nextRandom(state.rng) * castable.length)
  return castable[index] ?? null
}

/** An enemy-side single target: the override pipeline (Confusion -> Tunnel Vision -> Provoke),
 * for every action source (B2.3). */
function resolveEnemySingleTarget(
  actor: Creature,
  targeting: TargetSelector | undefined,
  state: CombatState,
): CreatureId | null {
  return resolveOffensiveTarget(actor, state, () =>
    resolveSelectorTarget(actor, targeting, 'enemy', state),
  )
}

/**
 * `resolveIntent(actor, intent, state)` -- the single place action-level random draws happen.
 * Gem resolution (for a Cast) draws first, over the castable slots. Target resolution: explicit
 * selector (including `'random'`) -> the side-aware default of the RESOLVED action
 * (`defaultTargetingFor`) -> for an enemy-side single target, Confusion -> Tunnel Vision -> Provoke
 * (`resolveOffensiveTarget`). An ally-side single target skips that override pipeline entirely
 * (GAME_DESIGN §7). Returns `null` when no legal action results. Legality (locks) is NOT checked
 * here: `runAction` calls `checkLegality` first, so a refused action never reaches a draw.
 */
export function resolveIntent(
  actor: Creature,
  intent: Intent,
  state: CombatState,
): Action | null {
  switch (intent.action.kind) {
    case 'attack': {
      const targeting = intent.targeting ?? defaultTargetingFor(actor, intent.action)
      const targetId = resolveEnemySingleTarget(actor, targeting, state)
      return targetId ? { kind: 'attack', targetId } : null
    }
    case 'cast': {
      const gemSlot = resolveGemSlot(actor, intent.action.gemSlot, state)
      if (gemSlot === null) return null
      const spell = actor.equippedSpells[gemSlot]
      if (!spell) return null // defensive/unreachable -- a resolved numeric slot is always real
      if (spell.targetShape === 'aoe') {
        return { kind: 'cast', targetShape: 'aoe', gemSlot }
      }
      const targeting =
        intent.targeting ?? defaultTargetingFor(actor, { kind: 'cast', gemSlot })
      const targetSide = spell.targetSide
      const targetId =
        targetSide === 'ally'
          ? resolveSelectorTarget(actor, targeting, 'ally', state)
          : resolveEnemySingleTarget(actor, targeting, state)
      return targetId ? { kind: 'cast', targetShape: 'single', gemSlot, targetId } : null
    }
    case 'defend':
      return { kind: 'defend' }
    case 'provoke':
      return { kind: 'provoke' }
    case 'wait':
      return { kind: 'wait' }
    default: {
      const exhaustive: never = intent.action
      throw new Error(`Unhandled rule action kind: ${String(exhaustive)}`)
    }
  }
}

// ---- Execution (the executors, moved from combat.ts unchanged) ----

/**
 * ASSUMPTION 31: every instance after the first targets the SAME resolved target as instance 1
 * (the selector is not re-run per instance) -- except when that target has since died. Rule 4
 * (CONVENTIONS "Every action source obeys the same rules", 4.1-C2c): a dead previous target
 * falls back to the side-aware default of the instance's own action (`defaultTargetingFor`, the
 * same function B1 uses), then Provoke -- one draw even for a single provoker, skipped under Tunnel
 * Vision and for an ally-side instance. It never rolls Confusion. Returns null once no living
 * target remains (nothing further in the list can resolve).
 *
 * `targetSide` (Attack passes the default 'enemy'; a support spell's instances pass 'ally') says
 * whether the Provoke step applies (GAME_DESIGN §7: ally-side actions are exempt).
 */
function resolveInstanceTarget(
  actor: Creature,
  previousTargetId: CreatureId | null,
  state: CombatState,
  action: RuleAction,
  targetSide: 'enemy' | 'ally' = 'enemy',
): CreatureId | null {
  if (previousTargetId) {
    const current = findCreature(state, previousTargetId)
    if (current?.alive) return previousTargetId
  }
  const selector = defaultTargetingFor(actor, action)
  const resolveDefault = (): CreatureId | null =>
    selector ? resolveTargetSelector(selector, actor, state) : null
  if (targetSide === 'ally' || hasProvokeImmunity(actor)) return resolveDefault()
  return resolveProvoke(actor, state, resolveDefault)
}

/**
 * The action instance-list model (CONVENTIONS' "action instance-list", locked): an Attack or
 * Cast resolves as a list of powerPercent entries, assembled ONCE, up front, before any instance
 * resolves -- base [100], plus one entry per active action-instance passive matching
 * `actionKind` (or 'both'), in canonical active-effects order. Composition is LINEAR
 * ([100, 100, 30], never a re-multiplied entry). Nothing is spawned mid-resolution, so there is
 * no trigger/re-entrancy/loop-guard involvement here -- this is a pre-computed execution plan.
 */
function buildInstanceList(
  actor: Creature,
  actionKind: 'attack' | 'cast',
): readonly number[] {
  return [100, ...gatherExtraInstances(actor, actionKind)]
}

/**
 * Phase 4 Slice C (Proficient Warrior / Annihilate): the living enemies a Splashing actor's
 * main ATTACK hit against `mainTargetId` should also strike -- computed from `state` as it
 * stood BEFORE the main hit lands (so `mainTargetId` is still among the alive-filtered list
 * adjacentLivingTargets indexes into; looking this up AFTER the main hit could drop the just-
 * killed main target out of that list and break the adjacency lookup). Empty when the actor
 * has no active Splashing. Annihilate upgrades the set to every OTHER living enemy. Attacks
 * only -- brute.md defines Splashing as "attacks deal 100% of their damage to enemies
 * adjacent to the target"; only executeAttack (below) calls this, never executeCastSingle.
 */
function splashTargetIds(
  actor: Creature,
  mainTargetId: CreatureId,
  state: CombatState,
): CreatureId[] {
  if (!hasSplashing(actor)) return []
  const opposingParty = actor.side === 'player' ? state.enemyParty : state.playerParty
  if (hasAnnihilate(actor)) {
    return opposingParty.filter((c) => c.alive && c.id !== mainTargetId).map((c) => c.id)
  }
  const mainTarget = findCreature(state, mainTargetId)
  if (!mainTarget) return []
  return adjacentLivingTargets(mainTarget, opposingParty).map((c) => c.id)
}

/**
 * Phase 4 Slice C (Splashing): the living neighbors of `target` within `party`, taken from
 * the alive-filtered, slot-ordered list (ASSUMPTION 14 -- living-adjacency, not raw
 * slot-index adjacency: a dead slot-neighbor would make Splashing whiff for no
 * player-visible reason, and living-adjacency degrades gracefully as a side thins out).
 * Returns up to two neighbors (one at each edge of the living list); empty when `target`
 * isn't alive-and-present in `party` or has no living neighbor.
 */
function adjacentLivingTargets(target: Creature, party: readonly Creature[]): Creature[] {
  const living = party.filter((c) => c.alive)
  const index = living.findIndex((c) => c.id === target.id)
  if (index === -1) return []
  const neighbors: Creature[] = []
  const before = living[index - 1]
  const after = living[index + 1]
  if (before) neighbors.push(before)
  if (after) neighbors.push(after)
  return neighbors
}

/**
 * CONVENTIONS "An action ends when its actor dies" (4.1-C2c, PR #73 review): true once the actor
 * has died inside its own action (a retaliation after one of its hits, or a response nested in
 * its own pre-hit hooks). Read fresh from `working`, never from the `actor` snapshot the executor
 * was handed. Callers drop the rest of the action: no further events, no fizzle event.
 */
function actorDied(actor: Creature, working: CombatState): boolean {
  return !findCreature(working, actor.id)?.alive
}

function executeAttack(
  actor: Creature,
  targetId: CreatureId,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  let working = state
  let resolvedTargetId: CreatureId | null = targetId

  for (const [instanceIndex, powerPercent] of buildInstanceList(
    actor,
    'attack',
  ).entries()) {
    if (actorDied(actor, working)) break // site 1: before target resolution / AttackDeclared
    resolvedTargetId = resolveInstanceTarget(actor, resolvedTargetId, working, {
      kind: 'attack',
    })
    if (!resolvedTargetId) break // no living target left for this or any further instance

    const thisTargetId = resolvedTargetId
    const splashIds = splashTargetIds(actor, thisTargetId, working)
    ctx.events.push({
      type: 'AttackDeclared',
      attackerId: actor.id,
      targetId: thisTargetId,
    })
    working = fireHook('on-attack', [actor.id], thisTargetId, working, ctx).state
    // Phase 4 Slice E2 (general action-observation system): fires on ALL living creatures
    // (cheap -- effectsForHook returns nothing for non-observers), per instance, alongside the
    // actor's own on-attack hook above -- see CONVENTIONS' actor-vs-observer routing table.
    working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
      observed: { actionKind: 'attack', instanceIndex },
    }).state
    // B5 (CONVENTIONS): the pre-hit hooks may have killed the target -- that hit fizzles (no
    // damage, no Splashing for this instance). AttackDeclared stays in the log; no fizzle event.
    // The next instance re-targets per rule 4. A dead ACTOR ends the whole action instead (site 2).
    if (actorDied(actor, working)) break
    if (!findCreature(working, thisTargetId)?.alive) continue
    working = dealDamage(
      actor.id,
      thisTargetId,
      'attack',
      powerPercent / 100,
      'attack',
      working,
      ctx,
    )
    // Splashing: recompute the SAME formula (own offStat/spellPower, each splash target's own
    // Defence/affinity/pools -- never a copy of the main hit's number, ASSUMPTION 15). No
    // TriggerFired -- it's the same action, not a triggered response. Re-checks aliveness in
    // case an earlier splash hit's own damage-path cascade (e.g. Retaliate) already killed a
    // later one.
    for (const splashId of splashIds) {
      if (actorDied(actor, working)) break // site 3: before each Splashing hit
      if (!findCreature(working, splashId)?.alive) continue
      working = dealDamage(
        actor.id,
        splashId,
        'attack',
        powerPercent / 100,
        'attack',
        working,
        ctx,
      )
    }
  }
  return working
}

/**
 * Phase 4.1-D (A4): runs a spell's effect list against ONE landed target -- the single target, or
 * the AOE member being hit -- in list order, each through `executeResponse` DIRECTLY (not
 * `fireHook`): a spell's effects are the chosen action, never a trigger, so none emits
 * `TriggerFired` and none takes part in cascade-depth / self-re-entry accounting (ASSUMPTION
 * D-A4, byte-identical with the pre-4.1-D direct calls). `cast-target` resolves to `targetId`; a
 * dead one gets nothing because no verb acts on a corpse (`executeResponse`'s verb rule; pre-4.1-D
 * this was `applyStatusIfAlive`), so an `apply-status` after a killing hit lands nowhere.
 * `self` resolves to the caster, once per landed target.
 *
 * The list is ATOMIC (ASSUMPTION 35, design-owner confirmed): no dead-actor check between one
 * target's effects -- if a retaliation to the damage kills the caster, the rest of this target's
 * list still runs; the checks sit between targets and instances (the callers' loops). Magnitudes
 * read the caster LIVE when each effect runs (ASSUMPTION 36), as Attack and every response do.
 * `powerPercent` scales `deal-damage` / `heal` only (resolution.ts, `castPowerFraction`).
 * `apply-stat-modifier`'s source id is the spell's id, as before.
 */
function executeSpellEffects(
  actor: Creature,
  spell: Spell,
  targetId: CreatureId,
  powerPercent: number,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  let working = state
  for (const effect of spell.effects) {
    working = executeResponse(
      effect,
      spell.id,
      { self: actor.id, castTarget: targetId, castPowerFraction: powerPercent / 100 },
      working,
      ctx,
    ).state
  }
  return working
}

function executeCastSingle(
  actor: Creature,
  gemSlot: number,
  targetId: CreatureId,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const spell = actor.equippedSpells[gemSlot]
  if (!spell)
    throw new Error('resolver invariant violated: cast referencing an empty gem slot')

  const targetSide = spell.targetSide
  let working = state
  let resolvedTargetId: CreatureId | null = targetId

  for (const [instanceIndex, powerPercent] of buildInstanceList(
    actor,
    'cast',
  ).entries()) {
    if (actorDied(actor, working)) break // site 1: before target resolution / SpellCast
    resolvedTargetId = resolveInstanceTarget(
      actor,
      resolvedTargetId,
      working,
      { kind: 'cast', gemSlot },
      targetSide,
    )
    if (!resolvedTargetId) break

    const thisTargetId = resolvedTargetId
    ctx.events.push({
      type: 'SpellCast',
      targetShape: 'single',
      casterId: actor.id,
      gemSlot,
      targetId: thisTargetId,
    })
    working = fireHook('on-cast', [actor.id], thisTargetId, working, ctx).state
    // Phase 4 Slice E2 (general action-observation system): Resonants' own consumer shape
    // (relationship 'ally', actionKind 'cast') -- see CONVENTIONS' actor-vs-observer routing. An
    // echo (a `perform-action` grant) raised here is queued, and runs after this whole action.
    working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
      observed: { actionKind: 'cast', instanceIndex },
    }).state
    // B5: same pre-hit-hook fizzle as executeAttack (no payload, no status); SpellCast stays.
    if (actorDied(actor, working)) break // site 2
    if (!findCreature(working, thisTargetId)?.alive) continue
    working = executeSpellEffects(actor, spell, thisTargetId, powerPercent, working, ctx)
  }
  return working
}

function executeCastAoe(
  actor: Creature,
  gemSlot: number,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const spell = actor.equippedSpells[gemSlot]
  if (!spell)
    throw new Error('resolver invariant violated: cast referencing an empty gem slot')

  const targetSide = spell.targetSide
  let working = state

  for (const [instanceIndex, powerPercent] of buildInstanceList(
    actor,
    'cast',
  ).entries()) {
    if (actorDied(actor, working)) break // site 1: before target freezing / SpellCast
    // Phase 4 Slice E: an ally-targeting AOE spell always freezes the caster's OWN living side
    // -- no Confusion roll at all (Confusion's redirect is scoped to a "harmful action" per
    // CONVENTIONS; a support cast on your own side is never one, so it must never touch
    // state.rng here, mirroring targeting.ts's "draws nothing when inactive" discipline).
    // Provoke was already exempt for every AOE regardless of side (GAME_DESIGN §7).
    let resolvedParty: 'player' | 'enemy'
    if (targetSide === 'ally') {
      resolvedParty = actor.side
    } else {
      // Confusion (ASSUMPTION 13): one roll, per instance, decides whether this WHOLE AOE
      // instance retargets to the caster's own living side instead of the enemy side -- never
      // a per-target coin flip.
      const redirectToAllies = shouldRedirectAoeToAllies(actor, working)
      const opposingSide = actor.side === 'player' ? 'enemy' : 'player'
      resolvedParty = redirectToAllies ? actor.side : opposingSide
    }
    const targetParty =
      resolvedParty === 'player' ? working.playerParty : working.enemyParty
    // Frozen target list: all living members of the resolved side, slot order -- each AOE
    // instance independently re-freezes its OWN set at that instance's cast-start (no single
    // target to preserve across instances, unlike the single-target case above).
    const targetIds = targetParty.filter((c) => c.alive).map((c) => c.id)
    ctx.events.push({
      type: 'SpellCast',
      targetShape: 'aoe',
      casterId: actor.id,
      gemSlot,
      targetIds,
    })
    // AOE has no single target to name as the hook's `source` -- self only.
    working = fireHook('on-cast', [actor.id], undefined, working, ctx).state
    // Phase 4 Slice E2 (general action-observation system): source here IS the actor (needed
    // for relationship filtering), unlike on-cast's own source above.
    working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
      observed: { actionKind: 'cast', instanceIndex },
    }).state

    for (const targetId of targetIds) {
      if (actorDied(actor, working)) break // site 4: before each AOE member's hit
      // Skip a frozen-list target that's no longer alive by the time its hit lands (a prior
      // hit's on-death/reflect cascade may have killed it). The frozen target *set* is
      // unchanged; this only skips *hitting* an already-dead member.
      const target = getCreature(working, targetId)
      if (!target.alive) continue
      working = executeSpellEffects(actor, spell, targetId, powerPercent, working, ctx)
    }
  }

  return working
}

function executeDefend(
  actor: Creature,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  ctx.events.push({ type: 'Defended', creatureId: actor.id })
  let working = fireHook('on-defend', [actor.id], undefined, state, ctx).state
  // Phase 4 Slice E2 (general action-observation system): Defend/Provoke are always
  // single-instance in v1 -- instanceIndex is always 0.
  working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
    observed: { actionKind: 'defend', instanceIndex: 0 },
  }).state
  // Phase 4 Slice D / ASSUMPTION 17: cumulative for the whole fight, never reset -- read fresh
  // from `working` (not the pre-hook `actor`) in case an on-defend response somehow touched it,
  // matching the project's existing "re-fetch before mutating" discipline (e.g. combat.ts's own
  // freshActor pattern).
  const afterHook = getCreature(working, actor.id)
  return updateCreature(working, actor.id, {
    defending: true,
    defendCount: afterHook.defendCount + 1,
  })
}

function executeProvoke(
  actor: Creature,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  ctx.events.push({ type: 'Provoked', creatureId: actor.id })
  let working = fireHook('on-provoke', [actor.id], undefined, state, ctx).state
  working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
    observed: { actionKind: 'provoke', instanceIndex: 0 },
  }).state
  return updateCreature(working, actor.id, { provoking: true })
}

function executeWait(
  actor: Creature,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  ctx.events.push({ type: 'Waited', creatureId: actor.id })
  return state
}

/** `executeAction`: the executors, moved here from combat.ts. */
export function executeAction(
  actor: Creature,
  action: Action,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  switch (action.kind) {
    case 'attack':
      return executeAttack(actor, action.targetId, state, ctx)
    case 'cast':
      switch (action.targetShape) {
        case 'single':
          return executeCastSingle(actor, action.gemSlot, action.targetId, state, ctx)
        case 'aoe':
          return executeCastAoe(actor, action.gemSlot, state, ctx)
        default: {
          const exhaustive: never = action
          throw new Error(`Unhandled cast shape: ${String(exhaustive)}`)
        }
      }
    case 'defend':
      return executeDefend(actor, state, ctx)
    case 'provoke':
      return executeProvoke(actor, state, ctx)
    case 'wait':
      return executeWait(actor, state, ctx)
    default: {
      const exhaustive: never = action
      throw new Error(`Unhandled action kind: ${String(exhaustive)}`)
    }
  }
}

/** All living creatures' ids in tie-break order (player slots, then enemy slots) -- the order
 * global phase-point hooks (fight-start, round-end) iterate; also on-action-observed's own
 * "every living creature" scope. Duplicated from combat.ts's own copy (kept private there too --
 * neither module imports the other's private helpers) rather than shared, since it's a one-line
 * derivation with no state of its own. */
function livingIds(state: CombatState): CreatureId[] {
  return [...state.playerParty, ...state.enemyParty]
    .filter((c) => c.alive)
    .map((c) => c.id)
}
