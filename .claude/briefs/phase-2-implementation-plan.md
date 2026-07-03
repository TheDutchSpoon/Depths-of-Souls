# Phase 2 — Actions, Spells & Scripting Interpreter: Implementation Plan

Status: code-complete, verified, not yet merged — see phases/phase-2-actions-spells-scripting.md

## Context

Phase 1 delivered a pure, deterministic combat resolver with exactly one action
(`Attack`) and a hardcoded "always attack the default target" `decideAction` stub —
explicitly built as a seam for this phase. Phase 2 is the game's heart per `CLAUDE.md`:
it fleshes out the action set to `Attack | Cast | Defend | Provoke | Wait`, adds spells
(gem-slot-based casting with a target-shape + spellPower), and replaces the stub with a
real scripting interpreter that walks priority-ordered rules (`Condition` → `Action`,
FFXII-Gambit style). This turns combat from a fixed script into the player's main lever.
The exact mechanics (damage formula extension, Provoke's post-selection override,
AOE's frozen-target/win-check-at-boundary rule, the interpreter's side-effect-free
lookahead with its RNG lookahead-vs-execution discipline) are already locked in
`GAME_DESIGN.md` §7–8 and `CONVENTIONS.md`'s "Combat & scripting" section — this plan
turns that spec into concrete modules, types, and a build order, verified line-by-line
against the current `src/engine/` code (all Phase 1, unchanged since merge) and the
locked docs.

Per `CONVENTIONS.md`'s new "Implementation plans" rule, every decision below that the
spec doesn't pin is tagged **`ASSUMPTION:`** inline and re-collected in the checklist at
the end, for review before implementation begins.

Work happens on the `phase-2` branch (current branch, sitting at `main`'s tip; the three
already-reviewed doc edits — CONVENTIONS/GAME_DESIGN/ROADMAP — are the locked spec this
plan builds against).

## Module map

```
src/engine/
  types.ts              EXTEND  Creature, Spell (new), Action (grows), CombatState, CombatEvent (grow)
  scripting-types.ts      NEW   Condition, TargetSelector, RuleAction, Rule, Script
  tie-break.ts             NEW  shared side→slot→id comparator, extracted from turn-order.ts
  creature-lookup.ts        NEW findCreature(state, id) — shared by combat.ts and targeting.ts
  turn-order.ts          EXTEND refactor onto tie-break.ts (behavior-preserving)
  targeting.ts           EXTEND + livingEnemiesOf/livingAlliesOf/getProvokingMembers/resolveOffensiveTarget
  target-selectors.ts      NEW  targetSelectorHasCandidate, resolveTargetSelector
  conditions.ts             NEW evaluateCondition
  interpreter.ts            NEW decideAction (replaces the Phase 1 stub in combat.ts)
  effective-stats.ts     EXTEND getOffensiveStat gains a spellPower param; ActionKind grows
  config.ts              EXTEND DEFEND_DEFENCE_MULTIPLIER, DEFEND_TAKEN_FACTOR, DEFAULT_GEM_SLOT_COUNT
  combat.ts              EXTEND createCombat(+scripts), executeAction grows, resolveTurn's turn body updated
  __fixtures__/creatures.ts EXTEND CreatureOverrides/makeCreature gain the 4 new Creature fields

src/data/
  spells.ts    NEW  real content (not fixtures)
  scripts.ts   NEW  the 5 stock scripts
  scripts.test.ts  NEW  sanity check on the shipped data

src/app/demoFight.ts, src/ui/CombatDemo.tsx   EXTEND  mechanical compile-compat only (no behavior change;
  wiring the demo to actually use scripts/spells is Phase 2.5's job per its brief)
```

**`ASSUMPTION:`** Module split — `Condition`/`TargetSelector`/`Rule`/`Script` live in a
new `scripting-types.ts`, separate from `types.ts`'s resolver types; the interpreter
splits into `interpreter.ts` (rule-walking + `decideAction`), `conditions.ts`, and
`target-selectors.ts` rather than one file — each has an independent, sizeable
table-driven test surface (7 condition kinds, 7 selector kinds), and the RNG-discipline
seam (existence-check vs. resolve) is cleanest as its own module boundary. `Spell` stays
in `types.ts`, colocated with `Creature` since `equippedSpells` embeds it directly.
Dependency direction stays one-way toward `types.ts`/`ids.ts`/`config.ts` — no cycles;
`targeting.ts` never imports `combat.ts` (so `resolveOffensiveTarget` can live there and
still be called from `interpreter.ts`/`combat.ts`).

## Type extensions (`types.ts`)

