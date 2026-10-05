// Phase 4.1-G1, stage 0 (ASSUMPTION 68): the five Phase 2 `always-*` scripts, moved UNCHANGED (same
// ids, same rules) out of the shipped data layer. They are test fixtures now: a mechanism test
// wants the simplest deterministic actor, and a role's extra rules and random draws would only blur
// it. `data/scripts.ts` ships the role scripts; no creature's role is an `always-*` script.
//
// A script is player data, so using these in the corpus's coverage fights is still real content: a
// one-rule script is one a player can write.

import type { Script } from '../scripting-types'

export const ALWAYS_ATTACK_SCRIPT: Script = {
  id: 'always-attack',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}

export const ALWAYS_CAST_SCRIPT: Script = {
  id: 'always-cast',
  // Degrades to the implicit fallback automatically when slot 0 is empty (invalid action
  // -> skip rule -> no more rules -> fallback). No `targeting` (B1): the engine's side-aware
  // default picks the lowest-HP enemy for an enemy-side spell and the lowest-HP ally for an
  // ally-side one, so the same script serves single-target, ally-side and AOE loadouts.
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'cast', gemSlot: 0 },
    },
  ],
}

export const ALWAYS_DEFEND_SCRIPT: Script = {
  id: 'always-defend',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'defend' } }],
}

export const ALWAYS_PROVOKE_SCRIPT: Script = {
  id: 'always-provoke',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'provoke' } }],
}

export const ALWAYS_WAIT_SCRIPT: Script = {
  id: 'always-wait',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'wait' } }],
}

export const FIXTURE_SCRIPTS: readonly Script[] = [
  ALWAYS_ATTACK_SCRIPT,
  ALWAYS_CAST_SCRIPT,
  ALWAYS_DEFEND_SCRIPT,
  ALWAYS_PROVOKE_SCRIPT,
  ALWAYS_WAIT_SCRIPT,
]

/** Holds exactly the five `always-*` scripts; ready to pass as createCombat's `scripts`. */
export const FIXTURE_SCRIPTS_BY_ID: ReadonlyMap<string, Script> = new Map(
  FIXTURE_SCRIPTS.map((script) => [script.id, script]),
)
