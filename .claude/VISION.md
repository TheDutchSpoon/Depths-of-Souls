# Depths of Souls — Game Design Document

Read this when designing a feature.

A web-based incremental game. The entire game takes place in **a single endlessly descending
cave** — *the Depths* — where the player collects creature **souls**, fuses them, and descends
ever deeper. Combat is automatic; the player's primary influence is **scripting creature
behavior**. Manual turn-based control is a secondary, optional mode.

> This document is the source of truth for *what* the game is. Implementation rules live
> in the other files in `.claude/`. When this document and code disagree, this document
> wins until it is deliberately revised.

---

## 1. Vision

The player assembles a party of creatures, fuses and customizes them, and then writes
**behavior scripts** that decide what each creature does each turn. Combat runs itself.
The fun loop is *observe → diagnose → rescript → re-fight*, not *click attack*. Power comes
from understanding the systems and writing better scripts, not from manual reflexes.

The incremental layer comes from:
- **Endless descent**: the cave goes down forever and gets harder forever; you descend until
  your party can't, then strengthen and push deeper.
- A fusion economy that compounds (recombining creatures into stronger ones).
- **Biomes**: the cave changes biome every 10 floors (10 biomes in v1), each with its own
  creatures to encounter and collect (biomes spawn species; each species has multiple creatures).
- **Facilities** built at the cave entrance that grant permanent upgrades and services.
- Many small multiplicative bonuses (traits, gem augments, equipment infusions, spec perks) that
  stack.

**Scope note — start-of-beta baseline.** Everything in this document describes the **start-of-beta
build**: the state the game is in when beta *opens*, produced by ROADMAP phases 0–10. It is *not* a
feature-complete release. Post-beta content — biomes 11+, deeper per-species rosters,
post-floor-100 endgame, further specializations — is deliberately outside this baseline and ships
*during* beta. Throughout these docs, **"v1" means this start-of-beta baseline.**

## 2. Design pillars

1. **Scripting is the game.** Every meaningful decision is expressible as a rule the
   player configures. If a tactic can only be done by manual clicking, reconsider it.
2. **Automation, not idleness.** The game plays combat automatically, but the player is
   actively engaged in *tuning* — not just waiting for numbers to rise.
3. **Legible systems.** A player should be able to reason about *why* something happened.
   Combat is deterministic given the same seed, party, and scripts (see DETERMINISM).
4. **Compounding builds.** Progression is about discovering synergies that multiply, not
   linear stat increases.
5. **No backend.** Everything runs client-side. Saves are local with manual export/import.

## 3. Core loop

```
Descend a cave floor  ->  Auto-battle the floor's creatures  ->  Earn XP & drops
        ^                                                                  |
        |                                                                  v
   Push deeper  <-  Party can go on  <-  Rescript & recustomize  <-  Spend resources
        |                                                                  ^
        v (party too weak)                                                 |
   Return to entrance  ->  Use facilities (fuse / heal / store)  ----------+
```

Depth is **persistent** — there is no run that resets. You hold the deepest floor you've
reached; descending is gated only by whether your party can survive the next floor. When it
can't, you go back up, strengthen (fuse, level, rescript, build/upgrade facilities), and
descend again past the wall.

Short loop (seconds–minutes): fight a floor's creatures, watch scripts execute, collect XP.
Medium loop (a session): descend until you hit a wall, return to the entrance, rescript and
re-gear, push past it.
Long loop (many sessions): discover biomes, build out facilities, and deepen builds to
descend ever further.

## 12. Explicit non-goals (for now)

- No multiplayer, no server, no accounts.
- No real-money anything.
- No real-time/twitch combat — it's resolved turn-based even when fast-forwarded.
- No free-text scripting language in v1 (UI-driven rules only).
- **No prestige / no resets** — progression is forward-only.

