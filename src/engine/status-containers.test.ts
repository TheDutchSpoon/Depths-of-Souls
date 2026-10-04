// Phase 4.1-F1 (A3): statuses as effect containers. Every test here is the one that fails with its
// mechanism removed (the phase record lists the mutation for each). Numbers are hand-derived in
// the comments; the log-level behaviour is also pinned by the goldens (golden-stun,
// golden-b6-provoke-stun-cleanup, golden-b2-skipped-turn-refuses-granted-cast,
// golden-scoped-suppression, golden-b2-silenced-refuses-granted-cast) and the corpus digest.

import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { checkLegality, createResolutionContext } from './actions'
import { decideAction } from './interpreter'
import { applyStatus, fireHook, newCascade } from './resolution'
import { updateCreature } from './creature-lookup'
import {
  activeFriendlyFireStatus,
  effectsForHook,
  firstAllLock,
  flatEffects,
  gatherArmorPenetration,
  gatherCheatDeathChance,
  gatherCrossStatContribution,
  gatherDealtMods,
  gatherExtraInstances,
  gatherTakenFactors,
  hasAnnihilate,
  hasProvokeImmunity,
  hasSplashing,
  hasStatus,
  isActionLocked,
} from './effects'
import { buildTurnQueue } from './turn-order'
import { resolveOffensiveTarget, shouldRedirectAoeToAllies } from './targeting'
import { createCreatureId } from './ids'
import {
  createEffectInstanceId,
  validateNoBreakChanceOutsideStatus,
  validateStatusDef,
} from './effect-types'
import { makeParty } from './__fixtures__/creatures'
import { countDraws } from './test-utils/rng-draw-count'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import {
  CONFUSION,
  GRANT_ACT_FIRST,
  POISON,
  SLEEP,
  STATUS_REGISTRY,
  STUN,
  VULNERABILITY,
  WEAKEN,
  WEB,
} from '../data/statuses'
import { validateTrait } from '../data/traits'
import { SORCERER, validateSpecialization } from '../data/specializations'
import type { CreatureOverrides } from './__fixtures__/creatures'
import type { CombatEvent, CombatState, Spell } from './types'
import type {
  ActiveEffect,
  EffectDef,
  StatusDef,
  StatusEffect,
  Trait,
} from './effect-types'
import type { Script } from './scripting-types'

const X = createCreatureId('x')
const FOE = createCreatureId('foe')

const SELF_STUN_SPELL: Spell = {
  id: 'self-stun-fixture',
  name: 'Self Stun (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'apply-status',
      target: { kind: 'self' },
      status: { statusId: 'stun', duration: 3 },
    },
  ],
}

const CAST_THEN_ATTACK: Script = {
  id: 'cast-then-attack',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}

interface BuildOptions {
  readonly effects?: readonly EffectDef[]
  readonly x?: CreatureOverrides
  readonly foe?: CreatureOverrides
  readonly statuses?: readonly StatusDef[]
}

/** X (player, speed 20) carries one fixture trait; FOE (enemy, speed 1) just waits. */
function build(options: BuildOptions = {}): CombatState {
  const trait: Trait = {
    id: 'x-trait',
    name: 'X (fixture)',
    effects: options.effects ?? [],
  }
  const statuses = new Map(STATUS_REGISTRY)
  for (const s of options.statuses ?? []) statuses.set(s.statusId, s)
  return createCombat({
    seed: 7,
    player: {
      party: makeParty('player', [
        {
          id: 'x',
          health: 100,
          defence: 0,
          speed: 20,
          scriptId: 'always-wait',
          innateTraitIds: [trait.id],
          ...options.x,
        },
      ]),
    },
    enemy: {
      party: makeParty('enemy', [
        {
          id: 'foe',
          health: 100,
          defence: 0,
          speed: 1,
          scriptId: 'always-wait',
          ...options.foe,
        },
      ]),
    },
    registries: {
      scripts: new Map([...STOCK_SCRIPTS_BY_ID, [CAST_THEN_ATTACK.id, CAST_THEN_ATTACK]]),
      traits: new Map([[trait.id, trait]]),
      statuses,
    },
  })
}

const types = (events: readonly CombatEvent[]) => events.map((e) => e.type)
const applySelf = (statusId: string): EffectDef => ({
  category: 'triggered',
  hook: 'on-fight-start',
  response: { kind: 'apply-status', target: { kind: 'self' }, status: { statusId } },
})
const lock = (scope: 'all' | 'attack' | 'cast'): EffectDef => ({
  category: 'action-lock',
  scope,
})
const grant = (
  hook: 'on-turn-start' | 'on-turn-end' | 'on-attack',
  action: 'attack' | 'defend' | 'cast',
): EffectDef => ({
  category: 'triggered',
  hook,
  chancePercent: 100,
  response: {
    kind: 'perform-action',
    actor: 'self',
    intent: {
      action: action === 'cast' ? { kind: 'cast', gemSlot: 0 } : { kind: action },
    },
  },
})
const creatureOf = (state: CombatState, id = X) =>
  [...state.playerParty, ...state.enemyParty].find((c) => c.id === id)!

