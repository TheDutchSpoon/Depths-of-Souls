import { describe, expect, it } from 'vitest'
import {
  CASTER_SCRIPT,
  GUARDIAN_SCRIPT,
  OPENER_SCRIPT,
  ROLE_SCRIPTS,
  STOCK_SCRIPTS_BY_ID,
  STRIKER_SCRIPT,
  SUPPORT_SCRIPT,
  TAUNTER_SCRIPT,
  WARDEN_SCRIPT,
} from './scripts'
import { EMBER_LANCE, REGROWTH } from './spells'
import { decideAction } from '../engine/interpreter'
import { createCombat, resolveFight } from '../engine/combat'
import { materializeCreature } from '../engine/generation'
import {
  ALWAYS_ATTACK_SCRIPT,
  ALWAYS_PROVOKE_SCRIPT,
  FIXTURE_SCRIPTS_BY_ID,
} from '../engine/__fixtures__/scripts'
import { STATUS_REGISTRY } from './statuses'
import { TRAIT_REGISTRY } from './traits'
import {
  BRUTE_STARTER,
  BRUTE_STARTER_SPECIES_ID,
  SHIELDBARER_STARTER,
  SHIELDBARER_STARTER_SPECIES_ID,
} from './species/starters'
import { SNAPJAW_JAWS, SNAPJAW_LURE, SNAPJAWS_SPECIES_ID } from './species/overgrowth'
import { makeParty } from '../engine/__fixtures__/creatures'
import { createRngState } from '../engine/rng'
import { createEffectInstanceId, type ActiveEffect } from '../engine/effect-types'
import type { CombatState, Creature } from '../engine/types'
import type { Intent, Script } from '../engine/scripting-types'

// Phase 4.1-G1 (D4; CONVENTIONS "Role scripts"): the seven role scripts, rule by rule. Every role
// ends in the same fallback, so each fallback rule has its own test below, in a state where every
// rule above it is false or illegal, and each fails with that rule removed (the report's mutation
// table shows it: a role without its last rule waits where it should cast).

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

const ATTACK_LOWEST: Intent = {
  action: { kind: 'attack' },
  targeting: { kind: 'lowest-hp-enemy' },
}
const ATTACK_RANDOM: Intent = {
  action: { kind: 'attack' },
  targeting: { kind: 'random-enemy' },
}
const CAST_RANDOM: Intent = { action: { kind: 'cast', gemSlot: 'random' } }
const CAST_RANDOM_ALLY: Intent = {
  action: { kind: 'cast', gemSlot: 'random', gemSide: 'ally' },
}

/** A bare action-lock effect: Pacified is an `attack` lock, Silenced a `cast` lock. */
function lock(scope: 'attack' | 'cast'): ActiveEffect {
  return {
    category: 'action-lock',
    scope,
    instanceId: createEffectInstanceId(`role-test#${scope}`),
    sourceTraitId: `role-test-${scope}`,
  }
}

/** Health 20 everywhere, so `currentHp` 14 is 70% and 9 is 45%. */
const WOUNDED_70 = 14
const WOUNDED_45 = 9

function decide(
  script: Script,
  me: Parameters<typeof makeParty>[1][number],
  enemies: Parameters<typeof makeParty>[1],
  allies: Parameters<typeof makeParty>[1] = [],
  round = 1,
): Intent {
  const player: Creature[] = makeParty('player', [{ id: 'me', ...me }, ...allies])
  const enemy = makeParty('enemy', enemies)
  const state = makeState({ playerParty: player, enemyParty: enemy, round })
  return decideAction(player[0]!, script, state)
}

describe('the role registry', () => {
  it('ships exactly the seven role scripts and no always-* script', () => {
    expect(ROLE_SCRIPTS.map((s) => s.id)).toEqual([
      'striker',
      'guardian',
      'warden',
      'caster',
      'support',
      'opener',
      'taunter',
    ])
    expect([...STOCK_SCRIPTS_BY_ID.keys()].sort()).toEqual(
      ['caster', 'guardian', 'opener', 'striker', 'support', 'taunter', 'warden'].sort(),
    )
    for (const id of STOCK_SCRIPTS_BY_ID.keys())
      expect(id.startsWith('always-')).toBe(false)
  })
})

