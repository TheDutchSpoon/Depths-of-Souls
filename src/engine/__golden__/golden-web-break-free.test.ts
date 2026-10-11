import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-web-break-free.fixture'
import { expectedEvents } from './golden-web-break-free.fixture'

describe('golden replay: Web break-free', () => {
  it('matches the committed event log exactly across round 1’s two turns', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
