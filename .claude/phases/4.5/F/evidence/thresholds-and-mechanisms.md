# CI thresholds and mechanism removal

## CI thresholds (40 seeds, `CI_RUN_CAP`, boss probe off)

A scratch script outside the repo calling `runSeed` / `computeThresholds` over `SIM_SEEDS` per
spec on the branch (not `npm run sim`). Compared with the kickoff probe's "fix + 10 XP" rows
(`phases/4.5/F/evidence/kickoff-probe.md#ci-thresholds-40-seeds-ci_run_cap-boss-probe-off`).

| Spec | Floor-1 first-try % | Median runs to first soul | Seeds to floor 5 in window | Probe row (fix + 10 XP) | Same |
| --- | --- | --- | --- | --- | --- |
| Brute | 100 | 2 | 40 | 100 / 2 / 40 | yes |
| Shieldbarer | 100 | 3 | 37 | 100 / 3 / 37 | yes |
| Sorcerer | 100 | 2 | 40 | 100 / 2 / 40 | yes |

No seed is without a soul. All three verdicts pass for all three specs (the `balance-ci-*` tests
are green in the suite).

## Mechanism removal

Each variant is one temporary edit to `state/store.ts`, run against `store.test.ts` and
`integration.test.ts`, then restored (the file diffed byte-identical to the build afterwards).

| Variant | Tests that fail |
| --- | --- |
| `resolvePlayerParty` reads `state.collection` (the stale collection) | "levels change between two fights of one floor"; the perk/innate-spell replay |
| end-of-floor application put back on top of the per-fight one | "the floor's XP is applied exactly once"; "the last fight of a descent that ends on a loss applies its kills' XP" |
| per-fight application removed, floor XP applied at the end (as on `main`) | "levels change between two fights of one floor"; the perk/innate-spell replay; "the last fight of a descent that ends on a loss applies its kills' XP"; the real-content floor 1 / floor 2 test |
| the record's `playerEffects` emptied | both replay tests (descent A and descent B) |
| the record's `playerParty` taken from `combat.playerParty` | both replay tests (`createCombat` refuses the creatures that already carry fight-setup output) |
| the intro grant set to 0 | "every active-party creature gets the grant, whatever the intro fight's result"; the real-content floor 1 / floor 2 test |
