# Spec — Combat

Read this when changing how a fight resolves.

## Design

## 7. Combat (automatic)

- **Format**: **6v6** — six creatures per side, all active simultaneously. The full party of
  six is the normal case. Early game, before the player has collected six creatures, fights
  run with fewer (1–5) on the player side; the engine must handle any party size 1–6.
- **Turn-based under the hood**, resolved automatically. **One round = every living creature
  acts once**, in **Speed order (descending)**, recomputed each round (so Speed buffs/debuffs
  change ordering next round). Ties broken deterministically: **side (player side wins ties) →
  slot → creature id**. A creature gets **one turn per round**; a trait may grant it an extra
  *action*, which runs inside that same turn after its own action completes (§6). As a
  determinism/safety backstop, every fight has a **hard round cap**
  (config); a fight that somehow reaches it (e.g. a pathological all-Defend/all-Wait script on
  both sides) ends immediately as a timeout/draw rather than running unbounded.
- Each turn, a creature consults its **behavior script** to choose an action. If the script
  yields no valid action, fall back to the implicit default (basic Attack on a default target,
  else Wait; the default target is the lowest-HP enemy). The player never has to author the empty
  case. **Every action, whatever produced it
  (the script, the fallback, or a trait granting one), follows the same rules**: whether it's
  allowed (locks), how its target is chosen, and the Confusion and Provoke overrides.
- **Revives are bounded**: a creature can be revived at most **10 times per fight**, so revive
  builds stay strong without looping forever.
- **Actions** (the starting set — more may be added later):
  - **Attack** — physical strike scaled by Attack vs. target Defence (see damage formula).
  - **Cast** — cast an equipped spell (gem), scaled by Intelligence. No resource cost, freely
    castable. Scripts pick *which* equipped gem/slot to cast. A spell's **target shape**
    (single-target or AOE/all-enemies) is a property of the spell itself, not the rule — v1
    supports both shapes.
  - **Defend** — until the creature's next turn: takes **35% less damage** (a ×0.65 factor in
    the defender's multiplicative **taken pool**) **and** has **+50% Defence** (a ×1.5 on its
    effective Defence, inside the subtractive core). Both apply together; strongest on already-
    tanky creatures (the +50% Defence scales with base Defence) while the flat 35% helps squishier
    creatures too.
  - **Provoke** — mark this creature as *provoking* (taunt) **until its next turn**; see
    targeting rule below. Re-provoking each turn is a recurring tactical cost (the creature
    isn't attacking), making dedicated tanking a real choice.
  - **Wait** — take no action this turn.
  - Trait-granted actions reuse these same actions (e.g. "cast a random equipped spell").
- **Provoke / targeting resolution**: when a creature uses an offensive action (Attack or
  Cast) against the enemy side, target selection works as follows:
  - If one or more enemy creatures are currently **provoking**, the action targets a
    **random** one of the provoking creatures.
  - If none are provoking, the action targets per the script's normal targeting selector, or,
    if the rule names none, the **default for the action's intended side**: the lowest-HP enemy
    for attacks and enemy spells, the **lowest-HP ally** for support spells.
  - "Random" here means a draw from the **seeded combat RNG**, never `Math.random()`, so the
    outcome stays deterministic and replayable (see CONVENTIONS). Provoke is an **override
    layer** applied *after* the script chooses an action — it constrains the target set, it
    does not change which action the script selected. Targeting selectors that conflict with
    an active provoke are narrowed to the provoking set rather than ignored wholesale.
  - Provoke applies only to enemy-targeting offensive actions; ally-targeting actions (e.g.
    a support spell on an ally) are unaffected.
  - Provoke **only narrows single-target selection**. An **AOE** Cast (hits all enemies)
    ignores provoke entirely and still hits its full target set — narrowing an AOE down to just
    the taunting creature would defeat the point of choosing an AOE spell.
- **Affinity advantage** is a cycle: **Vitality > Violence > Wit > Endurance > Instinct > Vitality**
  (each beats the next; loops back — *Vitality outlasts Violence, Violence overwhelms Wit, Wit cracks
  Endurance, Endurance outlasts Instinct, Instinct strikes Vitality*). It is its **own standalone multiplicative term** in the damage
  formula (separate from both the additive dealt pool and the multiplicative taken pool), defined
  once per hit: attacker's affinity beats defender's → **×1.25**; defender's beats attacker's →
  **×0.75**; otherwise **×1.0**. Being separate and always-multiplicative keeps affinity matchups
  relevant no matter how much a build stacks in the mod pools. Encode the cycle and multipliers as
  data, not branches.

### Damage formula
All direct damage (Attack and Cast) uses one formula:

```
effOffStat = getEffectiveStat( remapResolve(creature, action) ) × spellPower   // spellPower = 1.0 for Attack
raw        = ( MAX(effOffStat − Defence, 0) + 0.01 × effOffStat ) × Affinity × (1 + Σ dealtMods) × Π(takenFactors)
damage     = MAX(1, floor(raw))
```

- **effOffStat** = the attacker's effective offensive stat, scaled by the action's **spellPower**:
  - Base offensive stat is **Attack** (for Attack) or **Intelligence** (for Cast), read via a
    **resolvable lookup** (`getAttackStat`-style) that consults any active **stat-remap** effect
    first, so a trait like "use Speed as Attack" slots in without a formula rewrite (see §6).
  - That value is taken as an **effective** stat (`getEffectiveStat`, base folded with active
    stat-modifiers), never raw base. `Defence` is likewise effective.
  - Then multiplied by **`spellPower`**, a coefficient the **action/spell** carries. Basic **Attack
    has spellPower 1.0**; a spell declares its own (e.g. a "30% Intelligence" spell = `0.30`).
  - **Order**: remap-resolve the source stat → `getEffectiveStat` → `× spellPower` → that is
    `effOffStat`, used everywhere OffStat appears below.
  - Both offensive paths are checked against the target's single **Defence** (no separate magic
    resist in v1).
- **spellPower scales OffStat, NOT the post-mitigation damage** — it is inside the subtractive
  core, *before* Defence: a 30% spell wields `Int × 0.30` and Defence bites that scaled value
  (`(Int × 0.30) − Def`), **not** `(Int − Def) × 0.30`. Deliberate: Defence measures against the
  spell's actual incoming power. This is a **third modifier locus**, distinct from stat-modifiers
  (→ effective stats) and damage-modifiers (→ the dealt/taken pools below); see §6.
