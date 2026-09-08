// Phase 4 Slice E (Support-spell model) -- targeted unit coverage for the two mechanisms the
// brief's own Tests bullet calls out beyond the two goldens: ally-single-target Cast resolution
// bypassing Provoke, and ally-AOE Cast resolution never rolling Confusion. Payload correctness
// (heal magnitude/clamp, stat-modifier application) is proven end-to-end by the two goldens
// instead (golden-heal-cast, golden-buff-cast) -- this file is about TARGETING only.

import { describe, expect, it } from 'vitest'
import { decideAction } from './interpreter'
import { createCombat, resolveTurn } from './combat'
import { makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import { createEffectInstanceId } from './effect-types'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import type { CombatState, Spell } from './types'
import type { SeededRng } from './rng'
import type { Script } from './scripting-types'
import type { ActiveEffect } from './effect-types'

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    rng: createSeededRng(1),
    playerParty: [],
    enemyParty: [],
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    statuses: new Map(),
    traits: new Map(),
    ...overrides,
  }
}

const HEAL_SPELL: Spell = {
  id: 'test-heal',
  name: 'Test Heal',
  targetShape: 'single',
  spellPower: 1,
  affinity: 'vitality',
  targetSide: 'ally',
  payload: 'heal',
}

const BUFF_AOE_SPELL: Spell = {
  id: 'test-buff-aoe',
  name: 'Test Buff AOE',
  targetShape: 'aoe',
  spellPower: 1,
  affinity: 'vitality',
  targetSide: 'ally',
  payload: 'stat-modifier',
  statModifier: { stat: 'defence', factor: 1.2 },
}

describe('interpreter -- ally-targeting single Cast (Phase 4 Slice E)', () => {
  it('resolves via the ally target pool and ignores an active enemy Provoke entirely', () => {
    const player = makeParty('player', [
      { id: 'healer', intelligence: 20, equippedSpells: [HEAL_SPELL] },
      { id: 'wounded', currentHp: 5, health: 20 },
    ])
    // If ally casts were routed through resolveOffensiveTarget (the enemy-cast pipeline), this
    // provoking foe would hijack the target to ITSELF -- an enemy id, not the wounded ally.
    // GAME_DESIGN §7: "Provoke applies only to enemy-targeting offensive actions; ally-targeting
    // actions... are unaffected."
    const enemy = makeParty('enemy', [{ id: 'foe', provoking: true }])
    const script: Script = {
      id: 'test-heal-script',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-ally' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })

    const action = decideAction(player[0]!, script, state)

    expect(action).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: player[1]!.id,
    })
  })
})

function confusionFixture(chancePercent: number): ActiveEffect {
  return {
    category: 'friendly-fire-status',
    statusId: 'confusion-fixture',
    cap: 1,
    chancePercent,
    instanceId: createEffectInstanceId('confusion-fixture'),
    sourceTraitId: 'confusion-fixture',
    remainingDuration: 3,
    stacks: 1,
  }
}

/** Wraps a real SeededRng to count draws, so a test can prove a code path drew ZERO RNG values
 * (rather than merely asserting on an outcome that could coincidentally match either way). */
function countingRng(inner: SeededRng): SeededRng & { calls: number } {
  const wrapper = {
    calls: 0,
    next(): number {
      wrapper.calls += 1
      return inner.next()
    },
  }
  return wrapper
}

describe('executeCastAoe -- ally-targeting AOE Cast (Phase 4 Slice E)', () => {
  it("freezes the caster's own living side and draws ZERO RNG, even at 100% Confusion", () => {
    const player = makeParty('player', [
      {
        id: 'buffer',
        defence: 10,
        speed: 20,
        scriptId: 'always-cast',
        equippedSpells: [BUFF_AOE_SPELL],
      },
      { id: 'ally', defence: 5, speed: 5, scriptId: 'always-wait' },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe', speed: 1, scriptId: 'always-wait' }])
    const created = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    const rng = countingRng(created.rng)
    // A 100%-chance Confusion status would, for an ENEMY-targeting AOE, ALWAYS redirect (and
    // always draw the roll -- see confusion.test.ts). Here the spell is already ally-targeting,
    // so this proves the redirect roll is never even consulted for that case: an ally-targeting
    // AOE always resolves to its own side, unconditionally, drawing nothing.
    const confused: CombatState = {
      ...created,
      rng,
      playerParty: created.playerParty.map((c) =>
        c.id === player[0]!.id
          ? { ...c, activeEffects: [...c.activeEffects, confusionFixture(100)] }
          : c,
      ),
    }

    const { events } = resolveTurn(confused)

    const spellCast = events.find((e) => e.type === 'SpellCast')
    expect(spellCast).toMatchObject({
      targetShape: 'aoe',
      targetIds: [player[0]!.id, player[1]!.id],
    })
    expect(rng.calls).toBe(0)
  })
})
