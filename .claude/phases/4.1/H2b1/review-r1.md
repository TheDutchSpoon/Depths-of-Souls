# PR review r1 — Phase 4.1 — Slice H2b1: Flickerlings and damage observation

Reviewed `report-r1.md` against `kickoff.md`, `plan.md` (Revisions 1 and 2), `plan-review.md` Rounds 1–2,
CONVENTIONS ("Hook execution model", "Damage observation", "Damage channels and the Additional"),
`content/glimmerdark.md` and the code. Branch `phase-4.1-slice-h2b1` at `3d1d78c`, against `main` at
`d4d1b90` (the merge base). Cloned and run in my own sandbox, never in the working tree.

## Verdict

**Approved.** The code does what the spec says, and every claim in the report I could check held when I
re-ran it independently: test counts, golden byte-identity, rung 0, the digest counts, and the mutation
kills. I found no real fix. One comment-only nit is fixed before the merge through `handout-r1.md`
(Duncan's decision on decide-point 1), and one balance observation is recorded for H2c (decide-point 2).

## Real fixes

None.

## Scope and labeling

1. **`effect-types.ts`, the `Hook` header comment** reads "the v1 vocabulary (13) plus the on-[action]
   family (+4) and on-damage-observed (+1), 17 in all". That adds to 18. It skips Slice E2's net −1 (the
   never-wired pair out, `on-action-observed` in). The union itself has 17 members, which is correct.
   Comment only: fixed before the merge (`handout-r1.md`, decide-point 1).
2. **The report's golden byte-identity check** is `git status` plus passing tests, not the fixture
   import-compare the plan promised. I ran the import-compare (below), and it holds. No action.
3. **A27's wall time** was promised in the report and is missing. Measured here (below): no measurable
   cost. No action.
4. **The real Flare's `selfInflicted: true`** is pinned only by the data shape test
   (`traits/glimmerdark.test.ts`). No real-content golden shows the Flare ignoring an ordinary hit; the
   engine-side filter is pinned by `golden-h2b1-observed-silent` / `-tick` with a Flare-shaped fixture
   observer. That is the project's usual split (shape tests pin data, goldens pin mechanisms), so it is
   acceptable as is.
5. **Deviation accepted: the loop-safety row** uses an `enemy` ping-pong instead of the review's `ally`
   pair. The reason is right: with `ally` (which includes self), each pass fires both observers, so the
   mutated run branches and never reaches the depth cap in a test. The ping-pong is linear, the guarded
   log is hand-derived, and the mutation is killed (M25 below).

## Decide-points

**1. Approve now with the comment nit carried to H2b2, or run one fix round for it?**
- (a) **Approve now.** The one-line comment fix is written into H2b2's brief ("Carried from the 4.1-H2b1
  PR review"). H2b2 edits `effect-types.ts` anyway (it deletes `consume-stacks` and `cap` there).
- (b) A fix round: a hand-out, `report-r2.md`, `review-r2.md`, all for one comment line.

**Recommendation: (a).** It has no behavioural effect and no test can see it, and a round costs a full
gate and review cycle. The CLAUDE.md count, which readers do rely on, is fixed in this review's doc edits.

**2. The Flare's Speed compounds: leave it to H2c, or change the content now?**
The corpus shows it is not hypothetical: 20 fights have a Flare reacting, the worst reach 45 reactions
and ×539 Speed (fight 190) and 43 reactions and ×407 (fights 344 and 348, both 100-round draws). Five
fights holding a Flickerling turn into draws in this PR (344, 370, 372, 490, 494; draws 35 → 39 overall).
- (a) **H2c**, as the plan review already parked it. The data is now written into H2c's "uncapped stat
  stacking" watch point.
- (b) **Now**, for example the Flare fires once per round, or a smaller factor.

**Recommendation: (a).** The rule is locked: stat-modifier stacking stays uncapped, and a fix is per
content item, chosen from the report (brief, H2c watch point). H2c is the tuning pass on the final rules,
and H2b2 still changes DoTs and statuses, which move the same fights. Changing the Flare now would tune
against rules that are about to change, and it would put a balance call into a rules PR. (b) only makes
sense if you want the draw count back down before H2b2's digest, and nothing depends on that.

