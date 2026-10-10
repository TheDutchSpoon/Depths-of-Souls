import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2d-dot-ticks.fixture'
import { expectedEvents } from './golden-h2d-dot-ticks.fixture'

describe('golden replay: one tick each of the real Poison, Burn and Spore (4.1-H2d)', () => {
  it('ticks 40% of Attack, 35% of Intelligence and 35% of Speed, each less a fifth of the bearer Defence', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
