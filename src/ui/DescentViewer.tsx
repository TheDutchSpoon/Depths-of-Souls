// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { useEffect, useMemo, useReducer, useState } from 'react'
import type { FloorOutcome } from '../state/store'
import { fightToJson } from '../app/copyFight'
import { bossResultLine, floorResultLine } from '../app/descentText'
import { describeEvent, groupIntoBeats } from '../app/eventText'
import { fightHeader, fightRows } from '../app/fightList'
import { buildFightView, lineUpText, splitLineUp } from '../app/fightView'
import { DEFAULT_REGISTRIES } from '../data/registries'
import { DEMO_NAMES } from '../app/names'
import {
  initialPlayback,
  pendingDelayMs,
  playbackReducer,
  SPEEDS,
  timerKey,
} from '../app/playback'
import type { PlaybackAction, PlaybackState, Speed } from '../app/playback'
import { DescentResult } from './DescentResult'
import { LogBox } from './LogBox'

// A viewer, not an editor, and not the place for sprites, bars or animation. Playback is a
// cosmetic reveal of a log the store already computed: this component owns the reducer and the one
// timer for it, and renders the result list that jumps into it, so a new descent (the parent
// keys this component by the descent id) remounts both and clears the last timeout.

export interface Descent {
  readonly id: number
  readonly outcome: FloorOutcome
  /** The descended floor's fight count: the outcome stops at the first non-win. */
  readonly fights: number
}

const SPEED_BUTTONS: readonly Speed[] = [1, 3, 5]

export function DescentViewer({ descent }: { descent: Descent }) {
  const records = descent.outcome.fightRecords
  // Fight setup is rebuilt once per descent, not per render: each view runs `createCombat`.
  const views = useMemo(
    () => records.map((record) => buildFightView(record, DEFAULT_REGISTRIES, DEMO_NAMES)),
    [records],
  )
  const beats = useMemo(() => records.map((r) => groupIntoBeats(r.events)), [records])
  const beatCounts = useMemo(() => beats.map((fightBeats) => fightBeats.length), [beats])
  const rows = useMemo(() => fightRows(records, DEMO_NAMES), [records])
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const [state, dispatch] = useReducer(
    (current: PlaybackState, action: PlaybackAction) =>
      playbackReducer(current, action, beatCounts),
    records.length,
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

  // A descent with no fights has no fight to show; the hooks above ran, so this is a plain return.
  if (records.length === 0) {
    return (
      <section>
        <p>{floorResultLine(descent.outcome, descent.fights)}</p>
        <p>No fights were played on this floor.</p>
      </section>
    )
  }

  const view = views[state.fight]!
  const { allies, foes } = splitLineUp(view.lineUp)
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
      <h3>{header.title}</h3>
      <p>Party going in: {header.levelsIn.join('; ')}</p>
      <div className="lineups">
        <div>
          <h4>Allies</h4>
          <pre>{allies.map(lineUpText).join('\n')}</pre>
        </div>
        <div>
          <h4>Foes</h4>
          <pre>{foes.map(lineUpText).join('\n')}</pre>
        </div>
      </div>
      <LogBox text={log} fight={state.fight} revealed={state.revealed} />
      <p>
        After the fight: {header.row.xp} XP
        {header.row.levelUps.length > 0
          ? `; level-ups: ${header.row.levelUps.join('; ')}`
          : '; no level-ups'}
      </p>
      <button type="button" onClick={() => void copyFight(state.fight)}>
        Debug: Copy fight as JSON
      </button>
      {copyStatus !== null && <p role="status">{copyStatus}</p>}
      <DescentResult
        floorLine={floorResultLine(descent.outcome, descent.fights)}
        bossLine={bossResultLine(descent.outcome)}
        rows={rows}
        onJump={(fight) => dispatch({ type: 'jump', fight })}
        onCopy={(fight) => void copyFight(fight)}
      />
    </section>
  )
}
