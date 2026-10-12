# PR review — Phase 4.2 — Slice H3: Names — Round 4

Reviewed branch `4.2-h3` at `0be59f5` ("fix 3") against `origin/main` at `590d82a`, which hasn't
moved. The fix diff starts at round 3's commit `eb1e730`; `bcf0679` between them holds only round
3's review, hand-out and `CONVENTIONS.md` edit. Inputs: `review-r3.md`, `handout-r3.md`,
`report-r4.md`, `record.md`, the evidence folder, and the living docs on the branch.

**Verdict: approved.** The hand-out's one item is built as written: two fail cases in
`name guard, JSX text`, and nothing else changes outside `.claude/`. Each new test is the one that
catches its mutation, every gate passes in my clone, and the proof is byte-equal to the evidence.
No hand-out this round.

## Real fixes

None.

## Scope and labeling

No action needed on either of these:

- **The wrapped-text case has one way to fail.** `h2b2-x is live` is a `LEADING` shape, so it
  pins `trimStart` and not title mode, while `<p>H3 shipped</p>` pins title mode and not the
  trim. Neither mutation is caught by the other test, so each edge has exactly one pin, which is
  what the hand-out asked for. A third case covering both edges (a wrapped `H3 shipped`) would
  add nothing the mutation check needs.
- **Mailbox:** only step files and `evidence/`, so there is nothing to delete.

## Spec questions (from the report)

None.

## Decide-points

None this round. Two things for you rather than for the coding agent:

- **CI.** I can't read the PR's checks from here, so please glance at them before merging. My
  run of the same gates is green (below).
- **Closing Phase 4.2.** H3 is the phase's last slice. Closing the phase is its own step, not
  part of this review: the phase `record.md` (`WORKFLOWS.md#where-things-live`) and `ROADMAP.md`'s
  Phase 4.2 line, which reads "Done: 4.2-A to 4.2-H2". I haven't touched either.

## What I verified, and how

All of this ran in my own clone (worktrees of `0be59f5`, `eb1e730` and `590d82a`, `npm ci` on
each, Node 22.22.0, Vitest 5.0.3 from the lockfile), never in your working tree.

**The fix diff.** `git diff eb1e730 0be59f5` outside `.claude/` is 14 added lines in
`scripts/docs-check/names.test.ts`: the two tests, word for word the hand-out's inputs and
expected lines (`src/x.tsx:2:` and `src/x.tsx:3:`, each with
`pattern 20, slice id in a string literal`). The tree hashes are equal at `eb1e730` and `0be59f5`
for each of these:
- `src/`
- `.github/`
- `package.json` and `package-lock.json`
- `names.ts` and `tokens.ts`

In `.claude/`, the commit touches only this mailbox: `report-r4.md`, `record.md` (the `scripts/`
count, 491 → 493), and three evidence files (`gates.txt`, `mutation-check.txt` rows M74-M75, and
`test-counts.txt`).

**Gates on the branch:**
- `npm run test`: 212 files, 1,851 tests (1,850 passed, 1 skipped)
- `lint`, `format:check`, `build` and `npx tsc -b`: clean
- `citations`: PASS, 642 citations in 436 files, before my doc edit
- `comments`: PASS, 7,008 comments and 1,629 titles in 403 files; `--counts` rows 18-20 read 0
- `budgets`: 12 files, 0 over

**Test counts, file by file** (`vitest run --reporter=json`):
- `scripts/` on round 3 and round 4: only `names.test.ts` differs, 84 → 86, and the total goes
  491 → 493.
- The full run on round 4: every row of `evidence/test-counts.txt` matches, file by file, with no
  file missing from the run. 1,851 = `src/`'s 1,358 + `scripts/`' 493.

**Mutations.** I made both of the hand-out's mutations, each one line in a scratch worktree, with
the 493 `docs-check` tests run. I restored the files with `git checkout` and confirmed 0 failures
after.
- **M74**, `literalHit(jsx.text, true)` in `names.ts`: 1 failure, `fails a capitalised slice id
  that opens the text`.
- **M75**, `text: raw` in place of `raw.trimStart()` in `jsxTextsOf`, with the line still from the
  first non-blank character: 1 failure, `fails a slice id in text that opens on its own wrapped
  line`.

Both reproduce `evidence/mutation-check.txt`. With these two, every mutation from round 3's list
that changes behaviour is caught. The whitespace-only guard is the one survivor, and it is an
equivalent mutant.

**The proof.** `comment-proof origin/main --mask evidence/mask.json --renames
evidence/renames.json`: 151 OK and the one FAIL, `engine/corpus-digest.test.ts`, exit 1. The output
is byte-equal to `evidence/comment-proof.txt`.

**Goldens and corpus.** `src/` has had the same tree hash (`cef3ff7`) at `603ef62`, `567051e`,
`eb1e730` and `0be59f5`, so round 1's fixture comparison under the id map, collision scan and
leftover scan still hold, and I didn't repeat them. The corpus digest fixture has the same blob
on `main` and on the branch.

**Brief residue.** I checked both "Known from" lists in `phases/4.2/H/brief.md` against the code:
- **4.2-G's residue** is gone from `src/` on `main` already, cleared by 4.2-H2.
- **4.2-H2's 135-column line** in `data/traits/starters.ts` is 135 on `main` and no wider than
  100 on the branch.

**Not run:** the corpus event-log scan
(`workflow/pr-review.md#6-look-for-live-behaviour-the-spec-doesnt-cover`), because no `src/` file
changed.

## Docs edited

- `phases/4.2/H/brief.md`: the two "Known from" sections now each say "Nothing left" and which
  slice cleared them. The headings stay because the H2 and H3 kickoffs cite them.