describe('striker', () => {
  it('rule 1: any enemy below 80% HP -> Attack the lowest-HP enemy', () => {
    expect(
      decide(STRIKER_SCRIPT, {}, [{ id: 'a' }, { id: 'b', currentHp: WOUNDED_70 }]),
    ).toEqual(ATTACK_LOWEST)
  })

  it('rule 2: every enemy at or above 80% -> Attack a random enemy', () => {
    expect(
      decide(STRIKER_SCRIPT, {}, [{ id: 'a' }, { id: 'b', currentHp: 16 }]), // 16/20 = 80%, not below
    ).toEqual(ATTACK_RANDOM)
  })

  it('rule 3 (the fallback): Pacified, it casts a random gem instead of waiting', () => {
    expect(
      decide(
        STRIKER_SCRIPT,
        { equippedSpells: [EMBER_LANCE], activeEffects: [lock('attack')] },
        [{ id: 'a' }],
      ),
    ).toEqual(CAST_RANDOM)
  })
})

describe('guardian', () => {
  it('rule 1: self HP below 50% -> Defend', () => {
    expect(decide(GUARDIAN_SCRIPT, { currentHp: WOUNDED_45 }, [{ id: 'a' }])).toEqual({
      action: { kind: 'defend' },
    })
  })

  it('rule 2: otherwise Attack the lowest-HP enemy', () => {
    expect(decide(GUARDIAN_SCRIPT, { currentHp: 10 }, [{ id: 'a' }])).toEqual(
      ATTACK_LOWEST,
    ) // exactly 50%
  })

  it('rule 3 (the fallback): Pacified, it casts a random gem', () => {
    expect(
      decide(
        GUARDIAN_SCRIPT,
        { equippedSpells: [EMBER_LANCE], activeEffects: [lock('attack')] },
        [{ id: 'a' }],
      ),
    ).toEqual(CAST_RANDOM)
  })
})

describe('warden', () => {
  it('rule 1: the lowest ally HP below 50% -> Provoke', () => {
    expect(
      decide(
        WARDEN_SCRIPT,
        {},
        [{ id: 'a' }],
        [{ id: 'hurt-ally', currentHp: WOUNDED_45 }],
      ),
    ).toEqual({ action: { kind: 'provoke' } })
  })

  it('rule 2: otherwise Attack the lowest-HP enemy', () => {
    expect(
      decide(WARDEN_SCRIPT, {}, [{ id: 'a' }], [{ id: 'ally', currentHp: WOUNDED_70 }]),
    ).toEqual(ATTACK_LOWEST)
  })

  it('rule 3 (the fallback): Pacified, it casts a random gem', () => {
    expect(
      decide(
        WARDEN_SCRIPT,
        { equippedSpells: [EMBER_LANCE], activeEffects: [lock('attack')] },
        [{ id: 'a' }],
      ),
    ).toEqual(CAST_RANDOM)
  })
})

describe('caster', () => {
  it('rule 1: casts a random gem every turn it can', () => {
    expect(
      decide(CASTER_SCRIPT, { equippedSpells: [EMBER_LANCE] }, [{ id: 'a' }]),
    ).toEqual(CAST_RANDOM)
  })

  it('rule 2 (the fallback): Silenced, or with nothing castable, it Attacks the lowest-HP enemy', () => {
    expect(
      decide(
        CASTER_SCRIPT,
        { equippedSpells: [EMBER_LANCE], activeEffects: [lock('cast')] },
        [{ id: 'a' }],
      ),
    ).toEqual(ATTACK_LOWEST)
    expect(decide(CASTER_SCRIPT, {}, [{ id: 'a' }])).toEqual(ATTACK_LOWEST)
  })
})

describe('support', () => {
  const wounded = [{ id: 'hurt-ally', currentHp: WOUNDED_45 }]

  it('rule 1: the lowest ally HP below 50% -> cast a random ALLY-SIDE gem', () => {
    expect(
      decide(
        SUPPORT_SCRIPT,
        { equippedSpells: [EMBER_LANCE, REGROWTH] },
        [{ id: 'a' }],
        wounded,
      ),
    ).toEqual(CAST_RANDOM_ALLY)
  })

  it('rule 1 is illegal with no ally-side gem, and falls through to Attack', () => {
    expect(
      decide(SUPPORT_SCRIPT, { equippedSpells: [EMBER_LANCE] }, [{ id: 'a' }], wounded),
    ).toEqual(ATTACK_LOWEST)
  })

  it('rule 2: no ally below 50% -> Attack the lowest-HP enemy', () => {
    expect(decide(SUPPORT_SCRIPT, { equippedSpells: [REGROWTH] }, [{ id: 'a' }])).toEqual(
      ATTACK_LOWEST,
    )
  })

  it('rule 3 (the fallback): Pacified, with no ally below 50%, it casts a random gem (either side)', () => {
    expect(
      decide(
        SUPPORT_SCRIPT,
        { equippedSpells: [EMBER_LANCE], activeEffects: [lock('attack')] },
        [{ id: 'a' }],
      ),
    ).toEqual(CAST_RANDOM)
  })
})

