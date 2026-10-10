import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2c-snapback.fixture'
import { expectedEvents } from './golden-h2c-snapback.fixture'

describe('golden replay: the real Snapjaw Jaws counterattacks at 60% of its Attack, as indirect damage (4.1-H2d)', () => {
  it('answers a 20-damage hit with 22 (40 x 0.6 = 24, minus a fifth of Defence 10) into the attacker', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
