# `sorcerer` perk fight seed sweep (4.5-E)

The `sorcerer` perk fight (with Stinger Swarm), run at combat seeds 900000-900099. For each Sorcerer perk with effects, the fight with that perk removed alone is compared against the whole fight at the same seed, with the coverage test's own anonymising comparison (positional `perk-N` effect ids made anonymous, `logOf` in `corpus-coverage.test.ts`).

| perk | seeds where removal changes nothing (of 100) |
| --- | --- |
| echo | 0 |
| clear-mind | 100 (every seed; as on `main`, it matters only in `sorcerer-silenced`, not this fight) |
| arcane-might | 0 |
| spell-focus | 0 |

Worst case over the sweep, for the three perks the `sorcerer` fight is there for (Echo, Arcane Might, Spell Focus): **0** of 100 seeds where removal changes nothing; each matters at every seed. Clear Mind never matters in this fight, before or after (the probe found the same on `main`); the coverage case finds it in `sorcerer-silenced`.
