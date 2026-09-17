# Brief — Glimmerdark spell expansion (Phase 4, folded into the cumulative-unlock slice)

Status: shipped — see phases/phase-4-cumulative-spell-unlock.md
Depends on: cumulative-unlock slice (same branch). Do before: H3 (Rotcap) authors its spells.

## Why

The cumulative-unlock slice, following its own brief, shipped only 2 new Glimmerdark spells
(Overcharge, Disorient). The design owner wants **≥4–5 of a biome's own spells per biome** — enough
variety that each descent feels distinct on top of the inherited base, not just a bigger pile of
the biome-1 kit. This brief records that standing bar and the three spells added to meet it for
Glimmerdark. The bar itself is pinned in `GAME_DESIGN.md` §4 and applies to every biome, H3 onward.

## Rule (decided)

- Each biome authors **≥4–5 of its OWN spells**, on its own mechanics or genuine fresh takes.
- A **cross-affinity clone** of an existing spell (same shape/payload/status, different affinity)
  does **not** count toward the bar. It's allowed when it fills a real affinity gap (e.g. Disorient
  gives Instinct its first status-application spell), but it's not "new design" for counting.
- Prefer spells that introduce a mechanic no earlier biome uses — a status not yet applied by any
  spell, or a new target shape — over retunes of existing shapes.

## Added spells (Glimmerdark) — design-agent proposals, ASSUMPTION-tagged, numbers deferred

All three land in `data/spells/glimmerdark.ts` at `unlockedAtBiome: 2`, join `ALL_SPELLS` and the
`GLIMMERDARK_SPELLS` documentation grouping, and lean on Glimmerdark's light identity.

1. **Blinding Flare** — Violence, single-enemy, damage (spellPower 0.7) + **Vulnerability** (×1.5
   damage taken, 3 turns). First spell to apply Vulnerability: an offensive setup debuff. Gives
   Violence its first Glimmerdark-own spell.
2. **Afterglow** — Vitality, single-ally, heal (spellPower 0.5, scalingStat health) + **Regen**
   (4 HP/round, 3 turns). First Regen-applier: a sustain heal, distinct from Regrowth's plain
   burst. Vitality's Glimmerdark-own spell.
3. **Luminous Tide** — Wit, **AOE**-ally, heal (spellPower 0.2, scalingStat health) + a stack of
   **Glow** to each ally. The game's first AOE support spell and first team-wide Glow — a new
   shape, not another single-target heal+status.

Each is unique under the dedup guard (`data/spells/index.test.ts`): Blinding Flare by spellPower
(violence|single|damage|0.7 vs Ember Lance 0.5 / Thorn Lash 1.0); Afterglow by spellPower
(vitality|single|heal|0.5 vs Regrowth 0.3); Luminous Tide by shape (no other wit|aoe|heal exists).

**Numbers are placeholders** — the owner approved shipping them now with balance tuning deferred.
Nothing engine-side changes: all three use existing payloads, statuses, and target shapes.

## Not added, on purpose

An Endurance Glimmerdark-own spell was not forced. The clean Endurance support shape (single,
stat-modifier) collides with Bramble Ward under the dedup key, because stat-modifier spells all
carry the placeholder `spellPower: 1` (the key's known sharp edge). Endurance inherits the biome-1
kit; a future biome can give it something on a different shape. Flagged for awareness, not
worked around here.

## Docs
- `GAME_DESIGN.md` §4 — the ≥4–5-per-biome bar (done).
- `.claude/content/glimmerdark.md` — the 6-entry own-spell list (done).

## Tests
- Dedup guard and generation tests already cover the shape; they pass unchanged over the expanded
  registry. No new golden — none of the three (nor the Beacon Charge scaling fix) is cast in any
  golden fixture.
