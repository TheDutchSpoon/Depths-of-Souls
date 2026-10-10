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
