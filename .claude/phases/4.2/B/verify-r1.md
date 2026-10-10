# Verify report — Phase 4.2 — Slice B (round 1)

Coding agent → design agent. Checked against `main`'s `src/` and against the old text at
`6abd67a`. The docs and the code were not edited.

## Result

- `npm run docs:check -- inventory B`: **PASS**, 228 units and 228 rows, base `6abd67a`. (The
  command takes the slice as `B`; `4.2-B` is refused with "slice must be one of B, C, D, E, F".)
- Rows checked: **228**. Fate counts recounted from the table: kept 13, rewritten 92, merged 30,
  moved 7, dropped 86. They match the verify request.
- Findings: **4** (none blocking: 1 wrong reason in a content doc, 1 imprecise role note,
  2 bookkeeping slips).
- Spec and code disagree: **0** new cases. The two documented bugs (Thorns, Last Stand) are
  confirmed, not findings (see "Known bugs confirmed").

## What was checked

1. **Numbers against `src/data`**: every trait, spell, status and perk number in the seven
   condensed files, read side by side with `traits/{overgrowth,glimmerdark,rotcap-hollow,starters}.ts`,
   `spells/{core,overgrowth,glimmerdark,rotcap-hollow}.ts`, `statuses.ts` and `specializations.ts`.
   All match. Examples: Web 10% break roll and 3-turn default (`statuses.ts:134-139`), Poison 40% of
   Attack, Burn 35% of Intelligence, Spore 35% of Speed, Regen 10% of Health (`statuses.ts:24, 49,
   75, 203`), Confusion 50% (`statuses.ts:236`), Pounce on Speed, Root Grasp on Defence
   (`spells/overgrowth.ts:135, 278`), Rasping Chant 0.8 (`spells/rotcap-hollow.ts`), Venom Bolt 0.4
   plus Poison 3 turns (`spells/core.ts:62`). The perk tables sum to 1000 in all three specs; the
   Sorcerer's inert 600 and live 400 recompute from `specializations.ts`.
2. **Affinity, rarity-role and role script for all 54 creatures and 3 bosses** against
   `species/{overgrowth,glimmerdark,rotcap-hollow}.ts` (`affinity`, `rarity`, `defaultScriptId`) and
   `species/starters.ts`. No creature is on the wrong entry, and no row of the three roles tables
   was lost or moved. The glimmerdark affinity spread (4/3/5/4/2) recounts correctly.
3. **Boss fills**: `generation.ts:462` excludes `boss.speciesId`. The Broodmother's species is
   `spiders`, so her fill never holds Spiders; the Leech Sovereign's and Rot Sovereign's
   `speciesId` is their own id, so their fill is the whole pool. The adds match
   (`species/overgrowth.ts:389`, `species/rotcap-hollow.ts:374`, `adds: []` for the Sovereign).
   Boss level +5: `balance.ts:18`.