describe("the skip: an 'all' lock", () => {
  it('skips the turn -- TurnSkipped fills the action slot, no action, no hook fired by the lock', () => {
    // Stun applied at fight start; X scripts always-attack, so without the lock it would attack.
    const { events } = resolveTurn(
      build({ effects: [applySelf('stun')], x: { scriptId: 'always-attack' } }),
    )
    expect(types(events)).toEqual([
      'FightStarted',
      'TriggerFired', // the fight-start apply-status (the only trigger: the lock is passive)
      'StatusApplied',
      'RoundStarted',
      'TurnStarted',
      'TurnSkipped',
      'TurnEnded',
    ])
    expect(events.find((e) => e.type === 'TurnSkipped')).toEqual({
      type: 'TurnSkipped',
      creatureId: X,
      effectId: 'stun',
    })
  })

  it('names the FIRST of two active locks in canonical effect order', () => {
    // Stun then Sleep: both 'all' locks; applied in that order, so stun comes first.
    const stunFirst = resolveTurn(
      build({ effects: [applySelf('stun'), applySelf('sleep')] }),
    )
    expect(stunFirst.events.filter((e) => e.type === 'TurnSkipped')).toEqual([
      { type: 'TurnSkipped', creatureId: X, effectId: 'stun' },
    ])
    const sleepFirst = resolveTurn(
      build({ effects: [applySelf('sleep'), applySelf('stun')] }),
    )
    expect(sleepFirst.events.filter((e) => e.type === 'TurnSkipped')).toEqual([
      { type: 'TurnSkipped', creatureId: X, effectId: 'sleep' },
    ])
  })

  it("a lock gained during the actor's own turn-start hooks skips that very turn (ASSUMPTION 45)", () => {
    const { events } = resolveTurn(
      build({
        effects: [
          {
            category: 'triggered',
            hook: 'on-turn-start',
            response: {
              kind: 'apply-status',
              target: { kind: 'self' },
              status: { statusId: 'stun' },
            },
          },
        ],
        x: { scriptId: 'always-attack' },
      }),
    )
    expect(types(events)).toEqual([
      'FightStarted',
      'RoundStarted',
      'TurnStarted',
      'TriggerFired',
      'StatusApplied',
      'TurnSkipped',
      'TurnEnded',
    ])
  })

  it('a lock gained during the TURN-START GRANTS still skips the turn (the action-slot read)', () => {
    // The turn-start grant casts SELF_STUN_SPELL at the foe slot; the spell stuns its own caster.
    // After the grants every rule would be illegal under the lock: without the second read the
    // fallback Wait is refused and the bracket ends empty, with no TurnSkipped.
    const { events } = resolveTurn(
      build({
        effects: [grant('on-turn-start', 'cast')],
        x: { equippedSpells: [SELF_STUN_SPELL], scriptId: 'always-attack' },
      }),
    )
    expect(types(events)).toEqual([
      'FightStarted',
      'RoundStarted',
      'TurnStarted',
      'TriggerFired',
      'ActionGranted',
      'SpellCast',
      'StatusApplied',
      'TurnSkipped',
      'TurnEnded',
    ])
    expect(events.find((e) => e.type === 'TurnSkipped')).toMatchObject({
      effectId: 'stun',
    })
  })

  it('the turn-end drain refuses the grant of a creature skipped by the ACTION-SLOT read, even once the lock is gone', () => {
    // Turn-start grant stuns X (read 2 skips the turn); at turn end the stun is removed (trigger 1)
    // and an attack is granted (trigger 2): checkLegality alone would let it through, so only the
    // combined skip value fed to the turn-end drain refuses it.
    const { events } = resolveTurn(
      build({
        effects: [
          grant('on-turn-start', 'cast'),
          {
            category: 'triggered',
            hook: 'on-turn-end',
            response: {
              kind: 'remove-status',
              target: { kind: 'self' },
              filter: { statusId: 'stun' },
            },
          },
          grant('on-turn-end', 'attack'),
        ],
        x: { equippedSpells: [SELF_STUN_SPELL] },
      }),
    )
    expect(events.filter((e) => e.type === 'StatusExpired')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'ActionGranted')).toHaveLength(1) // only the cast
    expect(events.some((e) => e.type === 'AttackDeclared')).toBe(false)
  })

  it("an earlier grant in the turn-start drain can remove the lock: the first read still skips the turn and its gate still refuses the actor's grant", () => {
    // Setup (no RNG anywhere). X (player slot 0, speed 20) carries x-trait, effects in order:
    //   1 on-fight-start apply-status(self, stun, 5)
    //   2 on-turn-start  apply-status(all-allies, glow)
    //   3 on-turn-start  perform-action(self, attack)
    // Y (player slot 1, speed 5) carries y-trait: on-status-applied (stacks: false) ->
    // perform-action(self, cast slot 0); slot 0 = an ally-side AOE whose only effect is
    // remove-status(cast-target, stun). FOE (enemy, speed 1, HP 500) only waits.
    //
    // Fight start: effect 1 -> TriggerFired + StatusApplied(x, stun, stacks 1, duration 5).
    // X's turn: TurnStarted. Turn-start hooks, in effect order: effect 2 -> TriggerFired, glow lands
    // on x then y (default duration 4); Y's on-status-applied fires for y only -> TriggerFired(y),
    // queueing Y's cast FIRST. Effect 3 -> TriggerFired(x), queueing X's attack SECOND.
    // First read (right after the hook pass): X holds stun -> the turn is skipped, 'stun'.
    // Cleanup: nothing to end. Turn-start drain, FIFO, with skippedTurnOf = X:
    //   Y's cast: legal for Y -> ActionGranted(y), SpellCast aoe over the ally side [x, y], then
    //     remove-status(stun) on x -> StatusExpired(x, stun) (nothing on y: no event). The lock is
    //     now GONE.
    //   X's attack: refused by the skip gate -- NOT by the lock, which no longer exists: no
    //     ActionGranted for X, no AttackDeclared.
    // Action slot (second read): no lock left, but the first read already skipped the turn, so no
    // decide (no Waited) and TurnSkipped names the first read's lock: effectId 'stun'.
    const FIXTURE_X = createCreatureId('x')
    const FIXTURE_Y = createCreatureId('y')
    const REMOVE_STUN_AOE: Spell = {
      id: 'remove-stun-aoe-fixture',
      name: 'Remove Stun AOE (fixture)',
      targetShape: 'aoe',
      affinity: 'vitality',
      targetSide: 'ally',
      unlockedAtBiome: 1,
      effects: [
        {
          kind: 'remove-status',
          target: { kind: 'cast-target' },
          filter: { statusId: 'stun' },
        },
      ],
    }
    const xTrait: Trait = {
      id: 'x-trait',
      name: 'X (fixture)',
      effects: [
        {
          category: 'triggered',
          hook: 'on-fight-start',
          response: {
            kind: 'apply-status',
            target: { kind: 'self' },
            status: { statusId: 'stun', duration: 5 },
          },
        },
        {
          category: 'triggered',
          hook: 'on-turn-start',
          response: {
            kind: 'apply-status',
            target: { kind: 'all-allies' },
            status: { statusId: 'glow' },
          },
        },
        {
          category: 'triggered',
          hook: 'on-turn-start',
          response: {
            kind: 'perform-action',
            actor: 'self',
            intent: { action: { kind: 'attack' } },
          },
        },
      ],
    }
    const yTrait: Trait = {
      id: 'y-trait',
      name: 'Y (fixture)',
      effects: [
        {
          category: 'triggered',
          hook: 'on-status-applied',
          stacks: false,
          response: {
            kind: 'perform-action',
            actor: 'self',
            intent: { action: { kind: 'cast', gemSlot: 0 } },
          },
        },
      ],
    }
    const state = createCombat({
      seed: 7,
      player: {
        party: makeParty('player', [
          {
            id: 'x',
            health: 100,
            speed: 20,
            scriptId: 'always-wait',
            innateTraitIds: ['x-trait'],
          },
          {
            id: 'y',
            health: 100,
            speed: 5,
            scriptId: 'always-wait',
            innateTraitIds: ['y-trait'],
            equippedSpells: [REMOVE_STUN_AOE],
          },
        ]),
      },
      enemy: {
        party: makeParty('enemy', [
          { id: 'foe', health: 500, speed: 1, scriptId: 'always-wait' },
        ]),
      },
      registries: {
        scripts: STOCK_SCRIPTS_BY_ID,
        traits: new Map([
          ['x-trait', xTrait],
          ['y-trait', yTrait],
        ]),
        statuses: STATUS_REGISTRY,
      },
    })
    const { events } = resolveTurn(state)
    expect(events).toEqual([
      { type: 'FightStarted' },
      {
        type: 'TriggerFired',
        sourceId: FIXTURE_X,
        hook: 'on-fight-start',
        effectId: 'x-trait',
      },
      {
        type: 'StatusApplied',
        targetId: FIXTURE_X,
        statusId: 'stun',
        stacks: 1,
        duration: 5,
        sourceId: FIXTURE_X,
      },
      { type: 'RoundStarted', round: 1 },
      { type: 'TurnStarted', creatureId: FIXTURE_X },
      {
        type: 'TriggerFired',
        sourceId: FIXTURE_X,
        hook: 'on-turn-start',
        effectId: 'x-trait',
      },
      {
        type: 'StatusApplied',
        targetId: FIXTURE_X,
        statusId: 'glow',
        stacks: 1,
        duration: 4,
        sourceId: FIXTURE_X,
      },
      {
        type: 'StatusApplied',
        targetId: FIXTURE_Y,
        statusId: 'glow',
        stacks: 1,
        duration: 4,
        sourceId: FIXTURE_X,
      },
      {
        type: 'TriggerFired',
        sourceId: FIXTURE_Y,
        hook: 'on-status-applied',
        effectId: 'y-trait',
      },
      {
        type: 'TriggerFired',
        sourceId: FIXTURE_X,
        hook: 'on-turn-start',
        effectId: 'x-trait',
      },
      {
        type: 'ActionGranted',
        sourceId: FIXTURE_Y,
        actorId: FIXTURE_Y,
        effectId: 'y-trait',
      },
      {
        type: 'SpellCast',
        targetShape: 'aoe',
        casterId: FIXTURE_Y,
        gemSlot: 0,
        targetIds: [FIXTURE_X, FIXTURE_Y],
      },
      { type: 'StatusExpired', creatureId: FIXTURE_X, statusId: 'stun' },
      { type: 'TurnSkipped', creatureId: FIXTURE_X, effectId: 'stun' },
      { type: 'TurnEnded', creatureId: FIXTURE_X },
    ])
  })
})

