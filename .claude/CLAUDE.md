# CLAUDE.md

Project memory for Claude Code. Read this first. Keep it short; link out for detail.

## What this project is

A web-based **incremental game**, *Depths of Souls*. The world is **one endlessly
descending cave**: the player delves floor by floor, can never leave, and builds **facilities**
at the entrance to support deeper expeditions. Combat is **automatic** and **6v6** (all six
per side active at once; fewer early game until you've collected six); the player's main lever
is **scripting creature behavior** via reusable **script templates** (priority rules à la
FFXII Gambits). Manual turn-based combat is a secondary, optional mode that reuses the same
engine. No backend — everything is client-side, statically deployed.

Key fixed facts: stats are **Health, Attack, Intelligence, Defence, Speed** (base 10–30 per
creature, Health 20–45 (4.1), fixed; **linear** growth derived from base, no growth field: level-N =
`round(base × (1 + 0.25 × (level−1)))`). Damage (Attack & Cast): `effOff = getEffectiveStat(remap(off)) ×
spellPower` (spellPower 1.0 for Attack, a spell property, scales OffStat pre-Defence), then
`(MAX(effOff − effDef, 0) + 0.01×effOff) × Affinity × (1 + Σ dealtMods) × Π(takenFactors)`, then
`MAX(1, floor(...))` — subtractive core + unconditional 1% chip floor, **integer, min-1 damage**;
**Affinity** standalone ×1.25/×0.75/×1.0; **dealt pool additive**, **taken pool multiplicative**
(no immunity/clamp); stats read via `getEffectiveStat` (base immutable, **stat-modifiers fold
multiplicatively `base×Π(factors)`** — uncapped, never-zero, permanent-for-fight, shown as effective
stat not as a status). That is **direct** damage (an Attack or Cast action from any source),
which adds a fading **Additional** after the floor, `min(floor(0.2×target maxHP), max(0, 10 −
(attackerLevel − 1)))`, modified by nothing; every other damage (trait/status/perk responses, DoT
ticks) is **indirect**: `MAX(1, floor(magnitude × Affinity × (1+Σdealt) × Π(taken) − 0.2×Def))`,
no chip, no dealt pool on a DoT tick; a creature's own response damaging itself is an exact
**cost** instead (4.1). **No variance, no baseline crits**, fully deterministic. One round = each
living creature acts once in Speed order (frozen round-start queue; ties: player→slot→id). Actions:
**Attack, Cast, Defend, Provoke, Wait** (Defend = Defence×1.5 + ×0.65 in taken pool; Provoke until
next turn; Cast picks a gem *slot index* or a random castable gem, no cost; a spell carries
target shape + intended side + a list of ordinary responses (4.1)). **Every action, from any
source (script, fallback, trait grant, later manual mode), goes through one pipeline**
(`checkLegality` pure / `resolveIntent` draws; locks, side-aware default target, Confusion → Tunnel
Vision → Provoke) (4.1).
**Scripting** (the game's heart): pure interpreter `decideAction(creature, script, state)` walks a
creature's ordered rules, first valid match wins (invalid action → skip); `Condition`/`TargetSelector`
are discriminated unions; rule targeting is optional (default = lowest-HP creature on the action's
intended side; explicit always wins, cross-side allowed); HP% via integer cross-multiplication;
enemies run the same system (seven **role scripts**: striker/guardian/warden/caster/support/opener/taunter,
4.1). Affinities (behavioral drive, soft-mapped to HP/Atk/Int/Def/Spd resp.): **Vitality, Violence, Wit,
Endurance, Instinct**, cycle **Vitality > Violence > Wit > Endurance > Instinct > Vitality**. Incremental power lives
in the **build-modifier pools/effective stats**, not levels. **Unified effect framework**: traits,
statuses, gem augments, equipment infusions are ONE data-driven hook-based model: carriers holding
the same `EffectDef[]` (a status = a timed, single-instance container of effects, 4.1; no
stat-modifier inside a status, validator-enforced). Hooks: 17-hook
vocab (Phase 4's 16 — Phase 3's 13 + the `on-[action]` family on-attack/cast/defend/provoke;
`on-action-observed` replaced the never-wired on-ally-/on-enemy-action pair — plus `on-damage-observed`, 4.1), fired via `effectsForHook` (scoped iteration, shared per-creature effect order), reusing
action machinery; a **`TriggerFired`** event precedes triggered consequences; an effect fires only
if its exact instance still exists (unique per-fight instance ids, 4.1). **Traits** =
`{id,name,effects[]}` — passive (incl. conditional via a data `SelfCondition`, 4.1) + triggered
(`{hook,condition?,chancePercent?,response}`; eight responses after 4.1: deal-damage/apply-status/
apply-stat-modifier/heal/revive/grant-action-state/remove-status/perform-action —
the rule is **"no side doors"**: every triggered behaviour is a response; explicit targets, no
keywords). A granted action (`perform-action`) runs after the granting action completes (actions
are atomic). **"attack"/"cast" in a trait/spell mean the real actions** (full formula, direct
damage; 4.1). **Turn** (4.1): TurnStarted → turn-start hooks → start cleanup (defend/provoke
end) → turn-start grants → action (or `TurnSkipped`) → the action's grants → turn-end hooks (DoT
ticks) → granted actions → end cleanup (bearer's status timers count down; Web roll) →
TurnEnded. **Statuses**: durations count the
**bearer's own turns** (4.1), born-this-turn rule (4.1), **Stun = a status with an
`action-lock`** (4.1), **no stacking** (one instance; re-applying keeps the stronger value and
refreshes the timer), **DoT/Regen tick from the applier's stat snapshot** (4.1). **Loop safety**:
instance-level stack-scoped self-re-entry guard + `MAX_TRIGGER_CASCADE_DEPTH=500` (chain depth) +
mandatory `CascadeTruncated`; depth transient; revives capped at 10 per creature per fight (4.1).
**`CombatState` is plain data** (RNG = a stream-position bookmark; snapshots never mutated, 4.1).
**Three-tier creatures**: **species** (a group of creatures; biomes spawn species; intra-species
traits synergize) → **creature** (the unit: name + affinity + base stats + 1 innate trait + role,
4.1) → **instance** (owned copy: stores source/recipe, level, XP, script, rolled gem set; everything
else derived, 4.1). No "class" concept — affinity is the only such axis. Obtained via **souls**
(tracked **per creature**, 100% = permanent summon; free, ungated until Phase 8, 4.1); 1 starter
from your spec + the Unicorn; unlimited roster, 6-slot party; target: a full party within the first
session (4.1). **Gems** (spells [each has an **affinity**; equippable only on a matching-affinity
creature], leveled via Essence, augment slots) and **equipment** (stat-focused, leveled via Ore,
infusion slots) share the effect framework. **Fusion** (Fusion Chamber, Lifeforce,
species-agnostic): once per creature, both inputs consumed, result = parent-1 identity + parent-2
affinity + **averaged base stats** + both traits, level 1, catch-up-levelable up to your highest.
Scripts: **templates**, **one condition per rule** (no AND/OR), ordering = logic. Specs:
**Sorcerer/Brute/Shieldbarer** (gems/Cast, Attack, Defence-tank), perks bought with **perk points**
(100/first-boss-kill, 1000 = one maxed spec at floor 100, refund-on-swap). Currencies: **Essence**
(gems), **Ore** (equipment), **Bricks** (facilities), **Lifeforce** (fusion+leveling), **perk
points**. Facilities (built w/ Bricks): Gem Forge, Equipment Forge, Fusion Chamber, Soul Altar,
Storage, Biome Atlas. World: a single **cave**; **HP resets every fight**; difficulty = enemy stats
scaling faster than the party; **depth is persistent** (wipe → hub, fast-travel to any floor up to
deepest). **Biome changes every 10 floors** (**10 in v1**, ≥6 species/biome, ≥3 creatures/species
≈180+ total; specific creature = rarity-weighted RNG; boss every 10th floor, non-collectable). **No
prestige, no resets** — forward-only.

Items marked **(4.1)** were decided at the Phase 4 close review and landed during Phase 4.1 (see
ROADMAP).

Full design: `.claude/GAME_DESIGN.md`. Read it before designing features.

## Tech stack

- **TypeScript** (strict) — non-negotiable; types are the contract we build against.
- **React** + **Vite** — reactive UI over a game-state store; Vite for dev + static build.
- **State**: a single typed store (Zustand recommended; pick once, don't mix).
- **Persistence**: **saves are large** — IndexedDB (via `idb`/Dexie) is the **primary**
  store; `localStorage` only for tiny things (settings). Versioned save format with
  migrations; manual export/import to file. Avoid serializing one giant blob per autosave.
- **Deploy**: static host (GitHub Pages / Netlify / Cloudflare Pages) via `vite build`.
- **No backend, no accounts, no network calls in gameplay.**

## Architecture in one breath

The **combat engine is pure and framework-agnostic** — plain TypeScript, no React, no DOM,
no `Date.now()`, no `Math.random()` (use a seeded RNG). React only *renders* state and
*dispatches* intents. This separation is the most important rule in the project: it makes
combat deterministic, testable, and replayable. Do not import React into engine code.

```
src/
  engine/      pure TS: combat resolver, scripting interpreter, RNG, scaling, cave generation. No React.
  data/        creatures, traits, spells, biomes, facilities as data. No logic.
  state/       the store; save/load; migrations.
  ui/          React components. Renders state, dispatches intents. No game rules here.
  app/         wiring, routing, game loop tick.
```

## The rules that matter most

1. **Determinism**: same (party + scripts + seed) -> same outcome, always. Seeded RNG only.
2. **Data over code**: creatures, traits, spells, balance numbers are *data*. Adding
   content should not mean editing the engine. New trait = new data entry (+ maybe one
   reusable effect primitive).
3. **Engine purity**: no React/DOM/wall-clock/global-random inside `src/engine`.
4. **Scripting is serializable data**: the player's rules are JSON-shaped, saved & replayable.
5. **Versioned saves**: every save has a version; add a migration when the shape changes.

Detailed conventions: `.claude/CONVENTIONS.md`.
Roadmap & what to build first: `.claude/ROADMAP.md`.
How slices get built & reviewed (fresh chat per step; docs-are-the-memory; the per-slice
mailbox and its commands): `.claude/WORKFLOWS.md` — read before starting or reviewing any slice.
`.claude/phases/<phase>/` = one folder per phase: `brief.md` (what we **intend**, written before
work starts) and `record.md` (what was **built**), plus one folder per slice holding its brief,
kickoff, plan, reviews, reports and record. Briefs are kept as historical artifacts, never deleted;
a slice's `record.md` existing is what marks it shipped. Phase 4.1 was the transition: its brief and
record (`briefs/phase-4.1-implementation-plan.md`, `phases/phase-4.1-fix-and-consolidation.md`)
moved unchanged to `phases/4.1/brief.md` and `phases/4.1/record.md` when it closed. Phases 0–4 live untouched in
`.claude/archive/` — history, never current truth.

## Working agreement

- Prefer small, typed, tested units. The engine especially should have unit tests because
  it's pure and deterministic — that's the whole point.
- When a design question from GAME_DESIGN §13 is unresolved, build against placeholder data
  and a clean interface rather than hard-coding an answer. Flag the assumption.
- Don't introduce a backend, a new framework, or a second state library without saying so.
- Keep balance numbers in `data/`/config, never as literals in engine logic.
