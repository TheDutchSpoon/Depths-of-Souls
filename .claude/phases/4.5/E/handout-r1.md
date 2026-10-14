# Hand-out r1 — 4.5-E: Spell clean-up and Thorn Volley

**Verdict: fixes.** Branch `4.5-E` at `d932616`. The build stands: content, seeds, fixture spells,
`golden-thorn-volley` and the corpus attribution all verified. Every item below is a comment edit
in `src/`, plus one line of `record.md`. Nothing else changes: no code token, no test, no golden,
no digest row.

## Fixes

1. **`src/data/spells/glimmerdark.ts`, Disorient's doc comment: the gap claim is false.** It says
   "Instinct has no other status-applying spell". Puppet String (Instinct, `unlockedAtBiome: 3`,
   `data/spells/rotcap-hollow.ts`) applies Confusion. End state of that clause: Disorient is
   Instinct's only status-applying spell before the Rotcap Hollow's Puppet String, so it fills a
   real gap rather than re-skinning Vine Snare; distinct from Vine Snare under the dedup guard by
   affinity (instinct vs wit). The rest of the comment stays.
2. **`glimmerdark.ts`, Blinding Flare's doc comment: name both dedup neighbours.** The guard's key
   is affinity, target shape, payload, stat and spellPower (`dedupKey` in
   `data/spells/index.test.ts`), so Blinding Flare (Violence, single, damage, 0.7) sits beside Thorn
   Lash (1.0) and Withering Bolt (0.45). End state: "Unique under the dedup guard by spellPower (0.7
   vs Thorn Lash 1.0 and Withering Bolt 0.45)."
3. **`src/data/spells/rotcap-hollow.ts`, Withering Bolt's doc comment: drop the rider from the
   dedup sentence.** An `apply-status` rider never distinguishes two spells under the guard
   (`dedupKey`'s own comment). End state: "Distinct from Thorn Lash (1.0) and Blinding Flare (0.7)
   under the dedup guard."
4. **`src/engine/__corpus__/corpus.ts`, `SPELL_FIGHTS`' doc comment: the first sentence is
   false.** "One fight per spell Parts A and B never cast": Parts A and B cast every spell in this
   list (Thorn Volley 68 times in 53 fights; dropping its fight leaves the "every spell is cast"
   case green). End state of that sentence: each listed spell gets a draw-free coverage fight of its
   own, so it stays covered whatever Parts A and B roll. The rest of the comment stays.
5. **`src/data/spells/overgrowth.ts`, `THORN_VOLLEY`'s doc comment: give the real reason.** "0.45
   keeps it under the single-target Thorn Lash" is true of any value in the ~50% band, so it
   explains nothing about 0.45. End state: Thorn Volley is the biome's plain AOE damage spell, the
   area sibling of single-target Thorn Lash; damage-only AOE sits in the ~50% band
   (`content/overgrowth.md#spell-power-convention`).
6. **`.claude/phases/4.5/E/record.md`, the "Comments" bullet.** Not every edited comment now cites a
   surviving spell or the convention: Spore Cyst's and Withering Bolt's drop the reference point,
   Poison's default duration cites the Myconet Rotcore trait. End state: the comments that named
   the three spells now name surviving content or the convention, or drop the reference.

## Rules for this round

- No `docs:check -- comments` provenance in any new comment (no "now", "no longer", "was").
- Proof that the fix is comment-only: `npm run docs:check -- comment-proof d932616` passes, run on
  the finished tree. The corpus digest is not regenerated.
- Gates as in `workflow/coding-rules.md`; the test count stays 229 files, 1983 passed, 1 skipped,
  per file identical to `d932616`.
- `report-r2.md` lists each item with the file and the new comment text, and the gate and
  `comment-proof` results.
