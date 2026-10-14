# Golden identity (4.5-E)

Method: every `__golden__/*.fixture.ts` imported by a scratch vitest test on the `git archive HEAD` tree (before) and on a copy of the working tree (after); every export serialised (Maps as entries, functions by source) and compared export by export.

- Fixture files on both trees: 144. Exports compared: 1336. Identical: 1331. Different: 5.
- New on the working tree, no before: ./engine/__golden__/golden-thorn-volley.fixture.ts.

## Differences

- ./engine/__golden__/golden-6v6-scripted.fixture.ts: export playerParty: differs at char 650: before ..."scriptId":"always-cast","equippedSpells":[{"id":"ember-lance","name":"Ember Lance","targetShape":"single","affinity":"violence","... after ..."scriptId":"always-cast","equippedSpells":[{"id":"fixture-single-violence","name":"Single Violence Spell","targetShape":"single","...
- ./engine/__golden__/golden-6v6-scripted.fixture.ts: export enemyParty: differs at char 648: before ..."scriptId":"always-cast","equippedSpells":[{"id":"cinder-nova","name":"Cinder Nova","targetShape":"aoe","affinity":"violence","unl... after ..."scriptId":"always-cast","equippedSpells":[{"id":"fixture-aoe-violence","name":"AOE Violence Spell","targetShape":"aoe","affinity"...
- ./engine/__golden__/golden-aoe-cast.fixture.ts: export CINDER_NOVA removed
- ./engine/__golden__/golden-aoe-cast.fixture.ts: export playerParty: differs at char 219: before ...ue,"scriptId":"cast-aoe","equippedSpells":[{"id":"cinder-nova","name":"Cinder Nova","targetShape":"aoe","affinity":"violence","tar... after ...ue,"scriptId":"cast-aoe","equippedSpells":[{"id":"fixture-aoe-violence","name":"AOE Violence Spell","targetShape":"aoe","affinity"...
- ./engine/__golden__/golden-dot.fixture.ts: export playerParty: differs at char 229: before ...d":"cast-once-then-wait","equippedSpells":[{"id":"venom-bolt","name":"Venom Bolt","targetShape":"single","affinity":"instinct","un... after ...d":"cast-once-then-wait","equippedSpells":[{"id":"fixture-poison-instinct","name":"Poison Instinct Spell","targetShape":"single","...

## Differences, narrowed

The string comparison above is key-order sensitive (the data spells list `unlockedAtBiome` before `targetSide`, the fixture spells the other way). Re-compared by parsing each serialised export and deep-equal (`util.isDeepStrictEqual`), then again with the `id` and `name` of every spell object blanked:

- `golden-6v6-scripted` `playerParty` and `enemyParty`: equal once the equipped spell's `id` and `name` are blanked. Every other field of the spell (shape, affinity, side, biome, effects, 0.5 and 0.3) is equal.
- `golden-aoe-cast` `playerParty`: equal once the equipped spell's `id` and `name` are blanked.
- `golden-dot` `playerParty`: equal once the equipped spell's `id` and `name` are blanked.
- `golden-aoe-cast` `CINDER_NOVA`: the removed export.
- Nothing else differs: every `expected*`, `SEED`, `TURN_STEPS`, `scripts` and other export of the other 141 fixture files and of the rest of these three is deep-equal.
- `golden-thorn-volley` is new and has no before.
