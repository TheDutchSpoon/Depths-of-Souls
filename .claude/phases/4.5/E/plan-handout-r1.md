# Plan hand-out — 4.5-E, round 1

**Verdict: approved.** Build `plan.md` with the items below; where they disagree, this hand-out
wins. Re-read `kickoff.md`'s Scope: its new line about `OVERGROWTH_SPELLS` (item 10).

1. **Deletion checkpoint (amends "Changes by file", `src/data/spells/core.ts`).** After every edit
   and before any gate or evidence run, stop and ask Duncan to delete `src/data/spells/core.ts`.
   The gates, the "no old reference" grep and every evidence file run on a tree without it. The
   report's **To delete** confirms it done.
2. **Golden identity proof (amends the golden-policy restatement, the `golden-dot` bullet and
   "Gates and evidence").** The edits to `golden-aoe-cast`, `golden-dot` and `golden-6v6-scripted`
   change code tokens (an import, identifiers, `golden-aoe-cast`'s local spell and its export), so
   they are not comment-only edits: they fall under
   `CONVENTIONS.md#goldens-are-layered-and-additive`, expected values unchanged. Don't call any of
   them comment-only, and don't use `comment-proof` for them. Proof, in
   `evidence/golden-identity.md`: import every `__golden__/*.fixture.ts` on both trees (the
   "before" archive of A8 and the working tree) and deep-compare every export, the method of
   `workflow/pr-review.md#4-verify-claimed-invariants-mechanically`. List each difference. The
   only allowed ones are the `id` and `name` of the equipped spell objects inside those three
   fixtures' party exports, and `golden-aoe-cast`'s removed `CINDER_NOVA` export. Every
   `expected*` export is deep-equal.
3. **Silence and Pacify case (amends ASSUMPTION A5 and the `corpus-coverage.test.ts` bullet).**
   The case reads `resolved[522 + k]`, its title says "(entries 522-523)", both message strings
   use `522 + k`, and the length floor is `toBeGreaterThanOrEqual(524)`: exactly what reading entry
   523 needs.
4. **Stale reference points, one end state each (amends ASSUMPTION A2 and the "Stale comments"
   bullet).**
   - `data/spells/rotcap-hollow.ts`, Spore Cyst: the comment drops "the reference point is Venom
     Bolt's own DoT spell, 0.4" and keeps its reason (a DoT-applying spell's upfront damage
     shouldn't lead its band).
   - `data/spells/rotcap-hollow.ts`, Withering Bolt: drops the same clause, and its dedup list
     names Thorn Lash (1.0) and Blinding Flare (0.7) only.
   - `data/spells/glimmerdark.ts`, Blinding Flare: unique under the dedup guard by spellPower
     "(0.7 vs Thorn Lash 1.0)". Thorn Volley is not named: the dedup key carries `targetShape`, so
     an AOE spell never collides with a single-target one.
   - `data/spells/glimmerdark.ts`, Disorient: Instinct has no other status-applying spell, so
     Disorient fills a real gap; it is distinct from Vine Snare by affinity. No Venom Bolt clause.
   - `data/statuses.ts`, Poison's `defaultDuration`: `MYCONET_ROTCORE_TRAIT`, Poison's only
     producer, applies it with no duration, so this default is the one it gets.
5. **`data/spells/overgrowth.ts` header (amends ASSUMPTION A1).** No spell count: the header keeps
   "at least three per affinity" and its reason. The convention paragraph is replaced by a
   citation of `content/overgrowth.md#spell-power-convention`
   (`CONVENTIONS.md#comment-why-not-what`).
6. **Poison's coverage (amends `evidence/corpus-attribution.md`).** The file states how many
   corpus entries hold a Poison `StatusApplied` event before and after. If the count after is
   small, the report names it under **Spec questions**. No new coverage fight.
7. **`sorcerer` seed sweep (amends `evidence/sorcerer-seed-sweep.md`).** Each with/without-perk
   comparison uses the coverage test's own log comparison, which anonymises the positional perk
   effect ids (`CONVENTIONS.md#corpus-digest`), not a hash of the raw log.
8. **Mechanism table (amends "Mechanism → test that fails with it removed").**
   - `THORN_VOLLEY` in `ALL_SPELLS`, first slot: the test is the `index.test.ts` order pin. The
     coverage test is not listed for this row.
   - Thorn Volley's coverage fight: the mutation removes the fight. The row says the coverage case
     fails only if Parts A and B never cast Thorn Volley, and the report quotes what the run shows.
9. **`corpus.ts`, the Life Siphon line in `buildCorpus` (amends the "Entry-number comments"
   bullet).** It reads: "Life Siphon's coverage fight, appended after entry 523 (entry 524)."
10. **`OVERGROWTH_SPELLS` (amends the `data/species/overgrowth.ts` bullet and ASSUMPTION A6).** The
    list holds `THORN_VOLLEY` first, then the current entries, with `SILENCE` and `PACIFY` added,
    and every spell it holds is imported. Its comment drops "Includes ARCANE_BOLT, giving Wit a
    third entry here while every other affinity keeps two." The list is documentation and test
    grouping, not a mechanism: the report says so and adds no test for it. Its three existing
    checks pass with the new entries.
