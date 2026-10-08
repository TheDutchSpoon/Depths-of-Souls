import type { Spell } from '../../engine/types'

// ---- Phase 4 interstitial slice (cumulative spell unlock) ----
// H2 originally shipped 10 spells here (two per affinity, mirroring Overgrowth's density). Once
// spell unlock became cumulative (generateFloor rolls from the GLOBAL spell list, filtered to
// `unlockedAtBiome <= currentBiomeIndex`, then by affinity -- see engine/generation.ts's
// `spellsUnlockedAt`), 8 of those 10 turned out to be exact mechanical reskins of an Overgrowth
// spell (same affinity + targetShape + effect kind + magnitude, only the name
// differed) and a 9th (Glowspark Bolt) was a near-dup of Arcane Bolt violating this biome's own
// "no affinity carries two plain damage spells" convention. All 9 are deleted -- Overgrowth's
// biome-1 kit is inherited by every deeper biome now, so re-authoring it here was always
// redundant. Deleted: Crystal Shard (=Thorn Lash), Fracture Strike (=Weakening Bite), Glowspark
// Bolt (near-dup of Arcane Bolt), Stoneshell Bash (=Root Grasp), Bastion Chant (=Bramble Ward),
// Echo Fang (=Stinger Swarm), Pack Howl (=Howling Instinct), Bioglow Mend (=Regrowth), Luminous
// Vigor (=Wild Vigor). Only Beacon Charge was genuinely Glimmerdark's own (a heal plus a status, no
// Overgrowth equivalent) -- kept, retagged `unlockedAtBiome: 2`. Five new spells (Overcharge,
// Disorient, Blinding Flare, Afterglow, Luminous Tide -- all ASSUMPTION-tagged below) joined it,
// for 6 Glimmerdark-own spells total, meeting the design owner's >=4-5-own-spells-per-biome bar
// (GAME_DESIGN §4) as spice on top of the inherited biome-1 base, not a re-authored kit -- each
// on a mechanic no biome-1 spell already uses.
//
// Phase 4.1-H2b1 (ASSUMPTION 116): Glow is deleted, so Overcharge (its only reason to exist) is
// deleted, Beacon Charge grants Grant Act First instead, and Luminous Tide becomes Kindred Light
// (a plain team heal) -- 5 Glimmerdark-own spells.

/** Beacon Charge: a small heal that ALSO grants the target Grant Act First (a `heal` effect, then an
 * `apply-status` effect, at the status's own default duration) -- the support spell that lets an
 * ally open the next round, per species-locked.md's own "a spell may apply any status, including
 * another species' signature one" rule (Blindclaws' Setter grants the same status). Single-target
 * + upside -> ~80-90% band. */
export const BEACON_CHARGE: Spell = {
  id: 'beacon-charge',
  name: 'Beacon Charge',
  targetShape: 'single',
  affinity: 'wit',
  targetSide: 'ally',
  unlockedAtBiome: 2,
  effects: [
    {
      kind: 'heal',
      target: { kind: 'cast-target' },
      scalingStat: 'health',
      spellPower: 0.3,
    },
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'grant-act-first' },
    },
  ],
}

/**
 * ASSUMPTION (interstitial slice, NEW CONTENT -- surfaced for sign-off): Disorient, suggested by
 * the brief as "apply act-last to an enemy, reusing the turn-order primitive." The turn-order
 * primitive's act-last pole is already the `web` StatusDef (a `turn-order` effect,
 * position: 'last'`, data/statuses.ts) -- per CONVENTIONS' "statuses are shared primitives" and
 * species-locked.md's own "a spell may apply any status, including another species' signature
 * one" rule (already precedented: Overgrowth's own Vine Snare applies `web` too), Disorient
 * reuses that SAME statusId rather than authoring a new near-identical StatusDef, which would
 * just be Web-with-a-new-name -- the exact anti-pattern this slice exists to undo. Authored as
 * a `deal-damage` effect + an `apply-status` effect, same shape as Vine Snare, but on
 * Instinct (Vine Snare is Wit) -- Instinct had no status-application spell besides core.ts's
 * Venom Bolt (poison), so this fills a real gap rather than re-skinning Vine Snare; distinct
 * under the dedup guard by affinity (instinct vs wit) AND by spellPower and its status vs Venom
 * Bolt. spellPower 0.85 + duration 3 both mirror Vine Snare's own numbers exactly (single-target
 * + upside band, Web's own `defaultDuration`) -- deliberate consistency, not an oversight; flag
 * for design-owner sign-off same as any other new balance figure. */
export const DISORIENT: Spell = {
  id: 'disorient',
  name: 'Disorient',
  targetShape: 'single',
  affinity: 'instinct',
  unlockedAtBiome: 2,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.85,
    },
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'web', duration: 3 },
    },
  ],
}

/**
 * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred):
 * Blinding Flare -- first spell to apply Vulnerability (statuses.ts: x1.5 damage TAKEN/stack); an
 * offensive setup debuff no biome-1 spell provides. Violence's first Glimmerdark-own spell. Unique
 * under the dedup guard by spellPower (0.7 vs Ember Lance 0.5 / Thorn Lash 1.0). */
export const BLINDING_FLARE: Spell = {
  id: 'blinding-flare',
  name: 'Blinding Flare',
  targetShape: 'single',
  affinity: 'violence',
  unlockedAtBiome: 2,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.7,
    },
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'vulnerability', duration: 3 },
    },
  ],
}

/**
 * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred):
 * Afterglow -- burst heal + Regen (statuses.ts: heal-over-time). First Regen-applier, so not a
 * reskin of Regrowth (biome-1 vitality plain heal). Vitality's Glimmerdark-own sustain heal.
 * scalingStat health like every Glimmerdark heal; unique vs Regrowth by spellPower (0.5 vs 0.3). */
export const AFTERGLOW: Spell = {
  id: 'afterglow',
  name: 'Afterglow',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'ally',
  unlockedAtBiome: 2,
  effects: [
    {
      kind: 'heal',
      target: { kind: 'cast-target' },
      scalingStat: 'health',
      spellPower: 0.5,
    },
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'regen', duration: 3 },
    },
  ],
}

/**
 * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred):
 * Kindred Light (formerly Luminous Tide, renamed in place in 4.1-H2b1 when Glow was deleted) -- a
 * small AOE ally heal: every ally for 20% of the caster's effective Health, no status. The first
 * AOE support spell -- a new SHAPE, not another single-target heal+status. Unique under the dedup
 * guard: no other wit|aoe|heal exists (Pollen Cloud is wit|aoe|damage). */
export const KINDRED_LIGHT: Spell = {
  id: 'kindred-light',
  name: 'Kindred Light',
  targetShape: 'aoe',
  affinity: 'wit',
  targetSide: 'ally',
  unlockedAtBiome: 2,
  effects: [
    {
      kind: 'heal',
      target: { kind: 'cast-target' },
      scalingStat: 'health',
      spellPower: 0.2,
    },
  ],
}
