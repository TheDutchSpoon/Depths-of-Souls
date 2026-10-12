import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-indirect-flat-response.fixture'
import { expectedEvents } from './golden-indirect-flat-response.fixture'

describe('golden replay: flat-mode response damage on another creature is indirect', () => {
  it('deals 16 for a flat 20 and the minimum 1 for a flat 3 against Defence 20', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
