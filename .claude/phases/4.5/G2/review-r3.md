# PR review r3 — 4.5-G2: The demo, the hub

Reviewed: branch `4.5-g2` at `68face4` ("fix 2"), against `main` at `8aef772` and r2's commit
(`d7a8e06`, docs on top at `6de68a3`). Inputs: `review-r2.md`, `handout-r2.md`, `report-r3.md`,
`record.md`, `evidence/`, and the living docs on the branch.

## Verdict

**Approved.** CI's `e2e` job is green on `68face4` (decide-point 1). Both
hand-out items are built as asked, checked in the code, not on the report's word. The smoke test
now proves the Pages subpath: with the production `base` dropped to `/` it fails on the off-base
asset requests, where r2 found it passing. `record.md` lists what `perkRows` exports and states
its tests as `main` → final. The fix touches nothing under `src/`; every gate is green and the
golden policy holds.

## Real fixes

None.

## Scope and labeling

1. **Accepted as they stand:**
   - The listener uses `baseURL!`. `playwright.config.ts` always sets `baseURL`, and lint passes.
     A guard would test the config, not the build.
   - The report's run recorded no `/favicon.svg` under the mutation; mine did. The JS and CSS
     requests come before `page.goto` resolves, so the check fails on them either way and never
     depends on the favicon.
   - The report's ASSUMPTION holds: the hand-out's per-file numbers sum to +58, and my run
     reconciles them file by file against `main`.
   - The report's three spec questions were answered by r2's doc edits (`spec/store.md#newgame`,
     `spec/store.md#store-actions`, `CI_CD.md#every-pull-request-runs-the-gates`,
     `CONVENTIONS.md#three-test-tiers`); this review adds the subpath check to the last.

Nothing is left to clean up, so there is no hand-out.

## Decide-points

1. **CI's `e2e` job on `68face4` (needs you).** r2's decision was that you confirm the PR's
   `e2e` job passed. The test has changed since then, and GitHub's API isn't open to this
   session, so please check the PR shows `e2e` green on this commit before you merge. My run used
   the sandbox's Chromium 141; CI uses the Chromium 156 that Playwright 1.64.1 pins.
   **Recommendation:** merge once it's green. If it fails, paste me the failure and I'll write a
   hand-out.

## Decisions

- **Decide-point 1:** Duncan confirms the PR's `e2e` job is green on `68face4`. Approved.

## What was verified, and how

Sandbox clone, `npm ci` on each tree, Node 22.22.0, Vitest 5.0.3, Playwright 1.64.1. Details in
`phases/4.5/G2/evidence/checks-r3.md`.

- **Fix diff** (`6de68a3` → `68face4`): `e2e/smoke.spec.ts`, `record.md`, `report-r3.md` only.
- **Gates on `68face4`:** `npm run test` (JSON reporter) 2210 tests: 2209 passed, 1 skipped,
  254 files (`main` 2152 in 246); `lint`, `format:check`, `build`, `npx tsc -b`, `citations`
  (699 in 519 files) and `comments` pass; `budgets` 0 over, again after this review's edit;
  `npm run e2e` 1 passed.
- **Test count by file against `main`:** the eleven files in the evidence differ, the same as r2
  and as the record.
- **Hand-out item 1, in the code:** a `request` listener beside the `pageerror` one records the
  path of every same-origin request outside `baseURL`'s path, with the one-line comment, and the
  test asserts the list is empty beside the page-error assertion.
- **Hand-out item 2, in the record:** `perkRows`'s entry matches the file's exports
  (`INACTIVE_LABEL`, `chosenSpecialization`, `perkRows`, and `parsePerkLevelField`,
  `checkPerkField` and `setPerkFromField`, which parse through `parseFloorField`); the Tests
  section is one `main` → final line, by file; the smoke-test paragraph states the subpath check.
- **Golden policy:** every export of all 146 golden and corpus-digest fixtures deep-equal on both
  trees (1342 exports); the engine diff is empty.
- **Mutation:** the production base dropped to `/` fails `npm run e2e` on
  `/assets/index-*.js`, `/assets/index-*.css` and `/favicon.svg`; restored, it passes.
- **Leftover sweep** on `68face4`: clean (evidence).
- **Mailbox:** step files and `evidence/` only; nothing to delete.

## Docs edited

- `.claude/CONVENTIONS.md`, `CONVENTIONS.md#three-test-tiers`: the smoke test fails on any page
  request outside the subpath, and why only the requests prove the build's `base` (r2 left this
  for the approving round).
- New evidence: `.claude/phases/4.5/G2/evidence/checks-r3.md`.
