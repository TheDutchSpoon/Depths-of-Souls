# 4.5-E — Spell clean-up and Thorn Volley

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **deliberate content change**: the
corpus digest (regenerated once) and the tests that name an old spell or pin a rolled set; every
golden byte-identical.
CI balance verdicts re-checked (`phases/4.5/brief.md#balance-verdicts`).

## Scope

`phases/4.5/brief.md#spell-clean-up-and-thorn-volley`: delete Ember Lance and Venom Bolt; Cinder
Nova becomes Thorn Volley (45%) in `data/spells/overgrowth.ts`; `data/spells/core.ts` goes.

## Known

- `data/scripts.test.ts` uses Ember Lance as its stand-in cast spell, and `data/statuses.ts` cites
  Venom Bolt in a comment: both move to surviving spells.
- The three spells also exist as identical copies in `engine/combat.test.ts`,
  `engine/interpreter.test.ts` and `golden-aoe-cast`, and `golden-dot`, `golden-6v6-scripted` and
  `fixture-scripts.test.ts` import them from `data/spells`. They become neutrally named fixture
  spells, with the same numbers, in one `engine/__fixtures__/spells.ts`. Events carry `gemSlot`,
  never a spell id, so no golden changes.
- `engine/__corpus__/corpus.ts` lists all three spells; its coverage entries follow the content:
  the Ember Lance and Venom Bolt fights go, Cinder Nova's casts Thorn Volley, every surviving
  coverage fight keeps its combat seed (`CONVENTIONS.md#corpus-digest`), and the `sorcerer` perk
  fight's Venom Bolt caster casts Stinger Swarm.
- Instinct is left with exactly 3 biome-1 spells, the data test's minimum.
- With `data/spells/core.ts` gone the spell library has no `core.ts`: this slice's PR review drops it
  from `CONVENTIONS.md#effect-carriers-live-in-libraries` for spells, as 4.5-A's did for traits
  (`phases/4.5/brief.md#placeholder-traits-move-to-test-fixtures`).

## Done when

No reference to the three old ids or names remains in `src/`, Thorn Volley is in the Overgrowth
list at 45%, every golden is byte-identical, and every changed digest entry is attributed to the
spell change.
