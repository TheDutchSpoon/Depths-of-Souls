# PR review r1 — 4.5-G2: The demo, the hub

Reviewed: branch `4.5-g2` at `820de56` ("build"), against `main` at `8aef772`. Inputs:
`kickoff.md`, `plan.md`, `plan-review.md`, `plan-handout-r1.md`, `report-r1.md`, `record.md`,
`evidence/`, and the living docs on the branch.

## Verdict

**Fixes.** The hub is built as planned and the golden policy holds by construction: nothing under
`src/engine`, `src/state` or `src/data` changes, no dependency is added, and every gate is green.
The helpers make exactly the store call and nothing else, misses throw, the inactive label is the
predicate the brief names, and the first boss clear is real: an independent scan of the policy in
my sandbox reproduces all 120 candidate rows and the pick's call log byte for byte. One pin the
kickoff asked for is missing (item 1): the party rows can count a label's ordinal over the party
alone and the whole suite stays green. The rest is cleanup. After the decide-points below, the
hand-out also carries two game-layer homes and an end-to-end smoke test (Decisions).

## Real fixes

1. **The party lines' ordinal is unpinned** (`handout-r1.md` item 1). The kickoff asks the labels
   test to fail "with the ordinal counted per section". `labelInstances` itself has no sections,
   so the mutation lives in its consumers: I made `partyRows` label its lines from
   `labelInstances` over the party members only, and **all 2200 tests pass**. The test that
   claims to cover it can't: "a dropdown option, a party line and a bench line carry the same
   label" has all four instances in the party, and `instanceLabels.test`'s "the ordinal counts
   over the party and the bench together" never benches anything (its single summon lands in
   party slot 2; `activeParty` is `inst-0, inst-1, inst-2` afterwards, checked in the sandbox).
   The bug is reachable on screen: five summons of the Brute starter, then pick the benched copy
   into slot 1; with the mutation that slot's dropdown reads "Cragfang Mauler #6, Lv 1" and the
   line under it "Cragfang Mauler #5, Lv 1", the label slot 6's dropdown gives a different
   creature (run in the sandbox). The bench side is pinned: the same mutation in `benchRows` fails its own test.

## Scope and labeling

2. **Two citations don't say what their comments claim** (item 3).
   - `instanceLabels.ts`'s doc comment cites `spec/store.md#collection-shape` for "creation
     order: nothing removes an instance … so one name never has two '#1's". That section only
     says the collection is a `Map` keyed by instance ids; "Nothing removes an instance from the
     collection" is in `spec/store.md#store-actions`. `npm run docs:check -- comments
     --quotations` flags the `"#1"` beside the anchor as not the target's words.
   - `specSwitcher.ts` cites `spec/progression.md#swapping-specialization` for "re-picking the
     current one is not a swap". The section says what a swap does (refund, starter grant); the
     rule about offering only the other specs is the brief's (`phases/4.5/brief.md#hub-g2`),
     which `src/` doesn't cite.
3. **A false test comment** (item 2): the `instanceLabels.test` case above says inst-2 is benched.
   Item 1's case pins the real thing; this one should state what it does, or bench a copy.
4. **`PerksSection` holds a refusal string and a lookup of its own** (item 4): "Pick a
   specialization first." is a second copy of `perkRefusalText('no-spec')`, and an unknown
   non-null `chosenSpec` silently renders as "no spec" instead of throwing. The kickoff's
   components-stay-thin rule puts both in `src/app`. Unreachable today (`setSpec` throws on an
   unknown id, and the hub only shows after Start), so cleanup, not a bug.
5. **The report's correction of the plan review is right.** The plan review said an `over-budget`
   test could use "a perk whose max spend exceeds 100"; no perk's `maxLevel × costPerLevel`
   exceeds 100 in the data, and the build's two-perk test (49 levels at 2, then one level of a
   dearer perk) is the correct construction. My error, not the build's.
6. **Accepted as they stand:**
   - Mid-playback, the run changed the store with a summon, a reorder and a Debug boss kill, and
     edited a perk field (UI state only); it did not **Set** a perk level. A perk set reaches the
     viewer by the same path as the boss kill (a store change re-rendering `RunScreen`, whose
     `DescentViewer` keeps its key and props), so it adds nothing the boss kill didn't show. The
     line count rose 33 → 39 → 46 over two 4 s windows: no remount (it would drop) and no
     stacked timer (it would roughly double).
   - `click-through.md`'s one FAIL line is the script checking for the inactive label on Brute,
     which has no inert perk; the same file shows the label on all eight of Sorcerer's inert
     perks. It records what ran, with the explanation beside it.
   - The first-clear replay made no party call: every logged party target equals the party it
     was applied to (all 38 lines "calls: none"). That is the policy, not the replay (see
     decide-point 2). The dropdowns are exercised in the click-through's Party section.
   - The click-through couldn't reach `unknown-creature`, `slot-out-of-range`,
     `unknown-instance`, `no-spec` or `perk-not-in-spec` on screen; the kickoff expected that, and
     `refusals.test` produces each from the real store.

