# Plan review — Phase 4.2 — Slice H1: Comment tooling

## Round 1

Reviewed `plan.md` at `1d26c06` against `kickoff.md`, `phases/4.2/H/brief.md` (`#split` as the
boundary), the pre-split `phases/4.2/H/plan.md` and its `plan-review.md` Round 1,
`workflow/coding-rules.md`, `scripts/docs-check.ts` and every file in `scripts/docs-check/`, and a
TypeScript-parser probe of my own over the working tree (typescript 6.0.3, Node 22.23.2; read-only,
run outside the repo). I also checked that `a7c4fa2` and `3fd6a8f` exist locally and that 4.2-G's
diff between them touches 89 files in scope (88 under `src/` plus `vite.config.ts`), with no file
added, deleted or renamed.

**Verdict: changes needed.** The design carries the pre-split plan over faithfully, and every
binding fix (2, 3, 5, 6, 7, 10) and call (D1, D2, A1–A11) is in. The pattern table holds on
today's tree: every hit of patterns 11, 12 and 14–17 is provenance (probe below). One thing must
change before the build: as written, the scanner's filter drops every same-line trailing comment,
so `comments` and the pragma comparison never see them. The rest are small. There is one
decide-point: whether `comment-proof` checks where a pragma sits as well as its text.

### Plan fixes

1. **§2 scanner: the range filter drops every trailing comment.** The plan reads trailing ranges at
   `token.end` and keeps a range only if `range.end <= token.getStart(sf)`, the same token's start.
   A trailing range read at `token.end` starts after that token, so it never passes. TypeScript's
   `getLeadingCommentRanges` skips the comments on the previous token's line, so those comments are
   then read nowhere. On today's tree that loses 501 of 7,178 comment ranges. 13 of them carry
   provenance, for example `src/data/balance.ts:16` (`// 4.1-H2c (ASSUMPTION 118): was base 2`)
   and `src/data/biomes.test.ts:103` (`// 6v6 (PR #81 review): …`). `comments` would go green
   with these still there, and a trailing `// eslint-disable-line` would escape the pragma
   comparison. Fix: at each token, read **both** `getTrailingCommentRanges(text, fullStart)` and
   `getLeadingCommentRanges(text, fullStart)` (that is, the token's own leading trivia), and keep a
   range only if `range.end <= token.getStart(sf)`. The JSX and template cases still hold: a `//`
   that opens a `JsxText` token ends after that token's start. Add to §4: a trailing
   `x, // Phase 4` fails `comments` with its line; a trailing `// eslint-disable-line` is returned
   as a pragma. Add a mutation run that reads trailing ranges at `token.end` against the same
   token's start (the plan's text as written). **Probe totals for `counts.txt`:** read this way,
   403 files, 7,178 comment ranges and 1,627 titles. Reading leading ranges only gives 6,677. The
   pre-split plan's 6,949 is neither, so the report explains the branch's count against 7,178 and
   names the reading.
2. **§2: say where the describe chain comes from.** A9's full test name is the describe chain plus
   the title, but `Title` has no parent. Give `Title` its enclosing titles, or give it the call's
   span and work out the chain by span containment, and say which. Add to §4: the same title in
   two `describe`s is not a duplicate.
3. **§2 `comment-proof` file set: the tests check the reason, and two more mutation runs.** If the
   `existsSync` filter is dropped, a deleted tracked file stays in the working set. Reading it
   then throws ENOENT, which also exits 1 and names the path, so "deleted fails naming the file"
   still passes. The file-set tests assert the reason (`added`, `deleted`). Add mutation runs
   dropping `--exclude-standard` (the `.DS_Store` test fails) and dropping the `existsSync` filter
   (the deleted test fails). Run `git ls-tree` and `git ls-files` with `-z`: without it git quotes
   a path with non-ASCII characters (`core.quotePath`), and that path then fails as both added and
   deleted.
4. **§2 masks: two entries with the same `file` and `old` are a usage error (exit 2).** As
   specified, the first entry masks every match, so the second is never consumed and the run
   fails as "unconsumed", which is a misleading reason. Same old text to the same new text is what
   `count` is for. Same old text to two different new texts can't be paired by position, so the
   tool refuses it outright. Today no file has two identical titles that carry provenance (14
   same-text groups, none with a tag), so 4.2-H2 won't need it. Add the case to the CLI or mask
   tests.
5. **§6 rehearsal: say which tool runs.** `a7c4fa2` has no `comment-proof`. The run is this
   branch's entry against the clone:
   `node scripts/docs-check.ts comment-proof 3fd6a8f --mask <scratch>/g-mask.json --root <clone>`,
   with the mask file kept in scratch outside both trees and its content copied into
   `g-rehearsal.txt`. The planted faults use the same invocation.
6. **N1 applies to patterns 16 and 17 as well.** Use `[Pp]lan review` and `[Ss]ign-off`, for N1's
   own reason: a comment can start a sentence with either. On today's tree this adds no hit.

