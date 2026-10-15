# Report r3 — 4.5-G2: The demo, the hub

Answers `handout-r2.md`. Nothing committed, nothing deleted. Nothing under `src/` changed.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 254 files, 2209 passed + 1 skipped = 2210 (unchanged from r2) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 699 citations in 519 files |
| `npm run docs:check -- comments` | PASS, 7607 comments and 1961 titles in 485 files |
| `npm run e2e` | 1 passed (with the new assertion, and again after the mutation was restored) |

**Golden policy:** byte-identical. No golden, corpus digest, engine test, store test or `src/` file
changed; the test count is the same as r2. The only code file touched is `e2e/smoke.spec.ts`.

## Per item

**1. Subpath check.** `e2e/smoke.spec.ts` takes the `baseURL` fixture, parses it, and a
`page.on('request', …)` listener beside the `pageerror` one records the `pathname` of every request
whose `origin` equals the preview's and whose `pathname` doesn't start with the `baseURL`'s path. The
test asserts that list is empty next to the page-error assertion. A one-line comment says the preview
serves `index.html` for any path, so only the requests show the build's `base`.

*Mutation* (in place, restored after): `vite.config.ts` base set to
`mode === 'production' ? '/' : '/'`. `npm run e2e` failed on
`expect(offBaseRequests).toEqual([])` with `["/assets/index-Bor5dKYK.js",
"/assets/index-BcMqqfWy.css"]`. No `/favicon.svg` entry: the test reached the assertion before that
request was recorded (or it was not issued in that window). Restored the original line; `npm run
build` then produced the same hashed asset names as before the mutation, and `npm run e2e` passes.

**2. `record.md`.** The `perkRows` entry lists `INACTIVE_LABEL`, `chosenSpecialization`, `perkRows`,
the level field through `parseFloorField`. The Tests section is one `main` → final line: 2152 → 2210
(+58; 2209 passed, 1 skipped) by file (creatureLine 0 → 7, debugBoss 0 → 3, instanceLabels 0 → 6,
partyRows 0 → 9, perkRows 0 → 11, refusals 3 → 7, soulRows 0 → 6, specSwitcher 0 → 5,
specializations 12 → 13, store-startgame 0 → 6), with the `npm run e2e` test outside it. The
smoke-test paragraph states the subpath check.

ASSUMPTION: the hand-out's per-file numbers sum to 58 (7+3+6+9+11+4+6+5+1+6); I wrote them as given.

## Spec questions

Unchanged from r2: `phases/4.5/brief.md` still lists the start as `newGame` → `setSpec` →
`runScriptedIntro` (now `startGame`); `spec/store.md#store-actions` needs `startGame`; `CI_CD.md` and
`CONVENTIONS.md#three-test-tiers` need the smoke test.

## Content changes

None.

## To delete

None.
