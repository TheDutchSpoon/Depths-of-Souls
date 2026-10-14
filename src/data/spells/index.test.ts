import { describe, expect, it } from 'vitest'
import type { Spell } from '../../engine/types'
import {
  ALL_SPELLS,
  LIFE_SIPHON,
  PACIFY,
  POLLEN_CLOUD,
  POUNCE,
  SILENCE,
  STIFLING_WEIGHT,
  STINGER_SWARM,
} from './index'

// This registry guard exists to prevent re-authoring a near-complete kit under new names: two
// spells that are mechanically identical (same affinity + targetShape + effect kind + magnitude)
// but for their name and id are near-duplicates (`spec/run.md#spells-unlock-cumulatively`).
//
// The key reads the primary effect (the first damage/heal/stat-modifier effect; an `apply-status`
// rider never distinguishes two spells): its payload kind, the stat it scales from and its
// `spellPower`. A stat-modifier spell has no spell-level power, so an `apply-stat-modifier`
// primary effect keys as spellPower 1, and a status-only spell keys by its status ids. A future
// stat-modifier spell that deliberately reuses an existing (affinity, targetShape) pair with a
// genuinely different stat/factor would produce a false-positive collision under this key; none
// exists in v1 content, so this is left as a known sharp edge rather than a speculative addition.
/** A spell is status-only when every effect is `apply-status`. It keys by its status ids:
 * otherwise every such spell of one affinity and shape would key to `...|none|1`, so a second one
 * in an affinity would be a false duplicate. */
function statusOnlyIds(spell: Spell): string[] | null {
  if (spell.effects.length === 0) return null
  const ids: string[] = []
  for (const e of spell.effects) {
    if (e.kind !== 'apply-status') return null
    ids.push(e.status.statusId)
  }
  return ids.sort()
}

/** The stat a damage or heal effect actually scales from --
 * `scalingStat`, else `offStat` normalized ('cast' reads Intelligence, 'attack' reads Attack). A
 * spell that names one stat both ways (offStat 'cast' vs scalingStat 'intelligence') keys the same. */
function scaledStat(effect: Spell['effects'][number]): string {
  if (effect.kind !== 'deal-damage' && effect.kind !== 'heal') return 'none'
  if (effect.scalingStat) return effect.scalingStat
  if (effect.offStat === 'cast') return 'intelligence'
  if (effect.offStat === 'attack') return 'attack'
  return 'none'
}

function dedupKey(spell: Spell): string {
  const statusIds = statusOnlyIds(spell)
  if (statusIds)
    return `${spell.affinity}|${spell.targetShape}|status:${statusIds.join(',')}`
  // The (payload, spellPower) pair, read off the spell's PRIMARY effect -- the first
  // damage/heal/stat-modifier effect (an `apply-status` rider never distinguished two spells).
  const primary = spell.effects.find((e) => e.kind !== 'apply-status')
  const payload =
    primary?.kind === 'apply-stat-modifier' ? 'stat-modifier' : (primary?.kind ?? 'none')
  const spellPower =
    primary?.kind === 'deal-damage' || primary?.kind === 'heal'
      ? (primary.spellPower ?? 1)
      : 1
  const stat = primary ? scaledStat(primary) : 'none'
  return `${spell.affinity}|${spell.targetShape}|${payload}|${stat}|${spellPower}`
}

describe('ALL_SPELLS (global registry)', () => {
  it('every spell declares a positive unlockedAtBiome', () => {
    for (const spell of ALL_SPELLS) {
      expect(spell.unlockedAtBiome).toBeGreaterThanOrEqual(1)
      expect(Number.isInteger(spell.unlockedAtBiome)).toBe(true)
    }
  })

  it('every spell id is unique', () => {
    const ids = new Set(ALL_SPELLS.map((spell) => spell.id))
    expect(ids.size).toBe(ALL_SPELLS.length)
  })

  it('no two spells share (affinity, targetShape, payload, factor)', () => {
    const seen = new Map<string, Spell>()
    for (const spell of ALL_SPELLS) {
      const key = dedupKey(spell)
      const collision = seen.get(key)
      if (collision) {
        throw new Error(
          `duplicate spell shape: "${spell.name}" (${spell.id}) mechanically matches ` +
            `"${collision.name}" (${collision.id}) -- both key to ${key}`,
        )
      }
      seen.set(key, spell)
    }
  })
})

describe('dedupKey for status-only spells', () => {
  const statusOnly = (id: string, statusId: string): Spell => ({
    id,
    name: id,
    targetShape: 'single',
    affinity: 'violence',
    targetSide: 'enemy',
    unlockedAtBiome: 1,
    effects: [
      { kind: 'apply-status', target: { kind: 'cast-target' }, status: { statusId } },
    ],
  })

  it('two status-only spells of one affinity and shape applying different statuses do not collide', () => {
    // A throwaway pair. Keyed by status ids they differ; keyed by payload and spellPower alone (payload "none",
    // spellPower 1) both would have been `violence|single|none|1` -- the revert mutation shows it.
    const a = statusOnly('throwaway-a', 'silenced')
    const b = statusOnly('throwaway-b', 'pacified')
    expect(dedupKey(a)).not.toBe(dedupKey(b))
  })

  it('the same statuses still collide (a real reskin is still caught)', () => {
    expect(dedupKey(statusOnly('x', 'silenced'))).toBe(
      dedupKey(statusOnly('y', 'silenced')),
    )
  })
})

