import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2a-indirect.fixture'
import { expectedEvents } from './golden-h2a-indirect.fixture'

describe('golden replay: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat', () => {
  it('deals 13 into a Defending target and 26 past the cross-stat of a Shield Bash bearer', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
