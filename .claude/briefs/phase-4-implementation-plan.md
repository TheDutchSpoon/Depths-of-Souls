# Phase 4 — Party, Specializations, the Cave & Biomes: Implementation Plan

Status: planned

## Context

Phases 0–3 built and activated a pure, deterministic combat engine: the resolver, the
scripting interpreter, and the unified hook-based effect framework (13 hooks, 4 effect
categories, loop safety). Phase 3.5 proved it live with representative-but-temporary trait/
status/spell content. Phase 4 is where the game stops being "an engine with placeholder
fixtures" and becomes a system with **real content and a run layer around it**: the cave,
biomes, floor-by-floor descent, specializations/perks, creature XP/leveling, and — new for
this phase — the first `src/state/` Zustand store.

Per ROADMAP, Phase 4 carries **no separate design brief**; the spine is already locked across
four "design grill" passes, now merged into this branch's working tree:

- **GAME_DESIGN.md** §4 (cave/biomes/facilities), §5 (creatures/souls/gems), §6 (traits/
  statuses/equipment), §9 (specializations/perks), §10 (progression) — the *what*.
- **CONVENTIONS.md** "Generation & the run layer (Phase 4)" and "Phase 4 systems addenda" —
  the *how*, including a full **engine-vocabulary delta** surfaced while authoring seed
  content (new hooks, a response vocab expansion, new primitives, new statuses).
- **`.claude/species/species-locked.md`** — the actual Biome 1–3 species/creature roster,
  the Unicorn intro-helper, and the three seed bosses, at spec-level (mechanics locked,
  exact numbers parked).
- **`.claude/specializations/{sorcerer,brute,shieldbarer}.md`** — the three specs' full
  1000-point perk trees, each perk's exact effect, and which perks are Phase-4-functional
  vs. Phase-8-inert (equipment-gated).

**This is the largest phase in the project by a wide margin** — bigger than Phase 3, which was
already "bigger than 1 and 2 combined." It is not one activation of dormant seams; it is a
second, smaller wave of *genuinely new* engine primitives (surfaced by the content design,
not the original 13-hook spine), **plus** the run/state layer that Phase 3 deliberately left
unbuilt, **plus** ~60 pieces of real creature content and 3 full perk trees. This plan slices
it into **eleven sequential PRs** (lettered A–I, with the content slice split H1/H2/H3 per
biome), each merged to `main` on its own, following the same discipline Phase 3 used.

## Scope boundary

**In scope**: everything ROADMAP's Phase 4 bullet list names (6v6 party vs. a floor, floor
descent + persistent depth + fast-travel, biomes as data for the first 3 + placeholder
structure for the other 7, specializations as data, combat-XP leveling, data-driven enemy
generation via a floor→level-range curve) **plus** every engine-vocabulary item CONVENTIONS'
Phase-4 addenda pins as required to author that content for real (see the vocabulary table
below) **plus** the `src/state/` store Phase 4 needs to own navigation/collection/party.

**Out of scope** (explicitly deferred, do not pull forward):
- **No UI.** Phase 4 is engine + data + state, no `src/ui`/`src/app` screens. Visibility comes
  from a **Phase 4.5 demo** (separate brief, after this phase merges — same pattern as 1.5/
  2.5/3.5) and from tests. Slice G's store is exercised by store-level tests, not a UI.
- **No persistence.** `src/state/store.ts` is **in-memory Zustand only** — no `idb`/Dexie, no
  save/load, no migrations. That is Phase 5, wholesale. Do not add the `idb` dependency here.
