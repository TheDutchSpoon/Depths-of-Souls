// Phase 4.1-H2b1 (ASSUMPTIONS 115, 132, 137, 142): damage observation -- the `on-damage-observed`
// sibling hook, fired from `applyDamageAndEmit` for every damage event, filtered by the DAMAGED
// creature's relationship to the observer and by whether the damage was self-inflicted (a COST).
// Mechanism tests; the goldens `golden-h2b1-observed-*` pin the same behaviour as replays.

import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { createResolutionContext } from './actions'
import { dealDamage, executeResponse, fireHook, newCascade } from './resolution'
import { makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import { validateObservationFilters, validateStatusDef } from './effect-types'
import { validateTrait } from '../data/traits'
import { validateSpecialization } from '../data/specializations'
import type { CombatEvent, CombatState } from './types'
import type { EffectDef, ObservationFilter, StatusDef, Trait } from './effect-types'

const V = createCreatureId('v') // the victim (player side)
const W = createCreatureId('w') // a watcher on the victim's side
const X = createCreatureId('x') // the enemy attacker
const Y = createCreatureId('y') // a watcher on the enemy side

function watcherTrait(
  id: string,
  filter: ObservationFilter | undefined,
  hook: 'on-damage-observed' | 'on-action-observed' = 'on-damage-observed',
): Trait {
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook,
        ...(filter ? { observationFilter: filter } : {}),
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor: 1.1,
        },
      },
    ],
  }
}

interface WorldOptions {
  /** Trait ids by creature id. */
  readonly traits?: Readonly<Record<string, readonly string[]>>
  readonly registry?: readonly Trait[]
  readonly health?: Readonly<Record<string, number>>
  readonly scripts?: Readonly<Record<string, string>>
}

/** Player: V (victim), W; enemy: X (attacker), Y. All vitality, health 100 unless overridden. */
function world(opts: WorldOptions = {}): CombatState {
  const t = (id: string) => opts.traits?.[id] ?? []
  const h = (id: string) => opts.health?.[id] ?? 100
  const s = (id: string, fallback: string) => opts.scripts?.[id] ?? fallback
  return createCombat({
    seed: 1,
    player: {
      party: makeParty('player', [
        {
          id: 'v',
          health: h('v'),
          speed: 20,
          scriptId: s('v', 'always-wait'),
          innateTraitIds: t('v'),
        },
        {
          id: 'w',
          health: h('w'),
          speed: 10,
          scriptId: s('w', 'always-wait'),
          innateTraitIds: t('w'),
        },
      ]),
    },
    enemy: {
      party: makeParty('enemy', [
        {
          id: 'x',
          health: h('x'),
          attack: 30,
          speed: 5,
          scriptId: s('x', 'always-wait'),
          innateTraitIds: t('x'),
        },
        {
          id: 'y',
          health: h('y'),
          speed: 1,
          scriptId: s('y', 'always-wait'),
          innateTraitIds: t('y'),
        },
      ]),
    },
    registries: {
      scripts: FIXTURE_SCRIPTS_BY_ID,
      traits: new Map((opts.registry ?? []).map((tr) => [tr.id, tr])),
    },
  })
}

function observedBy(events: readonly CombatEvent[]): string[] {
  return events
    .filter((e) => e.type === 'TriggerFired' && e.hook === 'on-damage-observed')
    .map((e) => (e.type === 'TriggerFired' ? e.sourceId : ''))
}

// ---- The five ways damage lands on V, by the branch that produced it ----

type Scenario = 'cost' | 'tick' | 'enemy-hit' | 'own-direct' | 'flat-on-other'

