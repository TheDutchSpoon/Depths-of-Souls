// Phase 4.1-H2d (ASSUMPTIONS 148, 155): the CI threshold test for the sorcerer. One file per spec so
// Vitest runs the three in parallel. It runs the full 40 seeds at CI_RUN_CAP with the boss probe off
// through the simulator's own `runSeed` and `computeThresholds` (no threshold code is copied here) and
// asserts ASSUMPTION 22's three VERDICTS, never a value: a tuning pass that keeps the verdicts doesn't
// rewrite this file, and one that breaks a verdict fails the normal suite.

import { describe, expect, it } from 'vitest'
import { CI_RUN_CAP, computeThresholds, runSeed, SIM_SEEDS } from './balance-sim'

describe('balance CI thresholds: sorcerer (ASSUMPTION 22)', () => {
  it('passes the floor-1, first-soul and floor-5 verdicts over the 40 seeds', () => {
    const options = { seeds: SIM_SEEDS, runCap: CI_RUN_CAP, probeBosses: false }
    const t = computeThresholds(
      SIM_SEEDS.map((seed) => runSeed('sorcerer', seed, options)),
    )
    expect({
      floor1: t.floor1Pass,
      firstSoul: t.firstSoulPass,
      floor5: t.floor5Pass,
    }).toEqual({
      floor1: true,
      firstSoul: true,
      floor5: true,
    })
  }, 600_000)
})
