import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight, resolveTurn } from './combat'
import { makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import { ROUND_CAP } from './config'
import type { AttackDeclaredEvent, CombatState, Spell } from './types'
import type { Script } from './scripting-types'

const EMBER_LANCE: Spell = {
  id: 'ember-lance',
  name: 'Ember Lance',
  targetShape: 'single',
  spellPower: 0.5,
}
const CINDER_NOVA: Spell = {
  id: 'cinder-nova',
  name: 'Cinder Nova',
  targetShape: 'aoe',
  spellPower: 0.3,
}

function isAttackDeclared(event: { type: string }): event is AttackDeclaredEvent {
  return event.type === 'AttackDeclared'
}

describe('createCombat', () => {
  it('throws when the player party is empty', () => {
    const enemy = makeParty('enemy', [{ id: 'goblin' }])
    expect(() => createCombat([], enemy, 1)).toThrow()
  })

  it('throws when the enemy party is empty', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    expect(() => createCombat(player, [], 1)).toThrow()
  })
})

describe('resolveTurn / resolveFight — sanity trace', () => {
  it('produces a plausible 1v1 opening sequence and eventually decides a result', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 20, attack: 15, defence: 5, health: 30 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblin', speed: 10, attack: 5, defence: 5, health: 30 },
    ])

    const { events, state } = resolveFight(createCombat(player, enemy, 1))

    expect(events[0]).toEqual({ type: 'FightStarted' })
    expect(events[1]).toEqual({ type: 'RoundStarted', round: 1 })
    expect(events[2]).toEqual({ type: 'TurnStarted', creatureId: 'hero' })
    expect(events[3]?.type).toBe('AttackDeclared')
    expect(state.result).not.toBeNull()
  })
})

describe('determinism', () => {
  it('produces identical events and result for the same parties and seed', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 20, attack: 12, defence: 8, health: 40 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblin', speed: 10, attack: 9, defence: 6, health: 35 },
    ])

    const run1 = resolveFight(createCombat(player, enemy, 777))
    const run2 = resolveFight(createCombat(player, enemy, 777))

    expect(run1.events).toEqual(run2.events)
    expect(run1.state.result).toBe(run2.state.result)
  })
})

describe('death-mid-round skip', () => {
  it('emits an empty TurnStarted/TurnEnded bracket for a creature that died earlier in the same round', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 30, attack: 20, defence: 10, health: 50 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblinA', speed: 20, attack: 5, defence: 0, health: 5 },
      { id: 'goblinB', speed: 10, attack: 5, defence: 0, health: 30 },
    ])

    const { events } = resolveFight(createCombat(player, enemy, 1))

    const diedIndex = events.findIndex(
      (e) => e.type === 'CreatureDied' && e.creatureId === 'goblinA',
    )
    expect(diedIndex).toBeGreaterThan(-1)

    const skippedTurnStartIndex = events.findIndex(
      (e, i) => i > diedIndex && e.type === 'TurnStarted' && e.creatureId === 'goblinA',
    )
    expect(skippedTurnStartIndex).toBeGreaterThan(-1)
    expect(events[skippedTurnStartIndex + 1]).toEqual({
      type: 'TurnEnded',
      creatureId: 'goblinA',
    })
  })
})

describe('round cap', () => {
  it('ends the fight as a draw exactly at the cap, without starting a new round', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 10, attack: 5, defence: 100, health: 1000 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'golem', speed: 5, attack: 5, defence: 100, health: 1000 },
    ])

    const atCap: CombatState = {
      rng: createSeededRng(1),
      playerParty: player,
      enemyParty: enemy,
      turnQueue: [],
      turnCursor: 0,
      round: ROUND_CAP,
      result: null,
      scripts: new Map(),
    }

    const { state, events } = resolveTurn(atCap)

    expect(state.result).toBe('draw')
    // No RoundStarted for ROUND_CAP + 1, and no turn processing -- the gate fires before
    // a new round (and its actions) can begin.
    expect(events).toEqual([{ type: 'FightEnded', result: 'draw' }])
  })
})

describe('win/loss', () => {
  it('resolves to a loss when the enemy wipes the player', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 10, attack: 1, defence: 100, health: 3 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'ogre', speed: 20, attack: 50, defence: 0, health: 100 },
    ])

    const { state } = resolveFight(createCombat(player, enemy, 1))
    expect(state.result).toBe('loss')
  })
})