function inflict(scenario: Scenario, state: CombatState): CombatEvent[] {
  const events: CombatEvent[] = []
  const ctx = createResolutionContext(events, newCascade())
  switch (scenario) {
    case 'cost': // V's own response damaging V (no statusId): the cost branch
      executeResponse(
        { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 3 },
        'fixture',
        { channel: 'indirect', self: V },
        state,
        ctx,
      )
      break
    case 'tick': // a self-applied status tick (applier = bearer): the tick path (source === target)
      executeResponse(
        {
          kind: 'deal-damage',
          target: { kind: 'self' },
          flatAmount: { kind: 'snapshot-potency' },
        },
        'fixture',
        {
          channel: 'indirect',
          self: V,
          statusId: 'some-status',
          snapshot: { applierId: V, affinity: 'vitality', potency: 3 },
        },
        state,
        ctx,
      )
      break
    case 'enemy-hit': // an ordinary direct hit: dealer X is on the other side
      dealDamage(X, V, 'attack', 1, 'attack', 'direct', state, ctx)
      break
    case 'own-direct': // a direct action landing on its own actor (source === target, no cost)
      dealDamage(V, V, 'attack', 1, 'attack', 'direct', state, ctx)
      break
    case 'flat-on-other': // a flat response on ANOTHER creature (indirect, not a cost)
      executeResponse(
        {
          kind: 'deal-damage',
          target: { kind: 'selector', selector: { kind: 'lowest-hp-enemy' } },
          flatAmount: 3,
        },
        'fixture',
        { channel: 'indirect', self: X },
        state,
        ctx,
      )
      break
  }
  return events
}

type Row = readonly [
  label: string,
  observer: 'v' | 'w' | 'x' | 'y',
  filter: ObservationFilter | undefined,
  fires: Readonly<Record<Scenario, boolean>>,
]

// V is the damaged creature in every scenario. `w` is V's ally; `y` is on the dealer's side and
// V's enemy; `x` is the enemy dealer. The enemy-hit row is the one that separates "relationship
// against the DAMAGED creature" from "against the dealer": every cost has dealer === damaged.
const MATRIX: readonly Row[] = [
  [
    "ally + selfInflicted:true (the Flare's filter), on an ally",
    'w',
    { relationship: 'ally', selfInflicted: true },
    {
      cost: true,
      tick: false,
      'enemy-hit': false,
      'own-direct': false,
      'flat-on-other': false,
    },
  ],
  [
    'ally + selfInflicted:false, on an ally',
    'w',
    { relationship: 'ally', selfInflicted: false },
    {
      cost: false,
      tick: true,
      'enemy-hit': true,
      'own-direct': true,
      'flat-on-other': true,
    },
  ],
  [
    'ally, no selfInflicted: reads the DAMAGED creature (an enemy hitting V still fires)',
    'w',
    { relationship: 'ally' },
    {
      cost: true,
      tick: true,
      'enemy-hit': true,
      'own-direct': true,
      'flat-on-other': true,
    },
  ],
  [
    "enemy, on V's ally: the damaged V is not its enemy",
    'w',
    { relationship: 'enemy' },
    {
      cost: false,
      tick: false,
      'enemy-hit': false,
      'own-direct': false,
      'flat-on-other': false,
    },
  ],
  [
    "enemy, on the DEALER's side: fires on every V hit (read against the dealer it would not)",
    'y',
    { relationship: 'enemy' },
    {
      cost: true,
      tick: true,
      'enemy-hit': true,
      'own-direct': true,
      'flat-on-other': true,
    },
  ],
  [
    "ally, on the dealer's side: V is not its ally",
    'y',
    { relationship: 'ally' },
    {
      cost: false,
      tick: false,
      'enemy-hit': false,
      'own-direct': false,
      'flat-on-other': false,
    },
  ],
  [
    "self, on V itself (a creature observes its own cost: 'ally' includes self)",
    'v',
    { relationship: 'self', selfInflicted: true },
    {
      cost: true,
      tick: false,
      'enemy-hit': false,
      'own-direct': false,
      'flat-on-other': false,
    },
  ],
  [
    'self, on a different creature: never',
    'w',
    { relationship: 'self' },
    {
      cost: false,
      tick: false,
      'enemy-hit': false,
      'own-direct': false,
      'flat-on-other': false,
    },
  ],
  [
    'no filter at all: every damage event',
    'w',
    undefined,
    {
      cost: true,
      tick: true,
      'enemy-hit': true,
      'own-direct': true,
      'flat-on-other': true,
    },
  ],
]

