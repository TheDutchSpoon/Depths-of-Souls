# Verify report — Phase 4.2 — Slice C (round 1)

Coding agent → design agent. Checked `spec/creatures.md`, `spec/run.md`, `spec/progression.md`,
`spec/store.md` and `spec/saves.md` against the old text (`git show 892f1b8:…`, and `171d5fb` for
the 4.2-B additions) and against `main`'s `src/`. Nothing edited, nothing committed.

## Result

- `npm run docs:check -- inventory C`: **PASS**, 154 units and 154 rows (base `171d5fb`).
  (The brief's `inventory 4.2-C` form is refused: the slice argument is `C`.)
- Fate counts in `inventory.md` match the verify request: kept 1, rewritten 103, merged 33, moved 2,
  dropped 15. Byte totals match (44,136).
- Rows read side by side with their new text: all 154. **Findings: 9** (3 are spec-and-code
  disagreements, listed again below; 0 numbers wrong).
- Every link to a heading of the five files resolves, except finding 3. Every label-form link into
  `combat`, `scripting` and `OPEN_QUESTIONS.md` resolves to existing text.

## What checked out (no finding)

- **Numbers against `src/`:** soul gain 25/20/10 (`data/balance.ts:21`); XP to next level
  `20 × level²` (`engine/leveling.ts:28-30`) and XP per kill = victim's level (`leveling.ts:40`,
  `state/rewards.ts` `resolveKillReward`); level formula (`leveling.ts:10-20`; base 20 → 65 at
  level 10); `fightCount` `10 + (floor−1)` (`curves.ts:56`); `enemyPartySize` `min(6, floor)`
  (`curves.ts:62`); minimum `floor(floor × m)` and width `0 + floor(floor/10)`
  (`curves.ts:33-45`, `balance.ts:15-16`). I recomputed the worked values: floors 1–9 → 1, 2, 3, 5,
  6, 7, 9, 10, 11; floor 10 → 13–14; floor 30 → 44–47. Boss offset 5 (`balance.ts:17`; floors
  10/20/30 → 19/34/52). `DEFAULT_GEM_SLOT_COUNT` 3 (`engine/config.ts:28`). 100 per boss
  (`rewards.ts` `perkPointsFor`). Currency drop formula (`rewards.ts` `currencyDropForKill`).
- **`spec/run.md` mechanics:** `descend` bound `1..min(deepestFloor+1, contentFrontier)`
  (`store.ts:493-512`); generation RNG and combat seeds from `runSeed`/`runCounter`, counter advances
  `fights.length + 1` (`store.ts:746-770, 853`); every descent adds its biome (`store.ts:839-840`);
  `deepestFloor` advances only on a full clear (`store.ts:851`); boss draw order boss gem set → each
  add's level then gem set → fill (`generation.ts:433-481`); fill pool minus `boss.speciesId`
  (`generation.ts:462`); enemies get no `scriptId` so `materializeCreature` falls back to
  `defaultScriptId` (`generation.ts:215, 383-390`); `CAST_ROLE_SCRIPT_IDS`
  (`generation.ts:269`); ≥3 spells per affinity at biome 1 is pinned by `data/roles.test.ts:163`;
  `pinBiome` reasons and `biomeHasContent` (`store.ts:524-540`); the Leech Sovereign has `adds: []`
  (`data/species/glimmerdark.ts:375`).
- **`spec/creatures.md`:** `Instance` shape (`state/rewards.ts:26-52`); a fusion source throws
  (`rewards.ts` `staticCreatureIdFor`); `materializeCreature` options and fallbacks
  (`generation.ts:158-237`); `canEquip(spell, affinity)` (`generation.ts:83`); innate spells
  prepended in `createCombat` and a set-up creature refused (`engine/combat.ts:93-117`); player gem
  roll: own stream `hashGemDraw` (`store.ts:482`), unlock biome `min(100, max(1, deepestFloor))`
  with empty pins (`store.ts:354-359`), innate exclusion in the store (`store.ts:361-396`); a
  summon takes the lowest empty party slot (`store.ts:423-428`); `True Wit` has `effects: []`
  (`data/specializations.ts:202-206`), so it belongs under Not built.
