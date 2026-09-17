# Brief — Cumulative spell unlock (Phase 4, between Slice H2 and H3)

Status: shipped — see phases/phase-4-cumulative-spell-unlock.md
Depends on: H2 merged. Do before: H3 (Rotcap Hollow) authors its spells.

## Problem

Spell pools are **per-biome exclusive**: `generateFloor` rolls loadouts from `biome.spellPool`
alone (`generation.ts` — `biome.spellPool.filter(...)`), so a Glimmerdark enemy can only ever roll
Glimmerdark spells. That was never the intent — spells are meant to **unlock cumulatively** as the
player descends (spells from earlier biomes stay available, to player and enemies alike, in every
later biome).

Because pools are exclusive, the coding agent re-authored a near-complete kit per biome, producing
**9 duplicate spells** in Glimmerdark that are mechanically identical to Overgrowth ones (same
affinity + target shape + payload + factor; only the name changed):

| Glimmerdark | = Overgrowth | Glimmerdark | = Overgrowth |
|---|---|---|---|
| Crystal Shard | Thorn Lash | Bioglow Mend | Regrowth |
| Fracture Strike | Weakening Bite | Luminous Vigor | Wild Vigor |
| Stoneshell Bash | Root Grasp | Echo Fang | Stinger Swarm |
| Bastion Chant | Bramble Ward | Pack Howl | Howling Instinct |
| Glowspark Bolt | Arcane Bolt (near-dup) | | |

Only **Beacon Charge** (heal + Glow) is genuinely Glimmerdark's own. So biome-1 and biome-2 casters
throw mechanically identical spells — zero spell variety across the descent — and the player would
accumulate a list of same-effect spells with different names. Both are unwanted.

## Design (decided)

Spells **unlock cumulatively**. The effective pool at biome N = every spell unlocked at biomes 1..N,
so there is never a reason to duplicate a spell into a later biome, and every affinity's basics are
inherited (no need to re-author a full kit per biome — each new biome only adds *spice*).

## Approach (recommended: data-driven unlock tag)

1. **Tag each spell with an unlock point.** Add `unlockedAtBiome: 1 | 2 | 3 | …` to `Spell`. Keep a
   single global spell list; `generateFloor` filters it to `unlockedAtBiome <= currentBiomeIndex`,
   then by affinity (as it does today). This makes "unlock on reaching a biome" a first-class,
   inspectable data property and matches the codebase's "identity in data" convention.
   *(Alternative: concatenate prior biome lists into each `biome.spellPool`. Works, but clumsier and
   keeps the per-biome lists that invited the duplication.)*
2. **Delete the 9 duplicates** from `data/spells/glimmerdark.ts` (the 8 exact + Glowspark Bolt).
   Once unlock is cumulative they're inherited from Overgrowth — pure redundant IDs.
3. **Retag the survivors.** Overgrowth's 11 → `unlockedAtBiome: 1`; the shared `core.ts` spells → 1
   (and actually wire them into the roll, which they currently aren't). Beacon Charge → 2, plus any
   new Glimmerdark spells below.
4. **Add Glimmerdark's own spells (2–3, on its mechanics).** Suggestions: **Overcharge** (apply 2
   Glow to an ally — a spell-form Charger) and **Disorient** (apply act-last to an enemy, reusing
   the turn-order primitive). Keep Beacon Charge. That's the whole Glimmerdark contribution — ~3–4,
   not 10.
5. **Retro-fix affinity completeness.** With cumulative unlock, every affinity's kit is inherited
   from biome 1, so later biomes don't need a full per-affinity kit — confirm the biome-1 base is
   affinity-complete (it is) and let inheritance carry it.

## Docs
- `GAME_DESIGN.md`: pin the cumulative-unlock rule explicitly. It's implied everywhere the docs say
  "shared spell pool" but was never specified, and it must not be conflated with `species-locked.md`'s
  "biome-exclusive" rule — that one is about **species/creatures**, not spells.
- Note that this retro-fixes Overgrowth too: its pool becomes the biome-1 base every later biome
  inherits.

## Tests
- A generation test: a biome-N roll can produce a biome-1 spell; a biome-1 roll cannot produce a
  biome-2 spell.
- Golden/loader: the global list has no two spells with identical (affinity, targetShape, payload,
  factor) — a cheap guard against re-introducing duplicates in H3+.
