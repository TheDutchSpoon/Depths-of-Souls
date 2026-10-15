# Hand-out r1 — 4.5-G2: The demo, the hub

Fixes and additions on branch `4.5-g2`. Re-read `phases/4.5/brief.md` first: the G2 row of the
slice table, `phases/4.5/brief.md#demo-golden-rule`,
`phases/4.5/brief.md#one-run-start-and-one-perk-predicate` and
`phases/4.5/brief.md#an-end-to-end-smoke-test` are new or changed, and `phases/4.5/G2/brief.md`
now lists them.

**Golden policy: still byte-identical.** No golden, no corpus digest, no engine test and no store
test changes. The three `balance-ci-*` tests pass unchanged: they are the proof that the
simulator's run start (item 5) and perk filter (item 6) behave exactly as before. Existing tests
change only where this hand-out says so (items 5 and 6), and the report lists every changed test
file with what changed.

Answer with `report-r2.md`: what changed per item, for each new or changed mechanism the test that
fails without it (run it and say what failed), the test count by file against `main`, and the
gates below.

## A. Fixes from the review

1. **Pin that a party line's label counts over the whole collection.** Today `partyRows` can build
   its lines' labels from `labelInstances` over the party members only and all 2200 tests pass:
   no existing case has a benched copy ahead of a party copy in collection order. Add a
   `partyRows.test` case on a real store:
   - `startRun` with Brute, five summons of `brute-starter` (seven instances; the last copy is
     benched), then `pickParty` the benched copy into slot 0, which benches the first copy
     (`inst-0`).
   - Assert, for every occupied row, that `row.line.label` equals the label of that row's selected
     option; and the literals: slot 0's line is "Cragfang Mauler #6, Lv 1", and `benchRows` gives
     exactly "Cragfang Mauler #1, Lv 1".
   - It must fail when `partyRows` labels its lines from `labelInstances` of the party members
     alone (slot 0's line then reads "#5"). Run that mutation and report it.
2. **`instanceLabels.test`, "the ordinal counts over the party and the bench together":** its
   comment says a copy is benched, but its one summon lands in a free party slot (the party is
   `inst-0, inst-1, inst-2` afterwards). Make it true (fill the party so a copy goes to the bench,
   and assert both labels exactly, not with `arrayContaining`), or, if item 1 covers it, retitle it
   and fix the comment to say what it checks.
3. **Two comment citations point at rules that don't say what the comment says**
   (`CONVENTIONS.md#comment-why-not-what`: a citation names a rule that states the claim beside it).
   - `src/app/instanceLabels.ts`, `labelInstances`'s doc comment: "nothing removes an instance" is
     in `spec/store.md#store-actions`, not `spec/store.md#collection-shape`. Cite `#store-actions`
     beside that clause, and put no citation beside the "#1" sentence: the label format is no spec
     rule. `npm run docs:check -- comments --quotations` must no longer list `instanceLabels.ts`.
   - `src/app/specSwitcher.ts`, `otherSpecs`'s doc comment: `spec/progression.md#swapping-specialization`
     says what a swap does, not that picking the current spec again isn't one. Say why the current
     spec is left out (picking it again would only clear the spend, which **Refund all** already
     does) without that citation, or cite the section only for what it states.
4. **`src/ui/PerksSection.tsx` holds a refusal string and a lookup of its own.** Components stay
   thin: every derived value and refusal text is an `src/app` helper with a test.
   - The "Pick a specialization first." paragraph is a second copy of `perkRefusalText('no-spec')`:
     render the helper's text.
   - `SPECIALIZATIONS_BY_ID.get(game.chosenSpec)` treats an unknown non-null `chosenSpec` as no
     spec. Move the lookup into `src/app/perkRows.ts` as a helper that returns `null` for a `null`
     `chosenSpec` and throws on an unknown id, with a test of all three cases; the component calls
     it.

## B. Two rules leave the app

5. **One store action starts a game** (`phases/4.5/brief.md#one-run-start-and-one-perk-predicate`).
   - `GameActions` gains `startGame({ seed, specId })`: it calls `newGame({ seed })`, then
     `setSpec(specId)`, then `runScriptedIntro()`, in that order, and throws where those throw.
     The three actions stay public.
   - `src/app/startRun.ts` keeps parsing and drawing the seed and then makes **one** call,
     `startGame`. Its `Pick<GameActions, …>` narrows to `'startGame'`.
   - `runSeed` in `src/state/balance-sim.ts` calls `startGame` instead of the three calls.
   - Tests: a new store test that `startGame` leaves the same state as the three calls by hand
     (spec, starter, Unicorn, the intro's XP, the run counter), for each spec; and that it throws
     on an unknown spec. `src/app/startRun.test.ts`'s spy store changes to record the one
     `startGame` call: that file's call-order expectations change, nothing else in it, and the
     report says so.
   - Comments that name the three-call sequence as the start path follow it: `startRun.ts`'s doc
     comment ("the calls and their order are the balance simulator's run start") and
     `balance-sim.ts`'s header (its `newGame({ seed })`, `setSpec`, `runScriptedIntro` line). Grep
     `src/` for others.
6. **One home for "is this perk functional"**
   (`phases/4.5/brief.md#one-run-start-and-one-perk-predicate`).
   - `isFunctionalPerk` moves, unchanged, from `src/state/balance-sim.ts` to
     `src/data/specializations.ts`, beside `resolvePerkEffects`. `balance-sim.ts` imports it.
   - `src/app/perkRows.ts` deletes `isInactivePerk`; a row's `inactive` is
     `!isFunctionalPerk(perk)`.
   - `specializations.test.ts` gains a case: `isFunctionalPerk` is false on exactly the
     `KNOWN_INERT_PERK_IDS` and true on every other perk of every spec.
   - `balance-sim.test.ts` changes only its import of `isFunctionalPerk`; its test body stays.
     `perkRows.test`'s "agrees with the simulator" case goes (one predicate can't disagree with
     itself); its exact-nine-ids case stays, now through `perkRows`.

## C. The end-to-end smoke test

7. **Playwright and one smoke test** (`phases/4.5/brief.md#an-end-to-end-smoke-test`). Every choice
   below is settled; anything this leaves open is an ASSUMPTION in the report, not a guess.
   - `@playwright/test` as a dev dependency, the current release, pinned by the lockfile. No other
     new dependency.
   - `playwright.config.ts` at the root: `testDir: 'e2e'`, one Chromium project, and a `webServer`
     that runs `npm run build` and then `vite preview` on a fixed port with `--strictPort`;
     `baseURL` is the preview's URL **including the Pages subpath** `/Depths-of-Souls/` (the
     production build's `base` in `vite.config.ts`), so the test loads what deploys.
   - `npm run e2e` runs `playwright test`.
   - `e2e/smoke.spec.ts`, one test, through accessible names (labels and roles), no CSS paths:
     open the app; start as Brute with seed 10; descend floor 1; then see a floor result line
     starting "Floor 1:", the side panel's last floor at 1, and the hub's party slots 1 and 2
     filled and slot 3 empty. It fails on any uncaught page error. It asserts no fight outcome, so
     a balance change can't break it.
   - `tsconfig.node.json`'s `include` gains `playwright.config.ts` and `e2e`, so `npx tsc -b`
     checks them; ESLint and Prettier already cover them. Vitest's `include` globs stay as they are
     (`src/**` and `scripts/**`), so `npm run test` collects nothing new from `e2e/`: show the
     count unchanged by that.
   - `.gitignore` gains Playwright's output folders (`test-results/`, `playwright-report/`).
   - **CI:** `.github/workflows/deploy.yml` gains an `e2e` job on the same triggers as the others
     (every pull request, every push to `main`, manual runs): checkout without persisted
     credentials, Node 24 with the npm cache, `npm ci`,
     `npx playwright install --with-deps chromium`, `npm run e2e`. `deploy` needs both `build` and
     `e2e`. Nothing else in the workflow changes.
   - Locally the test runs on Playwright's Chromium (`npx playwright install chromium`, once,
     outside the repo).
   - Mutation: make the smoke test's floor field descend nothing (or break the Start button's
     handler in a scratch copy) and show `npm run e2e` failing; restore.

## D. Report and record

8. `record.md`: the new files, the store action, the moved predicate, the smoke test and its CI
   job, and the test counts. `report-r2.md` lists every changed test file.

## Gates

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `npm run docs:check -- comments`, and `npm run e2e`. No browser
click-through re-run beyond the smoke test: nothing in A or B changes what the hub shows.
