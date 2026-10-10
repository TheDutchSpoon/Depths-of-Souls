# Hand-out r1 — Phase 4.1 — Slice H2c: comment fixes (no re-review)

Slice 4.1-H2c (branch `phase-4.1-slice-h2c`) is approved. This round fixes three stale texts:
two code comments and one line of the phase record. **Nothing that runs changes**: no code, no
test assertion, no fixture, no data. Duncan merges after this round without another review, so
`report-r2.md` carries the proof (below).

## Fixes

1. **`src/data/statuses.ts`, the file header.** The comment ends "The percentages are PLACEHOLDERS
   (4.1-H2b2); H2c tunes them." H2c chose no balance number; the percentages are tuned in 4.1-H2d,
   after its design grill (brief ASSUMPTION 149). Change the last clause to say that. The
   "(placeholder)" notes on the four `potency` declarations (Poison, Burn, Regen, Spore) are still
   true: leave them.

2. **`src/state/integration.test.ts`, the comment under `expect(intro.result).toBe('win')`** in
   "Slice I … descends floor 1" (about lines 106–112). Its numbers have been stale since 4.1-H2a
   and the H2c Health remap. Rewrite the numbers from the run itself; this is what it logs now
   (check it, don't copy it blind):
   - the scripted Unicorn stand-in (speed 20, 39 HP) still acts first each round, but hits for
     **7**, not 1: its raw damage is 0.1875 (chip only, ×1.25 affinity), floored to the minimum of
     1, plus the Additional `min(floor(0.2 × 33), 10) = 6` (the Brute starter has 33 HP). The Brute
     goes 33 → 26 → 19;
   - the Brute's double strike hits for **18 + 18**, not 11 + 11: raw 11.475 (×0.75 affinity),
     floored to 11, plus the Additional `min(floor(0.2 × 39), 10) = 7`. The stand-in goes 39 → 21 → 3
     in round 1;
   - round 2's first instance kills it (3 − 18 < 0), and instance 2 has no living target left, so it
     never fires. That part of the comment stays true.
   Keep the comment's point (the run still exercises the instance list's "no target left" case
   here); only the numbers and their causes change.

3. **`.claude/phases/phase-4.1-fix-and-consolidation.md`, the 4.1-H2c section, "Deviations and spec
   notes".** The first bullet says `state/integration.test.ts` "moves in three tests, not two". It is
   **three assertions in two tests**: "Slice I … descends floor 1" (the revive count, first changed
   at stage 4 by Snapback, and the Brute's attacks per turn, first changed at stage 2 by the Health
   remap) and the G2 Pacified Unicorn test (the gem draw, stage 2). Correct that bullet. Then add one
   line at the end of the section: "Fix round r1 (comment-only, from the PR review): the
   `data/statuses.ts` header points at 4.1-H2d, the scripted-intro comment in
   `state/integration.test.ts` has the current numbers, and this section's integration bullet is
   corrected."

## Don't

- Don't change anything else: no other file under `src/`, no other mailbox file, no living doc.
- Don't move or delete any file. Duncan handles the mailbox's evidence files himself.

## Proof, in `report-r2.md`

- All five gates green: `npm run test`, `npm run lint`, `npm run format:check`, `npm run build`,
  `npx tsc -b`, with the test count unchanged from r1 (195 files, 1333 tests: 1332 passed,
  1 skipped).
- Both `src/` files identical to the r1 build with comments stripped (show how you checked), and
  `git diff --stat` listing only the three files above plus `report-r2.md`.
- The new intro comment's numbers, each matched to the event that logs it.
