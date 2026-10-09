# Report r1 — Phase 4.1 — Slice H2b2: status rules

Built to `plan.md` (Revision 1) with `plan-review.md` Round 2's six plan fixes as binding amendments.
Nothing committed. Four files were deleted by Duncan (listed under **To delete**). No living doc or
content doc was edited.

## Outcome

- **Single-instance statuses** (ASSUMPTION 114): `StatusDef.cap`, `StatusSpec.stacks`, the instance's
  stack count, the ×stacks count on ticks, `magnitude ** stacks`, the `consume-stacks` response, the
  `consumed-stacks` magnitude source and `StatusApplied.stacks` are gone. A re-application keeps the one
  instance (and its id), refreshes the timer to the new application's duration (even a shorter one),
  resets `appliedAt`, and replaces the snapshot only when its potency is **strictly** greater.
- **The applier snapshot** (ASSUMPTIONS 113, 143, 144, 145, 146): a ticking status declares
  `potency: { ofStat, percent }`; the instance records `{ applierId, affinity, potency }` at application;
  the tick is the `snapshot-potency` magnitude: indirect damage through `calculateIndirectDamage` (no
  third formula), credited to the applier while it lives, else the bearer; Regen heals the potency.
- Placeholders as decided: Poison 20% Attack, Burn 25% Intelligence, Regen 10% of the healer's Health,
  Spore 15% Speed; Vulnerability ×1.5 once; Igniter and Cinderlord one Burn.

## Gates

| Gate | Result |
|---|---|
| `npm run test` | 192 files, **1294 passed + 1 skipped (1295)** |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |

### Test count, reconciled file by file against `main` (182 files, 1266 tests)

| File | main → slice |
|---|---|
| `engine/status-snapshot.test.ts` (new) | – → 23 (+23) |
| ten `golden-h2b2-*.test.ts` (new) | – → 10 (+10) |
| `golden-sporch-cinderlord-burn-refresh.test.ts` (new, the rename) | – → 1 (+1) |
| `data/statuses.test.ts` | 7 → 10 (+3: potencies, Spore, only-four) |
| `engine/corpus-coverage.test.ts` | 6 → 7 (+1: the three snapshot cases) |
| `engine/resolution.test.ts` | 83 → 80 (−3: the `consume-stacks` describe (2) and its nested-validator test (1); the stack-cap test and the stack-scaled tick test were rewritten one-for-one) |
| `engine/effects.test.ts` | 52 → 50 (−2: the two `consumed-stacks` tests) |
| `engine/perform-action.test.ts` | 18 → 16 (−2: the two `consume-stacks` wrapped-effect validator tests) |
| `golden-consume-stacks.test.ts` (deleted) | 1 → – (−1) |
| `golden-sporch-cinderlord-burn-stacks.test.ts` (deleted, renamed) | 1 → – (−1) |
| **Net** | 1266 → 1295 (**+29**), 182 → 192 files |

Every other file is unchanged in count. Rewritten in place without a count change: `status-containers`
(the "scale by stacks" describe is now "no count of its own", five tests), `damage-observation` (the tick
scenario), and the mechanical `cap:`/`stacks:` removals across the files in plan section 3.

## Golden policy: deliberate, listed

Expected values compared **by importing the fixtures**, not by reading diffs: `main` extracted with
`git archive` to a scratch directory outside the repo, every `*.fixture.ts` imported from both trees, every
`expected*` export deep-compared (JSON, `undefined` as null), `stacks` stripped from `main`'s
`StatusApplied` events.

| Group | Count | Result |
|---|---|---|
| Identical as they are (incl. the **input edited, expected byte-identical** row: the `cap:` in local status defs and `amountPerStack` → `flatAmount` in `golden-heal-scaling-count`; `golden-b4-cleanse-then-tick` / `-remove-then-reapply` also gained a `potency`, no tick lands) | 79 | equal |
| **Field only**: equal to `main` with `stacks` stripped | 31 | equal after strip |
| **Field only, renamed**: `golden-sporch-cinderlord-burn-stacks` → `golden-sporch-cinderlord-burn-refresh` (setup lost its `stacks: 2`) | 1 | equal after strip (checked separately) |
| **Changed**, by rule (below) | 9 | differ |
| **Retired**: `golden-consume-stacks` (mechanism deleted) | 1 | gone |
| **New** (hand-derived) | 10 | – |