- **No equipment/gem forge economy, no fusion, no catch-up leveling.** All Phase 8. Perks that
  are Phase-8-inert in the seed (Sorcerer's five Mastery-family perks + True Wit, Brute's
  Proficient half of Proficient Warrior, Shieldbarer's Shield Specialist) are still authored
  as **data** now (a spec's perk tree must sum to exactly 1000 and exist in full), just
  mechanically inert until Phase 8 — per each spec's own "Phase notes" section.
- **Biomes 4–10** stay the placeholder/config-driven shape they already imply (a biome *slot*
  in the 1–100 sequence with no species pool yet) — not authored.
- **Behavioral traits** (extra actions, turn-order-editing, scripting-option unlocks) — still
  deferred past v1 per the original Phase 3 scope; nothing in the locked Phase 4 content
  needs them (verified against species-locked.md and all three spec files).

## Architecture overview

### New/extended module map

```
src/engine/
  generation.ts       NEW   biomeForFloor, fightCount, the floor->level-range curve,
                             materializeCreature, enemy script/loadout rolling. Pure, seeded.
  leveling.ts          NEW   scaleStatsToLevel(base, level) (round(base*(1+0.25*(level-1)))),
                             XP curve (xpForNextLevel), pure.
  effect-types.ts      EXTEND  new Hook members; EffectResponse grows revive + grant-action-state;
                             deal-damage grows scalingStat; suppress-action grows scope;
                             new passive EffectDef categories: cross-stat, armor-penetration,
                             count-scaling, status-immunity; StatusDef grows a consume-stacks
                             response shape
  effects.ts           EXTEND  gatherArmorPenetration, gatherCrossStatContribution,
                             count-scaling readers (incl. defend-count), consume-stacks helper,
                             hasStatusImmunity, canonical order gains a perks slot
  resolution.ts        EXTEND  executeResponse grows revive/grant-action-state/scoped-suppress;
                             applyDamageAndEmit gains the cheat-death interception point;
                             fireHook gains the four on-[action] call sites, firing per action
                             instance (see the action instance-list builder, Slice B)
  damage.ts            EXTEND  formula gains armor-penetration (reduces effective Defence pre-core)
                             and cross-stat contribution (additive to effOffStat post-spellPower)
  targeting.ts         EXTEND  resolveOffensiveTarget generalizes into an ordered override
                             pipeline (Tunnel Vision exemption -> Confusion -> Provoke);
                             adjacency helpers (adjacentLivingTargets)
  turn-order.ts        EXTEND  turn-order status (act-first/act-last) read at queue build
  conditions.ts /
  scripting-types.ts   EXTEND  acted-before-target condition
  types.ts             EXTEND  Spell gains scalingStat? + ally/self targeting (Slice E);
                             Creature gains levelXp/level? -- see Slice G note on where
                             level actually lives (creature vs. instance)
  config.ts            EXTEND  new hook list entries, cheat-death/armor-pen constants homes

src/data/
  spells.ts, statuses.ts, traits.ts   EXTEND (ADD ONLY -- see guardrail below)
  species/
    overgrowth.ts       NEW  Slice H1 -- Biome 1 species+creatures+traits+spells+Broodmother
    glimmerdark.ts       NEW  Slice H2 -- Biome 2 + Leech Sovereign
    rotcap-hollow.ts     NEW  Slice H3 -- Biome 3 + Rot Sovereign
    starters.ts          NEW  Slice F -- the 3 starter creatures + the Unicorn
  biomes.ts             NEW  Slice A (shape) / H1-H3 (real entries) -- biome data + spawn pools
  specializations.ts    NEW  Slice F -- Sorcerer/Brute/Shieldbarer + PERK_REGISTRY per spec
  curves.ts             NEW  Slice A -- floor->level-range curve config, fightCount config

src/state/                    NEW DIRECTORY -- first use in the project
  store.ts             NEW  Slice G -- Zustand store: collection, active party, deepestFloor/
                             currentFloor, per-creature soul%, discovered biomes, atlas pins,
                             chosen spec + perk spend, currencies, run RNG stream, descend()
```

**Guardrail (verified against the current tree, load-bearing):** `src/data/traits.ts`'s
`STOCK_TRAITS`/`TRAIT_REGISTRY` and `src/data/statuses.ts`'s `STOCK_STATUSES`/
`STATUS_REGISTRY` are **imported directly by name** (`RETALIATE`, `VENGEFUL`, `REELING`,
`CATASTROPHIC_COLLAPSE`, `POISON`, `STUN`, …) by multiple Phase 1–3 golden fixtures and
`resolution.test.ts`. **Phase 4 adds new entries to these registries; it never renames or
removes an existing one.** The Phase 3 "representative & temporary" content is *temporary*
in the sense that nothing new is built to depend on it going forward — but it stays exactly
as-is, forever, as load-bearing golden-test fixtures, until a deliberate future golden
migration. Real per-species traits/statuses/spells (Slices H1–H3) get their own file(s) and
their own registry entries alongside, not replacements.

### Engine-vocabulary delta (master reference)

Every new piece of engine vocabulary CONVENTIONS' Phase-4 addenda calls for, which slice adds
it, and the one-line mechanism. Cross-reference this table, not the prose, when implementing.

| Addition | Kind | Slice | Mechanism |
|---|---|---|---|
| `on-attack`/`on-cast`/`on-defend`/`on-provoke` | Hook (+4, → 17) | B | Fires once **per action instance** (see the Action instance-list row below), right after that instance's intent event (`AttackDeclared`/`SpellCast`/`Defended`/`Provoked`), before that instance's damage/consequences. |
| Action instance-list (**locked with the design owner**, not an open assumption) | Resolver mechanism | B | Attack/Cast resolves as a **list of `{ powerPercent }` instances**, assembled once up front from the actor's count/power modifiers (base `[100%]`; "an additional time" appends `[100%]`; "again for 30%" appends `[30%]`), then the executor **runs the list** — each entry is a real instance, firing `on-attack`/`on-cast` (and everything downstream) per instance. Nothing is spawned mid-resolution ⇒ no trigger, no re-entrancy, no loop-guard. Distinct from a `deal-damage` response ("deals damage equal to 30%" fires nothing — it isn't an attack). For a single-target instance list, every instance after the first targets the **same resolved target as instance 1**, not a fresh selector re-run — except when that target has since died, which falls back to the normal default-target selection (Assumption 31). AOE instances have no single target to preserve; each re-hits its own freshly-frozen "all living enemies at that instance's cast-start" set. |
| `revive` | Response (+1, → 6) | B | Target must be dead. Sets `alive: true`, `currentHp = round(baselineMaxHp * pct)`, and **resets `activeEffects` to a fresh instantiation of `innateTraitIds`** (death-reset: no ramp preserved). No special turn-queue handling needed — see Assumption 7. |
| `grant-action-state` | Response (+1, → 7) | B | Sets `defending` and/or `provoking` `true` on target. Reuses the existing flags/math (Defend's ×1.5/×0.65, Provoke's redirect) verbatim. |
| `deal-damage.scalingStat` | Response field | B | Alternative to the existing `offStat?: RemapSlot`: an arbitrary `Stat` (e.g. Defence for Thorns/Shield Bash) feeds `effOff = getEffectiveStat(scalingStat) × spellPower` through the *same* downstream formula. Mutually exclusive with `offStat`/`flatAmount`. |
| `suppress-action.scope` | Response field | B | `'all' \| 'attack' \| 'cast'`, default `'all'` (byte-identical Stun behavior). Silenced = `'cast'`, Pacified = `'attack'`. Interpreter validity-check for the scoped action kind fails when suppressed; other actions remain choosable. |
| `Spell.scalingStat` | Data field | B | `Intelligence \| Health \| Attack \| Defence \| Speed \| none`, default Intelligence. `none` = flat (Int-independent) utility spell. Feeds Cast the same way `deal-damage.scalingStat` feeds a trait response. |
| Cross-stat contribution | New passive EffectDef category | B | `{ category: 'cross-stat', fromStat, percentPerRank, appliesTo: 'attack'\|'cast'\|'both' }`. Gathered and **added to `effOffStat` post-spellPower** (a flat bonus independent of the action's own scaling) before the subtractive core. |
| Armor penetration | New passive EffectDef category | B | `{ category: 'armor-penetration', percent }` (additive across sources, clamp `[0,1]`). Applied as `effDefForCore = effDef × (1 − Σpercent)`, inside `calculateDamage`, before the subtractive core. |
| Status-effect immunity | New passive EffectDef category | C | `{ category: 'status-immunity', statusId }`. Consulted at each status's own effect-execution site (its `on-round-end`/`on-turn-start`/friendly-fire-roll call), **not** at `applyStatus` — the status still applies, stacks, counts for `has-status`; only its *effect* is skipped for an immune bearer. |
| Turn-order status | New status mechanism | C | Timed status carrying `position: 'first' \| 'last'`. `buildTurnQueue` partitions living combatants into first-pole / normal / last-pole groups (each internally sorted by the existing Speed+tie-break rule), concatenates first→normal→last. Both poles on one creature: **first wins** (Assumption 9). |
| Acted-before-target condition | New `Condition` member | C | `{ kind: 'acted-before-target' }` — true iff, in the frozen round's turn queue, the acting creature's queue index is lower than its (selector-resolved) target's. Self-scoped like all triggered/scripting conditions; needs the target *pre-selected* to evaluate — see Assumption 11 on where in the pipeline this runs for scripting use. |
| Targeting-override pipeline | Targeting.ts restructure | C | Generalizes `resolveOffensiveTarget` into an ordered chain: **(1)** Tunnel Vision exemption (if attacker has it, skip straight to normal resolution, ignoring enemy Provoke) → **(2)** Confusion (if attacker is confused, 50% seeded roll to redirect the *entire already-chosen action* at its own side instead) → **(3)** Provoke (existing). See Assumption 12 for the Confusion/Provoke interaction order. |
| Adjacency + Splashing/Annihilate | Targeting helper + executor change | C | `adjacentLivingTargets(target, side)`: neighbors of `target`'s position **within the alive-filtered, slot-ordered list of its side** (not raw slot index — Assumption 14). Splashing: after a single-target Attack/Cast's main hit resolves, if the attacker carries the Splashing passive, **recompute the full damage formula** against each adjacent living enemy (not a copy of the main hit's number — Assumption 15) and apply as its own `DamageDealt`. Annihilate upgrades the target set from "adjacent" to "all other living enemies." |
| Count-scaling (incl. defend-count) | New passive/damage-modifier magnitude source | D | A modifier (`stat-modifier`, `damage-modifier`, or a `deal-damage` response's magnitude) may declare `magnitudeSource: { kind: 'count', of: 'living-allies' \| 'living-allies-of-affinity' \| 'living-allies-of-species' \| 'enemies-with-status' \| 'dead-allies' \| 'self-defend-count' }` instead of a flat number; recomputed at each read, never cached. |
| Consume-stacks response | Response (+1, → 8) | D | `{ kind: 'consume-stacks', statusId, effect: EffectResponse }`: reads the target's current stack count for `statusId`, removes the status entirely (0 stacks), then executes `effect` with the read count available as its magnitude source (`magnitudeSource: { kind: 'consumed-stacks' }`). |
| Cheat-death | New passive EffectDef category + resolver hook point | D | `{ category: 'cheat-death', chancePercent }`. Checked inside `applyDamageAndEmit`, at the instant HP would reach 0, **before** `CreatureDied`/`on-death` fire: one seeded RNG roll; on success, `currentHp = 1` instead of 0, no death events, resolution continues as if the hit landed for `finalDamage − 1`... — see Assumption 19 for the exact HP-left semantics. |
| Support-spell model | `Spell` extension | E | `Spell.targetSide?: 'enemy' \| 'ally'` (default `'enemy'`, preserving every existing spell byte-identical) and `Spell.payload?: 'damage' \| 'heal' \| 'stat-modifier'` (default `'damage'`). An ally-targeting heal/stat-modifier spell reuses the *existing* `heal`/`apply-stat-modifier` response execution paths, just invoked from Cast instead of a trigger. |

**Response vocabulary after Phase 4: eight top-level kinds** (`deal-damage`, `heal`,
`apply-status`, `apply-stat-modifier`, `suppress-action`, `revive`, `grant-action-state`,
`consume-stacks` — `consume-stacks`'s wrapped inner `effect` reuses one of the other seven, so
it's a wrapper, not a ninth kind). This is *not* "hold the line at six" from species-locked.md —
that count only covered the species-authoring pass; `grant-action-state` and
`consume-stacks` are systems-addenda additions surfaced afterward, in CONVENTIONS. Note this
delta explicitly in the phase record; it is not a contradiction, just two documents pinned at
different times.

## Slice sequencing rules (same discipline as Phase 3, restated for this scale)

- **Sequential branch-off.** Branch each slice off `main` *after* the previous merges. With
  eleven slices this matters even more than in Phase 3 — do not cut H2/H3 from pre-H1 `main`,
  or they'll carry stale biome-data shapes.
- **`main` stays green and deployable after every single merge.** Same four gates
  (`test`/`lint`/`format:check`/`build`) locally before every PR, matching CI.
- **Assertion rule — presence, never absence** (unchanged from Phase 3): no slice's golden may
  assert an event is *absent* if a later slice's content could add it to that same fixture.
  Keep new-mechanism goldens on **fixture parties/traits scoped to that slice**, never on the
  real Phase 4 roster until Slice I.
- **Additive/golden-safe hook expansion**: the four new `on-[action]` hooks fire at points the
  resolver already reaches (right after existing intent events); no existing trait/status
  listens to them yet, so Phase 1–3 goldens are untouched by Slice B's hook wiring itself —
  only new goldens exercise them.
- **Formula-touching slices need explicit before/after golden proof.** Slice B (armor-pen,
  cross-stat) and Slice D (cheat-death) touch `calculateDamage`/`applyDamageAndEmit` — the
  shared core every existing golden runs through. Each such slice's PR must show the full
  Phase 1–3 golden suite passing **unmodified** (these features are additive terms that default
  to zero/absent, so `Σpercent = 0` and no cheat-death effect ⇒ identical output), the same
  regression-proof discipline Phase 3 Slice B used for the hook-firing refactor.
- **No slice touches `TRAIT_REGISTRY`/`STATUS_REGISTRY`/`STOCK_SPELLS` destructively** (see the
  guardrail above) — always additive.

---

## Slice A — Run-layer generation (pure, seeded)

The `src/engine`-sibling generation module from CONVENTIONS, built and tested against small
**fixture** biome/species/creature data (not real content yet — Slice H1–H3 plug in later).
Zero dependency on the effect-framework additions (B–E) or the state layer (F/G), so it can
land first with no rework risk.

- **`leveling.ts`**: `scaleStatsToLevel(base: CreatureStats, level: number): CreatureStats` =
  `round(base × (1 + 0.25 × (level − 1)))` per stat (GAME_DESIGN §5, already fully specified —
  this slice just implements it; it was **not** needed before Phase 4 since no creature had a
  level). `xpForNextLevel(level)` — **ASSUMPTION 1**: XP curve shape is parked balance
  (GAME_DESIGN §13); land a simple monotonic placeholder (e.g. `100 * level`) behind this one
  function so retuning never touches call sites.
- **`curves.ts`**: `enemyLevelRange(floor): { min, max }` — **ASSUMPTION 2**: exact curve
  shape/width-growth is parked balance (§13's "master difficulty lever"); land a simple
  explicit formula (e.g. `min = floor, max = floor + 2 + floor(floor/10)`) clearly commented
  as a placeholder tuned in playtest, not a literal scattered through logic. `fightCount(floor):
  number` — **ASSUMPTION 3**: also parked; a flat placeholder (e.g. `3`) is fine, deterministic
  and not RNG-rolled per the spec.
- **`generation.ts`**:
  - `biomeForFloor(floor, atlasPins, runSeed): BiomeId` — floors 1–100 fixed sequence
    (`biomes[floor(1..100 as 1-indexed decade) ]`), floor 101+ a **derived seeded draw** (not
    the live combat RNG — a separate deterministic hash of `(runSeed, floor)`, since biome
    assignment must be stable across repeated visits to the same floor, unlike per-visit
    creature rolls), atlas pins override either. **ASSUMPTION 4**: the 101+ draw uses a
    dedicated `createSeededRng(hash(runSeed, floor))` per floor (re-derived, not advanced from
    a running stream) — this is what makes it stable per-floor without persisting a table of
    past draws.
  - `materializeCreature(speciesCreature, level, side, slot, statusesForSpells?): Creature` —
    pure, RNG-free (per CONVENTIONS: generation already spent the randomness upstream). Bakes
    `scaleStatsToLevel` into `baseStats`, copies affinity/`defaultScriptId`→`scriptId`/
    `equippedSpells`/`innateTraitIds`. `currentHp` is **not** set here (per CONVENTIONS —
    `createCombat` owns that, so materialized creatures pass through the exact same fight-start
    HP-init path as any other).
  - `generateFloor(floor, biomeData, runRng): { enemyParty: Creature[] }[]` (one entry per
    fight, `fightCount(floor)` of them) — for each fight, for each of up to 6 enemy slots: draw
    a species from the biome's spawn pool **by a per-species `weight` field on the biome data**
    (a data-driven primitive, not a hardcoded uniform draw — **ASSUMPTION 5**: every species
    entry in `biomes.ts` carries an explicit `weight`, defaulting to **equal** across a biome's
    species when the seed content doesn't intentionally skew it; Slice H1–H3 may leave weights
    equal or tune them per species — either is valid content, but the *field* must exist from
    this slice on), then a creature *within* the species by its declared rarity weights, draw a
    level from `enemyLevelRange(floor)`, call
    `materializeCreature`. A **cast-role** creature (`defaultScriptId === 'always-cast'`, or
    more generally "has a Cast rule") is rolled **≥1 affinity-matched spell** from the biome's
    spell pool — reuses `canEquip`-style affinity gating (CONVENTIONS).
- **Tests**: unit tests for each pure function against small fixture data
  (`__fixtures__/biomes.ts`-style, engine-internal, never real `src/data/` content); a
  determinism test (same seed → identical `generateFloor` output); a golden-style test that
  `biomeForFloor` never regresses the 1–100 fixed sequence once the real 3+7 biome list exists
  (placeholder-safe now, extended in H1).

## Slice B — Response vocab, on-action hooks & formula extensions

The single largest engine slice. Every row in the vocabulary table tagged `B`.

- **`effect-types.ts`**: `Hook` grows to 17 (`on-attack`, `on-cast`, `on-defend`, `on-provoke`
  added — no `on-wait`, per CONVENTIONS). `EffectResponse` grows `revive` and
  `grant-action-state`; `deal-damage` grows an optional `scalingStat?: Stat` (mutually
  exclusive with `offStat`/`flatAmount` — **ASSUMPTION 6**: if both are somehow set, throw a
  resolver-invariant error, mirroring how `applyStatus` treats an unknown `statusId`, rather
  than silently picking one); `suppress-action` grows `scope?: 'all' | 'attack' | 'cast'`. Two
  new passive `EffectDef` categories: `cross-stat` and `armor-penetration` (both
  permanent-for-fight like `stat-modifier`, both **additive across stacked sources** — never
  surfaced as a status, per the stat-modifier-adjacent treatment).
- **Action instance-list builder (locked with the design owner)** — supersedes an earlier draft
  of this plan that modeled "attack/cast again" as a re-run-the-executor loop. The locked model:
  an Attack or Cast resolves as a **list of `{ powerPercent }` instances**, built **once, up
  front**, from the acting creature's active count/power modifiers, *before* any instance
  resolves — base `[100%]`; "an additional time" (Flurry/Echo) appends another `[100%]`;
  "attack again for 30%" (the Brute starter) appends `[30%]`; both on one creature compose
  **linearly**: `[100%, 100%, 30%]` — three instances, full stop, never a re-multiplied entry.
  `resolveTurn`'s action-execution branch calls a new `buildAttackInstanceList(actor)`/
  `buildCastInstanceList(actor)` (gathers `magnitudeSource`-style count/power contributions the
  same way Slice D's counters will), then **runs the list**: each entry executes as a genuine,
  independent action instance — its own `AttackDeclared`/`SpellCast`, its own damage resolution
  at `baseSpellPower × powerPercent`, and (below) its own `on-attack`/`on-cast` firing. Nothing
  is spawned *mid-resolution* — the whole list is fixed before instance 1 even runs — so there
  is **no trigger, no re-entrancy, and no loop-guard involvement**: this is a pre-computed
  execution plan, not a cascade. This is also the precise line between "attack again for X%"
  (an instance in the list — fires `on-attack`, can itself proc Concussive Blows, the Unicorn's
  revive, etc.) and "deal damage equal to X% of Attack" (a plain `deal-damage` response — not an
  attack, fires nothing downstream): the source content's wording ("attack"/"cast" vs. "deal(s)
  damage") is the signal for which shape to author. **ASSUMPTION 31**: for a single-target
  instance list, every instance after the first targets the **same resolved target as instance
  1** — the selector is not re-run per instance — **except** when that target has died since,
  which falls back to the normal default-target selection (matching the Brute starter's own
  "strike the same target again... falls back to default target if it died" wording exactly).
  An AOE instance has no single target to preserve, so each AOE instance in a list independently
  re-freezes its own "all living enemies at that instance's cast-start" set.
- **`resolution.ts`**:
  - The four `on-[action]` hooks fire **once per action instance** (per the instance-list model
    above), immediately after that instance's own intent event
    (`AttackDeclared`/`SpellCast`/`Defended`/`Provoked` — Defend/Provoke are always
    single-instance lists in v1, no content grants extra Defends/Provokes) and before that
    instance's own damage/consequence resolution.
  - `executeResponse` grows `revive` (see vocabulary table; **ASSUMPTION 7**: `revive`'s
    target must resolve among the caller's `all-dead-allies`-shaped selector — this needs one
    new `ResponseTarget` variant, e.g. `{ kind: 'selector', selector: {...} }` reusing the
    existing selector-target escape hatch is **not** enough since v1 `TargetSelector`s are
    alive-only; add a minimal `{ kind: 'random-dead-ally' }` `ResponseTarget` for the Unicorn's
    specific "resurrects a *random* dead ally" wording) and `grant-action-state` (trivial:
    `updateCreature(target, { defending: true })`/`{ provoking: true }` per the response's
    requested flag(s)).
  - `suppress-action`'s scope: the interpreter's validity check (in `interpreter.ts`, not
    `resolution.ts`) consults the acting creature's active `suppress-action` effects **per
    action kind being validated** — a rule proposing Cast is invalid if a `scope: 'cast' | 'all'`
    suppression is active; a rule proposing Attack checks `'attack' | 'all'`; Defend/Provoke/
    Wait are never suppressible in v1 (no content needs it — **ASSUMPTION 8**, flag if this
    changes). This is a small, additive change to the existing "invalid action → skip rule"
    check, not a new mechanism.
- **`damage.ts`**: `calculateDamage` gains two optional inputs, `armorPenetrationPercent` (0 by
  default — reduces `defence` before the subtractive core: `effectiveDefence = defence × (1 −
  armorPenetrationPercent)`) and `crossStatBonus` (0 by default — added to `effOffStat` *after*
  the existing `× spellPower` step, per the vocabulary table's placement call). Both default to
  the *exact* current behavior when zero, so this is provably additive.
- **`effects.ts`**: `gatherArmorPenetration(attacker)` and `gatherCrossStatContribution(
  attacker, actionKind)` (sums `percentPerRank × getEffectiveStat(attacker, fromStat)` over
  matching `cross-stat` effects whose `appliesTo` includes `actionKind`), called from the same
  sites that already gather `dealtMods`/`takenFactors`.
- **`types.ts`**: `Spell` gains `scalingStat?: Stat | 'none'` (default: treat absent as
  `'intelligence'`, preserving every existing spell's behavior — Cast already reads
  Intelligence today).
- **Tests**: unit coverage per new response kind and per formula extension (armor-pen at 0%/
  50%/100%, cross-stat at 0 and nonzero, scoped suppression blocking exactly the scoped action
  and nothing else) and per instance-list composition (base-only, +extra-instance, +partial-
  power instance, both together confirmed **linear** — `[100%,100%,30%]`, never a re-multiplied
  entry); new goldens: `golden-on-action-hooks` (a fixture trait on each of the four
  new hooks, hand-derived), `golden-attack-instance-list` (a Flurry/Brute-starter-shaped fixture:
  a two-instance attack where the *second* instance's `on-attack` procs a fixture trigger,
  proving hooks fire per instance, not once per action), `golden-revive` (Unicorn-shaped: a dead
  ally comes back mid-fight at the death-reset baseline), `golden-armor-penetration`,
  `golden-cross-stat-contribution`,
  `golden-scoped-suppression` (a Silenced creature's Cast rule is skipped but its Attack rule
  still fires). Full Phase 1–3 suite re-verified byte-identical (see sequencing rules).

## Slice C — Targeting, turn-order & status-immunity primitives

- **`turn-order.ts`**: `buildTurnQueue` partitions the alive-filtered combatant list into three
  groups by active turn-order status (`'first'`/none/`'last'`), sorts each group internally by
  the existing Speed+tie-break comparator, concatenates `first ++ normal ++ last`. Web (act-last)
  and Blindclaws' grant-act-first are both just this one status with opposite `position` values
  — confirmed by species-locked.md as "same tool, opposite pole." **ASSUMPTION 9**: a creature
  carrying **both** an act-first and an act-last instance at once (e.g. two independently-applied
  turn-order statuses that never overwrite each other's `position`, or a single-slot conflict
  from re-application with a different `position`) resolves to **act-first** — first wins over
  last when both are simultaneously active. **ASSUMPTION 10**: Web's
  10%-per-turn break-free roll is modeled as a **status that shortens/removes itself** via an
  `on-turn-start` hook response (a new tiny "remove-status-on-success" shape, or simpler: model
  the roll as consuming the status's own duration early) — flagged for review since it's the one
  genuinely bespoke mechanism in this slice (a self-terminating status driven by a per-turn RNG
  check, distinct from the fixed-duration countdown every other status uses).
- **`conditions.ts` / `scripting-types.ts`**: `AlreadyActedCondition` — wait, named
  `acted-before-target` per the design doc — `{ kind: 'acted-before-target' }`. **ASSUMPTION 11**:
  scoped self-only (no explicit target parameter): evaluated **against the rule's own
  `targeting` selector**, resolved first (existence + selection, no RNG per the existing
  lookahead-purity rule), then the condition checks queue-index ordering between self and that
  resolved target. This makes the condition's evaluation order-dependent on its own rule's
  selector — a small, documented deviation from every other v1 condition (which are
  target-independent) — worth explicit sign-off since it's new interpreter plumbing, not just a
  new predicate.
- **`targeting.ts`**: restructure `resolveOffensiveTarget` into the three-step override
  pipeline from the vocabulary table. **ASSUMPTION 12 (Confusion/Provoke order)**: Confusion is
  checked *before* Provoke — a confused creature's 50% friendly-fire roll can redirect the
  action at its own side **regardless of whether the enemy side has a provoker**; only if
  Confusion's roll doesn't trigger does Provoke get a chance to apply (Confusion "consumes
  combat RNG" per species-locked.md, so its roll always happens for a confused creature's
  harmful action, win or lose). This is the resolution to species-locked.md's flagged
  "Confused + Provoked tiebreak" edge case — surfaced here for explicit review, not silently
  decided. **ASSUMPTION 13**: Confusion's AOE case ("flip whole AOE to allies?", also flagged
  as open in species-locked.md) resolves as: **the roll is per-action, not per-target** — one
  roll decides whether the *entire* AOE cast retargets to the caster's own living allies
  (frozen the same way enemy-AOE targeting freezes) or proceeds normally; not a per-target coin
  flip (which would produce a mixed friendly/enemy AOE hit, needlessly complex and not implied
  by the source text).
  - `adjacentLivingTargets(target, partyOfTarget)`: neighbors in the **alive-filtered, slot-
    ordered** list (**ASSUMPTION 14**, resolving species-locked.md's flagged slot-vs-living
    ambiguity in favor of living-adjacency — a dead slot-neighbor would make Splashing whiff
    for no player-visible reason, and living-adjacency degrades gracefully as a side thins out).
- **`resolution.ts` / executors**: Splashing consulted from `executeAttack`/
  `executeCastSingle` after the main hit resolves: for each adjacent (or, under Annihilate, each
  other living enemy) target, **recompute the full damage formula** against that target's own
  Defence/affinity (**ASSUMPTION 15** — "100% of their damage" reads as "the same formula
  reapplied," not a literal number-copy, since a number-copy would ignore each splash target's
  own stats and make Splashing trivially over/under-tuned depending on the lineup) and emit its
  own `DamageDealt` (`damageSource` matches the main hit's `'attack'`/`'cast'`). No
  `TriggerFired` for splash hits (it's the same action, not a triggered response).
- **`effects.ts`**: `hasStatusImmunity(creature, statusId)` — scans active `status-immunity`
  effects. Called from each status's own effect-execution site (Silenced/Pacified's
  `suppress-action` check in the interpreter validity path; Confusion's friendly-fire roll in
  the targeting pipeline) — **not** from `applyStatus`, per the "immunity suppresses effect, not
  application" principle (the status still shows, still stacks, still satisfies `has-status`).
- **Tests**: turn-order status golden (an act-first and an act-last creature reorder around a
  Speed-sorted middle); acted-before-target unit + golden; targeting-override goldens
  (Confusion-redirects, Confusion-vs-Provoke, Tunnel-Vision-ignores-Provoke); adjacency +
  Splashing + Annihilate goldens (3+ enemy lineup, confirm per-target recompute not copy);
  status-immunity golden (a Clear-Mind creature stays Silenced-tagged for `has-status` but casts
  freely).

## Slice D — Resource & counter primitives

- **`effect-types.ts` / `effects.ts`**: a `magnitudeSource` union usable wherever a
  `stat-modifier`/`damage-modifier`/`deal-damage` currently takes a flat `factor`/`flatAmount`:
  `{ kind: 'flat', value }` (the existing implicit behavior, made explicit) | `{ kind: 'count',
  of: 'living-allies' | 'living-allies-of-affinity' | 'living-allies-of-species' |
  'enemies-with-status' | 'dead-allies' | 'self-defend-count' }`. **ASSUMPTION 16**: adding this
  union is a **breaking shape change** to every existing flat-magnitude call site (`factor`,
  `flatAmount`, `amountPerStack`, `magnitude`) — resolved by keeping those fields as plain
  numbers for the common case and adding `magnitudeSource` as a **separate, optional** field
  that, when present, *overrides* the flat number (computed at read-time instead) — so every
  Phase 1–3 trait/status definition is untouched (no migration, no golden churn) and only new
  count-scaling content sets the new field.
  - `self-defend-count` needs a **new per-creature counter**, not derivable from existing state.
    **ASSUMPTION 17**: add `Creature.defendCount: number` (increment in `executeDefend`,
    reset... never — it's cumulative for the whole fight, matching Bulwark's "each time the
    creature has Defended this battle"). A small, explicit `Creature` field addition (like
    `innateTraitIds`/`activeEffects` were in Phase 3), not folded into `activeEffects`.
- **Consume-stacks response**: `{ kind: 'consume-stacks', statusId, effect: EffectResponse }` —
  reads the firing creature's current stack count for `statusId` (0 if absent — the response is
  then a no-op, since `applyStatus`'s cap-driven model means "no status present" and "0 stacks"
  are the same state), removes the status via the same path `StatusExpired` uses (**ASSUMPTION
  18**: emits `StatusExpired` for the consumed status, since it's genuinely gone, not merely
  decremented — matches player expectations that the Glow icon disappears), then executes
  `effect` with a `{ kind: 'consumed-stacks' }` `magnitudeSource` available to it (Glowflies'
  Detonator: `consume-stacks(Glow) → deal-damage(scalingStat: intelligence,
  magnitudeSource: consumed-stacks)`).
- **Cheat-death**: `{ category: 'cheat-death', chancePercent }` passive, checked inside
  `applyDamageAndEmit` at the moment post-clamp HP would be `≤ 0`. **ASSUMPTION 19** (HP-left
  semantics): on a successful roll, `currentHp` is set to **1** (not `finalDamage − 1` or any
  other derived value) — "left at 1 HP" per Last Stand's own wording — and the `DamageDealt`
  event's `remainingHp` reflects **1**, not 0 (so the log never claims the creature both died
  and is still reporting HP). No death events fire; resolution continues exactly as a
  non-lethal hit would (the attacker's `on-damage-dealt` still fires normally — it dealt
  damage, full stop; the defender's `on-damage-taken` fires since it survived). Consumes one
  seeded RNG draw, only when the hit would otherwise be lethal (never rolled on a non-lethal
  hit — keeps replay-seed consumption minimal and matches "50% chance to be left at 1 HP" as
  describing the lethal-hit case only).
- **Tests**: count-scaling unit tests per `of` variant (recomputes live, not cached — kill an
  ally mid-fight and confirm the reading changes on the *next* read, same fight); defend-count
  golden (Bulwark-shaped: mitigation improves round-over-round as the bearer keeps defending);
  consume-stacks golden (Glow stacks → Detonator burst scaled to the consumed count →
  `StatusExpired`); cheat-death golden (a would-be-lethal hit at a rigged seed lands the
  creature at 1 HP with no `CreatureDied`; a second rigged seed shows the normal death path
  unaffected when cheat-death doesn't proc).

## Slice E — Support-spell model

- **`types.ts`**: `Spell` gains `targetSide?: 'enemy' | 'ally'` (default `'enemy'`) and
  `payload?: 'damage' | 'heal' | 'stat-modifier'` (default `'damage'`). Every existing spell
  (`EMBER_LANCE`, `CINDER_NOVA`, `VENOM_BOLT`) is unaffected (both fields absent → identical
  behavior).
- **Cast execution**: `executeCastSingle`/`executeCastAoe` branch on `targetSide`/`payload`
  before resolving targets — an `ally`-targeting spell's selector pool is `livingAlliesOf`
  instead of `livingEnemiesOf` (its AOE variant is "all living allies," mirroring the existing
  "all living enemies" freeze-at-cast-start rule), and Provoke's targeting override **does not
  apply** (Provoke only narrows enemy-targeting actions, already stated in GAME_DESIGN §7 —
  this slice is the first thing that actually exercises the "ally-targeting actions are exempt"
  clause). A `heal`-payload spell invokes the existing `heal` response-execution path directly
  (not through a trigger — Cast *is* the trigger context here, no `TriggerFired` since it's a
  chosen action, not a reaction); a `stat-modifier`-payload spell likewise reuses
  `apply-stat-modifier`'s execution and emits the same `StatModifierApplied` event a triggered
  stat-modifier would.
- **Data**: at least one demo/fixture spell per new shape (ally-single heal, ally-AOE buff) for
  this slice's own tests; the real per-affinity ~50-spell seed set (GAME_DESIGN §5's "~10 per
  affinity") is authored in Slices H1–H3 alongside the creatures that use them, **not** here —
  this slice only builds and proves the mechanism.
- **Tests**: unit (ally-single/ally-AOE target resolution, Provoke exemption confirmed); goldens
  for a heal-payload single-target Cast and a stat-modifier-payload AOE Cast.

## Slice F — Specializations, perks, starters & the Unicorn

- **`data/specializations.ts`**: `Specialization { id, name, starterCreatureId, perks:
  PerkDef[] }`; `PerkDef { id, name, maxLevel, costPerLevel, effects: EffectDef[] | ((level:
  number) => EffectDef[]) }` — **ASSUMPTION 20**: leveled perks (e.g. Might: 50 levels, +1%
  Attack/level) need their effect's magnitude to scale with the *purchased* level, not a fixed
  definition — model `effects` as a function of the spent level for leveled perks (`(level) =>
  [{ category: 'stat-modifier', stat: 'attack', factor: 1 + 0.01 * level }]`), a plain number
  array for single-purchase perks. A **load-time validator** asserts, per spec, `Σ(maxLevel ×
  costPerLevel) === 1000` (CONVENTIONS' stated invariant) — throws at module load, not a
  runtime-reachable error, so a data-authoring mistake fails fast in tests.
- **Perk execution model** — **ASSUMPTION 21 (the load-bearing new-plumbing decision this
  slice makes)**: perks are **player-level**, not creature-level, effects. `createCombat` gains
  a new parameter, `partyWidePlayerEffects?: readonly EffectDef[]`, instantiated onto **every
  player-side creature** at fight-assembly (same instantiation helper Slice-3's innate traits
  use, called once per creature with the same list). The **canonical per-creature effect order**
  (CONVENTIONS, currently innate-1 → innate-2 → infusions → statuses) gains a slot:
  **innate-1 → innate-2 → perks → infusions (Phase 8) → statuses.** This is a documented change
  to a pinned ordering rule — flagged for explicit sign-off, not silently inserted. Perks are
  computed by the caller (the Slice G store, from `{ chosenSpec, perkSpend: Map<perkId,
  level> }`) and passed in; `createCombat` itself stays pure/engine-only (a plain array in,
  same as `traits`/`statuses` registries already are).
- **Response reuse check (grounding, not new work)**: every Phase-4-functional perk in all
  three trees maps onto vocabulary already built by Slices B–E — confirmed against each spec
  file's own "New mechanics this spec introduces" section. In particular, **Echo/Flurry
  ("Attack/Cast an additional time") are pure data on top of Slice B's action instance-list
  builder** — a perk that grants "an additional time" simply appends another `[100%]` entry to
  the actor's instance list; it needs **no new resolver logic here** (Slice B already built the
  mechanism this whole perk family runs on — this replaces an earlier draft of this plan that
  modeled it as a bespoke execute-again loop in Slice F, now superseded by the locked instance-
  list decision).
- **`data/species/starters.ts`**: the three starter creatures (Wit Sorcerer starter with its
  extra-gem + 50%-on-turn-end-random-cast trait, high-Attack Brute starter with its
  on-attack-strike-again trait — itself just a `[100%, 30%]` instance-list entry, confirming the
  instance-list model reads naturally as "seed" content and not merely a systems abstraction —
  high-Defence Shieldbarer starter with its
  on-provoke→team+35%-Defence trait via `grant-action-state`... **ASSUMPTION 22**: "team gains
  +35% Defence" is a **`stat-modifier`**, not `grant-action-state` (it's a stat buff, not an
  action-state flag) — targeted at `all-allies` (a `ResponseTarget` variant already implied but
  not yet enumerated; add `{ kind: 'all-allies' }` alongside the existing `all-enemies`) —
  and the Unicorn (`revive`-on-attack-hit trait via the new `on-attack` hook + `revive` response
  at `{ kind: 'random-dead-ally' }`, firing **per attack instance** so a multi-instance attack
  revives multiple times — confirmed safe against loop-safety since `revive` deals no damage, so
  it cannot itself re-trigger a damage-path hook, and safe against the instance-list model since
  the list is fixed before any instance runs, so a revive mid-list cannot grow the list further).
- **Scripted-intro encounter**: **ASSUMPTION 23**: this is **not** a new engine mechanism — it's
  a fixed, hardcoded 1-enemy fight (the Unicorn) resolved through the *existing* resolver with a
  special outcome handler at the **run layer** (Slice G's store), not a new `FightResult`
  variant or engine branch: regardless of `win`/`loss`/`draw`, the store's post-intro handler
  adds the Unicorn to the party. The engine has zero awareness this fight is special.
- **Tests**: a loader test per spec asserting the 1000-point invariant and that every perk's
  `Phase` tag from its source `.md` is representable (Phase-8-inert perks still produce valid
  effect lists — Assumption 24: an equipment-gated perk with nothing to key off yet is
  authored as a **real but currently-always-zero-effect** definition, e.g. Arcane Shields keys
  off "equipped gems not of the creature's affinity" — with no gem-equip system yet, this reads
  as 0 always, which is correct dormant behavior, not a stub to special-case); goldens for each
  starter's signature trait (the Brute starter's `[100%, 30%]` two-instance attack is a direct,
  content-level exercise of Slice B's `golden-attack-instance-list` mechanism, not a new one); a
  scripted-intro-encounter test at the store level (Slice G dependency — may land as part of G
  instead if sequencing makes more sense once implementation starts; noted here since the
  *content* is authored in F).

## Slice G — State layer (`src/state/`, first use in the project)

- **`store.ts`** (Zustand, **in-memory only** — no persistence middleware): per CONVENTIONS'
  "Generation & the run layer," owns **navigation + ownership only**:
  - `deepestFloor`, `currentFloor`, `discoveredBiomes: Set<BiomeId>`, `atlasPins: Map<floor,
    BiomeId>`.
  - `collection: Map<CreatureId, Instance[]>` and `activeParty: (InstanceId | null)[6]` —
    **ASSUMPTION 25**: an `Instance` gets its own branded `InstanceId` (distinct from the
    static `creatureId` it references and from the engine's `CreatureId`, which is a
    **per-fight** identity) — needed because the collection holds *owned copies*, and
    duplicates of the same creature are explicitly allowed (GAME_DESIGN §5).
  - `soulProgress: Map<CreatureId, number>` (0–100, per static creature, not per instance).
  - `chosenSpec: SpecId`, `perkSpend: Map<perkId, level>`, `bossesCleared: Set<BossId>`
    (perk points = `bossesCleared.size × 100`, derived, never stored).
  - `currencies: { essence, ore, bricks, lifeforce }` — **ASSUMPTION 26**: tracked now (floors
    will drop them per §4) even though nothing spends them until Phase 8; unbounded numbers,
    no cap logic needed.
  - `runRng: SeededRng` **state** — CONVENTIONS: "the persistent run RNG stream." A store
    holding a live mutable RNG object is the one deliberate exception to "the store is
    plain data" — **ASSUMPTION 27**: store the RNG's *seed* + an *advance counter*, not the
    object itself, so the store stays a plain serializable-shaped record ready for Phase 5's
    save format; re-derive a fresh `SeededRng` from `(seed, counter)` whenever a draw is
    needed, mirroring `biomeForFloor`'s per-floor re-derivation in Slice A rather than
    threading a stateful object through Zustand.
  - **`descend(floor: number): FloorOutcome`** — the integration action: calls
    `generateFloor` (Slice A) with the active party's materialized `Creature[]` + the floor's
    generated enemy fights, runs `resolveFight` (existing engine) per fight in sequence,
    consumes each fight's event log for **rewards banked per kill** (`CreatureDied` joined
    against the generated roster → soul% + XP + currency, per CONVENTIONS — **never** engine
    state), applies **post-fight** level-ups via `scaleStatsToLevel` (engine never sees a
    mid-fight level change, per the pinned rule), advances `deepestFloor` on a floor clear, and
    returns a `FloorOutcome` summary. A wipe (loss/draw on any fight) stops the descent at that
    fight, keeps every already-banked reward, and does not advance `deepestFloor`.
  - **Spec swap**: `setSpec(specId)` — refunds all spent points (perk points are `derived`, so
    "refund" just means clearing `perkSpend`; the *budget* — `bossesCleared.size × 100` — is
    unaffected by which spec is active), assigns the new spec's starter creature to the
    collection if the player doesn't already own an instance of it (**ASSUMPTION 28**: swapping
    specs does **not** remove a previously-owned starter from the collection or party — only
    the *active* spec's perk tree stops applying; this matches "no prestige, no resets").
- **Tests**: `descend()` integration test using **Slice A's fixture biome data** (not real
  content — Slice I re-runs the equivalent against real Biome 1 once H1 lands), covering: a
  win banks rewards and advances depth; a loss stops the descent but keeps prior fights'
  rewards; fast-travel bounds-checks against `deepestFloor`; the scripted-intro encounter
  (if not already covered in F) adds the Unicorn regardless of outcome; a spec swap clears
  spend without losing the collection.

## Slices H1 / H2 / H3 — Seed content (one PR per biome)

Each slice authors one biome's full roster against `species-locked.md`'s table for that biome,
plus its boss, as **real `src/data/` content** (never `__fixtures__`) — checked against every
primitive built in B–E. Each is independently sized (≥6 species × ≥3 creatures ≈ 18+
creatures, that biome's new statuses, ~10 affinity-matched spells contributed toward the
~50-spell total spread across the three biomes, and its boss).

**Common per-biome checklist** (apply to H1, H2, H3 alike):
1. Author each species' roles per its locked "closed mechanic," reusing exactly the primitive
   the design doc names (no new engine work should be needed here — if a species turns out to
   need something not already built in A–E, **stop and amend the relevant earlier slice**,
   don't improvise a one-off in data).
2. Author that biome's "New this biome" statuses as data instances of the built primitives.
3. Author ≥6 species × ≥3 creatures, **affinity-complete** per biome (per the "Coverage" note
   in species-locked.md — some biomes need affinities sprinkled at creature-stamping time to
   fill a lean gap the species table alone doesn't cover; e.g. Glimmerdark needs Vitality added
   at the creature level since no *species* leans Vitality there).
4. Author the biome's boss as an elevated `Instance` + signature trait(s) + its adds drawn from
   the biome's own spawn pool, via the fixed-authored-encounter path (same mechanism as the
   Unicorn's scripted intro — a hardcoded fight, not a spawn-pool draw).
5. Wire the biome into `data/biomes.ts`'s real spawn-pool entry (replacing that slot's Slice-A
   placeholder).
6. A loader/shape test per biome (every creature has a valid affinity/species/rarity/trait
   reference; every trait/spell/status referenced actually exists in a registry) and at least
   one hand-derived golden per biome exercising its signature mechanic end-to-end (e.g. an
   Overgrowth golden proving Spiders' Web→"+damage to Webbed" combo fires correctly).

- **H1 — The Overgrowth** (floors 1–30... wait, floor 1–10 per its own biome-decade; see
  Assumption 29): Spiders, Swarmhive, Treants, Pollinators, Snapjaws, Lullpollen; **Web**,
  **Sleep**, **count-scaling** (first roster use, engine already proven in D); boss:
  **Broodmother**.
- **H2 — Glimmerdark**: Glowflies, Blindclaws, Resonants, Sparkeaters, Gloomjaws, Shellbacks;
  **Glow** + consume-stacks (engine already proven in D), **turn-order status** (first roster
  use, proven in C), acted-before-target (first roster use, proven in C); boss: **Leech
  Sovereign**.
- **H3 — Rotcap Hollow**: Sporecloud, Rotfeeders, Myconet, Necromoss, Hollowkin, Sporch;
  **Spore** (DoT + spread-on-death — **ASSUMPTION 30**: spread-on-death is a trait-authored
  `on-death` response targeting a selector that excludes already-Spored living enemies,
  fizzling silently if none qualify, per "loop-guarded: fizzles if none" — no new engine
  primitive, just a selector composition), **Confusion** (engine already proven in C); boss:
  **Rot Sovereign**.

**ASSUMPTION 29**: "floors 1–30" in ROADMAP/GAME_DESIGN's own phrasing means biome 1 = floors
1–10, biome 2 = 11–20, biome 3 = 21–30 (the standard 10-floor cadence applied to the first
three slots) — stated explicitly since GAME_DESIGN's "(floors 1–30)" aside could be misread as
each biome spanning all 30.

## Slice I — Integration pass

No new mechanism. Proves the whole phase works together against **real** content:

- Wire `data/biomes.ts`'s real 3-biome spawn pools into `generation.ts` in place of Slice A's
  fixtures (biomes 4–10 stay Slice-A-style placeholders — empty/minimal spawn pools, valid
  shape, `discoveredBiomes` never reaches them in v1 play since floor 31+ isn't authored, but
  the type-level structure exists for all 10 per the "systems spine is 10-calibrated" mandate).
- An end-to-end integration test (labeled per CONVENTIONS' two-tier golden discipline as
  **generated-then-checkpoint-verified**, not hand-derived — this is the large-integration
  case that discipline exists for): create a Sorcerer/Brute/Shieldbarer starter party via the
  store, run the scripted intro, `descend()` through floor 1's real Overgrowth fights, and
  checkpoint-verify the load-bearing facts (result, floor advanced, soul% banked, at least one
  species-signature mechanic visibly fired in at least one fight's event log) rather than a
  full hand-traced log.
- Full regression: every golden from Phases 1–3 plus every new one from B–H3, `lint`,
  `format:check`, `build`.
- Write the phase record (`.claude/phases/phase-4-party-specializations-cave-biomes.md`)
  documenting what actually shipped per slice, matching the Phase 3 record's precision
  standard (exact files, exact test counts).

---

## Out of scope (per ROADMAP, restated)

- **Phase 4.5 demo** — separate brief/PR after this phase merges, same pattern as 1.5/2.5/3.5.
  Baseline demo-UX (randomize-seed, timed playback) carries forward automatically per
  CONVENTIONS.
- **Persistence** (Phase 5) — no IndexedDB, no save/load, no migrations; the Slice G store is
  memory-only and its shape is a *forward reference* for Phase 5, not a commitment that ships
  unchanged (flag any Phase-5 reshaping as that phase's own concern).
- **Equipment/gem forge economy, fusion, catch-up leveling** (Phase 8) — perk data that's
  inert until then stays inert; no forge/infusion/augment mechanism is built.
- **Scripting UI, combat UI** (Phase 6/7) — Phase 4 has no screens.
- **Biomes 4–10 content** — placeholder shape only.
- **Behavioral traits** — still deferred past v1; confirmed nothing in this phase's locked
  content needs them.

## Verification

- `npm run test`, `npm run lint`, `npm run format:check`, `npm run build` — green after
  **every** slice, not just at the end (eleven checkpoints, not one).
- **Regression proof for every formula-touching slice** (B, D): the full pre-slice golden
  suite passes byte-identical, proving the new terms default to a no-op.
- **Golden discipline**: focused goldens per new mechanism are hand-derived; H1–H3's per-biome
  signature goldens are hand-derived per mechanic; Slice I's full-loop test is the one
  explicitly-labeled generated-then-checkpoint-verified integration case.
- **Loop-safety re-check**: `revive` (no damage → cannot cascade), Splashing's recomputed hits
  (each is an independent `applyDamageAndEmit` call, same cascade guard applies per-target,
  no new risk), and consume-stacks (removes state, cannot re-trigger itself) are each confirmed
  not to open a new infinite-loop shape before merging Slices B–D.
- Post-implementation: `/verify` a full `descend()` run through real Biome-1 content and read
  the event log end-to-end for legibility (no UI yet, so this is a console/test-level check).

## Assumptions checklist (review before implementation)

Numbered in document order (1–30); every inline `**ASSUMPTION N**` citation above matches its
number here exactly — no split labels (a prior draft's `6a`/`6b` are now plain `6`/`7`), no
gaps, no collisions. **#31 is a single later addition**, appended after the pass that fixed
1–30 rather than triggering a second full renumber; it's cross-referenced from the vocabulary
table's instance-list row and belongs conceptually beside #6–8 in Slice B. One assumption from
the prior draft (an "execute-the-action-again loop" for Flurry/Echo) is **removed outright**,
not renumbered — it's superseded by the locked action
instance-list decision (see Slice B), which is a settled decision, not an open assumption.

1. XP curve is a placeholder monotonic function behind `xpForNextLevel` (parked balance, §13).
2. Floor→level-range curve is a placeholder explicit formula behind `enemyLevelRange` (parked
   balance, §13's master lever).
3. `fightCount(floor)` is a flat placeholder (parked balance), deterministic, not rolled.
4. Floor 101+ biome draw re-derives a fresh seeded RNG per `(runSeed, floor)` rather than
   advancing a stream — makes it stable per-floor without persisting past draws.
5. Enemy species-within-biome draw is **weighted**, via an explicit per-species `weight` field
   on the biome data (defaulting to equal across a biome's species) — a data-driven primitive,
   never a hardcoded uniform draw; creature-within-species uses the declared rarity weights.
6. `deal-damage`'s `scalingStat` and `offStat`/`flatAmount` are mutually exclusive; setting
   both is a resolver-invariant error.
7. `revive` needs a new `{ kind: 'random-dead-ally' }` `ResponseTarget` (existing selectors are
   alive-only).
8. Suppress-action scoping only ever gates Attack/Cast in v1 content — Defend/Provoke/Wait are
   never suppressible (revisit if future content needs it).
9. A creature with both act-first and act-last active at once resolves to act-first (first
   wins over last).
10. Web's break-free roll is a self-shortening status (mechanism TBD at implementation — flagged
    as the one bespoke piece in Slice C, needs its own small design pass, not a reuse).
11. `acted-before-target` resolves its own rule's target selector first (existence+selection,
    no RNG), then checks queue-index order against it — order-dependent on its own selector, a
    documented deviation from every other v1 condition.
12. Confusion is checked **before** Provoke in the targeting-override pipeline; its roll always
    happens for a confused creature's harmful action regardless of enemy-side provoke state.
13. Confusion's AOE case retargets the **whole action** with one roll (not a per-target coin
    flip).
14. Adjacency is computed over the **alive-filtered, slot-ordered** list of a side, not raw
    slot index (degrades gracefully as a side thins).
15. Splashing **recomputes** the full damage formula per adjacent target (own Defence/affinity
    apply) rather than copying the main hit's number.
16. `magnitudeSource` is an additive optional field alongside every existing flat
    `factor`/`flatAmount`/`amountPerStack`/`magnitude` — zero migration of Phase 1–3 content.
17. `Creature.defendCount: number` is a new dedicated field (cumulative all fight, never reset),
    not folded into `activeEffects`.
18. `consume-stacks` emits `StatusExpired` for the consumed status (it's genuinely gone).
19. Cheat-death sets `currentHp = 1` exactly (not a derived value) and only rolls when the hit
    would otherwise be lethal.
20. Leveled perks' effects are a function of purchased level, not a fixed definition; a
    load-time validator enforces `Σ(maxLevel × costPerLevel) === 1000` per spec.
21. Perks are **player-level** effects passed into `createCombat` as a new
    `partyWidePlayerEffects` parameter, applied to every player-side creature; canonical effect
    order gains a `perks` slot (innate-1 → innate-2 → perks → infusions → statuses) — a change
    to a previously-pinned ordering rule, flagged for explicit sign-off.
22. The Shieldbarer starter's team-Defence buff is a `stat-modifier` targeted at a new
    `all-allies` `ResponseTarget`, not `grant-action-state`.
23. The scripted-intro encounter is a run-layer (store) special case around the unmodified
    engine — no new `FightResult` variant, no engine awareness of "this fight is special."
24. Phase-8-inert perks (e.g. Arcane Shields) are authored as real, always-zero-effect
    definitions now, not stubbed/special-cased — correct dormant behavior given no equipment
    system exists yet.
25. Owned creatures get a new branded `InstanceId`, distinct from both the static `creatureId`
    and the engine's per-fight `CreatureId`.
26. Currencies (Essence/Ore/Bricks/Lifeforce) are tracked from Phase 4 on, unbounded, unspent
    until Phase 8.
27. The store's `runRng` is persisted as `{ seed, advanceCounter }` and re-derived on demand,
    not held as a live stateful object — keeps the store plain/serializable ahead of Phase 5.
28. Swapping specs never removes a previously-owned starter creature from the collection —
    only the active perk tree changes.
29. "Floors 1–30" for the three seed biomes means the standard 10-floor cadence (1–10 / 11–20 /
    21–30), not each biome spanning all 30.
30. Spore's spread-on-death is a selector composition (exclude already-Spored living enemies,
    fizzle silently if none), not a new engine primitive.
31. *(Appended after the initial pass, hence out of document order — belongs conceptually beside
    #6–8 in Slice B.)* Within a single-target instance list, every instance after the first
    targets the **same resolved target as instance 1** (the selector is not re-run per
    instance), falling back to normal default-target selection only if that target has since
    died — matching the Brute starter's own wording exactly. AOE instances independently
    re-freeze their own target set per instance (no single target to preserve).

**Locked decisions (resolved with the design owner, not open for review):**
- The **action instance-list model** for Attack/Cast (Slice B) — see the vocabulary table and
  Slice B's prose. Supersedes the prior draft's Flurry/Echo executor-loop assumption.

## Sequencing summary (for quick reference)

`A` (generation) → `B` (response vocab + hooks + formula) → `C` (targeting/turn-order/immunity)
→ `D` (counters/resources) → `E` (support spells) → `F` (specs/perks/starters/Unicorn) → `G`
(state layer) → `H1` (Overgrowth) → `H2` (Glimmerdark) → `H3` (Rotcap Hollow) → `I`
(integration + phase record). Eleven PRs, each merged to `main` before the next branches.