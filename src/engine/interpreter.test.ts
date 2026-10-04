import { describe, expect, it } from 'vitest'
import { decideAction } from './interpreter'
import { checkLegality, resolveIntent } from './actions'
import { evaluateCondition } from './conditions'
import { makeParty } from './__fixtures__/creatures'
import { createRngState, nextRandom } from './rng'
import { createEffectInstanceId } from './effect-types'
import type { CombatState, Creature, Spell } from './types'
import type { Script } from './scripting-types'
import type { ActiveEffect } from './effect-types'

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
    ...overrides,
  }
}

/** decideAction now returns an unresolved Intent (Phase 4.1-C2a, A1); resolve it the same way
 * combat.ts's resolveTurn does, so every existing assertion's VALUE (the resolved Action) stays
 * unchanged -- only the call site adapts to the new two-step API. */
function decide(creature: Creature, script: Script | null, state: CombatState) {
  const intent = decideAction(creature, script, state)
  return resolveIntent(creature, intent, state)
}

const EMBER_LANCE: Spell = {
  id: 'ember-lance',
  name: 'Ember Lance',
  targetShape: 'single',
  affinity: 'violence',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}
const CINDER_NOVA: Spell = {
  id: 'cinder-nova',
  name: 'Cinder Nova',
  targetShape: 'aoe',
  affinity: 'violence',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.3,
    },
  ],
}

describe('decideAction -- rule precedence', () => {
  it('the first valid, matching rule wins; a later matching rule never fires', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        { condition: { kind: 'always' }, action: { kind: 'defend' } },
        { condition: { kind: 'always' }, action: { kind: 'wait' } },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({ kind: 'defend' })
  })
})

describe('decideAction -- skip on invalid', () => {
  it('skips a rule casting an empty gem slot and falls through to the next rule', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [null] }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        { condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } },
        { condition: { kind: 'always' }, action: { kind: 'defend' } },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({ kind: 'defend' })
  })

  it('a targeting-less rule is valid (B1): it matches, carries no targeting, and resolves to the side-aware default', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'tanky', health: 50 }, // slot 0: first-by-slot, but NOT the lowest HP
      { id: 'weak', health: 10 },
    ])
    const script: Script = {
      id: 'test',
      rules: [
        { condition: { kind: 'always' }, action: { kind: 'attack' } }, // no `targeting`
        { condition: { kind: 'always' }, action: { kind: 'wait' } },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, script, state)).toEqual({
      action: { kind: 'attack' },
      targeting: undefined,
    })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'attack',
      targetId: enemy[1]!.id,
    })
  })

  it('a targeting-less ally-side spell rule defaults to the lowest-HP ally', () => {
    const HEAL: Spell = {
      id: 'heal',
      name: 'Heal',
      targetShape: 'single',
      affinity: 'vitality',
      targetSide: 'ally',
      unlockedAtBiome: 1,
      effects: [
        { kind: 'heal', target: { kind: 'cast-target' }, offStat: 'cast', spellPower: 1 },
      ],
    }
    const player = makeParty('player', [
      { id: 'me', health: 40, equippedSpells: [HEAL] },
      { id: 'hurt', health: 40, currentHp: 5 },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [{ condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } }],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: player[1]!.id,
    })
  })
})

describe('decideAction -- acted-before-target on a targeting-less rule (B1 peek)', () => {
  // Queue: tanky (slot 0, HP 50), me, weak (slot 1, HP 10). `me` acts before `weak`, the
  // lowest-HP enemy = the side-aware default, but AFTER `tanky`, the first-by-slot enemy -- so the
  // condition is true only if the peek uses the side-aware default.
  const build = () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'tanky', health: 50 },
      { id: 'weak', health: 10 },
    ])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      turnQueue: [enemy[0]!.id, player[0]!.id, enemy[1]!.id],
    })
    return { player, enemy, state }
  }
  const script: Script = {
    id: 'test',
    rules: [
      { condition: { kind: 'acted-before-target' }, action: { kind: 'attack' } },
      { condition: { kind: 'always' }, action: { kind: 'wait' } },
    ],
  }

  it('peeks the side-aware default (lowest-HP enemy) and draws no RNG', () => {
    const { player, state } = build()
    const before = state.rng.position
    expect(decideAction(player[0]!, script, state).action.kind).toBe('attack')
    expect(state.rng.position).toBe(before)
  })

  it('an explicit rule targeting still wins over the default', () => {
    const { player, state } = build()
    const explicit: Script = {
      id: 'explicit',
      rules: [
        {
          condition: { kind: 'acted-before-target' },
          action: { kind: 'attack' },
          targeting: { kind: 'highest-hp-enemy' }, // tanky, who acts BEFORE me
        },
        { condition: { kind: 'always' }, action: { kind: 'wait' } },
      ],
    }
    expect(decideAction(player[0]!, explicit, state).action.kind).toBe('wait')
  })

  it('is false where no single default exists before the draw (gemSlot random)', () => {
    const { state } = build()
    const randomGem: Script = {
      id: 'random-gem',
      rules: [
        {
          condition: { kind: 'acted-before-target' },
          action: { kind: 'cast', gemSlot: 'random' },
        },
        { condition: { kind: 'always' }, action: { kind: 'wait' } },
      ],
    }
    const caster = makeParty('player', [{ id: 'me', equippedSpells: [EMBER_LANCE] }])
    const s = makeState({ ...state, playerParty: caster })
    expect(decideAction(caster[0]!, randomGem, s).action.kind).toBe('wait')
  })
})

