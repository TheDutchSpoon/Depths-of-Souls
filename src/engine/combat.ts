import { createRngState, nextRandom } from './rng'
import { ROUND_CAP } from './config'
import { buildTurnQueue } from './turn-order'
import { compareBySideSlotId } from './tie-break'
import { getCreature, findCreature, updateCreature } from './creature-lookup'
import {
  resolveBaselineEffects,
  instantiateEffectDefs,
  effectiveMaxHp,
  activeBonusCast,
} from './effects'
import { fireHook, newCascade } from './resolution'
import { createResolutionContext } from './actions'
import { decideAction } from './interpreter'
import type { CreatureId } from './ids'
import type { EffectDef, EffectInstanceId, InnateSpellEffect } from './effect-types'
import type { CombatEvent, CombatState, Creature, FightResult } from './types'
import type { Intent, Script } from './scripting-types'
import type { StatusDef, Trait } from './effect-types'

/** Phase 4.1-B (S1): one side's fight-setup input -- its party and its side-wide effects (perks
 * for the player today; biome/boss effects for either side later). */
export interface CreateCombatSideInput {
  readonly party: readonly Creature[]
  readonly effects?: readonly EffectDef[]
}

export interface CreateCombatRegistries {
  readonly scripts?: ReadonlyMap<string, Script>
  readonly traits?: ReadonlyMap<string, Trait>
  readonly statuses?: ReadonlyMap<string, StatusDef>
}

export interface CreateCombatInput {
  readonly seed: number
  readonly player: CreateCombatSideInput
  readonly enemy: CreateCombatSideInput
  readonly registries?: CreateCombatRegistries
}

/**
 * Phase 4.1-B (S1): named per-side inputs -- two same-typed positional lists (player effects,
 * enemy effects) could be silently swapped; `{ player: { party, effects }, enemy: { party,
 * effects }, registries }` can't. `registries` bundles scripts/traits/statuses, each defaulting
 * to an empty Map (matching the pre-S1 positional defaults).
 *
 * `createCombat` ALWAYS RECOMPUTES `baselineEffects` from each input creature's own
 * `innateTraitIds` (+ that creature's own side's effects) and RESETS `revivesUsed` to `0` -- it
 * never trusts those fields on an input `Creature` (design-review B-5). Fight setup takes FRESH
 * creatures only (PR #69 review, R3): an input creature that already carries setup output
 * (non-empty `baselineEffects` or `activeEffects` -- i.e. pulled from a PREVIOUS `CombatState`
 * rather than fresh `materializeCreature` output) is a thrown error, not silently discarded-and-
 * recomputed -- re-feeding one would double its innate spell slots (A8), since this function
 * itself prepends every `innate-spell` effect's spell onto `equippedSpells`. A creature whose own
 * `side` doesn't match the list it was passed in (`player.party` vs `enemy.party`) is likewise a
 * thrown error (R1) -- each side's `effects` apply to exactly that side's creatures.
 */
