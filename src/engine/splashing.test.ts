import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { makeParty } from './__fixtures__/creatures'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import type { CombatEvent } from './types'
import type { Trait } from './effect-types'

// Phase 4 Slice C (Proficient Warrior / Annihilate). Fixture-scoped traits only -- per the
// slice-sequencing rule, this new mechanism is never exercised against the real Phase 4
// roster (that's Slice I), just local test content.

function registry(...traits: Trait[]): ReadonlyMap<string, Trait> {
  return new Map(traits.map((t) => [t.id, t]))
}

const SPLASHING_TRAIT: Trait = {
  id: 'splashing-fixture',
  name: 'Splashing (fixture)',
  effects: [{ category: 'splashing' }],
}

const ANNIHILATE_TRAIT: Trait = {
  id: 'annihilate-fixture',
  name: 'Annihilate (fixture)',
  effects: [{ category: 'annihilate' }],
}

function damageDealtEvents(
  events: readonly CombatEvent[],
): Extract<CombatEvent, { type: 'DamageDealt' }>[] {
  return events.filter(
    (e): e is Extract<CombatEvent, { type: 'DamageDealt' }> => e.type === 'DamageDealt',
  )
}

describe('Splashing (Phase 4 Slice C)', () => {
  it('an Attack against the middle of a 3-enemy lineup also splashes onto both living neighbors, each with its own recomputed damage', () => {
    const player = makeParty('player', [
      {
        id: 'attacker',
        attack: 20,
        defence: 0,
        speed: 20,
        scriptId: 'always-attack',
        innateTraitIds: [SPLASHING_TRAIT.id],
      },
    ])
    const enemy = makeParty('enemy', [
      // createCombat always inits currentHp to effective max Health at fight-start, so a
      // lower BASE health (not a currentHp override) is what makes 'middle' the script's
      // lowest-hp-enemy choice.
      { id: 'left', health: 40, defence: 4, speed: 1, scriptId: 'always-wait' },
      { id: 'middle', health: 10, defence: 8, speed: 3, scriptId: 'always-wait' },
      { id: 'right', health: 40, defence: 2, speed: 1, scriptId: 'always-wait' },
    ])
    const state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      registry(SPLASHING_TRAIT),
    )
    const { events } = resolveTurn(state)

    // Attacker's effOffStat = effective Attack(20) x spellPower(1.0) = 20; affinity neutral
    // (both sides default 'vitality') = x1.0; no armor-pen/cross-stat/mods.
    //   middle (defence 8): core = max(20-8,0) = 12; chip = 0.01*20 = 0.2; raw = 12.2 -> floor 12.
    //   left   (defence 4): core = 16; raw = 16.2 -> floor 16.
    //   right  (defence 2): core = 18; raw = 18.2 -> floor 18.
    // Distinct per-target values prove each splash hit is its OWN recomputed formula against
    // that target's own Defence (ASSUMPTION 15), never a copy of the main hit's number.
    expect(events.filter((e) => e.type === 'AttackDeclared')).toHaveLength(1) // one instance, splash isn't a second instance
    const dealt = damageDealtEvents(events)
    expect(
      dealt.map((e) => ({ targetId: e.targetId, finalDamage: e.finalDamage })),
    ).toEqual([
      { targetId: 'middle', finalDamage: 12 }, // main hit, resolved first
      { targetId: 'left', finalDamage: 16 }, // splash, adjacent-before
      { targetId: 'right', finalDamage: 18 }, // splash, adjacent-after
    ])
    // Splash hits are plain dealDamage calls, not triggered responses -- no TriggerFired at all
    // in a fixture with no triggered traits.
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(false)
  })

  it('a lone living enemy takes only the main hit -- no living neighbor to splash onto', () => {
    const player = makeParty('player', [
      {
        id: 'attacker',
        attack: 20,
        speed: 20,
        scriptId: 'always-attack',
        innateTraitIds: [SPLASHING_TRAIT.id],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'solo', health: 40, speed: 1, scriptId: 'always-wait' },
    ])
    const state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      registry(SPLASHING_TRAIT),
    )
    const { events } = resolveTurn(state)

    expect(damageDealtEvents(events)).toHaveLength(1)
  })

  it('Annihilate upgrades Splashing to hit every OTHER living enemy, not just adjacent ones', () => {
    const player = makeParty('player', [
      {
        id: 'attacker',
        attack: 20,
        defence: 0,
        speed: 20,
        scriptId: 'always-attack',
        innateTraitIds: [SPLASHING_TRAIT.id, ANNIHILATE_TRAIT.id],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'a', health: 40, defence: 0, speed: 1, scriptId: 'always-wait' },
      // 'b' has the lowest BASE health, so it's the script's lowest-hp-enemy pick -- but it's
      // NOT adjacent to 'd'. Annihilate must still splash 'd' too.
      { id: 'b', health: 5, defence: 0, speed: 4, scriptId: 'always-wait' },
      { id: 'c', health: 40, defence: 0, speed: 1, scriptId: 'always-wait' },
      { id: 'd', health: 40, defence: 0, speed: 1, scriptId: 'always-wait' },
    ])
    const state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      registry(SPLASHING_TRAIT, ANNIHILATE_TRAIT),
    )
    const { events } = resolveTurn(state)

    const dealt = damageDealtEvents(events)
    expect(dealt.map((e) => e.targetId).sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})
