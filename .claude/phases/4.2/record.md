# Phase 4.2 — Docs restructure: the context diet

**Status: shipped.** Brief: `.claude/phases/4.2/brief.md`. Ten slices, merged in order as PRs #93 to
#102. Golden policy held throughout: byte-identical in every slice, except 4.2-H3's one deliberate
kind (renamed fixture data ids, with the corpus digest unchanged). No behaviour change.

## Outcome

- **What every chat reads** went from about 300 KB (`CLAUDE.md`, a 181 KB `CONVENTIONS.md` and a
  105 KB `GAME_DESIGN.md`) to about 32 KB: `CLAUDE.md` (5.5 KB) and `CONVENTIONS.md` (26.6 KB, now
  engineering rules only). The rest is read per slice, as the kickoff names it.
- `GAME_DESIGN.md` is gone. The design and engine rules live in `spec/<subsystem>.md` (ten files,
  156 KB in all), one home per rule, each split into `## Design`, `## Engine rules` and, where a
  later phase owns a subsystem, `## Not built`. Content lives in `content/` and `specializations/`;
  `species/species-locked.md` is folded into the biome docs.
- Every living doc is condensed: superseded rules, duplicates, provenance and folded-in addenda
  removed, each condense checked row by row against an inventory and a verify round.
- Citations are anchors (`<path>.md#<anchor>`), and `src/` comments, test titles, file names,
  identifiers and string literals carry no provenance.

## Tooling added (`npm run docs:check -- <mode>`)

- `citations`: every citation resolves to a heading, no label or old forms. Blocking in CI.
- `comments`: no provenance in `src/` comments, titles, names or strings. Blocking in CI.
- `budgets`: each budgeted doc against `workflow/budgets.md`. Reported, never failing.
- `inventory` and `inventory-skeleton`: the condense slices' row-by-row checks.
- `comment-proof`: proves a comment, title or rename diff changes no code.

## Slices

| Slice | Delivered | PR | Mailbox |
| --- | --- | --- | --- |
| 4.2-A | The mechanical restructure into the target layout, the check script, the doc map | #93 | `phases/4.2/A/` (record) |
| 4.2-B | The content docs condensed; `species-locked.md` folded in | #94 | `phases/4.2/B/` |
| 4.2-C | `creatures`, `run`, `progression`, `store`, `saves` condensed | #95 | `phases/4.2/C/` |
| 4.2-D | `effects`, `responses`, `statuses` condensed | #96 | `phases/4.2/D/` |
| 4.2-E | `combat`, `scripting` condensed | #97 | `phases/4.2/E/` |
| 4.2-F | The top-level docs condensed | #98 | `phases/4.2/F/` |
| 4.2-G | Citations to anchors, budgets, CI, clean-up | #99 | `phases/4.2/G/` (record) |
| 4.2-H1 | Comment tooling | #100 | `phases/4.2/H1/` (record) |
| 4.2-H2 | The comment and test-title sweep; `comments` blocking in CI | #101 | `phases/4.2/H2/` (record) |
| 4.2-H3 | Names: file names, identifiers and fixture data ids | #102 | `phases/4.2/H3/` (record) |

The condense slices (B to F) keep their inventories and verify rounds instead of a record
(`WORKFLOWS.md#condensing-a-doc-over-budget`).

## Next

Phase 4.5: the fixes and the run-loop demo (`.claude/phases/4.5/brief.md`).
