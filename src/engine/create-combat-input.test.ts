import { describe, expect, it } from 'vitest'
import { createCombat } from './combat'
import { PARTY_SIZE } from './config'
import { makeCreature, makeParty } from './__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import type { CreatureOverrides } from './__fixtures__/creatures'
import { createEffectInstanceId, type EffectDef } from './effect-types'
import type { Creature } from './types'

// `createCombat` checks its input at the boundary (`spec/combat.md#fight-setup`): the guard tests
// below each build an otherwise valid fight and break exactly one thing.

const FOE: Creature[] = makeParty('enemy', [{ id: 'foe' }])

function fight(
  player: readonly Creature[],
  enemy: readonly Creature[] = FOE,
  extra: {
    playerEffects?: readonly EffectDef[]
    enemyEffects?: readonly EffectDef[]
    scripts?: Parameters<typeof createCombat>[0]['registries']
  } = {},
) {
  return createCombat({
    seed: 1,
    player: { party: player, effects: extra.playerEffects },
    enemy: { party: enemy, effects: extra.enemyEffects },
    registries: extra.scripts,
  })
}

function sideOf(side: 'player' | 'enemy', slots: number[]): Creature[] {
  return slots.map((slot) => makeCreature({ id: `${side}-${slot}`, side, slot }))
}

describe('createCombat: scriptId', () => {
  it('throws on a scriptId missing from the script registry', () => {
    const player = makeParty('player', [{ id: 'a', scriptId: 'nope' }])
    expect(() =>
      fight(player, FOE, { scripts: { scripts: FIXTURE_SCRIPTS_BY_ID } }),
    ).toThrow(/creature "a" names script "nope"/)
  })

  it('checks the enemy side too', () => {
    const player = makeParty('player', [{ id: 'a' }])
    const enemy = makeParty('enemy', [{ id: 'b', scriptId: 'nope' }])
    expect(() =>
      fight(player, enemy, { scripts: { scripts: FIXTURE_SCRIPTS_BY_ID } }),
    ).toThrow(/creature "b" names script "nope"/)
  })

  it('accepts a null scriptId, and a scriptId the registry holds', () => {
    const player = makeParty('player', [
      { id: 'a', scriptId: null },
      { id: 'b', scriptId: 'always-attack' },
    ])
    expect(() =>
      fight(player, FOE, { scripts: { scripts: FIXTURE_SCRIPTS_BY_ID } }),
    ).not.toThrow()
  })

  it('treats an omitted script registry as empty: any non-null scriptId throws', () => {
    const player = makeParty('player', [{ id: 'a', scriptId: 'always-attack' }])
    expect(() => fight(player)).toThrow(/names script "always-attack"/)
    expect(() => fight(makeParty('player', [{ id: 'a', scriptId: null }]))).not.toThrow()
  })
})

describe('createCombat: freshness', () => {
  function thrownMessage(run: () => unknown): string {
    try {
      run()
    } catch (e) {
      return (e as Error).message
    }
    return ''
  }

  const cases: [string, string, CreatureOverrides][] = [
    ['alive: false', 'alive: false', { alive: false }],
    ['defending', 'defending', { defending: true }],
    ['provoking', 'provoking', { provoking: true }],
    ['a non-zero defendCount', 'defendCount', { defendCount: 1 }],
    ['a non-zero revivesUsed', 'revivesUsed', { revivesUsed: 1 }],
    [
      'non-empty baselineEffects',
      'baselineEffects',
      {
        baselineEffects: [
          { def: { category: 'cheat-death', chancePercent: 1 }, sourceTraitId: 't' },
        ],
      },
    ],
    [
      'non-empty activeEffects',
      'activeEffects',
      {
        activeEffects: [
          {
            category: 'cheat-death',
            chancePercent: 1,
            instanceId: createEffectInstanceId('eff-0'),
            sourceTraitId: 't',
          },
        ],
      },
    ],
  ]

  for (const [name, field, overrides] of cases) {
    it(`throws on a creature with ${name}`, () => {
      const player = makeParty('player', [{ id: 'a', ...overrides }])
      expect(() => fight(player)).toThrow(
        new RegExp(`creature "a" already carries fight-setup output \\(${field}\\)`),
      )
      // The innate-spell reason belongs to the two effect lists alone.
      const innate = /innate spells would double/.test(thrownMessage(() => fight(player)))
      expect(innate).toBe(field.endsWith('Effects'))
    })

    it(`throws on an enemy with ${name}`, () => {
      const enemy = makeParty('enemy', [{ id: 'e', ...overrides }])
      expect(() => fight(makeParty('player', [{ id: 'a' }]), enemy)).toThrow(
        new RegExp(`creature "e" already carries fight-setup output \\(${field}\\)`),
      )
    })
  }

  it('does not check currentHp: a fresh creature below its max passes, and is set to max', () => {
    const player = makeParty('player', [{ id: 'a', health: 20, currentHp: 5 }])
    expect(fight(player).playerParty[0]!.currentHp).toBe(20)
  })
})

