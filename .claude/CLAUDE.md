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
creature, fixed; **linear** growth derived from base, no growth field: level-N =
`base × (1 + 0.25 × (level−1))`). Damage (Attack & Cast): `effOff = getEffectiveStat(remap(off)) ×
spellPower` (spellPower 1.0 for Attack, a spell property, scales OffStat pre-Defence), then
`(MAX(effOff − effDef, 0) + 0.01×effOff) × Affinity × (1 + Σ dealtMods) × Π(takenFactors)`, then
`MAX(1, floor(...))` — subtractive core + unconditional 1% chip floor, **integer, min-1 damage**;
**Affinity** standalone ×1.25/×0.75/×1.0; **dealt pool additive**, **taken pool multiplicative**
(no immunity/clamp); stats read via `getEffectiveStat` (base immutable); no Additional channel,
**no variance, no baseline crits**, fully deterministic. One round = each living creature acts
once in Speed order (frozen round-start queue; ties: player→slot→id). Actions:
**Attack, Cast, Defend, Provoke, Wait** (Defend = Defence×1.5 + ×0.65 in taken pool; Provoke until
next turn; Cast picks a gem *slot index*, no cost, spell carries target-shape + spellPower).
**Scripting** (the game's heart): pure interpreter `decideAction(creature, script, state)` walks a
creature's ordered rules, first valid match wins (invalid action → skip); `Condition`/`TargetSelector`
are discriminated unions; HP% via integer cross-multiplication; enemies run the same system (stock
scripts). Affinities (domain of being): **Body, Spirit, Mind,
Void, Primal**, cycle **Body > Spirit > Mind > Void > Primal > Body**. Incremental power lives
in the **build-modifier pools/effective stats**, not levels. **Unified effect framework**: traits,
statuses, gem augments, artifact infusions are ONE data-driven hook-based model (4 categories:
stat-modifier, stat-remap, damage-modifier, condition-status) with loop safety
(self-re-entry prevention + `MAX_TRIGGER_CASCADE_DEPTH`). **Three-tier creatures**: **species**
(a group of creatures; biomes spawn species; intra-species traits synergize) → **creature** (the
unit: affinity + base stats + 1 innate trait) → **instance** (owned copy). No "class" concept —
affinity is the only such axis. Obtained via **souls** (tracked **per creature**, 100% =
permanent summon); 1 starter from your spec; unlimited roster, 6-slot party. **Gems** (spells,
leveled via Essence, augment slots) and **artifacts** (stat-focused, leveled via Ore, infusion
slots) share the effect framework. **Fusion** (Fusion Chamber, Lifeforce, species-agnostic):
once per creature, both inputs consumed, result = parent-1 identity + parent-2 affinity +
**averaged base stats** + both traits, level 1, catch-up-levelable up to your highest. Scripts:
**templates**, **one condition per rule** (no AND/OR), ordering = logic. Specs:
**Sorcerer/Brute/Shieldbarer** (gems/Cast, Attack, Defence-tank), perks bought with
**perk points** (100/first-boss-kill, 1000 = one maxed spec at floor 100, refund-on-swap).
Currencies: **Essence** (gems), **Ore** (artifacts), **Bricks** (facilities), **Lifeforce**
(fusion+leveling), **perk points**. Facilities (built w/ Bricks): Gem Forge, Artifact Forge,
Fusion Chamber, Soul Altar, Storage, Biome Atlas. World: a single **cave**; **HP resets every
fight**; difficulty = enemy stats scaling faster than the party; **depth is persistent** (wipe →
hub, fast-travel to any floor up to deepest). **Biome changes every 10 floors** (**10 in v1**,
>3 species/biome, >6 creatures/species ≈180+ total; specific creature = rarity-weighted RNG;
boss every 10th floor, non-collectable). **No prestige, no resets**
— forward-only.

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
  engine/      pure TS: combat resolver, scripting interpreter, RNG, scaling. No React.
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
`.claude/phases/` = records of what was **built** (written after the fact, one per phase).
`.claude/briefs/` = forward-looking task **briefs** — the plan/reasoning/guardrails handed to the
coding agent *before* work starts. Briefs are **kept** as historical artifacts (intent), not
deleted; each carries a `Status:` line (`planned` → `shipped — see phases/<record>.md`) so a past
plan is never mistaken for current truth. Together: `briefs/` = what we intended, `phases/` = what
we built.

## Working agreement

- Prefer small, typed, tested units. The engine especially should have unit tests because
  it's pure and deterministic — that's the whole point.
- When a design question from GAME_DESIGN §13 is unresolved, build against placeholder data
  and a clean interface rather than hard-coding an answer. Flag the assumption.
- Don't introduce a backend, a new framework, or a second state library without saying so.
- Keep balance numbers in `data/`/config, never as literals in engine logic.
