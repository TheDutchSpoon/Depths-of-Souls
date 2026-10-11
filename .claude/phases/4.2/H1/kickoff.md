# Kickoff — Phase 4.2 — Slice H1: Comment tooling

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: none. This slice is tooling in `scripts/docs-check/`; it rewrites no comment.
- `phases/4.2/H/brief.md`, all of it. `phases/4.2/H/brief.md#split` is this slice's boundary:
  everything the pre-split plan and its review put in `scripts/` is yours, the `src/` sweep is
  4.2-H2's.
- The pre-split mailbox `phases/4.2/H/`, which this slice builds on:
  - `plan.md` §0 (D1, D2), §1 (the probe numbers you reproduce), §3 (the modules), §7 (the
    mechanism → test table) and its checklist A1–A11. This is the design you carry into your own
    `plan.md`, corrected by the review. Don't build from the old plan directly.
  - `plan-review.md`, Round 1: plan fixes 2, 3, 5, 6, 7 and 10 and the calls on D1, D2 and A1–A11
    are binding here.
  - `kickoff.md`'s Traps, the ones on the scanner, titles, `comment-proof` and `citations`; the
    ones that matter for this slice are restated below.
- `CONVENTIONS.md#comment-why-not-what` and `CONVENTIONS.md#open-questions-get-an-interface`: what
  `comments` makes checkable. `CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`.
- 4.2-G's one-off proof, which `comment-proof` makes permanent: `phases/4.2/G/evidence/comment-proof.txt`
  and `retitled-tests.md`, and how `phases/4.2/G/report-r1.md` masked (every title wholesale,
  290 strings; this tool masks only listed literals). `phases/4.2/G/evidence/review-quotations.txt`
  is the regex quotation scan `--quotations` replaces.
