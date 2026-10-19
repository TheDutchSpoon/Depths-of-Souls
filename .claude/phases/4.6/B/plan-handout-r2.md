# Plan hand-out, round 2: 4.6-B

**Verdict: approved.** Build `plan.md` with the four corrections below. Where they disagree with
it, this hand-out wins. Every ASSUMPTION not named here stands as the plan states it. No living-doc
or kickoff line was edited this round.

## 1. The existing-test list (Tests, existing-test list; A18)

The list the step-1 inventory must equal also holds these items. Each is a set-up change only, and
every assertion stays as it is:

- `balance-sim.test.ts` ~285 and ~291: the wall test's `stopReason(p, 30, 400)` calls drop the
  frontier argument.
- `balance-sim-report.test.ts` ~227–246: the two first-try tests' `buildFirstTryRows(…, 30)` calls
  drop the frontier argument.
- `refusals.test.ts` ~134 and `presence.test.ts` ~60: these `descendRefusalText` calls pass a reach.
  The `empty-party` text they expect stays the same.
- `balance-sim.test.ts` ~560–622: the `stat-modifier stack attribution` describe's shared ids
  `A`/`B`/`C` become opaque. That changes its `attributeStatModifiers` tests' set-up as well as the
  ~625 `analyzeFight` test's.
- `store.test.ts` ~721: the crash-route test's comment no longer names `contentFrontier`. This is a
  comment-only change.

## 2. The roster helper (`src/state/__fixtures__/roster.ts`; A18)

- `rosterOf(playerEntries, enemyEntries)` returns `{ playerParty, enemyParty }` as `Creature[]`,
  built with `makeParty`. Each entry is either an opaque id, or `{ id, templateId }`, which sets
  that creature's `origin.templateId`. A bare id's template defaults to the id.
- In `balance-sim-report.test.ts` ~129, the enemy party is three opaque ids with templates
  `spider-weaver`, `spider-weaver` and `treant-elder`. The assertion stays
  `['spider-weaver', 'treant-elder']`. The no-roster line passes an empty roster and still expects
  `[]`.

## 3. The reach guard (`src/state/reach-readers.test.ts`; A17, A19)

- The guard reads every non-test `.ts`/`.tsx` file under `src/`, **skipping `.d.ts` files**.
  `ts.transpileModule` throws on a declaration file, and the glob picks up
  `src/engine/__corpus__/node-shims.d.ts`.
- Each file is transpiled with `fileName` set to its path and `removeComments: true`, so a `.tsx`
  file is parsed as TSX. The `RunScreen.tsx` reader assertions run on that output.
- The pattern and the scope are as the plan has them: `/deepestFloor\s*\+\s*1\b/` matches only in
  the `farthestReachableFloor` export in `store.ts`.

## 4. The watch-point line (`balance-sim.ts`, `formatSpec`)

- The line reads "Floors 20 and deeper (watch point), failed pushes by floor: …", with no upper
  bound. It reads no row, so a spec with no runs prints it as `none`. `balance-sim.test.ts` ~1005
  formats such a spec.
