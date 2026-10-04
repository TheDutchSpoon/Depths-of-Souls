// Phase 4.1-D (A4): spells carry responses. The re-expression is BYTE-IDENTICAL, so this file has
// two halves:
//
//  1. One old-vs-new EQUIVALENCE test per payload kind (damage, heal, stat-modifier, damage +
//     status, AOE + status). The "old" side is `legacyCast` below: the pre-4.1-D cast executor's
//     payload path as it stood on `main@eb37246` (`applyCastPayload`,
//     `resolveSpellOffStat`, `applyStatusIfAlive`, and the executeCastSingle/Aoe loops minus their
//     hook firing, which is a no-op on a trait-free fixture), replayed on the current primitives.
//     It is NOT verbatim: the old damage call (`dealDamageWithOffStat`, since deleted) is replaced
//     by `dealDamage` / `dealDamageWithScalingStat`, which compute the same value from the same
//     `spellPower x pf` and call the same core. Both sides start from equal states; the events, the final state and the RNG
//     position must be identical. Each case also pins its hand-derived numbers.
//  2. Pins for each parity rule and check site the plan names (P2, P5, P8, B5 on the cast path,
//     `cast-target` at BOTH the single-target and the AOE site, `self` once per landed target, the
//     atomic effect list, live caster stats) plus the validators.
//
// The full golden suite (unchanged `expected*` exports) and the corpus digest are the integration
// proof; this file is the focused proof.

import { describe, expect, it } from 'vitest'
import { createResolutionContext, executeAction } from './actions'
import { MAX_TRIGGER_CASCADE_DEPTH } from './config'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import { gatherExtraInstances } from './effects'
import {
  applyHeal,
  applyStatModifier,
  applyStatus,
  dealDamage,
  dealDamageWithScalingStat,
  executeResponse,
  newCascade,
} from './resolution'
import {
  createEffectInstanceId,
  validateNoRandomSelectorInResponseTargets,
  validateSpellEffects,
  validateStatusNoRandomSelectorInResponseTargets,
} from './effect-types'
import { makeParty } from './__fixtures__/creatures'
import { createRngState } from './rng'
import { WEAKEN } from '../data/statuses'
import { ALL_SPELLS } from '../data/spells'
import type { CreatureId } from './ids'
import type { Action, CombatEvent, CombatState, Creature, Spell, Stat } from './types'
import type {
  ActiveEffect,
  EffectDef,
  EffectResponse,
  StatusDef,
  StatusSpec,
} from './effect-types'

// ---- Fixture plumbing ----

function makeState(playerParty: Creature[], enemyParty: Creature[]): CombatState {
  return {
    rng: createRngState(7),
    playerParty,
    enemyParty,
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    statuses: new Map([[WEAKEN.statusId, WEAKEN]]),
    effectInstanceCounter: 0,
  }
}

let counter = 0
function eff<T extends object>(def: T): ActiveEffect {
  counter += 1
  return {
    ...def,
    instanceId: createEffectInstanceId('se#' + counter),
    sourceTraitId: 'spell-effects-fixture',
  } as never
}

const extraCastInstance = (powerPercent: number) =>
  eff({ category: 'action-instance', actionKind: 'cast', powerPercent })

function runNew(
  actor: Creature,
  action: Action,
  state: CombatState,
  cascade = newCascade(),
): { events: CombatEvent[]; state: CombatState } {
  const events: CombatEvent[] = []
  const out = executeAction(
    actor,
    action,
    state,
    createResolutionContext(events, cascade),
  )
  return { events, state: out }
}

const findCreature = (state: CombatState, id: string): Creature =>
  [...state.playerParty, ...state.enemyParty].find((c) => String(c.id) === id)!

// ---- The legacy oracle (main@eb37246) ----

/** The PRE-4.1-D `Spell` shape (history): `spellPower`, `scalingStat`, `payload`, `statModifier` and
 * `appliesStatus` were spell-level fields. Only the legacy oracle below reads it. */
interface LegacySpell {
  readonly id: string
  readonly targetShape: 'single' | 'aoe'
  readonly targetSide?: 'enemy' | 'ally'
  readonly spellPower: number
  readonly scalingStat?: Stat
  readonly payload?: 'damage' | 'heal' | 'stat-modifier'
  readonly statModifier?: { stat: Stat; factor: number }
  readonly appliesStatus?: StatusSpec
}

/** How the 4.1-D data re-expression maps an old spell onto `effects` (what the codemod did to
 * every literal in src/data and every fixture). */
function toSpell(legacy: LegacySpell): Spell {
  const payload = legacy.payload ?? 'damage'
  const effects: EffectResponse[] = []
  if (payload === 'damage' || payload === 'heal') {
    const magnitude =
      legacy.scalingStat !== undefined
        ? { scalingStat: legacy.scalingStat }
        : { offStat: 'cast' as const }
    effects.push(
      payload === 'damage'
        ? {
            kind: 'deal-damage',
            target: { kind: 'cast-target' },
            ...magnitude,
            spellPower: legacy.spellPower,
            ...(legacy.scalingStat !== undefined
              ? { damageSource: 'cast' as const }
              : {}),
          }
        : {
            kind: 'heal',
            target: { kind: 'cast-target' },
            ...magnitude,
            spellPower: legacy.spellPower,
          },
    )
  } else {
    effects.push({
      kind: 'apply-stat-modifier',
      target: { kind: 'cast-target' },
      stat: legacy.statModifier!.stat,
      factor: legacy.statModifier!.factor,
    })
  }
  if (legacy.appliesStatus) {
    effects.push({
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: legacy.appliesStatus,
    })
  }
  return {
    id: legacy.id,
    name: legacy.id,
    affinity: 'vitality',
    unlockedAtBiome: 1,
    targetShape: legacy.targetShape,
    targetSide: legacy.targetSide ?? 'enemy',
    effects,
  }
}

function legacyOffStat(
  caster: Creature,
  spell: LegacySpell,
  powerFraction: number,
): number {
  const spellPower = spell.spellPower * powerFraction
  if (spell.scalingStat === undefined) return getOffensiveStat(caster, 'cast', spellPower)
  return getEffectiveStat(caster, spell.scalingStat) * spellPower
}

