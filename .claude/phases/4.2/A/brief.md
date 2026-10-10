# 4.2-A — The mechanical restructure

Phase brief: `.claude/phases/4.2/brief.md` (read "Target layout", "The file map", "Checks" and
"Process for 4.2"). Loop: normal. Golden policy: **byte-identical**.

## Scope

A Node script (no new dependencies, `npm run docs:check -- <mode>`) with four modes:

- `move`: writes the 13 files of the target layout from the pinned commit, per the file map. It's
  deterministic and reads only `git show 892f1b8:…`, so running it twice gives the same files.
- `line-proof`: the check in the phase brief, derived from the map independently of `move`.
- `inventory-skeleton <slice>` and `inventory <slice>`: as the phase brief specifies, for B to F,
  including the per-slice file table.

The files `move` writes:

- `spec/<name>.md`: line 1 `# Spec — <Name>` (Combat, Effects, Responses, Statuses, Scripting,
  Creatures, Run, Progression, Store, Saves), a blank line, the read-when line, a blank line, then
  the halves present (`## Design`, `## Engine rules`, `## To fold`), each followed by its rows.
- `CONVENTIONS.md` and `VISION.md`: their rows in order, with the read-when line (and a blank line
  on each side) inserted after the first line, which is the old title. `VISION.md` keeps
  GAME_DESIGN's title until 4.2-F.
- `OPEN_QUESTIONS.md`: `# Open questions`, a blank line, the read-when line, a blank line, its rows.

Read-when lines, verbatim:

| File | Line |
| --- | --- |
| `CONVENTIONS.md` | `Every chat reads this file: the engineering rules for every change.` |
| `VISION.md` | `Read this when designing a feature.` |
| `OPEN_QUESTIONS.md` | `Read this when a slice touches a parked question, or at a grill.` |
| `spec/effects.md` | `Read this when changing any trait, perk or effect.` |
| `spec/combat.md` | `Read this when changing how a fight resolves.` |
| `spec/statuses.md` | `Read this when changing any status.` |
| `spec/creatures.md` | `Read this when changing collection, creatures or gems.` |
| `spec/run.md` | `Read this when changing descent, generation or the hub.` |
| `spec/scripting.md` | `Read this when changing scripts or behaviour.` |
| `spec/responses.md` | `Read this with effects.md, for any triggered behaviour.` |
| `spec/progression.md` | `Read this when changing progression.` |
| `spec/store.md` | `Read this when changing the store or the state the UI reads.` |
| `spec/saves.md` | `Read this when changing saving or loading.` |

**Not in scope:** any wording change, heading-level change or citation change; `src/`; CI.
`GAME_DESIGN.md` is not deleted by the script: list it under **To delete**. `CONVENTIONS.md` is
overwritten in place.

## Exception

Under `workflow/coding-rules.md`'s Phase 4.2 exception, `move` writes `CONVENTIONS.md`,
`VISION.md`, `OPEN_QUESTIONS.md` and `spec/`. No other living doc is touched by the coding agent.
The design agent updates the doc map and the reading rules at the PR review: `CLAUDE.md`,
`WORKFLOWS.md` (layout, living-docs list), `workflow/coding-rules.md` (reading list),
`workflow/design-rules.md`, `workflow/kickoff.md` (a "Spec files" line), `workflow/pr-review.md`,
and the ROADMAP status. The note in `CLAUDE.md` on resolving old citations until 4.2-G is marked
`(Phase 4.2 only)`.

## The PR must prove

- `line-proof` passes, with its output in the report (line counts, per-file bytes, which should
  match the phase brief's table).
- The diff touches only the 13 files, the script, `package.json` and the mailbox.
- `inventory-skeleton B` and `inventory-skeleton C` run and list their units (counts in the report).
- All gates green, golden policy byte-identical.
