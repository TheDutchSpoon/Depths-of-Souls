# Spec — Scripting

Read this when changing scripts or behaviour.

## Design

## 8. Scripting system (the heart of the game)

The player authors **scripts**: ordered lists of rules. Scripts are **templated** — a
script is a reusable template that can be assigned to any creature (a creature references a
template; many creatures can share one; editing a template updates all creatures using it). A
rule is:

```
PRIORITY n:  IF <condition>  THEN <action>  [TARGETING <selector>]
```

Evaluated top-down each turn; the **first** rule whose single condition is true and whose
action is currently valid wins.

**One condition per rule (v1).** No AND/OR. Complex behavior is expressed by **stacking
priority-ordered rules** (you get "OR" by writing two rules; nuance comes from ordering narrow
high-priority rules above general ones). **Consequence**: rule *ordering carries all the logic
weight*, which makes the **drag-to-reorder UI** and the **"which rule fired" feedback**
(§ROADMAP combat-feedback) load-bearing features, not minor polish. Rule count per template and
template count overall are both **unbounded**.

**v1 conditions** (a starter set — expandable, and the highest-leverage place to add power
later): self HP%, ally HP% (any / lowest), enemy HP% (any / lowest / highest), enemy count,
ally count, turn/round number, "has status X" (self / ally / enemy — matches a **literal status
ID**, e.g. exactly "Weaken", not a category like "any Attack-debuff"), and affinity advantage vs a
target. ("Is provoking" was removed in Phase 4.1: provoking always ends at the start of the
creature's own turn, so it could never be true when that creature's script runs. A "what did I do
last turn" condition is a Phase 6 candidate if scripts need memory.) (Fight-*context* conditions
like "is this a boss fight" or "current floor/depth" are deliberately deferred past v1.)

**v1 targeting selectors** (orthogonal to conditions — any condition pairs with any target):
lowest-HP enemy, highest-HP enemy, highest-Attack enemy, highest-Intelligence enemy, random enemy,
lowest-HP ally, highest-HP ally, highest-Attack ally, highest-Intelligence ally, random ally, self.
The ally set mirrors the enemy set one-for-one (Phase 4 Slice E completed it alongside the
support-spell model — support spells and ally-targeting trait responses need to pick *which* ally,
not only "the weakest one"). "ally" always **includes the acting creature**, so every ally selector
always resolves. *(Support-specific selectors with no enemy mirror — e.g. highest-Defence ally to
buff the tank — are **deferred** to when the seed buff spells are authored (Slices H1–H3 / F), so the
set is driven by what the content actually wants rather than guessed up front.)*

*(A "provoking enemy" selector was considered and **dropped** for v1: because Provoke is a blanket
post-selection override on all single-target offensive actions (§7), explicitly selecting the
provoker would produce behavior indistinguishable from any other selector when a provoker exists,
and an unresolvable rule when none does — i.e. it can never produce an observable outcome. Reintroduce
only if a future mechanic makes it meaningful, e.g. targeting provokers for non-offensive actions.)*

**Actions**: the action set from §7. For **Cast**, the rule specifies **which equipped gem/slot**
to fire (choosing the right spell for the situation is the tactical depth), or **a random castable
gem**. The **TARGETING** clause only matters for actions that choose among multiple valid targets
(Attack, single-target Cast) and is **optional**: a rule without one targets the default for the
action's intended side (lowest-HP enemy for attacks and enemy spells, lowest-HP ally for support
spells). It's omitted for self-only actions (Defend, Provoke, Wait) and for AOE Cast (which always
hits its full target set per §7). An explicit selector always wins, even one pointing at the other
side (healing an enemy can become a real tactic if a status ever makes healing hurt).

**Fallback**: if no rule matches, the engine applies the implicit default automatically (Attack
a default target if any valid, else Wait) — the player never authors the empty case.

Design constraints:
- Authoring is **UI-driven** (dropdowns/blocks), not free-text code, so it's accessible and
  cannot crash the engine. Think "Final Fantasy XII Gambits."
- The script model is **serializable data** so it saves, exports, and feeds deterministic
  replays.
- **Script scope (decided)**: scripts are **reusable templates assignable to creatures**; the
  template is the unit of authoring. Per-creature overrides may come later.

