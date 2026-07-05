import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createCombat, resolveFight } from '../engine/combat'
import type { CombatEvent, Creature, FightResult } from '../engine/types'
import type { Script } from '../engine/scripting-types'
import type { StatusDef, Trait } from '../engine/effect-types'

// Throwaway dev harness proving the engine runs end-to-end in the browser. Phase 7
// (Combat UI & feedback) replaces this with real combat presentation once Phase 4
// content exists. Do not grow this toward real combat UI (sprites, health bars,
// animation) or toward a script-authoring UI -- that is Phase 6/7 scope. This is a
// viewer, not an editor: both sides run real scripts through the Phase 2 interpreter,
// with real Phase 3 traits/statuses wired onto the demo parties (see demoFight.ts).
//
// Playback is cosmetic only: resolveFight still computes the whole deterministic event
// log synchronously up front (src/engine stays pure, sync, seed-deterministic); this
// component just reveals it progressively, paced on "beats" (each turn's action, each
// triggered effect) rather than per raw event, so a full fight plays out in ~15-30s.
// Baseline UI-only demo feature carried forward from Phase 3.5 to all future .5 demos.

const BEAT_DELAY_MS = 500

interface CombatDemoProps {
  playerParty: readonly Creature[]
  enemyParty: readonly Creature[]
  initialSeed: number
  scripts: ReadonlyMap<string, Script>
  traits?: ReadonlyMap<string, Trait>
  statuses?: ReadonlyMap<string, StatusDef>
}

interface FightOutcome {
  seed: number
  beats: readonly CombatEvent[][]
  result: FightResult | null
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000)
}

/** A beat starts at a creature's turn or at a triggered effect firing -- the "meaningful
 * beats" the brief paces playback on, not raw events (a full fight is 80-120+ events). */
function isBeatStart(event: CombatEvent): boolean {
  return event.type === 'TurnStarted' || event.type === 'TriggerFired'
}

function groupIntoBeats(events: readonly CombatEvent[]): CombatEvent[][] {
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

export function CombatDemo({
  playerParty,
  enemyParty,
  initialSeed,
  scripts,
  traits = new Map(),
  statuses = new Map(),
}: CombatDemoProps) {
  const [outcome, setOutcome] = useState<FightOutcome | null>(null)
  const [seedInput, setSeedInput] = useState(String(initialSeed))
  const [revealedBeats, setRevealedBeats] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Timer hygiene: cancel any in-flight reveal if the component goes away mid-playback.
  useEffect(() => clearTimer, [])

  function runFight(seed: number) {
    clearTimer()
    const initial = createCombat(playerParty, enemyParty, seed, scripts, traits, statuses)
    const { events, state } = resolveFight(initial)
    const beats = groupIntoBeats(events)
    setOutcome({ seed, beats, result: state.result })
    setSeedInput(String(seed))
    setRevealedBeats(Math.min(1, beats.length))

    if (beats.length > 1) {
      timerRef.current = setInterval(() => {
        setRevealedBeats((current) => {
          const next = current + 1
          if (next >= beats.length) clearTimer()
          return Math.min(next, beats.length)
        })
      }, BEAT_DELAY_MS)
    }
  }

  function skipToEnd() {
    clearTimer()
    setRevealedBeats((current) => outcome?.beats.length ?? current)
  }

  function handleSeedSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = Number(seedInput)
    if (Number.isFinite(parsed)) runFight(parsed)
  }

  const playbackDone = outcome ? revealedBeats >= outcome.beats.length : false
  const visibleEvents = outcome ? outcome.beats.slice(0, revealedBeats).flat() : []

  return (
    <section>
      <div>
        <button
          type="button"
          onClick={() => runFight(outcome ? randomSeed() : initialSeed)}
        >
          {outcome ? 'New random seed' : 'Run fight'}
        </button>
        {outcome && !playbackDone && (
          <button type="button" onClick={skipToEnd}>
            Skip to end
          </button>
        )}
      </div>
      <form onSubmit={handleSeedSubmit}>
        <label>
          Seed:{' '}
          <input
            type="text"
            value={seedInput}
            onChange={(event) => setSeedInput(event.target.value)}
          />
        </label>
        <button type="submit">Run this seed</button>
      </form>
      {outcome && (
        <>
          <p>Seed: {outcome.seed}</p>
          {playbackDone && <p>Result: {outcome.result}</p>}
          <pre>{visibleEvents.map(describeEvent).join('\n')}</pre>
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
      if (event.damageSource === 'dot' && event.statusId) {
        return (
          `  ${event.targetId} took ${event.finalDamage} ${event.statusId} damage (dot) ` +
          `-- ${event.remainingHp} HP left`
        )
      }
      if (event.sourceId === event.targetId) {
        return (
          `  ${event.targetId} collapses, taking ${event.finalDamage} self-inflicted damage ` +
          `-- ${event.remainingHp} HP left`
        )
      }
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
