# Plan — 4.5-E: Spell clean-up and Thorn Volley

Read: `CLAUDE.md`, `workflow/coding-rules.md`, `kickoff.md`, `brief.md`, `evidence/kickoff-probe.md`,
`CONVENTIONS.md` (corpus digest, golden discipline), the code the kickoff lists. The slice reaches
no spec file the kickoff doesn't name. No conflict found between the kickoff and the docs.

Golden policy (restated, `kickoff.md#golden-policy`): **deliberate content change, listed.**
The corpus digest is regenerated **once** (`npm run corpus:update`), 527 → 525 entries. Only the
listed tests change, in the listed way. **Every existing golden stays byte-identical**
(`golden-aoe-cast`, `golden-dot`, `golden-6v6-scripted` change only imports, names and header
comments). One new hand-derived golden, `golden-thorn-volley`. No golden is re-pinned from a run.

## Approach

1. Add `THORN_VOLLEY`; delete `core.ts` and its three spells.
2. Move the three spells' test copies into one neutral fixture file; point every engine user at it.
3. Make the Part C spell-fight seed an explicit field, so a deletion never moves a seed.
4. Update the corpus (drop two fights, retarget two), the listed tests, and the stale comments.
5. Write `golden-thorn-volley`, then regenerate the digest once and produce the evidence.

## Changes by file

### Data

- `src/data/spells/core.ts` — **deleted** (Duncan deletes; I empty nothing, I stop referencing it
  and list it under **To delete**). Until then nothing imports it.
