# Browser click-through — 4.5-G1, review r1

The report's click-through was not run at build (no browser in that session). The review ran it
headless: Playwright 1.x driving Chromium against `npx vite` (the dev server, so `main.tsx`'s
StrictMode double-runs every effect) on branch `4.5-g1` at `51a955d`, plus one check of the
production build under `vite preview` at `/Depths-of-Souls/`. Beat rates are sampled every ~20 ms
from the visible log, so 3× and 5× read slightly under 6 and 10 per second.

## Main run (Sorcerer unless named; seed 424242)

```
[start] specs:  Sorcerer, Brute, Shieldbarer
[start] panel before start: Specialization=none | Seed=20260914 | Deepest floor=0 | Last floor=0 | Discovered biomes=none | Bosses cleared=none | Perk points=0 earned, 0 spent, 0 free | Essence=0 | Ore=0 | Bricks=0 | Lifeforce=0 || Nothing spends these yet / No saving yet: reloading the page starts over
[start] seed "abc" -> The seed must be a whole number, or blank for a random one.
[start] seed "-1" -> The seed must be between 0 and 4294967295.
[start] seed "1.5" -> The seed must be a whole number, or blank for a random one.
[start] seed "4294967296" -> The seed must be between 0 and 4294967295.
[start] Random filled: 1117785644
[start] blank seed, Brute -> Specialization=Brute | Seed=836572720 | Deepest floor=0 | Last floor=0 | Discovered biomes=none | Bosses cleared=none | Perk points=0 earned, 0 spent, 0 free | Essence=0 | Ore=0 | Bricks=0 | Lifeforce=0 || Nothing spends these yet / No saving yet: reloading the page starts over
[start] Sorcerer 424242 -> Specialization=Sorcerer | Seed=424242 | Deepest floor=0 | Last floor=0 | Discovered biomes=none | Bosses cleared=none | Perk points=0 earned, 0 spent, 0 free | Essence=0 | Ore=0 | Bricks=0 | Lifeforce=0 || Nothing spends these yet / No saving yet: reloading the page starts over
[start] Brute 424242 -> Specialization=Brute | Seed=424242 | Deepest floor=0 | Last floor=0 | Discovered biomes=none | Bosses cleared=none | Perk points=0 earned, 0 spent, 0 free | Essence=0 | Ore=0 | Bricks=0 | Lifeforce=0 || Nothing spends these yet / No saving yet: reloading the page starts over
[start] Shieldbarer 424242 -> Specialization=Shieldbarer | Seed=424242 | Deepest floor=0 | Last floor=0 | Discovered biomes=none | Bosses cleared=none | Perk points=0 earned, 0 spent, 0 free | Essence=0 | Ore=0 | Bricks=0 | Lifeforce=0 || Nothing spends these yet / No saving yet: reloading the page starts over
[picker] prefill: 1 | info: The Overgrowth: 10 fights
[picker] "10" -> descend disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared. / The Overgrowth: boss floor, 1 fight
[picker] "0" -> descend disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] "2.5" -> descend disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] "abc" -> descend disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] "5" -> descend disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared. / The Overgrowth: 14 fights
[picker] "31" -> descend disabled=true | No floors that deep exist yet. / Biome 4 (unauthored): 40 fights
[picker] "" -> descend disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] "-3" -> descend disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] Deepest+1 -> 1
[descent] result: Floor 1: cleared
[descent] rows (fight | result | rounds | kills | XP | level-ups):
  1 | win | 1 | 1 | 1 |
  2 | win | 2 | 1 | 1 |
  3 | win | 6 | 1 | 1 |
  4 | win | 2 | 1 | 1 |
  5 | win | 1 | 1 | 1 |
  6 | win | 2 | 1 | 1 |
  7 | win | 4 | 1 | 1 |
  8 | win | 3 | 1 | 1 |
  9 | win | 2 | 1 | 1 |
  10 | win | 1 | 1 | 1 | Glyphmoth Seer 1 → 2; Unicorn Lightbearer 1 → 2
[descent] waiting text: true
[descent] playback started after ms: 3428 | title: Fight 1 / 10
[descent] header: Party going in: Glyphmoth Seer: level 1; Unicorn Lightbearer: level 1 / After the fight: 1 XP; no level-ups
[descent] line-up:
Glyphmoth Seer: level 1, 33 HP
Unicorn Lightbearer: level 1, 39 HP
Pollinator Duster: level 1, 30 HP
[descent] panel after descent: Specialization=Sorcerer | Seed=424242 | Deepest floor=1 | Last floor=1 | Discovered biomes=The Overgrowth | Bosses cleared=none | Perk points=0 earned, 0 spent, 0 free | Essence=10 | Ore=10 | Bricks=10 | Lifeforce=10 || Nothing spends these yet / No saving yet: reloading the page starts over
[descent] floor field after the descent: 1
[rate] 1x beats/s: 2.00
[speed] switch to 3x keeps position: true Fight 2 / 10 0 -> Fight 2 / 10 0
[rate] 3x beats/s: 5.33
[rate] 5x beats/s: 9.00
[skip-fight] Fight 3 / 10 -> last line: Fight ended: win | title Fight 3 / 10
[skip-fight] carried on to: Fight 4 / 10
[jump] -> Fight 7 / 10 lines 0
[skip-floor] -> Fight 10 / 10 | last: Fight ended: win | skip buttons disabled: true true
[skip-floor] header: Party going in: Glyphmoth Seer: level 1; Unicorn Lightbearer: level 1 / After the fight: 1 XP; level-ups: Glyphmoth Seer 1 → 2; Unicorn Lightbearer 1 → 2
[skip-floor] stays put: true
[names] fights naming Arcane Bolt: 7 | fights with a repeated name: 0
[names] any id-like token: false
[names] sample log head (fight 1):
Fight started
  Pollinator Duster triggers pollinator-duster-pollen-drift (on-fight-start)
  Pollinator Duster speed: 22 -> 27.5
-- Round 1 --
Pollinator Duster's turn
Pollinator Duster attacks Glyphmoth Seer
  Pollinator Duster -> Glyphmoth Seer: 8 damage (raw 2.12) -- 25 HP left
Pollinator Duster's turn ends
Glyphmoth Seer's turn
Glyphmoth Seer casts Pacify at Pollinator Duster
  Pollinator Duster gains pacified (3r)
  Glyphmoth Seer triggers sorcerer-starter-arcane-surge (on-turn-end)
  Glyphmoth Seer grants Glyphmoth Seer an action (sorcerer-starter-arcane-surge)
Glyphmoth Seer casts Arcane Bolt at Pollinator Duster
[copy] status: Copied fight 3 as JSON
[copy] json bytes: 7949
[timers] new descent during the wait: playback after ms 3295
[timers] 1x after clicking around, beats/s: 1.80
[loss] floor line: Floor 2: loss at fight 1 of 11
[loss] header: Fight 1 / 11 | Party going in: Glyphmoth Seer: level 2; Unicorn Lightbearer: level 2 / After the fight: 0 XP; no level-ups
[loss] floor field / panel: 2 | Specialization=Sorcerer | Seed=424242 | Deepest floor=1 | Last floor=2 | Discovered biomes=The Overgrowth | Bosses cleared=none | Perk points=0 earned, 0 spent, 0 free | Essence=40 | Ore=40 | Bricks=40 | Lifeforce=40 || Nothing spends these yet / No saving yet: reloading the page starts over
[console] none
```

