import type { CombatEvent } from '../engine/types'
import type { FightView } from './fightView'

/** A beat starts at a creature's turn or at a triggered effect firing: the "meaningful beats"
 * playback is paced on, not raw events (a full fight is 80-120+ events). */
function isBeatStart(event: CombatEvent): boolean {
  return event.type === 'TurnStarted' || event.type === 'TriggerFired'
}

export function groupIntoBeats(events: readonly CombatEvent[]): CombatEvent[][] {
  const beats: CombatEvent[][] = []
  let current: CombatEvent[] = []
  for (const event of events) {
    if (isBeatStart(event) && current.length > 0) {
      beats.push(current)
      current = []
    }
    current.push(event)
  }
  if (current.length > 0) beats.push(current)
  return beats
}

export function describeEvent(
  event: CombatEvent,
  view: Pick<FightView, 'label' | 'spellName'>,
): string {
  const { label } = view
  switch (event.type) {
    case 'FightStarted':
      return 'Fight started'
    case 'RoundStarted':
      return `-- Round ${event.round} --`
    case 'TurnStarted':
      return `${label(event.creatureId)}'s turn`
    case 'AttackDeclared':
      return `${label(event.attackerId)} attacks ${label(event.targetId)}`
    case 'SpellCast': {
      const spell = view.spellName(event.casterId, event.gemSlot)
      return event.targetShape === 'aoe'
        ? `${label(event.casterId)} casts ${spell} at [${event.targetIds.map(label).join(', ')}]`
        : `${label(event.casterId)} casts ${spell} at ${label(event.targetId)}`
    }
    case 'Defended':
      return `  ${label(event.creatureId)} defends`
    case 'Provoked':
      return `  ${label(event.creatureId)} provokes`
    case 'Waited':
      return `  ${label(event.creatureId)} waits`
    case 'ActionStateEnded': {
      const flags = [
        event.defending ? 'defending' : null,
        event.provoking ? 'provoking' : null,
      ]
        .filter((f): f is string => f !== null)
        .join(', ')
      return `  ${label(event.creatureId)}'s ${flags} ends`
    }
    case 'DamageDealt':
      if (event.damageSource === 'dot' && event.statusId) {
        return (
          `  ${label(event.targetId)} took ${event.finalDamage} ${event.statusId} damage (dot) ` +
          `-- ${event.remainingHp} HP left`
        )
      }
      if (event.sourceId === event.targetId) {
        return (
          `  ${label(event.targetId)} collapses, taking ${event.finalDamage} self-inflicted damage ` +
          `-- ${event.remainingHp} HP left`
        )
      }
      return (
        `  ${label(event.sourceId)} -> ${label(event.targetId)}: ${event.finalDamage} damage ` +
        `(raw ${event.rawDamage.toFixed(2)}${event.wasChipOnly ? ', chip only' : ''}) ` +
        `-- ${event.remainingHp} HP left`
      )
    case 'CreatureDied':
      return `  ${label(event.creatureId)} died`
    case 'TurnEnded':
      return `${label(event.creatureId)}'s turn ends`
    case 'FightEnded':
      return `Fight ended: ${event.result}`
    case 'TriggerFired':
      return `  ${label(event.sourceId)} triggers ${event.effectId} (${event.hook})`
    case 'ActionGranted':
      return `  ${label(event.sourceId)} grants ${label(event.actorId)} an action (${event.effectId})`
    case 'StatusApplied':
      return `  ${label(event.targetId)} gains ${event.statusId} (${event.duration}r)`
    case 'StatusExpired':
      return `  ${label(event.creatureId)}'s ${event.statusId} expired`
    case 'StatModifierApplied':
      return `  ${label(event.targetId)} ${event.stat}: ${event.effectiveBefore} -> ${event.effectiveAfter}`
    case 'HpClamped':
      return `  ${label(event.creatureId)} HP clamped ${event.previousHp} -> ${event.newHp} (max ${event.effectiveMaxHealth})`
    case 'HealApplied':
      return `  ${label(event.targetId)} heals ${event.amount} -- ${event.remainingHp} HP`
    case 'CascadeTruncated':
      return `  cascade truncated at ${label(event.creatureId)}/${event.effectId} (depth ${event.depth})`
    case 'TurnSkipped':
      return `  ${label(event.creatureId)}'s turn is skipped (${event.effectId})`
    case 'Revived':
      return `  ${label(event.targetId)} is revived at ${event.currentHp} HP`
    default: {
      const exhaustive: never = event
      throw new Error(`Unhandled event type: ${String(exhaustive)}`)
    }
  }
}
