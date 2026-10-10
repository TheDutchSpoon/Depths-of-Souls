# Verify request — Phase 4.2 — Slice D (round 1)

Design agent → coding agent. Check the three condensed spec files against `main`'s code and against
their old text (`git show 892f1b8:.claude/CONVENTIONS.md` and `GAME_DESIGN.md`, or the 4.2-A text
at `git show b3ac8dd:.claude/spec/<file>.md`), using `inventory.md` in this mailbox.
`npm run docs:check -- inventory D` passes: 172 units, 172 rows, base `b3ac8dd`.

## Files condensed

| File | Before (bytes) | After (bytes) |
| --- | --: | --: |
| `spec/effects.md` | 61,465 | 31,311 |
| `spec/responses.md` | 17,873 | 11,833 |
| `spec/statuses.md` | 29,044 | 17,040 |

Total 108,382 → 60,184 bytes. No `## To fold` is left, and none of the three has a `## Not built`
half: the one unbuilt rule went to ROADMAP Phase 7 (see "Decisions Duncan made").

## Rows per fate

| Fate | Rows |
| --- | --: |
| kept | 0 |
| rewritten | 77 |
| merged | 70 |
| moved | 3 |
| dropped | 22 |

The three `moved` rows: C:1808 (the specializations bullet, to `spec/progression.md` "Specializations
are data" and "Inert perks" and `spec/store.md`), G:531 (to ROADMAP Phase 7) and C:1522 (to ROADMAP
Phase 4.5).

## Check hardest

1. **Every claim about `main`'s mechanics**, especially the ones written from the code:
   - `spec/statuses.md` "The applier snapshot": the tick formula, the dealer rule (a living applier
     only; the bearer is the logged source on the fallback), no source for the bearer's hooks on a
     tick (`applyDamageAndEmit`, `tickDealer`), the pass-on rule (`executeResponse` `apply-status`),
     and "keeps the stronger snapshot" (strictly greater replaces; `applyStatus`).
   - `spec/statuses.md` "Born this turn" and "Turn order": `turnClock` bumps after the turn-start
     grants, for every dequeued turn; the Web roll runs after the countdown, over living bearers in
     side → slot → id order, skipping born Webs (`combat.ts` `resolveTurn`, `rollWebBreakFree`).
   - `spec/statuses.md` "Action locks": the two skip reads and the `TurnSkipped.effectId` fallback
     (`firstAllLock`, `resolveTurn`).
   - `spec/effects.md` "Effect order" now lists effects gained in the fight, statuses and
     stat-modifiers, in the order gained (`instantiateEffectDefs`, `applyStatus`, `applyStatModifier`).
   - `spec/effects.md` "stacks: false": one carrier gets the chance per hook firing, claimed before
     the roll (`fireHook`'s `claimedNonStacking`).
   - `spec/effects.md` "acted-before-target": the fallback when there is no rule
     (`conditions.ts`, `evaluateTriggerCondition`).
   - `spec/responses.md` "Magnitude modes": `deal-damage`'s default `offStat: 'attack'`; the one
     formula `stat × (spellPower × multiplier)` with the multiplier `count ?? castPowerFraction ?? 1`.
   - `spec/progression.md` and `spec/store.md`: `setPerkLevel`'s reasons `no-spec`,
     `perk-not-in-spec`, `invalid-level`, `over-budget` (`store.ts`), and the 9 known-inert perks
     (`specializations.test.ts`).
2. **Every number**: `MAX_TRIGGER_CASCADE_DEPTH` 500 and `MAX_REVIVES_PER_CREATURE` 10
   (`engine/config.ts`); the 17 hooks (`effect-types.ts` `Hook`); Web's 10% and 3 turns. The new
   content entries: Weaken −20% dealt, 3 turns (`content/overgrowth.md` "Weaken"); Vulnerability
   ×1.5 taken, 3 turns; Regen 10% of the healer's Health, 3 turns (`content/glimmerdark.md`
   "Vulnerability", "Regen"), all against `src/data/statuses.ts`. Check also who applies each
   (Stifling Weight, Concussive Blows, Blinding Flare, Afterglow).
3. **Every `dropped` row.** Each names the home it duplicates, or says it is superseded or history:
   check the home really holds the rule. The content duplicates especially: C:627 and C:1691 (the
   status lists), C:789 (Sporch Cinderlord), C:1513 (the actor-self routing list), and the
   duplicates dropped *inside* rewritten rows (the DoT numbers in C:349 and G:718, the Unicorn's 20%
   in C:416, the Necromoss examples in C:483).
