# Report — Phase 4.2 — Slice H3: Names — Round 2

Built to `handout-r1.md`. Nothing is committed and nothing is deleted. `origin/main` is still `590d82a`. This round changes `scripts/docs-check/`, the
tests beside it, `record.md` and `evidence/`; no file under `src/` changes, no living doc is edited, no rename, no deletion.

## 1. Each half of the importer-specifier count is pinned

`comment-proof.ts` is unchanged. Two tests in `renames.test.ts`, block `comment-proof --renames, specifiers`, each with unequal base and working-tree
counts and `imports: 1`, each asserting the whole count line:

- **Base differs**: the base has a second importer of the old file (`src/user.ts`, `import './golden-h9z-a.fixture'`); the working tree's `user.ts` no longer
  imports it. Asserts `… expects 1 importing specifiers, found 2 in the base and 1 in the working tree`.
- **Working tree differs**: the base's `user.ts` has no import; the working tree's imports the new file. Asserts `… found 1 in the base and 2 in the working tree`.

Both use a changed, still-present importer, not a deleted or added file: the count reads only the files in both trees (a deleted or added file fails as
`deleted` / `added` and is not counted), so the hand-out's "other importer deleted" shape could not reach the count line; the same intent holds with an importer
that stays and stops, or starts, importing.

Mutations (`evidence/mutation-check.txt`, rows 64-65, rerun on the final code):

| Row | Removed | Fails |
| --- | --- | --- |
| M64 | `specBase[i] !== expected` | `fails when the base has more importers than the entry says, and the working tree matches it` |
| M65 | `specHead[i] !== expected` | `fails when the working tree has more importers than the entry says, and the base matches it` |

## 2. The name guard reads provenance words in value literals, and a phase id mid-camel

`names.ts`:

- **Literal arm.** A literal whose context is `'value'` (string, template part, regex literal) that does not hit a slice-id shape is run through the regexes of
  `comments`' `PATTERNS` with ids 1-9 (`LAST_VALUE_PATTERN`); the first pattern that matches is named in `what`:
  `pattern 20, provenance in a string literal (pattern 2, phase number)`. One problem per literal, always under pattern 20, so `--counts` keeps three guard rows.
  Patterns 10-17 never run on a value. Titles stay with `comments`; specifiers stay with the file arm.
- **Identifier arm.** `PHASE_IN_IDENTIFIER` adds `Phase` or `PHASE`, optionally `_`, then digits, after a lower-case letter or digit
  (`placeholderPhase4Config`, `configPHASE_4`). The `^` and `_` cases are unchanged.
- **Wiring.** `findNameProblems(root, sourceFiles, patterns)` takes the patterns as a parameter and `comments.ts` passes `PATTERNS`, so `names.ts` has only a
  type import from `comments.ts` (no import cycle at run time). The header comments of `names.ts` (what the guard reads) and `comments.ts` are updated; the
  guard bullet in `record.md` matches, and its `scripts/` count is now 482.

Tests (`names.test.ts`, 58 → 75; each failing case names `src/x.ts:2:` and the matched pattern):

- Fail: `'not available before Phase 8'`, `'ASSUMPTION 22: floor-1 clear'`, `` `the Phase-3 ${x} trait` ``, `/before Phase 8/`, `'see PR #12'`, `'item B-2'`, the identifiers
  `placeholderPhase4Config` and `configPHASE_4`.
- Pass: `'a brief stun'`, `'the plan of attack'`, `'hp-percent'`, `'grill the kickoff'` (patterns 10-17 not run); `runA1`, `biphase4` as identifiers.
- A title `'pins Phase 4 numbers'` is reported once, as pattern 2, with no pattern 20; a value inside a test body is read; a module specifier is not; `--counts`
  puts a value hit in row 20.

Mutations (rows 66-69 in `evidence/mutation-check.txt`, in the table's order):

| Mechanism removed | Fails |
| --- | --- |
| the value-literal pattern loop | 8 tests: every "fails …" case in `name guard, provenance words in value literals` |
| the 1-9 bound | 3: `passes 'a brief stun'`, `'the plan of attack'`, `'grill the kickoff'` |
| the title exclusion | 1: `leaves a test title to the comments patterns, and reports it once` |
| the mid-camel phase case | 2: `name guard, identifiers fails placeholderPhase4Config` / `configPHASE_4` |

6 mutations in all (with item 1's two), 0 survive.
The planted cases are in `evidence/planted-faults.txt`, section D: each exits 1 naming `file:line`; the baseline and the not-flagged case pass; the title is reported once.

**Measurements** (`evidence/counts.txt`, round 2 sections):

- `npm run docs:check -- comments` passes on the branch; `--counts` rows 18, 19 and 20 read 0.
- The branch's `scripts/` run over a `git archive 590d82a` extraction finds exactly the 7 value literals the hand-out lists: `engine/corpus-coverage.test.ts:27`,
  `state/balance-sim.test.ts:164`, `state/balance-sim.ts:1789`, `:1867`, `:1877`, `state/rewards.test.ts:176` (the regex), `state/rewards.ts:52`. Row 20 on `main` goes
  from 111 to 118 hits (47 to 52 files); rows 18 and 19 are unchanged (127, 25). No other `main` literal and no `main` identifier is newly flagged.

## Gates (`evidence/gates.txt`, Node 24.19.0, npm 11.12.1)

| Gate | Result |
| --- | --- |
| `npm run test` | 212 files, 1,840 tests (1,839 passed, 1 skipped): `src/` 1,358 (unchanged), `scripts/` 482 |
| `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 642 citations |
| `npm run docs:check -- budgets` | 12 files, 0 over budget |
| `npm run docs:check -- comments` | PASS, 7,008 comments and 1,629 titles in 403 files |

**`comment-proof origin/main --mask evidence/mask.json --renames evidence/renames.json`**: 151 OK and the single FAIL `engine/corpus-digest.test.ts`, exit 1, as in round 1;
`evidence/comment-proof.txt` is byte-equal to the new run.

**Test counts** (`evidence/test-counts.txt`): `src/` unchanged at 1,358, file by file (no `src/` file changed). `scripts/`: 463 → 482, in `names.test.ts` (58 → 75) and
`renames.test.ts` (59 → 61); `comments.test.ts` stays 82.

The golden policy and corpus digest are as round 1 left them: no `src/` file changed, so the fixtures, the goldens and the committed corpus fixture are untouched and
`npm run corpus:update` was not run.

## Could not do as written

- The base-differs test uses a changed importer rather than a deleted one (item 1, above): a deleted importer is outside the count, so it cannot show `found 2 in the base`.
- The hand-out says "add a mutation row for each new mechanism … to `mutation-check.txt`"; the header line of that file still reads round 1's "63 mutations, 463 tests", and
  the round 2 section carries its own count (6 mutations, rows 64-69). I did not rewrite the round 1 header.

## Spec questions

- `CONVENTIONS.md#comment-why-not-what` (when round 1's name-guard text is folded) should say the guard also reads a literal with patterns 1-9 and an identifier with a mid-camel
  `Phase<N>`; round 1's note on it stands.

## Content changes

None.

## To delete

- Round 1's three 0-byte scratch files in `scripts/docs-check/` (`.new.ts`, `.partB.txt`, `.partD.txt`) were not in the directory listing this round; nothing else needs deleting.