function legacyPayload(
  actor: Creature, // the action-start SNAPSHOT, exactly as the old executors passed it
  spell: LegacySpell,
  targetId: CreatureId,
  powerPercent: number,
  state: CombatState,
  ctx: ReturnType<typeof createResolutionContext>,
): CombatState {
  let working: CombatState
  switch (spell.payload ?? 'damage') {
    case 'damage':
      // The old path: dealDamageWithOffStat(offStat, 'cast', 'cast') over resolveSpellOffStat's
      // value. dealDamage / dealDamageWithScalingStat compute that same value
      // (getOffensiveStat / getEffectiveStat x the same `sp x pf`) and call the same core.
      working =
        spell.scalingStat === undefined
          ? dealDamage(
              actor.id,
              targetId,
              'cast',
              spell.spellPower * (powerPercent / 100),
              'cast',
              state,
              ctx,
            )
          : dealDamageWithScalingStat(
              actor.id,
              targetId,
              spell.scalingStat,
              spell.spellPower * (powerPercent / 100),
              'cast',
              state,
              ctx,
            )
      break
    case 'heal':
      working = applyHeal(
        actor.id,
        targetId,
        legacyOffStat(actor, spell, powerPercent / 100),
        state,
        ctx,
      )
      break
    default:
      working = applyStatModifier(
        actor.id,
        targetId,
        spell.statModifier!.stat,
        spell.statModifier!.factor,
        spell.id,
        state,
        ctx,
      )
  }
  if (spell.appliesStatus) {
    const target = [...working.playerParty, ...working.enemyParty].find(
      (c) => c.id === targetId,
    )!
    if (target.alive) {
      working = applyStatus(actor.id, targetId, spell.appliesStatus, working, ctx)
    }
  }
  return working
}

function legacyCast(
  actor: Creature,
  spell: LegacySpell,
  target: CreatureId | 'aoe',
  state: CombatState,
): { events: CombatEvent[]; state: CombatState } {
  const events: CombatEvent[] = []
  const ctx = createResolutionContext(events, newCascade())
  let working = state
  for (const powerPercent of [100, ...gatherExtraInstances(actor, 'cast')]) {
    if (target === 'aoe') {
      const side = (spell.targetSide ?? 'enemy') === 'ally' ? actor.side : 'enemy'
      const party = side === 'player' ? working.playerParty : working.enemyParty
      const targetIds = party.filter((c) => c.alive).map((c) => c.id)
      events.push({
        type: 'SpellCast',
        targetShape: 'aoe',
        casterId: actor.id,
        gemSlot: 0,
        targetIds,
      })
      for (const id of targetIds) {
        if (
          ![...working.playerParty, ...working.enemyParty].find((c) => c.id === id)!.alive
        )
          continue
        working = legacyPayload(actor, spell, id, powerPercent, working, ctx)
      }
    } else {
      events.push({
        type: 'SpellCast',
        targetShape: 'single',
        casterId: actor.id,
        gemSlot: 0,
        targetId: target,
      })
      working = legacyPayload(actor, spell, target, powerPercent, working, ctx)
    }
  }
  return { events, state: working }
}

/** Runs the same cast down the old and the new path from equal states and demands identical
 * events, final state and RNG position. Returns the new path's events for hand-derived asserts. */
function expectEquivalent(
  legacy: LegacySpell,
  caster: Creature,
  others: { player: Creature[]; enemy: Creature[] },
  target: CreatureId | 'aoe',
): CombatEvent[] {
  const spell = toSpell(legacy)
  const armed: Creature = { ...caster, equippedSpells: [spell] }
  const player = [armed, ...others.player]
  const stateFor = () =>
    makeState(
      player.map((c) => ({ ...c })),
      others.enemy.map((c) => ({ ...c })),
    )
  const oldRun = legacyCast(armed, legacy, target, stateFor())
  const action: Action =
    target === 'aoe'
      ? { kind: 'cast', targetShape: 'aoe', gemSlot: 0 }
      : { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: target }
  const newRun = runNew(armed, action, stateFor())
  expect(newRun.events).toEqual(oldRun.events)
  expect(newRun.state).toEqual(oldRun.state)
  expect(newRun.state.rng).toEqual(oldRun.state.rng)
  return newRun.events
}

const damages = (events: CombatEvent[]) =>
  events.flatMap((e) => (e.type === 'DamageDealt' ? [e.finalDamage] : []))

// ---- 1. Old-vs-new equivalence, one per payload kind ----

