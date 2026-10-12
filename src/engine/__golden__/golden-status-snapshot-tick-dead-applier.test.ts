import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-status-snapshot-tick-dead-applier.fixture'
import {
  expectedEvents,
  expectedResult,
} from './golden-status-snapshot-tick-dead-applier.fixture'

describe('golden replay: a tick whose applier died keeps its frozen amount, is sourced from the bearer, fires no dealer hooks and is never self-inflicted', () => {
  it('matches the committed event log exactly (living applier, then dead applier: bearer as source, no Dealer, Flare silent)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBe(expectedResult)
  })
})
