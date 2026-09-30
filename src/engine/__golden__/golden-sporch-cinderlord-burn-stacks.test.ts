import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-sporch-cinderlord-burn-stacks.fixture'
import { expectedEvents } from './golden-sporch-cinderlord-burn-stacks.fixture'

describe('golden replay: PR #64 fix 6 -- Sporch Cinderlord applies Burn with an explicit stacks:1 (real content)', () => {
  it('matches the committed event log exactly (a fresh target ends at 1 stack, a stacked target caps at 3 with duration visibly refreshed 1 -> 3)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull()
  })
})