describe('4.1-D equivalence: the old cast payload path vs the new effect list', () => {
  it('damage (instance list [100, 30], so the power fraction composes with spellPower)', () => {
    // Caster Int 20, enemy defence 0, HP 100. spellPower 0.3.
    // Instance 1 (100%): off = 20 x (0.3 x 1) = 6, core 6, chip 0.06 -> raw 6.06 -> final 6.
    // Instance 2 (30%):  off = 20 x (0.3 x 0.3) = 20 x 0.09 = 1.8, core 1.8, chip 0.018 ->
    //   raw 1.818 -> floor 1 -> MAX(1, 1) = 1. The float association (sp x pf first, THEN
    //   x stat) is what byte-identity needs.
    const events = expectEquivalent(
      { id: 'dmg', targetShape: 'single', spellPower: 0.3 },
      makeParty('player', [
        { id: 'me', intelligence: 20, activeEffects: [extraCastInstance(30)] },
      ])[0]!,
      { player: [], enemy: makeParty('enemy', [{ id: 'e0', health: 100, defence: 0 }]) },
      makeParty('enemy', [{ id: 'e0' }])[0]!.id,
    )
    expect(damages(events)).toEqual([6, 1])
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(false)
  })

  it('heal (remap-aware Intelligence; instance list [100, 30])', () => {
    // Caster Int 20, heal spellPower 0.5, ally HP 10/100.
    // Instance 1: 20 x 0.5 = 10 -> 10 + 10 = 20. Instance 2: 20 x (0.5 x 0.3) = 3 -> 23.
    const ally = makeParty('player', [{ id: 'me' }, { id: 'ally', health: 100 }])
    const events = expectEquivalent(
      {
        id: 'heal',
        targetShape: 'single',
        targetSide: 'ally',
        spellPower: 0.5,
        payload: 'heal',
      },
      {
        ...ally[0]!,
        baseStats: { ...ally[0]!.baseStats, intelligence: 20 },
        activeEffects: [extraCastInstance(30)],
      },
      {
        player: [{ ...ally[1]!, currentHp: 10 }],
        enemy: makeParty('enemy', [{ id: 'e0' }]),
      },
      ally[1]!.id,
    )
    expect(
      events.flatMap((e) => (e.type === 'HealApplied' ? [e.amount, e.remainingHp] : [])),
    ).toEqual([10, 20, 3, 23])
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(false)
  })

  it('stat-modifier (full strength each instance: powerPercent never scales it)', () => {
    // Defence 20 x 0.8 (instance 1) x 0.8 (instance 2, NOT 0.8^0.3) = 12.8.
    const events = expectEquivalent(
      {
        id: 'sunder',
        targetShape: 'single',
        spellPower: 1,
        payload: 'stat-modifier',
        statModifier: { stat: 'defence', factor: 0.8 },
      },
      makeParty('player', [{ id: 'me', activeEffects: [extraCastInstance(30)] }])[0]!,
      { player: [], enemy: makeParty('enemy', [{ id: 'e0', defence: 20 }]) },
      makeParty('enemy', [{ id: 'e0' }])[0]!.id,
    )
    const modifiers = events.filter((e) => e.type === 'StatModifierApplied')
    expect(modifiers.map((e) => e.factor)).toEqual([0.8, 0.8])
    expect(modifiers.at(-1)!.effectiveAfter).toBeCloseTo(12.8, 10)
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(false)
  })

  it('damage + status: the killing-free hit lands, then the status, per instance', () => {
    // Caster Int 20, spellPower 1.0, defence 0 -> core 20, chip 0.2 -> raw 20.2 -> final 20.
    // Then Weaken (2 turns) on the living target.
    const events = expectEquivalent(
      {
        id: 'smite',
        targetShape: 'single',
        spellPower: 1,
        appliesStatus: { statusId: 'weaken', duration: 2 },
      },
      makeParty('player', [{ id: 'me', intelligence: 20 }])[0]!,
      { player: [], enemy: makeParty('enemy', [{ id: 'e0', health: 100, defence: 0 }]) },
      makeParty('enemy', [{ id: 'e0' }])[0]!.id,
    )
    expect(damages(events)).toEqual([20])
    expect(events.map((e) => e.type)).toEqual([
      'SpellCast',
      'DamageDealt',
      'StatusApplied',
    ])
  })

  it('AOE + status: per frozen member in slot order, damage then status', () => {
    // Int 20, spellPower 0.3 -> 6 each (see the damage case). Order: SpellCast, then for each of
    // e0, e1, e2: DamageDealt, StatusApplied.
    const events = expectEquivalent(
      {
        id: 'nova',
        targetShape: 'aoe',
        spellPower: 0.3,
        appliesStatus: { statusId: 'weaken', duration: 2 },
      },
      makeParty('player', [{ id: 'me', intelligence: 20 }])[0]!,
      {
        player: [],
        enemy: makeParty('enemy', [
          { id: 'e0', health: 100, defence: 0 },
          { id: 'e1', health: 100, defence: 0 },
          { id: 'e2', health: 100, defence: 0 },
        ]),
      },
      'aoe',
    )
    expect(damages(events)).toEqual([6, 6, 6])
    expect(events.map((e) => e.type)).toEqual([
      'SpellCast',
      'DamageDealt',
      'StatusApplied',
      'DamageDealt',
      'StatusApplied',
      'DamageDealt',
      'StatusApplied',
    ])
  })

  it.each([
    ['offStat (remap-aware Intelligence)', undefined],
    ['scalingStat (raw stat)', 'intelligence' as const],
  ])(
    'heal float association, %s: a spell heal is stat x (spellPower x pf), never (stat x sp) x pf',
    (_label, scalingStat) => {
      // Int 60, spellPower 1.5, instance list [100, 30]. Instance 1: 60 x 1.5 = 90 -> 10 + 90 = 100.
      // Instance 2: pf 0.3 -> spellPower x pf = 1.5 x 0.3 = 0.44999999999999996, and
      // 60 x 0.44999999999999996 = 26.999999999999996 -> floor 26 (the OTHER association,
      // (60 x 1.5) x 0.3, gives exactly 27 -> 27). Byte-identity needs 26.
      const ally = makeParty('player', [{ id: 'me' }, { id: 'ally', health: 200 }])
      const events = expectEquivalent(
        {
          id: 'heal-assoc',
          targetShape: 'single',
          targetSide: 'ally',
          spellPower: 1.5,
          payload: 'heal',
          scalingStat,
        },
        {
          ...ally[0]!,
          baseStats: { ...ally[0]!.baseStats, intelligence: 60 },
          activeEffects: [extraCastInstance(30)],
        },
        {
          player: [{ ...ally[1]!, currentHp: 10 }],
          enemy: makeParty('enemy', [{ id: 'e0' }]),
        },
        ally[1]!.id,
      )
      expect(
        events.flatMap((e) =>
          e.type === 'HealApplied' ? [e.amount, e.remainingHp] : [],
        ),
      ).toEqual([90, 100, 26, 126])
    },
  )

  it('an explicit scalingStat reads that stat directly and still counts as a cast', () => {
    // Defence 15 (Int 999 ignored), spellPower 1 -> core 15, chip 0.15 -> 15.15 -> 15.
    const events = expectEquivalent(
      { id: 'root', targetShape: 'single', spellPower: 1, scalingStat: 'defence' },
      makeParty('player', [{ id: 'me', defence: 15, intelligence: 999 }])[0]!,
      { player: [], enemy: makeParty('enemy', [{ id: 'e0', health: 100, defence: 0 }]) },
      makeParty('enemy', [{ id: 'e0' }])[0]!.id,
    )
    expect(damages(events)).toEqual([15])
    const hit = events.find((e) => e.type === 'DamageDealt')
    expect(hit && 'damageSource' in hit ? hit.damageSource : undefined).toBe('cast')
  })
})

