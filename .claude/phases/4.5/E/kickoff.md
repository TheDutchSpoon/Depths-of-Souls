# Kickoff — Phase 4.5 — Slice E: Spell clean-up and Thorn Volley

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/run.md` (`spec/run.md#spells-unlock-cumulatively`,
  `spec/run.md#enemy-script-and-gem-set`), `spec/creatures.md` (`spec/creatures.md#spells`,
  `spec/creatures.md#spell-affinity-gate`, `spec/creatures.md#player-gem-sets`), and
  `spec/combat.md#damage-formula` with `spec/combat.md#aoe-cast` for the new content golden.
- `CONVENTIONS.md#corpus-digest` (its coverage-fight deletion rule is new at this kickoff),
  `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`,
  `CONVENTIONS.md#tuning-never-changes-a-mechanism-golden`,
  `CONVENTIONS.md#comment-only-golden-edits-are-allowed`, `CONVENTIONS.md#comment-why-not-what`.
- The brief: `phases/4.5/brief.md#spell-clean-up-and-thorn-volley`,
  `phases/4.5/brief.md#balance-verdicts` and `phases/4.5/E/brief.md` (its "Known" rewritten at this
  kickoff).
- Content docs: `content/overgrowth.md#spell-power-convention`, `content/overgrowth.md#thorn-lash`,
  `content/overgrowth.md#stinger-swarm` and `content/overgrowth.md#core-spells` (the three entries
  this slice deletes). You don't edit them: Thorn Volley's entry goes under **Content changes**.
- Code, before planning: `data/spells/core.ts`, `data/spells/index.ts` (`ALL_SPELLS` and its
  append-only comment), `data/spells/index.test.ts` (the dedup guard and the append-only pin),
  `data/spells/overgrowth.ts` (`THORN_LASH`, the header comment), `OVERGROWTH_SPELLS` in
  `data/species/overgrowth.ts`, `rollLoadout` and `weightedPick` in `engine/generation.ts`.
- The corpus: `engine/__corpus__/corpus.ts` (`SPELL_FIGHTS`, `LOCK_SPELL_FIGHTS`,
  `buildSpellFight`'s `2000 + index` seed, the `sorcerer` entry of `PERK_FIGHT_VARIANTS`,
  `buildCorpus` and the entry-number comments), and in `corpus-coverage.test.ts` the Silence and
  Pacify case (literal entries 524–526) and the perk case.
