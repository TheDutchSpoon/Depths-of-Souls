import { describe, expect, test } from 'vitest'
import { materializeCreature } from '../engine/generation'
import type { SpeciesCreature } from '../engine/generation'
import type { CombatEvent, Creature, FightResult, Side } from '../engine/types'
import type { FightRecord } from '../state/store'
import { fightHeader, fightRows } from './fightList'

const BASE = { health: 20, attack: 10, intelligence: 10, defence: 10, speed: 10 }
const species = (id: string): SpeciesCreature => ({
  id,
  name: id.toUpperCase(),
  affinity: 'violence',
  baseStats: BASE,
  defaultScriptId: 'striker',
  innateTraitIds: [],
  rarity: 'common',
})
const names = new Map([
  ['hero', 'Hero'],
  ['mage', 'Mage'],
  ['rat', 'Rat'],
])
const make = (template: string, side: Side, slot: number, level = 1): Creature =>
  materializeCreature(species(template), { level, side, slot, speciesId: template })

const playerParty = [
  make('hero', 'player', 0),
  make('hero', 'player', 1),
  make('mage', 'player', 2, 3),
]
const enemyParty = [make('rat', 'enemy', 0), make('rat', 'enemy', 1)]

const died = (creature: Creature): CombatEvent => ({
  type: 'CreatureDied',
  creatureId: creature.id,
})
const round = (n: number): CombatEvent => ({ type: 'RoundStarted', round: n })

function record(overrides: Partial<FightRecord>): FightRecord {
  return {
    events: [],
    result: 'win',
    xpBanked: 0,
    partyLevelsAfter: [1, 1, 3],
    seed: 1,
    playerParty,
    enemyParty,
    playerEffects: [],
    ...overrides,
  }
}

// Three rounds; both rats die and one hero dies (kills count the enemy side only); the record
// banks 7 XP (a figure kills alone would not give); the first hero rises 1 -> 2.
const first = record({
  events: [
    round(1),
    died(enemyParty[0]!),
    round(2),
    died(playerParty[1]!),
    round(3),
    died(enemyParty[1]!),
  ],
  xpBanked: 7,
  partyLevelsAfter: [2, 1, 3],
})
const second = record({ result: 'loss' as FightResult, events: [round(1)], xpBanked: 0 })

describe('fightRows', () => {
  test('number, result, rounds, kills, XP and level-ups from the record', () => {
    expect(fightRows([first, second], names)).toEqual([
      {
        number: 1,
        result: 'win',
        rounds: 3,
        kills: 2,
        xp: 7,
        levelUps: ['Hero (ally 1) 1 → 2'],
      },
      { number: 2, result: 'loss', rounds: 1, kills: 0, xp: 0, levelUps: [] },
    ])
  })

  test('a creature id that is a prefix of an enemy id is not an enemy kill', () => {
    const prefixed = record({
      events: [
        { type: 'CreatureDied', creatureId: `${enemyParty[0]!.id}0` as Creature['id'] },
      ],
    })
    expect(fightRows([prefixed], names)[0]!.kills).toBe(0)
  })
})

describe('labels span both parties', () => {
  const player = [make('rat', 'player', 0)]
  const enemy = [make('rat', 'enemy', 0)]
  const shared = record({ playerParty: player, enemyParty: enemy, partyLevelsAfter: [2] })

  test('a level-up names a creature whose template the other party shares', () => {
    expect(fightRows([shared], names)[0]!.levelUps).toEqual(['Rat (ally 1) 1 → 2'])
  })

  test('the levels going in name it the same way', () => {
    expect(fightHeader(shared, 0, 1, names).levelsIn).toEqual(['Rat (ally 1): level 1'])
  })
})

describe('fightHeader', () => {
  test('reads Fight n / N with N the floor’s fight count, not the records fought', () => {
    expect(fightHeader(second, 1, 5, names).title).toBe('Fight 2 / 5')
  })

  test('the levels going in come from the record’s party, not the levels after', () => {
    expect(fightHeader(first, 0, 12, names).levelsIn).toEqual([
      'Hero (ally 1): level 1',
      'Hero (ally 2): level 1',
      'Mage: level 3',
    ])
  })

  test('its row is the fight list’s row for that fight', () => {
    const rows = fightRows([first, second], names)
    expect(fightHeader(first, 0, 12, names).row).toEqual(rows[0])
    expect(fightHeader(second, 1, 12, names).row).toEqual(rows[1])
  })
})
