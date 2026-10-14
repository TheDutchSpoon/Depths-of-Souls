# Report r1 — 4.5-F: Level-ups after each fight, the per-fight record, and the intro's XP

Built to `plan.md` as `plan-handout-r1.md` corrects it. Nothing committed; nothing deleted.

## Gates

`npm run test` (229 files, 1990 passed, 1 skipped), `lint`, `format:check`, `build`, `npx tsc -b`,
`docs:check -- citations` and `docs:check -- comments`: all green.

**Test count, file by file against `main`** (the `engine-data-state` project, per-file counts from a
JSON run on a `git archive main` export and on the branch; 217 files both sides, 1488 → 1495):

| File | `main` | Branch | Change |
| --- | --- | --- | --- |
| `state/store.test.ts` | 28 | 35 | +7 (the new tests below) |
| `state/integration.test.ts` | 6 | 7 | +1 (real content, floor 1 and floor 2) |
| `state/balance-sim.test.ts` | 79 | 78 | −1 ("splits fights at FightStarted", deleted with `splitFights`) |

Every other file has the same count. Net +7. The one edited existing test is the probe-run case in
`balance-sim.test.ts`: its three roster assertions read `fightRecords`.

## Golden policy

Engine goldens and the corpus digest byte-identical: the full suite passes with no fixture touched,
and `git diff --stat -- src/engine` is two files, 7 lines: `BalanceConfig.introXpGrant`
(`balance-types.ts`) and the fixture's `introXpGrant: 0` with its header comment
(`__fixtures__/balance.ts`). `engine/__corpus__/corpus.ts` builds no `BalanceConfig` literal (it
imports the default), so it needed nothing. New store goldens are hand-derived (arithmetic in each
test's comments); the real-content test is labelled generated-then-checkpoint-verified.

## Mechanisms and the test that fails without each

Run by hand, one temporary edit each, then restored (`evidence/thresholds-and-mechanisms.md`):

| Mechanism removed | Failing test |
| --- | --- |
| `resolvePlayerParty` reads `state.collection` | levels change between two fights; the replay with a mid-floor level-up |
| end-of-floor XP application put back on top | XP applied exactly once; the loss's last fight |
| per-fight application reverted to end-of-floor | levels change between two fights; the replay; the loss's last fight; real content |
| `playerEffects` emptied in the record | both replay tests |
| record `playerParty` from `combat.playerParty` | both replay tests (`createCombat` refuses creatures that already carry fight-setup output) |
| intro grant removed | the intro grant test; real content |

The "parties from `combat.playerParty`" variant fails at `createCombat`'s own guard
(`engine/combat.ts`, "already carries fight-setup output"), which trips for any creature with a
trait or a perk effect, so it fails here whatever the innate spell. The innate-spell creature is the
real `SORCERER_STARTER` as the hand-out says (the Unicorn has none). The `attack ×2` perk changes
every player `DamageDealt`'s `rawDamage`, so the perk-dropped variant fails, no fallback needed.
The two sites of the record's read (`runProbe`, `playFloorRun`) are covered by the probe-run case
and the existing `enemyTemplateIds.length > 0` case plus the parity table.

## Simulator parity and levels on real content

`evidence/parity-and-levels.md` (new game → spec → intro → floor 1 → floor 2, seeds 1–5, three
specs, scratch scripts outside the repo):

- **Rosters:** the branch's `fightRecords[].enemyParty` ids equal `main`'s `fightEnemyIds`, 30 of 30
  floor runs, over the fights both resolved. Floor 1 resolves 10 fights on both; floor 2's counts
  differ in most rows (the table lists both result strings) because the stronger party changes where
  a loss lands, so the compared prefix is the shorter run.
- **Levels:** every floor-1 fight is played at `[1, 1]` and the party leaves floor 1 at `[2, 2]` at
  every seed and spec (10 intro XP + 10 floor XP = 20 = `xpForNextLevel(1)`); every floor-2 fight is
  played at `[2, 2]` (floor 2 yields at most 44 XP, below the 80 level 3 needs). Matches the
  probe's "plus 10 XP" description: floor 1 at `1,1`, floor 2 entered at level 2. The probe's
  "fix alone" row (fight 4 of floor 2 at `2,2`) is not reproduced because the intro grant moves the
  level-up to after floor 1.

## Balance

The three `balance-ci-*` tests pass. Threshold values (40 seeds, `CI_RUN_CAP`, boss probe off, no
`npm run sim`) equal the probe's "fix + 10 XP" rows exactly: Brute 100 / 2 / 40, Shieldbarer
100 / 3 / 37, Sorcerer 100 / 2 / 40. No red verdict, nothing tuned.

## Differences from the plan

- The record list is `FloorOutcome.fightRecords` and `partyLevelsAfter` reads the ids
  `resolvePlayerParty` returns (hand-out 2 and 3). `splitFights` and its test are deleted (hand-out
  5). The XP-once, reproduction and invariants tests use HERO + the real `SORCERER_STARTER`
  (hand-out 1). Descent B uses the same perk spec as A, so both replay tests carry perk effects.
- The plan's test 5 is one test over three descents (A, B, C); the intro test (6) is one test
  covering the crossing grant (150), the sub-threshold grant (40) and the lost-intro case.
- Test 7 pins floor 2 per fight: every record enters and leaves at `[2, 2]` (checkpoint 80 XP).
  It also asserts floor 2's XP total is below 80.
- ASSUMPTION 12 stands: a second `runScriptedIntro` call grants the XP again (unguarded, untested).
- Assumption 4: the fixture's `introXpGrant` is `0`; the intro tests override it by spread.

## Spec questions

1. `spec/store.md`: `FloorOutcome` and the record have no entry. As built: `FloorOutcome.fightRecords`
   (replacing `fightEnemyIds`, which the spec does not mention either) holds one `FightRecord` per
   fight resolved, in order: `events`, `result`, `xpBanked` (that fight's kills), `partyLevelsAfter`
   (the active party's levels after the fight's XP, in `playerParty` order), `seed`, `playerParty`
   and `enemyParty` (as `createCombat` was given them), `playerEffects` (the perk effects as given).
   References, not copies. `events`, `fightResults`, `xpBanked` stay on `FloorOutcome`.
2. `spec/run.md#rewards` (line 160): the `**Known bug:**` line is stale; the level-ups now apply
   after each fight, win or not, and the final `set` stores the per-fight collection.
3. `spec/run.md#scripted-intro` (lines 186–191): add the grant, `BalanceConfig.introXpGrant`, to
   every active-party creature after the Unicorn joins, whatever the result; calling the intro
   once is the caller's job and a second call grants again.
4. `CONVENTIONS.md#where-each-number-lives`: `introXpGrant` (10, `data/balance.ts`; 0 in the test
   fixture).
5. `phases/4.5/brief.md` (`#level-ups-after-each-fight`, `#the-per-fight-record`): the record's
   list is `FloorOutcome.fightRecords`, not `fights`; line 307 still reads "replaces
   `FloorOutcome.fightEnemyIds`", which stays true.
6. `splitFights` is deleted; any doc that names it (the simulator notes) is stale.

## Content changes

None. No creature, trait, spell or status changed. The one number added is the intro's XP grant
(10).

## To delete

Nothing. Scratch files (a `main` export, scripts and outputs) are outside the repo, in the session
scratchpad.
