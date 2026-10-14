# Report r2 — 4.5-E: Spell clean-up and Thorn Volley

Fixes from `handout-r1.md`. Comment edits in `src/` plus one record line; no code token, test,
golden or digest row changed.

## Items

1. **`src/data/spells/glimmerdark.ts`, Disorient.** Now reads: "it is Instinct's only
   status-applying spell before the Rotcap Hollow's Puppet String, so it fills a real gap rather
   than re-skinning Vine Snare; distinct from Vine Snare under the dedup guard by affinity
   (instinct vs wit)."
2. **`glimmerdark.ts`, Blinding Flare.** Now reads: "Unique under the dedup guard by spellPower
   (0.7 vs Thorn Lash 1.0 and Withering Bolt 0.45)."
3. **`src/data/spells/rotcap-hollow.ts`, Withering Bolt.** Now reads: "Distinct from Thorn Lash
   (1.0) and Blinding Flare (0.7) under the dedup guard."
4. **`src/engine/__corpus__/corpus.ts`, `SPELL_FIGHTS`.** First sentence now reads: "Each listed
   spell gets a draw-free coverage fight of its own, so it stays covered whatever Parts A and B
   roll." The rest is unchanged.
5. **`src/data/spells/overgrowth.ts`, `THORN_VOLLEY`.** Now reads: "the biome's plain AOE damage
   spell, the area sibling of single-target Thorn Lash. Damage-only AOE sits in the ~50% band
   (`content/overgrowth.md#spell-power-convention`)."
6. **`record.md`, "Comments" bullet.** Now says the comments name surviving content (Thorn Lash,
   Blinding Flare, the Myconet Rotcore trait) or the convention, or drop the reference point
   (Spore Cyst's and Withering Bolt's).

## Gates (run on the finished tree)

- `npm run test`: 229 files passed, 1983 passed, 1 skipped (1984); same totals as `d932616`. Only
  comments changed, which `comment-proof` confirms.
- `npm run lint`, `npm run format:check`, `npm run build` and `npx tsc -b`: clean.
- `npm run docs:check -- citations`: PASS (678 citations). `-- comments`: PASS, with no provenance
  wording in any new comment.
- `npm run docs:check -- comment-proof d932616`: PASS, 4 changed files (the four `src/` files above).
- Corpus digest: not regenerated, unchanged. Golden policy: no golden touched.
- No mechanism changed, so there is no remove-it test.

## Spec questions

None.

## Content changes

None.

## To delete

Nothing.
