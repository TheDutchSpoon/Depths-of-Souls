# Record — Phase 4.5 — Slice E: spell clean-up and Thorn Volley

**Status: built.** Deliberate content change: corpus digest regenerated once (527 → 525 entries);
every existing golden's expected values unchanged; 1983 tests passed, 1 skipped (+1 against
`main`, 229 files).

## What was built

- **Thorn Volley.** `THORN_VOLLEY` in `src/data/spells/overgrowth.ts`: Violence, `aoe`, enemy side,
  biome 1, one `deal-damage` on `cast-target`, `offStat: 'cast'`, `spellPower: 0.45`. First in
  `ALL_SPELLS` (the slot Cinder Nova held; every survivor keeps its order) and first in
  `OVERGROWTH_SPELLS`, which also lists Silence and Pacify now.
- **Three spells deleted.** Ember Lance, Cinder Nova and Venom Bolt left game data;
  `src/data/spells/core.ts` is gone and the barrel no longer re-exports it.
- **Three fixture spells.** `src/engine/__fixtures__/spells.ts` holds `SINGLE_VIOLENCE_SPELL` (0.5),
  `AOE_VIOLENCE_SPELL` (0.3) and `POISON_INSTINCT_SPELL` (0.4, Poison for 3), the old numbers under
  neutral ids. `combat.test.ts`, `interpreter.test.ts`, `fixture-scripts.test.ts`, `golden-aoe-cast`,
  `golden-dot` and `golden-6v6-scripted` use them; the five local copies are deleted.
- **Corpus.** `SpellFightSpec` carries an explicit `seed`; the Ember Lance and Venom Bolt fights
  are removed, Thorn Volley's fight keeps Cinder Nova's seed 2001, and the `sorcerer` perk fight's
  caster casts Stinger Swarm. Every surviving coverage fight keeps its seed.
- **Tests.** The `ALL_SPELLS` order pin, the Mauler's rolled set, the stored gem in
  `store-gems.test.ts`, `data/scripts.test.ts`'s stand-in spell and the Silence/Pacify entry
  indexes follow the content. New golden `golden-thorn-volley` (a content golden, 38 / 30 / 20).
- **Comments** that cited the three spells as reference points now cite surviving spells or
  `content/overgrowth.md#spell-power-convention`.

## Files changed

New: `engine/__fixtures__/spells.ts`, `engine/__golden__/golden-thorn-volley.{fixture,test}.ts`.
Deleted by Duncan: `data/spells/core.ts`. Edited: `data/spells/{index,overgrowth,glimmerdark,
rotcap-hollow}.ts`, `data/spells/index.test.ts`, `data/species/overgrowth.ts`, `data/statuses.ts`,
`data/scripts.test.ts`, `engine/__corpus__/{corpus,corpus-digest.fixture}.ts`,
`engine/corpus-coverage.test.ts`, `engine/{combat,interpreter,fixture-scripts}.test.ts`, the three
golden fixtures above, `state/{integration,store-gems}.test.ts`. No living or content doc edited.

## Not changed

The generation rule (`rollLoadout`, uniform weights, the safety net); any other spell or number;
the `balance-ci-*` thresholds (green, nothing tuned).