export function createCombat(input: CreateCombatInput): CombatState {
  const { seed, player, enemy, registries = {} } = input
  const { scripts = new Map(), traits = new Map(), statuses = new Map() } = registries
  const playerEffects = player.effects ?? []
  const enemyEffects = enemy.effects ?? []

  if (player.party.length === 0 || enemy.party.length === 0) {
    throw new Error('createCombat: both parties must have at least one creature')
  }

  // Fight-start: resolve + instantiate each creature's innate-trait (+ this side's own effects)
  // effects onto activeEffects (B4: fresh ids from the shared per-fight counter, threaded across
  // BOTH parties, player then enemy, slot order), prepend any innate spells onto equippedSpells
  // (A8), reset revivesUsed (D3), then set currentHp to effective max Health (so a +Health
  // trait/perk actually grants the HP). For a trait-less, effect-less creature this is a no-op:
  // activeEffects is [] and effective max == base Health, so currentHp is unchanged -- Phase 1/2
  // fixtures stay byte-identical.
  let counter = 0
  const instantiate = (
    creature: Creature,
    side: 'player' | 'enemy',
    sideEffects: readonly EffectDef[],
    sideLabel: string,
  ): Creature => {
    if (creature.side !== side) {
      throw new Error(
        `createCombat: creature "${creature.id}" has side "${creature.side}" but was passed in ${side}.party`,
      )
    }
    if (creature.baselineEffects.length > 0 || creature.activeEffects.length > 0) {
      throw new Error(
        `createCombat: creature "${creature.id}" already carries fight-setup output (baselineEffects/activeEffects) -- fight setup takes fresh creatures only, or innate spells would double`,
      )
    }
    const baselineEffects = resolveBaselineEffects(
      creature,
      traits,
      sideEffects,
      sideLabel,
    )
    const { effects: activeEffects, nextCounter } = instantiateEffectDefs(
      baselineEffects,
      counter,
    )
    counter = nextCounter
    const innateSpells = activeEffects
      .filter((e): e is InnateSpellEffect => e.category === 'innate-spell')
      .map((e) => e.spell)
    const withEffects: Creature = {
      ...creature,
      baselineEffects,
      activeEffects,
      equippedSpells: [...innateSpells, ...creature.equippedSpells],
      revivesUsed: 0,
    }
    return { ...withEffects, currentHp: effectiveMaxHp(withEffects) }
  }

  return {
    rng: createRngState(seed),
    playerParty: player.party.map((c) => instantiate(c, 'player', playerEffects, 'perk')),
    enemyParty: enemy.party.map((c) =>
      instantiate(c, 'enemy', enemyEffects, 'enemy-effect'),
    ),
    turnQueue: [],
    turnCursor: 0,
    round: 0,
    result: null,
    scripts,
    statuses,
    effectInstanceCounter: counter,
  }
}

/** The literal expiry point of Defend/Provoke's "until its next turn." */
function clearOwnTransientStatus(state: CombatState, id: CreatureId): CombatState {
  return updateCreature(state, id, { defending: false, provoking: false })
}

/** All living creatures' ids in tie-break order (player slots, then enemy slots) -- the order
 * global phase-point hooks (fight-start, round-end) iterate. */
function livingIds(state: CombatState): CreatureId[] {
  return [...state.playerParty, ...state.enemyParty]
    .filter((c) => c.alive)
    .map((c) => c.id)
}

/**
 * Phase 4 Slice E2 (Web break-free): rolled at EVERY creature's turn-start (a per-GLOBAL-turn
 * chance, not the bearer's own hook -- see TurnOrderStatusDef.breakChancePercent's own doc
 * comment), against every LIVING bearer of an active turn-order-status carrying
 * breakChancePercent. A board with no such bearer draws nothing (only-when-present discipline).
 * Bearers are iterated in the canonical side->slot->id tie-break order (not raw activeEffects
 * array order) so the draw sequence is deterministic and goldens are stable regardless of party
 * construction order. On a successful roll, the specific effect instance is removed and
 * StatusExpired is emitted -- the already-frozen CURRENT round's turnQueue is untouched (never
 * recompute mid-round); breaking free only changes NEXT round's buildTurnQueue.
 */
function rollWebBreakFree(state: CombatState, events: CombatEvent[]): CombatState {
  const bearers = [...state.playerParty, ...state.enemyParty]
    .filter((c) => c.alive)
    .sort(compareBySideSlotId)

  let working = state
  for (const bearer of bearers) {
    const current = getCreature(working, bearer.id)
    for (const effect of current.activeEffects) {
      if (effect.category !== 'turn-order-status') continue
      if (effect.breakChancePercent === undefined) continue
      if (nextRandom(working.rng) < effect.breakChancePercent / 100) {
        working = updateCreature(working, bearer.id, {
          activeEffects: current.activeEffects.filter(
            (e) => e.instanceId !== effect.instanceId,
          ),
        })
        events.push({
          type: 'StatusExpired',
          creatureId: bearer.id,
          statusId: effect.statusId,
        })
      }
    }
  }
  return working
}

interface StatusSnapshotEntry {
  readonly creatureId: CreatureId
  readonly instanceId: EffectInstanceId
  readonly statusId: string
}

/** Every status-carrying effect (condition-status/damage-modifier) present right now, across
 * both parties (alive or not -- a status on a just-dead bearer still needs decrementing/expiry
 * bookkeeping). This is the "start-of-sweep snapshot": statuses BORN during this same sweep
 * (e.g. from an on-death trait) are never in it, so they keep full duration and start counting
 * at the NEXT round-end. */
