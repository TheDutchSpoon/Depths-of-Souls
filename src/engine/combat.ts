import { createSeededRng } from './rng'
import { ROUND_CAP } from './config'
import { buildTurnQueue } from './turn-order'
import { getCreature, findCreature, updateCreature } from './creature-lookup'
import {
  instantiateTraitEffects,
  effectiveMaxHp,
  gatherExtraInstances,
  hasAnnihilate,
  hasSplashing,
} from './effects'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import {
  applyStatus,
  dealDamage,
  dealDamageWithOffStat,
  fireHook,
  newCascade,
} from './resolution'
import type { CascadeState } from './resolution'
import { decideAction } from './interpreter'
import {
  adjacentLivingTargets,
  getDefaultTarget,
  shouldRedirectAoeToAllies,
} from './targeting'
import type { CreatureId } from './ids'
import type { EffectInstanceId } from './effect-types'
import type {
  Action,
  CombatEvent,
  CombatState,
  Creature,
  FightResult,
  Spell,
} from './types'
import type { Script } from './scripting-types'
import type { StatusDef, StatusSpec, Trait } from './effect-types'

export function createCombat(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
  seed: number,
  scripts: ReadonlyMap<string, Script> = new Map(),
  traits: ReadonlyMap<string, Trait> = new Map(),
  statuses: ReadonlyMap<string, StatusDef> = new Map(),
): CombatState {
  if (playerParty.length === 0 || enemyParty.length === 0) {
    throw new Error('createCombat: both parties must have at least one creature')
  }

  // Fight-start: instantiate each creature's innate-trait effects onto activeEffects, then set
  // currentHp to effective max Health (so a +Health trait actually grants the HP). For a
  // trait-less creature this is a no-op: activeEffects is [] and effective max == base Health,
  // so currentHp is unchanged -- Phase 1/2 fixtures stay byte-identical.
  const instantiate = (creature: Creature): Creature => {
    const withEffects: Creature = {
      ...creature,
      activeEffects: instantiateTraitEffects(creature, traits),
    }
    return { ...withEffects, currentHp: effectiveMaxHp(withEffects) }
  }

  return {
    rng: createSeededRng(seed),
    playerParty: playerParty.map(instantiate),
    enemyParty: enemyParty.map(instantiate),
    turnQueue: [],
    turnCursor: 0,
    round: 0,
    result: null,
    scripts,
    statuses,
    traits,
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
  const firstSweepEventIndex = events.length
  const fired = fireHook(
    'on-round-end',
    livingIds(state),
    undefined,
    state,
    events,
    newCascade(),
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

// The damage formula + application + damage-path hook firing all live in resolution.ts now
// (dealDamage / applyDamageAndEmit). These executors just emit the intent event(s), fire the
// matching on-[action] hook, then delegate: "attack"/"cast" go through the exact same damage
// path a triggered deal-damage response does.

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
 * ASSUMPTION 31: every instance after the first targets the SAME resolved target as instance 1
 * (the selector is not re-run per instance) -- except when that target has since died, which
 * falls back to the normal default-target selection (matching the Brute starter's own wording).
 * Returns null once no living target remains (nothing further in the list can resolve).
 */
function resolveInstanceTarget(
  actor: Creature,
  previousTargetId: CreatureId | null,
  state: CombatState,
): CreatureId | null {
  if (previousTargetId) {
    const current = findCreature(state, previousTargetId)
    if (current?.alive) return previousTargetId
  }
  const enemyParty = actor.side === 'player' ? state.enemyParty : state.playerParty
  return getDefaultTarget(enemyParty)
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

function executeAttack(
  actor: Creature,
  targetId: CreatureId,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  let working = state
  let resolvedTargetId: CreatureId | null = targetId

  for (const powerPercent of buildInstanceList(actor, 'attack')) {
    resolvedTargetId = resolveInstanceTarget(actor, resolvedTargetId, working)
    if (!resolvedTargetId) break // no living target left for this or any further instance

    const thisTargetId = resolvedTargetId
    const splashIds = splashTargetIds(actor, thisTargetId, working)
    events.push({ type: 'AttackDeclared', attackerId: actor.id, targetId: thisTargetId })
    working = fireHook(
      'on-attack',
      [actor.id],
      thisTargetId,
      working,
      events,
      cascade,
    ).state
    working = dealDamage(
      actor.id,
      thisTargetId,
      'attack',
      powerPercent / 100,
      'attack',
      working,
      events,
      cascade,
    )
    // Splashing: recompute the SAME formula (own offStat/spellPower, each splash target's own
    // Defence/affinity/pools -- never a copy of the main hit's number, ASSUMPTION 15). No
    // TriggerFired -- it's the same action, not a triggered response. Re-checks aliveness in
    // case an earlier splash hit's own damage-path cascade (e.g. Retaliate) already killed a
    // later one.
    for (const splashId of splashIds) {
      if (!findCreature(working, splashId)?.alive) continue
      working = dealDamage(
        actor.id,
        splashId,
        'attack',
        powerPercent / 100,
        'attack',
        working,
        events,
        cascade,
      )
    }
  }
  return working
}

/**
 * Phase 4 Slice B: Spell.scalingStat resolution. Absent -> the pre-Slice-B remap-aware
 * Intelligence lookup (byte-identical to every existing spell, since getOffensiveStat's Cast
 * default IS Intelligence already). An explicit Stat reads it DIRECTLY via getEffectiveStat (no
 * stat-remap resolution), mirroring deal-damage's scalingStat. 'none' = flat/Int-independent:
 * offStat 0 (always chip-floor-only through the same formula -- not exercised by any v1
 * damage-dealing content).
 */
function resolveSpellOffStat(
  caster: Creature,
  spell: Spell,
  powerFraction: number,
): number {
  const spellPower = spell.spellPower * powerFraction
  if (spell.scalingStat === undefined) return getOffensiveStat(caster, 'cast', spellPower)
  if (spell.scalingStat === 'none') return 0
  return getEffectiveStat(caster, spell.scalingStat) * spellPower
}

function executeCastSingle(
  actor: Creature,
  gemSlot: number,
  targetId: CreatureId,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  const spell = actor.equippedSpells[gemSlot]
  if (!spell)
    throw new Error('resolver invariant violated: cast referencing an empty gem slot')

  let working = state
  let resolvedTargetId: CreatureId | null = targetId

  for (const powerPercent of buildInstanceList(actor, 'cast')) {
    resolvedTargetId = resolveInstanceTarget(actor, resolvedTargetId, working)
    if (!resolvedTargetId) break

    const thisTargetId = resolvedTargetId
    events.push({
      type: 'SpellCast',
      targetShape: 'single',
      casterId: actor.id,
      gemSlot,
      targetId: thisTargetId,
    })
    working = fireHook(
      'on-cast',
      [actor.id],
      thisTargetId,
      working,
      events,
      cascade,
    ).state
    // Splashing is an attacks-only mechanic (brute.md: "attacks deal 100% of their damage to
    // enemies adjacent to the target"; CONVENTIONS' "Splashing / Annihilate" bullet) -- Cast
    // never splashes, so there is no splash loop here (contrast executeAttack below).
    const offStat = resolveSpellOffStat(actor, spell, powerPercent / 100)
    working = dealDamageWithOffStat(
      actor.id,
      thisTargetId,
      offStat,
      'cast',
      'cast',
      working,
      events,
      cascade,
    )
    if (spell.appliesStatus) {
      working = applyStatusIfAlive(
        actor.id,
        thisTargetId,
        spell.appliesStatus,
        working,
        events,
        cascade,
      )
    }
  }
  return working
}

/** Never applies a status to a corpse -- a cast's damage may have killed the target. */
function applyStatusIfAlive(
  sourceId: CreatureId,
  targetId: CreatureId,
  spec: StatusSpec,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  const target = getCreature(state, targetId)
  if (!target.alive) return state
  return applyStatus(sourceId, targetId, spec, state, events, cascade)
}

function executeCastAoe(
  actor: Creature,
  gemSlot: number,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  const spell = actor.equippedSpells[gemSlot]
  if (!spell)
    throw new Error('resolver invariant violated: cast referencing an empty gem slot')

  let working = state

  for (const powerPercent of buildInstanceList(actor, 'cast')) {
    // Confusion (ASSUMPTION 13): one roll, per instance, decides whether this WHOLE AOE
    // instance retargets to the caster's own living side instead of the enemy side -- never
    // a per-target coin flip. Provoke is exempt for AOE regardless (unchanged).
    const redirectToAllies = shouldRedirectAoeToAllies(actor, working)
    const opposingSide = actor.side === 'player' ? 'enemy' : 'player'
    const targetSide = redirectToAllies ? actor.side : opposingSide
    const targetParty = targetSide === 'player' ? working.playerParty : working.enemyParty
    // Frozen target list: all living members of the resolved side, slot order -- each AOE
    // instance independently re-freezes its OWN set at that instance's cast-start (no single
    // target to preserve across instances, unlike the single-target case above).
    const targetIds = targetParty.filter((c) => c.alive).map((c) => c.id)
    events.push({
      type: 'SpellCast',
      targetShape: 'aoe',
      casterId: actor.id,
      gemSlot,
      targetIds,
    })
    // AOE has no single target to name as the hook's `source` -- self only.
    working = fireHook('on-cast', [actor.id], undefined, working, events, cascade).state

    for (const targetId of targetIds) {
      // Skip a frozen-list target that's no longer alive by the time its hit lands (a prior
      // hit's on-death/reflect cascade may have killed it). The frozen target *set* is
      // unchanged; this only skips *hitting* an already-dead member.
      const target = getCreature(working, targetId)
      if (!target.alive) continue
      working = dealDamageWithOffStat(
        actor.id,
        targetId,
        resolveSpellOffStat(actor, spell, powerPercent / 100),
        'cast',
        'cast',
        working,
        events,
        cascade,
      )
      if (spell.appliesStatus) {
        working = applyStatusIfAlive(
          actor.id,
          targetId,
          spell.appliesStatus,
          working,
          events,
          cascade,
        )
      }
    }
  }

  return working
}

function executeDefend(
  actor: Creature,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  events.push({ type: 'Defended', creatureId: actor.id })
  const working = fireHook(
    'on-defend',
    [actor.id],
    undefined,
    state,
    events,
    cascade,
  ).state
  return updateCreature(working, actor.id, { defending: true })
}

function executeProvoke(
  actor: Creature,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  events.push({ type: 'Provoked', creatureId: actor.id })
  const working = fireHook(
    'on-provoke',
    [actor.id],
    undefined,
    state,
    events,
    cascade,
  ).state
  return updateCreature(working, actor.id, { provoking: true })
}

function executeWait(
  actor: Creature,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  events.push({ type: 'Waited', creatureId: actor.id })
  return state
}

function executeAction(
  actor: Creature,
  action: Action,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  switch (action.kind) {
    case 'attack':
      return executeAttack(actor, action.targetId, state, events, cascade)
    case 'cast':
      switch (action.targetShape) {
        case 'single':
          return executeCastSingle(
            actor,
            action.gemSlot,
            action.targetId,
            state,
            events,
            cascade,
          )
        case 'aoe':
          return executeCastAoe(actor, action.gemSlot, state, events, cascade)
        default: {
          const exhaustive: never = action
          throw new Error(`Unhandled cast shape: ${String(exhaustive)}`)
        }
      }
    case 'defend':
      return executeDefend(actor, state, events, cascade)
    case 'provoke':
      return executeProvoke(actor, state, events, cascade)
    case 'wait':
      return executeWait(actor, state, events)
    default: {
      const exhaustive: never = action
      throw new Error(`Unhandled action kind: ${String(exhaustive)}`)
    }
  }
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
  let working = state

  // Fight-start (once, when round === 0): emit FightStarted, then fire on-fight-start.
  if (working.round === 0) {
    events.push({ type: 'FightStarted' })
    working = fireHook(
      'on-fight-start',
      livingIds(working),
      undefined,
      working,
      events,
      newCascade(),
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
      events,
      newCascade(),
    )
    working = startResult.state
    suppressed = startResult.suppressed
  }

  // Re-resolve after turn-start hooks (which may have changed HP/alive) before acting.
  const actorAfterStart = getCreature(working, actor.id)
  if (actorAfterStart.alive && !suppressed) {
    const script = actor.scriptId ? (working.scripts.get(actor.scriptId) ?? null) : null
    // decideAction sees the actor's defending/provoking status as it stood ENTERING this turn
    // (Provoke's override is resolved inside decideAction; no post-hoc override step here).
    const action = decideAction(actorAfterStart, script, working)

    // "Until its next turn" expires here, before this turn's action executes -- a fresh
    // Defend/Provoke below re-applies for the next cycle; anything else leaves it lapsed.
    working = clearOwnTransientStatus(working, actor.id)
    const freshActor = getCreature(working, actor.id)

    if (action) {
      // Fresh cascade per top-level action: depth resets to 0, guard set starts empty.
      working = executeAction(freshActor, action, working, events, newCascade())
    }
  }

  events.push({ type: 'TurnEnded', creatureId: actor.id })
  if (getCreature(working, actor.id).alive) {
    working = fireHook(
      'on-turn-end',
      [actor.id],
      undefined,
      working,
      events,
      newCascade(),
    ).state
  }

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