describe('the filter matrix: relationship x selfInflicted (4.1-H2b1)', () => {
  for (const [label, observer, filter, fires] of MATRIX) {
    for (const scenario of Object.keys(fires) as Scenario[]) {
      it(`${label} | ${scenario}: ${fires[scenario] ? 'fires' : 'silent'}`, () => {
        const trait = watcherTrait('watch', filter)
        const state = world({ traits: { [observer]: [trait.id] }, registry: [trait] })

        const events = inflict(scenario, state)

        expect(observedBy(events)).toEqual(fires[scenario] ? [observer] : [])
      })
    }
  }

  it('self-inflicted is the cost classification, never source === target: a tick and an own-actor direct hit both have equal ids and neither is a cost', () => {
    const trait = watcherTrait('watch', { selfInflicted: true })
    const state = world({ traits: { w: [trait.id] }, registry: [trait] })

    for (const scenario of ['tick', 'own-direct'] as const) {
      const events = inflict(scenario, state)
      const dealt = events.find((e) => e.type === 'DamageDealt')
      expect(dealt).toMatchObject({ sourceId: V, targetId: V }) // equal ids...
      expect(observedBy(events)).toEqual([]) // ...but not a cost
    }
  })
})

describe('both observation hooks fail closed (4.1-H2b1)', () => {
  it('on-damage-observed without observedDamage fires nothing, filtered or not', () => {
    const plain = watcherTrait('plain', undefined)
    const filtered = watcherTrait('filtered', { relationship: 'ally' })
    const state = world({
      traits: { w: [plain.id], v: [filtered.id] },
      registry: [plain, filtered],
    })
    const events: CombatEvent[] = []

    fireHook(
      'on-damage-observed',
      [V, W, X, Y],
      V,
      state,
      createResolutionContext(events, newCascade()),
    )

    expect(events).toEqual([])
  })

  it('on-action-observed without observed fires nothing, filtered or not', () => {
    const plain = watcherTrait('plain', undefined, 'on-action-observed')
    const filtered = watcherTrait(
      'filtered',
      { relationship: 'ally' },
      'on-action-observed',
    )
    const state = world({
      traits: { w: [plain.id], v: [filtered.id] },
      registry: [plain, filtered],
    })
    const events: CombatEvent[] = []

    fireHook(
      'on-action-observed',
      [V, W, X, Y],
      V,
      state,
      createResolutionContext(events, newCascade()),
    )

    expect(events).toEqual([])
  })

  it('...and the same call WITH its option does fire (the skip above is the missing option, nothing else)', () => {
    const plain = watcherTrait('plain', undefined, 'on-action-observed')
    const plainDamage = watcherTrait('plain-d', undefined)
    const state = world({
      traits: { w: [plain.id, plainDamage.id] },
      registry: [plain, plainDamage],
    })
    const actionEvents: CombatEvent[] = []
    const damageEvents: CombatEvent[] = []

    fireHook(
      'on-action-observed',
      [W],
      V,
      state,
      createResolutionContext(actionEvents, newCascade()),
      {
        observed: { actionKind: 'cast', instanceIndex: 0 },
      },
    )
    fireHook(
      'on-damage-observed',
      [W],
      V,
      state,
      createResolutionContext(damageEvents, newCascade()),
      {
        observedDamage: { selfInflicted: false },
      },
    )

    expect(actionEvents.filter((e) => e.type === 'TriggerFired')).toHaveLength(1)
    expect(damageEvents.filter((e) => e.type === 'TriggerFired')).toHaveLength(1)
  })

  it('a damaged creature that cannot be found is no match, never a fall-through', () => {
    const filtered = watcherTrait('filtered', { relationship: 'enemy' })
    const state = world({ traits: { w: [filtered.id] }, registry: [filtered] })
    const events: CombatEvent[] = []

    fireHook(
      'on-damage-observed',
      [W],
      createCreatureId('nobody'),
      state,
      createResolutionContext(events, newCascade()),
      { observedDamage: { selfInflicted: false } },
    )

    expect(events).toEqual([])
  })
})