describe('decideAction -- implicit fallback', () => {
  it('falls back to Attack a valid default target when script is null', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, null, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })

  it('falls back when no rule in the script matches', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'enemy-count', comparator: '>=', count: 999 },
          action: { kind: 'defend' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })

  it('falls back to Wait when the enemy side has no valid target', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decide(player[0]!, null, state)).toEqual({ kind: 'wait' })
  })

  it('the implicit fallback redirects to a provoker when one exists, even with no script assigned', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'provoker', provoking: true },
      { id: 'default-target' },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, null, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })
})

describe('decideAction -- AOE cast', () => {
  it('ignores a stray targeting field on an AOE-slotted rule', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [CINDER_NOVA] }])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' }, // irrelevant for AOE, must be ignored
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'cast',
      targetShape: 'aoe',
      gemSlot: 0,
    })
  })
})

describe('decideAction -- single cast', () => {
  it('honors the rule targeting for a single-target spell', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [EMBER_LANCE] }])
    const enemy = makeParty('enemy', [
      { id: 'high', currentHp: 20 },
      { id: 'low', currentHp: 5 },
    ])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: enemy[1]!.id,
    })
  })
})

describe('decideAction -- defend/provoke/wait always resolve', () => {
  it.each([
    [{ kind: 'defend' as const }, { kind: 'defend' as const }],
    [{ kind: 'provoke' as const }, { kind: 'provoke' as const }],
    [{ kind: 'wait' as const }, { kind: 'wait' as const }],
  ])('rule action %o resolves to %o regardless of state', (ruleAction, expected) => {
    const player = makeParty('player', [{ id: 'me' }])
    const script: Script = {
      id: 'test',
      rules: [{ condition: { kind: 'always' }, action: ruleAction }],
    }
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decide(player[0]!, script, state)).toEqual(expected)
  })
})

describe('decideAction -- RNG lookahead vs execution discipline', () => {
  it('a non-matching rule referencing random-enemy targeting consumes zero RNG state', () => {
    const seed = 123
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }])

    const scriptWithDummy: Script = {
      id: 'with-dummy',
      rules: [
        {
          condition: { kind: 'enemy-count', comparator: '>=', count: 999 }, // never matches
          action: { kind: 'attack' },
          targeting: { kind: 'random-enemy' },
        },
        { condition: { kind: 'always' }, action: { kind: 'defend' } },
      ],
    }
    const scriptWithoutDummy: Script = {
      id: 'without-dummy',
      rules: [{ condition: { kind: 'always' }, action: { kind: 'defend' } }],
    }

    const stateWith = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createRngState(seed),
    })
    const stateWithout = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createRngState(seed),
    })

    decide(player[0]!, scriptWithDummy, stateWith)
    decide(player[0]!, scriptWithoutDummy, stateWithout)

    expect(stateWith.rng.position).toBe(stateWithout.rng.position)
  })

  it('a winning random-enemy rule draws exactly once whether or not a provoker overrides it', () => {
    const seed = 456
    const player = makeParty('player', [{ id: 'me' }])
    const script: Script = {
      id: 'random-attacker',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'attack' },
          targeting: { kind: 'random-enemy' },
        },
      ],
    }

    const enemyNoProvoker = makeParty('enemy', [{ id: 'a' }, { id: 'b' }])
    const stateNoProvoker = makeState({
      playerParty: player,
      enemyParty: enemyNoProvoker,
      rng: createRngState(seed),
    })
    const siblingNoProvoker = createRngState(seed)

    nextRandom(siblingNoProvoker) // the one draw the winning random-enemy rule should make
    decide(player[0]!, script, stateNoProvoker)
    expect(stateNoProvoker.rng.position).toBe(siblingNoProvoker.position)

    const enemyWithProvoker = makeParty('enemy', [
      { id: 'a', provoking: true },
      { id: 'b' },
    ])
    const stateWithProvoker = makeState({
      playerParty: player,
      enemyParty: enemyWithProvoker,
      rng: createRngState(seed),
    })
    const siblingWithProvoker = createRngState(seed)

    nextRandom(siblingWithProvoker) // Provoke's own single index draw
    const result = decide(player[0]!, script, stateWithProvoker)
    expect(result).toEqual({ kind: 'attack', targetId: enemyWithProvoker[0]!.id })
    expect(stateWithProvoker.rng.position).toBe(siblingWithProvoker.position)
  })
})