4. **"Pending build" items are really landed**: echo as `perform-action`
   (`traits/glimmerdark.ts:236`, `traits/starters.ts:30`); `on-turn-end` ticks and the Weaver's
   `on-turn-end` Web (`statuses.ts`, `traits/overgrowth.ts:20`); the Web roll in turn-end cleanup,
   skipping a Web born this turn (`combat.ts:190-230`); side-aware support casts (the `support`
   script's `gemSide: 'ally'`, `scripts.ts:100`). Ember Lance and Venom Bolt are still in
   `spells/core.ts`, so the move to ROADMAP Phase 4.5 "Decided, not built" is right.
5. **Every `dropped` row as a duplicate**: each home named in the Reason was found and holds the
   rule (`spec/statuses.md` "Status effects" / "Principles (locked)" / DoT section at :208-228;
   `spec/run.md` "Milestone bosses", "Biome progression", the ≥6 species / ≥3 creatures target
   at :299, "Flow" at :320; `spec/effects.md` Death-reset, count-scaling, acted-before-target,
   Splashing / Annihilate, cheat-death, Damage observation, the eight responses;
   `spec/responses.md` random-ally-without-status and `scalingStat`; `spec/combat.md` armor
   penetration, adjacency, cross-stat ("Aggressive Caster: Attack→spells"), Confusion → Tunnel
   Vision → Provoke; `spec/creatures.md` "Core stats"). The superseded drops (rounds → bearer
   turns, Glow, the 4-slot Sorcerer loadout, boss level) are superseded in the code.
6. **Corrected claims**: Treant Sapling (`species/overgrowth.ts:194`, guardian), Grovekeep and
   Thicket (warden), Voidmaw and Gorgemaw (striker) confirm the enemy-behaviour correction; the
   Sparkeaters' affinities (`species/glimmerdark.ts:212, 223, 234`), the Gloomjaws' three verbs, the
   "Stinger Swarm and Pounce" pair, and Bramble Ward / Howling Instinct as older AOE ally spells
   confirm the others. Arcane Bolt is the Sorcerer's `innate-spell` (`traits/starters.ts:36`).
7. **Moves outside B's files**: `spec/run.md:45-50` (boss set-piece bullet), `spec/progression.md:36-38`
   (control immunity), `OPEN_QUESTIONS.md:49` (sacrifice-revive) and `spec/creatures.md:9-12` each say
   only what their unit said. The Unicorn entry matches the old trait text; `revive` uses the target's
   own baseline max HP (`resolution.ts:1146-1150`), so "that ally's baseline maximum HP" is right.
8. **No sentence without a unit**: the new connective sentences (the "Spells" intro lines, "Reading
   this biome" headings, the Known limit rewrite) all trace to a row's Reason. Anchors in the
   inventory (`#4-the-cave-world--structure`, `#9-player-specializations`,
   `#13-open-questions--parked-items`, `ROADMAP.md#phase-45--run-loop-demo-interlude`) match real
   headings.

## Findings

**F1. `content/enemy-behaviour.md:75-77` (row `content/enemy-behaviour.md:61`) — the stated reason is
false.** The doc says: "No Vitality creature has a cast role, so an enemy casts Life Siphon …
only on a turn it can't attack." Three Vitality creatures run `support`, which the same doc defines
as a cast role ("Caster, support and opener are the cast roles", :50): Pollinator Duster
(`species/overgrowth.ts:234`), Flickerling Wick (`species/glimmerdark.ts:86`) and Necromoss
Hollowroot (`species/rotcap-hollow.ts:240`). The verify request repeats the claim ("because no
Vitality creature has a cast role"). The conclusion still holds, but for a different reason: a
support's rule 1 casts only ally-side gems (`scripts.ts:100`, `gemSide: 'ally'`) and Life Siphon is
enemy-side (`spells/overgrowth.ts:311`), so a support also reaches it only through the fallback.
The old text's reason was "while no ally is below 50% HP"; the new text dropped that clause along
with the false premise. Kind: **stale doc** (the code is right).

**F2. `content/rotcap-hollow.md:119` (Hollowkin Wretch) — "warden (it provokes, then confuses
whoever hits it)" reads as unconditional.** The `warden` script provokes only when the weakest ally,
itself included, is below 50% HP, and otherwise attacks the weakest enemy (`scripts.ts:61-71`). The
parenthesis is carried over verbatim from the old roles table (old :110), so this is an inherited
inaccuracy that the rule-7 pass could have corrected, not a regression. Kind: **stale doc**.

**F3. Inventory row `species/species-locked.md:112` — the named home is the wrong file.** The
Reason says the "each starter's species sits below the ≥3-creature minimum on purpose" rule
duplicates `spec/progression.md` "9. Player specializations". The rule is in
`spec/creatures.md:61`; `progression.md` does not say it (grep for "below the" and "stubbed" finds
nothing there). The fate (`dropped`) is honest; only the cited home is wrong.

**F4. `verify-request.md` byte table is stale.** `specializations/shieldbarer.md` is **2,659**
bytes now, not 2,414 (the two Known bug lines were added after the count), and the total is
**40,195**, not 39,950. The other six files match (5,050 / 8,294 / 11,400 / 7,639 / 2,258 / 2,895).

## Spec and code disagree

None new. For the record, the two documented bugs hold up against the code:

- **Thorns** (`shieldbarer.md:49-51`): the perk is `on-damage-taken` → `deal-damage` on
  `triggering-source` with no attack/spell filter (`specializations.ts`, Thorns), and a tick offers no
  source (`resolution.ts:360-361`), so "any damage with a source, never a DoT tick" is exact.
- **Last Stand** (`shieldbarer.md:68-69`): `resolution.ts:329-336` rolls whenever `wouldDie`, with
  no `finalDamage > 1` test, so a creature at 1 HP rolls again on a 1-damage hit.

## Stale comments in `src/` (for 4.2-G)

- **`species-locked.md` is cited 70 times in 29 files of `src/`; the verify request names four.** Counts per file:
  `data/species/{glimmerdark 5, overgrowth 5, rotcap-hollow 5, starters 7, overgrowth.test 1,
  starters.test 2}`, `data/spells/{glimmerdark 2, rotcap-hollow 1}`, `data/statuses.ts` 3,
  `data/traits/{glimmerdark 11, overgrowth 3, rotcap-hollow 5, starters 3}`,
  `engine/{effect-types.ts 1, targeting.ts 1, turn-order.test.ts 1}`, `state/integration.test.ts` 1,
  and one each in the golden fixtures `blindclaws-striker`, `broodmother`, `gloomjaw-stalker`,
  `hollowkin-wretch`, `leech-sovereign`, `necromoss-reclaim`, `overgrowth-web-exploit`,
  `resonant-harmonize`, `rot-sovereign`, `spore-spread`, `spore-spread-fizzle`, plus 2 in
  `brute-starter`. (The request named only the three `species/*.ts` files and `brute-starter`.)
- `src/engine/balance-types.ts:37`: "bossLevel(floor) = … + bossLevelOffset. **Default 3.**" The
  shipped value is 5 (`src/data/balance.ts:18`).
- `src/data/statuses.ts:125-133`: the Web comment says Blindclaws' H2 act-first status "will be" the
  same primitive; it is built (`GRANT_ACT_FIRST`, :172).
- `src/data/spells/glimmerdark.ts:3-24` and `src/data/traits/glimmerdark.ts:349-353` narrate deleted
  spells and "stale" `species-locked.md` entries; they cite a file that is going away.
- `src/data/species/overgrowth.ts` (comment above `BROODMOTHER`): "H1 authored her as data only and
  deliberately left the runner unbuilt … Slice I closes" is history; the wiring is built
  (`OVERGROWTH_BOSS`).

## Notes, not findings

- `data/traits/core.ts:130` `REELING` applies Stun and is exported from `data/traits/index.ts`, but
  only `app/demoFight.ts:190` gives it to a creature, so "no trait or spell in the seed content
  applies Stun" (`overgrowth.md:74-75`) holds for the shipped species. `spec/run.md`'s Stun watch point
  ("decide when content first applies Stun") is unaffected.
- `rotcap-hollow.md:188` says Charnel Feast heals "25% of the caster's maximum HP"; the other heals say
  "effective Health". Same stat (`scalingStat: 'health'`), so no disagreement.
