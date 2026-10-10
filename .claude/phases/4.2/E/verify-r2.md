# Verify report — Phase 4.2 — Slice E (round 2)

Coding agent → design agent. Checked `spec/combat.md` and `spec/scripting.md` again against `main`'s
code and the pinned old text, row by row, plus the round-2 fixes to `verify-r1.md`.

## Result

- `npm run docs:check -- inventory E`: **PASS**, 87 units and 87 rows checked (base `f666d7c`).
- Rows checked: **87** (54 rewritten, 25 merged, 8 dropped, as the request says).
- Findings: **1** (low). No rule is lost; no number is wrong.
- Label links: every `file.md "Label"` link in `spec/combat.md` (31), `spec/scripting.md` (12), and
  the links into them from `spec/effects.md`, `responses.md`, `statuses.md`, `creatures.md`,
  `run.md`, `progression.md`, `content/*` and the other top-level docs resolve to a heading (0 bad).
- Round-1 fixes, all confirmed:
  - **F1 (grant timing):** "Rounds and turns", "Turn queue" and `spec/effects.md` "Traits" now say a
    grant runs at the end of the step that raised it. This matches `combat.ts:428-431` (turn-start),
    `:465` (action), `:492-495` (turn-end), `:319` (fight start) and `:268` (round end), and
    `spec/responses.md` "perform-action" ("Where grants run").
  - **F2:** `conditions.ts:92-108` applies all three qualifiers to every subject.
  - **F3:** the two Phase 6 sentences are separate and say no more than G:994 and C:1129.
  - **F4:** `getOffensiveStat(creature, actionKind, spellPower)` is at `effective-stats.ts:123`.
  - **F5:** the generator/stack-machine sentence keeps C:1029's design intent and adds no rule.
  - **F6:** `combat.ts:364-369`, `:503-508`: the dead actor's bracket has no hooks, action or
    countdown, and `rollWebBreakFree` (`:506`) runs in it, as `spec/statuses.md` "Turn order" says.
- Other claims re-checked against the code, all matching: queue freeze and `ROUND_CAP` gate
  (`combat.ts:325-347`); mutual wipe is a `draw` (`:240`); fight-start wipe before `RoundStarted`
  (`:307-322`); castable gems, the single RNG draw and `gemSide` (`actions.ts:178-197`, `:303-314`);
  rule 4 and instance targeting (`:392-408`); splash targets computed before pre-hit hooks, attacks
  only (`:435-448`, `:500`); the four actor-died sites (`:493`, `:516`, `:534`, `:702`); ally-side
  skip of the override pipeline and AOE (`:358-362`, `:670-672`); Confusion's two draws, Tunnel
  Vision, and one Provoke draw even for one provoker (`targeting.ts:67-123`); armour penetration
  clamp (`effects.ts:328-334`); cross-stat after spellPower, direct only
  (`damage.ts:41-45`, `resolution.ts` `dealDamageCore`); Additional (`damage.ts:70-77`,
  `config.ts:13-15`); `validateSpellEffects` (`effect-types.ts:1090-1163`); the event families
  (`types.ts:226-461`); conditions, comparators, eleven selectors, seven roles and five fixtures
  (`scripting-types.ts`, `data/scripts.ts`, `__fixtures__/scripts.ts`). The role table in
  `content/enemy-behaviour.md` matches `data/scripts.ts`.
- Dropped rows: G:825, G:895, the status-timing bullets (`spec/statuses.md` "Timing", "Round end",
  "Turn-end cleanup"), the conditional-damage-bonus block (`spec/effects.md`) and the `Damage
  observation` duplicate all hold the rule. New ROADMAP Phase 4.5 entries exist (`ROADMAP.md:333`,
  `:340`).

## Findings

**F1. C:901 / spec `combat.md` "The damage channel in the engine" — "after armour penetration" is
not true of a DoT tick.** The bullet says that in indirect damage "`Defence` is effective, after
armour penetration, and includes Defend's ×1.5", and "Armor penetration" says penetration applies
"before … the fifth of Defence (indirect)". `applyTickDamage` (`resolution.ts:1237-1266`) passes no
armour penetration (nor dealt pool or cross-stat): its Defence is the bearer's effective Defence with
Defend's ×1.5 only. The Design half and `spec/statuses.md` "The applier snapshot" already give the
tick formula without penetration, so the engine bullet reads wider than the tick. The wording is
carried over from C:901, so this is a stale doc/precision issue, not a change by the condense.

## Spec and code disagree

1. **HP% qualifier** (known; design stands). Spec, `spec/scripting.md` "Conditions": "'Lowest' and
   'highest' pick the ally or enemy with the lowest or highest **HP%**, and test it." Code,
   `conditions.ts:100-104`: `pickExtremum(pool, (c) => c.currentHp, condition.qualifier ===
   'lowest' ? 'asc' : 'desc')`. The `**Known bug:**` line and `ROADMAP.md:333` match.
2. **A dead creature's turn** (known; Duncan's direction). Spec "Turn queue": a creature dead before
   its turn keeps an empty bracket in which the Web roll runs. Code `combat.ts:364-369`, `:506`
   agrees; the change is in `ROADMAP.md:340`.
3. **Splashing's lookup** (informational). Spec "Adjacency targeting" names `adjacentLivingTargets
   (target, party)`. `actions.ts:458` has a private copy that production uses; the exported one
   (`targeting.ts:148`) is called only by tests. The rule is the same in both.

## Stale comments in `src/` (for 4.2-G)

All are already on 4.2-G's list from round 1 (`scripting-types.ts:9-22`, `:78-89`, `:144-149`;
`target-selectors.ts:53-55`; `types.ts:323-325`; `effect-types.ts:760`; `config.ts:1-2`;
`data/scripts.ts:132`; the `CONVENTIONS`/`GAME_DESIGN` citations in `combat.ts`, `actions.ts`,
`types.ts`). New on this pass:

- `engine/types.ts:44-47`: "Provoke/Confusion targeting-override pipeline (GAME_DESIGN §7 …)" and
  `actions.ts:334`, `:390`, `:668` cite GAME_DESIGN §7 for rules now in `spec/combat.md`
  "Targeting override" (covered by the citation script).
- `data/scripts.ts:7-8`: "Every role ends in the same fallback" — `caster` ends in Attack, not the
  shared cast fallback (the spec's "Role scripts" wording, "a fallback rule that runs only when the
  rule above it is illegal", is accurate).
