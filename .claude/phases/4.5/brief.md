# Phase 4.5 — Fixes and the run-loop demo

**Status: planned.** Decided with the design owner on 2026-10-12. Two parts: the fixes listed under
"Decided, not built" (4.5-A to 4.5-F), then the throwaway run-loop demo (4.5-G1, 4.5-G2), which
replaces the stub on the live site and covers Phases 4 and 4.1. The docs are the spec; this
brief places each decision in a slice, with its golden policy. If this brief and the docs disagree,
the docs win: flag the conflict, don't guess.

## Why this order

- **Fixes before the demo.** The demo plays real descents, and the level-up fix changes what it
  shows between fights. Every fix that moves balance also changes what a pinned demo seed plays, so
  the demo is built and pinned against the final engine.
- **The demo before Phase 5.** If the run loop were first exercised in a browser after persistence
  lands, run-loop bugs and save bugs couldn't be told apart.
- **The 3.5 demo is retired in 4.5-A.** It imports five of the placeholder traits and two of the
  spells this phase removes, and a demo may not import `__fixtures__`
  (`CONVENTIONS.md#every-feature-phase-ships-a-demo`). Keeping it alive would mean copying them into
  throwaway code that 4.5-G1 deletes. The live site shows a stub from 4.5-A until 4.5-G1.

## Slices

