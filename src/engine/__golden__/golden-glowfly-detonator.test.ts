import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-glowfly-detonator.fixture'
import { expectedEvents } from './golden-glowfly-detonator.fixture'

describe('golden replay: Glimmerdark Glowflies Charger -> Detonator (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (Glow charged by an ally, then consumed for a burst)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 48 HP
  })
})
