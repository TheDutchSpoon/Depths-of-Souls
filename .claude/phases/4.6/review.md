# Depths of Souls: review of `main` against the specs (combined)

**What was reviewed:**
- `main` at `8aef772` (the merge of PR #114, slice 4.5-G1).
- The living docs (`.claude/` outside `phases/` and `archive/`).
- The 4.5 brief's "Decided, not built" items, all merged except 4.5-G2.
- The wording of every trigger in the content and specialization docs.

**Mode:** read-only. Nothing in the repo was changed. Runtime checks ran in a scratch copy.

**Date:** 15 Oct 2026.

This report merges the code-vs-spec review and the trigger-wording review. Every finding has a stable ID. The arrow after it (→ C) names the Phase 4.6 slice the companion proposal (`proposal.md`) assigns it to; the brief written from that proposal decides. "→ design pass" means the doc sync in the session that writes the brief. This is a snapshot at `8aef772`: that session re-verifies each finding against current `main` before acting on it.

## Summary

- **The gates all pass**, and every 4.5 fix is built as decided. There are no `**Known bug:**` lines on `main`, so every divergence below is a finding.
- **Six bugs affect real play** (section 1). Five of them need a design call before they can be fixed, because the spec is silent or two rules disagree.
- **Eight behaviours are built as documented, or as the engine rules imply, but need a design call** (section 2). One example is the Spider Weaver Webbing on turns it casts.
- **One latent bug becomes reachable in 4.5-G2.** `recordBossKill` accepts any id, and an unknown one crashes the side panel (L1).
- **Most of the rest** is either:
  - doc fixes, or
  - byte-identical hardening.

| Section | IDs | Count |
| --- | --- | --- |
| 1. Bugs in real play | B1–B6 | 6 |
| 2. Built behaviour that needs a design call | D1–D8 | 8 |
| 3. Spec contradictions and gaps | S1–S11 | 11 |
| 4. Latent bugs | L1–L15 | 15 |
| 5. Trigger wording | W1–W12 | 12 |
| 6. Content docs vs data | C1–C6 | 6 |
| 7. Convention and doc drift | V1–V13 | 13 |
| 8. False comments and citations | M1–M17 | 17 |

**Confidence labels:**
- **run:** a test reproduced it.
- **corpus:** counted across the 525 corpus fights.
- **read:** confirmed by reading the code against the rule.
- **×2:** two auditors found it independently.

## How this was checked

- **Gates on a fresh `npm ci`:**
  - `npm run test`: 246 files, 2,151 passed, 1 skipped (the opt-in sim report).
  - `lint`, `format:check`, `build` and `tsc --noEmit` all pass.
  - `docs:check citations`: PASS (691).
  - `docs:check comments`: PASS.
  - `docs:check budgets`: none over. `spec/effects.md` is at 96%.
  - The local run used Node 22.22; CI uses Node 24.
- **Corpus invariant scan:** I stepped all 525 corpus fights turn by turn and checked each event log against the state. It came back clean:
  - no dead creature acts, is targeted or gets a turn;
  - no events after `FightEnded`;
  - HP and `alive` agree with the state after every turn;
  - no creature gets two turns in a round;
  - every fight has exactly one `FightEnded`.

  51 of 525 fights end in a round-cap draw with both sides alive. That's not a bug, but it is relevant to `OPEN_QUESTIONS.md#fight-length`.
- **Trigger-timing scan:** a second pass over the corpus classified when each content trigger fires. The *corpus* counts below come from it.
- **Seven area audits:**
  - combat;
  - effects and responses;
  - statuses and scripting;
  - run, creatures and progression;
  - store and demo;
  - content docs;
  - CONVENTIONS.
- I re-checked every finding against the code and the spec before including it.

---

## 1. Bugs that affect real play

### B1. Lullpollen Sleeper's Sleep never sticks (run, corpus) → C

- **Rules:**
  - `content/overgrowth.md#lullpollen-sleeper`: "When it attacks, it has a 40% chance to put its target to Sleep."
  - `spec/statuses.md#self-clearing-statuses`: Sleep "ends the instant its bearer takes any damage."
- **Code:** `src/data/traits/overgrowth.ts:313-327` fires on `on-attack`, which runs before the hit (`actions.ts:489`, then `dealDamage` at `:508`). The hit then fires Sleep's own wake trigger, `on-damage-taken → remove-status`.
- **Effect:**
  - Every Sleep the Sleeper lands is applied and removed inside the same attack. No turn is skipped.
  - The Reaper's +50% and the Dozer's per-Sleeping bonus never see a Sleeper Sleep.
  - The 40% roll still uses up RNG.
- **Corpus numbers:**
  - 83 Sleeper Sleeps: 77 expired in the same turn; the other 6 were still on when the fight ended.
  - None lasted to a later turn.
  - For comparison, spell Sleeps outlasted their turn 2,285 times out of 3,191.
- **Why a simple fix doesn't work:** moving the trigger to another hook doesn't help. The dealer's `on-damage-dealt` fires before the target's `on-damage-taken` (`resolution.ts:370-375`), so the wake still catches it. → Q1

### B2. A confused Splashing or Annihilate attacker splashes the wrong side (run ×2) → C

- **Rules:**
  - `spec/effects.md#splashing-and-annihilate`: splash "strikes each adjacent living enemy … or with Annihilate every other living enemy".
  - `content/rotcap-hollow.md#confusion` and `spec/combat.md#targeting-override`: Confusion turns the action on the bearer's own side.
- **Code:** `actions.ts:443-450`. `splashTargetIds` always reads the actor's opposing party, wherever the main hit went.
- **Effect when Confusion redirects the main hit:**
  - **Splashing alone:** nothing splashes.
  - **Splashing + Annihilate:** an ally (or self) is hit, *and* every living enemy takes a full hit. Annihilate largely cancels Confusion.
  - Reproduced: the log showed `brute→brute 30`, then 30 each to `e0`, `e1` and `e2`.
  - Both pieces are shipped: Annihilate is a Brute perk, and Rotcap Hollow confuses.
- **Test gap:** no test puts a `damageChannel` retaliator on a splash target (`actor-death.test.ts:212` uses one without the field). The splash site's channel is unpinned.

→ Q2

### B3. Bulwark's Defend count survives a revive (run) → C

- **Rules that disagree:**
  - `spec/effects.md#death-reset`: "A revive replaces them all … a revive is a second chance, not a buff-preserving undo."
  - `specializations/shieldbarer.md#bulwark`: "for each time the creature has Defended **this battle**."
- **Code:** `resolution.ts:1194-1210` resets `defending`, `provoking` and the effects, but not `defendCount`. `types.ts` documents `defendCount` as "NEVER reset".
- **Effect:** a revived Bulwark bearer comes back with up to the full 80% reduction. Reachable with the Unicorn plus Shieldbarer perks.

→ Q3

### B4. "+% damage with attacks" bonuses boost response hits too (read; run by the content audit) → C

- **Rules:**
  - `specializations/brute.md#brute-force`: "+1% damage with attacks per level".
  - `spec/effects.md#conditional-damage-bonus`: Brute Force "must not leak onto the other action kind".
  - `spec/effects.md#traits`: only a trait-granted Attack or Cast counts as one; every other trait damage is indirect.
- **Code:** response damage is passed as action kind `'attack'`:
  - `resolution.ts:182-185` (scalingStat mode);
  - `:956` (flat mode);
  - `:990` (offStat mode);
  - `gatherConditionalDamageBonus` (`:207-222`) then matches `actionKind: 'attack'`.
- **Effect:** Brute Force (up to +100%) applies to:
  - Snapjaw Jaws retaliations, Thorns and Shellback Bulwark;
  - the bonus hits of the Broodwarden, the Dozer, the Broodmother and the Sporecloud Reaper (the last scales off Intelligence and still counts as an "attack");
  - the Drone's death sting.

  Reproduced: a Jaws retaliation hit for 30 at Brute Force 0 and for 60 at Brute Force 100.
- **Spec gap:** `spec/combat.md#the-damage-channel-in-the-engine` includes the conditional bonus in a response's dealt pool, but never says which action kind a response is.

→ Q4

### B5. An extra AOE instance runs after its side is already wiped (run) → C

- **Rules:** `spec/combat.md#resolution--timing`: "The fight ends the instant a side has no living creature." `#aoe-cast` doesn't say what a later instance does against an empty side.
- **Code:** `actions.ts:656-713`. Every instance re-freezes its targets, then pushes `SpellCast` and fires `on-cast` and `on-action-observed`, even with an empty set. The single-target path stops instead (`:611`).
- **Effect:** when an Echo Sorcerer's first Thorn Volley wipes the enemy side, the log shows `SpellCast { targetIds: [] }` and cast hooks firing before `FightEnded`.
- **Unpinned:** the corpus has no such fight (the invariant scan found no empty AOE set), so no golden or digest row covers it.

→ Q5

### B6. Shield up, Phalanx and the Snapjaw Lure never count as Defending (run) → C

- **Rules:**
  - `specializations/shieldbarer.md#shield-up`: "On provoke, the creature also defends."
  - `#bulwark`: "each time the creature has **Defended**".
  - `#defensive-stance`: "On defend".
  - `#phalanx`: "start each battle defending".
- **Code:** these use `grant-action-state { defending: true }` (`specializations.ts:385-401`). `defendCount` and `on-defend` are bumped or fired only in `executeDefend` (`actions.ts:718-745`). `spec/responses.md#grant-action-state` says the verb "is not an action", so the code follows the spec and the perk docs promise a synergy that doesn't exist.
- **Effect:**
  - The Stonehorn Warden starter runs `warden`, which Provokes and never takes the Defend action. With Shield up, Bulwark (100 points) and Defensive Stance (up to 10 levels) do nothing for it.
  - Reproduced: 3 Provokes, `defendCount` 0, `on-defend` fired 0 times.
  - The player can't change scripts until Phase 6.

→ Q6

---

## 2. Built behaviour that needs a design call

All of these work as documented, or as the engine rules imply. The question is whether that's what you want.

### D1. The Spider Weaver Webs on every turn, not only when it attacks (corpus) → D

- **What's built:**
  - **Doc:** `overgrowth.md#spider-weaver`: "At the end of its own turn, applies Web to a random living enemy."
  - **Data:** `on-turn-end` with a `random-enemy` target. It fires whatever the Weaver did that turn, a skipped turn included.
  - **Corpus:** 525 Weaver Webs: 511 after a turn spent casting, 13 after a skipped turn, 1 after a Wait, and **none after an attack**. The Weaver runs `caster`, so it never attacked in any fight.
- **History:**
  - Phase 4 first shipped it as `on-attack → Web the attack's target`.
  - The Phase 4 redesign pass moved it to turn start, "decoupled from attacking entirely" (`archive/phases/phase-4-party-specializations-cave-biomes.md:1681`).
  - 4.1-F2 moved it to turn end.

  So attack-only is a new content decision.
- **The catch:** the hook alone isn't enough. A caster with `on-attack` would almost never Web.

→ Q7

### D2. Two payoff traits read Attack on caster-role creatures (read) → D

- **Pollinator Beneficiary:**
  - Doc: "Its attacks deal additional damage equal to 30% of its own effective Speed".
  - Data: `cross-stat … appliesTo: 'attack'` on a `caster` (`species/overgrowth.ts:242`).
- **Resonant Chorus:**
  - Doc: its Attack rises 5% whenever an ally casts.
  - Data: also a `caster` (`species/glimmerdark.ts:163`).
- **Why it matters:** a caster attacks only when it can't cast, and every enemy holds 3 castable spells. So both traits matter roughly only on Silenced turns.

→ Q8

### D3. Fight-start "raises maximum Health" leaves the team injured (run) → C

- **Who:** Treant Grovekeep (+15% team), Treant Sapling and Rotfeeder Gorgemaw.
- **Why:** these are `on-fight-start` stat modifiers, so they fire after setup has set HP. `spec/statuses.md#health-is-a-modifiable-stat` says a Health buff "does not heal into it".
- **Effect:** with Grovekeep the team opens at 100/114 HP (87.7%). From turn 1:
  - the Flickerling Wick burns;
  - "injured" conditions read true;
  - HP% script rules read the lower value.
- **Contradiction:** the same rule's "a +Health trait grants the HP" only holds for a passive modifier present at setup.

→ Q9

### D4. "When it attacks" effects resolve before the hit (read, corpus) → design pass (document) unless Q10 changes it

`on-attack` fires before each instance's hit (`spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles`). No content doc says so, and it changes outcomes:

- **Sparkeater Leech, Gorger, Voidmaw and the Leech Sovereign** drain before the hit, so **the same hit already uses the drained numbers**:
  - +10% Attack for the Leech;
  - −10% target Defence for the Gorger;
  - the Voidmaw's max-HP clamp lands before the hit.

  The drain happens even when the hit fizzles.
- **Bonus hits** (Broodwarden, Dozer, Sporecloud Reaper, Broodmother) land **before** the main hit:
  - A lethal bonus hit makes the main attack fizzle: no damage, no splash.
  - The bonus counts statuses or species before the main hit can change them.
- **Sporecloud Seeder:** the target is infected first. If that hit then kills it, its Spore bursts onto another enemy. **140 times** in the corpus.
- **Concussive Blows:** the Weaken lands first, so Cull the Weak boosts that same hit.
- **Confusion:** every `on-attack` effect follows a Confusion redirect onto the attacker's own ally (corpus):
  - Igniter Burns: 256;
  - Unicorn revives: 478;
  - Sporecloud Reaper bonus hits: 39;
  - Seeder Spores: 26;
  - Leech drains: 18;
  - Leech Sovereign drains: 18;
  - Marionette Confusions: 16;
  - Gorger drains: 4.

### D5. Retaliators answer allies, every instance, but never the killing blow (corpus) → C

- **Who:** Snapjaw Jaws, Shellback Bulwark, Hollowkin Wretch and Thorns.
- **What they answer:**
  - every direct hit separately: each Flurry or Echo instance, each AOE target, each splash hit;
  - never the killing hit, because `on-damage-taken` fires only on survival;
  - any creature, allies included.
- **The Wretch loop:** in the corpus the Wretch answered an ally's hit **224 times**. That ally was Confused, which is why it hit its own side, and the Wretch re-Confuses it, a loop on its own side.
- **The doc mismatch:** Thorns' doc says "that enemy".

→ Q11

### D6. What counts as a kill (read, corpus) → C

- **Who:** Gloomjaw Executioner, Rotfeeder Ripper, Rotfeeder Gorgemaw and Sporch Cinderlord.
- **What counts:** `on-kill` fires on the dealer (`resolution.ts:356-394`), which includes:
  - its trait hits;
  - **DoT ticks it applied**, while it lives;
  - **allies it kills while Confused** (Ripper: 3 in the corpus).
- **The Cinderlord loop:** its own Burn ticks killing an enemy re-Burn every remaining enemy, a self-renewing Burn the doc doesn't hint at. This is by reading; the corpus has no DoT kill.

→ Q12

### D7. "Every round it acts" buffs also fire on lost turns (corpus) → design pass

- **Who:** Swarmhive Queen, Pollinator Pollenlord and Shellback Warden.
- **Behaviour:** `on-turn-start` and `on-turn-end` fire on turns lost to Stun or Sleep too.
- **Corpus:**
  - The Shellback Warden fired on **313 of 2,039** turns that were then skipped.
  - The Seer's turn-end cast won its roll on 116 skipped turns and was refused each time.
  - The Weaver Webbed on 13 skipped turns.

→ Q13

### D8. Resonant buffs land before the cast resolves (read) → design pass

- `on-action-observed` fires after `SpellCast` but before the spell's effects. So the Adept's +8% Intelligence from its *own* cast already powers that spell.
- It fires once per cast instance, so Echo doubles it and an AOE counts once.
- Granted casts count too: the Seer's bonus cast and Overtone echoes.

---

## 3. Spec contradictions and gaps

**S1. The content frontier caps the cave at floor 100 for good.** (run) → B
- `spec/run.md#content-frontier`, with all 10 biomes authored, gives a cap of 100 (`generation.ts:543-550`).
- It contradicts:
  - `#the-cave` ("descends endlessly");
  - `#biomes` (the draw past 100);
  - `#fights-per-floor` ("uncapped");
  - `#enemy-levels` (+1 point per floor past 100);
  - `#boss-floor-generation` ("floor 101+ included");
  - `OPEN_QUESTIONS.md`.
- `pinBiome` accepts floors that can never be fought.
- Reproduced: with 10 authored biomes, `canDescend(101)` returns `beyond-content-frontier`. → Q14

**S2. `effects.md#effect-instances` contradicts `#pass-order`.** (read) → design pass
- The first says candidates are built once, at the start of the event.
- The second says they are read when each creature's place in the pass comes.
- The code (`resolution.ts:514-522`) and `pass-order.test.ts:230` follow `#pass-order`, so fix the wording of `#effect-instances`.

**S3. Two draw orders for target resolution.** (read) → design pass
- `combat.md#one-action-pipeline` has the selector *then* the override.
- `#targeting-override` and the code (`targeting.ts:72-77`) roll Confusion first, and a Provoke draw replaces the selector.
- Fix the pipeline bullet.

**S4. A zero count on `apply-stat-modifier`.** (run) → A
- `responses.md#fizzles` makes a zero count a fizzle with no events.
- `effects.md#count-scaling` names only `deal-damage` and `heal`.
- The code emits `StatModifierApplied {factor: 1}` (`resolution.ts:1111-1131`). → Q15

**S5. The intro's enemy Unicorn has no gems.** (read) → design pass
- `run.md#enemy-script-and-gem-set` says "Every enemy rolls a full set". `store.ts:1018-1023` passes none.
- The Sorcerer starter always holds Pacify, so a Pacified intro Unicorn gets an empty turn, which `#bosses-take-control-like-any-enemy` says can't happen.
- Play is unaffected, since the Unicorn joins either way. → Q16

**S6. The boss-lock probe doesn't run on every boss floor.** (read) → design pass
- `run.md#bosses-take-control-like-any-enemy` says it runs "on every boss floor".
- `balance-sim.ts:303-313` reports `n/a` unless a party creature already holds Pacify.
- Narrow the wording.

**S7. Bricks aren't "rarer" on floor 1.** (read) → design pass
- `run.md#currencies` says Bricks are rarer.
- `rewards.ts:105-114` with `bricksMinimum: 1` drops 1 of each currency per kill on floor 1.
- Reword, or park under `OPEN_QUESTIONS.md#drops-and-costs`.

**S8. The status-icon rule reads as built.** (read) → design pass
- `statuses.md#a-status-is-a-timed-effect`: "Every status shows as an icon with its remaining duration."
- No UI shows statuses. Move the rule to a Phase 7 pointer.

**S9. `store.md` leaves built behaviour unlisted.** (read) → design pass, B
- The refusal reasons for `summon` (`unknown-creature`, `soul-incomplete`) and `setPartySlot` (`slot-out-of-range`, `unknown-instance`) aren't named.
- `recordBossKill` has no failure rule (L1).
- `FloorOutcome.floor` is missing from `#a-descents-outcome`.

**S10. Turn-start cleanup is skipped when the actor dies in its own turn-start hooks.** (read) → design pass
- `combat.ts:418-429` skips it.
- `combat.md#turn-structure` doesn't list cleanup among the steps that need a living actor.
- No play effect.

**S11. The simulator keeps its own copy of the boss-floor test.** (read) → B
- `balance-sim.ts:1553/1560` uses `isBossFloor(floor) ? 1 : fightCount(…)`, ignoring whether the biome has a boss.
- `run.md#boss-floor-generation` makes `floorShape` its one home.

---

## 4. Latent bugs (unreachable with today's content and callers)

**L1. `recordBossKill` accepts any id.** (run) → 4.5-G2 note, B
- `store.ts:784` adds the id unchecked:
  - Perk points go up 100 per unknown id.
  - The side panel then throws in `bossName` (`names.ts:29`, via `sidePanel.ts:50`). With no error boundary, the app goes blank.
- `progression.md#perk-points`: points come "only from first-time boss kills".
- 4.5-G2's Debug control reaches it. → Q17

**L2. The Web break-free roll uses a stale list.** (run) → A
- `combat.ts:213-215` filters `current.activeEffects`, read once per bearer.
- A second break in one roll restores the first status, while the log says both expired.
- Fix: filter from `getCreature(working, bearerId)`.

**L3. Health changes outside `applyStatModifier` aren't clamped.** (run ×2) → A
- `validateStatModifierCondition` allows `has-status`- and `always`-gated Health modifiers.
- Applying or removing the gating status changes the max with no clamp. Reproduced:
  - HP above max, with HP% over 100;
  - `HealApplied amount: -100`.
- This breaks `statuses.md#health-is-a-modifiable-stat`. → Q18

**L4. A clamp, or a revive, can leave a living creature at 0 HP.** (run ×2) → A
- **The clamp** writes `currentHp: maxHp` with no death path, so `alive: true` at 0 HP and the creature keeps acting. This breaks `combat.md#resolution--timing`.
- **The revive** uses `round(maxHp × pct)` with no minimum (`resolution.ts:1196`). → Q19

**L5. An unknown `scriptId` silently runs the fallback.** (read ×2) → A
- `combat.ts:459`: `scripts.get(id) ?? null`.
- Unknown trait ids throw (`effects.ts:58-63`).
- Reachable in Phase 6, when templates can be deleted. → Q20

**L6. The "fresh creatures only" guard is partial.** (run) → A
- `combat.ts:96` checks only `baselineEffects` and `activeEffects`.
- A trait-less creature reused from a finished fight passes with `alive: false` and stale `defending`, `provoking` and `defendCount`. It ends the fight at once.

**L7. Side effects passed to `createCombat` aren't validated.** (read) → A
- `effects.md#validators` says "for every trigger carrier".
- `player.effects` and `enemy.effects` skip validation. Perks are validated only at import, at level 1 (`specializations.ts:76-83`).

**L8. Party-array order stands in for `slot`.** (run ×2) → A
- The array order is read in:
  - the AOE target set (`actions.ts:682`);
  - Annihilate (`:446`);
  - `adjacentLivingTargets` (`targeting.ts:152`);
  - `livingEnemiesOf` and `livingAlliesOf` (`:11`, `:20`).
- `createCombat` checks neither slot order nor id uniqueness. Slots `[2,0,1]` give `targetIds ["e2","e0","e1"]`.
- The spec says "slot order" in several places. → Q21

**L9. The `on-action-observed` filter doesn't fail closed.** (read) → A
- `resolution.ts:566-574` fires when the actor can't be found.
- `on-damage-observed` treats that case as no match (`:581-582`).

**L10. `stacks: false` claims per carrier id, not per effect.** (read) → A
- `resolution.ts:645-648` claims on `sourceTraitId`.
- So two such triggers in one trait, or a trait id equal to a status id, share one slot.

**L11. Additive taken-reduction without a cap reaches 0 or below.** (read) → A
- `effects.ts:294` uses `reductionCap ?? 1`.
- No validator requires a cap below 1.

**L12. `triggering-ally` is undefined.** (run) → A
- `responses.md#response-targets` lists it with no rule.
- `resolution.ts:719-733` treats it as `triggering-source`, so it resolves to an enemy.
- No content uses it. → Q22

**L13. Two retaliation rules aren't checked at load.** (read) → A, design pass
- `emitTriggerFired: false` is accepted on any `deal-damage` or `heal`, though `effects.md#hook-execution` makes the tick the only exception.
- "Retaliation answers only an attack or a spell" can't be enforced for an `on-death` or `on-kill` retaliator. That's a doc note.

**L14. Playback with zero fights crashes.** (run) → B
- `playback.ts:82` (`beatCounts[-1]!`) and `DescentViewer.tsx:74`.
- Only reachable with a config that gives 0 fights.

**L15. `floorPreview` can throw.** (read) → B
- With an injected biome list shorter than 10, `biomeForFloor` throws (`generation.ts:146-147`).
- `store.md` says "never a throw".

---

## 5. Trigger wording

**W1. The root cause.** The docs reuse a few phrases, each tied to a hook with rules no doc states. Suggested fix: define them once, in a "Trigger words" section beside `content/overgrowth.md#indirect-damage`, which the other docs already link for "indirect". → design pass

| Phrase | Hook | Covers | What a reader wouldn't guess |
| --- | --- | --- | --- |
| "when it attacks", "every attack" | `on-attack` | Every Attack **instance** (Flurry and the Mauler give two), granted attacks included | Fires **before the hit**. Aims at the attack's target, **its own ally when Confused**. Still fires if the hit fizzles. Not for splash hits, spells or trait damage (D4) |
| "whenever an attack or spell hits it" | `on-damage-taken` + `damageChannel: 'direct'` | Every direct hit separately, splash hits included | Never the killing hit. Answers allies too (D5) |
| "every kill" | `on-kill` | Its actions, its trait hits, DoT ticks it applied while alive | Includes allies killed while Confused (D6) |
| "at the start / end of its turn" | `on-turn-start` / `on-turn-end` | Every turn it has | Also turns lost to Stun or Sleep (D7) |
| "deals X% more damage to …" | `conditional-damage-bonus` | Attacks, spells and its trait hits, checked per hit | B4 for the attack- or cast-scoped kind |
| "its attacks / attacks and spells deal additional" | `cross-stat` | Direct hits only, splash hits included | Not trait or perk damage |
| "ignores X% of Defence" | `armor-penetration` | All its damage except ticks | Includes retaliations, bonus hits and Thorns |
| "strikes", "hits" (trait damage) | `deal-damage` response | Indirect damage | Not an attack: fires no `on-attack`, can't splash, isn't redirected by Confusion, gets no Additional |

**Entry rewordings** (all → design pass, written to match the final decisions):

| ID | Entry | Current | Suggested |
| --- | --- | --- | --- |
| W2 | Confusion | "50% chance it strikes its own side instead" | "…the whole action turns on its own side instead (an area spell rolls once per cast). Its on-attack effects follow the new target; its trait damage does not." |
| W3 | Shellback Bulwark, Snapjaw Jaws | "strikes back", "hits back" | "deals indirect damage back equal to …" (not an attack) |
| W4 | Jaws, Bulwark, Wretch | "Whenever an attack or spell hits it" | "Whenever it survives a hit from an attack or spell (each hit separately, a splash hit included)…", plus the enemies-only rule if Q11 says so |
| W5 | Thorns | "deals damage to that enemy" | Matches Q11's answer |
| W6 | Armor piercer | "Attacks and spells ignore 1% of the enemy's Defence" | "Its damage ignores 1% of the target's Defence per level (DoT ticks excepted)." |
| W7 | Hollowkin Marionette | "Confuses whoever it hits" | "Every attack Confuses its target, before the hit lands." |
| W8 | Unicorn Lightbearer | "once per attack hit" | "once for every attack it makes (Flurry: twice), before the hit" |
| W9 | Glyphmoth Seer | "a 50% chance at the end of its turn to cast a random equipped spell" | "…at the end of each of its turns (a Stunned or Sleeping Seer rolls but can't cast): a random one of its spells, Arcane Bolt included." |
| W10 | Shield up, Phalanx, Snapjaw Lure | "also defends", "start each battle defending" | Matches Q6's answer |
| W11 | Queen, Pollenlord, Shellback Warden | "again every round it acts" | "at the start of each of its turns, even one it loses to Stun or Sleep" (Q13) |
| W12 | Bonus-hit, drain and Seeder entries | "also lands a bonus hit", "drains … from its target", "infects its target" | Say "before the hit" where D4 stays, e.g. "first lands a bonus hit, then attacks" |

**Clear as written** (no change):
- the fight-start and round-end entries;
- the death watchers (the Flickerling Flare is the model entry);
- the turn-start entries that don't claim "every round it acts";
- the passive bonuses;
- the Shieldbarer starter and the Cragfang Mauler;
- Flurry, Echo, Aggressive Caster and Shield Bash;
- every status entry.

---

## 6. Content docs vs data

These cover the docs entry by entry, in both directions:
- overgrowth: 20 creatures, 17 spells, 6 statuses.
- glimmerdark: 19 creatures, 5 spells, 3 statuses.
- rotcap-hollow: 19 creatures, 5 spells, 4 statuses.
- `enemy-behaviour.md`: 7 roles, the starters and 3 bosses.
- The three specialization docs: every perk and starter.

`enemy-behaviour.md` and `sorcerer.md` are clean. The content items that need a decision are in section 2 (D1–D3) and section 1 (B1, B4, B6).

**C1. Four spells sit below the spell-power convention.** (read) → design pass
- `overgrowth.md#spell-power-convention`: "about 80–90%" for a single target plus a status.
- The four:
  - Life Siphon 0.7 (`spells/overgrowth.ts:329`)
  - Blinding Flare 0.7 (`spells/glimmerdark.ts:88`)
  - Spore Cyst 0.45 (`spells/rotcap-hollow.ts:28`)
  - Withering Bolt 0.45 (`:125`)
- `rotcap-hollow.md` states an exception, but the convention it links doesn't. Add the exceptions to the convention.

**C2. Two cross-affinity clones.** (read) → design pass
- Disorient is Vine Snare in Instinct; Rasping Chant is Weakening Bite in Endurance.
- That makes two claims false:
  - `rotcap-hollow.md#spells`: "each bringing something the earlier pool lacks".
  - The `spells/glimmerdark.ts:6-7` header (→ B).
- Each biome still meets its count of 4 qualifying spells.

**C3. Hollowkin don't follow the enabler/payoff/amplifier roles either.** (read) → design pass
- `rotcap-hollow.md#species-roles` names only the Necromoss as breaking the pattern.
- But the Hollowkin are enabler, enabler and payoff, with no amplifier.

**C4. Burn and Poison durations are unstated.** (read) → design pass
- The Sporch Igniter, Sporch Cinderlord and Myconet Rotcore entries give none.
- They inherit the 3-turn default, which `statuses.ts:61-62` wrongly calls a placeholder (M2).

**C5. Display-name collision.** (run) → D
- Rotfeeder Ripper's trait and Sparkeater Gorger's are both "Gorge" (`traits/rotcap-hollow.ts:108`, `traits/glimmerdark.ts:286`).
- The only collision. → Q25

**C6. Stale species-backlog line.** (read) → design pass
- `species/_species-backlog.md:50` still mentions the Glowflies.

---

## 7. Convention and doc drift

**V1. The simulator parses and builds creature ids.** → B
- Rule: `creatures.md#creaturelevel-and-creatureorigin` ("nothing parses `CreatureId` suffixes").
- Where in `balance-sim.ts`:
  - `509-510` and `551-552`: the side regexes;
  - `557-558`: `templateIdOf`;
  - `862-866`: the Unicorn id built by hand;
  - `925`: the boss id built by hand.
- The per-fight record already carries `origin` and `side`.

**V2. Content special-cased by id.** → B
- `balance-sim.ts:1641` filters on `'rot-sovereign'`, while `ROT_SOVEREIGN_BOSS_ID` exists.

**V3. The G1 demo isn't marked throwaway.** → B
- Rule: `CONVENTIONS.md#every-feature-phase-ships-a-demo`.
- No marker or citation in `src/app`, `src/ui` or `main.tsx`.

**V4. The demo restates rules.** → B
- `refusals.ts:26` hard-codes `4294967295` instead of reading `MAX_RUN_SEED`.
- `refusals.ts:11` restates the floor-reach rule.

**V5. Numbers in logic** (`#no-magic-numbers`). → B
- Perk points per boss: `rewards.ts:121` (`× 100`), and the `1000` in `specializations.ts:63-64`.
- `0.25` stat growth per level: `leveling.ts:14`.
- `floor <= 100` (`generation.ts:143`) and `Math.min(100, …)` (`store.ts:408`), which restate `BIOME_COUNT × FLOORS_PER_BIOME`.
- `run.md` calls `FLOORS_PER_BIOME` and `BIOME_COUNT` "config constants", but they live in `generation.ts:89,94`. → Q23

**V6. The `#balance-simulator` rewrite is half done.** → design pass
- `CONVENTIONS.md:113` still says "compares against the last committed report", where the brief says it compares with `main`'s latest Actions run.

**V7. The engine-to-data import rule has no home in CONVENTIONS.** → design pass
- `workflow/coding-rules.md:46` says "no … data imports in `src/engine`".
- CONVENTIONS doesn't state it, and engine tests, goldens and the corpus import `src/data`, rightly.
- State the production-only rule and the test exception.

**V8. A biome `spellPool` that doesn't exist.** → design pass
- `CONVENTIONS.md:325` mentions it; `BiomeData` has no such field.

**V9. Placeholder biomes in the production registry.** → design pass
- `src/data/biomes.ts:12-25` ships 7 unauthored entries, against `#mechanism-goldens-vs-content-goldens`.
- They're intentional, so the rule needs a carve-out.

**V10. `deepFreeze` doesn't make Map and Set writes crash.** → A
- `test-utils/deep-freeze.ts` doesn't stop `Map` or `Set` writes.
- That breaks `#snapshots-are-never-written-to`.
- `CombatState.scripts` and `.statuses` are Maps, which `#combatstate-is-plain-data…` rules out.
- Close the gap, or amend both rules.

**V11. Most ids are bare strings.** → Q24 (deferred)
- `#ids-are-branded`: "or at least named aliases".
- About 140 id fields are plain `string`.

**V12. Provenance in `src/` comments that the checker doesn't catch.** → B
- `actions.ts:4`, `:774`
- `conditions.ts:134-141`
- `traits/glimmerdark.ts:126`
- `effects.ts:322-324`
- `effect-types.ts:108`
- `store.ts:1`
- `traits/starters.ts:55`
- `traits/overgrowth.ts:116`
- `resolution.ts:915-916`, `1077-1078`, `1350`

Widen the checker's patterns too.

**V13. Small stale facts.** → design pass
- `CONVENTIONS.md:290` says jsdom 30 needs Node 24.15+; the lockfile's jsdom declares `^22.22.2 || ^24.15.0 || >=26.0.0`.
- `phases/4.5/brief.md:3` and `phases/4.1/brief.md:3` both still say "Status: planned".

---

## 8. False comments and citations (all → B)

- **M1.** `balance-types.ts:24`: says "a SINGLE Math.round". The code and spec use `Math.floor` (`curves.ts:34,36`). `curves.ts:59-61` is a leftover of the same change.
- **M2.** `statuses.ts:61-62`: "No real producer applies Burn with a bare default". The Sporch Igniter and Cinderlord do, so the default is live balance.
- **M3.** `app/eventText.ts:88` labels status durations `(3r)`, as rounds. Durations count the bearer's turns (`statuses.md#timing`).
- **M4.** `config.ts:27`: says nothing reads `DEFAULT_GEM_SLOT_COUNT`. `generation.ts:226` and `:319` do.
- **M5.** `species/starters.ts:52-53`: says the Seer materializes as `[Arcane Bolt, null, null, null]`. Starters roll a stored set.
- **M6.** "Rolls a cast-role loadout" (`types.ts:39`, `store.ts:77`, `spells/index.ts:45`, `species/overgrowth.ts:78`, `generation.ts:80`, `__fixtures__/biomes.ts:121`): every enemy rolls a full set.
- **M7.** `ids.ts:7` mentions a `SpeciesId` brand that doesn't exist.
- **M8.** `actions.ts:113` gives the granted-action draw order as "gem, target, Confusion/Provoke". It is gem, Confusion, then Provoke or the target.
- **M9.** `effect-types.ts:1060` says `nonStacking` is "always undefined" for status entries. `effects.ts:212` sets it.
- **M10.** `rng.ts:6-7` cites `#combat-is-reproducible-from-its-inputs`. The text it quotes is in `#combatstate-is-plain-data-never-modified-after-being-returned`.
- **M11.** `store.ts:175` cites `combat.md#resolution--timing` for floor wipes. The rule is `run.md#a-descent-is-atomic`.
- **M12.** `store.ts:252` points to `progression.md#specializations` for the refusal order. It is in `store.md#how-store-actions-fail`.
- **M13.** `generation.ts:2` cites `run.md` for "RNG-free". That rule is in `creatures.md#materializecreature`.
- **M14.** `golden-damage-observed-lethal.fixture.ts:1` cites `#hook-execution`. The rule is `#damage-path-hook-order`.
- **M15.** `golden-revive.fixture.ts:3`: "20%, per `responses.md#revive` worked example". There's no such example; the 20% is content.
- **M16.** `__corpus__/node-shims.d.ts:3` and `__corpus__/corpus.ts:7` cite anchors that don't hold their claims (see V7).
- **M17.** Content `src` comments:
  - `species/overgrowth.ts:247` and `species/glimmerdark.ts:154` ("the one cast-role creature");
  - `species/rotcap-hollow.ts:227-232` ("the only caster");
  - `species/rotcap-hollow.ts:365-367` ("no add pair");
  - `spells/overgrowth.ts:47-48` ("no two damage-only spells sharing an affinity");
  - `spells/glimmerdark.ts:6-7` (C2).

---

## Checked and consistent

**Combat:**
- The turn queue (poles, Speed, side → slot → id), frozen per round.
- Dead-slot skipping.
- `resolveTurn` throwing on a finished fight.
- The round cap.
- Turn structure and win-check points.
- The damage formula: remap → effective → spellPower, the subtractive core, the chip floor, affinity, the pools, one floor with a minimum of 1.
- The Additional, armour penetration and cross-stat.
- Indirect damage, ticks and costs.
- The instance list.
- One action pipeline.
- Side-aware default targeting.
- Confusion, Tunnel Vision and Provoke.
- Fizzles.
- "An action ends when its actor dies" at all four sites.
- Adjacency.
- Fight setup.
- Event shapes.

**Effects and responses:**
- 16 hooks, each fired.
- The taxonomy and the iterator.
- Immunity in the iterator only.
- Every listed validator rejection.
- Effect order.
- The multiplicative fold.
- Turn-order passes taken once per pass.
- `on-death-observed`.
- `damageChannel`.
- chancePercent.
- Loop safety.
- Count-scaling.
- The taken-reduction modes.
- cheat-death at 1 HP.
- All 8 verbs.

**Statuses and scripting:**
- Every StatusDef against its doc.
- Refresh with no stacking.
- Born-this-turn.
- Cleanup order.
- Ticks.
- The applier snapshot.
- Action locks.
- The Web roll in turn order.
- The condition union.
- HP% `lowest`/`highest`.
- Every selector.
- The interpreter.
- The 7 role scripts against `enemy-behaviour.md`.

**Run, creatures and progression:**
- Level-ups after each fight.
- The per-fight record (it replays with a perk bought).
- The intro's XP.
- `floorPreview`, `perkPointSummary`, `bossFirstCleared` and `perkPointsGained`.
- Boss floors.
- Frontier and pins (up to S1).
- Enemy levels.
- Fights and enemy count.
- Determinism.
- Rewards.
- The XP curve.
- Stat scaling.
- Biome resolution.
- Cumulative spell unlock.
- Gem sets.
- Specs summing to 1000.
- Spec swap.

**Store and demo:**
- Every action against `store.md`.
- `can…` agrees with its action on odd inputs, and no refusal mutates state.
- The refusal order.
- `FloorOutcome`.
- The start screen, floor picker and viewer:
  - 3 s wait;
  - 500, 167 and 100 ms speeds;
  - skip and jump;
  - one keyed timer;
  - "Fight n / N" when lost early.
- No `__fixtures__` import.

**Conventions:**
- Engine purity.
- Total sort comparators.
- No Set or Map iteration feeding RNG.
- The RNG cloned per turn.
- `sim.yml` and `deploy.yml` against `CI_CD.md`.
- The three Vitest projects.
- All 145 goldens on the shared runner.
- No `core.ts`.
- No leftover names from the 4.5 renames.

## Not checked

- **The browser:** no live click-through of the demo.
- **Golden arithmetic:** goldens' arithmetic and their mulberry32 draws weren't recomputed.
- **Corpus digest:** registry coverage and the seed sweep.
- **Citations:** sampled, about 25–40 per area.
- **Content beyond counts:** the onboarding-ramp scope, bosses as "one signature" set pieces, the affinity "soft correspondence".
- **The balance report:** its T2–T5 maths.
- **Not reproduced:** the DoT-kill `on-kill` path (D6) and the Cinderlord chain, confirmed by reading only.