// ---- 2. Parity-rule pins ----

describe('P2: a spell hit counts as a cast (cross-stat) and never splashes', () => {
  it("a cast-only cross-stat bonus applies; a Splashing caster's cast hits ONE target", () => {
    // Caster Int 20, Attack 40. cross-stat: +percentPerRank of Attack read into the OffStat for
    // CASTS only. The spell is single-target, spellPower 1.0; enemies defence 0, HP 100 each.
    const spell = toSpell({ id: 's', targetShape: 'single', spellPower: 1 })
    const caster = makeParty('player', [
      {
        id: 'me',
        intelligence: 20,
        attack: 40,
        equippedSpells: [spell],
        activeEffects: [
          eff({ category: 'splashing' }),
          eff({
            category: 'cross-stat',
            fromStat: 'attack',
            percentPerRank: 0.5,
            appliesTo: 'cast',
          }),
        ],
      },
    ])[0]!
    const enemies = makeParty('enemy', [
      { id: 'e0', health: 100, defence: 0 },
      { id: 'e1', health: 100, defence: 0 },
      { id: 'e2', health: 100, defence: 0 },
    ])
    const plain = runNew(
      { ...caster, activeEffects: [caster.activeEffects[0]!] }, // Splashing only
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemies[1]!.id },
      makeState([{ ...caster, activeEffects: [caster.activeEffects[0]!] }], enemies),
    )
    const boosted = runNew(
      caster,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemies[1]!.id },
      makeState([caster], enemies),
    )
    // One hit only: no splash onto e0/e2 in either run.
    expect(plain.events.filter((e) => e.type === 'DamageDealt')).toHaveLength(1)
    expect(boosted.events.filter((e) => e.type === 'DamageDealt')).toHaveLength(1)
    // The cast-flavoured cross-stat adds to the hit: strictly more than the plain cast.
    expect(damages(boosted.events)[0]!).toBeGreaterThan(damages(plain.events)[0]!)
  })
})

describe('P8: a spell effect takes no cascade-depth or self-guard accounting', () => {
  it("at depth MAX-1 the target's reaction to the spell hit still fires (no +1 from the spell)", () => {
    // The target retaliates (on-damage-taken -> flat 1 to the triggering source). fireHook needs
    // depth+1 <= MAX to fire. With the cascade at MAX-1 the trigger fires ONLY IF the spell's own
    // effect added no depth; a +1 around the effect loop would truncate it (CascadeTruncated).
    const spell = toSpell({ id: 's', targetShape: 'single', spellPower: 1 })
    const player = makeParty('player', [
      { id: 'me', health: 100, equippedSpells: [spell] },
    ])
    const enemy = makeParty('enemy', [
      {
        id: 'e0',
        health: 100,
        activeEffects: [
          eff({
            category: 'triggered',
            hook: 'on-damage-taken',
            response: {
              kind: 'deal-damage',
              target: { kind: 'triggering-source' },
              flatAmount: 1,
              damageSource: 'attack',
            },
          }),
        ],
      },
    ])
    const cascade = newCascade()
    cascade.depth = MAX_TRIGGER_CASCADE_DEPTH - 1
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
      cascade,
    )
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(true)
    expect(events.some((e) => e.type === 'CascadeTruncated')).toBe(false)
  })
})

describe('B5 on the cast path: a target killed in its own pre-hit hooks gets NOTHING from the list', () => {
  // The caster's on-cast trigger deals a lethal 99 to the cast's target before the list runs.
  const KILL_TARGET_ON_CAST = () =>
    eff({
      category: 'triggered',
      hook: 'on-cast',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        flatAmount: 99,
        damageSource: 'attack',
      },
    })

  it('a stat-modifier spell: no StatModifierApplied, target unchanged', () => {
    const spell = toSpell({
      id: 'sunder',
      targetShape: 'single',
      spellPower: 1,
      payload: 'stat-modifier',
      statModifier: { stat: 'defence', factor: 0.8 },
    })
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [spell], activeEffects: [KILL_TARGET_ON_CAST()] },
    ])
    const enemy = makeParty('enemy', [{ id: 'e0', health: 50, defence: 20 }])
    const { events, state } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    expect(events.some((e) => e.type === 'SpellCast')).toBe(true)
    expect(events.some((e) => e.type === 'CreatureDied')).toBe(true)
    expect(events.some((e) => e.type === 'StatModifierApplied')).toBe(false)
    expect(getEffectiveStat(findCreature(state, 'e0'), 'defence')).toBe(20)
  })

  it('a heal spell on an ally: no HealApplied for the corpse', () => {
    const spell = toSpell({
      id: 'mend',
      targetShape: 'single',
      targetSide: 'ally',
      spellPower: 1,
      payload: 'heal',
    })
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [spell], activeEffects: [KILL_TARGET_ON_CAST()] },
      { id: 'ally', health: 50, currentHp: 10 },
    ])
    const enemy = makeParty('enemy', [{ id: 'e0' }])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: player[1]!.id },
      makeState(player, enemy),
    )
    expect(events.some((e) => e.type === 'CreatureDied')).toBe(true)
    expect(events.some((e) => e.type === 'HealApplied')).toBe(false)
  })
})

