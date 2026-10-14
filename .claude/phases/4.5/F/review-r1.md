# PR review r1 — 4.5-F: Level-ups after each fight, the per-fight record, and the intro's XP

Reviewed: branch `4.5-f` at `4df94f8` ("build"), against `main` at `e4ea5f6`. Inputs: `kickoff.md`,
`plan.md`, `plan-review.md`, `plan-handout-r1.md`, `report-r1.md`, `record.md`, the three
`evidence/` files, and the living docs on the branch.

## Verdict

**Fixes: cleanup only.** The build is correct against the spec, the kickoff and the plan as
`plan-handout-r1.md` corrects it, and every mechanism is pinned at its site. Three small items are
left, in tests, a comment and the docs check (`handout-r1.md`); no behaviour changes. Round 2 should be short.

## Real fixes

None.

## Scope and labeling (in the hand-out)

1. **`FightRecord`'s doc comment is incomplete.** It says `createCombat` over the seed, the two
   parties and the player's effects "gives back `events`". It does only with the registries the
   store was given; a balance-simulator record needs the simulator's scripts
   (`buildSimScripts`), not the stock ones. G1's **Copy fight as JSON** reads this type, so the
   comment is where the next reader learns what a replay needs. Now written in
   `spec/store.md#a-descents-outcome`; the comment should say it and cite that.
2. **The intro test doesn't show its non-loss case.** "Every active-party creature gets the
   grant, whatever the intro fight's result" asserts `'loss'` for the overwhelming Unicorn but
   leaves the stock intro's result unasserted. Today it is a `'win'` (checked), so a grant gated to
   losses does fail the test; but the coverage of the non-loss side is invisible and would vanish
   silently if a fixture change made the stock intro a loss. Assert it.
3. **The citations check doesn't know the new top-level doc.** `TOP_LEVEL_DOCS` in
   `scripts/docs-check/citations.ts` lists the top-level docs whose bare label form (the doc's
   name followed by a quoted heading name) fails the check. `CI_CD` isn't in it, so that form
   would pass silently for the new doc. One word plus a test case.

## Decide-points

None left open.

## Decisions

