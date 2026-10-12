# PR review — Phase 4.2 — Slice H3: Names — Round 2

Reviewed branch `4.2-h3` at `567051e` ("fix") against `origin/main` at `590d82a`, which hasn't
moved. The fix diff starts at round 1's build commit `603ef62`; `314f5bb` between them holds only
round 1's review and doc edits. Inputs: `review-r1.md`, `handout-r1.md`, `report-r2.md`,
`record.md`, the evidence folder, and the living docs on the branch.

**Verdict: fixes, small.** Both hand-out items are built as written, and every gate, count and
proof reproduces in my clone. `src/` is untouched: its tree hash at `567051e` equals `603ef62`'s.
Two things fall short of what the hand-out meant, and both trace to how I wrote it:

- `'ASSUMPTION: …'`, the canonical tag form, passes the new value check (fix 1);
- two edges of the new mechanisms can be mutated with the suite green (fix 2, tests only).

D2 asks whether JSX text should be read too. `handout-r2.md` holds fixes 1 and 2 and, if you say
yes, D2.

## Real fixes

**1. `ASSUMPTION:` in a value literal passes.** Pattern 1 is
`/\bASSUMPTIONS\b|\bASSUMPTION\b(?!:)/g`. It skips the colon form on purpose: `comments` handles
`ASSUMPTION:` with its own rule (`ASSUMPTION_COLON`), which allows it in a comment that cites
`OPEN_QUESTIONS.md#…` and always fails it in a title. The value arm runs patterns 1-9 and not that
rule, so `export const a = 'ASSUMPTION: floor-1 clear'` exits 0 (probed). `ASSUMPTION 22` is
caught; `ASSUMPTION:` is the form a plan item takes, so it is the likeliest one to leak into a
string. My hand-out said "patterns 1-9" and listed ASSUMPTION as covered: it got the letter and
missed the intent. A value literal can't cite an open question, so `ASSUMPTION:` fails there
always, as in a title.

**2. Two edges of round 2's mechanisms have no test.** My mutations, each on one line, with the
482 `docs-check` tests run:

- **The upper bound set to 8** (`LAST_VALUE_PATTERN = 8`): 0 tests fail. The fail cases cover
  patterns 1, 2, 3, 6 and 8, and the pass cases pin the bound from above (`'grill the kickoff'`
  is pattern 10). Nothing pins pattern 9 from below. `'items B2+ only'` is a pattern-9 hit today
  (probed).
- **The mid-camel lookbehind narrowed from `[a-z0-9]` to `[a-z]`**: 0 tests fail. The hand-out
  asked for "after a lower-case letter or a digit", and both new cases (`placeholderPhase4Config`,
  `configPHASE_4`) follow a letter. `x4Phase2` is caught today (probed).

The fix is one fail case each, and two mutation rows.

## Scope and labeling

No action needed on any of these:

- **The base-differs test uses an importer that stops importing**, not a deleted one. That is
  right: the count reads only files present in both trees (`comment-proof.ts:574-581`), and a
  deleted importer fails as `deleted` on its own. My hand-out's shape could not reach the count
  line.
- **A phase number split by a placeholder** (`` `before Phase ${n}` ``) is not read: the template
  part is `before Phase `, with no digit. A phase number computed at run time is unlikely, and
  reading across placeholders would need its own rules. Accepted.
- **"Phase 2" is now a word the guard owns.** A capitalised `'Phase 2: the boss enrages'` in a
  player-facing string fails, and so does an identifier `bossPhase2` (probed). Nothing in the
  design has boss phases today (I grepped the spec, content and living docs). If a design ever
  adds them, the guard needs a carve-out then, not now.
- **A literal that hits both a slice-id shape and a marker** is reported once, with the slice-id
  message. Removing that precedence changes only the message, so it's not pinned and needn't be.
- **`mutation-check.txt`'s header** still says round 1's 63 mutations. The round-2 section carries
  its own count, which is enough.
- **Record and report:** accurate against what I measured. The mailbox holds only step files and
  `evidence/`; nothing to delete.

## Spec questions (from the report)

- `CONVENTIONS.md#comment-why-not-what` now says what the guard reads in a literal and an
  identifier (edited). It names `ASSUMPTION:` as fix 1 builds it.

## Decide-points

**D2. Should the guard read JSX text as well?** The value arm reads every string, template and
regex literal, so `<p title="before Phase 8">` fails. The text between JSX tags is a different
node (`JsxText`): `<p>not available before Phase 8</p>` exits 0 (probed), and `comments` doesn't
read it either. Today `src/` has 3 `.tsx` files with 6 non-blank JSX text nodes, and none matches
any of `comments`' 17 patterns, on `main` or the branch. Phase 7's combat UI is where player-facing text
will pile up.

- **(a) Recommended: read it in round 3.**
  - `names.ts` reads each non-blank JSX text node under `src/` as a value: the slice-id shapes,
    the markers and `ASSUMPTION:`.
  - It goes through a function of its own, not `literalsOf`, so `comment-proof --renames` doesn't
    change and its re-run stays byte-equal.
  - The cost is a small walk, three tests and one mutation row.
- (b) Park it as "Decided, not built" in `ROADMAP.md`'s Phase 7 entry, to build with the real UI.
  This is fair if Phase 7 keeps its strings in `.ts` tables, where the value arm already reads
  them.
- (c) No: JSX text is checked by hand at review.