- **`spec/store.md`:** the `GameState` field list is the 14 fields of `store.ts:128-157`; the action
  list and every failure reason match `GameActions` and the `*FailureReason` types
  (`store.ts:183-222`); the seed is generated in `src/app/newGame.ts`, not in the store.
- **The Known bug in `spec/run.md` "Rewards":** confirmed. `resolvePlayerParty` runs once before the
  fight loop (`store.ts:755`), and `applyXpToParty` runs only in the final `set`
  (`store.ts:843-848`). `ROADMAP.md:316-322` (Phase 4.5 "Decided, not built") says what the fix
  must do and that the balance bands are re-checked.
- **Dropped rows:** each home holds the rule. The starters are in `specializations/{sorcerer,brute,
  shieldbarer}.md` "Starter: …" (placeholder name, Arcane Surge, Mauler's second instance, +35%
  Defence, Attack 15, warden). `VISION.md` "Explicit non-goals" holds no prestige. `CONVENTIONS.md`
  "Where each number lives" holds the config rule. Inside rewritten rows: `spec/combat.md` "Affinity
  advantage" (:61) and "Encounters, rewards & wipes" (:151-166) hold what was dropped, "Resolution &
  timing" holds `alive: false, not removed` (:248), `OPEN_QUESTIONS.md` "Balance numbers" holds the
  fight-count text (:21-24) and the enemy-level watch points, and `spec/effects.md:565` holds the
  `PerkDef` no-phase-tag line.
- **Large merges:** `Enemy levels`, the boss headings, `Fusion` and `saves.md` lose no rule apart
  from findings 4 and 5. `Not built` halves: nothing built sits there (pinning is in Design "Pins";
  `snapshot`/`hydrate` do not exist in `src/`; no code spends the four currencies).
