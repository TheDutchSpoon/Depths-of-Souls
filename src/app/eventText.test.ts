import { describe, expect, test } from 'vitest'
import { createCreatureId } from '../engine/ids'
import type { CombatEvent } from '../engine/types'
import { describeEvent, groupIntoBeats } from './eventText'

const id = createCreatureId
const view = {
  label: (creatureId: string) => `<${creatureId}>`,
  spellName: (_casterId: string, gemSlot: number) => `Spell${gemSlot}`,
}

// One event per type with the line it prints: the 3.5 templates, creature ids shown as their
// labels and a cast shown as its spell's name. Typed by the union, so a new event type without a
// row is a compile error.
const lines: Record<CombatEvent['type'], [CombatEvent, string]> = {
  FightStarted: [{ type: 'FightStarted' }, 'Fight started'],
  RoundStarted: [{ type: 'RoundStarted', round: 2 }, '-- Round 2 --'],
  TurnStarted: [{ type: 'TurnStarted', creatureId: id('a') }, "<a>'s turn"],
  AttackDeclared: [
    { type: 'AttackDeclared', attackerId: id('a'), targetId: id('b') },
    '<a> attacks <b>',
  ],
  SpellCast: [
    {
      type: 'SpellCast',
      targetShape: 'single',
      casterId: id('a'),
      gemSlot: 2,
      targetId: id('b'),
    },
    '<a> casts Spell2 at <b>',
  ],
  Defended: [{ type: 'Defended', creatureId: id('a') }, '  <a> defends'],
  Provoked: [{ type: 'Provoked', creatureId: id('a') }, '  <a> provokes'],
  Waited: [{ type: 'Waited', creatureId: id('a') }, '  <a> waits'],
  ActionStateEnded: [
    { type: 'ActionStateEnded', creatureId: id('a'), defending: true, provoking: true },
    "  <a>'s defending, provoking ends",
  ],
  DamageDealt: [
    {
      type: 'DamageDealt',
      sourceId: id('a'),
      targetId: id('b'),
      rawDamage: 7.456,
      finalDamage: 7,
      affinityMultiplier: 1,
      wasChipOnly: true,
      remainingHp: 12,
      damageSource: 'attack',
    },
    '  <a> -> <b>: 7 damage (raw 7.46, chip only) -- 12 HP left',
  ],
  CreatureDied: [{ type: 'CreatureDied', creatureId: id('a') }, '  <a> died'],
  TurnEnded: [{ type: 'TurnEnded', creatureId: id('a') }, "<a>'s turn ends"],
  FightEnded: [{ type: 'FightEnded', result: 'win' }, 'Fight ended: win'],
  TriggerFired: [
    { type: 'TriggerFired', sourceId: id('a'), hook: 'on-round-end', effectId: 'thorns' },
    '  <a> triggers thorns (on-round-end)',
  ],
  ActionGranted: [
    { type: 'ActionGranted', sourceId: id('a'), actorId: id('b'), effectId: 'echo' },
    '  <a> grants <b> an action (echo)',
  ],
  StatusApplied: [
    { type: 'StatusApplied', targetId: id('a'), statusId: 'poison', duration: 3 },
    '  <a> gains poison (3 turns)',
  ],
  StatusExpired: [
    { type: 'StatusExpired', creatureId: id('a'), statusId: 'poison' },
    "  <a>'s poison expired",
  ],
  StatModifierApplied: [
    {
      type: 'StatModifierApplied',
      sourceId: id('a'),
      targetId: id('b'),
      stat: 'attack',
      factor: 1.5,
      effectiveBefore: 10,
      effectiveAfter: 15,
    },
    '  <b> attack: 10 -> 15',
  ],
  HpClamped: [
    {
      type: 'HpClamped',
      creatureId: id('a'),
      previousHp: 30,
      newHp: 20,
      effectiveMaxHealth: 20,
    },
    '  <a> HP clamped 30 -> 20 (max 20)',
  ],
  HealApplied: [
    {
      type: 'HealApplied',
      sourceId: id('a'),
      targetId: id('b'),
      amount: 4,
      remainingHp: 9,
    },
    '  <b> heals 4 -- 9 HP',
  ],
  CascadeTruncated: [
    { type: 'CascadeTruncated', creatureId: id('a'), effectId: 'loop', depth: 8 },
    '  cascade truncated at <a>/loop (depth 8)',
  ],
  TurnSkipped: [
    { type: 'TurnSkipped', creatureId: id('a'), effectId: 'stun' },
    "  <a>'s turn is skipped (stun)",
  ],
  Revived: [
    { type: 'Revived', sourceId: id('a'), targetId: id('b'), currentHp: 11 },
    '  <b> is revived at 11 HP',
  ],
}

