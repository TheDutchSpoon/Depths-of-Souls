# Plan review — Phase 4.1 — Slice H2b2: status rules

## Round 1

Reviewed `plan.md` against `kickoff.md`, `brief.md`, the 4.1 brief (ASSUMPTIONS 112–115, 129, 131,
132, 134, 136, 139, 142, 143), CONVENTIONS ("DoT and Regen from the applier's snapshot", "Damage
channels and the Additional", "Status lifecycle", "Damage observation", "`triggering-source` never
resolves to the firing creature itself", "Response vocabulary", "Death-reset") and the code on
`phase-4.1-slice-h2b2` (`resolution.ts`, `effects.ts`, `damage.ts`, `data/statuses.ts`, the Rotcap,
Glimmerdark and core traits, the spells, every golden fixture with a `StatusApplied` or a tick).

**Verdict: changes needed.** The approach is right: the order (single instance, then the
snapshot), reusing `calculateIndirectDamage` with the snapshot's inputs, `origin` as a required
parameter, and reading the snapshot from the live instance are all sound, and the mutation table
matches the kickoff's one for one. What needs fixing: one golden is misclassified, one count claim
is wrong, the digest attribution is residual where it must be positive, three mechanisms are
missing a test at one of their sites, and the plan edits docs that are mine to edit. Two things
need Duncan (below).

Two slips in my kickoff, so the coding agent doesn't chase them: `golden-sleep-wake` is listed under
"must stay green" but it logs a `StatusApplied`, so it is field-only (the plan is right). And the
Rotfeeder Ripper and Gorgemaw heal **`on-kill`**, not `on-damage-dealt`: no shipped trait, perk or
status listens to `on-damage-dealt` at all.

### Plan fixes

1. **`golden-sporch-cinderlord-burn-stacks` is field-only, not "single instance".** Its expected
   events are Cinderlord's kill and two `StatusApplied` (ENEMY_A Burn 3 turns, ENEMY_B Burn
   refreshed to 3 turns). ENEMY_B's 2 stacks live in the setup, which writes into a throwaway
   events array. With `stacks` stripped, `main`'s export equals the new one, so the step-0
   deep-compare will report it field-only, contradicting section 3. List it as **field-only
   expected, setup changed** (the setup's `stacks: 2` spec goes). Say what it still pins: a
   refresh resets the duration 1 → 3 with no count. The stacking mechanism it was named for is
   gone. See assumption 10 for the name.
2. **The "41/8/3 match" sentence is wrong.** The H2b split's 41 counted goldens that **only lose
   the stack count**. The plan's 41 is fixtures that **contain** a `StatusApplied`, and its own
   field-only group is 31 (32 with fix 1). Recount against the split, explaining the gap (H2b1
   retired `golden-glowfly-detonator` and changed the Glimmerdark content; name what else moved),
   or drop the claim. The table stays the prediction; this sentence just can't say the counts
   agree when they don't.
3. **The digest attribution must be positive at every layer, not residual.** Layer 3 is "the
   remainder, against the final tree", which can't fail, so "an unexplained fight is a bug" can
   never trigger. Make each layer show its cause in the fight's own log:
   - **single instance:** `main`'s log has a re-application, meaning a `StatusApplied` on a
     creature that already holds that status, or a Vulnerability, Igniter or Cinderlord
     application;
   - **snapshot:** the fight has a tick or a Regen heal, in `main`'s log or the new one;
   - a changed fight showing neither cause is reported as **unexplained**.

   Also flag fights changed by **both** rules: the layer-2 hash differs from stripped `main`,
   *and* the final hash differs from layer 2. Those are listed under both, as the kickoff asks for
   goldens.
4. **Don't derive interim goldens at the step-1 checkpoint.** With single instance in place and
   ticks still on the old path, greening the tick and stacking goldens would mean deriving values
   for the interim refresh-only rule. ASSUMPTION 139 rejected that rule ("the stacking goldens
   changing twice"). At step 1 run the gates, and expect exactly the snapshot goldens to fail
   (list them in advance). Derive every changed golden once, against the final rules, in step 3.
5. **Mechanisms tested at every site** (coding-rules: "at every site the mechanism lives"):
   - **Regen is the second site of the snapshot.** Mutations 5 (reads the bearer's stat), 6 (read
     live) and 10 (dead-applier fallback removed) must also be killed at the heal.
     `golden-h2b2-regen-potency` gains a phase where the healer dies, so `HealApplied.sourceId`
     falls back to the bearer (assumption 3), and the healer's Health changes between application
     and tick.
   - **The snapshot's affinity.** `golden-h2b2-tick-living-applier` needs a non-neutral applier vs
     bearer matchup, different from the bearer vs applier reading, plus a mutation row "the tick
     uses the bearer's affinity (or neutral)". As planned, every potency case could be
     same-affinity, and nothing would catch a dropped affinity.
   - **`origin: 'tick'` has two bearer-side sites:** `on-damage-taken` and `on-death`. Only the
     first has a test. Add one for `on-death` (assumption 6): a fixture `on-death →
     deal-damage(triggering-source)` on a bearer killed by a living applier's tick; the applier
     takes nothing. Add it to the mutation table ("the applier offered as `on-death`'s source on a
     tick kill").
6. **Carry the dealer on the tick path** (decide-point 2, decided: ASSUMPTION 146). State which
   of the bearer's and the applier's hooks fire in each of the three cases (living applier, dead
   applier, self-applied), and test each: the dead-applier golden shows a bearer-side
   `on-damage-dealt` fixture trait **not** firing on the fallback; a self-applied tick shows it
   firing. Add the mutation "dealer-side hooks fire on the fallback bearer".
7. **Acceptance grep: include tests and fixtures.** Tests are colocated in `src/engine`; a stale
   status `stacks` in a test or fixture is exactly what the field-only claim rules out. Run the
   grep over all of `src/engine` and `src/data` and name every survivor: `TriggeredDef.stacks`,
   `nonStacking`, `claimedNonStacking` and their tests, `golden-resonant-overtone`, every
   `\bcap\b` word that isn't a status cap (round cap, revive cap), and the Cinderlord golden's
   import line if it isn't renamed (assumption 10). `state/balance-sim.ts` stays named separately,
   as planned.
8. **Docs: none.** (Revised after Duncan's call below.) The coding agent edits no living doc,
   content docs included (`coding-rules.md`, "The living docs are the design agent's"). Drop the
   plan's Docs section. Move its CONVENTIONS list under **Spec questions**, and list the H2b2
   content changes under the report's **Content changes** (the kickoff's revised "Content docs"
   trap). I fold the content docs at the PR review, and flip the "until 4.1-H2b" markers there.
9. **Predicted hook sub-case, made complete.** The `on-kill` readers are the Ripper, the Gorgemaw,
   the Cinderlord **and the Gloomjaw Executioner** (+15% Attack per kill). Say whether a DoT from
   an Executioner is reachable in the corpus: it is Violence, and Withering Bolt is Violence but
   unlocks at biome 3 while Gloomjaws live in biome 2. There are no `on-damage-dealt` readers, so
   drop "on-damage-dealt" from the predicted list and say so.

### Assumptions

| # | Item | Verdict |
|---|---|---|
| 1 | Data shape: `StatusDef.potency`, `snapshot-potency`, `StatusSnapshot`, `inheritSnapshot` | **Decide-point 1** (accept, minus the flag) |
| 2 | `heal.amountPerStack` → `flatAmount` | **Confirm.** Also update the `heal` mode-exclusivity invariant message and `validateSpellEffects`' "no amountPerStack" check. |
| 3 | Regen `HealApplied.sourceId`: the applier while it lives, else the bearer | **Confirm** (one tick rule). Tested per fix 5. |
| 4 | A tick is the `snapshot-potency` response (replaces ASSUMPTION 131's test) | **Decide-point 1.** This changes a decided item, so it comes back to Duncan. |
| 5 | Required `origin: 'hit' \| 'tick' \| 'cost'` instead of `selfInflicted` | **Confirm**, with **decide-point 2** on what the fallback source fires. Also state the side effect: a `perform-action` with `actor: 'triggering-source'` on `on-damage-taken` now gets no actor on a tick (today it gets the bearer). No content has one. |
| 6 | `on-death` after a tick kill gets no source | **Confirm.** It keeps today's observable behaviour: today the source is the bearer, which `triggering-source` already refuses. Needs a test (fix 5). |
| 7 | The snapshot is read from the live instance at fire time | **Confirm** as the safe read. Say it is unobservable today: a same-pass refresh makes the instance born, so its tick is skipped, and a corpse can't be re-applied. It needs no mutation row; don't claim one. |
| 8 | A refresh takes the new duration even when shorter; only the snapshot is "stronger"-gated | **Confirm** (ASSUMPTION 114, kickoff). |
| 9 | `StatusApplied.sourceId` stays the applying creature | **Confirm.** The event reports the act of applying; tick sources show who owns the snapshot. |
| 10 | The Cinderlord golden keeps its file name | **Correct:** reclassify it (fix 1). I recommend renaming it `golden-sporch-cinderlord-burn-refresh` (Duncan deletes the two old files, the agent creates the new ones), since the name describes a deleted mechanism. If Duncan keeps the name, its import line is a named grep survivor. |
| 11 | The fixture-local tick statuses become `potency` statuses | **Confirm**, and it's required, not optional: under assumption 4, an unconverted `MINI_POISON` (a status's plain flat self-damage) is a **cost**, and `golden-h2b1-observed-tick`'s watcher would fire. Re-derive their amounts by hand. |
| 12 | Append a coverage fight if step 0 finds a case missing | **Confirm** (append only, existing entries untouched, as in D2). |
| 13 | Myconet Rotcore: the corpse's effective stats are read at `on-death` | **Confirm** (decided at the kickoff). |
| 14 | No armor penetration on a tick | **Confirm** (kickoff formula). |
| 15 | Simulator, store and `demoFight` need no engine-facing change | **Confirm.** `balance-sim.test.ts` must stay green as is, apart from the field. |

The golden policy matches the kickoff: deliberate and listed, the retirement, field-only proved by
importing fixtures, and one `corpus:update` with layered attribution. The mutation table covers the
kickoff's fourteen. Fixes 5 and 6 add rows.

### Decide-points

**1. The data shape, and the marker replacing ASSUMPTION 131's tick test.** My recommendation:
**accept `potency` + `snapshot-potency`, and drop `inheritSnapshot` in favour of the rule itself.**

- *The marker.* Under 131, "statusId + flat + self" is a tick. Every flat self-damage in a status
  would then read the snapshot, while a formula-mode one is a cost: one status, two
  classifications by magnitude mode. The marker makes a tick something the data says, and the
  plan's validators make it exist only inside a status that declares a potency. ASSUMPTION 116
  already counts a status's own self-damage as a cost, so everything that isn't the marker being a
  cost is the decided rule. No shipped content changes classification: the four ticking statuses
  get the marker, and the three fixture-local tick statuses are converted (assumption 11). 131's
  other job, "a tick is never self-inflicted", moves to `origin: 'tick'`, which the marker's
  branch sets.
- *The flag.* ASSUMPTION 143 is a rule: "when a status's own effect applies that same status, the
  new instance copies the firing instance's snapshot." A flag the validator only *allows* makes
  the rule optional: a future spreading status that forgets it would silently snapshot the dying
  bearer. The rule is directly checkable in `executeResponse`'s `apply-status`:
  `context.statusId === spec.statusId` → pass `context.snapshot`. A trait, perk or spell has no
  `statusId` in its context, so "a carrier passing its snapshot on" stays impossible, and
  mutations 13 and 14 are killed by the same two goldens. One field fewer, and nothing to forget.
  If you'd rather keep the flag, the validator must **require** it on a status's own
  self-application, not just allow it.

**2. On a dead-applier tick, does the bearer fire the dealer-side hooks?** `applyDamageAndEmit`
fires `on-damage-dealt` on `sourceId`. When the source falls back to the bearer (and today, on
every tick), the bearer runs its own `on-damage-dealt` with itself as the victim. `on-kill` can't
fire, because a killed bearer is dead. ASSUMPTION 113 says the applier is the source "so its
on-kill and on-damage-dealt hooks fire"; it doesn't say the fallback is a dealer. My recommendation:
**the tick path carries the dealer: the applier while it lives, else none. The bearer stays the
logged `sourceId` on the fallback, but no dealer-side hook fires.** A self-applied tick (applier =
bearer, alive) is the applier, so its hooks fire, which is the literal reading of 113. The dealer is
carried rather than inferred from `sourceId === target.id`, the same discipline as
`selfInflicted`. No shipped content reads `on-damage-dealt`, so this changes no corpus fight. It
settles the meaning before a lifesteal trait inherits the quirk. The alternative is keeping
today's behaviour (the fallback bearer is a full dealer), which is equally cheap; it just has to be
stated and tested.

### Decisions (Duncan, 2026-10-09)

- **Decide-point 1: accepted as recommended.** The `potency` + `snapshot-potency` shape is the tick
  declaration and supersedes ASSUMPTION 131's test (now **ASSUMPTION 144**). `inheritSnapshot` is
  **dropped**: a status's own `apply-status` of that same status copies the firing instance's
  snapshot by rule (`context.statusId === spec.statusId`), **ASSUMPTION 145**. The plan removes the
  flag, its validator and the `apply-status` invariant, and keeps mutations 13 and 14 on the same
  two goldens. Duncan asked whether every damage piece shouldn't carry a source: it already does
  (`DamageDealt.sourceId` is required on every damage event, unchanged here). The source says who
  gets credit; the marker says which rule computes the damage. The source can't do the marker's
  job, because a tick's source can be its own bearer, which is exactly what a cost looks like
  (why H2b1 refused to infer self-inflicted from the ids).
- **Decide-point 2: accepted as recommended.** The tick carries its dealer: the living applier,
  else no one; the fallback bearer is the logged source only (**ASSUMPTION 146**, which also
  records `origin`, the bearer's no-source hooks and Regen's `HealApplied` source). Fix 6 is
  updated.
- **Process: the living docs are the design agent's, content docs included** (Duncan, in this
  round). The coding agent lists content changes in its report; the design agent folds them at the
  PR review from the code as verified. Why: the content docs are the spec the review checks the
  code against, and if the builder rewrites them, a deviation can land in code and doc together and
  pass review. Fix 8 and the kickoff's "Content docs" trap are revised.
- **Assumption 10: rename accepted.** `golden-sporch-cinderlord-burn-stacks` becomes
  `golden-sporch-cinderlord-burn-refresh` (`.fixture.ts` and `.test.ts`). The coding agent creates
  the two new files with the reclassified content (fix 1), then stops and asks Duncan to delete the
  two old ones, as for `golden-consume-stacks`. The report lists it as a rename, with its expected
  events equal to `main`'s once `stacks` is stripped, and it is not a grep survivor.

### Docs edited

- `.claude/briefs/phase-4.1-implementation-plan.md`: ASSUMPTION 131 marked superseded; ASSUMPTIONS
  144 (the tick marker and data shape), 145 (pass-on by rule, no flag) and 146 (the tick's dealer,
  `origin`, no source for the bearer's hooks) added; the "Content docs stay in sync" rule now says
  the design agent folds at the PR review.
- `.claude/CONVENTIONS.md`: "DoT and Regen from the applier's snapshot" (the dealer rule, Regen's
  source, pass-on by rule, the data shape); "Flat-mode stat-derived magnitude" (the
  `amountPerStack` rename); "Damage channels", who decides the channel (the tick recognised by its
  marker from 4.1-H2b2); "Damage observation" (`origin` replaces `selfInflicted`).
- `.claude/phases/4.1/H2b2/kickoff.md`: the "Content docs fold now" trap became "fold at the PR
  review" (report them under Content changes).
- `.claude/WORKFLOWS.md` *(process, own commit)*: the coding agent never edits living docs; the
  design agent folds content docs.
- `.claude/workflow/coding-rules.md` *(process, own commit)*: "The living docs are the design
  agent's" rule; **Content changes** added to the report format; the content-slice line
  rewritten.
- `.claude/workflow/pr-review.md` *(process, own commit)*: the design agent folds content docs on
  the slice branch at the PR review.

## Round 2

Reviewed the revised `plan.md` (Revision 1) against round 1's fixes and decisions, ASSUMPTIONS
143–146 as written, CONVENTIONS "DoT and Regen from the applier's snapshot", and the code on
`phase-4.1-slice-h2b2` (`resolution.ts` `fireHook`, `executeResponse`, `applyDamageAndEmit`,
`applyStatus`, `resolveResponseTargets`; `damage.ts` `calculateIndirectDamage`; every golden
fixture with a `StatusApplied`, a `cap`, an `amountPerStack`, a `'dot'` hit or a `HealApplied`;
every data trigger on `on-damage-taken` / `on-death` and every `subject: 'target'` condition).

**Verdict: approved, with the six plan fixes below as build conditions** (decide-point 1). Every
round-1 fix and both decisions landed, and they landed correctly: the dealer union, the hook table
per case, pass-on by rule, the positive layers with "unexplained" as a real outcome, Regen and the
affinity as tested sites, the `on-death` site, the complete `on-kill` reader list, and the docs
handed back. The plan also corrected me in one place, rightly: at step 1 ticks haven't moved, so
the snapshot goldens can't fail there (round 1's fix 4 said they would). What's left is precision,
not design: one step-1 prediction that doesn't hold as written, one attribution test that is too
loose to fail, fixture edits missing from the changed set, and two small test gaps.

Verified against the code, so nobody re-checks them: `HookContext.statusId` is set for every
status-sourced candidate (`fireHook` passes `effect.statusId`), so assumption 16's step-0 check is
already answered. The tick formula's inputs match `dealDamageCore`'s indirect branch exactly (same
Defend factors, same taken-factor order) once the dealt pool, armour penetration and the Additional
are dropped. The predicted groups match the fixtures: 43 files mention `StatusApplied`, 41 log one;
the two `golden-b4-*` and `golden-f2-win-over-own-tick` log no tick; `golden-spore-spread`,
`-filter` and `golden-rot-sovereign` log no tick either.

### Plan fixes (build conditions)

1. **Step 1's red set, made true.** As written, step 1 strips `stacks` from "the field-only
   fixtures" only. The seven snapshot goldens and `golden-turn-end-dot-kill-burst-refresh` also log
   a `StatusApplied` with `stacks`, so they would go red on the field, not stay green. Strip the
   field from **every** expected `StatusApplied` at step 1: it is a field removal, not a
   derivation, and the step-0 deep-compare justifies it the same way. The expected red set at step
   1 is then: `golden-turn-end-dot-kill-burst-refresh` (stays red until step 3),
   **`corpus-digest.test.ts`** (red from step 1 until the one `corpus:update` at step 4, since
   every fight with a status changes through the field), and the unit tests rewritten in that
   step. Fix section 1's "the gates stay green between them" to say exactly that.
2. **Evidence (a) must be able to fail.** "An application of Vulnerability, Igniter's Burn or
   Cinderlord's Burn" accepts any fight where one of them is applied once, but a single
   application changes nothing under single instance: Vulnerability at one stack was already
   `1.5 ** 1`, and Cinderlord already applies `stacks: 1`. The only first application that changes
   is Igniter's `stacks: 2`. Replace the clause with: **a `StatusApplied` on a creature that already
   holds that status, or a `StatusApplied` with `stacks > 1`, in `main`'s log.** That covers all
   three content changes, and a layer-2 change without it is unexplained.
3. **Fixture inputs that change are in the changed set.** The table covers expected events only.
   Add a row **"input edited, expected byte-identical"**: the `cap:` in local status defs of
   `golden-b4-cleanse-then-tick`, `-remove-then-reapply`, `golden-b6-provoke-stun-cleanup`,
   `golden-defend-count`, `golden-defend-count-additive-cap`, `golden-h2a-cost`,
   `golden-h2b1-observed-tick`, `golden-sleep-wake`, `golden-turn-order-status` and
   `golden-web-break-free`; and `amountPerStack` → `flatAmount` in `golden-heal-scaling-count`
   (today counted "unchanged"). Run the step-0 deep-compare over **every** golden, not only the
   field-only group: field-only ones equal with `stacks` stripped, all others equal as they are.
   That is what proves this row. Also complete assumption 2's touch list: the rename also touches
   `damage-observation.test.ts`, `spell-effects.test.ts`, `resolution.test.ts` and that fixture.
4. **A tick with no snapshot fails loud.** If the `snapshot-potency` response fires and the context
   carries no snapshot (an instance built by hand without one, a future path that forgets it), that
   is a resolver-invariant throw, not a fallback to 0 or to the bearer's stat. Say so in
   `executeResponse`'s two branches and add the throwing case to `status-snapshot.test.ts`. This is
   the same "carried, never inferred" discipline as `origin`: a silent fallback would reintroduce
   the bearer-relative tick with nothing failing.
5. **Mutation 12 at the self-applied site.** The dead-applier golden kills "self-inflicted when
   `sourceId === target.id`". It doesn't kill "self-inflicted when the dealer is the bearer", which
   is the id inference H2b1 refused, in its other spelling. Give `golden-h2b2-tick-self-applied` a
   Flare-shaped ally observer (`relationship: 'ally'`, `selfInflicted: true`) that stays silent,
   and name it as mutation 12's second killer.
6. **Assumption 5, one more side effect, stated.** With no source on a tick, a trigger `condition`
   with `subject: 'target'` on the bearer's `on-damage-taken` or `on-death` now evaluates false
   (today it reads the bearer). No shipped content has one: all six `subject: 'target'` conditions
   in `src/data` are `conditional-damage-bonus` passives. One sentence beside the `perform-action`
   one.

### Assumptions

| # | Item | Verdict |
|---|---|---|
| 1 | Data shape | **Confirm** (ASSUMPTION 144 as decided). |
| 2 | `amountPerStack` → `flatAmount` | **Confirm**; touch list completed (fix 3). |
| 3 | Regen `HealApplied.sourceId` | **Confirm** (146). |
| 4 | The marker is the tick | **Confirm** (144); a marker with no snapshot throws (fix 4). |
| 5 | `origin` as `hit \| cost \| tick{dealerId}` | **Confirm.** The union is a faithful refinement of 146's three values; 146's wording updated to match. Side effects stated (fix 6). |
| 6 | `on-death` after a tick kill gets no source | **Confirm.** |
| 7 | Snapshot read from the live instance; unobservable, no row | **Confirm.** |
| 8 | Refresh takes the new duration even when shorter | **Confirm.** |
| 9 | `StatusApplied.sourceId` stays the applying creature | **Confirm.** |
| 10 | Cinderlord golden renamed `-burn-refresh` | **Confirm** (decided). Note its expected ENEMY_B event carries `stacks: 3` today; still field-only. |
| 11 | Fixture-local tick statuses become `potency` statuses | **Confirm.** |
| 12 | Coverage fight appended if missing | **Confirm.** |
| 13 | Rotcore reads the corpse's effective stats | **Confirm.** |
| 14 | No armour penetration on a tick | **Confirm.** |
| 15 | Simulator, store, `demoFight` | **Confirm.** |
| 16 | Pass-on by rule | **Confirm** (145). The step-0 check is already answered: `fireHook` sets `statusId` for every status-sourced candidate. |
| 17 | The tick carries its dealer | **Confirm** (146). |
| 18 | Step 1 strips `stacks` mechanically | **Correct:** from every expected `StatusApplied`, not only the field-only group (fix 1). |

Golden policy: matches the kickoff (deliberate and listed; retirement; field-only proved by
importing fixtures; one `corpus:update`, attributed in positive layers). Mutation table: the
kickoff's fourteen plus round 1's four, each with a named non-digest killer; fix 5 adds a second
killer to row 12.

### Decide-points

**1. Approve now with the six fixes as build conditions, or one more plan revision?** My
recommendation: **approve now.** None of the six changes a design decision, a mechanism or a
golden's meaning: they correct one prediction, tighten one attribution test, add a table row, one
throw, one observer and one sentence, and each is written above precisely enough to build from.
A third round is the workflow's signal to pull a slice back into a design pass, and this slice
doesn't need one. The risk is the coding agent building from `plan.md` alone and missing them, so
the condition is concrete: I add `plan-review.md` Round 2 to the kickoff's reading list as
binding plan amendments, and the PR review checks all six. If you'd rather keep `plan.md` the single
source, run `/slice-plan 4.1-H2b2` once more; I'd review it as a light round 3 and not count it as
a pull-back signal.

### Decisions (Duncan, 2026-10-09)

- **Decide-point 1: approved now, as recommended.** The plan is approved with the six plan fixes
  above as binding build conditions; no round 3. `kickoff.md`'s reading list now names this
  section, and the PR review checks each of the six.

### Docs edited

- `.claude/briefs/phase-4.1-implementation-plan.md`: ASSUMPTION 146's `origin` sentence matches the
  plan's union (`tick` carrying its dealer or none), and records that a `subject: 'target'`
  condition reads no creature on a tick.
- `.claude/phases/4.1/H2b2/kickoff.md`: the reading list names Round 2's plan fixes as binding
  amendments to `plan.md`.
