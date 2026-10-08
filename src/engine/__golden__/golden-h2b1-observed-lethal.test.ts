import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b1-observed-lethal.fixture'
import { expectedEvents } from './golden-h2b1-observed-lethal.fixture'

describe('golden replay: observed-lethal (4.1-H2b1)', () => {
  it('a lethal burn: the Flare reacts before CreatureDied, the Last Gleam after it, and the heal is skipped', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
