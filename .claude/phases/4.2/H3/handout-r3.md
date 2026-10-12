# Fix hand-out — Phase 4.2 — Slice H3: Names — Round 3

Branch `4.2-h3`, fix commit `eb1e730`. The proof's base stays `origin/main` at `590d82a`; if it
moves, stop and ask Duncan. Standing rules: `.claude/workflow/coding-rules.md`.

This round adds two tests to `scripts/docs-check/names.test.ts` and changes nothing else:
- no code file changes, under `scripts/` or `src/`;
- no living doc is edited (the design agent owns those);
- no rename, no deletion.

## Background

`scripts/docs-check/names.ts` reads every JSX text node under `src/` through `jsxTextsOf`
(`tokens.ts`). For each node, `jsxTextsOf` returns:
- the text from its first non-blank character (`raw.trimStart()`);
- the line of that character.

`names.ts` then calls `literalHit(jsx.text, false)` for the slice-id shapes, and `valueHit` for
the provenance words. The slice-id shapes in `literalHit` are:
- `LEADING` (`/^(?:[a-i]\d[a-z]?\d?|e)-/`) and `INTERIOR` (`/-[a-i]\d[a-z]?\d?-/`);
- `NAMED` (`/^[A-I]\d[a-z]?\d?\s/`), which `false` turns on (a test title skips it).

Two of these can be removed with every `docs-check` test green:

- **`literalHit(jsx.text, true)`**: the JSX tests' only slice-id case, `<p>h2b2-x</p>`, is a
  `LEADING` shape, which title mode reads too. `<p>H3 shipped</p>` fails today and would pass.
- **`text: raw` in place of `raw.trimStart()`**: `LEADING` and `NAMED` are anchored at `^`, and
  JSX text that Prettier wraps onto its own lines opens with a line break and indent. That text
  fails today and would pass.

## 1. Pin them

Add both cases to the `name guard, JSX text` block. Each must fail with exit 1 and the
`pattern 20, slice id in a string literal` message, naming the file and line:

- `<p>H3 shipped</p>`, inside `inJsx`, naming `src/x.tsx:2:`;
- a wrapped element, naming `src/x.tsx:3:`:

  ```tsx
  export const a = (
    <div>
      h2b2-x is live
    </div>
  )
  ```

Check each against its mutation: with the mutation in, that test must fail, and with the file
restored, it must pass.

Mutation rows in `evidence/mutation-check.txt`, continuing the numbering:
- M74, `literalHit(jsx.text, false)` turned to `true`;
- M75, `trimStart()` dropped from `jsxTextsOf`'s `text`, with the line still taken from the first
  non-blank character.

Each row names the new test that fails, and the file is restored byte-equal after it.

## Must stay green

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`, and
`npm run docs:check -- citations`, `-- comments` and `-- budgets`.

- `--counts` on the branch shows 0 for rows 18-20.
- No code changes, so `comment-proof` and the `main` measurement don't need a re-run. Say so in
  the report rather than re-running them.

Test counts: `names.test.ts` 84 → 86, every other file unchanged. Update
`evidence/test-counts.txt`, and the `scripts/` count in `record.md` (491 → 493).

## Report

Write `report-r4.md` in this mailbox. It holds:
- the two tests and their mutation rows;
- the gates, in `evidence/gates.txt`;
- the test counts;
- anything you could not do as written, with why.
