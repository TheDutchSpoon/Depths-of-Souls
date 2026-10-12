# Fix hand-out — Phase 4.2 — Slice H3: Names — Round 2

Branch `4.2-h3`, fix commit `567051e`. The proof's base stays `origin/main` at `590d82a`; if it
moves, stop and ask Duncan. Standing rules: `.claude/workflow/coding-rules.md`.

This round changes `scripts/docs-check/` only:
- no file under `src/` changes, so the `src/` proof and every golden stay as they are;
- no living doc is edited (the design agent owns those);
- no rename, no deletion.

Line numbers are as of `567051e`.

## Background

`scripts/docs-check/names.ts` is the name guard that `npm run docs:check -- comments` runs over
`src/`. Its literal arm (pattern 20) reads every string, template and regex literal that is not a
module specifier (`context === 'specifier'`) or a test title (`context === 'title'`):

- for a slice-id shape (`literalHit`);
- for `comments`' `PATTERNS` with ids 1-9 (`provenanceHit`, bounded by `LAST_VALUE_PATTERN`).

A hit is reported once per literal, under pattern 20, as
`pattern 20, provenance in a string literal (pattern <id>, <what>)`. Its identifier arm
(pattern 19) matches a phase id mid-camel through the lookbehind `(?<=[a-z0-9])` in
`PHASE_IN_IDENTIFIER` (`names.ts:67`).

## 1. `ASSUMPTION:` in a value literal fails

Pattern 1 is `/\bASSUMPTIONS\b|\bASSUMPTION\b(?!:)/g`. It leaves the colon form to `comments`' own
rule, `ASSUMPTION_COLON` (`comments.ts:83`), which allows `ASSUMPTION:` in a comment that cites
`OPEN_QUESTIONS.md#<anchor>` and fails it in a title. The value arm doesn't run that rule, so
`export const a = 'ASSUMPTION: floor-1 clear'` passes today. A value literal can't cite an open
question, so `ASSUMPTION:` in one always fails.

Build:

- When a value literal has no slice-id hit and no pattern 1-9 hit, also test it against
  `/\bASSUMPTION:/`.
- Take the regex from `comments.ts`: export `ASSUMPTION_COLON` or pass it in beside `patterns`.
  Don't write a second copy.
- Report it as `pattern 20, provenance in a string literal (pattern 1, ASSUMPTION marker)`, so
  `--counts` keeps three guard rows.
- A title is still left to `comments`.

Tests, in `names.test.ts`'s `name guard, provenance words in value literals` block:

- Fail, each naming `src/x.ts:2:` and `(pattern 1, ASSUMPTION marker)`:
  - `'ASSUMPTION: floor-1 clear'`
  - `` `ASSUMPTION: ${x} clear` ``
- A title `it('ASSUMPTION: x', …)` is reported once, by `comments`
  (`pattern 1, ASSUMPTION: in a title`), with no pattern 20.

Mutation row: the `ASSUMPTION:` test removed.

## 2. Pin the two unpinned edges

Each of these mutations leaves every `docs-check` test green today:

- **`LAST_VALUE_PATTERN = 8`.** No fail case uses pattern 9 (plan item range or rule), so the
  bound is pinned from above (`'grill the kickoff'` is pattern 10) but not from below. Add the
  fail case `'items B2+ only'`, asserting `(pattern 9, plan item range or rule)`.
- **The lookbehind narrowed from `(?<=[a-z0-9])` to `(?<=[a-z])`.** Both mid-camel cases
  (`placeholderPhase4Config`, `configPHASE_4`) follow a letter. Add `tier2Phase3` to the
  `name guard, identifiers` fail list: a phase id after a digit. Check that no other arm catches
  it when the digit is dropped from the lookbehind.

Mutation rows: both mutations above, each naming the new test that fails.

## 3. Read JSX text

A string inside JSX is read (`<p title="before Phase 8">` fails), but the text between tags is a
`JsxText` node, which neither `literalsOf` nor `comments` reads. So
`<p>not available before Phase 8</p>` passes today.

Build:

- Add a function of its own in `tokens.ts`, for example `jsxTextsOf(file, text)`. It returns each
  `JsxText` node whose text isn't only whitespace, with the line of its first non-blank character.
- Don't add JSX text to `literalsOf`: `comment-proof --renames` uses that function, and its output
  must not change.
- `names.ts` reads each JSX text as a value literal: `literalHit(text, false)`, then patterns 1-9,
  then `ASSUMPTION:`. It reports under pattern 20, as above.

Tests, in `names.test.ts`, with a `.tsx` file:

- Fail, naming the file and line:
  - `<p>not available before Phase 8</p>` (pattern 2)
  - `<p>h2b2-x</p>` (the slice-id message)
  - a JSX text on the third line of a multi-line element, naming line 3
- Pass: `<p>a brief stun</p>`.

Mutation row: the JSX text read removed.

Measurement: `src/` has 3 `.tsx` files with 6 non-blank JSX text nodes. None is a hit on the
branch or on `main` (`git archive 590d82a`). Show both runs in `evidence/counts.txt`.

## Must stay green

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`, and
`npm run docs:check -- citations`, `-- comments` and `-- budgets`.

- `--counts` on the branch shows 0 for rows 18-20.
- The branch's `scripts/` over a `git archive 590d82a` extraction still finds the same 7 value
  literals as round 2, and nothing new: row 20 reads 118 hits in 52 files.
- Re-run `comment-proof origin/main --mask evidence/mask.json --renames evidence/renames.json`.
  With `src/` unchanged it must report the same 151 OK and the single FAIL,
  `engine/corpus-digest.test.ts`, byte-equal to `evidence/comment-proof.txt`.

Test counts: `src/` unchanged at 1,358, file by file. `scripts/` grows only by the new tests;
report the per-file numbers in `evidence/test-counts.txt`.

Update `names.ts`'s header comment and the guard bullet in `record.md` to say what the guard now
reads.

## Report

Write `report-r3.md` in this mailbox. It holds:
- each item above with what changed, its tests, and its mutation rows (rerun on the final code);
- the gates, in `evidence/gates.txt`;
- the `comment-proof` result;
- the test counts;
- the `main` and branch measurements;
- anything you could not do as written, with why.
