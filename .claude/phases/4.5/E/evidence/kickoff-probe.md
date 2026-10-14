# Kickoff probe: what the spell change moves on `main`

Scratch clone of `2bb9851` (`main`), outside the repo. A measurement, not the build: the plan
designs the change. Node 22 (CI runs 24); the lockfile's tool versions. Full suite on `main`: 228 files, 1982 passed, 1 skipped.

## The variant

The plainest version of the change, nothing else:

- `THORN_VOLLEY` in `data/spells/overgrowth.ts` (Violence, `aoe`, enemy side, `unlockedAtBiome: 1`,
  one `deal-damage` on `cast-target`, `offStat: 'cast'`, `spellPower: 0.45`), in Cinder Nova's
  slot of `ALL_SPELLS` (first), and in `OVERGROWTH_SPELLS`.
- `data/spells/core.ts` deleted; its three spells copied unchanged into a test fixture file, which
  `golden-dot`, `golden-6v6-scripted` and `fixture-scripts.test.ts` import instead of
  `data/spells`.
- The corpus: the Ember Lance and Venom Bolt spell fights removed, Cinder Nova's fight casts Thorn
  Volley, and the `sorcerer` perk fight's `dozerCaster(VENOM_BOLT)` becomes
  `dozerCaster(STINGER_SWARM)`.
- `data/scripts.test.ts`: `EMBER_LANCE` → `THORN_LASH`.

## Full suite under the variant

5 failed, 1977 passed, 1 skipped. The three `balance-ci-*` tests, every golden and every other
`corpus-coverage.test.ts` case stay green (every spell, status and perk is still covered).

| Test | Why |
| --- | --- |
| `data/spells/index.test.ts` "ALL_SPELLS is append-only…" | pins the old first 24 ids |
| `state/integration.test.ts` "the party holds the rolled sets…" | the Mauler's rolled set: `['weakening-bite', 'cinder-nova', 'silence']` → `['weakening-bite', 'thorn-lash', 'silence']` (the Violence pool is 4 spells, not 5) |
| `state/store-gems.test.ts` "a stored gem is equipped and cast…" | stores the gem id `ember-lance`, which no longer resolves |
| `corpus-coverage.test.ts` "the Silence and Pacify spell fights (entries 524-525)…" | reads literal entry indexes 524–526; they are now 522–524 |
| `corpus-digest.test.ts` | below |

## Corpus digest

527 entries → 525.

**Parts A and B (generated, 500 fights): 152 change** (A 118, B 34), 5 of them in result: 190
(win → draw), 252, 254, 298 and 460 (win → loss). Attribution check, by dumping every corpus
creature's rolled gem set before and after: 435 of the 500 fights have some creature whose set
differs; **every one of the 152 changed fights is among them**, and no fight whose sets are all
identical changes. 283 fights differ only in gems that are never cast. 415 of the 500 held at least
one of the three old spells on `main`. `rollLoadout` draws once per slot whatever the pool size,
so the RNG stream is unchanged and only Violence and Instinct creatures' sets can differ.

**Part C (coverage):** spell fights get combat seed `2000 + index` (`buildSpellFight`), and the
Silence and Pacify fights continue that count, so removing two entries moves every later seed.

| Seeds | Part C entries that change |
| --- | --- |
| index-derived (the variant as above) | Thorn Volley's fight (old 501 → 500); Disorient's (old 512 → 510), **only because its seed moved** from 2012 to 2010 (Confusion rolls); the `sorcerer` perk fight (old 515 → 513) |
| each surviving fight keeps its seed (same variant, seeds held) | Thorn Volley's fight and the `sorcerer` perk fight only |

Either way every other Part C entry keeps its hash and moves up one index (after Ember Lance's
entry) or two (after Venom Bolt's). The `sorcerer` perk fight changes a lot: a 1925-event loss on
`main`, an 85-event win with Stinger Swarm (100%) in place of Venom Bolt (40% + Poison); every
Sorcerer perk still matters somewhere in the corpus (the perk case of
`corpus-coverage.test.ts` stays green).

### The `sorcerer` perk fight under the variant

Per Sorcerer perk with effects, the perk fights where removing it alone changes the log: Echo,
Arcane Might and Spell Focus in `sorcerer` and `sorcerer-silenced`; Clear Mind in
`sorcerer-silenced` only (as on `main`; the Masteries have no effects yet). A seed sweep of the
`sorcerer` fight over 100 combat seeds (900000–900099): Echo, Arcane Might and Spell Focus matter
at every seed.

## Test copies

Ember Lance, Cinder Nova and Venom Bolt also exist as identical local copies in
`engine/combat.test.ts` (2), `engine/interpreter.test.ts` (2) and
`__golden__/golden-aoe-cast.fixture.ts` (1). Renaming every copy's id and name (to `fixture-bolt`
and so on) leaves the whole engine suite green but for the index-literal coverage case above:
events carry `gemSlot`, never a spell id, so the ids reach no golden.

## Balance

`npm run sim` not run (`CONVENTIONS.md#balance-simulator`). The three `balance-ci-*` verdicts stay
green under the variant.
