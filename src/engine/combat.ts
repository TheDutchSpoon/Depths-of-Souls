import { createSeededRng } from './rng'
import { ROUND_CAP, DEFEND_DEFENCE_MULTIPLIER, DEFEND_TAKEN_FACTOR } from './config'
import { buildTurnQueue } from './turn-order'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import { calculateDamage } from './damage'
import type { DamageResult } from './damage'
import { firePhaseHook } from './phase-hooks'
import { getCreature, updateCreature } from './creature-lookup'
import { instantiateTraitEffects, effectiveMaxHp } from './effects'
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

/** Defend: +50% effective Defence (inside the core) and a x0.65 taken-pool factor. */
function resolveDefenceAndTakenFactors(target: Creature): {
  defence: number
  takenFactors: readonly number[]
} {
  const baseDefence = getEffectiveStat(target, 'defence')
  if (!target.defending) return { defence: baseDefence, takenFactors: [] }
  return {
    defence: baseDefence * DEFEND_DEFENCE_MULTIPLIER,
    takenFactors: [DEFEND_TAKEN_FACTOR],
  }
}

/** Applies a damage result to `target`, emitting DamageDealt (+ CreatureDied if it killed). */
function applyDamageAndEmit(
  sourceId: CreatureId,
  target: Creature,
  damage: DamageResult,
  damageSource: 'attack' | 'cast' | 'dot',
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  const newHp = Math.max(target.currentHp - damage.finalDamage, 0)
  const died = newHp === 0 && target.alive

  // State threading: `nextState` is the only source of truth from here on. Never read
  // `target` again after this point -- it's a pre-mutation snapshot.
  const nextState = updateCreature(state, target.id, {
    currentHp: newHp,
    alive: newHp > 0,
  })

  events.push({
    type: 'DamageDealt',
    sourceId,
    targetId: target.id,
    rawDamage: damage.rawDamage,
    finalDamage: damage.finalDamage,
    affinityMultiplier: damage.affinityMultiplier,
    wasChipOnly: damage.wasChipOnly,
    remainingHp: newHp,
    damageSource,
  })

  if (died) {
    events.push({ type: 'CreatureDied', creatureId: target.id })
  }

  return nextState
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
  const { defence, takenFactors } = resolveDefenceAndTakenFactors(target)

  const damage = calculateDamage({
    offStat,
    defence,
    attackerAffinity: actor.affinity,
    defenderAffinity: target.affinity,
    dealtMods: [], // Phase 1/2: always empty; wired for Phase 3 damage-modifier effects
    takenFactors,
  })

  return applyDamageAndEmit(actor.id, target, damage, 'attack', state, events)
}

function executeCastSingle(
  actor: Creature,
  gemSlot: number,
  targetId: CreatureId,
  state: CombatState,
  events: CombatEvent[],
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

  const target = getCreature(state, targetId)
  const offStat = getOffensiveStat(actor, 'cast', spell.spellPower)
  const { defence, takenFactors } = resolveDefenceAndTakenFactors(target)

  const damage = calculateDamage({
    offStat,
    defence,
    attackerAffinity: actor.affinity,
    defenderAffinity: target.affinity,
    dealtMods: [],
    takenFactors,
  })

  return applyDamageAndEmit(actor.id, target, damage, 'cast', state, events)
}

function executeCastAoe(
  actor: Creature,
  gemSlot: number,
  state: CombatState,
  events: CombatEvent[],
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

  const offStat = getOffensiveStat(actor, 'cast', spell.spellPower)
  let working = state

  for (const targetId of targetIds) {
    const target = getCreature(working, targetId)
    // Forward guard: skip a frozen-list target that's no longer alive by the time its
    // hit would land. Inert in Phase 2 (no other kill source exists mid-AOE yet), but
    // Phase 3 (reflect-damage traits, on-death triggers) can make this reachable, and
    // emitting DamageDealt against a corpse would be wrong. The frozen target *set*
    // itself is unchanged -- this only skips *hitting* an already-dead member.
    if (!target.alive) continue

    const { defence, takenFactors } = resolveDefenceAndTakenFactors(target)
    const damage = calculateDamage({
      offStat,
      defence,
      attackerAffinity: actor.affinity,
      defenderAffinity: target.affinity,
      dealtMods: [],
      takenFactors,
    })
    working = applyDamageAndEmit(actor.id, target, damage, 'cast', working, events)
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
): CombatState {
  switch (action.kind) {
    case 'attack':
      return executeAttack(actor, action.targetId, state, events)
    case 'cast':
      switch (action.targetShape) {
        case 'single':
          return executeCastSingle(actor, action.gemSlot, action.targetId, state, events)
        case 'aoe':
          return executeCastAoe(actor, action.gemSlot, state, events)
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
  if (actor.alive) working = firePhaseHook('turn-start', working)
  events.push({ type: 'TurnStarted', creatureId: actor.id })

  if (actor.alive) {
    const script = actor.scriptId ? (working.scripts.get(actor.scriptId) ?? null) : null
    // Provoke's override is resolved INSIDE decideAction (see interpreter.ts /
    // targeting.ts's resolveOffensiveTarget) -- there is no separate post-hoc override
    // step here. decideAction sees the actor's defending/provoking status as it stood
    // ENTERING this turn (still whatever the actor's previous turn set), which is what
    // makes a self-referential is-provoking condition meaningful.
    const action = decideAction(actor, script, working)

    // "Until its next turn" expires here, before this turn's action executes -- a fresh
    // Defend/Provoke below re-applies for the next cycle; anything else leaves it lapsed.
    working = clearOwnTransientStatus(working, actor.id)
    const freshActor = getCreature(working, actor.id)

    if (action) {
      working = executeAction(freshActor, action, working, events) // AOE resolves fully in here
    }
  }

  events.push({ type: 'TurnEnded', creatureId: actor.id })
  if (actor.alive) working = firePhaseHook('turn-end', working)

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