- Every user of the three spells: `engine/combat.test.ts`, `engine/interpreter.test.ts`,
  `engine/fixture-scripts.test.ts`, `golden-aoe-cast`, `golden-dot`, `golden-6v6-scripted`,
  `data/scripts.test.ts`, `state/store-gems.test.ts`, `state/integration.test.ts` ("Stored player
  gems in the real floor-10 fight"), and the comments in `data/spells/glimmerdark.ts`,
  `data/spells/rotcap-hollow.ts` and `data/statuses.ts`.
- `phases/4.5/E/evidence/kickoff-probe.md`: what the plainest version of this change moves on
  `main`. Your build should reproduce its numbers; any difference is explained in the report.

## Scope

Ember Lance and Venom Bolt are deleted. Cinder Nova becomes **Thorn Volley**: id `thorn-volley`,
Violence, `aoe`, enemy side, `unlockedAtBiome: 1`, one `deal-damage` on `cast-target` with
`offStat: 'cast'` and `spellPower: 0.45`, in `data/spells/overgrowth.ts` and `OVERGROWTH_SPELLS`.
`data/spells/core.ts` is deleted. In `ALL_SPELLS` Thorn Volley takes Cinder Nova's slot (first);
the survivors keep their order. The three spells' test copies become **three neutrally named
fixture spells in one new `engine/__fixtures__/spells.ts`**, with the same numbers (a single-target
50% Violence spell, an AOE 30% Violence spell, a single-target 40% Instinct spell with Poison for
3), and every engine test and golden that uses one of them imports it from there: the five local
copies (`combat.test.ts` ×2, `interpreter.test.ts` ×2, `golden-aoe-cast`) are deleted, and
`golden-dot`, `golden-6v6-scripted` and `fixture-scripts.test.ts` stop importing `data/spells`
for them. The corpus follows the content: the Ember Lance and Venom Bolt spell fights go, Cinder
Nova's fight casts Thorn Volley, the `sorcerer` perk fight's `dozerCaster(VENOM_BOLT)` becomes
`dozerCaster(STINGER_SWARM)`, and **every surviving coverage fight keeps its current combat seed**
(`CONVENTIONS.md#corpus-digest`).

**Not in this slice:** any other spell or number; the generation rule (`rollLoadout`, uniform
weights, the safety net); any new mechanism; renaming any fixture beyond the three spells; any
living-doc edit (they go under **Spec questions** and **Content changes**).

## Golden policy

Deliberate content change, listed:

- **The corpus digest is regenerated once** (`npm run corpus:update`), 527 entries → 525. Expect
  (`phases/4.5/E/evidence/kickoff-probe.md#corpus-digest`): Parts A and B, 152 changed (A 118,
  B 34), 5 results moving (190 win → draw; 252, 254, 298, 460 win → loss); Part C, the Ember Lance
  and Venom Bolt entries removed, two changed (Thorn Volley's fight, old 501 → 500; the `sorcerer`
  perk fight, old 515 → 513), and every other Part C entry the same hash one index up (after Ember
  Lance's entry) or two (after Venom Bolt's).
- **Tests that change**, and only in the listed way:
  - `data/spells/index.test.ts`, the append-only pin: rewritten to the new order. Its title and
    constant name follow the new count, with no history in them.
  - `state/integration.test.ts`, the Mauler's rolled set: `['weakening-bite', 'cinder-nova',
    'silence']` → `['weakening-bite', 'thorn-lash', 'silence']`. The test is labelled
    generated-then-checkpoint-verified, so the pin is re-taken from the roll, and its two
    registry checkpoints pass unchanged.
  - `state/store-gems.test.ts`: the stored gem `ember-lance` becomes a surviving Violence spell
    the Brute starter can hold.
  - `data/scripts.test.ts`: `EMBER_LANCE` → `THORN_LASH`. Its expected values carry no spell, so
    they stay identical.
  - `corpus-coverage.test.ts`, the Silence and Pacify case: entries 524–526 become 522–524.
- **Every golden stays byte-identical**, including `golden-aoe-cast`, `golden-dot` and
  `golden-6v6-scripted`: their change is the spell's import and name, and events carry `gemSlot`,
  never a spell id. Their header comments that name the old spells may change under
  `CONVENTIONS.md#comment-only-golden-edits-are-allowed`.

**New hand-derived test:** `golden-thorn-volley`, a small content golden on the real
`THORN_VOLLEY`, through the shared runner. One caster casts it at two or more living enemies that
differ in Defence, and one of them in affinity matchup, so each hit's arithmetic is distinct and
shown in comments (`spec/combat.md#damage-formula`). The golden fails at 0.3 and at 0.5.

## Traps

- **A mechanism golden must not read the data spell.** `golden-6v6-scripted` reads Cinder Nova at
  0.3. Pointing it at `THORN_VOLLEY` instead of the fixture's AOE spell runs green only after
  re-pinning, and that would be a silent golden change. Every former user gets the fixture copy
  with its old numbers.
- **Fixture names don't pose as content and carry no history.** A name like `FORMER_EMBER_LANCE`
  is provenance (`npm run docs:check -- comments` fails it), and a fixture named after a real
  spell reads as real data. Name each one by its shape. Proposing the names is an ASSUMPTION.
- **Seeds follow the entry, not the index.** `buildSpellFight` seeds each spell fight with
  `2000 + index`, and the Silence and Pacify fights continue the count. Removing two entries would
  move every later seed, and the probe shows that alone changes the Disorient fight (Confusion
  rolls), a change the content never caused. Thorn Volley's fight keeps Cinder Nova's 2001,
  Thorn Lash's 2002 and so on, Silence 2015, Pacify 2016. The shape you choose must keep a future
  deletion from moving seeds again. A recomputed offset that only works for this one deletion
  doesn't do that.
- **Literal entry numbers.** `corpus-coverage.test.ts` reads 524–526, and `corpus.ts`'s comments
  say "entries 524-525, seeds 2015-2016", "Corpus entry 526" and "after entry 525". All of them
  move by two.
