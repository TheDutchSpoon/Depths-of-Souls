# Report r3 — Phase 4.2 — Slice H1: Comment tooling

Built to `handout-r2.md`. Changes are in `scripts/docs-check/comment-proof.ts`, `scanner.test.ts` and
`comment-proof.test.ts`; `scanner.ts` itself is unchanged (its `BLOCK_PRAGMA` was already anchored and
word-bounded; the gap was tests). Nothing under `src/`, `vite.config.ts`, `eslint.config.js` or `.github/`
changed. Nothing committed, nothing deleted.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 210 files, 1682 tests: 1681 passed, 1 skipped (`evidence/gates.txt`) |
| `npm run lint`, `format:check`, `npx tsc -b`, `npm run build` | clean / clean / clean / passes |
| `npm run docs:check -- citations` | PASS, 547 citations in 436 files |
| `npm run docs:check -- budgets` | 12 files, 0 over budget |
| `git diff --stat origin/main -- src vite.config.ts eslint.config.js .github` | empty |

Test counts, file by file against the round-2 run (JSON reporter, output sent to a scratch path):
`comment-proof.test.ts` 65 → 67 (+2), `scanner.test.ts` 43 → 48 (+5); total 1675 → 1682 (+7). Outside
`scripts/`: 1357 → 1357, no file differs. Golden policy: byte-identical, trivially (no `src/` change).
The corpus digest is untouched.

## Hand-out items

1. **`.d.ts` no longer crashes the syntax check.** `syntaxError` now builds a one-file program,
   `ts.createProgram([file], { noLib: true, noResolve: true, allowJs: true }, host)`, with a host whose
   `getSourceFile` returns `ts.createSourceFile(file, text, Latest, false, scriptKind(file))` (the
   scanner's own `scriptKind`, so `.tsx` and `.js` parse as before), and reads
   `program.getSyntacticDiagnostics(sf)`. It is the hand-out's recipe plus `scriptKind` and a
   `fileExists`/`readFile` pair on the host. No `jsx` option: the existing `.tsx` test passes without it.
   - Tests (`comment-proof syntax errors`): *passes a comment-only change to a declaration file*
     (`// shim\ndeclare const p: number\n`) and *fails a stray token in a declaration file, naming the
     file* (`FAIL src/x.d.ts: syntax error in the working tree at line 3: …`). The three existing syntax
     tests stay.
   - Mutation (`#R3-0`): back through `ts.transpileModule`. Killed by both new tests.
   - Real file: in the 4.2-G clone, `src/engine/__corpus__/node-shims.d.ts` with one comment word changed
     → `OK`, PASS, exit 0; with a stray `)` appended → exit 1, `FAIL src/engine/__corpus__/node-shims.d.ts:
     syntax error in the working tree at line 27: Declaration or statement expected.` (`evidence/planted-faults.txt`).
2. **`BLOCK_PRAGMA`'s anchor and word boundary are pinned.** `scanner.test.ts` gains an `it.each` of the
   five prose comments (*does not take the block prose …*): `/* reset the global state */`,
   `/** The global spell registry */`, `/* globalThis is the window here */`,
   `/* exportedNames lists them */`, `/* eslintrc is gone */`; each returns no pragma.
   - Mutations: `#R3-1` drop `^` → killed by `reset the global state` and `The global spell registry`;
     `#R3-2` drop `\s` after `eslint` → killed by `eslintrc is gone`; `#R3-3` after `globals?` → killed by
     `globalThis is the window here`; `#R3-4` after `exported` → killed by `exportedNames lists them`.
3. **Side label and rewrap.** The reason is now `syntax error in the working tree at line <n>: …` or
   `syntax error in the base at line <n>: …` (the working tree is checked first; the base only when the
   working tree is clean). The two existing syntax tests expect the matching side (the base-broken one now
   says "in the base"). Mutation `#R3-5` (back to the unlabelled text) is killed by the working-tree tests.
   The header comment's pragma sentence is rewrapped to 100 columns.

## Evidence

- `evidence/mutation-check.txt`: 6 runs appended (`#R3-0`…`#R3-5`), each killed, each file hash-checked
  after restore. 43 + 6 = 49. The first scripted run reported all survivors only because the driver was
  started with a lower-case drive letter and every suite failed to load (`Cannot read properties of
  undefined (reading 'config')`); I re-ran it with `C:/…` and the results above are from that run. The
  `scanner.ts` unanchored case was also checked by hand (the two prose tests failed, then the file was
  restored).
- `evidence/planted-faults.txt`: round-3 block appended (the two `node-shims.d.ts` runs); the clone was
  restored (`git status`: only the staged `vite.config.ts` reset).
- `evidence/gates.txt`: round-3 block appended.
- `record.md`: status counts (1682; 204 tests added) and the syntax-check line now name the API used.

## Spec questions

None new. The round-1 and round-2 items stand: `comment-proof`'s mask format, syntax-error rule and
pragma forms have no home in the workflow docs yet.

## Content changes

None.

## To delete

An empty `.vitest/` folder sits at the repo root (created by Vitest during the gate run, not tracked by
git, no `.gitignore` entry). It needs deleting by hand; the JSON reporter output itself went to scratch.
