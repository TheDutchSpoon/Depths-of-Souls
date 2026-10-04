// Phase 4.1-C2c (PR #73 review): two behaviours no test pinned before. Each is hand-derived and
// was shown failing with its own check removed (see the phase record).

import { describe, expect, it } from 'vitest'
import { createResolutionContext, executeAction } from './actions'
import { newCascade } from './resolution'
import { createEffectInstanceId } from './effect-types'
import { makeParty } from './__fixtures__/creatures'
import { createRngState } from './rng'
import { WEAKEN } from '../data/statuses'
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
    statuses: new Map([[WEAKEN.statusId, WEAKEN]]),
    effectInstanceCounter: 0,
  }
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

describe('an AOE cast skips a member that died earlier in the same cast', () => {
  // NOVA: AOE, spellPower 1.0, caster Int 20, member defence 0 -> core 20, chip 0.2 -> raw 20.2
  // -> final 20 per member. M1 (HP 5) dies to the AOE hit; its on-death response deals a lethal
  // flat 99 to its lowest-HP living ally, M2. The frozen member list is [M1, M2], so M2's turn in
  // the loop comes AFTER it is already dead: it must be skipped (no caster DamageDealt on M2).
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
        spellPower: 1.0,
      },
    ],
  }
  const LAST_WORDS: ActiveEffect = {
    category: 'triggered',
    hook: 'on-death',
    response: {
      kind: 'deal-damage',
      target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
      flatAmount: 99,
      damageSource: 'attack',
    },
    instanceId: createEffectInstanceId('last-words'),
    sourceTraitId: 'last-words-fixture',
  }

  it("M2 is killed by M1's on-death before its own hit -- the AOE loop skips it", () => {
    const player = makeParty('player', [
      { id: 'me', health: 40, intelligence: 20, defence: 0, equippedSpells: [NOVA] },
    ])
    const enemy = makeParty('enemy', [
      { id: 'm1', health: 5, defence: 0, activeEffects: [LAST_WORDS] },
      { id: 'm2', health: 50, defence: 0 }, // 99 flat from M1's on-death kills it
    ])
    const events = run(
      player[0]!,
      { kind: 'cast', targetShape: 'aoe', gemSlot: 0 },
      makeState(player, enemy),
    )

    const hitsFromCaster = events.flatMap((e) =>
      e.type === 'DamageDealt' && String(e.sourceId) === 'me' ? [String(e.targetId)] : [],
    )
    expect(hitsFromCaster).toEqual(['m1'])
    // M2 still died -- from M1's on-death hit, not the caster's.
    expect(
      events.filter((e) => e.type === 'CreatureDied').map((e) => String(e.creatureId)),
    ).toEqual(['m1', 'm2'])
  })
})

describe('a status is never applied to a dead target', () => {
  // SMITE: single-target, spellPower 1.0 (caster Int 20 vs defence 0 -> final 20), then an
  // `apply-status` Weaken effect on `cast-target`. TARGET has HP 5, so the hit kills it;
  // `apply-status` then skips the corpse (no response acts on a dead creature but `revive`;
  // pre-4.1-D: `applyStatusIfAlive`), so no StatusApplied is emitted for it.
  const SMITE: Spell = {
    id: 'smite',
    name: 'Smite',
    targetShape: 'single',
    affinity: 'vitality',
    targetSide: 'enemy',
    unlockedAtBiome: 1,
    effects: [
      {
        kind: 'deal-damage',
        target: { kind: 'cast-target' },
        offStat: 'cast',
        spellPower: 1.0,
      },
      {
        kind: 'apply-status',
        target: { kind: 'cast-target' },
        status: { statusId: WEAKEN.statusId, duration: 2 },
      },
    ],
  }

  it('the killing hit lands, and no StatusApplied follows it', () => {
    const player = makeParty('player', [
      { id: 'me', health: 40, intelligence: 20, defence: 0, equippedSpells: [SMITE] },
    ])
    const enemy = makeParty('enemy', [{ id: 'target', health: 5, defence: 0 }])
    const events = run(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )

    expect(events.some((e) => e.type === 'CreatureDied')).toBe(true)
    expect(events.some((e) => e.type === 'StatusApplied')).toBe(false)
  })

  it('control: the same spell on a survivor DOES apply the status', () => {
    const player = makeParty('player', [
      { id: 'me', health: 40, intelligence: 20, defence: 0, equippedSpells: [SMITE] },
    ])
    const enemy = makeParty('enemy', [{ id: 'target', health: 100, defence: 0 }])
    const events = run(
      player[0]!,
      { kind: 'cast', targetShape: 'single', gemSlot: 0, targetId: enemy[0]!.id },
      makeState(player, enemy),
    )
    expect(events.filter((e) => e.type === 'StatusApplied')).toHaveLength(1)
  })
})
