# PR review — Phase 4.2 — Slice H2: Code comments, the sweep — Round 2

Reviewed branch `4.2-h2` at `4695336` ("fix") against `origin/main` at `0126c4a`, which hasn't moved
since the kickoff. The fix diff starts at `81fcc3c` (round 1's review commit; the build was
`552e5bc`). Inputs: `kickoff.md`, `plan.md`, `plan-review.md`, `review-r1.md`, `handout-r1.md`,
`report-r2.md`, `record.md`, the evidence folder, `phases/4.2/H/brief.md`, and the living docs on
the branch.

**Verdict: fixes.** The round-1 hand-out is done, and done carefully: I checked every item in the
code, not on the report's word, and each holds. The report also caught a mistake in the hand-out
(there is no Sporch Reaper) and went past it. The proofs all reproduce: comment-only, every fixture
export equal to `main`'s, the corpus byte-equal, and the test count unchanged file by file.

What's left is small, under twenty comment lines in twelve files:

- three plan-item ids and two lines of review and history words that survived;
- two false facts, in blocks this branch rewrote;
- one quotation of the Sorcerer starter's old description;
- four leftovers from this round's rewrap.

`handout-r2.md` lists them. Whether they're worth a third round is D1.

## Real fixes

**1. Plan-item ids in a hyphenated shape.** The report found these and left them for me to call.
My call: fix them. They are the same kind as round 1's "design-review B-5", and in scope.

- `engine/rng.ts:48` "(B-2)"
- `engine/rng.test.ts:64` "// B-2:"
- `engine/effect-types.ts:337` "B-9 --"

**2. Review and history words the scans missed.**

- `engine/generation.test.ts:180` "// Nit (review):". This is the test-side twin of
  `generation.ts:221`'s "(nit, review)", which round 1 fixed. It was there at round 1 and I missed
  it.
- `engine/combat.ts:269` "The action executors … all moved to actions.ts". This round rewrapped
  the block without changing the history. The executors *live* in `actions.ts`.

**3. "Sporch's Reaper" is still in two blocks this branch rewrote.** The report established that no
such creature exists and fixed `effect-types.ts`, but left these two:

- `golden-conditional-damage-bonus.fixture.ts:1-2` "Cull the Weak / Ambusher / Gloomjaws / Sporch's
  Reaper-shaped"
- `engine/conditions.test.ts:323` "Ambusher/Sporch's Reaper shape ("+% dmg to Webbed/Burning
  targets")"

The Burning one is the Sporch Ashborn (`traits/rotcap-hollow.ts:362`, `has-status burn` on the
target). Round 1's list named `conditions.test.ts` nowhere, which is my miss.

**4. The Sorcerer starter's trait comment still quotes the old description.** Round 1 removed the
quotation ("grants one spell as a permanent extra gem + 50% chance …") from the header of
`data/traits/starters.ts`, but the doc comment below it still quotes both halves:

- `:11`: "50% chance on-turn-end to cast a random equipped spell."
- `:16`: "The "grants one spell as a permanent extra gem" half is …"

So `:16` now refers to a "half" of a quotation that no longer exists, and calls the innate spell a
gem, which is the fact round 1 corrected. `specializations/sorcerer.md#starter-glyphmoth-seer` says
"a 50% chance at the end of its turn to cast a random equipped spell". The same quotation opens
`golden-sorcerer-starter.fixture.ts:4`. The report's quotation re-scan covered only blocks that hold
an anchor, and these don't. Round 1 named only the header lines, so these are my miss too.

**5. Leftovers from this round's rewrap.**

- `engine/resolution.ts:1235` is 150 columns. Restoring the tick's anchor (item 1 of round 1)
  re-flowed the block and left its last long line unwrapped. It is the only comment line in the
  changed files over 120 columns that this branch made longer than `main`'s.
- The rewrap split three inline code spans across two lines, which leaves an unpaired backtick on
  each line:
  - `state/store.ts:266-267`: `` `{ ok: false, reason `` / `` }` ``
  - `golden-b6-provoke-stun-cleanup.fixture.ts:7-8`: `` `action-lock `` / `` { scope: 'all' }` ``
  - `engine/resolution.ts:1234-1235`: the tick formula

## Scope and labeling

- **The report's spec question** ("`CONVENTIONS.md#comment-why-not-what` could say that a quotation
  beside an anchor must be the anchor's words") is already the rule: "A quotation beside an anchor
  is the target's own words, or it goes." The tool's half is a 4.2-H3 item in
  `phases/4.2/H/brief.md#decided-not-built`.
- **Ragged short lines from the rewrap** (`// refuses the`, `// eligible one.`,
  `// -- fixture-shaped,`): the rewrap split long lines but often left the tail on a short line of
  its own. They read fine, and re-flowing them would churn many blocks for no gain, so I'm not
  asking for it.
- **Mailbox:** the step files, `record.md` and `evidence/`, plus one file of mine.
  - **To delete:** `phases/4.2/H2/.wtest`, an empty file I created while testing write access to
    your tree. The shell there can't delete it.
- The report's gates ran on Node 24.19.0; I ran on 24.21.0 (CI pins `24`). The results match.

## Decide-points

**D1. A third round, or approve now and carry this to 4.2-H3?** Under twenty comment lines, all
under the same proof.

- **(a) Round 3:** `handout-r2.md` as written. Cost: one `/slice-fix` and one short review.
- **(b) Approve now:** add the list to `phases/4.2/H/brief.md` as residue for 4.2-H3, as the brief
  already does for 4.2-G's review.

