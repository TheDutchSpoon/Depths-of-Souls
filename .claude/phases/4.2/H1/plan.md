# Plan — Phase 4.2 — Slice H1: Comment tooling

## Revision 2: what changed

Addresses `plan-review.md` Round 2: plan fixes 1 and 2 (Duncan took the decide-point: masks keyed by
new text).

- **Fix 1, `-z` test (§4):** the non-ASCII file-set test runs `gitIn(root, 'config', 'core.quotePath',
  'true')` in its scratch repo, so a global `core.quotePath false` cannot hide the mutation. The `-z`
  mutation is "back to newline splitting without `-z`", not "keep `-z`'s NUL split without the flag".
- **Fix 2, masks keyed by new text (§2 step 4, step 5, §4, mutations):** a file's entries are grouped
  by `new`; each group has one mask token. In the base, a literal whose cooked text equals one of the
  group's `old` texts **or** its `new` gets the token; in the head, a literal equal to `new` gets it.
  Counts: each entry's `old` occurs exactly `count` times in the base; `new` occurs in the head exactly
  (its base occurrences) + (the group's summed `count`s). Two usage errors (exit 2), before any file is
  read: same `file`+`old` (as Revision 1), and an entry whose `new` is another entry's `old` in the
  same file (chain or swap). Four new tests and one new mutation run.
- **A9 and N3 corrected:** titles converging in different `describe`s now pass the mask and the
  duplicate-name check alone decides; N3's span edit stands, but what the token covers changes.
- Assumptions: A1–A8, A10, A11, N1, N2, N4 stand. No new assumption.

## Revision 1: what changed

Addresses `plan-review.md` Round 1: plan fixes 1–7 (D1 confirmed, so fix 7 applies) and N1's correction.

- **Fix 1, scanner range filter (§2, §4):** at each token the scanner reads `getTrailingCommentRanges`
  **and** `getLeadingCommentRanges` at the token's full start (the token's own leading trivia, which
  holds the previous line's same-line trailing comments), de-duplicates by `pos`, keeps a range only
  if `range.end <= token.getStart(sf)`. Reading trailing ranges at `token.end` against the same
  token's start, as the first draft said, dropped every trailing comment. New tests and a new
  mutation run (§4). `counts.txt` expects 403 files, 7,178 ranges, 1,627 titles, and explains the
  difference from the pre-split 6,949 (leading-only reading gives 6,677).
- **Fix 2, describe chain (§2, §4):** `Title` gains `chain: string[]`, the enclosing titles' text,
  outermost first, taken while walking (the walk keeps a stack of enclosing title calls). Test: the
  same title in two `describe`s is not a duplicate.
- **Fix 3, file set (§2, §4):** `git ls-tree` and `git ls-files` run with `-z`; file-set tests assert
  the reason (`added`, `deleted`); mutation runs dropping `--exclude-standard` and the `existsSync`
  filter.
- **Fix 4, masks (§2, §4):** two entries with the same `file` and `old` are a usage error (exit 2).
- **Fix 5, rehearsal (§6):** the tool is this branch's entry run against the clone:
  `node scripts/docs-check.ts comment-proof 3fd6a8f --mask <scratch>/g-mask.json --root <clone>`;
  the mask file lives in scratch outside both trees and is copied into `g-rehearsal.txt`. Planted
  faults use the same invocation.
- **Fix 6 / N1, patterns 16 and 17 (§2):** `[Pp]lan review`, `[Ss]ign-off`.
- **Fix 7 / D1, pragma position (§2, §4):** a pragma is recorded as (exact text, index of the next
  real token) and compared as such. A moved pragma with the same text fails. New test and mutation run
  (text-only comparison).
- Assumptions: A1–A11, N2–N4 stand as the review confirmed them; A8 and A9 and N1 are restated below.
  No new assumption.

Standing rules: `.claude/workflow/coding-rules.md`. Read for this plan: `CLAUDE.md`, `kickoff.md`,
`phases/4.2/H/brief.md`, the pre-split `phases/4.2/H/plan.md` (§0, §1, §3, §7, checklist) and
`plan-review.md` Round 1, `CONVENTIONS.md#comment-why-not-what`, `#open-questions-get-an-interface`,
`#a-mechanism-at-more-than-one-site-is-tested-at-each-site`, and the code the kickoff names:
`scripts/docs-check.ts`, every file in `scripts/docs-check/`, `deploy.yml` and its `ci.test.ts`.
No spec file is named by the kickoff and none is touched. No conflict between kickoff, brief and
rules was found.

Nothing is built. Probe numbers (403 files, 6,949 comment ranges, 1,627 titles) are the pre-split
plan's; the build reproduces them with the committed scanner and explains every difference.

This slice changes nothing under `src/`, `vite.config.ts`, `eslint.config.js` or `.github/`.
`comments` is not wired into CI and is red on this branch by design.

## 1. Approach

Four pieces in `scripts/docs-check/`, each with tests landing with it, in this order:

1. **Scanner** (`scanner.ts`): the base of `comments` and `comment-proof`.
2. **`comments`** (`comments.ts`) with `--counts` / `--quotations`, plus `sectionOf` in `anchors.ts`.
3. **`citations <file>…`** (`citations.ts`) plus the `usage.ts` move and `cli.ts` wiring.
4. **`comment-proof`** (`comment-proof.ts`).

Then the stale-header fixes (`docs-check.ts`, `git.ts`), then the evidence runs (§6). The
`docs-check` Vitest project is run after each piece.

## 2. Module changes, by file

### `scanner.ts` (new) — `scanSource(file, text): Scan`, pure (no fs, no git)

```ts
interface Comment { pos; end; line; text; standalone: boolean }
interface Block   { comments: Comment[]; text: string; map: …  }   // text offset -> (comment, line)
interface Title   { pos; end; line; call: string; parts: { text: string; line: number }[]; chain: string[] }
interface Pragma  { text: string; tokenIndex: number }             // tokenIndex: next real token
interface Scan    { comments: Comment[]; blocks: Block[]; titles: Title[]; pragmas: Pragma[] }
```

- **Parser, not raw scanner.** `ts.createSourceFile(file, text, Latest, false, kind)`, `ScriptKind`
  by extension (`.ts` TS, `.tsx` TSX, `.js` JS). Walk to the leaf tokens with `getChildren()`.
  At each token read **both** `getTrailingCommentRanges(text, token.getFullStart())` (the previous
  token's same-line trailing comments, which sit in this token's leading trivia) and
  `getLeadingCommentRanges(text, token.getFullStart())`, de-duplicate by `pos`, and **keep a range
  only if `range.end <= token.getStart(sf)`** (a `//` that opens a `JsxText` token or sits in
  template text ends after that token's start, so is not a comment). The EndOfFile token is walked,
  so a trailing comment on the last line is kept. Reading trailing ranges at `token.end` against the
  same token's start would drop every trailing comment (501 of 7,178 on today's tree); a test and a
  mutation run pin it.
- **JSDoc is not walked (fix 5).** The walk skips any child whose kind is in
  `FirstJSDocNode..LastJSDocNode`. Their text arrives once, as the leading comment of the first real
  token, so `/** see http://x // y */` is one comment.
- **Blocks.** Consecutive standalone `//` comments on consecutive lines are one block; a `/* */`
  comment, or a trailing comment (code before it on its line), is a block alone. A block's `text`
  is its bodies joined with one space. Leader stripping has **two code paths (fix 6)**: for `//`
  runs the `//+` leader; for `/* */` the `/*`/`/**`/`*/` delimiters and a leading `*` on each
  line. The map gives every offset in `text` its source line, so a hit reports the line of its first
  character (`Phase\n// 8` and `Phase\n * 8` both report the line of `Phase`).
- **Titles.** A call whose callee's root identifier is `describe|it|test|suite`, through any chain
  of property accesses and calls (`it.each(t)(…)`, `describe.skipIf(c)(…)`, `.only .skip .todo
  .concurrent .runIf`), takes its first argument. String literal and substitution-free template
  → one part; template with substitutions → the head/middle/tail literal texts as parts (the
  `${…}` is code and is not checked; a pattern split by it is not seen, pinned by a test); any other
  expression → no title (A6). `chain` is filled during the walk: a stack of the enclosing title
  calls' first-part text (a template title contributes its parts joined by `${}`), so a full test name
  is `chain` + own text (A9).
- **Pragmas (fix 7).** A comment is a pragma when its body, after the leader and whitespace, **starts**
  with `@ts-(expect-error|ignore|nocheck|check)`, `eslint-`, `@jsx`, `@vite-ignore`,
  `prettier-ignore`, `v8 ignore`, `istanbul`, or (for `///`) `<`; `@vitest-` may be anywhere in a
  leading docblock (a comment before the first token). Prose mentioning "eslint-disable" mid-comment
  is not a pragma. `pragmas` holds each pragma's exact text and `tokenIndex`, the 0-based index of the
  next real token in the walk's token stream (D1), in source order. A comment-only edit or a mask
  leaves the token stream unchanged, so the index only moves when a pragma moves over code.

### `comments.ts` (new)

`findCommentProblems(root)`, `runComments(root, opts, log)`. Walks `src/**/*.{ts,tsx}` (sorted; tests,
`__golden__`, `__corpus__`, `__fixtures__` and `.d.ts` included, no exemption), `vite.config.ts` and
`eslint.config.js`; not `scripts/`. Checks every block and every title part. Lines:
`file:line: <message>: "<snippet>"`, then `comments: PASS, N comments and M titles in K files` or
`comments: FAIL, N problems` (exit 1). It reads the working tree and never calls git.

**Patterns**, all case-sensitive unless noted (the kickoff's: plan §3's table with fixes 2 and 3):

| # | Pattern | Avoids |
| --- | --- | --- |
| 1 | `\bASSUMPTIONS\b\|\bASSUMPTION\b(?!:)` (fix 2) | `ASSUMPTION:` (allowed form, below); lower-case "assumption" |
| 2 | `\bPhases?\s+\d` | anchor slug `phase-8` |
| 3 | `\b(?:Pre\|Phase)-\d` | n/a |
| 4 | `\b\d+\.\d+-[A-Z]\w*` | `1.5-second`, `0.25-x` |
| 5 | `\b[Ss]lice\s+[A-Z]\d*[a-z]?\b` | "a slice of the list", "slice 3" |
| 6 | `\bPRs?\s*#?\d+` | bare "PR" (process prose) |
| 7 | `\b(?:[Rr]eview\|content-review\|PR) (?:fix\|round\|amendment\|revision\|finding\|review)s?\b`, `\bcontent-review\b` | bare "review" |
| 8 | `\b[A-I]\d[a-z]\b` | `S1`/`E1`/`P2` scenario labels (D1) |
| 9 | `\b[A-I]\d[a-z]?\+`, `\b[A-I]\d[a-z]?\s+rule\s+\d` | script "rule 4: …" |
| 10 | `\bdesign[- ]owner\b`, `\bgrill\b`, `\bkickoff\b` | n/a |
| 11 | `\blocked\s+(?:design\|content\|seed\|semantics\|option\|decision\|number\|principle)\b`, `,\s*locked\)`, `\blocked\s+"` | `isActionLocked`, `lockedTurns`, "a locked CASTER", "locked rounds 2-4", "(locked)" after SLOW, "still locked" |
| 12 | `\bdecided\s+(?:at\|in\|before\|by\|with)\b` | "has already decided this round's defending status" |
| 13 | `§\s?\d+` | n/a |
| 14 | `\b[Bb]riefs?\b` (fix 3) | n/a (ASSUMPTION N1) |
| 15 | `\b[Tt]he plan(?:'s)?\b` (fix 3) | "a plan", "planned" (ASSUMPTION N1) |
| 16 | `\b[Pp]lan review\b` (fix 3, N1) | n/a |
| 17 | `\b[Ss]ign-off\b` (fix 3, N1) | n/a |

No pattern bans a bare plan-item id (D1). History words are not a pattern (the hand pass's, 4.2-H2).
Patterns 11, 12 and 14–17 are the ones that share words with the game: the build lists every hit of
each on today's tree (`evidence/word-patterns.txt`), each must be provenance; a hit on a game word is
a pattern bug fixed in the pattern, never left for 4.2-H2. If a candidate narrowing cannot separate
them, I stop and say so rather than ship a pattern that 4.2-H2 cannot clear.

**`ASSUMPTION:`** is not a pattern-1 hit, but a block containing it must also contain
`OPEN_QUESTIONS.md#<anchor>` (A5); in a title it fails. `ASSUMPTIONS:` fails (fix 2).

**`--counts`** prints per pattern: comments / titles / files; exit 0. **`--quotations`** (D2, A7)
prints each `<path>.md#<anchor>` followed within four words (across a wrap, in a block or title part)
by a `"quoted"` string whose first 40 characters, normalised exactly as 4.2-G did (markup stripped,
lowercased, whitespace collapsed), do not occur in the anchor's section; exit 0, report only. The
anchor regex is `ANCHOR_CITATION`, exported from `citations.ts`; the section comes from
`sectionOf(lines, anchor)` in `anchors.ts` (same slug rule and fence skipping as `resolveAnchors`;
heading through its sub-headings, stopping at the next heading of the same or higher level; `null`
for an unknown anchor).

### `citations.ts`, `usage.ts` (new), `cli.ts`

- `usage.ts`: `export class UsageError extends Error {}`; `cli.ts` imports it (A1).
- `citations.ts`: `findProblemsForFiles(root, paths)` runs `scanText` with `SITES.claude` over exactly
  the named files (the living-doc rules, `phases/` included, any extension), returning
  `CitationsResult`. A path is repo-relative or absolute under `--root`, normalised to a `/`
  relative path; one that escapes the root, is missing, or is a directory throws `UsageError`
  (exit 2). `runCitations(root, log, paths?)`: with no paths **it executes the existing statements
  unchanged**; the new branch is an `if (paths?.length)` ahead of them. Never calls git.
  `ANCHOR_CITATION` gains `export`.
- `cli.ts`: `citations [<file>…]`, `comments [--counts|--quotations]`, `comment-proof <base>
  [--mask <file>]`. `UsageError` for `--counts`/`--quotations` off `comments`, both together,
  `--mask` off `comment-proof`, a missing `<base>`, extra arguments to `comments`/`comment-proof`.
  `takeOption` already rejects a valueless `--mask`. `USAGE` gains three lines. The new flags
  (`--counts`, `--quotations`) are taken as boolean flags before the existing `--` unknown-option check.
- `docs-check.ts` header: lists the three additions; replaces "no dependencies" with "imports
  `typescript`, a devDependency `npm ci` installs"; "`citations`, `comments` and `budgets` read the
  working tree and never call git; `comment-proof` and the inventory modes do" (fix 10). `git.ts`
  comment: "Used by `comment-proof` and the inventory modes; `citations`, `comments` and `budgets` read
  the working tree …".

### `comment-proof.ts` (new) — `runCommentProof(root, base, maskPath, log)`

Run by hand, never in CI. Uses `resolveRev`, `git ls-tree`, `showAt` and `git ls-files`; the only mode
besides inventory that calls git, and git is only ever read.

1. **File set.** Scope paths: `src`, `vite.config.ts`, `eslint.config.js`. Base set =
   `git ls-tree -r -z --name-only <sha> -- <scope>`. Working-tree set =
   `git ls-files -z --cached --others --exclude-standard -- <scope>` filtered by `existsSync`
   (both with `-z`, split on NUL, so a non-ASCII path is not quoted by `core.quotePath` and cannot
   fail as both added and deleted)
   (cached-but-deleted files drop out). **This is how ignored and untracked files are told apart:**
   git's own ignore rules decide (`.DS_Store`, `*.local`, `*.sw?` are in no set, so they never fail;
   an untracked file `.gitignore` does not cover is in the working set and fails as *added*). A path in
   one set only fails as *added*/*deleted*; a rename appears as both.
2. **Per file in both sets whose text differs** (CR stripped): `.ts/.tsx/.js` files are printed with
   `ts.createPrinter({ removeComments: true })` on both sides and compared byte for byte (first
   differing printed line reported); other files must be byte-identical.
3. **Pragmas** compared apart (`removeComments` drops them): the scanner's `pragmas` arrays must be
   equal, in order, as (exact text, `tokenIndex`) pairs (D1). A pragma moved above a different
   statement fails even though its text is unchanged.
4. **Masks, keyed by the new text.** `--mask` is a JSON array of `{ file, old, new, count? }` (count
   default 1). Two usage errors (exit 2), both checked before any file is read: two entries with the
   same `file` and `old` (the same old text to the same new text is what `count` is for; to two
   different new texts it cannot be paired by position), and an entry whose `new` equals another
   entry's `old` in the same file (a chain or swap cannot be masked).
   Per file, entries are grouped by `new`; each group gets one token `'MASK<g>'`. In the base text,
   every string literal, substitution-free template, and template part whose **cooked** text equals
   one of the group's `old` texts **or** its `new` text has its source span replaced by the token (a
   template part keeps its delimiters, its raw span replaced); in the head text, every literal whose
   cooked text equals `new` gets it. The replacement is a text edit by position (reverse order), then
   the edited text is parsed and printed, so Prettier's quote switch cannot cause a difference, and
   the print comparison pins every masked position (a pre-existing `new` literal that changed, or one
   moved, still fails). **Counts, else the file named in the entry fails:** each entry's `old` occurs
   exactly `count` times in the base; `new` occurs in the head exactly (its occurrences in the base) +
   (the group's summed `count`s). So a new text may already exist in the file. A changed unlisted
   literal fails by print difference; an entry for a file with no change fails as unconsumed. Output:
   `OK <path> (masked <n>)` then `  "<old>" -> "<new>"` per masked pair.
5. **Duplicate names (A9).** For each changed file, the full test names (`chain` + title, template
   parts joined by `${}`; the same title under two different `describe`s is two names) of the head
   must not have more duplicated names or more excess copies than the base. Titles that converge on
   one name pass the mask and are decided here alone.
6. Exit 0 all OK; 1 any `FAIL <path>: <reason>` or a git error (bad rev); 2 usage.

## 3. Golden policy (restated from the kickoff)

**Byte-identical, trivially.** No file under `src/` changes, so every golden, the corpus digest and
each `src/` test file's count are untouched. The `docs-check` project's count rises by the new tests
only, reconciled file by file against `main` (`evidence/gates.txt`). No golden is added; none
regenerated; `corpus:update` is not run.

## 4. Mechanism → the test that fails without it, at every site

New test files: `scanner.test.ts`, `comments.test.ts`, `comment-proof.test.ts`; additions to
`citations.test.ts`, `anchors.test.ts`, `cli.test.ts`. Titles carry no plan ids.

| Mechanism | Site | Test |
| --- | --- | --- |
| Comments at token positions, `ScriptKind` per extension | `.ts`, `.tsx`, `.js` | one scanner test per kind finds its comment; a `//` in a string, URL, regex literal, template text, JSX text (`<p>http://x</p>`) and the `renderFixture` shape (three `//` lines in a template) give none; `${ /* c */ x }` gives one |
| Keep only ranges ending before the token start | JSX text | `<p>// not a comment</p>` gives none |
| Trailing comments read (fix 1) | same-line `x, // Phase 4`; last line of a file; trailing `// eslint-disable-line` | each is returned as its own block/pragma; a trailing `x, // Phase 4` fails `comments` with its line; a trailing comment on the final line (EndOfFile token) is found; no comment is returned twice |
| JSDoc not walked (fix 5) | `/** … */` | `/** see http://x // y */` gives exactly one comment, with that text |
| Blocks and wrap-safe matching; leader stripping at both paths (fix 6) | `//` run; `/* */` | `Phase\n// 8` and `/**\n * Phase\n * 8 */` each fail, reporting the line of `Phase`; blank-line-separated runs are two blocks; a trailing comment is its own block; two `//` on non-consecutive lines are two blocks |
| Title extraction | `it`, `describe`, `it.each(t)(…)`, `test.each`, `describe.skipIf(c)(…)`, `.only`, template with `${}`, identifier | one planted pattern per shape fails with the title's line; identifier title ignored; a pattern split by `${x}` is not seen (pinned) |
| Pragma extraction, anchored (fix 7) | `@ts-expect-error`, `eslint-disable`, `/// <reference`, `@vitest-environment`, `//` prose "see eslint-disable" | each real pragma returned in order; prose mention not returned; `@vitest-` mid-docblock is returned |
| Each `comments` pattern 1–17 | comment **and** title | `it.each` pattern × {comment, title}: planted tag fails with file:line; the "avoids" variant passes |
| Pattern 1 (fix 2) | comment, title | `ASSUMPTIONS: x` fails; `ASSUMPTION 14` fails; `ASSUMPTION:` alone (no citation) fails |
| `ASSUMPTION:` needs `OPEN_QUESTIONS.md#` in its block | comment, title | passes with the citation (same block, across a wrap); fails without; fails in a title; fails when the citation is in the next block |
| Game words not hit | patterns 11, 12, 14–17 | fixture with `isActionLocked`, `lockedTurns`, "a locked CASTER", "locked rounds 2-4", "SLOW attack (locked)", "still locked", "has already decided this round's status", "briefly", "a plan to flee", "planned" passes; provenance forms fail |
| No exemption; scope of the walk | `__golden__`, `__corpus__`, `__fixtures__`, `src/ui`, `vite.config.ts`, `eslint.config.js`; `scripts/` | planted tag in each fails; one in `scripts/x.ts` passes |
| `comments` never calls git | CLI | added to the existing no-git test: spawn with `PATH: ''` and no `.git`, `comments` on a clean tree exits 0 |
| `--counts` / `--quotations` report only | CLI | exit 0 on a failing tree; the tables are asserted |
| Quotation scan | `//`, `/* */`, title, across a wrap | a quote absent from the section is listed; one present is not; a wrapped quote is whole; markup stripped; within four words listed, five not |
| `sectionOf` | `anchors.ts` | heading through sub-headings; stops at next same-or-higher heading; skips fenced `#`; repeat headings use `-1` slugs; unknown anchor null |
| `UsageError` in `usage.ts` | `citations.ts`, `cli.ts` | a path-error test asserts `instanceof UsageError` from `usage.ts` |
| `citations <file>…` | module + CLI | passes on a clean file under `phases/`; fails on a planted label form and unresolved anchor under `phases/` with `file:line`; fails on an old form; outside root, missing file, directory → exit 2; absolute under `--root` and relative both work; no paths: output on a tree fixture equals a captured string (today's) |
| `comment-proof` print equality | `.ts`, `.tsx`, `.js` | a comment-only change passes in each; a changed identifier, number and string literal fails in each, naming the file |
| `comment-proof` pragmas | `@ts-expect-error`, `eslint-disable`, `/// <`, trailing `// eslint-disable-line` | changed text fails (prints equal); unchanged passes; a trailing pragma changed fails |
| `comment-proof` pragma position (D1, fix 7) | `eslint-disable`, `prettier-ignore` | same text moved above a different statement fails (prints equal, text list equal); a comment-only edit elsewhere in the file, which shifts no token, passes |
| `comment-proof` file set | added, deleted, renamed, untracked-not-ignored, ignored, non-ASCII path | the first four fail with the **reason** asserted (`added`, `deleted`; a rename both); an ignored `.DS_Store` under `src/` does not; a non-ASCII-named unchanged file does not fail (the test runs `gitIn(root, 'config', 'core.quotePath', 'true')` in its scratch repo so a global `false` cannot hide the `-z` mutation); a non-code byte change fails |
| `comment-proof` masks | title, template part, non-title literal | listed change passes and prints; unlisted title change fails; unconsumed entry fails; entry consumed twice at count 1 fails; requoted masked title passes; two entries with the same `file` and `old` exit 2 |
| `comment-proof` masks keyed by new text | title whose new text already exists as a literal | `describe('cheat-death (Phase 4 Slice D, Last Stand)')` → `'cheat-death'` in a file that also has `kind: 'cheat-death'` passes; the same diff that also changes that `kind` literal fails; two different old titles mapped to one new title pass in two `describe`s and fail in one, as a duplicate name; A→B plus B→C in one file exits 2 |
| `comment-proof` duplicate names | same file | two titles converging on one full name fail; a pre-existing duplicate does not; the same title in two `describe`s is not a duplicate |
| `comment-proof` reads `<base>` via git | CLI | scratch repo (`gitIn`) with two commits works; bad rev exits 1 |
| CLI wiring | `cli.ts` | bad-argument table grows: `comments extra`, `comments --counts --quotations`, `citations --counts`, `comment-proof`, `comment-proof x --counts`, `budgets --mask f` → 2 |
| Stale header comments (fix 10) | `docs-check.ts`, `git.ts` | the existing "entry names no Phase 4.2 mode" test sits beside a new one: the entry header no longer says "no dependencies" and mentions `comment-proof` |

Mutation runs (each removed, tests must fail, then restored; `evidence/mutation-check.txt`): drop the
`end <= token start` filter; read trailing ranges at `token.end` against the same token's start (the
first draft's reading, fix 1); walk JSDoc; remove one leader-stripping path (each of the two in turn);
unanchor the pragma match; drop pragma comparison; compare pragma text only, not `tokenIndex` (fix 7);
drop the file-set check; drop `--exclude-standard` (the `.DS_Store` test fails); drop the `existsSync`
filter (the deleted test fails on its asserted reason); `-z` back to newline splitting without the flag (the non-ASCII test fails); drop the mask-consumed check; check the head count against `count` alone, the old rule (the `cheat-death` test fails); pattern 1 back to `ASSUMPTIONS?\b(?!:)`; pattern 11 matching a bare `locked`;
drop the `OPEN_QUESTIONS` citation requirement. The CI-step mutation is out (no CI step).

## 5. Wiring facts

- `tsconfig.node.json` and the `docs-check` Vitest project already cover `scripts/**`; no config change.
- `typescript` is an existing devDependency; `import ts from 'typescript'` is the default import (A1).
- Node type stripping: `.ts` import extensions, no enums/parameter properties/namespaces
  (`erasableSyntaxOnly`), no unused locals.

## 6. Order of work, evidence, gates

1. Scanner + tests → `comments` + `sectionOf` + tests → `citations <file>…` + `usage.ts` + `cli.ts` +
   tests → `comment-proof` + tests → header/`git.ts` comment fixes. Docs-check project run after each.
2. Evidence (all under `phases/4.2/H1/evidence/`, outputs only, no scripts kept):
   - `counts.txt`: totals (files, ranges, titles, shapes) against the probe, every difference
     explained (expected: 403 files, 7,178 ranges, 1,627 titles; the pre-split 6,949 is neither the
     leading-only 6,677 nor this reading, and the report names the reading), and `comments --counts`
     per pattern.
   - `word-patterns.txt`: every hit of 11, 12, 14–17 listed (each provenance), plus the grep for
     `isActionLocked`, `lockedTurns`, SLOW "(locked)", "still locked" with no hit among them.
   - `quotations.txt`: `--quotations` on today's tree against 4.2-G's `review-quotations.txt` (about 40
     comments and one title), both counts, each difference explained.
   - `g-rehearsal.txt`: a `git clone` into a scratch directory outside the repo; `a7c4fa2` has no
     `comment-proof`, so the tool is this branch's entry run against the clone, with the clone checked
     out at `a7c4fa2`: `node scripts/docs-check.ts comment-proof 3fd6a8f --mask <scratch>/g-mask.json
     --root <clone>`. The mask file lives in scratch outside both trees, its content copied into the
     evidence file, and lists exactly the 10 titles of 4.2-G's
     `retitled-tests.md` and the `renderFixture` template part. Expect 88 files OK with masked pairs
     printed and `vite.config.ts` FAIL, exit 1; with it reset to `3fd6a8f` in the clone, exit 0. Any other failure or
     unconsumed entry is reported, never masked away.
   - `planted-faults.txt`: on that clone, with the same invocation, a code change, a pragma change, a
     pragma moved, an unlisted title change, an added file, a deleted file, an unconsumed entry, each
     exit 1 naming the file; `.DS_Store` under `src/` does not fail.
   - `citations-files.txt`: this kickoff passes; a planted label form and unresolved anchor under
     `phases/` fail; exit 2 for outside-root, missing, directory; no-paths output identical to `main`'s
     (`git archive main` extracted to scratch, diff shown).
   - `mutation-check.txt`, `gates.txt` (test counts reconciled file by file against `main`'s via a JSON
     reporter run).
3. Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations` and
   `-- budgets`. `-- comments` is run and reported, not a gate. Node/tool versions checked against
   `package-lock.json` first.
4. Check: `git diff --stat origin/main -- src vite.config.ts eslint.config.js .github` is empty.
5. `report-r1.md`, `record.md`. Nothing committed or deleted. The base for the rehearsal is a local commit
   (`a7c4fa2`, `3fd6a8f`), so no fetch is needed; if either is missing locally I stop and ask Duncan.

## 7. Pre-listed for the report

**Spec questions:** `workflow/design-rules.md#writing` gains the `citations <file>…` step (brief,
Decided, not built: H1's PR review); `CLAUDE.md`'s `docs:check` mentions and
`CONVENTIONS.md#every-pull-request-runs-the-gates` need `comments` when H2 puts it in CI; any
game-word clash found in a pattern; any quotation fact the scan surfaces with no home.

**Content changes:** none. **To delete:** none expected.

## Assumptions checklist

A1–A11 are the pre-split plan's, with the review's calls applied. N1–N4 are new here.

- **A1** New modules `scanner.ts`, `comments.ts`, `comment-proof.ts` with tests; `UsageError` moves to
  `usage.ts`; `import ts from 'typescript'` works under `nodenext` and type stripping (review: confirmed,
  `export =`). If it does not, `import * as ts`.
- **A2** `comments` scope: `src/**/*.{ts,tsx}` (tests, goldens, fixtures, `.d.ts`, no exemption),
  `vite.config.ts`, `eslint.config.js`; not `scripts/`.
- **A3** Matching is per comment block (joined with a space), titles per literal part, with the fix 6
  leader handling for both comment forms.
- **A4** The table in §2 is the whole check (patterns 1–17): no bare plan-item id pattern (D1).
- **A5** `ASSUMPTION:` requires `OPEN_QUESTIONS.md#<anchor>` in its block and fails in a title.
- **A6** A title is the first argument of a `describe|it|test|suite` call through `.each/.skipIf/.only/
  .skip/.todo/.concurrent/.runIf` chains; templates checked on literal parts only; identifiers ignored.
- **A7** `--quotations` is report-only, 4.2-G's normalisation, four-word window.
- **A8** Pragma forms as listed in §2, **matched at the start of the comment body**, `@vitest-` anywhere in the
  leading docblock (fix 7); compared as (exact text, next-token index), in order (D1).
- **A9** The duplicate-name check is a heuristic (counts of duplicated full names, the full name being
  the `chain` plus the title, and excess copies), not a per-title mapping; titles converging pass the
  mask (Revision 2) and this check alone decides.
- **A10** `comment-proof` compares the working tree to `<base>`, counting untracked-not-ignored
  files; non-code files under scope must be byte-identical.
- **A11** `citations <file>…` applies the `claude` site rules to a named file whatever its extension;
  bad paths are exit 2; no-paths output unchanged.
- **N1** Patterns 14–17 accept a capital first letter (`[Bb]rief`, `[Tt]he plan`, `[Pp]lan review`,
  `[Ss]ign-off`) because comments start sentences with them; the kickoff's fix 3 lists them lower-case
  (review: corrected to include 16 and 17). The word-patterns run decides
  whether any game hit forces narrowing; if one does, I narrow and report it.
- **N2** The working-tree file set is `git ls-files --cached --others --exclude-standard` filtered by
  existence, so git's own ignore rules decide what is "in the tree" (kickoff trap on `.DS_Store`).
  `git ls-files` is read-only.
- **N3** A mask is applied by editing the source text at the literal's span (reverse order) before
  parsing and printing, matching on cooked text, so quote style cannot matter and raw escapes are
  irrelevant. Masks are grouped by `new` per file; the group's token covers its `old` and `new` literals
  in the base and its `new` literals in the head (Revision 2).
- **N4** Pattern-12 and pattern-11 shapes are kept as written in the pre-split plan; the review verified
  they leave the game uses alone, and `word-patterns.txt` re-verifies on the branch.