I recommend (a) because this is D1's argument again: text in `src/` that no check reads is where
provenance comes back unseen. Round 3 is happening anyway for fixes 1 and 2. If you choose (b) or
(c), delete section 3 of `handout-r2.md`; under (b) the round-3 review adds the ROADMAP item.

## Decisions

Duncan, 2026-10-12: **D2 (a)**, as recommended. Round 3 reads JSX text:
- `names.ts` reads each non-blank JSX text node under `src/` as a value literal, through a
  function of its own rather than `literalsOf`;
- it runs the slice-id shapes, patterns 1-9 and `ASSUMPTION:` over it.

`handout-r2.md` keeps section 3. The round-3 review adds JSX text to the CI sentence in
`CONVENTIONS.md#comment-why-not-what`.

## What I verified, and how

All of this ran in my own clone (worktrees of `567051e`, `603ef62` and `590d82a`, `npm ci` on
each, Node 22.22.0, Vitest 5.0.3 from the lockfile), never in your working tree.

**The fix diff.** `git diff 603ef62 567051e` outside `.claude/` touches only
`scripts/docs-check/` (`comments.ts`, `names.ts`, `names.test.ts`, `renames.test.ts`). `src/` and
`.github/` have the same tree hashes at both commits, and no config or lockfile changes.

**Gates on the branch:**
- `npm run test`: 212 files, 1,840 tests (1,839 passed, 1 skipped)
- `lint`, `format:check`, `build` and `npx tsc -b`: clean
- `citations`: PASS, 642 citations in 436 files, before my doc edit
- `comments`: PASS, 7,008 comments and 1,629 titles in 403 files; `--counts` rows 18-20 read 0;
  `--quotations` lists only the known `node-shims.d.ts:3`
- `budgets`: 12 files, 0 over

I couldn't read the CI result: the GitHub API is closed to this session. Worth a glance on the PR.

**Test counts, file by file** (`vitest run --reporter=json` on all three trees):
- `main`: 210 files, 1,682 tests (`src/` 1,357, `scripts/` 325)
- round 1: 212 files, 1,821 tests
- round 2: 212 files, 1,840 tests. Against round 1, only two files differ:
  - `names.test.ts` 58 → 75: 2 identifier fails, 2 identifier passes, 6 value fails, 4 value
    passes, and the title, body and `--counts` tests;
  - `renames.test.ts` 59 → 61.

  `src/` stays at 1,358 in every file.

**The proof.** `comment-proof origin/main --mask evidence/mask.json --renames
evidence/renames.json` in my clone: 151 OK and the one FAIL, `engine/corpus-digest.test.ts`,
exit 1. The output is byte-equal to `evidence/comment-proof.txt`. With `src/` byte-identical to
round 1, round 1's fixture comparison (140 modules, 0 differ under the map) and its collision and
leftover scans still hold, and I didn't repeat them.

**The 7 `main` hits.** I ran the branch's `scripts/` over a `git archive 590d82a` extraction. It
finds exactly the 7 value literals the hand-out lists, each naming the pattern the evidence shows.
Round 1's `scripts/` over the same extraction gives 111 literal hits in 47 files and the branch's
gives 118 in 52. The sorted problem lists differ by exactly those 7 lines, with nothing removed.
The identifier row stays at 25: the mid-camel case finds nothing new on `main`.

**Mutations.** I made 9 of my own on the fix diff, each one line in my clone, with the 482
`docs-check` tests run, then restored with `git checkout`.

Caught:
- the base half of the importer count (1 test, the new base-differs test)
- the working-tree half (1, the new working-tree test)
- `comments.ts` passing `[]` instead of `PATTERNS` (8)
- the `'value'` context check (1, the title test)
- `PHASE` dropped from the mid-camel case (1, `configPHASE_4`)
- `_?` dropped from the mid-camel case (1, `configPHASE_4`)

Survived:
- the bound set to 8 (fix 2)
- the lookbehind narrowed to `[a-z]` (fix 2)
- the slice-id precedence (message only; see scope)

**Probes** (a throwaway test through `runComments`, deleted after):
- fail as expected: `ASSUMPTIONS`, a slice id `4.2-H3`, `Slice B`, `review fix`, `B2+`, a JSX
  attribute, an object key, an enum member, `x4Phase2`
- pass as built: `ASSUMPTION:` (fix 1), JSX text (D2), a split template, lower-case
  `phase 2`, `XPhase2` (an upper-case letter before `Phase` is outside the hand-out's case)

**Code read:** the whole `names.ts` diff, `comments.ts`'s two lines, and both new `renames.test.ts`
tests. `provenanceHit` uses `matchAll`, which copies each regex, so a `/g` regex's `lastIndex`
can't leak between literals. `names.ts` imports `Pattern` from `comments.ts` as a type only, so
there's no cycle at run time.

**Not run:** the corpus event-log scan
(`workflow/pr-review.md#6-look-for-live-behaviour-the-spec-doesnt-cover`). No `src/` file changed.

## Docs edited

- `CONVENTIONS.md#comment-why-not-what`, the "So do names" bullet. The CI sentence now says what
  the guard reads:
  - a mid-camel phase id in an identifier (`placeholderPhase4Config`);
  - in a literal that is not a specifier or a test title, `ASSUMPTION:` and the markers `comments`
    reads in a comment;
  - not the workflow words.

  `ASSUMPTION:` is written as fix 1 builds it.

If D2 is (a), the round-3 review adds JSX text to that sentence. If it is (b), it adds the item to
`ROADMAP.md`'s Phase 7 entry.
