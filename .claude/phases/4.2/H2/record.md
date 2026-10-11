# Record — Phase 4.2 — Slice H2: Code comments, the sweep

**Status: built.** Golden policy byte-identical: every golden's expected values and the corpus digest are unchanged; the 123 changed
golden and corpus fixtures export the same values as `main`'s. `npm run corpus:update` was not run in the repo. Test count 1682 (1681
passed, 1 skipped), the same as `main` file by file (210 files).

## What was built

- **The sweep.** Every comment and every `describe`/`it`/`test` title in `src/`, `vite.config.ts` and `eslint.config.js` is brought to
  `CONVENTIONS.md#comment-why-not-what`: `npm run docs:check -- comments` passes (7,003 comments and 1,627 titles in 403 files; it reported
  2,962 problems in 343 files on `main`). 347 files changed, 345 title parts reworded, no code changed.
  - **A one-off script** (the scratchpad, not the repo) did the mechanical part: 1,182 edits under rules M1-M6 (labels, tag-only
    parentheticals, mixed parentheticals, `(<tag> -- <why>)`, title suffixes). A bare id is removed only inside a parenthetical with a
    non-id tag or directly after one; id-only parentheticals and labels were left for the hand pass.
  - **The hand pass** cleared the 686 problems the script left, then the bare ids (332 rewritten, 259 lines kept as derivation labels and
    test-data names), the history markers (516 rewritten, 298 kept), the 38 forward pointers, the 48 quotations, the brief's residue and the
    two `// ASSUMPTION:` markers.
  - **Review round 1** (`handout-r1.md`) restored the eight anchors the mechanical pass dropped (no hunk of the diff now loses a `.md#` citation
    without re-citing or moving it), rewrote the comments that had gone false, re-pointed the citations and quotations that did not hold
    (the perk comments in `data/specializations.ts` now cite the perk entries), cleared the references to deleted history and the review and
    slice words `comments` cannot see, and rewrapped the lines the join made longer than 120 columns.
  - **Review round 2** (`handout-r2.md`) dropped the last three plan-item ids (`B-2`, `B-9`), the "Nit (review)" label and "moved to" history in `combat.ts`, named the Sporch Ashborn where two comments named a creature that does not exist, replaced three quotations of an older Sorcerer-starter description (the innate spell is an `innate-spell` effect on the trait, not a gem), and rewrapped the comment lines whose inline code spans the rewrap had split. 11 comment lines hold an odd number of backticks that differ from `main`'s; each continues a span `main` already wrapped.
  - **Forward pointers cite the rule that states the wait**: the demo harnesses cite `CONVENTIONS.md#every-feature-phase-ships-a-demo`; the nine
    inert perks each cite their own entry (`specializations/<spec>.md#<perk>`), keeping "(gem system)" and "(equipment system)"; the rest cite
    the `## Not built` rule or the facilities rule. A title carries no anchor.
  - **The corpus header and `renderFixture`'s template** changed together, to the same text; the template part is a mask entry, proved by a
    scratch `corpus:update` that left the fixture byte-equal (D1).
- **`comments` in CI**: `.github/workflows/deploy.yml`'s `test` job runs it after `budgets` and before `npm run test`;
  `scripts/docs-check/ci.test.ts` asserts the step is there and in that order (its first test is retitled "the test job runs citations, budgets and comments").
  The tool (`scripts/docs-check/*.ts` other than `ci.test.ts`) is unchanged.

## Decisions made while building

- **D1 (plan review): yes.** The corpus header is proved by a real `corpus:update` in a scratch clone of the finished branch; the committed
  fixture is never regenerated.
- **Titles are not capitalised** when a leading label goes (the script capitalises only a plain lower-case word after a comment label; the one
  title it capitalised was fixed by hand).
- **Counterfactuals stay in the present tense**: "before the fix, X" became "were X" or "without the refusal, X would" when it states the trap
  a plausible change would fall into; "was X" with no trap was dropped.
- **T1-T5 stay**: they are the design targets `CONVENTIONS.md#balance-simulator` defines and the simulator prints as report rows, so the
  comments cite that rule instead of dropping the ids.
- **Non-title literals** (A14): 6 still carry a provenance word, all error or report strings, out of scope; counted in the report.
- **Decided, not built** items in `phases/4.2/H/brief.md` stay for the PR review (the docs' lists of CI modes, `spec/progression.md#inert-perks`,
  file names and identifiers).

## Evidence

`phases/4.2/H2/evidence/` (see `report-r1.md` and `report-r2.md`): the per-pattern counts before and after, the mask and the proof's output, the planted faults,
the mechanical rules and their table, the retitled tests, the bare ids, the history markers, the forward pointers, the quotations, the hand
rewrites, the brief's residue, the fixtures compared with `main`, the test counts, the corpus render, the mutation check on `ci.test.ts`, the
non-title literals and the gates.
