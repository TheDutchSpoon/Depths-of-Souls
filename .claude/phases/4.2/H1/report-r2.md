# Report r2 — Phase 4.2 — Slice H1: Comment tooling

Built to `handout-r1.md`. Changes are in `scripts/docs-check/comment-proof.ts`, `scanner.ts` and their
two test files. Nothing under `src/`, `vite.config.ts`, `eslint.config.js` or `.github/` changed.
Nothing committed, nothing deleted.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 210 files, 1675 tests: 1674 passed, 1 skipped (`evidence/gates.txt`) |
| `npm run lint` | clean |
| `npm run format:check` | clean on the tree (see **To delete** for `.vitest/`) |
| `npm run build` | passes |
| `npx tsc -b` | passes |
| `npm run docs:check -- citations` | `PASS, 547 citations in 436 files` |
| `npm run docs:check -- budgets` | 12 files, 0 over budget |
| `npm run docs:check -- comments` | still fails on the tree by design; not in CI |

**Test count, file by file** (JSON-reporter run): 1657 → 1675 (+18), all in the `docs-check` project.
Outside `scripts/`: 1357 → 1357, no file differs. `comment-proof.test.ts` 56 → 65 (+9),
`scanner.test.ts` 34 → 43 (+9); no other file moved. `git diff --stat origin/main -- src
vite.config.ts eslint.config.js .github` is empty. Golden policy byte-identical, trivially: no
golden, fixture or corpus digest is touched.

## Hand-out items

**1. A syntax error fails.** `compareCode` first calls `syntaxError(file, text)` on the working tree,
then on the base, and returns `FAIL <path>: syntax error at line <n>: <message>` for the first that
has a diagnostic. I used **`ts.transpileModule(text, { fileName, reportDiagnostics: true,
compilerOptions: { jsx: Preserve } })`** (public API), not the parsed `SourceFile`'s diagnostics
(`parseDiagnostics` is internal). `jsx: Preserve` stops a `.tsx` file from reporting the missing JSX
option. The check returns early: a broken file gets only that reason.

- Tests (`comment-proof syntax errors`): *fails a stray token the parser skips, naming the file and
  the reason* (the hand-out's `return x\n  )` case; line 3); *fails a file that was already broken in
  the base*; *passes a comment-only change in the same file*.
- Mutation (`const broken` set to `undefined`): killed by the first two.
- One existing test row needed a fix, not the tool: `src/b.tsx`, `<p>` → `<div>` replaced only the
  opening tag, which is now a syntax error. The row is `<p>{"x"}</p>` → `<div>{"x"}</div>` and still
  expects `code differs`.

**2. A pragma appended after the last base pragma.** Test *fails a pragma appended after the last
pragma, or added to a file with none* (`comment-proof pragmas`): `/* eslint-disable */` appended after
the last pragma of the pragma file (at the end of file, comment-only), and the same comment above a
statement of a file with no pragma; both fail with `pragma differs`. Mutation (drop `||
bp.length !== hp.length`): killed by this test alone. No code change here.

**3. Each duplicate-name condition has its own test.** `duplicatesGrew(baseNames, headNames)` is
exported from `comment-proof.ts` and `compareCode` calls it. Tests (`duplicatesGrew`):
`[t,t]` → `[t,t,t]` fails (excess grows, names don't); `[t,t,t]` → `[t,t,u,u]` fails (names grow,
excess doesn't); `[t,t]` → `[t,t]` passes. The two existing end-to-end duplicate tests stay.
Mutations: names-only is killed by the first test, excess-only by the second.
Choice: the helper returns a boolean; the failure message still lists the head's duplicated names.

**4. More pragma forms.** `isPragma` takes, in `/* */` comments only, a body starting `eslint `,
`global `, `globals ` or `exported ` (`BLOCK_PRAGMA`), and in any comment a body starting `#__PURE__`,
`@__PURE__`, `#__NO_SIDE_EFFECTS__` or `@__NO_SIDE_EFFECTS__` (added to `PRAGMA`).

- Scanner tests: *takes the tool comment …* (8 rows, each form returned) and *does not take the
  block-only forms as line comments* (`// eslint no-console: off`, `// global state is reset`).
- `comment-proof` tests: a changed-pragma table row (`/* eslint-disable no-console */` →
  `/* eslint no-console: off */`) and *fails a reworded ESLint config comment and a deleted
  /*#__PURE__*/*.
- Extra mutations I ran, beyond "no new mutation run": dropping the block-only branch (5 killed),
  letting the block-only forms match in line comments (1 killed), dropping the `__PURE__` forms (5
  killed). The existing unanchored-pragma mutation (#5) covers the anchor, as you said.
- Note: a JSDoc comment starting `/** global …` or `/** eslint …` is a block comment and so reads as
  a pragma; rewording it fails `comment-proof`. ESLint reads such blocks too, so I kept it.

## Evidence

- `evidence/mutation-check.txt`: 7 runs appended (marked `#R2`), each killed, each file hash-checked
  after restore. 36 + 7 = 43.
- `evidence/planted-faults.txt`: on the 4.2-G clone, same invocation and mask, baseline exit 0.
  A stray `)` appended to `src/engine/rng.ts` → exit 1, `FAIL src/engine/rng.ts: syntax error at
  line 57: Declaration or statement expected.` A `/* eslint no-console: off */` comment appended to
  the same file → exit 1, `FAIL src/engine/rng.ts: pragma differs …`. **Deviation:** `3fd6a8f` holds
  no `/* eslint … */` comment to reword, so the planted fault is the comment *added*; the reword is
  covered by the unit test. The clone was restored after each run.
- `evidence/gates.txt`: round-2 block appended.
- `record.md`: status counts (1675; 197 tests added), the syntax check, the new pragma forms and
  `duplicatesGrew` are in.

## Spec questions

None new. The round-1 items stand: `comment-proof`'s mask format, its syntax-error rule and its
pragma forms (now also `eslint ` config comments and `__PURE__` annotations) are only in code and
tests, and have no home in the workflow docs yet.

## Content changes

None.

## To delete

- `.vitest/` at the repo root: a `json/output.json` written by the `--reporter=json` runs I used for
  the mutation check and the file-by-file count (the project's Vitest config sends the JSON reporter
  to that folder). It is untracked and makes `prettier --check .` warn; `npm run format:check` is
  clean without it.

## Files

Changed: `scripts/docs-check/{comment-proof,scanner}.ts` and `{comment-proof,scanner}.test.ts`.
Mailbox: this report, `record.md`, `evidence/{mutation-check,planted-faults,gates}.txt`.
