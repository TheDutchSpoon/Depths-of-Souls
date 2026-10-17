# Phase 4.6 — Review fixes

**Status: planned.** Decided with the design owner on 2026-10-16, walking every finding of
`phases/4.6/review.md` (re-verified against `main` at `31ea263`, 4.5-G3 merged) through the
questions in `phases/4.6/proposal.md`. Several answers differ from the proposal's
recommendations; this brief holds the decisions. The finding ids in brackets (B1, Q6 …) point
into those two files. The docs are the spec; this brief places each decision in a slice, with
its golden policy. If this brief and the docs disagree, the docs win: flag the conflict, don't
guess.

## Why the phase sits here

- **After 4.5-G3:** the demo slices may not touch engine, store or data code
  (`phases/4.5/brief.md#demo-golden-rule`), and every finding here does.
- **Before Phase 5:** persistence stores what the engine produces, and a save bug must never be
  confused with an engine bug. Phase 5's save code is also written against branded ids from its
  first line ([4.6-F](#every-id-is-branded)).
- **No demo of its own:** a fix phase, like 4.1 (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
  The live 4.5 demo reads `main`, so it shows each fix as it merges.
- G2's Debug "Record boss kill" already offers only real bosses (`src/app/debugBoss.ts`), so the
  `recordBossKill` crash isn't reachable in the live demo; its store fix is an ordinary 4.6-B item.

## Slices

| Slice | Contents | Golden policy |
| --- | --- | --- |
| **4.6-A** | Engine hardening: [fight setup checks its input](#fight-setup-checks-its-input), [the load-time checks close their gaps](#the-load-time-checks-close-their-gaps), [no living creature at 0 HP](#no-living-creature-at-0-hp), [a zero count is a no-op for every response](#a-zero-count-is-a-no-op-for-every-response), [small engine fixes](#small-engine-fixes), [the snapshot lock covers Maps and Sets](#the-snapshot-lock-covers-maps-and-sets) | Byte-identical, two listed exceptions: `golden-round-end-interaction` gains one `TriggerFired` ([the load-time checks](#the-load-time-checks-close-their-gaps)); three goldens move a non-fresh creature's state into their `setup` step, expected values unchanged ([fight setup](#fight-setup-checks-its-input)) |
| **4.6-B** | Game layer and clean-up: [the cave has no content frontier](#the-cave-has-no-content-frontier), [the intro's Unicorn rolls its spells](#the-intros-unicorn-rolls-its-spells), [`recordBossKill` refuses an unknown boss](#recordbosskill-refuses-an-unknown-boss), [numbers out of the logic](#numbers-out-of-the-logic), [small game-layer fixes](#small-game-layer-fixes), [descriptions follow their entries](#descriptions-follow-their-entries); [the comment sweep](#the-comment-sweep) as the last commit | Goldens and the corpus digest byte-identical; store, demo and simulator tests change only where listed ([B's listed changes](#bs-listed-test-changes)) |
| **4.6-C** | When things happen: [action hooks fire after the action](#action-hooks-fire-after-the-action), [the fight ends at the wipe](#the-fight-ends-at-the-wipe) | Deliberate, listed, each changed golden and corpus row attributed to one of the two; CI balance verdicts re-checked |
| **4.6-D** | Rule fixes: [Splashing follows the hit](#splashing-follows-the-hit), [a revive resets the Defend count](#a-revive-resets-the-defend-count), [a trait's damage is neither an attack nor a cast](#a-traits-damage-is-neither-an-attack-nor-a-cast), [granted Defends are real Defends](#granted-defends-are-real-defends), [a fight-start Health raise raises current HP](#a-fight-start-health-raise-raises-current-hp), [Stun and Sleep skip the whole turn](#stun-and-sleep-skip-the-whole-turn) | Deliberate, listed, each change attributed to its fix; CI balance verdicts re-checked |
| **4.6-E** | Content: [the Cinderlord needs a Burning victim](#the-cinderlord-needs-a-burning-victim), [two payoffs become strikers](#two-payoffs-become-strikers), [three renames](#three-renames) | Deliberate content change; the id renames in their own commit; CI balance verdicts re-checked |
| (4.6-E2) | Tuning, only if a CI balance verdict flipped ([Balance verdicts](#balance-verdicts)) | Content numbers, deliberate |
| **4.6-F** | [Every id is branded](#every-id-is-branded) | Expected values byte-identical; fixture inputs change only by id wrapping |

Each slice's mailbox holds its own `brief.md`. Why the cuts fall where they do:

- **Byte-identical before deliberate.** A and B add the guards and the wider comment check, which
  then hold for C to F.
- **A and B split by reading list** (`spec/combat`, `effects`, `responses`, `statuses` against
  `spec/store`, `run`, `progression`), so neither chat reads nearly the whole spec.
- **C stands alone**: moving the action hooks changes most corpus fights, and mixed with D's fixes
  no single fix could be attributed. Its two parts share it because the wipe change only cuts a
  fight's tail, which is easy to tell apart from a reordering in a diff.
- **D's fixes share a slice**, as 4.5-D's did: each touches a narrow set of fights, and each is
  attributed by switching it off in turn.
- **E after D**: the role changes reroll every Pollinator Beneficiary and Resonant Chorus fight,
  which would drown D's attribution.
- **F last**: it needs E's id renames first, and it changes no behaviour.
- **Pre-agreed split lines** if a plan comes out too big (`WORKFLOWS.md#when-a-slice-is-too-big`):

  | Slice | Split into |
  | --- | --- |
  | A | **A1:** fight setup and the load-time checks. **A2:** the runtime fixes. |
  | C | **C1:** the fight ends at the wipe. **C2:** action hooks fire after the action. |
  | D | **D1:** Splashing, trait damage, granted Defends. **D2:** the Defend count, fight-start Health, Stun and Sleep. |

## Sequencing rules

- Sequential branch-off: each slice branches from `main` after the previous one merges.
- Golden policy per slice as above, one per PR (`WORKFLOWS.md#golden-policy-one-per-pr`).
- Each slice's PR review folds its items into the spec and content docs and removes their
  `**Known bug:**` lines; the item's entry here stays as the record of intent.
- **A new guard that makes an existing test or golden throw is a stop-and-ask** in A and B, never
  a quiet fix (the precedent is 4.5-B's trait validator).
- **Attribution in C and D:** every changed golden and corpus row is listed with the change that
  moved it. With that change switched off by an environment flag in a scratch copy, the row
  returns to its value before the slice. The flag never reaches the PR.
- **Every content entry a slice changes** updates its `description` in `src/data` in the same
  change (`content/overgrowth.md`'s Source paragraph).

### Balance verdicts

- The CI verdicts (floor 1, first soul, floor 5) are checked by the normal suite in every slice;
  only a tuning slice acts on the full report (`CONVENTIONS.md#balance-simulator`).
- **No tuning inside a fix slice.** A slice that flips a CI verdict stops and asks Duncan. At most
  one tuning slice (4.6-E2) runs, after E, against all the changes together.
- Expected directions, so a moved verdict is no surprise:

  | Slice | Expected move |
  | --- | --- |
  | C | Sparkeaters down (a drain pays off from the next hit); the Brute down (Concussive Blows no longer boosts its own hit); the Sporecloud Seeder down (no burst from its own killing hit); the Lullpollen line up (Sleep sticks) |
  | D | the Shieldbarer up (granted Defends); the Brute down again (trait damage, Confused Annihilate); Treant teams up; the Lullpollen line up again (Sleep skips the turn traits) |
  | E | the Sporch Cinderlord down; the Pollinator Beneficiary and the Resonant Chorus change |

- Watch point: 51 of the 525 corpus fights already end in a round-cap draw
  (`OPEN_QUESTIONS.md#fight-length`), and the Cinderlord's Burn can renew itself
  ([the Cinderlord needs a Burning victim](#the-cinderlord-needs-a-burning-victim)).

## Decided, not built

### Fight setup checks its input

*(4.6-A; L5, L6, L7, L8, Q20, Q21)*

- `createCombat` throws on:
  - a creature whose `scriptId` isn't in the script registry it is given. `null` stays valid and
    runs the fallback. (Phase 6's template deletion unassigns a deleted template first:
    `ROADMAP.md#phase-6--scripting-ui`.)
  - a creature that isn't fresh: besides non-empty `baselineEffects` or `activeEffects`, any
    other setup or fight output (`alive: false`, `defending`, `provoking`, a non-zero
    `defendCount`, `revivesUsed`).
  - two creatures with the same slot on one side, a slot outside the party size (0–5), a party
    array not in slot order, or two creatures with the same id across both sides. With unique
    slots the ids are unique by construction (`<template>-<side>-<slot>`); the id check catches a
    hand-built input. One check at the boundary replaces reading array order as slot order in five
    helpers (`actions.ts:446`, `:682`, `targeting.ts:11`, `:20`, `:152`).
- The side effects `createCombat` is given (`player.effects`, `enemy.effects`) go through the same
  trigger and passive validators as a trait. A perk is validated at the level bought, not only
  at level 1.
- Byte-identical: the store always builds valid input. A test or golden that starts throwing is a
  stop-and-ask.
- A test or golden that passes a non-fresh creature to `createCombat` builds it fresh and sets
  that state on the returned `CombatState` (`updateCreature`; a golden in its fixture's `setup`
  step), reproducing exactly the state `createCombat` gave it before: a dead creature keeps
  `currentHp` at its effective max, which `createCombat` set. Assertions and expected values don't
  change. Three goldens do this: `golden-defend-count-additive-cap` (`defendCount: 15`),
  `golden-heal-scaling-count` and `golden-necromoss-reclaim` (dead allies). Their inputs change
  and their expected values stay byte-identical.
- A test whose creature names a script the fight isn't given gets the registry its creatures
  name, assertions unchanged: five `combat.test.ts` instance-list tests, two
  `data/species/starters.test.ts` tests, and three `state/store.test.ts` intro tests, whose
  `makeDeps` holds the role scripts alongside the fixture scripts.
- The PR review writes it into `spec/combat.md#fight-setup` and `spec/effects.md#validators`, and
  removes their Known bug lines and `spec/combat.md#aoe-cast`'s.

### The load-time checks close their gaps

*(4.6-A; L11, L13)*

- An additive taken-pool reduction (a `taken-reduction` or a `'taken'` `damage-modifier`, the two
  shapes `spec/effects.md#taken-reduction-accumulation` gives the mode) must carry a `reductionCap`
  below 1; without one, a count-scaled reduction can reach 100% (`effects.ts:294`).
- `emitTriggerFired: false` is accepted only on a status's tick (a `snapshot-potency` magnitude);
  `spec/effects.md#hook-execution` makes the tick the only exception.
- No content breaks either. One test fixture does: the fixture trait `CATASTROPHIC_COLLAPSE`
  (`__fixtures__/traits.ts`) sets `emitTriggerFired: false` on a plain trait hit, and every golden
  whose registry holds it would throw. The flag goes; `golden-round-end-interaction`'s expected log
  gains exactly one `TriggerFired` (P1, `on-round-end`) before P1's 999 `DamageDealt`. It is A's
  one golden exception: every other golden and the corpus digest stay byte-identical.
- Two test-inline statuses also carry the flag off a tick and drop it, assertions unchanged:
  `test-regen` (`resolution.test.ts`) and `single` (`status-containers.test.ts`).
- The PR review writes both into `spec/effects.md#validators`.

### No living creature at 0 HP

*(4.6-A; L4, Q19)*

- Effective max Health is never below 1, and a revive restores at least 1 HP. Today a clamp to a
  max of 0 leaves a living creature acting at 0 HP, and `round(max × pct)` can round a revive to
  0 (`resolution.ts:1196`).
- Byte-identical: no content reaches either.
- The PR review writes the floors into `spec/statuses.md#health-is-a-modifiable-stat` and
  `spec/responses.md#revive`, and removes `spec/combat.md#resolution--timing`'s Known bug line.

### A zero count is a no-op for every response

*(4.6-A; S4, Q15)*

- An `apply-stat-modifier` whose `magnitudeSource` count is 0 does nothing, like `deal-damage` and
  `heal`: no `StatModifierApplied`, no downstream hooks. Today it emits a `factor: 1` event
  (`resolution.ts:1111-1131`).
- Byte-identical: the Swarmhive Striker counts itself, so no content reaches 0.
- The PR review writes it into `spec/effects.md#count-scaling` and removes
  `spec/responses.md#fizzles`'s Known bug line.

### Small engine fixes

*(4.6-A; L2, L9, L10, L12, Q22)*

- **The Web break-free roll reads the bearer fresh** after each break (`combat.ts:213-215`), so a
  second break in one cleanup can't restore the first.
- **`on-action-observed` fails closed** when it can't find the actor, as the other two
  observation hooks do (`resolution.ts:566-574`).
- **`stacks: false` claims per definition**, not per carrier id (`resolution.ts:645-648`). The
  claim key is the trigger's carrier kind (trait, side effect or status), the carrier's id and the
  trigger's position in the carrier's own effect list, stamped when the effect is instantiated. So
  two such triggers in one trait are separate claims, a trait id equal to a status id no longer
  shares one, and a creature carrying one trait twice still makes one claim. `TriggeredDef.stacks`
  and the content stay as they are.
- **`triggering-ally` is deleted**: it has no rule and no content, and the engine resolves it as
  `triggering-source`.
- Byte-identical: no content reaches any of them.
- The PR review rewrites `spec/effects.md#stacks-false` and `spec/responses.md#response-targets`,
  and removes the Known bug lines in `spec/statuses.md#turn-order` and
  `spec/effects.md#damage-observation`.

### The snapshot lock covers Maps and Sets

*(4.6-A; V10)*

- The deep-freeze test helper (`test-utils/deep-freeze.ts`) also makes `Map` and `Set` writes
  throw, so `CombatState.scripts` and `.statuses` are held to "never written to" like the rest.
- The Maps stay. The PR review adds one sentence to
  `CONVENTIONS.md#combatstate-is-plain-data-never-modified-after-being-returned`: the registries a
  fight carries are read-only Maps, frozen by the helper.

### The cave has no content frontier

*(4.6-B; S1, Q14)*

- **A floor whose biome has no content uses the last authored biome before it** in the 1–100
  sequence. Today floors 31 and deeper are Rotcap Hollow; authoring biome 4 moves floors 31–40 to
  it. Past floor 100, the seeded draw picks among authored biomes only. Pins are unchanged: only an
  authored biome can be pinned.
- So there is **no content frontier**: `contentFrontier`, the `beyond-content-frontier` refusal
  and its demo text go. The floor picker accepts any floor up to one past the deepest cleared. The
  cave descends endlessly, as `spec/run.md#the-cave` says.
- Consequences, accepted: boss floors repeat the last authored biome's boss (floors 40, 50 … fight
  the Rot Sovereign today; perk points still come from a first kill only); deep floors change
  content when a biome ships (floors are generated from the seed, never stored:
  `spec/saves.md#references-not-copies`); the balance simulator loses its "cleared the frontier"
  stop and runs to its cap.
- The player gem-roll pool (`unlockBiomeIndex`, `store.ts:405-415`) reads the same resolution.
- Goldens and the corpus are untouched (no corpus fight is past floor 30). Store, demo and
  simulator tests that pin the refusal change ([B's listed changes](#bs-listed-test-changes)).
- The PR review rewrites `spec/run.md#content-frontier`, `#biomes`, `#biomeforfloor`,
  `#content-frontier-and-pins` and `#pins`, `spec/store.md#how-store-actions-fail` and
  `OPEN_QUESTIONS.md` where they mention the frontier.

### The intro's Unicorn rolls its spells

*(4.6-B; S5, Q16)*

- The scripted intro's enemy Unicorn rolls a full gem set like every enemy
  (`spec/run.md#enemy-script-and-gem-set`); today it has none (`store.ts:1027-1032`).
- The roll draws from **its own stream derived from the run seed**, never from `runCounter`, so
  every descent after the intro stays byte-identical; only the intro fight's own log changes. The
  Unicorn that joins the party keeps rolling its own stored set, as today.
- It is scaffolding: rolled gems give way to crafted spells in Phase 8
  (`spec/creatures.md#gems-as-items`).
- The PR review removes `spec/run.md#enemy-script-and-gem-set`'s Known bug line and notes the
  stream in `spec/run.md#scripted-intro`.

### `recordBossKill` refuses an unknown boss

*(4.6-B; L1, S9, Q17)*

- `recordBossKill(bossId)` returns `{ ok: false, reason: 'unknown-boss' }` for an id that isn't a
  boss in the biome data, and changes nothing; `canRecordBossKill` shares the check
  (`spec/store.md#how-store-actions-fail`). Today an unknown id adds 100 perk points and then
  crashes the side panel (`store.ts:793`, `names.ts:29`).
- The PR review adds the action's result and reason to `spec/store.md#how-store-actions-fail` and
  removes its Known bug line.

### Numbers out of the logic

*(4.6-B; V5, Q23)*

- **Perk points per boss** is a `BalanceConfig` number (`rewards.ts:121`), and the 1000-point
  specialization total is derived from it (`specializations.ts:75-78`).
- **The 0.25 stat growth per level** (`leveling.ts:13`) goes beside the XP curve in
  `BalanceConfig`, or into `engine/config.ts` if the config doesn't reach `scaleStatsToLevel`.
- **`LAST_FIXED_FLOOR`** (`BIOME_COUNT × FLOORS_PER_BIOME`) replaces the literal 100s
  (`generation.ts:143`, `store.ts:411`).
- Values unchanged, so byte-identical.
- The PR review adds the numbers to `CONVENTIONS.md#where-each-number-lives` and their spec rules.

### Small game-layer fixes

*(4.6-B; L14, L15, S11, V1, V2, V3, V4)*

- **Playback with zero fights** doesn't crash (`playback.ts:43`, `:76`, `DescentViewer.tsx:75`).
- **`floorPreview` never throws**, whatever biome list the store was given
  (`generation.ts:146-147`).
- **The simulator** reads the boss-floor rule from `floorShape` (`balance-sim.ts:1544`, `:1551`),
  reads a fight's sides and template ids from its record instead of parsing creature ids
  (`:502-503`, `:544-552`, `:858`, `:916`), and filters on `ROT_SOVEREIGN_BOSS_ID` (`:1632`).
- **The demo** is marked throwaway (`CONVENTIONS.md#every-feature-phase-ships-a-demo`) and reads
  the seed bound and the floor-reach rule from the store (`refusals.ts:16`, `:74`).
- Byte-identical; the PR review removes `spec/store.md#store-actions`' Known bug line.

### Descriptions follow their entries

*(4.6-B; new since the review)*

- Every trait and perk `description` whose content-doc entry this phase's doc sync rewrote is
  transcribed again from the entry, by the rules of `phases/4.5/brief.md#trait-and-perk-text`.
  The doc sync's diff lists the entries.
- Byte-identical: no event or test reads a description except the description tests.

### The comment sweep

*(4.6-B; V12, M1–M17)*

- B's last commit fixes the false, stale and provenance comments the review lists, and nothing
  else: `npm run docs:check -- comment-proof <the commit before it>` passes.
- The comment check's patterns widen to catch the provenance the review found by hand ("legacy
  path", "moved here from", "the new `X`", "the first real consumer"), in a commit before the
  sweep, so the sweep runs against the wider check.

### B's listed test changes

- The `beyond-content-frontier` refusal's store, demo and simulator tests.
- The tests that pin the scripted intro's log.
- New tests for `recordBossKill`'s refusal and `canRecordBossKill`.
- Nothing else in an existing test changes.

### Action hooks fire after the action

*(4.6-C; B1, D4, D8, Q1, Q10)*

- **An action hook fires once the action it names has happened**:
  - `on-attack` after each attack instance's hit **and its splash**;
  - `on-cast` after each cast instance's effects (every landed target's list);
  - `on-action-observed` at the same point as the actor's own hook;
  - `on-defend` and `on-provoke` after the stance and, for a Defend, the Defend count are set.
- Design intent: a creature never benefits from its own trigger within the same action. A drain
  pays off from the next hit, a Weaken lands after the hit that applied it, the Resonant Adept's
  +8% Intelligence powers its next cast, and the Lullpollen Sleeper's Sleep lands after the hit's
  wake trigger, so it sticks.
- **A hit that kills its target** still fires the hook: the attack happened. Responses aimed at
  the dead target do nothing (`spec/responses.md#no-response-acts-on-a-dead-target`); the rest land
  (a Leech's own +10% on a kill).
- **An actor that dies during its own action** still fires its hook for the instance that happened:
  the one exception to `spec/effects.md#dead-creatures`. Responses aimed at itself do nothing by the
  same rule, and its grants are cancelled (`spec/responses.md#perform-action`); everything else
  lands (a debuff on the creature that killed it, a revive of an ally). Its later instances and its
  splash are still dropped. Observers still fire for that instance.
- **`random-dead-ally` leaves out the firing creature**, so a dead Unicorn whose hook fires can't
  revive itself. Byte-identical today: a living firer is never in the dead pool.
- `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles` and its two engine checks go: no
  hook fires before a hit any more. That anchor is cited from `src/`, so only the PR review removes
  it.
- Deliberate golden change: every fight with an `on-attack` trait or perk (14 carriers), every Resonant cast,
  every Defend or Provoke reaction whose order moves.
- New hand-derived goldens: a drain on a killing hit (the target's half does nothing, the self half
  lands); a Sleeper whose Sleep outlasts the attack; an attacker killed by a retaliation whose
  debuff still lands; an Adept whose own cast isn't powered by its own buff.
- The PR review rewrites `spec/effects.md#hooks`, `#dead-creatures` and
  `#action-reactions-actor-self-hooks-or-observation`; `spec/combat.md#action-instance-list`,
  `#spells-carry-responses`, `#an-action-ends-when-its-actor-dies` and
  `#adjacency-targeting`; `spec/responses.md#revive`; the trigger words
  (`content/overgrowth.md#trigger-words`); and removes the Lullpollen Sleeper's Known bug line.

### The fight ends at the wipe

*(4.6-C; B5, Q5)*

- **The fight ends the instant a side has no living creature**, checked after every death, a death
  inside a cascade included. Nothing after it resolves: not that death's `on-death`, `on-kill` or
  death observers, no action hook, no further instance or splash, no grant, no cleanup.
  `TurnEnded` still closes the turn, then `FightEnded`.
- It matches "no dying retaliation" (`spec/combat.md#resolution--timing`): a last creature's death
  sting can no longer turn a win into a draw. An Echo's second area instance after a wipe
  disappears with it.
- On `main`'s corpus, 474 of the 525 fights log 999 events after the wipe (474 of them the closing
  `TurnEnded`, which stays); no result changes. A win check per instance costs about 0.75 ms over
  the corpus's 8.2 s.
- New hand-derived golden: an Echo Thorn Volley whose first instance wipes the enemy side.
- The PR review rewrites `spec/combat.md#resolution--timing`, `#turn-structure` and `#aoe-cast`.

### Splashing follows the hit

*(4.6-D; B2, Q2)*

- Splash targets are read from the creature the hit landed on, in **its** party: its living
  neighbours, or with Annihilate every other living creature in that party. A Confused attacker
  whose hit lands on an ally splashes that ally's neighbours, itself included when it is one.
  Today the splash always reads the attacker's opposing party (`actions.ts:443-450`).
- Design intent: Confusion turns the whole action; a Confused Annihilator hits its whole team.
- New test: a `damageChannel` retaliator on a splash target, which no test covers today.
- The PR review rewrites `spec/effects.md#splashing-and-annihilate` and
  `spec/combat.md#targeting-override`.

### A revive resets the Defend count

*(4.6-D; B3, Q3)*

- A revive sets `defendCount` to 0 with the rest of the death-reset; `revivesUsed` keeps counting.
  Today it survives (`resolution.ts:1194-1210`), so a revived Bulwark bearer returns with its
  reduction.
- The PR review removes `spec/effects.md#death-reset`'s Known bug line.

### A trait's damage is neither an attack nor a cast

*(4.6-D; B4, Q4)*

- Damage a trait, status or perk deals gets only the `conditional-damage-bonus` effects scoped to
  `'both'`: never Brute Force (`'attack'`) or Spell Focus (`'cast'`). Today it is gathered as an
  attack (`resolution.ts:182-185`, `:956`, `:990`).
- Only the bonus gathering changes; `DamageDealt.damageSource` keeps its labels.
- The PR review writes it into `spec/effects.md#conditional-damage-bonus` and
  `spec/combat.md#the-damage-channel-in-the-engine`, and removes `specializations/brute.md`'s Known
  bug line.

### Granted Defends are real Defends

*(4.6-D; B6, Q6)*

- Shield up, Phalanx and the Snapjaw Lure grant a real Defend action through `perform-action`, so
  it counts for Bulwark and fires `on-defend` and `on-action-observed` by the ordinary rules.
  `grant-action-state`, which they are the only users of, is deleted.
- A granted Defend runs after the action that raised it (Provoke, then Defend); Phalanx's runs
  after the fight-start pass. It obeys the action locks like any grant.
- Accepted: a player Snapjaw Lure with Shield up defends twice per Provoke.
- The PR review rewrites `spec/responses.md#the-verbs` and `#grant-action-state`, the three entries,
  and removes their Known bug lines.

### A fight-start Health raise raises current HP

*(4.6-D; D3, Q9)*

- A Health raise during the fight-start pass raises `currentHp` by as much as it raised the max,
  so the Treant Grovekeep's team opens at full HP. Mid-fight raises (the Treant Sapling, the
  Rotfeeder Gorgemaw, the Sparkeater Voidmaw) stay ceiling-only.
- The PR review removes `spec/statuses.md#health-is-a-modifiable-stat`'s Known bug line.

### Stun and Sleep skip the whole turn

*(4.6-D; D7, Q13)*

- A turn skipped by an `'all'` lock skips the creature's own trait and perk triggers on
  `on-turn-start` and `on-turn-end`, not only its action. Passives stay on, reactions are
  unchanged, and the statuses on it still tick, count down and roll.
- Design intent: "its turn is skipped" means the whole turn. The Shellback Warden no longer buffs
  on a turn it loses (313 of them in the corpus), and the Glyphmoth Seer no longer rolls its
  bonus cast.
- It reads the lock, not a status id, so any future turn-skipping status behaves the same.
- The PR review rewrites `spec/combat.md#turn-structure` and
  `#every-action-source-obeys-the-same-rules` (rule 1), `spec/statuses.md#action-locks`, and the
  trigger words.

### The Cinderlord needs a Burning victim

*(4.6-E)*

- The Sporch Cinderlord's trait is "when it kills a Burning creature, it applies Burn to every
  enemy": its `on-kill` trigger gains the condition `has-status { subject: 'target', statusId:
  'burn' }`. Today it fires on every kill.
- **While a creature's death resolves** (`on-death`, `on-kill`, the death observers), a trigger's
  condition may test the dead creature's statuses; afterwards they are inert. A general rule, not
  the Cinderlord's.
- A Burn tick's kill is its applier's while the applier lives, so the Cinderlord's own Burns can
  still renew themselves: accepted, watched in tuning.
- The PR review rewrites `spec/effects.md#death-reset` and the Cinderlord's entry.

### Two payoffs become strikers

*(4.6-E; D2, Q8)*

- The Pollinator Beneficiary and the Resonant Chorus take the `striker` role: their payoffs read
  attacks, and a caster attacks only when it can't cast. Data only; traits and numbers unchanged.

### Three renames

*(4.6-E; C5, Q7, Q25)*

- The Spider Weaver's trait becomes **Silk Spinner**; the Sparkeater Gorger's trait becomes
  **Armor Gnaw** and the creature **Sparkeater Gnawer**. The names appear in no event.
- **Their ids follow, before saves exist** (Phase 5), in a commit of their own:
  `sparkeater-gorger` → `sparkeater-gnawer`, `sparkeater-gorger-gorge` →
  `sparkeater-gnawer-armor-gnaw`, `spider-weaver-web-strike` → `spider-weaver-silk-spinner`. That
  commit's golden and corpus changes are only those strings, which the PR shows.

### Every id is branded

*(4.6-F; V11, Q24)*

- Every id type is branded, internal ones included; `CONVENTIONS.md#ids-are-branded` loses "or at
  least named aliases".
- Size, by grep on `main`: about 126 plain-`string` id fields in production code, 100 in tests,
  244 id literals in `src/data` and 2,400 in tests, fixtures and goldens.
- Test builders accept a plain string and brand it inside, so most test files don't change.
- **Golden exception, this slice only:** a golden fixture's inputs may change only by wrapping an
  id; every expected value stays byte-identical. The PR proves it with a check like
  `docs:check -- comment-proof`.

## Assumptions

Choices this brief made that the grill didn't pin. Each slice's plan confirms or corrects its own.

- [x] **ASSUMPTION (A):** the party-size bound (0–5) is an engine constant in `engine/config.ts`,
      which `store.ts`'s `PARTY_SIZE` then reads.
- [ ] **ASSUMPTION (B):** `canRecordBossKill` returns the same result shape as the other `can…`
      queries.
- [ ] **ASSUMPTION (B):** the intro Unicorn's gem stream is derived from the run seed with its own
      fixed salt, like the summon roll's stream.
- [ ] **ASSUMPTION (C):** "after the splash" for `on-attack` means after every splash hit of that
      instance; an AOE cast's `on-cast` fires once per instance, after its last member.
- [ ] **ASSUMPTION (D):** for Stun and Sleep, the turn-start triggers are skipped when an `'all'`
      lock is active as the turn starts, and the turn-end triggers when the turn emitted
      `TurnSkipped`.
- [ ] **ASSUMPTION (E2):** the tuning slice is named 4.6-E2 if it runs.
- [ ] **ASSUMPTION (F):** the golden-input proof is a new `docs:check` mode or a flag on
      `comment-proof`; the plan picks.