```ts
export interface Spell {
  readonly id: string
  readonly name: string        // ASSUMPTION: cheap additive field beyond the locked minimal
                                // shape, for test/debug readability.
  readonly targetShape: 'single' | 'aoe'
  readonly spellPower: number
}

export interface Creature {
  readonly id: CreatureId
  readonly side: Side
  readonly slot: number
  readonly baseStats: CreatureStats
  readonly affinity: Affinity
  readonly currentHp: number
  readonly alive: boolean
  readonly scriptId: string | null                    // ASSUMPTION, see "Script assignment" below
  readonly equippedSpells: readonly (Spell | null)[]   // variable-length, no hardcoded slot count
  readonly defending: boolean                          // ASSUMPTION, see "Defend/Provoke lifecycle"
  readonly provoking: boolean                          // ASSUMPTION, see "Defend/Provoke lifecycle"
}

export interface AttackAction { readonly kind: 'attack'; readonly targetId: CreatureId }

export interface CastSingleAction {
  readonly kind: 'cast'
  readonly targetShape: 'single'          // ASSUMPTION: sub-discriminant alongside `kind`
  readonly gemSlot: number
  readonly targetId: CreatureId
}
export interface CastAoeAction {
  readonly kind: 'cast'
  readonly targetShape: 'aoe'
  readonly gemSlot: number
  // No target list here — ASSUMPTION: the frozen "all living enemies, slot order" set is
  // computed once, inside executeCastAoe (combat.ts). The Action records only the
  // decision (cast slot X, AOE shape); the resolved target list is a consequence-adjacent
  // fact recorded on the SpellCast event, not the Action.
}
export type CastAction = CastSingleAction | CastAoeAction
export interface DefendAction { readonly kind: 'defend' }
export interface ProvokeAction { readonly kind: 'provoke' }
export interface WaitAction { readonly kind: 'wait' }
export type Action = AttackAction | CastAction | DefendAction | ProvokeAction | WaitAction

export interface CombatState {
  readonly rng: SeededRng
  readonly playerParty: readonly Creature[]
  readonly enemyParty: readonly Creature[]
  readonly turnQueue: readonly CreatureId[]
  readonly turnCursor: number
  readonly round: number
  readonly result: FightResult | null
  readonly scripts: ReadonlyMap<string, Script>   // ASSUMPTION, see "Script assignment" below
}

// Intent events grow:
export interface SpellCastSingleEvent {
  readonly type: 'SpellCast'; readonly targetShape: 'single'
  readonly casterId: CreatureId; readonly gemSlot: number; readonly targetId: CreatureId
}
export interface SpellCastAoeEvent {
  readonly type: 'SpellCast'; readonly targetShape: 'aoe'
  readonly casterId: CreatureId; readonly gemSlot: number; readonly targetIds: readonly CreatureId[]
}
export type SpellCastEvent = SpellCastSingleEvent | SpellCastAoeEvent
// ASSUMPTION: targetId|targetIds expressed via a `targetShape` discriminant (mirroring
// CastAction), not an optional-either-field interface — every variant fully typed.

export interface DefendedEvent { readonly type: 'Defended'; readonly creatureId: CreatureId }
export interface ProvokedEvent { readonly type: 'Provoked'; readonly creatureId: CreatureId }
export interface WaitedEvent { readonly type: 'Waited'; readonly creatureId: CreatureId }
// ASSUMPTION: field name `creatureId` (matching TurnStarted/TurnEnded), not `actorId`.

export type IntentEvent = AttackDeclaredEvent | SpellCastEvent | DefendedEvent | ProvokedEvent | WaitedEvent
// ConsequenceEvent (DamageDealt, CreatureDied), LifecycleEvent: UNCHANGED, reused as-is.
```

Verified: no other Phase 1 field/shape needs to change; `ConsequenceEvent`/`LifecycleEvent`
are reused verbatim by Cast exactly as by Attack.

## Script assignment plumbing

**`ASSUMPTION:`** `Creature.scriptId: string | null` (a static per-creature reference to
a shared script template id) + `CombatState.scripts: ReadonlyMap<string, Script>` (the
registry of templates loaded for this fight). `createCombat` grows a 4th **optional**
positional parameter: `scripts: ReadonlyMap<string, Script> = new Map()` — positional
(not an options object) to match the existing 3-arg style; all Phase 1 3-arg call sites
keep compiling unchanged. `resolveTurn` resolves `scriptId → Script | null` itself before
calling `decideAction`, so `decideAction`'s signature stays exactly the spec's
`(creature, script, state)` with `script: Script | null` — a null script (no assignment,
or an id not found in the registry) triggers the implicit fallback *inside*
`decideAction`, unifying "no script" and "script assigned but no rule matched" into one
path. Since `makeCreature`'s default `scriptId` is `null`, every existing Phase 1 test/
golden reproduces its exact current behavior unchanged with zero opt-in.

## `scripting-types.ts` (new)

