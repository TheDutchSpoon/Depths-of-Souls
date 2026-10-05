import type { Rule, Script } from '../engine/scripting-types'

// Real shipped content: the seven ROLE scripts (Phase 4.1-G1, D4; CONVENTIONS "Role scripts"). A
// creature's `defaultScriptId` is its role, so enemies play readable, learnable patterns and a
// summoned creature has a sensible default. Every role ends in the same fallback, so a lock
// downgrades a turn instead of emptying it: "cast random gem" sits BELOW an Attack rule and only
// fires when Attack is illegal, in practice when the actor is Pacified.
//
// The five Phase 2 `always-*` scripts are test fixtures now (engine/__fixtures__/scripts.ts,
// ASSUMPTION 68); no creature's role is one of them.

/** "Attack the lowest-HP enemy": the fallback attack every role carries (explicit target). */
const ATTACK_LOWEST_ENEMY: Rule = {
  condition: { kind: 'always' },
  action: { kind: 'attack' },
  targeting: { kind: 'lowest-hp-enemy' },
}

/** "Cast random gem": uniformly among the creature's castable gems; each gem's target comes from
 * the side-aware default. The last rule of every role except `caster`, where it is the first. */
const CAST_RANDOM_GEM: Rule = {
  condition: { kind: 'always' },
  action: { kind: 'cast', gemSlot: 'random' },
}

export const STRIKER_SCRIPT: Script = {
  id: 'striker',
  rules: [
    // 1. Finish a wounded enemy: any enemy below 80% HP -> Attack the lowest-HP enemy.
    {
      condition: {
        kind: 'hp-percent',
        subject: 'enemy',
        qualifier: 'any',
        comparator: '<',
        thresholdPercent: 80,
      },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    // 2. Otherwise Attack a random enemy.
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'random-enemy' },
    },
    // 3. Attack illegal (Pacified) -> cast a random gem.
    CAST_RANDOM_GEM,
  ],
}

export const GUARDIAN_SCRIPT: Script = {
  id: 'guardian',
  rules: [
    // 1. Self HP below 50% -> Defend.
    {
      condition: {
        kind: 'hp-percent',
        subject: 'self',
        qualifier: 'any',
        comparator: '<',
        thresholdPercent: 50,
      },
      action: { kind: 'defend' },
    },
    ATTACK_LOWEST_ENEMY,
    CAST_RANDOM_GEM,
  ],
}

export const WARDEN_SCRIPT: Script = {
  id: 'warden',
  rules: [
    // 1. Lowest ally HP below 50% (the warden counts) -> Provoke, to draw hits off the wounded.
    {
      condition: {
        kind: 'hp-percent',
        subject: 'ally',
        qualifier: 'lowest',
        comparator: '<',
        thresholdPercent: 50,
      },
      action: { kind: 'provoke' },
    },
    ATTACK_LOWEST_ENEMY,
    CAST_RANDOM_GEM,
  ],
}

export const CASTER_SCRIPT: Script = {
  id: 'caster',
  rules: [
    // 1. Cast a random gem every turn it can; 2. otherwise (Silenced, no castable gem) Attack.
    CAST_RANDOM_GEM,
    ATTACK_LOWEST_ENEMY,
  ],
}

export const SUPPORT_SCRIPT: Script = {
  id: 'support',
  rules: [
    // 1. Lowest ally HP below 50% -> cast a random ALLY-SIDE gem (heals, buffs); with none, the
    //    rule is illegal and falls through.
    {
      condition: {
        kind: 'hp-percent',
        subject: 'ally',
        qualifier: 'lowest',
        comparator: '<',
        thresholdPercent: 50,
      },
      action: { kind: 'cast', gemSlot: 'random', gemSide: 'ally' },
    },
    ATTACK_LOWEST_ENEMY,
    CAST_RANDOM_GEM,
  ],
}

export const OPENER_SCRIPT: Script = {
  id: 'opener',
  rules: [
    // 1. Round 1 -> cast a random gem; afterwards Attack.
    {
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      action: { kind: 'cast', gemSlot: 'random' },
    },
    ATTACK_LOWEST_ENEMY,
    CAST_RANDOM_GEM,
  ],
}

/** For creatures whose trait fires on Provoke (Snapjaw Lure, Stonehorn Warden). Behaves exactly as
 * the old `always-provoke`: Provoke is legal on every turn that isn't skipped, so rules 2 and 3 are
 * the shared fallback and never run in practice. Not a cast role. */
export const TAUNTER_SCRIPT: Script = {
  id: 'taunter',
  rules: [
    { condition: { kind: 'always' }, action: { kind: 'provoke' } },
    ATTACK_LOWEST_ENEMY,
    CAST_RANDOM_GEM,
  ],
}

export const ROLE_SCRIPTS: readonly Script[] = [
  STRIKER_SCRIPT,
  GUARDIAN_SCRIPT,
  WARDEN_SCRIPT,
  CASTER_SCRIPT,
  SUPPORT_SCRIPT,
  OPENER_SCRIPT,
  TAUNTER_SCRIPT,
]

/** Ready to pass directly as createCombat's `scripts` argument: exactly the seven role scripts. */
export const STOCK_SCRIPTS_BY_ID: ReadonlyMap<string, Script> = new Map(
  ROLE_SCRIPTS.map((script) => [script.id, script]),
)
