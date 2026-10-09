// Phase 4.1-H2b1: the Flickerling traits' shape, against `.claude/content/glimmerdark.md`. The
// behaviour is pinned by goldens (golden-h2b1-wick-*, -observed-lethal, -last-gleam); these tests
// pin the data a golden cannot see: which hooks, which filters, the effect order and the gate.

import { describe, expect, it } from 'vitest'
import {
  FLICKERLING_FLARE_TRAIT,
  FLICKERLING_LAST_GLEAM_TRAIT,
  FLICKERLING_WICK_TRAIT,
} from './glimmerdark'
import { TRAIT_REGISTRY } from '.'

describe('the Flickerling Wick (ASSUMPTION 140)', () => {
  const [burn, heal, ...rest] = FLICKERLING_WICK_TRAIT.effects

  it('has exactly two effects, both on-turn-start and both gated on another ally being hurt', () => {
    expect(rest).toEqual([])
    for (const effect of [burn, heal]) {
      expect(effect).toMatchObject({
        category: 'triggered',
        hook: 'on-turn-start',
        condition: { kind: 'other-ally-injured' },
      })
    }
  })

  it('burns first, then heals (a lethal burn skips the heal through the per-effect alive check)', () => {
    expect(burn).toMatchObject({ response: { kind: 'deal-damage' } })
    expect(heal).toMatchObject({ response: { kind: 'heal' } })
  })

  it('the burn is a cost: a self-targeted flat 10% of its own Health with no statusId and no formula mode', () => {
    expect(burn).toMatchObject({
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { ofStat: 'health', percent: 10 },
      },
    })
    const response = (burn as { response: Record<string, unknown> }).response
    expect(response.offStat).toBeUndefined()
    expect(response.scalingStat).toBeUndefined()
    expect(response.damageSource).toBeUndefined() // the default 'dot' label; nothing reads it
  })

  it('the heal goes to the lowest-HP injured ally other than the Wick, for 20% of its own Health', () => {
    expect(heal).toMatchObject({
      response: {
        kind: 'heal',
        target: { kind: 'lowest-hp-injured-other-ally' },
        flatAmount: { ofStat: 'health', percent: 20 },
      },
    })
  })
})

describe('the Flickerling Flare', () => {
  it("watches an ally's own damage (a cost) and gives every ally +15% Speed", () => {
    expect(FLICKERLING_FLARE_TRAIT.effects).toEqual([
      {
        category: 'triggered',
        hook: 'on-damage-observed',
        observationFilter: { relationship: 'ally', selfInflicted: true },
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'all-allies' },
          stat: 'speed',
          factor: 1.15,
        },
      },
    ])
  })
})

describe('the Flickerling Last Gleam', () => {
  it('reacts to an ally dying by giving every ally +20% Attack', () => {
    expect(FLICKERLING_LAST_GLEAM_TRAIT.effects).toEqual([
      {
        category: 'triggered',
        hook: 'on-ally-death',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'all-allies' },
          stat: 'attack',
          factor: 1.2,
        },
      },
    ])
  })
})

describe('registry', () => {
  it('the three Flickerling traits are registered', () => {
    for (const trait of [
      FLICKERLING_WICK_TRAIT,
      FLICKERLING_FLARE_TRAIT,
      FLICKERLING_LAST_GLEAM_TRAIT,
    ]) {
      expect(TRAIT_REGISTRY.get(trait.id)).toBe(trait)
    }
  })
})
