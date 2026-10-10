# Spec — Scripting

Read this when changing scripts or behaviour.

The role scripts the game ships, and each creature's role, are described in
`content/enemy-behaviour.md` and the biome docs; the scripts themselves are in `src/data/scripts.ts`.
How the chosen action then resolves is `spec/combat.md`.

## Design

### Scripts are ordered rules

- The player authors **scripts**: ordered lists of rules. A rule is
  `IF <condition> THEN <action> [TARGETING <selector>]`.
- Each turn the rules are evaluated top-down; the **first** rule whose condition is true and whose
  action is currently valid wins.
- Scripts are **reusable templates**: a creature references one, many creatures can share it, and
  editing a template changes every creature using it. The template is the unit of authoring;
  per-creature overrides may come later.
- A script is **serializable data**, so it saves, exports and feeds deterministic replays.
- Rules per template and templates overall are both **unbounded**.

### One condition per rule

- No AND/OR. Complex behaviour comes from **stacking priority-ordered rules**: "OR" is two rules,
  and nuance comes from narrow high-priority rules above general ones.
- So **ordering carries all the logic**, which makes drag-to-reorder and the "which rule fired"
  feedback load-bearing features, not polish.

### Conditions

- The starter set, and the highest-leverage place to add power later: self, ally or enemy HP%
  (any, lowest or highest), enemy count, ally count, round number, "has status X" (self, ally or
  enemy), and "an enemy is weak to me".
