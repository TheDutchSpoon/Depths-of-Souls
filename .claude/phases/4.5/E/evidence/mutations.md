# Mechanism removal and golden mutations (4.5-E)

Each mutation applied alone to the working tree, the named tests run, the file restored (the full suite was re-run afterwards: 229 files, 1983 passed, 1 skipped). `FAIL` = the named test fails with the mutation.

| mutation | tests run | result | failing test |
| --- | --- | --- | --- |
| Thorn Volley spellPower 0.45 -> 0.3 | golden-thorn-volley.test.ts | FAIL | hits every living enemy once, each at its own Defence and affinity matchup |
| Thorn Volley spellPower 0.45 -> 0.5 | golden-thorn-volley.test.ts | FAIL | hits every living enemy once, each at its own Defence and affinity matchup |
| Thorn Volley targetShape aoe -> single | golden-thorn-volley.test.ts | FAIL | hits every living enemy once, each at its own Defence and affinity matchup |
| ALL_SPELLS: Thorn Volley appended instead of first slot | index.test.ts | FAIL | ALL_SPELLS is append-only: the first 22 ids in order, then Silence, then Pacify, then the last three |
| ALL_SPELLS: a survivor moved (Thorn Lash and Weakening Bite swapped) | index.test.ts | FAIL | ALL_SPELLS is append-only: the first 22 ids in order, then Silence, then Pacify, then the last three |
| Spell-fight seed derived from the entry index again | corpus-digest.test.ts | FAIL | every fight matches the committed digest |
| Silence and Pacify keep no explicit seed (index-derived over both lists) | corpus-digest.test.ts | PASS (nothing fails) | - |
| Thorn Volley coverage fight dropped | corpus-coverage.test.ts, corpus-digest.test.ts | FAIL | every fight matches the committed digest; the Silence and Pacify spell fights (entries 522-523) cast their spell with the status landing, riding on no draw |
| sorcerer perk fight casts Puppet String instead of Stinger Swarm | corpus-digest.test.ts | FAIL | every fight matches the committed digest |
| fixture AOE spell 0.3 -> 0.35 | golden-aoe-cast.test.ts, golden-6v6-scripted.test.ts | FAIL | matches the committed event log exactly; matches the checkpointed structural properties of the real run |
| fixture single spell 0.5 -> 0.6 | golden-6v6-scripted.test.ts | FAIL | matches the checkpointed structural properties of the real run |
| fixture Poison spell duration 3 -> 4 | golden-dot.test.ts | FAIL | applies Poison via a Cast, ticks it flat at its bearer turn end, and the killing tick ends the fight with no expiry |
| fixture Poison spell 0.4 -> 0.5 | golden-dot.test.ts | FAIL | applies Poison via a Cast, ticks it flat at its bearer turn end, and the killing tick ends the fight with no expiry |
| golden-6v6-scripted reads THORN_VOLLEY (0.45) for the AOE spell (the trap) | golden-6v6-scripted.test.ts | FAIL | matches the checkpointed structural properties of the real run |
| Silence/Pacify case reads entry 524 + k (the old index) | corpus-coverage.test.ts | FAIL | the Silence and Pacify spell fights (entries 522-523) cast their spell with the status landing, riding on no draw |
| OVERGROWTH_SPELLS omits THORN_VOLLEY | overgrowth.test.ts | PASS (nothing fails) | - |

Notes:

- "Thorn Volley coverage fight dropped": the "every spell in ALL_SPELLS is cast with its effects landing" case did **not** fail. Parts A and B cast Thorn Volley with its effects landing, so the dedicated fight is not what keeps it covered. The Silence and Pacify case fails only because dropping an entry shifts the literal indexes it reads, and the digest fails on the removed entry.
- "Silence and Pacify keep no explicit seed": passes. Their fights are an always-cast caster against a wall and draw no random number, so their seeds are invisible to the digest; the explicit 2015 and 2016 keep the invariant that no surviving fight's seed moves (`seeds-kept.md`), which the digest does not check for these two. Disorient's fight (Confusion rolls) is the one the index-derived mutation above moves.
- "OVERGROWTH_SPELLS omits THORN_VOLLEY": passes. The list is documentation and test grouping, not a mechanism; no test is added for it.
- The mutation script and its `golden-6v6-scripted` / `THORN_VOLLEY` variant are scratch and not kept.
