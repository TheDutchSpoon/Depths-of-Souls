import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import type { FloorOutcome } from '../state/store'
import { DescentViewer } from './DescentViewer'

const ZERO_FIGHTS: FloorOutcome = {
  floor: 4,
  fightResults: [],
  cleared: true,
  deepestFloorAdvanced: false,
  soulGained: new Map(),
  xpBanked: 0,
  currencyGained: { essence: 0, ore: 0, bricks: 0, lifeforce: 0 },
  events: [],
  fightRecords: [],
  bossDefeated: null,
  bossFirstCleared: false,
  perkPointsGained: 0,
}

test('a descent with no fights renders the floor line and says no fights were played', () => {
  const html = renderToString(
    <DescentViewer descent={{ id: 1, outcome: ZERO_FIGHTS, fights: 0 }} />,
  )
  expect(html).toContain('Floor 4: cleared')
  expect(html).toContain('No fights were played on this floor.')
  // No fight is on screen: no playback controls and no line-up.
  expect(html).not.toContain('Skip to end of fight')
  expect(html).not.toContain('Allies')
})
