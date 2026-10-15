import { describe, expect, test } from 'vitest'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { ALL_SPELLS } from '../data/spells'
import { createInstanceId } from '../state/ids'
import type { Instance } from '../state/rewards'
import { staticCreatureIdFor } from '../state/rewards'
import { createGameStore } from '../state/store'
import { creatureLine, creatureLineText, HUB_CONTEXT } from './creatureLine'
import { labelInstances, labelOf } from './instanceLabels'
import { startRun } from './startRun'

function instance(overrides: Partial<Instance> = {}): Instance {
  return {
    id: createInstanceId('inst-0'),
    source: { kind: 'creature', creatureId: 'brute-starter' },
    level: 1,
    xp: 0,
    scriptId: null,
    gems: [null, null, null],
    ...overrides,
  }
}

function spellName(id: string): string {
  const spell = ALL_SPELLS.find((candidate) => candidate.id === id)
  if (!spell) throw new Error(`test: no spell ${id}`)
  return spell.name
}

describe('creatureLine', () => {
  test('each spec starter and the Unicorn read name, level, xp, affinity, rarity, script, traits and gems', () => {
    // Template values read from the data files when the test was written.
    const expected = [
      ['sorcerer-starter', 'Glyphmoth Seer', 'Wit', 'caster', ['Arcane Surge']],
      ['brute-starter', 'Cragfang Mauler', 'Violence', 'striker', ['Double Strike']],
      [
        'shieldbarer-starter',
        'Stonehorn Warden',
        'Endurance',
        'warden',
        ['Rallying Cry'],
      ],
      ['unicorn', 'Unicorn Lightbearer', 'Vitality', 'striker', ["Guardian's Light"]],
    ] as const
    const store = createGameStore()
    startRun(store.getState(), 'sorcerer', '7')
    for (const specId of ['brute', 'shieldbarer']) store.getState().setSpec(specId)
    const state = store.getState()
    const labels = labelInstances(state.collection, HUB_CONTEXT.names)
    for (const [creatureId, name, affinity, script, traits] of expected) {
      const owned = [...state.collection.values()].find(
        (entry) => staticCreatureIdFor(entry) === creatureId,
      )!
      const line = creatureLine(owned, labelOf(labels, owned.id), HUB_CONTEXT)
      expect(line.label).toBe(`${name}, Lv ${owned.level}`)
      expect(line.affinity).toBe(affinity)
      expect(line.rarity).toBe('Rare')
      expect(line.script).toBe(script)
      expect(line.traits).toEqual(traits)
      expect(line.gems).toEqual(
        owned.gems.map((id) => (id === null ? 'empty' : spellName(id))),
      )
      expect(line.xp).toBe(`${owned.xp} / ${20 * owned.level ** 2}`)
    }
  })

  test('a summoned creature reads its template and its rolled gems by name', () => {
    const store = createGameStore()
    startRun(store.getState(), 'brute', '3')
    store.setState({ soulProgress: new Map([['brute-starter', 100]]) })
    const summoned = store.getState().summon('brute-starter')
    if (!summoned.ok) throw new Error('summon refused')
    const owned = store.getState().collection.get(summoned.instanceId)!
    expect(staticCreatureIdFor(owned)).toBe('brute-starter')
    const line = creatureLine(owned, 'label', HUB_CONTEXT)
    expect(line.xp).toBe('0 / 20')
    expect(line.gems).toHaveLength(owned.gems.length)
    expect(line.gems.filter((gem) => gem !== 'empty')).toEqual(
      owned.gems.filter((id) => id !== null).map((id) => spellName(id!)),
    )
  })

  test('the xp threshold follows the config it is given', () => {
    const owned = instance({ level: 3, xp: 4 })
    expect(creatureLine(owned, 'x', HUB_CONTEXT).xp).toBe('4 / 180')
    const flat = {
      ...HUB_CONTEXT,
      config: { ...DEFAULT_BALANCE_CONFIG, xpCurveCoefficient: 7, xpCurveExponent: 1 },
    }
    expect(creatureLine(owned, 'x', flat).xp).toBe('4 / 21')
  })

  test('a null gem prints empty and the gem count is the array length', () => {
    const arcane = spellName('arcane-bolt')
    const three = creatureLine(
      instance({ gems: ['arcane-bolt', null, 'arcane-bolt'] }),
      'x',
      HUB_CONTEXT,
    )
    expect(three.gems).toEqual([arcane, 'empty', arcane])
    const two = creatureLine(instance({ gems: [null, 'arcane-bolt'] }), 'x', HUB_CONTEXT)
    expect(two.gems).toEqual(['empty', arcane])
  })

  test('a scriptId set on the instance replaces the role script', () => {
    expect(creatureLine(instance({ scriptId: 'caster' }), 'x', HUB_CONTEXT).script).toBe(
      'caster',
    )
  })

  test('a miss throws rather than falling back to an id', () => {
    expect(() =>
      creatureLine(
        instance({ source: { kind: 'creature', creatureId: 'no-such' } }),
        'x',
        HUB_CONTEXT,
      ),
    ).toThrow('no-such')
    expect(() =>
      creatureLine(instance({ gems: ['no-such-spell'] }), 'x', HUB_CONTEXT),
    ).toThrow('no-such-spell')
    const missingTrait = { ...HUB_CONTEXT, traits: new Map<string, never>() }
    expect(() => creatureLine(instance(), 'x', missingTrait)).toThrow(
      'brute-starter-double-strike',
    )
    expect(() =>
      creatureLine(
        instance({
          source: { kind: 'fusion', identityParent: 'a', affinityParent: 'b' },
        }),
        'x',
        HUB_CONTEXT,
      ),
    ).toThrow()
  })
})

describe('creatureLineText', () => {
  test('joins the fields with " | " in order, "none" for no traits', () => {
    const line = {
      label: 'Snapjaw, Lv 2',
      xp: '3 / 80',
      affinity: 'Wit',
      rarity: 'Common',
      script: 'striker',
      traits: [],
      gems: ['Arcane Bolt', 'empty'],
    }
    expect(creatureLineText(line)).toBe(
      'Snapjaw, Lv 2 | XP 3 / 80 | Wit | Common | script striker | traits none | gems Arcane Bolt, empty',
    )
  })
})
