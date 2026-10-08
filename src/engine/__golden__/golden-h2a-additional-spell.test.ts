import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2a-additional-spell.fixture'
import { expectedEvents } from './golden-h2a-additional-spell.fixture'

describe('golden replay: the Additional lands on every direct hit of a spell (4.1-H2a)', () => {
  it('adds it per AOE target, per effect in the list, and on a single-target cast', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
