# PR review r3 — 4.5-E: Spell clean-up and Thorn Volley

Branch `4.5-e`, commit `4fd1e25` ("fix 2"), against `main` at `2bb9851` and round 2's `4287626`.
Reviews `report-r3.md`, the fixes from `handout-r2.md`.

**Verdict: approved.** Both hand-out items are fixed, exactly as dictated, and the fix touches
nothing but those two comments. Every gate, the golden identity and the leftover sweep on the final
commit come out as in rounds 1 and 2. No hand-out.

## Hand-out r2, item by item

1. **`SPELL_FIGHTS`' doc comment** (`engine/__corpus__/corpus.ts`): fixed. The first sentence is
   the hand-out's end state; word for word, the comment differs from `4287626` only by the dropped
   "draw-free". Re-wrapped: no line over 100 characters, none short mid-paragraph. Every sentence
   left is true: round 2's draw scan showed the casts and their effects land at every seed, which
   is what "Coverage therefore rides on no random draw at all" claims.
2. **Disorient's doc comment** (`data/spells/glimmerdark.ts`): fixed. Re-wrap only: the comment's
   word sequence is identical to `4287626`'s, and its longest line is now 100 characters. (Three
   other lines over 100 in these two files are on `main` and outside the diff.)

## Real fixes

None.

## Scope and labeling

None. (`review-r2.md` names the branch `4.5-E`; it is `4.5-e`. A merged step file, left as written.)

## Decide-points

None.

## Verified, and how

All in my own clone (`git clone` + worktrees for the branch and `main`), `npm ci` on both, Node
22.22.0, lockfile Vitest 5.0.3 (`npx vitest --version` agrees).

- **Fix diff** (`git diff 4287626 4fd1e25`, outside `.claude`): the two comments, nothing else.
  The corpus-digest fixture is unchanged since `d932616`.
- **Gates on the branch:** `npm run test` (JSON reporter) 229 files, 1983 passed, 1 skipped,
  0 failed; `lint`, `format:check`, `build`, `npx tsc -b` clean; `docs:check -- citations` PASS
  (678 in 463 files), `-- comments` PASS (7448 comments, 1737 titles in 430 files), `-- budgets`
  12 files, none over (`CONVENTIONS.md` 29.0 of 29 KB, as round 1 left it).
- **`comment-proof`:** PASS against `4287626` (2 changed files, the two above) and against
  `d932616` (4 changed files: the round-2 and round-3 comments).
- **Test count, file by file:** `main` 228 files; the only per-file difference is
  `golden-thorn-volley.test.ts` (+1). `main`'s full run timed out the `balance-sim` "built twice"
  test at 5 s again while lint and build ran beside it; that file alone passes, 78 + 1 skipped.
  It is `main`'s test, not this slice's.
- **Golden identity:** every `__golden__/*.fixture.ts` export serialised on both trees: `main` 144
  files and 1336 exports, the branch 145 and 1341. The differences are the new
  `golden-thorn-volley` (6 exports), the removed `CINDER_NOVA`, and four party exports
  (`golden-6v6-scripted` both parties, `golden-aoe-cast` and `golden-dot` `playerParty`), each
  equal once spell `id` and `name` are blanked. All 217 `expected*` exports deep-equal.
- **Mutations:** none to run. The fix changes no code token (`comment-proof`), and the hand-out
  asked for no new test.
- **Leftover sweep** on the final commit, over `src/` and the living docs (`.claude/` but `phases/`
  and `archive/`), for the three ids, names and const names, `spells/core`, `core.ts`, "core
  spells", "affinity-generic", and the corrected claims ("draw-free", "never cast", "no other
  status"): clean. The only hits are four unrelated uses of "never cast(s)" (three test names, the
  coverage test's message) and Splashing's "never Cast" in
  `spec/effects.md#splashing-and-annihilate`.
- **Content docs:** `content/overgrowth.md`'s Thorn Volley entry (round 1's doc sync) still
  matches the code; nothing in this round touches content.
- **Mailbox:** step files, `brief.md`, `record.md` and `evidence/` only; nothing to delete.
  `record.md` stays true as built.
- `docs:check -- citations` on this file: PASS.

## Docs edited

None this round. `docs:check -- budgets` run on the working tree after the doc sync: 12 files,
none over; `CONVENTIONS.md` 28,998 of 29,000 bytes, so its next addition needs a condense or a
budget decision (`workflow/budgets.md#over-budget`).