Field-only total 32 = the plan's prediction. The 9 changed are exactly the plan's predicted set: the 8 tick
goldens (7 with a `StatusApplied`) plus the "both rules" one.

| Golden | Rule | What changed (arithmetic in the fixture headers) |
|---|---|---|
| `golden-dot` | snapshot | tick 3, now sourced from CASTER (the living applier); potency floor(20×20/100)=4, 4 − 0.2×5 = 3 |
| `golden-f2-dot-one-turn` | snapshot | appliers given Attack 100/50 so ticks are real: 16 (source A), 6 (self-applied S) |
| `golden-f2-turn-end-interaction` | snapshot | H Speed 100: potency 15, tick 15 − 4 = 11 from H; MATE wounded to 20; the spread's inherited snapshot |
| `golden-spore-spread-dot-kill` | snapshot | P Speed 60: potency 9, tick 5 from P; MATE's tick is the inherited one |
| `golden-turn-end-dot-kill-burst` | snapshot | Rotcore Attack 50: potency 10, ticks 6; E1's source is E1 (applier dead at application) |
| `golden-turn-end-dot-kill-burst-refresh` | **both** | single instance (one instance re-applied, not two stacks) and snapshot (TANK's weak snapshot 4 replaced by Rotcore's 10, ticks 6 sourced from E1) |
| `golden-h2a-cost`, `golden-h2b1-observed-tick` | snapshot | local mini-poison now a potency status (5% of the applier's Health = 2): 2 − 4 = −2 → minimum 1 |
| `golden-hollowkin-wretch-self-dot` | snapshot | self-applied: potency floor(14×20/100)=2, 2 − 4 → minimum 1, WRETCH 100 → 99 |

**Recount against the H2b split's "41 / 8 / 3".** Resolved, not unexplained: the split's 41 is the number of
fixtures that **contain a `StatusApplied`** (41 at the split's commit `c2b0889` and 41 on `main` today), not
a field-only count. Those 41 are: 1 retired + 32 field-only + 8 changed by the snapshot (7 with an event, 1
is "both"). Tick goldens: 8 then and now. Stacking goldens: 3 (consume-stacks, Cinderlord, burst-refresh) →
1 retired, 1 reclassified field-only, 1 "both".

## Corpus digest: regenerated once (`npm run corpus:update`)

527 fights. **70 unchanged** (exactly the fights with no status event), **457 changed** (every fight
with a `StatusApplied` changed, through the dropped field alone at least). Results win 222 → 215, loss 266 → 260, draw 39 → 52; the result
changed in 23 fights and the event count in 107. Attribution in layers, with scratch trees outside the repo:
H0 = `main`'s log with `stacks` stripped; H1 = `main` with every application forced to one stack (single
instance, old flat ticks, old content), stripped; H2 = the final tree (equals the committed digest for all 527
fights).

| Layer | Rule | Fights |
|---|---|---|
| 1. Field only | H2 = H0 | **305** |
| 2. Single instance | H1 ≠ H0, and `main`'s log shows a re-application or `stacks > 1` | **89**, all with the evidence, 0 unexplained |
| 3. Snapshot | H2 ≠ H1, and a tick or Regen in `main`'s or the new log | **151**, all with the evidence, 0 unexplained |
| Both rules | H1 ≠ H0 and H2 ≠ H1 | 88 (listed under both) |
| Single instance only | | 1 |
| Snapshot only | | 63 |

305 + 1 + 88 + 63 = 457. **Unexplained: none.** The placeholder percentages ride layer 3; Igniter,
Cinderlord and Vulnerability ride layer 2.

Layer 3 split with a scratch switch (tick source forced to the bearer, the bearer's hooks given a source):
all 151 differ from the final tree by the **source label alone** once the tick's `sourceId` is normalised;
no fight contains a hook or retaliation effect from a tick. The predicted hook sub-case did not occur: no
Rotfeeder Ripper, Gorgemaw, Cinderlord or Gloomjaw Executioner trait fires off a living applier's tick in any
corpus fight (the Executioner is unreachable, as predicted).

Coverage (asserted by `corpus-coverage.test.ts`, no appended fight needed): 137 fights have a tick from a
living applier, 47 a tick from a dead applier, 108 a Spore spread.

**For H2c:** with the placeholder percentages and base stats, **~93% of ticks land on the minimum of 1**
(Spore 2730 of 2931, Burn 2032 of 2144, Poison 209 of 243): potency is 20–25% of a stat of ~20 (4–5) against
`0.2 × Defence` (~4). That is why draws rose 39 → 52. Not tuned here (out of scope).

## Mechanisms and the test that fails with each removed

Mutations were applied to a scratch copy of the finished tree outside the repo, one at a time, running the
named tests (the digest does not count). **All 22 killed** (18 of the plan, with 5, 6, 9 and 12 split per
site):

| # | Mutation | Killed by |
|---|---|---|
| 1 | stacking restored (stack count, event field, ×stacks) | `golden-h2b2-reapply`, `golden-h2b2-vulnerability-once`, `status-snapshot.test.ts` |
| 2 | the weaker value replaces the stronger | `golden-h2b2-reapply` |
| 3 | a tie replaces the current applier | `golden-h2b2-reapply` |
| 4 | the timer not refreshed on a weaker application | `golden-h2b2-reapply` |
| 5a / 5b | the tick / the Regen heal reads the bearer's stat | `golden-h2b2-tick-living-applier` / `golden-h2b2-regen-potency` |
| 6a / 6b | the snapshot read live from the applier / the healer | `golden-h2b2-tick-living-applier` / `golden-h2b2-regen-potency` |
| 7 | the tick on the old flat path (no Defence) | `golden-h2b2-tick-living-applier` |
| 8 | the dealt pool applied to a tick | `golden-h2b2-tick-living-applier` |
| 9a / 9b | the source left as the bearer while the applier / healer lives | `golden-h2b2-tick-living-applier` / `golden-h2b2-regen-potency` |
| 10 | the dead-applier fallback removed (damage and heal share `tickDealer`) | `golden-h2b2-tick-dead-applier` **and** `golden-h2b2-regen-potency` |
| 11 | `triggering-source` offered on a tick | `golden-h2b2-tick-no-retaliation` |
| 12a | a tick marked self-inflicted | `golden-h2b2-tick-dead-applier` (the real Flare fires) |
| 12b | self-inflicted when the dealer is the bearer (Round 2 fix 5) | `golden-h2b2-tick-self-applied` |
| 13 | the spread snapshotting fresh | `golden-h2b2-spore-spread` |
| 14 | a carrier passing its own snapshot on | `golden-h2b2-carrier-fresh` |
| 15 | the tick uses the bearer's affinity | `golden-h2b2-tick-living-applier` (asymmetric ×1.25 / ×0.75) |
| 16 | the applier offered as `on-death`'s source on a tick kill | `golden-h2b2-tick-kill-on-death` |
| 17 | dealer-side hooks fire on the fallback bearer | `golden-h2b2-tick-dead-applier` |
| 18 | dealer-side hooks do not fire for a self-applied living applier | `golden-h2b2-tick-self-applied` |

The `fireHook` live-instance read of the snapshot (ASSUMPTION 7) has no row: it is unobservable today, as the
plan said. A revived applier being the source again is pinned in `status-snapshot.test.ts` (alive → dead →
revived).

## Round 2 plan fixes

1. **Step 1's red set**: the expected-red set is moot, see **Deviations**. `stacks` was stripped from **every**
   expected `StatusApplied` (39 fixtures + the new Cinderlord pair), and `corpus-digest.test.ts` stayed red
   until the one `corpus:update`.
2. **Evidence (a)** used "a `StatusApplied` on a creature that already holds that status, or `stacks > 1`":
   89 of 89 with it.
3. **Fixture inputs**: the deep-compare ran over **every** golden (table above); `amountPerStack` →
   `flatAmount` also touched `damage-observation.test.ts`, `spell-effects.test.ts`, `resolution.test.ts`,
   `status-containers.test.ts`, `glimmerdark.test.ts` and `golden-heal-scaling-count`.
4. **A tick with no snapshot fails loud**: `requireSnapshot` throws in both the `deal-damage` and `heal`
   branches; `status-snapshot.test.ts` has the two throwing cases plus an instance built by hand without one.
5. **Mutation 12 at the self-applied site**: `golden-h2b2-tick-self-applied` carries the Flare-shaped ally
   observer; 12b is killed there.
6. **Assumption 5, side effects**: a `perform-action` with `actor: 'triggering-source'` on `on-damage-taken`
   and a trigger `condition` with `subject: 'target'` on `on-damage-taken` / `on-death` get nothing from a
   tick; no shipped content has either (all six `subject: 'target'` conditions in `src/data` are
   `conditional-damage-bonus` passives).

## Acceptance grep

`rg -n "\bcap\b|stacks|consume-stacks|consumed-stacks|amountPerStack|statusStacks|inheritSnapshot" src/engine src/data`
(tests and fixtures included). No status `cap`, status `stacks`, `consume-stacks`, `consumed-stacks`,
`statusStacks` or `inheritSnapshot` remains. Every survivor, named:

- **The Overtone dedup flag** (`TriggeredDef.stacks: false`, ASSUMPTION 114): `effect-types.ts` (the field and
  `nonStacking`), `effects.ts:204-205`, `resolution.ts` (`claimedNonStacking` and the comments around it),
  `glimmerdark.ts` (Flare/Overtone comments and `stacks: false`), `actions.test.ts:403`,
  `status-containers.test.ts:308,390`, `resolution.test.ts` (the `stacks:false` tests and fixture),
  `golden-b2-provoke-redirects-echo`, `golden-e-echo-chain-truncated`, `golden-resonant-overtone`.
- **The word `cap` for something else**: the round cap, the revive cap (10), `MAX_TRIGGER_CASCADE_DEPTH`
  wording, the Additional's level cap (`ADDITIONAL_BASE_CAP`), Bulwark's `reductionCap` and "cap 80%", the
  enemy-party-size cap, and the golden names `golden-defend-count-additive-cap`, `golden-d3-revive-cap-*`,
  `golden-h2a-additional-*`.
- **Negative assertions and notes**: `'stacks' in …` toBe(false) in `status-snapshot.test.ts:135,211` and
  `resolution.test.ts:530`; the comment in `golden-h2b2-reapply` ("no `stacks` field"); the rename note in
  `effect-types.ts:209`; the Cinderlord golden's header ("2 stacks lived in the SETUP").
- **Unrelated "stacks"**: `effective-stats.test.ts:86` ("stacks modifiers multiplicatively"), `core.ts:62`
  (stat-modifiers), `resolution.test.ts` "re-stacking" (stat-modifier ids), `effect-types.ts` "stacked
  sources" (additive passives).
- Outside both directories, named separately: `state/balance-sim.ts` and its test (the balance simulator's
  stat-modifier "stacks", `StackCount` and friends). Its test lost only the `stacks`/`cap` fields in event and
  status literals.

## Deviations from the plan

- **Built as one pass, not two checkpoints.** The single-instance and snapshot rules went into
  `resolution.ts` together (splitting meant rewriting `applyStatus`/`executeResponse` twice). The plan's step 1
  "gates stay green between them" was therefore not measured; the Round 2 red-set fix is moot. The only
  intermediate stop was Duncan's deletion of the four files, with the full suite red only in the predicted
  places (the tick goldens, the burst-refresh, `corpus-digest`, the tick scenario in `damage-observation`).
- `DamageOrigin` lives in `resolution-types.ts` (the leaf module `resolution.ts` already imports its types
  from) and is re-exported from `resolution.ts`.
- New exports: `snapshotFor` (`effects.ts`); `isSnapshotTick`, `validateNoSnapshotPotencyOutsideStatus`,
  `SnapshotPotency`, `StatusSnapshot` (`effect-types.ts`). `heal.flatAmount` replaced `amountPerStack`.
- The plan listed `core.ts` / `rotcap-hollow.ts` spell comments as touched: no change was needed there; only
  Blinding Flare's comment (`glimmerdark.ts`) changed. `app/demoFight.ts` needed none.
- Several tick goldens had their fixture stats raised (an applier Attack of 50–100, a Speed of 60–100) so the
  tick is not the minimum 1: derivations are in each header. `golden-h2a-cost`, `golden-h2b1-observed-tick`
  and `golden-hollowkin-wretch-self-dot` legitimately land on the minimum (the point of the first).

## ASSUMPTIONS in scope, as built

1–18 of the plan's checklist hold as written. Notes: (8) the refresh takes the new duration even when shorter
(tested: remaining 1); (9) `StatusApplied.sourceId` is the applying creature, including for an inherited
snapshot; a tie also refreshes the timer (it keeps the instance whole, but the timer is the new
application's); (12) no coverage fight needed; (14) no armour penetration on a tick.

## Spec questions

For the docs, before H2c's kickoff:

1. **A plain flat number inside a status that damages its own bearer is now a cost**, not a tick (ASSUMPTION
   144), while a plain flat **heal** inside a status is an ordinary heal. Intended? (No shipped content has a
   flat number self-damage in a status; the fixtures were converted.)
2. **Weaker or tied re-applications refresh the timer** (even to a shorter one), per ASSUMPTION 114 as the
   kickoff read it. The docs say "refreshes the timer"; they do not say "even when shorter". Worth one
   sentence.
3. **A self-applied tick makes its bearer the dealer** (its `on-damage-dealt` fires). Consistent with 113,
   stated in ASSUMPTION 146; no content depends on it.
4. **Minimum-1 ticks** (see the digest): H2c's tuning must lift potency above `0.2 × Defence`, or ticks stay
   at 1.
5. **Stale living-doc text** (the design agent flips these at the PR review):
   - CONVENTIONS: `:246-254` (response counts; `consume-stacks` "until 4.1-H2b"), `:273`, `:306`, `:333-336`
     (`amountPerStack` → `flatAmount`), `:383`, `:439-440` (`consumed-stacks`), `:497-500`, `:792`, `:935-936`,
     `:1027`, `:1319-1321`, `:1334`, `:1349`, `:1498-1505` (**the built form is `origin: { kind: 'hit' } |
     { kind: 'cost' } | { kind: 'tick', dealerId }`**, not the bare string union), `:1520`, `:1569-1571`
     (the response list and "nine"), `:1621`, `:1631`, `:1648`, `:1696`.
   - GAME_DESIGN: `:478`, `:726`, `:777`. ROADMAP `:251` (H2b2 done).
   - ASSUMPTION 131 (superseded by 144) and the brief's checklist items 113/114/143/144/145/146 now describe
     built behaviour.
6. The CONVENTIONS "Response vocabulary" count: the data has **eight** responses after `consume-stacks` goes
   (`deal-damage`, `heal`, `apply-status`, `apply-stat-modifier`, `revive`, `grant-action-state`,
   `remove-status`, `perform-action`), and `effect-types.ts` now says "the final response verb" for
   `remove-status` instead of "the 9th".

## Content changes (as built)

- **Poison**: potency 20% of the **applier's** effective Attack at application (was 3% of the bearer's Health
  per stack); tick = indirect damage from the snapshot. Default duration 3 unchanged.
- **Burn**: potency 25% of the applier's Intelligence (was 5% of the bearer's Health per stack).
- **Regen**: potency 10% of the **healer's** Health (was 5% of the bearer's per stack); credited to the healer
  while it lives, else the bearer.
