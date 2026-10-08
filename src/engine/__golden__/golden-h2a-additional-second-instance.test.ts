import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2a-additional-second-instance.fixture'
import { expectedEvents } from './golden-h2a-additional-second-instance.fixture'

describe('golden replay: the Additional lands on the second attack instance too (4.1-H2a)', () => {
  it('adds 10 to instance 1 (25) and to instance 2 (1 + 10 = 11)', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
