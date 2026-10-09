// Phase 4.1-C2a (A1): unit coverage for actions.ts's own plumbing beyond what
// interpreter.test.ts (checkLegality via decideAction's rule loop / the implicit fallback) and
// support-spells.test.ts (resolveIntent's ally-side path) already exercise.

import { describe, expect, it } from 'vitest'
import {
  castableGemSlots,
  createResolutionContext,
  defaultTargetingFor,
  drainGrantedActions,
  executeAction,
  resolveIntent,
} from './actions'
import { createCombat, resolveTurn } from './combat'
import { newCascade } from './resolution'
import { createEffectInstanceId } from './effect-types'
import { ALWAYS_WAIT_SCRIPT as ALWAYS_WAIT } from './__fixtures__/scripts'
import { STUN } from '../data/statuses'
import { makeParty } from './__fixtures__/creatures'
import { createRngState, nextRandom } from './rng'
import type { CombatEvent, CombatState, Spell } from './types'
import type { ActiveEffect, Trait } from './effect-types'

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    rng: createRngState(1),
    playerParty: [],
    enemyParty: [],
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    statuses: new Map(),
    effectInstanceCounter: 0,
    turnClock: 0,
    ...overrides,
  }
}

const ENEMY_SPELL: Spell = {
  id: 'enemy-spell-fixture',
  name: 'Enemy Spell (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}
const ALLY_SPELL: Spell = {
  id: 'ally-spell-fixture',
  name: 'Ally Spell (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'ally',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}
const AOE_SPELL: Spell = {
  id: 'aoe-spell-fixture',
  name: 'AOE Spell (fixture)',
  targetShape: 'aoe',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.3,
    },
  ],
}

describe('defaultTargetingFor (Phase 4.1-C2a, A1; wired into resolveIntent in C2b/B1)', () => {
  it('Attack defaults to lowest-hp-enemy', () => {
    const player = makeParty('player', [{ id: 'me' }])
    expect(defaultTargetingFor(player[0]!, { kind: 'attack' })).toEqual({
      kind: 'lowest-hp-enemy',
    })
  })

  it('a single-target enemy-side Cast defaults to lowest-hp-enemy', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SPELL] }])
    expect(defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 0 })).toEqual({
      kind: 'lowest-hp-enemy',
    })
  })

  it('a single-target ally-side Cast defaults to lowest-hp-ally', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ALLY_SPELL] }])
    expect(defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 0 })).toEqual({
      kind: 'lowest-hp-ally',
    })
  })

  it('an AOE Cast has no single default target', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [AOE_SPELL] }])
    expect(defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 0 })).toBeUndefined()
  })

  it("gemSlot: 'random' has no default -- which spell (and side) it resolves to isn't known yet", () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SPELL] }])
    expect(
      defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 'random' }),
    ).toBeUndefined()
  })

  it('an empty gem slot has no default', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [null] }])
    expect(defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 0 })).toBeUndefined()
  })

  it.each([
    [{ kind: 'defend' as const }],
    [{ kind: 'provoke' as const }],
    [{ kind: 'wait' as const }],
  ])('%o (self-only) has no default target', (action) => {
    const player = makeParty('player', [{ id: 'me' }])
    expect(defaultTargetingFor(player[0]!, action)).toBeUndefined()
  })
})

describe('castableGemSlots (Phase 4.1-C2a, A1)', () => {
  it('includes every non-empty slot whose spell has a valid target, innate slots included', () => {
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SPELL, null, ALLY_SPELL] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    // Slot 1 is empty; slot 2 (ally-side) always has a candidate ("ally" includes the actor).
    expect(castableGemSlots(player[0]!, state)).toEqual([0, 2])
  })

  it('excludes a single-target spell with no living creature on its own intended side', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SPELL] }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(castableGemSlots(player[0]!, state)).toEqual([])
  })

  it('an AOE spell is always castable, even against an empty side', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [AOE_SPELL] }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(castableGemSlots(player[0]!, state)).toEqual([0])
  })
})

