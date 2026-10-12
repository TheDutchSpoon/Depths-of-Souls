# 4.5-B2 mechanism removal, site by site

Each run put one site back on party-array order (`[...playerParty, ...enemyParty].filter(alive)`), ran `pass-order.test.ts`, `turn-order.test.ts` and the seven `golden-pass-order-*` tests, and restored the file. The last run makes the helper read `state.turnQueue`.

```
on-action-observed attack: 7 failing
   pass-order.test.ts :: attack
   pass-order.test.ts :: includes a creature given an observer status by an earlier response in the same pass
   pass-order.test.ts :: reads Speed again at each attack instance, not once at the action start
   __golden__/golden-pass-order-non-stacking.test.ts :: the faster carrier gets the chance and the slower one draws nothing
   __golden__/golden-pass-order-observed.test.ts :: a faster enemy reacts before a slower player creature, on both observation passes
   __golden__/golden-pass-order-poles.test.ts :: an act-first and an act-last bearer take their poles in an observation pass, against Speed
   __golden__/golden-pass-order-speed-change.test.ts :: a pass keeps the order it was taken in; the next pass reads the new Speed
on-action-observed single cast: 1 failing
   pass-order.test.ts :: single-target cast
on-action-observed AOE cast: 1 failing
   pass-order.test.ts :: AOE cast
on-action-observed defend: 1 failing
   pass-order.test.ts :: defend
on-action-observed provoke: 1 failing
   pass-order.test.ts :: provoke
on-damage-observed: 2 failing
   pass-order.test.ts :: on-damage-observed
   __golden__/golden-pass-order-observed.test.ts :: a faster enemy reacts before a slower player creature, on both observation passes
on-death-observed: 1 failing
   pass-order.test.ts :: on-death-observed, the dead creature left out
on-round-end: 3 failing
   pass-order.test.ts :: on-round-end
   __golden__/golden-pass-order-live.test.ts :: a Speed change earlier in the round reorders the round-end pass against the round-start queue
   __golden__/golden-pass-order-live.test.ts :: a creature revived in round 2 fires in its live place in the round-end pass
on-fight-start: 3 failing
   pass-order.test.ts :: on-fight-start
   __golden__/golden-pass-order-fight-start.test.ts :: a fast enemy fires before a slow player creature, with no queue built yet
   __golden__/golden-pass-order-web-rolls.test.ts :: the draws go to the faster bearer first
Web roll: 1 failing
   __golden__/golden-pass-order-web-rolls.test.ts :: the draws go to the faster bearer first
helper reads state.turnQueue: 11 failing
   pass-order.test.ts :: on-fight-start
   pass-order.test.ts :: reads Speed again at each attack instance, not once at the action start
   turn-order.test.ts :: reads the live parties, not the frozen turn queue
   turn-order.test.ts :: is the round-start ordering, poles included
   turn-order.test.ts :: breaks ties by side, slot and id whatever order the party arrays are in
   __golden__/golden-pass-order-fight-start.test.ts :: a fast enemy fires before a slow player creature, with no queue built yet
   __golden__/golden-pass-order-live.test.ts :: a Speed change earlier in the round reorders the round-end pass against the round-start queue
   __golden__/golden-pass-order-live.test.ts :: a creature revived in round 2 fires in its live place in the round-end pass
   __golden__/golden-pass-order-poles.test.ts :: an act-first and an act-last bearer take their poles in an observation pass, against Speed
   __golden__/golden-pass-order-speed-change.test.ts :: a pass keeps the order it was taken in; the next pass reads the new Speed
   __golden__/golden-pass-order-web-rolls.test.ts :: the draws go to the faster bearer first
done
```
