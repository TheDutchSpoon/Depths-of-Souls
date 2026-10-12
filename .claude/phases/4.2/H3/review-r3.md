# PR review — Phase 4.2 — Slice H3: Names — Round 3

Reviewed branch `4.2-h3` at `eb1e730` ("fix 2") against `origin/main` at `590d82a`, which hasn't
moved. The fix diff starts at round 2's commit `567051e`; `f5cdbea` between them holds only round
2's review and doc edit. Inputs: `review-r2.md`, `handout-r2.md`, `report-r3.md`, `record.md`, the
evidence folder, and the living docs on the branch.

**Verdict: fixes, tests only.** All three hand-out items are built as written, and every gate,
count, proof and measurement reproduces in my clone. `src/`, `.github/`, `package.json` and the
lockfile have the same tree hashes at `567051e` and `eb1e730`. Two edges of the new JSX read can
be mutated with the suite green, and both escape on a real input. As in round 2, this traces to
my hand-out: its only slice-id case, `<p>h2b2-x</p>`, is one line long and uses the shape a
title reads too. The fix is two fail cases and two mutation rows, with no code change.

## Real fixes

**1. Two edges of the JSX read have no test.** My mutations, each one line in my clone, with the
491 `docs-check` tests run:

- **`literalHit(jsx.text, false)` turned to `true`**: 0 tests fail. `true` is the title mode,
  which skips the third slice-id shape (`NAMED`, `/^[A-I]\d[a-z]?\d?\s/`). `<p>H3 shipped</p>`
  fails as built and passes under the mutation (probed).
- **`trimStart()` dropped from `jsxTextsOf`'s text** (the line still counted from the first
  non-blank character): 0 tests fail. `LEADING` and `NAMED` are anchored at `^`, and JSX text
  usually opens with a line break and indent, because Prettier wraps a long paragraph onto its own
  lines. As built, this input fails at line 3, and under the mutation it passes (probed):

  ```tsx
  export const a = (
    <div>
      h2b2-x is live
    </div>
  )
  ```

  This is the edge that matters: the layout it covers is the common one.

Both cases go in the `name guard, JSX text` fail list.

## Scope and labeling

No action needed on any of these:

- **The snippet keeps a wrapped paragraph's line breaks.** `jsxTextsOf` trims only the start, so
  the printed problem runs over several lines: `src/x.tsx:3: … "The gate opens\n    before Phase 8
  only\n  "`. A multi-line template literal already prints this way on `main`, so this isn't new.
  It shows only when the check fails, and the first line still carries `file:line`. Not worth a
  change.
- **The line is the node's first non-blank line, not the hit's.** A hit on the fourth line of
  that paragraph names line 3. My hand-out asked for this, and a template literal reports its
  opening line too.
- **`Phase&nbsp;8` passes**, because the entity is not whitespace to the regex. **A phase number
  split by an expression** (`<p>before Phase {n}</p>`) passes as well. This is the same case as a
  split template, which round 2 accepted. Nobody writes provenance either way.
- **`'ASSUMPTION: see PR #3'` reports pattern 6, not the marker.** `valueHit` runs patterns 1-9
  first, and the colon form doesn't match pattern 1. Only the message changes, as with round 2's
  slice-id precedence.
- **One equivalent mutant:** dropping the `containsOnlyTriviaWhiteSpaces` guard changes nothing,
  because whitespace can't hit any pattern. It needs no test.
- **`report-r3.md` says "Nothing is committed".** That was true when it was written; you
  committed it as `eb1e730` afterwards.
- **Mailbox:** only step files and `evidence/`, so there is nothing to delete.

## Spec questions (from the report)

- `CONVENTIONS.md#comment-why-not-what` now names the text between JSX tags beside the value
  literals (edited, as D2 (a) set out). `ASSUMPTION:` was already there from round 2.

## Decide-points

**D3. Is a round 4 worth two test cases?** By the mutation rule
(`workflow/pr-review.md#5-mutation-check-do-the-tests-pin-what-they-claim`), a mechanism the
suite can lose while staying green is a fix. That is why round 2 went to round 3.

- **(a) Recommended: round 4, with `handout-r3.md` as written.** It adds two test cases and
  changes no code. `trimStart` is what lets the guard see a slice id in the usual Prettier layout.
  Phase 7 is where JSX text grows, and a refactor there could drop the trim silently.
- (b) Approve now, and carry the two cases as a "Decided, not built" item in `ROADMAP.md`'s
  Phase 7 entry. This is fair only because `src/` has 6 JSX text nodes today, none of them a hit.

## Decisions

Duncan, 2026-10-12: **D3 (a)**, as recommended. Round 4 runs on `handout-r3.md` as written: two
fail cases in `name guard, JSX text` and mutation rows M74-M75, with no code change. No ROADMAP
item.