describe('B5 and the AOE alive-skip also guard `self` effects (cast-target alone would not)', () => {
  // DRAIN: damage the landed target, then heal the CASTER. A dead target must cost the caster its
  // heal too -- "gets NOTHING from the effect list" -- which only the loop-level checks enforce,
  // because `self` does not resolve through `cast-target`.
  const DRAIN = (targetShape: 'single' | 'aoe'): Spell => ({
    id: 'drain',
    name: 'Drain',
    affinity: 'vitality',
    unlockedAtBiome: 1,
    targetShape,
    targetSide: 'enemy',
    effects: [
      {
        kind: 'deal-damage',
        target: { kind: 'cast-target' },
        offStat: 'cast',
        spellPower: 1,
      },
      { kind: 'heal', target: { kind: 'self' }, offStat: 'cast', spellPower: 0.5 },
    ],
  })

  it('B5 (single): the target dies in the on-cast hook -> no damage AND no self heal', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        health: 100,
        currentHp: 50,
        equippedSpells: [DRAIN('single')],
        activeEffects: [
          eff({
            category: 'triggered',
            hook: 'on-cast',
            response: {
              kind: 'deal-damage',
              target: { kind: 'triggering-source' },
              flatAmount: 99,
              damageSource: 'attack',
            },
          }),
        ],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'e0', health: 50, defence: 0 }])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    expect(events.some((e) => e.type === 'CreatureDied')).toBe(true)
    expect(events.some((e) => e.type === 'HealApplied')).toBe(false)
    // The trigger's own lethal hit is an 'attack'-tagged DamageDealt; the SPELL's is 'cast'.
    expect(
      events.some((e) => e.type === 'DamageDealt' && e.damageSource === 'cast'),
    ).toBe(false)
  })

  it("AOE: a member killed by an earlier member's on-death is skipped -> no hit AND no self heal for it", () => {
    // m1 (HP 5) dies to the AOE hit; its on-death deals a lethal flat 99 to its lowest-HP ally m2.
    // The frozen list is [m1, m2]; m2 is dead when its turn comes, so it is skipped entirely.
    // m1 was a LANDED target (its list runs whole, atomic): one self heal. m2 must add none.
    const player = makeParty('player', [
      {
        id: 'me',
        health: 100,
        currentHp: 10,
        intelligence: 20,
        equippedSpells: [DRAIN('aoe')],
      },
    ])
    const enemy = makeParty('enemy', [
      {
        id: 'm1',
        health: 5,
        defence: 0,
        activeEffects: [
          eff({
            category: 'triggered',
            hook: 'on-death',
            response: {
              kind: 'deal-damage',
              target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
              flatAmount: 99,
              damageSource: 'attack',
            },
          }),
        ],
      },
      { id: 'm2', health: 50, defence: 0 },
    ])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'aoe', gemSlot: 0 },
      makeState(player, enemy),
    )
    expect(
      events.filter((e) => e.type === 'HealApplied' && String(e.targetId) === 'me'),
    ).toHaveLength(1)
    expect(
      events.flatMap((e) =>
        e.type === 'DamageDealt' && String(e.sourceId) === 'me'
          ? [String(e.targetId)]
          : [],
      ),
    ).toEqual(['m1'])
  })
})

describe('cast-target resolves to the landed target at BOTH sites', () => {
  const MARK: StatusSpec = { statusId: 'weaken', duration: 2 }

  it('single-target site: the status lands on the chosen target, not the caster or a neighbour', () => {
    const spell = toSpell({
      id: 's',
      targetShape: 'single',
      spellPower: 1,
      appliesStatus: MARK,
    })
    const player = makeParty('player', [
      { id: 'me', health: 200, equippedSpells: [spell] },
    ])
    const enemy = makeParty('enemy', [
      { id: 'e0', health: 100, defence: 0 },
      { id: 'e1', health: 100, defence: 0 },
    ])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[1]!.id },
      makeState(player, enemy),
    )
    const applied = events.flatMap((e) =>
      e.type === 'StatusApplied' ? [String(e.targetId)] : [],
    )
    expect(applied).toEqual(['e1'])
  })

  it('AOE site: the status lands on each member in turn, in slot order', () => {
    const spell = toSpell({
      id: 'n',
      targetShape: 'aoe',
      spellPower: 0.3,
      appliesStatus: MARK,
    })
    const player = makeParty('player', [
      { id: 'me', health: 200, equippedSpells: [spell] },
    ])
    const enemy = makeParty('enemy', [
      { id: 'e0', health: 100, defence: 0 },
      { id: 'e1', health: 100, defence: 0 },
      { id: 'e2', health: 100, defence: 0 },
    ])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'aoe', gemSlot: 0 },
      makeState(player, enemy),
    )
    const applied = events.flatMap((e) =>
      e.type === 'StatusApplied' ? [String(e.targetId)] : [],
    )
    expect(applied).toEqual(['e0', 'e1', 'e2'])
  })

  it('outside a spell cast it is a resolver-invariant error', () => {
    const events: CombatEvent[] = []
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'e0' }])
    expect(() =>
      executeResponse(
        { kind: 'apply-status', target: { kind: 'cast-target' }, status: MARK },
        'fixture',
        { self: player[0]!.id },
        makeState(player, enemy),
        createResolutionContext(events, newCascade()),
      ),
    ).toThrow(/cast-target resolved outside a spell cast/)
  })
})

describe('a `self` effect runs once per landed target', () => {
  // DRAIN: deal damage to the landed target, then heal the CASTER (self) for 1 x Int-scaled 0.1.
  const DRAIN: Spell = {
    id: 'drain',
    name: 'Drain',
    affinity: 'vitality',
    unlockedAtBiome: 1,
    targetShape: 'single',
    targetSide: 'enemy',
    effects: [
      {
        kind: 'deal-damage',
        target: { kind: 'cast-target' },
        offStat: 'cast',
        spellPower: 1,
      },
      { kind: 'heal', target: { kind: 'self' }, offStat: 'cast', spellPower: 0.5 },
    ],
  }
  const healsOf = (events: CombatEvent[]) =>
    events.flatMap((e) => (e.type === 'HealApplied' ? [String(e.targetId)] : []))

  it('single-target: once', () => {
    const player = makeParty('player', [
      { id: 'me', health: 100, currentHp: 50, intelligence: 20, equippedSpells: [DRAIN] },
    ])
    const enemy = makeParty('enemy', [{ id: 'e0', health: 100, defence: 0 }])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    // Heal = 20 x 0.5 = 10 on the caster, exactly once.
    expect(healsOf(events)).toEqual(['me'])
    expect(events.find((e) => e.type === 'HealApplied')).toMatchObject({ amount: 10 })
  })

  it('AOE: once per member hit', () => {
    const aoeDrain: Spell = { ...DRAIN, id: 'aoe-drain', targetShape: 'aoe' }
    const player = makeParty('player', [
      {
        id: 'me',
        health: 100,
        currentHp: 10,
        intelligence: 20,
        equippedSpells: [aoeDrain],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'e0', health: 100, defence: 0 },
      { id: 'e1', health: 100, defence: 0 },
      { id: 'e2', health: 100, defence: 0 },
    ])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'aoe', gemSlot: 0 },
      makeState(player, enemy),
    )
    expect(healsOf(events)).toEqual(['me', 'me', 'me'])
  })
})

