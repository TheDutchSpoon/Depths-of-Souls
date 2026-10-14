import { useState } from 'react'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { BIOMES } from '../data/biomes'
import { runDescent } from '../app/descendFlow'
import {
  deepestPlusOne,
  floorInfo,
  floorInfoText,
  parseFloorField,
  prefillFloor,
} from '../app/floorPicker'
import { descendRefusalText } from '../app/refusals'
import { useGameStore } from '../state/store'
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
  const info = floorInfo(floor, {
    atlasPins: game.atlasPins,
    runSeed: game.runSeed,
    biomes: BIOMES,
    config: DEFAULT_BALANCE_CONFIG,
  })

  function descend() {
    const run = runDescent(useGameStore, floor)
    if (!run.ok) return
    if (info === null) throw new Error('descend: a descended floor always has info')
    const id = descentCount + 1
    setDescentCount(id)
    setDescent({
      id,
      outcome: run.outcome,
      bossesBefore: run.bossesBefore,
      bossesAfter: run.bossesAfter,
      fights: info.fights,
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
        onClick={() => setFloorText(String(deepestPlusOne(game.deepestFloor)))}
      >
        Deepest + 1
      </button>{' '}
      <button type="button" disabled={!check.ok} onClick={descend}>
        Descend
      </button>
      {!check.ok && <p role="status">{descendRefusalText(check.reason)}</p>}
      {info !== null && <p>{floorInfoText(info)}</p>}
      {descent !== null && <DescentViewer key={descent.id} descent={descent} />}
    </section>
  )
}
