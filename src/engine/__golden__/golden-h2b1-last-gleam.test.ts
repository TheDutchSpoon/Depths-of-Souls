import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import {
  allyDies,
  allyDiesExpected,
  gleamDies,
  gleamDiesExpected,
} from './golden-h2b1-last-gleam.fixture'

describe('golden replay: the Last Gleam (4.1-H2b1)', () => {
  it('an ally dying gives every living ally +20% Attack, the Last Gleam included', () => {
    const { events } = runGolden(allyDies)

    expect(events).toEqual(allyDiesExpected)
  })

  it('the Last Gleam dying does not trigger itself', () => {
    const { events } = runGolden(gleamDies)

    expect(events).toEqual(gleamDiesExpected)
  })
})