describe("resolveIntent's gemSlot: 'random' draw order (Phase 4.1-C2a, A1)", () => {
  it('draws the gem slot BEFORE the target across seeds 0-19 -- pinned for byte-identity with granted-cast/echo', () => {
    // Two DISTINCT slots (0/1) and three enemies (unequal pool sizes) so the gem-first and
    // target-first hypotheses can resolve to DIFFERENT concrete picks -- a discriminating proof,
    // not just a draw-count check (the rng's own position after N draws is the same regardless
    // of what order those draws were spent in). A single seed isn't enough either: at ONE seed
    // the gem-first prediction can coincidentally match a gem draw that always picks the last
    // slot, or happen to equal the target-first prediction -- looping and asserting BOTH slots
    // get chosen and at least one seed's two hypotheses diverge closes both gaps.
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SPELL, ENEMY_SPELL] },
    ])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }, { id: 'c' }])

    const seenGemSlots = new Set<number>()
    let sawDivergence = false

    for (let seed = 0; seed < 20; seed++) {
      const state = makeState({
        playerParty: player,
        enemyParty: enemy,
        rng: createRngState(seed),
      })

      const action = resolveIntent(
        player[0]!,
        { action: { kind: 'cast', gemSlot: 'random' }, targeting: { kind: 'random' } },
        state,
      )
      if (action?.kind !== 'cast' || action.targetShape !== 'single') {
        throw new Error(`expected a resolved single-target cast at seed ${seed}`)
      }

      const gemFirst = createRngState(seed)
      const gemFirstGemSlot = Math.floor(nextRandom(gemFirst) * 2)
      const gemFirstTargetIndex = Math.floor(nextRandom(gemFirst) * 3)

      const targetFirst = createRngState(seed)
      const targetFirstTargetIndex = Math.floor(nextRandom(targetFirst) * 3)
      const targetFirstGemSlot = Math.floor(nextRandom(targetFirst) * 2)

      // The gem-first prediction must hold at EVERY seed.
      expect(action.gemSlot).toBe(gemFirstGemSlot)
      expect(action.targetId).toBe(enemy[gemFirstTargetIndex]!.id)

      seenGemSlots.add(action.gemSlot)
      if (
        gemFirstGemSlot !== targetFirstGemSlot ||
        gemFirstTargetIndex !== targetFirstTargetIndex
      ) {
        sawDivergence = true
      }
    }

    expect(seenGemSlots).toEqual(new Set([0, 1]))
    expect(sawDivergence).toBe(true)
  })
})

describe('resolveIntent -- castable-filtered gem draw and resolved-side default (Phase 4.1-C2b)', () => {
  it("gemSlot 'random' draws over the castable slots only, and draws NOTHING when none is castable", () => {
    // Slot 0 = enemy spell, slot 1 = ally spell; the enemy side is empty, so only slot 1 castable.
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SPELL, ALLY_SPELL] },
    ])
    const enemy = makeParty('enemy', [{ id: 'dead', alive: false }])
    for (let seed = 0; seed < 20; seed++) {
      const state = makeState({
        rng: createRngState(seed),
        playerParty: player,
        enemyParty: enemy,
      })
      const action = resolveIntent(
        player[0]!,
        { action: { kind: 'cast', gemSlot: 'random' } },
        state,
      )
      expect(action).toEqual({
        kind: 'cast',
        targetShape: 'single',
        gemSlot: 1,
        targetId: player[0]!.id,
      })
    }
    // Nothing castable at all: null, and the RNG bookmark never moved.
    const onlyEnemy = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SPELL] }])
    const state = makeState({ playerParty: onlyEnemy, enemyParty: enemy })
    const before = state.rng.position
    expect(
      resolveIntent(
        onlyEnemy[0]!,
        { action: { kind: 'cast', gemSlot: 'random' } },
        state,
      ),
    ).toBeNull()
    expect(state.rng.position).toBe(before)
  })

  it("a gemSlot 'random' cast with no targeting defaults by the DRAWN spell's side", () => {
    const player = makeParty('player', [
      { id: 'me', health: 40, equippedSpells: [ALLY_SPELL] },
      { id: 'hurt', health: 40, currentHp: 5 },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      resolveIntent(player[0]!, { action: { kind: 'cast', gemSlot: 'random' } }, state),
    ).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: player[1]!.id,
    })
  })
})

// ---- Phase 4.1-C2c (B2, B5): one rule set for every action source ----

function lock(scope: 'all' | 'cast', id = 'lock'): ActiveEffect {
  return {
    category: 'status',
    statusId: 'lock-' + id,
    effects: [{ category: 'action-lock', scope: scope }],
    polarity: 'debuff',
    defaultDuration: 3,
    instanceId: createEffectInstanceId('lock#' + id),
    sourceTraitId: 'lock-' + id,
    remainingDuration: 2,
    appliedAt: 0,
  }
}

const RANDOM_CAST = { action: { kind: 'cast', gemSlot: 'random' } } as const