describe('locks in checkLegality, at every site', () => {
  function locked(scope: 'all' | 'attack' | 'cast', script: string | null = null) {
    const state = build({
      effects: [lock(scope)],
      x: { equippedSpells: [SELF_STUN_SPELL], scriptId: script },
    })
    return { state, x: creatureOf(state) }
  }

  it('a cast lock refuses a script rule: the Cast rule is skipped, the later Attack rule wins', () => {
    const { state, x } = locked('cast')
    expect(decideAction(x, CAST_THEN_ATTACK, state)).toEqual({
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    })
  })

  it('an attack lock refuses the implicit fallback (an Attack): the creature waits', () => {
    const { state, x } = locked('attack')
    expect(decideAction(x, null, state)).toEqual({ action: { kind: 'wait' } })
    const { events } = resolveTurn(state)
    expect(events.some((e) => e.type === 'AttackDeclared')).toBe(false)
    expect(events.some((e) => e.type === 'Waited')).toBe(true)
    // control: a cast lock leaves the fallback Attack alone
    const control = locked('cast')
    expect(decideAction(control.x, null, control.state)).toEqual({
      action: { kind: 'attack' },
    })
  })

  it('a cast lock refuses a granted cast (no ActionGranted, no SpellCast)', () => {
    const { events } = resolveTurn(
      build({
        effects: [lock('cast'), grant('on-turn-end', 'cast')],
        x: { equippedSpells: [SELF_STUN_SPELL] },
      }),
    )
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(true) // the chance was rolled
    expect(events.some((e) => e.type === 'ActionGranted' || e.type === 'SpellCast')).toBe(
      false,
    )
  })

  it("an 'all' lock makes every action kind illegal; a scoped lock only its own", () => {
    const all = locked('all')
    for (const kind of ['attack', 'defend', 'provoke', 'wait'] as const) {
      expect(checkLegality(all.x, { action: { kind } }, all.state)).toBe(false)
    }
    expect(
      checkLegality(all.x, { action: { kind: 'cast', gemSlot: 0 } }, all.state),
    ).toBe(false)
    const cast = locked('cast')
    expect(
      checkLegality(cast.x, { action: { kind: 'cast', gemSlot: 0 } }, cast.state),
    ).toBe(false)
    for (const kind of ['attack', 'defend', 'provoke', 'wait'] as const) {
      expect(checkLegality(cast.x, { action: { kind } }, cast.state)).toBe(true)
    }
  })

  it("a granted Defend is refused under an 'all' lock (ASSUMPTION 46)", () => {
    // X attacks; its on-attack trigger 1 stuns X, trigger 2 grants a Defend. The grant drains right
    // after the action (no skip gate: the turn was not skipped), so only the lock can refuse it.
    const withLock = resolveTurn(
      build({
        effects: [
          {
            category: 'triggered',
            hook: 'on-attack',
            response: {
              kind: 'apply-status',
              target: { kind: 'self' },
              status: { statusId: 'stun' },
            },
          },
          grant('on-attack', 'defend'),
        ],
        x: { scriptId: 'always-attack' },
      }),
    ).events
    expect(withLock.some((e) => e.type === 'StatusApplied')).toBe(true)
    expect(
      withLock.some((e) => e.type === 'ActionGranted' || e.type === 'Defended'),
    ).toBe(false)
    // control: without the stun the same grant goes through
    const control = resolveTurn(
      build({
        effects: [grant('on-attack', 'defend')],
        x: { scriptId: 'always-attack' },
      }),
    ).events
    expect(control.some((e) => e.type === 'Defended')).toBe(true)
  })
})

