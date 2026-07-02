import { createSeededRng } from './rng'
import { ROUND_CAP } from './config'
import { buildTurnQueue } from './turn-order'
import { getDefaultTarget } from './targeting'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import { calculateDamage } from './damage'
import { firePhaseHook } from './phase-hooks'
import type { CreatureId } from './ids'
import type { Action, CombatEvent, CombatState, Creature, FightResult } from './types'

export function createCombat(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
  seed: number,
): CombatState {
  if (playerParty.length === 0 || enemyParty.length === 0) {
    throw new Error('createCombat: both parties must have at least one creature')
  }

  return {
    rng: createSeededRng(seed),
    playerParty: [...playerParty],
    enemyParty: [...enemyParty],
    turnQueue: [],
    turnCursor: 0,
    round: 0,
    result: null,
  }
}

function getCreature(state: CombatState, id: CreatureId): Creature {
  const creature = [...state.playerParty, ...state.enemyParty].find((c) => c.id === id)
  if (!creature) throw new Error(`resolver invariant violated: unknown creature id ${id}`)
  return creature
}

function updateCreature(
  state: CombatState,
  id: CreatureId,
  patch: Partial<Pick<Creature, 'currentHp' | 'alive'>>,
): CombatState {
  const updateSide = (party: readonly Creature[]) =>
    party.map((c) => (c.id === id ? { ...c, ...patch } : c))
  return {
    ...state,
    playerParty: updateSide(state.playerParty),
    enemyParty: updateSide(state.enemyParty),
  }
}

function decideAction(actor: Creature, state: CombatState): Action | null {
  // Phase 1: no scripting yet -- this IS the implicit fallback. Always Attack the
  // default target. Returns null only in the structurally-unreachable empty-enemy case.
  const enemyParty = actor.side === 'player' ? state.enemyParty : state.playerParty
  const targetId = getDefaultTarget(enemyParty)
  return targetId ? { kind: 'attack', targetId } : null
}

function executeAttack(
  actor: Creature,
  targetId: CreatureId,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  events.push({ type: 'AttackDeclared', attackerId: actor.id, targetId })

  const target = getCreature(state, targetId)
  const offStat = getOffensiveStat(actor, 'attack')
  const defence = getEffectiveStat(target, 'defence')

  const damage = calculateDamage({
    offStat,
    defence,
    attackerAffinity: actor.affinity,
    defenderAffinity: target.affinity,
    dealtMods: [], // Phase 1: always empty; wired for Phase 3 damage-modifier effects
    takenFactors: [], // Phase 1: always empty
  })

  const newHp = Math.max(target.currentHp - damage.finalDamage, 0)
  const died = newHp === 0 && target.alive

  // State threading: `nextState` is the only source of truth from here on. Never read
  // `target`/`actor` again after this point -- they're a pre-mutation snapshot.
  const nextState = updateCreature(state, target.id, {
    currentHp: newHp,
    alive: newHp > 0,
  })

  events.push({
    type: 'DamageDealt',
    sourceId: actor.id,
    targetId: target.id,
    rawDamage: damage.rawDamage,
    finalDamage: damage.finalDamage,
    affinityMultiplier: damage.affinityMultiplier,
    wasChipOnly: damage.wasChipOnly,
    remainingHp: newHp,
  })

  if (died) {
    events.push({ type: 'CreatureDied', creatureId: target.id })
  }

  return nextState
}

function executeAction(
  actor: Creature,
  action: Action,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  switch (action.kind) {
    case 'attack':
      return executeAttack(actor, action.targetId, state, events)
    default: {
      const exhaustive: never = action.kind
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
  const finalState = firePhaseHook('fight-end', { ...state, result })
  return { state: finalState, events: [...events, { type: 'FightEnded', result }] }
}

export function resolveTurn(state: CombatState): {
  state: CombatState
  events: CombatEvent[]
} {
  const events: CombatEvent[] = []
  let working = state

  // Fight-start (once, when round === 0).
  if (working.round === 0) {
    working = firePhaseHook('fight-start', working)
    events.push({ type: 'FightStarted' })
  }

  // Round boundary: the queue is exhausted (or this is the very first call).
  if (working.turnCursor >= working.turnQueue.length) {
    if (working.round > 0) {
      working = firePhaseHook('round-end', working)
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
    working = firePhaseHook('round-start', working)
    events.push({ type: 'RoundStarted', round: nextRound })
  }

  const creatureId = working.turnQueue[working.turnCursor]
  working = { ...working, turnCursor: working.turnCursor + 1 }

  if (creatureId === undefined) {
    // Type-required by noUncheckedIndexedAccess; logically unreachable in Phase 1 -- a
    // freshly-built queue always has >=1 alive creature, since the round-cap gate above
    // and the win/loss check below together guarantee the fight already ended before a
    // queue with zero living creatures could ever be built here. Defensive finalize, not
    // a silent fallthrough.
    const result = checkWinLoss(working) ?? 'draw'
    return finalize(working, events, result)
  }

  const actor = getCreature(working, creatureId)

  // Turn body -- the TurnStarted/TurnEnded bracket is ALWAYS emitted for a dequeued slot;
  // only the action and the turn-start/turn-end hooks are gated on the actor being alive.
  // A dead-before-turn creature still gets an (empty) bracket -- that IS the skip signal,
  // per CONVENTIONS' "explicit boundary even for no-op turns". A dead creature must not
  // trigger start-of-turn effects, hence the hooks (not the events) are alive-gated.
  if (actor.alive) working = firePhaseHook('turn-start', working)
  events.push({ type: 'TurnStarted', creatureId: actor.id })

  if (actor.alive) {
    const action = decideAction(actor, working)
    if (action) working = executeAction(actor, action, working, events)
  }

  events.push({ type: 'TurnEnded', creatureId: actor.id })
  if (actor.alive) working = firePhaseHook('turn-end', working)

  // Win/loss/draw is checked after EVERY action, not just round boundaries. This ordering
  // (the turn fully closes with TurnEnded before this check runs) is intentional and must
  // survive Phase 2's multi-hit/AOE actions: the check must never move inside an action's
  // execution loop, or a killing blow mid-AOE would emit FightEnded before its own
  // TurnEnded.
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
