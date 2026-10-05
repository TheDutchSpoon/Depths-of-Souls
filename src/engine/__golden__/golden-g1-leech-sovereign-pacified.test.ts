import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import { countDraws } from '../test-utils/rng-draw-count'
import { createRngState } from '../rng'
import * as fixture from './golden-g1-leech-sovereign-pacified.fixture'
import {
  expectedEvents,
  EXPECTED_DRAWS,
  SEED,
} from './golden-g1-leech-sovereign-pacified.fixture'

describe('golden replay: a Pacified Leech Sovereign casts instead of waiting (Phase 4.1-G1, real content)', () => {
  it('matches the committed event log exactly, and her turn spends exactly one random draw', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    // Rule 2 (`attack random enemy`) is illegal under Pacified and draws nothing; rule 3's
    // `cast random gem` draws once, over her one castable gem.
    expect(countDraws(createRngState(SEED), state.rng)).toBe(EXPECTED_DRAWS)
  })

  it('she is on her role script, with one gem, and Pacified is what keeps her from attacking', () => {
    const { initial } = runGolden(fixture)
    const sovereign = initial.enemyParty[0]!
    expect(sovereign.scriptId).toBe('striker')
    expect(sovereign.equippedSpells.filter((spell) => spell !== null)).toHaveLength(1)
  })
})
