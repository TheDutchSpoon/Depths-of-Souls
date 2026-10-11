# PR review — Phase 4.2 — Slice H2: Code comments, the sweep — Round 3

Reviewed branch `4.2-h2` at `e9c7634` ("fix 2") against `origin/main` at `0126c4a`, which hasn't
moved since the kickoff. The fix diff starts at `c8b2084` (round 2's review commit; round 2 reviewed
`4695336`). Your working tree is on `4.2-h2` at `e9c7634`, the same commit as `origin/4.2-h2`, with
only the untracked `.claude/settings.local.json`. Inputs: `kickoff.md`, `plan.md`,
`plan-review.md`, `review-r2.md`, `handout-r2.md`, `report-r3.md`, `record.md`, the evidence
folder and `phases/4.2/H/brief.md`.

**Verdict: approved** (D1: (a), below). All five hand-out items are fixed. I checked each in the code
and against the doc or data it names, not on the report's word. Every proof reproduces:

- the diff is comment-only;
- every fixture export equals `main`'s;
- the corpus fixture is byte-equal;
- the test count is unchanged file by file.

One leftover is new this round. The rewrap in `data/traits/starters.ts` left a 135-column comment
line. That is cosmetic, and whether it needs a fourth round is D1. I recommend it doesn't.

## Real fixes

**1. `src/data/traits/starters.ts:18` is 135 columns.** Item 4's rewrite re-flowed the trait's doc
comment and left one line unwrapped: the one that runs from "through fusion, whichever parent the
Seer is" to "`createCombat`'s fight-setup prepends".
Under round 1's D2, the branch doesn't leave a comment line over 120 columns that it made longer
than `main`'s. It is the only such line in the 11 files the fix touched. Nothing it says is wrong.

## Scope and labeling

- **The backtick count is right, but one claim beside it isn't.** The report and `record.md` say
  each of the 11 odd-backtick lines "continues a span `main` already wrapped". Nine do. Two don't:
  `__fixtures__/balance.ts:23-24`, where round 1's build split
  `` `xpCurveCoefficient: 100, xpCurveExponent: 1` `` across two lines. On `main` that span sits
  whole on one line (`:28`).
  - Round 2 saw the 12 round-1 splits and didn't ask for them ("a span wrapped over two lines is
    common on `main` too"). So the split itself stays.
  - The false sentence doesn't stay: the record becomes immutable at merge. I corrected it (Docs
    edited).
- **The report says `rng.ts` and `rng.test.ts` "now differ from `main`"** to explain 346 → 347
  files. Only `rng.test.ts` is new: round 1 had already changed `rng.ts`. The count is right.
- **The report didn't re-run the fixture import comparison.** I did (below), so nothing is missing.
- **"The new X" is another history shape the bounded pass didn't cover.** About ten comments say
  "the new `all-allies` ResponseTarget" or "a genuinely new ResponseTarget", meaning new when they
  were written. Examples: `traits/starters.ts:54`, `effect-types.ts:124`, `statuses.ts:184`,
  `traits/overgrowth.ts:116`, `golden-shieldbarer-starter.fixture.ts:3`.
  - All were on `main`. The kickoff's history markers ("before this", "was X", "no longer",
    "previously") don't include them.
  - A regex can't separate them from the plain "the new host" or "the new potency" (24 hits in
    all).
  - I'm not asking for them, and I don't recommend a tool item either. If you want them gone, they
    are a hand edit to add to D1's residue line.
- **Mailbox:** only the step files, `record.md` and `evidence/`. `.wtest` is gone. **To delete:**
  none.
- The report's gates ran on Node 24.19.0, and mine on 24.21.0 (CI pins `24`). The results match.
  I can't reach the GitHub API from my sandbox, so please check that the PR's CI is green before
  you merge.

## Decide-points

**D1. A fourth round for one line, or approve now?**

- **(a) Approve now.** I add the line to `phases/4.2/H/brief.md` as residue for 4.2-H3, under a
  "Known from 4.2-H2's review" heading beside the existing 4.2-G one. 4.2-H3 proves itself with a
  comment-stripping `comment-proof` option, so a rewrap costs nothing there.
- **(b) Round 4:** a one-item hand-out to rewrap `starters.ts:16-19` at about 100 columns. That
  costs one `/slice-fix` and one short review.

**Recommend (a).** Round 2 asked for a third round because two comments stated false things: a
creature that doesn't exist, and a gem where the code has an innate spell. Those are fixed. This
line is a width problem only. Its text is true, and the files this slice changed still hold 36
comment lines over 120 columns that are `main`'s, verbatim. A fourth review cycle for one
line of whitespace isn't worth it. 4.2-H3 is next and already carries 4.2-G's residue the same
way. If you choose (b), I'll write `handout-r3.md`.

## Decisions

Duncan, 2026-10-11:

- **D1: (a), approve now.** The 135-column line goes to `phases/4.2/H/brief.md` as residue for
  4.2-H3. No hand-out.

## What I verified, and how

Everything ran in my own clone, with worktrees at `0126c4a`, `4695336` and `e9c7634`, and never
in your working tree.