```ts
export type ComparatorOp = '<' | '<=' | '>' | '>=' | '==' | '!='

export type HpSubject = 'self' | 'ally' | 'enemy'
export type HpQualifier = 'any' | 'lowest' | 'highest'

export interface AlwaysCondition { readonly kind: 'always' }
export interface HpPercentCondition {
  readonly kind: 'hp-percent'; readonly subject: HpSubject; readonly qualifier: HpQualifier
  readonly comparator: ComparatorOp; readonly thresholdPercent: number
}
// ASSUMPTION: ships all 3x3 subject x qualifier combos uniformly — a DELIBERATE SCOPE
// EXPANSION, not a purely harmless code-shape choice: self+lowest/highest trivially
// collapse to self+any on a 1-creature pool (harmless), but ally+highest is real new
// authorable logic beyond GAME_DESIGN's asymmetric v1 list (self: no qualifier; ally:
// any/lowest only; enemy: any/lowest/highest). Signing off on the capability, not just
// the simpler implementation. A future authoring UI may still choose to surface only the
// documented per-subject subset.

export interface EnemyCountCondition { readonly kind: 'enemy-count'; readonly comparator: ComparatorOp; readonly count: number }
export interface AllyCountCondition  { readonly kind: 'ally-count';  readonly comparator: ComparatorOp; readonly count: number }
export interface RoundNumberCondition { readonly kind: 'round-number'; readonly comparator: ComparatorOp; readonly round: number }
// ASSUMPTION: "turn/round number" = one condition against CombatState.round (the engine
// has no separate global turn counter).

export interface EnemyWeakToMeExistsCondition { readonly kind: 'enemy-weak-to-me-exists' }
// ASSUMPTION: this is GAME_DESIGN §8's "affinity advantage vs a target" condition,
// deliberately implemented (and NAMED) as existential and decoupled from targeting: true
// iff >=1 living enemy is weak to the acting creature's affinity, with no embedded
// TargetSelector/qualifier. Conditions describe board state; selectors describe
// targeting — they never couple (gambit-style). The kind name is chosen to state that
// existential meaning on its face, since a bare "affinity-advantage" name reads as
// target-coupled ("I have the advantage on what I'm about to hit"), which it is not — a
// Cast chosen because this condition is true may still strike an enemy the caster has no
// advantage over. Naming decision, not a semantics change.

export interface IsProvokingCondition { readonly kind: 'is-provoking' }  // self-only

export type Condition =
  | AlwaysCondition | HpPercentCondition | EnemyCountCondition | AllyCountCondition
  | RoundNumberCondition | EnemyWeakToMeExistsCondition | IsProvokingCondition
  // Deliberately no has-status member — deferred to Phase 3 per spec.

// The exact 7-member v1 TargetSelector set from GAME_DESIGN §8:
export type TargetSelector =
  | { readonly kind: 'self' }
  | { readonly kind: 'lowest-hp-ally' }
  | { readonly kind: 'lowest-hp-enemy' }
  | { readonly kind: 'highest-hp-enemy' }
  | { readonly kind: 'highest-attack-enemy' }
  | { readonly kind: 'highest-intelligence-enemy' }
  | { readonly kind: 'random-enemy' }

export type RuleAction =
  | { readonly kind: 'attack' }
  | { readonly kind: 'cast'; readonly gemSlot: number }
  | { readonly kind: 'defend' }
  | { readonly kind: 'provoke' }
  | { readonly kind: 'wait' }
// ASSUMPTION: RuleAction is distinct from Action — a rule's authored action never
// carries a resolved target (that's computed at evaluation time from the selector/
// equipped spell shape).

export interface Rule {
  readonly condition: Condition
  readonly action: RuleAction
  readonly targeting?: TargetSelector
}

export interface Script {
  readonly id: string
  readonly rules: readonly Rule[]
  readonly defaultTarget?: TargetSelector  // reserved for Phase 6; never read in Phase 2
}
```

## Defend/Provoke lifecycle ("until its next turn")

**`ASSUMPTION:`** flat booleans (`defending`, `provoking`) on `Creature`, not a richer
status object — consistent with `alive: boolean`'s existing precedent.

**`ASSUMPTION:`** precise ordering in `resolveTurn`'s turn body (the trickiest new
interaction):