describe('immunity is checked once, in the effect iterator', () => {
  const immuneTo = (statusId: string): EffectDef => ({
    category: 'status-immunity',
    statusId,
  })

  /** X carries the immunity and (via applyStatus, after setup) the status itself. */
  function withStatus(
    statusId: string,
    immune: boolean,
    extra: Partial<Parameters<typeof build>[0]> = {},
  ): CombatState {
    const created = build({ effects: immune ? [immuneTo(statusId)] : [], ...extra })
    return applyStatus(
      FOE,
      X,
      { statusId },
      created,
      createResolutionContext([], newCascade()),
    )
  }

  it('an immune bearer keeps the status for has-status, but its locks do nothing', () => {
    for (const immune of [true, false]) {
      const state = withStatus('stun', immune, { x: { scriptId: 'always-attack' } })
      const x = creatureOf(state)
      expect(hasStatus(x, 'stun')).toBe(true) // exists either way
      expect(isActionLocked(x, 'attack')).toBe(!immune)
      expect(firstAllLock(x) === undefined).toBe(immune)
      expect(checkLegality(x, { action: { kind: 'attack' } }, state)).toBe(immune)
      const { events } = resolveTurn(state)
      expect(events.some((e) => e.type === 'TurnSkipped')).toBe(!immune)
      expect(events.some((e) => e.type === 'AttackDeclared')).toBe(immune)
    }
  })

  it('an immune Confused creature has no friendly-fire and draws no RNG (single and AOE)', () => {
    for (const immune of [true, false]) {
      const state = withStatus('confusion', immune)
      const x = creatureOf(state)
      expect(hasStatus(x, 'confusion')).toBe(true)
      expect(activeFriendlyFireStatus(x) === undefined).toBe(immune)
      const before = { position: state.rng.position }
      resolveOffensiveTarget(x, state, () => FOE)
      shouldRedirectAoeToAllies(x, state)
      // Confusion's roll: one draw for the single-target check, one for the AOE check (a 50% roll
      // that may add a second draw to pick the ally on a redirect) -- zero iff immune.
      expect(countDraws(before, state.rng) === 0).toBe(immune)
    }
  })

  it('an immune bearer takes no DoT tick: the trigger inside the status is skipped (the status still counts)', () => {
    for (const immune of [true, false]) {
      const state = withStatus('poison', immune)
      const x = creatureOf(state)
      expect(hasStatus(x, 'poison')).toBe(true)
      expect(effectsForHook(x, 'on-round-end')).toHaveLength(immune ? 0 : 1)
      // End to end: run two turns plus the round-end sweep (the third call) and look for the tick.
      let working = state
      const events: CombatEvent[] = []
      for (let i = 0; i < 3; i++) {
        const step = resolveTurn(working)
        working = step.state
        events.push(...step.events)
      }
      expect(
        events.some((e) => e.type === 'DamageDealt' && e.damageSource === 'dot'),
      ).toBe(!immune)
    }
  })

  it('an immune bearer has no damage-modifier from the status (dealt and taken)', () => {
    // Weaken: -0.2 dealt per stack; Vulnerability: 1.5 taken per stack. One stack each.
    for (const immune of [true, false]) {
      const weak = withStatus('weaken', immune)
      expect(gatherDealtMods(creatureOf(weak), weak)).toEqual(immune ? [] : [-0.2])
      const vuln = withStatus('vulnerability', immune)
      expect(gatherTakenFactors(creatureOf(vuln), vuln)).toEqual(immune ? [] : [1.5])
    }
  })

  it('an immune bearer has no turn-order from the status (act-first and act-last)', () => {
    // X is the slower creature (speed 1 vs 20) so act-first visibly moves it; for Web, the faster.
    const first = withStatus('grant-act-first', false, {
      x: { speed: 1 },
      foe: { speed: 20 },
    })
    expect(buildTurnQueue(first.playerParty, first.enemyParty)).toEqual([X, FOE])
    const firstImmune = withStatus('grant-act-first', true, {
      x: { speed: 1 },
      foe: { speed: 20 },
    })
    expect(buildTurnQueue(firstImmune.playerParty, firstImmune.enemyParty)).toEqual([
      FOE,
      X,
    ])
    const web = withStatus('web', false)
    expect(buildTurnQueue(web.playerParty, web.enemyParty)).toEqual([FOE, X])
    const webImmune = withStatus('web', true)
    expect(buildTurnQueue(webImmune.playerParty, webImmune.enemyParty)).toEqual([X, FOE])
  })

  it('an immune Web bearer draws no RNG at turn start (the roll only happens for a Web that is present)', () => {
    // One Web bearer, one turn: exactly one roll (0.0 break chance would still draw; Web is 10%).
    const plain = withStatus('web', false)
    const turn = resolveTurn(plain)
    expect(countDraws(plain.rng, turn.state.rng)).toBe(1)
    const immune = withStatus('web', true)
    const immuneTurn = resolveTurn(immune)
    expect(countDraws(immune.rng, immuneTurn.state.rng)).toBe(0)
    expect(hasStatus(creatureOf(immuneTurn.state), 'web')).toBe(true) // never broken free, never skipped
  })
})

