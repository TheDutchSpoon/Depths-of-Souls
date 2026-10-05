import { describe, expect, it } from 'vitest'
import {
  BRUTE,
  SHIELDBARER,
  SORCERER,
  SPECIALIZATIONS,
  SPECIALIZATIONS_BY_ID,
  resolvePerkEffects,
  resolveSpecializationEffects,
  validateSpecialization,
} from './specializations'
import type { Specialization } from './specializations'

describe('validateSpecialization', () => {
  it('accepts all three shipped specs (already validated at module load)', () => {
    for (const spec of SPECIALIZATIONS) {
      expect(() => validateSpecialization(spec)).not.toThrow()
    }
  })

  it('throws for a spec whose perks do not sum to exactly 1000', () => {
    const broken: Specialization = {
      id: 'broken',
      name: 'Broken',
      starterCreatureId: 'nope',
      perks: [{ id: 'p', name: 'P', maxLevel: 1, costPerLevel: 999, effects: [] }],
    }
    expect(() => validateSpecialization(broken)).toThrow(/sum to 999/)
  })
})

describe('shipped spec shape', () => {
  it('Sorcerer has 12 perks, Brute and Shieldbarer 10 each (per each .md table)', () => {
    expect(SORCERER.perks).toHaveLength(12)
    expect(BRUTE.perks).toHaveLength(10)
    expect(SHIELDBARER.perks).toHaveLength(10)
  })

  it('SPECIALIZATIONS_BY_ID indexes all three by id', () => {
    expect(SPECIALIZATIONS_BY_ID.get('sorcerer')).toBe(SORCERER)
    expect(SPECIALIZATIONS_BY_ID.get('brute')).toBe(BRUTE)
    expect(SPECIALIZATIONS_BY_ID.get('shieldbarer')).toBe(SHIELDBARER)
  })

  it("every perk's own maxLevel*costPerLevel matches its .md-table Total column", () => {
    // Spot-checks the two multi-level Sorcerer perks against sorcerer.md's own Total column.
    const arcaneMight = SORCERER.perks.find((p) => p.id === 'arcane-might')!
    expect(arcaneMight.maxLevel * arcaneMight.costPerLevel).toBe(100)
    const spellFocus = SORCERER.perks.find((p) => p.id === 'spell-focus')!
    expect(spellFocus.maxLevel * spellFocus.costPerLevel).toBe(100)
  })
})

// Phase 4.1-G2 (G4): `PerkDef.phase` is deleted; the nine perks that stay inert until Phase 8 are
// an explicit list here, each with a code comment in specializations.ts.
const KNOWN_INERT_PERK_IDS = [
  'wit-mastery',
  'violence-mastery',
  'endurance-mastery',
  'vitality-mastery',
  'instinct-mastery',
  'arcane-shields',
  'arcane-versatility',
  'true-wit',
  'shield-specialist',
]

describe('Known-inert perks (Phase 4.1-G2, G4)', () => {
  const allPerks = SPECIALIZATIONS.flatMap((spec) => spec.perks)

  it('the list names 9 real perks, and each resolves to zero effects at max level', () => {
    expect(KNOWN_INERT_PERK_IDS).toHaveLength(9)
    for (const id of KNOWN_INERT_PERK_IDS) {
      const perk = allPerks.find((p) => p.id === id)
      expect(perk, id).toBeDefined()
      expect(resolvePerkEffects(perk!, perk!.maxLevel), id).toEqual([])
    }
  })

  it('every perk NOT on the list resolves to at least one effect at max level', () => {
    for (const perk of allPerks) {
      if (KNOWN_INERT_PERK_IDS.includes(perk.id)) continue
      expect(resolvePerkEffects(perk, perk.maxLevel).length, perk.id).toBeGreaterThan(0)
    }
  })
})

describe('resolvePerkEffects', () => {
  it('an unpurchased perk (level 0) contributes nothing, leveled or flat', () => {
    const might = BRUTE.perks.find((p) => p.id === 'might')!
    expect(resolvePerkEffects(might, 0)).toEqual([])
    const flurry = BRUTE.perks.find((p) => p.id === 'flurry')!
    expect(resolvePerkEffects(flurry, 0)).toEqual([])
  })

  it('a leveled perk bakes the purchased level into its returned effect (no rank concept downstream)', () => {
    const might = BRUTE.perks.find((p) => p.id === 'might')!
    expect(resolvePerkEffects(might, 10)).toEqual([
      { category: 'stat-modifier', stat: 'attack', factor: 1.1 },
    ])
    expect(resolvePerkEffects(might, 50)).toEqual([
      { category: 'stat-modifier', stat: 'attack', factor: 1.5 },
    ])
  })

  it('a flat (non-leveled) perk returns its fixed effects array unchanged at any purchased level', () => {
    const flurry = BRUTE.perks.find((p) => p.id === 'flurry')!
    expect(resolvePerkEffects(flurry, 1)).toEqual([
      { category: 'action-instance', actionKind: 'attack', powerPercent: 100 },
    ])
  })
})

describe('resolveSpecializationEffects', () => {
  it('flattens multiple purchased perks into one effect list, in perk-table order', () => {
    const spend = new Map([
      ['flurry', 1],
      ['might', 5],
    ])
    expect(resolveSpecializationEffects(BRUTE, spend)).toEqual([
      { category: 'action-instance', actionKind: 'attack', powerPercent: 100 },
      { category: 'stat-modifier', stat: 'attack', factor: 1.05 },
    ])
  })

  it('an empty spend map contributes nothing', () => {
    expect(resolveSpecializationEffects(BRUTE, new Map())).toEqual([])
  })
})
