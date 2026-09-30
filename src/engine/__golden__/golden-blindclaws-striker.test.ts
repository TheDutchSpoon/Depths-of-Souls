import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-blindclaws-striker.fixture'
import { expectedEvents } from './golden-blindclaws-striker.fixture'

describe('golden replay: Glimmerdark Blindclaws Setter -> Striker (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (Defends without the initiative, Attacks with it)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 57 HP
  })
})