describe("a status's effects scale by its stacks as the default count", () => {
  /** A one-effect status on X at `stacks`, its trigger fired through the real hook path. */
  function fireWithStacks(
    effect: EffectDef,
    stacks: number,
    x: CreatureOverrides = {},
  ): { state: CombatState; events: CombatEvent[] } {
    const status: StatusDef = {
      statusId: 'stacky',
      cap: 5,
      polarity: 'buff',
      defaultDuration: 3,
      effects: [effect],
    }
    const { currentHp, ...rest } = x
    let created = build({ statuses: [status], x: rest })
    if (currentHp !== undefined) created = updateCreature(created, X, { currentHp })
    const events: CombatEvent[] = []
    const ctx = createResolutionContext(events, newCascade())
    let state = applyStatus(FOE, X, { statusId: 'stacky', stacks }, created, ctx)
    events.length = 0
    state = fireHook('on-turn-end', [X], undefined, state, ctx).state
    return { state, events }
  }
  const onTurnEnd = (
    response: Extract<EffectDef, { category: 'triggered' }>['response'],
  ): EffectDef => ({
    category: 'triggered',
    hook: 'on-turn-end',
    response,
  })

  it('deal-damage, formula mode: X attack 20, defence 0, spellPower 0.5 -> x2 stacks = full Attack', () => {
    // effOff = 20 * (0.5 * stacks): stacks 2 -> 20, raw (20 - 0) + 0.2 = 20.2 -> 20 (HP 100 -> 80);
    // stacks 1 -> 10, raw 10.1 -> 10 (HP 90).
    const hit = onTurnEnd({
      kind: 'deal-damage',
      target: { kind: 'self' },
      offStat: 'attack',
      spellPower: 0.5,
    })
    expect(creatureOf(fireWithStacks(hit, 2, { attack: 20 }).state).currentHp).toBe(80)
    expect(creatureOf(fireWithStacks(hit, 1, { attack: 20 }).state).currentHp).toBe(90)
  })

  it('deal-damage, flat mode: 3% of max HP per stack (HP 100 -> 3 per stack)', () => {
    const tick = onTurnEnd({
      kind: 'deal-damage',
      target: { kind: 'self' },
      flatAmount: { ofStat: 'health', percent: 3 },
      emitTriggerFired: false,
      damageSource: 'dot',
    })
    expect(creatureOf(fireWithStacks(tick, 3).state).currentHp).toBe(91) // 100 - floor(100*3*3/100)
  })

  it('heal, formula mode: scalingStat intelligence 20 x spellPower 0.5 x stacks 2 = 20', () => {
    const heal = onTurnEnd({
      kind: 'heal',
      target: { kind: 'self' },
      scalingStat: 'intelligence',
      spellPower: 0.5,
    })
    expect(creatureOf(fireWithStacks(heal, 2, { currentHp: 10 }).state).currentHp).toBe(
      30,
    )
    expect(creatureOf(fireWithStacks(heal, 1, { currentHp: 10 }).state).currentHp).toBe(
      20,
    )
  })

  it('apply-stat-modifier: factor 1.5 at stacks 2 -> 1 + 0.5 * 2 = 2.0 (attack 20 -> 40); one stack keeps 1.5 verbatim', () => {
    const buff = onTurnEnd({
      kind: 'apply-stat-modifier',
      target: { kind: 'self' },
      stat: 'attack',
      factor: 1.5,
    })
    const two = fireWithStacks(buff, 2, { attack: 20 })
    expect(two.events.find((e) => e.type === 'StatModifierApplied')).toMatchObject({
      factor: 2,
      effectiveAfter: 40,
    })
    const one = fireWithStacks(buff, 1, { attack: 20 })
    expect(one.events.find((e) => e.type === 'StatModifierApplied')).toMatchObject({
      factor: 1.5,
      effectiveAfter: 30,
    })
  })

  it('damage-modifier: dealt -0.2 x stacks 2 = -0.4; taken 1.5 ** 2 = 2.25', () => {
    const dealtStatus: StatusDef = {
      statusId: 'dealt2',
      cap: 3,
      polarity: 'debuff',
      defaultDuration: 3,
      effects: [{ category: 'damage-modifier', direction: 'dealt', magnitude: -0.2 }],
    }
    const takenStatus: StatusDef = {
      statusId: 'taken2',
      cap: 3,
      polarity: 'debuff',
      defaultDuration: 3,
      effects: [{ category: 'damage-modifier', direction: 'taken', magnitude: 1.5 }],
    }
    let state = build({ statuses: [dealtStatus, takenStatus] })
    const ctx = createResolutionContext([], newCascade())
    state = applyStatus(FOE, X, { statusId: 'dealt2', stacks: 2 }, state, ctx)
    state = applyStatus(FOE, X, { statusId: 'taken2', stacks: 2 }, state, ctx)
    expect(gatherDealtMods(creatureOf(state), state)).toEqual([-0.2 * 2])
    expect(gatherTakenFactors(creatureOf(state), state)).toEqual([1.5 ** 2])
  })
})

