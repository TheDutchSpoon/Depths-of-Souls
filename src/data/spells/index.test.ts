import { describe, expect, it } from 'vitest'
import type { Spell } from '../../engine/types'
import { ALL_SPELLS, PACIFY, SILENCE } from './index'

// Phase 4 interstitial slice (cumulative spell unlock). This registry only exists because H2
// accidentally re-authored a near-complete Overgrowth kit under new names in Glimmerdark (9
// exact-or-near reskins, since deleted -- see data/spells/glimmerdark.ts's own header comment).
// This guard is cheap protection against the SAME mistake in H3+: two spells that are
// mechanically identical (same affinity + targetShape + effect kind + magnitude) but for their name
// and id.
//
// ASSUMPTION: the brief's own guard wording is "(affinity, targetShape, payload, factor)" --
// "factor" read as the primary effect's `spellPower`. Pre-4.1-D that field was a spell-level one
// and an unread placeholder `1` on every stat-modifier spell, which is why this simple key caught
// every REAL duplicate pair pre-deletion (every stat-modifier reskin shared the placeholder); the
// key below keeps that behaviour (an `apply-stat-modifier` primary effect keys as spellPower 1). A
// future stat-modifier spell that deliberately reuses an existing (affinity, targetShape) pair
// with a genuinely different stat/factor would produce a false-positive collision under this key;
// none exists in v1 content, so this is left as a known sharp edge rather than a speculative
// addition.
/** Phase 4.1-F3 (ASSUMPTION 60): a spell is status-only when every effect is `apply-status`.
 * Before this, every such spell of one affinity and shape keyed to `...|none|1`, so a second one
 * in an affinity would have been a false duplicate. */
function statusOnlyIds(spell: Spell): string[] | null {
  if (spell.effects.length === 0) return null
  const ids: string[] = []
  for (const e of spell.effects) {
    if (e.kind !== 'apply-status') return null
    ids.push(e.status.statusId)
  }
  return ids.sort()
}

function dedupKey(spell: Spell): string {
  const statusIds = statusOnlyIds(spell)
  if (statusIds)
    return `${spell.affinity}|${spell.targetShape}|status:${statusIds.join(',')}`
  // 4.1-D: the old (payload, spellPower) pair, read off the spell's PRIMARY effect -- the first
  // damage/heal/stat-modifier effect (an `apply-status` rider never distinguished two spells).
  const primary = spell.effects.find((e) => e.kind !== 'apply-status')
  const payload =
    primary?.kind === 'apply-stat-modifier' ? 'stat-modifier' : (primary?.kind ?? 'none')
  const spellPower =
    primary?.kind === 'deal-damage' || primary?.kind === 'heal'
      ? (primary.spellPower ?? 1)
      : 1
  return `${spell.affinity}|${spell.targetShape}|${payload}|${spellPower}`
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

  it('no two spells share (affinity, targetShape, payload, factor) -- guards against H3+ reintroducing the H2 reskin mistake', () => {
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

describe('dedupKey for status-only spells (Phase 4.1-F3)', () => {
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
    // A throwaway pair. Keyed by status ids they differ; keyed the old way (payload "none",
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

describe('Silence and Pacify (Phase 4.1-F3, G2)', () => {
  // Append-only: the registry order maps RNG rolls to spells (CONVENTIONS "determinism is
  // sacred"), so the first 25 ids are pinned in order and the two new spells come last.
  const FIRST_25 = [
    'ember-lance',
    'cinder-nova',
    'venom-bolt',
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
    'overcharge',
    'disorient',
    'blinding-flare',
    'afterglow',
    'luminous-tide',
    'spore-cyst',
    'rasping-chant',
    'puppet-string',
    'charnel-feast',
    'withering-bolt',
  ]

  it('ALL_SPELLS is append-only: the original 25 ids in order, then Silence, then Pacify', () => {
    expect(ALL_SPELLS.slice(0, 25).map((s) => s.id)).toEqual(FIRST_25)
    expect(ALL_SPELLS.slice(25).map((s) => s.id)).toEqual(['silence', 'pacify'])
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
