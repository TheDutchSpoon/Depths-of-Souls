# 4.6-B: the CI verdict numbers, `main` against this branch

`runSeed` over the 40 `SIM_SEEDS` at `CI_RUN_CAP` with the boss probe off, then `computeThresholds`, for each spec; one script on both trees (not kept). Each seed's deepest floor, run count, runs to first soul, first-try floor 1, floor 5 in the window and stop reason are compared as well as the verdicts' numbers (`computeThresholds`, printed for the branch below).

## sorcerer

- thresholds equal: **True**; per-seed results equal: **True**
- thresholds (branch): `{"floor1ClearRatePct": 100, "floor1Pass": true, "medianRunsToFirstSoul": 2, "seedsWithoutSoul": 0, "firstSoulPass": true, "seedsReachingFloor5InWindow": 40, "floor5Pass": true}`

## brute

- thresholds equal: **True**; per-seed results equal: **True**
- thresholds (branch): `{"floor1ClearRatePct": 100, "floor1Pass": true, "medianRunsToFirstSoul": 2, "seedsWithoutSoul": 0, "firstSoulPass": true, "seedsReachingFloor5InWindow": 40, "floor5Pass": true}`

## shieldbarer

- thresholds equal: **True**; per-seed results equal: **True**
- thresholds (branch): `{"floor1ClearRatePct": 100, "floor1Pass": true, "medianRunsToFirstSoul": 3, "seedsWithoutSoul": 0, "firstSoulPass": true, "seedsReachingFloor5InWindow": 37, "floor5Pass": true}`

All three specs equal: **True**.