describe('every effect kind a status may carry is read through the one iterator', () => {
  /** A status container instance holding `effects` at `stacks`, placed on X after setup. */
  function carry(
    effects: readonly EffectDef[],
    stacks = 1,
    x: CreatureOverrides = {},
  ): CombatState {
    const instance: StatusEffect = {
      category: 'status',
      statusId: 'carrier',
      cap: 5,
      polarity: 'buff',
      defaultDuration: 3,
      effects,
      instanceId: createEffectInstanceId('carrier-1'),
      sourceTraitId: 'carrier',
      remainingDuration: 3,
      stacks,
    }
    const state = build({ x })
    return updateCreature(state, X, { activeEffects: [instance as ActiveEffect] })
  }

  it('armor-penetration, cross-stat, action-instance, provoke-immunity, splashing, annihilate, cheat-death', () => {
    const state = carry([
      { category: 'armor-penetration', percent: 0.25 },
      {
        category: 'cross-stat',
        fromStat: 'defence',
        percentPerRank: 0.5,
        appliesTo: 'attack',
      },
      { category: 'action-instance', actionKind: 'attack', powerPercent: 30 },
      { category: 'provoke-immunity' },
      { category: 'splashing' },
      { category: 'annihilate' },
      { category: 'cheat-death', chancePercent: 40 },
    ])
    const x = creatureOf(state, X)
    expect(gatherArmorPenetration(x)).toBe(0.25)
    expect(gatherCrossStatContribution(x, 'attack')).toBe(0.5 * 0) // defence is 0 in `build`
    expect(gatherExtraInstances(x, 'attack')).toEqual([30])
    expect(hasProvokeImmunity(x)).toBe(true)
    expect(hasSplashing(x)).toBe(true)
    expect(hasAnnihilate(x)).toBe(true)
    expect(gatherCheatDeathChance(x)).toBe(40)
    expect(flatEffects(x).map((e) => e.category)).toContain('splashing')
  })

  it('cross-stat reads the bearer stat: defence 20 x 0.5 = 10', () => {
    const state = updateCreature(build({ x: { defence: 20 } }), X, {
      activeEffects: [
        {
          category: 'status',
          statusId: 'carrier',
          cap: 1,
          polarity: 'buff',
          defaultDuration: 3,
          effects: [
            {
              category: 'cross-stat',
              fromStat: 'defence',
              percentPerRank: 0.5,
              appliesTo: 'attack',
            },
          ],
          instanceId: createEffectInstanceId('carrier-2'),
          sourceTraitId: 'carrier',
          remainingDuration: 3,
          stacks: 1,
        },
      ],
    })
    expect(gatherCrossStatContribution(creatureOf(state), 'attack')).toBe(10)
  })

  it('conditional-damage-bonus: +50% on one hit (attack 20 vs defence 0: 20.2 -> 30.3 -> 30, control 20)', () => {
    const bonus: EffectDef = {
      category: 'conditional-damage-bonus',
      percent: 0.5,
      condition: { kind: 'always' },
    }
    const hit = (state: CombatState) =>
      resolveTurn(state).events.find((e) => e.type === 'DamageDealt')
    const control = build({ x: { attack: 20, scriptId: 'always-attack' } })
    expect(hit(control)).toMatchObject({ finalDamage: 20 })
    const withBonus = carry([bonus], 1, { scriptId: 'always-attack' })
    // attack 20 is the `makeParty` default for X (stats default to 20)
    expect(hit(withBonus)).toMatchObject({ finalDamage: 30 })
  })

  it('taken-reduction inside a status takes its stacks as the default count: 0.5 ** 2 = 0.25', () => {
    const state = carry([{ category: 'taken-reduction', magnitude: 0.5 }], 2)
    expect(gatherTakenFactors(creatureOf(state), state)).toEqual([0.25])
  })
})

