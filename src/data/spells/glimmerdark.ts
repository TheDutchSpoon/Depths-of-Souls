import type { Spell } from '../../engine/types'

// ---- Phase 4 interstitial slice (cumulative spell unlock) ----
// H2 originally shipped 10 spells here (two per affinity, mirroring Overgrowth's density). Once
// spell unlock became cumulative (generateFloor rolls from the GLOBAL spell list, filtered to
// `unlockedAtBiome <= currentBiomeIndex`, then by affinity -- see engine/generation.ts's
// `spellsUnlockedAt`), 8 of those 10 turned out to be exact mechanical reskins of an Overgrowth
// spell (same affinity + targetShape + payload + spellPower/statModifier, only the name
// differed) and a 9th (Glowspark Bolt) was a near-dup of Arcane Bolt violating this biome's own
// "no affinity carries two plain damage spells" convention. All 9 are deleted -- Overgrowth's
// biome-1 kit is inherited by every deeper biome now, so re-authoring it here was always
// redundant. Deleted: Crystal Shard (=Thorn Lash), Fracture Strike (=Weakening Bite), Glowspark
// Bolt (near-dup of Arcane Bolt), Stoneshell Bash (=Root Grasp), Bastion Chant (=Bramble Ward),
// Echo Fang (=Stinger Swarm), Pack Howl (=Howling Instinct), Bioglow Mend (=Regrowth), Luminous
// Vigor (=Wild Vigor). Only Beacon Charge was genuinely Glimmerdark's own (heal + Glow, no
// Overgrowth equivalent) -- kept, retagged `unlockedAtBiome: 2`. Five new spells (Overcharge,
// Disorient, Blinding Flare, Afterglow, Luminous Tide -- all ASSUMPTION-tagged below) join it,
// for 6 Glimmerdark-own spells total, meeting the design owner's >=4-5-own-spells-per-biome bar
// (GAME_DESIGN §4) as spice on top of the inherited biome-1 base, not a re-authored kit -- each
// on a mechanic no biome-1 spell already uses.

/** Beacon Charge: a small heal (the support-spell model's `heal` payload) that ALSO charges the
 * target with a stack of Glow (`appliesStatus`, applied after the heal lands) -- ties the
 * Glowflies' resource into the shared spell pool, per species-locked.md's own "a spell may apply
 * any status, including another species' signature one" rule. Single-target + upside -> ~80-90%
 * band. */
export const BEACON_CHARGE: Spell = {
  id: 'beacon-charge',
  name: 'Beacon Charge',
  targetShape: 'single',
  spellPower: 0.3,
  affinity: 'wit',
  scalingStat: 'health',
  targetSide: 'ally',
  payload: 'heal',
  appliesStatus: { statusId: 'glow' },
  unlockedAtBiome: 2,
}

/**
 * ASSUMPTION (interstitial slice, NEW CONTENT -- surfaced for sign-off, not guessed): Overcharge,
 * suggested by the brief as "apply 2 Glow to an ally." The engine has no "apply a status with no
 * damage/heal/buff riding along" payload mode (out of scope to add one -- this slice's only
 * permitted engine change is the unlock filter + the Spell field), and `appliesStatus` only fires
 * after a payload lands (`combat.ts`'s `applyCastPayload` then `if (spell.appliesStatus)`), so
 * Overcharge is authored on the `heal` payload -- same shape as Beacon Charge, but the trade is
 * inverted: a SMALLER heal (spellPower 0.15, half Beacon Charge's 0.3) buys TWO Glow stacks at
 * once (`stacks: 2`, mirroring Radiant's own `{ statusId: 'glow', stacks: 2 }` -- see
 * traits/glimmerdark.ts) instead of Beacon Charge's one. Distinguishable from Beacon Charge under
 * the dedup guard (data/spells/index.test.ts) by spellPower (0.15 vs 0.3). Exact numbers (0.15
 * heal factor, 2 stacks) are this slice's own pick, not a locked design number -- flag for
 * design-owner sign-off same as any other new balance figure. */
export const OVERCHARGE: Spell = {
  id: 'overcharge',
  name: 'Overcharge',
  targetShape: 'single',
  spellPower: 0.15,
  affinity: 'wit',
  scalingStat: 'health',
  targetSide: 'ally',
  payload: 'heal',
  appliesStatus: { statusId: 'glow', stacks: 2 },
  unlockedAtBiome: 2,
}

/**
 * ASSUMPTION (interstitial slice, NEW CONTENT -- surfaced for sign-off): Disorient, suggested by
 * the brief as "apply act-last to an enemy, reusing the turn-order primitive." The turn-order
 * primitive's act-last pole is already the `web` StatusDef (`category: 'turn-order-status',
 * position: 'last'`, data/statuses.ts) -- per CONVENTIONS' "statuses are shared primitives" and
 * species-locked.md's own "a spell may apply any status, including another species' signature
 * one" rule (already precedented: Overgrowth's own Vine Snare applies `web` too), Disorient
 * reuses that SAME statusId rather than authoring a new near-identical StatusDef, which would
 * just be Web-with-a-new-name -- the exact anti-pattern this slice exists to undo. Authored on
 * the `damage` payload (the default) + `appliesStatus`, same shape as Vine Snare, but on
 * Instinct (Vine Snare is Wit) -- Instinct had no status-application spell besides core.ts's
 * Venom Bolt (poison), so this fills a real gap rather than re-skinning Vine Snare; distinct
 * under the dedup guard by affinity (instinct vs wit) AND by spellPower/appliesStatus vs Venom
 * Bolt. spellPower 0.85 + duration 3 both mirror Vine Snare's own numbers exactly (single-target
 * + upside band, Web's own `defaultDuration`) -- deliberate consistency, not an oversight; flag
 * for design-owner sign-off same as any other new balance figure. */
export const DISORIENT: Spell = {
  id: 'disorient',
  name: 'Disorient',
  targetShape: 'single',
  spellPower: 0.85,
  affinity: 'instinct',
  appliesStatus: { statusId: 'web', duration: 3 },
  unlockedAtBiome: 2,
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
  spellPower: 0.7,
  affinity: 'violence',
  appliesStatus: { statusId: 'vulnerability', duration: 3 },
  unlockedAtBiome: 2,
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
  spellPower: 0.5,
  affinity: 'vitality',
  scalingStat: 'health',
  targetSide: 'ally',
  payload: 'heal',
  appliesStatus: { statusId: 'regen', duration: 3 },
  unlockedAtBiome: 2,
}

/**
 * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred):
 * Luminous Tide -- small AOE ally heal + team-wide Glow. First AOE support spell and first team
 * Glow application -- a new SHAPE, not another single-target heal+status. Unique under the dedup
 * guard: no other wit|aoe|heal exists (Pollen Cloud is wit|aoe|damage). */
export const LUMINOUS_TIDE: Spell = {
  id: 'luminous-tide',
  name: 'Luminous Tide',
  targetShape: 'aoe',
  spellPower: 0.2,
  affinity: 'wit',
  scalingStat: 'health',
  targetSide: 'ally',
  payload: 'heal',
  appliesStatus: { statusId: 'glow' },
  unlockedAtBiome: 2,
}