describe('routing: a damage event never reaches an action observer, an action never a damage observer (4.1-H2b1)', () => {
  it('a Resonant-shaped on-action-observed trait never fires on a damage event', () => {
    const resonant = watcherTrait(
      'resonant',
      { relationship: 'ally', actionKind: 'cast' },
      'on-action-observed',
    )
    const anyAction = watcherTrait('any-action', undefined, 'on-action-observed')
    const state = world({
      traits: { w: [resonant.id], y: [anyAction.id] },
      registry: [resonant, anyAction],
    })

    for (const scenario of [
      'cost',
      'tick',
      'enemy-hit',
      'own-direct',
      'flat-on-other',
    ] as const) {
      const events = inflict(scenario, state)
      expect(events.filter((e) => e.type === 'TriggerFired')).toEqual([])
    }
  })

  it('a Flare-shaped on-damage-observed trait never fires on an action that deals no damage', () => {
    const flare = watcherTrait('flare', { relationship: 'ally', selfInflicted: true })
    const anyDamage = watcherTrait('any-damage', undefined)
    const state = world({
      traits: { w: [flare.id], y: [anyDamage.id] },
      registry: [flare, anyDamage],
      scripts: { v: 'always-defend' }, // V acts first: Defend is an observed action, with no damage
    })

    const { events } = resolveTurn(state)

    expect(events.some((e) => e.type === 'Defended')).toBe(true)
    expect(observedBy(events)).toEqual([])
  })
})

describe('hook order in the damage path (4.1-H2b1; CONVENTIONS "Hook execution model")', () => {
  const ON_TAKEN: Trait = {
    id: 'on-taken',
    name: 'On taken (fixture)',
    effects: [
      {
        category: 'triggered',
        hook: 'on-damage-taken',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'defence',
          factor: 1.1,
        },
      },
    ],
  }
  const ON_DEALT: Trait = {
    id: 'on-dealt',
    name: 'On dealt (fixture)',
    effects: [
      {
        category: 'triggered',
        hook: 'on-damage-dealt',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'defence',
          factor: 1.1,
        },
      },
    ],
  }
  const ALLY_DEATH: Trait = {
    id: 'ally-death',
    name: 'Ally death (fixture)',
    effects: [
      {
        category: 'triggered',
        hook: 'on-ally-death',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'speed',
          factor: 1.1,
        },
      },
    ],
  }
  const WATCH_ANY = watcherTrait('watch-any', undefined)

  function hookSequence(events: readonly CombatEvent[]): string[] {
    return events.flatMap((e) => {
      if (e.type === 'TriggerFired') return [`${e.hook}@${e.sourceId}`]
      if (e.type === 'DamageDealt') return [`DamageDealt@${e.targetId}`]
      if (e.type === 'CreatureDied') return [`CreatureDied@${e.creatureId}`]
      return []
    })
  }

  it('a surviving hit: damage dealt (source) -> damage taken (victim) -> damage observed -> nothing else', () => {
    const state = world({
      traits: { x: [ON_DEALT.id], v: [ON_TAKEN.id], w: [WATCH_ANY.id] },
      registry: [ON_DEALT, ON_TAKEN, WATCH_ANY],
    })

    const events = inflict('enemy-hit', state)

    expect(hookSequence(events)).toEqual([
      'DamageDealt@v',
      'on-damage-dealt@x',
      'on-damage-taken@v',
      'on-damage-observed@w',
    ])
  })

  it('observation fired BEFORE on-damage-taken would put the victim reaction after the observer: it must not', () => {
    const state = world({
      traits: { v: [ON_TAKEN.id, WATCH_ANY.id] },
      registry: [ON_TAKEN, WATCH_ANY],
    })

    const sequence = hookSequence(inflict('cost', state))

    expect(sequence.indexOf('on-damage-taken@v')).toBeGreaterThan(-1)
    expect(sequence.indexOf('on-damage-taken@v')).toBeLessThan(
      sequence.indexOf('on-damage-observed@v'),
    )
  })

  it('a lethal hit: the observation sits between DamageDealt and CreatureDied, before on-ally-death', () => {
    const state = world({
      traits: { w: [WATCH_ANY.id, ALLY_DEATH.id] },
      registry: [WATCH_ANY, ALLY_DEATH],
      health: { v: 3 },
    })

    const events = inflict('cost', state) // a cost of 3 on 3 HP

    expect(events.find((e) => e.type === 'DamageDealt')).toMatchObject({ remainingHp: 0 })
    expect(hookSequence(events)).toEqual([
      'DamageDealt@v',
      'on-damage-observed@w',
      'CreatureDied@v',
      'on-ally-death@w',
    ])
  })

  it('a creature killed by the hit does not observe its own death blow', () => {
    const state = world({
      traits: { v: [WATCH_ANY.id], w: [WATCH_ANY.id] },
      registry: [WATCH_ANY],
      health: { v: 3 },
    })

    const events = inflict('cost', state)

    expect(observedBy(events)).toEqual(['w']) // V is dead by then; only its ally observes
  })

  it('Last Stand saves a lethal cost: the observation still fires, and there is no death', () => {
    const LAST_STAND: Trait = {
      id: 'last-stand',
      name: 'Last Stand (fixture)',
      effects: [{ category: 'cheat-death', chancePercent: 100 }],
    }
    const state = world({
      traits: { v: [LAST_STAND.id], w: [WATCH_ANY.id] },
      registry: [LAST_STAND, WATCH_ANY],
      health: { v: 3 },
    })

    const events = inflict('cost', state)

    expect(events.find((e) => e.type === 'DamageDealt')).toMatchObject({ remainingHp: 1 })
    expect(observedBy(events)).toEqual(['w'])
    expect(events.some((e) => e.type === 'CreatureDied')).toBe(false)
  })
})