**Interpreter semantics (locked — Phase 2):**
- **Rule validity**: a rule matches only if its condition is true **AND** its chosen action is
  currently valid. An invalid action → **skip to the next rule** (not "match and fizzle"). In v1 the
  reachable causes of invalidity are an **empty referenced gem slot** (Cast with nothing in that
  slot → skip), **no castable gem** for a random-gem Cast, and a **lock** on that action (Silenced
  blocks Cast, Pacified blocks Attack, Stun/Sleep block everything). A separate "**unresolvable selector → skip**" branch also exists, but with the v1
  selector set it has **no reachable trigger** (self always exists; ally-selectors include the
  acting creature so they always resolve; enemy-selectors always have a target because `decideAction`
  never runs against an already-wiped enemy side — win/loss is checked after every step, so no
  turn or action starts after one side is gone). It is kept as a **defensive/structural seam**, documented
  but currently unreachable, so that future selectors which *can* fail to resolve get correct
  behavior for free. This keeps scripts robust.
- **Evaluation is side-effect-free lookahead**: walk rules top-down evaluating condition + validity
  as pure predicates over current state; the **first** rule that passes wins; only then is its
  single action executed. No try/rollback.
- **`always` condition**: unconditionally true — also the idiomatic explicit catch-all bottom rule.
- **Ordering is array position**, not a stored priority number; drag-to-reorder reorders the array.
- **Cast references a gem *slot index*** (not a spell ID), or asks for a **random castable gem**,
  so a template is reusable across loadouts; the spell fired is whatever occupies that slot on that
  creature. The **target shape**
  (single / all-enemies) is a property of the *equipped spell*, resolved at evaluation time; AOE
  omits the selector and hits all living enemies (frozen at cast-start, slot order); single-target
  uses the selector and is subject to provoke.
- **"ally" includes the acting creature**; "lowest-HP ally" on a solo creature resolves to itself.
- **`Script.defaultTarget?`** (reserved): optional per-template default selector for rules that omit
  TARGETING; data field reserved now, surfaced in the Phase 6 authoring UI.
- **Assignment**: a creature references a script by `scriptId`; null/absent → the implicit fallback
  runs every turn (Attack a valid target, else Wait). The interpreter is **symmetric** — player and
  enemy creatures use the same system. Enemies run **role scripts** (Phase 4.1): seven stock
  templates, and each creature's role is its default script. They are the only scripts the game
  ships (4.1-G plan review); the old single-action `always-*` scripts are test fixtures:
  - **striker** — finish off hurt enemies (any below 80% → attack the lowest), else attack a random
    enemy;
  - **guardian** — defend when below 50% HP, else attack the lowest-HP enemy;
  - **warden** — provoke when an ally drops below 50%, else attack the lowest-HP enemy;
  - **caster** — cast a random gem, else attack;
  - **support** — when an ally drops below 50%, cast a random support gem, else attack;
  - **opener** — cast a random gem in round 1, then attack;
  - **taunter** — provoke every turn, so it never attacks (for creatures whose trait fires on
    Provoke: Snapjaw Lure; Stonehorn Warden until 4.1-H2c, which moves it to **warden**).
  Every attacking role falls back to casting a random gem when it can't attack (Pacified). A
  summoned creature starts with its role's script. Scripted enemies (rather than an enemy AI) keep
  the game symmetric and give the player readable enemy patterns to script against.
- **HP% conditions** use **max HP** as the denominator: effective Health rounded down
  (`floor(getEffectiveStat(_, 'health'))`), the same value current HP is capped at, so a creature
  at full HP is exactly 100%. Compared via integer cross-multiplication (no float) — see
  CONVENTIONS. Conditional passives ("+25% Attack at full HP") use the same basis.

**Deferred to Phase 6 (authoring UI):**
- The UI must surface **equipped-slot contents** when authoring a Cast rule — a slot-referencing
  rule fires different spells on different creatures; template-vs-creature context makes this
  non-trivial.
- A template's TARGETING clause may **mismatch** a creature's equipped spell in two ways; the UI
  must handle both — warn / adapt / type slots by shape and side (TBD):
  - **Shape mismatch** (single-target selector on an AOE slot): runtime tolerates it — AOE ignores
    the stray selector and hits its full frozen set.
  - **Side mismatch** (an enemy-side selector on an **ally-targeting** spell, or vice versa):
    runtime resolves an explicit selector **literally**, so a support spell under an enemy selector
    lands on an enemy (and vice versa). This is **deliberate** (Phase 4.1): the engine never
    forbids a side, because a future status could make cross-side casting a real tactic. The editor
    shows a **warning, not a block**. A rule with **no** selector already gets the right side by
    default, so the common case needs no selector at all.

## Engine rules

