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

## Round 2

Reviewed `plan.md` at `3eac01e` (Revision 1) against Round 1, `kickoff.md`,
`phases/4.2/H/brief.md` and `scripts/docs-check/test-utils.ts`, with read-only TypeScript probes over
the working tree (typescript 6.0.3, Node 22.23.2, run outside the repo).

**Verdict: changes needed, and both are small and fully specified.** Revision 1 lands every Round 1
fix as asked: both comment-range reads at the token's full start with the end-before-start filter
(fix 1), `Title.chain` built from a stack during the walk (fix 2), `-z`, asserted reasons and the two
new mutation runs (fix 3), the duplicate-`old` usage error (fix 4), the rehearsal invocation (fix 5),
`[Pp]lan review` and `[Ss]ign-off` (fix 6), and pragmas as (text, `tokenIndex`) with a test and a
mutation run (fix 7). Plan fix 1 below is needed either way. Plan fix 2 applies only if Duncan takes
the decide-point. Neither opens a design question, so a Round 3 would only check that the two edits
landed. That isn't the "pull it back into a design pass" signal.

### Plan fixes

1. **§4, the non-ASCII file-set test pins `core.quotePath`.** The test that catches the "drop `-z`"
   mutation only fails if git quotes the path. `gitIn` passes only an identity, so the scratch repo
   inherits the user's global git config. With `core.quotePath false`, which is common on Windows,
   git doesn't quote the path, and the mutation survives. Fix: the test runs
   `gitIn(root, 'config', 'core.quotePath', 'true')` in its scratch repo, since a repo-local setting
   beats the global one. The mutation run is "back to newline splitting without `-z`", not "drop the
   flag but keep splitting on NUL": that second version breaks every path, not just the non-ASCII
   one, so it proves nothing about `-z`.

If the decide-point below is taken:

2. **§2 `comment-proof` step 4, masks are keyed by the new text.** In each file, group the entries by
   `new`, and give each group one mask token. In the base, every literal whose cooked text equals
   one of the group's `old` texts **or** its `new` text gets that token. In the head, every literal
   whose cooked text equals `new` gets it. Counts: each entry's `old` occurs exactly `count` times in
   the base. `new` occurs in the head exactly (its occurrences in the base) + (the group's summed
   counts). The print comparison then pins every masked position. Two new usage errors (exit 2),
   checked before any file is read: two entries with the same `file` and `old` (as in Revision 1),
   and an entry whose `new` is another entry's `old` in the same file (a chain or swap can't be
   masked). A9 changes with it: titles converging in different `describe`s pass the mask, and the
   duplicate-name check alone decides. Add to §4:
   - `describe('cheat-death (Phase 4 Slice D, Last Stand)')` → `'cheat-death'`, in a file that also
     has `kind: 'cheat-death'`, passes;
   - the same diff that also changes that `kind` literal fails;
   - two different old titles mapped to one new title pass in two `describe`s and fail in one, as a
     duplicate name;
   - A→B plus B→C exits 2.

   Mutation run: check the head count against `count` alone (today's rule); the first test fails.

### Assumptions

| # | Call | Note |
| --- | --- | --- |
| A1–A7, A10, A11 | **confirm** | unchanged from Round 1 |
| A8 | **confirm** | as restated: anchored, (text, `tokenIndex`), in order |
| A9 | **confirm**, or **correct** with plan fix 2 | `chain` as built answers Round 1 fix 2. No `describe` in the tree has a non-literal title, so a chain never loses a level today. If plan fix 2 is taken, drop "converging in different `describe`s fail the mask count check" |
| N1 | **confirm** | now covers 14–17 |
| N2 | **confirm** | with plan fix 1 for its test |
| N3 | **confirm**, or **correct** with plan fix 2 | span edit on cooked text stands; what the mask token covers changes |
| N4 | **confirm** | |

**Bring-it-back check:** the plan changes nothing in the brief. The decide-point below would change a
rule **the kickoff** sets ("each entry consumed exactly `count` times on both sides"), so it is
Duncan's call, not an inline correction.

**Golden policy:** matches the kickoff.

**Mechanism coverage:** every Round 1 mechanism has its test and mutation run. Fix 1's mutation (read
trailing ranges at `token.end`), fix 7's mutation (text-only comparison) and fix 3's two mutations
are all listed. The `-z` mutation needs plan fix 1 to be deterministic.

