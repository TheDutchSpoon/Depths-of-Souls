# Fix hand-out — Phase 4.2 — Slice H3: Names — Round 1

Branch `4.2-h3`, build commit `603ef62`. The proof's base stays `origin/main` at `590d82a`; if it
moves, stop and ask Duncan. Standing rules: `.claude/workflow/coding-rules.md`.

This round changes `scripts/docs-check/` only:
- no file under `src/` changes, so the `src/` proof and every golden stay as round 1 left them;
- no living doc is edited (the design agent owns those);
- no rename, no deletion.

Line numbers are as of `603ef62`.

## 1. Pin each half of the importer-specifier count

`scripts/docs-check/comment-proof.ts` fails a renamed file whose importers don't match its
`imports` count:

```ts
if (specBase[i] !== expected || specHead[i] !== expected)
```

Removing either half of that condition leaves every `scripts/` test green. The one test behind it
(`renames.test.ts`, "fails when the entry says 0 or 2 importers and the tree has 1") has the same
count on both sides, so either half alone catches it. A mechanism at two sites needs a failing test
at each (`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`).

Add two tests to the `comment-proof --renames, specifiers` block, each with base and working-tree
counts that differ:
- **Base differs.** The base has two importers of the old file and the working tree one importer of
  the new file (the other importer deleted), with `imports: 1`. Assert the count line
  (`expects 1 importing specifiers, found 2 in the base and 1 in the working tree`), not just
  exit 1: the deleted importer fails on its own as well.
- **Working tree differs.** The base has one importer and the working tree two (a second importer
  added), with `imports: 1`. Assert the count line, `found 1 in the base and 2 in the working tree`.

Then add two rows to `evidence/mutation-check.txt`, rerun on the final code:
- `specBase[i] !== expected` removed;
- `specHead[i] !== expected` removed.

Each must name the new test that fails.

## 2. Widen the name guard: provenance words in value literals, and a phase id mid-camel

`scripts/docs-check/names.ts`. Two gaps in the guard against provenance coming back into `src/`:

- **Value literals.** The literal arm (pattern 20) checks only slice-id shapes (`'h2b2-x'`,
  `'D7 thing'`). A provenance word in an error message or a report label passes every check: this
  slice reworded six such strings ("…before Phase 8", "ASSUMPTION 22", "the Phase-3 mechanism
  trait"), and none of them would be caught if it came back.
- **Mid-camel phase ids.** The identifier arm (pattern 19) catches `PHASE_4_X` and `phase4Thing`
  but not `placeholderPhase4Config`.

What to build:

- **The literal arm** also runs the regexes of `comments`' `PATTERNS` with ids 1-9 over every
  literal whose context is `'value'`, regex literals included. That covers ASSUMPTION, phase
  number, phase id, slice id, slice name, PR number, review words, plan-item id, and plan-item
  range or rule.
  - It never runs patterns 10-17 there: `brief`, `kickoff`, `grill`, `the plan`, `sign-off`,
    "locked …" and "decided …" are English a player-facing string can hold ("a brief stun").
  - Titles (`'title'`) are left to `comments`, which already runs every pattern over them. A title
    must not be reported twice.
  - Specifiers stay with the file arm.
  - Report a hit under pattern 20, with the matched pattern named in `what` (for example
    `pattern 20, provenance in a string literal (pattern 2, phase number)`), so `--counts` keeps
    three guard rows.
- **The identifier arm** also matches `Phase` or `PHASE`, optionally `_`, then a digit, when it
  follows a lower-case letter or a digit (`placeholderPhase4Config`, `configPHASE_4`). The existing
  `^`/`_` cases stay.

Tests, in `names.test.ts`:

- Fail, each naming `file:line`:
  - `'not available before Phase 8'`
  - `'ASSUMPTION 22: …'`
  - `` `the Phase-3 ${x} trait` ``
  - the regex literal `/before Phase 8/`
  - `'see PR #12'`
  - `'item B-2'`
  - the identifier `placeholderPhase4Config`
- Pass:
  - `'a brief stun'` and `'the plan of attack'` (patterns 10-17 are not run on values)
  - a title `'pins Phase 4 numbers'` reported once, by `comments`, not by the guard
  - `'hp-percent'`
  - the identifier `runA1`

Measurements:

- `npm run docs:check -- comments` passes on the branch, and `--counts` shows 0 for the three
  guard rows.
- The real check on `main`'s tree must find exactly these 7 value literals:
  - `engine/corpus-coverage.test.ts:27`
  - `state/balance-sim.test.ts:164`
  - `state/balance-sim.ts:1789`, `:1867`, `:1877`
  - `state/rewards.test.ts:176` (the regex)
  - `state/rewards.ts:52`

  Show it with the branch's `scripts/` run over a `git archive 590d82a` extraction, and put the
  `--counts` output and the 7 lines in `evidence/counts.txt`.
- Add a mutation row for each new mechanism (the value-literal pattern loop, the 1-9 bound, the
  title exclusion, the mid-camel phase case) to `evidence/mutation-check.txt`, each naming the test
  that fails. Add the planted cases to `evidence/planted-faults.txt`.
- Update `names.ts`'s header comment to say what the guard reads, and the guard bullet in
  `record.md` to match.

## Must stay green

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`, and
`npm run docs:check -- citations`, `-- comments` and `-- budgets`.

Re-run `comment-proof origin/main --mask evidence/mask.json --renames evidence/renames.json`. With
`src/` unchanged it must report the same 151 OK and the single FAIL,
`engine/corpus-digest.test.ts`. Put the output in `evidence/comment-proof.txt`.

Test counts: `src/` unchanged at 1,358, file by file. `scripts/` grows only by the new tests;
report the per-file numbers in `evidence/test-counts.txt`.

## Report

Write `report-r2.md` in this mailbox. It holds:
- each item above with what changed, its tests, and its mutation rows;
- the gates, in `evidence/gates.txt`;
- the `comment-proof` result;
- the test counts;
- the 7 `main` hits and the branch's 0;
- anything you could not do as written, with why.
