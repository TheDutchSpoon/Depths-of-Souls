# Phase 1 — Pure Combat Engine: Implementation Plan

Status: shipped

## Context

Depths of Souls is a scripting-driven incremental game; automatic 6v6 combat is the core
loop everything else builds on. Phase 0/0.5 delivered the project skeleton and a live
GitHub Pages deploy pipeline, but `src/engine/` only contains the seeded RNG utility — no
combat logic exists yet. Phase 1's job (per `ROADMAP.md`) is to build the combat resolver
itself: pure, deterministic, framework-agnostic TypeScript with **no** React/DOM/wall-clock/
`Math.random()`, proven correct via a golden-replay test suite before Phase 2 (scripting)
starts. The damage formula, event-log shape, resolver API, turn-order rules, and several
forward-looking "seams" (for stat-remap, damage-modifier pools, and effect-framework hooks
that don't exist until Phase 3+) are already precisely specified in `CONVENTIONS.md` and
`GAME_DESIGN.md` §6–7 — this plan is about turning that spec into a concrete module
structure, type design, and build order, not re-deciding the mechanics.

Work happens on the `phase-1-combat-engine` branch (already checked out). The exit
criterion (ROADMAP, verbatim): "get it green before Phase 2 — it's the proof the
architecture holds."

## Module structure

All new files live under `src/engine/`, alongside the existing `rng.ts`/`rng.test.ts`
(untouched). One file per concern; small, independently table-testable pure functions feed
into `combat.ts`, the only file that knows the turn-by-turn sequence:

```
src/engine/
  ids.ts                 CreatureId (branded) + constructor
  types.ts               Creature, Stat, Affinity, Side, Action, CombatState, CombatEvent, FightResult
  config.ts              ROUND_CAP, affinity multipliers, chip-floor rate — no magic numbers elsewhere
  affinity.ts            cycle-as-data + getAffinityMultiplier()
  effective-stats.ts     getEffectiveStat() + getOffensiveStat() seams
  damage.ts              calculateDamage() — the formula, over primitives only
  turn-order.ts          buildTurnQueue() — frozen queue construction + tie-break comparator
  targeting.ts           getDefaultTarget() — first-living-enemy-by-slot
  phase-hooks.ts         PhasePoint union + firePhaseHook() no-op stub (the Phase 3 seam)
  combat.ts              createCombat, resolveTurn, resolveFight

  __fixtures__/
    creatures.ts          makeCreature()/makeParty() test-only factories (not src/data content)

  damage.test.ts
  affinity.test.ts
  effective-stats.test.ts
  turn-order.test.ts
  combat.test.ts

  __golden__/
    golden-1v1.fixture.ts        + golden-1v1.test.ts
    golden-6v6.fixture.ts        + golden-6v6.test.ts
    golden-affinity-matchup.fixture.ts + golden-affinity-matchup.test.ts
    golden-stomp.fixture.ts      + golden-stomp.test.ts
```

**Why this split**: `damage.ts`, `affinity.ts`, `effective-stats.ts`, `turn-order.ts`,
`targeting.ts` have zero dependency on the resolver loop, so each gets its own fast,
table-driven test file with no bootstrapping. `combat.ts` is the only orchestrator.
`phase-hooks.ts` is deliberately a tiny type + no-op function — one file for Phase 3 to
turn into a real dispatcher, per CONVENTIONS' "obvious, named place for each phase point."
No circular imports: `types.ts` → leaf modules → `combat.ts`.

`__fixtures__/` stays inside `src/engine/`, not `src/data/` — `src/data/` is reserved for
real shipped content (deferred per `GAME_DESIGN.md` §13); these are throwaway test doubles,
never imported by `src/app`/`src/ui`.

## Core types (`ids.ts`, `types.ts`)

- `CreatureId = string & { readonly __brand: 'CreatureId' }` — matches the project's
  existing branded-ID convention from `CONVENTIONS.md`.
- `Stat = 'health' | 'attack' | 'intelligence' | 'defence' | 'speed'`, `Affinity = 'body' |
  'spirit' | 'mind' | 'void' | 'primal'`, `Side = 'player' | 'enemy'` — string-literal
  unions, not `enum` (tsconfig has `erasableSyntaxOnly: true`, which disallows `enum`).
- `Creature`: `{ id, side, slot, baseStats: CreatureStats, affinity, currentHp, alive }`,
  all fields `readonly`. `baseStats` is immutable for the fight's duration; every stat read
  in combat math goes through `getEffectiveStat`/`getOffensiveStat`, never `creature.baseStats.x`
  inline.
- `Action`: discriminated union on `kind`. Phase 1 has exactly one variant —
  `{ kind: 'attack', targetId: CreatureId }` — but it's a **real type the resolver
  constructs and dispatches on** (see "Action as a first-class value" below), not just a
  declared-and-ignored type, so `Cast`/`Defend`/`Provoke`/`Wait` slot in later as new union
  members with no resolver restructuring.
- `CombatState`: `{ rng: SeededRng, playerParty: readonly Creature[], enemyParty: readonly
  Creature[], turnQueue: readonly CreatureId[], turnCursor: number, round: number, result:
  FightResult | null }`. Two separate party arrays (not one merged array), since slot
  indices and "first living enemy by slot" are inherently per-side. `turnQueue` holds
  `CreatureId`s (not `Creature` objects) so it survives HP/alive changes across the round —
  the live `Creature` is re-resolved from state at turn-time, alive-checked at that moment.
  `rng: SeededRng` reuses the existing `createSeededRng`/`SeededRng` from `rng.ts` — threaded
  through state so the whole engine stays a pure `state -> newState` transform with no
  hidden/global RNG (unused for anything in Phase 1's Attack-only, deterministic-targeting
  scope, but the seam must exist now per CONVENTIONS).
- `FightResult = 'win' | 'loss' | 'draw'`.

### Events — the full discriminated union

Three families in one flat `CombatEvent` union, matching CONVENTIONS exactly:

- **Intent** (one variant per action kind, always emitted): `AttackDeclaredEvent { attackerId,
  targetId }`. Only variant in Phase 1; union shaped for `SpellCast`/`Defended`/`Provoked`/
  `Waited` later.
- **Consequence** (shared across any future source, not just Attack): `DamageDealtEvent
  { sourceId, targetId, rawDamage, finalDamage, affinityMultiplier, wasChipOnly,
  remainingHp }`, `CreatureDiedEvent { creatureId }`.
  - `rawDamage` = the full-precision float **before** the final `MAX(1, floor(...))` clamp
    (exactly `raw` in the formula spec). `finalDamage` = the actual integer HP removed. This
    is the most information-preserving reading and lets future debug UI show "raw 0.34 →
    chipped to 1" — document this on the field with a comment.
  - `wasChipOnly` = `true` iff the subtractive core (`MAX(OffStat - Defence, 0)`) was
    exactly `0`, i.e. all damage came from the chip floor.
- **Lifecycle**: `FightStartedEvent`, `RoundStartedEvent { round }`, `TurnStartedEvent
  { creatureId }`, `TurnEndedEvent { creatureId }`, `FightEndedEvent { result }`. Per the
  decision made earlier this session, **`TurnStarted`/`TurnEnded` are real log events**, not
  just internal hook checkpoints — already reflected in `CONVENTIONS.md`/`ROADMAP.md`.

Every `switch` over `CombatEvent['type']` or `Action['kind']` ends with a `default` branch
doing `const exhaustive: never = x; throw new Error(...)` (CONVENTIONS' "never default
case").

## Config (`config.ts`)

```ts
export const ROUND_CAP = 100 // N full rounds complete, then the fight ends as a draw.
                              // Placeholder per GAME_DESIGN §13 (exact number TBD).
export const AFFINITY_ADVANTAGE_MULTIPLIER = 1.25
export const AFFINITY_DISADVANTAGE_MULTIPLIER = 0.75
export const AFFINITY_NEUTRAL_MULTIPLIER = 1.0
export const CHIP_FLOOR_RATE = 0.01
```

No magic numbers in `damage.ts`/`affinity.ts`/`combat.ts` — everything pulls from here.

## Affinity (`affinity.ts`)

Cycle encoded as **data**, not branching, per CONVENTIONS:

```ts
const AFFINITY_CYCLE: readonly Affinity[] = ['body', 'spirit', 'mind', 'void', 'primal']

function beats(attacker: Affinity, defender: Affinity): boolean {
  const attackerIndex = AFFINITY_CYCLE.indexOf(attacker)
  const nextIndex = (attackerIndex + 1) % AFFINITY_CYCLE.length
  return AFFINITY_CYCLE[nextIndex] === defender
}

export function getAffinityMultiplier(attacker: Affinity, defender: Affinity): number {
  if (beats(attacker, defender)) return AFFINITY_ADVANTAGE_MULTIPLIER
  if (beats(defender, attacker)) return AFFINITY_DISADVANTAGE_MULTIPLIER
  return AFFINITY_NEUTRAL_MULTIPLIER
}
```

Verified against the cycle: Body(0)→Spirit(1) at `nextIndex`, so `beats('body','spirit')`
is `true` — matches "Body > Spirit > Mind > Void > Primal > Body."

## Effective stats & the OffStat seam (`effective-stats.ts`)

Two small functions, matching the spec's explicit distinction:

```ts
export function getEffectiveStat(creature: Creature, stat: Stat): number {
  return creature.baseStats[stat] // Phase 1: pure passthrough. Phase 3 folds active
                                    // stat-modifier effects here, in fixed order.
}

export type ActionKind = 'attack' // grows to 'attack' | 'cast' in Phase 2

export function getOffensiveStat(creature: Creature, actionKind: ActionKind): number {
  // Seam: a Phase 3 stat-remap check goes here, before the fallback.
  switch (actionKind) {
    case 'attack':
      return getEffectiveStat(creature, 'attack')
    default: {
      const exhaustive: never = actionKind
      throw new Error(`Unhandled action kind: ${String(exhaustive)}`)
    }
  }
}
```

Two functions (not one) so Phase 3's stat-remap work only ever touches `getOffensiveStat`,
never `getEffectiveStat`'s other callers (e.g. Defence reads).

## Damage formula (`damage.ts`)

Pure function over **primitives**, not `Creature` objects — trivially table-testable, and
exactly what lets Phase 2's Cast/Intelligence reuse it unchanged (only the resolver-side
caller changes which stat it reads):

```ts
export interface DamageInput {
  readonly offStat: number
  readonly defence: number
  readonly attackerAffinity: Affinity
  readonly defenderAffinity: Affinity
  readonly dealtMods: readonly number[]   // additive dealt pool; [] in Phase 1
  readonly takenFactors: readonly number[] // multiplicative taken pool; [] in Phase 1
}

export interface DamageResult {
  readonly rawDamage: number
  readonly finalDamage: number
  readonly affinityMultiplier: number
  readonly wasChipOnly: boolean
}

export function calculateDamage(input: DamageInput): DamageResult {
  const core = Math.max(input.offStat - input.defence, 0)
  const chipFloor = CHIP_FLOOR_RATE * input.offStat
  const affinityMultiplier = getAffinityMultiplier(input.attackerAffinity, input.defenderAffinity)
  const dealtMultiplier = 1 + input.dealtMods.reduce((total, m) => total + m, 0)
  const takenMultiplier = input.takenFactors.reduce((total, f) => total * f, 1)

  const rawDamage = (core + chipFloor) * affinityMultiplier * dealtMultiplier * takenMultiplier
  const finalDamage = Math.max(1, Math.floor(rawDamage))

  return { rawDamage, finalDamage, affinityMultiplier, wasChipOnly: core === 0 }
}
```

Floor happens **exactly once**, on the fully-composed `rawDamage` — never per-term (the
float-drift-safety requirement for golden-replay stability). Empty pools naturally yield
`1`/`1` multipliers via `reduce`'s identity values — no special-casing "empty means skip."

## Turn order (`turn-order.ts`)

```ts
const SIDE_TIE_RANK: Record<Side, number> = { player: 0, enemy: 1 }

export function buildTurnQueue(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
): CreatureId[] {
  const combatants = [...playerParty, ...enemyParty].filter((c) => c.alive)
  return combatants
    .map((creature) => ({ creature, speed: getEffectiveStat(creature, 'speed') }))
    .sort((a, b) => {
      if (a.speed !== b.speed) return b.speed - a.speed
      const sideDiff = SIDE_TIE_RANK[a.creature.side] - SIDE_TIE_RANK[b.creature.side]
      if (sideDiff !== 0) return sideDiff
      const slotDiff = a.creature.slot - b.creature.slot
      if (slotDiff !== 0) return slotDiff
      // Plain codepoint compare, NOT localeCompare: localeCompare is locale/ICU-dependent
      // and can order differently across machines (local vs CI), which would silently
      // break byte-identical golden-replay output.
      return a.creature.id < b.creature.id ? -1 : a.creature.id > b.creature.id ? 1 : 0
    })
    .map((entry) => entry.creature.id)
}
```

Built from creatures **alive at round-start only** — a creature already dead when the round
begins is excluded from the queue entirely (distinct from "skipped mid-round," which is
`resolveTurn`'s job via the alive-check at dequeue time; the queue itself is never mutated
or rebuilt mid-round).

## Default targeting (`targeting.ts`)

```ts
export function getDefaultTarget(enemyParty: readonly Creature[]): CreatureId | null {
  const target = enemyParty.find((c) => c.alive)
  return target ? target.id : null
}
```

`null` is structurally unreachable when called from `resolveTurn` in Phase 1 (win/loss is
checked after every action, so a turn never starts against an already-empty enemy side) —
but the function stays honest about its contract rather than throwing, since it's a
correctly-reusable leaf for Phase 2, where an empty scripted target list is a real case.

## Phase-point hook seam (`phase-hooks.ts`)

```ts
export type PhasePoint = 'fight-start' | 'round-start' | 'turn-start' | 'turn-end' | 'round-end' | 'fight-end'

export function firePhaseHook(_point: PhasePoint, state: CombatState): CombatState {
  return state // No-op in Phase 1. Phase 3 dispatches real hooks here, respecting MAX_TRIGGER_CASCADE_DEPTH.
}
```

`combat.ts` calls this at all six named points even though it's a no-op today — gives
Phase 3 six concrete call sites instead of an undifferentiated loop to refactor.

## The resolver (`combat.ts`)

### `createCombat`

Guards empty parties by **throwing** (a caller-contract violation — the game should never
start a fight with 0 creatures on a side; this isn't a normal runtime case to validate
gracefully). Seeds the RNG via the existing `createSeededRng`. Does **not** build the turn
queue (round `0`, empty queue, `result: null`) — the first `resolveTurn` call detects the
exhausted queue and starts round 1. Does **not** emit any events itself — events only ever
flow from `resolveTurn`/`resolveFight`, keeping the factory a plain, event-free constructor.

### Action as a first-class value

`resolveTurn` explicitly **decides** an `Action` and then **executes** it as two distinct
steps, rather than hardcoding Attack behavior inline. This is the one structural change
from the initial draft plan, and it matters: `ROADMAP.md` lists `Action` as a core Phase 1
type specifically so Phase 2's scripting interpreter can later replace only the "decide"
step (consult the creature's assigned script template) while the "execute" step (a switch
on `action.kind`, currently one case) is untouched — exactly the same seam pattern already
used for `getOffensiveStat` and the phase-hooks.

```ts
function decideAction(actor: Creature, state: CombatState): Action | null {
  // Phase 1: no scripting yet — this IS the implicit fallback. Always Attack the
  // default target. Returns null only in the structurally-unreachable empty-enemy case.
  const enemyParty = actor.side === 'player' ? state.enemyParty : state.playerParty
  const targetId = getDefaultTarget(enemyParty)
  return targetId ? { kind: 'attack', targetId } : null
}

function executeAction(
  actor: Creature,
  action: Action,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  switch (action.kind) {
    case 'attack':
      return executeAttack(actor, action.targetId, state, events)
    default: {
      const exhaustive: never = action.kind
      throw new Error(`Unhandled action kind: ${String(exhaustive)}`)
    }
  }
}
```

`executeAttack` contains the logic already designed: emit `AttackDeclared`, look up the
target, compute `getOffensiveStat(actor, 'attack')` / `getEffectiveStat(target, 'defence')`,
call `calculateDamage` with **empty** `dealtMods`/`takenFactors` arrays (Phase 1 always
empty — wired for Phase 3, not special-cased away), apply the HP change via a small
`updateCreature` helper, emit `DamageDealt`, and emit `CreatureDied` if HP hit zero.

**State-threading discipline (applies to every sub-step below):** `resolveTurn` threads a
single `working` variable through decide → execute → win/loss check, exactly as
`resolveFight` already threads `working` across turns. `executeAttack` takes the current
`working` state and returns the updated one; every value derived from a creature **after**
`updateCreature` runs (e.g. `remainingHp` on the `DamageDealt` event) must be read from the
freshly returned state — never from a `target`/`actor` object captured before the mutation.
This is the easiest place to introduce a silent determinism/correctness bug (stale-closure
reads), so no helper may take a state snapshot and hold onto it across a mutation boundary.

### `resolveTurn` — full step sequence

1. **Fight-start** (once, when `state.round === 0`): fire the `fight-start` hook, emit
   `FightStarted`.
2. **Round boundary check**: if `turnCursor >= turnQueue.length`, the round is over (or
   this is the very first call). Fire `round-end` (skip if `round === 0`, nothing to end).
   **Round-cap gate — checked here, before starting a new round**: if `round + 1 >
   ROUND_CAP`, finalize immediately as `'draw'` (see "Finalizing," below) **without**
   building a new queue or emitting `RoundStarted` for a round that won't actually run.
   *(Checking the cap generically after an action — inside an already-started over-cap
   round — would cut that round off after just one creature's turn. Gating it here instead
   means exactly `ROUND_CAP` full rounds complete, then a clean draw.)* Otherwise: build the
   new queue via `buildTurnQueue`, reset `turnCursor` to `0`, increment `round`, fire
   `round-start`, emit `RoundStarted { round }`.
3. **Dequeue**: read `turnQueue[turnCursor]`, increment `turnCursor`. If `undefined` (queue
   built but empty — the simultaneous-total-wipe edge case), skip straight to the win/loss
   check (step 5).
4. **Turn body — the bracket is always emitted; only the action and the turn hooks are
   alive-gated.** Resolve the live `Creature` by id (`actor`). A dead-before-turn creature
   (died earlier this round, before its slot came up) still gets its `TurnStarted`/
   `TurnEnded` pair — an empty bracket, nothing between, **is** the skip signal (no separate
   `TurnSkipped` event). This is what CONVENTIONS' "explicit boundary even for no-op turns"
   actually requires; returning early with no bracket at all (an earlier draft of this plan)
   would have silently defeated the reason those events were made real in the first place.

   ```ts
   if (actor.alive) working = firePhaseHook('turn-start', working)
   events.push({ type: 'TurnStarted', creatureId: actor.id })

   if (actor.alive) {
     const action = decideAction(actor, working)
     if (action) working = executeAction(actor, action, working, events)
   }

   events.push({ type: 'TurnEnded', creatureId: actor.id })
   if (actor.alive) working = firePhaseHook('turn-end', working)
   ```

   A dead creature never fires `turn-start`/`turn-end` hooks (a dead creature must not
   trigger start-of-turn effects) and never calls `decideAction`/`executeAction` — but the
   log always shows it was its turn.
5. **Win/loss/draw check — after every action**, not just round boundaries: player wiped →
   `'loss'`, enemy wiped → `'win'`, both wiped → `'draw'` (defensive; structurally
   unreachable given single-target Phase 1 damage). If decided, finalize; otherwise return
   the new state and this step's events.

**Finalizing** (shared by both the round-cap gate and the post-action check, so there's one
code path that sets `result`, appends `FightEnded`, and fires the `fight-end` hook — not two
copies of that logic):

```ts
function finalize(
  state: CombatState,
  events: CombatEvent[],
  result: FightResult,
): { state: CombatState; events: CombatEvent[] } {
  const finalState = firePhaseHook('fight-end', { ...state, result })
  return { state: finalState, events: [...events, { type: 'FightEnded', result }] }
}
```

### `resolveFight`

```ts
export function resolveFight(state: CombatState): { state: CombatState; events: CombatEvent[] } {
  let working = state
  const allEvents: CombatEvent[] = []
  while (working.result === null) {
    const step = resolveTurn(working)
    working = step.state
    allEvents.push(...step.events)
  }
  return { state: working, events: allEvents }
}
```

Termination is guaranteed because the round-cap gate inside `resolveTurn` is unconditional
— `resolveFight` needs no cap-tracking of its own, it just trusts the primitive.

### Small private helpers in `combat.ts`

`getCreature(state, id)` — linear search across both party arrays, throws on an unknown id
(a genuine resolver-invariant violation, not a normal case). `updateCreature(state, id,
patch)` — maps both party arrays, replacing the matching creature; trivial cost at ≤12
creatures total, no premature optimization needed.

## Fixtures (`__fixtures__/creatures.ts`)

Factory functions (not static constants) so tests override only the fields they care about:

```ts
export function makeCreature(overrides: CreatureOverrides = {}): Creature { /* defaults: all stats 20, side 'player', alive true */ }
export function makeParty(side: Side, creatures: CreatureOverrides[]): Creature[] {
  return creatures.map((overrides, slot) => makeCreature({ ...overrides, side, slot }))
}
```

Comment at the top: test-only, not real content (`src/data/` is for that, deferred).

## Golden-replay fixtures — format decision

**TypeScript fixture modules exporting plain data (parties + seed) with the expected event
log as a literal, hand-authored array in the same file — not JSON, not `toMatchSnapshot()`.**

Reasoning: CONVENTIONS explicitly warns against "reflexively update snapshot" turning a
regression detector into a rubber stamp — `vitest -u` makes that one keystroke away for
`toMatchSnapshot()`. A hand-written expected array forces a human to edit the assertion
itself to make a legitimate change pass, which is exactly the discipline CONVENTIONS wants.
`.ts` (not `.json`) fixtures also get compile-time checking against `CombatEvent[]` — a
typo'd `type` string is a compile error, not a silently-always-passing test. Expected values
must be **derived by hand from the formula**, not generated by running the implementation
once and copy-pasting its output — a fixture authored that way proves nothing.

Four scenarios (each genuinely tiny — CONVENTIONS: "keep fixtures small so a diff is
human-readable"):

1. **`golden-1v1`** — 1v1, same/neutral affinity, stats chosen for clean-but-not-trivial
   hand math (at least one non-whole-number `rawDamage`), runs 2–4 rounds to a clean `win`.
2. **`golden-6v6`** — full 6v6, distinct speeds, deliberately including one player/enemy
   Speed tie to exercise "player side wins ties" in a real fixture (not just the unit test);
   stats tuned for a fast, decisive, still-small log.
3. **`golden-affinity-matchup`** — a pairing where the outgoing hit shows ×1.25 and the
   return hit shows ×0.75 (or vice versa) — **verify the exact pair against the literal
   `AFFINITY_CYCLE` array at implementation time**, don't guess it during planning.
4. **`golden-stomp`** — heavily lopsided stats for a fast 1–2 round win, pairing a dominant
   stomp (core dominates) with an underdog whose hits are chip-floor-only. `wasChipOnly` is
   `core === 0`, which requires `offStat ≤ defence` — **not merely "small" Attack** — so the
   underdog's effective Attack must be pinned at or below the stomper's effective Defence for
   the fixture to actually exercise `wasChipOnly: true`, not just produce low damage.

## Test plan

**Unit** (table-driven per CONVENTIONS, using `it.each`/`describe.each` where natural):
- `damage.test.ts`: chip-only case, core+chip both contributing, all three affinity
  multipliers, empty pools ⇒ exactly `1`×, non-empty pools (even though the resolver never
  passes them yet) to prove the formula is genuinely wired, `MAX(1, floor(...))` clamp, and
  a case proving floor-once-at-the-end (not per-term) is what's actually implemented.
- `affinity.test.ts`: all 5×5 affinity pairs table-driven — each affinity has exactly one
  advantage, one disadvantage, three neutral matchups.
- `effective-stats.test.ts`: characterization tests pinning today's passthrough behavior
  for both `getEffectiveStat` and `getOffensiveStat` (per CONVENTIONS "characterize the
  empty seams now" — this is what makes a future Phase 3 diff meaningful).
- `turn-order.test.ts`: descending speed; side tie-break; slot tie-break; a **synthetic**
  same-side/same-slot case constructed directly (bypassing `makeParty`, which can't produce
  this naturally) purely to exercise the id tie-break branch, commented as deliberately
  synthetic; dead creatures excluded from the built queue.
- `combat.test.ts`: `createCombat` throws on either empty party; determinism (same
  parties+seed run twice ⇒ deep-equal events and result); death-mid-round skip (a 2v1 where
  the enemy dies before its own queued turn ⇒ its turn still produces a `TurnStarted`
  immediately followed by `TurnEnded` with **no** `AttackDeclared`/`DamageDealt` between
  them — the empty bracket is the skip signal, not a missing bracket); round-cap → draw (**construct a `CombatState` object directly** with `round` pre-set near
  `ROUND_CAP`, rather than adding a test-only parameter to `createCombat`'s public API —
  `CombatState` fields are plain readonly data, so this is legitimate white-box testing with
  no production API pollution; assert the last `RoundStarted.round === ROUND_CAP` to confirm
  the round completed fully rather than being cut off mid-round); loss symmetry; `CreatureDied`
  fires in the same `resolveTurn` call as the killing `DamageDealt`, immediately after it;
  default targeting re-picks the next living slot after the current target dies.

**Golden-replay**: the four `__golden__/*.test.ts` files, each: `createCombat` → `resolveFight`
→ `expect(events).toEqual(expectedEvents)` + `expect(state.result).toBe(expectedResult)`.

## Build order

Sequenced for an early, provably-correct slice rather than one big landing:

1. `ids.ts` + `types.ts` — types only, `tsc` compiles.
2. `config.ts` + `affinity.ts` + `affinity.test.ts` — first green suite, fully isolated.
3. `effective-stats.ts` + `effective-stats.test.ts` — pins the seam contract early.
4. `damage.ts` + `damage.test.ts` — the highest-value, most detail-sensitive unit; get every
   table case green here, in isolation, before any resolver code exists.
5. `__fixtures__/creatures.ts`.
6. `turn-order.ts` + `turn-order.test.ts`.
7. `targeting.ts` (no dedicated test file — exercised via `combat.test.ts` and golden fixtures).
8. `phase-hooks.ts` (no dedicated test — asserted indirectly by every resolver test passing).
9. `combat.ts` + `combat.test.ts`, internally: empty-party guards first (fastest green test
   against the new file) → a quick manual 1v1 trace to shake out event-ordering bugs →
   death-mid-round / win-loss-draw / determinism / round-cap / re-targeting.
10. Golden fixtures, in order of hand-verification difficulty: `golden-1v1` →
    `golden-stomp` → `golden-affinity-matchup` (derive the cycle pairing carefully) →
    `golden-6v6` (most complex to hand-verify, done last once confidence is highest).
11. Full-suite pass (see Verification).

## Verification

- `npm run test` — all unit + golden-replay tests pass.
- `npm run lint` — `eslint .` clean.
- `npm run format:check` — `prettier --check .` clean.
- `npm run build` — `tsc -b && vite build` succeeds (this is the real strict-mode
  typecheck gate: `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`
  all enforced).
- All four commands are exactly what the CI workflow (`.github/workflows/deploy.yml`) runs
  on this branch's PR — green locally means green in CI.
- Manual sanity check: run `resolveFight` on the `golden-1v1` fixture's parties/seed via a
  throwaway `node`/`vitest` one-off if any golden test fails, to distinguish "the fixture's
  hand-derived expected values are wrong" from "the engine is wrong" — per CONVENTIONS, a
  golden-test failure is a question to answer deliberately, never a reflexive
  regenerate-the-fixture action.
