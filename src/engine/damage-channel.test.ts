// Retaliation by channel (`spec/effects.md#damagechannel`): an `on-damage-taken` trigger with a
// `damageChannel` answers only damage that ran in that channel. Mechanism tests over fixture
// retaliators, each damage arriving through its real route (an action, a spell, a response's own
// hit, a status tick, a trait's own cost); the real retaliators are pinned by
// `golden-retaliation-direct-only` and the data test.
//
// Setup shared by every row, hand-derived: all creatures are vitality (x1.0) with Defence 0 and
// Health 1000, so no hit is lethal and no Defence term shows. B (player) carries the retaliator
// variant under test; A (enemy) is the other side. A direct Attack/Cast of 20 against Defence 0 is
// core 20 + chip 0.2 -> raw 20.2 -> final 20 (the Additional is 0 at the fixture level). A
// retaliator's answer is indirect: B's Attack 20 x spellPower 0.3 = 6 against 0.2 x 0 -> final 6.
// No variant but the chance one carries a chancePercent, and no target is chosen at random, so a
// row draws no RNG unless a test says otherwise.

import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { createResolutionContext } from './actions'
import { applyStatus, newCascade } from './resolution'
import { makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import { RETALIATE } from './__fixtures__/traits'
import { holdPotency } from './__fixtures__/held-statuses'
import { countDraws } from './test-utils/rng-draw-count'
import { STATUS_REGISTRY } from '../data/statuses'
import { validateSpecialization } from '../data/specializations'
import { validateStatusDef, validateTrait } from './effect-types'
import type { CombatEvent, CombatState, Spell } from './types'
import type { DamageChannel, EffectDef, Hook, StatusDef, Trait } from './effect-types'

const A = createCreatureId('a')
const B = createCreatureId('b')

// ---- Fixture retaliators, local to this file ----

/** `RETALIATE`'s shape (on-damage-taken -> deal-damage at triggering-source, Attack x0.3) with the
 * given channel; `RETALIATE` itself is the trigger without the field. */
function retaliator(id: string, damageChannel: DamageChannel): Trait {
  const [effect] = RETALIATE.effects
  if (effect === undefined || effect.category !== 'triggered') {
    throw new Error('RETALIATE must be a single triggered effect')
  }
  return { id, name: id, effects: [{ ...effect, damageChannel }] }
}
const DIRECT = retaliator('retaliate-direct', 'direct')
const INDIRECT = retaliator('retaliate-indirect', 'indirect')

/** A trait's own cost: at the start of its bearer's turn, 3 flat damage to itself. */
const SELF_COST: Trait = {
  id: 'self-cost',
  name: 'Self Cost (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 3 },
    },
  ],
}

const DAMAGE_SPELL: Spell = {
  id: 'damage-spell-fixture',
  name: 'Damage Spell (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 1,
    },
  ],
}

// Pinned at Poison 20% of Attack (tuning never changes a mechanism test). Otherwise the real status.
const STATUSES = holdPotency(STATUS_REGISTRY, { poison: 20 })

// ---- World ----

interface World {
  readonly bTraits: readonly Trait[]
  readonly aTraits?: readonly Trait[]
  readonly bScript: string
  readonly aScript: string
  readonly bSpeed: number
  readonly aSpeed: number
  readonly aSpell?: Spell
}

function build(world: World): CombatState {
  const traits = new Map<string, Trait>(
    [...world.bTraits, ...(world.aTraits ?? [])].map((t) => [t.id, t]),
  )
  return createCombat({
    seed: 1,
    player: {
      party: makeParty('player', [
        {
          id: 'b',
          health: 1000,
          defence: 0,
          speed: world.bSpeed,
          scriptId: world.bScript,
          innateTraitIds: world.bTraits.map((t) => t.id),
        },
      ]),
    },
    enemy: {
      party: makeParty('enemy', [
        {
          id: 'a',
          health: 1000,
          defence: 0,
          speed: world.aSpeed,
          scriptId: world.aScript,
          innateTraitIds: (world.aTraits ?? []).map((t) => t.id),
          ...(world.aSpell ? { equippedSpells: [world.aSpell] } : {}),
        },
      ]),
    },
    registries: { scripts: FIXTURE_SCRIPTS_BY_ID, traits, statuses: STATUSES },
  })
}