- `src/data/spells/overgrowth.ts`
  - Add `THORN_VOLLEY`: `id 'thorn-volley'`, `name 'Thorn Volley'`, `targetShape 'aoe'`,
    `affinity 'violence'`, `targetSide 'enemy'`, `unlockedAtBiome 1`, one `deal-damage` on
    `cast-target`, `offStat 'cast'`, `spellPower 0.45`. Placed before `THORN_LASH`.
  - Header comment: "16 real spells" → 17 (the file defines 16 spells today, +1); the convention
    paragraph's "AOE damage-only spells would land around 50% (none in this biome -- both AOE
    entries here carry a status too)" is rewritten to name Thorn Volley (0.45) as the AOE
    damage-only example. **ASSUMPTION A1** (wording only; the number 0.45 is the kickoff's).
- `src/data/spells/index.ts`
  - Drop the `./core` import and `export * from './core'`; import `THORN_VOLLEY` from `./overgrowth`.
  - `ALL_SPELLS`: delete `EMBER_LANCE`, `VENOM_BOLT`; `THORN_VOLLEY` takes `CINDER_NOVA`'s slot
    (first); survivors keep their order. Doc comment: keep "append-only for additions" and add in
    present tense that a deleted spell is a deliberate content change that shifts the roll.
- `src/data/species/overgrowth.ts` — `OVERGROWTH_SPELLS`: add `THORN_VOLLEY` first (before
  `THORN_LASH`), import it. `overgrowth.test.ts` already checks each entry is biome 1 and affinity
  coverage, so it covers the membership.
- Stale comments (no behaviour): `glimmerdark.ts` (Disorient's "besides core.ts's Venom Bolt" and
  "vs Venom Bolt"; Blinding Flare's "0.7 vs Ember Lance 0.5 / Thorn Lash 1.0"), `rotcap-hollow.ts`
  (Spore Cyst and Withering Bolt "Venom Bolt's own DoT spell, 0.4"; "Ember Lance (0.5)"),
  `statuses.ts` (the Poison `defaultDuration` comment). Each reference point moves to a surviving
  spell or to `content/overgrowth.md#spell-power-convention`. For the DoT reference I cite
  **Spore Cyst / Withering Bolt at 0.45** (the shipped DoT spells) and the convention anchor; for
  Blinding Flare, "0.7 vs Thorn Lash 1.0 / Thorn Volley 0.45". **ASSUMPTION A2** (which surviving
  spells the comments cite). Also `glimmerdark.test.ts`/other comments are checked by the
  final grep.

### Fixtures (engine tests)

- **New** `src/engine/__fixtures__/spells.ts`: three `Spell` consts, same numbers as the copies,
  named by shape, no history, not posing as content. **ASSUMPTION A3** (names):
  - `SINGLE_VIOLENCE_SPELL` — id `fixture-single-violence`, name `Single Violence Spell`; single,
    Violence, enemy side, biome 1, `deal-damage` cast-target, `offStat 'cast'`, `spellPower 0.5`.
  - `AOE_VIOLENCE_SPELL` — id `fixture-aoe-violence`; aoe, Violence, `spellPower 0.3`.
  - `POISON_INSTINCT_SPELL` — id `fixture-poison-instinct`; single, Instinct, `spellPower 0.4`
    plus `apply-status` poison `duration: 3` on cast-target.
  Header comment cites `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`. Not a test file;
  no `.test.ts` (the existing `__fixtures__/traits.test.ts` pattern isn't needed for three plain
  literals, and the kickoff counts +1 file only).
- Users switch to it (and the five local copies are deleted):
  - `combat.test.ts`: delete the two copies (lines 22–52); `EMBER_LANCE`→`SINGLE_VIOLENCE_SPELL`,
    `CINDER_NOVA`→`AOE_VIOLENCE_SPELL` at 528, 613, 1147, 1183, 1227.
  - `interpreter.test.ts`: same (copies at 36–66; uses at 215, 273, 296, 434, 465, 527, 568, 640, 648).
  - `fixture-scripts.test.ts`: drop `../data/spells` import; `EMBER_LANCE` → `SINGLE_VIOLENCE_SPELL`.
  - `__golden__/golden-aoe-cast.fixture.ts`: delete the local `CINDER_NOVA` (and its export),
    import `AOE_VIOLENCE_SPELL`; `equippedSpells` swapped. Events unchanged (`gemSlot`, no id).
  - `__golden__/golden-dot.fixture.ts`: `VENOM_BOLT` → `POISON_INSTINCT_SPELL`; the header's
    "(VENOM_BOLT -> Poison)" and "casts venom-bolt" reworded. Comment-only per
    `CONVENTIONS.md#comment-only-golden-edits-are-allowed`.
  - `__golden__/golden-6v6-scripted.fixture.ts`: `EMBER_LANCE`/`CINDER_NOVA` →
    `SINGLE_VIOLENCE_SPELL`/`AOE_VIOLENCE_SPELL` (fixtures, **not** `THORN_VOLLEY`: the trap in the
    kickoff); derivation header renamed to the fixture names with the same 0.5/0.3 arithmetic.

### Corpus (`engine/__corpus__/corpus.ts`)

- Imports: drop `EMBER_LANCE`, `CINDER_NOVA`, `VENOM_BOLT`; add `THORN_VOLLEY`.
- **Seed shape (the trap):** `SpellFightSpec` gains an explicit `readonly seed: number`;
  `buildSpellFight(spec)` uses `spec.seed` and no longer takes an index. Each entry carries the
  literal it has on `main`: Thorn Volley 2001, Thorn Lash 2002, Weakening Bite 2003, Blinding
  Flare 2004, Withering Bolt 2005, Root Grasp 2006, Bramble Ward 2007, Rasping Chant 2008,
  Stinger Swarm 2010, Howling Instinct 2011, Disorient 2012, Puppet String 2013, Spore Cyst 2014;
  Silence 2015, Pacify 2016. A future deletion deletes one entry and moves nothing.
  `buildCorpus` stops passing indexes. Doc comment states why the seed is a field (a seed that
  followed the index would change fights a deletion never touched). **ASSUMPTION A4** (explicit
  seed field vs. a derived-from-spell-id seed; explicit is the simplest shape that cannot move).
- Remove the Ember Lance and Venom Bolt entries from `SPELL_FIGHTS` (15 → 13 entries);
  `{ spell: CINDER_NOVA … }` → `THORN_VOLLEY`; the `sorcerer` perk fight's `dozerCaster(VENOM_BOLT)`
  → `dozerCaster(STINGER_SWARM)`.
- Entry-number comments move by two: "entries 522-523, seeds 2107-2108" → "entries 520-521"
  (seeds stay), "(entries 524-525, seeds 2015-2016)" → "(entries 522-523 …)", the Life Siphon
  doc "Corpus entry 526, seed 2017" → "entry 524", "appended after entry 525 (entry 526)" → "525
  (entry 524)" — read "after entry 523". Seeds of Parts A, B, the perk fights and Life Siphon are
  untouched.
- `corpus-coverage.test.ts`: comment "entries 522-523" → "520-521"; the Silence and Pacify case
  title "(entries 524-525)" → "(entries 522-523)", `resolved.length >= 526` → `>= 525`,
  `resolved[524 + k]` → `resolved[522 + k]`, both message strings. The kickoff says "524–526 become
  522–524"; the test reads 522, 523 with a length floor of 525 (Life Siphon is 524). **ASSUMPTION A5.**

### Tests that change (only as listed)

- `data/spells/index.test.ts`: the append-only pin rewritten to the new order: constant
  `FIRST_22` (`thorn-volley`, `thorn-lash`, `weakening-bite`, … `withering-bolt`), then `silence`,
  `pacify` (slice(0, 24)), then `pounce`, `stifling-weight`, `life-siphon` (slice(24)); the test
  title follows ("first 22 ids in order, then Silence, then Pacify, then the last three"), no history.
  Header comment of the block unchanged otherwise.
- `state/integration.test.ts`: mauler pin re-taken from the roll (`['weakening-bite',
  'thorn-lash', 'silence']` expected by the probe; I run the test, compare, and only then write it
  — if the roll differs from the kickoff's, I stop and say so). Both registry checkpoints untouched.
- `state/store-gems.test.ts`: stored gem `'ember-lance'` → `'thorn-lash'` (Violence, single, biome 1,
  equippable by the Brute).
- `data/scripts.test.ts`: `EMBER_LANCE` → `THORN_LASH` (import and 12 uses); expected values
  carry no spell, so none change.
- `corpus-coverage.test.ts`: as above.

### New golden: `golden-thorn-volley` (`__golden__/golden-thorn-volley.{fixture,test}.ts`)

Content golden on the real `THORN_VOLLEY`, through `runGolden`. `SEED` inert (no RNG: an AOE
cast, wait-only enemies), `TURN_STEPS = 1`.
- `caster` (player): `violence`, Intelligence 100, Speed 100, `always-cast`, slot 0 `THORN_VOLLEY`.
  Level default 11 (Additional 0).
- Three enemies, Health 60, `always-wait`, in slot order: `e1` wit, Defence 15 (caster advantage
  ×1.25); `e2` vitality, Defence 5 (disadvantage ×0.75); `e3` endurance, Defence 25 (neutral ×1).
- offStat = 100 × 0.45 = 45. Hand-derived in comments (`spec/combat.md#damage-formula`,
  `#aoe-cast`), arithmetic checked with `node -e`:
  - e1: core 30, chip 0.45, ×1.25 = 38.0625 → 38, HP 22.
  - e2: core 40, chip 0.45, ×0.75 = 30.337500000000002 → 30, HP 30.
  - e3: core 20, chip 0.45, ×1 = 20.45 → 20, HP 40.
  One `SpellCast` aoe `[e1,e2,e3]`, three `DamageDealt` (`damageSource 'cast'`), no deaths.
- Finals at 0.3 (offStat 30) would be 19 / 18 / 5 and at 0.5 (offStat 50) 44 / 34 / 25 (checked
  with `node -e`), so every hit differs from 0.45's (38 / 30 / 20) and the golden fails at both.
  The golden reads the real data; the number lives only in `spells/overgrowth.ts`.

## Mechanism → test that fails with it removed (every site)

| Mechanism / site | Test that fails without it |
| --- | --- |
| `THORN_VOLLEY.spellPower 0.45` | `golden-thorn-volley` (mutate to 0.3 and to 0.5: both fail) |
| `THORN_VOLLEY` aoe / Violence / enemy / cast-target shape | `golden-thorn-volley` (target set `[e1,e2,e3]`, `SpellCast.targetShape 'aoe'`, affinity matchup) |
| `THORN_VOLLEY` in `ALL_SPELLS`, first slot | `index.test.ts` pin (append it, or move a survivor: fails); `corpus-coverage` "every spell is cast" (omit it: its fight stops covering it) |
| `THORN_VOLLEY` in `OVERGROWTH_SPELLS` | None fails if it is omitted: the list is documentation-only grouping (its header says so) and `species/overgrowth.test.ts` only iterates whatever it holds. **ASSUMPTION A6**: I add no test for it (the kickoff allows +1 file only); the report states this gap and the mutation run shows it. |
| Deleting Ember Lance / Venom Bolt / Cinder Nova from `ALL_SPELLS` | `index.test.ts` pin (re-adding one fails it); the grep in the PR proof |
| `core.ts` removed | `tsc -b` (any leftover import fails); grep of `src/` for the nine names |
| Explicit spell-fight `seed` | `corpus-digest.test.ts`: derive the seed from the index again and Disorient's hash changes (probe: 2012 → 2010), so the digest fails |
| Silence/Pacify entries keep their seeds (2015/2016) | `corpus-digest.test.ts` (same mutation) |
| Thorn Volley fight (replaces Cinder Nova's) | `corpus-coverage` "every spell … cast with effects landing" (retarget it back and Thorn Volley isn't cast: fails) |
| `sorcerer` perk fight casts Stinger Swarm | `corpus-coverage` perk case (Echo, Arcane Might, Spell Focus matter); digest (the fight's hash) |
| Neutral fixture spells, numbers 0.5 / 0.3 / 0.4 + Poison 3 | `golden-aoe-cast`, `golden-dot`, `golden-6v6-scripted` (change a number: each fails); `combat.test.ts`, `interpreter.test.ts` assertions on damage and shape |
| Each fixture user imports from `__fixtures__/spells.ts`, not data | `golden-6v6-scripted` / `golden-dot` / `fixture-scripts.test.ts`: if one were pointed at `THORN_VOLLEY` (0.45), golden-6v6-scripted fails (expected 1 on e1's hits) — run as a mutation to prove the trap |
| Silence/Pacify index reads at 522–523 | `corpus-coverage` Silence/Pacify case (revert to 524: reads Life Siphon/undefined, fails) |

I run each mutation once, restore it, and quote the failing test in the report.

## Gates and evidence

- Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`,
  `npm run docs:check -- citations`, `-- comments` (all fixture names/comments checked for
  provenance: no "former", "was", "old" in `src/`).
- Corpus: `npm run corpus:update` **once**, after everything else is final (the golden, the
  seed shape, the corpus edits). Expect 525 entries; Parts A+B 152 changed (A 118, B 34), results
  190 win→draw, 252/254/298/460 win→loss; Part C: only Thorn Volley's fight and the `sorcerer`
  perk fight changed; others the same hash one or two indexes up. Any difference is explained.
- Test count: probe is 228 files / 1982 passed / 1 skipped on `main`; expect **229 files**, and
  count reconciled file by file (the change in tests inside edited files is zero: no test is
  added or removed apart from `golden-thorn-volley`'s one `it`, so passed = 1983).
- Balance: the three `balance-ci-*` tests; no `npm run sim`. Red → stop and ask.

### `evidence/` (outputs only, no scripts kept)

Scratch scripts live outside the repo (the scratchpad). The "before" side runs from a pristine
copy of `HEAD` extracted outside the repo (`git archive`, so the index and my working tree stay
untouched), with `node_modules` linked read-only.
1. `corpus-attribution.md` — Part C old → new index map (same hash per moved entry; removed
   and changed entries named); Parts A/B: each corpus creature's rolled gem set before and after,
   every changed fight has a differing set, no all-identical fight changed, every differing
   creature is Violence or Instinct; counts vs the probe's.
2. `seeds-kept.md` — every surviving coverage fight's combat seed, before and after.
3. `sorcerer-seed-sweep.md` — the `sorcerer` perk fight over seeds 900000–900099 (the probe's
   range): per Sorcerer perk with effects, remove it alone and count seeds where the log is
   unchanged; report the worst case.
4. `thorn-volley-mutation.md` — `golden-thorn-volley` failing at 0.3 and 0.5.
5. `no-old-reference.md` — a grep of `src/` for the three ids, names and const names (empty).
6. `test-counts.txt` — files/tests, reconciled per file against `main`.
7. Mutation results for the table above, in the report.

### Report and record

`report-r1.md` in the format of `coding-rules.md`, including **Spec questions**: the
`CONVENTIONS.md#effect-carriers-live-in-libraries` mention of `core.ts`; `content/overgrowth.md`'s
three entries to delete (`#thorn-lash`/`#stinger-swarm`/`#core-spells` as the kickoff names them);
stale spec/CONVENTIONS text naming the three spells, found by grep over `.claude/` (read-only);
`CONVENTIONS.md` 29.1 KB over budget (the PR review's); **Content changes:** Thorn Volley as
built, the three deletions, the Mauler/Violence pool consequence. **To delete:**
`src/data/spells/core.ts`. `record.md` written to the slice folder.

## Risks I will check, not assume

- The Mauler pin: re-taken from the roll, compared against the kickoff's expectation.
- `docs:check -- comments` on every new comment and fixture name.
- The size of the diff in `corpus-digest.fixture.ts`: exactly the 525 rows `renderFixture` writes.
- `golden-6v6-scripted`'s checkpoints (counts, spot checks) pass unchanged — proof the fixture
  spells equal the old numbers.

## Assumptions checklist

- [ ] **A1** — header comment wording in `data/spells/overgrowth.ts` ("17 real spells"; AOE
  damage-only now has Thorn Volley at 0.45), a comment-only change.
- [ ] **A2** — which surviving spells the stale reference-point comments cite (Spore Cyst /
  Withering Bolt at 0.45 for DoT; Thorn Lash 1.0 / Thorn Volley 0.45 for Blinding Flare), or the
  `content/overgrowth.md#spell-power-convention` anchor.
- [ ] **A3** — fixture names: `SINGLE_VIOLENCE_SPELL`, `AOE_VIOLENCE_SPELL`,
  `POISON_INSTINCT_SPELL` (ids `fixture-single-violence`, `fixture-aoe-violence`,
  `fixture-poison-instinct`), all in `engine/__fixtures__/spells.ts`.
- [ ] **A4** — the seed shape: an explicit `seed` literal on each `SpellFightSpec`.
- [ ] **A5** — Silence/Pacify test indexes are 522–523 with a length floor of 525 (Life Siphon is
  524); the kickoff's "524–526 become 522–524" is read that way.
- [ ] **A6** — `OVERGROWTH_SPELLS` membership has no test that fails without it and gets none (no
  new test beyond `golden-thorn-volley`, per the kickoff's +1 file); the mutation run shows this.
- [ ] **A7** — `golden-thorn-volley` geometry: caster Violence, Int 100; enemies wit/Def 15,
  vitality/Def 5, endurance/Def 25, Health 60, all `always-wait`; one turn. Values
  38 / 30 / 20 to be re-confirmed with `node -e` before the fixture is written.
- [ ] **A8** — "before" evidence runs from a `git archive` of `HEAD` extracted in the scratchpad
  (no worktree, no change to the index, nothing deleted).
- [ ] **A9** — the Mauler's expected set `['weakening-bite','thorn-lash','silence']` is taken from
  the kickoff and re-confirmed by the roll before it is written.
