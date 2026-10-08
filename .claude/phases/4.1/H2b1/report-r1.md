# Report r1 — Phase 4.1 — Slice H2b1: Flickerlings and damage observation

Built to the approved plan (Revisions 1 and 2) at `0994d88`. Nothing committed. The phase-record section is
appended to `.claude/phases/phase-4.1-fix-and-consolidation.md` (the 4.1 rule).

## Gates

`npm run test` (182 files, 1266 tests: 1265 passed, 1 skipped), `npm run lint`, `npm run format:check`,
`npm run build`, `npx tsc -b`: all green on the finished tree.

**Test count against `main`** (`0994d88` archived into a scratch dir and run with the JSON reporter; compared
file by file): files 171 -> 182, tests 1166 -> 1266 (+100).

| File | main -> slice |
|---|---|
| `engine/damage-observation.test.ts` (new) | 0 -> 64 |
| `engine/injured-allies.test.ts` (new) | 0 -> 14 |
| `data/traits/glimmerdark.test.ts` (new) | 0 -> 7 |
| `data/spells/glimmerdark.test.ts` (new) | 0 -> 4 |
| `data/species/glimmerdark.test.ts` | 13 -> 15 |
| `golden-h2b1-*.test.ts` (eight new files) | 0 -> 10 |
| `golden-glowfly-detonator.test.ts` (deleted by Duncan) | 1 -> 0 |

No other file's count changed.

## Predicted changed set, against what changed

Written in the plan before any run. Held exactly: tests changed are `status-containers.test.ts` (a local
`fixture-damage-boost`), `store-gems.test.ts` (draw 0.6, picks `arcane-bolt` / `beacon-charge` /
`kindred-light`), `spells/index.test.ts` (24-id pin), `roles.test.ts`, `species/glimmerdark.test.ts`. No
others. `perform-action.test.ts` needed no change (A23, verified).

## Golden policy

Every golden except the retired one is byte-identical. Checked two ways: no fixture file under `__golden__`
other than the deleted pair is modified (`git status`), and every existing golden test imports its fixture's
`expectedEvents` and passes against the replay. Eight new goldens (nine cases), hand-derived with the setup,
arithmetic and draws in the fixture comments; the numbers were written before the first run and every one
passed on it. Float values are written as the derivation (`22 * 1.15`), not pasted.

## Corpus digest

- **Rung 0, observer alone:** engine change with the old content (a scratch copy with the `HEAD` data files)
  reproduces the committed digest for all 527 fights.
- **Regenerated once** (`npm run corpus:update`): 262 of 527 changed; Part C unchanged; results win 226 ->
  222, loss 266 -> 266, draw 35 -> 39. The committed fixture equals the ladder's last rung for every fight.
- **Ladder** (scratch copy outside the repo, cumulative; each fight attributed to the first rung where it
  differs from the committed digest):

| Rung | Newly changed vs the previous rung | Predicted set | Outside it |
|---|---|---|---|
| species swap | 151 | 153 fights containing a Glowfly at R0 | 0 |
| Overcharge deleted | 175 | fights with a Wit creature rolled at biome 2+ (349) | 0 (all 175 have a changed gem loadout; no creature id changed: the generation stream did not shift) |
| Beacon Charge | 110 | fights holding Beacon Charge (240) | 0 |
| Kindred Light | 119 | fights holding Kindred Light (245) | 0 |

First-changed attribution: 151 / 91 / 9 / 11. 171 fights change at more than one rung (interactions, listed by
the analysis, not merged). The two predicted-but-unchanged species fights (61, 271) have a Glowfly Charger that
never acts or takes a hit.
- **Flare observing a Wick cost:** 20 generated fights already do (e.g. 15, 19, 40, 58, 71, 130, 190), so no
  appended `H2B1_FIGHTS` fight was needed. `corpus-coverage.test.ts` passes with no stale exemption (Kindred
  Light and Beacon Charge are still cast, `grant-act-first` still applied, `glow` gone).

## Mechanism -> the test that fails with it removed

31 mutations, each applied alone in a scratch copy of the finished tree with the full suite run; the digest
does not count. All killed.

