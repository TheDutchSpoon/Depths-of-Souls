# Browser click-through — 4.5-G1, review r2

What round 2 changed on screen: the line-up's **Allies** and **Foes** headings (hand-out r1 B1),
the floor picker's info line read from the store's `floorPreview`, "Fight n / N" with N from that
preview, the side panel's perk points from `perkPointSummary()`, and the run screen calling
`descend` directly. Run headless: Playwright 1.56 driving Chromium against `npx vite` (the dev
server, StrictMode on) on `4a89ff0` (the five obsolete `src/app` files are imported by nothing, so
the page is the same with or without them). Sorcerer, seed 424242.

```
[start] panel: Specialization | none | Seed | 20260914 | Deepest floor | 0 | Last floor | 0 | Discovered biomes | none | Bosses cleared | none | Perk points | 0 earned, 0 spent, 0 free | Essence | 0 | Ore | 0 | Bricks | 0 | Lifeforce | 0
[picker] "1" -> disabled=false | The Overgrowth: 10 fights
[picker] "10" -> disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared. / The Overgrowth: boss floor, 1 fight
[picker] "31" -> disabled=true | No floors that deep exist yet. / Biome 4 (unauthored): 40 fights
[picker] "1e20" -> disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] "abc" -> disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] "0" -> disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] "2.5" -> disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[picker] "" -> disabled=true | That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.
[descend 1] preview: The Overgrowth: 10 fights
[descend 1] result: Floor 1: cleared
[descend 1] fight rows: 10
[descend 1] waiting h4 count: 0
  Fight 1 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Pollinator Duster: level 1, 30 HP
  Fight 2 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Pollinator Duster: level 1, 30 HP
  Fight 3 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Lullpollen Sleeper: level 1, 28 HP
  Fight 4 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Spider Ambusher: level 1, 25 HP
  Fight 5 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Snapjaw Jaws: level 1, 30 HP
  Fight 6 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Swarmhive Drone: level 1, 28 HP
  Fight 7 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Spider Ambusher: level 1, 25 HP
  Fight 8 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Swarmhive Queen: level 1, 35 HP
  Fight 9 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Pollinator Beneficiary: level 1, 28 HP
  Fight 10 / 10 | Allies,Foes | ALLIES: Glyphmoth Seer: level 1, 33 HP; Unicorn Lightbearer: level 1, 39 HP | FOES: Spider Weaver: level 1, 25 HP
[after 1] panel: Specialization | Sorcerer | Seed | 424242 | Deepest floor | 1 | Last floor | 1 | Discovered biomes | The Overgrowth | Bosses cleared | none | Perk points | 0 earned, 0 spent, 0 free | Essence | 10 | Ore | 10 | Bricks | 10 | Lifeforce | 10
[descend 2] preview: The Overgrowth: 11 fights
[descend 2] result: Floor 2: loss at fight 7 of 11
[descend 2] fight rows: 7
[descend 2] waiting h4 count: 0
  Fight 1 / 11 | Allies,Foes | ALLIES: Glyphmoth Seer: level 2, 41 HP; Unicorn Lightbearer: level 2, 49 HP | FOES: Lullpollen Sleeper: level 2, 35 HP; Spider Ambusher: level 2, 31 HP
  Fight 2 / 11 | Allies,Foes | ALLIES: Glyphmoth Seer: level 2, 41 HP; Unicorn Lightbearer: level 2, 49 HP | FOES: Lullpollen Sleeper: level 2, 35 HP; Spider Weaver: level 2, 31 HP
  Fight 3 / 11 | Allies,Foes | ALLIES: Glyphmoth Seer: level 2, 41 HP; Unicorn Lightbearer: level 2, 49 HP | FOES: Lullpollen Reaper: level 2, 35 HP; Treant Elder: level 2, 54 HP
  Fight 4 / 11 | Allies,Foes | ALLIES: Glyphmoth Seer: level 2, 41 HP; Unicorn Lightbearer: level 2, 49 HP | FOES: Treant Grovekeep: level 2, 56 HP; Treant Sapling: level 2, 50 HP
  Fight 5 / 11 | Allies,Foes | ALLIES: Glyphmoth Seer: level 2, 41 HP; Unicorn Lightbearer: level 2, 49 HP | FOES: Swarmhive Striker: level 2, 35 HP; Treant Sapling: level 2, 50 HP
  Fight 6 / 11 | Allies,Foes | ALLIES: Glyphmoth Seer: level 2, 41 HP; Unicorn Lightbearer: level 2, 49 HP | FOES: Treant Elder: level 2, 54 HP; Snapjaw Lure: level 2, 44 HP
  Fight 7 / 11 | Allies,Foes | ALLIES: Glyphmoth Seer: level 2, 41 HP; Unicorn Lightbearer: level 2, 49 HP | FOES: Treant Elder: level 2, 54 HP; Spider Ambusher: level 2, 31 HP
[playback] log lines 1 -> 27 over 1.5 s at 3x
[panel end] Specialization | Sorcerer | Seed | 424242 | Deepest floor | 1 | Last floor | 2 | Discovered biomes | The Overgrowth | Bosses cleared | none | Perk points | 0 earned, 0 spent, 0 free | Essence | 34 | Ore | 34 | Bricks | 22 | Lifeforce | 34
[console] no warnings or errors
```

Read against the brief (`phases/4.5/brief.md#descent-result-and-viewer-g1`,
`phases/4.5/brief.md#floor-picker-g1`, `phases/4.5/brief.md#side-panel-g1`):

- Every fight's line-up prints under **Allies** then **Foes**; the allies are the run's party
  (Glyphmoth Seer and Unicorn Lightbearer) and the foes the floor's creatures, in slot order. The
  headings are absent while the result waits, as the whole line-up was in round 1.
- The info line is the preview's: floor 1 "10 fights", floor 2 "11 fights", floor 10 "boss floor,
  1 fight", floor 31 "Biome 4 (unauthored): 40 fights" beside its refusal; no line for text that
  isn't a whole number ≥ 1 (`1e20` typed is not one: the field takes digits only).
- Floor 2, lost at fight 7, reads "Fight n / 11" throughout: N is the preview's count, not the 7
  records fought.
- The side panel's perk points read "0 earned, 0 spent, 0 free" before and after; no boss is
  reachable by a fresh party, so the boss line stays the unit tests' (`descentText.test`,
  `store.test`'s boss-floor outcome tests).
- Playback still runs (26 beats revealed in 1.5 s at 3×); no console warning or error.