interface Turn {
  readonly events: CombatEvent[]
  readonly state: CombatState
  readonly draws: number
}

/** One `resolveTurn` from `start`, and the RNG draws it made. */
function turn(start: CombatState): Turn {
  const { state, events } = resolveTurn(start)
  return { events, state, draws: countDraws(start.rng, state.rng) }
}

function firedBy(events: readonly CombatEvent[], traitId: string): CombatEvent[] {
  return events.filter(
    (e) =>
      e.type === 'TriggerFired' && e.hook === 'on-damage-taken' && e.effectId === traitId,
  )
}

function hitsOn(events: readonly CombatEvent[], targetId: string): CombatEvent[] {
  return events.filter((e) => e.type === 'DamageDealt' && e.targetId === targetId)
}

/** The events from the first `DamageDealt` to the end of the turn. */
function fromDamage(events: readonly CombatEvent[]): CombatEvent[] {
  const at = events.findIndex((e) => e.type === 'DamageDealt')
  expect(at).toBeGreaterThanOrEqual(0)
  return events.slice(at)
}

const fired = (traitId: string): CombatEvent => ({
  type: 'TriggerFired',
  sourceId: B,
  hook: 'on-damage-taken',
  effectId: traitId,
})

// ---- Rows ----

describe('retaliation by damage channel', () => {
  describe('an attack (direct)', () => {
    // A (faster) attacks B: 20 direct. B's answer is the indirect 6 on A.
    const start = (variant: Trait) =>
      build({
        bTraits: [variant],
        bScript: 'always-wait',
        aScript: 'always-attack',
        bSpeed: 1,
        aSpeed: 20,
      })

    it.each([
      ['direct', DIRECT, true],
      ['indirect', INDIRECT, false],
      ['no field', RETALIATE, true],
    ] as const)('the %s variant answers: %s', (_name, variant, answers) => {
      const { events, draws } = turn(start(variant))

      expect(firedBy(events, variant.id)).toHaveLength(answers ? 1 : 0)
      expect(hitsOn(events, 'a')).toHaveLength(answers ? 1 : 0)
      expect(hitsOn(events, 'b')).toHaveLength(1)
      expect(draws).toBe(0)
    })
  })

  describe('a spell (direct)', () => {
    // A casts its damage spell on B: Int 20 x spellPower 1 against Defence 0 -> 20 direct.
    const start = (variant: Trait) =>
      build({
        bTraits: [variant],
        bScript: 'always-wait',
        aScript: 'always-cast',
        bSpeed: 1,
        aSpeed: 20,
        aSpell: DAMAGE_SPELL,
      })

    it.each([
      ['direct', DIRECT, true],
      ['indirect', INDIRECT, false],
      ['no field', RETALIATE, true],
    ] as const)('the %s variant answers: %s', (_name, variant, answers) => {
      const { events, draws } = turn(start(variant))

      expect(events.some((e) => e.type === 'SpellCast')).toBe(true)
      expect(firedBy(events, variant.id)).toHaveLength(answers ? 1 : 0)
      expect(hitsOn(events, 'a')).toHaveLength(answers ? 1 : 0)
      expect(hitsOn(events, 'b')).toHaveLength(1)
      expect(draws).toBe(0)
    })
  })

  describe("another retaliator's answer (an indirect hit from a response)", () => {
    // A carries the plain RETALIATE and waits. B (faster) carries the variant and attacks A. A's
    // RETALIATE answers that attack with an indirect hit on B -- the hit the variant is tested
    // against. A's RETALIATE is still unwinding when B answers back, so its own on-damage-taken is
    // held by the self-re-entry guard and the chain ends after one answer each way.
    const start = (variant: Trait) =>
      build({
        bTraits: [variant],
        aTraits: [RETALIATE],
        bScript: 'always-attack',
        aScript: 'always-wait',
        bSpeed: 20,
        aSpeed: 1,
      })

    it.each([
      ['direct', DIRECT, false],
      ['indirect', INDIRECT, true],
      ['no field', RETALIATE, true],
    ] as const)('the %s variant answers: %s', (_name, variant, answers) => {
      // The no-field variant is RETALIATE itself, which A carries too: its instances are distinct
      // (one per creature), only their effect ids coincide, so count B's firings by `sourceId`.
      const { events, draws } = turn(start(variant))
      const bFirings = firedBy(events, variant.id).filter(
        (e) => e.type === 'TriggerFired' && e.sourceId === B,
      )

      expect(hitsOn(events, 'b')).toHaveLength(1) // A's answer, nothing else
      expect(bFirings).toHaveLength(answers ? 1 : 0)
      // B's own attack on A, plus B's answer when it gives one.
      expect(hitsOn(events, 'a')).toHaveLength(answers ? 2 : 1)
      expect(draws).toBe(0)
    })

    it('two direct retaliators against each other: an attack draws one answer, and that answer none', () => {
      const state = build({
        bTraits: [DIRECT],
        aTraits: [DIRECT],
        bScript: 'always-wait',
        aScript: 'always-attack',
        bSpeed: 1,
        aSpeed: 20,
      })
      const { events } = turn(state)

      expect(firedBy(events, DIRECT.id)).toEqual([fired(DIRECT.id)]) // B's, once
      expect(hitsOn(events, 'a')).toHaveLength(1)
      expect(hitsOn(events, 'b')).toHaveLength(1)
    })

    it('the skip comes before the chance roll: a skipped candidate draws nothing', () => {
      const chance = (channel: DamageChannel | undefined): Trait => ({
        id: 'chance-retaliator',
        name: 'chance-retaliator',
        effects: [
          {
            category: 'triggered',
            hook: 'on-damage-taken',
            chancePercent: 50,
            ...(channel ? { damageChannel: channel } : {}),
            response: {
              kind: 'deal-damage',
              target: { kind: 'triggering-source' },
              offStat: 'attack',
              spellPower: 0.3,
            },
          },
        ],
      })
      // A 'direct' trigger skips the indirect hit before its roll; the same trigger without the
      // field rolls once for it. The pair is what makes "no draw" mean the skip, not no roll.
      expect(turn(start(chance('direct'))).draws).toBe(0)
      expect(turn(start(chance(undefined))).draws).toBe(1)
    })

    it('within one trait, each channel-gated trigger answers only its own channel', () => {
      // One trait, two non-stacking triggers. The first answers direct damage only, the second
      // indirect only. Against the indirect hit the first stays silent and the second answers.
      // They differ in magnitude (Attack 20 x 0.3 = 6 against x 0.5 = 10), so which one answered
      // shows in the damage.
      const effect = (damageChannel: DamageChannel, spellPower: number): EffectDef => ({
        category: 'triggered',
        hook: 'on-damage-taken',
        damageChannel,
        stacks: false,
        response: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          offStat: 'attack',
          spellPower,
        },
      })
      const twoEffects: Trait = {
        id: 'two-effects',
        name: 'Two Effects (fixture)',
        effects: [effect('direct', 0.3), effect('indirect', 0.5)],
      }
      const { events } = turn(start(twoEffects))

      const answers = events.filter(
        (e) => e.type === 'DamageDealt' && e.sourceId === B && e.targetId === A,
      )
      // B's attack on A (direct, 20), then the second effect's answer (10).
      expect(answers.map((e) => e.type === 'DamageDealt' && e.finalDamage)).toEqual([
        20, 10,
      ])
    })
  })

  describe('a status tick (indirect, no source)', () => {
    // B (faster) waits; A (the applier, Attack 20) waits. Poison from A: potency floor(20 x 20 /
    // 100) = 4, vitality x1.0, Defence 0 -> a tick of 4 on B's turn end, B 1000 -> 996. A tick
    // offers no source, so an answering retaliator fires and fizzles.
    const poisoned = (variant: Trait, extra: readonly string[] = []) => {
      let state = build({
        bTraits: [variant],
        bScript: 'always-wait',
        aScript: 'always-wait',
        bSpeed: 20,
        aSpeed: 1,
      })
      const ctx = createResolutionContext([], newCascade())
      state = applyStatus(A, B, { statusId: 'poison', duration: 3 }, state, ctx)
      for (const statusId of extra) {
        state = applyStatus(A, B, { statusId, duration: 3 }, state, ctx)
      }
      return state
    }

    const tickHit: CombatEvent = {
      type: 'DamageDealt',
      sourceId: A,
      targetId: B,
      rawDamage: 4,
      finalDamage: 4,
      affinityMultiplier: 1,
      wasChipOnly: false,
      remainingHp: 996,
      damageSource: 'dot',
      statusId: 'poison',
    }

    it.each([
      ['direct', DIRECT, []],
      ['indirect', INDIRECT, [fired(INDIRECT.id)]],
      ['no field', RETALIATE, [fired(RETALIATE.id)]],
    ] as const)(
      'the %s variant: the exact events from the tick on',
      (_name, variant, firing) => {
        const { events, draws } = turn(poisoned(variant))

        expect(fromDamage(events)).toEqual([
          tickHit,
          ...firing, // fires, then `triggering-source` resolves to nothing: no hit on A
          { type: 'TurnEnded', creatureId: B },
        ])
        expect(draws).toBe(0)
      },
    )

    it('Sleep, which carries no channel, still wakes on a tick', () => {
      // B is asleep (the real Sleep status) with a 'direct' retaliator: the retaliator skips the
      // tick, Sleep's wake-up fires and expires the status.
      const { events } = turn(poisoned(DIRECT, ['sleep']))

      expect(fromDamage(events)).toEqual([
        tickHit,
        { type: 'TriggerFired', sourceId: B, hook: 'on-damage-taken', effectId: 'sleep' },
        { type: 'StatusExpired', creatureId: B, statusId: 'sleep' },
        { type: 'TurnEnded', creatureId: B },
      ])
    })
  })

  describe("a trait's own cost (indirect, no source)", () => {
    // B's `self-cost` trait fires on B's turn start and damages B for exactly 3 (a cost: no
    // Defence, affinity or pools), B 1000 -> 997, labelled 'dot' like any flat response. Run through the real trigger, which runs the
    // response in the indirect channel with B as both bearer and target, so it is a cost and not a
    // hit. The variant then fires on that damage and `triggering-source` resolves to nothing,
    // since a response never targets its own firing creature.
    const costing = (variant: Trait) =>
      build({
        bTraits: [SELF_COST, variant],
        bScript: 'always-wait',
        aScript: 'always-wait',
        bSpeed: 20,
        aSpeed: 1,
      })

    const costHit: CombatEvent = {
      type: 'DamageDealt',
      sourceId: B,
      targetId: B,
      rawDamage: 3,
      finalDamage: 3,
      affinityMultiplier: 1,
      wasChipOnly: false,
      remainingHp: 997,
      damageSource: 'dot',
      statusId: undefined,
    }

    it.each([
      ['direct', DIRECT, []],
      ['indirect', INDIRECT, [fired(INDIRECT.id)]],
      ['no field', RETALIATE, [fired(RETALIATE.id)]],
    ] as const)(
      'the %s variant: the exact events from the cost on',
      (_name, variant, firing) => {
        const { events, draws } = turn(costing(variant))

        expect(fromDamage(events)).toEqual([
          costHit,
          ...firing,
          { type: 'Waited', creatureId: B },
          { type: 'TurnEnded', creatureId: B },
        ])
        expect(draws).toBe(0)
      },
    )
  })
})

