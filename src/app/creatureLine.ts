import type { BalanceConfig } from '../engine/balance-types'
import type { Trait } from '../engine/effect-types'
import type { SpeciesCreature } from '../engine/generation'
import { xpForNextLevel } from '../engine/leveling'
import type { Spell } from '../engine/types'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { ALL_CREATURE_TEMPLATES } from '../data/creatures'
import { DEFAULT_REGISTRIES } from '../data/registries'
import { ALL_SPELLS } from '../data/spells'
import { staticCreatureIdFor } from '../state/rewards'
import type { Instance } from '../state/rewards'
import { DEMO_NAMES } from './names'

/** What a creature line is derived from: the data tables a stored instance is read through
 * (`spec/creatures.md#instance`), and the config the store was built with. */
export interface HubContext {
  readonly names: ReadonlyMap<string, string>
  readonly templates: ReadonlyMap<string, SpeciesCreature>
  readonly traits: ReadonlyMap<string, Trait>
  readonly spells: ReadonlyMap<string, Spell>
  readonly config: BalanceConfig
}

export const HUB_CONTEXT: HubContext = {
  names: DEMO_NAMES,
  templates: new Map(ALL_CREATURE_TEMPLATES.map((template) => [template.id, template])),
  traits: DEFAULT_REGISTRIES.traits,
  spells: new Map(ALL_SPELLS.map((spell) => [spell.id, spell])),
  config: DEFAULT_BALANCE_CONFIG,
}

export const EMPTY_GEM = 'empty'

export interface CreatureLine {
  readonly label: string
  /** XP into the current level over the XP the next level needs. */
  readonly xp: string
  readonly affinity: string
  readonly rarity: string
  /** The role script's id: scripts have no name. */
  readonly script: string
  readonly traits: readonly string[]
  /** One entry per regular gem slot, by spell name; a slot with no gem reads `EMPTY_GEM`. */
  readonly gems: readonly string[]
}

function capitalized(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function lookup<T>(table: ReadonlyMap<string, T>, id: string, what: string): T {
  const found = table.get(id)
  if (found === undefined) throw new Error(`creatureLine: no ${what} ${id}`)
  return found
}

/** A miss anywhere throws: the id is never a fallback label. */
export function creatureLine(
  instance: Instance,
  label: string,
  ctx: HubContext,
): CreatureLine {
  const template = lookup(ctx.templates, staticCreatureIdFor(instance), 'template')
  return {
    label,
    xp: `${instance.xp} / ${xpForNextLevel(instance.level, ctx.config)}`,
    affinity: capitalized(template.affinity),
    rarity: capitalized(template.rarity),
    script: instance.scriptId ?? template.defaultScriptId,
    traits: template.innateTraitIds.map((id) => lookup(ctx.traits, id, 'trait').name),
    gems: instance.gems.map((id) =>
      id === null ? EMPTY_GEM : lookup(ctx.spells, id, 'spell').name,
    ),
  }
}

function listOrNone(items: readonly string[]): string {
  return items.length === 0 ? 'none' : items.join(', ')
}

export function creatureLineText(line: CreatureLine): string {
  return [
    line.label,
    `XP ${line.xp}`,
    line.affinity,
    line.rarity,
    `script ${line.script}`,
    `traits ${listOrNone(line.traits)}`,
    `gems ${listOrNone(line.gems)}`,
  ].join(' | ')
}
