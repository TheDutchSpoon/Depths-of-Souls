import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-e-grant-during-granted-action.fixture'
import { expectedEvents } from './golden-e-grant-during-granted-action.fixture'

describe('golden replay: 4.1-E -- a grant raised during a granted action queues FIFO', () => {
  it('matches the hand-derived log exactly', () => {
    const { events, state } = runGolden(fixture)
    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })

  it('the three granted actions run Defended, Provoked, Waited (FIFO), not Defended, Waited, Provoked', () => {
    const { events } = runGolden(fixture)
    const granted = events
      .filter((e) => ['Defended', 'Provoked', 'Waited'].includes(e.type))
      .map((e) => e.type)
    expect(granted).toEqual(['Defended', 'Provoked', 'Waited'])
  })
})
