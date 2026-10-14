# Hand-out r2 — 4.5-E: Spell clean-up and Thorn Volley

**Verdict: fixes.** Branch `4.5-E` at `4287626`. The build stands. Two comment edits in `src/`;
nothing else changes: no code token, no test, no golden, no digest row, no record line.

## Fixes

1. **`src/engine/__corpus__/corpus.ts`, `SPELL_FIGHTS`' doc comment: "draw-free" is false.** Every
   fight in `SPELL_FIGHTS` and `LOCK_SPELL_FIGHTS` advances the combat RNG, and in Disorient's
   fight the draws change the event log: Web's 10% break-free roll (`breakChancePercent` in
   `src/data/statuses.ts`) moves when Web expires. What the fights guarantee is that the cast and
   its effects landing ride on no draw, which the comment's last sentence already says. End state
   of the first sentence: "Each listed spell gets a coverage fight of its own, so it stays covered
   whatever Parts A and B roll." The rest of the comment stays word for word. Re-wrap the whole
   comment so no line runs past 100 characters and none is left short mid-paragraph (today
   "Parts A and B roll. The stock `always-cast` script casts gemSlot 0," breaks early).
2. **`src/data/spells/glimmerdark.ts`, Disorient's doc comment: re-wrap only.** The line ending
   "…spellPower 0.85 + duration 3 both mirror Vine Snare's own numbers exactly" is 145 characters.
   Re-wrap the comment so no line runs past 100 characters. No word changes.

## Rules for this round

- No provenance wording in any comment (`npm run docs:check -- comments`).
- Proof that the fix is comment-only: `npm run docs:check -- comment-proof 4287626` passes, run on
  the finished tree, listing exactly these two files. The corpus digest is not regenerated.
- Gates as in `workflow/coding-rules.md`; the test count stays 229 files, 1983 passed, 1 skipped,
  per file identical to `4287626`.
- `report-r3.md` gives each item's file and the new comment text in full, and the gate and
  `comment-proof` results.