1. **`CONVENTIONS.md` is split, in this review (Duncan's call).** Adding the intro's XP grant to
   `CONVENTIONS.md#where-each-number-lives` took the file to 29,020 B against its 29,000 budget.
   The growth since its last condense (22,828 B) is new rules, many of them CI/CD mechanics, while
   every chat reads `CONVENTIONS.md`. The cut: what a slice needs only when it touches a GitHub
   workflow, the build or deploy setup, the environments or a docs check moves, word for word, to
   a new living doc, `CI_CD.md`: the gates workflow, the deploy jobs, the simulator workflow, the
   whole "Deployment & environments" section, and the `comments` check's scanning detail. What
   every slice needs stays: the local toolchain rule (`CONVENTIONS.md#local-runs-match-cis-toolchain`,
   which `workflow/coding-rules.md` cites) and the comment rules themselves. The IndexedDB naming
   requirement moves too; `spec/saves.md`, which the saves slice reads, cites it.
   `CONVENTIONS.md` is 23,724 B after the split and a condense; its budget stays 29 KB.

## What was verified, and how

All in a sandbox clone (`git worktree` of `4df94f8` and of `origin/main`), `npm ci` on both, Node
22, Vitest 5.0.3 matching the lockfile.

- **Gates on the branch:** `npm run test` (229 files; 1990 passed, 1 skipped), `lint`,
  `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`, `-- comments`: all green.
  `-- budgets`: 12 files, none over (before this review's doc edits; after them, see **Docs
  edited**).
- **Test count, file by file** (JSON reporter on both trees): `main` 1984 tests, branch 1991.
  Changed files only: `store.test.ts` 28 → 35 (the seven new tests by name), `integration.test.ts`
  6 → 7 (the real-content test), `balance-sim.test.ts` 79 → 78 ("splits fights at FightStarted"
  gone). Every other file's test names identical. Matches the report.
- **Engine side byte-identical:** `git diff main -- src/engine` is the `BalanceConfig.introXpGrant`
  field and the fixture's value and header bullet, nothing else; no `__golden__` or corpus fixture
  in the diff. Every export of all `__golden__/*.fixture.ts` imported on both trees and deep-
  compared (an `import.meta.glob` dump, Maps and Sets serialised): 1341 exports, 0 differ. The
  corpus digest test passes unchanged.
- **Code against the spec:** `descend` materializes the party per fight from a local collection,
  applies each fight's XP (boss and ordinary kill paths both feed `fightXp`) before the win/break
  check, records the fight, and stores that collection once; the combat seed, the generation draw
  and the `runCounter` advance are untouched. The record holds the array `createCombat` was given,
  `fight.enemyParty` and the once-resolved perk effects; `partyLevelsAfter` reads through the
  `InstanceId`s `resolvePlayerParty` returns (no cast). `runScriptedIntro` grants after
  `grantCreatureIfUnowned`, to `granted.activeParty`, whatever the result. The simulator reads
  rosters and events from the records; no printed report line changed. No `src/engine` import of
  state, data or UI.
- **Goldens:** the store tests' arithmetic is in their comments and checks out against
  `TEST_BALANCE_CONFIG` (`100 × level`; floor-1 FODDER at level 1, floor 2 at level 2). The
  real-content test is labeled generated-then-checkpoint-verified, with the checkpoint
  (10 + 10 = 20 = `xpForNextLevel(1)`; 80 for level 3) in its comment.
- **Mutations** (env-flag guards in the sandbox copy of `store.ts` and `balance-sim.ts`, run on
  `store.test.ts` + `integration.test.ts`, or `balance-sim.test.ts` for the simulator, then
  restored). The corpus digest wasn't rerun per mutation: it never reaches the store.

  | Mutation | Tests that fail |
  | --- | --- |
  | party from the stale `state.collection` | between-fights; replay A |
  | XP applied at the end of the floor (as on `main`) | between-fights; loss's last fight; replay A; real content |
  | end-of-floor application on top of per-fight | exactly-once; loss's last fight |
  | per-fight XP only after a won fight | loss's last fight |
  | `partyLevelsAfter` read before the fight's XP | between-fights; loss's last fight; real content |
  | record `playerParty` from `combat.playerParty` | replay A; replay B (`createCombat`'s guard) |
  | record `playerEffects` emptied | replay A; replay B |
  | intro grant removed | intro grant; real content |
  | intro grant only on a win | intro grant |
  | intro grant only on a loss | intro grant; real content |
  | intro grant to the party before the Unicorn joins | intro grant; real content |
  | simulator roster `[]` from the record | "every fight in a played floor run lists its enemy templates" |
  | `runProbe` returns no records | the probe-run "restores the state exactly" case |

  Every mechanism is caught by the test the report names for it, at each site; none is caught
  only by the corpus digest.
- **Live behaviour on real content** (a throwaway test, default store): 3 specs × 8 seeds, new
  game → spec → intro (even seeds also buy a perk through a debug `recordBossKill`) → 12 descents
  each, pushing and re-farming. 288 descents, 2056 records: every record replays to its events
  byte-identically **both from the in-memory record and after a `JSON.stringify` / `JSON.parse`
  round trip** of its seed, parties and effects (what G1's **Copy fight as JSON** will do);
  1028 of them carry perk effects, 697 hold an innate-spell creature. Each record's levels going
  in equal the previous record's `partyLevelsAfter` (0 breaks), the stored collection equals the
  last record's levels-after after every descent, no record shares a creature object with the
  previous one, and 38 real level-ups land between two fights of one floor.
- **Balance:** the three `balance-ci-*` tests pass. Threshold values recomputed in the sandbox
  (`runSeed` / `computeThresholds`, `SIM_SEEDS`, `CI_RUN_CAP`, boss probe off): Brute 100 / 2 / 40,
  Shieldbarer 100 / 3 / 37, Sorcerer 100 / 2 / 40, no seed without a soul. Equal to the probe's
  "fix + 10 XP" row and to the report's evidence.
- **Simulator parity and levels:** `evidence/parity-and-levels.md` read against the kickoff's
  ask; consistent with the per-fight scan above (floor 1 at `[1, 1]` throughout, `[2, 2]` after
  its last fight, floor 2 at `[2, 2]`).
- **Leftover sweep** over `src/` and the living docs (all of `.claude/` but `phases/` and
  `archive/`): `fightEnemyIds`, `splitFights`, "post-fight", "once per descent": no hits left in
  `src/`; the docs' only stale claim was `spec/run.md#rewards`'s `**Known bug:**` line, removed
  below. `spec/creatures.md#levels-and-xp` said creatures level only through kill XP; corrected.
- **Mailbox:** step files, `record.md` and three cited `evidence/` files only. Nothing to delete.

## Docs edited

- `.claude/spec/run.md#rewards`: the `**Known bug:**` line removed; level-ups apply after each
  fight "won or not", and `descend` materializes the party afresh per fight.
- `.claude/spec/run.md#scripted-intro`: the 10 XP grant (config `introXpGrant`) to the active
  party after the Unicorn joins, whatever the result, with its design intent; a second call grants
  again.
- `.claude/spec/store.md`: new `### A descent's outcome` (`FloorOutcome`, `fightRecords`,
  `FightRecord`'s fields, the invariants, and what a replay needs).
- `.claude/spec/creatures.md#levels-and-xp`: combat XP is kills plus the intro's grant.
- `.claude/CONVENTIONS.md#where-each-number-lives`: the intro's XP grant in the `BalanceConfig`
  list.
- `.claude/CONVENTIONS.md`, split (decision 1). Moved out whole: "Every pull request runs the
  gates", "Deploy only from main, only if tests pass", "The simulator report runs after each
  merge" and the `## Deployment & environments` section (its six rules). From
  `CONVENTIONS.md#comment-why-not-what`: the `comments` check's scanning detail (the second half
  of "So do names") and the `--quotations` sentence, each replaced by a citation of
  `CI_CD.md#what-the-comments-check-reads`. The one citation of the moved simulator section now
  points at `CI_CD.md`, and the header names `CI_CD.md`. `## CI` keeps "Local runs match CI's
  toolchain". No rule was reworded.
- `.claude/CI_CD.md`, new: the moved text under `## CI`, `## Deployment & environments` and
  `## Docs checks`. Two wording changes, both forced by the move: the `--quotations` sentence says
  "a quotation" where it said "one" (it no longer follows the sentence that named it), and the
  comments-check section opens with "It enforces `CONVENTIONS.md#comment-why-not-what`."
- Citations of the moved rules repointed to `CI_CD.md`: `CLAUDE.md` (the deploy line),
  `ROADMAP.md` and `spec/saves.md` (IndexedDB naming). None in `src/`.
- `.claude/CLAUDE.md`: `CI_CD.md` added to the file map.
- `.claude/CONVENTIONS.md`, condensed after the split (Duncan's call), four edits:
  `### E2E smoke test` (a plan, not a rule `main` keeps) moves to `ROADMAP.md`'s Phase 7 "Decided,
  not built", word for word apart from its "None exists yet" opening, and
  `CONVENTIONS.md#three-test-tiers` cites it; the corpus digest's sentence on how a byte-identical
  or deliberate-change PR treats it is replaced by a citation of `WORKFLOWS.md#golden-policy-one-per-pr`,
  which states the same rule; two quoted-heading references become anchors
  (`CONVENTIONS.md#goldens-are-layered-and-additive`, `CONVENTIONS.md#open-questions-get-an-interface`).
- `.claude/ROADMAP.md`: the E2E smoke test under Phase 7's "Decided, not built". Placing it in Phase
  7 is a call this review made: Phase 7 builds the first UI that isn't throwaway.
- `.claude/WORKFLOWS.md#where-things-live`: `CI_CD.md` added to the living docs in the tree.
- `.claude/workflow/budgets.md`: `CI_CD.md` budgeted at 7 KB (5,659 B + 20%, rounded up).
- Budgets after the edits (`docs:check -- budgets`): `CONVENTIONS.md` 23,724 / 29,000 B,
  `CI_CD.md` 5,659 / 7,000 B, `spec/store.md` 3,874 / 4,000 B (97%), `spec/run.md` 81%,
  `spec/creatures.md` 83%; none over. `docs:check -- citations` passes on the living docs, this
  review and the hand-out.