describe('a zero cost is a full no-op: nothing to observe (4.1-H2b1, ASSUMPTION 132)', () => {
  it('a flat 1% of 30 Health floors to 0: no DamageDealt, so no observation', () => {
    const watch = watcherTrait('watch', { relationship: 'ally', selfInflicted: true })
    const state = world({
      traits: { w: [watch.id] },
      registry: [watch],
      health: { v: 30 },
    })
    const events: CombatEvent[] = []

    executeResponse(
      {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { ofStat: 'health', percent: 1 },
      },
      'fixture',
      { channel: 'indirect', self: V },
      state,
      createResolutionContext(events, newCascade()),
    )

    expect(events).toEqual([])
  })
})

describe('loop safety on the damage -> observer -> damage route (4.1-H2b1)', () => {
  // A (player) and B (enemy) each carry "on an ENEMY's cost, pay a cost of 1" -- the ping-pong:
  // A's cost is seen by B (A is B's enemy), B pays, B's cost is seen by A, A pays, ... Health 400
  // so nobody dies before the cascade cap (each payer takes ~half of the 500 depth steps).
  const PAYER: Trait = {
    id: 'ping-pong-payer',
    name: 'Ping-pong payer (fixture)',
    effects: [
      {
        category: 'triggered',
        hook: 'on-damage-observed',
        observationFilter: { relationship: 'enemy', selfInflicted: true },
        response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 1 },
      },
    ],
  }

  function pingPong(): { events: CombatEvent[]; state: CombatState } {
    const state = createCombat({
      seed: 1,
      player: {
        party: makeParty('player', [
          { id: 'a', health: 400, scriptId: 'always-wait', innateTraitIds: [PAYER.id] },
        ]),
      },
      enemy: {
        party: makeParty('enemy', [
          { id: 'b', health: 400, scriptId: 'always-wait', innateTraitIds: [PAYER.id] },
        ]),
      },
      registries: {
        scripts: FIXTURE_SCRIPTS_BY_ID,
        traits: new Map([[PAYER.id, PAYER]]),
      },
    })
    const events: CombatEvent[] = []
    const result = executeResponse(
      { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 1 },
      'fixture',
      { channel: 'indirect', self: createCreatureId('a') },
      state,
      createResolutionContext(events, newCascade()),
    )
    return { events, state: result.state }
  }

  it("the self-re-entry guard ends the chain: A's cost -> B pays -> A pays -> B's instance is still on the stack, so it is skipped", () => {
    // Hand-derived. Start: a cost of 1 on A (A 400 -> 399). Observation pass [a, b]:
    //   a: relationship 'enemy' vs the damaged A (itself): not an enemy -> silent.
    //   b: fires (instance IB pushed): B pays 1 (B 400 -> 399). Nested pass [a, b]:
    //        a: fires (IA pushed): A pays 1 (A 399 -> 398). Nested pass [a, b]:
    //             a: vs damaged A, itself -> silent.
    //             b: matches (A is B's enemy) but IB is still on the stack -> SKIPPED (the guard).
    //        b: vs damaged B (itself) -> silent.
    const { events, state } = pingPong()
    const log = events.flatMap((e) => {
      if (e.type === 'DamageDealt') return [`DamageDealt@${e.targetId}:${e.remainingHp}`]
      if (e.type === 'TriggerFired') return [`TriggerFired@${e.sourceId}`]
      if (e.type === 'CascadeTruncated') return ['CascadeTruncated']
      return []
    })

    expect(log).toEqual([
      'DamageDealt@a:399',
      'TriggerFired@b',
      'DamageDealt@b:399',
      'TriggerFired@a',
      'DamageDealt@a:398',
    ])
    expect(state.playerParty[0]?.currentHp).toBe(398)
    expect(state.enemyParty[0]?.currentHp).toBe(399)
    expect(events.some((e) => e.type === 'CascadeTruncated')).toBe(false)
  })
})

