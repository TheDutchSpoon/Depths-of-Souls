# Plan — Phase 4.1 — Slice H2b1: Flickerlings and damage observation

Slice id `4.1-H2b1`, mailbox `.claude/phases/4.1/H2b1/`. Built against the code on branch
`phase-4.1-slice-h2b1` at `c2b0889`. Brief ASSUMPTIONS 115, 116, 130–132, 137, 138 and 140 are
decided; the numbered items marked **ASSUMPTION A<n>** below are this plan's own choices, collected
in the checklist at the end.

## Approach in one paragraph

Damage observation is a **sibling hook, `on-damage-observed`**, fired from the one place every
damage event passes (`applyDamageAndEmit`), with the same filter model as `on-action-observed`
(`relationship` plus a new `selfInflicted`). The self-inflicted flag is a **required parameter**
chosen where the cost branch is chosen (`applyCostDamage` passes `true`; the direct path and the
tick path pass `false`), never derived from `source === target`. The Wick's gate is a
**trigger-only condition** (`other-ally-injured`) and its heal target a **new `ResponseTarget`**
(`lowest-hp-injured-other-ally`); both read one pool function, so they cannot disagree. The player
vocabulary (`Condition`, `TargetSelector`) does not change. Content then swaps in place: Flickerlings
for Glowflies, Beacon Charge's second effect, Overcharge out, Luminous Tide renamed in place.

## Module changes, by file

### Engine (`src/engine`)

