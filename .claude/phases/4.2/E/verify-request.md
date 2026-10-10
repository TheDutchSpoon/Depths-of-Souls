# Verify request — Phase 4.2 — Slice E (round 1)

Design agent → coding agent. Check the two condensed spec files against `main`'s code and against
their old text (`git show 892f1b8:.claude/CONVENTIONS.md` and `GAME_DESIGN.md`, or the 4.2-A text
at `git show f666d7c:.claude/spec/<file>.md`), using `inventory.md` in this mailbox.
`npm run docs:check -- inventory E` passes: 87 units, 87 rows, base `f666d7c`. The slice id for
the script is `E`.

## Files condensed

| File | Before (bytes) | After (bytes) |
| --- | --: | --: |
| `spec/combat.md` | 52,931 | 35,201 |
| `spec/scripting.md` | 19,910 | 11,557 |

Total 72,841 → 46,758 bytes. No `## To fold` is left. Each file gains a `## Not built` half: Manual
mode (Phase 9) in combat, the script editor (Phase 6) in scripting (phase brief, rule 1).

## Rows per fate

| Fate | Rows |
| --- | --: |
| kept | 0 |
| rewritten | 54 |
| merged | 25 |
| moved | 0 |
| dropped | 8 |

Nothing changed file except one part of C:1129: "one modified hit, not a follow-up" and "not a
`DamageModifierDef`" went to `spec/effects.md` "conditional-damage-bonus" (a new bullet there).

## Check hardest

1. **Every claim about `main`'s mechanics, especially the ones written from the code** rather than
   from a unit:
   - combat "Turn queue": a creature dead before its turn keeps an empty `TurnStarted`/`TurnEnded`
     bracket; a granted action runs inside the turn that raised it; `ROUND_CAP` full rounds, then a
     draw, checked before a new round (`combat.ts` `resolveTurn`).
   - combat "Phase points": no round-start or fight-end hook and no round-end event.
   - combat "Resolution & timing" and Design "Encounters, rewards & wipes": both sides falling at
     once is a `draw` (`checkWinLoss`); nothing compacts dead creatures.
   - combat "The action set": "castable" (a spell in the slot and, for a single-target spell, a
     living creature on its intended side; an AOE is always castable) and the random-gem draw
     consuming one RNG value even with one castable gem (`actions.ts` `castableGemSlots`,
     `resolveGemSlot`).
   - combat "Action instance-list": later instances keep the first instance's target unless it died;
     `powerPercent / 100` multiplies spellPower (`resolveInstanceTarget`, `executeAttack`).
   - combat "Every action source obeys the same rules", rule 4: Tunnel Vision and an ally-side spell
     skip the Provoke step, and Confusion isn't re-rolled.
   - combat "Targeting override": Confusion's second draw (a living ally, self included), one draw
     even for a single provoker, the selector never resolved when a provoker exists
     (`targeting.ts`).
   - combat "Adjacency targeting": the splash set is computed before the instance's pre-hit hooks;
     attacks only.
   - combat "Armor penetration" and "Cross-stat contribution": the shapes, the [0, 1] clamp, and
     cross-stat added after spellPower and before the core (`effects.ts`, `damage.ts`).
   - combat "Event log": the families as `types.ts` declares them (`TriggerFired` and
     `ActionGranted` are intents; `Revived` and `CascadeTruncated` consequences).
   - scripting "Conditions in the engine": the condition kinds, the comparators, `has-status` over
     statuses only (`conditions.ts`, `scripting-types.ts`).
2. **Every number**: the Additional's 20% and 10 (`ADDITIONAL_MAX_HP_PERCENT`,
   `ADDITIONAL_BASE_CAP`), the 0.2 of Defence, the 1% chip, ×1.25 / ×0.75, Defend's ×1.5 and ×0.65
   (`engine/config.ts`); eleven player selectors; seven roles; five `always-*` fixtures.
