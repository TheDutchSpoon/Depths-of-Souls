import { describe, expect, test } from 'vitest'
import { materializeCreature } from '../engine/generation'
import type { SpeciesCreature } from '../engine/generation'
import { createCreatureId } from '../engine/ids'
import type { Trait } from '../engine/effect-types'
import type { Creature, Side } from '../engine/types'
import { createGameStore } from '../state/store'
import type { FightRecord } from '../state/store'
import { describeEvent } from './eventText'
import { runDescent } from './descendFlow'
import { buildFightView, labelCreatures, lineUpText } from './fightView'
import { DEMO_NAMES } from './names'
import { DEMO_REGISTRIES } from './registries'
import { SPEC_CHOICES, startRun } from './startRun'

const BASE = { health: 20, attack: 10, intelligence: 10, defence: 10, speed: 10 }
const species = (id: string, innateTraitIds: string[] = []): SpeciesCreature => ({
  id,
  name: id[0]!.toUpperCase() + id.slice(1),
  affinity: 'violence',
  baseStats: BASE,
  defaultScriptId: 'striker',
  innateTraitIds,
  rarity: 'common',
})
const make = (
  template: string,
  side: Side,
  slot: number,
  innateTraitIds: string[] = [],
): Creature =>
  materializeCreature(species(template, innateTraitIds), {
    level: 1,
    side,
    slot,
    speciesId: template,
  })
const names = new Map([
  ['snapjaw', 'Snapjaw'],
  ['hero', 'Hero'],
  ['mage', 'Mage'],
  ['tough', 'Tough'],
])

describe('labelCreatures', () => {
  test('a unique name prints bare', () => {
    const labels = labelCreatures(
      [make('hero', 'player', 0)],
      [make('snapjaw', 'enemy', 0)],
      names,
    )
    expect([...labels.values()]).toEqual(['Hero', 'Snapjaw'])
  })

  test('two of a name on one side carry side and 1-based slot on every occurrence', () => {
    const labels = labelCreatures(
      [make('hero', 'player', 0), make('mage', 'player', 1)],
      [make('snapjaw', 'enemy', 0), make('snapjaw', 'enemy', 1)],
      names,
    )
    expect([...labels.values()]).toEqual([
      'Hero',
      'Mage',
      'Snapjaw (foe 1)',
      'Snapjaw (foe 2)',
    ])
  })

  test('names are counted over both parties: one per side is already a repeat', () => {
    const labels = labelCreatures(
      [make('snapjaw', 'player', 0)],
      [make('snapjaw', 'enemy', 0)],
      names,
    )
    expect([...labels.values()]).toEqual(['Snapjaw (ally 1)', 'Snapjaw (foe 1)'])
  })

  test('the number is the creature’s slot, not its place in the array', () => {
    const labels = labelCreatures(
      [make('hero', 'player', 2), make('hero', 'player', 0)],
      [make('snapjaw', 'enemy', 0)],
      names,
    )
    expect(labels.get(createCreatureId('hero-player-2'))).toBe('Hero (ally 3)')
    expect(labels.get(createCreatureId('hero-player-0'))).toBe('Hero (ally 1)')
  })

  test('ids that are prefixes of each other resolve by exact match', () => {
    const near = { ...make('hero', 'player', 0), id: createCreatureId('x-1') }
    const far = { ...make('hero', 'player', 1), id: createCreatureId('x-10') }
    const labels = labelCreatures([near, far], [make('snapjaw', 'enemy', 0)], names)
    expect(labels.get(createCreatureId('x-1'))).toBe('Hero (ally 1)')
    expect(labels.get(createCreatureId('x-10'))).toBe('Hero (ally 2)')
  })

  test('a creature whose template has no name throws', () => {
    expect(() =>
      labelCreatures(
        [make('stranger', 'player', 0)],
        [make('snapjaw', 'enemy', 0)],
        names,
      ),
    ).toThrow('stranger')
  })
})

function inlineRecord(player: Creature[], enemy: Creature[]): FightRecord {
  return {
    events: [],
    result: 'win',
    xpBanked: 0,
    partyLevelsAfter: player.map(() => 1),
    seed: 1,
    playerParty: player,
    enemyParty: enemy,
    playerEffects: [],
  }
}

