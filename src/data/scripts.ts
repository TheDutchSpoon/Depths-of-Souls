import type { Script } from '../engine/scripting-types'

// Real shipped content, not test fixtures. Enemies use these until richer scripts arrive
// (no new machinery); ROADMAP.md's exact five-script Phase 2 list.

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
  // -> skip rule -> no more rules -> fallback). `targeting` is ignored at evaluation time
  // if slot 0 holds an AOE spell (documented mismatch tolerance) -- the same script
  // definition is reused as-is by both single-target and AOE loadouts.
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: 'lowest-hp-enemy' },
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

/** Phase 4 Slice H2 (Glimmerdark, Blindclaws' Striker): the first real-content consumer of the
 * `acted-before-target` condition (Slice C) -- see `data/traits/glimmerdark.ts`'s
 * `BLINDCLAWS_STRIKER_TRAIT` doc comment for why this had to be a script, not a trait effect.
 * Strikes the lowest-HP enemy only when it can act before that enemy this round (i.e. it has the
 * initiative); otherwise holds position and Defends rather than trading blindly. */
export const AMBUSH_STRIKE_SCRIPT: Script = {
  id: 'ambush-strike',
  rules: [
    {
      condition: { kind: 'acted-before-target' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    { condition: { kind: 'always' }, action: { kind: 'defend' } },
  ],
}

export const STOCK_SCRIPTS: readonly Script[] = [
  ALWAYS_ATTACK_SCRIPT,
  ALWAYS_CAST_SCRIPT,
  ALWAYS_DEFEND_SCRIPT,
  ALWAYS_PROVOKE_SCRIPT,
  ALWAYS_WAIT_SCRIPT,
  AMBUSH_STRIKE_SCRIPT,
]

/** Ready to pass directly as createCombat's `scripts` argument. */
export const STOCK_SCRIPTS_BY_ID: ReadonlyMap<string, Script> = new Map(
  STOCK_SCRIPTS.map((script) => [script.id, script]),
)