// ---- Validator ----

describe('damageChannel validator', () => {
  const OTHER_HOOKS: Record<Exclude<Hook, 'on-damage-taken'>, true> = {
    'on-fight-start': true,
    'on-turn-start': true,
    'on-turn-end': true,
    'on-round-end': true,
    'on-damage-dealt': true,
    'on-kill': true,
    'on-death': true,
    'on-action-observed': true,
    'on-damage-observed': true,
    'on-death-observed': true,
    'on-status-applied': true,
    'on-attack': true,
    'on-cast': true,
    'on-defend': true,
    'on-provoke': true,
  }
  const hooks = Object.keys(OTHER_HOOKS) as Exclude<Hook, 'on-damage-taken'>[]

  const triggered = (hook: Hook, damageChannel?: DamageChannel): EffectDef => ({
    category: 'triggered',
    hook,
    ...(damageChannel ? { damageChannel } : {}),
    response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 1 },
  })
  const trait = (effect: EffectDef): Trait => ({
    id: 'carrier',
    name: 'c',
    effects: [effect],
  })
  const status = (effect: EffectDef): StatusDef => ({
    statusId: 'carrier',
    polarity: 'debuff',
    defaultDuration: 1,
    effects: [effect],
  })
  const spec = (effect: EffectDef) => ({
    id: 'bad-spec',
    name: 'bad',
    starterCreatureId: 'none',
    // 10 x 100 = 1000 points, the total a specialization must spend.
    perks: [
      { id: 'bad-perk', name: 'bad', maxLevel: 10, costPerLevel: 100, effects: [effect] },
    ],
  })

  describe.each(hooks)('on %s', (hook) => {
    it('a trait rejects the field', () => {
      expect(() => validateTrait(trait(triggered(hook, 'direct')))).toThrow(
        /only an "on-damage-taken" trigger/,
      )
    })

    it('a perk rejects the field', () => {
      expect(() => validateSpecialization(spec(triggered(hook, 'indirect')))).toThrow(
        /only an "on-damage-taken" trigger/,
      )
    })
  })

  // A status trigger on `on-round-end` is rejected by `validateStatusDef` for its own reason, so
  // the field's message never shows there: that hook has no status case.
  describe.each(hooks.filter((hook) => hook !== 'on-round-end'))(
    'on %s, as a status',
    (hook) => {
      it('a status rejects the field', () => {
        expect(() => validateStatusDef(status(triggered(hook, 'direct')))).toThrow(
          /only an "on-damage-taken" trigger/,
        )
      })
    },
  )

  it('createCombat rejects a trait in its registry that carries the field off on-damage-taken', () => {
    const bad = trait(triggered('on-turn-start', 'direct'))
    expect(() =>
      createCombat({
        seed: 1,
        player: { party: makeParty('player', [{ id: 'p', innateTraitIds: [bad.id] }]) },
        enemy: { party: makeParty('enemy', [{ id: 'e' }]) },
        registries: { scripts: FIXTURE_SCRIPTS_BY_ID, traits: new Map([[bad.id, bad]]) },
      }),
    ).toThrow(/only an "on-damage-taken" trigger/)
  })

  it.each(['direct', 'indirect'] as const)(
    'on-damage-taken accepts %s in a trait, a status and a perk',
    (channel) => {
      const effect = triggered('on-damage-taken', channel)
      expect(() => validateTrait(trait(effect))).not.toThrow()
      expect(() => validateStatusDef(status(effect))).not.toThrow()
      expect(() => validateSpecialization(spec(effect))).not.toThrow()
    },
  )
})
