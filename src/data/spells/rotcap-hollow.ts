import type { Spell } from '../../engine/types'

// ---- Phase 4 Slice H3: Rotcap Hollow (floors 21-30) -- 5 new, genuinely-own spells (one per
// affinity), meeting the design owner's >=4-5-own-spells-per-biome bar (GAME_DESIGN §4) the same
// way H2's post-interstitial-slice kit does: spice on top of the inherited Overgrowth/Glimmerdark
// base (cumulative unlock -- see data/spells/index.ts's ALL_SPELLS), never a re-skinned dup. Each
// is unique under the dedup guard's (affinity, targetShape, payload, spellPower) key
// (data/spells/index.test.ts) -- checked by hand against every pre-existing spell below.

/** Spore Cyst: the first spell-authored producer of Spore (species-locked.md: "a spell may
 * apply any status, including another species' signature one" -- statuses are shared
 * primitives, precedented by Vine Snare/Web and Disorient/Web). PR #64 review: `spellPower`
 * lowered 0.9 -> 0.45 -- the "~80-90% band" reasoning below no longer applies. A DoT-applying
 * spell's upfront damage shouldn't lead its band (the same rule already applied to Puppet
 * String); the reference point is Venom Bolt's own DoT spell, 0.4. Distinct from every other
 * wit|single|damage entry under the dedup guard. */
export const SPORE_CYST: Spell = {
  id: 'spore-cyst',
  name: 'Spore Cyst',
  targetShape: 'single',
  spellPower: 0.45,
  affinity: 'wit',
  appliesStatus: { statusId: 'spore', duration: 3 },
  unlockedAtBiome: 3,
}

/** Rasping Chant: Endurance's first single-target enemy debuff (Root Grasp is plain damage,
 * Bramble Ward is an ally buff, not an enemy debuff). Permanently lowers a single enemy's
 * Defence to 80% of its current value, for the rest of the fight -- the support-spell model's
 * stat-modifier payload. Same shape as Weakening Bite (Violence, also a Defence-lowering
 * stat-modifier spell), but a different AFFINITY, which is what the dedup guard's own key reads
 * -- no collision. */
export const RASPING_CHANT: Spell = {
  id: 'rasping-chant',
  name: 'Rasping Chant',
  targetShape: 'single',
  spellPower: 1, // unread in stat-modifier payload mode
  affinity: 'endurance',
  payload: 'stat-modifier',
  statModifier: { stat: 'defence', factor: 0.8 },
  unlockedAtBiome: 3,
}

/** Puppet String: the first spell-authored producer of Confusion (Instinct's own new-mechanic
 * spell, mirroring how Disorient introduced Web to Instinct in H2). Content-review revision:
 * spellPower lowered to 0.8 (a status-application spell's damage half shouldn't lead the pack) --
 * keeps it distinct from Disorient's own 0.85 under the dedup guard. */
export const PUPPET_STRING: Spell = {
  id: 'puppet-string',
  name: 'Puppet String',
  targetShape: 'single',
  spellPower: 0.8,
  affinity: 'instinct',
  appliesStatus: { statusId: 'confusion', duration: 3 },
  unlockedAtBiome: 3,
}

/** Charnel Feast: Vitality's first AOE support spell (Regrowth/Afterglow are both
 * single-target) -- a small heal to the whole living party at once, "the party feeds together."
 * AOE + upside -> the ~20-40% band (mirrors Luminous Tide's own 0.2). */
export const CHARNEL_FEAST: Spell = {
  id: 'charnel-feast',
  name: 'Charnel Feast',
  targetShape: 'aoe',
  spellPower: 0.25,
  affinity: 'vitality',
  scalingStat: 'health',
  targetSide: 'ally',
  payload: 'heal',
  unlockedAtBiome: 3,
}

/** Withering Bolt: Violence's first spell-authored producer of Burn (statuses.ts's BURN had no
 * real producer before this slice besides Sporch's own on-attack trait -- statuses are never
 * producer-exclusive). PR #64 review: `spellPower` lowered 0.85 -> 0.45 -- the "~80-90% band"
 * reasoning below no longer applies. A DoT-applying spell's upfront damage shouldn't lead its
 * band (the same rule already applied to Puppet String and Spore Cyst); the reference point is
 * Venom Bolt's own DoT spell, 0.4. Distinct from Ember Lance (0.5) / Thorn Lash (1.0) /
 * Blinding Flare (0.7, applies Vulnerability not Burn) under the dedup guard. */
export const WITHERING_BOLT: Spell = {
  id: 'withering-bolt',
  name: 'Withering Bolt',
  targetShape: 'single',
  spellPower: 0.45,
  affinity: 'violence',
  appliesStatus: { statusId: 'burn', duration: 3 },
  unlockedAtBiome: 3,
}