describe('the validator keeps each filter field on its own hook, on every trigger carrier (4.1-H2b1)', () => {
  const triggered = (
    hook: 'on-damage-observed' | 'on-action-observed' | 'on-turn-start',
    observationFilter: ObservationFilter,
  ): EffectDef => ({
    category: 'triggered',
    hook,
    observationFilter,
    response: { kind: 'heal', target: { kind: 'self' }, flatAmount: 1 },
  })

  it('accepts a field on its own hook, and permissive (absent) fields', () => {
    expect(() =>
      validateObservationFilters([
        triggered('on-damage-observed', { relationship: 'ally', selfInflicted: true }),
        triggered('on-action-observed', { actionKind: 'cast', excludeActor: true }),
        triggered('on-damage-observed', {}),
      ]),
    ).not.toThrow()
  })

  it('rejects actionKind / excludeActor on on-damage-observed, selfInflicted on on-action-observed, any filter on another hook', () => {
    expect(() =>
      validateObservationFilters([
        triggered('on-damage-observed', { actionKind: 'cast' }),
      ]),
    ).toThrow(/actionKind/)
    expect(() =>
      validateObservationFilters([
        triggered('on-damage-observed', { excludeActor: false }),
      ]),
    ).toThrow(/excludeActor/)
    expect(() =>
      validateObservationFilters([
        triggered('on-action-observed', { selfInflicted: true }),
      ]),
    ).toThrow(/selfInflicted/)
    expect(() =>
      validateObservationFilters([triggered('on-turn-start', { relationship: 'ally' })]),
    ).toThrow(/only an observation hook/)
  })

  it('a TRAIT carrier is checked (validateTrait)', () => {
    expect(() =>
      validateTrait({
        id: 'bad-trait',
        name: 'bad',
        effects: [triggered('on-action-observed', { selfInflicted: true })],
      }),
    ).toThrow(/selfInflicted/)
  })

  it('a PERK carrier is checked (validateSpecialization)', () => {
    expect(() =>
      validateSpecialization({
        id: 'bad-spec',
        name: 'bad',
        starterCreatureId: 'none',
        perks: [
          {
            id: 'bad-perk',
            name: 'bad',
            maxLevel: 10,
            costPerLevel: 100,
            effects: [triggered('on-action-observed', { selfInflicted: true })],
          },
        ],
      }),
    ).toThrow(/selfInflicted/)
  })

  it('a STATUS carrier is checked (validateStatusDef), and so is a status handed to createCombat', () => {
    const bad: StatusDef = {
      statusId: 'bad-status',
      polarity: 'buff',
      defaultDuration: 1,
      effects: [triggered('on-damage-observed', { actionKind: 'cast' })],
    }

    expect(() => validateStatusDef(bad)).toThrow(/actionKind/)
    expect(() =>
      createCombat({
        seed: 1,
        player: { party: makeParty('player', [{ id: 'p' }]) },
        enemy: { party: makeParty('enemy', [{ id: 'e' }]) },
        registries: { statuses: new Map([[bad.statusId, bad]]) },
      }),
    ).toThrow(/actionKind/)
  })
})
