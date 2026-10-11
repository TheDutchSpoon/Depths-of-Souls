# 4.2-G — Citations, budgets, CI, clean-up

Phase brief: `.claude/phases/4.2/brief.md` ("Checks", "During the transition"). Loop: normal.
Golden policy: **byte-identical**; the `src/` diff is comment-only, plus the titles of 10 tests
that carry an old citation (decided at the kickoff).

## Scope

- Rewrite every `CONVENTIONS "…"` and `GAME_DESIGN §…` citation in `src/` and the living docs (not
  `phases/`, not `archive/`) to `<path>.md#<anchor>`, by script, using the B–F inventories. That
  includes the `src/` citations of `species/species-locked.md`, deleted after 4.2-B: 70 in 29
  files on 2026-10-10, in `data/`, `engine/`, `state/` and 12 golden fixtures (list in
  `phases/4.2/B/verify-r1.md` "Stale comments in `src/`"). The
  plan lists every citation form found and maps each old target. Citations whose text never
  matched the old docs (seven on 2026-10-10, for example `src/data/spells/glimmerdark.ts`'s
  "statuses are shared primitives") are mapped by hand in the plan and approved at its review.
  Citations inside test titles (`describe`/`it`/`test` first arguments; 10 on 2026-10-11) are
  rewritten too: renaming a test changes no behaviour, and the repo has no snapshot files (Duncan,
  at the kickoff).
