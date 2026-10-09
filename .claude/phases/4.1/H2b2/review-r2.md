# PR review r2 — Phase 4.1 — Slice H2b2: status rules

Reviews `report-r2.md` against `handout-r1.md` and `review-r1.md`. Branch `phase-4.1-slice-h2b2`
at `7bdc981` ("fix 1"), cloned and run in my own sandbox against `9dcdc14` (r1's build) and
`origin/main` (`501a5de`).

## Verdict: approved

Both r1 gaps are closed. Each mutation from the hand-out now fails a named non-digest test, and
nothing else in the PR changed: the code diff against `9dcdc14` is two new golden files and 60 added
lines in `status-snapshot.test.ts`, with no `src/engine` or `src/data` source, existing fixture or
corpus digest touched. No hand-out this round.

## Real fixes

None.

## Scope and labeling (no action needed)

- **The report skipped two checks** (the before-the-golden baseline for fix 1, and the
  import-and-deep-compare of existing fixtures) and said so. I ran both (below); they hold. Its
  "by construction" argument for the fixtures was sound anyway: `git diff` shows no existing fixture
  touched, which is a byte-level check and stronger than the deep-compare.
- **"Vulnerability ×1.5 once" vs. ×1.5 on both ticks:** consistent. "Once" in the content docs
  means it never compounds, not that a hit consumes it (`STATUS_REGISTRY.vulnerability` is a plain
  `damage-modifier`, ×1.5 taken, duration 3). Still present at B's second turn end, as the golden
  has it.
- **CI:** still not readable from this session (GitHub API not enabled). Please glance that CI is
  green on `7bdc981`; my local run of all five gates is.

## Decide-points

None. r1's one decide-point (land with DoT at minimum-1 until H2c) was settled by Duncan and is
recorded; nothing in r2 reopens it.

## What was verified, and how

**Gates** (fresh `npm ci`; Vitest 5.0.3 = the lockfile; Node 22): `npm run test` 193 files,
1297 tests (1296 passed + 1 skipped); `lint`, `format:check`, `build`, `npx tsc -b` clean.

**Test count**, file by file with `vitest --reporter=json` on both trees: `9dcdc14` 192 files /
1295, `7bdc981` 193 / 1297. The only per-file deltas are `golden-h2b2-tick-taken-factors.test.ts`
(new, 1) and `status-snapshot.test.ts` 23 → 24. Exactly the report's table.

**Unchanged things:** `git diff --name-status 9dcdc14 7bdc981 -- src` lists only `A` (the two new
golden files) and `M status-snapshot.test.ts` (additions only, 0 deletions). So every existing
golden's expected exports and `corpus-digest.fixture.ts` are byte-identical to `9dcdc14`.

**Fix 1 golden, arithmetic recomputed:** potency ⌊100 × 20 / 100⌋ = 20; affinity ×1 (both
vitality). R1: 20 × 1.5 − 0.2 × 20 = 26 → B 100 → 74. R2, B Defending (Defence 20 × 1.5 = 30,
`DEFEND_TAKEN_FACTOR` 0.65 from `config.ts`): 20 × 0.65 × 1.5 − 6 = 13.5 → 13 → B 61. The
floating-point product is exactly 19.5 in every order, so `raw 13.5` is not an artefact. Values
without the bearer's factors (16, 7) also check. RNG-free; seed inert as stated. The setup applies
the real `vulnerability` from `STATUS_REGISTRY`, as the hand-out asked.

**Fix 2 test, read:** `h2b2-seeder` validates with `validateStatusDef`; its snapshot is
`{A, vitality, 10}` (⌊50 × 20 / 100⌋); firing B's `on-turn-start` produces Poison
`{B, vitality, 4}` (⌊20 × 20 / 100⌋). The two snapshots differ in both applier and potency, so
either half of an inheritance would be caught. If the trigger didn't fire, `statusOn` would find no
Poison and fail, so the test can't pass vacuously.

**Mutations** (sandbox, one at a time, the **full suite** each, restored after):

| Mutation | Fails |
|---|---|
| tick drops the bearer's status/perk factors (`takenFactors: [...defendFactors]`) | `golden-h2b2-tick-taken-factors`, `corpus-digest` (2 of 1297) |
| the same, with the new golden's test removed (r1 baseline) | `corpus-digest` only (1 of 1296), as r1 found |
| pass-on widened to any status (`context.statusId !== undefined`) | `status-snapshot.test.ts` "a status X whose effect applies a DIFFERENT status…" only (1 of 1297) |

**Phase record:** the two mutation rows, the test-count line (193 files, 1297) and the eleventh
`golden-h2b2-*` in the file list are present and correct. No living or content doc edited by the
coding agent, as the hand-out required.

## Docs edited

None. This round made no decisions, and the PR adds no content.
