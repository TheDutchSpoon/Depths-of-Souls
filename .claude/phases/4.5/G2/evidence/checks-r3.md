# Review r3 checks, 4.5-G2

Branch `4.5-g2` at `68face4` ("fix 2"); the fix diff from `6de68a3` (r2's doc commit on top of
the reviewed `d7a8e06`); `main` at `8aef772`. Sandbox clone, `npm ci` on each tree, Node 22.22.0,
Vitest 5.0.3, `@playwright/test` 1.64.1 (the lockfile's).

## The fix diff

`git diff --stat 6de68a3 68face4`: `e2e/smoke.spec.ts` (+12), `phases/4.5/G2/record.md`,
`phases/4.5/G2/report-r3.md`. Nothing under `src/`, no config, workflow or lockfile change.

## Gates on `68face4`

```
npm run test (JSON reporter)   2210 tests: 2209 passed, 1 skipped, 0 failed, 254 files
                               (main: 2152: 2151 passed, 1 skipped, 246 files; run one after the other, no timeout)
npm run lint                   pass
npm run format:check           pass
npm run build                  pass
npx tsc -b                     pass
docs:check -- citations        PASS, 699 citations in 519 files
docs:check -- comments         PASS, 7607 comments and 1961 titles in 485 files
docs:check -- budgets          13 files, 0 over budget (again after this review's CONVENTIONS edit)
npm run e2e                    1 passed (sandbox: Chromium 141 via executablePath, a scratch config
                               extending the repo's; the repo pins Playwright's Chromium 156)
```

## Test count by file, `main` → `68face4` (every file that differs)

```
src/app/creatureLine.test.ts        0 ->  7
src/app/debugBoss.test.ts           0 ->  3
src/app/instanceLabels.test.ts      0 ->  6
src/app/partyRows.test.ts           0 ->  9
src/app/perkRows.test.ts            0 -> 11
src/app/refusals.test.ts            3 ->  7
src/app/soulRows.test.ts            0 ->  6
src/app/specSwitcher.test.ts        0 ->  5
src/app/startRun.test.ts           18 -> 18   two titles renamed (r2, hand-out r1 item 5)
src/data/specializations.test.ts   12 -> 13
src/state/store-startgame.test.ts   0 ->  6
```

The same as r2 and as `record.md`'s Tests section; the hand-out's per-file numbers sum to +58.

## Golden policy

A throwaway test importing every `src/**/__golden__/*.fixture.ts` and
`src/engine/__corpus__/corpus-digest.fixture.ts` with `import.meta.glob`, serialising every export
(Maps and Sets included), on both trees: 146 files, 1342 exports, the two dumps byte-identical.
`git diff origin/main 68face4 -- src/engine` is empty.

## Mutation (the fix diff's one mechanism)

```
E3  production base '/' (`mode === 'production' ? '/' : '/'`)
    r2: e2e PASSED (unpinned)
    r3: e2e FAILED on expect(offBaseRequests).toEqual([]):
        ["/assets/index-Bor5dKYK.js", "/assets/index-BcMqqfWy.css", "/favicon.svg"]
```

Restored with `git checkout -- vite.config.ts`. The JS and CSS requests are made before
`page.goto` resolves, so the check never depends on the favicon request, which the report's run
(`npm run e2e`, Playwright's pinned Chromium) didn't record and this one did.

## Leftover sweep on `68face4`

Over `src/` and `.claude/` but `phases/` and `archive/`: `isInactivePerk` and "agrees with the
simulator" appear nowhere; the three-call start sequence appears only in `startGame`'s own doc
comment (`src/state/store.ts`) and its test's header (`store-startgame.test.ts`).
