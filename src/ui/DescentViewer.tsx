import { useEffect, useMemo, useReducer, useState } from 'react'
import type { FloorOutcome } from '../state/store'
import { fightToJson } from '../app/copyFight'
import { bossResultLine, floorResultLine } from '../app/descentText'
import { describeEvent, groupIntoBeats } from '../app/eventText'
import { fightHeader, fightRows } from '../app/fightList'
import { buildFightView, lineUpText } from '../app/fightView'
import { BIOMES } from '../data/biomes'
import { DEMO_NAMES } from '../app/names'
import {
  initialPlayback,
  pendingDelayMs,
  playbackReducer,
  SPEEDS,
  timerKey,
} from '../app/playback'
import type { PlaybackAction, PlaybackState, Speed } from '../app/playback'
import { DEMO_REGISTRIES } from '../app/registries'
import { DescentResult } from './DescentResult'

// A viewer, not an editor, and not the place for sprites, bars or animation. Playback is a
// cosmetic reveal of a log the store already computed: this component owns the reducer and the one
// timer for it, and renders the result list that jumps into it, so a new descent (the parent
// keys this component by the descent id) remounts both and clears the last timeout.

export interface Descent {
  readonly id: number
  readonly outcome: FloorOutcome
  readonly bossesBefore: ReadonlySet<string>
  readonly bossesAfter: ReadonlySet<string>
  /** The descended floor's fight count: the outcome stops at the first non-win. */
  readonly fights: number
}

const SPEED_BUTTONS: readonly Speed[] = [1, 3, 5]

export function DescentViewer({ descent }: { descent: Descent }) {
  const records = descent.outcome.fightRecords
  // Fight setup is rebuilt once per descent, not per render: each view runs `createCombat`.
  const views = useMemo(
    () => records.map((record) => buildFightView(record, DEMO_REGISTRIES, DEMO_NAMES)),
    [records],
  )
  const beats = useMemo(() => records.map((r) => groupIntoBeats(r.events)), [records])
  const beatCounts = useMemo(() => beats.map((fightBeats) => fightBeats.length), [beats])
  const rows = useMemo(() => fightRows(records, DEMO_NAMES), [records])
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const [state, dispatch] = useReducer(
    (current: PlaybackState, action: PlaybackAction) =>
      playbackReducer(current, action, beatCounts),
    undefined,
    initialPlayback,
  )

  // One timeout for the one pending beat. Its dependencies are the key and the delay, never the
  // state object: a new object that changes nothing visible must not restart the beat. The
  // cleanup runs before every re-run and on unmount, and StrictMode's second effect run clears
  // its own first, so timers cannot stack. No side effect sits inside a state updater.
  const delay = pendingDelayMs(state)
  const key = timerKey(state)
  useEffect(() => {
    if (delay === null) return
    const id = setTimeout(() => dispatch({ type: 'timer-elapsed' }), delay)
    return () => clearTimeout(id)
  }, [key, delay])

  async function copyFight(index: number) {
    try {
      await navigator.clipboard.writeText(fightToJson(records[index]!))
      setCopyStatus(`Copied fight ${index + 1} as JSON`)
    } catch {
      setCopyStatus('Copy failed: the clipboard is not available here')
    }
  }

  const view = views[state.fight]!
  const header = fightHeader(
    records[state.fight]!,
    state.fight,
    descent.fights,
    DEMO_NAMES,
  )
  const log = beats[state.fight]!.slice(0, state.revealed)
    .flat()
    .map((event) => describeEvent(event, view))
    .join('\n')

  return (
    <section>
      <DescentResult
        floorLine={floorResultLine(descent.outcome, descent.fights)}
        bossLine={bossResultLine(
          descent.outcome.bossDefeated,
          descent.bossesBefore,
          descent.bossesAfter,
          BIOMES,
        )}
        rows={rows}
        onJump={(fight) => dispatch({ type: 'jump', fight })}
        onCopy={(fight) => void copyFight(fight)}
      />
      {copyStatus !== null && <p role="status">{copyStatus}</p>}
      <div>
        {SPEED_BUTTONS.map((speed) => (
          <button
            key={speed}
            type="button"
            aria-pressed={state.speed === speed}
            onClick={() => dispatch({ type: 'set-speed', speed })}
          >
            {speed}x ({SPEEDS[speed]} ms)
          </button>
        ))}
        <button
          type="button"
          disabled={state.phase !== 'playing'}
          onClick={() => dispatch({ type: 'skip-fight' })}
        >
          Skip to end of fight
        </button>
        <button
          type="button"
          disabled={state.phase === 'done'}
          onClick={() => dispatch({ type: 'skip-floor' })}
        >
          Skip to end of floor
        </button>
      </div>
      {state.phase === 'waiting' ? (
        <p>Playback starts shortly. Jump to any fight in the list to start there.</p>
      ) : (
        <>
          <h3>{header.title}</h3>
          <p>Party going in: {header.levelsIn.join('; ')}</p>
          <p>
            After the fight: {header.row.xp} XP
            {header.row.levelUps.length > 0
              ? `; level-ups: ${header.row.levelUps.join('; ')}`
              : '; no level-ups'}
          </p>
          <pre>{view.lineUp.map(lineUpText).join('\n')}</pre>
          <pre>{log}</pre>
          <button type="button" onClick={() => void copyFight(state.fight)}>
            Debug: Copy fight as JSON
          </button>
        </>
      )}
    </section>
  )
}