- **`effect-types.ts`**
  - `Hook` gains `'on-damage-observed'` (the 17th; the header comment's count and history updated).
  - `ObservationFilter` gains `selfInflicted?: boolean`. Its doc comment says which fields belong to
    which hook: `actionKind` and `excludeActor` are action-hook fields, `selfInflicted` is a
    damage-hook field, `relationship` is shared (observer vs. the actor / vs. the damaged creature).
  - New `OtherAllyInjuredCondition = { kind: 'other-ally-injured' }` and
    `TriggerCondition = Condition | OtherAllyInjuredCondition`. `TriggeredDef.condition` and
    `ResolvedHookEffect.condition` become `TriggerCondition`; `hasRealGuard`'s parameter widens the
    same way (it only reads `.kind`). `ConditionalDamageBonusDef.condition` and every
    scripting `Rule`/`Script` stay `Condition`.
  - `ResponseTarget` gains `{ kind: 'lowest-hp-injured-other-ally' }`.
  - New load-time `validateObservationFilters(defs)` (beside `validateStatModifierConditions`):
    throws if `actionKind`/`excludeActor` sit on a non-`on-action-observed` trigger, or
    `selfInflicted` on a non-`on-damage-observed` trigger, or an `observationFilter` sits on any
    other hook. Called from `data/traits/index.ts` over every trait's effects, as the S2 validator is.
- **`targeting.ts`**: `injuredOtherAlliesOf(creature, state)` =
  `livingAlliesOf(creature, state).filter(c => c.id !== creature.id && c.currentHp < effectiveMaxHp(c))`.
  The one pool. "Hurt" is `currentHp` below `effectiveMaxHp` (the floor of effective Health), an
  integer comparison, so a Voidmaw-raised ceiling counts and a clamped current HP never does
  (`targeting.ts` already imports `effects.ts`, where `effectiveMaxHp` lives; no new cycle).
- **`target-selectors.ts`**: `resolveLowestHpInjuredOtherAlly(creature, state)` =
  `pickExtremum(injuredOtherAlliesOf(...), c => c.currentHp, 'asc')?.id ?? null`. RNG-free. Not a
  `TargetSelector` variant (the kickoff's trap: the player-facing vocabulary stays as is).
- **`conditions.ts`**: new `evaluateTriggerCondition(condition, creature, state, resolvingAgainstId?)`:
  `other-ally-injured` → `injuredOtherAlliesOf(creature, state).length > 0`; anything else delegates
  to `evaluateCondition` unchanged. `evaluateCondition` and its exhaustive `never` arm are untouched,
  so the interpreter can never evaluate the new kind.
- **`resolution.ts`**
  - `applyDamageAndEmit` takes a required `selfInflicted: boolean` (no default, so the compiler finds
    every caller). New damage-path order, after `DamageDealt`:
    `on-damage-dealt` (source, unconditional) → `on-damage-taken` (self, only if it survived) →
    **`on-damage-observed` (living creatures, unconditional, even on a lethal hit)** → if it died:
    `CreatureDied` → `on-death` → `on-kill` → `on-ally-death`/`on-enemy-death`. The existing
    `if (!died) { …; return }` is restructured so the observation sits between the two forks; every
    other step keeps its position, so a fight with no `on-damage-observed` effect logs identically.
  - The observation call:
    `fireHook('on-damage-observed', livingIds(working), target.id, working, ctx, { observedDamage: { selfInflicted } })`.
    The hook's `source` is the **damaged creature**, so `relationship` and the existing
    `'target'`-subject conditions resolve against it. (`livingIds` is `actions.ts`'s helper; it moves
    to a small shared export, or `resolution.ts` gets an equivalent next to `fireDeathObservers`.
    Implementation detail, no behaviour.)
  - `FireHookOptions` gains `observedDamage?: { readonly selfInflicted: boolean }`.
  - `fireHook`'s filter block branches on the **hook**, not on which option is present:
    - `on-action-observed`: unchanged (`observed` present → `actionKind`/`excludeActor`/`relationship`).
    - `on-damage-observed`: if `observedDamage` is absent, **skip the candidate** (fail closed: a
      call site that forgets the option can never make every Flare fire on every hit). Otherwise
      apply `relationship` against the damaged creature (`self`/`ally` incl. self/`enemy`/`any`) and
      `selfInflicted` (absent = either).
    - Because the damage hook is a different hook from `on-action-observed`, a Resonant (which
      subscribes to the action hook only) cannot see a damage event, and no action event can reach a
      Flare.
  - `fireHook` evaluates `effect.condition` through `evaluateTriggerCondition`.
  - `resolveResponseTargets` gains the `lowest-hp-injured-other-ally` case.
  - `applyCostDamage` passes `selfInflicted: true`; `applyFlatDamage` (the tick path) and
    `dealDamageCore` pass `false`. The zero-cost early return stays before `applyDamageAndEmit`, so a
    zero cost emits nothing and observes nothing (ASSUMPTION 132); its `TriggerFired` stays (138).
  - Comments naming Glow/Detonator in `resolution.ts` (the `consume-stacks` case) and
    `effect-types.ts` are reworded to name no deleted content; the mechanism itself stays for H2b2.
- **`actions.ts`**: no behaviour change. The five `on-action-observed` call sites stay as they are.

### Data (`src/data`)

- **`traits/glimmerdark.ts`**: the three Glowfly traits are removed (after the deletion step, below),
  three Flickerling traits added in their place:
  - **Wick** (`on-turn-start`, two effects, burn then heal, both carrying
    `condition: { kind: 'other-ally-injured' }`):
    1. `deal-damage`, `target: self`, `flatAmount: { ofStat: 'health', percent: 10 }`, no
       `statusId`, no `damageSource` (label `'dot'`, see A12). The missing `statusId` plus a
       self-target is what puts it on the cost path.
    2. `heal`, `target: { kind: 'lowest-hp-injured-other-ally' }`,
       `amountPerStack: { ofStat: 'health', percent: 20 }` (exact integer maths; reads the Wick's own
       effective Health because `resolveFlatTotal` reads `context.self`, the firer).
  - **Flare** (`on-damage-observed`, `observationFilter: { relationship: 'ally', selfInflicted: true }`):
    `apply-stat-modifier`, `target: all-allies`, `stat: 'speed'`, `factor: 1.15`.
  - **Last Gleam** (`on-ally-death`): `apply-stat-modifier`, `target: all-allies`, `stat: 'attack'`,
    `factor: 1.2`.
  - Header and Resonant/Sparkeater comments that cite Glow or the affinity spread are fixed.
- **`traits/index.ts`**: swap the three exports in the import list and `TRAIT_REGISTRY`; call
  `validateObservationFilters`.
- **`species/glimmerdark.ts`**: `GLOWFLIES` → `FLICKERLINGS` **in the same slot** of
  `GLIMMERDARK_SPECIES_POOL` (index 0), weight 1, id `flickerlings`. Creatures in rarity order, so
  the RNG maps one-for-one:

  | Rarity | Id | Name | Affinity | Script | Health / Atk / Int / Def / Spd |
  |---|---|---|---|---|---|
  | common | `flickerling-wick` | Flickerling Wick | vitality | `support` | 38 / 10 / 16 / 14 / 16 |
  | uncommon | `flickerling-flare` | Flickerling Flare | wit | `caster` | 25 / 14 / 22 / 10 / 22 |
  | rare | `flickerling-last-gleam` | Flickerling Last Gleam | violence | `striker` | 28 / 24 / 10 / 14 / 18 |

  `GLIMMERDARK_SPELLS` loses `OVERCHARGE` and renames `LUMINOUS_TIDE`. The affinity spread
  (Wit 4: Flare + 3 Resonants; Instinct 3: Blindclaws; Violence 5: Last Gleam, Leech, Stalker,
  Executioner, Ravager; Endurance 4: Gorger + 3 Shellbacks; Vitality 2: Wick, Voidmaw) follows from
  the table and is asserted by a test. The header comment's "Glowflies' Radiant" Vitality sprinkle
  is updated to the Wick.
- **`spells/glimmerdark.ts`**:
  - `BEACON_CHARGE`: effects stay `[heal 0.3 × Health, apply-status]` with the status changed to
    `{ statusId: 'grant-act-first' }` (no explicit duration: it inherits the status default, 3).
  - `OVERCHARGE`: deleted.
  - `LUMINOUS_TIDE` → `KINDRED_LIGHT` (`id: 'kindred-light'`, `name: 'Kindred Light'`), same AOE
    ally shape, effects reduced to the `heal` at spellPower 0.2.
- **`spells/index.ts`**: `OVERCHARGE` leaves the import and `ALL_SPELLS`; `KINDRED_LIGHT` takes
  `LUMINOUS_TIDE`'s entry **at its own position in the list** (it shifts down one because Overcharge
  above it is gone; its position relative to the neighbours is unchanged).
- **`statuses.ts`**: `GLOW` deleted from the definitions and `STATUS_REGISTRY`.
- **`traits/rotcap-hollow.ts`, `spells/rotcap-hollow.ts`, `species/rotcap-hollow.ts`**: comments
  that name Glowfly Radiant, Luminous Tide or Afterglow-by-analogy are reworded (no behaviour).

### Tests and goldens, in scope

The new and changed test files are listed in "Predicted changed set" and "Mechanism → test" below.

## Golden policy (restated from the kickoff)

**Deliberate, listed.**

- `golden-glowfly-detonator` is retired (its content is deleted). I cannot delete files: at the
  deletion step I stop and ask Duncan to delete `golden-glowfly-detonator.fixture.ts` and
  `.test.ts`.
- **Every other golden is byte-identical**, compared by importing the fixtures (the report shows the
  import-compare, not a diff read). A golden that changes anyway is a bug or a missed prediction:
  I stop and say so.
- Tests that read Glowflies, Glow, Overcharge or Luminous Tide change, each listed with its reason.
- The corpus digest is regenerated **once**, through `npm run corpus:update`, each changed fight
  attributed to one cause.
- The predicted changed set below is written **before the first run**.
- New goldens are hand-derived (setup, arithmetic and draws in the fixture comments), replay
  through `runGolden`, and are deep-frozen by construction. The big integration check (the digest)
  is labelled generated-then-checkpoint-verified. No run-then-pasted goldens.

## Predicted changed set (written before anything runs)

### Engine change alone (steps 1–2): nothing changes

With no trait carrying `on-damage-observed`, the new fan-out finds no candidate (no event, no RNG
draw), and the restructured `applyDamageAndEmit` keeps every existing step in its position. So after
the engine step, with the **old content**: every golden byte-identical, the digest **byte-identical**
(this is the "observer alone reproduces the committed digest" proof; see "Digest").

### Retired

| File | Why |
|---|---|
| `__golden__/golden-glowfly-detonator.fixture.ts` and `.test.ts` | Its content (the Glowfly Charger/Detonator traits, Glow) is deleted. **Duncan deletes.** |

### Tests that change (existing), each with its reason

| Test file | Change | Reason |
|---|---|---|
| `engine/status-containers.test.ts` | Borrowed `glow` import replaced by a local `StatusDef` of the same shape (id `fixture-damage-boost`, a dealt `damage-modifier` 0.08, buff, 4 turns); the status id in its events/derivations moves, nothing else | `GLOW` is deleted (A22) |
| `state/store-gems.test.ts` | The "unlock biome" block: the derivation comment and three expectations. Biome 2: 6 wit spells (Vine Snare, Pollen Cloud, Arcane Bolt, Beacon Charge, Kindred Light, Pacify), `0.7 × 6 = 4.2` → index 4 = **`kindred-light`** (was `overcharge`). Biome 3+: 7 (adds Spore Cyst before Pacify), `0.7 × 7 = 4.9` → index 4 = **`kindred-light`** (was `luminous-tide`). The pin-on-floor-11 and floor-150 cases follow the same two | Overcharge deleted; Luminous Tide renamed |
| `data/spells/index.test.ts` | The append-only pin: the first 24 ids lose `overcharge` and `luminous-tide` becomes `kindred-light`; the "first 27" slice becomes the first 26, then Silence, Pacify, then the G1 three | Overcharge deleted shifts later indices (deliberate), rename in place |
| `data/roles.test.ts` | Three ids: `flickerling-wick: support`, `flickerling-flare: caster`, `flickerling-last-gleam: striker` | Species swap |
| `data/species/glimmerdark.test.ts` | Cast-role id list (`flickerling-wick`, `flickerling-flare`, `blindclaws-setter`, the three Resonants, `gloomjaw-stalker`, in pool order); the stat-range test (Health 20–45 for the three Flickerlings, 10–30 for every other creature and stat); new affinity-spread assertion 4/3/5/4/2; new Flickerling shape assertions (ids, scripts, rarity order, Health 38/25/28) | Species swap, new Health scale |
| `engine/perform-action.test.ts` | Expected **unchanged**: its two `consume-stacks` fixtures use the literal string `'glow'`, which the test's own registry supplies. Verified at build; reported if wrong (A23) | n/a |

Other tests that count registries or the Glimmerdark spells (for example a statuses or traits
registry size) change only if the gates say so; each is then added to this table with its reason
before the digest step. None is predicted.

### Tests that are new

- `engine/damage-observation.test.ts` (mechanism tests): the filter matrix (relationship ×
  selfInflicted), the fail-closed rule, the Resonant never sees a damage event and a Flare never
  sees an action event, hook order (including a lethal cost and a Last Stand save), zero cost,
  `selfInflicted` is true only from the cost branch (a tick on a bearer whose source falls back to the
  bearer, a direct action on its own actor via a spell effect, a flat hit on another creature), a
  forgotten-option call (the hook fired without `observedDamage`) skips every candidate, and the
  validator rejects misplaced filter fields.
- `engine/injured-allies.test.ts`: the **one pool** test. A table over board states (self hurt only;
  one hurt other; hurt other dead; others full with a lower-current-HP full ally; nobody else alive;
  Voidmaw-style ceiling raise making a full-looking ally hurt) asserting
  `evaluateTriggerCondition(other-ally-injured) === (resolveLowestHpInjuredOtherAlly(...) !== null)`
  for every row and that the chosen id is the lowest current HP among the injured others, ties by the
  standard order. Plus a type test: `// @ts-expect-error` assigning `{ kind: 'other-ally-injured' }`
  to a `Rule['condition']` (checked by `npx tsc -b`), and a data test that no stock script contains
  the kind.
- Seven goldens (below).
- `data/traits/glimmerdark.test.ts` (or the existing trait data test, whichever already hosts
  per-trait shape checks): the three Flickerling traits' shape (hooks, filter, the Wick's two
  effects both gated and in burn-then-heal order, the burn on the cost path: self-target flat
  `StatPercent` with no `statusId`).