- **Base stats immutable**; effective values computed on demand (see §6 and CONVENTIONS).
- **Subtractive core**, `MAX(effOffStat − Defence, 0)`, clamped at 0 — Defence can fully cancel it.
- **+1% chip floor**, `0.01 × effOffStat`, added **unconditionally** (even when the core is fully
  absorbed) — and it scales with spellPower too (a weak spell has a proportionally small chip), so
  affinity/mods still have something to act on against a wall. *(Kept at 1% at the 4.1-H2 grill: a
  5% chip halved the round-cap draws but changes every hit and can't reach the level-1 walls;
  brief ASSUMPTION 109.)*
- **Rounding**: HP and damage are **integers**; `raw` is computed in full precision, then
  **floored once at the end**, with a hard **minimum of 1** — every hit removes at least 1 HP
  (no stalemates; the round cap is thus only a pathological backstop). Floor once, not per-term
  (per-term rounding compounds error and risks cross-platform float drift → breaks golden replay).
- **Affinity** = the standalone ×1.25 / ×0.75 / ×1.0 term (see cycle above). **Always
  multiplicative**, separate from both mod pools, so affinity matchups stay relevant no matter how
  much a build stacks.
- **Two damage-modifier pools, deliberately asymmetric** (this is where build power compounds;
  base stats grow linearly, §5):
  - **Dealt pool (attacker's damage-*dealt* modifiers): additive** — `1 + Σ dealtMods` (empty =
    1.0). Many "+X% damage" sources **sum**, keeping offensive scaling tractable and avoiding
    super-exponential blowup when stacking lots of trait/augment/perk modifiers.
  - **Taken pool (defender's damage-*taken* modifiers): multiplicative** — `Π(takenFactors)`
    (empty = 1.0). Each reduction (Defend's ×0.65, a "-20% taken" source = ×0.8) or amplification
    (a "Vulnerable: +50% taken" debuff = ×1.5) is its **own factor, producted together**.
    Reductions trend toward but **never reach 0** → defensive builds are powerful and never grant
    true immunity; **no clamp needed** (multiplication can't cross 0). Amplifications share the
    same pool.
  - Rationale for the asymmetry: additive on offense prevents number-explosion when stacking many
    sources; multiplicative on defense makes each defensive layer compound so tanking is a real
    power path, with no immunity and no clamp. Different goals, different math, on purpose.
- **Stat changes never touch the damage pools**: a "+50% Attack" buff raises effective Attack
  (folded into `OffStat`); it is *not* a dealt-mod. Conversely, a "+30% damage dealt" effect is a
  dealt-mod and does not touch the Attack stat. This split prevents double-counting. (A future
  status *could* deliberately be a damage-modifier — that's a distinct effect category, §6.)
- **Defend** contributes its ×0.65 to the defender's **taken pool** and its ×1.5 to the
  defender's effective Defence (inside the core), both until the creature's next turn.
- **No damage variance/rolls** — fully deterministic. **No baseline crits** — "crit" is a
  trait-granted dealt-mod.
- **Damage channels (decided at the 4.1-H2 grill; brief ASSUMPTIONS 110–113).** The formula above
  is **direct** damage: an **Attack or Cast action** from any source (a script, the fallback, a
  trait-granted action), including every effect of the cast spell. Everything else that deals
  damage, a trait, status or perk response (a retaliation, an on-death burst, an on-attack bonus
  hit) and DoT ticks, is **indirect** damage:
  `MAX(1, floor(magnitude × Affinity × (1 + Σ dealtMods) × Π(takenFactors) − 0.2 × Defence))`,
  with no chip. Indirect damage meets only **a fifth of Defence**, so Defence-based creatures have
  a counter and reactive traits matter against tanks. Heals are neither. (From 4.1-H2a; DoT ticks
  from 4.1-H2b, with no dealt pool: the applier's build is in its snapshot, §6.) **Damage a
  creature's own trait, status or perk response deals to itself is a cost** (from 4.1-H2a): the
  exact amount, no Defence or modifiers, still a damage event, able to kill.
- **The Additional (from 4.1-H2a; brief ASSUMPTION 110):** a fading flat bonus on **direct** hits,
  added after the floor: `min(floor(0.2 × target's max HP), max(0, 10 − (attacker level − 1)))`.
  It is 20% of the target's max HP, capped at 10 at level 1, the cap falling by 1 per attacker
  level and gone from level 11. **Nothing modifies it** (Defence, affinity, the pools, Defend).
  Both sides get it. It exists to speed up early fights: at low levels offence often sits below
  Defence, and stats scale together, so without it early fights were walls of 1-damage hits.
  *(Until 4.1-H2a there is no Additional and no indirect channel, and DoT bypasses Defence.)*

### Encounters, rewards & wipes
- **Encounters** are **cave floors**: descending pits your party against that floor's creatures
  (drawn from the floor's biome, at the floor's enemy-level range; see §4). Clearing a floor lets
  you descend. Rewards (XP, drops) scale with depth.
- **Rewards bank per kill-event, the instant an enemy dies** — soul%, XP, and currency are never
  held pending the fight's outcome, so a wipe after some enemies died keeps everything earned so
  far. Win/loss/draw is checked **after every step** (each action, each granted action, each
  trigger firing at turn start, turn end or round end); the fight ends the instant one side has no
  living creatures (it does not finish the turn or the round).
- **Fight result is a three-value union** — `win` / `loss` / `draw`. A round-cap timeout is a
  `draw`. For navigation, **draw resolves like loss** (return to hub, no floor cleared), but
  already-banked per-kill rewards stay banked.
- **On a wipe** (loss or draw) there is **no run reset and no loss of progress** — depth is
  persistent. The party returns to the **entrance hub**; from there the player can **fast-travel**
  to any floor up to their deepest-reached. Wiping never rolls back creatures, XP, or facilities.
- Combat must be **deterministic** given (party snapshot, scripts, RNG seed) — enables
  reproducible bugs, replay/fast-forward, and testable scripts. See CONVENTIONS.

### Manual mode (secondary)
An optional toggle lets the player take manual control of one fight: same engine, but
actions come from UI input instead of the script. It must not require its own combat code
path — it's the same resolver with a different action source.

## Engine rules

## Combat & scripting

- **Resolver shape** (three pieces): `createCombat({ seed, player: { party, effects }, enemy: {
  party, effects }, registries }) -> CombatState` (factory — sets up sides/slots, seeds RNG, guards
  against empty parties; the named-input shape is Phase 4.1-B, S1, see "Fight setup"); `resolveTurn(state)
  -> { state, events }` (pure primitive — one creature's action); and `resolveFight(state)`
  (thin run-to-completion wrapper over the stepper). Expose the **stepper** (advance-one-turn,
  crossing round boundaries internally) as the single low-level driver so manual-mode/playback can
  step incrementally; `resolveFight` is the convenience wrapper. Emit a typed **event log**; the
  UI renders from events, never from resolver internals. **RNG state lives inside `CombatState`**
  (threaded state-in-state-out), so the function stays purely `state -> { state, events }`. The
  engine is **player/enemy-aware** (sides are labeled; win = player side survives).
- Combat is **6v6** (party size 1–6 supported). **One round = every living creature acts once.**
  The acting order is a **frozen ordered list of creature IDs**, built **once at round-start** from
  current effective Speed; ties broken deterministically (**player side → slot → id**). **Never
  recompute mid-round** — a creature that dies before its turn is skipped (alive-check); Speed
  changes bank for the *next* round's rebuild. (Granted extra actions run inside the granting
  creature's turn, see `perform-action`; an "insert an extra turn" effect would be a separate
  primitive, never a queue re-sort.) A fight-level **round cap** (config) is a hard backstop —
  every fight must terminate; reaching it ends the fight as a **draw**.
- **Phase structure**: the fight loop crosses explicit **phase points** — fight-start / round-start
  / (per creature) turn / round-end / fight-end — firing the matching **effect-framework hooks** at
  each **and** emitting the matching lifecycle event (`FightStarted`, `RoundStarted`, `TurnStarted`/
  `TurnEnded`, `FightEnded`; there is no separate round-end event — end-of-round hooks fire but
  round boundaries are implied by the next `RoundStarted`/`FightEnded`). Status tick/expiry, DoT,
  Regen, etc. are hook triggers and turn cleanup, **not** a separate `resolveRound` function. In
  Phase 1 all hook lists are empty (no-ops) and no round-cap draw has happened yet, but the seams
  and events exist from the start.
- **Turn structure** (decided at the Phase 4 close review, D6; skeleton in **4.1-C**, status timing
  in **4.1-F**). Every creature's turn runs exactly this sequence:
  ```
  TurnStarted
  → turn-start hooks
  → TURN-START CLEANUP   defending / provoking end (runs on skipped turns too);
                         emits ActionStateEnded only when a flag was actually set
  → turn-start grants    (grants raised by the turn-start hooks, see A2)
  → decide + action      (or TurnSkipped, if an 'all' action-lock is active after the
                         turn-start hooks or at this slot)
  → action grants        (grants raised by the action, right after it, see A2)
  → turn-end hooks       incl. DoT / HoT ticks (status triggers on on-turn-end)
  → granted actions      (grants raised by the turn-end hooks, see A2)
  → TURN-END CLEANUP     the bearer's own status timers count down + expire; then the Web roll
  → TurnEnded
  ```
  - **A mid-turn wipe ends the turn there** (4.1-F2 plan review). The rest of the turn (later hook
    firings, grants, cleanup, the Web roll) is skipped, `TurnEnded` is still emitted, so it stays
    the turn's last event and the brackets balance, and `FightEnded` follows. See "Resolution &
    timing" for the check points.
  - **Everything between `TurnStarted` and `TurnEnded` belongs to that turn**; anything between
    brackets (round start, round end) is round-level. `TurnEnded` is always the turn's last event
    (Phase 4 fired `on-turn-end` hooks and the bonus cast *after* it).
  - **Cleanup is bookkeeping only:** it ends things and never deals damage, heals or fires
    triggers. Anything that *does* something is a hook trigger.
  - **Turn-start cleanup fixes B6:** in Phase 4 the "until your next turn" cleanup ran only when the
    creature could act, so a Stunned or Sleeping creature kept defending/provoking through its
    skipped turn. **`ActionStateEnded { creatureId, defending, provoking }`** (booleans: which
    flags just ended) makes the end visible; it is emitted only when a flag was actually set.
  - **Status durations count the bearer's own turns** (4.1-F): a Stun of 1 skips exactly one turn,
    a 3-turn Weaken covers the bearer's next three turns whatever the turn order. See "Status
    lifecycle".
  - **Round end has no status work.** It keeps round-level trait triggers (`on-round-end`) and the
    win check.
- **Resolution & timing**: strictly **sequential** (no simultaneity, no dying retaliation in v1) —
  each creature acts fully, damage applies immediately, death is checked immediately. **Win/loss/
  draw is checked after every top-level step**: each action, each granted action, and each
  firing in a hook pass (turn-start, turn-end, round-end). It is never checked inside a step's own
  cascade: a killing blow's `on-death`, `on-kill` and observer reactions all resolve first, like
  the AOE rule (4.1-F2 plan review). **The fight-start pass and its drain are checked too, from
  4.1-F3** (PR #80 review): a wipe there ends the fight before `RoundStarted`. Built in F2 without
  it (no content can wipe a side at fight start), a fight-start wipe would run round 1's first
  turn-start hooks before ending. The fight ends the instant a side has no living creatures
  (does not finish the round). **Result is a three-value union** (`win` / `loss` / `draw`); draw
  resolves like loss for navigation. A creature at 0 HP is **flagged `alive: false`, not removed**
  (stable slots for tie-break/event references); compaction only at fight end. **Rewards bank per
  kill-event**, immediately, never held pending fight outcome.
- **Damage formula** (Attack and Cast both):
  ```
  effOffStat = getEffectiveStat( remapResolve(creature, action) ) × spellPower   // spellPower = 1.0 for Attack
  raw        = (MAX(effOffStat − Defence, 0) + 0.01 × effOffStat) × Affinity × (1 + Σ dealtMods) × Π(takenFactors)
  damage     = MAX(1, floor(raw))
  ```
  - **effOffStat**: source stat (**Attack** for Attack / **Intelligence** for Cast) read via a
    **remap-aware lookup** (consults `stat-remap` effects), taken as an **effective** stat
    (`getEffectiveStat`, never raw base), then **× the action's `spellPower`** coefficient. Order:
    remap → effective → × spellPower. `Defence` is likewise effective.
  - **spellPower** is an **action property** (Attack = 1.0; a "30% Int" spell = 0.30; after A4 it
    sits on the spell's `deal-damage`/`heal` response). It
    scales OffStat **inside the core, pre-Defence** — a 30% spell = `(Int × 0.30) − Def`, **not**
    `(Int − Def) × 0.30` (Defence measures against actual incoming power). It's a **third modifier
    locus**, distinct from stat-modifiers (→ effective stats) and damage-modifiers (→ the pools).
  - Subtractive core clamped at 0; **+1% chip floor unconditional** and it **scales with
    effOffStat** too (a weak spell has a proportionally small chip).
  - **Integer damage**: full-precision `raw`, **floored once at the end**, **min 1** (a hit always
    removes ≥1 HP → no stalemates; round cap is only a pathological backstop). Never round per-term
    (float drift breaks golden replay).
  - **Affinity** = standalone ×1.25 / ×0.75 / ×1.0 (data lookup; store ±25% as config), separate
    from both pools, always multiplicative.
  - **Two asymmetric mod pools**: attacker's **dealt pool is additive** (`1 + Σ`, empty = 1.0);
    defender's **taken pool is multiplicative** (`Π`, empty = 1.0). Reductions in the taken pool
    trend toward but never reach 0 (**no immunity, no clamp needed**); amplifications share it.
    Rationale: additive offense stays tractable when stacking many sources; multiplicative defense
    makes tanking a real power path. **Stat buffs are NOT dealt-mods** (they raise effective stats);
    "+damage%" effects are dealt-mods — never double-count.
  - **No variance, no baseline crits** (crit = a trait-granted dealt-mod). Until 4.1-H2a, no
    "Additional" term either; see "Damage channels" below.
- **Damage channels and the Additional** (Phase 4.1-H2a, brief ASSUMPTIONS 110–112).
  - **Direct damage:** an **Attack or Cast action** from any source (a script, the fallback, a
    trait-granted `perform-action`), including every effect of the cast spell. It uses the formula
    above, **plus the Additional**:
    ```
    additional = min( floor(0.2 × target's effective max HP), max(0, 10 − (attacker level − 1)) )
    damage     = MAX(1, floor(raw)) + additional
    ```
    The cap is 10 at level 1 and falls by 1 per attacker level (gone from level 11), so it only
    speeds up early fights. **Nothing modifies it**: not Defence, affinity, either pool or Defend.
    Both sides get it. The 0.2 and the 10 are combat rule constants in `engine/config.ts`. It
    applies to **every direct `DamageDealt`**: each attack instance, each Splashing hit, each AOE
    target, each `deal-damage` in a spell's list and granted actions (brief ASSUMPTION 135).
  - **Indirect damage:** every other damage, i.e. a trait, status or perk **response**
    (retaliation, on-death bursts, on-attack bonus hits) and DoT ticks (4.1-H2b):
    ```
    raw    = magnitude × Affinity × (1 + Σ dealtMods) × Π(takenFactors) − 0.2 × Defence
    damage = MAX(1, floor(raw))
    ```
    `magnitude` is the response's own (`offStat`/`scalingStat` × spellPower × count), or a DoT
    tick's snapshot potency, which has no dealt pool (the applier's build is already in its
    snapshotted stat); `Defence` is effective, after armor penetration, and includes Defend's ×1.5
    (Defend's ×0.65 is in the taken pool as usual). **No chip, no Additional.** Indirect damage is
    the counter to Defence: it meets only a fifth of it. The dealt pool includes
    `conditional-damage-bonus`; **cross-stat contribution is direct only** (brief ASSUMPTION 134).
  - **Who decides the channel** (brief ASSUMPTIONS 130, 131): the caller. Actions (`executeAttack`,
    `executeSpellEffects`) pass direct; `fireHook` passes indirect. `HookContext.channel` is
    **required**, so no caller can leave it out. `damageSource` stays a display label. A DoT tick
    is recognised by its `snapshot-potency` magnitude (brief ASSUMPTION 144; until 4.1-H2b2, as a
    flat `deal-damage` with a `statusId`, on its bearer); never by its 'dot' label.
    The channel follows the **action, not the target**: a direct action that lands on its own
    actor (a Confusion redirect, a spell effect on its caster) stays direct, with the Additional
    read from the actor's own level and max Health. It is never a cost; a cost is an
    indirect-channel rule (brief ASSUMPTIONS 132, 137).
  - **Heals are neither.**
  - **`DamageDealt`** gains no field (brief ASSUMPTION 136): `finalDamage` includes the Additional,
    `rawDamage` is the formula's pre-clamp value (negative is possible for indirect damage), and
    `wasChipOnly` is false for indirect damage and a cost.
  - **Self-inflicted response damage is a cost** (4.1-H2a, brief ASSUMPTION 116): damage a
    creature's own trait, status or perk response deals to that same creature is the exact amount,
    with no Defence, pools, affinity or Additional. It is still a damage event with the creature as
    its source (damage observers see it; `on-damage-taken` fires) and it can kill. Not a DoT tick,
    ever: a tick is never self-inflicted (see "Damage observation"). It is judged on the
    **resolved** target id; it floors once with **no minimum**, and a cost of 0 is a full no-op (no
    event, no hooks), though the `TriggerFired` that `fireHook` emitted first still stands (brief
    ASSUMPTIONS 132, 138). Lands in **4.1-H2a** with the
    other channel rules. Users: the `RECKLESS` core fixture trait (`golden-loop-safety`), the
    `CATASTROPHIC_COLLAPSE` fixture, and from 4.1-H2b the Flickerling Wick.
  - **Flat-mode response damage** (`deal-damage.flatAmount`, a literal or a `StatPercent`) on
    another creature is indirect from 4.1-H2a like any other response: the flat amount is the
    magnitude. There is no opt-in Defence bypass and no true-damage channel.
  - Why: early fights at low levels were walls of 1-damage hits (offence below Defence, and stats
    scale together, so the gap holds at every level); the Additional removes the early stalls. The
    split gives Defence-based creatures a counter and makes reactive traits matter against tanks.
    A bigger chip floor (5%) was measured and not taken (brief ASSUMPTION 109).
- The action set is **Attack, Cast, Defend, Provoke, Wait** (discriminated union; grows). Spells
  (Cast) have **no cost, freely castable**; a rule picks the **gem slot index** (not a spell ID),
  and the fired spell is whatever occupies that slot on that creature (template-reusable across
  loadouts), or **`gemSlot: 'random'`** (uniformly among castable gems, 4.1-C; the draw always
  consumes one RNG value, even when only one gem is castable). This requires
  **extending the Phase 1 `Creature` type** with an equipped-spells field —
  `equippedSpells: readonly (Spell | null)[]` (bare `Spell | null` slots, **not** the full
  `{ spell, level, augments }` Gem wrapper — that wrapper is Phase 8 economy; hardcode ~3 slots as a
  variable-length `readonly` array so trait/forge slot-count changes fit later without a retype).
  A spell carries a **target shape** (single / all) and a **target side**; shape is resolved from
  the equipped spell at evaluation time. Phase 2 shipped a **minimal `Spell`** (`{ id,
  targetShape, spellPower, ... }`); the forge/augment/leveling economy is deferred to Phase 8.
  - **Spells carry responses** (Phase 4.1-D, A4). `Spell = { id, name, affinity,
    unlockedAtBiome, targetShape: 'single' | 'aoe', targetSide: 'enemy' | 'ally' (required),
    effects: EffectResponse[] }`. A spell's payload is a list of the **same responses** traits use
    (`deal-damage`, `heal`, `apply-status`, `apply-stat-modifier`, `remove-status`, …), so a
    status-only spell (Silence, Pacify), a cleanse or a drain (Life Siphon) is just data. This
    replaces `payload` / `spellPower` / `scalingStat` / `statModifier` / `appliesStatus` on the
    spell (the damage/heal magnitude fields move onto the responses).
    - A new **`cast-target`** `ResponseTarget` resolves to the current landed target. It never
      appears outside a spell's list (validated at load), and resolving it outside a cast is a
      resolver-invariant error. A landed target that has died gets nothing more from the list
      because no verb acts on a corpse (the response-vocabulary rule), not because of the target
      kind (PR #74 review; the 4.1-D plan had it resolve to nothing).
    - **Effects run once per landed target**, in list order. An `onCast` list (run once per cast)
      is added only when content needs it.
    - **What a spell's list may hold** (validated at load, 4.1-D plan review): `deal-damage` and
      `heal` in formula mode (`offStat` or `scalingStat`, no `magnitudeSource`), `apply-status`,
      `apply-stat-modifier` and `remove-status`, each targeting **`cast-target` or `self`**. A
      `self` effect also runs once per landed target: Life Siphon heals its caster once per target
      it hits. `cast-target` is rejected outside a spell. Other verbs and targets join when content
      needs them.
    - **A spell's damage is cast damage** (PR #74 review). Every `deal-damage` in a spell resolves
      to `damageSource: 'cast'`, so it counts as a cast for `cross-stat` and is logged as one; a
      `scalingStat` damage effect must say so explicitly, since that mode defaults to `'attack'`.
      An `offStat`, when used, is `'cast'`, and an effect sets exactly one magnitude mode. The
      load-time validator checks all three, so a mis-authored spell fails at import, not mid-fight.
    - **The loop-level guards cover the whole list.** B5's pre-hit fizzle and the AOE alive-skip
      skip a landed target's entire list, `self` effects included: Life Siphon heals nothing for a
      target that died in its own pre-hit hooks. A target killed by the list's *own* damage is
      different: the rest of the list still runs (it's atomic), so its `self` effects still run
      (Life Siphon heals for a killing blow), while effects aimed at the corpse land nowhere.
    - **One landed target's list is atomic, like one hit** (4.1-D plan review). The dead-actor
      checks ("An action ends when its actor dies") sit between landed targets and instances,
      never between one target's effects. If a retaliation to the spell's damage kills the caster,
      the rest of that target's list still runs; later targets and instances don't. A `self`
      effect in that remainder lands nowhere, since its target is now a corpse.
    - **Magnitudes read the caster's live stats** when each effect runs, as Attack and every
      response already do (4.1-D plan review). Before 4.1-D the cast path read a caster snapshot
      taken at action start; no golden or corpus fight exercised the difference.
    - An instance's power (the action instance-list's `powerPercent`) scales `deal-damage` and
      `heal` magnitudes only, never statuses or stat-modifiers (matching the Slice E rule).
    - **Byte-identical goldens are a hard requirement** for the migration: every existing spell
      re-expressed as responses must reproduce its events exactly. Any difference is a parity bug.
    - Phase 8 gem augments become "append responses to the spell's list".
    - Rejected: more payload kinds, a payload-union fix alone, spells as trait-like `on-cast`
      carriers, spells as mini-scripts.
  - **Innate spells** (A8) sit in extra slots **before** the regular gem slots; see the Slice F
    addenda.
  - **Defend**: ×1.5 effective Defence (inside the core) **and** a ×0.65 factor in the defender's
    taken pool, until its next turn.
  - **Provoke**: marks the creature provoking until its next turn.
  - **AOE Cast**: target set **frozen at cast-start** (all living enemies, slot order); the whole
    action resolves fully (all `DamageDealt`/`CreatureDied`) **before** win/loss is checked — the
    win-check stays at the action boundary, never inside the per-target loop.
- **Provoke targeting**: single-target offensive actions (Attack / single-target Cast) against the
  enemy side target a **random provoking enemy** (seeded combat RNG, never `Math.random()`) if any
  enemy provokes, else the script's selector. Implement as a **target-set override applied after**
  the action is chosen (narrows targets, doesn't change the action). **Ally-targeting and AOE
  actions are exempt** — AOE always hits its full set.
- **One action pipeline** (Phase 4.1-C, A1). Every action, whatever produced it (a script rule,
  the implicit fallback, a `perform-action` grant, and later Phase 9's manual input), goes through
  `src/engine/actions.ts`:
  - **The intent is rule-shaped:** `{ action: RuleAction, targeting?: TargetSelector }`, the same
    shape a script `Rule` carries, extended with **`gemSlot: 'random'`** (uniformly among the actor's
    castable gems) and a **`'random'` target** (uniformly among valid targets). Script rules pass
    straight in; manual mode builds the same shape.
  - **`'random'` is an intent-only target.** It needs the action's intended side, which only an
    intent has (a rule, the fallback, a grant). A response target (`{ kind: 'selector', selector }`
    on a trait, status, perk or spell response) has no intended side, so `'random'` there is
    **rejected at load time**. That validator lands in 4.1-C2a. `resolveTargetSelector` and
    `targetSelectorHasCandidate` throw on it; only `actions.ts` resolves it.
  - **`checkLegality(actor, intent, state)`** — **pure, draws nothing.** Can the actor take this
    action at all (locks, an empty slot, no castable gem for `gemSlot: 'random'`, no valid target)?
    Used by the interpreter's lookahead and, later, by the UI to grey out illegal choices. "Can't
    act" is read from locks (exact once A3 makes locks passive).
  - **`resolveIntent(actor, intent, state)`** — **the single place action-level random draws
    happen.** Target resolution: explicit selector → **side-aware default** → random; then, for an
    enemy-side single target, **Confusion → Tunnel Vision → Provoke**.
  - **`executeAction`** — the executors (moved out of `combat.ts`).
  - **The effect → action seam is a transient `ResolutionContext { events, cascade, grants, runAction }`**,
    created per top-level action by the action layer and threaded through the resolver. It
    replaces `onEchoCast` and the separate `events`/`cascade` arguments, and it is how a response
    (`perform-action`) queues an action without `resolution.ts` importing `combat.ts`. It is never
    stored in `CombatState`. `fireHook`'s per-call specifics move to an options object.
  - Rejected: patching each source, routing everything through `decideAction`, legality inside
    the executor, an action queue at this stage (4.1-E then adds the grant queue for
    `perform-action`), an import cycle, a global registry, a runner
    stored in state. A single ~1,300-line "resolver core" module was acceptable but scales worse;
    generator/stack-machine resolution only pays off if players make choices mid-cascade, which the
    design doesn't have.
- **Default targeting is side-aware; the engine never forbids a side** (Phase 4.1-C, B1). A rule's
  `targeting` is **optional**. When it is missing, the target defaults by the action's **intended
  side**: `lowest-hp-enemy` for Attack and enemy-side spells, `lowest-hp-ally` for ally-side
  spells; the implicit fallback's Attack gets the same default. **Explicit targeting always wins**,
  including cross-side: a future status like "healing
  hurts this creature" would make healing an enemy a real tactic, so the engine resolves an
  explicit selector literally. `targetSide` therefore means **the side a spell is meant for**: it
  drives the default target, and for AOE it decides which whole side is hit. Phase 6's editor shows
  a **warning** (not a block) on cross-side targeting. `always-cast` drops its explicit selector,
  which fixes enemy support casters healing and buffing the *player* (review finding B1). The side
  default is the engine's built-in fallback only; a script-level override is a Phase 6 decision.
  A rule without targeting uses this default target everywhere a rule's target is read, including
  the `acted-before-target` condition's lookahead peek (pure, no RNG; 4.1-C plan review).
  - **The default comes from the resolved action** (4.1-C2b plan review). For a
    `gemSlot: 'random'` cast, the gem is drawn first, and the default target follows the drawn
    spell's side.
  - **No single default, no peek.** In lookahead, before any draw, a `gemSlot: 'random'` rule
    with no targeting has no default target, and neither does an AOE or a self-only rule. So
    `acted-before-target` on such a rule is **false**.
  - **Where the peek happens.** The interpreter supplies the default to the condition, so
    `conditions.ts` never imports `actions.ts`. That import would be a cycle, because
    `resolution.ts` imports `conditions.ts`.
- **Every action source obeys the same rules** (Phase 4.1-C, B2):
  1. A creature whose turn is skipped (an `'all'` lock: Stun, Sleep) takes **no action of any
     kind** that turn, granted ones included. Passive turn-end effects still fire. This holds even
     if the lock is gone by the granted-actions step, for example cleansed by a turn-end hook, or
     by an earlier grant in the turn-start drain (PR #79 review). A skipped turn stays skipped. A
     chance-based grant still **rolls** its chance first, so the RNG stream doesn't depend on the
     skip; only then is the grant refused.
  2. **An active lock refuses every action it covers, chosen or granted, whenever the action is
     checked** (4.1-C2b plan review). So **Silenced blocks every cast**, and an `'all'` lock that
     lands mid-turn also refuses that turn's granted actions. Clear Mind immunity applies as
     usual.
     - `runAction` calls `checkLegality` before `resolveIntent` for every source. A refused action
       **draws nothing**, and that includes the gem draw.
     - The locks checked are **the acting creature's**. For an echo that's the caster. The bearer
       of the granting effect is not the one acting: its trigger is passive, so its own locks
       don't gate it.
     - **A refused granted action emits nothing of its own** (4.1-C2c plan review). The trigger
       that granted it still shows its `TriggerFired`. There is no grant event (`ActionGranted`)
       and no action event. This is the same shape as a grant
       that fizzles for want of a castable gem or a valid target.
  3. Extra actions pick a target (the side-aware default, or random where the intent says so),
     then go through Confusion → Tunnel Vision → Provoke like any action.
  4. When a single-target instance list's first target has died, later instances fall back to the
     side-aware default, then Provoke (the Brute starter's second hit).
- **A hit on a target that died during its own pre-hit hooks fizzles** (Phase 4.1-C, B5).
  `on-attack` / `on-cast` / `on-action-observed` fire **before** an instance's hit, and several
  real traits deal damage there. After an instance's pre-hit hooks, the target is re-checked: if it
  died, **that hit fizzles** (no damage, no status, no payload, no second `on-damage-dealt`, and no
  Splashing hits for that instance). The instance's `AttackDeclared` / `SpellCast` has already been
  emitted and stays in the log; there is no separate fizzle event. Later instances fall back per
  rule 4 above. AOE already skips dead members.
- **An action ends when its actor dies** (Phase 4.1-C2c, PR #73 review). A creature can die inside
  its own action: a retaliation (`on-damage-taken` → `deal-damage` on the triggering source) after
  one of its hits, or a response nested in its own pre-hit hooks (an echo whose hit is retaliated
  against). The actor is re-checked at four points:
  1. the start of each instance, before target resolution and before `AttackDeclared` /
     `SpellCast`;
  2. after each instance's pre-hit hooks, before the hit or payload;
  3. before each Splashing hit;
  4. before each AOE member's hit.

  If the actor has died, the rest of the action is dropped: no further events from it, and no
  fizzle event. Events already emitted stay. This is the actor's mirror of "death pre-empts the
  victim's reaction" (hook interaction edges). A granted action already checks that its actor is
  alive when it starts. The checks sit **between hits, never inside one**: a spell's effect list
  for one landed target runs to completion (4.1-D), and any of its effects aimed at the dead
  caster land nowhere (no response acts on a corpse).
- **Event log**: two families. **Intent events** — a discriminated union on action kind, one
  variant per action, each carrying only its own fields (`AttackDeclared { attackerId, targetId }`,
  `SpellCast { casterId, gemSlot, targetId | targetIds }`, `Defended`/`Provoked`/`Waited`) —
  **always emitted, including no-consequence actions like Wait** (complete turn-by-turn log).
  **Consequence events** — separate and shared across all sources (`DamageDealt { sourceId,
  targetId, rawDamage, finalDamage, affinityMultiplier, wasChipOnly, remainingHp, damageSource:
  'attack'|'cast'|'dot' }` — `damageSource` is **required** as of Phase 3 (Phase 1/2 goldens
  consciously field-added), `CreatureDied { creatureId }`; the set **grows** in Phase 3 with shared
  `StatusApplied` / `StatusExpired` / `StatModifierApplied` (source, target, stat, factor, effective
  delta) / `HealApplied` (Regen) / `HpClamped` (currentHp reduced when effective max Health drops
  below it — neither damage nor heal); DoT ticks reuse `DamageDealt`). Consequences are
  never nested in intents (a poison tick and an Attack both reuse `DamageDealt`; an AOE Cast = one
  `SpellCast` intent followed by N `DamageDealt`). Plus the Phase 3 trigger-intent event
  `TriggerFired` (precedes a trigger's consequences) and the loop-safety `CascadeTruncated`
  (mandatory when the cascade cap truncates a chain). Phase 4.1 adds **`ActionStateEnded`**
  (turn-start cleanup ends defending/provoking, 4.1-C), **`TurnSkipped { creatureId, effectId }`**
  (an `'all'` action-lock skips the turn, 4.1-F) and **`ActionGranted { sourceId, actorId, effectId
  }`** (a `perform-action` grant succeeded, 4.1-E, replacing `EchoCastGranted`). Their families
  (PR #70 review): `ActionStateEnded` is a **consequence** (a state ending, like `StatusExpired`);
  `TurnSkipped` is an **intent** (it fills the turn's action slot, like `Waited`); `ActionGranted`
  is an **intent** (it precedes the granted action, like `TriggerFired`). Plus lifecycle:
  `FightStarted`, `RoundStarted { round }`, `TurnStarted { creatureId }`, `TurnEnded { creatureId }`,
  `FightEnded { result }`. **`TurnStarted`/`TurnEnded` are real log events, not just internal hook
  checkpoints** — they give playback (§ROADMAP Phase 7) an explicit, unambiguous turn boundary to
  key off, rather than inferring one from the next intent event (which breaks down for Wait or any
  no-op turn). **Flat chronological array**; events reference creatures by **id + key inline
  values** (e.g. `remainingHp`), not snapshots; **descriptive narration, not event-sourcing** (state
  is returned alongside, authoritative).
- Manual mode swaps the *action source* (UI input) for the same resolver. Do not fork the
  combat code path. Concretely: the UI builds the same rule-shaped intent and submits it through
  the action pipeline (A1), and uses `checkLegality` to grey out illegal choices.

### Fight setup (Phase 4.1-B, S1)
- **`createCombat({ seed, player: { party, effects }, enemy: { party, effects }, registries })`.**
  Named inputs, because two same-typed positional lists (player effects, enemy effects) can be
  swapped silently. The per-side `effects` are the side-wide effects: **perks** for the player now;
  biome or boss effects for either side later. **Each side's `effects` apply to exactly that side's
  creatures** (the input list decides the side), and a creature whose own `side` doesn't match the
  list it was passed in is a thrown error. `registries` bundles scripts, traits and statuses; its
  fields may be omitted (empty registries), but **a creature's trait id missing from the trait
  registry throws** — fight setup never silently skips a trait (Phase 4.1-B review, PR #69).
- **Fight setup takes fresh creatures only.** An input creature that already carries setup output
  (non-empty `baselineEffects` or `activeEffects`, i.e. one taken from a previous `CombatState`)
  is a thrown error: setup derives everything from `innateTraitIds` + side effects, and re-feeding
  a set-up creature would double its innate spell slots.
- **Each creature stores its resolved starting effect list, `baselineEffects`**, at fight setup:
  innate traits → side effects → (Phase 8) equipment infusions, in the canonical effect order.
  **`revive` restores exactly that list** (death-reset). `CombatState.traits` and
  `CombatState.playerWideEffects` are removed; the state no longer needs to re-derive anything
  mid-fight.
- Golden-neutral.

## To fold

- **Action instance-list (locked, resolves the "attack again" ambiguity)** — an Attack or Cast
  resolves as a **list of instances, each carrying a power %**, assembled **once, up front**,
  from the acting creature's active count/power modifiers, before any instance resolves: base
  `[100%]`; "an additional time" appends `[100%]`; "attack again for 30%" appends `[30%]`; both
  together = `[100%, 100%, 30%]` (linear composition — an "additional time" never re-multiplies
  another entry). The executor then **runs the list**: each entry is a **real action instance**
  (fires `on-attack`/`on-cast` and everything downstream, per instance) — nothing is spawned
  mid-resolution, so there is no trigger, no re-entrancy, and no loop-guard involved. This is
  what distinguishes "attack again for X%" (an instance in the list, fires `on-attack`) from
  "deal damage equal to X% of Attack" (a plain `deal-damage` response — not an attack, fires
  nothing) — the wording is the signal.
  **Built in Phase 4 Slice B as a new passive `EffectDef` category** (the brief's own prose named
  the mechanism but not its authoring shape — this decision filled that gap and is now **locked**;
  Slice F's Echo/Flurry/Brute-starter perks author against it unchanged):
  `{ category: 'action-instance', actionKind: 'attack' | 'cast' | 'both', powerPercent: number }`,
  structurally identical to `armor-penetration`/`cross-stat` (permanent-for-fight, additive across
  stacked sources — each matching effect appends exactly one instance, gathered in canonical
  active-effects order via `gatherExtraInstances`). "An additional time" = `{ actionKind: 'attack',
  powerPercent: 100 }`; "attack again for 30%" = `{ actionKind: 'attack', powerPercent: 30 }`.
  **`powerPercent` is a flat number by design, not a `magnitudeSource` (Slice D).** No locked or
  backlog content scales the *number* or *power* of instances off combat state — Phase 4's
  count-scaling (Swarmhive Striker, Bulwark) is always a *magnitude*, a separate axis served by
  `magnitudeSource`. The trigger to revisit this is the first content item that grants a scaled
  instance count or power; if that arrives, grow this category an optional `magnitudeSource` field
  *alongside* `powerPercent` (additive, per the Slice D magnitudeSource-beside-flat pattern) — never
  a parallel mechanism.
- **Support-spell model** — extend the offensive-only Spell so a spell may target **ally/self**
  (single **or** all-allies AOE, mirroring the enemy side), and its payload may be a **heal**
  (restore HP), a **timed status**, or a **stat-modifier** (a permanent-for-the-fight buff/debuff).
  Applying a stat-modifier is new — spells currently carry only `appliesStatus`. (Buff/stat-debuff =
  stat-modifier, permanent-for-fight; Weaken/Vulnerability etc. = timed statuses — existing
  categories, unchanged.) **Built in Phase 4 Slice E** as `Spell.targetSide?: 'enemy' | 'ally'`
  plus `Spell.payload`/`statModifier`/`appliesStatus`. **Superseded by Phase 4.1-D (A4, see
  "Spells carry responses" under Combat & scripting):** a spell's payload becomes a list of
  ordinary responses (`Spell.effects: EffectResponse[]`) and `targetSide` becomes **required**; the
  `payload`/`statModifier`/`appliesStatus` fields are deleted. The rules below about the ally side
  and the override pipeline stay exactly as written. `'ally'` exempts the cast from the ENTIRE
  Provoke/Confusion targeting-override pipeline (`resolveOffensiveTarget`/
  `shouldRedirectAoeToAllies`) — not just Provoke, which is all GAME_DESIGN §7's own text names —
  and draws **zero** RNG for targeting as a result (**design-owner-confirmed**, not just Provoke:
  Confusion's roll is scoped to a bearer's "harmful action" per this doc's own Confusion entry, and
  a support cast on one's own side is definitionally never one, so there is nothing to redirect).
  History: Slice E's stat-modifier payload carried an authored `{ stat, factor }` on the spell, and
  its heal/stat-modifier payloads called `applyHeal`/`applyStatModifier` directly from the Cast
  executor. Since 4.1-D these are ordinary `heal` / `apply-stat-modifier` responses in the spell's
  list, run through `executeResponse` directly. What carried over unchanged: an authored buff's
  `factor` is a balance constant, never scaled by an instance-list's `powerPercent`, and no spell
  effect emits `TriggerFired` (Cast is the chosen-action context, not a trigger).
- **The stat a spell's magnitude scales off** lives on the spell's `deal-damage` / `heal` response
  from A4 (4.1-D), not on the spell: `offStat: 'cast'` for the default (remap-aware Intelligence),
  or `scalingStat` (`Intelligence | Health | Attack | Defence | Speed`, read directly, no remap). A
  pure-utility spell (status only, a cleanse) simply has no `deal-damage` / `heal` effect. The old
  `scalingStat: 'none'` is gone (4.1-D plan review: no content used it). See GAME_DESIGN §5.

- **Armor penetration** — a damage-calc parameter: ignore X% of the *target's* Defence.
- **Cross-stat contribution** — a value may add to an **attack's *or* a spell's** damage *on top of*
  that action's own scaling stat. General model: every damage source has a base scaling stat
  (attack→Attack, spell→its `scalingStat`); cross-stat contributions layer **additively** on top,
  regardless of source. (Shield Bash: Defence→attacks & spells; Aggressive Caster: Attack→spells.
  Composes with armor-pen: pen cuts the *target's* Defence, cross-stat adds the *attacker's* — no
  conflict.)

- **adjacency targeting** — `adjacentLivingTargets(target, party)`: slot-order neighbors within the
  **alive-filtered** list (living-adjacency, not raw slot-index adjacency — a dead slot-neighbor
  would make Splashing whiff for no player-visible reason). **Built in Phase 4 Slice C**
  (`targeting.ts`), consumed by Splashing's executor-level recompute (`combat.ts`'s
  `executeAttack`/`executeCastSingle`, after the main hit resolves, computed against
  pre-main-hit state so the main target is still findable in the alive-filtered list).
- **targeting-override** — `resolveOffensiveTarget`'s pipeline, in this pinned order (**Phase 4
  Slice C**): **(1) Tunnel Vision** (`{ category: 'provoke-immunity' }`, a permanent passive) —
  bypasses **only the Provoke step** (step 3), never Confusion: a confused Tunnel-Vision creature
  still rolls Confusion. So the pipeline evaluates Confusion first and, if it doesn't redirect,
  skips straight to normal resolution for a provoke-immune actor (ignoring enemy Provoke). **(2) Confusion** — a
  `chancePercent` roll off a passively-read status effect (built in Slice C as the `StatusDef`
  category `friendly-fire-status`; **Phase 4.1-F** re-expresses it as a passive `friendly-fire {
  chancePercent }` effect inside the Confusion status, same behaviour); checked BEFORE Provoke, so a
  confused actor's roll can redirect to its own side regardless of an enemy provoker. **(3)
  Provoke** (existing, unchanged). **Phase 4.1-C moves this pipeline into the action layer**
  (`resolveIntent`, see "One action pipeline"), where it applies to **every** action source, not
  only scripted ones. AOE Cast has its
  own separate one-roll-per-instance Confusion check (`shouldRedirectAoeToAllies`) since it never
  goes through `resolveOffensiveTarget` (Provoke is exempt for AOE for the same reason) — one roll
  decides whether the WHOLE frozen target set flips to the caster's own living side, never a
  per-target coin flip.
