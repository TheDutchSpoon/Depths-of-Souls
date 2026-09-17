import { describe, expect, it } from 'vitest'
import type { Spell } from '../../engine/types'
import { ALL_SPELLS } from './index'

// Phase 4 interstitial slice (cumulative spell unlock). This registry only exists because H2
// accidentally re-authored a near-complete Overgrowth kit under new names in Glimmerdark (9
// exact-or-near reskins, since deleted -- see data/spells/glimmerdark.ts's own header comment).
// This guard is cheap protection against the SAME mistake in H3+: two spells that are
// mechanically identical (same affinity + targetShape + payload + magnitude) but for their name
// and id.
//
// ASSUMPTION: the brief's own guard wording is "(affinity, targetShape, payload, factor)" --
// "factor" isn't a literal field on Spell. Read here as `spellPower` (the field every spell
// carries; for a `stat-modifier`-payload spell it's an unread placeholder, always authored as the
// literal `1` -- see e.g. overgrowth.ts's WEAKENING_BITE/BRAMBLE_WARD -- which is exactly why this
// simple key still caught every REAL duplicate pair pre-deletion: every stat-modifier reskin
// shared the same placeholder). A future stat-modifier spell that deliberately reuses an existing
// (affinity, targetShape) pair with a genuinely different `statModifier` would produce a
// false-positive collision under this key; none exists in v1 content, so this is left as a known
// sharp edge rather than a speculative field addition.
function dedupKey(spell: Spell): string {
  return `${spell.affinity}|${spell.targetShape}|${spell.payload ?? 'damage'}|${spell.spellPower}`
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
