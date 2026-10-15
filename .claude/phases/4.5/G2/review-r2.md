# PR review r2 — 4.5-G2: The demo, the hub

Reviewed: branch `4.5-g2` at `d7a8e06` ("fix"), against `main` at `8aef772` and r1's commit
(`820de56`, docs on top at `6506537`). Inputs: `review-r1.md`, `handout-r1.md`, `report-r2.md`,
`record.md`, `evidence/`, and the living docs on the branch.

## Verdict

**Fixes, one item and one cleanup.** Every hand-out item is built as asked and checked in the
code, not on the report's word: the party-line pin fails on r1's mutation, `startGame` is the one
run start for the demo and the simulator, `isFunctionalPerk` has one home in `src/data`, the
`PerksSection` text and lookup moved to `src/app`, both citations now state what their comments
say, and the smoke test runs in CI with the deploy waiting on it. Golden policy holds: the engine
diff is empty, no existing store test changes, and all nine mutations of the fix diff are caught
by the test the fix names. One mechanism is unpinned (item 1), and the record still names a
deleted function (item 2).

## Real fixes

1. **The smoke test doesn't prove the Pages subpath** (`handout-r2.md` item 1). The config serves
   the production build at `/Depths-of-Souls/` "so the test loads what deploys". With the
   production `base` dropped to `/` (the build that would load a blank page on Pages), **the
   smoke test still passes**: `vite preview` answers `/Depths-of-Souls/` with its `index.html`
   fallback and serves the assets from `/`, so the app runs. Dropping the base is the regression
   this test exists to catch before a deploy. The build followed my hand-out to the letter; the
   hand-out asked for the subpath and not for a check that the page uses it. The fix: fail on any
   same-origin request outside the `baseURL`'s path. I ran it in the sandbox: it passes on the
   branch, and with the base dropped it fails on `/assets/index-*.js`, `/assets/index-*.css` and
   `/favicon.svg`.

## Scope and labeling

2. **`record.md` still lists `isInactivePerk`** in `perkRows`'s exports (item 2), though the same
   record says it is dropped; it doesn't list `chosenSpecialization` there. Its Tests section reads
   as two rounds of history; a record states the outcome: `main` → final, by file.
3. **Accepted as they stand:**
   - The report's ASSUMPTION on the counts is right: r1's 2200 is 2199 passed + 1 skipped, and the
     branch's 2210 reconciles file by file (`evidence/checks-r2.md`).
   - `startRun.test`'s two call-order cases are renamed along with their expectations, as item 5
     allowed; its real-store case is untouched.
   - `store-startgame.test` compares the fields the hand-out named, not the whole state. Every
     mutation of `startGame` I tried (skip a call, swap the order, run the intro twice) fails it.
   - The four `npm audit` findings are on `main` too, all transitive under ESLint, Babel, jsdom and
     Vite; Playwright adds none (decide-point 1).
   - The report's three spec questions are answered by this review's doc edits (below).

## Decide-points

1. **The four `npm audit` findings.** They predate G2 (same four on `main`): `browserslist`,
   `baseline-browser-mapping`, `brace-expansion`, `source-map-js`, all dev tooling, none shipped to
   the site, a fix available for each. **Recommendation:** not in G2, whose lockfile change should
   stay "adds Playwright, removes nothing". A one-commit chore on `main` after the merge
   (`npm audit fix`, then the gates); say the word and I write it up as a small slice.
2. **CI's `e2e` job, before merge (needs you).** GitHub's API isn't open to this session, so I
   can't see the PR's checks. G2's "Done when" asks for the smoke test to pass in CI too: please
   confirm the PR shows `e2e` green. My run used the sandbox's Chromium 141; CI and your machine
   use the Chromium 156 that Playwright 1.64.1 pins.

## Decisions

- **Decide-point 1:** no chore slice. A Dependabot PR already open on `main` takes the dependency
  updates and merges after G2 (Duncan). If `npm audit` on `main` still lists any of the four after
  it, they are transitive pins it didn't reach, and `npm audit fix` closes them.