describe('event ordering around a kill', () => {
  it('emits CreatureDied immediately after the killing DamageDealt, and closes the turn bracket before the fight result', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 20, attack: 50, defence: 0, health: 30 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblin', speed: 10, attack: 1, defence: 0, health: 5 },
    ])

    const { events } = resolveTurn(createCombat(player, enemy, 1))

    const damageIndex = events.findIndex((e) => e.type === 'DamageDealt')
    expect(events[damageIndex + 1]).toEqual({
      type: 'CreatureDied',
      creatureId: 'goblin',
    })

    const turnEndedIndex = events.findIndex((e) => e.type === 'TurnEnded')
    const fightEndedIndex = events.findIndex((e) => e.type === 'FightEnded')
    expect(turnEndedIndex).toBeGreaterThan(-1)
    expect(fightEndedIndex).toBeGreaterThan(-1)
    expect(turnEndedIndex).toBeLessThan(fightEndedIndex)
  })
})

describe('default targeting', () => {
  it('re-targets the next living slot once the current default target dies', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 30, attack: 50, defence: 0, health: 50 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblinA', speed: 5, attack: 1, defence: 0, health: 5 },
      { id: 'goblinB', speed: 4, attack: 1, defence: 0, health: 40 },
    ])

    const { events } = resolveFight(createCombat(player, enemy, 1))

    const heroAttacks = events
      .filter(isAttackDeclared)
      .filter((e) => e.attackerId === 'hero')
    expect(heroAttacks).toHaveLength(2)
    expect(heroAttacks[0]?.targetId).toBe('goblinA')
    expect(heroAttacks[1]?.targetId).toBe('goblinB')
  })
})