4. **The large merges**: C:1358 + G:486 into effects "Category decides player-facing treatment";
   C:1383 + G:519 + G:620 into "Effective stats"; C:1428 + G:586 + G:595 + G:601 into "Dead
   creatures", "Damage-path hook order" and "Consequence events"; C:1535–C:1547 + G:541–G:559 into
   "Loop safety"; C:1560 + C:1580 + C:1595 + C:1603 + G:637–G:675 into effects "Traits" and
   "Trigger conditions"; C:1611 + C:1618 + G:767–G:785 into statuses "Timing" and "Applying and
   refreshing"; C:493 + C:782 into responses "Fizzles". Check that no rule was lost or changed.
5. **No new rules.** Two sentences are worded from the code more exactly than their unit said:
   "stacks: false" (the claim precedes the roll) and responses "Flat mode" ("the floor happens once,
   in the damage or heal itself", since flat damage on another creature floors in the indirect
   formula). Report either if it says more than the code does.

## Decisions Duncan made (step 4)

- **Stale-doc fixes approved as a batch** (the doc follows `main`): (a) the effect order includes
  stat-modifiers gained in a fight; (b) `living-allies-of-species` is no longer "inert until
  speciesId is threaded", since it is threaded; only a creature without one counts 0; (c) "Defend and
  Provoke can co-occur in one action" is dropped (separate actions); (d) a hook's context carries no
  `amount`; (e) `triggering-source` resolving to self now comes from a cost, not a tick, so the
  Snapjaws and Hollowkin examples are dropped; (f) `setPerkLevel` fails with `no-spec` too; (g)
  "damage-modifier statuses may be capped, ~1 stack" is dropped (single instance, no cap). Report
  any of them if you think it is a bug rather than a stale doc.
- **The effective-stats display rule** (G:531) is a Phase 7 UI decision, not built: it went to
  ROADMAP Phase 7 "Decided, not built", as 4.2-C did with the intro beat.
