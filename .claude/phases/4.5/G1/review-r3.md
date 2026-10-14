# PR review r3 — 4.5-G1: The demo, descent loop and viewer

Reviewed: branch `4.5-g1` at `846d554` ("fix 2"), against `main` at `1c9f587` and round 2's
`4a89ff0`. Inputs: `kickoff.md`, `plan.md`, `plan-review.md`, `plan-handout-r2.md`,
`review-r2.md`, `handout-r2.md`, `report-r3.md`, `record.md`, and the living docs on the branch.

## Verdict

**Approved.** Round 2's one blocker is gone: `ae069f9` deletes the five obsolete `src/app` files,
and every gate is green on the commit as pushed. Each item of `handout-r2.md` is in the tree and,
where it is a pin, the pin fails without its mechanism. The fix diff (`4a89ff0..846d554`) touches
two `src/app` test files and the mailbox, nothing under `src/engine`, `src/state`, `src/data` or
`src/ui`. One wrong number in `record.md` is corrected by this review (Docs edited), so no
cleanup is left and there is no hand-out.

## Real fixes

None.

## Scope and labeling

- **`record.md`'s test delta was off by one.** C3 moved the total to 2152 but left "158 more than
  `main`"; 2152 − 1993 is 159. A one-figure fix in the slice's own unmerged record, so this
  review makes it rather than sending a round for it. If you'd rather the record stay the coding
  agent's alone, revert the line and it becomes a one-line hand-out.

## Decide-points

None. Nothing is over budget, the report has no ASSUMPTION or spec question, and the slice
changes no content.

## What was verified, and how

Sandbox clone, `npm ci` on each tree, Node 22.22.0, Vitest 5.0.3 (the lockfile's).

- **Handout r2's precondition:** `descendFlow.ts`, `descendFlow.test.ts`, `perkPoints.ts`,
  `perkPoints.test.ts` and `registries.ts` are absent at `846d554` (deleted in `ae069f9`), and the
  gates below ran on the commit as pushed, nothing moved aside.
- **Gates on `846d554`:** `npm run test` (JSON reporter) 2152 tests, 2151 passed, 1 skipped
  (`balance-sim`'s "prints the report", skipped on `main` too), 246 files; `lint`,
  `format:check`, `build`, `npx tsc -b` clean; `docs:check -- citations` PASS (691 in 498 files),
  `-- comments` PASS (7569 comments, 1887 titles), `-- budgets` 0 over. I couldn't read the PR's
  CI from here (no GitHub API access in this session); it runs the same gates.
- **Test counts, file by file:** `main` 1993 in 229 files. 19 files differ, all as round 2
  measured them but `descentText.test.ts`, 8 → 9: 17 new files, `newGame.test.ts` 3 → 2,
  `store.test.ts` 35 → 38. Every other file's count equals `main`'s.
- **Golden policy:** every export of all 145 `__golden__/*.fixture.ts` (1341 exports, shared
  registries included), imported on both trees through `import.meta.glob` and serialized:
  byte-identical to `main`. No `__golden__` or corpus file in `1c9f587..846d554`; the corpus
  digest test passes with its fixture unchanged. Outside `src/app`, `src/ui` and `.claude`, the
  diff against `main` is the same 12 files round 2 listed.
- **C1:** `startRun.test.ts` is retitled and its body unchanged. The new title's two claims are
  pinned: with `startRun`'s bound at `MAX_RUN_SEED + 1` the test fails (it accepts
  4294967296), and at `MAX_RUN_SEED - 1` it fails too (it refuses 4294967295).
- **C2:** the new case passes a hand-built outcome with 250 points. Round 2's surviving mutation
  M18 (`bossResultLine` printing a literal `+100`) now fails it: `descentText.test` 1 failed,
  8 passed; corpus digest unaffected. The expected name is read from `BIOMES`, not typed in.
- **C3:** `record.md`'s **Deleted** names the five files and where their rules went (checked:
  `data/registries.ts`, the store's `perkPointSummary`, and the outcome's `bossFirstCleared` and
  `perkPointsGained`); **Not verified** points at `click-through-r2.md` and `-r1.md`. The test
  delta is corrected above.
- **Browser:** not rerun. The fix diff changes only tests and the mailbox; round 2's
  click-through covers the code as it stands.
- **Leftover sweep** on `846d554`, over `src/` and the living docs, for every name the slice
  removed or moved (`floorInfo`, `FloorInfo`, `FloorInfoContext`, `runDescent`, `DescentRun`,
  `descendFlow`, `DEMO_REGISTRIES`, `app/registries`, `app/perkPoints`, `MAX_SEED`,
  `bossesBefore`, `bossesAfter`, `CombatDemo`, `startNewGame`, "Never imported by src/ui",
  "restated seed") and for a hard-coded boss-point figure in `src/app` and `src/ui`: no hit.
  (`bossesAfter` in `store.ts` is the store's own local; the two "Never imported by" lines are
  in `engine/__fixtures__` and are true there.)
- **Mailbox:** step files, `brief.md`, `record.md`, and `evidence/` (r1 and r2). Nothing to
  delete.

## Docs edited

- `.claude/phases/4.5/G1/record.md`, **Shape**: "158 more than `main`" → "159 more" (1993 → 2152).