"Clicking around" before the 1.8 beats/s reading: a new descent, 5× then 1× during its wait, a
second new descent during that wait, a jump to fight 2, 3× then 1×, a jump to fight 4, 1× again, a
third new descent mid-fight and a jump to fight 1.

## Repeated name (Sorcerer, seed 2: floor 1, then floor 2, fight 3)

No floor-1 fight of seeds 1–40 (Brute) or 424242 (Sorcerer) repeats a name; the parties are small.

```
Glyphmoth Seer: level 2, 41 HP
Unicorn Lightbearer: level 2, 49 HP
Swarmhive Drone (foe 1): level 2, 35 HP
Swarmhive Drone (foe 2): level 2, 35 HP
---
Glyphmoth Seer casts Pacify at Swarmhive Drone (foe 1)
  Swarmhive Drone (foe 1) gains pacified (3r)
Glyphmoth Seer casts Pollen Cloud at [Swarmhive Drone (foe 1), Swarmhive Drone (foe 2)]
```

The line-up is the r1 finding: with unique names (the main run's fight 1: two allies, one foe)
nothing on screen says which side a creature is on.

## The wait, a jump in it, a refused clipboard, the production build

```
speed change at 1.5s into the wait: playback started after 3337 ms (want ~3000, not ~4500)
jump during the wait -> Fight 5 / 10
copy refused -> [ 'Copy failed: the clipboard is not available here' ]
console: none
prod build (vite preview, /Depths-of-Souls/): Fight 1 / 10 | errors: none
```

## Copied JSON pasted into a scratch test

Fight 3 of the main run's floor 1, copied with **Debug: Copy fight as JSON** and read back from
the clipboard (7,949 bytes). A scratch test in a separate clone: `createCombat({
...JSON.parse(json), registries: DEMO_REGISTRIES })` then `resolveFight` gives 95 events; they
`toEqual` and `JSON.stringify`-equal the same fight's record from a Node store run of Sorcerer
424242 floor 1; `describeEvent` over them with that fight's view gives the browser's 95-line log
byte for byte, and the line-up matches too. Pass.

## Not covered in the browser

- The boss result line: no fresh party reaches floor 10 without summoning (the live scan in
  `.claude/phases/4.5/G1/evidence/checks-r1.md` tops out at floor 3 in 30 descents). Its unit test
  covers it; G2's click-through shows it.
- A spec switch refunding perks: G2's controls.
