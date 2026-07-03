import { useState } from 'react'
import { createCombat, resolveFight } from '../engine/combat'
import type { CombatEvent, Creature, FightResult } from '../engine/types'
import type { Script } from '../engine/scripting-types'

// Throwaway dev harness proving the engine runs end-to-end in the browser. Phase 7
// (Combat UI & feedback) replaces this with real combat presentation once Phase 4
// content exists. Do not grow this toward real combat UI (sprites, health bars,
// animation) or toward a script-authoring UI -- that is Phase 6/7 scope. This is a
// viewer, not an editor: both sides run real scripts through the Phase 2 interpreter.

interface CombatDemoProps {
  playerParty: readonly Creature[]
  enemyParty: readonly Creature[]
  seed: number
  scripts: ReadonlyMap<string, Script>
}

interface FightOutcome {
  events: CombatEvent[]
  result: FightResult | null
}

export function CombatDemo({ playerParty, enemyParty, seed, scripts }: CombatDemoProps) {
  const [outcome, setOutcome] = useState<FightOutcome | null>(null)

  function runFight() {
    const initial = createCombat(playerParty, enemyParty, seed, scripts)
    const { events, state } = resolveFight(initial)
    setOutcome({ events, result: state.result })
  }

  return (
    <section>
      <button type="button" onClick={runFight}>
        {outcome ? 'Run again' : 'Run fight'}
      </button>
      {outcome && (
        <>
          <p>Result: {outcome.result}</p>
          <pre>{outcome.events.map(describeEvent).join('\n')}</pre>
        </>
      )}
    </section>
  )
}

function describeEvent(event: CombatEvent): string {
  switch (event.type) {
    case 'FightStarted':
      return 'Fight started'
    case 'RoundStarted':
      return `-- Round ${event.round} --`
    case 'TurnStarted':
      return `${event.creatureId}'s turn`
    case 'AttackDeclared':
      return `${event.attackerId} attacks ${event.targetId}`
    case 'SpellCast':
      return event.targetShape === 'aoe'
        ? `${event.casterId} casts slot ${event.gemSlot} at [${event.targetIds.join(', ')}]`
        : `${event.casterId} casts slot ${event.gemSlot} at ${event.targetId}`
    case 'Defended':
      return `  ${event.creatureId} defends`
    case 'Provoked':
      return `  ${event.creatureId} provokes`
    case 'Waited':
      return `  ${event.creatureId} waits`
    case 'DamageDealt':
      return (
        `  ${event.sourceId} -> ${event.targetId}: ${event.finalDamage} damage ` +
        `(raw ${event.rawDamage.toFixed(2)}${event.wasChipOnly ? ', chip only' : ''}) ` +
        `-- ${event.remainingHp} HP left`
      )
    case 'CreatureDied':
      return `  ${event.creatureId} died`
    case 'TurnEnded':
      return `${event.creatureId}'s turn ends`
    case 'FightEnded':
      return `Fight ended: ${event.result}`
    // Phase 3 events (not emitted until later slices; handled here so the union stays exhaustive).
    case 'TriggerFired':
      return `  ${event.sourceId} triggers ${event.effectId} (${event.hook})`
    case 'StatusApplied':
      return `  ${event.targetId} gains ${event.statusId} x${event.stacks} (${event.duration}r)`
    case 'StatusExpired':
      return `  ${event.creatureId}'s ${event.statusId} expired`
    case 'StatModifierApplied':
      return `  ${event.targetId} ${event.stat}: ${event.effectiveBefore} -> ${event.effectiveAfter}`
    case 'HpClamped':
      return `  ${event.creatureId} HP clamped ${event.previousHp} -> ${event.newHp} (max ${event.effectiveMaxHealth})`
    case 'HealApplied':
      return `  ${event.targetId} heals ${event.amount} -- ${event.remainingHp} HP`
    case 'CascadeTruncated':
      return `  cascade truncated at ${event.creatureId}/${event.effectId} (depth ${event.depth})`
    default: {
      const exhaustive: never = event
      throw new Error(`Unhandled event type: ${String(exhaustive)}`)
    }
  }
}
