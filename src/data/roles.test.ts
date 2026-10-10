import { describe, expect, it } from 'vitest'
import { BIOMES } from './biomes'
import { ALL_SPELLS } from './spells'
import { STOCK_SCRIPTS_BY_ID } from './scripts'
import { STARTERS } from './species/starters'
import {
  CAST_ROLE_SCRIPT_IDS,
  canEquip,
  spellsUnlockedAt,
  type SpeciesCreature,
} from '../engine/generation'
import type { Affinity } from '../engine/types'

// Phase 4.1-G1 (D4, ASSUMPTION 8 as amended, ASSUMPTION 68): every creature's `defaultScriptId` is
// its role, per the content docs' "Roles" tables. This table is those tables, one row per
// creature: the 54 spawn-pool creatures and 3 bosses, then the starters and the Unicorn.

const ROLES: Readonly<Record<string, string>> = {
  // The Overgrowth
  'spider-weaver': 'caster',
  'spider-ambusher': 'striker',
  'spider-broodwarden': 'striker',
  'swarmhive-drone': 'opener',
  'swarmhive-striker': 'striker',
  'swarmhive-queen': 'warden',
  'treant-sapling': 'guardian',
  'treant-elder': 'warden',
  'treant-grovekeep': 'warden',
  'pollinator-duster': 'support',
  'pollinator-beneficiary': 'caster',
  'pollinator-pollenlord': 'caster',
  'snapjaw-lure': 'taunter',
  'snapjaw-jaws': 'striker',
  'snapjaw-ironjaw': 'striker',
  'lullpollen-sleeper': 'striker',
  'lullpollen-reaper': 'striker',
  'lullpollen-dozer': 'striker',
  broodmother: 'striker',
  // Glimmerdark
  'flickerling-wick': 'support',
  'flickerling-flare': 'caster',
  'flickerling-last-gleam': 'striker',
  'blindclaws-setter': 'opener',
  'blindclaws-striker': 'striker',
  'blindclaws-vanguard': 'striker',
  'resonant-chorus': 'caster',
  'resonant-adept': 'caster',
  'resonant-overtone': 'caster',
  'sparkeater-leech': 'striker',
  'sparkeater-gorger': 'striker',
  'sparkeater-voidmaw': 'striker',
  'gloomjaw-stalker': 'opener',
  'gloomjaw-executioner': 'striker',
  'gloomjaw-ravager': 'striker',
  'shellback-warden': 'warden',
  'shellback-brawler': 'striker',
  'shellback-bulwark': 'warden',
  'leech-sovereign': 'striker',
  // Rotcap Hollow
  'sporecloud-seeder': 'striker',
  'sporecloud-reaper': 'striker',
  'sporecloud-bloomer': 'caster',
  'rotfeeder-scavenger': 'striker',
  'rotfeeder-ripper': 'striker',
  'rotfeeder-gorgemaw': 'striker',
  'myconet-warder': 'warden',
  'myconet-rotcore': 'warden',
  'myconet-gravedigger': 'guardian',
  'necromoss-wisp': 'caster',
  'necromoss-thicket': 'warden',
  'necromoss-hollowroot': 'support',
  'hollowkin-wretch': 'warden',
  'hollowkin-marionette': 'striker',
  'hollowkin-puppeteer': 'striker',
  'sporch-igniter': 'striker',
  'sporch-ashborn': 'caster',
  'sporch-cinderlord': 'opener',
  'rot-sovereign': 'warden',
  // Starters and the Unicorn (ASSUMPTION 8)
  'sorcerer-starter': 'caster',
  'brute-starter': 'striker',
  'shieldbarer-starter': 'warden', // 4.1-H2c (ASSUMPTION 123): was 'taunter'
  unicorn: 'striker',
}

interface Located {
  readonly creature: SpeciesCreature
  /** 1-based biome number, or null for a starter. */
  readonly biomeNumber: number | null
}

function allCreatures(): Located[] {
  const found: Located[] = []
  BIOMES.forEach((biome, index) => {
    for (const species of biome.speciesPool) {
      for (const creature of species.creatures) {
        found.push({ creature, biomeNumber: index + 1 })
      }
    }
    if (biome.boss) found.push({ creature: biome.boss.creature, biomeNumber: index + 1 })
  })
  for (const creature of STARTERS) found.push({ creature, biomeNumber: null })
  return found
}

describe('creature roles (Phase 4.1-G1)', () => {
  const creatures = allCreatures()

  it('the table covers every shipped creature exactly once', () => {
    expect(creatures.map((c) => c.creature.id).sort()).toEqual(Object.keys(ROLES).sort())
  })

  it('every creature runs the role the content docs name for it', () => {
    for (const { creature } of creatures) {
      expect(creature.defaultScriptId, creature.id).toBe(ROLES[creature.id])
    }
  })

  it('the 54 creatures and 3 bosses split 27 striker / 10 warden / 2 guardian / 10 caster / 3 support / 4 opener / 1 taunter (Snapjaw Lure)', () => {
    const counts = new Map<string, number>()
    for (const { creature, biomeNumber } of creatures) {
      if (biomeNumber === null) continue // starters have their own rows
      counts.set(
        creature.defaultScriptId,
        (counts.get(creature.defaultScriptId) ?? 0) + 1,
      )
    }
    // Starters are excluded: they have their own rows above (the Stonehorn Warden starter is a
    // warden since 4.1-H2c; Snapjaw Lure is the only taunter).
    expect(Object.fromEntries(counts)).toEqual({
      striker: 27,
      warden: 10,
      guardian: 2,
      caster: 10,
      support: 3,
      opener: 4,
      taunter: 1,
    })
  })

  it('every defaultScriptId is a shipped role script, and none is an always-* script', () => {
    for (const { creature } of creatures) {
      expect(STOCK_SCRIPTS_BY_ID.has(creature.defaultScriptId), creature.id).toBe(true)
      expect(creature.defaultScriptId.startsWith('always-'), creature.id).toBe(false)
    }
  })

  it('the cast roles generation checks are exactly caster, support and opener, and all are shipped scripts', () => {
    expect([...CAST_ROLE_SCRIPT_IDS]).toEqual(['caster', 'support', 'opener'])
    for (const id of CAST_ROLE_SCRIPT_IDS) expect(STOCK_SCRIPTS_BY_ID.has(id)).toBe(true)
  })
})

describe('spell pools back every role (Phase 4.1-G1, D4)', () => {
  const AFFINITIES: readonly Affinity[] = [
    'vitality',
    'violence',
    'wit',
    'endurance',
    'instinct',
  ]

  it('every affinity has at least three spells unlocked at biome 1, so any enemy rolls a full distinct set of three', () => {
    for (const affinity of AFFINITIES) {
      const pool = spellsUnlockedAt(1, ALL_SPELLS).filter((s) => canEquip(s, affinity))
      expect(pool.length, affinity).toBeGreaterThanOrEqual(3)
    }
  })

  it('every cast-role creature has a usable (affinity-matched, unlocked) spell at its own biome', () => {
    for (const { creature, biomeNumber } of allCreatures()) {
      if (biomeNumber === null) continue
      if (!CAST_ROLE_SCRIPT_IDS.includes(creature.defaultScriptId)) continue
      const pool = spellsUnlockedAt(biomeNumber, ALL_SPELLS).filter((s) =>
        canEquip(s, creature.affinity),
      )
      expect(pool.length, creature.id).toBeGreaterThan(0)
    }
  })
})