- **Interpreter** = pure engine code: `decideAction(creature, script, state) -> Intent` (the Phase 1
  seam, now consulting the script; from 4.1-C it returns the winning rule's **unresolved** intent,
  or the fallback intent, and `resolveIntent` + `executeAction` turn it into the action; RNG
  only via `CombatState`'s seeded RNG). **Side-effect-free
  lookahead**: walk the ordered rules top-down; a rule matches only if its **condition is true AND
  its action is valid** (invalid → **skip to next rule**, never match-and-fizzle); first match wins;
  only then execute. **Validity-checking is an *existence* check, never a resolution** — e.g. a
  `random-enemy` selector is valid iff ≥1 living enemy exists; the **actual RNG draw happens exactly
  once, at execution time, for the winning rule only**. Non-winning rules that reference a random
  selector must **not** consume RNG state during lookahead — otherwise the chosen target would
  depend on incidental script structure above it, breaking `same seed → identical outcome`. So
  lookahead is pure (predicates + existence only); the single stateful draw is part of *execution*.
  **One condition per rule** (no AND/OR); **ordering carries the logic** and is
  **array position** (no stored priority int), so reorder UI + "which rule fired" feedback are
  load-bearing. Implicit fallback: Attack a valid default target, else Wait. From 4.1-C the fallback
  is an ordinary intent through the action pipeline (`{ action: attack }`, no targeting), so its
  target is the **side-aware default, the lowest-HP enemy**; Phase 1's first-by-slot default is
  retired (decided; the goldens that depended on it are rewritten deliberately in 4.1-C). `TARGETING` is
  optional (side-aware default, see above) and meaningful only for single-target actions (Attack,
  single-target Cast); self-only actions (Defend/Provoke/Wait) and AOE Cast ignore it. Lookahead
  legality is `checkLegality` (A1). A `"has status X"` condition matches a **literal status ID**,
  not a category (built in Phase 3).
  - **Condition** = discriminated union on kind; comparator is **data** (`< <= > >= ==`, `!=`
    optional). **HP% via integer cross-multiplication** — `currentHp * 100 <cmp> threshold * maxHp`
    where `maxHp = floor(getEffectiveStat(_, 'health'))` — the **max HP** that `currentHp` is
    initialised and clamped to (`effectiveMaxHp`), never the unfloored effective Health, so full HP
    is exactly 100% and every term is an integer (Phase 4.1-B review, PR #69: the unfloored
    denominator made "HP < 100%" true at full HP whenever a Health modifier left effective Health
    fractional). One shared helper computes it for scripting conditions and `SelfCondition`
    alike. Integer thresholds, **no float**. Subject
    qualifier `any` (existential) / `lowest` / `highest` (pick-and-test-the-extremum). `always` = an
    unconditionally-true kind. **Phase 2 shipped the testable subset** (`always`, HP%, enemy/ally
    counts, turn/round number, affinity-advantage, is-provoking); **`has-status` joined in Phase
    3**. **`is-provoking` is deleted in Phase 4.1-C** (D6): with the turn skeleton, provoking always
    ends at the creature's own turn start, so the condition could never be true when its own script
    runs. A general `last-action` condition can come later if scripts need memory (Phase 6
    candidate). **Slice E2 adds source-relative conditions**: the
    subject union gains **`'target'`** — "the creature this effect is being resolved against" —
    supplied by the damage target (in `calculateDamage`) and by the trigger's source (in `fireHook`);
    `evaluateCondition` threads it in. With no such creature in scope (scripting-rule lookahead) a
    `'target'` condition is **false** (same precedent as `acted-before-target`); qualifier is ignored
    (single creature). It lights up both `hp-percent` and `has-status`. Consumption: a **new trait-level dealt
    `EffectDef` category, `conditional-damage-bonus`** — `{ percent, condition }`, sibling to
    `armor-penetration`/`cross-stat` (permanent, additive into the dealt pool `1 + Σ`, never a status,
    never a hook) — carries a `'target'`-subject condition, gathered against the current target at hit
    time (`gatherConditionalDamageBonus(attacker, target, state)` folded into the dealt pool). It is
    **not** a `DamageModifierDef` (that family is status-only — Weaken/Vulnerability — and the
    consumers here are permanent trait/perk passives, not applied statuses). This is how "+% damage to
    [Weakened / Webbed / Sleeping] targets" applies (Cull the Weak, Ambusher, both Reapers) and how
    Gloomjaws' "bonus vs low-HP target" works: **one clean modified hit, not an `on-damage-dealt`
    follow-up** (a follow-up would be a second instance that re-fires `on-damage-dealt`, re-splashes,
    and double-counts on-hit effects). A *temporary/status* conditional bonus would grow
    `DamageModifierDef` a condition later — no locked content needs it.
  - **TargetSelector** = discriminated union on kind; all extremum selectors use the **shared
    tie-break** (primary key, then player side → slot → id by codepoint). The enemy set
    (`lowest-hp-enemy`/`highest-hp-enemy`/`highest-attack-enemy`/`highest-intelligence-enemy`/
    `random-enemy`) has a **one-for-one ally mirror** (`lowest-hp-ally`/`highest-hp-ally`/
    `highest-attack-ally`/`highest-intelligence-ally`/`random-ally`) plus `self` — the ally half
    completed in **Phase 4 Slice E** alongside the support-spell model (ally-targeting spells/trait
    responses need to pick *which* ally). `random-enemy`/`random-ally` draw from the seeded RNG and
    advance it — **only at execution for the winning rule**, never during lookahead; both return
    `null` from `peekTargetSelector` (the acted-before-target peek, Slice C) rather than drawing.
    **"ally" includes the acting creature**, so every ally selector always resolves. An unresolvable
    selector → rule invalid → skip, but this is a **defensive/unreachable seam in v1** (no v1
    selector can fail to resolve — self exists, ally-selectors include self, enemy-selectors always
    have a target since combat never resolves an action against a wiped side); kept for future
    selectors that can.
  - **`Script`** = `{ id, rules: Rule[], defaultTarget?: TargetSelector }`; `Rule` =
    `{ condition, action, targeting? }`. Creature references a script by **`scriptId`**; null/absent →
    implicit fallback. `defaultTarget?` reserved for Phase 6 (how it interacts with the engine's
    side-aware default is a Phase 6 decision). Rule/template counts **unbounded**.
- **Scripts are reusable templates** referenced by creatures (many may share one). The interpreter is
  **symmetric** — player and enemy creatures use the same system. Phase 2 provided five **stock
  scripts** in `data/`: `always-attack` (lowest-HP enemy), `always-cast` (slot 0, side-aware
  default target as of 4.1-C, degrades to fallback if slotless), `always-defend`,
  `always-provoke`, `always-wait`. **From 4.1-G1 they are test fixtures**, not shipped content
  (4.1-G plan review).
  - They move unchanged (same ids, same rules) to `src/engine/__fixtures__/scripts.ts`.
  - Mechanism goldens, unit tests and the corpus's coverage fights (Part C) use them: a mechanism
    test wants the simplest deterministic actor, and a role's extra rules and random draws would
    only blur it.
  - Using them in the corpus is still real content: scripts are player data, and a one-rule script
    is one a player can write.
  - `data/scripts.ts` ships only the role scripts. No creature's role is an `always-*` script.
- **Role scripts** (Phase 4.1-G, D4) — seven stock scripts that give enemies readable behaviour and
  give summoned creatures a sensible default. A creature's **`defaultScriptId` is its role**.
  "Random gem" = uniformly among the creature's castable gems (`gemSlot: 'random'`); each gem's target
  comes from the side-aware default. A "cast random gem" rule **below** an Attack rule only fires
  when Attack is illegal, which in practice means **Pacified** (Pacify turns attackers into erratic
  casters instead of idling):

  | Role | Rules, top wins |
  |---|---|
  | `striker` | 1. Any enemy < 80% HP → Attack lowest-HP enemy · 2. Attack random enemy · 3. Cast random gem |
  | `guardian` | 1. Self HP < 50% → Defend · 2. Attack lowest-HP enemy · 3. Cast random gem |
  | `warden` | 1. Lowest ally HP < 50% → Provoke · 2. Attack lowest-HP enemy · 3. Cast random gem |
  | `caster` | 1. Cast random gem · 2. Attack lowest-HP enemy |
  | `support` | 1. Lowest ally HP < 50% → Cast random **ally-side** gem · 2. Attack lowest-HP enemy · 3. Cast random gem |
  | `opener` | 1. Round = 1 → Cast random gem · 2. Attack lowest-HP enemy · 3. Cast random gem |
  | `taunter` | 1. Provoke · 2. Attack lowest-HP enemy · 3. Cast random gem |

  `taunter` is for creatures whose trait fires on Provoke (Snapjaw Lure; Stonehorn Warden until
  4.1-H2c). It behaves exactly as `always-provoke` did, since Provoke is legal on every turn that
  isn't skipped, so a taunter never attacks. **From 4.1-H2c the Shieldbarer starter (Stonehorn
  Warden) runs `warden`** (brief ASSUMPTION 123): under `taunter` its Attack was never read and its
  Rallying Cry fired every turn.
  Rules 2 and 3 are the same fallback every role ends with.

  `support`'s first rule draws only among ally-side gems (the intent carries a side filter, e.g.
  `gemSlot: { random, side: 'ally' }`; exact shape is the 4.1-G plan's); with none, the rule is illegal
  and falls through. Per-creature roles are recorded in the content docs. Enemy AI (utility
  scoring) was considered and **rejected**: scripts keep symmetry, legibility and learnable enemy
  patterns to script against. Known limit: there is no "target lacks status X" condition yet, so
  casters refresh statuses they already applied (a Phase 6 candidate).