**Toolchain and gates:**
- `npm ci` on all three worktrees, under Node 24.21.0. Vitest is 5.0.3, matching the lockfile.
- On `e9c7634`, every gate passes:
  - `npm run test`: 210 files, 1,682 tests (1,681 passed, 1 skipped)
  - `lint`, `format:check`, `build` and `npx tsc -b`: clean
  - `citations`: PASS, 640 citations in 436 files
  - `comments`: PASS, 7,003 comments and 1,627 titles in 403 files; `--quotations`: 0 and 0
  - `budgets`: 12 files, 0 over
- **Test counts:** I ran `vitest run --reporter=json` on `main` and on the branch and reconciled
  them file by file.
  - Both sides: 697 suites, 1,682 tests and 210 files. No file differs, and neither side has a
    duplicate full name.
  - `evidence/mask.json` is unchanged since `4695336`, and the proof passes with it. So no title
    changed this round.

**Proofs:**
- **What the fix touched:** 11 files under `src/`, all named in the hand-out, plus the mailbox.
  Since `4695336`, nothing changed under `scripts/` or `.github/`, and neither the configs nor
  `package*.json` changed.
- **Comment-only:** `comment-proof origin/main --mask evidence/mask.json` passes on 347 changed
  files. Its output matches `evidence/comment-proof.txt` line for line, apart from npm's banner.
- **Planted fault:** a code change in `data/balance.ts` (`perTenFloors: 1` → `2`) makes the proof
  fail with exit 1, naming the file and the line.
- **Goldens:** a throwaway test imported all 135 fixture modules on both trees and deep-compared
  every export, 1,235 in all. Functions were compared by their comment-stripped print. All are
  equal. A planted `finalDamage` change in `golden-stun` shows up as a difference in
  `expectedEvents`, so the comparator can catch one.
- **Corpus:** the fixture's diff against `main` is still the one header line. A scratch
  `corpus:update` left the tree clean (`git diff --exit-code` 0).
- **Citations in the fix diff:** one removed and one added, both
  `spec/store.md#how-store-actions-fail` on the rewrapped `store.ts` line. No anchor is lost.

**Each hand-out item, in the code:**
1. **Plan-item ids.** `rng.ts:48`, `rng.test.ts:64` and `effect-types.ts:337` have each dropped
   the id and kept the reason. My block-joined scan for a hyphenated id (`[A-Z]{1,2}-<n>`) in every
   comment in `src/` and the two configs finds none.
2. **Review and history words.**
   - `generation.test.ts:180`: the label is gone.
   - `combat.ts:269`: says the executors "live in actions.ts". Its wrapped tail is rejoined.
3. **The creature.** Both comments now name the Sporch Ashborn. `SPORCH_ASHBORN_TRAIT`
   (`traits/rotcap-hollow.ts:362`) is a `conditional-damage-bonus` gated on `has-status burn` on
   the target, and the Ambusher (`traits/overgrowth.ts:33`) is the same category. The quote marks
   are gone.
4. **The Sorcerer starter.**
   - `starters.ts:11` and the golden's `:4` state the cast plainly.
   - `starters.ts:16-18` describes the `innate-spell { spell: ARCANE_BOLT }` effect on the trait.
   - Checked against the trait's code (`on-turn-end`, `chancePercent: 50`, `perform-action` with a
     random gem slot, plus the `innate-spell` effect) and against
     `specializations/sorcerer.md#starter-glyphmoth-seer` ("an extra slot before the gem slots,
     kept through fusion").
5. **Rewrap leftovers.**
   - `resolution.ts`: the tick formula span is whole on one line (107 columns, a single code span).
   - `store.ts`: the span sits whole on one line.
   - The b6 fixture: the span sits whole on one line.
   - My own scan of comment lines that differ from `main`'s and hold an odd number of backticks
     finds the same 11 lines the report lists. I compared each with `main` (see Scope).

**Reading:**
- **Fix diff:** the `src/` part, 11 files and about 40 lines, read in full.
- **Width scan:** every line over 100 columns in the 11 fix-diff files that isn't verbatim on
  `main`. That found 16. Of those, 13 were already there in round 2, and two are within 120
  (`resolution.ts:1235` at 107, `golden-sorcerer-starter.fixture.ts:4` at 101). The one over 120
  is fix 1.
- **Block-joined word scan:** history and review words ("review", "nit", "moved to", "used to",
  "no longer", "previously", "now", "new" and others), over each comment block joined into one
  line, in the 11 fix-diff files. All hits are plain uses, apart from the "the new X" shape in
  Scope, which was already on `main`.
- **Not run:**
  - Step 5's mutations: the fix adds no mechanism, and `deploy.yml`, `ci.test.ts` and the tool
    are unchanged since round 1, whose CI mutations stand.
  - Step 6's corpus scan: there is no behaviour change.

## Docs edited

- `phases/4.2/H2/record.md`:
  - The round-2 bullet now says that 9 of the 11 odd-backtick lines continue a span `main`
    wrapped, and that 2 (`__fixtures__/balance.ts:23-24`) are a split from the first rewrap, which
    round 2 accepted.
  - The Evidence line names `report-r3.md` too.

  The record becomes immutable at merge, so it has to be right now.
- `phases/4.2/H/brief.md`: a "Known from 4.2-H2's review" section with the one residue line for
  4.2-H3 (D1).