describe('runAction -- legality before resolution, for every source (B2.2, 4.1-C2c)', () => {
  it('a scoped-Cast lock refuses a cast, and NOTHING is drawn or emitted (not even the gem draw)', () => {
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SPELL], activeEffects: [lock('cast')] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createRngState(42),
    })
    const events: CombatEvent[] = []
    const ctx = createResolutionContext(events, newCascade())

    const next = ctx.runAction(player[0]!.id, RANDOM_CAST, state)

    expect(next).toBe(state)
    expect(events).toEqual([])
    expect(state.rng.position).toBe(createRngState(42).position) // zero draws
  })

  it('Clear Mind-style immunity re-permits the same cast', () => {
    const silenced = lock('cast', 'silenced')
    const clearMind: ActiveEffect = {
      category: 'status-immunity',
      statusId: 'lock-silenced',
      instanceId: createEffectInstanceId('clear-mind'),
      sourceTraitId: 'clear-mind',
    }
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SPELL], activeEffects: [silenced, clearMind] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    const events: CombatEvent[] = []
    const ctx = createResolutionContext(events, newCascade())

    ctx.runAction(player[0]!.id, RANDOM_CAST, state)

    expect(events.some((e) => e.type === 'SpellCast')).toBe(true)
  })

  it("an 'all' lock applied MID-turn (a turn-end hook) refuses that turn's granted cast", () => {
    // The lock lands AFTER turn-start, so the skipped-turn flag is false: this is B2.2 (legality
    // at the granted step), not B2.1 (the skip gate).
    const trait: Trait = {
      id: 'lock-then-bonus-fixture',
      name: 'Lock then bonus (fixture)',
      effects: [
        {
          category: 'triggered',
          hook: 'on-turn-end',
          chancePercent: 100,
          response: {
            kind: 'perform-action',
            actor: 'self',
            intent: { action: { kind: 'cast', gemSlot: 'random' } },
          },
        },
        {
          category: 'triggered',
          hook: 'on-turn-end',
          response: {
            kind: 'apply-status',
            target: { kind: 'self' },
            status: { statusId: STUN.statusId, duration: 3 },
          },
        },
      ],
    }
    const state = createCombat({
      seed: 5,
      player: {
        party: makeParty('player', [
          {
            id: 'me',
            speed: 20,
            scriptId: 'always-wait',
            equippedSpells: [ENEMY_SPELL],
            innateTraitIds: [trait.id],
          },
        ]),
      },
      enemy: { party: makeParty('enemy', [{ id: 'foe', speed: 1 }]) },
      registries: {
        scripts: new Map([['always-wait', ALWAYS_WAIT]]),
        traits: new Map([[trait.id, trait]]),
        statuses: new Map([[STUN.statusId, STUN]]),
      },
    })

    const { events } = resolveTurn(state)

    expect(events.some((e) => e.type === 'StatusApplied')).toBe(true)
    expect(events.some((e) => e.type === 'SpellCast')).toBe(false)
  })
})

describe('an echo is gated by the CASTER, never the bearer (B2.2, 4.1-C2c)', () => {
  // Seed 7's draws: #1 0.0117 (echo roll, 50% -> passes), #2 0.0620 (gem), #3 0.9769 (random
  // target), #4 0.6990 (the echo's own re-observation roll -> fails), so the chain is one echo.
  const ECHO: ActiveEffect = {
    category: 'triggered',
    hook: 'on-action-observed',
    observationFilter: { relationship: 'ally', actionKind: 'cast' },
    chancePercent: 50,
    stacks: false,
    response: {
      kind: 'perform-action',
      actor: 'triggering-source',
      intent: {
        action: { kind: 'cast', gemSlot: 'random' },
        targeting: { kind: 'random' },
      },
    },
    instanceId: createEffectInstanceId('echo#1'),
    sourceTraitId: 'echo-fixture',
  }

  function run(casterEffects: ActiveEffect[], bearerEffects: ActiveEffect[]) {
    const player = makeParty('player', [
      { id: 'caster', equippedSpells: [ENEMY_SPELL], activeEffects: casterEffects },
      { id: 'bearer', activeEffects: [ECHO, ...bearerEffects] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe', health: 100 }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createRngState(7),
    })
    const events: CombatEvent[] = []
    const ctx = createResolutionContext(events, newCascade())
    const after = executeAction(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      state,
      ctx,
    )
    drainGrantedActions(ctx, after) // 4.1-E: the echo is queued; the scope drains it
    return events
  }

  it('a Stunned BEARER still echoes (its trigger is passive)', () => {
    const events = run([], [lock('all', 'bearer')])
    expect(events.filter((e) => e.type === 'ActionGranted')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'SpellCast')).toHaveLength(2)
  })

  it('a locked CASTER refuses the echo: the trigger shows, but no grant event and no cast', () => {
    const events = run([lock('cast', 'caster')], [])
    expect(events.filter((e) => e.type === 'TriggerFired')).toHaveLength(1)
    expect(events.some((e) => e.type === 'ActionGranted')).toBe(false)
    // Only the original (directly executed) cast; the echo produced nothing.
    expect(events.filter((e) => e.type === 'SpellCast')).toHaveLength(1)
  })
})

