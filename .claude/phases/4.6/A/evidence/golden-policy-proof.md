# Golden policy proof, 4.6-A

Method: a scratch vitest file (outside the repo, not kept) imports every
`src/engine/__golden__/*.fixture.ts` and dumps each fixture's `expected*` exports as JSON. For the
three `setup`-moved goldens it also dumps `createGoldenState(fixture)`, the whole `CombatState`
(both parties, `rng`, `effectInstanceCounter`, `turnClock`, `round`, the registries). The "main" dump
was taken from the branch head before any edit (the head carries the mailbox commits only); the
"branch" dump after the last edit. Both dumps compared by deep equality of the imported values, not
by reading diffs. The corpus digest fixture is untouched (`git status`), and its test passes without
`npm run corpus:update`.

Printed output of the comparison:

```
goldens compared: 145 identical: 144
differing: [["golden-round-end-interaction","expectedEvents"]]
round-end lengths 31 32
first differing index 12 {"type":"TriggerFired","sourceId":"p1","hook":"on-round-end","effectId":"catastrophic-collapse"}
equal after removing that one event: true
next event is the 999 DamageDealt: {"type":"DamageDealt","sourceId":"p1","targetId":"p1","rawDamage":999,"finalDamage":999,"affinityMultiplier":1,"wasChipOnly":false,"remainingHp":0,"damageSource":"dot"}
golden-defend-count-additive-cap initial equal: true expectedEvents equal: true expectedResult equal: true
golden-heal-scaling-count initial equal: true expectedEvents equal: true expectedResult equal: true
golden-necromoss-reclaim initial equal: true expectedEvents equal: true expectedResult equal: true
```

Reading it: 144 of 145 fixtures are identical in every `expected*` export. The one difference is
`golden-round-end-interaction`'s `expectedEvents`: 31 events on `main`, 32 on the branch; removing
index 12, `{ type: 'TriggerFired', sourceId: 'p1', hook: 'on-round-end', effectId:
'catastrophic-collapse' }`, makes the two arrays equal, and index 13 is P1's 999 `DamageDealt`. For
`golden-defend-count-additive-cap`, `golden-heal-scaling-count` and `golden-necromoss-reclaim` the
`initial` state (built from the new fresh parties plus the new `setup`) deep-equals what `main`'s
`createCombat` produced from the old parties, and the expected events and results are equal.
