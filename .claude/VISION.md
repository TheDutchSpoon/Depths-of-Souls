# Depths of Souls — Vision

Read this when designing a feature.

A web-based incremental game. The entire game takes place in **a single endlessly descending
cave**, *the Depths*, where the player collects creature **souls**, fuses them, and descends ever
deeper. Combat is automatic; the player's primary influence is **scripting creature behavior**.
Manual turn-based control is a secondary, optional mode.

## Vision

The player assembles a party of creatures, fuses and customizes them, and then writes **behavior
scripts** that decide what each creature does each turn. Combat runs itself. The fun loop is
*observe → diagnose → rescript → re-fight*, not *click attack*. Power comes from understanding the
systems and writing better scripts, not from manual reflexes.

The incremental layer comes from:

- **Endless descent**: the cave goes down forever and gets harder forever; you descend until your
  party can't, then strengthen and push deeper.
- A **fusion** economy that compounds (recombining creatures into stronger ones).
- **Biomes**: the cave changes biome as it descends, each with its own creatures to encounter and
  collect (`spec/run.md#biomes`).
- **Facilities** built at the cave entrance that grant permanent upgrades and services.
- Many small multiplicative bonuses (traits, gem augments, equipment infusions, spec perks) that
  stack.

### v1 is the start-of-beta baseline

- The design describes the **start-of-beta build**: the game when beta *opens*, produced by ROADMAP
  phases 0–10. It is *not* a feature-complete release. Post-beta content (biomes 11+, deeper
  per-species rosters, a post-floor-100 endgame, further specializations) is deliberately outside
  it and ships *during* beta. Throughout the docs, **"v1" means this baseline.**

## Design pillars

1. **Scripting is the game.** Every meaningful decision is expressible as a rule the player
   configures. If a tactic can only be done by manual clicking, reconsider it.
2. **Automation, not idleness.** The game plays combat automatically, but the player is actively
   engaged in *tuning*, not just waiting for numbers to rise.
3. **Legible systems.** A player can reason about *why* something happened. Combat is
   deterministic given the same seed, party and scripts (`CONVENTIONS.md#combat-is-reproducible-from-its-inputs`).
4. **Compounding builds.** Progression is about discovering synergies that multiply, not linear
   stat increases.
5. **No backend.** Everything runs client-side. Saves are local, with manual export and import.

## Core loop

```
Descend a cave floor  ->  Auto-battle the floor's creatures  ->  Earn XP & drops
        ^                                                                  |
        |                                                                  v
   Push deeper  <-  Party can go on  <-  Rescript & recustomize  <-  Spend resources
        |                                                                  ^
        v (party too weak)                                                 |
   Return to entrance  ->  Use facilities (fuse / summon / store)  --------+
```

There is no run that resets: depth is persistent (`spec/run.md#the-cave`), so descending is gated
only by whether the party survives the next floor. When it can't, the player goes back up,
strengthens it (fuse, level, rescript, build and upgrade facilities) and descends again past the
wall.

- **Short loop** (seconds to minutes): fight a floor's creatures, watch scripts execute, collect XP.
- **Medium loop** (a session): descend until you hit a wall, return to the entrance, rescript and
  re-gear, push past it.
- **Long loop** (many sessions): discover biomes, build out facilities, and deepen builds to descend
  ever further.

## Explicit non-goals

For now:

- No multiplayer, no server, no accounts.
- No real-money anything.
- No real-time or twitch combat: it resolves turn-based even when fast-forwarded.
- No free-text scripting language in v1 (UI-driven rules only).
- **No prestige and no resets**: progression is forward-only.