| Mutation | Killed by |
|---|---|
| damage observation removed | `damage-observation`, `golden-h2b1-observed-cost`, `-observed-lethal`, `-wick-burn-heal` |
| `selfInflicted` filter dropped | `golden-h2b1-observed-silent`, `-observed-tick`, `damage-observation` matrix |
| self-inflicted read as `source === target` | `damage-observation`, `-observed-silent`, `-observed-tick` |
| tick path passes true | `damage-observation`, `-observed-tick` |
| direct path passes true | `damage-observation`, `-observed-silent` |
| relationship filter dropped | `damage-observation`, `-observed-cost` |
| relationship read against the dealer | `damage-observation` (enemy-hits-ally rows) |
| Resonants reached by a damage event | `damage-observation`, `golden-e-grant-actor-dies-first` |
| damage hook not fail-closed | `damage-observation` |
| action hook not fail-closed | `damage-observation` |
| re-entry guard skipped for `on-damage-observed` | `damage-observation` (loop-safety row) |
| observation only on survivors | `damage-observation`, `-observed-lethal` |
| observation before `on-damage-taken` | `damage-observation` hook-order rows, plus 17 existing files (the observation fired early reorders every damage log) |
| zero cost reaches the resolver | `damage-observation`, `golden-h2a-cost`, `-observed-silent` |
| lethal burn does not skip the heal | `golden-h2b1-observed-lethal`, `golden-round-end-interaction` |
| validator not run over statuses / traits / perks | `damage-observation` validator rows (one each) |
| validator allows `selfInflicted` on the wrong hook | `damage-observation` |
| pool counts the bearer | `injured-allies`, `golden-h2b1-wick-gates`, `-wick-skips-self` |
| gate alone counts the bearer | `injured-allies`, `golden-h2b1-wick-gates` |
| target alone: bearer exclusion removed | `injured-allies`, `golden-h2b1-wick-skips-self`, `-wick-burn-heal` |
| target alone: hurt filter removed | `injured-allies`, `golden-h2b1-wick-burn-heal` |
| pool counts dead allies | `injured-allies` ("hurt other dead"), `golden-h2b1-wick-gates` case 2 |
| Wick gate removed / heal left ungated | `traits/glimmerdark.test`, `golden-h2b1-wick-gates` |
| Last Gleam on the wrong hook | `traits/glimmerdark.test`, `golden-h2b1-last-gleam`, `-observed-lethal` |
| Beacon Charge status changed / Kindred Light keeps a status | `spells/glimmerdark.test` |
| species swap not in place | `species/glimmerdark.test` |
| `other-ally-injured` allowed in a script | `npx tsc -b` (unused `@ts-expect-error` in `injured-allies.test.ts`) |

## Grep

`src/data` after the slice: no Glowfly, Glow, Overcharge or Luminous Tide in code or data. The remaining hits
are history comments and the tests that assert the deletion. Out of scope by review fix 9: the consume-stacks
fixtures/tests (`golden-consume-stacks`, the block in `resolution.test.ts`, `perform-action.test.ts`), which keep
their own local `glow` fixtures.

## Deviations from the plan

- **Loop-safety row** uses an enemy-relationship ping-pong (A and B each "on an enemy's cost, pay 1", Health
  400), not the review's "ally" pair. With "ally" each pass fires both observers, so the mutated run branches
  twice per level and would never reach the depth cap. The ping-pong is linear: the guarded run ends after
  five events (derivation in the test), the mutated run diverges.
- Fix 6 of Round 2 is `if (!damaged) continue` before the relationship check.

## Spec questions

1. The Flare's Speed compounds per cost (x1.15 per burn, x1.32 with two Flares): H2c's tuning pass.
2. `species-locked.md`'s Glow note is stale (A29): the design agent's to fold.
3. `glimmerdark.md`'s F-slice "Status timing" paragraph named Glow and the Charger; I removed those two
   mentions (the paragraph is otherwise untouched).
4. Phase 6's editor must list the scripting `Condition` only, never `TriggerCondition` (already in ROADMAP).
5. The Wick's heal reads `amountPerStack`, a field H2b2 may rename when stacks go.

## To delete

Nothing. (`golden-glowfly-detonator.fixture.ts` / `.test.ts` were deleted by Duncan at the step.) Scratch work
stayed outside the repo.