## What was verified, and how

- **Gates** (fresh `npm ci`, Vitest 5.0.3 matching the lockfile): `npm run test`, `lint`,
  `format:check`, `build`, `npx tsc -b` all green. CI was **not** checked: the GitHub API isn't enabled
  for my session.
- **Test count, file by file** (`vitest --reporter=json` on both trees): `main` 171 files / 1166 tests →
  PR 182 / 1266 (1265 passed, 1 skipped). Every changed file matches the report's table exactly
  (`damage-observation` +64, `injured-allies` +14, `traits/glimmerdark` +7, `spells/glimmerdark` +4,
  `species/glimmerdark` 13 → 15, eight `golden-h2b1-*` files +10, `golden-glowfly-detonator` −1). No other
  file's count changed.
- **Golden byte-identity, by import:** every `*.fixture.ts` imported on both trees and every `expected*`
  export deep-compared: all shared exports are identical; the only one missing is the retired
  `golden-glowfly-detonator`. No pre-existing fixture file is modified in the diff.
- **Rung 0 reproduced:** the PR engine with `main`'s `src/data` and `main`'s digest fixture passes
  `corpus-digest` for all 527 fights, and the retired `golden-glowfly-detonator` still passes on the new
  engine. The observer alone changes nothing.
- **Digest:** 262 of 527 rows changed, Part C (500+) none, W/L/D 226/266/35 → 222/266/39, as reported.
  Every changed fight has a cause: 151 contain a Glowfly on `main` (of 153; the report explains the two
  unchanged), 105 have a changed spell loadout, 6 hold Beacon Charge or Kindred Light; **none
  unexplained**. In all 527 fights every non-Flickerling creature is identical on both trees, so the
  generation stream did not shift (Round 1 fix 5's claim).
- **Code read against the spec:** the hook order in `applyDamageAndEmit` (dealt → taken if survived →
  observed always → death chain), `selfInflicted` passed `true` only from `applyCostDamage`, the hook
  branched by name with both observation hooks failing closed, `if (!damaged) continue` before the
  relationship check, one pool (`injuredOtherAlliesOf`) behind both the gate and the target,
  `evaluateCondition` untouched, the validator on traits, perks and statuses, and content matching
  `glimmerdark.md` (stats, affinity spread 4/3/5/4/2, Beacon Charge → `grant-act-first` at default 3,
  Kindred Light heal-only at 0.2, `ALL_SPELLS` with Overcharge removed and Kindred Light in Luminous
  Tide's place).
- **Goldens hand-derived:** spot-checked `observed-lethal`, `wick-burn-heal`, `wick-gates` (burn
  ⌊3.8⌋ = 3, heal ⌊7.6⌋ = 7, the modifiers on the living targets only, case 2 written as the Wick alone
  with its ally dead, as Round 2 fix 4 asked). No RNG is drawn in any of them.
- **Mutations (mine, 26, one at a time in a scratch copy, full suite):** all killed by a named non-digest
  test.

  | Mutation | Killed by (non-digest) |
  |---|---|
  | observation call removed | `damage-observation`, `-observed-cost`, `-observed-lethal`, `-wick-burn-heal` |
  | `selfInflicted` = `source === target` | `damage-observation`, `-observed-silent`, `-observed-tick` |
  | relationship checks dropped (damage branch) | `damage-observation`, `-observed-cost` |
  | relationship against the dealer (call site passes `sourceId`) | `damage-observation` |
  | action hook not fail-closed | `damage-observation` |
  | damage hook not fail-closed | `damage-observation` |
  | pool counts the bearer | `injured-allies`, `-wick-gates`, `-wick-skips-self` |
  | target: hurt filter removed | `injured-allies`, `-wick-burn-heal` |
  | target: bearer exclusion removed | `injured-allies`, `-wick-skips-self` |
  | pool counts dead allies | `injured-allies`, `-wick-gates` |
  | heal ungated (data) | `traits/glimmerdark`, `-wick-gates` |
  | burn ungated (data) | `traits/glimmerdark`, `-wick-gates` |
  | observation only on survivors | `damage-observation`, `-observed-lethal` |
  | "hurt" against base Health, not effective max | `injured-allies` |
  | validator off statuses | `damage-observation` |
  | validator off perks | `damage-observation` |
  | gate always true | `injured-allies`, `-wick-gates` |
  | observers enemy side first | `-observed-cost` |
  | Flare data loses `selfInflicted` | `traits/glimmerdark` (shape only, see scope 4) |
  | cost path passes `false` | `damage-observation`, `-observed-cost`, `-observed-lethal`, `-wick-burn-heal` |
  | tick path passes `true` | `damage-observation`, `-observed-tick` |
  | direct path passes `true` | `damage-observation`, `-observed-silent` |
  | re-entry guard skipped for the damage hook | `damage-observation` (loop-safety row) |
  | `selfInflicted` filter dropped (engine) | `damage-observation`, `-observed-silent`, `-observed-tick` |
  | validator allows `selfInflicted` anywhere | `damage-observation` |

- **Live behaviour (a throwaway scan of all 527 fights' event logs):** the Flare reacts 275 times, every
  time to a Wick's cost; **never** to a non-cost, never to another creature's cost. No other
  `on-damage-observed` trigger fires. The Wick burns 1,367 times; 1,363 burns are followed by a heal that
  lands on another ally, and the other 4 are lethal burns with no heal, as designed. Last Gleam reacts 15
  times. No `CascadeTruncated` on either tree. Kindred Light is cast 552 times, Beacon Charge 642 times.
  20 fights have a Flare observing a Wick cost (fights 15, 19, 40, 58, 71, 130, 190, …, as reported).
- **Wall time (A27):** `corpus-digest` on `main` 5.4 / 5.4 s, the new engine with old content 6.3 / 5.5 s,
  the PR 5.9 / 5.7 s. Within run-to-run noise.
- **Leftovers:** no Glowfly, Glow, Overcharge or Luminous Tide in `src` outside history comments, the
  tests that assert the deletion, and the consume-stacks fixtures that are out of scope (Round 1 fix 9).
  No `src/ui` or `src/app` reference.

## Decisions

- **Decide-point 1** (Duncan, 2026-10-09): approved, and the comment is fixed in this PR before the
  merge rather than carried to H2b2. `handout-r1.md` holds the one fix; Duncan runs
  `/slice-fix 4.1-H2b1 1`. **No round 2 review** (Duncan, 2026-10-09): this approval covers r2 on the
  condition Duncan checks himself before committing: `git diff --stat` shows only
  `src/engine/effect-types.ts`, `report-r2.md` and at most the phase record; the `effect-types.ts` diff
  touches only the `//` lines above `export type Hook`; `report-r2.md` lists the five gates green
  with 182 files and 1266 tests. If any of that fails, it comes back for a round 2. The carry item
  first written into H2b2's brief is removed again.
- **Decide-point 2** (Duncan, 2026-10-09): **H2c**. The Flare's compounding stays as built; the
  measured data is in H2c's "uncapped stat stacking" watch point, and any fix is per item from H2c's
  report.

## Docs edited

- `.claude/CLAUDE.md`: the hook count 16 → 17, adding `on-damage-observed` (4.1).
- `.claude/species/species-locked.md`: the A29 Glow note folded: Glow deleted in 4.1-H2b1, stacking and
  `consume-stacks` in 4.1-H2b2; the Flickerlings' rows and the coverage paragraph say 4.1-H2b1; the
  Glowfly Radiant "remains the extra sprinkle" line made historical; the Biome 2 statuses list marks Glow
  deleted.
- `.claude/CONVENTIONS.md`: `consume-stacks` deleted in 4.1-H2b2 (Glow went in H2b1); Glow in the
  statuses list deleted in 4.1-H2b1.
- `.claude/briefs/phase-4.1-implementation-plan.md`: H2c's Health remap skips the Flickerlings (already on
  20–45 since H2b1); H2c's "uncapped stat stacking" watch point gains the Flare's measured compounding
  (decide-point 2).
- `.claude/phases/4.1/H2b1/handout-r1.md`: new; the `Hook` comment fix, comment only (decide-point 1).
