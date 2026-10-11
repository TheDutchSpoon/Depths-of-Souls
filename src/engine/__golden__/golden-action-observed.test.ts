import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-action-observed.fixture'
import { expectedEvents } from './golden-action-observed.fixture'

describe('golden replay: on-action-observed (Resonants-shaped)', () => {
  it('matches the committed event log exactly -- fires once per cast instance, ally only', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
