# Coding-agent rules (every slice, every step)

Read by `/slice-plan`, `/slice-build` and `/slice-fix`. The slice's `kickoff.md` adds what is
specific to one slice; these rules hold for all of them. If the kickoff and these rules disagree,
stop and say so.

## Where the slice lives

A slice id like `4.1-H2b2` maps to the mailbox folder `.claude/phases/4.1/H2b2/` (phase = the text
before the first `-`, slice = the text after it). Everything you produce for the slice goes in that
folder, except code and the phase record (see "Phase record" below).

The folder holds only your step files (`plan.md`, `report-r<N>.md`), all Markdown. Output your
report cites as evidence (simulator reports, corpus scans, a table a script printed) goes in the
slice's `evidence/` folder, and the report names it by that path (WORKFLOWS "What a mailbox
keeps"). Don't leave marker files, logs or duplicate runs there, and don't keep a one-off script
that rewrites `src/`: keep its printed table and quote its rule in the report. Background runs
write their scratch output outside the repo.

## Before writing anything, read

- `.claude/CLAUDE.md`;
- the slice's `kickoff.md`, and every file its reading list names;
- `.claude/CONVENTIONS.md`, and the spec files the kickoff names (`.claude/spec/<subsystem>.md`;
  `CLAUDE.md` has the map) — the spec you build against. If the change reaches a subsystem whose
  spec file the kickoff doesn't name, read that file too and say so in the plan. The docs win over
  anything in the brief or kickoff if they disagree: flag the conflict, don't guess;
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
- **The living docs are the design agent's:** `CLAUDE`, `CONVENTIONS`, `VISION`, `OPEN_QUESTIONS`,
  `spec/`, `ROADMAP`, `WORKFLOWS`, `workflow/`, the briefs, and `content/`, `species/`,
  `specializations/`. Don't edit them, even to fold a decided item or flip an "until <slice>"
  marker: put what they need under **Spec questions** (and **Content changes**) in your report.
  Your files are the mailbox, the code and the phase record.
- **Phase 4.2 exception** (Phase 4.2 only). In 4.2-A and 4.2-G you write living docs **by script**, exactly as
  `.claude/phases/4.2/brief.md` and the slice's `brief.md` specify, and nothing else in them. In 4.2-B
  to F you only verify (`/slice-verify`): you never edit the docs.

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

Write the slice's record to `record.md` in the slice folder.

A record is immutable once its slice merges. A content slice describes its content in the record
and the report's **Content changes**; the design agent writes the content doc from them at the PR
review.
