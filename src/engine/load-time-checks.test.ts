import { describe, expect, it } from 'vitest'
import { createCombat } from './combat'
import { makeParty } from './__fixtures__/creatures'
import { validateSpecialization } from '../data/specializations'
import type { Specialization } from '../data/specializations'
import { validateEffectList, validateStatusDef, validateTrait } from './effect-types'
import type { EffectDef, StatusDef } from './effect-types'

// The two load-time checks (`spec/effects.md#validators`) must reach every effect carrier: a trait,
// a perk (at import, at every level), a side effect `createCombat` is given, and a status. Each row
// below runs on every carrier it reaches, so deleting the validator call at one site turns exactly
// that site's rows red.

function statusOf(
  effects: readonly EffectDef[],
  extra: Partial<StatusDef> = {},
): StatusDef {
  return { statusId: 's', effects, polarity: 'buff', defaultDuration: 2, ...extra }
}

function specOf(
  effects: readonly EffectDef[] | ((level: number) => readonly EffectDef[]),
  maxLevel = 1,
): Specialization {
  return {
    id: 'spec',
    name: 'Spec',
    starterCreatureId: 'starter',
    perks: [{ id: 'p', name: 'P', maxLevel, costPerLevel: 1000 / maxLevel, effects }],
  }
}

function fightWith(input: {
  playerEffects?: readonly EffectDef[]
  enemyEffects?: readonly EffectDef[]
  traits?: ReadonlyMap<
    string,
    { id: string; name: string; effects: readonly EffectDef[] }
  >
  statuses?: ReadonlyMap<string, StatusDef>
}): void {
  createCombat({
    seed: 1,
    player: { party: makeParty('player', [{ id: 'a' }]), effects: input.playerEffects },
    enemy: { party: makeParty('enemy', [{ id: 'b' }]), effects: input.enemyEffects },
    registries: { traits: input.traits, statuses: input.statuses },
  })
}

interface Carrier {
  readonly name: string
  readonly run: (effects: readonly EffectDef[]) => void
  /** A status accepts a snapshot-potency tick (with a `potency`); the others reject it. */
  readonly isStatus: boolean
}

const CARRIERS: readonly Carrier[] = [
  {
    name: 'trait',
    run: (effects) => validateTrait({ id: 't', name: 'T', effects }),
    isStatus: false,
  },
  {
    name: 'trait in the createCombat registry',
    run: (effects) =>
      fightWith({ traits: new Map([['t', { id: 't', name: 'T', effects }]]) }),
    isStatus: false,
  },
  {
    name: 'perk',
    run: (effects) => validateSpecialization(specOf(effects)),
    isStatus: false,
  },
  {
    name: 'player side effect',
    run: (effects) => fightWith({ playerEffects: effects }),
    isStatus: false,
  },
  {
    name: 'enemy side effect',
    run: (effects) => fightWith({ enemyEffects: effects }),
    isStatus: false,
  },
  {
    name: 'status',
    run: (effects) => validateStatusDef(statusOf(effects)),
    isStatus: true,
  },
  {
    name: 'status in the createCombat registry',
    run: (effects) => fightWith({ statuses: new Map([['s', statusOf(effects)]]) }),
    isStatus: true,
  },
]

describe('additive taken-pool reduction needs a reductionCap below 1', () => {
  const takenReduction = (extra: object): EffectDef => ({
    category: 'taken-reduction',
    magnitude: 0.95,
    accumulation: 'additive',
    ...extra,
  })
  const takenModifier = (extra: object): EffectDef => ({
    category: 'damage-modifier',
    direction: 'taken',
    magnitude: 0.95,
    accumulation: 'additive',
    ...extra,
  })

  for (const carrier of CARRIERS) {
    describe(carrier.name, () => {
      for (const [shape, make] of [
        ['taken-reduction', takenReduction],
        ["'taken' damage-modifier", takenModifier],
      ] as const) {
        it(`${shape}: no cap throws`, () => {
          expect(() => carrier.run([make({})])).toThrow(/reductionCap below 1/)
        })

        it(`${shape}: a cap of 1 throws`, () => {
          expect(() => carrier.run([make({ reductionCap: 1 })])).toThrow(
            /reductionCap below 1/,
          )
        })

        it(`${shape}: a NaN cap throws`, () => {
          expect(() => carrier.run([make({ reductionCap: Number.NaN })])).toThrow(
            /reductionCap below 1/,
          )
        })

        it(`${shape}: a cap of 0.8 passes`, () => {
          expect(() => carrier.run([make({ reductionCap: 0.8 })])).not.toThrow()
        })
      }

      it('a multiplicative taken source needs no cap', () => {
        expect(() =>
          carrier.run([
            { category: 'taken-reduction', magnitude: 0.95 },
            {
              category: 'damage-modifier',
              direction: 'taken',
              magnitude: 0.9,
              accumulation: 'multiplicative',
            },
          ]),
        ).not.toThrow()
      })

      it('a dealt modifier needs no cap', () => {
        expect(() =>
          carrier.run([
            {
              category: 'damage-modifier',
              direction: 'dealt',
              magnitude: -0.2,
              accumulation: 'additive',
            },
          ]),
        ).not.toThrow()
      })
    })
  }
})

