# Mechanism removal, 4.5-C

Each row: the finished tree in a scratch clone outside the repo with one mechanism removed, then
`npx vitest run` over the three new engine files (`dead-slot-skip.test.ts`,
`golden-dead-slot-skip.test.ts`, `golden-dead-slot-round-boundary.test.ts`; 9 tests) or, for the
simulator rows, `balance-sim.test.ts` and `balance-sim-report.test.ts`. The clone is restored after
each row.

| # | Mechanism removed | Failing tests |
| --- | --- | --- |
| M1 | the dead slot gets its bracket back | `golden-dead-slot-skip` (the log), `golden-dead-slot-round-boundary` (the log), `dead-slot-skip` "the call that skips them at the round cap …" (the call gains events) |
| M2 | the dead slot rolls the Web | `golden-dead-slot-skip` (draw count 3, not 2) |
| M3 | the Web roll gated on alive-at-cleanup | `dead-slot-skip` "rolls the Web after the actor died in its own action" (0 draws, not 1) |
| M4 | a dead-slot call returns without crossing the boundary | `golden-dead-slot-round-boundary`, `golden-dead-slot-skip`, `dead-slot-skip` "the call that skips them at the round cap …" and "a round-end pass reached by skipping …" |
| M5 | the guard | `dead-slot-skip` "throws for a fight that ended mid-queue …" and "… at a round boundary …" |
| M6 | a death drops the entry from the frozen queue | `golden-dead-slot-skip` (queue and cursor), `dead-slot-skip` "a creature revived before its slot acts in that slot" |
| M7 | a revived creature is appended to the running queue | `dead-slot-skip` "a creature dead at round start and revived mid-round …" |
| M8 | the round-cap gate outside the dequeue loop | `dead-slot-skip` "the call that skips them at the round cap …" |
| M9 | no win check after the round-end pass inside the loop | `dead-slot-skip` "a round-end pass reached by skipping that wipes a side …" |
| M10 | `analyzeFights` drops the roster (a production caller omits it) | `balance-sim` "every fight in a played floor run lists its enemy templates" |
| M11 | `runProbe` drops the roster | `balance-sim` "restores the state exactly …", "every fight in a played floor run …", "the ids the analysis keys on …", "the analysis names the boss of the biome …" |
| M12 | `enemyTemplateIds` read from the round-1 `TurnStarted` brackets again | `balance-sim-report` "analyzeFight lists the DISTINCT enemy templates of the whole enemy party" |

The plan's test 3 row named the mutant "skip decided from the round-start state"; a creature that
is revived is alive at round start, so that mutant would pass test 3. The mutant that test 3 kills
is M6 (a death removes the slot), and test 4's mutant is M7. Tests 6 and 7 are killed by M8 and M9.