- **Decide-point 2:** Duncan confirms the PR's `e2e` job passed in CI.
- Everything else in this review stands as written (Duncan agrees).

## What was verified, and how

Sandbox clone, `npm ci` on each tree, Node 22.22.0, Vitest 5.0.3, Playwright 1.64.1. Details in
`phases/4.5/G2/evidence/checks-r2.md`.

- **Gates on `d7a8e06`:** `npm run test` (JSON reporter) 2210 tests: 2208 passed, 1 skipped, and
  one 5 s timeout in `balance-sim.test` that `main` shows too, because I ran both suites side by
  side on two CPUs; the file alone passes (77 + 1 skipped). `lint`, `format:check`, `build`,
  `npx tsc -b` (and it fails on a type error planted in `e2e/` or `playwright.config.ts`),
  `citations` (697 in 519 files), `comments` pass; `--quotations` no longer lists
  `instanceLabels.ts`; `budgets` 0 over. `npm run e2e` 1 passed.
- **Test count by file against `main`:** 2152 → 2210; only the ten files in the evidence differ,
  matching the report. Vitest collects 254 files, none from `e2e/`.
- **Hand-out items, in the code:** item 1's case asserts each occupied row's line against its
  option, slot 0 "#6" and the bench "#1"; item 2's case benches `inst-6` and asserts all six labels
  exactly; item 3's citations read right (`#store-actions` states "Nothing removes an instance";
  `setSpec` on the current spec only clears the spend, so `otherSpecs`'s comment is true);
  item 4's component calls `chosenSpecialization` and `perkRefusalText('no-spec')`; item 5's
  `startGame` is the three calls in order, `startRun`'s `Pick` is `'startGame'`, `runSeed` calls it,
  and the comments that named the sequence follow; item 6 moved `isFunctionalPerk` unchanged and
  `balance-sim.test` changes only its import; item 7's config, spec file, scripts, `tsconfig`,
  `.gitignore` and workflow match the hand-out (`e2e` on the workflow's triggers, `deploy` needs
  `build` and `e2e`).
- **Golden policy:** the engine diff is empty; no existing store test changes; the lockfile adds
  three Playwright packages and removes nothing.
- **Mutations:** nine on the fix diff, each caught by its named test; three on the smoke test: a
  dead Start button and a missing hub fail it, a dropped production base doesn't (item 1).
- **Leftover sweep** on `d7a8e06`: `isInactivePerk`, "agrees with the simulator" and the
  three-call start sequence appear nowhere in `src/` or the living docs except where this review
  rewrote them (`spec/run.md#scripted-intro`, `phases/4.5/brief.md`'s start screen).
- **Mailbox:** step files and `evidence/` only; nothing to delete.

## Docs edited

- `.claude/spec/store.md`: `spec/store.md#newgame` gains `startGame` as the one run start;
  `spec/store.md#store-actions` lists it.
- `.claude/spec/run.md`, `spec/run.md#scripted-intro`: `startGame` runs the intro after `setSpec`.
- `.claude/spec/progression.md`, `spec/progression.md#inert-perks`: `isFunctionalPerk` is the one
  test of a functional perk.
- `.claude/CI_CD.md`: `CI_CD.md#every-pull-request-runs-the-gates` gains the `e2e` job;
  `CI_CD.md#deploy-only-from-main-only-if-tests-pass` gets four jobs, `deploy` needing `build` and
  `e2e`.
- `.claude/CONVENTIONS.md`: `CONVENTIONS.md#three-test-tiers` states the smoke test as built;
  `CONVENTIONS.md#local-runs-match-cis-toolchain` gains the one-time Chromium install.
- `.claude/phases/4.5/brief.md`: the start screen's Start runs `startGame`; store use names
  `newGame` and `runScriptedIntro` as reached through `startGame`; the hub's inactive label reads
  `isFunctionalPerk`.
- New evidence: `.claude/phases/4.5/G2/evidence/checks-r2.md`.
- At the approving round: `CONVENTIONS.md#three-test-tiers` gains the subpath check once item 1 is
  built.