function snapshotStatuses(state: CombatState): StatusSnapshotEntry[] {
  const entries: StatusSnapshotEntry[] = []
  for (const creature of [...state.playerParty, ...state.enemyParty]) {
    for (const effect of creature.activeEffects) {
      if (
        effect.category === 'condition-status' ||
        effect.category === 'damage-modifier' ||
        // Phase 4 Slice C: turn-order-status (Web/Blindclaws) and friendly-fire-status
        // (Confusion) decrement/expire on the same round-end schedule as any other status,
        // even though both are read PASSIVELY (never fired via a hook).
        effect.category === 'turn-order-status' ||
        effect.category === 'friendly-fire-status'
      ) {
        entries.push({
          creatureId: creature.id,
          instanceId: effect.instanceId,
          statusId: effect.statusId,
        })
      }
    }
  }
  return entries
}

/** Decrements remaining duration for snapshot statuses ONLY, then expires any that reach 0
 * (StatusExpired, removed from activeEffects). Statuses not in the snapshot (born mid-sweep)
 * are untouched here. A snapshot entry whose (creature, statusId) pair was ALSO (re)applied
 * during this same sweep's firing step (`reappliedThisSweep`) is treated as fresh too -- refresh
 * mid-sweep unifies with the born-mid-sweep rule, so a re-application never gets decremented in
 * the very sweep that just refreshed it. */
function decrementAndExpireSnapshot(
  state: CombatState,
  snapshot: readonly StatusSnapshotEntry[],
  events: CombatEvent[],
  reappliedThisSweep: ReadonlySet<string>,
): CombatState {
  let working = state
  for (const { creatureId, instanceId, statusId } of snapshot) {
    if (reappliedThisSweep.has(`${creatureId}#${statusId}`)) continue // refreshed this sweep

    const creature = findCreature(working, creatureId)
    if (!creature) continue
    const effect = creature.activeEffects.find((e) => e.instanceId === instanceId)
    if (
      !effect ||
      (effect.category !== 'condition-status' &&
        effect.category !== 'damage-modifier' &&
        effect.category !== 'turn-order-status' &&
        effect.category !== 'friendly-fire-status')
    ) {
      continue
    }

    const remainingDuration = effect.remainingDuration - 1
    if (remainingDuration > 0) {
      working = updateCreature(working, creatureId, {
        activeEffects: creature.activeEffects.map((e) =>
          e.instanceId === instanceId ? { ...e, remainingDuration } : e,
        ),
      })
    } else {
      working = updateCreature(working, creatureId, {
        activeEffects: creature.activeEffects.filter((e) => e.instanceId !== instanceId),
      })
      events.push({ type: 'StatusExpired', creatureId, statusId: effect.statusId })
    }
  }
  return working
}

/**
 * The round-end status sweep (GAME_DESIGN's status lifecycle): (1) snapshot statuses present at
 * sweep start, (2) fire all on-round-end hooks across all living creatures in tie-break order
 * (incl. DoT/Regen ticks; cascades incl. on-death resolve fully -- a creature killed mid-sweep
 * fires only on-death, its own not-yet-reached on-round-end effects skipped by fireHook's
 * fresh alive-check), (3)+(4) decrement then expire ONLY the snapshotted statuses -- except any
 * (creature, statusId) pair that was itself (re)applied during step (2), derived directly from
 * the StatusApplied events that step just produced (no extra state threaded through
 * applyStatus/fireHook/executeResponse, which would otherwise burden the non-sweep spell-cast
 * caller too). Win/loss is checked by the caller once, after this whole sweep completes.
 */