describe('Defend', () => {
  it("reduces damage taken while active, then expires on the defender's own next turn", () => {
    // Enemy defends only on round 1 (round-number <= 1), then attacks every round after.
    // Enemy acts before hero each round (higher speed), so hero's attack always lands
    // after the enemy's own turn has already decided this round's defending status.
    const defendThenAttack: Script = {
      id: 'defend-then-attack',
      rules: [
        {
          condition: { kind: 'round-number', comparator: '<=', round: 1 },
          action: { kind: 'defend' },
        },
        {
          condition: { kind: 'always' },
          action: { kind: 'attack' },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const scripts = new Map([[defendThenAttack.id, defendThenAttack]])

    const player = makeParty('player', [
      { id: 'hero', speed: 10, attack: 20, defence: 50, health: 100 },
    ])
    const enemy = makeParty('enemy', [
      {
        id: 'defender',
        speed: 20,
        attack: 5,
        defence: 10,
        health: 100,
        scriptId: 'defend-then-attack',
      },
    ])

    const { events } = resolveFight(createCombat(player, enemy, 1, scripts))

    const heroHits = events.filter(
      (e): e is Extract<typeof e, { type: 'DamageDealt' }> =>
        e.type === 'DamageDealt' && e.sourceId === 'hero',
    )

    // Round 1 (defending): defence 10*1.5=15, core=max(20-15,0)=5, chip=0.01*20=0.2,
    // raw=(5+0.2)*0.65=3.38 -> final 3.
    expect(heroHits[0]?.finalDamage).toBe(3)
    // Round 2+ (defend expired on the defender's own round-2 turn, before it acts):
    // defence 10, core=max(20-10,0)=10, chip=0.2, raw=10.2 -> final 10.
    expect(heroHits[1]?.finalDamage).toBe(10)
  })
})

describe('Provoke', () => {
  it('redirects a single-target attack even against a selector that would have picked someone else', () => {
    const attackLowest: Script = {
      id: 'attack-lowest',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'attack' },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const scripts = new Map([[attackLowest.id, attackLowest]])

    const player = makeParty('player', [
      {
        id: 'hero',
        speed: 20,
        attack: 10,
        defence: 0,
        health: 30,
        scriptId: 'attack-lowest',
      },
    ])
    const enemy = makeParty('enemy', [
      // Higher HP, but the sole provoker -- must be the redirect target.
      {
        id: 'provoker',
        speed: 5,
        defence: 0,
        health: 50,
        currentHp: 50,
        provoking: true,
      },
      // Lower HP -- what lowest-hp-enemy would naturally pick absent Provoke.
      { id: 'weakling', speed: 1, defence: 0, health: 5, currentHp: 5 },
    ])

    const { events } = resolveTurn(createCombat(player, enemy, 1, scripts))

    const attack = events.find(isAttackDeclared)
    expect(attack?.targetId).toBe('provoker')
  })
})

describe('Cast', () => {
  it('single-target cast emits SpellCast and a correctly spellPower-scaled DamageDealt', () => {
    const castLowest: Script = {
      id: 'cast-lowest',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const scripts = new Map([[castLowest.id, castLowest]])

    const player = makeParty('player', [
      {
        id: 'caster',
        speed: 20,
        intelligence: 40,
        health: 30,
        scriptId: 'cast-lowest',
        equippedSpells: [EMBER_LANCE],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'target', defence: 10, health: 30 }])

    const { events } = resolveTurn(createCombat(player, enemy, 1, scripts))

    const cast = events.find((e) => e.type === 'SpellCast')
    expect(cast).toEqual({
      type: 'SpellCast',
      targetShape: 'single',
      casterId: 'caster',
      gemSlot: 0,
      targetId: 'target',
    })

    // offStat = 40 * 0.5 = 20; core = max(20-10,0) = 10; chip = 0.01*20 = 0.2;
    // raw = 10.2 -> final 10 (clearly above the chip-only floor, proving real scaling).
    const damage = events.find((e) => e.type === 'DamageDealt')
    expect(damage).toMatchObject({
      sourceId: 'caster',
      targetId: 'target',
      finalDamage: 10,
    })
  })

  it('never emits SpellCast when the referenced gem slot is empty, and falls through to Attack', () => {
    const castThenAttack: Script = {
      id: 'cast-then-attack',
      rules: [
        { condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } },
        {
          condition: { kind: 'always' },
          action: { kind: 'attack' },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const scripts = new Map([[castThenAttack.id, castThenAttack]])

    const player = makeParty('player', [
      {
        id: 'caster',
        speed: 20,
        health: 30,
        scriptId: 'cast-then-attack',
        equippedSpells: [null],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])

    const { events } = resolveTurn(createCombat(player, enemy, 1, scripts))

    expect(events.find((e) => e.type === 'SpellCast')).toBeUndefined()
    expect(events.find(isAttackDeclared)?.targetId).toBe('foe')
  })

  it('AOE cast emits one SpellCast then N DamageDealt/CreatureDied, with win/loss checked only after all N', () => {
    const castAoe: Script = {
      id: 'cast-aoe',
      rules: [{ condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } }],
    }
    const scripts = new Map([[castAoe.id, castAoe]])

    const player = makeParty('player', [
      {
        id: 'caster',
        speed: 100,
        intelligence: 20,
        health: 30,
        scriptId: 'cast-aoe',
        equippedSpells: [CINDER_NOVA],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'e1', speed: 2, defence: 0, health: 1, currentHp: 1 },
      { id: 'e2', speed: 1, defence: 0, health: 1, currentHp: 1 },
    ])

    const { events } = resolveTurn(createCombat(player, enemy, 1, scripts))

    const spellCastIndex = events.findIndex((e) => e.type === 'SpellCast')
    expect(events[spellCastIndex]).toEqual({
      type: 'SpellCast',
      targetShape: 'aoe',
      casterId: 'caster',
      gemSlot: 0,
      targetIds: ['e1', 'e2'],
    })

    // Both enemies have 1 HP and offStat = 20*0.3 = 6, far more than enough to kill both --
    // one DamageDealt/CreatureDied pair per target, in frozen slot order.
    expect(events[spellCastIndex + 1]).toMatchObject({
      type: 'DamageDealt',
      targetId: 'e1',
    })
    expect(events[spellCastIndex + 2]).toEqual({ type: 'CreatureDied', creatureId: 'e1' })
    expect(events[spellCastIndex + 3]).toMatchObject({
      type: 'DamageDealt',
      targetId: 'e2',
    })
    expect(events[spellCastIndex + 4]).toEqual({ type: 'CreatureDied', creatureId: 'e2' })

    // The win check happens only after the whole AOE (and the caster's own TurnEnded) --
    // never mid-loop between the two kills.
    const turnEndedIndex = events.findIndex((e) => e.type === 'TurnEnded')
    const fightEndedIndex = events.findIndex((e) => e.type === 'FightEnded')
    expect(turnEndedIndex).toBeGreaterThan(spellCastIndex + 4)
    expect(fightEndedIndex).toBeGreaterThan(turnEndedIndex)
    expect(events[fightEndedIndex]).toEqual({ type: 'FightEnded', result: 'win' })
  })
})

describe('Wait', () => {
  it('emits Waited with zero consequence events and no state change', () => {
    const alwaysWait: Script = {
      id: 'always-wait-test',
      rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
    }
    const scripts = new Map([[alwaysWait.id, alwaysWait]])

    const player = makeParty('player', [
      {
        id: 'waiter',
        speed: 20,
        health: 20,
        currentHp: 20,
        scriptId: 'always-wait-test',
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe', speed: 1 }])

    const { events } = resolveTurn(createCombat(player, enemy, 1, scripts))

    expect(events).toContainEqual({ type: 'Waited', creatureId: 'waiter' })
    expect(
      events.some((e) => e.type === 'DamageDealt' || e.type === 'AttackDeclared'),
    ).toBe(false)
  })
})
