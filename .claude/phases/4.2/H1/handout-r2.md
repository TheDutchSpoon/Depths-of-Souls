# Hand-out r2 — Phase 4.2 — Slice H1: Comment tooling

Standing rules: `.claude/workflow/coding-rules.md`. The branch is `4.2-h1`. This slice adds
`scanner.ts`, `comments.ts`, `comment-proof.ts` and `citations <file>…` to `scripts/docs-check/`.
`comment-proof <base> [--mask <file>]` proves that the working tree differs from `<base>` only in
comments. For each changed `.ts/.tsx/.js` file in scope, it first fails a file with a syntax error
on either side (`syntaxError` in `compareCode`). It then compares the prints made by
`ts.createPrinter({ removeComments: true })`, compares pragma comments apart (`isPragma` in
`scanner.ts`: `PRAGMA`, plus `BLOCK_PRAGMA` for block comments only) and fails a new duplicate full
test name. The review found two fixes and one labeling change, all in
`scripts/docs-check/comment-proof.ts`, `scripts/docs-check/scanner.ts` and their tests. Nothing under
`src/`, `vite.config.ts`, `eslint.config.js` or `.github/` changes. Golden policy: byte-identical,
trivially.

## Fixes

1. **A `.d.ts` file must not crash the syntax check.** `syntaxError` calls `ts.transpileModule`,
   which emits nothing for a declaration file and throws `Debug Failure. Output generation failed`
   (TypeScript 6.0.3) before it returns its diagnostics. A comment-only edit to a `.d.ts` file now
   makes `comment-proof` print that message and exit 1, without naming the file. Before the syntax
   check, the same edit passed. `src/engine/__corpus__/node-shims.d.ts` is such a file, and the next
   slice rewords its comments.
   - Get the syntactic diagnostics in a way that works for every in-scope file. One way, checked:
     build a one-file program, `ts.createProgram([file], { noLib: true, noResolve: true, allowJs:
     true }, host)`, whose host's `getSourceFile` returns
     `ts.createSourceFile(file, text, ts.ScriptTarget.Latest)`. Then read
     `program.getSyntacticDiagnostics(sourceFile)`. That gives no diagnostic for a clean `.d.ts`,
     `.ts`, `.tsx` with JSX and `.js`, and `Declaration or statement expected.` for a stray `)` in a
     `.ts` or a `.d.ts`. Any public API that does the same is fine; say which you used.
   - Pass a compiler option only if a test fails without it. Today's `jsx: Preserve` changes nothing:
     no test fails without it, and no file on the tree reports a diagnostic either way.
   - Tests: a comment-only change to `src/x.d.ts` (`// shim\ndeclare const p: number\n`) passes; a
     stray `)` after the declaration fails with the syntax-error reason, naming the file. The three
     existing syntax tests stay.
   - Mutation: send `.d.ts` files back through `transpileModule`. The `.d.ts` pass test fails.
2. **Pin `BLOCK_PRAGMA`'s anchor and word boundary.** Today, dropping the `^` from `BLOCK_PRAGMA`
   leaves the suite green, though 10 block comments on today's tree then count as pragmas. One
   example is `src/engine/__fixtures__/biomes.ts`'s `/** The global spell registry …`, and rewording
   any of them would fail `comment-proof`. Dropping the `\s` after each word also leaves the suite
   green. The existing unanchored-pragma mutation covers `PRAGMA` only.
   - Tests in `scanner.test.ts`: none of these returns a pragma: `/* reset the global state */`,
     `/** The global spell registry */`, `/* globalThis is the window here */`,
     `/* exportedNames lists them */` and `/* eslintrc is gone */`.
   - Mutations: drop `^` from `BLOCK_PRAGMA`, then drop the `\s` after each word. Each kills at
     least one of the new rows.

## Labeling

3. **The syntax-error message says which side.** Today a file broken only in the base reports
   `syntax error at line 3: …`, and line 3 of the working tree is fine. Write
   `FAIL <path>: syntax error in the working tree at line <n>: <message>` or
   `… syntax error in the base at line <n>: <message>`. The two existing syntax-error tests expect
   the matching side. Also rewrap the header comment's pragma sentence in `comment-proof.ts` to the
   file's 100 columns: one line runs to about 140.

## Evidence and gates

- `evidence/mutation-check.txt` gains the runs above, each killed.
- `evidence/planted-faults.txt` gains, on the 4.2-G clone with the same invocation:
  `src/engine/__corpus__/node-shims.d.ts` with one comment word changed → that file `OK`, PASS,
  exit 0; then a stray `)` appended to it → exit 1 naming the file, in the working tree.
- Gates as in `.claude/workflow/coding-rules.md`: `npm run test`, `lint`, `format:check`, `build`,
  `npx tsc -b`, `npm run docs:check -- citations` and `-- budgets`. The `docs-check` project's
  count rises by the new tests only, and the count outside `scripts/` stays 1357, file by file.
  `comments` still fails on the tree by design and stays out of CI.
- `git diff --stat origin/main -- src vite.config.ts eslint.config.js .github` stays empty.
- Send the JSON reporter's output outside the repo (`--outputFile <scratch path>`), so no `.vitest/`
  folder is left at the root.

Write `report-r3.md` in `.claude/phases/4.2/H1/`: each item above with the test names and mutation
results, the new totals, and any choice you made. In `record.md`, update the syntax-check line under
"Decisions made while building" to the API you used. Nothing committed, nothing deleted.
