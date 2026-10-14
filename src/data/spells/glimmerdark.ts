import type { Spell } from '../../engine/types'

// This biome authors only its own spells. Spell unlock is cumulative: `generateFloor` rolls from
// the global spell list filtered to `unlockedAtBiome <= currentBiomeIndex`, so every deeper biome
// inherits the biome-1 kit and a reskin of one of its spells here would only duplicate it
// (`spec/run.md#spells-unlock-cumulatively`). Each spell below is on a mechanic no biome-1 spell
// already uses, and no affinity carries two plain damage spells.

/** Beacon Charge: a small heal that ALSO grants the target Grant Act First (a `heal` effect, then an
 * `apply-status` effect, at the status's own default duration) -- the support spell that lets an
 * ally open the next round, per `spec/run.md#the-onboarding-ramp` (a spell may apply any status,
 * another species' signature status included; Blindclaws' Setter grants the same status). Single-target
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
 * Disorient: applies act-last to an enemy, reusing the turn-order primitive. That primitive's
 * act-last pole is already the `web` StatusDef (a `turn-order` effect,
 * `position: 'last'`, data/statuses.ts) -- per `spec/statuses.md#a-status-is-a-timed-effect` and
 * `spec/run.md#the-onboarding-ramp` (a spell may apply any status, another species' signature
 * status included; already precedented: Overgrowth's own Vine Snare applies `web` too), Disorient
 * reuses that SAME statusId rather than authoring a new near-identical StatusDef, which would
 * just be Web-with-a-new-name. Authored as
 * a `deal-damage` effect + an `apply-status` effect, same shape as Vine Snare, but on
 * Instinct (Vine Snare is Wit) -- it is Instinct's only status-applying spell before the Rotcap
 * Hollow's Puppet String, so it fills a real gap rather than re-skinning Vine Snare; distinct
 * from Vine Snare under the dedup guard by affinity (instinct vs wit). spellPower 0.85 + duration 3 both mirror Vine Snare's own numbers exactly
 * (single-target + upside band, Web's own `defaultDuration`) -- deliberate consistency, not an
 * oversight. */
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
 * Blinding Flare -- first spell to apply Vulnerability (statuses.ts: x1.5 damage TAKEN, once); an
 * offensive setup debuff no biome-1 spell provides. Violence's first Glimmerdark-own spell. Unique
 * under the dedup guard by spellPower (0.7 vs Thorn Lash 1.0 and Withering Bolt 0.45). Numbers are
 * parked balance. */
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
 * Afterglow -- burst heal + Regen (statuses.ts: heal-over-time). First Regen-applier, so not a
 * reskin of Regrowth (biome-1 vitality plain heal). Vitality's Glimmerdark-own sustain heal.
 * scalingStat health like every Glimmerdark heal; unique vs Regrowth by spellPower (0.5 vs 0.3).
 * Numbers are parked balance. */
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
 * Kindred Light -- a
 * small AOE ally heal: every ally for 20% of the caster's effective Health, no status. The first
 * AOE support spell -- a new SHAPE, not another single-target heal+status. Unique under the dedup
 * guard: no other wit|aoe|heal exists (Pollen Cloud is wit|aoe|damage). Numbers are parked balance. */
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