## Decide-points

1. **Browser tooling (the report's question).** Two parts:
   - *Should scripted browser checks have a standing rule?* **Recommendation: yes**, a short
     bullet in `workflow/coding-rules.md#toolchain`: scripted browser checks use a scratch
     `playwright-core` install outside the repo, driving an installed Chrome or Edge
     (`channel`), against the dev server on a fixed port with `--strictPort`; the scripts stay
     out of the repo and their printed logs go in `evidence/`. G2 is the first slice that needed
     it, and the next plan that needs it (saves, Phase 5) would otherwise re-derive it. I make
     the edit once you say yes.
   - *Playwright as a repo devDependency?* **Recommendation: not now.** It is already decided for
     Phase 7 (`ROADMAP.md#phase-7--combat-ui--feedback`, "E2E smoke test", on `main` /
     pre-deploy); adding it here would put a dependency and CI weight on a throwaway demo. No edit.
2. **The simulator's party policy never changes the party before the first boss clear.** Not
   G2's to fix, but G2's scan is the first thing to show it. Across all 120 candidates (3 specs ×
   `SIM_SEEDS`, up to each one's floor-10 clear or `RUN_CAP`), `orderedParty` never differed
   from the party it was applied to: zero reorders. The reason is structural: XP goes to every
   party member, a summon starts at level 1, so the six highest-level instances are always the
   first six owned, in owned order. Every later summon (Brute seed 10 summons 18 creatures
   before its clear; the first four join, the other 14 never fight) sits on the bench, so the
   simulator's reads before floor 10 measure the first six creatures a seed happens to fill its
   party with. **Recommendation:** park it as an
   open question for the balance work (the tuning slice, if it runs), not a G2 change: whether
   the policy should rotate summons in (for example by rarity, or by template level rather than
   instance level) is a balance-design call, and changing it moves every simulator number. Say
   the word and I write it into `OPEN_QUESTIONS.md`.
3. **Game knowledge in `src/app` that belongs in the engine, store or data** (your question,
   asked again after G1's). Everything in `src/app` was read. Presentation stays: labels, beats and
   playback, event text, refusal text, field parsing, the side panel, and the seed draw (it uses
   `crypto`, which the store and engine must not). Four things are game knowledge:
   - **The game start** (`newGame`, `setSpec`, `runScriptedIntro`, in that order) is made by both
     `src/app/startRun.ts` and the simulator's `runSeed`. **Recommendation:** one store action.
   - **"Is this perk inert?"** has two homes, `isInactivePerk` (app, added by G2) and
     `isFunctionalPerk` (simulator). **Recommendation:** one predicate in `src/data`.
   - **`SpellCast` names a gem slot, not a spell**, so a log reader reruns fight setup to name a
     cast. **Recommendation:** settle at Phase 7's kickoff; adding the id changes every golden
     with a cast.
   - **A creature line derives affinity, rarity and traits from the template**, which fusion
     (Phase 8) breaks. **Recommendation:** fusion's spec says one derivation serves combat and
     every screen.
   The fight list's kill count repeats the store's "an enemy died" test, display-only; not worth a
   record field.

Nothing is over budget (`docs:check -- budgets`: 13 files, 0 over), the report has no open
ASSUMPTION, and the slice changes no content.

## Decisions

- **Decide-point 1: Playwright goes in the repo now, in G2.** My recommendation changed after
  Duncan asked why not now: "already planned for Phase 7" is no reason to wait, and the CI cost
  exists only if CI runs it, which we choose. What kept it out was the brief's "no new dev
  dependency", our own rule. One smoke test against the production build through `vite preview`
  at the Pages subpath, as `npm run e2e`, outside Vitest; a CI job on every pull request and push
  to `main`, with the deploy waiting on it (Duncan's call on my recommendation, replacing the
  roadmap's `main`-only line: one test is about a minute, and only a PR run proves the job before
  merge). Locally and in CI it runs Playwright's Chromium, so the scratch-install rule for
  browser checks is moot and `coding-rules.md` gets no edit now. Folded into this slice rather
  than a 4.5-G3 (Duncan's call): a fix round has no plan step, so the hand-out settles every
  choice.
- **Decide-point 2: no open question.** The simulator measures a weak party policy; players can
  build better parties, and that is how its numbers are read.
- **Decide-point 3:** the store action and the single perk predicate ride in this slice
  (Duncan's call; G2's golden policy stays byte-identical, since neither touches a golden, the
  corpus or an engine or store test); the `SpellCast` question is parked in `OPEN_QUESTIONS.md`
  for Phase 7's kickoff; fusion's spec gains the one-derivation rule.

## What was verified, and how

Sandbox clone, `npm ci` on each tree, Node 22.22.0, Vitest 5.0.3 (the lockfile's). Details and
counts in `phases/4.5/G2/evidence/checks-r1.md`.

- **Gates on `820de56`:** `npm run test` (JSON reporter) 2200 tests, 2199 passed, 1 skipped (the
  simulator's "prints the report", skipped on `main` too); `main` 2152 (2151 + 1). `lint`,
  `format:check`, `build`, `npx tsc -b`, `docs:check -- citations` (697 in 518 files) and
  `-- comments` pass; `budgets` 0 over. `comments --quotations` lists the `instanceLabels.ts`
  quotation (item 3) and one on `main` already.
- **Test count, file by file against `main`:** only `src/app` differs: seven new files
  (instanceLabels 6, creatureLine 7, partyRows 8, soulRows 6, perkRows 9, specSwitcher 5,
  debugBoss 3) and `refusals.test` 3 → 7, all three old titles kept. Matches the report.
- **Golden policy:** `git diff origin/main -- src/engine src/state src/data` is empty; every
  `__golden__` and `__corpus__` file lives under `src/engine`, so all fixtures and the digest are
  byte-identical by construction and no import-and-compare run is needed. Outside `.claude/`
  the diff touches only `src/app`, `src/ui` and `src/index.css`; `package.json` and the lockfile
  are unchanged.
- **The code against the spec and the kickoff:** each helper makes the one store call it names;
  `pickParty` maps `''` to `null` and nothing else; XP reads `xpForNextLevel` with the config;
  traits, spells, names and templates are exact-id lookups that throw on a miss; gems print what
  the array holds; the inactive label is `resolvePerkEffects(perk, maxLevel)` empty; the level
  field goes through `parseFloorField`; the switcher lists `SPEC_CHOICES` minus the chosen one;
  the Debug list is `BOSS_CREATURES_BY_ID` named by `bossName`; New game only sets App's UI
  state. The hub is a sibling of the run screen and no hub state reaches `DescentViewer`. Every
  component reads `useGameStore()` without a selector, as G1's do. Template and spell ids are
  unique in the data, so the id maps lose nothing.
- **Mutations** (20, each run against the test files the PR names, then restored): 19 caught,
  each by the named test; the party-ordinal one survives the full suite (item 1). Table in
  `evidence/checks-r1.md`.
- **The first boss clear:** my own scan composing `balance-sim.ts`'s exports, as
  `plan-handout-r1.md` specifies, gives the same floor runs for all 120 candidates as
  `first-clear-scan.md` (28 of 40 Shieldbarer seeds cleared, all Sorcerer and Brute), the same
  unique pick (Brute, seed 10, 38; next best Brute 18 at 42), and a summon / descent / party /
  deepest-floor log for the pick identical to `first-clear-log.md`'s (56 lines, same MD5). The
  clearing descent reports a first clear worth 100. The replay log shows 38 of 38 descents with
  the party and the deepest floor matching, then the boss line, 100 earned, and 100 spent on
  Might.
- **Leftover sweep:** the slice deletes, moves and renames nothing and corrects no `src` claim;
  no stale mention in the living docs.
- **Mailbox:** only step files and `evidence/`; nothing to delete.

## Docs edited

- New evidence: `.claude/phases/4.5/G2/evidence/checks-r1.md` (this review's counts, mutation
  table and scan comparison).
- `.claude/phases/4.5/brief.md`: the G2 row of the slice table, the "G is split" reason and
  `phases/4.5/brief.md#demo-golden-rule` (G2 adds two game-layer homes); two new "Decided, not
  built" entries, `phases/4.5/brief.md#one-run-start-and-one-perk-predicate` and
  `phases/4.5/brief.md#an-end-to-end-smoke-test`; `phases/4.5/brief.md#tests-and-verification`'s
  dev-dependency line (Decisions 1 and 3).
- `.claude/phases/4.5/G2/brief.md`: scope, the inactive label's source and "Done when" (same).
- `.claude/ROADMAP.md`, `ROADMAP.md#phase-7--combat-ui--feedback`: the E2E entry leaves (it is
  4.5-G2's now).
- `.claude/CONVENTIONS.md`, `CONVENTIONS.md#three-test-tiers`: the planned smoke test points at
  the brief.
- `.claude/OPEN_QUESTIONS.md`: `OPEN_QUESTIONS.md#a-self-describing-fight-log`, to settle at
  Phase 7's kickoff.
- `.claude/spec/creatures.md`, `spec/creatures.md#fusion`: one derivation gives an instance's
  identity, affinity, rarity, base stats and traits, read by combat and every screen.
- `CI_CD.md` and `CONVENTIONS.md#three-test-tiers` get the built smoke test, and
  `spec/store.md` and `spec/progression.md` the store action and the predicate, at the review
  that approves the fix.
