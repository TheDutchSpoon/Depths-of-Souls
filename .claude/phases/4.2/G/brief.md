# 4.2-G — Citations, budgets, CI, clean-up

Phase brief: `.claude/phases/4.2/brief.md` ("Checks", "During the transition"). Loop: normal.
Golden policy: **byte-identical**; the `src/` diff is comment-only.

## Scope

- Rewrite every `CONVENTIONS "…"` and `GAME_DESIGN §…` citation in `src/` and the living docs (not
  `phases/`, not `archive/`) to `<path>.md#<anchor>`, by script, using the B–F inventories. That
  includes the `src/` citations of `species/species-locked.md`, deleted after 4.2-B: 70 in 29
  files on 2026-10-10, in `data/`, `engine/`, `state/` and 12 golden fixtures (list in
  `phases/4.2/B/verify-r1.md` "Stale comments in `src/`"). The
  plan lists every citation form found and maps each old target. Citations whose text never
  matched the old docs (seven on 2026-10-10, for example `src/data/spells/glimmerdark.ts`'s
  "statuses are shared primitives") are mapped by hand in the plan and approved at its review.
- Convert the label-form cross-links the condensing slices left (`spec/x.md "Label"`) to anchors.
- Fix the stale `src/` comments the verify rounds listed. Known now: `src/data/statuses.ts` lines
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
  lists the Stonehorn Warden as a `taunter` (it runs `warden`).
- The `citations` mode, blocking in CI, and the `budgets` mode, reported only (phase brief
  "Checks"). The budgets are set from the condensed sizes.
- Remove the 4.2-only modes (`move`, `line-proof`, `inventory-skeleton`, `inventory`) from the
  script; `citations` and `budgets` stay.

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
| `/slice-verify`, the B–F verify command | `skills/slice-verify/` | Duncan deletes; the report lists it under **To delete** |
| The condense step file | `workflow/condense.md` | Duncan deletes |
| `/slice-condense`, the design side's command | Duncan's Cowork skills (outside the repo) | Duncan removes it |
| The Phase 4.2 exception | `workflow/coding-rules.md` | design agent, at the PR review |
| The pointer to the 4.2 variant loop | `WORKFLOWS.md`, after the loop table | design agent |
| The "During the transition" note on old citations | `CLAUDE.md`, if 4.2-A added one | design agent |
| Anything else marked `(Phase 4.2 only)` that B–F added | found by the grep | design agent lists it at the kickoff |

The design agent also adds to `workflow/pr-review.md` the `## Not built` step (decided at 4.2-C;
phase brief, rule 1): a PR that builds a Not built rule has its review move the rule into the
file's `## Design` or `## Engine rules`.

The design agent also adds the over-budget rule to `workflow/pr-review.md` and sets the ROADMAP's
Phase 4.2 to closed. Kept, as history: this phase's briefs, inventories, verify requests and
reports, and the records.

## Exception

Under the Phase 4.2 exception, the citation script edits citations in the living docs and nothing
else in them. The design agent removes the "During the transition" note from `CLAUDE.md` at the PR
review.

## The PR must prove

- The `src/` diff is comment-only: with comments stripped (TypeScript printer, `removeComments:
  true`), every changed file is byte-identical to `main`'s.
- `citations` and `budgets` pass, and CI runs them.
- No `CONVENTIONS "…"` or `GAME_DESIGN §…` citation is left outside `phases/` and `archive/`.
- `grep -rn "Phase 4.2 only" .claude src scripts --exclude-dir=phases` finds nothing but the
  files listed under **To delete**.
