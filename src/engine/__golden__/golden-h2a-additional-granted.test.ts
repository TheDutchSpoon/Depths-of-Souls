import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2a-additional-granted.fixture'
import { expectedEvents } from './golden-h2a-additional-granted.fixture'

describe('golden replay: a granted Attack stays direct and gets the Additional', () => {
  it('the perform-action Attack deals 25, not the indirect 19', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
