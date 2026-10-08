import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2a-flat-indirect.fixture'
import { expectedEvents } from './golden-h2a-flat-indirect.fixture'

describe('golden replay: flat-mode response damage on another creature is indirect (4.1-H2a)', () => {
  it('deals 16 for a flat 20 and the minimum 1 for a flat 3 against Defence 20', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