- **The `sorcerer` perk fight changes a lot.** It goes from a 1925-event loss to an 85-event win
  (Stinger Swarm at 100% against Venom Bolt's 40%). The probe's 100-seed sweep keeps Echo, Arcane
  Might and Spell Focus mattering at every seed. Your report repeats that sweep
  (`CONVENTIONS.md#corpus-digest`, "coverage never rides on one lucky seed").
- **`ALL_SPELLS` order.** Thorn Volley goes in Cinder Nova's slot. Don't append it, and don't move
  a survivor: no reason to change any other roll. The "append-only" comment still holds for
  additions. A deletion is a deliberate content change, and the comment can say that in present
  tense.
- **The roll's RNG stream doesn't move.** `rollLoadout` draws once per slot whatever the pool
  size, so only Violence and Instinct creatures' sets can differ, and a fight whose every set is
  identical must hash identically (the probe found no exception). The player's Brute starter
  rolls from the same Violence pool (`spec/creatures.md#player-gem-sets`), so balance moves too.
- **Instinct has no slack.** Howling Instinct, Pounce and Stinger Swarm are exactly the ≥3 the data
  test requires (`spec/run.md#enemy-script-and-gem-set`).
- **Stale text outside the type checker:** the header of `data/spells/overgrowth.ts` ("16 real
  spells", "AOE damage-only spells would land around 50% (none in this biome…)"), the reference
  points in `data/spells/glimmerdark.ts` (Venom Bolt; "0.7 vs Ember Lance 0.5") and
  `data/spells/rotcap-hollow.ts` (Venom Bolt's 0.4; Ember Lance's 0.5), `data/statuses.ts`'s
  Venom Bolt comment, and `golden-6v6-scripted`'s derivation header. A reference point that
  survives cites a surviving spell or `content/overgrowth.md#spell-power-convention`.

## Must stay green

All gates in `coding-rules.md`. Every golden, byte-identical. Every unit test not listed above.
The three `balance-ci-*` threshold tests (green in the probe), `corpus-coverage.test.ts` (every
spell, status and perk still covered), the dedup guard in `data/spells/index.test.ts`, and the
corpus digest after its one regeneration.

## The PR must prove

- **Corpus attribution** (`evidence/`): the old → new index map for Part C, each moved entry
  showing the same hash, the removed and changed entries named. For Parts A and B, every corpus
  creature's rolled set dumped before and after: every changed fight has a differing set, no
  fight with identical sets changed, and every differing creature is Violence or Instinct. The
  counts match the probe's, or the difference is explained.
- **Seeds kept:** every surviving coverage fight's seed, before and after.
- **The `sorcerer` perk fight's seed sweep:** each Sorcerer perk with effects matters, worst case
  over the sweep.
- **Thorn Volley's number:** `golden-thorn-volley` fails with `spellPower` at 0.3 and at 0.5.
- **No old reference:** a grep of `src/` for the three ids, the three names and the three const
  names returns nothing.
- **Balance** (`phases/4.5/brief.md#balance-verdicts`): the three `balance-ci-*` tests green.
  Don't run `npm run sim` (`CONVENTIONS.md#balance-simulator`). A red verdict stops and asks; no
  tuning.
- The test count, reconciled file by file against `main` (probe: 228 files, 1982 passed, 1
  skipped): +1 file for `golden-thorn-volley`, and nothing else added or lost.
- **Content changes:** Thorn Volley as built, and the three deletions.

## Docs edited at this kickoff

- `.claude/CONVENTIONS.md#corpus-digest`: new rule, deleting content removes its coverage fight
  and every other coverage fight keeps its seed (Duncan's call at kickoff). **This takes
  `CONVENTIONS.md` over its budget** (29.1 KB of 29 KB); this slice's PR review resolves it
  (`workflow/budgets.md#over-budget`).
- `.claude/phases/4.5/E/brief.md`: the golden policy line (no golden changes; the probe found no
  content golden reading the three spells), "Known" (the test copies become neutral fixture
  spells in one file, Duncan's call at kickoff; the corpus seeds and the `sorcerer` perk fight),
  and "Done when" (names too, and every golden byte-identical).
- `.claude/phases/4.5/brief.md#spell-clean-up-and-thorn-volley`: what the content change moves
  (the corpus digest and the tests that pin a rolled set, not content goldens).
- Added `.claude/phases/4.5/E/evidence/kickoff-probe.md`, the probe this kickoff cites.
