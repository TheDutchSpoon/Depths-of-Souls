import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-indirect-trait-response.fixture'
import { expectedEvents } from './golden-indirect-trait-response.fixture'

describe('golden replay: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat', () => {
  it('deals 13 into a Defending target and 26 past the cross-stat of a Shield Bash bearer', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