- Code: `scripts/docs-check.ts` and all of `scripts/docs-check/` (conventions: root as an argument,
  `--root`, exit codes 0/1/2, `test-utils.ts`'s `makeTree` and `gitIn`), `tsconfig.node.json`,
  the `docs-check` project in `vite.config.ts`, the `renderFixture` template in
  `src/engine/corpus-digest.test.ts` (three `//` lines that are a string), and
  `src/engine/injured-allies.test.ts:149` (the tree's one pragma).

## Scope

Four pieces in `scripts/docs-check/`, each with its tests: **the scanner** on the TypeScript parser
(comments read at token positions, blocks, titles, pragmas); **`comments`**, with the report-only
`--counts` and `--quotations` (and `sectionOf` in `anchors.ts`), its pattern table being plan §3's
as corrected by plan fixes 2 (`ASSUMPTIONS:` fails) and 3 (`brief`, `the plan`, `plan review`,
`sign-off`); **`comment-proof <base> [--mask <file>]`**; and **`citations <file>…`**. Plus the
wiring: `cli.ts` and `USAGE`, `UsageError` moved to `usage.ts` (A1), `docs-check.ts`'s header and
`git.ts`'s comment (fix 10), both of which this slice's code makes stale.

**Out of scope:** any change under `src/`, `vite.config.ts`, `eslint.config.js` or `.github/`.
`comments` is **not** wired into `deploy.yml` or `ci.test.ts`: it fails on `main` until 4.2-H2's
sweep, and 4.2-H2 adds it. Also out: the mechanical rewrite script and the hand pass (4.2-H2), the
file-name and identifier check and `comment-proof`'s rename option (4.2-H3), and any living doc.

## Golden policy

**Byte-identical**, trivially: no file under `src/` changes, so every golden, the corpus digest and
the per-file test count under `src/` are untouched. The `docs-check` project grows by this slice's
new tests only.

## Traps

- **`comments` is red on `main`, by design.** Don't make it pass: no exemption list, no baseline
  file, no "warn" level, no CI step. Its run on the real tree is evidence for this PR, not a gate.
- **A word pattern must never fire on a game word.** 4.2-H2 has to reach zero hits without
  rewriting a true comment, so a false positive on today's tree is a pattern bug, not work for
  4.2-H2. That matters most for the patterns that share words with the game: 11 ("locked": action
  locks, `lockedTurns`, a spell "still locked"), 12 ("decided": "has already decided this round's
  defending status"), and fix 3's `brief`, `the plan`, `plan review`, `sign-off`. Narrow the
  pattern until every hit on today's tree is provenance.
- **A raw `ts.createScanner` mis-scans** template literals, regex literals and JSX text. Build on
  `ts.createSourceFile` with the `ScriptKind` per extension and read comment ranges at token
  positions, keeping a range only if it ends before the token's start.
- **JSDoc nodes must not be walked** (fix 5). `getChildren()` returns a node's JSDoc as children,
  and reading comment ranges at their tokens re-scans the inside of a comment as code:
  `/** see http://x // y */` must give one comment, not two.
- **Leader stripping has two code paths** (fix 6): `//` runs and `/* */` blocks. `Phase\n// 8` and
  `Phase\n * 8` must both be found, at the line of `Phase`.
- **Titles come in more shapes than `it('…')`**: `it.each` (16), `test.each` (3),
  `describe.skipIf` (2), and 8 template titles with `${…}`, checked on their literal parts only
  (A6). An identifier title is not a title.
- **Pattern 1 is `\bASSUMPTIONS\b|\bASSUMPTION\b(?!:)`** (fix 2). `ASSUMPTION:` passes only with an
  `OPEN_QUESTIONS.md#` citation in the same block (A5), and fails in a title.
- **Pragmas are matched at the start of the comment body** (fix 7), as TypeScript and ESLint read
  them; prose that mentions "eslint-disable" is not a pragma. `@vitest-environment` may sit
  anywhere in the leading docblock.
- **A mask is exact or it fails.** Each `{ file, old, new, count? }` entry is consumed exactly
  `count` times on both sides, matched on the literal's cooked text, so a requoted title (Prettier
  switches quotes when an apostrophe goes, as in 4.2-G) still passes. A non-title literal (the
  `renderFixture` template part) is masked the same way and printed in the report. A changed
  literal that isn't listed fails.
- **`comment-proof` fails on more than a changed print**: an added, deleted or renamed file in
  scope, a changed pragma (`removeComments` strips pragmas, so they are compared apart), and a new
  duplicate full test name in a file (A9; two titles that converge fail closed). A file git
  ignores (`.gitignore` has `.DS_Store`, `*.local`, `*.sw?`) is not part of the tree and must not
  fail the file-set check; an untracked file that isn't ignored must. Say in the plan how the walk
  tells them apart.
- **Git stays read-only and scoped.** `comment-proof` reads `<base>` with `git show` and
  `git ls-tree`; `comments` and `citations` never call git (CI's checkout is shallow). Tests that
  need git build a scratch repo with `gitIn`; the real-tree rehearsal below runs in a scratch clone
  outside the repo. Nothing runs `git worktree`, `checkout` or any write in Duncan's tree.
- **`citations` with no paths is today's code path, byte for byte.** CI's call and its output
  don't move. A named file is checked by the living-doc rules (resolve, no old form, no label
  form), `phases/` included; a path outside the root, a missing file or a directory is exit 2.
- **`scripts/` runs under Node's type stripping and `tsconfig.node.json`**: `.ts` import
  extensions, `erasableSyntaxOnly` (no enums, parameter properties or namespaces), `noUnusedLocals`.
  `docs-check.ts`'s header stops saying "no dependencies": it imports `typescript`, a devDependency
  `npm ci` installs (A1).
- **The quotation scan is approximate** (a quote cut at a wrap, markup). It reports and exits 0
  (D2, A7). Where it differs from 4.2-G's regex scan, the difference is explained, not tuned away.

## Must stay green

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations` and `-- budgets`. The test count under `src/` is unchanged file by
file; the `docs-check` project's count rises by the new tests only, reconciled file by file. Not a
gate: `npm run docs:check -- comments`, which fails on this branch until 4.2-H2.

## The PR must prove

- **No `src/` change:** `git diff --stat origin/main -- src vite.config.ts eslint.config.js .github`
  is empty.
- **The scanner reproduces the probe:** on the branch, the totals (files, comment ranges, titles,
  title shapes) against plan §1's probe (403 files, 6,949 comment ranges, 1,627 titles; 1,598
  plain, 19 `.each`, 2 `skipIf`, 8 templates), every difference explained; and the
  `comments --counts` table per pattern (comments, titles, files) → `evidence/counts.txt`.
- **No game word is hit:** every hit on today's tree of patterns 11 and 12 and of fix 3's word
  patterns, listed, each one provenance; and the "locked" game uses (`isActionLocked`,
  `lockedTurns`, the SLOW "(locked)", "still locked") listed by grep with no hit among them →
  `evidence/word-patterns.txt`.
- **`comments`:** per the §7 table, a planted tag of each pattern fails in a comment and in a
  title, the "avoids" variant passes; `ASSUMPTIONS:` fails; `ASSUMPTION:` passes only with its
  citation; it runs with no git on PATH and no `.git`.
- **`--quotations` on today's tree** against 4.2-G's `review-quotations.txt` (about 40 comments and
  one title): both counts, every difference explained → `evidence/quotations.txt`.
- **`comment-proof` on a real comment-only diff.** In a scratch clone outside the repo, at
  `a7c4fa2` (4.2-G's merge), run `comment-proof 3fd6a8f` (its first parent) with a mask file
  listing exactly the literals 4.2-G changed, derived from 4.2-G's diff: the 10 titles in
  `retitled-tests.md` and the `renderFixture` template part. Expected: 88 files OK, each with its
  masked pairs printed, and `vite.config.ts` **FAIL**, because 4.2-G added the `docs-check` Vitest
  project, a real code change; exit 1. With `vite.config.ts` reset to `3fd6a8f` in the clone,
  exit 0. Any other failing file or unconsumed mask entry is a finding about 4.2-G or the tool:
  report it, never widen the mask to pass → `evidence/g-rehearsal.txt`.
- **Planted faults** on that clone, each exit 1 naming the file: a code change, a pragma change, an
  unlisted title change, an added file, a deleted file, an unconsumed mask entry; and an ignored
  file (`.DS_Store` under `src/`) that does **not** fail → `evidence/planted-faults.txt`.
- **`citations <file>…`:** passes on this kickoff (`.claude/phases/4.2/H1/kickoff.md`); fails on a
  planted label form and a planted unresolved anchor in a scratch file under `phases/`; exit 2 on a
  path outside the root, a missing file and a directory; with no paths, its output on the branch is
  identical to `main`'s (the diff shown) → `evidence/citations-files.txt`.
- **Mechanism → test**, with a mutation run for each: plan §7's list without the CI step, plus
  walking JSDoc (fix 5), one leader-stripping path removed (fix 6), an unanchored pragma match
  (fix 7) and pattern 1 back to `ASSUMPTIONS?\b(?!:)` (fix 2) → `evidence/mutation-check.txt`.
- **Gates**, with the test counts reconciled → `evidence/gates.txt`.
- **To delete:** none expected.

---

## Docs edited at this kickoff

- `phases/4.2/H/brief.md#split`: which pre-split plan items and review fixes go to 4.2-H1 (all of
  `scripts/`: fixes 2, 3, 5–7, 10, D1 and D2 for the check, A1–A11) and which to 4.2-H2 (fixes 1,
  4, 8, 9, 11, 12, D3, A12–A16), Duncan's call at this kickoff, correcting the plan review's
  allocation of fixes 2 and 3 and of A2–A7, A9 and A10 to 4.2-H2; and "both slices' kickoffs"
  made "each slice's kickoff" (there are three).
