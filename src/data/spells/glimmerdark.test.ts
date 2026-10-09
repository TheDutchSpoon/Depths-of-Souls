// Phase 4.1-H2b1 (ASSUMPTION 116): Glimmerdark's spell changes, against
// `.claude/content/glimmerdark.md`. Glow is deleted: Beacon Charge grants Grant Act First instead,
// Overcharge is gone, and Luminous Tide is Kindred Light (a plain team heal).

import { describe, expect, it } from 'vitest'
import { BEACON_CHARGE, KINDRED_LIGHT } from './glimmerdark'
import { GLIMMERDARK_SPELLS } from '../species/glimmerdark'
import { ALL_SPELLS } from '.'

describe('Beacon Charge', () => {
  it('heals 30% of the caster Health, then grants Grant Act First at the status default', () => {
    expect(BEACON_CHARGE.effects).toEqual([
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
    ])
  })
})

describe('Kindred Light', () => {
  it('is Luminous Tide renamed in place: a Wit AOE ally heal of 20% of the caster Health, no status', () => {
    expect(KINDRED_LIGHT).toMatchObject({
      id: 'kindred-light',
      name: 'Kindred Light',
      targetShape: 'aoe',
      affinity: 'wit',
      targetSide: 'ally',
      unlockedAtBiome: 2,
    })
    expect(KINDRED_LIGHT.effects).toEqual([
      {
        kind: 'heal',
        target: { kind: 'cast-target' },
        scalingStat: 'health',
        spellPower: 0.2,
      },
    ])
  })
})

describe('Glimmerdark spells', () => {
  it('are five: Overcharge is deleted', () => {
    expect(GLIMMERDARK_SPELLS.map((s) => s.id)).toEqual([
      'beacon-charge',
      'disorient',
      'blinding-flare',
      'afterglow',
      'kindred-light',
    ])
    expect(ALL_SPELLS.some((s) => s.id === 'overcharge')).toBe(false)
    expect(ALL_SPELLS.some((s) => s.id === 'luminous-tide')).toBe(false)
  })

  it('no spell applies the deleted Glow status', () => {
    for (const spell of ALL_SPELLS) {
      for (const effect of spell.effects) {
        if (effect.kind === 'apply-status') {
          expect(effect.status.statusId).not.toBe('glow')
        }
      }
    }
  })
})