- Convert the label-form cross-links the condensing slices left (`spec/x.md "Label"`) to anchors.
- Fix the stale `src/` comments the verify rounds listed, to `CONVENTIONS.md` "Comment why, not
  what" (rewritten at the kickoff). Provenance in comments this slice doesn't otherwise touch is
  4.2-H's. Known now: `src/data/statuses.ts` lines
  17–18 say Poison is "20% … (decided at the 4.1-H2d grill; 20% before)"; the data is 40. From
  4.2-B's verify: `engine/balance-types.ts:37` says the boss level offset defaults to 3 (it is 5,
  `data/balance.ts:18`); `data/statuses.ts:125-133` says Blindclaws' act-first status "will be" the
  Web primitive (built: `GRANT_ACT_FIRST`); `data/spells/glimmerdark.ts:3-24` and
  `data/traits/glimmerdark.ts:349-353` narrate deleted spells; the comment above `BROODMOTHER` in
  `data/species/overgrowth.ts` says her runner is unbuilt (built: `OVERGROWTH_BOSS`). From 4.2-D:
  `engine/effect-types.ts:670-673` says a trigger condition can't reference the triggering source
  (it can: the `'target'` subject resolves to the source in `fireHook`); `engine/effects.ts:434`
  says Splashing follows "Attack/Cast main hits" (attacks only); `engine/effects.ts:501-503` says
  every creature lacks a `speciesId` (generation and `materializeCreature` set it). From 4.2-D's
  verify: `engine/types.ts:130-135` (`Creature.speciesId`) says `living-allies-of-species` is inert
  until a later slice threads `speciesId` (it is threaded); `engine/effect-types.ts:121-127` calls
  `all-allies-of-species` dormant until wired (only a creature without a `speciesId` gets an empty
  list); `engine/effect-types.ts:277` calls `remove-status` "the final response verb" (the rule is
  `spec/responses.md` "No side doors", not a verb ceiling). From 4.2-E:
  `engine/scripting-types.ts:9-22` repeats the `'target'` subject comment twice;
  `engine/scripting-types.ts:78-89` says `acted-before-target` in a trigger "always evaluates
  false" and names only `random-enemy` (it falls back to the creature being resolved against, and
  all three random selectors peek to no target); `engine/target-selectors.ts:53-55` calls
  `random-enemy` "the one blessed RNG draw site" (`random-ally` draws too); `data/scripts.ts:132`
  lists the Stonehorn Warden as a `taunter` (it runs `warden`). From 4.2-E's verify:
  `engine/scripting-types.ts:144-149` says `targetSelectorHasCandidate` still handles `'random'`
  (it throws, `target-selectors.ts:36` and `:132`; `spec/combat.md` "One action pipeline");
  `engine/types.ts:323-325` says a status tick skips Defence (only a cost does; a tick meets a fifth
  of Defence, `resolution.ts` `calculateIndirectDamage`); `engine/effect-types.ts:760` names
  `targeting.ts`'s `adjacentLivingTargets` as Splashing's lookup (production uses a private copy at
  `actions.ts:458`, so `targeting.test.ts:326-368` tests code Splashing doesn't run: this slice
  fixes the comment only; the dedupe is a code change, listed in ROADMAP Phase 4.5 "Decided, not
  built"); `engine/config.ts:1-2` calls `ROUND_CAP` "exact number TBD";
  `engine/combat.ts:160`, `:366`, `:385`, `:410`, `:500`, `actions.ts` (header, `:346`,
  `:373-376`, `:397`) and `types.ts:33` cite `CONVENTIONS "…"` or `GAME_DESIGN §…`. From 4.2-E's
  round-2 verify: `engine/types.ts:44-47` and `actions.ts:334`, `:390`, `:668` cite `GAME_DESIGN §7`
  for the targeting-override rules (now `spec/combat.md` "Targeting override");
  `data/scripts.ts:7-8` says every role ends in the same fallback (`caster` casts first and ends in
  Attack; `spec/scripting.md` "Role scripts").
- The `citations` mode, blocking in CI, and the `budgets` mode, reported only (phase brief
  "Checks"). The budgets are read from `workflow/budgets.md` (the design agent's; set at the
  kickoff from the condensed sizes), not written into the script, so raising one needs no code
  change. Budgeted: the spec files, `CLAUDE.md` and `CONVENTIONS.md` (Duncan, at the kickoff: the
  two files every chat reads are the cost this phase set out to cut).
- Remove `move` and `line-proof` from the script. **Generalize** `inventory-skeleton` and
  `inventory` instead of removing them (Duncan, at the kickoff): they become the guard for
  condensing a file that goes over its budget (phase brief "Checks", "Over budget"), so nothing is
  dropped silently. They take any living-doc file(s) and a base revision instead of the pinned
  commit, the map and the B–F slice table, and never need a local `main`; the unit definition and
  the row check stay as they are.

## Known from earlier slices

- **From 4.2-F:** `CLAUDE.md` "How the spec is written" is now the lasting home of the phase brief's
  "Rules for the new spec" (Duncan's decision at the 4.2-F condense). When this slice builds the
  citations check and the budgets, add them there in one line each (citations checked in CI; each
  spec file's size budget, reported), and point the over-budget rule it adds to
  `workflow/pr-review.md` at it. The `(Phase 4.2 only)` paragraph below the section goes with the
  rest of the clean-up.
- **From 4.2-F:** stale `src/` comment: `data/balance.ts:1-4` says the 4.1-H2d balancing pass "tunes
  the rest" and every number is parked "until then" (the pass ran; the numbers are tuned).
- **From 4.2-F's verify:** three New-home anchors in B's inventory no longer exist, because later
  slices rewrote their files: `specializations/shieldbarer.md:59` →
  `spec/progression.md#9-player-specializations`; `species/species-locked.md:186` →
  `spec/run.md#4-the-cave-world--structure`; `species/species-locked.md:143` →
  `OPEN_QUESTIONS.md#13-open-questions--parked-items` (now `OPEN_QUESTIONS.md#sacrifice-revive`, F
  inventory "Base-only text"). A citation mapped through B's inventory must resolve each to today's
  heading; the plan lists the three mappings. `inventory B` can't re-check them (its base files are
  gone).
- **From 4.2-F's verify:** more `GAME_DESIGN §13` citations in `src/` for the script, where §13 is
  now `OPEN_QUESTIONS.md` "Balance numbers": `app/demoFight.ts:17`; "parked balance (GAME_DESIGN
  §13)" in `data/species/glimmerdark.ts:12`, `overgrowth.ts:16`, `rotcap-hollow.ts:13`,
  `engine/curves.ts:3` and `state/rewards.ts:108`.

## Known from 4.2-A's review

`scripts/docs-check.ts` as 4.2-A built it, for this slice's plan:

- **`resolveAnchors` before it becomes blocking.** It differs from GitHub (github-slugger) in three
  ways: (1) a suffixed slug can collide with a real heading: `a`, `a`, `a-1` give `a`, `a-1`,
  `a-1` here, where GitHub gives `a`, `a-1`, `a-1-1` (GitHub bumps the suffix while the slug is
  taken); (2) a heading indented one to three spaces is not seen; (3) `_emphasis_` and HTML entities
  stay in the slug (listed in its doc comment). The citations check promises "exactly one heading",
  so (1) must be fixed; (2) and (3) only if a living doc has such a heading.
- **4.2-only helpers without their own marker** (`capitalise`, `sha256`, `SPEC_NAMES`, `FATES`,
  `INVENTORY_HEADER`, `row` and its `D`/`E`/`F`, `pinnedCache`, the interfaces). The script's
  header says everything not listed as lasting is 4.2-only, and `tsconfig.node.json` has
  `noUnusedLocals`, so `tsc -b` fails on any of them left behind once the modes go.
- **`git merge-base HEAD main` needs a local `main`**, which a CI checkout doesn't have. Fine for the
  4.2-only inventory modes; a lasting mode must not depend on it.

## Clean-up

Everything marked `(Phase 4.2 only)` goes (phase brief "Phase-4.2-only text"). Known now:

| What | Where | Who |
| --- | --- | --- |
| The 4.2-only script modes | the `docs:check` script | coding agent (code edit) |
| `/slice-verify`, the B–F verify command | `skills/slice-verify/` | design agent rewrites it at the PR review as the budget-condense verify (against `git show <base>:<file>` and the code) |
| The condense step file | `workflow/condense.md` | design agent rewrites it at the PR review as the budget-condense step, keeping the lasting condensing rules |
| `/slice-condense`, the design side's command | Duncan's Cowork skills (outside the repo) | Duncan drops "(Phase 4.2 only)" from its description once the step file is rewritten |
| The Phase 4.2 exception | `workflow/coding-rules.md` | design agent, at the PR review |
| The pointer to the 4.2 variant loop | `WORKFLOWS.md`, after the loop table | design agent |
| The "During the transition" note on old citations | `CLAUDE.md` | design agent; removed at the kickoff (it held old-form citations the blocking check fails on) |
| Anything else marked `(Phase 4.2 only)` that B–F added | found by the grep | design agent lists it at the kickoff |

The design agent also adds to `workflow/pr-review.md` the `## Not built` step (decided at 4.2-C;
phase brief, rule 1): a PR that builds a Not built rule has its review move the rule into the
file's `## Design` or `## Engine rules`.

The design agent also adds the over-budget rule to `workflow/pr-review.md`.

**The doc-writing rules get a lasting home** (Duncan, at the kickoff): once this phase closes, the
phase brief's "Condensing rules" are history. At this slice's PR review the design agent splits the
lasting rules by audience: `CLAUDE.md` "How the spec is written" keeps the reader's rules (how to
read and cite the spec); the writer's rules go to `workflow/design-rules.md` "Doc edits" (the drop
list, keeping design intent and names that pin a shape, a new decision rewrites its rule in place
and is never appended beside it, the stale-doc vs bug procedure, the content-doc shape); the
rewritten `workflow/condense.md` links to them. This partly reverses 4.2-F's call to keep them all in
`CLAUDE.md`: only the design agent writes docs, and every chat pays for `CLAUDE.md`.

The ROADMAP's Phase 4.2 is set to closed at 4.2-H's PR review, not this slice's. Kept, as history: this phase's briefs, inventories, verify requests and
reports, and the records.

## Exception

Under the Phase 4.2 exception, the citation script edits citations in the living docs and nothing
else in them. The design agent removed the "During the transition" note from `CLAUDE.md` at the
kickoff.

## The PR must prove

- The `src/` diff is comment-only plus test titles: with comments stripped (TypeScript printer,
  `removeComments: true`) and the first argument of every `describe`/`it`/`test` call masked, every
  changed file is byte-identical to `main`'s; the test count is unchanged, file by file.
- `citations` and `budgets` pass, and CI runs them.
- No `CONVENTIONS "…"` or `GAME_DESIGN §…` citation is left outside `phases/` and `archive/`.
- `grep -rn "Phase 4.2 only" .claude src scripts --exclude-dir=phases` finds nothing in `src/`
  or `scripts/`, and in `.claude/` only the four files the design agent rewrites at the PR review:
  `workflow/coding-rules.md` (the exception), `WORKFLOWS.md` (the pointer),
  `workflow/condense.md` and `skills/slice-verify/SKILL.md`.
