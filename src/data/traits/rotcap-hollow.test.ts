// The Rotcap Hollow death-observer triggers' shape, against `.claude/content/rotcap-hollow.md`. The
// behaviour is pinned by goldens (golden-rot-sovereign, golden-death-observed); these tests pin the
// data a golden cannot see: that every trigger writes its `relationship` out. An absent filter means
// `any`, so a dropped `ally` filter would silently start firing on enemy deaths too.

import { describe, expect, it } from 'vitest'
import {
  MYCONET_GRAVEDIGGER_TRAIT,
  MYCONET_WARDER_TRAIT,
  NECROMOSS_THICKET_TRAIT,
  ROT_SOVEREIGN_TRAIT,
  ROTFEEDER_SCAVENGER_TRAIT,
} from './rotcap-hollow'
import type { Trait } from '../../engine/effect-types'

const deathObservers = (trait: Trait) =>
  trait.effects.filter(
    (e) => e.category === 'triggered' && e.hook === 'on-death-observed',
  )

describe('death-observer triggers write their relationship out', () => {
  it.each([
    ['Myconet Warder', MYCONET_WARDER_TRAIT, 'ally'],
    ['Myconet Gravedigger', MYCONET_GRAVEDIGGER_TRAIT, 'ally'],
    ['Necromoss Thicket', NECROMOSS_THICKET_TRAIT, 'ally'],
    ['Rotfeeder Scavenger', ROTFEEDER_SCAVENGER_TRAIT, 'enemy'],
  ] as const)('%s writes its relationship out', (_name, trait, relationship) => {
    const observers = deathObservers(trait)

    expect(observers).toHaveLength(1)
    expect(observers[0]).toMatchObject({ observationFilter: { relationship } })
  })

  it('the Rot Sovereign has ONE death observer, on any death, at +10% Attack', () => {
    const observers = deathObservers(ROT_SOVEREIGN_TRAIT)

    expect(observers).toHaveLength(1)
    expect(observers[0]).toMatchObject({
      observationFilter: { relationship: 'any' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.1,
      },
    })
  })
})
