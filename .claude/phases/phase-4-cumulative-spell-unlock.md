# Cumulative spell unlock

Status: **done.**

An interstitial slice between Slice H2 and Slice H3 (per the brief:
`.claude/briefs/phase-4-cumulative-spell-unlock.md`). Fixes spell pools being per-biome
exclusive (the actual bug behind H2's own accidental 9-spell reskin of Overgrowth) and makes
unlock cumulative instead, before H3 (Rotcap Hollow) authors its own spells against the same
mistake's shape.

## What was built

- **`Spell.unlockedAtBiome?: number`** (`engine/types.ts`) — the biome number (1-based) a spell
  enters the shared pool at. **Optional**, defaulting to `1` in `spellsUnlockedAt` — not required,
  because dozens of pre-existing `Spell` literals across the engine's own combat/resolution/
  interpreter unit tests and golden fixtures have nothing to do with generation/biome content;
  forcing all of them to declare a tag they'll never be filtered on would have been pure churn.
  Every REAL spawn-pool spell (`data/spells/*.ts`) sets it explicitly regardless.
- **`engine/generation.ts`**:
  - `BiomeData.spellPool` **removed**. A biome's spell pool is no longer its own field.
  - New pure export `spellsUnlockedAt(biomeIndex, allSpells)` — filters the GLOBAL spell list to
    `unlockedAtBiome <= biomeIndex`.
  - `rollLoadout`/`generateFloor` take `biomeIndex: number` + `allSpells: readonly Spell[]`
    instead of reading `biome.spellPool`. `generateFloor`'s new signature:
    `(floor, biome, biomeIndex, allSpells, runRng)`.
  - `biomeIndex` is the CALLER's own resolved 1-based position in its ordered biome list
    (generation.ts stays ignorant of array position itself — mirrors how `biomeForFloor`'s fixed
    1-100 sequence is already positional, per CONVENTIONS).
- **`data/spells/index.ts`** — new `ALL_SPELLS: readonly Spell[]`, the global registry
  `generateFloor` rolls from. Also what wires `core.ts`'s three spells (Ember Lance, Cinder Nova,
  Venom Bolt) into the roll for the first time — they were defined but never referenced by any
  `BiomeData.spellPool` before this slice.
- **`state/store.ts`** — `GameStoreDeps` gains `allSpells: readonly Spell[]` (default
  `ALL_SPELLS`); `descend()` computes `biomeIndex = deps.biomes.findIndex(b => b.id ===
  biomeId) + 1` and threads it + `deps.allSpells` into `generateFloor`.
- **Content retag**: Overgrowth's 11 spells + core.ts's 3 → `unlockedAtBiome: 1`. Glimmerdark's
  surviving spell (Beacon Charge) + 2 new ones → `unlockedAtBiome: 2`.
