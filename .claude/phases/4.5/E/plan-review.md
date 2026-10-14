# Plan review — 4.5-E: Spell clean-up and Thorn Volley

## Round 1

**Verdict:** approved, with the corrections below carried in this round's hand-out
(`plan-handout-r1.md`). None needs another round: each is local, and none changes the seed
design, the golden policy or anything in the phase brief. Decision 1 widens the scope by two
lines of a documentation list.

Checked against `kickoff.md`, `brief.md`, `evidence/kickoff-probe.md`,
`phases/4.5/brief.md#spell-clean-up-and-thorn-volley`, the living docs and the code on the branch
(`0d91cc7`, `src/` identical to `main`). The plan's seed list matches `main`'s
`2000 + index` values entry by entry (Thorn Volley 2001 … Spore Cyst 2014, Silence 2015, Pacify
2016), and its entry renumbering matches the corpus layout (spell fights 500–514, perk fights
515–523, lock fights 524–525, Life Siphon 526 on `main`; 525 entries after). The phase brief's
Assumptions checklist has no E item, and the plan changes nothing the brief decided.

### Plan fixes

1. **Deletion checkpoint (amends "Changes by file", `core.ts`).** The plan stops referencing
   `src/data/spells/core.ts` but has no point at which it is gone. Left on disk it is an orphan the
   gates still compile, and the kickoff's "no old reference" grep of `src/` finds all three spells
   in it. Add a checkpoint after every edit and before any gate or evidence run: ask Duncan to
   delete `core.ts`, and confirm it done under **To delete** (the shape 4.5-A used).
2. **The three golden-fixture edits are not comment-only (amends the golden-policy restatement,
   `golden-dot`, and "Gates and evidence").** `golden-aoe-cast` deletes a const and its export
   and adds an import; `golden-dot` and `golden-6v6-scripted` change an import specifier and
   identifiers. Those are code tokens, so `CONVENTIONS.md#comment-only-golden-edits-are-allowed`
   doesn't cover them and `comment-proof` can't prove them; they fall under
   `CONVENTIONS.md#goldens-are-layered-and-additive` with expected values unchanged. The plan
   calls `golden-dot`'s edit "comment-only": drop that. Proof, new `evidence/golden-identity.md`:
   import every `__golden__/*.fixture.ts` on both trees (the "before" archive and the working
   tree) and deep-compare every export, the method of
   `workflow/pr-review.md#4-verify-claimed-invariants-mechanically`. Allowed differences, listed
   one by one: the `id` and `name` of the equipped spell objects inside the three fixtures' party
   exports, and `golden-aoe-cast`'s removed `CINDER_NOVA` export. Every `expected*` export
   deep-equal. `golden-thorn-volley` is new and has no "before".
3. **A5: the length floor is 524, not 525.** On `main` the floor 526 is exactly what reading
   `resolved[525]` needs (Life Siphon, at 526, would need 527), so the faithful move by two is
   524. A floor of 525 silently widens the case to require Life Siphon's entry, which it isn't
   about.
4. **A2: one end state per comment.** Two of the plan's picks mislead:
   - `rotcap-hollow.ts`, Spore Cyst: drop the clause "the reference point is Venom Bolt's own DoT
     spell, 0.4". Citing Spore Cyst as the reference point in Spore Cyst's own comment is
     circular; the why ("a DoT-applying spell's upfront damage shouldn't lead its band") stays.
   - `rotcap-hollow.ts`, Withering Bolt: drop the same clause and "Ember Lance (0.5) /" from its
     dedup list; Thorn Lash and Blinding Flare stay.
   - `glimmerdark.ts`, Blinding Flare: "(0.7 vs Thorn Lash 1.0)". Not Thorn Volley: the dedup key
     carries `targetShape`, so an AOE spell can never collide with a single-target one, and
     naming it as a neighbour misreads the guard.
   - `glimmerdark.ts`, Disorient: Instinct has no other status-applying spell, so it fills a real
     gap; distinct from Vine Snare by affinity. Drop both Venom Bolt clauses.
   - `statuses.ts`, Poison's `defaultDuration`: no spell applies Poison after this slice, so there
     is no surviving spell to cite. End state: `MYCONET_ROTCORE_TRAIT`, Poison's only producer,
     applies it with no duration, so this default is the one it gets.
5. **A1: drop the count; cite the convention.** "17 real spells" is a count that goes stale with
   the next addition, which is exactly how this one went stale. The header keeps "at least three
   per affinity" and its reason, without a number. The convention paragraph restates
   `content/overgrowth.md#spell-power-convention`; replace it with that citation
   (`CONVENTIONS.md#comment-why-not-what`, "Don't restate a spec rule").
6. **Poison's coverage (amends `evidence/corpus-attribution.md`).** Venom Bolt's spell fight was
   Poison's only deterministic application in the corpus. After it goes, Poison's only producer is
   Myconet Rotcore's on-death trait, reached only in generated fights. The coverage test still fails
   loudly if that ever drops, so no new fight; but the attribution file states how many corpus
   entries hold a Poison `StatusApplied` before and after, and the report names it under
   **Spec questions** if the count is small.