function resolveRoundEndSweep(state: CombatState, events: CombatEvent[]): CombatState {
  const snapshot = snapshotStatuses(state)
  // PR #64 review fix 2: a condition-status's on-round-end trigger may only fire for a
  // (creature, statusId) pair that existed at THIS sweep's own start -- a status applied mid-
  // sweep (e.g. Myconet Rotcore's on-death Poison-burst, itself triggered by a DoT tick killing
  // Rotcore earlier in this same sweep) must not also tick in the sweep that just created it.
  const snapshotKeys = new Set(
    snapshot.map((entry) => `${entry.creatureId}#${entry.statusId}`),
  )
  const firstSweepEventIndex = events.length
  // Live (not precomputed): checked fresh at each candidate trigger's own firing point, since
  // "(re)applied EARLIER in this same sweep" is itself a function of how far the sweep has
  // progressed -- an early StatusApplied must gate a LATER creature's tick of that same status,
  // even though both happen inside this one fireHook pass.
  const statusTriggerGate = (creatureId: CreatureId, statusId: string): boolean => {
    if (!snapshotKeys.has(`${creatureId}#${statusId}`)) return false // born mid-sweep
    for (let i = firstSweepEventIndex; i < events.length; i++) {
      const event = events[i]
      if (
        event?.type === 'StatusApplied' &&
        event.targetId === creatureId &&
        event.statusId === statusId
      ) {
        return false // (re)applied earlier in this same sweep
      }
    }
    return true
  }
  const fired = fireHook(
    'on-round-end',
    livingIds(state),
    undefined,
    state,
    createResolutionContext(events, newCascade()),
    { statusTriggerGate },
  ).state

  const reappliedThisSweep = new Set<string>()
  for (let i = firstSweepEventIndex; i < events.length; i++) {
    const event = events[i]
    if (event?.type === 'StatusApplied') {
      reappliedThisSweep.add(`${event.targetId}#${event.statusId}`)
    }
  }

  return decrementAndExpireSnapshot(fired, snapshot, events, reappliedThisSweep)
}

// The action executors (attack/cast/defend/provoke/wait) all moved to actions.ts (Phase
// 4.1-C2a, A1) -- combat.ts now only orchestrates the turn skeleton, dispatching every action
// through actions.ts's `checkLegality`/`resolveIntent`/`executeAction` (or, for the main
// scripted/fallback action and the granted bonus-cast below, `ResolutionContext.runAction`,
// which wraps that same pipeline).

/**
 * Phase 4 Slice F (Sorcerer starter's bonus-cast passive -- see BonusCastDef's own doc comment
 * for why this is a passively-consulted EffectDef rather than a 10th response verb). Rolled
 * ONLY when the actor carries the passive (chancePercent discipline: an ordinary creature never
 * touches state.rng here); on success, runs a real granted Cast through the shared action
 * pipeline (`gemSlot: 'random'`, no explicit targeting -- `ctx.runAction` reproduces today's
 * exact gem/target draw order and "no castable gem -> no-op" fizzle, see actions.ts's own header
 * comment on what's deliberately NOT yet wired here in C2a: no legality/lock check, matching
 * today -- that gating is Phase 4.1-C2b, B2).
 */
function maybeFireBonusCast(
  actorId: CreatureId,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  const actor = getCreature(state, actorId)
  if (!actor.alive) return state
  const bonusCast = activeBonusCast(actor)
  if (!bonusCast) return state
  if (!(nextRandom(state.rng) < bonusCast.chancePercent / 100)) return state

  const ctx = createResolutionContext(events, newCascade())
  const intent: Intent = { action: { kind: 'cast', gemSlot: 'random' } }
  return ctx.runAction(actor.id, intent, state)
}

function checkWinLoss(state: CombatState): FightResult | null {
  const playerAlive = state.playerParty.some((c) => c.alive)
  const enemyAlive = state.enemyParty.some((c) => c.alive)
  if (!playerAlive && !enemyAlive) return 'draw'
  if (!enemyAlive) return 'win'
  if (!playerAlive) return 'loss'
  return null
}

function finalize(
  state: CombatState,
  events: CombatEvent[],
  result: FightResult,
): { state: CombatState; events: CombatEvent[] } {
  // No on-fight-end hook in the v1 vocabulary; just set the result and emit FightEnded.
  return {
    state: { ...state, result },
    events: [...events, { type: 'FightEnded', result }],
  }
}