- **Glimmerdark's 9 duplicate spells deleted** (`data/spells/glimmerdark.ts`): Crystal Shard
  (=Thorn Lash), Fracture Strike (=Weakening Bite), Stoneshell Bash (=Root Grasp), Bastion Chant
  (=Bramble Ward), Echo Fang (=Stinger Swarm), Pack Howl (=Howling Instinct), Bioglow Mend
  (=Regrowth), Luminous Vigor (=Wild Vigor) — 8 exact mechanical reskins — plus Glowspark Bolt (a
  near-dup of Arcane Bolt, violating this biome's own "no affinity carries two plain damage
  spells" convention). Beacon Charge kept (genuinely Glimmerdark's own).
- **Two new Glimmerdark spells** (see "New content" below): Overcharge, Disorient.
- **Dedup guard test** (`data/spells/index.test.ts`) — asserts no two spells in `ALL_SPELLS`
  share `(affinity, targetShape, payload, spellPower)`; cheap protection against H3+
  reintroducing H2's own mistake. Also asserts every spell has a positive integer
  `unlockedAtBiome` and every id is unique.
- **Generation tests** (`engine/generation.test.ts`) — `spellsUnlockedAt` unit tests, plus a
  `generateFloor`-level integration test proving a biome-2 roll CAN surface a biome-1 spell (and
  the newly-unlocked biome-2 one), while a biome-1 roll can NEVER surface a biome-2 spell.
- Every `BiomeData` literal across `data/biomes.ts`, `data/species/{overgrowth,glimmerdark}.ts`,
  `engine/__fixtures__/biomes.ts`, `state/store.test.ts`, `state/rewards.test.ts` had its
  `spellPool` field dropped (the interface no longer has one). `OVERGROWTH_SPELLS`/
  `GLIMMERDARK_SPELLS` groupings in the species files are **kept**, but purely as "the spells
  this biome introduces" documentation/test groupings — no longer fed into `BiomeData`.

## New content (ASSUMPTION-tagged in `data/spells/glimmerdark.ts`, ships for design-owner review)

The brief suggested Overcharge and Disorient by name but explicitly asked for their exact
numbers to be surfaced, not guessed. Both ship with a specific number pick; flag for sign-off
before H3.

| Spell | Affinity | Shape | Numbers |
|---|---|---|---|
| **Overcharge** | Wit | single, ally, heal | Heals for **15%** of the caster's effective Health (half of Beacon Charge's 30%), applies **2 stacks** of Glow at once (Radiant's own `{statusId:'glow', stacks:2}` shape, reused). Authored on the `heal` payload because the engine has no "apply-status-only, no damage/heal" payload mode, and adding one is an engine change outside this slice's scope — see the file's own doc comment. |
| **Disorient** | Instinct | single, enemy, damage | Deals **85%** of the caster's Intelligence (mirrors Vine Snare's own single+upside number exactly), applies **Web** (act-last) for **3 turns** — reuses the EXISTING `web` StatusDef rather than authoring a new near-identical one, per "statuses are shared primitives" and the precedent that Vine Snare (Overgrowth) already applies Web too. |

**Count discrepancy flagged, resolved conservatively:** the brief's own Scope section says "~4–5"
new Glimmerdark spells; its Approach section says "~3-4 total including Beacon Charge, not 10."
Shipped the SMALLER reading (2 new + Beacon Charge = 3 total) since the Approach section's
"not 10" framing reads as the harder constraint and both of the brief's own named suggestions
(Overcharge, Disorient) are fully covered. If the design owner wants 1-2 more, they're additive
later — nothing here forecloses it.

## Golden fixtures retargeted (design-owner confirmed)

Two golden fixtures (`golden-resonant-harmonize`, `golden-resonant-overtone`) hand-built a caster
with `equippedSpells: [GLOWSPARK_BOLT]` — a spell this slice deletes. Per the brief's own "if a
golden imports a spell you're deleting, STOP and flag it" instruction, this was surfaced and the
user chose **retarget + recompute** over preserving the old spell as a test-only fixture. Both
now cast `ARCANE_BOLT` (spellPower 0.5 vs Glowspark Bolt's 1.0) and every downstream damage
number in both fixtures (and their own `.test.ts` HP comments) was hand-recomputed against the
new spellPower — not preserved. This is the one deliberate exception to "prove every prior golden
byte-identical": the input spell itself no longer exists, so the golden's numbers necessarily
change; no OTHER golden's numbers moved.

## Docs synced

- `GAME_DESIGN.md` §4 — pinned the cumulative-unlock rule explicitly, and called out that it's
  the OPPOSITE rule from species/creature biome-exclusivity (don't conflate the two).
- `.claude/content/overgrowth.md` — added the previously-undocumented Arcane Bolt (Wit's 3rd
  spell, added by the earlier data-layer-carrier-reorg but never synced into this doc) and the
  3 core.ts spells (now reachable content, having been wired into the roll for the first time by
  this slice), plus a "Cumulative unlock" note.
- `.claude/content/glimmerdark.md` — replaced the stale 10-spell table with the current 3-entry
  Glimmerdark-own list + a "Deleted" note explaining what's now inherited instead.

## Verification

All four gates green: `npm run test` (90 files / 555 tests passed — note: the full suite needs
`--no-file-parallelism` on this machine, a pre-existing local jsdom/worker resource-exhaustion
flake unrelated to this slice's changes, not a real failure), `npm run lint` (clean),
`npm run format:check` (clean, one file auto-fixed), `npm run build` (`tsc -b && vite build`,
succeeded).

## Next

Slice H3 — Rotcap Hollow (floors 21-30), authoring only its OWN new spells (Spore/Confusion
producers etc.) against the now-cumulative pool, inheriting the full biome-1+2 base rather than
re-authoring a kit per affinity.
