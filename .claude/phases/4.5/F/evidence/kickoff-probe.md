# Kickoff probe: what level-ups after each fight and the intro's XP move on `main`

Scratch clone of `e4ea5f6` (`main`), outside the repo. A measurement, not the build: the plan
designs the change. Node 22 (CI runs 24); the lockfile's tool versions. Only `src/state` and
`src/app` import the store, so only their tests were run: on `main`, `src/state` is 12 files,
242 passed, 1 skipped.

## The variants

- **Level-up fix:** in `descend`, the party is materialized per fight from a local collection,
  each fight's XP (its share of `xpBanked`) is applied to that collection with `applyXpToParty`
  right after the fight, win or not, and the final `set` stores that collection instead of
  applying the floor's `xpBanked`. Nothing else.
- **Plus intro XP:** in `runScriptedIntro`, after `grantCreatureIfUnowned`, a flat grant through
  `applyXpToParty` to the resulting active party: 10 XP, and 11 for comparison.
- No record: `FloorOutcome` keeps `fightEnemyIds`.

## Tests

- Level-up fix: `src/state` 12 files, 242 passed, 1 skipped. No test changed.
- Plus 10 XP: `src/state` and `src/app`, every file green. No test changed.
- So no store test on `main` pins a level-up between fights or the intro's XP. The only test the
  slice must change is the record's shape: `balance-sim.test.ts`'s `fightEnemyIds` assertions.

## Levels per fight, real store

New game → spec → intro → floor 1 → floor 2, seeds 1–5, each fight's party levels going into it
(starter, Unicorn). Real default config: XP to level 2 is 20, and `applyXpGain` levels at
`xp >= 20`.

- **Floor 1** is 10 fights against one level-1 enemy each: 10 XP for the floor. With the fix
  alone, every floor-1 fight is at `1,1` and the party leaves floor 1 at level 1 (10/20), at
  every seed and spec.
- **Floor 2** yields about 4 XP per fight. With the fix alone, the party levels after fight 3 and
  fights fight 4 at `2,2` (Brute seeds 2–4, Shieldbarer seeds 2–4); Brute seed 2 clears floor 2
  only with the fix (on `main` it loses fight 11).
- **Plus 10 XP:** floor 1 still at `1,1` in every fight; the level-up lands after fight 10, so
  the party enters floor 2 at level 2.
- **Plus 11 XP:** fight 10 of floor 1 is played at `2,2`.

## CI thresholds (40 seeds, `CI_RUN_CAP`, boss probe off)

Values, not just verdicts. Every verdict passes in every variant.

| Spec | Variant | Floor-1 first-try % | Median runs to first soul | Seeds to floor 5 in window |
| --- | --- | --- | --- | --- |
| Brute | `main` | 100 | 2 | 40 |
| Brute | level-up fix | 100 | 2 | 40 |
| Brute | fix + 10 XP | 100 | 2 | 40 |
| Shieldbarer | `main` | 100 | 3 | 34 |
| Shieldbarer | level-up fix | 100 | 3 | 36 |
| Shieldbarer | fix + 10 XP | 100 | 3 | 37 |
| Sorcerer | `main` | 100 | 3 | 40 |
| Sorcerer | level-up fix | 100 | 3 | 40 |
| Sorcerer | fix + 10 XP | 100 | 2 | 40 |

(11 XP gives the same values as 10.) No seed is without a soul in any variant.