describe('Silence and Pacify', () => {
  // Append-only: the registry order maps RNG rolls to spells (`CONVENTIONS.md#combat-is-reproducible-from-its-inputs`),
  // so the first ids are pinned in order and the later spells come last.
  const FIRST_22 = [
    'thorn-volley',
    'thorn-lash',
    'weakening-bite',
    'vine-snare',
    'pollen-cloud',
    'arcane-bolt',
    'root-grasp',
    'bramble-ward',
    'regrowth',
    'wild-vigor',
    'stinger-swarm',
    'howling-instinct',
    'beacon-charge',
    'disorient',
    'blinding-flare',
    'afterglow',
    'kindred-light',
    'spore-cyst',
    'rasping-chant',
    'puppet-string',
    'charnel-feast',
    'withering-bolt',
  ]

  it('ALL_SPELLS is append-only: the first 22 ids in order, then Silence, then Pacify, then the last three', () => {
    // The pin is the first 24 ids, then exactly Pounce, Stifling Weight, Life Siphon.
    expect(ALL_SPELLS.slice(0, 24).map((s) => s.id)).toEqual([
      ...FIRST_22,
      'silence',
      'pacify',
    ])
    expect(ALL_SPELLS.slice(24).map((s) => s.id)).toEqual([
      'pounce',
      'stifling-weight',
      'life-siphon',
    ])
  })

  it('each is a pure single-enemy status spell with an inherited duration, unlocked at biome 1', () => {
    for (const [spell, affinity, statusId] of [
      [SILENCE, 'violence', 'silenced'],
      [PACIFY, 'wit', 'pacified'],
    ] as const) {
      expect(spell).toMatchObject({
        targetShape: 'single',
        targetSide: 'enemy',
        affinity,
        unlockedAtBiome: 1,
      })
      expect(spell.effects).toEqual([
        { kind: 'apply-status', target: { kind: 'cast-target' }, status: { statusId } },
      ])
    }
  })
})

describe('Pounce, Stifling Weight and Life Siphon', () => {
  it('Pounce is a plain single-enemy hit scaling off Speed at 100%', () => {
    expect(POUNCE).toMatchObject({
      affinity: 'instinct',
      targetShape: 'single',
      targetSide: 'enemy',
      unlockedAtBiome: 1,
    })
    expect(POUNCE.effects).toEqual([
      {
        kind: 'deal-damage',
        target: { kind: 'cast-target' },
        scalingStat: 'speed',
        spellPower: 1.0,
        damageSource: 'cast',
      },
    ])
  })

  it('Stifling Weight is a pure Weaken status spell with the inherited duration', () => {
    expect(STIFLING_WEIGHT).toMatchObject({
      affinity: 'endurance',
      targetShape: 'single',
      targetSide: 'enemy',
      unlockedAtBiome: 1,
    })
    expect(STIFLING_WEIGHT.effects).toEqual([
      {
        kind: 'apply-status',
        target: { kind: 'cast-target' },
        status: { statusId: 'weaken' },
      },
    ])
    // A status-only spell keys by its status ids, so it never collides with a damage spell.
    expect(dedupKey(STIFLING_WEIGHT)).toBe('endurance|single|status:weaken')
  })

  it('Pollen Cloud is a control spell with no damage: an AoE Sleep for 2 turns on every enemy', () => {
    expect(POLLEN_CLOUD).toMatchObject({
      affinity: 'wit',
      targetShape: 'aoe',
      targetSide: 'enemy',
      unlockedAtBiome: 1,
    })
    expect(POLLEN_CLOUD.effects).toEqual([
      {
        kind: 'apply-status',
        target: { kind: 'cast-target' },
        status: { statusId: 'sleep', duration: 2 },
      },
    ])
    expect(dedupKey(POLLEN_CLOUD)).toBe('wit|aoe|status:sleep')
  })

  it('Life Siphon hits for 70% Intelligence and heals its own caster for 35% Intelligence', () => {
    expect(LIFE_SIPHON).toMatchObject({
      affinity: 'vitality',
      targetShape: 'single',
      targetSide: 'enemy',
      unlockedAtBiome: 1,
    })
    expect(LIFE_SIPHON.effects).toEqual([
      {
        kind: 'deal-damage',
        target: { kind: 'cast-target' },
        offStat: 'cast',
        spellPower: 0.7,
      },
      {
        kind: 'heal',
        target: { kind: 'self' },
        scalingStat: 'intelligence',
        spellPower: 0.35,
      },
    ])
  })
})

describe('dedupKey reads the stat a spell scales from', () => {
  const damage = (
    id: string,
    stat: { offStat: 'cast' | 'attack' } | { scalingStat: 'intelligence' | 'speed' },
  ): Spell => ({
    id,
    name: id,
    targetShape: 'single',
    affinity: 'instinct',
    targetSide: 'enemy',
    unlockedAtBiome: 1,
    effects: [
      { kind: 'deal-damage', target: { kind: 'cast-target' }, spellPower: 1.0, ...stat },
    ],
  })

  it('Pounce (Speed) and Stinger Swarm (Intelligence) differ', () => {
    // Both are Instinct, single, plain damage at 100%: without the stat in the key they collide.
    expect(dedupKey(POUNCE)).not.toBe(dedupKey(STINGER_SWARM))
  })

  it('a spell naming one stat both ways still collides (offStat cast == scalingStat intelligence)', () => {
    expect(dedupKey(damage('a', { offStat: 'cast' }))).toBe(
      dedupKey(damage('b', { scalingStat: 'intelligence' })),
    )
  })
})
