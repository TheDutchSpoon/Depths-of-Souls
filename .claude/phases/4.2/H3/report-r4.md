# Report — Phase 4.2 — Slice H3: Names — Round 4

Branch `4.2-h3`. Base `origin/main` still `590d82a` (checked). Hand-out: `handout-r3.md`. This round adds
two tests to `scripts/docs-check/names.test.ts` and changes nothing else: no code file under
`scripts/` or `src/`, no living doc, no rename, no deletion.

## 1. The two tests

Both are in the `name guard, JSX text` block. Each fails with exit 1 and the
`pattern 20, slice id in a string literal` message, naming the file and line.

| Test | Asserts | Mutation | Result |
| --- | --- | --- | --- |
| `fails a capitalised slice id that opens the text` (`<p>H3 shipped</p>` in `inJsx`) | `src/x.tsx:2:` | M74: `literalHit(jsx.text, false)` turned to `true` in `names.ts` | that test fails (1 of 86), passes with the file restored |
| `fails a slice id in text that opens on its own wrapped line` (`h2b2-x is live` on its own line in a `<div>`) | `src/x.tsx:3:` | M75: `trimStart()` dropped from `text` in `jsxTextsOf` (`tokens.ts`), line still from the first non-blank character | that test fails (1 of 86), passes with the file restored |

Rows M74 and M75 are in `evidence/mutation-check.txt`. Both files were restored byte-equal after
each mutation (`cmp` against a copy outside the repo; `git status` shows only `names.test.ts`
modified by this round's code work).

## Gates (`evidence/gates.txt`)

`npm run test` (212 files, 1850 passed, 1 skipped), `lint`, `format:check`, `build`, `npx tsc -b`,
`docs:check -- citations`, `-- comments` and `-- budgets`: all exit 0.
`docs:check -- comments --counts` shows 0 for rows 18-20.

No code changed, so `comment-proof` and the `main` measurement were not re-run.

## Test counts

`names.test.ts` 84 → 86; every other file unchanged. `scripts/` total 491 → 493 (`main`: 325).
`evidence/test-counts.txt` and `record.md` updated to match.

## Spec questions

None.

## Content changes

None.

## To delete

None.

## Could not do as written

Nothing.
