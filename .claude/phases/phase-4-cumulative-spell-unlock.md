# Cumulative spell unlock

Status: **done.**

An interstitial slice between Slice H2 and Slice H3 (per the brief:
`.claude/briefs/phase-4-cumulative-spell-unlock.md`). Fixes spell pools being per-biome
exclusive (the actual bug behind H2's own accidental 9-spell reskin of Overgrowth) and makes
unlock cumulative instead, before H3 (Rotcap Hollow) authors its own spells against the same
mistake's shape. Also folds in the Glimmerdark spell expansion to the design-owner's ≥4–5-own-
spells-per-biome bar (see "New content" and "Design-owner corrections" below).

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
  `BiomeData.spellPool` before this slice. **Registry order is determinism-relevant** — `weightedPick`
  walks the affinity-filtered slice of this list in order, so its order maps each RNG roll to a
  spell; the list is APPEND-ONLY and must never be re-sorted (reordering would silently change what
  a given seed rolls). (An earlier draft comment called the order "cosmetic" — corrected.)
- **`state/store.ts`** — `GameStoreDeps` gains `allSpells: readonly Spell[]` (default
  `ALL_SPELLS`); `descend()` computes `biomeIndex = deps.biomes.findIndex(b => b.id ===
  biomeId) + 1` and threads it + `deps.allSpells` into `generateFloor`.
- **Content retag**: Overgrowth's 11 spells + core.ts's 3 → `unlockedAtBiome: 1`. Glimmerdark's
  surviving spell (Beacon Charge) + its new ones → `unlockedAtBiome: 2`.
- **Glimmerdark's 9 duplicate spells deleted** (`data/spells/glimmerdark.ts`): Crystal Shard
  (=Thorn Lash), Fracture Strike (=Weakening Bite), Stoneshell Bash (=Root Grasp), Bastion Chant
  (=Bramble Ward), Echo Fang (=Stinger Swarm), Pack Howl (=Howling Instinct), Bioglow Mend
  (=Regrowth), Luminous Vigor (=Wild Vigor) — 8 exact mechanical reskins — plus Glowspark Bolt (a
  near-dup of Arcane Bolt, violating this biome's own "no affinity carries two plain damage
  spells" convention). Beacon Charge kept (genuinely Glimmerdark's own).
- **Beacon Charge scaling fix** (`data/spells/glimmerdark.ts`) — Beacon Charge carried no
  `scalingStat`, so `resolveSpellOffStat` fell through to the Cast offensive stat (**Intelligence**),
  yet its doc has always read "30% of effective **Health**." Both the doc's intent and the sibling
  heals (Regrowth, Overcharge) point to Health, so Beacon Charge now sets `scalingStat: 'health'`
  explicitly. This makes the doc literally true and makes Overcharge's "half of Beacon Charge's
  heal" framing correct (both now Health-scaled). Test-neutral: Beacon Charge is cast in no golden
  or heal-amount assertion, and the fix leaves affinity/targetShape/payload/spellPower unchanged
  (dedup key unaffected).
- **Five new Glimmerdark spells** (see "New content" below): Overcharge, Disorient, Blinding
  Flare, Afterglow, Luminous Tide.
- **Dedup guard test** (`data/spells/index.test.ts`) — asserts no two spells in `ALL_SPELLS`
  share `(affinity, targetShape, payload, spellPower)`; cheap protection against H3+
  reintroducing H2's own mistake. Also asserts every spell has a positive integer
  `unlockedAtBiome` and every id is unique. (Passes over the full 20-spell registry.)
- **Generation tests** (`engine/generation.test.ts`) — `spellsUnlockedAt` unit tests, plus a
  `generateFloor`-level integration test proving a biome-2 roll CAN surface a biome-1 spell (and
  the newly-unlocked biome-2 one), while a biome-1 roll can NEVER surface a biome-2 spell.
- Every `BiomeData` literal across `data/biomes.ts`, `data/species/{overgrowth,glimmerdark}.ts`,
  `engine/__fixtures__/biomes.ts`, `state/store.test.ts`, `state/rewards.test.ts` had its
  `spellPool` field dropped (the interface no longer has one). `OVERGROWTH_SPELLS`/
  `GLIMMERDARK_SPELLS` groupings in the species files are **kept**, but purely as "the spells
  this biome introduces" documentation/test groupings — no longer fed into `BiomeData`.

## New content (ASSUMPTION-tagged in `data/spells/glimmerdark.ts`; numbers approved as placeholders, balance deferred)

The brief named Overcharge and Disorient; the design owner set a ≥4–5-own-spells-per-biome bar
(now pinned in GAME_DESIGN §4), so three more of Glimmerdark's own were designed to meet it — each
on a mechanic no biome-1 spell uses, not a cross-affinity clone. Numbers are the design/coding
agents' picks, explicitly approved as placeholders with balance to be tuned later.

| Spell | Affinity | Shape | What it does |
|---|---|---|---|
| **Overcharge** | Wit | single, ally, heal | Heals **15%** of effective Health (half of Beacon Charge's 30%), applies **2 stacks** of Glow at once. Authored on the `heal` payload because the engine has no "apply-status-only" payload mode (out of this slice's scope). |
| **Disorient** | Instinct | single, enemy, damage | **85%** of Intelligence, applies **Web** (act-last) for **3 turns** — reuses the EXISTING `web` StatusDef (precedent: Vine Snare applies Web too), giving Instinct its first status-application spell besides Venom Bolt. |
| **Blinding Flare** | Violence | single, enemy, damage | **70%** of Intelligence, applies **Vulnerability** (×1.5 damage taken) for **3 turns** — the first Vulnerability-applier; an offensive setup debuff. Violence's first Glimmerdark-own spell. |
| **Afterglow** | Vitality | single, ally, heal | **50%** of effective Health, applies **Regen** (4 HP/round) for **3 turns** — the first Regen-applier; a sustain heal distinct from Regrowth's plain burst. Vitality's Glimmerdark-own spell. |
| **Luminous Tide** | Wit | **aoe**, ally, heal | **20%** of effective Health to every ally + a stack of **Glow** to each — the game's first AOE support spell and first team-wide Glow, a new SHAPE rather than another single-target heal+status. |

Affinity coverage of Glimmerdark's own six: Wit ×3 (Beacon Charge, Overcharge, Luminous Tide —
Glimmerdark is Wit-leaning by identity), Instinct, Violence, Vitality ×1 each. Endurance has no
Glimmerdark-own spell (it inherits the biome-1 kit); an Endurance addition was deliberately NOT
forced, because the only clean shape (single, stat-modifier) collides with Bramble Ward under the
dedup key (see the "known sharp edge" note in `data/spells/index.test.ts`) — noted for design-owner
awareness, not worked around.

## Design-owner corrections (this pass)

- **Count.** The brief's Approach step 4 specifies "2–3 new, ~3–4 total including Beacon Charge,
  not 10" — internally consistent. The design owner's own build instruction asked for **~4–5 new
  per biome**; that number is the owner's, not the brief's (an earlier draft of this record
  mis-attributed it to a nonexistent "Scope section" of the brief and invented an intra-brief
  contradiction to justify shipping only 2 — struck). Resolution: ship **5 new** to meet the
  owner's bar, and pin ≥4–5-own-spells-per-biome in GAME_DESIGN §4 so H3 authors to it too.
- **Beacon Charge scaling.** See "What was built" — fixed to Health-scaling per design-owner call.
- **Registry-order comment.** Corrected from "cosmetic" to "determinism-relevant, append-only."

## Golden fixtures retargeted (design-owner confirmed)

Two golden fixtures (`golden-resonant-harmonize`, `golden-resonant-overtone`) hand-built a caster
with `equippedSpells: [GLOWSPARK_BOLT]` — a spell this slice deletes. Per the brief's own "if a
golden imports a spell you're deleting, STOP and flag it" instruction, this was surfaced and the
owner chose **retarget + recompute** over preserving the old spell as a test-only fixture. Both
now cast `ARCANE_BOLT` (spellPower 0.5 vs Glowspark Bolt's 1.0) and every downstream damage
number in both fixtures (and their own `.test.ts` HP comments) was hand-recomputed against the
new spellPower — not preserved. This is the one deliberate exception to "prove every prior golden
byte-identical": the input spell itself no longer exists, so the golden's numbers necessarily
change; no OTHER golden's numbers moved. The five new spells and the Beacon Charge fix add/change
no golden (none of them is cast in any golden fixture).

## Docs synced

- `GAME_DESIGN.md` §4 — pinned the cumulative-unlock rule explicitly (the OPPOSITE rule from
  species/creature biome-exclusivity, don't conflate the two), and pinned the **≥4–5-own-spells-
  per-biome** authoring bar (both under-authoring and re-authoring a full kit are named as the
  failure modes it guards against; H3+ author to it).
- `.claude/content/overgrowth.md` — added the previously-undocumented Arcane Bolt (Wit's 3rd
  spell) and the 3 core.ts spells (now reachable content), plus a "Cumulative unlock" note.
- `.claude/content/glimmerdark.md` — current 6-entry Glimmerdark-own list (Beacon Charge +
  the five new) with a "Deleted" note explaining what's now inherited instead.
- `.claude/briefs/glimmerdark-spell-expansion.md` — new brief recording the ≥4–5 bar and the
  three added spell designs (intent record; the cumulative-unlock brief itself is untouched
  beyond its Status line).

## Verification

All four gates green, re-run against the final content (`npm run test`: 90 files / 555 tests
passed; `npm run lint`: clean; `npm run format:check`: clean; `npm run build`: `tsc -b && vite
build` succeeded).

## Next

Slice H3 — Rotcap Hollow (floors 21-30), authoring **≥4–5** of its OWN new spells (Spore/
Confusion producers etc.) against the now-cumulative pool, inheriting the full biome-1+2 base
rather than re-authoring a kit per affinity.