describe('buildFightView', () => {
  // A passive +50% Health trait: fight setup sets HP to the effective max (30), while the
  // record's own party still holds the base Health (20).
  const tough: Trait = {
    id: 'tough-trait',
    name: 'Tough',
    effects: [{ category: 'stat-modifier', stat: 'health', factor: 1.5 }],
  }
  const registries = { ...DEMO_REGISTRIES, traits: new Map([[tough.id, tough]]) }

  test('the line-up shows the set-up HP and level, not the record party’s', () => {
    const record = inlineRecord(
      [make('tough', 'player', 0, ['tough-trait'])],
      [make('snapjaw', 'enemy', 0)],
    )
    expect(record.playerParty[0]!.currentHp).toBe(20)
    const view = buildFightView(record, registries, names)
    expect(view.lineUp).toEqual([
      { side: 'player', label: 'Tough', level: 1, hp: 30 },
      { side: 'enemy', label: 'Snapjaw', level: 1, hp: 20 },
    ])
    expect(view.lineUp.map(lineUpText)).toEqual([
      'Tough: level 1, 30 HP',
      'Snapjaw: level 1, 20 HP',
    ])
  })

  test('an id in neither party, or a slot with no spell, throws', () => {
    const record = inlineRecord(
      [make('hero', 'player', 0)],
      [make('snapjaw', 'enemy', 0)],
    )
    const view = buildFightView(record, registries, names)
    expect(() => view.label(createCreatureId('ghost'))).toThrow('ghost')
    expect(() => view.spellName(createCreatureId('hero-player-0'), 0)).toThrow('no spell')
    expect(() => view.spellName(createCreatureId('ghost'), 0)).toThrow('ghost')
  })
})

describe('on a real descent', () => {
  test('the Sorcerer starter’s gem slot 0 is the innate Arcane Bolt that setup prepends', () => {
    const store = createGameStore()
    startRun(store.getState(), 'sorcerer', '12')
    const run = runDescent(store, 1)
    if (!run.ok) throw new Error('descent refused')
    const record = run.outcome.fightRecords[0]!
    const starter = record.playerParty.find(
      (c) => c.origin.templateId === 'sorcerer-starter',
    )!
    // The record's party holds the three regular gems only: its slot 0 is the setup's slot 1.
    const firstRegular = starter.equippedSpells[0]
    expect(firstRegular).not.toBeNull()
    const view = buildFightView(record, DEMO_REGISTRIES, DEMO_NAMES)
    expect(view.spellName(starter.id, 0)).toBe('Arcane Bolt')
    expect(view.spellName(starter.id, 1)).toBe(firstRegular!.name)
    expect(firstRegular!.name).not.toBe('Arcane Bolt')
    // Read from the record's party instead, slot 0 would name the first regular gem.
    for (const event of record.events) {
      if (
        event.type === 'SpellCast' &&
        event.casterId === starter.id &&
        event.gemSlot === 0
      ) {
        expect(describeEvent(event, view)).toContain('casts Arcane Bolt')
      }
    }
  })

  test.each(SPEC_CHOICES.map((spec) => spec.id))(
    '%s: no log line or line-up holds a creature id',
    (specId) => {
      const store = createGameStore()
      startRun(store.getState(), specId, '8')
      const floors = [1]
      let sawRaw = false
      let linesChecked = 0
      for (let i = 0; i < floors.length; i++) {
        const run = runDescent(store, floors[i]!)
        if (!run.ok) throw new Error('descent refused')
        if (run.outcome.cleared && floors.length < 2) floors.push(floors[i]! + 1)
        for (const record of run.outcome.fightRecords) {
          const ids = [...record.playerParty, ...record.enemyParty].map(
            (c) => c.id as string,
          )
          const view = buildFightView(record, DEMO_REGISTRIES, DEMO_NAMES)
          const output = [
            ...record.events.map((event) => describeEvent(event, view)),
            ...view.lineUp.map(lineUpText),
          ]
          for (const line of output) {
            for (const creatureId of ids) expect(line).not.toContain(creatureId)
          }
          linesChecked += output.length
          // Sensitive: the raw log does carry ids, so an id left in would show up above.
          const raw = JSON.stringify(record.events)
          if (ids.some((creatureId) => raw.includes(creatureId))) sawRaw = true
        }
      }
      expect(linesChecked).toBeGreaterThan(100)
      expect(sawRaw).toBe(true)
    },
  )
})