**Checked, no change:**
- **Pragma position, trailing vs. own-line.** `tokenIndex` doesn't record whether a pragma is
  trailing or on its own line, so a standalone `// eslint-disable-line` moved to the end of the line
  above, without crossing a token, would pass. I recommend not keying on it. A useless standalone
  `-line` pragma is contrived. Worse, Prettier re-wraps lines when a title shortens (4.2-G re-wrapped
  four files), and that can flip a comment between trailing and own-line with no token moving. So
  keying on it would fail legitimate 4.2-H2 diffs.
- **The tree's one pragma** (`injured-allies.test.ts:149`, `@ts-expect-error -- 'other-ally-injured'
  is a TriggerCondition kind, …`): its description carries no provenance, so comparing exact text
  costs 4.2-H2 nothing. The provenance is in the enclosing `describe` title, which is a maskable
  title.
- **Line endings:** `.gitattributes` is `* text=auto eol=lf`, so the working tree and `git show` agree
  and the byte-identical rule for non-code files (`src/index.css`, `.gitkeep`) is safe on Windows.
- **4.2-G rehearsal:** none of the 10 new titles in `retitled-tests.md` already occurs as a literal in
  its file, so the rehearsal's 88 OK holds under today's rule and under plan fix 2.

### Decide-points

**Should a mask entry's new text be allowed to already exist in the file?** As specified (kickoff
trap, plan §2 step 4), every literal whose cooked text equals `new` counts against the entry. If
4.2-H2 rewrites a title to text that already occurs anywhere in the file, as another title or as
any string, the head count comes out at `count + n`, and the file fails as "consumed 3 times". That
is a legitimate comment-only change, failed with a misleading reason. A probe over today's tree
(291 titles carrying a tag) found two titles where the obvious rewrite hits this:
`resolution.test.ts:1305` `'conditional-damage-bonus (Phase 4 Slice E2, …)'` and `:1893`
`'cheat-death (Phase 4 Slice D, Last Stand)'`. Stripping each whole parenthetical leaves the effect
kind, and the file already uses that kind as a string twice. If only the tag words are stripped,
nothing collides. The same rule also fails titles that converge in different `describe`s (A9
accepts that today).

**Recommend: yes, plan fix 2, in this slice.** The brief splits the work "so 4.2-H2 never changes the
tool that proves it". Under today's rule, H2's only way round a collision is to reword the title to
suit the tool. That's the tool deciding content, and a later comment-only change or 4.2-H3's rename
option hits the same wall. The fix stays sound: masked positions still have to line up in the
print, every `old` has to be consumed exactly, and a change to a pre-existing `new` literal still
fails on the count. It costs one grouping step, one usage error, four tests and a mutation run.
Against: today the collision is avoidable by wording, H2 hasn't hit it yet, and "exact or it fails"
is the simpler rule to explain. If you'd rather keep it, I'll put a line in H2's kickoff saying a
new title must not equal another literal in its file.

### Decisions (Duncan, 2026-10-11)

- **Masks keyed by new text:** taken. Plan fix 2 applies; A9 and N3 are corrected with it.
- Plan fix 1 and the assumption calls stand as written.

### Docs edited

- `phases/4.2/H1/kickoff.md`, Traps, the mask bullet: an entry's `old` is consumed exactly `count`
  times in the base and `new` is counted per group against the base's own occurrences; same
  `file`+`old` and chains or swaps are exit 2 (the decide-point).

## Round 3

Reviewed `plan.md` at `ecc42d1` (Revision 2) against Round 2, `kickoff.md` (its mask trap as edited
in Round 2), `phases/4.2/H/brief.md` and `scripts/docs-check/test-utils.ts`. This round checks that
Round 2's two edits landed, and checks the new mask rule for soundness. Round 2 said a third round
would only do that check. No design question is open, so this is not the "pull it back into a
design pass" signal.

**Verdict: approved, with three corrections the build applies** (`/slice-build` builds "to the
approved plan, including its corrections"). None of them changes the design. Each one either names
a test site or turns a misleading failure into a usage error, so a Round 4 would only check that
they landed.

Both Round 2 fixes are in:
- **Fix 1:** §4's file-set row runs `gitIn(root, 'config', 'core.quotePath', 'true')`. `gitIn`
  passes its arguments through after the identity `-c` flags, so this is a repo-local `git config`
  and overrides a global `false`. The mutation is "newline splitting without `-z`".
- **Fix 2:** §2 step 4 groups the entries by `new` and has one token per group. The base masks
  each group's `old` texts and its `new` text, and the head masks the `new` text. The counts are
  `count` in the base and base + summed counts in the head. Same `file`+`old` and chains or swaps
  are exit 2, checked before any file is read. §4 has the four tests. The mutation run (head count
  against `count` alone) fails the `cheat-death` test. This matches the kickoff's mask trap word for
  word.

**Soundness of the new mask rule, checked case by case.** The print comparison pins every masked
position, and the counts add exactness. The cases:
- a pre-existing `new` literal that changes: it fails on the print and on the head count;
- an unlisted literal that becomes `new` while its title stays `old`: the base's `old` is masked
  and the head's is not, so it fails on the print;
- a positional swap of `old` and `new`: it fails on the print and on the count;
- an `old` occurring more often than `count`: it fails on the base count;
- a partly applied rename (`count: 2`, one changed): it fails on the print.

A literal that already reads `MASK0` could stand in for a token, but the head count still catches
it. That case is contrived, and it needs no change.

### Corrections (the build applies these; no new round)

1. **§4 masks: test the unconsumed check at both sites.** §2 says "an entry for a file with no
   change fails as unconsumed", but the loop in step 2 only visits files whose text differs. So
   checking entries for files the loop never visits is a separate mechanism from the count check
   inside a visited file (`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`).
   §4's "unconsumed entry fails" names neither site. Test both:
   - an entry in a changed file whose `old` isn't there;
   - an entry for an unchanged file, and an entry for a path in neither file set.

   Both fail as unconsumed, naming the entry's file. Add the mutation run "check entries only
   while visiting changed files": the unchanged-file test fails. Why this matters on Windows: an
   entry written with `\` separators would never match git's `/` paths. Without this check it would
   be skipped silently. The rehearsal's "any unconsumed entry is reported" claim depends on that
   case failing loudly.
2. **§2 step 4: an entry whose `old` equals its `new` is a usage error (exit 2)**, checked with the
   other two. It is the degenerate case of a chain. As written, it fails later as a count mismatch,
   and the reason it gives is misleading. Add the case to the exit-2 tests.
3. **Line 59 is stale. §6 governs.** Line 59 says the build "reproduces" 6,949. Since Revision 1,
   the expected total is 7,178, explained against the pre-split 6,949 and the leading-only 6,677
   (§6, `counts.txt`). This is a labeling slip, not a change. The report follows §6.

### Assumptions

| # | Call | Note |
| --- | --- | --- |
| A1–A8, A10, A11 | **confirm** | unchanged |
| A9 | **confirm** | restated as corrected in Round 2: converging titles pass the mask, and the duplicate-name check alone decides |
| N1, N2, N4 | **confirm** | unchanged; N2's test is now deterministic with fix 1 |
| N3 | **confirm** | restated as corrected in Round 2: one token per `new` group |

**Bring-it-back check:** the plan changes nothing in the brief. The kickoff's mask trap already
carries Round 2's decision, and the plan matches it.

**Golden policy:** matches the kickoff (byte-identical, trivially).

**Mechanism coverage:** with correction 1, every mechanism has its test at each site. The base also
masks literals that already read `new`. That has no mutation run of its own, but the `cheat-death`
pass test fails without it, which is what the table needs. The kickoff's mutation list is all
there.

### Decide-points

None. The three corrections are labeling and test-site fixes inside decisions already made.

### Docs edited

None this round.