If D1 below is confirmed:

7. **§2 `comment-proof` pragmas: compare each pragma with the position it governs.** Record each
   pragma as (exact text, index of the next real token). That index doesn't move under a
   comment-only edit or a mask, since both leave the token stream unchanged. Add to §4: a pragma
   moved above a different statement, with the same text, fails. Add a mutation run comparing text
   only.

### Assumptions

| # | Call | Note |
| --- | --- | --- |
| A1 | **confirm** | typescript 6.0.3, `export =`; my probe loads it the same way |
| A2 | **confirm** | src has no `.js`/`.jsx`/`.mts`; the only non-TS files are `src/index.css` and `src/data/.gitkeep` |
| A3 | **confirm** | with plan fix 1 (trailing comments are blocks alone, and now they exist) |
| A4 | **confirm** | patterns 1–17 as corrected by fixes 2 and 3, plus plan fix 6 |
| A5 | **confirm** | |
| A6 | **confirm** | my probe's title walk gives 1,627, the kickoff's number; no tagged-template `.each` in the tree |
| A7 | **confirm** | report-only. 4.2-G's scan says "within a few words, across one comment wrap"; the four-word window is the plan's choice, and `quotations.txt` explains any difference |
| A8 | **confirm** | as corrected by fix 7 (anchored); see D1 for position |
| A9 | **confirm** | with plan fix 2. Today's tree has no duplicate full test names |
| A10 | **confirm** | |
| A11 | **confirm** | |
| N1 | **correct** | plan fix 6. The probe agrees there's no game hit: pattern 14 hits 30 comment blocks and 1 title, pattern 15 hits 6 blocks, all provenance ("the brief's own …", "brief ASSUMPTION 112", "the plan's own 'Response reuse check'"); no capitalised hit exists today |
| N2 | **confirm** | with plan fix 3 (`-z`, reasons asserted). A tracked file that `.gitignore` also matches stays in both sets (`--cached`, `ls-tree`), so the two sets agree on it |
| N3 | **confirm** | with plan fix 4. Cooked-text matching covers a JSX attribute string too, which is a `StringLiteral` |
| N4 | **confirm** | re-verified on today's tree with trailing comments included: pattern 11 hits 8 blocks ("locked design principle", "locked semantics", "Phase 4 Slice B, locked", "locked \"option a\"", …), pattern 12 hits 3 blocks and 1 title ("decided at the 4.1-H2d grill", "decided before Phase 5"), all provenance; no game use of "locked" or "decided" is hit |

**Bring-it-back check:** the plan changes nothing in the brief. N1 widens plan-review fix 3 in
line with that fix's purpose, so it is a correction, not a change of design.

**Golden policy:** matches the kickoff (byte-identical, trivially; the `docs-check` project grows
by the new tests only, reconciled file by file).

**Mechanism coverage:** with plan fixes 1–4 (and 7), every mechanism has a test that fails without
it, at each site. The mutation list covers all of the kickoff's: §7's list without the CI step,
plus walking JSDoc, each leader-stripping path, the unanchored pragma match and pattern 1's old
form.

**Probe, other patterns:** patterns 8, 9 and 10 hit only provenance on today's tree, including the
title of `golden-h2a-indirect-keeps.test.ts:6` (`… (4.1-H2a)`). No slice id is wrapped at its
hyphen across a comment line, which pattern 4 would miss.

### Decide-points

**D1 — does `comment-proof` also check where a pragma sits?** The brief says the mode "fails on a
changed pragma comment". The plan compares the pragmas' text in order. Moving a pragma, with the
same text, above a different statement is a comment-only diff in the print, and the pragma list
is unchanged, but what it suppresses has changed. The gates catch some of these and miss others:
- `@ts-expect-error` moved to a line with no error: `tsc` fails. Caught.
- `eslint-disable-next-line` moved: the old line's violation now shows. Caught.
- An `eslint-disable` / `eslint-enable` pair whose range widens, `prettier-ignore` moved onto
  already-formatted code, `v8 ignore` moved: nothing fails.

**Recommend: yes, in this slice (plan fix 7).** It costs one field and one test. It is what
"changed pragma" means for a tool every later comment-only change reuses, and 4.2-H3's
rename option will build on it. Against: the tree has one pragma today
(`injured-allies.test.ts:149`), and 4.2-H2 doesn't move it. If you'd rather keep H1 exactly at
the brief's wording, drop fix 7 and I'll put the position check under the brief's "Decided, not
built" for 4.2-H3.

### Decisions (Duncan, 2026-10-11)

- **D1:** confirmed. `comment-proof` compares each pragma as (exact text, index of the next real
  token), so plan fix 7 applies.
- Plan fixes 1–6 and the assumption calls stand as written.

### Docs edited

- `phases/4.2/H/brief.md`, Scope, the `comment-proof` bullet: a changed pragma is one whose text or
  governed token changed (D1).
