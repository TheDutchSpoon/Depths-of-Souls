// Every retaliator answers only direct damage (`spec/effects.md#hooks`). A retaliator is an
// `on-damage-taken` trigger whose response targets `triggering-source`; one without
// `damageChannel: 'direct'` would answer a retaliator's own hit, and two of them would answer each
// other. This reads the registries, never a hand list, so a retaliator authored later is held to it.

import { describe, expect, it } from 'vitest'
import { TRAIT_REGISTRY } from './traits'
import { STATUS_REGISTRY } from './statuses'
import { SPECIALIZATIONS, resolvePerkEffects } from './specializations'
import type { EffectDef, TriggeredDef } from '../engine/effect-types'

interface Collected {
  /** Where the trigger lives: `trait <id>`, `status <id>` or `perk <spec>/<id>`. */
  readonly where: string
  readonly trigger: TriggeredDef
}

function damageTakenTriggers(where: string, effects: readonly EffectDef[]): Collected[] {
  const out: Collected[] = []
  for (const effect of effects) {
    if (effect.category === 'triggered' && effect.hook === 'on-damage-taken') {
      out.push({ where, trigger: effect })
    }
  }
  return out
}

/** Every `on-damage-taken` trigger from the three carriers: traits, statuses and perks (at every
 * level of a leveled perk). */
function collect(): Collected[] {
  const out: Collected[] = []
  for (const trait of TRAIT_REGISTRY.values()) {
    out.push(...damageTakenTriggers(`trait ${trait.id}`, trait.effects))
  }
  for (const status of STATUS_REGISTRY.values()) {
    out.push(...damageTakenTriggers(`status ${status.statusId}`, status.effects))
  }
  for (const spec of SPECIALIZATIONS) {
    for (const perk of spec.perks) {
      for (let level = 1; level <= perk.maxLevel; level++) {
        out.push(
          ...damageTakenTriggers(
            `perk ${spec.id}/${perk.id}`,
            resolvePerkEffects(perk, level),
          ),
        )
      }
    }
  }
  return out
}

const targetsSource = ({ trigger }: Collected) =>
  trigger.response.kind !== 'perform-action' &&
  trigger.response.target.kind === 'triggering-source'

describe('retaliators answer only direct damage', () => {
  const all = collect()
  const retaliators = all.filter(targetsSource)

  it('every on-damage-taken trigger that targets triggering-source carries damageChannel direct', () => {
    const wrong = retaliators
      .filter(({ trigger }) => trigger.damageChannel !== 'direct')
      .map(({ where }) => where)
    expect(wrong).toEqual([])
  })

  it('the collection reaches traits, perks and statuses, and holds the four known retaliators', () => {
    // Containment, not equality: a later retaliator must not fail this test, only the one above.
    const places = new Set(retaliators.map(({ where }) => where))
    expect(places).toContain('trait snapjaw-jaws-snapback')
    expect(places).toContain('trait shellback-bulwark-retaliating-shell')
    expect(places).toContain('trait hollowkin-wretch-madness-touch')
    expect(places).toContain('perk shieldbarer/thorns')

    // Sleep proves the statuses were read: its wake-up is an on-damage-taken trigger that answers
    // any damage, so it carries no channel.
    const sleep = all.find(({ where }) => where === 'status sleep')
    expect(sleep).toBeDefined()
    expect(sleep?.trigger.damageChannel).toBeUndefined()
  })
})