describe("ASSUMPTION 35: one landed target's effect list is atomic (no actor check between effects)", () => {
  // The target retaliates against whoever hits it with a lethal flat 99. The caster (HP 10) dies
  // from the retaliation to the spell's damage, BETWEEN the damage effect and the status effect.
  const RETALIATE = () =>
    eff({
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        flatAmount: 99,
        damageSource: 'attack',
      },
    })
  const MARK: StatusSpec = { statusId: 'weaken', duration: 2 }

  it('single-target: the status STILL lands on the living target; the caster is dead', () => {
    const spell = toSpell({
      id: 's',
      targetShape: 'single',
      spellPower: 1,
      appliesStatus: MARK,
    })
    const player = makeParty('player', [
      { id: 'me', health: 10, equippedSpells: [spell] },
    ])
    const enemy = makeParty('enemy', [
      { id: 'e0', health: 100, defence: 0, activeEffects: [RETALIATE()] },
    ])
    const { events, state } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    expect(findCreature(state, 'me').alive).toBe(false)
    const types = events.map((e) => e.type)
    expect(types.indexOf('CreatureDied')).toBeLessThan(types.indexOf('StatusApplied'))
    expect(events.filter((e) => e.type === 'StatusApplied')).toMatchObject([
      { targetId: enemy[0]!.id, statusId: 'weaken' },
    ])
  })

  it("AOE: that member's status still lands, but the NEXT member is never hit (site 4)", () => {
    const spell = toSpell({
      id: 'n',
      targetShape: 'aoe',
      spellPower: 0.3,
      appliesStatus: MARK,
    })
    const player = makeParty('player', [
      { id: 'me', health: 10, equippedSpells: [spell] },
    ])
    const enemy = makeParty('enemy', [
      { id: 'e0', health: 100, defence: 0, activeEffects: [RETALIATE()] },
      { id: 'e1', health: 100, defence: 0 },
    ])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'aoe', gemSlot: 0 },
      makeState(player, enemy),
    )
    expect(
      events.flatMap((e) => (e.type === 'StatusApplied' ? [String(e.targetId)] : [])),
    ).toEqual(['e0'])
    expect(
      events.flatMap((e) =>
        e.type === 'DamageDealt' && String(e.sourceId) === 'me'
          ? [String(e.targetId)]
          : [],
      ),
    ).toEqual(['e0'])
  })
})

describe('ASSUMPTION 36: magnitudes read the caster LIVE when each effect runs', () => {
  it("the caster's own on-cast trigger doubles its Intelligence before the hit, and the hit uses it", () => {
    // Caster Int 10. on-cast -> apply-stat-modifier self Intelligence x2 (fires in the pre-hit
    // hooks, before the list). Spell: spellPower 1.0, enemy defence 0, HP 100.
    // LIVE:     off = 20 x 1 = 20 -> core 20, chip 0.2 -> raw 20.2 -> final 20.
    // SNAPSHOT (pre-4.1-D): off = 10 -> core 10, chip 0.1 -> raw 10.1 -> final 10.
    const spell = toSpell({ id: 's', targetShape: 'single', spellPower: 1 })
    const player = makeParty('player', [
      {
        id: 'me',
        intelligence: 10,
        equippedSpells: [spell],
        activeEffects: [
          eff({
            category: 'triggered',
            hook: 'on-cast',
            response: {
              kind: 'apply-stat-modifier',
              target: { kind: 'self' },
              stat: 'intelligence',
              factor: 2,
            },
          }),
        ],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'e0', health: 100, defence: 0 }])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    expect(damages(events)).toEqual([20])
  })
})

describe('heal.offStat (plan review F2)', () => {
  it('is remap-aware: a cast->attack stat-remap heals by Attack, not Intelligence', () => {
    // Attack 40, Int 10, remap(cast <- attack). sp 0.5: remap-aware = floor(40 x 0.5) = 20;
    // raw Int would be 5.
    const spell = toSpell({
      id: 'mend',
      targetShape: 'single',
      targetSide: 'ally',
      spellPower: 0.5,
      payload: 'heal',
    })
    const player = makeParty('player', [
      {
        id: 'me',
        attack: 40,
        intelligence: 10,
        equippedSpells: [spell],
        activeEffects: [
          eff({ category: 'stat-remap', slot: 'cast', fromStat: 'attack' }),
        ],
      },
      { id: 'ally', health: 100, currentHp: 10 },
    ])
    const { events } = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: player[1]!.id },
      makeState(player, makeParty('enemy', [{ id: 'e0' }])),
    )
    expect(events.find((e) => e.type === 'HealApplied')).toMatchObject({ amount: 20 })
  })

  it('its three magnitude modes are mutually exclusive', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'e0' }])
    const run = (heal: Partial<Extract<EffectResponse, { kind: 'heal' }>>) =>
      executeResponse(
        { kind: 'heal', target: { kind: 'self' }, ...heal } as EffectResponse,
        'fixture',
        { self: player[0]!.id },
        makeState(player, enemy),
        createResolutionContext([], newCascade()),
      )
    for (const modes of [
      { amountPerStack: 1, scalingStat: 'health' as const },
      { amountPerStack: 1, offStat: 'cast' as const },
      { scalingStat: 'health' as const, offStat: 'cast' as const },
    ]) {
      expect(() => run(modes)).toThrow(
        /more than one of amountPerStack\/scalingStat\/offStat/,
      )
    }
    expect(() => run({ offStat: 'cast' })).not.toThrow()
  })
})