describe('the status validator (the bright line)', () => {
  const statusWith = (effect: EffectDef): StatusDef => ({
    statusId: 'bad',
    cap: 1,
    polarity: 'debuff',
    defaultDuration: 1,
    effects: [effect],
  })

  it('rejects stat-modifier inside a status', () => {
    expect(() =>
      validateStatusDef(
        statusWith({ category: 'stat-modifier', stat: 'attack', factor: 0.5 }),
      ),
    ).toThrow(/stat-modifier/)
  })
  it('rejects stat-remap inside a status', () => {
    expect(() =>
      validateStatusDef(
        statusWith({ category: 'stat-remap', slot: 'attack', fromStat: 'speed' }),
      ),
    ).toThrow(/stat-remap/)
  })
  it('rejects status-immunity inside a status', () => {
    expect(() =>
      validateStatusDef(statusWith({ category: 'status-immunity', statusId: 'stun' })),
    ).toThrow(/status-immunity/)
  })
  it('rejects innate-spell inside a status', () => {
    expect(() =>
      validateStatusDef(statusWith({ category: 'innate-spell', spell: SELF_STUN_SPELL })),
    ).toThrow(/innate-spell/)
  })
  it("rejects a trigger inside a status that targets the intent-only 'random' selector", () => {
    expect(() =>
      validateStatusDef(
        statusWith({
          category: 'triggered',
          hook: 'on-turn-end',
          response: {
            kind: 'apply-status',
            target: { kind: 'selector', selector: { kind: 'random' } },
            status: { statusId: 'stun' },
          },
        }),
      ),
    ).toThrow(/random/)
  })
  it('accepts the passives and triggers a status is meant to carry', () => {
    for (const effect of [
      lock('all'),
      { category: 'turn-order', position: 'last', breakChancePercent: 10 },
      { category: 'friendly-fire', chancePercent: 50 },
      { category: 'damage-modifier', direction: 'dealt', magnitude: 0.1 },
    ] as EffectDef[]) {
      expect(() => validateStatusDef(statusWith(effect))).not.toThrow()
    }
    for (const stock of [
      STUN,
      SLEEP,
      POISON,
      WEB,
      GRANT_ACT_FIRST,
      CONFUSION,
      WEAKEN,
      VULNERABILITY,
    ]) {
      expect(() => validateStatusDef(stock)).not.toThrow()
    }
  })

  const BREAKABLE: EffectDef = {
    category: 'turn-order',
    position: 'last',
    breakChancePercent: 10,
  }
  it('rejects turn-order.breakChancePercent outside a status (a plain effect list)', () => {
    expect(() => validateNoBreakChanceOutsideStatus([BREAKABLE])).toThrow(
      /breakChancePercent/,
    )
    expect(() =>
      validateNoBreakChanceOutsideStatus([{ category: 'turn-order', position: 'first' }]),
    ).not.toThrow()
  })
  it('rejects turn-order.breakChancePercent on a trait (the trait registry check)', () => {
    expect(() => validateTrait({ id: 't', name: 'T', effects: [BREAKABLE] })).toThrow(
      /breakChancePercent/,
    )
  })
  it('rejects turn-order.breakChancePercent on a perk (the specialization check)', () => {
    const broken = {
      ...SORCERER,
      perks: SORCERER.perks.map((perk, i) =>
        i === 0 ? { ...perk, effects: [BREAKABLE] } : perk,
      ),
    }
    expect(() => validateSpecialization(broken)).toThrow(/breakChancePercent/)
  })
})