- **The one added rule** (swap grants the new spec's starter, never removes one):
  `store.ts:692-700` and `grantCreatureIfUnowned` (`store.ts:435-456`) agree.

## Findings

1. **Row C:149 — `spec/creatures.md` "Player gem sets": "granted at floor 0 … keep a biome-1 set"
   is not what `main` does.** The text says the starters and the Unicorn are granted at floor 0.
   `setSpec` grants the new spec's starter when it isn't owned (`store.ts:692-700` →
   `grantCreatureIfUnowned` → `addInstance` → `rollPlayerGems`), and the roll's pool follows
   `unlockBiomeIndex`, i.e. `deepestFloor` (`store.ts:354-359`). A player at floor 30 who swaps to
   an unowned spec gets a starter with a biome-3 set. `runScriptedIntro` has the same property
   (it is callable at any depth). The sentence is inherited from the old text (C:149), so this is
   old text against `main`, not a condensing error. See "Spec and code disagree" 1.

2. **Row C:645 — `spec/run.md` "Scripted intro": "the starter revived" does not exist in `main`.**
   See "Spec and code disagree" 2.

3. **Row G:367/C:1752 — dead label link.** `spec/creatures.md:238` links `spec/run.md "Recipe
   drops"`. The heading is "Recipe drops and currency sinks" (`spec/run.md:294`), so 4.2-G's
   anchor conversion would not find it.

4. **Row G:172 — a rule lost from "Spells unlock cumulatively".** The old text says an enemy's
   loadout "*and the player's own equip options once Phase 8 lands*, are rolled/offered from every
   spell whose `unlockedAtBiome` is ≤ the current biome". `spec/run.md:60-62` keeps only "A gem set
   rolls from …". Nothing in `creatures.md` "Gems as items" says what the player's Phase 8 equip
   options are offered from. The row's Reason doesn't record the drop.

5. **Row G:1223 — a clause lost from `spec/saves.md` "What a save holds".** The old Collection bullet
   ends "Equipped gem and equipment references join with Phase 8." The new Collection bullet doesn't
   say it (`saves.md:32`), and Inventory only lists the gem and equipment *instances*. The row
   says only "the instance fields link creatures#instance".

6. **Sentences with no unit in this slice, and a dead anchor from 4.2-B.** Two sentences came into
   these files with 4.2-B (`683d1d8`), so neither has a C row, and C:107's and G:1124's rows don't
   mention them: `spec/progression.md:29-31` ("Each spec has one control immunity … Clear Mind,
   Aggressive, Lucidity"), and `spec/run.md:125-127` ("Each boss is a set piece with one clear
   signature"). Both are true against `src/` (`data/specializations.ts:169, 270, 459`; Silence,
   Pacify and Puppet String/Disorient apply the three statuses). The issue is the trace (check step 5)
   and that 4.2-B's inventory row `specializations/shieldbarer.md:59` still names
   `spec/progression.md#9-player-specializations`, which no longer exists.

7. **`spec/run.md:302` "No phase is scheduled yet" has no unit.** The old text says only that a
   biome's data carries theme, scaling tweaks and visuals (G:86). `ROADMAP.md` schedules neither
   (Phase 7 is the combat UI, Phase 8 the progression layers), so the claim is a new, unsourced
   statement.

8. **Row G:77 — wording changed the meaning.** Old: "no need to re-walk cleared floors". New
   (`spec/run.md:13-14`): "cleared floors are never re-walked". `descend` accepts any floor up to
   `deepestFloor + 1` (`store.ts:508`) and "Fresh every visit" (`run.md:77-83`) is about re-running
   cleared floors, so the two sentences disagree inside the file.

9. **Row G:361 — roster swap wording.** See "Spec and code disagree" 3.

## Spec and code disagree

1. **Starter and Unicorn gem sets.**
   - Spec, `spec/creatures.md:201-203`: "The starters and the Unicorn are granted at floor 0 and can
     never be summoned (they bank no soul), so they keep a biome-1 set".
   - Code, `src/state/store.ts:692-700` (`setSpec` grants an unowned starter), `store.ts:384-396`
     (`rollPlayerGems`), `store.ts:354-359` (`unlockBiomeIndex` reads `state.deepestFloor`).
     "Can never be summoned" does hold (`checkSummon`, `store.ts:543-555`).

2. **Scripted intro.**
   - Spec, `spec/run.md:190-191`: "The first fight is a scripted encounter whose outcome triggers a
     story beat (the starter revived, the **Unicorn** gained) instead of wipe → hub. The Unicorn
     joins whether it is won or lost."
   - Code, `src/state/store.ts:877-915` (`runScriptedIntro`): a level-1 Unicorn enemy resolved by the
     ordinary resolver; the only outcome handling is `grantCreatureIfUnowned(Unicorn)` and
     `runCounter + 1`. Nothing revives the starter, and nothing makes it "the first" fight (it can
     be called at any time, `store.ts:879-881` only throws on an empty party). The Unicorn clause
     matches. Its doc comment says the same (`store.ts:279-282`).

3. **Party arrangement.**
   - Spec, `spec/creatures.md:100-101`: "arranged freely at the hub (any instance into any slot;
     moving one onto an occupied slot swaps the two)".
   - Code, `src/state/store.ts:659-668` (`setPartySlot`): the swap happens only when the placed
     instance is already in another slot (`from !== -1`); a benched instance placed on an occupied
     slot displaces the occupant to the bench. `spec/store.md:47-48` states the swap correctly.

## Stale comments in `src/` (for 4.2-G)

- `src/engine/balance-types.ts:24`: "SINGLE Math.round at the end"; `curves.ts:20` and the code use
  `Math.floor`.
- `src/engine/balance-types.ts:34`: `levelRangeWidth` "Default 2, 1 (Phase 4's own width rule,
  unchanged by 4.1)"; `data/balance.ts:16` is `{ base: 0, perTenFloors: 1 }`.
- `src/engine/balance-types.ts:37`: `bossLevelOffset` "Default 3"; `data/balance.ts:17` is 5.
- Citations of `CONVENTIONS "…"` / `GAME_DESIGN §…` in these files are 4.2-G's conversion work
  (`generation.ts`, `store.ts`, `rewards.ts`, `leveling.ts`, `curves.ts`, `balance-types.ts`); not
  listed one by one.
