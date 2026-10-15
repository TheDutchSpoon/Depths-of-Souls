# Report r2 — 4.5-G2: The demo, the hub

Answers `handout-r1.md`. Nothing committed, nothing deleted.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 254 files, 2209 passed + 1 skipped = 2210 (record's `main` count: 2200) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean (now also checks `playwright.config.ts` and `e2e/`) |
| `npm run docs:check -- citations` | PASS, 697 citations in 519 files |
| `npm run docs:check -- comments` | PASS, 7607 comments and 1961 titles in 485 files |
| `npm run docs:check -- comments --quotations` | no `instanceLabels.ts` line |
| `npm run e2e` | 1 passed (Chromium, the production build at `/Depths-of-Souls/`) |

**Test count against `main` (2200 → 2210, +10):** `store-startgame` 0 → 6 (new file),
`specializations` +1, `perkRows` 9 → 11 (−1 "agrees with the simulator", +3
`chosenSpecialization`), `partyRows` 8 → 9. `instanceLabels`, `startRun`, `balance-sim` and every
other file are unchanged in count. ASSUMPTION: the record's 2200 is the total including the one
skipped test, since the +10 reconciles to 2210 total.

**Golden policy:** byte-identical. No golden, corpus digest, engine test or store test changed; the
three `balance-ci-*` tests pass unchanged (they are in the 2209). `git diff --stat origin/main --
src/engine` is empty. Outside `src/app` and `src/ui`, the diff is `store.ts` (+9, `startGame`),
`specializations.ts` (+6, `isFunctionalPerk`), `balance-sim.ts` (the call, the import, two header
lines, the predicate removed) and two test files.

## Per item

**1. Party line label over the whole collection.** New `partyRows.test` case, "a benched copy ahead
of a party copy in collection order still numbers it", on a real store: Brute, five summons
(seven instances), `pickParty` of `inst-6` into slot 0 (benches `inst-0`). It asserts every
occupied row's `line.label` equals its selected option's label, slot 0's line
`Cragfang Mauler #6, Lv 1`, and `benchRows` exactly `['Cragfang Mauler #1, Lv 1']`.
*Fails without it:* `partyRows` labelling its lines from `labelInstances` of the party members only
→ 1 failed in `partyRows.test.ts` (slot 0 reads "#5"); file restored.

**2. `instanceLabels.test` party-and-bench case.** Made true: four summons fill the party, the fifth
(`inst-6`) is benched (asserted not in `activeParty`), and all six brute labels are asserted
exactly `#1` … `#6` (no `arrayContaining`).

**3. Citations.** `labelInstances`'s comment cites `spec/store.md#store-actions` beside "nothing
removes an instance" and none beside the label format. `otherSpecs`'s comment says why the current
spec is left out (picking it again only clears the spend, which Refund all does) without a
citation. The `--quotations` run no longer lists `instanceLabels.ts`.

**4. `PerksSection`.** The paragraph renders `perkRefusalText('no-spec')`. The lookup moved to
`chosenSpecialization(chosenSpec)` in `src/app/perkRows.ts`: `null` → `null`, a known id → its
spec, an unknown id throws. `perkRows.test` has the three cases.
*Fails without it:* removing the throw (`if (spec === undefined && false)`) → 1 failed in
`perkRows.test.ts` (the unknown-id case); restored.

**5. `startGame`.** `GameActions.startGame({ seed, specId })` = `newGame`, `setSpec`,
`runScriptedIntro`; the three stay public. `startRun` makes the one call (`Pick<GameActions,
'startGame'>`); `runSeed` calls it. Comments: `startRun`'s doc comment, `balance-sim.ts`'s header
(both places that named the sequence); a grep of `src/` for the sequence finds no other. The
header of `src/app/newGame.ts` says `startRun.ts` is "the one path that starts a game", still true.
- New `store-startgame.test.ts` (6): for each of the three specs the state equals the three calls by
  hand (collection, party, spec, seed, run counter, next ordinal, soul progress, and the owned
  creatures are `<spec>-starter` then `unicorn`); a second start resets a played game; an unknown
  spec throws; a refused seed throws.
- `startRun.test.ts` changed only in the spy store (records `startGame(<seed>, <spec>)`) and the
  call-order expectations: the "makes exactly the simulator-run-start calls" case is now "makes the
  one startGame call", and the blank-seed case's `calls[0]`/`calls[3]` checks are one `toEqual` of
  the two `startGame` calls. Its real-store equivalence case is untouched.
- *Fails without it:* `startGame` without `setSpec` → 5 of 6 fail in `store-startgame.test.ts`;
  `setSpec` after `runScriptedIntro` → 5 of 6 fail; `startRun` not calling `startGame` → 4 fail in
  `startRun.test.ts`. All restored.

**6. `isFunctionalPerk`.** Moved unchanged to `src/data/specializations.ts`; `balance-sim.ts`
imports it (its now-unused `resolvePerkEffects` and `PerkDef` imports are gone). `perkRows.ts`
deletes `isInactivePerk`; `inactive` is `!isFunctionalPerk(perk)`. `specializations.test.ts` gains
"isFunctionalPerk is false on exactly the known-inert perks" (all perks of all specs).
`balance-sim.test.ts` changed only its import line; its body is the same. `perkRows.test`'s
"agrees with the simulator" case is gone; the exact-nine-ids case stays, now through `perkRows`
(`row.inactive`).
*Fails without it:* `> 0` → `>= 0` fails 1 in `specializations.test.ts` and 1 in `perkRows.test.ts`;
restored.

**7. Smoke test.**
- `@playwright/test` as a dev dependency, version taken by `npm install -D` (the lockfile pins it).
  No other new dependency. `npm install` reported 4 vulnerabilities (1 moderate, 3 high); I did not
  run `npm audit` or `npm audit fix` and don't know whether they predate this change.
- `playwright.config.ts`: `testDir: 'e2e'`, one Chromium project, `webServer` running
  `npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`,
  `baseURL` `http://127.0.0.1:4173/Depths-of-Souls/`. `npm run e2e` is `playwright test`.
- `e2e/smoke.spec.ts`: Brute radio, seed field `10`, Start, floor field `1`, Descend, then
  "Floor 1:" text visible, the `complementary` (side panel) containing "Last floor 1", `Party slot 1`
  and `2` not empty, `Party slot 3` empty, and no `pageerror`. Labels and roles only; no fight
  outcome asserted.
- `tsconfig.node.json` includes `playwright.config.ts` and `e2e`; `.gitignore` gains
  `test-results/` and `playwright-report/`. Vitest's globs are untouched: `npm run test` runs 254
  files, none from `e2e/`.
- CI: `e2e` job in `deploy.yml` (same triggers; checkout with `persist-credentials: false`, Node 24
  with npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npm run e2e`);
  `deploy` is `needs: [build, e2e]`. Nothing else changed.
- Locally: `npx playwright install chromium` (browser cache outside the repo).
- *Mutation:* the Start button's handler replaced by a no-op (`onClick={() => void start}`) → `npm run e2e`
  failed (`locator.fill: Test timeout of 30000ms exceeded`, the floor field never appeared); restored
  and the test passes again. (A first try that left `start` unused failed earlier, at the
  build step inside `webServer`, on `noUnusedLocals`; that shows the web server fails loudly, not
  the test, so I reran with a handler that compiles.)

**8. Record.** `record.md` updated: the run start, the predicate move, the review fixes, the smoke
test and CI job, the new test file, the counts, and the golden-policy line.

## Changed test files

- `src/app/instanceLabels.test.ts`: one case made true (item 2).
- `src/app/partyRows.test.ts`: one case added (item 1).
- `src/app/perkRows.test.ts`: import changes; `isInactivePerk` use replaced by `row.inactive`;
  "agrees with the simulator" removed; `chosenSpecialization` describe added (3).
- `src/app/startRun.test.ts`: spy store and call-order expectations only (item 5).
- `src/data/specializations.test.ts`: one case and an import added (item 6).
- `src/state/balance-sim.test.ts`: the `isFunctionalPerk` import moved (item 6).
- `src/state/store-startgame.test.ts`: new (item 5).

## Spec questions

- `phases/4.5/brief.md` still lists the start as `newGame({ seed })` → `setSpec` →
  `runScriptedIntro()` in its start-screen section (around line 404); it is now `startGame`. The
  design agent decides whether to restate it.
- `CONVENTIONS.md#balance-simulator` / `spec/store.md#store-actions`: `startGame` is a new public
  store action; the store-actions list needs it.
- `CI_CD.md` and `CONVENTIONS.md#three-test-tiers` need the smoke test (the brief says the PR review
  writes it).

## Content changes

None.

## To delete

None. `dist/`, `test-results/` and the Playwright browser cache are gitignored or outside the repo.
