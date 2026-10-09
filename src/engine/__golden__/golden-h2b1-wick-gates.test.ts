import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import {
  aloneAndHurt,
  aloneAndHurtExpected,
  hurtOthersFull,
  hurtOthersFullExpected,
} from './golden-h2b1-wick-gates.fixture'

describe('golden replay: the Wick gate (4.1-H2b1)', () => {
  it('a hurt Wick with every OTHER ally at full Health neither burns nor heals, and logs no TriggerFired', () => {
    const { events } = runGolden(hurtOthersFull)

    expect(events).toEqual(hurtOthersFullExpected)
  })

  it('a hurt Wick that is the only living creature on its side neither burns nor heals (a dead ally is not hurt)', () => {
    const { events } = runGolden(aloneAndHurt)

    expect(events).toEqual(aloneAndHurtExpected)
  })
})