| Slice | Contents | Golden policy |
| --- | --- | --- |
| **4.5-A** | [Placeholder traits move to test fixtures](#placeholder-traits-move-to-test-fixtures), [one copy of Splashing's adjacency lookup](#one-copy-of-splashings-adjacency-lookup), retire the 3.5 demo | Byte-identical |
| **4.5-B** | [`on-death-observed`](#on-death-observed), [`createCombat` validates its trait registry](#createcombat-validates-its-trait-registry) | Deliberate, listed |
| **4.5-B2** | [Every pass over the living creatures goes in turn order](#every-pass-over-the-living-creatures-goes-in-turn-order) | Deliberate, listed; CI balance verdicts re-checked |
| **4.5-C** | [A dead creature's turn is skipped entirely](#a-dead-creatures-turn-is-skipped-entirely), [`resolveTurn` refuses a finished fight](#resolveturn-refuses-a-finished-fight) | Deliberate, listed; CI balance verdicts re-checked |
| **4.5-D** | [HP% qualifiers](#hp-qualifiers-pick-by-hp), [Thorns](#thorns-answers-only-attacks-and-spells), [Last Stand](#last-stand-rolls-only-above-1-damage) | Deliberate, listed; CI balance verdicts re-checked |
| **4.5-E** | [Spell clean-up and Thorn Volley](#spell-clean-up-and-thorn-volley) | Deliberate content change; CI balance verdicts re-checked |
| **4.5-F** | [Level-ups after each fight](#level-ups-after-each-fight), [the per-fight record](#the-per-fight-record) | Engine goldens and the corpus digest byte-identical; store tests change; CI balance verdicts re-checked |
| (4.5-F2) | Tuning, only if a CI balance verdict flipped ([Balance verdicts](#balance-verdicts)) | Content numbers, deliberate |
| **4.5-G1** | The demo's descent loop and viewer ([The demo](#the-demo)) | Byte-identical ([Demo golden rule](#demo-golden-rule)) |
| **4.5-G2** | The demo's hub ([The demo](#the-demo)) | Byte-identical ([Demo golden rule](#demo-golden-rule)) |

Each slice's mailbox holds its own `brief.md`. Why the cuts fall where they do:

- **B, B2 and C are separate** because each changes event order: B and C in any fight with a
  death, B2 wherever two creatures react to one hook. In one PR, a single golden's diff would
  interleave two kinds of change, and "only the listed kind" could no longer be checked line by
  line.
- **D is one slice**: the HP% fix touches `warden` and `support` role-script fights, the two perks
  only Shieldbarer-perk fights. They barely overlap and both are small.
- **E carries the whole spell change**: deleting two spells changes every generated loadout, so it
  can't ride in a byte-identical slice, and mixing it with a mechanism fix would swamp that fix's
  golden attribution.
- **F is last of the fixes**: it moves balance the most, and the demo shows it directly.
- **G is split for review size**: G1 holds the timer and playback risk; G2 only adds controls to
  G1's screens.

## Sequencing rules

- Sequential branch-off: each slice branches from `main` after the previous one merges.
- Golden policy per slice as above, one per PR (`WORKFLOWS.md#golden-policy-one-per-pr`).
- Each fix slice's PR review folds its item into the spec and content docs and removes the item's
  `**Known bug:**` line where it has one; the item's entry here stays as the record of intent.

### Balance verdicts

- B2, C, D, E and F each re-run the balance simulator and report the CI verdicts (floor 1, first soul,
  floor 5) and the round-cap draw rate before and after.
- **No tuning inside a fix slice.** A fix that flips a CI verdict stops and asks Duncan. At most one
  tuning slice (4.5-F2) runs after F, against all the fixes together: tuning after each fix would
  be undone by the next one.
- Watch point for the reports: on `main` before this phase, a naive policy (plain role scripts,
  every soul summoned at 100%) ended a good share of floor 7–8 descents in a round-cap draw, with
  fights of 1,500–2,000 beats. A hint, not a measurement (it isn't the simulator's policy); it
  fits `OPEN_QUESTIONS.md#status-only-aoe-recasts` and `OPEN_QUESTIONS.md#fight-length`.

### Demo golden rule

- G1 and G2 change no engine or store code, and every golden, store test and the corpus digest stay
  byte-identical. A deliberate change is allowed only for a good reason, and only with the approval
  of both the design agent and Duncan at build time: it is a stop-and-ask, never the coding agent's
  call.

## Decided, not built

### Placeholder traits move to test fixtures

- The nine placeholder traits in `src/data/traits/core.ts` (Brutish, Bloodlust, Swift Striker,
  Retaliate, Grudge, Reckless, Vengeful, Reeling, Catastrophic Collapse) move out of game data into
  engine test fixtures, and out of `TRAIT_REGISTRY`. Every golden and the corpus digest stay
  byte-identical: the goldens that use them read them from the fixtures.
- Placeholder content does not live in production registries
  (`CONVENTIONS.md#mechanism-goldens-vs-content-goldens`).
- `data/traits/core.ts` is left empty and is deleted. A carrier library has no `core.ts`: it is one
  file per biome, plus `starters.ts` for the trait library. The PR review rewrites
  `CONVENTIONS.md#effect-carriers-live-in-libraries` to match for traits; 4.5-E's does it for
  spells.

### One copy of Splashing's adjacency lookup

- Splashing (`engine/actions.ts`) uses a private copy of `adjacentLivingTargets`, byte-identical to
  the export in `engine/targeting.ts` that only `targeting.test.ts` calls, so that test pins code
  Splashing doesn't run. `actions.ts` imports the `targeting.ts` export and the private copy is
  deleted (goldens byte-identical).

### on-death-observed

- Death observation joins the other two observation hooks: `on-ally-death` and `on-enemy-death`
  become one `on-death-observed`, fired when a creature dies on every living creature except the
  dead one, with the same `ObservationFilter` `relationship` (`ally`, `enemy`, `any`), compared
  with the dead creature, in the standard tie-break order (side → slot → id), like
  `on-action-observed` and `on-damage-observed`. `on-death` and `on-kill` stay separate
  (actor-self hooks).
- **A creature never observes its own death**: its own death is `on-death`. The dead creature is
  left out by id, not by `alive`, so one revived before its death's observers fire still doesn't
  observe it, and the load-time validator rejects `relationship: 'self'` on `on-death-observed`.
- It **fails closed** like the other two observation hooks: a candidate is skipped when the dead
  creature can't be found, with or without a filter, so the hook never fires without the death it
  observes.
- The 8 trait triggers on the two old hooks move over: 7 in game data (`data/traits/glimmerdark.ts`,
  `data/traits/rotcap-hollow.ts`) and Grudge's, in the test fixtures after 4.5-A. The Rot
  Sovereign's pair becomes one `any` trigger.
- Deliberate golden change: the hook name in `TriggerFired`, and the firing order on an enemy's
  death (today the dead creature's allies all fire before its enemies).
- The PR review rewrites `spec/effects.md#hooks`, `spec/effects.md#damage-path-hook-order`,
  `spec/effects.md#action-reactions-actor-self-hooks-or-observation`,
  `spec/effects.md#damage-observation` (which filter field belongs to which hook) and
  `spec/effects.md#count-scaling` (its `on-ally-death` example) to match (17 hooks become 16).

### createCombat validates its trait registry

- `validateTrait` moves to `engine/effect-types.ts`, beside `validateStatusDef`, and `createCombat`
  runs it over the trait registry it is given, as it already does for statuses
  (`spec/effects.md#validators`): a test fixture's trait is held to the same rules as a shipped
  one. `data/traits/index.ts` keeps its load-time loop over `STOCK_TRAITS`, calling the engine
  export; the test that validates the fixture traits stays, since some of them never reach
  `createCombat`.
- Byte-identical for every valid fight. A test that hands `createCombat` an invalid inline trait
  starts throwing: a stop-and-ask, never a quiet fix.
- It rides in 4.5-B because that slice already changes the trait validator for the new hook.
- The PR review adds the trait rule to `spec/effects.md#validators`.

### Every pass over the living creatures goes in turn order

- Every pass over the living creatures goes in **turn order**: the hooks fired over all of them
  (`on-action-observed`, `on-damage-observed`, `on-death-observed`, `on-fight-start`,
  `on-round-end`) and the Web break-free roll. Turn order is the act-first pole, the normal
  group, then the act-last pole, each by descending effective Speed, ties side → slot → id. It is
  `buildTurnQueue`'s ordering read live when the pass runs, not the round's frozen queue: there is no queue at fight start, and a creature revived mid-round has no
  place in it. The order is taken once per pass, so a response that changes a creature's Speed
  doesn't reorder the rest of that pass. Side → slot → id remains only as turn order's tie-break
  and the extremum picks' (`spec/scripting.md#target-selectors-in-the-engine`).
- Design intent: under side → slot → id the player side always reacts first, an advantage nobody
  chose (two carriers of one `stacks: false` trigger, one per side: the player's always gets the
  roll). In turn order the faster creature reacts first, a lever the player can see and build for:
  acting first and reacting first are one rule.
- The order reads `slot`, so no pass depends on a party array being in slot order.
- The order is computed fresh for every pass and never cached: a cache of it would be derived
  state that can go stale. The cost, an effective-Speed read per living creature per pass, is
  accepted.
- In the Web break-free roll (`spec/statuses.md#turn-order`) each bearer's chance is its own, so
  the order decides only which draw goes to which bearer: no bearer's odds change.
- Deliberate golden change: the order of the firings within one multi-creature hook call, each
  `TriggerFired` with its consequences, where two or more creatures fire on one call; the Web
  rolls' draw assignment where two or more bearers roll in one cleanup; and any fight whose RNG
  draws move with either.
- The PR review rewrites `spec/effects.md#hook-execution`,
  `spec/effects.md#action-reactions-actor-self-hooks-or-observation`,
  `spec/effects.md#damage-observation`, `spec/effects.md#stacks-false` (which carrier gets the
  chance), `spec/combat.md#turn-queue` (the ordering is shared) and `spec/statuses.md#turn-order`
  (the Web roll's order) to match.

### A dead creature's turn is skipped entirely

- A creature that is dead when its slot in the frozen queue comes up gets no
  `TurnStarted`/`TurnEnded` bracket, no turn-clock bump and no Web roll: nothing happens for it. A
  creature that dies during its own turn keeps that turn's cleanup and Web roll, since the turn
  happened. Web's break-free roll becomes "at every living creature's turn", so a Web gets
  stickier as the board empties (about 72% per round only in a full 6v6), still capped by its
  3-turn duration.
- **Nothing else reads a dead slot.** The poles are built once per round from the living
  creatures (`buildTurnQueue`). `acted-before-target` reads queue positions, but skipping dead
  entries can't change the order of two living creatures, and a dead creature is never a target.
  Every born-this-turn read (the countdown, the turn-end tick gate, the Web roll) runs after the
  acting creature's own clock bump, so fewer bumps change no born-this-turn result. The frozen
  queue keeps its dead entries; they are skipped when dequeued, not removed from the queue.
- **One `resolveTurn` call is one turn.** A call dequeues past dead entries to the next living
  creature and resolves its turn, crossing the round boundary (round end, the round-cap gate, the
  next round's queue) when the dead entries end the round; or it ends the fight. A dead slot never
  gets a call of its own, so a stepping caller (manual mode, a golden's `TURN_STEPS`) counts only
  turns that happen.
- A creature acts if it is alive when its slot comes up (`spec/combat.md#turn-queue`): the slice's
  tests pin a revive before the slot (it acts) and a creature dead at round start (no turn that
  round).
- Deliberate golden change for every fight where a creature dies before its turn: the bracket
  events, and the Web roll's RNG draws. A stepped golden's `TURN_STEPS` drops by the dead slots in
  its window. The turn clock appears in no event.
- The PR review rewrites `spec/combat.md#resolver-shape`, `spec/combat.md#turn-queue`,
  `spec/combat.md#turn-structure`, `spec/statuses.md#self-clearing-statuses`
  (the 72%), `spec/statuses.md#born-this-turn` and `spec/statuses.md#turn-order`, and
  `content/overgrowth.md#web`.

### `resolveTurn` refuses a finished fight

- `resolveTurn` throws when the state it is given already has a result. Today it plays on: the
  next creature's turn, round-end triggers, Web rolls and a second `FightEnded`, all after the
  fight ended (the result itself never changes).
- No shipped caller reaches it (`resolveFight` stops at the result), but manual mode and playback
  step with `resolveTurn` (`spec/combat.md#resolver-shape`). A stepping caller that misses the
  end, or a golden whose `TURN_STEPS` overshoots it, fails loudly instead of logging events after
  the fight.
- Byte-identical: no existing golden or test steps past the end.
- It rides in 4.5-C, which already changes what one `resolveTurn` call does.
- The PR review adds the rule to `spec/combat.md#resolver-shape`.

### HP% qualifiers pick by HP%

- An `hp-percent` condition's `lowest` or `highest` qualifier tests the creature with the lowest or
  highest HP%, compared by integer cross-multiplication with the shared tie-break
  (`spec/scripting.md#conditions-in-the-engine`). Today `evaluateCondition` picks it by current HP.
- Users: the `warden` and `support` role scripts' first rules, so it is a deliberate golden change
  for fights with either role.

### Thorns answers only attacks and spells

- Thorns (`specializations/shieldbarer.md#thorns`) answers only damage from an attack or a spell.
  Today it answers any damage with a source, trait and perk hits and other retaliations included.

### Last Stand rolls only above 1 damage

- Last Stand (`specializations/shieldbarer.md#last-stand`) rolls only when the lethal damage is
  more than 1. Today it rolls on any lethal damage, so a creature left at 1 HP rolls again on a
  1-damage hit.

### Spell clean-up and Thorn Volley

- **Ember Lance and Venom Bolt are deleted**: no niche (Venom Bolt overlaps Stinger Swarm).
- **Cinder Nova becomes Thorn Volley**, real biome-1 content and the pool's only plain AOE damage
  spell: Violence · every enemy · **45%** of the caster's Intelligence to each, the area sibling of
  Thorn Lash. 45% is "about 50%" under `content/overgrowth.md#spell-power-convention`, so the
  convention stands. It moves to `data/spells/overgrowth.ts` and the Overgrowth spell list;
  `data/spells/core.ts` and the content doc's "Core spells" section are deleted, so the spell
  library has no `core.ts` either
  (`phases/4.5/brief.md#placeholder-traits-move-to-test-fixtures`).
- All three spells are in the biome-1 roll pool (`unlockedAtBiome: 1`), so this changes every
  generated loadout: a deliberate content change (content goldens, the corpus digest, the balance
  bands). After it, Instinct has exactly 3 biome-1 spells (Howling Instinct, Pounce, Stinger
  Swarm): the ≥3 data test (`spec/run.md#enemy-script-and-gem-set`) passes with no slack.

### Level-ups after each fight

- `descend` applies each fight's XP before the floor's next fight, so the party fights it at its
  new levels (`spec/run.md#rewards`). Today it materializes the party once per descent and applies
  the floor's XP after the whole floor.
- The fix moves balance, so the CI verdicts are re-checked in the same PR.

### The per-fight record

- `FloorOutcome` gains one record per fight resolved: that fight's events, the XP it banked, the
  party's levels after it, **the fight's combat seed**, and **both parties as they entered the
  fight** (the `Creature` snapshots: name, level, gems, role script).
- The record replaces `FloorOutcome.fightEnemyIds`: the balance simulator reads each fight's enemy
  roster from the record's enemy party, and the field goes.
- Seed and parties reproduce the fight outside the store (`createCombat` + `resolveFight`), so a
  fight seen in the demo becomes a test. The demo reads names, gems and per-fight levels from the
  record; it never parses creature ids (`spec/run.md#rewards-are-a-run-layer-consumer-of-the-event-log`).
- The PR review writes the record into `spec/store.md`.

## The demo

The throwaway run-loop demo (`CONVENTIONS.md#every-feature-phase-ships-a-demo`), in `src/app` and
`src/ui`. **Purpose:** drive the run loop end to end through the real store, *and* show off combat
as it stands. Presentation stays as plain as the 3.5 demo: a paced text log, no sprites or bars.

### Store use

- One real `createGameStore`. The demo keeps UI state only (which screen, playback position), never
  game state. Every `can…` query greys out its control, with the refusal reason shown as text.
- Every public store action has a control except `pinBiome` (it belongs to the Biome Atlas,
  `spec/run.md#facilities`). `recordBossKill` sits under a **Debug** heading, so perks and spec
  switching can be checked in a browser: perk points otherwise need a first boss clear.

### Start screen (G1)

- A spec pick (Brute, Shieldbarer, Sorcerer) and a seed field (blank: `generateRunSeed`, in
  `src/app`). Start runs `newGame({ seed })` → `setSpec` → `runScriptedIntro()`, **silently**: the
  intro's result isn't shown. That grants the Unicorn and keeps a demo run identical to the balance
  simulator's for the same seed.

### Floor picker (G1)

- A floor number field pre-filled with `lastFloor`, a **Deepest + 1** button that fills in the next
  floor down, and **Descend**. The field takes any number, so `floor-out-of-reach` and
  `beyond-content-frontier` are seen as greyed-out reasons.
- One line on the chosen floor: biome, fight count, and "boss floor" when it is one, read from the
  engine's pure functions. No enemy level range. No auto-descend.

### Descent result and viewer (G1)

- `descend` resolves at once. The floor's result and its **fight list** (number, result, rounds,
  kills, XP and level-ups) show for a few seconds, then paced playback starts at fight 1 by itself.
- The viewer keeps 3.5's beats and **skip to end of fight**, and adds **skip to end of floor** and
  **jump to a fight** from the list. Speeds: **1×, 3×, 5×** (500, 167, 100 ms per beat).
- Its header shows "Fight n / N" with the party's levels going into that fight, and the XP and
  level-ups after it: where the level-up fix is visible.
- The log reuses 3.5's event text and beat grouping (moved, not rewritten) and shows **names**, not
  ids. Each fight opens with a line-up of both sides: name, level, HP.
- A boss floor adds one result line: the boss defeated, and whether it was a first clear (+100 perk
  points) or not, by comparing `bossesCleared` before and after.
- Only the latest descent's log is kept; any of its fights can be replayed from memory.
- **Debug: Copy fight as JSON** on each fight: its seed and both parties.

### Side panel (G1)

- Always visible, reading the live store: spec, seed, deepest and last floor, discovered biomes,
  bosses cleared, perk points (earned, spent, free), the four currencies with a line that nothing
  spends them yet, and a line that there is no saving yet, so a reload starts over.
- Soul % and XP and level live in the hub sections only.

### Hub (G2)

- **Party:** six rows, each a dropdown of the owned instances plus "empty", calling `setPartySlot`;
  the store's swap semantics do the rest (`spec/store.md#store-actions`). Slot order matters: it
  breaks Speed ties and decides Splashing's adjacency.
- **Collection:** every owned instance outside the party, one line each: name, level, XP to the
  next level, affinity, rarity, role script, traits, and its three gems by spell name. Party rows
  use the same line.
- **Souls:** every creature with soul progress above 0, its %, and **Summon** (`canSummon`'s reason
  shown; duplicates allowed, `spec/creatures.md#souls`).
- **Perks** of the current spec: name, level / max, cost per level, a level field (`setPerkLevel`
  takes the absolute level), `canSetPerkLevel`'s reason shown, and **Refund all**. A perk whose
  `resolvePerkEffects(perk, maxLevel)` is empty is labelled inactive (exact: the data test in
  `specializations.test.ts` holds both directions). Names only: `PerkDef` has no player-facing
  text.
- A **spec switcher**, always available, noting that a switch refunds every perk
  (`spec/progression.md#swapping-specialization`), and **New game**, back to the start screen.
- **Debug: Record boss kill**, calling `recordBossKill`.

### Tests and verification

- The demo's logic lives in pure helpers in `src/app` with plain unit tests (the log split, the
  fight-list rows, the inactive-perk label, the line-up and creature lines, the refusal text).
  Components stay thin. No new dev dependency.
- One presence smoke test at a pinned seed, driving the store as the UI does: new game → spec →
  silent intro → descend floor 1. It checks the starter and the Unicorn are owned, 10 fight records
  each with a seed and both parties, at least one level-up between two fights, and the refusal
  reasons for floor 31 and an empty party.
- The report's browser click-through covers every control once, every refusal reason on screen,
  the three speeds, skip fight, skip floor, jump, a spec switch refunding perks bought through
  Debug, no stacked timers when clicking around mid-playback, and **a copied fight's JSON pasted
  into a scratch test reproducing that fight's log byte-identically**. The live URL is checked
  after merge.

## Assumptions

Choices this brief made that the grill didn't pin. Each slice's plan confirms or corrects its own.

- [x] **ASSUMPTION (A):** the stub that replaces the 3.5 demo is one line of text with the game's
      title; no controls.
- [ ] **ASSUMPTION (G1, G2):** player-facing strings carry no phase ids, because
      `npm run docs:check -- comments` fails a string literal holding one
      (`CONVENTIONS.md#comment-why-not-what`). So the inert-perk label reads "inactive (its system
      isn't built yet)", the currency line "Nothing spends these yet", and the save line "No saving
      yet: reloading the page starts over".
- [ ] **ASSUMPTION (G1):** "a few seconds" before playback starts is 3 seconds.
- [ ] **ASSUMPTION (F):** the per-fight record's type and field names are the plan's; its contents
      are fixed above.
- [ ] **ASSUMPTION (F2):** the tuning slice is named 4.5-F2 if it runs.
- [x] **ASSUMPTION (B2):** turn order covers every hook fired over all living creatures (the three
      observation hooks, `on-fight-start` and `on-round-end`), not the observation hooks only. (The
      Web break-free roll is in by Duncan's call.)
