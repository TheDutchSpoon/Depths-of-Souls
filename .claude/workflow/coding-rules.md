# Coding-agent rules (every slice, every step)

Read by `/slice-plan`, `/slice-build` and `/slice-fix`. The slice's `kickoff.md` adds what is
specific to one slice; these rules hold for all of them. If the kickoff and these rules disagree,
stop and say so.

## Where the slice lives

A slice id like `4.1-H2b2` maps to the mailbox folder `.claude/phases/4.1/H2b2/` (phase = the text
before the first `-`, slice = the text after it). Everything you produce for the slice goes in that
folder, except code and the phase record (see "Phase record" below).

## Before writing anything, read

- `.claude/CLAUDE.md`;
- the slice's `kickoff.md`, and every file its reading list names;
- `.claude/CONVENTIONS.md` and `.claude/GAME_DESIGN.md` — the spec you build against. The docs win
  over anything in the brief or kickoff if they disagree: flag the conflict, don't guess;
- the current `src/engine` and the existing goldens (build against real code, not memory).

Don't read `.claude/archive/` unless the kickoff points you there.

## Toolchain

`npm ci`; your Node and tool versions match the lockfile (CONVENTIONS "Local runs match CI's
toolchain"). If a tool behaves unexpectedly, check its `--version` against `package-lock.json`
before designing around it.

## Rules

- Stay in this slice's scope; if it depends on an unbuilt slice, stop and say so.
- Every ASSUMPTION in scope: mark it inline AND collect it in the plan's checklist.
- Golden policy: as the kickoff declares it (WORKFLOWS "Golden policy").
- Goldens hand-derived (setup, arithmetic and random draws in comments) for focused cases; big
  integration goldens labeled generated-then-checkpoint-verified. No run-then-pasted goldens. New
  goldens replay through the shared golden runner.
- Every new or changed mechanism has a test that fails with it removed, at every site the mechanism
  lives.
- Engine stays pure (no UI/store/data imports in `src/engine`).
- Green all gates before reporting done: `npm run test`, `npm run lint`, `npm run format:check`,
  `npm run build`, `npx tsc -b`.
- Leave `main` green and deployable; a demo consumes the engine, it doesn't leak into it.
- **Never commit, never delete files.** Say what needs deleting; Duncan commits and deletes.
- **The living docs are the design agent's:** `CLAUDE`, `CONVENTIONS`, `GAME_DESIGN`, `ROADMAP`,
  `WORKFLOWS`, `workflow/`, the briefs, and `content/`, `species/`, `specializations/`. Don't edit
  them, even to fold a decided item or flip an "until <slice>" marker: put what they need under
  **Spec questions** (and **Content changes**) in your report. Your files are the mailbox, the code
  and the phase record.

## Report format (`report-r<N>.md`)

State how each claim was checked:

- the gates, with the test count reconciled file by file against `main`;
- the golden policy: expected values compared by importing the fixtures, not by reading diffs;
- the corpus digest: unchanged, or regenerated once (only via `npm run corpus:update`) with every
  changed fight attributed;
- for each mechanism, the test that fails with it removed;
- **Spec questions:** anything that surfaced a question the docs don't answer, so the docs get
  updated before the next slice, and any living-doc text your change makes stale (file + line);
- **Content changes:** each content behaviour the slice changes, as built (the creature, trait,
  spell or status, its numbers and what it now does), so the design agent can fold the content
  docs against the code;
- **To delete:** files that need deleting, if any.

## Phase record

- If `.claude/phases/<phase>/brief.md` exists (new layout, Phase 4.5 onward): write the slice's
  record to `record.md` in the slice folder.
- Otherwise (Phase 4.1): append the slice's section to the phase record,
  `.claude/phases/phase-4.1-fix-and-consolidation.md`, as before.

A record is immutable once its slice merges. A content slice describes its content in the record
and the report's **Content changes**; the design agent writes the content doc from them at the PR
review.