describe('describeEvent', () => {
  test.each(Object.entries(lines))(
    '%s prints its line with labels',
    (_type, [event, line]) => {
      expect(describeEvent(event, view)).toBe(line)
    },
  )

  test('a one-turn status says "1 turn", a longer one "N turns"', () => {
    const applied = (duration: number): CombatEvent => ({
      type: 'StatusApplied',
      targetId: id('a'),
      statusId: 'stun',
      duration,
    })
    expect(describeEvent(applied(1), view)).toBe('  <a> gains stun (1 turn)')
    expect(describeEvent(applied(2), view)).toBe('  <a> gains stun (2 turns)')
  })

  test('an area cast prints the spell and every target label', () => {
    const event: CombatEvent = {
      type: 'SpellCast',
      targetShape: 'aoe',
      casterId: id('a'),
      gemSlot: 1,
      targetIds: [id('b'), id('c')],
    }
    expect(describeEvent(event, view)).toBe('<a> casts Spell1 at [<b>, <c>]')
  })

  test('a status tick and a self-inflicted hit print their own lines', () => {
    const base = {
      type: 'DamageDealt',
      rawDamage: 2,
      finalDamage: 2,
      affinityMultiplier: 1,
      wasChipOnly: false,
      remainingHp: 5,
    } as const
    expect(
      describeEvent(
        {
          ...base,
          sourceId: id('a'),
          targetId: id('b'),
          damageSource: 'dot',
          statusId: 'poison',
        },
        view,
      ),
    ).toBe('  <b> took 2 poison damage (dot) -- 5 HP left')
    expect(
      describeEvent(
        { ...base, sourceId: id('a'), targetId: id('a'), damageSource: 'cast' },
        view,
      ),
    ).toBe('  <a> collapses, taking 2 self-inflicted damage -- 5 HP left')
  })

  test('an event type outside the union throws', () => {
    expect(() => describeEvent({ type: 'Nope' } as unknown as CombatEvent, view)).toThrow(
      'Unhandled event type',
    )
  })
})

describe('groupIntoBeats', () => {
  const turn = (name: string): CombatEvent => ({
    type: 'TurnStarted',
    creatureId: id(name),
  })
  const trigger: CombatEvent = {
    type: 'TriggerFired',
    sourceId: id('a'),
    hook: 'on-round-end',
    effectId: 'thorns',
  }
  const wait = (name: string): CombatEvent => ({ type: 'Waited', creatureId: id(name) })
  const started: CombatEvent = { type: 'FightStarted' }

  test('an empty log has no beats', () => {
    expect(groupIntoBeats([])).toEqual([])
  })

  test('a log with no beat start is one beat', () => {
    expect(groupIntoBeats([started, wait('a')])).toEqual([[started, wait('a')]])
  })

  test('events before the first turn are a beat of their own', () => {
    expect(groupIntoBeats([started, turn('a'), wait('a')])).toEqual([
      [started],
      [turn('a'), wait('a')],
    ])
  })

  test('a trigger firing mid-turn starts a new beat', () => {
    expect(groupIntoBeats([turn('a'), wait('a'), trigger, wait('b')])).toEqual([
      [turn('a'), wait('a')],
      [trigger, wait('b')],
    ])
  })

  test('consecutive beat starts are one beat each', () => {
    expect(groupIntoBeats([turn('a'), turn('b'), trigger])).toEqual([
      [turn('a')],
      [turn('b')],
      [trigger],
    ])
  })
})
