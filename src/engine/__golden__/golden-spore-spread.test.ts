import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-spore-spread.fixture'
import { expectedEvents } from './golden-spore-spread.fixture'

describe('golden replay: Rotcap Hollow Spore contagion, infect -> kill -> spread (Phase 4 Slice H3, real content)', () => {
  it('matches the committed event log exactly (Seeder infects and kills, Spore spreads on death)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // ALLY survives (now carrying Spore); fight continues
  })
})