**Recommend (a).** Items 3 and 4 are false statements: a creature that doesn't exist, and a gem
where the code has an innate spell. They sit in blocks this branch rewrote. That is the failure
round 1 was about, and merging it knowingly would leave the slice's "every comment meets the
convention" claim untrue. Item 1 would block 4.2-H3 anyway, once its `comments` extension catches
the `B-2` shape. If you choose (b), I'll move the hand-out's items into the brief instead.

## Decisions

Duncan, 2026-10-11:

- **D1: (a), a third round.** `handout-r2.md` goes to the coding agent as written.

## What I verified, and how

All of it ran in my own clone, never in your working tree.

**Toolchain and gates:**
- `npm ci` on three worktrees (`origin/main`, `552e5bc`, `4695336`) under Node 24.21.0.
- On the branch, every gate passes:
  - `npm run test`: 210 files, 1,682 tests (1,681 passed, 1 skipped)
  - `lint`, `format:check`, `build` and `npx tsc -b`: clean
  - `citations`: PASS, 640 citations in 436 files
  - `comments`: PASS, 7,003 comments and 1,627 titles in 403 files; `--quotations`: 0 and 0
  - `budgets`: 12 files, 0 over
- **Test counts:** `vitest run --reporter=json` on `main` and on the branch, reconciled file by
  file: 210 files and 1,682 tests each, 0 files differ, no duplicate full names on either side.
  `vitest list` on all three trees: 624 full names changed against `main`, as in round 1, and
  exactly three against `552e5bc`, the three retitles the report names.

**Proofs:**
- **What the fix touched:** 100 files under `src/`, plus the mailbox. Nothing under `scripts/` or
  `.github/`, and neither config nor `package*.json` changed since `552e5bc`.
- **Comment-only:** `comment-proof origin/main --mask evidence/mask.json` passes on 346 changed
  files. Its output matches `evidence/comment-proof.txt` line for line, apart from npm's banner.
- **Mask:** 346 entries. Against round 1's, one entry is replaced (the `spell-effects.test.ts`
  title's new text) and two are added (`combat.test.ts:939` and
  `golden-resonant-overtone.test.ts:7`), each `old` → `new` exact. None is widened.
- **Planted fault:** a code change in `data/balance.ts` makes the proof fail, exit 1, naming the
  file and line.
- **Goldens:** a throwaway test imported all 135 fixture modules on both trees and deep-compared
  every export, 1,235 in all, with functions compared by their comment-stripped print. All are
  equal. A planted `finalDamage` change in `golden-stun` makes it fail, so the comparator can
  catch one.
- **Corpus:** the fixture's diff against `main` is the one header line, untouched since round 1. A
  scratch `corpus:update` rewrote it byte-equal to the committed file.
- **Citations per hunk** (`git diff -U0 origin/main`): 1,615 hunks, 148 citations removed and 240
  added. 10 hunks lose one, the same 10 the report lists. I checked each: it moved to a
  neighbouring hunk of the same block, or was re-pointed to the rule that states the fact.

**Mutations and reading:**
- **Step 5:** the fix adds no mechanism. `deploy.yml`, `ci.test.ts` and the tool are unchanged since
  `552e5bc`, so round 1's CI mutations stand.
- **Hand-out items:** each checked in the code or the doc it names.
  - The `actionKind` list: all nine `conditional-damage-bonus` entries in `src/data`.
  - Burn's producers: `sporch-igniter-brand` on-attack and `sporch-cinderlord-immolate` on-kill.
  - Poison's default: `VENOM_BOLT` sets `duration: 3`; `MYCONET_ROTCORE_TRAIT` sets none.
  - The Overgrowth spell count: 16, at least three per affinity.
  - The levelRangeWidth default: `{ base: 0, perTenFloors: 1 }`.
  - The `effects.ts` header against its exports.
  - Every new anchor read at its target: the four perk entries, `#cross-stat-contribution`,
    `#conditional-damage-bonus`, `#stat-modifier-counts-freeze-at-application`, `#spore`,
    `#broodmother`, `#rotfeeder-gorgemaw`, `#fusion` (its Phase 8 line states the wait) and
    `#targeting-override`.
  - The quotations the report made exact, at their targets: `#resolution--timing` and
    `#action-reactions-actor-self-hooks-or-observation`.
- **Fix diff:** read in full, 2,358 lines.
- **Line widths:** comment lines over 120 columns in the changed files, 87 on `main` and 50 on the
  branch, counting trailing comments. Of the branch's 50, 10 aren't verbatim on `main`. Nine of
  those are `main`'s lines, shortened or equal; the tenth is fix 5's `resolution.ts:1235`.
- **Split code spans:** each comment line that is new against `main` and has an odd number of
  backticks. That found 18; 6 are this round's, which makes the three spans in fix 5. The other 12
  came from round 1. A span wrapped over two lines is common on `main` too (43 such lines), so I'm
  not asking for those.
- **Block-joined word scan:** history and review words, over each comment block joined into one
  line, across `src/`. That found fix 2's two lines. I read the other 42 hits: live
  counterfactuals, the legacy oracle in `spell-effects.test.ts`, and plain uses ("no longer
  alive").
- **Not run:** step 6's corpus scan. There is no behaviour change, and the fixtures and digest are
  equal.

## Docs edited

- `phases/4.2/H/brief.md#decided-not-built`: the 4.2-H3 item for the shapes `comments` misses adds
  hyphenated plan-item ids (`B-2`) and `Nit (review)`, which this round found (under round 1's D1).