export function resolveTurn(state: CombatState): {
  state: CombatState
  events: CombatEvent[]
} {
  const events: CombatEvent[] = []
  // Phase 4.1-B (B3, B-1): "the per-turn working copy resolveTurn makes when it starts" --
  // clones `rng` into a FRESH object so every draw this turn (directly here, or by any pure
  // helper this call tree hands `working`/its descendants to -- target selectors, targeting, the
  // interpreter, the resolver) advances THIS copy's bookmark in place (nextRandom mutates its
  // argument -- see rng.ts) without ever touching `state.rng`, the caller's own object. This is
  // what fixes B3: resolving the same frozen `state` twice always starts both calls' bookmarks
  // from the same `.position` and advances them identically, since neither call can see or
  // affect the other's clone.
  let working: CombatState = { ...state, rng: { position: state.rng.position } }

  // Fight-start (once, when round === 0): emit FightStarted, then fire on-fight-start.
  if (working.round === 0) {
    events.push({ type: 'FightStarted' })
    working = fireHook(
      'on-fight-start',
      livingIds(working),
      undefined,
      working,
      createResolutionContext(events, newCascade()),
    ).state
  }

  // Round boundary: the queue is exhausted (or this is the very first call).
  if (working.turnCursor >= working.turnQueue.length) {
    if (working.round > 0) {
      working = resolveRoundEndSweep(working, events)
      // Win/loss checked once, immediately after the full sweep completes -- a DoT can wipe a
      // side at round-end, and this must not wait for a subsequent (now-moot) creature turn.
      const sweepResult = checkWinLoss(working)
      if (sweepResult) return finalize(working, events, sweepResult)
    }

    const nextRound = working.round + 1

    // Round-cap gate, checked here (before starting a new round) rather than generically
    // after an action: this guarantees exactly ROUND_CAP full rounds complete, then a
    // clean draw -- not a round cut off after just one creature's turn.
    if (nextRound > ROUND_CAP) {
      return finalize(working, events, 'draw')
    }

    const queue = buildTurnQueue(working.playerParty, working.enemyParty)
    working = { ...working, turnQueue: queue, turnCursor: 0, round: nextRound }
    // No on-round-start hook in the v1 vocabulary; just emit RoundStarted.
    events.push({ type: 'RoundStarted', round: nextRound })
  }

  const creatureId = working.turnQueue[working.turnCursor]
  working = { ...working, turnCursor: working.turnCursor + 1 }

  if (creatureId === undefined) {
    // Type-required by noUncheckedIndexedAccess; logically unreachable -- a freshly-built
    // queue always has >=1 alive creature, since the round-cap gate above and the
    // win/loss check below together guarantee the fight already ended before a queue
    // with zero living creatures could ever be built here. Defensive finalize, not a
    // silent fallthrough.
    const result = checkWinLoss(working) ?? 'draw'
    return finalize(working, events, result)
  }

  const actor = getCreature(working, creatureId)

  // Turn body -- the TurnStarted/TurnEnded bracket is ALWAYS emitted for a dequeued slot;
  // only the action and the turn-start/turn-end hooks are gated on the actor being alive.
  // A dead-before-turn creature still gets an (empty) bracket -- that IS the skip signal,
  // per CONVENTIONS' "explicit boundary even for no-op turns". A dead creature must not
  // trigger start-of-turn effects, hence the hooks (not the events) are alive-gated.
  events.push({ type: 'TurnStarted', creatureId: actor.id })

  // Phase 4 Slice E2 (Web break-free): rolled at EVERY creature's turn-start, unconditional on
  // the ACTING creature's own aliveness (this is a global per-turn check against every current
  // Web-bearer on the board, not something scoped to `actor`) -- right after the TurnStarted
  // boundary, before the acting creature's own turn-start hooks.
  working = rollWebBreakFree(working, events)

  // Turn-start hooks fire on the acting creature (if it entered the turn alive), after the
  // TurnStarted boundary. A suppress-action response (Stun) skips the action entirely -- the
  // empty bracket IS the skip.
  let suppressed = false
  if (actor.alive) {
    const startResult = fireHook(
      'on-turn-start',
      [actor.id],
      undefined,
      working,
      createResolutionContext(events, newCascade()),
    )
    working = startResult.state
    suppressed = startResult.suppressed

    // Turn-start cleanup (Phase 4.1-C, D6): "until its next turn" expires HERE, right after
    // turn-start hooks, UNCONDITIONALLY on suppression -- runs on a Stunned/skipped turn too
    // (fixes B6: previously this lived inside the `!suppressed` decide+action gate below, so a
    // Stunned or Sleeping creature kept Defend/Provoke through its own skipped turn). Gated only
    // on the actor being alive AT THIS POINT (re-checked fresh -- a turn-start hook may have
    // killed it), matching the existing "re-resolve after turn-start hooks" discipline already
    // used for the decide+action gate below. Cleanup is bookkeeping only (CONVENTIONS' "Turn
    // structure": it ends things, never deals damage/heals/fires triggers), so moving it earlier
    // is safe with `is-provoking` deleted in this same PR -- decideAction no longer reads the
    // acting creature's own `defending`/`provoking` for anything (Defend's math reads the
    // TARGET's flag; Provoke's redirect reads the OPPOSING side's provoking members; neither is
    // `actor`'s own flag).
    const afterStartHooks = getCreature(working, actor.id)
    if (afterStartHooks.alive) {
      working = clearOwnTransientStatus(working, actor.id)
      if (afterStartHooks.defending || afterStartHooks.provoking) {
        events.push({
          type: 'ActionStateEnded',
          creatureId: actor.id,
          defending: afterStartHooks.defending,
          provoking: afterStartHooks.provoking,
        })
      }
    }
  }

  // Re-resolve after turn-start hooks/cleanup before acting.
  const actorAfterStart = getCreature(working, actor.id)
  if (actorAfterStart.alive && !suppressed) {
    const script = actor.scriptId ? (working.scripts.get(actor.scriptId) ?? null) : null
    const intent: Intent = decideAction(actorAfterStart, script, working)
    // Fresh cascade per top-level action: depth resets to 0, guard set starts empty.
    // `runAction` itself resolves the intent (target/gem draws) then executes -- a no-op if it
    // doesn't resolve to an action (defensive/unreachable once checkLegality has already
    // confirmed the intent legal, which decideAction always does before returning it).
    const ctx = createResolutionContext(events, newCascade())
    working = ctx.runAction(actorAfterStart.id, intent, working)
  }

  // Turn-end hooks (incl. DoT/HoT ticks) and the granted-actions step (bonus-cast) fire BEFORE
  // TurnEnded -- Phase 4.1-C, D6: TurnEnded is always the turn's last event (Phase 4 fired these
  // after it; fixed here). Gating stays exactly as it is today (alive-only) -- whether a skipped
  // (Stunned) turn should also refuse the granted cast is B2's own fix (Phase 4.1-C2b), out of
  // this slice's scope; C1 only reorders WHEN this step runs relative to TurnEnded, not WHETHER.
  if (getCreature(working, actor.id).alive) {
    working = fireHook(
      'on-turn-end',
      [actor.id],
      undefined,
      working,
      createResolutionContext(events, newCascade()),
    ).state
    // Phase 4 Slice F (Sorcerer starter): consulted directly, after the ordinary on-turn-end
    // hook -- see maybeFireBonusCast's own doc comment for why this isn't a hook response.
    working = maybeFireBonusCast(actor.id, working, events)
  }

  // TURN-END CLEANUP (CONVENTIONS' "Turn structure"): a seam, here, with no status work (D6
  // skeleton, ASSUMPTION 15/16) -- statuses still count down in the round-end sweep and the Web
  // roll stays at turn-start until Phase 4.1-F, which moves the bearer's own status-timer
  // countdown and the Web roll to this exact point.

  events.push({ type: 'TurnEnded', creatureId: actor.id })

  // Win/loss/draw is checked after EVERY action, not just round boundaries. This ordering
  // (the turn fully closes with TurnEnded before this check runs) is intentional: AOE's
  // multi-hit loop already fully resolves inside executeAction before this point, so a
  // killing blow mid-AOE never emits FightEnded before its own TurnEnded.
  const result = checkWinLoss(working)
  if (result) return finalize(working, events, result)

  return { state: working, events }
}

export function resolveFight(state: CombatState): {
  state: CombatState
  events: CombatEvent[]
} {
  let working = state
  const allEvents: CombatEvent[] = []

  while (working.result === null) {
    const step = resolveTurn(working)
    working = step.state
    allEvents.push(...step.events)
  }

  return { state: working, events: allEvents }
}