1. `decideAction` runs first, seeing the actor's `defending`/`provoking` **as they stood
   entering this turn** — i.e., still whatever the actor's *previous* turn set. This makes
   a self-referential `is-provoking` condition meaningful ("is my last Provoke still
   covering me as this turn begins").
2. Immediately after `decideAction` returns (before `applyProvokeOverride`/
   `executeAction`), the actor's own `defending`/`provoking` are cleared to `false` — the
   literal expiry point of "until its next turn."
3. If the chosen action is `defend`/`provoke`, `executeAction` re-sets the relevant flag
   to `true`, covering through the actor's *next* turn.

```ts
if (actor.alive) {
  const script = actor.scriptId ? (working.scripts.get(actor.scriptId) ?? null) : null
  // Provoke's override is resolved INSIDE decideAction now (see interpreter.ts /
  // resolveOffensiveTarget below) — there is no separate post-hoc override step here.
  const action = decideAction(actor, script, working)         // sees pre-clear status

  working = clearOwnTransientStatus(working, actor.id)        // expiry point
  const freshActor = getCreature(working, actor.id)

  if (action) {
    working = executeAction(freshActor, action, working, events)   // AOE resolves fully in here
  }
}
```

This slots into the existing `resolveTurn` sequence without touching any documented
invariant: the `TurnStarted`/`TurnEnded` bracket is still always emitted, unchanged;
only the *action* stays gated on `actor.alive`; win/loss is still checked once, after
this whole block returns — AOE's N-hit loop (below) already fully resolves inside
`executeAction` before that check runs, so no restructuring of the win-check's position
is needed even for AOE.

`updateCreature`'s patch type extends to
`Partial<Pick<Creature, 'currentHp' | 'alive' | 'defending' | 'provoking'>>`.
Defend's damage-formula effect is a small shared helper reused by Attack, single Cast,
and every AOE Cast target:

```ts
function resolveDefenceAndTakenFactors(target: Creature) {
  const baseDefence = getEffectiveStat(target, 'defence')
  if (!target.defending) return { defence: baseDefence, takenFactors: [] }
  return { defence: baseDefence * DEFEND_DEFENCE_MULTIPLIER, takenFactors: [DEFEND_TAKEN_FACTOR] }
}
```

`config.ts` additions: `DEFEND_DEFENCE_MULTIPLIER = 1.5`, `DEFEND_TAKEN_FACTOR = 0.65`
(both directly from `GAME_DESIGN.md` §7), and `DEFAULT_GEM_SLOT_COUNT = 3`
(**`ASSUMPTION:`** a fixture/data-default convenience only — no engine logic reads it;
`equippedSpells` stays variable-length per the locked spec).

## `effective-stats.ts` — spellPower

**`ASSUMPTION:`** `× spellPower` lives inside `getOffensiveStat` as an optional 3rd
parameter defaulting to `1.0`, not a separate multiplication at each call site — keeps
the full "remap → effective → ×spellPower" chain in one function:

```ts
export type ActionKind = 'attack' | 'cast'

export function getOffensiveStat(creature: Creature, actionKind: ActionKind, spellPower: number = 1.0): number {
  switch (actionKind) {
    case 'attack': return getEffectiveStat(creature, 'attack') * spellPower
    case 'cast': return getEffectiveStat(creature, 'intelligence') * spellPower
    default: { const exhaustive: never = actionKind; throw new Error(`Unhandled action kind: ${String(exhaustive)}`) }
  }
}
```

The existing `getOffensiveStat(actor, 'attack')` call site is untouched and multiplies
by `1.0` exactly (IEEE-754-exact) — **the regression check to actually run**: rerun the
four existing Phase 1 goldens unchanged and confirm byte-identical output.

## `tie-break.ts` (new) + `turn-order.ts` refactor

Extracted from `turn-order.ts`'s existing comparator, generalized so `target-selectors.ts`
and `conditions.ts` (HP extremum) reuse the identical tie-break CONVENTIONS mandates for
all extremum selectors:

```ts
export function compareBySideSlotId(a: Creature, b: Creature): number { /* side -> slot -> codepoint id, exactly as turn-order.ts today */ }
export function compareByKey(a: Creature, b: Creature, keyOf: (c: Creature) => number, direction: 'asc' | 'desc'): number { /* key, then compareBySideSlotId */ }
export function pickExtremum(pool: readonly Creature[], keyOf: (c: Creature) => number, direction: 'asc' | 'desc'): Creature | undefined { /* undefined only for an empty pool */ }
```

`turn-order.ts`'s `buildTurnQueue` sort body becomes `compareBySideSlotId` after the
speed comparison — behavior-preserving; `turn-order.test.ts` reruns unchanged as the
regression gate.

## `creature-lookup.ts` (new)

```ts
export function findCreature(state: CombatState, id: CreatureId): Creature | undefined {
  return [...state.playerParty, ...state.enemyParty].find((c) => c.id === id)
}
```

`combat.ts`'s private `getCreature` becomes a thin wrapper (throws if not found), so
`targeting.ts`'s `resolveOffensiveTarget` can reuse the same lookup with no circular import.

## `targeting.ts` extension

Adds `livingEnemiesOf`/`livingAlliesOf` (side-aware, alive-filtered; ally pool always
includes the acting creature), `getProvokingMembers` (alive + provoking filter), and the
provoke-aware target resolver used by every single-target offensive path:

```ts
/**
 * Resolves a single-target offensive action's target, honoring Provoke. If the opposing
 * side has >=1 provoking member, draws one seeded-RNG index among them and returns that
 * provoker — `resolveNormally` is NEVER CALLED in that case, so a selector's own RNG
 * draw (e.g. random-enemy) never happens when it would just be discarded. Only when no
 * provoker exists does the normal selector/default-target resolution run (and only then
 * can IT consume RNG). Exactly one RNG draw for a single-target offensive action, ever.
 */
export function resolveOffensiveTarget(
  actor: Creature,
  state: CombatState,
  resolveNormally: () => CreatureId | null,
): CreatureId | null {
  const opposingParty = actor.side === 'player' ? state.enemyParty : state.playerParty
  const provokers = getProvokingMembers(opposingParty)
  if (provokers.length > 0) {
    const index = Math.floor(state.rng.next() * provokers.length)
    return provokers[index]?.id ?? null
  }
  return resolveNormally()
}
```

This replaces the earlier post-hoc "resolve target, then override" design: the original
draft resolved a rule's selector (including `random-enemy`'s RNG draw) and only *then*
checked for a provoker to override it with, discarding the selector's result — meaning
the RNG stream's position depended on which selector a rule happened to author, even
when Provoke made that selector's result irrelevant. That is exactly the "incidental
script structure" dependency the lookahead/execution RNG discipline exists to prevent
(CONVENTIONS' "Non-winning rules... must not consume RNG state" principle, extended here
to "a discarded resolution must not consume RNG state" too). `resolveOffensiveTarget`
checks for a provoker **first** and short-circuits before ever calling `resolveNormally`,
so exactly one RNG draw occurs when a provoker exists, and the original selector's
result — random or not — is never computed. Called from `interpreter.ts` (see below) for
both rule-driven attacks/single-casts and the implicit fallback's Attack; never called
for AOE Cast, Defend, Provoke, or Wait (structurally exempt, matching "Provoke only
narrows single-target selection").

**`ASSUMPTION:`** the provoke RNG draw happens whenever >=1 provoker exists, even exactly
one (no skip-the-draw special case for a singleton pool) — for RNG-consumption
consistency independent of provoker count.

## `target-selectors.ts` (new)

`targetSelectorHasCandidate` (existence-only, **never touches `state.rng`** — this is
load-bearing for the lookahead/execution RNG split) and `resolveTargetSelector` (the real
resolution, using `pickExtremum` for every extremum kind; `random-enemy` is **the one
blessed RNG draw site** in this module). **`ASSUMPTION:`** lowest/highest-HP selectors
compare raw `currentHp`, not HP% (unlike `HpPercentCondition`, which the spec explicitly
ties to percentage) — GAME_DESIGN's selector list doesn't specify percentage here.
`highest-attack-enemy`/`highest-intelligence-enemy` compare via `getEffectiveStat` (raw
stat threat ranking, not `getOffensiveStat` — spellPower is a property of the caster's
chosen action, not the enemy's stat).

## `conditions.ts` (new)

`evaluateCondition(condition, creature, state): boolean` — pure, **never touches
`state.rng`**, safe to run during lookahead for every rule. HP% uses integer
cross-multiplication (`currentHp * 100 <cmp> thresholdPercent * effMaxHp`), matching the
locked spec exactly; `any` qualifier is existential over the subject pool, `lowest`/
`highest` pick-and-test the extremum via `pickExtremum`.

## `interpreter.ts` (new) — `decideAction`

```ts
export function decideAction(creature: Creature, script: Script | null, state: CombatState): Action | null {
  if (script) {
    for (const rule of script.rules) {
      if (!evaluateCondition(rule.condition, creature, state)) continue
      if (!isRuleValid(rule, creature, state)) continue        // existence-check only, no RNG
      return resolveRuleAction(rule, creature, state)          // the ONE resolution site (incl. RNG),
                                                                 // for the winning rule only
    }
  }
  return decideImplicitFallback(creature, state)   // Attack a valid default target, else Wait
}
```

Private helpers (not exported — matches `combat.ts`'s own style of not unit-testing
private helpers directly): `isRuleActionValid` (the one reachable invalidity: `cast`
referencing an empty gem slot); `actionNeedsTargeting` (false for defend/provoke/wait;
for cast, depends on the *equipped spell's* shape, resolved at evaluation time — true for
single, false for AOE); `isRuleValid` (invalid action → false; else, if targeting isn't
needed → true; else requires a present `targeting` selector with `targetSelectorHasCandidate`
true); `resolveRuleAction` (the actual resolution — attack/single-cast route their target
through `targeting.ts`'s `resolveOffensiveTarget(creature, state, () =>
resolveTargetSelector(rule.targeting, creature, state))`, so Provoke is checked *before*
the rule's own selector ever runs; AOE-vs-single dispatch also happens here);
`decideImplicitFallback` (routes through `resolveOffensiveTarget(creature, state, () =>
getDefaultTarget(enemyParty))` the same way, so the implicit fallback is provoke-aware
too; **behavior upgrade over Phase 1**: "else Wait" is now a real emitted action, not
`null`).

**`ASSUMPTION:`** a targeting-required rule action with no `targeting` field is invalid
(skip to next rule), not a silent fallback to `Script.defaultTarget` (reserved/unused in
Phase 2) or a hardcoded default. **`ASSUMPTION:`** `decideAction` keeps `Action | null`
(matching the Phase 1 signature) even though `null` is unreachable from Phase 2 onward —
kept nullable for defensive/typing consistency with the codebase's existing
"honest-about-unreachable" style (e.g. `getDefaultTarget`) rather than tightening the
type and touching every call site.

**RNG discipline (the load-bearing correctness property):** validity-checking
(`isRuleValid`) never calls `resolveTargetSelector` — only `targetSelectorHasCandidate`,
which never reads `state.rng`. For the rule that actually wins, exactly **one** RNG draw
occurs for target resolution, full stop — `resolveOffensiveTarget` guarantees this by
checking for a provoker before ever invoking the selector's own resolution, so a
`random-enemy` selector that would be overridden by an active Provoke never draws at all.
A non-matching rule earlier in the list that references `random-enemy` targeting must
also consume zero RNG state — verified directly in `interpreter.test.ts` by comparing
`state.rng`'s subsequent draw across two runs (with and without a dummy non-matching
random-selector rule ahead of the real one), **and** by a second case: a winning rule
with `random-enemy` targeting, run once with an active provoker and once without,
confirming exactly one RNG draw happens in both cases (never two).

## `combat.ts` — restructuring

`createCombat` gains the 4th `scripts` param (see "Script assignment" above); everything
else (empty-party guard, seeding, no events emitted) unchanged. New shared helper
`applyDamageAndEmit` (extracted from the old `executeAttack` body: apply HP change, push
`DamageDealt`, push `CreatureDied` if it killed) is reused by `executeAttack`,
`executeCastSingle`, and each iteration of `executeCastAoe`'s loop — DRY across all three
damage-dealing paths.

`executeCastAoe`: computes the frozen target list once (`opposingParty.filter(alive)`,
slot order), emits **one** `SpellCast{targetShape:'aoe', targetIds}`, then loops over
that frozen list, **skipping any target that is no longer `alive` at the time its hit
would land** before calling `applyDamageAndEmit`. In Phase 2 this guard is inert — there
is no other kill source mid-AOE, so no frozen-list target can die before its own hit
resolves — but Phase 3 (reflect-damage traits, on-hit/on-death triggers) can introduce
exactly that, and emitting `DamageDealt` against an already-dead creature would be wrong.
The frozen-list contract itself is unchanged (the target *set* is still fixed at
cast-start; this only skips *hitting* a member that died before its turn in the loop).
The whole loop completes and returns before `resolveTurn`'s win/loss check runs — **the
win-check position in `resolveTurn` does not move**, exactly preserving the invariant
`combat.ts` already documents today ("must never move inside a per-target loop").

`executeAction`'s switch grows one case per new `Action` variant (`cast` sub-switches on
`targetShape`), each ending in the same `const exhaustive: never` pattern already used
throughout the file. `executeDefend`/`executeProvoke`/`executeWait` are one-liners: push
the intent event, set the flag (or no-op for Wait).

`resolveTurn`'s **only** structural change is the turn-body block shown under "Defend/
Provoke lifecycle" above — fight-start, the round-boundary+cap-gate, dequeue-with-
undefined-guard, and the post-bracket win/loss check are all **untouched**.

## `src/data/spells.ts` and `src/data/scripts.ts` (new, real content)

Two spells: **`EMBER_LANCE`** (single-target, spellPower 0.5 — **`ASSUMPTION:`** no
textual anchor, chosen for clean hand-derivable golden arithmetic) and **`CINDER_NOVA`**
(AOE, spellPower 0.3 — reuses the "30%-Intelligence" anchor from `GAME_DESIGN.md` §7's
own example and the Phase 2.5 brief's explicit call-out, so this is shipping that anchor
as real data, not inventing a new number).

**Implementation-time fixture note:** at spellPower 0.5, `EMBER_LANCE` is weaker than a
basic Attack (1.0) except for reading Intelligence instead of Attack. Any hand-derived
test/golden that exercises it (the `combat.test.ts` single-Cast unit test and
`scripts.test.ts`'s `always-cast` sanity check) must give the casting creature enough
Intelligence that `(Int × 0.5) − Defence` lands clearly above the chip floor — otherwise
the case only demonstrates the `MAX(1, ...)` chip minimum, not real spellPower scaling,
and doesn't prove what it's there to prove.

Five stock scripts (`always-attack`, `always-cast`, `always-defend`, `always-provoke`,
`always-wait`), matching ROADMAP's exact list. `always-cast` targets gem slot 0 with a
`lowest-hp-enemy` selector; if slot 0 holds an AOE spell the selector is simply ignored
at evaluation time (per the documented mismatch tolerance), and if slot 0 is empty the
rule is invalid and the script falls through to the implicit fallback automatically — no
special-casing needed in the script data itself. `STOCK_SCRIPTS_BY_ID: ReadonlyMap<string,
Script>` is ready to pass directly as `createCombat`'s new `scripts` argument.
`src/data/scripts.test.ts` adds a light sanity check per script (shape + one representative
behavior) to catch typos in the shipped data itself — this is real content, not a test
fixture, so it earns a light test the way other `src/data/` content eventually will.

## Mechanical compile-compatibility (no behavior change)

- `__fixtures__/creatures.ts`: `CreatureOverrides` gains `scriptId?`, `equippedSpells?`,
  `defending?`, `provoking?`; `makeCreature` defaults them to `null`, an
  all-`null` array of length `DEFAULT_GEM_SLOT_COUNT`, `false`, `false`. Since every
  existing golden fixture (`__golden__/*.fixture.ts`) and both `combat.test.ts`'s
  `makeParty`-built parties go through this factory, they all continue to compile and
  produce byte-identical output automatically — verified: no golden fixture constructs a
  `Creature` literal inline.
- `combat.test.ts`'s one hand-built `CombatState` literal (the round-cap test, confirmed
  at `combat.test.ts:97-105`) needs `scripts: new Map()` added directly.
- `effective-stats.test.ts`'s inline `Creature` literal needs the 4 new fields.
- `demoFight.ts`'s hardcoded `Creature` literals need the 4 new fields (`scriptId: null,
  equippedSpells: [], defending: false, provoking: false`) — compile-only; wiring the demo
  to actually *use* scripts/spells is explicitly Phase 2.5's separate-PR job per its brief.
- `CombatDemo.tsx`'s exhaustive `describeEvent` switch (typed `never` default) needs one
  new case per new event kind (`SpellCast` both shapes, `Defended`, `Provoked`, `Waited`)
  — plain one-line descriptions, matching the file's existing terseness, or it fails to
  compile once `CombatEvent` grows.

## Test plan

- **`tie-break.test.ts`** (new): tie-break ordering parity with today's `turn-order.test.ts`
  cases; `pickExtremum` on empty/singleton/tied pools.
- **`effective-stats.test.ts`** (extend): `getOffensiveStat(c, 'cast', 0.3)` scales
  Intelligence; the no-3rd-arg Attack call stays exactly `1.0`× (the parity regression check).
- **`targeting.test.ts`** (new — Phase 1 only covered `getDefaultTarget` indirectly):
  direct null-on-empty/first-living-by-slot coverage; `livingEnemiesOf`/`livingAlliesOf`
  side/alive filtering, ally pool includes self; `resolveOffensiveTarget` calls
  `resolveNormally()` when zero provokers exist, redirects deterministically to a sole
  provoker without calling `resolveNormally()` at all when one exists; and an **expired-
  provoker case** — a creature with `provoking: false` (simulating a provoke that already
  lapsed on its own earlier turn this round) is correctly excluded from
  `getProvokingMembers`/the redirect pool, so `resolveOffensiveTarget` falls through to
  `resolveNormally()` even though that creature provoked earlier in the same fight.
- **`interpreter.test.ts`** (extend the list below): add an explicit case that
  `decideAction(creature, null, state)` — the **implicit fallback**, no script assigned —
  still redirects its default Attack to a provoker when one exists on the opposing side.
  This is new behavior in Phase 2 (Phase 1's fallback never interacted with Provoke,
  since Provoke didn't exist yet), and while `golden-6v6-scripted` likely exercises it
  incidentally, it deserves its own direct assertion rather than relying on an
  integration golden to prove it.
- **`target-selectors.test.ts`** (new): existence+resolve pair per selector kind; tie-break
  parity; solo-creature `lowest-hp-ally` resolves to self; **RNG discipline** —
  `targetSelectorHasCandidate` never advances `state.rng` (assert via comparing `.next()`
  before/after against an untouched sibling RNG).
- **`conditions.test.ts`** (new, table-driven): boundary tests per comparator at the exact
  percent threshold (values chosen so naive float math would land wrong), across
  subject×qualifier combos including solo-ally-self; count/round boundary equality;
  enemy-weak-to-me-exists true/false; is-provoking reflects the flag directly.
- **`interpreter.test.ts`** (new): rule precedence (first valid match wins); skip-on-
  invalid via empty gem slot and via missing-required-targeting; implicit fallback (null
  script, no rule matches, no valid enemy target → Wait); AOE ignores a stray `targeting`;
  Defend/Provoke/Wait always resolve; the **RNG lookahead-vs-execution** proof described
  above.
- **`combat.test.ts`** (extend): Defend reduces damage then expires on the defender's own
  next turn (full damage resumes); Provoke redirects a single-target action even against
  a selector that would've picked someone else; Cast (single) emits `SpellCast` + correct
  spellPower-scaled `DamageDealt`; Cast (AOE) emits one `SpellCast` + N `DamageDealt`/
  `CreatureDied`, win/loss checked only after all N; empty-slot Cast never emits
  `SpellCast`; Wait emits `Waited` with zero consequence events.
- **`src/data/scripts.test.ts`** (new): one sanity assertion per stock script.

## Golden fixtures (all hand-derived unless noted; regression gate first)

**Before adding any new golden**, rerun the four existing Phase 1 goldens
(`golden-1v1`, `golden-6v6`, `golden-affinity-matchup`, `golden-stomp`) and confirm they
are still byte-identical — the explicit proof that spellPower=1.0/Defend/Provoke plumbing
are transparent no-ops for pure-Attack fights.

1. **`golden-scripted-1v1`** — player `always-attack`; enemy: `round-number <= 1 → Defend`
   else `always → Attack`. Exercises `round-number`, Defend's formula change, and its
   expiry on the defender's own next turn.
2. **`golden-aoe-cast`** — one caster (`always → Cast slot 0`, no targeting needed) with
   `CINDER_NOVA` equipped, vs. 2 `always-wait` enemies. One `SpellCast{aoe}` + 2
   `DamageDealt` off `Intelligence × 0.3`, win/loss checked only after both land.
3. **`golden-provoke-redirect`** — attacker's natural selector (`lowest-hp-enemy`) would
   pick the lower-HP enemy; the higher-HP enemy is the sole `always-provoke` provoker —
   with exactly one provoker the RNG index is forced to 0, so the redirect is verifiable
   without raw RNG arithmetic. Also proves the single-draw fix: since `lowest-hp-enemy`
   is deterministic (consumes no RNG either way), pair this fixture's variant coverage
   with the `interpreter.test.ts` case (see RNG discipline above) that uses a
   `random-enemy`-targeting winning rule under an active provoker, to confirm that case
   draws exactly once too.
4. **`golden-random-selector`** — rule 0 never matches but references `random-enemy`
   targeting (proves zero RNG consumption during lookahead, in a full fight, not just a
   unit test); rule 1 is the real `random-enemy` draw. Expected target derived by calling
   `rng.ts`'s own tested primitive directly as the "independent calculator," documented in
   a fixture comment (same discipline as Phase 1's float-precision notes).
5. **`golden-skip-on-invalid`** — rule 0 casts an empty slot (skip), rule 1 attacks. Zero
   `SpellCast` events ever appear.
6. **`golden-6v6-scripted`** (integration — **explicitly labeled** generated-then-
   checkpoint-verified, per CONVENTIONS' two-tier golden discipline) — 6v6, all 5 stock
   scripts represented across both sides, at least one real Cast and one real Provoke
   redirect. Assertions: round-1 turn order, per-event-type counts, final result, a handful
   of spot-checked `DamageDealt` values — not a full deep-equal.
7. **`golden-seed-sensitivity`** — same RNG-sensitive party/scripts run under two seeds;
   asserts the two full logs differ while each is individually stable across repeat runs
   of its own seed.

## Build order

1. `types.ts` + `scripting-types.ts` + `config.ts` extensions.
2. Mechanical compile-compat pass (fixtures, the two inline literals, `demoFight.ts`,
   `CombatDemo.tsx`) — get `npm run build` green before any new logic, isolating
   type-shape correctness from behavior correctness.
3. `effective-stats.ts` spellPower + tests (smallest, most isolated; confirms Attack parity).
4. `tie-break.ts` + tests; refactor `turn-order.ts` onto it; rerun `turn-order.test.ts` unchanged.
5. `creature-lookup.ts`; refactor `combat.ts`'s `getCreature`; rerun `combat.test.ts` unchanged.
6. `targeting.ts` extensions + `targeting.test.ts`.
7. `target-selectors.ts` + tests.
8. `conditions.ts` + tests.
9. `interpreter.ts` + tests (including the RNG-discipline test), passing in isolation
   before wiring into `combat.ts`.
10. `src/data/spells.ts`, `src/data/scripts.ts`, `src/data/scripts.test.ts`.
11. `combat.ts` restructuring + new `combat.test.ts` describe blocks.
12. **Regression gate**: full `npm run test` (all 4 Phase 1 goldens byte-identical),
    `npm run lint`, `npm run format:check`, `npm run build`.
13. Build the five focused hand-derived goldens, one at a time, hand-computed before
    running the real implementation.
14. Build the 6v6 integration golden (generated then checkpoint-verified, labeled).
15. Build the seed-sensitivity golden.
16. Final full pass: `npm run lint && npm run format:check && npm run test && npm run build`.

## Assumptions checklist (for review before implementation)

1. Module split: `scripting-types.ts` new; interpreter split into `interpreter.ts`/
   `conditions.ts`/`target-selectors.ts`; `Spell` stays in `types.ts`.
2. `× spellPower` lives inside `getOffensiveStat(creature, actionKind, spellPower = 1.0)`.
3. `Creature.scriptId: string | null` + `CombatState.scripts: ReadonlyMap<string, Script>`,
   threaded via a new optional 4th `createCombat` param; `decideAction` receives an
   already-resolved `Script | null`.
4. Defend/Provoke tracked as flat `Creature.defending`/`provoking` booleans.
5. Transient-status clear happens after `decideAction`, before `executeAction`
   (self-referential `is-provoking` sees pre-clear state; a fresh Defend/Provoke this turn
   isn't immediately undone).
6. A targeting-required rule action with no `targeting` field is invalid (skip), not a
   `defaultTarget`/hardcoded fallback.
7. AOE Cast `Action` carries no target list; the frozen set is computed once inside
   `executeCastAoe` and recorded only on the `SpellCast` event.
8. `SpellCast`/`CastAction` single-vs-AOE resolved via a `targetShape` sub-discriminant.
9. `EnemyWeakToMeExistsCondition` (GAME_DESIGN's "affinity advantage vs a target")
   implemented and *named* as existential — "≥1 living enemy is weak to me" — no embedded
   selector, no ally/all qualifier; conditions and selectors stay decoupled by design.
10. `IsProvokingCondition` is self-only.
11. `HpPercentCondition` ships all subject×qualifier combinations uniformly — a
    **deliberate scope expansion**, not merely a code-shape choice: self+lowest/highest
    trivially collapse to self+any (harmless), but ally+highest is real new authorable
    logic beyond GAME_DESIGN's asymmetric v1 list.
12. "Turn/round number" condition = a single `round-number` comparator against
    `CombatState.round`.
13. TargetSelector HP extremum comparisons use raw `currentHp`, not HP%.
14. Shared tie-break extracted into a new `tie-break.ts`; `turn-order.ts` refactored onto
    it (behavior-preserving).
15. `Spell` gets an added `name: string` field beyond the locked minimal shape.
16. Concrete spell content: `EMBER_LANCE` (single, spellPower 0.5, no anchor) and
    `CINDER_NOVA` (aoe, spellPower 0.3, reusing the design's own "30%" anchor).
17. `createCombat` extended with a positional (not options-object) 4th param.
18. `DEFAULT_GEM_SLOT_COUNT = 3` added to `config.ts` for fixture/data defaults only; the
    `Creature` type stays variable-length.
19. Provoke's RNG draw always happens when ≥1 provoker exists, even for a singleton pool
    — and it is the **only** draw for that target resolution: `resolveOffensiveTarget`
    checks for a provoker before ever invoking the rule's own selector, so a selector
    that would be overridden (including `random-enemy`) never runs and never draws.
20. `decideAction` keeps `Action | null` even though `null` is now unreachable in practice.
21. New self-only intent events use field name `creatureId` (not `actorId`).
22. `RuleAction` introduced as a type distinct from `Action`.
23. Golden RNG-derived values computed by treating the already-tested `rng.ts` primitive
    as the "independent calculator" (not the implementation under test, which is the
    interpreter/resolver).
24. `executeCastAoe`'s loop skips any frozen-list target that is no longer `alive` when
    its hit would land — inert in Phase 2 (no kill source exists mid-AOE yet), added as a
    forward guard against a Phase 3 landmine (reflect/on-death triggers).

## Verification

- `npm run test`, `npm run lint`, `npm run format:check`, `npm run build` — the same four
  gates CI runs on this branch's PR; green locally means green in CI.
- Explicit regression proof: the 4 Phase 1 goldens stay byte-identical after the
  `spellPower`/Defend/Provoke plumbing lands, before any new golden is added.
- Manual sanity check on any golden-test failure: re-run `resolveFight` on that fixture's
  parties/seed via a throwaway one-off to distinguish "the hand-derived expected values
  are wrong" from "the engine is wrong" — never reflexively regenerate the fixture.