- **"Has status X" matches a literal status id** (exactly Weaken), never a category ("any
  Attack-debuff").
- **"An enemy is weak to me"** is true when at least one living enemy loses to the creature's
  affinity. It describes the board, not a target: a cast chosen because of it may still land on an
  enemy the caster has no edge over.
- **HP% is of max HP**, so a creature at full HP is exactly 100%. "Lowest" and "highest" pick the
  ally or enemy with the lowest or highest **HP%**, and test it.
- Fight-context conditions ("is this a boss fight", the current floor) are deferred past v1. The
  candidates for Phase 6 are in `ROADMAP.md` Phase 6.

### Target selectors

- Orthogonal to conditions: any condition pairs with any selector.
- Enemy: lowest-HP, highest-HP, highest-Attack, highest-Intelligence, random. Ally, its one-for-one
  mirror: lowest-HP, highest-HP, highest-Attack, highest-Intelligence, random. And self.
- **"Ally" always includes the acting creature**, so every ally selector resolves: "lowest-HP ally"
  on a lone creature is itself.
- Support selectors with no enemy mirror (highest-Defence ally, to buff the tank) are added when
  content asks for them, not guessed up front.
- **No "provoking enemy" selector**: Provoke already overrides every single-target offensive action
  (`spec/combat.md` "Provoke"), so selecting the provoker would change nothing when one exists and
  couldn't resolve when none does. Reintroduce it only if a mechanic makes it meaningful, such as
  targeting provokers with a non-offensive action.

### Actions in a rule

- A rule's action is one of the combat actions (`spec/combat.md` "Actions"). A **Cast** rule names
  which gem slot to fire, choosing the right spell for the situation being the tactical depth, or a
  random castable gem.
- **TARGETING** is optional and matters only for actions that choose among targets (Attack, a
  single-target Cast). Without it the rule targets the default for the action's intended side: the
  lowest-HP enemy for attacks and enemy spells, the lowest-HP ally for support spells. Self-only
  actions (Defend, Provoke, Wait) and AOE casts ignore it: an AOE hits its whole side.
- An explicit selector always wins, even one pointing at the other side (`spec/combat.md` "Default
  targeting is side-aware").

### The fallback

- If no rule matches, the creature Attacks the default target (the lowest-HP enemy) if it can, else
  Waits: the player never authors the empty case. A creature with no script runs the fallback every
  turn.

### Enemies run scripts too

- The system is **symmetric**: enemies run the same scripts through the same interpreter.
  Scripted enemies, rather than an enemy AI, keep the game symmetric and give the player readable,
  learnable enemy patterns to script against; utility-scoring AI was rejected for that reason.

### Role scripts

- Enemies run **role scripts**, seven stock templates: `striker`, `guardian`, `warden`, `caster`,
  `support`, `opener` and `taunter`. A creature's role is its default script (`spec/creatures.md`
  "Species, creatures and instances"). They are the only scripts the game ships; what each does is
  `content/enemy-behaviour.md` "Role scripts".
- Every role ends in a fallback rule that runs only when the rule above it is illegal, so a lock
  downgrades a turn instead of emptying it (`content/enemy-behaviour.md` "A lock downgrades a
  turn").

## Engine rules

### The interpreter

- `decideAction(creature, script, state) → Intent` is pure engine code. It returns the winning
  rule's **unresolved** intent, or the fallback's; `resolveIntent` and `executeAction` turn it into
  the action (`spec/combat.md` "One action pipeline").
- **Side-effect-free lookahead**: walk the rules top-down; a rule matches only if its condition is
  true **and** its action is legal (`checkLegality`). An illegal action **skips to the next rule**;
  it never matches and fizzles. The first match wins, and only then is anything executed: no try,
  no rollback.
- **Legality is an existence check, never a resolution**: a `random-enemy` rule is legal iff a
  living enemy exists. The RNG draw happens **once, at execution, for the winning rule only**. A rule
  that loses never consumes RNG; otherwise the target would depend on incidental script structure
  above it and `same seed → same outcome` would break.
- An action is illegal for an **empty gem slot**, **no castable gem** for a random cast, or a
  **lock** on it (Silenced blocks Cast, Pacified Attack, Stun and Sleep everything;
  `spec/statuses.md` "Action locks").
- **An unresolvable selector makes a rule illegal**, but no v1 selector can fail to resolve: `self`
  exists, ally selectors include the actor, and an enemy selector always has a target because no
  turn or action starts after a side is wiped. The seam is kept, documented but unreachable, so
  future selectors that can fail get the right behaviour for free.
- **Ordering is array position**, not a stored priority number; reordering reorders the array.
- `always` is unconditionally true: the idiomatic catch-all bottom rule.
- **The fallback** is an ordinary intent, `{ action: attack }` with no targeting, so it gets the
  side-aware default through the action pipeline; `checkLegality` decides between Attack and Wait.

### Conditions in the engine

- `Condition` is a discriminated union on `kind`: `always`, `hp-percent`, `enemy-count`,
  `ally-count`, `round-number`, `enemy-weak-to-me-exists`, `has-status` and `acted-before-target`
  (`spec/effects.md` "acted-before-target"). Comparators are data: `<`, `<=`, `>`, `>=`, `==`, `!=`.
- **HP% by integer cross-multiplication**: `currentHp × 100 <cmp> threshold × maxHp`, with `maxHp =
  floor(getEffectiveStat(_, 'health'))`, the max HP that `currentHp` is initialised and clamped to
  (`effectiveMaxHp`), never the unfloored effective Health. So full HP is exactly 100% and every
  term is an integer; thresholds are integers, no float. One helper (`hpPercentSatisfied`) serves
  scripting conditions and `SelfCondition` alike.
- **Subjects**: `self`, `ally`, `enemy` and `target`. `hp-percent`'s qualifier is `any` (some
  creature in the pool passes), or `lowest` or `highest`: the creature with the lowest or highest
  HP% is the one tested. `has-status` is existential over the pool and matches a literal status id
  among statuses, never stat-modifiers.
- **Known bug:** `main` picks the `lowest` or `highest` creature by **current HP**, not HP%
  (`conditions.ts` `evaluateCondition`), so a `warden` or `support` whose ally at 30/100 HP sits
  beside one at 20/25 tests the 80% one and doesn't act. The fix is listed in `ROADMAP.md` Phase
  4.5 "Decided, not built".
- **`'target'`** is the creature an effect is being resolved against (`spec/effects.md` "Trigger
  conditions"). A script rule has none, so in lookahead a `'target'` condition is **false**. The
  qualifier is ignored for it, since it is a single creature.

### Target selectors in the engine

- `TargetSelector` is a discriminated union on `kind`: the player's eleven
  (`lowest-hp-enemy`, `highest-hp-enemy`, `highest-attack-enemy`, `highest-intelligence-enemy`,
  `random-enemy`, their `-ally` mirrors, and `self`) plus the intent-only `'random'`
  (`spec/combat.md` "One action pipeline").
- Extremum selectors read current HP or effective Attack or Intelligence, with the **shared
  tie-break**: player side → slot → id, ids compared by codepoint.
- `random-enemy` and `random-ally` draw from the seeded RNG, only at execution, for the winning
  rule. `peekTargetSelector` (the `acted-before-target` peek) returns no target for them rather than
  drawing.

### Scripts and rules

- `Script = { id, rules: Rule[], defaultTarget?: TargetSelector }`; `Rule = { condition, action,
  targeting? }`. A creature references a script by **`scriptId`**; null or absent runs the fallback
  every turn.
- `defaultTarget?` is reserved for Phase 6's editor; the interpreter never reads it. How it would
  interact with the side-aware default is Phase 6's decision (`ROADMAP.md` Phase 6).

### Stock scripts

- `data/scripts.ts` ships only the seven role scripts; a creature's `defaultScriptId` is its role.
- The five single-rule scripts `always-attack`, `always-cast`, `always-defend`, `always-provoke` and
  `always-wait` are **test fixtures** (`src/engine/__fixtures__/scripts.ts`), not content, and no
  creature's role is one. Mechanism goldens, unit tests and the balance corpus's coverage fights use
  them: a mechanism test wants the simplest deterministic actor, and a role's extra rules and random
  draws would blur it. A one-rule script is still one a player can write.
- **A random gem of one side**: a cast's `gemSide` (`{ kind: 'cast', gemSlot: 'random', gemSide:
  'ally' }`) narrows the draw to gems whose spell's `targetSide` is that side (`support`'s first
  rule). With none castable the rule is illegal and falls through.

## Not built

### The script editor

- Phase 6 builds it (`ROADMAP.md` Phase 6). Authoring is **UI-driven** (blocks and dropdowns),
  never free-text code, so it is accessible and can't crash the engine: think Final Fantasy XII's
  Gambits.
- A Cast rule names a slot, so one rule fires different spells on different creatures: the editor
  must show **what sits in each slot**, which the template-versus-creature context makes
  non-trivial.
- A template's TARGETING can **mismatch** a creature's equipped spell in two ways, and the editor
  must handle both (warn, adapt, or type slots by shape and side; open):
  - **shape**: a single-target selector on an AOE slot. The engine tolerates it: the AOE ignores the
    selector and hits its whole side;
  - **side**: an enemy selector on an ally-side spell, or the reverse. The engine resolves it
    literally, by design (`spec/combat.md` "Default targeting is side-aware"), so the editor warns
    and never blocks. A rule with no selector already gets the right side.
