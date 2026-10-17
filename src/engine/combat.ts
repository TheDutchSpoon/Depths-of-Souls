import { createRngState, nextRandom } from './rng'
import { PARTY_SIZE, ROUND_CAP } from './config'
import { buildTurnQueue, turnOrderIdsOf } from './turn-order'
import { getCreature, updateCreature } from './creature-lookup'
import {
  resolveBaselineEffects,
  instantiateEffectDefs,
  effectiveMaxHp,
  firstAllLock,
  flatEffects,
} from './effects'
import { fireHook, newCascade } from './resolution'
import { createResolutionContext, drainGrantedActions } from './actions'
import { decideAction } from './interpreter'
import type { CreatureId } from './ids'
import { validateEffectList, validateStatusDef, validateTrait } from './effect-types'
import type { ActiveEffect, EffectDef, InnateSpellEffect } from './effect-types'
import type { CombatEvent, CombatState, Creature, FightResult } from './types'
import type { Intent, Script } from './scripting-types'
import type { StatusDef, Trait } from './effect-types'

/** One side's fight-setup input -- its party and its side-wide effects (perks
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
 * Named per-side inputs -- two same-typed positional lists (player effects,
 * enemy effects) could be silently swapped; `{ player: { party, effects }, enemy: { party,
 * effects }, registries }` can't. `registries` bundles scripts/traits/statuses, each defaulting
 * to an empty Map.
 *
 * Fight setup takes FRESH input and throws on anything else (`spec/combat.md#fight-setup`):
 * - a creature whose `scriptId` is not null and not in the script registry (an omitted registry is
 *   empty);
 * - a creature that already carries setup or fight output: non-empty `baselineEffects` or
 *   `activeEffects` (re-feeding one would double its innate spell slots, since this function
 *   prepends every `innate-spell` effect's spell onto `equippedSpells`), `alive: false`,
 *   `defending`, `provoking`, a non-zero `defendCount` or `revivesUsed`. `currentHp` is not
 *   checked: it is set here, to the effective max Health. A test that needs a wounded or dead
 *   creature sets that on the returned state;
 * - a side whose slots are not unique integers within 0..PARTY_SIZE-1 in ascending array order, so
 *   array order IS slot order for every reader; two creatures with one id across both sides;
 * - a creature whose own `side` doesn't match the list it was passed in (`player.party` vs
 *   `enemy.party`): each side's `effects` apply to exactly that side's creatures;
 * - a side effect, trait or status that breaks a load-time rule (`validateEffectList`).
 *
 * It RECOMPUTES `baselineEffects` from each creature's own `innateTraitIds` (+ its own side's
 * effects).
 */