## What I verified, and how

All of this ran in my own clone (worktrees of `eb1e730`, `567051e` and `590d82a`, `npm ci` on
each, Node 22.22.0, Vitest 5.0.3 from the lockfile), never in your working tree.

**The fix diff.** `git diff 567051e eb1e730` outside `.claude/` touches only `scripts/docs-check/`
(`comments.ts`, `names.ts`, `names.test.ts`, `tokens.ts`). I read all of it.

- `comments.ts` exports `ASSUMPTION_COLON` and passes it in as a parameter, so there is no second
  copy and no import cycle.
- `jsxTextsOf` is a walk of its own; `literalsOf` is untouched.
- The literal and JSX arms share one `literalProblem`.

**Gates on the branch:**
- `npm run test`: 212 files, 1,849 tests (1,848 passed, 1 skipped)
- `lint`, `format:check`, `build` and `npx tsc -b`: clean
- `citations`: PASS, 642 citations in 436 files, before my doc edit
- `comments`: PASS, 7,008 comments and 1,629 titles in 403 files; `--counts` rows 18-20 read 0
- `budgets`: 12 files, 0 over

I couldn't read the CI result, so it's worth a glance on the PR. One aside: a second, JSON-reporter
run of the suite, made while two others ran beside it, timed out once in
`state/balance-sim.test.ts` at 5,000 ms. That file is unchanged since `main`, and it passed in the
run above, so this is machine load, not a finding.

**Test counts, file by file** (`vitest run --reporter=json` on round 2 and round 3): only
`names.test.ts` differs, 75 → 84. That is the three value fail cases, the `ASSUMPTION:` title
test, `tier2Phase3` and four JSX tests. `src/` stays at 1,358 and `scripts/` goes 482 → 491,
matching `evidence/test-counts.txt`.

**The proof.** `comment-proof origin/main --mask evidence/mask.json --renames
evidence/renames.json` in my clone: 151 OK and the one FAIL, `engine/corpus-digest.test.ts`,
exit 1, byte-equal to `evidence/comment-proof.txt`. With `src/` byte-identical to rounds 1 and 2,
round 1's fixture comparison, collision scan and leftover scan still hold, and I didn't repeat
them.

**`main` measurement.** I ran the branch's `scripts/` and round 2's over the same
`git archive 590d82a` extraction. Both read rows 18 / 19 / 20 as 127 / 25 / 118 (118 in 52 files),
and the full problem lists are identical: no `ASSUMPTION:` value and no JSX text hits on `main`.
`jsxTextsOf` finds 6 non-blank nodes on both trees: `App.tsx` 1, `CombatDemo.tsx` 5,
`main.tsx` 0. They read "Depths of Souls", "Skip to end", "Seed:" (twice), "Run this seed" and
"Result:".

**Mutations.** I made 11 on the fix diff, each one line in my clone, with the 491 `docs-check`
tests run, then restored with `git checkout`.

Caught:
- the `ASSUMPTION:` branch removed (2, the two value cases; M70 reproduced)
- `comments.ts` passing a never-matching regex in place of `ASSUMPTION_COLON` (2)
- `ASSUMPTION_MARKER` set to 2 (2)
- `LAST_VALUE_PATTERN = 8` (1, `'items B2+ only'`; M71 reproduced)
- the lookbehind narrowed to `[a-z]` (1, `tier2Phase3`; M72 reproduced)
- the JSX read removed (3; M73 reproduced)
- the JSX value read skipped, leaving the slice-id shapes only (2)
- the leading-blank offset dropped from the JSX line (1, the multi-line test)

Survived:
- `literalHit(jsx.text, true)` (fix 1)
- `trimStart` dropped from the JSX text (fix 1)
- the whitespace-only guard dropped (an equivalent mutant; see scope)

**Probes** (a throwaway test through `runComments`, deleted after):
- fail as expected:
  - `ASSUMPTION:` in JSX text, a JSX fragment `<>Slice B</>` and JSX in a `.test.tsx` body;
  - `'ASSUMPTION : x'`;
  - three `ASSUMPTION:` literals in a row, each reported, so the exported `/g` regex keeps no
    state between them.
- pass as built:
  - `Phase&nbsp;8` and a split `{n}`;
  - lower-case `assumption:`;
  - "see the plan and the brief" in JSX (patterns 10-17 are not run on a value).

**Not run:** the corpus event-log scan
(`workflow/pr-review.md#6-look-for-live-behaviour-the-spec-doesnt-cover`), because no `src/` file
changed.

## Docs edited

- `CONVENTIONS.md#comment-why-not-what`, the "So do names" bullet: the CI sentence now says the
  text between JSX tags is read like a value literal, per D2 (a).