- **`on-death-observed` is a new direction, not a bug** (C:1522). The engine-audit note proposed
  folding `on-ally-death` and `on-enemy-death` into one observed hook with a `relationship` filter;
  Duncan decided to build it for parity with the other two observation hooks, in Phase 4.5, fanning
  out in the standard tie-break order. The spec keeps describing `main`'s two hooks; the decision is
  in ROADMAP Phase 4.5 "Decided, not built", with its golden impact (the hook name in
  `TriggerFired`; the firing order on an enemy's death).
- **Status content** (phase brief rule 7, and 4.2-B's note): Weaken, Vulnerability and Regen had no
  content entry, so they gain one; every other status number in the old spec already had a content
  home and was dropped as a duplicate.

If you find another place where the code contradicts the text, report it as a finding and say
whether you think it is a bug or a stale doc.

## For later slices (not findings for this round)

Each note is also in that slice's `brief.md` under "Known from earlier slices" (E, F) or in G's
scope.

- **4.2-E:** the D files link `spec/combat.md` in label form ("Fight setup" and "Action
  instance-list" match only as prefixes of today's longer headings, plus eleven more labels); combat
  restates the revive cap, status timing in "Turn structure" and the tick sentence in "Phase
  structure", now homed in the D files; "adjacency targeting" says Splashing recomputes in
  `executeCastSingle`, but Splashing is attacks only.
- **4.2-F:** `OPEN_QUESTIONS.md` "Behavioral traits" still parks extra-action traits, which are
  built; its "DoT and Regen potencies" item restates content numbers. ROADMAP gains two "Decided, not
  built" entries (Phase 4.5, Phase 7).
- **4.2-G, stale `src/` comments:** `engine/effect-types.ts:670-673` (a trigger condition "cannot
  yet" reference the source), `engine/effects.ts:434` (Splashing on "Attack/Cast"),
  `engine/effects.ts:501-503` (every creature lacks a `speciesId`). The Poison comment in
  `data/statuses.ts` was already listed.

## Docs edited

- `spec/effects.md`, `spec/responses.md`, `spec/statuses.md`: condensed (rows in `inventory.md`).
- `spec/progression.md`: new `## Engine rules` ("Specializations are data", "Inert perks"), moved from
  effects (4.2-C note).
- `spec/store.md`: `setPerkLevel`'s failure reasons and the `setPerkLevel` / `refundAllPerks`
  bullet, moved from effects (4.2-C note).
- `content/overgrowth.md`: new "Weaken" status entry; the Stun link repointed to statuses "Stun is
  just a status".
- `content/glimmerdark.md`: new "Vulnerability" and "Regen" status entries; the source line names
  them.
- `content/rotcap-hollow.md`: the "Damage over time" link repointed to statuses "DoT and Regen
  belong to their applier".
- `ROADMAP.md`: Phase 7 "Decided, not built" gains "Effective stats on screen" (G:531); Phase 4.5
  gains `on-death-observed` (C:1522, Duncan's decision).
- `phases/4.2/E/brief.md`, `F/brief.md`: "Known from earlier slices", 4.2-D's notes;
  `G/brief.md`: three stale `src/` comments added to the clean-up list.
- `phases/4.2/D/inventory.md` (new, from `inventory-skeleton`) and this file.

## Round 2

Design agent → coding agent, after `verify-r1.md` (8 findings). All 8 are fixed; none was rejected.
`npm run docs:check -- inventory D` passes: 172 units, 172 rows, base `b3ac8dd`. The slice id for
the script is `D` (`4.2-d` is rejected, as round 1 noted).

### Findings and what changed

1. **acted-before-target: three random selectors peek to no target** (C:583). Stale doc (Duncan).
   `spec/effects.md` "acted-before-target" now names `random-enemy`, `random-ally` and `random`, and
   says a rule with a random target never satisfies the condition.
2. **Response targets missing `all-allies-of-species`** (C:678). Stale doc (Duncan). Added to the
   list in `spec/responses.md` "Response targets", plus a bullet beside `all-allies`: narrowed to
   creatures sharing the firing creature's `speciesId`, empty for a firing creature without one
   (`resolution.ts:697-702`). Recorded in row C:678's Reason, since no old unit carried it.
3. **"Ending action states" under the turn-end heading** (C:1658). Placement fix: the bullet now
   reads "Cleanup is bookkeeping only, at either end of the turn: the turn-start cleanup ends action
   states; the turn-end cleanup counts down, expires and runs the Web roll" (`combat.ts:407-423,
   500-506`).
4. **"A heal spell's default, `'cast'`"** (C:327). Wording: "A heal spell that names `offStat` names
   `'cast'`, remap-aware Intelligence." No default is claimed; `validateSpellEffects` lets a spell
   heal name `'cast'` or a `scalingStat`.
5. **`stacks: false` keys on the trait, not the effect** (C:755). Doc follows `main` (Duncan): "at
   most one carrier of that effect's source (its trait, status or side-effect slot, matched by
   `sourceTraitId`)". `sourceTraitId` is the trait id, the status id, or `perk-<n>` /
   `enemy-effect-<n>` (`effects.ts:44-68`). The two cases where that differs from "per effect"
   (two `stacks: false` triggers in one trait on one hook; the same trigger from two kinds of
   source) are in no shipped content.
6. **The Composition line floored for flat damage on another creature** (C:380). It now reads
   `floor(stat) × percent × count / 100`, "the result is not floored here", "the numerator is exact
   integer arithmetic", and "the floor happens once, later, in the cost, heal or damage formula that
   takes the amount" (`resolveFlatTotal`, `calculateCost`, `applyHeal`, `calculateIndirectDamage`).
7. **C:1823 only partly a duplicate.** No text change: the rest of the unit already has a home.
   `OPEN_QUESTIONS.md` "Balance numbers (all parked — live in config, tune in playtest)" holds
   the master difficulty lever (its first bullet) and the craft, augment, infuse, level and upgrade
   costs (its "Costs:" bullet). The row's Reason now names that home.
8. **ROADMAP Phase 7 circular pointer** (G:531). The parenthetical now says the hybrid would replace
   the multiplicative fold in `spec/effects.md` "Category decides player-facing treatment", which
   is what that section holds. The fallback itself lives only in the ROADMAP entry, as intended.

### Check this round

- The six sentences above against the code they cite; especially 3 (both cleanups) and 6 (no
  floor claimed where there is none).
- That the new `all-allies-of-species` bullet says nothing beyond `resolution.ts:697-702`.

### Decisions Duncan made (round 2)

- Findings 1, 2 and 5 are stale docs; the text follows `main`. On 5, any compounding across
  different kinds of source (a trait and a perk or a Phase 8 infusion carrying the same
  `stacks: false` trigger) is left for whoever adds a non-trait source of such a trigger to decide.

### For later slices (round 2)

- **4.2-G:** three new stale `src/` comments from `verify-r1.md`, added to `G/brief.md` Scope:
  `engine/types.ts:130-135`, `engine/effect-types.ts:121-127`, `engine/effect-types.ts:277`. The
  `species-locked.md` citations (including `effect-types.ts:327-338`) were already in G's scope.

### Docs edited (round 2)

- `spec/effects.md`: "acted-before-target" (finding 1), "stacks: false" (finding 5).
- `spec/responses.md`: "Response targets" (finding 2), "Magnitude modes" (finding 4), "Flat mode"
  (finding 6).
- `spec/statuses.md`: "Turn-end cleanup" (finding 3).
- `ROADMAP.md`: Phase 7 "Effective stats on screen" pointer (finding 8).
- `phases/4.2/G/brief.md`: three stale `src/` comments added to Scope.
- `phases/4.2/D/inventory.md`: Reasons of C:327, C:380, C:583, C:678, C:755, C:1658, C:1823 record
  the round-2 changes.
- `phases/4.2/D/verify-request.md`: this section.