describe('createCombat: slots', () => {
  it('throws on two creatures with one slot on a side', () => {
    const player = [
      makeCreature({ id: 'a', slot: 0 }),
      makeCreature({ id: 'b', slot: 0 }),
    ]
    expect(() => fight(player)).toThrow(/shares slot 0/)
  })

  for (const slot of [-1, PARTY_SIZE, 1.5, Number.NaN]) {
    it(`throws on slot ${slot}, outside 0..${PARTY_SIZE - 1}`, () => {
      const player = [makeCreature({ id: 'a', slot })]
      expect(() => fight(player)).toThrow(/outside 0\.\.5/)
    })
  }

  it('throws on a party array not in slot order', () => {
    const player = sideOf('player', [1, 0])
    expect(() => fight(player)).toThrow(/out of slot order/)
  })

  it('does not require contiguous slots: a gap is a legal party', () => {
    expect(() => fight(sideOf('player', [0, 2]))).not.toThrow()
    expect(() => fight(sideOf('player', [3]))).not.toThrow()
  })

  it('accepts a full party of PARTY_SIZE creatures', () => {
    expect(() => fight(sideOf('player', [0, 1, 2, 3, 4, 5]))).not.toThrow()
  })

  it('runs the same checks on the enemy side', () => {
    const player = sideOf('player', [0])
    expect(() =>
      fight(player, [
        makeCreature({ id: 'x', side: 'enemy', slot: 2 }),
        makeCreature({ id: 'y', side: 'enemy', slot: 2 }),
      ]),
    ).toThrow(/shares slot 2 .*enemy\.party/)
    expect(() => fight(player, sideOf('enemy', [2, 1]))).toThrow(/out of slot order/)
    expect(() =>
      fight(player, [makeCreature({ id: 'z', side: 'enemy', slot: PARTY_SIZE })]),
    ).toThrow(/outside 0\.\.5/)
  })
})

describe('createCombat: ids', () => {
  it('throws on one id on both sides', () => {
    const player = [makeCreature({ id: 'same', side: 'player', slot: 0 })]
    const enemy = [makeCreature({ id: 'same', side: 'enemy', slot: 0 })]
    expect(() => fight(player, enemy)).toThrow(/share the id "same"/)
  })

  it('throws on one id twice on a side (distinct slots)', () => {
    const player = [
      makeCreature({ id: 'same', slot: 0 }),
      makeCreature({ id: 'same', slot: 1 }),
    ]
    expect(() => fight(player)).toThrow(/share the id "same"/)
  })
})

describe('createCombat: side effects are validated', () => {
  // An additive taken reduction with no cap: a count-scaled one reaches 100%.
  const UNCAPPED: EffectDef = {
    category: 'taken-reduction',
    magnitude: 0.95,
    accumulation: 'additive',
  }

  it('throws on a bad player side effect', () => {
    expect(() =>
      fight(makeParty('player', [{ id: 'a' }]), FOE, { playerEffects: [UNCAPPED] }),
    ).toThrow(/player effect.*reductionCap/)
  })

  it('throws on a bad enemy side effect', () => {
    expect(() =>
      fight(makeParty('player', [{ id: 'a' }]), FOE, { enemyEffects: [UNCAPPED] }),
    ).toThrow(/enemy effect.*reductionCap/)
  })

  it('accepts a good side effect on each side', () => {
    const capped: EffectDef = { ...UNCAPPED, reductionCap: 0.8 }
    expect(() =>
      fight(makeParty('player', [{ id: 'a' }]), FOE, {
        playerEffects: [capped],
        enemyEffects: [capped],
      }),
    ).not.toThrow()
  })
})
