import type { SpeciesCreature } from '../engine/generation'
import { ALL_CREATURE_TEMPLATES, BOSS_CREATURES_BY_ID } from '../data/creatures'

/** Template id to display name. A creature's name comes from its `origin.templateId`, never from
 * parsing a `CreatureId`. */
export function buildNameTable(
  creatures: readonly SpeciesCreature[],
): ReadonlyMap<string, string> {
  return new Map(creatures.map((creature) => [creature.id, creature.name]))
}

export const DEMO_NAMES = buildNameTable(ALL_CREATURE_TEMPLATES)

/** Throws on a miss: a creature the table can't name is a data drift to surface, and the id is
 * never a fallback label. */
export function creatureName(
  table: ReadonlyMap<string, string>,
  templateId: string,
): string {
  const name = table.get(templateId)
  if (name === undefined)
    throw new Error(`creatureName: no name for template ${templateId}`)
  return name
}

/** The display name of the boss a `bossDefeated` id names. */
export function bossName(bossId: string): string {
  const boss = BOSS_CREATURES_BY_ID.get(bossId)
  if (boss === undefined) throw new Error(`bossName: no boss ${bossId}`)
  return boss.name
}
