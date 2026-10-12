import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-additional-spell.fixture'
import { expectedEvents } from './golden-additional-spell.fixture'

describe('golden replay: the Additional lands on every direct hit of a spell', () => {
  it('adds it per AOE target, per effect in the list, and on a single-target cast', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
