# Verify report — Phase 4.2 — Slice C (round 2)

Coding agent → design agent. Checked what round 2 changed (`git diff 977fa99 06d6049` over
`spec/`, `ROADMAP.md` and `inventory.md`) against `verify-r1.md`'s nine findings and against `main`'s
`src/`. Nothing edited, nothing committed.

## Result

- `npm run docs:check -- inventory C`: **PASS**, 154 units and 154 rows (base `171d5fb`).
- Sizes match the verify request: creatures 17,749, run 17,576, progression 3,515, store 2,421,
  saves 3,561 bytes.
- The diff touches only the passages named under "Docs edited (round 2)". No other spec text changed.
- Rows re-read side by side with their new text: the 10 rows touched this round (C:149, C:645,
  C:1882, G:77, G:86, G:107, G:172, G:361, G:1124, G:1223). **Findings: 0.** Spec and code
  disagreements: 0.
- Every label link the round added or changed resolves to an existing `###` heading:
  `spec/run.md` "Recipe drops and currency sinks" (:296), "Spells unlock cumulatively" (:58),
  "Scripted intro" (:188), "Biome theme and visuals" (:302); `spec/store.md` "Store actions" (:42);
  `spec/progression.md` "Swapping specialization" (:62).

## Round 1 findings, one by one

1. **C:149, starter and Unicorn gem sets: resolved.** The new text matches `main`. `setSpec`
   (`src/state/store.ts:692-700`) → `grantCreatureIfUnowned` (`:435-456`) → `addInstance` (`:402-433`)
   → `rollPlayerGems` (`:384-396`) → `unlockBiomeIndex` (`:354-359`), which reads `state.deepestFloor`.
   A new game has `deepestFloor` 0, which `max(1, …)` turns into biome 1; a later swap rolls at the
   current depth. "Neither can be summoned": `checkSummon` (`:543-555`) needs soul% ≥ 100, and neither
   a starter nor the Unicorn spawns, so neither banks soul.
2. **C:645, scripted intro: resolved.** `spec/run.md:190-195` matches `runScriptedIntro`
   (`store.ts:877-915`): a level-1 Unicorn enemy through `createCombat`/`resolveFight`, no floor
   run, no wipe → hub handling, `grantCreatureIfUnowned(UNICORN.id)` on any `FightResult`
   (`'win' | 'loss' | 'draw'`, `engine/types.ts:187`). "The store doesn't enforce that order" is
   right: the only guard is the empty-party throw (`:879-881`), and `balance-sim.ts:1036-1037` calls
   `setSpec` then `runScriptedIntro` as the text says. ROADMAP Phase 7 "Decided, not built" (:362-365)
   holds the story beat.
3. **Dead link: resolved.** See the heading list above.
4. **G:172, Phase 8 equip options: resolved.** `spec/creatures.md:241-242` says the offered spells
   come from the cumulative pool (`unlockedAtBiome` ≤ the current biome) and links the right
   heading. It says no more than the old clause.
5. **G:1223, equipped references: resolved.** `spec/saves.md:32-33` carries "from Phase 8 with their
   equipped gem and equipment references". Same content as the old sentence.
6. **4.2-B sentences with no C unit: resolved by trace.** The G:1124 and G:107 rows now record the
   B rows and the renamed anchors. Both sentences exist where the rows say (`spec/progression.md:29`,
   `spec/run.md:125`). Both are true against `src/data/specializations.ts` (round 1).
7. **"No phase is scheduled yet": resolved.** `spec/run.md:303` says Phase 10 builds it, and
   `ROADMAP.md:391-392` (under "Phase 10 — Polish & deploy") carries the entry.
8. **G:77, re-walk wording: resolved.** `spec/run.md:12-14` no longer conflicts with "Fresh every
   visit"; `descend` still accepts any floor up to `deepestFloor + 1` (`store.ts:508`).
9. **G:361, party arrangement: resolved.** `spec/store.md:47-49` matches `setPartySlot`
   (`store.ts:659-668`): the occupant of the target slot takes the placed instance's old place. When
   the instance was in another slot (`from !== -1`), `activeParty[from] = displaced`; when it was on
   the bench, the overwritten occupant is the bench. `spec/creatures.md:100-101` links it.

## Findings

None.

## Spec and code disagree

None.

## Notes (not findings)

- `ROADMAP.md:362` and `:391` each carry "(decided at the 4.2-C condense)", a provenance tag in a
  living doc. 4.2-F condenses ROADMAP, so it will meet them there.
- `spec/creatures.md:202` says the Unicorn is granted at floor 0. That holds because the intro is
  run at a new game (`spec/run.md:196`); `runScriptedIntro` is callable at any depth, so a caller
  that ran it later would roll the Unicorn's gems deeper. The text already says the store doesn't
  enforce the order, so I don't count it.

## Stale comments in `src/` (for 4.2-G)

Carried over from round 1, still present; nothing new this round.

- `src/engine/balance-types.ts:24`: "SINGLE Math.round at the end"; `curves.ts:20` and the code use
  `Math.floor`.
- `src/engine/balance-types.ts:34`: `levelRangeWidth` "Default 2, 1 (Phase 4's own width rule,
  unchanged by 4.1)"; `data/balance.ts:16` is `{ base: 0, perTenFloors: 1 }`.
- `src/engine/balance-types.ts:37`: `bossLevelOffset` "Default 3"; `data/balance.ts:17` is 5.
- Citations of `CONVENTIONS "…"` / `GAME_DESIGN §…` in `generation.ts`, `store.ts`, `rewards.ts`,
  `leveling.ts`, `curves.ts` and `balance-types.ts` are 4.2-G's conversion work.