- **Spore**: tick potency 15% of the applier's Speed (was 4% of the bearer's Health per stack); the on-death
  spread now passes the dying bearer's whole snapshot (applier, affinity, potency) to the new host.
- **Vulnerability**: ×1.5 once, however often it is applied (`cap: 2` removed; was ×2.25 at two stacks).
- **Sporch Igniter**: one Burn per hit (was a 2-stack Burn); the Burn's potency is the Igniter's own
  Intelligence.
- **Sporch Cinderlord**: one Burn per remaining enemy on a kill (the explicit `stacks: 1` removed); a Burn
  already present keeps its stronger snapshot and refreshes its timer.
- **Flickerling Wick's heal**: data rename only (`amountPerStack` → `flatAmount`), still 20% of the Wick's own
  Health.
- **Blinding Flare, Afterglow, Venom Bolt, Withering Bolt, Spore Cyst**: spell data unchanged (Flare's code
  comment now reads "×1.5 damage taken, once"); their effects land through the rules above.
- Every other status lost `cap` with no behaviour change (Weaken, Stun, Web, Sleep, Grant Act First,
  Confusion, Silenced, Pacified were already single-instance).
- The docs' "per stack" / "2-stack" / "1 stack" lines (the Spore paragraph, the Sporch table, Afterglow's
  "per stack" row, the "Decided at the 4.1-H2 grill" items) are for the design agent to fold.

## To delete

None remaining. Already deleted by Duncan at the checkpoint:
`src/engine/__golden__/golden-consume-stacks.fixture.ts` and `.test.ts` (retired),
`src/engine/__golden__/golden-sporch-cinderlord-burn-stacks.fixture.ts` and `.test.ts` (renamed to
`golden-sporch-cinderlord-burn-refresh.*`). Scratch trees (`main`, `new`, `old2` under the session's
scratchpad directory) are outside the repo.
