# Phase 2 — Actions, spells & the scripting interpreter

Status: **done**. Full local verification green (149/149 tests across 23 files, lint,
format, build). Implemented on branch `phase-2` per the approved plan at
`.claude/plans/sorted-drifting-dream.md` (kept there for the detailed rationale, exact
type definitions, and the full `ASSUMPTION:`-tagged decision list behind every choice
below — not duplicated here).

## What was built

New files under `src/engine/`:

- `scripting-types.ts` — `Condition` (7 kinds: `always`, `hp-percent`, `enemy-count`,
  `ally-count`, `round-number`, `enemy-weak-to-me-exists`, `is-provoking`),
  `TargetSelector` (the 7-member v1 set), `RuleAction`, `Rule`, `Script`.
- `tie-break.ts` — `compareBySideSlotId`/`compareByKey`/`pickExtremum`, extracted from
  `turn-order.ts` so target-selector/condition extremum logic shares the identical
  side→slot→id tie-break.
- `creature-lookup.ts` — `findCreature`, shared by `combat.ts` and `targeting.ts`.
- `target-selectors.ts` — `targetSelectorHasCandidate` (existence-only, never touches
  `state.rng`) and `resolveTargetSelector` (the real resolution; `random-enemy` is the
  one blessed RNG draw site in this module).
- `conditions.ts` — `evaluateCondition`, pure, HP% via integer cross-multiplication.
- `interpreter.ts` — `decideAction(creature, script, state)`, replacing the Phase 1 stub:
  side-effect-free lookahead over a script's rules, first valid match wins, invalid →
  skip, implicit fallback (Attack a default target, else Wait) otherwise.

Extended: `types.ts` (`Spell`; `Creature` gains `scriptId`/`equippedSpells`/`defending`/
`provoking`; `Action` grows to `Attack | Cast | Defend | Provoke | Wait`, `Cast` split
into single/AOE sub-shapes; `CombatState` gains `scripts`; new intent events `SpellCast`
(single/AOE), `Defended`, `Provoked`, `Waited`), `config.ts` (`DEFEND_DEFENCE_MULTIPLIER`,
`DEFEND_TAKEN_FACTOR`, `DEFAULT_GEM_SLOT_COUNT`), `effective-stats.ts`
(`getOffensiveStat` gains a `spellPower` parameter, defaulting to `1.0`), `turn-order.ts`
(refactored onto `tie-break.ts`, behavior-preserving), `targeting.ts` (`livingEnemiesOf`/
`livingAlliesOf`/`getProvokingMembers`/`resolveOffensiveTarget`), `combat.ts`
(`createCombat` gains an optional `scripts` param; `executeAction` grows a case per new
`Action` variant; `resolveTurn`'s turn body now resolves a script, clears the actor's own
transient Defend/Provoke status before executing, and no longer hardcodes Attack).

Real shipped content in `src/data/` (not test fixtures): `spells.ts` (`EMBER_LANCE`
single-target, `CINDER_NOVA` AOE) and `scripts.ts` (the five stock scripts —
`always-attack`, `always-cast`, `always-defend`, `always-provoke`, `always-wait` —
plus `STOCK_SCRIPTS_BY_ID`).

Tests: new unit suites for every new/extended module (`tie-break`, `targeting`,
`target-selectors`, `conditions`, `interpreter`, `scripts.test.ts`), extended
`effective-stats.test.ts`/`combat.test.ts`, and seven new golden-replay fixtures in
`__golden__/`: five hand-derived (`golden-scripted-1v1`, `golden-aoe-cast`,
`golden-provoke-redirect`, `golden-random-selector`, `golden-skip-on-invalid`), one
integration fixture (`golden-6v6-scripted`, explicitly labeled generated-then-checkpoint-
verified per CONVENTIONS' two-tier discipline), and `golden-seed-sensitivity`. The four
Phase 1 goldens were re-verified byte-identical before any new golden was added.

## The one real correctness fix caught during plan review

The initial plan design resolved Provoke as a **post-hoc override**: let a rule's target
selector resolve fully (including a `random-enemy` RNG draw), then separately check for a
provoker and overwrite the result if one existed. The user's review caught that this let
the RNG stream's position depend on a selector whose result was about to be discarded —
exactly the "incidental script structure" dependency the lookahead/execution RNG
discipline exists to prevent (changing a rule's selector from `lowest-hp` to
`random-enemy` would shift every later RNG draw in the fight, even when Provoke made that
selector irrelevant).

Fixed by moving the check earlier: `targeting.ts`'s `resolveOffensiveTarget(actor, state,
resolveNormally)` checks for a provoker **first** and only calls `resolveNormally` (which
may itself draw RNG) when none exists. `interpreter.ts` routes every single-target
offensive resolution — rule-driven attacks/casts and the implicit fallback's Attack —
through this one function. Exactly one RNG draw ever occurs for a single-target offensive
action, whether or not Provoke ends up applying. `applyProvokeOverride` as a separate
post-hoc step never shipped.

Two smaller review fixes: the `enemy-weak-to-me-exists` condition (GAME_DESIGN's
"affinity advantage vs a target") was deliberately named for its existential,
selector-decoupled semantics rather than `affinity-advantage`, which would misleadingly
read as target-coupled; and `executeCastAoe`'s loop skips an already-dead frozen-list
target before hitting it — inert in Phase 2 (no kill source exists mid-AOE yet) but a
forward guard against a real Phase 3 bug (reflect-damage/on-death triggers).

## Golden fixture discipline

The five focused fixtures were hand-derived exactly as Phase 1's were — including
catching a floating-point representation artifact before it looked like a wrong
prediction: `5.2 * 0.65` (a Defend-scaled hit) evaluates to `3.3800000000000003` in
IEEE-754, not the clean `3.38` hand arithmetic suggests. Verified independently via a bare
`node -e` calculation (not by running the engine) before writing it into the fixture, per
the same discipline Phase 1 established. All five matched the real implementation on the
first run.

`golden-6v6-scripted` uses the two-tier discipline's second tier: real parties running the
five actual stock scripts from `src/data/`, generated once and then checkpoint-verified
(round-1 turn order, per-event-type counts across the ~28-round fight, the final result,
and a handful of spot-checked `DamageDealt` values) rather than a full 668-event
deep-equal — explicitly labeled as such in the fixture file, so a future reader never
mistakes it for a hand-derived fixture.

## Verification performed

- `npm run test` — 149/149 pass (23 files).
- `npm run lint` / `npm run format:check` — clean.
- `npm run build` — `tsc -b && vite build` succeeds.
- All of the above are the exact commands CI runs on this branch's PR.

## Deliberately out of scope (per ROADMAP, next phases)

`has-status` condition (no status producer exists until Phase 3's trait/effect
framework), the Gem/Artifact economy wrapper around bare `Spell`s (Phase 8), any
authoring UI for scripts (Phase 6, `Script.defaultTarget` is reserved but unread), and
real creature/species content (still `GAME_DESIGN.md` §13, deferred).

## Next

Phase 2.5 — scripted combat demo (interlude). See `.claude/briefs/phase-2.5-scripted-demo.md`
and `ROADMAP.md`.