3. **Every `dropped` row and every duplicate dropped inside a row.** Check the named home really
   holds the rule: G:825 (`spec/responses.md` "revive"), G:895 (`spec/effects.md` "Effective
   stats"), the role table in C:1213 and G:1065 (`content/enemy-behaviour.md` "Role scripts"; check
   the content table against `data/scripts.ts`), the conditional-damage-bonus block in C:1129, the
   status-timing bullets in C:824, the fast-travel range in G:962 (`spec/run.md` "The cave"), the
   Phase 6 items (`ROADMAP.md` Phase 6).
4. **The large merges**: the Design and Engine damage formulas (G:869 to G:929 with C:871) into
   combat "Damage formula"; G:931 + G:942 + C:901 into "Damage channels and the Additional" and "The
   damage channel in the engine"; C:1129 + G:1039 to G:1063 + G:1082 into the four scripting Engine
   rules. Check that no rule was lost or changed.
5. **No new rules.** Apart from item 1's code-worded sentences, report any sentence that says more
   than its unit or the code.

## Decisions Duncan made (step 4)

- **Stale-doc fixes approved as a batch** (the doc follows `main`): (1) conditions are
  `round-number` only (no turn number), "affinity advantage vs a target" is the existential
  `enemy-weak-to-me-exists`, and `!=` is built; (2) "compaction only at fight end" is dropped,
  since nothing compacts; (3) a mutual wipe is a `draw`; (4) granted actions run in the turn that
  raised them, not "the granting creature's turn"; (5) Splashing is attacks only (4.2-D's note) and
  its targets are computed before the pre-hit hooks; (6) `support`'s side filter is `gemSide`.
  Report any of them if you think it is a bug rather than a stale doc.
- **The HP% qualifier is a bug** (design stands). `lowest` and `highest` mean the lowest or highest
  **HP%**; `main` picks by current HP (`conditions.ts` `evaluateCondition`). `spec/scripting.md`
  "Conditions" and "Conditions in the engine" state the design, with a `**Known bug:**` line; the
  fix is in `ROADMAP.md` Phase 4.5 "Decided, not built" ("HP% qualifiers pick by HP%": integer
  cross-multiplication, shared tie-break, a deliberate golden change for `warden` and `support`
  fights, balance bands re-checked).
- **The role table's one home is `content/enemy-behaviour.md`** (4.2-B's note, phase brief rule
  7); `spec/scripting.md` "Role scripts" keeps the rules and links to it. A design-agent call, not
  Duncan's.

If you find another place where the code contradicts the text, report it as a finding and say
whether you think it is a bug or a stale doc.

## For later slices (not findings for this round)

- **4.2-F** (in `F/brief.md`): `CLAUDE.md`'s rule summary restates combat and scripting;
  `OPEN_QUESTIONS.md` cites "§7" for the round cap and restates the "target lacks the status"
  condition; ROADMAP Phase 4.5 gains the HP% bug fix.
- **4.2-G, stale `src/` comments** (in `G/brief.md` Scope): `engine/scripting-types.ts:9-22`,
  `engine/scripting-types.ts:78-89`, `engine/target-selectors.ts:53-55`, `data/scripts.ts:132`.
- **Labels kept for inbound links**: every label the C and D files and `content/` use for combat
  and scripting resolves to a heading. Two were renamed and their links updated: `spec/effects.md`
  now cites "Targeting override" and "Adjacency targeting"; `content/overgrowth.md` "Indirect
  damage" now cites "Damage channels and the Additional" (it cited "Damage formula" for the
  indirect rule).

## Docs edited

- `spec/combat.md`, `spec/scripting.md`: condensed (rows in `inventory.md`).
- `spec/effects.md`: "conditional-damage-bonus" gains the one-modified-hit bullet (from C:1129);
  two combat link labels updated.
- `content/overgrowth.md`: "Indirect damage" link repointed.
- `ROADMAP.md`: Phase 4.5 "Decided, not built" gains "HP% qualifiers pick by HP%" (Duncan's
  decision: a bug).
- `phases/4.2/F/brief.md`, `G/brief.md`: 4.2-E's notes.
- `phases/4.2/E/inventory.md` (new, from `inventory-skeleton`) and this file.

## Round 2

