# Hand-out r1 — Phase 4.2 — Slice H1: Comment tooling

Standing rules: `.claude/workflow/coding-rules.md`. The branch is `4.2-h1`. This slice adds
`scanner.ts`, `comments.ts`, `comment-proof.ts` and `citations <file>…` to `scripts/docs-check/`.
`comment-proof <base> [--mask <file>]` proves that the working tree differs from `<base>` only in
comments. It prints each changed `.ts/.tsx/.js` file in scope with
`ts.createPrinter({ removeComments: true })`, compares the two prints, compares pragma comments
apart as (text, `tokenIndex`), and fails a new duplicate full test name. The review found three
fixes and one widening, all in `scripts/docs-check/comment-proof.ts`,
`scripts/docs-check/scanner.ts` and their tests. Nothing under `src/`, `vite.config.ts`,
`eslint.config.js` or `.github/` changes. Golden policy: byte-identical, trivially.

## Fixes

1. **A syntax error fails.** TypeScript's parser recovers from a stray token by skipping it: a
   stray `)` after the last statement of a function body gives the same AST and print as the base,
   so `comment-proof` passes it today. In `compareCode`, a file whose working-tree text or base
   text has a syntactic diagnostic fails with
   `FAIL <path>: syntax error at line <n>: <message>` (working tree or base, whichever has it). Use
   `ts.transpileModule(text, { fileName: file, reportDiagnostics: true }).diagnostics` (public API),
   or the parsed `SourceFile`'s parse diagnostics, and say which in the report.
   - Test: a base `export function f(x: number) {\n  return x\n}\n` with `\n  )` inserted after
     `return x` fails, naming the file and the reason. A comment-only change in the same file still
     passes.
   - Mutation: drop the check. The test fails.
2. **A pragma appended after the last base pragma has its own test.** `compareCode` catches a
   pragma added after every base pragma (including any pragma added to a file with none) only
   through `bp.length !== hp.length`. No test fails when that condition is removed, because the
   existing "added pragma" test prepends `// @ts-ignore`, which the `findIndex` catches.
   - Tests: a file with no pragmas gains `/* eslint-disable */` above a statement and fails with
     `pragma differs`. The pragma test file gains a pragma after its last one and fails.
   - Mutation: drop `|| bp.length !== hp.length`. Both tests fail.
3. **Each condition of the duplicate-name check has its own test.** The check fails when the
   working tree has more duplicated full names **or** more excess copies than the base. When the
   base has no duplicates, the two agree, and that is the only case the tests plant.
   - A comment-only diff with exact masks can't easily produce either case (a mask's `old` must
     occur exactly `count` times, so one of three identical titles can't be renamed). So export
     the comparison as a helper over two lists of full names, and have `compareCode` call it.
     Tests on the helper: base `[t, t]` → head `[t, t, t]` fails (excess grows, names don't); base
     `[t, t, t]` → head `[t, t, u, u]` fails (names grow, excess doesn't); base `[t, t]` → head
     `[t, t]` passes. The existing `comment-proof` duplicate tests stay as the end-to-end site.
   - Mutations: keep only the names condition, then only the excess condition. Each kills one
     test.

## More pragma forms (Duncan's call)

4. **`isPragma` in `scanner.ts` also takes the comment forms tools read beyond A8's list.** Today a
   rewording of `/* eslint no-console: off */` and a deletion of `/*#__PURE__*/` both pass
   `comment-proof`, though each changes what a tool does. Add, anchored at the start of the body
   like the others:
   - in a `/* */` comment only (ESLint reads config comments only from blocks): `eslint ` (the
     word, then whitespace: inline rule config), `global `, `globals ` and `exported `;
   - in any comment: `#__PURE__`, `@__PURE__`, `#__NO_SIDE_EFFECTS__`, `@__NO_SIDE_EFFECTS__`.

   Add rows to the scanner's pragma tests (each form returned; `// eslint no-console: off` and
   `// global state is reset` as line comments not returned) and to `comment-proof`'s "fails a
   changed …" table (a changed ESLint config comment; a deleted `/*#__PURE__*/`). No new mutation
   run: the existing unanchored-pragma mutation covers the anchor.

## Evidence and gates

- `evidence/mutation-check.txt` gains the runs above, each killed.
- `evidence/planted-faults.txt` gains, on the 4.2-G clone with the same invocation: a stray `)`
  appended to `src/engine/rng.ts` → exit 1 naming the file; and a planted `/* eslint … */` comment
  reworded → exit 1 naming the file.
- Gates as in `.claude/workflow/coding-rules.md`: `npm run test`, `lint`, `format:check`, `build`,
  `npx tsc -b`, `npm run docs:check -- citations` and `-- budgets`. The `docs-check` project's
  count rises by the new tests only; the count outside `scripts/` stays 1357, file by file.
  `comments` still fails on the tree by design, and is still not in CI.
- `git diff --stat origin/main -- src vite.config.ts eslint.config.js .github` stays empty.

Write `report-r2.md` in `.claude/phases/4.2/H1/`: each item above with the test names and mutation
results, the new totals, and any choice you made. Update `record.md` if a decision changed. Nothing
committed, nothing deleted.