7. **The `sorcerer` sweep compares logs the way the coverage test does (amends
   `evidence/sorcerer-seed-sweep.md`).** Perk effect ids are positional
   (`CONVENTIONS.md#corpus-digest`): a raw log compare across perk sets makes every perk look like
   it matters. Reuse the coverage test's anonymising comparison, not a hash of the raw log.
8. **Two mechanism-table rows overclaim (amends "Mechanism → test").**
   - `THORN_VOLLEY` in `ALL_SPELLS`: the coverage test iterates `ALL_SPELLS`, so a spell missing
     from the registry can't fail it. The test is the order pin; drop the coverage claim.
   - Thorn Volley's coverage fight: "retarget it back" can't be run (Cinder Nova is gone). The
     mutation is dropping the fight; it fails the coverage case only if Parts A and B never cast
     Thorn Volley. Report what the run shows either way.
9. **One `corpus.ts` comment, end state.** The Life Siphon line in `buildCorpus` reads "Life
   Siphon's coverage fight, appended after entry 523 (entry 524)." The plan's text for it is
   garbled.

### Assumptions

- **A1** (header wording): **correct**, fix 5.
- **A2** (stale reference points): **correct**, fix 4.
- **A3** (fixture names and ids): **confirm**. Named by shape, nothing poses as content or carries
  history, and the ids say they are fixtures. One file, no `.test.ts`, matches the kickoff's +1.
- **A4** (an explicit `seed` literal on each `SpellFightSpec`): **confirm**. It is the shape the
  perk fights (a literal index) and Life Siphon (literal 2017) already use. A seed derived from
  the spell id would move on an id rename, and hides the seed from the reader. A deletion now
  deletes one line and moves nothing.
- **A5** (Silence/Pacify indexes): **correct**, fix 3. 522 and 523 are right; the floor is 524.
- **A6** (`OVERGROWTH_SPELLS` membership untested): **confirm**. The list is documentation and
  test grouping (its own comment says so), not a mechanism, so it needs no test. The report says
  that rather than calling it a gap. See decide-point 1 for the list's own staleness.
- **A7** (`golden-thorn-volley` geometry): **confirm**. Re-derived: offStat 45; e1 (Wit, Def 15)
  (30 + 0.45) × 1.25 = 38.0625 → 38; e2 (Vitality, Def 5) (40 + 0.45) × 0.75 = 30.3375 → 30; e3
  (Endurance, Def 25) 20.45 → 20; at 0.3: 19 / 18 / 5; at 0.5: 44 / 34 / 25. Matchups per
  `spec/combat.md#affinity-advantage` (Violence beats Wit; Vitality beats Violence). Two things
  the header must show: the Additional is 0 (`DEFAULT_FIXTURE_LEVEL` 11,
  `spec/combat.md#damage-channels-and-the-additional`), and the caster's affinity is set
  explicitly (`makeCreature` defaults to Vitality, which would turn every matchup).
- **A8** ("before" from a `git archive` of `HEAD`): **confirm**. `HEAD`'s `src/` is `main`'s.
- **A9** (Mauler pin re-taken from the roll): **confirm**, with the plan's stop if it differs.

The golden policy matches the kickoff's, apart from the comment-only label (fix 2). Every
mechanism has a test that fails without it, at each site: the three fixture spells each reach a
golden (`AOE_VIOLENCE_SPELL` two), and pointing `golden-6v6-scripted` at `THORN_VOLLEY` moves e1's
AOE hits from 1 to 3, so the trap mutation fails as the plan says.

### Decide-points

1. **`OVERGROWTH_SPELLS` is already stale.** It lacks Silence and Pacify, which
   `data/spells/overgrowth.ts` defines at biome 1 and `content/overgrowth.md` lists under the
   Overgrowth's spells, and its comment ("giving Wit a third entry here while every other
   affinity keeps two") went stale when Pounce, Stifling Weight and Life Siphon arrived. The plan
   edits this list.
   **Recommendation: fix it in this slice.** Add `SILENCE` and `PACIFY`, and cut the stale
   affinity-count sentence. It changes no behaviour (nothing outside the list's own test reads
   it, and its three checks pass for both spells), costs a few lines next to an edit the slice
   makes anyway, and you'd rather clean up than defer. Against it: the kickoff's "no other spell".
   That line was about content and numbers, not a documentation list. If you'd rather keep the
   scope literal, it goes under **Spec questions** instead.

### Decisions

1. **`OVERGROWTH_SPELLS` is fixed in this slice** (Duncan agreed with the recommendation): it gains
   `SILENCE` and `PACIFY`, and its comment loses the stale affinity-count sentence. The kickoff's
   Scope says so.

### Docs edited

- `.claude/phases/4.5/E/kickoff.md`, Scope: `OVERGROWTH_SPELLS` also lists Silence and Pacify
  (decision 1).
- No living doc edited this round.
