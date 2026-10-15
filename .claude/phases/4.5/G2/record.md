# Record — 4.5-G2: The demo, the hub

The second half of the run-loop demo: the hub beside G1's run screen and side panel, the one run
start, the one perk predicate and the end-to-end smoke test. It changes no engine code and
restates no game rule; the store and data changes are two additive exports (below).

## Files changed

**Changed:** `src/app/refusals.ts` (`summonRefusalText`, `partySlotRefusalText`,
`perkRefusalText`), `src/app/refusals.test.ts` (four cases added, none changed), `src/app/App.tsx`
(the hub is a sibling of the run screen, shown after Start; New game sets the UI state back to the
start screen and never calls the store), `src/index.css` (the hub column shares the run column's
`flex: 1; min-width: 0`).

**New, `src/app`** (pure, each with a test): `instanceLabels` (one label map for the whole
collection), `creatureLine` (`HUB_CONTEXT`, `creatureLine`, `creatureLineText`), `partyRows`
(`partyRows`, `benchRows`, `pickParty`), `soulRows`, `perkRows` (`INACTIVE_LABEL`,
`chosenSpecialization`, `perkRows`, the level field through `parseFloorField`), `specSwitcher`, `debugBoss`.

**New, `src/ui`:** `Hub`, `PartySection`, `CollectionSection`, `SoulsSection`, `PerksSection`,
`SpecSection`. Controls carry accessible names: `Party slot <n>` (1-based), `Summon <creature>`,
`Level of <perk>`, `Set <perk>`, `Boss`.

**The run start** (`src/state/store.ts`, `src/app/startRun.ts`, `src/state/balance-sim.ts`):
`GameActions.startGame({ seed, specId })` calls `newGame`, `setSpec`, `runScriptedIntro` in that
order; the three stay public. `startRun` parses and draws the seed and makes the one `startGame`
call (its `Pick` is `'startGame'`); `runSeed` in the simulator calls it too.

**The perk predicate:** `isFunctionalPerk` moved unchanged from `src/state/balance-sim.ts` to
`src/data/specializations.ts`, beside `resolvePerkEffects`. `src/app/perkRows.ts` drops
`isInactivePerk` (a row's `inactive` is `!isFunctionalPerk(perk)`) and gains
`chosenSpecialization` (`null` for no spec, throws on an unknown id), which `PerksSection` calls;
the section renders `perkRefusalText('no-spec')` instead of its own copy of the string.

**Review fixes:** `partyRows.test` pins a party line's label over the whole collection;
`instanceLabels.test`'s party-and-bench case now benches a copy; two doc-comment citations
(`instanceLabels.ts`, `specSwitcher.ts`) cite only what the rule states.

**The smoke test:** `@playwright/test` (dev dependency), `playwright.config.ts` (`testDir: 'e2e'`,
one Chromium project, a `webServer` that builds then runs `vite preview` on port 4173 with
`--strictPort`, `baseURL` `http://127.0.0.1:4173/Depths-of-Souls/`), `e2e/smoke.spec.ts` (Brute,
seed 10, descend floor 1, a "Floor 1:" line, the side panel's last floor, party slots 1 and 2
filled, slot 3 empty, no page error, and no request to the preview's origin outside the
`baseURL`'s path, which is what proves the build's `base`: the preview answers any path with
`index.html`), `npm run e2e`. `tsconfig.node.json` includes
`playwright.config.ts` and `e2e`; `.gitignore` gains `test-results/` and `playwright-report/`;
`.github/workflows/deploy.yml` gains an `e2e` job and `deploy` needs `build` and `e2e`. Vitest's
globs are unchanged, so it collects nothing from `e2e/`.

**New test file:** `src/state/store-startgame.test.ts`.

**Deleted:** none.

## Tests

`main` → final: 2152 → 2210 (+58; 2209 passed, 1 skipped), by file: creatureLine 0 → 7,
debugBoss 0 → 3, instanceLabels 0 → 6, partyRows 0 → 9, perkRows 0 → 11, refusals 3 → 7,
soulRows 0 → 6, specSwitcher 0 → 5, specializations 12 → 13, store-startgame 0 → 6.
The smoke test is the one `npm run e2e` test, outside this count.

## Golden policy

Byte-identical: no golden, corpus digest or engine test changes. `git diff --stat origin/main --
src/engine` is empty. `src/state` and `src/data` change only by `startGame` and `isFunctionalPerk`
(and the simulator importing and calling them); the three `balance-ci-*` tests pass unchanged.

## Verification

The first boss clear (Brute, seed 10, 38 floor runs) was replayed through the UI in Edge via a scratch Playwright install; the click-through covered the hub. Evidence in `evidence/`.