export function createCombat(input: CreateCombatInput): CombatState {
  const { seed, player, enemy, registries = {} } = input
  const { scripts = new Map(), traits = new Map(), statuses = new Map() } = registries
  const playerEffects = player.effects ?? []
  const enemyEffects = enemy.effects ?? []

  // The status registry this fight is given is validated here as
  // well as at data import, so an inline status carrying a forbidden effect (e.g. an
  // `on-round-end` trigger -- round end has no status work) fails at fight setup.
  for (const def of statuses.values()) validateStatusDef(def)

  // The trait registry is held to the same rules as a shipped trait: an inline trait that breaks
  // one fails at fight setup, whether or not a creature carries it.
  for (const trait of traits.values()) validateTrait(trait)

  // The side effects (a perk resolved at the level bought, a biome effect) are held to the rules a
  // trait is, whether or not a creature carries them.
  validateEffectList(playerEffects, 'player effect', 'permanent')
  validateEffectList(enemyEffects, 'enemy effect', 'permanent')

  if (player.party.length === 0 || enemy.party.length === 0) {
    throw new Error('createCombat: both parties must have at least one creature')
  }

  validateScriptIds(player.party, enemy.party, scripts)
  validateSlots('player', player.party)
  validateSlots('enemy', enemy.party)
  validateUniqueIds(player.party, enemy.party)

  // Fight-start: resolve + instantiate each creature's innate-trait (+ this side's own effects)
  // effects onto activeEffects (fresh ids from the shared per-fight counter, threaded across
  // BOTH parties, player then enemy, slot order), prepend any innate spells onto equippedSpells,
  // then set currentHp to effective max Health (so a +Health trait/perk actually grants the HP).
  // For a trait-less, effect-less creature this is a no-op: activeEffects is [] and effective max
  // == base Health, so currentHp is unchanged.
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
    const stale: string[] = []
    if (creature.baselineEffects.length > 0) stale.push('baselineEffects')
    if (creature.activeEffects.length > 0) stale.push('activeEffects')
    if (!creature.alive) stale.push('alive: false')
    if (creature.defending) stale.push('defending')
    if (creature.provoking) stale.push('provoking')
    if (creature.defendCount !== 0) stale.push('defendCount')
    if (creature.revivesUsed !== 0) stale.push('revivesUsed')
    if (stale.length > 0) {
      const innateReason =
        stale.includes('baselineEffects') || stale.includes('activeEffects')
          ? ', or innate spells would double'
          : ''
      throw new Error(
        `createCombat: creature "${creature.id}" already carries fight-setup output (${stale.join(', ')}) -- fight setup takes fresh creatures only${innateReason}`,
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
    turnClock: 0,
  }
}

/** Every creature's `scriptId` is `null` (the fallback) or names a script the fight is given. */
function validateScriptIds(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
  scripts: ReadonlyMap<string, Script>,
): void {
  for (const creature of [...playerParty, ...enemyParty]) {
    if (creature.scriptId !== null && !scripts.has(creature.scriptId)) {
      throw new Error(
        `createCombat: creature "${creature.id}" names script "${creature.scriptId}", which is not in the script registry`,
      )
    }
  }
}

/** One side's slots: integers within 0..PARTY_SIZE-1, each above the one before it in array order
 * (so unique too). Not contiguous: a gap is a legal party. Array order is slot order from here on,
 * for every helper that walks a party. */
function validateSlots(side: 'player' | 'enemy', party: readonly Creature[]): void {
  let previous = -1
  for (const creature of party) {
    const { slot } = creature
    if (!Number.isInteger(slot) || slot < 0 || slot >= PARTY_SIZE) {
      throw new Error(
        `createCombat: creature "${creature.id}" has slot ${slot}, outside 0..${PARTY_SIZE - 1} (${side}.party)`,
      )
    }
    if (slot === previous) {
      throw new Error(
        `createCombat: creature "${creature.id}" shares slot ${slot} with another creature in ${side}.party`,
      )
    }
    if (slot < previous) {
      throw new Error(
        `createCombat: creature "${creature.id}" (slot ${slot}) is out of slot order in ${side}.party`,
      )
    }
    previous = slot
  }
}

/** No two creatures share an id, within a side or across both. */
function validateUniqueIds(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
): void {
  const seen = new Set<string>()
  for (const creature of [...playerParty, ...enemyParty]) {
    if (seen.has(creature.id)) {
      throw new Error(`createCombat: two creatures share the id "${creature.id}"`)
    }
    seen.add(creature.id)
  }
}

/** The literal expiry point of Defend/Provoke's "until its next turn." */
function clearOwnTransientStatus(state: CombatState, id: CreatureId): CombatState {
  return updateCreature(state, id, { defending: false, provoking: false })
}

/** Born this turn: applied or refreshed since this turn's action
 * slot. The one test behind the tick gate, the countdown and the Web roll. */
function isBornThisTurn(state: CombatState, effect: ActiveEffect): boolean {
  return effect.category === 'status' && effect.appliedAt === state.turnClock
}

/**
 * Turn-end cleanup, part 1 (`spec/statuses.md#turn-end-cleanup`): the BEARER's own
 * statuses count down by one and expire at 0 (`StatusExpired`), in canonical (activeEffects)
 * order. Bookkeeping only. Skips a status born this turn. Only ever called for a LIVING bearer: a
 * corpse's statuses are inert (no countdown, no StatusExpired).
 */
function countDownStatuses(
  state: CombatState,
  bearerId: CreatureId,
  events: CombatEvent[],
): CombatState {
  const bearer = getCreature(state, bearerId)
  const next: ActiveEffect[] = []
  for (const effect of bearer.activeEffects) {
    if (effect.category !== 'status' || isBornThisTurn(state, effect)) {
      next.push(effect)
      continue
    }
    const remainingDuration = effect.remainingDuration - 1
    if (remainingDuration > 0) {
      next.push({ ...effect, remainingDuration })
    } else {
      events.push({
        type: 'StatusExpired',
        creatureId: bearerId,
        statusId: effect.statusId,
      })
    }
  }
  return updateCreature(state, bearerId, { activeEffects: next })
}

/**
 * Turn-end cleanup, part 2 -- Web break-free: rolled once per turn (every living creature's turn;
 * a dead creature's slot has no turn), AFTER the actor's own countdown, against every LIVING
 * bearer of an active status-borne `turn-order` effect carrying breakChancePercent (read through
 * the effect iterator: an immune bearer's Web has no effects, so it draws nothing), skipping a
 * Web born this turn. A board with no such Web draws nothing (only-when-present discipline).
 * Bearers are iterated in turn order, taken once when the cleanup starts (a bearer that breaks
 * free doesn't reorder the rolls after it), and each bearer's effect list is taken once too
 * (`spec/statuses.md#turn-order`), so the draw sequence is deterministic. Only the removal reads
 * the bearer fresh, so a second break on one bearer removes its own status and restores nothing
 * the first removed. On success the status instance is removed and StatusExpired emitted; the
 * frozen current-round turnQueue is untouched (breaking free only changes NEXT round's
 * buildTurnQueue).
 */
function rollWebBreakFree(state: CombatState, events: CombatEvent[]): CombatState {
  const bearerIds = turnOrderIdsOf(state)

  let working = state
  for (const bearerId of bearerIds) {
    const current = getCreature(working, bearerId)
    for (const effect of flatEffects(current)) {
      if (effect.category !== 'turn-order') continue
      if (effect.breakChancePercent === undefined) continue
      // Status-only (validateNoBreakChanceOutsideStatus): the roll removes the status instance.
      if (effect.sourceInstanceId === undefined || effect.statusId === undefined) continue
      const statusInstanceId = effect.sourceInstanceId
      const instance = current.activeEffects.find(
        (e) => e.instanceId === statusInstanceId,
      )
      if (instance && isBornThisTurn(working, instance)) continue
      if (nextRandom(working.rng) < effect.breakChancePercent / 100) {
        working = updateCreature(working, bearerId, {
          activeEffects: getCreature(working, bearerId).activeEffects.filter(
            (e) => e.instanceId !== statusInstanceId,
          ),
        })
        events.push({
          type: 'StatusExpired',
          creatureId: bearerId,
          statusId: effect.statusId,
        })
      }
    }
  }
  return working
}

function checkWinLoss(state: CombatState): FightResult | null {
  const playerAlive = state.playerParty.some((c) => c.alive)
  const enemyAlive = state.enemyParty.some((c) => c.alive)
  if (!playerAlive && !enemyAlive) return 'draw'
  if (!enemyAlive) return 'win'
  if (!playerAlive) return 'loss'
  return null
}

/** The "the fight is over" predicate every in-fight hook pass and grant drain stops on. */
const fightOver = (state: CombatState): boolean => checkWinLoss(state) !== null

/**
 * Round end: only the `on-round-end` trait triggers and the
 * round-level grant drain. NO status work -- ticks and the countdown live in the bearer's own turn
 * (statuses may not carry `on-round-end`, validateStatusDef). Both stop on a wipe.
 */
function resolveRoundEnd(state: CombatState, events: CombatEvent[]): CombatState {
  const roundEndCtx = createResolutionContext(events, newCascade())
  const hooked = fireHook(
    'on-round-end',
    turnOrderIdsOf(state),
    undefined,
    state,
    roundEndCtx,
    {
      stopWhen: fightOver,
    },
  ).state
  // round-level grants run right after the hook pass (no shipped content raises one).
  return drainGrantedActions(roundEndCtx, hooked, { stopWhen: fightOver })
}

// The action executors (attack/cast/defend/provoke/wait) live in actions.ts; combat.ts only
// orchestrates the turn skeleton, dispatching every action through actions.ts's `runAction`. Every
// `ResolutionContext` built below is drained exactly once, at the end of its own scope, by
// `drainGrantedActions`.

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
  // A finished fight has no next turn; reading only `result` keeps the check ahead of every
  // other step, so a finished state never reaches the dequeue loop.
  if (state.result !== null) {
    throw new Error('resolveTurn: the fight already has a result')
  }

  const events: CombatEvent[] = []
  // "the per-turn working copy resolveTurn makes when it starts" --
  // clones `rng` into a FRESH object so every draw this turn (directly here, or by any pure
  // helper this call tree hands `working`/its descendants to -- target selectors, targeting, the
  // interpreter, the resolver) advances THIS copy's bookmark in place (nextRandom mutates its
  // argument -- see rng.ts) without ever touching `state.rng`, the caller's own object. This is
  // what makes resolving the same frozen `state` twice always start both calls' bookmarks
  // from the same `.position` and advance them identically, since neither call can see or
  // affect the other's clone.
  let working: CombatState = { ...state, rng: { position: state.rng.position } }

  // Fight-start (once, when round === 0): emit FightStarted, then fire on-fight-start. Like every
  // other in-fight pass, the hook pass and its drain stop at a wipe, and win/loss is checked right
  // after both, BEFORE RoundStarted -- a fight-start wipe
  // ends the fight as FightStarted ... FightEnded, with no round and no turn.
  if (working.round === 0) {
    events.push({ type: 'FightStarted' })
    const fightStartCtx = createResolutionContext(events, newCascade())
    working = fireHook(
      'on-fight-start',
      turnOrderIdsOf(working),
      undefined,
      working,
      fightStartCtx,
      { stopWhen: fightOver },
    ).state
    // round-level grants
    working = drainGrantedActions(fightStartCtx, working, { stopWhen: fightOver })
    const fightStartResult = checkWinLoss(working)
    if (fightStartResult) return finalize(working, events, fightStartResult)
  }

  // Dequeue: one call is one turn. A dead creature's slot is skipped outright (no bracket, no
  // turn-clock bump, no Web roll) and the loop moves on to the next entry, crossing the round
  // boundary in this same call when the dead entries end the round. The frozen queue keeps its
  // dead entries (`acted-before-target` reads queue positions): only the cursor advances.
  let actor: Creature
  for (;;) {
    const creatureId = working.turnQueue[working.turnCursor]

    if (creatureId === undefined) {
      // Round boundary: the queue is exhausted (or this is the very first call).
      if (working.round > 0) {
        working = resolveRoundEnd(working, events)
        // Win/loss is checked right after the round-end pass: an on-round-end trigger can wipe a
        // side, and this must not wait for a subsequent (now-moot) creature turn.
        const roundEndResult = checkWinLoss(working)
        if (roundEndResult) return finalize(working, events, roundEndResult)
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

      if (queue.length === 0) {
        // Logically unreachable -- the win/loss check above guarantees a living creature on
        // each side, so a freshly-built queue is never empty. Defensive finalize: without it an
        // empty queue would cross the boundary again and again.
        return finalize(working, events, checkWinLoss(working) ?? 'draw')
      }
      continue
    }

    working = { ...working, turnCursor: working.turnCursor + 1 }
    const dequeued = getCreature(working, creatureId)
    if (dequeued.alive) {
      actor = dequeued
      break
    }
  }

  // Turn body -- the actor was alive when dequeued. It can still die mid-turn, so the alive
  // re-checks below read fresh state; the Web roll at cleanup runs regardless, because the
  // turn happened.
  events.push({ type: 'TurnStarted', creatureId: actor.id })

  // A wipe ends the turn at once. After every top-level step (the
  // action, each granted action, each firing of a turn-start / turn-end hook pass -- never inside
  // a cascade) the fight-over predicate is checked; a wipe skips the rest of the turn (later
  // firings, grants, cleanup, the Web roll) but still closes the bracket with TurnEnded, then
  // FightEnded. The hook passes and drains stop themselves through `fightOver`; this helper is
  // the check after each whole step.
  const closeIfWiped = (): { state: CombatState; events: CombatEvent[] } | null => {
    const result = checkWinLoss(working)
    if (!result) return null
    events.push({ type: 'TurnEnded', creatureId: actor.id })
    return finalize(working, events, result)
  }

  // Turn-start hooks fire on the acting creature, after the TurnStarted boundary. The skip
  // (`spec/statuses.md#action-locks`): a turn is skipped if an 'all' action-lock is active right
  // after the turn-start hook pass (read 1, below -- the turn-start grants need it) or at the
  // action slot (read 2). `skipped` is the first read's carrier id, if any; the combined value
  // (`skipEffectId`) is fixed at the action slot.
  const turnStartCtx = createResolutionContext(events, newCascade())
  const startResult = fireHook(
    'on-turn-start',
    [actor.id],
    undefined,
    working,
    turnStartCtx,
    {
      stopWhen: fightOver,
    },
  )
  working = startResult.state
  const wiped = closeIfWiped()
  if (wiped) return wiped
  // Read 1: live state after the hooks (a lock gained during them skips this very turn).
  const afterHooks = getCreature(working, actor.id)
  const skipped: string | undefined = afterHooks.alive
    ? firstAllLock(afterHooks)?.effectId
    : undefined

  // Turn-start cleanup: "until its next turn" expires HERE, right after
  // turn-start hooks, UNCONDITIONALLY on a skip -- runs on a Stunned/skipped turn too.
  // Gated only on the actor being alive AT THIS POINT (re-checked fresh -- a
  // turn-start hook may have killed it). Cleanup is bookkeeping only (`spec/combat.md#turn-structure`: it ends
  // things, never deals damage/heals/fires triggers).
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

  // Turn-start grants run AFTER the turn-start cleanup -- a Defend/Provoke granted
  // here must not be ended by this same turn's cleanup -- and before decide + action. A skipped
  // turn refuses them (`spec/combat.md#every-action-source-obeys-the-same-rules`: `skippedTurnOf`).
  working = drainGrantedActions(turnStartCtx, working, {
    skippedTurnOf: skipped !== undefined ? actor.id : undefined,
    stopWhen: fightOver,
  })
  const wipedAfterGrants = closeIfWiped()
  if (wipedAfterGrants) return wipedAfterGrants

  // THE ACTION SLOT: the born-this-turn clock bumps once per
  // living actor's turn, here, whether or not it is skipped. A status applied or
  // refreshed from now on is born this turn (no tick, no countdown, no Web roll); one applied
  // earlier in the turn (turn-start hooks / grants) is not.
  working = { ...working, turnClock: working.turnClock + 1 }

  // Re-resolve after turn-start hooks/cleanup/grants before acting. Read 2, at the action slot: a
  // lock gained during the turn-start grants would otherwise reach the decide step, where every
  // rule is illegal under an 'all' lock. Either read skips the turn; the slot's own read names it
  // when present (canonical effect order, fresh state).
  const actorAfterStart = getCreature(working, actor.id)
  const skipEffectId = actorAfterStart.alive
    ? (firstAllLock(actorAfterStart)?.effectId ?? skipped)
    : undefined
  if (actorAfterStart.alive && skipEffectId !== undefined) {
    // The skipped turn fills the action slot: no decide, no action, no action grants.
    events.push({ type: 'TurnSkipped', creatureId: actor.id, effectId: skipEffectId })
  } else if (actorAfterStart.alive) {
    const script = actor.scriptId ? (working.scripts.get(actor.scriptId) ?? null) : null
    const intent: Intent = decideAction(actorAfterStart, script, working)
    // Fresh cascade per top-level action: depth resets to 0, guard set starts empty.
    // `runAction` itself resolves the intent (target/gem draws) then executes -- a no-op if it
    // doesn't resolve to an action (defensive/unreachable once checkLegality has already
    // confirmed the intent legal, which decideAction always does before returning it).
    const ctx = createResolutionContext(events, newCascade())
    working = ctx.runAction(actorAfterStart.id, intent, working)
    // The action's grants (an echo of its cast, ...) run right after it, before the turn-end
    // hooks. Not a skipped turn (the branch above took it), so no gate. The drain
    // checks `fightOver` before each grant, so a wipe by the action itself drops them all.
    working = drainGrantedActions(ctx, working, { stopWhen: fightOver })
    // The check after the action and its grants. The turn-end block below is alive-gated, so
    // without this a wipe that also killed the ACTOR (a lethal reaction to its own attack) would
    // skip every later check and the turn would close with no result.
    const wipedByAction = closeIfWiped()
    if (wipedByAction) return wipedByAction
  }

  // Turn-end hooks (incl. DoT/HoT ticks) and the granted-actions step fire BEFORE TurnEnded --
  // TurnEnded is always the turn's last event. The hook pass is alive-gated; the
  // granted step runs the grants those hooks raised (Arcane Surge's roll happened in the hook
  // pass), refusing on a skipped turn (either lock read: the chance was rolled first) and,
  // through runAction's checks, on a dead actor or any lock active at that point
  // (`spec/combat.md#every-action-source-obeys-the-same-rules`).
  // A status born this turn doesn't tick (passed through FireHookOptions).
  if (getCreature(working, actor.id).alive) {
    const turnEndCtx = createResolutionContext(events, newCascade())
    working = fireHook('on-turn-end', [actor.id], undefined, working, turnEndCtx, {
      stopWhen: fightOver,
      skipStatusTrigger: (bearer, statusInstanceId) => {
        const instance = bearer.activeEffects.find(
          (e) => e.instanceId === statusInstanceId,
        )
        return instance !== undefined && isBornThisTurn(working, instance)
      },
    }).state
    // As after the action: the drain's own `fightOver` check drops every grant when a firing in
    // the hook pass wiped a side, and the check below closes the turn (no cleanup).
    working = drainGrantedActions(turnEndCtx, working, {
      skippedTurnOf: skipEffectId !== undefined ? actor.id : undefined,
      stopWhen: fightOver,
    })
    const wipedByTurnEndGrants = closeIfWiped()
    if (wipedByTurnEndGrants) return wipedByTurnEndGrants
  }

  // TURN-END CLEANUP (`spec/combat.md#turn-structure`): bookkeeping only. The bearer's own
  // statuses count down (a LIVING actor only -- a corpse's statuses are inert),
  // then the Web roll runs for every turn (the actor entered it alive, even if it died in it).
  if (getCreature(working, actor.id).alive) {
    working = countDownStatuses(working, actor.id, events)
  }
  working = rollWebBreakFree(working, events)

  events.push({ type: 'TurnEnded', creatureId: actor.id })

  // No win check here: every step above that can kill was checked right after it, and cleanup
  // cannot kill.
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
