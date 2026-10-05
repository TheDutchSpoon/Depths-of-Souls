// Phase 4.1-C2c (PR #73 review): "An action ends when its actor dies" (CONVENTIONS). The actor is
// re-checked at four sites in the executors; each test here kills the actor at exactly one of
// them and asserts nothing further comes from the action. The main case (attack, site 1) is the
// hand-derived golden `golden-actor-dies-attack`.

import { describe, expect, it } from 'vitest'
import { createResolutionContext, executeAction } from './actions'
import { newCascade } from './resolution'
import { createEffectInstanceId } from './effect-types'
import { makeParty } from './__fixtures__/creatures'
import { createRngState } from './rng'
import type { CombatEvent, CombatState, Creature, Spell } from './types'
import type { ActiveEffect } from './effect-types'

function makeState(playerParty: Creature[], enemyParty: Creature[]): CombatState {
  return {
    rng: createRngState(1),
    playerParty,
    enemyParty,
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    statuses: new Map(),
    effectInstanceCounter: 0,
    turnClock: 0,
  }
}

let counter = 0
function eff<T extends object>(def: T): T & { instanceId: never; sourceTraitId: string } {
  counter += 1
  return {
    ...def,
    instanceId: createEffectInstanceId('fx#' + counter),
    sourceTraitId: 'fx-fixture',
  } as never
}

/** on-damage-taken -> a lethal flat hit on whoever hit me (a retaliation). */
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
  }) as ActiveEffect

/** A permanent hook -> lethal flat hit on the bearer itself (kills the actor in its own pre-hit hooks). */
const SELF_HARM = (hook: 'on-attack' | 'on-cast') =>
  eff({
    category: 'triggered',
    hook,
    response: {
      kind: 'deal-damage',
      target: { kind: 'self' },
      flatAmount: 99,
      damageSource: 'attack',
    },
  }) as ActiveEffect

const extraInstance = (actionKind: 'attack' | 'cast') =>
  eff({ category: 'action-instance', actionKind, powerPercent: 30 }) as ActiveEffect

const BOLT: Spell = {
  id: 'bolt',
  name: 'Bolt',
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
const NOVA: Spell = {
  id: 'nova',
  name: 'Nova',
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

function count(events: CombatEvent[], type: CombatEvent['type']): number {
  return events.filter((e) => e.type === type).length
}

function damageTargets(events: CombatEvent[]): string[] {
  return events.flatMap((e) =>
    e.type === 'DamageDealt' && String(e.sourceId) === 'me' ? [String(e.targetId)] : [],
  )
}

function run(
  actor: Creature,
  action: Parameters<typeof executeAction>[1],
  state: CombatState,
): CombatEvent[] {
  const events: CombatEvent[] = []
  executeAction(actor, action, state, createResolutionContext(events, newCascade()))
  return events
}

describe('an action ends when its actor dies (CONVENTIONS, 4.1-C2c)', () => {
  it('site 1, single-target Cast: no second SpellCast after the retaliation kills the caster', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        health: 10,
        intelligence: 20,
        defence: 0,
        equippedSpells: [BOLT],
        activeEffects: [extraInstance('cast')],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'foe', health: 100, defence: 0, activeEffects: [RETALIATE()] },
    ])
    const events = run(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    expect(count(events, 'CreatureDied')).toBe(1)
    expect(count(events, 'SpellCast')).toBe(1)
  })

  it('site 1, AOE Cast: no second instance (SpellCast) after a member kills the caster', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        health: 10,
        intelligence: 20,
        defence: 0,
        equippedSpells: [NOVA],
        activeEffects: [extraInstance('cast')],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'm1', health: 100, defence: 0, activeEffects: [RETALIATE()] },
    ])
    const events = run(
      player[0]!,
      { kind: 'cast', targetShape: 'aoe', gemSlot: 0 },
      makeState(player, enemy),
    )
    expect(count(events, 'CreatureDied')).toBe(1)
    expect(count(events, 'SpellCast')).toBe(1)
  })

  it('site 2, Attack: killed during its own on-attack hook -> the hit never lands', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        health: 10,
        attack: 20,
        defence: 0,
        activeEffects: [SELF_HARM('on-attack')],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe', health: 100, defence: 0 }])
    const events = run(
      player[0]!,
      { kind: 'attack', targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    expect(count(events, 'AttackDeclared')).toBe(1) // already emitted, stays
    expect(count(events, 'CreatureDied')).toBe(1)
    expect(damageTargets(events)).toEqual(['me']) // only the self-inflicted hit
  })

  it('site 2, single-target Cast: killed during its own on-cast hook -> no payload', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        health: 10,
        intelligence: 20,
        defence: 0,
        equippedSpells: [BOLT],
        activeEffects: [SELF_HARM('on-cast')],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe', health: 100, defence: 0 }])
    const events = run(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    expect(count(events, 'SpellCast')).toBe(1)
    expect(damageTargets(events)).toEqual(['me'])
  })

  it("site 3: a splash target's retaliation kills the attacker -> no further Splashing hit", () => {
    // Main target T (middle) with living neighbours N1 (before) and N2 (after). Splash order is
    // [N1, N2]; N1 retaliates and kills the attacker, so N2 must not be hit.
    const player = makeParty('player', [
      {
        id: 'me',
        health: 10,
        attack: 20,
        defence: 0,
        activeEffects: [eff({ category: 'splashing' }) as ActiveEffect],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'n1', health: 100, defence: 0, activeEffects: [RETALIATE()] },
      { id: 't', health: 100, defence: 0 },
      { id: 'n2', health: 100, defence: 0 },
    ])
    const events = run(
      player[0]!,
      { kind: 'attack', targetId: enemy[1]!.id },
      makeState(player, enemy),
    )
    expect(damageTargets(events)).toEqual(['t', 'n1'])
  })

  it("site 4: an AOE member's retaliation kills the caster -> no further member is hit", () => {
    const player = makeParty('player', [
      {
        id: 'me',
        health: 10,
        intelligence: 20,
        defence: 0,
        equippedSpells: [NOVA],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'm1', health: 100, defence: 0, activeEffects: [RETALIATE()] },
      { id: 'm2', health: 100, defence: 0 },
    ])
    const events = run(
      player[0]!,
      { kind: 'cast', targetShape: 'aoe', gemSlot: 0 },
      makeState(player, enemy),
    )
    expect(damageTargets(events)).toEqual(['m1'])
  })
})
