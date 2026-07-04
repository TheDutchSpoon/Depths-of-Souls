import { createSeededRng } from './rng'
import { ROUND_CAP } from './config'
import { buildTurnQueue } from './turn-order'
import { getCreature, updateCreature } from './creature-lookup'
import { instantiateTraitEffects, effectiveMaxHp } from './effects'
import { dealDamage, fireHook, newCascade } from './resolution'
import type { CascadeState } from './resolution'
import { decideAction } from './interpreter'
import type { CreatureId } from './ids'
import type { Action, CombatEvent, CombatState, Creature, FightResult } from './types'
import type { Script } from './scripting-types'
import type { Trait } from './effect-types'

export function createCombat(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
  seed: number,
  scripts: ReadonlyMap<string, Script> = new Map(),
  traits: ReadonlyMap<string, Trait> = new Map(),
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

// The damage formula + application + damage-path hook firing all live in resolution.ts now
// (dealDamage / applyDamageAndEmit). These executors just emit the intent event, then delegate:
// "attack"/"cast" go through the exact same damage path a triggered deal-damage response does.

function executeAttack(
  actor: Creature,
  targetId: CreatureId,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  events.push({ type: 'AttackDeclared', attackerId: actor.id, targetId })
  return dealDamage(actor.id, targetId, 'attack', 1.0, 'attack', state, events, cascade)
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

  events.push({
    type: 'SpellCast',
    targetShape: 'single',
    casterId: actor.id,
    gemSlot,
    targetId,
  })
  return dealDamage(
    actor.id,
    targetId,
    'cast',
    spell.spellPower,
    'cast',
    state,
    events,
    cascade,
  )
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

  const opposingParty = actor.side === 'player' ? state.enemyParty : state.playerParty
  // Frozen target list: all living enemies, slot order, evaluated ONCE, right here.
  const targetIds = opposingParty.filter((c) => c.alive).map((c) => c.id)
  events.push({
    type: 'SpellCast',
    targetShape: 'aoe',
    casterId: actor.id,
    gemSlot,
    targetIds,
  })

  let working = state
  for (const targetId of targetIds) {
    // Skip a frozen-list target that's no longer alive by the time its hit lands (a prior
    // hit's on-death/reflect cascade may have killed it). The frozen target *set* is
    // unchanged; this only skips *hitting* an already-dead member.
    const target = getCreature(working, targetId)
    if (!target.alive) continue
    working = dealDamage(
      actor.id,
      targetId,
      'cast',
      spell.spellPower,
      'cast',
      working,
      events,
      cascade,
    )
  }

  return working
}

function executeDefend(
  actor: Creature,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  events.push({ type: 'Defended', creatureId: actor.id })
  return updateCreature(state, actor.id, { defending: true })
}

function executeProvoke(
  actor: Creature,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  events.push({ type: 'Provoked', creatureId: actor.id })
  return updateCreature(state, actor.id, { provoking: true })
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
      return executeDefend(actor, state, events)
    case 'provoke':
      return executeProvoke(actor, state, events)
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
      // Round-end hooks fire across all living creatures in tie-break order. (Slice C expands
      // this into the full snapshot -> tick -> decrement -> expire sweep with its own win-check.)
      working = fireHook(
        'on-round-end',
        livingIds(working),
        undefined,
        working,
        events,
        newCascade(),
      ).state
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
