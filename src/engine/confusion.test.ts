import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { makeParty } from './__fixtures__/creatures'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { createEffectInstanceId } from './effect-types'
import type { ActiveEffect } from './effect-types'
import type { CombatEvent, CombatState, Spell } from './types'

// Phase 4 Slice C, ASSUMPTION 13: end-to-end proof that combat.ts's executeCastAoe actually
// wires shouldRedirectAoeToAllies in (unit-tested directly in targeting.test.ts) -- one roll
// per AOE instance decides whether the WHOLE frozen target set flips to the caster's own
// living side, never a per-target coin flip.

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

const TEST_AOE_SPELL: Spell = {
  id: 'test-aoe',
  name: 'Test AOE',
  targetShape: 'aoe',
  spellPower: 1,
  affinity: 'vitality',
}

/** createCombat always re-derives activeEffects from innateTraitIds at fight-start (it
 * overwrites whatever a raw Creature override set), so a "starts already confused" fixture
 * has to patch the already-created CombatState directly rather than via CreatureOverrides. */
function withConfused(
  state: CombatState,
  casterId: string,
  chancePercent: number,
): CombatState {
  return {
    ...state,
    playerParty: state.playerParty.map((c) =>
      c.id === casterId
        ? { ...c, activeEffects: [...c.activeEffects, confusionFixture(chancePercent)] }
        : c,
    ),
  }
}

describe('executeCastAoe -- Confusion redirect (Phase 4 Slice C)', () => {
  it('a confused caster at 100% chance redirects the whole AOE cast to its own living side', () => {
    const player = makeParty('player', [
      {
        id: 'caster',
        intelligence: 20,
        speed: 20,
        scriptId: 'always-cast',
        equippedSpells: [TEST_AOE_SPELL],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'foe1', health: 40, speed: 1, scriptId: 'always-wait' },
      { id: 'foe2', health: 40, speed: 1, scriptId: 'always-wait' },
    ])
    const state = withConfused(
      createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID),
      'caster',
      100,
    )
    const { events } = resolveTurn(state)

    const spellCast = events.find((e) => e.type === 'SpellCast')
    expect(spellCast).toMatchObject({ targetShape: 'aoe', targetIds: [player[0]!.id] })

    const dealt = events.filter(
      (e): e is Extract<CombatEvent, { type: 'DamageDealt' }> => e.type === 'DamageDealt',
    )
    expect(dealt.length).toBeGreaterThan(0)
    expect(dealt.every((e) => e.targetId === player[0]!.id)).toBe(true)
  })

  it('an unconfused caster casts at the enemy side as before -- byte-identical, no RNG drawn for the check', () => {
    const player = makeParty('player', [
      {
        id: 'caster',
        intelligence: 20,
        speed: 20,
        scriptId: 'always-cast',
        equippedSpells: [TEST_AOE_SPELL],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'foe1', health: 40, speed: 1, scriptId: 'always-wait' },
      { id: 'foe2', health: 40, speed: 1, scriptId: 'always-wait' },
    ])
    const state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    const { events } = resolveTurn(state)

    const spellCast = events.find((e) => e.type === 'SpellCast')
    expect(spellCast).toMatchObject({
      targetShape: 'aoe',
      targetIds: [enemy[0]!.id, enemy[1]!.id],
    })
  })
})