describe('resolveInstanceTarget -- rule 4 (B2.4, 4.1-C2c)', () => {
  // ATTACKER: Attack 20, a second 30% instance. Instance 1 (100%, 20 dmg) kills the first
  // enemy (HP 5), so instance 2 must fall back. Defence 0 everywhere.
  const SECOND_INSTANCE: ActiveEffect = {
    category: 'action-instance',
    actionKind: 'attack',
    powerPercent: 30,
    instanceId: createEffectInstanceId('inst#2'),
    sourceTraitId: 'inst-fixture',
  }

  function attackFrom(
    attackerEffects: ActiveEffect[],
    enemyOverrides: Parameters<typeof makeParty>[1],
  ) {
    const player = makeParty('player', [
      { id: 'me', attack: 20, defence: 0, activeEffects: attackerEffects },
    ])
    const enemy = makeParty('enemy', enemyOverrides)
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createRngState(42),
    })
    const events: CombatEvent[] = []
    const ctx = createResolutionContext(events, newCascade())
    executeAction(player[0]!, { kind: 'attack', targetId: enemy[0]!.id }, state, ctx)
    const targets = events.flatMap((e) =>
      e.type === 'AttackDeclared' ? [String(e.targetId)] : [],
    )
    return { targets, state }
  }

  it('falls back to the side-aware default (LOWEST HP), not first-by-slot', () => {
    const { targets } = attackFrom(
      [SECOND_INSTANCE],
      [
        { id: 'target', health: 5, defence: 0 },
        { id: 'big', health: 40, defence: 0 }, // first living by slot after the kill
        { id: 'small', health: 10, defence: 0 }, // lowest HP
      ],
    )
    expect(targets).toEqual(['target', 'small'])
  })

  it('then Provoke: redirects to the provoker and draws exactly one value, even for a single provoker', () => {
    const { targets, state } = attackFrom(
      [SECOND_INSTANCE],
      [
        { id: 'target', health: 5, defence: 0 },
        { id: 'small', health: 10, defence: 0 }, // the default would pick this
        { id: 'provoker', health: 40, defence: 0, provoking: true },
      ],
    )
    expect(targets).toEqual(['target', 'provoker'])
    const sibling = createRngState(42)
    nextRandom(sibling)
    expect(state.rng.position).toBe(sibling.position)
  })

  it('Tunnel Vision skips the Provoke step: the default target, and no draw', () => {
    const tunnelVision: ActiveEffect = {
      category: 'provoke-immunity',
      instanceId: createEffectInstanceId('tv'),
      sourceTraitId: 'tunnel-vision',
    }
    const { targets, state } = attackFrom(
      [SECOND_INSTANCE, tunnelVision],
      [
        { id: 'target', health: 5, defence: 0 },
        { id: 'small', health: 10, defence: 0 },
        { id: 'provoker', health: 40, defence: 0, provoking: true },
      ],
    )
    expect(targets).toEqual(['target', 'small'])
    expect(state.rng.position).toBe(createRngState(42).position)
  })

  it('never rolls Confusion: a 100%-confused attacker still re-targets an ENEMY, drawing nothing', () => {
    const confused: ActiveEffect = {
      category: 'status',
      statusId: 'confusion',
      polarity: 'debuff',
      defaultDuration: 3,
      instanceId: createEffectInstanceId('conf'),
      sourceTraitId: 'confusion',
      remainingDuration: 3,
      appliedAt: 0,
      effects: [{ category: 'friendly-fire', chancePercent: 100 }],
    }
    const { targets, state } = attackFrom(
      [SECOND_INSTANCE, confused],
      [
        { id: 'target', health: 5, defence: 0 },
        { id: 'small', health: 10, defence: 0 },
      ],
    )
    expect(targets).toEqual(['target', 'small'])
    expect(state.rng.position).toBe(createRngState(42).position)
  })

  it('an ally-side instance skips Provoke: the lowest-HP ALLY, no draw, despite an enemy provoker', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        equippedSpells: [ALLY_SPELL],
        activeEffects: [
          {
            category: 'action-instance',
            actionKind: 'cast',
            powerPercent: 30,
            instanceId: createEffectInstanceId('inst#c'),
            sourceTraitId: 'inst-fixture',
          },
        ],
      },
      { id: 'dead-ally', alive: false },
      { id: 'ally', health: 20, currentHp: 5 },
    ])
    const enemy = makeParty('enemy', [{ id: 'provoker', provoking: true }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createRngState(42),
    })
    const events: CombatEvent[] = []
    executeAction(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: player[1]!.id },
      state,
      createResolutionContext(events, newCascade()),
    )
    const targets = events.flatMap((e) =>
      e.type === 'SpellCast' && e.targetShape === 'single' ? [String(e.targetId)] : [],
    )
    // The previously chosen ally is dead, so BOTH instances fall back to the lowest-HP living
    // ally (ally, 5 HP; 'me' has 20), never the enemy provoker.
    expect(targets).toEqual(['ally', 'ally'])
    expect(state.rng.position).toBe(createRngState(42).position)
  })
})
