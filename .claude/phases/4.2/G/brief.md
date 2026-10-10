# 4.2-G — Citations, budgets, CI, clean-up

Phase brief: `.claude/phases/4.2/brief.md` ("Checks", "During the transition"). Loop: normal.
Golden policy: **byte-identical**; the `src/` diff is comment-only.

## Scope

- Rewrite every `CONVENTIONS "…"` and `GAME_DESIGN §…` citation in `src/` and the living docs (not
  `phases/`, not `archive/`) to `<path>.md#<anchor>`, by script, using the B–F inventories. That
  includes the `src/data` citations of `species/species-locked.md`, deleted after 4.2-B. The
  plan lists every citation form found and maps each old target. Citations whose text never
  matched the old docs (seven on 2026-10-10, for example `src/data/spells/glimmerdark.ts`'s
  "statuses are shared primitives") are mapped by hand in the plan and approved at its review.
- Convert the label-form cross-links the condensing slices left (`spec/x.md "Label"`) to anchors.
- Fix the stale `src/` comments the verify rounds listed. Known now: `src/data/statuses.ts` lines
  17–18 say Poison is "20% … (decided at the 4.1-H2d grill; 20% before)"; the data is 40.
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