describe('emitTriggerFired: false is legal only on a status tick', () => {
  const hit = (emitTriggerFired?: boolean): EffectDef => ({
    category: 'triggered',
    hook: 'on-turn-end',
    response: {
      kind: 'deal-damage',
      target: { kind: 'self' },
      flatAmount: 1,
      ...(emitTriggerFired === undefined ? {} : { emitTriggerFired }),
    },
  })
  const heal = (emitTriggerFired?: boolean): EffectDef => ({
    category: 'triggered',
    hook: 'on-turn-end',
    response: {
      kind: 'heal',
      target: { kind: 'self' },
      flatAmount: 1,
      ...(emitTriggerFired === undefined ? {} : { emitTriggerFired }),
    },
  })

  for (const carrier of CARRIERS) {
    describe(carrier.name, () => {
      it('a deal-damage trigger with the flag off throws', () => {
        expect(() => carrier.run([hit(false)])).toThrow(/emitTriggerFired: false/)
      })

      it('a heal trigger with the flag off throws', () => {
        expect(() => carrier.run([heal(false)])).toThrow(/emitTriggerFired: false/)
      })

      it('emitTriggerFired: true, or the flag absent, passes', () => {
        expect(() => carrier.run([hit(true), heal(true), hit(), heal()])).not.toThrow()
      })
    })
  }

  const tick = (kind: 'deal-damage' | 'heal'): EffectDef => ({
    category: 'triggered',
    hook: 'on-turn-end',
    response: {
      kind,
      target: { kind: 'self' },
      flatAmount: { kind: 'snapshot-potency' },
      emitTriggerFired: false,
    },
  })

  for (const kind of ['deal-damage', 'heal'] as const) {
    it(`a status's snapshot-potency ${kind} tick may turn it off`, () => {
      const potency = { ofStat: 'attack', percent: 10 } as const
      expect(() => validateStatusDef(statusOf([tick(kind)], { potency }))).not.toThrow()
      expect(() =>
        fightWith({
          statuses: new Map([['s', statusOf([tick(kind)], { potency })]]),
        }),
      ).not.toThrow()
    })
  }

  it('reads the tick off the response, not the carrier: a status trigger that is no tick throws', () => {
    expect(() => validateStatusDef(statusOf([hit(false)]))).toThrow(
      /emitTriggerFired: false/,
    )
  })
})

describe('validateEffectList keeps the existing checks', () => {
  it('a status keeps its split: stat-modifier is banned by validateStatusDef, not the list', () => {
    expect(() =>
      validateStatusDef(
        statusOf([{ category: 'stat-modifier', stat: 'attack', factor: 1.1 }]),
      ),
    ).toThrow(/may not carry/)
  })

  it('a permanent carrier rejects a break chance, a status accepts it', () => {
    const web: EffectDef = {
      category: 'turn-order',
      position: 'last',
      breakChancePercent: 50,
    }
    expect(() => validateEffectList([web], 'trait "t"', 'permanent')).toThrow(
      /breakChancePercent is only valid inside a status/,
    )
    expect(() => validateEffectList([web], 'status "s"', 'status')).not.toThrow()
  })

  it('a permanent carrier rejects a snapshot-potency magnitude, a status list does not', () => {
    const tick: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
      },
    }
    expect(() => validateEffectList([tick], 'trait "t"', 'permanent')).toThrow(
      /snapshot-potency/,
    )
    expect(() => validateEffectList([tick], 'status "s"', 'status')).not.toThrow()
  })

  it('keeps the random-selector message of each carrier kind', () => {
    const random: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'apply-status',
        target: { kind: 'selector', selector: { kind: 'random' } },
        status: { statusId: 'x' },
      },
    }
    expect(() => validateEffectList([random], 'trait "t"', 'permanent')).toThrow(
      /a "on-turn-end" trigger's response targets the intent-only 'random' selector/,
    )
    expect(() => validateEffectList([random], 'status "s"', 'status')).toThrow(
      /status "s"'s "on-turn-end" trigger's response targets the intent-only 'random' selector/,
    )
  })
})

describe('a perk is validated at every level it can be bought at', () => {
  // Level 1 and 2 are fine; from level 3 the cap is gone.
  const leveled = (level: number): readonly EffectDef[] => [
    {
      category: 'taken-reduction',
      magnitude: 0.95,
      accumulation: 'additive',
      ...(level < 3 ? { reductionCap: 0.5 } : {}),
    },
  ]

  it('throws at import when a level above 1 is bad', () => {
    expect(() => validateSpecialization(specOf(leveled, 4))).toThrow(
      /perk "p".*reductionCap below 1/,
    )
  })

  it('passes when no level is bad', () => {
    expect(() => validateSpecialization(specOf(() => leveled(1), 4))).not.toThrow()
  })
})
