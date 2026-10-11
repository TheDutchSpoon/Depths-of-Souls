# Record — Phase 4.2 — Slice H1: Comment tooling

**Status: built.** Golden policy byte-identical, trivially: no file under `src/`, `vite.config.ts`,
`eslint.config.js` or `.github/` changed. Test count 1675 (1674 passed, 1 skipped): `main`'s 1357 file
by file outside `scripts/`, plus 318 tests of the docs checks (121 before this slice, 197 added).

## What was built

All in `scripts/docs-check/`, wired in `cli.ts` and `USAGE`; `scripts/docs-check.ts`'s header and
`git.ts`'s comment say which modes call git.

- **The scanner** (`scanner.ts`, `scanSource`): the TypeScript parser (`ts.createSourceFile`, a
  `ScriptKind` per extension), comments read at the leaf tokens of the parse tree, trailing and leading
  ranges both at a token's full start and kept only if they end before the token starts, JSDoc nodes
  not walked. It returns comments, blocks (consecutive standalone `//` lines, a `/* */` comment or a
  trailing comment, with a source line for every character), titles (`describe|it|test|suite` through
  `.each/.skipIf/.only/…` chains, template titles on their literal parts, each with the titles that
  enclose it) and pragmas (exact text plus the index of the next token). On today's tree: 403 files,
  7,178 comment ranges, 1,627 titles.
- **`comments`** (`npm run docs:check -- comments`): fails on a comment or test title that records where
  in the project's history a thing was decided. 17 patterns (`ASSUMPTION` markers, phase, slice and PR
  ids, review rounds, plan item ids, workflow words, `locked design …`, `decided at …`, `§N`, `brief`,
  `the plan`, `plan review`, `sign-off`); `ASSUMPTION:` passes only beside an `OPEN_QUESTIONS.md#<anchor>`
  in its block and never in a title. It walks all of `src/` (no exemption) and the two config files,
  reads the working tree and never calls git. **It fails on `main` by design (2,962 problems) and is not
  in CI**: 4.2-H2's sweep clears it and adds it. `--counts` prints per-pattern counts and the totals;
  `--quotations` lists quotations beside an anchor that the anchor's section does not contain
  (`sectionOf` in `anchors.ts`); both report only and exit 0.
- **`comment-proof <base> [--mask <file>]`** (by hand, never in CI): proves a diff is comment-only. It
  prints both sides of each changed `.ts/.tsx/.js` file with the TypeScript printer with comments removed
  and compares; first fails a file with a syntax error on either side (the parser skips a stray token,
  so the prints would agree); compares pragmas apart as (text, governed token), where a pragma is also
  an ESLint config comment (`/* eslint rule: off */`, `global`, `globals`, `exported`, block comments
  only) or a `#__PURE__` / `@__PURE__` / `#__NO_SIDE_EFFECTS__` / `@__NO_SIDE_EFFECTS__` annotation; fails an added, deleted or renamed file
  and a changed non-code file; leaves git-ignored files out of the file set; and fails a new duplicate
  full test name. A mask (`{ file, old, new, count? }`) names the string literals the change may reword:
  each `old` must occur exactly `count` times in the base, a `new` text may already occur in the file
  (the head must hold its base occurrences plus the group's counts), and an entry for a file that did not
  change is an error. Same `file` and `old` twice, a chain or swap, and `old` equal to `new` are exit 2.
  It reads `<base>` with `git show` and `git ls-tree` only.
- **`citations <file>…`**: checks exactly the named files by the living-doc rules, `phases/` included;
  with no paths the output is `main`'s byte for byte. A path outside the root, a missing file or a
  directory is exit 2. `UsageError` lives in `usage.ts`.

## Decisions made while building

- Walking JSDoc does not duplicate a comment here (the end-before-start filter drops the re-scanned
  text); it would inflate the token index and move every later pragma, so a comment-only rewording of a
  JSDoc comment would fail `comment-proof`. That is what the dedicated tests pin.
- A quotation belongs to the nearest anchor before it, and "four words" counts words with a letter or
  digit.
- A mask text is shown JSON-escaped and clipped at 140 characters; a string literal is masked over its
  whole span, a template part over its inside.
- `comment-proof` prints `OK` only for changed files.
- The syntax check uses `ts.transpileModule(…, { reportDiagnostics: true })` (public API) with
  `jsx: Preserve`; the first diagnostic of the working tree, else of the base, is reported.
- The duplicate-name comparison is the exported `duplicatesGrew(baseNames, headNames)`: true when the
  head has more duplicated names or more excess copies than the base.

## Evidence

`phases/4.2/H1/evidence/` (see `report-r1.md`): the scanner totals and the per-pattern counts, the
word-pattern hits, the quotations against 4.2-G's list, the 4.2-G rehearsal (88 files OK,
`vite.config.ts` FAIL, then exit 0), the planted faults, `citations <file>…`, the mutation check (36,
then 7 more in round 2) and the gates. Round 2 is `report-r2.md`.