// ---- Validators ----

describe('validateSpellEffects', () => {
  const base = toSpell({ id: 's', targetShape: 'single', spellPower: 1 })
  const withEffects = (effects: EffectResponse[]): Spell => ({ ...base, effects })

  it('accepts every registered spell', () => {
    for (const spell of ALL_SPELLS)
      expect(() => validateSpellEffects(spell)).not.toThrow()
  })

  it('accepts cast-target and self targets and the remove-status verb', () => {
    expect(() =>
      validateSpellEffects(
        withEffects([
          {
            kind: 'deal-damage',
            target: { kind: 'cast-target' },
            offStat: 'cast',
            spellPower: 1,
          },
          {
            kind: 'heal',
            target: { kind: 'self' },
            scalingStat: 'health',
            spellPower: 0.1,
          },
          {
            kind: 'remove-status',
            target: { kind: 'cast-target' },
            filter: { statusId: 'web' },
          },
        ]),
      ),
    ).not.toThrow()
  })

  it.each<[string, EffectResponse]>([
    [
      'flat-mode deal-damage',
      { kind: 'deal-damage', target: { kind: 'cast-target' }, flatAmount: 5 },
    ],
    [
      'deal-damage with a magnitudeSource',
      {
        kind: 'deal-damage',
        target: { kind: 'cast-target' },
        offStat: 'cast',
        magnitudeSource: { kind: 'flat', value: 2 },
      },
    ],
    [
      'flat-mode heal',
      { kind: 'heal', target: { kind: 'cast-target' }, amountPerStack: 5 },
    ],
    ['a heal with no magnitude stat', { kind: 'heal', target: { kind: 'cast-target' } }],
    [
      'a verb a spell may not carry',
      { kind: 'revive', target: { kind: 'cast-target' }, pct: 0.5 },
    ],
    [
      'a target other than cast-target/self',
      {
        kind: 'deal-damage',
        target: { kind: 'all-enemies' },
        offStat: 'cast',
        spellPower: 1,
      },
    ],
  ])('rejects %s', (_label, effect) => {
    expect(() => validateSpellEffects(withEffects([effect]))).toThrow(
      /spell invariant violated/,
    )
  })

  it('cast-target is rejected in a trait response and in a status trigger', () => {
    const traitEffects: EffectDef[] = [
      {
        category: 'triggered',
        hook: 'on-attack',
        response: {
          kind: 'apply-status',
          target: { kind: 'cast-target' },
          status: { statusId: 'weaken' },
        },
      },
    ]
    expect(() => validateNoRandomSelectorInResponseTargets(traitEffects)).toThrow(
      /only valid inside a spell's effect list/,
    )
    const status: StatusDef = {
      category: 'condition-status',
      statusId: 'cast-target-test',
      cap: 1,
      polarity: 'debuff',
      defaultDuration: 1,
      triggers: [
        {
          hook: 'on-turn-end',
          response: {
            kind: 'apply-status',
            target: { kind: 'cast-target' },
            status: { statusId: 'weaken' },
          },
        },
      ],
    }
    expect(() => validateStatusNoRandomSelectorInResponseTargets(status)).toThrow(
      /only valid inside a spell's effect list/,
    )
  })
})

// ---- 4.1-D review item 1: a spell's damage is cast damage ----

describe("validateSpellEffects: a spell's damage and heal are cast-slot formula magnitudes", () => {
  const base = toSpell({ id: 's', targetShape: 'single', spellPower: 1 })
  const withEffects = (effects: EffectResponse[]): Spell => ({ ...base, effects })
  const cast = { kind: 'cast-target' } as const

  it('rejects a scalingStat deal-damage that leaves damageSource unset (it resolves to attack)', () => {
    expect(() =>
      validateSpellEffects(
        withEffects([
          { kind: 'deal-damage', target: cast, scalingStat: 'defence', spellPower: 1 },
        ]),
      ),
    ).toThrow(/damageSource 'cast'/)
  })

  it("rejects a deal-damage whose explicit damageSource is not 'cast'", () => {
    expect(() =>
      validateSpellEffects(
        withEffects([
          {
            kind: 'deal-damage',
            target: cast,
            offStat: 'cast',
            spellPower: 1,
            damageSource: 'attack',
          },
        ]),
      ),
    ).toThrow(/damageSource 'cast'/)
  })

  it("accepts a scalingStat deal-damage that says damageSource: 'cast'", () => {
    expect(() =>
      validateSpellEffects(
        withEffects([
          {
            kind: 'deal-damage',
            target: cast,
            scalingStat: 'defence',
            spellPower: 1,
            damageSource: 'cast',
          },
        ]),
      ),
    ).not.toThrow()
  })

  it.each(['deal-damage', 'heal'] as const)(
    "rejects an offStat other than 'cast' on %s",
    (kind) => {
      expect(() =>
        validateSpellEffects(
          withEffects([{ kind, target: cast, offStat: 'attack', spellPower: 1 }]),
        ),
      ).toThrow(/offStat 'cast'/)
    },
  )

  it.each(['deal-damage', 'heal'] as const)(
    'rejects %s setting both offStat and scalingStat (it used to throw mid-fight)',
    (kind) => {
      expect(() =>
        validateSpellEffects(
          withEffects([
            {
              kind,
              target: cast,
              offStat: 'cast',
              scalingStat: 'defence',
              spellPower: 1,
              ...(kind === 'deal-damage' ? { damageSource: 'cast' as const } : {}),
            },
          ]),
        ),
      ).toThrow(/both offStat and scalingStat/)
    },
  )
})

// ---- 4.1-D review item 2: one formula for every formula-mode magnitude ----