describe('opener', () => {
  it('rule 1: round 1 -> cast a random gem', () => {
    expect(
      decide(OPENER_SCRIPT, { equippedSpells: [EMBER_LANCE] }, [{ id: 'a' }], [], 1),
    ).toEqual(CAST_RANDOM)
  })

  it('rule 2: after round 1 -> Attack the lowest-HP enemy', () => {
    expect(
      decide(OPENER_SCRIPT, { equippedSpells: [EMBER_LANCE] }, [{ id: 'a' }], [], 2),
    ).toEqual(ATTACK_LOWEST)
  })

  it('rule 3 (the fallback): after round 1 and Pacified, it casts a random gem', () => {
    expect(
      decide(
        OPENER_SCRIPT,
        { equippedSpells: [EMBER_LANCE], activeEffects: [lock('attack')] },
        [{ id: 'a' }],
        [],
        2,
      ),
    ).toEqual(CAST_RANDOM)
  })
})

describe('taunter', () => {
  it('rule 1: Provokes, healthy or wounded, and even Pacified or Silenced', () => {
    for (const me of [
      {},
      { currentHp: WOUNDED_45 },
      { activeEffects: [lock('attack')] },
      { activeEffects: [lock('cast')] },
    ]) {
      expect(decide(TAUNTER_SCRIPT, me, [{ id: 'a' }])).toEqual({
        action: { kind: 'provoke' },
      })
    }
  })

  it('rules 2 and 3 are the shared fallback (never reached in play: Provoke is always legal)', () => {
    // Provoke is illegal only under an 'all' lock, which makes Attack and Cast illegal too, so
    // nothing below rule 1 can fire. The structure is pinned instead: remove either rule and this
    // fails, so the taunter can't quietly lose the fallback every other role carries.
    expect(TAUNTER_SCRIPT.rules.slice(1)).toEqual([
      {
        condition: { kind: 'always' },
        action: { kind: 'attack' },
        targeting: { kind: 'lowest-hp-enemy' },
      },
      { condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 'random' } },
    ])
  })
})

// Phase 4.1-G1 (ASSUMPTION 68): `taunter` is `always-provoke` renamed into the role set. Its two real
// users then (Snapjaw Lure, Stonehorn Warden) must fight exactly as they did: the same fight, with
// only the script id swapped, gives the same event log. (Since 4.1-H2c the Warden runs `warden`; the
// test still swaps the script on the same creature, so it stays valid.)
describe('taunter behaves exactly as always-provoke did (ASSUMPTION 68)', () => {
  const scripts = new Map([...STOCK_SCRIPTS_BY_ID, ...FIXTURE_SCRIPTS_BY_ID])

  function fight(seed: number, provokeScript: string) {
    const player = [
      materializeCreature(SHIELDBARER_STARTER, {
        level: 10,
        side: 'player',
        slot: 0,
        speciesId: SHIELDBARER_STARTER_SPECIES_ID,
        scriptId: provokeScript,
      }),
      materializeCreature(BRUTE_STARTER, {
        level: 10,
        side: 'player',
        slot: 1,
        speciesId: BRUTE_STARTER_SPECIES_ID,
        scriptId: ALWAYS_ATTACK_SCRIPT.id,
      }),
    ]
    const enemy = [
      materializeCreature(SNAPJAW_LURE, {
        level: 10,
        side: 'enemy',
        slot: 0,
        speciesId: SNAPJAWS_SPECIES_ID,
        scriptId: provokeScript,
      }),
      materializeCreature(SNAPJAW_JAWS, {
        level: 10,
        side: 'enemy',
        slot: 1,
        speciesId: SNAPJAWS_SPECIES_ID,
        scriptId: ALWAYS_ATTACK_SCRIPT.id,
      }),
    ]
    return resolveFight(
      createCombat({
        seed,
        player: { party: player },
        enemy: { party: enemy },
        registries: { scripts, traits: TRAIT_REGISTRY, statuses: STATUS_REGISTRY },
      }),
    )
  }

  it('the same fight under always-provoke and under taunter has the identical event log, across seeds 1-20', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const old = fight(seed, ALWAYS_PROVOKE_SCRIPT.id)
      const renamed = fight(seed, 'taunter')
      expect(renamed.events).toEqual(old.events)
      expect(renamed.state.result).toBe(old.state.result)
      // ...and the fight is not vacuous: both provokers actually Provoke.
      expect(old.events.some((e) => e.type === 'Provoked')).toBe(true)
    }
  })
})
