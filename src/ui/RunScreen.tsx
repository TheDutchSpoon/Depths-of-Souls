// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { useState } from 'react'
import { floorInfoText, parseFloorField, prefillFloor } from '../app/floorPicker'
import { descendRefusalText } from '../app/refusals'
import { farthestReachableFloor, useGameStore } from '../state/store'
import { DescentViewer } from './DescentViewer'
import type { Descent } from './DescentViewer'

export function RunScreen() {
  // One subscription to the whole state object: it is a single stable reference, unlike a
  // selector that builds a new object on each call.
  const game = useGameStore()
  const [floorText, setFloorText] = useState(() => String(prefillFloor(game.lastFloor)))
  // Only the latest descent is kept, with the counter that keys its viewer.
  const [descentCount, setDescentCount] = useState(0)
  const [descent, setDescent] = useState<Descent | null>(null)

  const floor = parseFloorField(floorText)
  const check = game.canDescend(floor)
  const preview = game.floorPreview(floor)

  function descend() {
    // Read before the descent: the preview names the floor's whole fight count, which the
    // outcome (it stops at the first non-win) does not.
    const fights = useGameStore.getState().floorPreview(floor)?.fights
    const result = useGameStore.getState().descend(floor)
    if (!result.ok) return
    if (fights === undefined)
      throw new Error('descend: a descended floor always has a preview')
    const id = descentCount + 1
    setDescentCount(id)
    setDescent({
      id,
      outcome: result.outcome,
      fights,
    })
  }

  return (
    <section>
      <h2>Descend</h2>
      <label>
        Floor:{' '}
        <input
          type="text"
          value={floorText}
          onChange={(event) => setFloorText(event.target.value)}
        />
      </label>{' '}
      <button
        type="button"
        onClick={() => setFloorText(String(farthestReachableFloor(game.deepestFloor)))}
      >
        Deepest + 1
      </button>{' '}
      <button type="button" disabled={!check.ok} onClick={descend}>
        Descend
      </button>
      {!check.ok && (
        <p role="status">
          {descendRefusalText(check.reason, farthestReachableFloor(game.deepestFloor))}
        </p>
      )}
      {preview !== null && <p>{floorInfoText(preview)}</p>}
      {descent !== null && <DescentViewer key={descent.id} descent={descent} />}
    </section>
  )
}