describe('heal scalingStat mode: stat x (spellPower x multiplier), for a trait too', () => {
  it('a trait heal scaled by a live count: 26, not the old (stat x sp) x count = 27', () => {
    // Fixture trait (not real content): heal self, scalingStat health, spellPower 0.15,
    // magnitudeSource count of dead-allies. Healer effective Health 60, wounded to 20 (missing 40,
    // so the heal is not clamped). 3 dead allies -> count 3.
    //   spellPower x count = 0.15 x 3 = 0.44999999999999996
    //   60 x 0.44999999999999996 = 26.999999999999996 -> floor 26   (this order)
    //   (60 x 0.15) x 3 = 9 x 3 = 27 -> 27                        (the pre-review trait order)
    const player = makeParty('player', [
      { id: 'me', health: 60, currentHp: 20 },
      { id: 'd1', alive: false },
      { id: 'd2', alive: false },
      { id: 'd3', alive: false },
    ])
    const events: CombatEvent[] = []
    executeResponse(
      {
        kind: 'heal',
        target: { kind: 'self' },
        scalingStat: 'health',
        spellPower: 0.15,
        magnitudeSource: { kind: 'count', of: 'dead-allies' },
      },
      'fixture-trait',
      { self: player[0]!.id },
      makeState(player, makeParty('enemy', [{ id: 'e0' }])),
      createResolutionContext(events, newCascade()),
    )
    expect(events).toMatchObject([{ type: 'HealApplied', amount: 26, remainingHp: 46 }])
  })
})

// ---- 4.1-D review item 3: no response acts on a dead creature, except revive ----

describe('the verb rule: no response acts on a corpse', () => {
  // Spell: damage the landed target, then a `self` effect. The target retaliates with a lethal
  // flat 99 on whoever hit it, so the caster (HP 10) is dead BEFORE the self effect runs (the list
  // is atomic, ASSUMPTION 35, so the effect is attempted).
  const RETALIATE = () =>
    eff({
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        flatAmount: 99,
        damageSource: 'attack',
      },
    })
  const selfEffectSpell = (effect: EffectResponse): Spell => ({
    id: 'self-after-damage',
    name: 'Self After Damage',
    affinity: 'vitality',
    unlockedAtBiome: 1,
    targetShape: 'single',
    targetSide: 'enemy',
    effects: [
      {
        kind: 'deal-damage',
        target: { kind: 'cast-target' },
        offStat: 'cast',
        spellPower: 1,
      },
      effect,
    ],
  })
  function castThenRetaliationKillsCaster(effect: EffectResponse) {
    const spell = selfEffectSpell(effect)
    const player = makeParty('player', [
      { id: 'me', health: 10, equippedSpells: [spell] },
    ])
    const enemy = makeParty('enemy', [
      { id: 'e0', health: 100, defence: 0, activeEffects: [RETALIATE()] },
    ])
    const out = runNew(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    // The caster really did die before its own self effect (else this test proves nothing).
    expect(findCreature(out.state, 'me').alive).toBe(false)
    expect(
      out.events.some((e) => e.type === 'CreatureDied' && String(e.creatureId) === 'me'),
    ).toBe(true)
    return out
  }

  it('apply-status, `self` in a spell: no StatusApplied for the dead caster', () => {
    const { events } = castThenRetaliationKillsCaster({
      kind: 'apply-status',
      target: { kind: 'self' },
      status: { statusId: 'weaken', duration: 2 },
    })
    expect(events.some((e) => e.type === 'StatusApplied')).toBe(false)
  })

  it('apply-stat-modifier, `self` in a spell: no StatModifierApplied for the dead caster', () => {
    const { events, state } = castThenRetaliationKillsCaster({
      kind: 'apply-stat-modifier',
      target: { kind: 'self' },
      stat: 'defence',
      factor: 0.5,
    })
    expect(events.some((e) => e.type === 'StatModifierApplied')).toBe(false)
    expect(getEffectiveStat(findCreature(state, 'me'), 'defence')).toBe(20)
  })

  // Trait sites: A kills B (HP 1) with an attack; A's `on-kill` fires with `triggering-source` =
  // the VICTIM B, already dead. B carries Weaken (applied before the attack).
  function killVictimThenTraitResponds(response: EffectResponse) {
    const attacker = makeParty('player', [
      {
        id: 'a',
        attack: 40,
        activeEffects: [eff({ category: 'triggered', hook: 'on-kill', response })],
      },
    ])
    const victim = makeParty('enemy', [{ id: 'b', health: 1, defence: 0 }])
    const state = makeState(attacker, victim)
    const prepared = applyStatus(
      attacker[0]!.id,
      victim[0]!.id,
      { statusId: 'weaken', duration: 3 },
      state,
      createResolutionContext([], newCascade()),
    )
    const before = findCreature(prepared, 'b').activeEffects
    expect(before.length).toBeGreaterThan(0)
    const out = runNew(
      findCreature(prepared, 'a'),
      { kind: 'attack', targetId: victim[0]!.id },
      prepared,
    )
    const corpse = findCreature(out.state, 'b')
    expect(corpse.alive).toBe(false)
    expect(out.events.some((e) => e.type === 'TriggerFired')).toBe(true) // the trigger did fire
    return { ...out, before, corpse }
  }

  it('remove-status, from a trait: nothing is removed from the dead triggering-source', () => {
    const { events, corpse, before } = killVictimThenTraitResponds({
      kind: 'remove-status',
      target: { kind: 'triggering-source' },
      filter: { statusId: 'weaken' },
    })
    expect(events.some((e) => e.type === 'StatusExpired')).toBe(false)
    expect(corpse.activeEffects).toEqual(before)
  })

  it('grant-action-state, from a trait: the dead triggering-source is not set defending', () => {
    const { corpse } = killVictimThenTraitResponds({
      kind: 'grant-action-state',
      target: { kind: 'triggering-source' },
      defending: true,
    })
    expect(corpse.defending).toBe(false)
  })

  it('apply-status, from a trait: nothing is applied to the dead triggering-source', () => {
    const { events, corpse, before } = killVictimThenTraitResponds({
      kind: 'apply-status',
      target: { kind: 'triggering-source' },
      status: { statusId: 'weaken', duration: 3 },
    })
    expect(events.some((e) => e.type === 'StatusApplied')).toBe(false)
    expect(corpse.activeEffects).toEqual(before)
  })
})