Design agent → coding agent, answering `verify-r1.md`. All six findings are fixed; none is
rejected. `npm run docs:check -- inventory E` passes: 87 units, 87 rows, base `f666d7c`. The row
counts per fate are unchanged (54 rewritten, 25 merged, 8 dropped); five rows' Reasons were
extended (C:808, G:811, G:869, G:994, C:1029).

### Findings and what changed

- **F1, grant timing** (G:811, C:808). Stale doc, Duncan's decision, refining round 1's fix (4).
  combat "Rounds and turns" now says a granted action takes no turn of its own and runs at the
  end of the step that raised it, linking `spec/responses.md` "perform-action". "Turn queue" says
  it takes no queue slot and runs at the end of the step that raised it: inside the current turn,
  or at round level for a fight-start or round-end grant. The same stale sentence was also in
  `spec/effects.md` "Traits" ("always runs after the action that caused it, inside the same
  turn", a 4.2-D unit, C:1603/G:637), so it got the same fix. 4.2-D's inventory is left as merged.
- **F2, ally HP% qualifier** (G:994). Stale doc, Duncan's decision: the `hp-percent` condition
  takes `any`, `lowest` and `highest` for every subject (`conditions.ts`). The text stays as it
  is; the G:994 row now records the change.
- **F3, the Phase 6 pointer** (G:994, C:1129). The two statements are now separate: fight-context
  conditions are "deliberately deferred past v1" (the old text's word, restored), and "the
  candidate conditions recorded so far for Phase 6 are in `ROADMAP.md` Phase 6". That no longer
  implies fight-context conditions are among them. They don't go to ROADMAP: the old text defers
  them past v1 without naming a phase. The G:994 row says so.
- **F4, the lookup's name** (G:869). Stale name, Duncan's decision: the formula's first line is now
  `effOffStat = getOffensiveStat(creature, actionKind, spellPower)   // remap → effective → ×
  spellPower`. The bullet below already states the order and names `getEffectiveStat`.
- **F5, the "Rejected:" bullet** (C:1029). Dropped the list of rejected alternatives as history,
  for consistency with C:956. Five of the six items also restate the bullets' positive rules
  (`runAction` for every source, `checkLegality` separate from execution, `resolution.ts` never
  imports `combat.ts`, the context is transient and never in `CombatState`). Kept the
  generator/stack-machine sentence, reworded as "Resolution is not a generator or stack machine:
  that pays off only if players make choices mid-cascade, which the design doesn't have." It is
  design intent that a future mid-cascade choice must revisit, the same kind of sentence as
  scripting's kept "utility-scoring AI was rejected". The C:1029 row records both.
- **F6, the dead actor's bracket** (C:808). "Turn queue" now says the bracket has no hooks, no
  action and no countdown, and the Web roll still runs in it (`spec/statuses.md` "Turn order").

### Spec and code disagree: Duncan's decisions this round

- Grant timing (F1): stale doc; the text says what `main` does.
- Ally HP% `highest` (F2): stale doc; the text says what `main` does.
- `remapResolve` → `getOffensiveStat` (F4): stale name; the text names `main`'s function.
- The HP% qualifier bug stands as decided in round 1.
- **A dead creature's empty turn** (raised by Duncan after F6): a new direction, not a bug. The
  spec deliberately has the Web roll run in a dead actor's bracket, and `main` matches it. Duncan
  wants dead creatures skipped entirely (no bracket, no clock bump, no Web roll). The spec keeps
  describing `main`; the change is in `ROADMAP.md` Phase 4.5 "Decided, not built" ("A dead
  creature's turn is skipped entirely"), as a deliberate golden change.

### Check this round

1. The three grant sentences (combat "Rounds and turns", "Turn queue"; effects "Traits") against
   `combat.ts` `resolveTurn` / `resolveRoundEnd` and `spec/responses.md` "Where grants run".
2. The "Turn queue" bracket sentence against `combat.ts:497-508`.
3. That the reworded generator sentence and the split Phase 6 pointer say nothing their units
   don't.

### Notes for later slices

- **4.2-G** (in `G/brief.md` Scope): the five stale `src/` comments from `verify-r1.md`
  (`scripting-types.ts:144-149`, `types.ts:323-325`, `effect-types.ts:760`, `config.ts:1-2`, and
  the `CONVENTIONS`/`GAME_DESIGN` citations in `combat.ts`, `actions.ts`, `types.ts`).
  `effect-types.ts:760` is flagged as a decide-point for the plan as well as a comment, because
  `targeting.ts`'s exported `adjacentLivingTargets` is tested but not the copy Splashing runs.

### Docs edited this round

- `spec/combat.md`: F1 ("Rounds and turns", "Turn queue"), F4 ("Damage formula"), F5 ("One action
  pipeline"), F6 ("Turn queue").
- `spec/scripting.md`: F3 ("Conditions").
- `spec/effects.md`: "Traits" grant sentence, the same stale-doc fix as F1 (Duncan's decision).
- `phases/4.2/E/inventory.md`: Reasons for C:808, G:811, G:869, G:994, C:1029.
- `phases/4.2/G/brief.md`: 4.2-E's verify-r1 stale `src/` comments added to Scope.
- `ROADMAP.md`: Phase 4.5 "Decided, not built" gains "A dead creature's turn is skipped entirely"
  (Duncan's decision: a new direction).
- `phases/4.2/E/verify-request.md`: this section.

## Round 3

Design agent → coding agent, answering `verify-r2.md`. Its one finding is fixed. `npm run
docs:check -- inventory E` passes: 87 units, 87 rows, base `f666d7c`. Row counts per fate are
unchanged (54 rewritten, 25 merged, 8 dropped); two rows' Reasons were extended (C:426, C:901).

### Findings and what changed

- **F1, indirect damage and a DoT tick** (C:901, C:426). Stale doc, Duncan's decision: the text
  follows `main`. The finding was slightly wider than reported. The old C:901 text already said a
  tick "has no dealt pool", but round 1 dropped that qualifier from the engine bullet. So the
  bullet gave a tick both armour penetration and `conditional-damage-bonus`; `applyTickDamage`
  (`resolution.ts:1237-1266`) gives it neither. combat "The damage channel in the engine" now
  gives the shared part once (effective Defence with Defend's ×1.5, ×0.65 in the taken pool,
  cross-stat direct only), then two sub-bullets: a response (its own magnitude, Defence after
  armour penetration, dealt pool with `conditional-damage-bonus`, as in `resolution.ts:245-275`)
  and a DoT tick (snapshot potency, no dealt pool, no armour penetration, because the snapshot
  holds the applier's stat and not its live build, linking `spec/statuses.md` "The applier
  snapshot"). "Armor penetration" now says "the fifth of Defence (indirect, not a DoT tick)". No
  other doc claims penetration for ticks (`spec/effects.md` only links to "Armor penetration").

### Spec and code disagree

- The HP% qualifier bug and the dead creature's turn stand as decided (round 1, round 2).
- Splashing's lookup (`verify-r2.md` item 3) is informational: the rule is the same in both
  copies. Which copy is the real one is already a decide-point in 4.2-G's Scope.

### Check this round

1. The rewritten indirect bullet and its two sub-bullets against `resolution.ts` (the hook path at
   `:245-275` and `applyTickDamage` at `:1237-1266`).
2. "Armor penetration" against `gatherArmorPenetration`'s two call sites (`resolution.ts:257`,
   `:271`), and that no tick path calls it.
3. That neither sub-bullet says more than C:901 or the code.

### Notes for later slices

- **4.2-G** (in `G/brief.md` Scope): `engine/types.ts:44-47` and `actions.ts:334`, `:390`, `:668`
  cite `GAME_DESIGN §7` for the targeting-override rules; `data/scripts.ts:7-8` says every role
  ends in the same fallback (`caster` casts first and ends in Attack).

### Docs edited this round

- `spec/combat.md`: F1 ("The damage channel in the engine", "Armor penetration").
- `phases/4.2/E/inventory.md`: Reasons for C:426 and C:901.
- `phases/4.2/G/brief.md`: 4.2-E's verify-r2 stale `src/` comments added to Scope.
- `phases/4.2/E/verify-request.md`: this section.
