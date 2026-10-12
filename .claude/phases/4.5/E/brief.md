# 4.5-E — Spell clean-up and Thorn Volley

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **deliberate content change**: content
goldens, the corpus digest (regenerated once) and the balance bands; mechanism goldens untouched.
CI balance verdicts re-checked (`phases/4.5/brief.md#balance-verdicts`).

## Scope

`phases/4.5/brief.md#spell-clean-up-and-thorn-volley`: delete Ember Lance and Venom Bolt; Cinder
Nova becomes Thorn Volley (45%) in `data/spells/overgrowth.ts`; `data/spells/core.ts` goes.

## Known

- `data/scripts.test.ts` uses Ember Lance as its stand-in cast spell, and `data/statuses.ts` cites
  Venom Bolt in a comment: both move to surviving spells.
- `engine/__corpus__/corpus.ts` lists all three spells; its coverage entries follow the content.
- Instinct is left with exactly 3 biome-1 spells, the data test's minimum.

## Done when

No reference to the three old ids remains in `src/`, Thorn Volley is in the Overgrowth list at 45%,
and every changed golden and digest entry is attributed to the spell change.
