import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-gloomjaw-ravager.fixture'
import { expectedEvents } from './golden-gloomjaw-ravager.fixture'

describe('golden replay: Glimmerdark Gloomjaws Ravager (Phase 4 Slice H2, real content)', () => {
  it('matches the committed event log exactly (unconditional 30% armor-penetration)', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(state.result).toBeNull() // TARGET survives at 88 HP
  })
})