describe('decideAction -- scoped action-lock (Phase 4 Slice B; passive lock since 4.1-F1)', () => {
  function suppressEffect(scope: 'attack' | 'cast'): ActiveEffect {
    return {
      category: 'action-lock',
      scope,
      instanceId: createEffectInstanceId('fixture#suppress'),
      sourceTraitId: 'fixture-suppress',
    }
  }

  it('a Cast-scoped suppression (Silenced) skips a Cast rule but not a later Attack rule', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        equippedSpells: [EMBER_LANCE],
        activeEffects: [suppressEffect('cast')],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' },
        },
        {
          condition: { kind: 'always' },
          action: { kind: 'attack' },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })

  it('an Attack-scoped suppression (Pacified) skips an Attack rule but not a later Cast rule', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        equippedSpells: [EMBER_LANCE],
        activeEffects: [suppressEffect('attack')],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'attack' },
          targeting: { kind: 'lowest-hp-enemy' },
        },
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: enemy[0]!.id,
    })
  })

  it('an Attack-scoped suppression also gates the implicit fallback (falls to Wait, not Attack)', () => {
    const player = makeParty('player', [
      { id: 'me', activeEffects: [suppressEffect('attack')] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, null, state)).toEqual({ kind: 'wait' })
  })
})

describe('decideAction -- status-immunity vs scoped action-lock (Phase 4 Slice C)', () => {
  const SILENCED_CAST_SUPPRESSION: ActiveEffect = {
    category: 'status',
    statusId: 'silenced',
    cap: 1,
    effects: [{ category: 'action-lock', scope: 'cast' }],
    polarity: 'debuff',
    defaultDuration: 3,
    instanceId: createEffectInstanceId('me#status#silenced'),
    sourceTraitId: 'silenced',
    remainingDuration: 2,
    stacks: 1,
  }
  const CLEAR_MIND: ActiveEffect = {
    category: 'status-immunity',
    statusId: 'silenced',
    instanceId: createEffectInstanceId('clear-mind'),
    sourceTraitId: 'clear-mind',
  }

  it('a Clear-Mind-immune creature casts freely despite carrying Silenced', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        equippedSpells: [EMBER_LANCE],
        activeEffects: [SILENCED_CAST_SUPPRESSION, CLEAR_MIND],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: enemy[0]!.id,
    })
  })

  it('immunity suppresses only the EFFECT -- the creature still reads as has-status: silenced', () => {
    const player = makeParty('player', [
      { id: 'me', activeEffects: [SILENCED_CAST_SUPPRESSION, CLEAR_MIND] },
    ])
    expect(
      evaluateCondition(
        { kind: 'has-status', subject: 'self', statusId: 'silenced' },
        player[0]!,
        makeState({ playerParty: player }),
      ),
    ).toBe(true)
  })

  it('without the matching immunity, Silenced still suppresses Cast as before', () => {
    const player = makeParty('player', [
      {
        id: 'me',
        equippedSpells: [EMBER_LANCE],
        activeEffects: [SILENCED_CAST_SUPPRESSION],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' },
        },
        {
          condition: { kind: 'always' },
          action: { kind: 'attack' },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, script, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })
})

describe('checkLegality -- pure, draws nothing (Phase 4.1-C2a, A1)', () => {
  it('an Attack intent is legal iff the enemy side has a living member (suppression is covered separately, above)', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(checkLegality(player[0]!, { action: { kind: 'attack' } }, state)).toBe(true)

    const noEnemyState = makeState({ playerParty: player, enemyParty: [] })
    expect(checkLegality(player[0]!, { action: { kind: 'attack' } }, noEnemyState)).toBe(
      false,
    )
  })

  it('draws no RNG even when the intent references random-enemy targeting', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createRngState(999),
    })
    const before = state.rng.position
    checkLegality(
      player[0]!,
      { action: { kind: 'attack' }, targeting: { kind: 'random-enemy' } },
      state,
    )
    expect(state.rng.position).toBe(before)
  })

  it('a Cast referencing an empty gem slot is illegal', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [null] }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      checkLegality(
        player[0]!,
        { action: { kind: 'cast', gemSlot: 0 }, targeting: { kind: 'lowest-hp-enemy' } },
        state,
      ),
    ).toBe(false)
  })

  it('an AOE Cast is legal regardless of targeting or living-enemy count', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [CINDER_NOVA] }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(
      checkLegality(player[0]!, { action: { kind: 'cast', gemSlot: 0 } }, state),
    ).toBe(true)
  })

  it("gemSlot: 'random' is legal iff at least one equipped spell is castable", () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [EMBER_LANCE] }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      checkLegality(player[0]!, { action: { kind: 'cast', gemSlot: 'random' } }, state),
    ).toBe(true)

    const noSpells = makeParty('player', [{ id: 'me', equippedSpells: [null] }])
    const noSpellsState = makeState({ playerParty: noSpells, enemyParty: enemy })
    expect(
      checkLegality(
        noSpells[0]!,
        { action: { kind: 'cast', gemSlot: 'random' } },
        noSpellsState,
      ),
    ).toBe(false)
  })

  it.each([
    [{ kind: 'defend' as const }],
    [{ kind: 'provoke' as const }],
    [{ kind: 'wait' as const }],
  ])('%o is always legal', (action) => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(checkLegality(player[0]!, { action }, state)).toBe(true)
  })
})