### New goldens (all through `runGolden`; fixture creatures via `makeParty`, fixture scripts
`always-wait`, the real Flickerling traits where the golden is about the real content)

All numbers below are the setup; each fixture carries the full hand derivation in its header comment
and `expectedEvents` is written by hand from it.

1. **`golden-h2b1-observed-cost`** (fixture traits). Ally pair plus an observer shaped like the Flare
   (`relationship: ally, selfInflicted: true`, a stat-modifier response) and a second, `relationship:
   enemy` observer on the other side. An ally's `on-turn-start` cost (flat, self) is observed by the
   ally observer, in the order `DamageDealt` → (taken) → `TriggerFired` observer → `StatModifierApplied`
   …, and **not** by the enemy-side `ally` observer (relationship) while the `enemy`-relationship one
   fires. The observer observing its **own** cost (ally includes self) is one row.
2. **`golden-h2b1-observed-silent`** (fixture traits; the same Flare-shaped observer; four things that
   must produce **no** `TriggerFired` from it, in one fight over three turns): an ordinary direct hit
   on an ally; a DoT tick on an ally (a mini-poison like `golden-h2a-cost`'s, bearer is both source
   and target); a direct spell effect landing on its own caster (the `golden-h2a-spell-on-caster`
   pattern: same ids, direct, not a cost); a **zero cost** (flat 1% of 30 Health floors to 0: the
   response's `TriggerFired` shows, nothing after it).
3. **`golden-h2b1-observed-lethal`** (real Wick, Flare, Last Gleam + a fixture ally). The Wick is
   wounded to 3 HP by `setup`; another ally is hurt so the gate passes. Burn = `floor(38 × 10 / 100)`
   = 3 = lethal. Expected: the burn's `DamageDealt` (remainingHp 0), then the **Flare's** reaction
   (speed ×1.15 to the three living allies; the dead Wick gets nothing), then `CreatureDied`, then the
   Last Gleam's `on-ally-death` (attack ×1.2 to the living allies), and **no** heal `TriggerFired`
   (the lethal burn skips the heal: `fireHook` re-checks `alive`).
4. **`golden-h2b1-wick-burn-heal`** (real Wick + Flare; allies A (Health 40, current 30, hurt) and B
   (Health 20, current 20, full: lower current HP than A)). Gate passes (A is hurt). Burn 3 (Wick 38 →
   35), Flare reacts, heal = `floor(38 × 20 / 100)` = 7 lands on **A** (30 → 37), not on B and not on
   the Wick. This is the "hurt filter" golden.
5. **`golden-h2b1-wick-skips-self`** (real Wick). The Wick is the most hurt (current 10 of 38); one
   other ally is lightly hurt (current 39 of 40). Gate passes on the other ally; heal goes to it, not
   to the lower-HP Wick. This is the "bearer exclusion" golden.
6. **`golden-h2b1-wick-gates`** (real Wick + Flare). Turn 1: the Wick is hurt, every **other** ally is
   at full Health → no burn, no heal, **no `TriggerFired` at all** from either Wick effect, no Flare
   reaction. The "no one else alive" case is a second fixture in the same file (the other ally starts
   dead, via `setup`): same silence. Both cases pin that neither effect leaves a stray
   `TriggerFired` and that the bearer is not counted.
7. **`golden-h2b1-last-gleam`** (real Last Gleam). An ally dies (a fixture enemy kills it); every
   living ally gains attack ×1.2, the Last Gleam included; the Last Gleam dying does not trigger
   itself (`on-ally-death` excludes the dead creature).

(A seventh-and-eighth idea, a Last Stand save of a lethal cost, is a mechanism test in
`damage-observation.test.ts`, not a golden; it needs a seeded chance and adds nothing to a replay.)

## Mechanism → the test that fails with it removed (every site)

| Mutation (the mechanism removed or broken) | Killed by | Site covered |
|---|---|---|
| Damage observation removed (no `fireHook('on-damage-observed')` in `applyDamageAndEmit`) | `golden-h2b1-observed-cost`, `golden-h2b1-wick-burn-heal`, `damage-observation.test.ts` "fires on an ally's cost" | resolver |
| `selfInflicted` filter dropped (observer ignores the flag) | `golden-h2b1-observed-silent` (ordinary hit and tick fire the Flare-shaped observer), filter-matrix test | filter |
| Self-inflicted read as `source === target` | `golden-h2b1-observed-silent` (the tick and the spell-on-caster have equal ids and must stay silent); `damage-observation.test.ts` "tick / redirect are not self-inflicted" | classification |
| The tick path passes `selfInflicted: true` | `golden-h2b1-observed-silent` tick row | tick site |
| A direct action on its own actor passes `true` | `golden-h2b1-observed-silent` spell-on-caster row | direct site |
| Relationship filter dropped (an enemy's cost is observed by an `ally` observer) | `golden-h2b1-observed-cost` (enemy-side cost row), filter-matrix test | filter |
| Resonants reached by a damage event (damage fired on `on-action-observed`, or the action hook fired for damage) | `damage-observation.test.ts` "a Resonant-shaped observer never fires on a damage event; a Flare-shaped one never on an action"; `golden-resonant-harmonize` and `-overtone` stay byte-identical as the regression pin | routing |
| Fail-closed removed (a damage-hook candidate fires when `observedDamage` is absent) | `damage-observation.test.ts` "a call without observedDamage fires nothing" | filter |
| Observation moved after the death block, or only when the victim survived | `golden-h2b1-observed-lethal` (the Flare's reaction must sit between `DamageDealt` and `CreatureDied`) | order |
| Zero cost reaches `applyDamageAndEmit` | `golden-h2b1-observed-silent` zero-cost row | cost site |
| The Wick's gate removed | `golden-h2b1-wick-gates` | trait data |
| The gate counts the bearer (a hurt Wick burns with everyone else full) | `golden-h2b1-wick-gates` turn 1; `injured-allies.test.ts` "self hurt only" row | pool |
| The bearer exclusion removed from the target (the Wick heals itself) | `golden-h2b1-wick-skips-self`; `injured-allies.test.ts` | pool / target |
| The hurt filter removed from the target (heals a full-Health ally) | `golden-h2b1-wick-burn-heal` (B has the lower current HP and is full); `injured-allies.test.ts` | pool / target |
| The heal's gate removed (a heal whose target is nobody still logs `TriggerFired`) | `golden-h2b1-wick-gates` (no stray `TriggerFired`) | trait data |
| Gate and target as two pieces of code that disagree | `injured-allies.test.ts` table (condition ⇔ target non-null) | pool |
| A lethal burn does not skip the heal | `golden-h2b1-observed-lethal` (no heal `TriggerFired`) | `fireHook` alive re-check |
| Last Gleam's `on-ally-death` trigger dropped / wrong hook | `golden-h2b1-last-gleam`, `golden-h2b1-observed-lethal` | trait data |
| `other-ally-injured` allowed in a script | `tsc -b` on the `@ts-expect-error` line; stock-script data test | type |
| Misplaced filter field allowed on the wrong hook | `damage-observation.test.ts` validator rows | validator |
| Beacon Charge still applies Glow / not Grant Act First | `data/spells/glimmerdark` spell shape test (extended), `corpus-coverage.test.ts` (every status still applied, no stale exemption) | spell data |
| Kindred Light keeps a status | `data/spells/index.test.ts` dedup-key test, spell shape test | spell data |
| Species swap not in place / rarity order wrong | `species/glimmerdark.test.ts` (pool index 0, rarity order), the digest (the swap rung) | species data |

## Digest

- **Rung 0, observer alone**: the engine change with the old content, regenerated in a scratch copy
  outside the repo, must reproduce the committed digest **byte for byte**. This is shown in the report
  before the content lands.
- **The ladder**: scratch switches (a scratch copy under the scratchpad directory, never in the repo),
  each rung adding one cause to the previous, in this order: (1) species swap (with the three
  Flickerling traits and the Flare/Last Gleam/Wick behaviour), (2) the spell-pool change
  (Overcharge's deletion, which shifts the later wit indices), (3) the Beacon Charge change, (4) the
  Kindred Light change. A changed fight is attributed to the **first rung at which its hash differs
  from the committed digest**; a fight that changes at a rung and again later is listed with both
  (an interaction), never silently merged.
- **Predictions before running** (the fights each cause can touch):
  - *Species swap*: every fight with a Glowfly on either side of Part A (generated Glimmerdark
    floors, and Part A's re-sided parties), Part B, and any Glimmerdark floor whose generation reaches
    the species (the swap keeps weights and rarity order, so the **draws are identical** and only the
    creature stats/traits differ).
  - *Spell-pool change*: only pools that held Overcharge: the Wit pool at biome 2 and deeper (Glimmerdark
    and Rotcap Hollow floors). The picked spell can differ for any wit loadout draw; if a distinctness
    retry changes the draw **count**, the generation RNG shifts for the rest of that floor, so the
    prediction is "every generated Biome 2+ floor with a wit-affinity creature", not just those
    holding the deleted spell.
  - *Beacon Charge*: fights where a creature holding Beacon Charge casts it (Glow events become Grant
    Act First events, and the turn order of the next round can change).
  - *Kindred Light*: fights where a creature holding it casts it (no status event, a plain team heal).
  - *Observer*: no fight changes by itself (rung 0).
- `corpus-coverage.test.ts` stays green: Beacon Charge's `grant-act-first` still counts as an applied
  status; `GLOW`, being deleted, cannot be stale-exempt; a Kindred Light cast still "lands" (a
  `HealApplied` event is emitted even for a 0 heal; confirmed against `castLanded` at build).
- **Flare observing a Wick cost**: after rung 4, I check whether any generated fight has a Flickerling
  Flare observing a Wick's cost (a scan of the events for a Flare `TriggerFired` with
  `hook: 'on-damage-observed'` right after a Wick-sourced self `DamageDealt`). If none, I append one
  Part C coverage fight (Wick + Flare + a hurt ally, pinned seed, at the **end** of Part C so no
  existing index moves; Part C is pinned by index in `corpus-coverage.test.ts`, which then also names
  the new index). The appended fight is attributed as "appended coverage fight" in the same single
  regeneration.
- Regenerated **once**, through `npm run corpus:update`.

## Build order (each step green before the next)

1. **Engine**: types, `injuredOtherAlliesOf`, resolver target, `evaluateTriggerCondition`,
   `applyDamageAndEmit` restructure and required parameter, `fireHook` branch, validators. Mechanism
   tests and goldens 1–2 with fixture traits only. Gates; every golden and the digest unchanged
   (rung 0).
2. **Content, additive**: the three Flickerling traits and the species swap in place; Beacon Charge and
   Kindred Light edits; Overcharge out of `ALL_SPELLS`. The Glowfly **traits and `GLOW` stay for now**
   (the retired golden still compiles). Goldens 3–7, trait data tests.
3. **Stop and ask Duncan** to delete `golden-glowfly-detonator.fixture.ts` and `.test.ts`. Then delete
   the Glowfly traits, `GLOW` and the registry entries, fix the changed tests, run all gates.
4. **Docs and comments**: fold the H2b1 items of `glimmerdark.md`'s "Phase 4.1 — decided changes"
   into its body (the Flickerlings section replacing the Glowflies, the statuses section losing Glow,
   the roles table, the spells table with Overcharge removed and Kindred Light, the intro paragraph's
   spell list, the "five Glimmerdark spells" count, the affinity spread) and delete them from the
   pending section; the single-instance and Health items stay pending. Grep `src` for Glow,
   Glowfly, Overcharge and Luminous Tide and fix every comment.
5. **Digest ladder and regeneration**, the grep shown in the report, the phase-record section
   (appended to `phase-4.1-fix-and-consolidation.md`, the 4.1 rule, since no
   `phases/4.1/brief.md` exists), `report-r1.md` in the mailbox.

## Proposed CONVENTIONS text (for the review to write; I do not edit CONVENTIONS in this slice)

- **Hook order**: "`on-damage-dealt` (source, unconditional) → `on-damage-taken` (self, survived only)
  → `on-damage-observed` (living observers, unconditional, even on a lethal hit) → if it died:
  `CreatureDied` → `on-death` → `on-kill` → `on-ally-death`/`on-enemy-death`."
- **Vocabulary**: 17 hooks; `on-damage-observed` is the damage mirror of `on-action-observed`, same
  `relationship` filter plus `selfInflicted`; context source = the damaged creature.
- **Trigger conditions**: `TriggerCondition = Condition | other-ally-injured`; the extra kind is not
  valid in a script rule and the type keeps it out.
- **Response targets**: `lowest-hp-injured-other-ally`; "injured" = `currentHp < effectiveMaxHp`.
- **Damage-observation classification**: self-inflicted is carried from the branch that chose the cost
  path, never inferred from the ids.

## Assumptions checklist

Marked inline above as **A<n>** where they first appear (the file-by-file section carries the
choice itself).

- [ ] **A1** The observer is a **sibling hook `on-damage-observed`** (the 17th), not a second event
  kind on `on-action-observed`. Why: the Resonants' routing can't be crossed by construction, and the
  hook name carries the context shape. CONVENTIONS allowed either.
- [ ] **A2** `ObservationFilter` is reused with a new `selfInflicted?: boolean`; each field is valid
  on one hook only, enforced by a load-time `validateObservationFilters`; absent fields stay
  permissive, as for `on-action-observed`.
- [ ] **A3** The damage hook **fails closed**: a candidate on `on-damage-observed` is skipped when
  `observedDamage` is absent (the kickoff's skipped-filter trap), and the validator also keeps
  `observationFilter` off every other hook.
- [ ] **A4** `relationship` compares the observer with the **damaged creature**; `ally` includes the
  observer itself; the hook's `source` is the damaged creature. A Flare therefore reacts to a cost on
  itself too (it has none today).
- [ ] **A5** Hook order: `dealt` → `taken` (if survived) → **`observed` (always, even lethal)** →
  `CreatureDied` → `on-death` → `on-kill` → `on-ally/enemy-death`. A lethal cost: the Flare's reaction
  precedes `CreatureDied`, the Last Gleam's follows it.
- [ ] **A6** Observers are creatures alive at that instant, so a creature killed by the damage does
  not observe it (and its death is observed by the usual death hooks).
- [ ] **A7** `applyDamageAndEmit` takes a **required** `selfInflicted: boolean`; only
  `applyCostDamage` passes `true` (the tick and direct paths pass `false`). It fires on every damage
  event, so ticks and retaliation are observable, just never self-inflicted.
- [ ] **A8** The gate is a **trigger-only** condition (`TriggerCondition`), not a `Condition`
  variant: not valid in a script rule, kept out by the type (a `@ts-expect-error` test) and a stock-
  script data test; there is **no runtime guard** because no authored scripts exist before Phase 6
  (spec question: Phase 6's editor/validator derives from `Condition` and must not list it).
- [ ] **A9** "Injured" = `currentHp < effectiveMaxHp(c)` for a living ally other than the bearer; one
  helper, `injuredOtherAlliesOf`, in `targeting.ts`, read by both the condition and the target.
- [ ] **A10** The heal target is a new `ResponseTarget` kind (`lowest-hp-injured-other-ally`), not a
  `TargetSelector`; ties go through `pickExtremum`'s standard order (player → slot → id); RNG-free.
- [ ] **A11** The Wick's effects are ordered burn then heal and **both** carry the condition; the heal's
  gate is evaluated after the burn. A lethal burn skips the heal through `fireHook`'s per-effect
  alive check; Last Stand can still save it and then the heal proceeds.
- [ ] **A12** The burn carries the default label `'dot'` with no `statusId` (precedent:
  `CATASTROPHIC_COLLAPSE`); nothing reads the label for the observer or the cost test (ASSUMPTION 131).
- [ ] **A13** The heal uses `amountPerStack: { ofStat: 'health', percent: 20 }` (exact integer maths,
  reads the Wick's own Health as the firer) rather than a float `spellPower: 0.2`.
- [ ] **A14** The Flare's response is `all-allies` speed ×1.15 including itself; two Flares both fire
  (no `stacks: false`), so the speed bonuses multiply.
- [ ] **A15** The Last Gleam's response is `all-allies` attack ×1.2 on `on-ally-death`, no chance,
  not firing for its own death; two Gleams multiply.
- [ ] **A16** Trait ids and names are placeholders: Wick `flickerling-wick-burn-bright` "Burn Bright",
  Flare `flickerling-flare-kindle` "Kindle", Last Gleam `flickerling-last-gleam-last-light`
  "Last Light".
- [ ] **A17** Species `flickerlings` (weight 1) takes the Glowflies' pool slot 0, creature ids as in
  the table, rarity order common/uncommon/rare, scripts support/caster/striker.
- [ ] **A18** The Flickerlings' Health is 38 / 25 / 28; their range test is 20–45, every other
  creature and stat stays 10–30 until H2c (whose remap must skip the Flickerlings).
- [ ] **A19** Beacon Charge keeps the heal first and applies `grant-act-first` with no explicit
  duration (the status's default, 3).
- [ ] **A20** Kindred Light is heal-only at spellPower 0.2, constant `KINDRED_LIGHT`, replacing
  Luminous Tide at its position relative to the neighbouring spells.
- [ ] **A21** Overcharge's deletion shifts later indices in `ALL_SPELLS` (deliberate, per the kickoff);
  `store-gems.test.ts` picks derive to `kindred-light` at biome 2 and 3+ (arithmetic in the changed-
  tests table, assuming the roll is `floor(draw × poolSize)` over the affinity-matched pool in registry
  order, as the existing comment states; verified at build).
- [ ] **A22** `status-containers.test.ts` borrows a local fixture status with id
  `fixture-damage-boost` in place of the real `glow`.
- [ ] **A23** `perform-action.test.ts` needs no change (its `'glow'` is a fixture-supplied literal).
- [ ] **A24** If no generated fight has the Flare observing a Wick cost, one Part C fight is appended
  at the end of Part C (existing indices untouched).
- [ ] **A25** Digest attribution is a cumulative ladder (observer alone, species swap, spell pool,
  Beacon Charge, Kindred Light); a fight is attributed to the first rung at which it differs.
- [ ] **A26** CONVENTIONS is written by the review; this slice proposes the text above and edits only
  the content docs named in the kickoff.
- [ ] **A27** No hook-type index (CONVENTIONS defers it): the fan-out scans every living creature on
  each damage event; measured by the corpus's wall time, reported.
- [ ] **A28** Any existing test that enumerates the `Hook` vocabulary gains `on-damage-observed`
  (found by the gates; added to the changed-tests table with its reason if hit).
- [ ] **A29** Stale mentions of the deleted content in docs other than `glimmerdark.md` (and the
  Wick rows already edited at kickoff) are reported as spec questions, not edited.
