# Review r2 checks, 4.5-G2

Branch `4.5-g2` at `d7a8e06` ("fix"), the fix diff from `6506537` (r1's doc commit on top of the
reviewed `820de56`); `main` at `8aef772`. Sandbox clone, `npm ci` on each tree, Node 22.22.0,
Vitest 5.0.3, `@playwright/test` 1.64.1 (the lockfile's, the current release).

## Gates on `d7a8e06`

```
npm run test (JSON reporter)   2210 tests: 2208 passed, 1 skipped, 1 timed out   (main: 2152: 2150 + 1 skipped + 1 timed out)
                               the timeout, on both trees: balance-sim "same seeds give a deep-equal report, built twice",
                               5000 ms, both suites run side by side on two CPUs; alone on the branch:
npx vitest run src/state/balance-sim.test.ts   77 passed, 1 skipped
npm run lint                   pass
npm run format:check           pass
npm run build                  pass
npx tsc -b                     pass; a type error planted in e2e/smoke.spec.ts or playwright.config.ts fails it
docs:check -- citations        PASS, 697 citations in 519 files
docs:check -- comments         PASS, 7607 comments and 1961 titles in 485 files
docs:check -- comments --quotations
                               src/engine/__corpus__/node-shims.d.ts:3 only (on main too); instanceLabels.ts gone
docs:check -- budgets          13 files, 0 over budget
npm run e2e                    1 passed (sandbox: Chromium 141 via executablePath, a scratch config
                               extending the repo's; the repo pins Playwright's Chromium 156)
```

## Test count by file, `main` → r1 → r2 (every file that differs)

```
src/app/creatureLine.test.ts        0 ->  7 ->  7
src/app/debugBoss.test.ts           0 ->  3 ->  3
src/app/instanceLabels.test.ts      0 ->  6 ->  6
src/app/partyRows.test.ts           0 ->  8 ->  9
src/app/perkRows.test.ts            0 ->  9 -> 11
src/app/refusals.test.ts            3 ->  7 ->  7
src/app/soulRows.test.ts            0 ->  6 ->  6
src/app/specSwitcher.test.ts        0 ->  5 ->  5
src/data/specializations.test.ts   12 -> 12 -> 13
src/state/store-startgame.test.ts   0 ->  0 ->  6
```

254 files on the branch, 246 on `main`: the eight new test files, none from `e2e/`. Titles gone
against `main`: only `startRun.test`'s two call-order cases, renamed with their expectations
(hand-out item 5).

## Golden policy

`git diff origin/main -- src/engine` is empty, so every `__golden__` and `__corpus__` fixture is
byte-identical. Existing store tests unchanged; `balance-sim.test.ts` changes only its
`isFunctionalPerk` import. The lockfile diff adds `@playwright/test`, `playwright` and
`playwright-core` (1.64.1) and removes nothing.

`npm audit`: 4 (1 moderate, 3 high) on `main` and the branch alike: `browserslist`,
`baseline-browser-mapping`, `brace-expansion`, `source-map-js`, all transitive under ESLint, Babel,
jsdom and Vite; none from Playwright; a fix is available for each.

## Mutations (fix diff)

Each applied in a scratch worktree, run against the named test files, then restored.

```
N1  party lines labelled over the party members only     1 failed  partyRows: a benched copy ahead of a party copy … still numbers it
N2  chosenSpecialization returns null on an unknown id    1 failed  perkRows: chosenSpecialization an unknown id throws
N3  isFunctionalPerk > 0 -> >= 0                           5 failed  specializations (1), perkRows (1), balance-sim (3)
N4  perkRows inactive loses its negation                   1 failed  perkRows: the inactive label lands on exactly the nine …
N5  startGame skips setSpec                                7 failed  store-startgame (5), startRun (2)
N6  startGame skips runScriptedIntro                       5 failed  store-startgame (4), startRun (1); balance-ci verdicts unmoved
N7  startGame runs the intro twice                         4 failed  store-startgame (3), startRun (1)
N8  startGame skips newGame                                7 failed  store-startgame (5), startRun (2)
N9  startRun passes seed 0 instead of the drawn seed       4 failed  startRun
E1  Start button's handler a no-op                         e2e failed: locator.fill timeout (the floor field never appears)
E2  App renders no Hub                                     e2e failed: getByLabel('Party slot 1') not found
E3  production base '/' (`mode === 'production' ? '/' : '/'`)
                                                           e2e PASSED  <- unpinned
```

E3: `dist/index.html` then loads `/assets/index-*.js`; `vite preview` answers
`/Depths-of-Souls/` with its `index.html` fallback and serves the assets from `/`, so the app runs.
On Pages the same build loads nothing. With a request listener added to the smoke test (every
same-origin request's path starts with the `baseURL`'s path), the branch passes and E3 fails with
the off-base requests `/assets/index-*.js`, `/assets/index-*.css`, `/favicon.svg`.

## Code claims checked by hand

- `setSpec` on the current spec clears `perkSpend` and grants nothing (its starter is owned), so
  `otherSpecs`'s comment ("picking it again would only clear the spend, which Refund all already
  does") is true.
- `labelInstances`'s citation, `spec/store.md#store-actions`, states "Nothing removes an instance
  from the collection".
