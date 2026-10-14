import { createCombat } from '../engine/combat'
import type { CreateCombatRegistries } from '../engine/combat'
import type { CreatureId } from '../engine/ids'
import type { Creature, Side } from '../engine/types'
import type { FightRecord } from '../state/store'
import { creatureName } from './names'

/** Names every creature of a fight. Names are counted over both parties together: a name seen
 * more than once gets its side and 1-based slot on every occurrence, a unique name prints bare.
 * The number is the creature's own `slot`,
 * the field the engine itself breaks ties and adjacency on, not its array position. */
export function labelCreatures(
  playerParty: readonly Creature[],
  enemyParty: readonly Creature[],
  names: ReadonlyMap<string, string>,
): ReadonlyMap<CreatureId, string> {
  const all = [...playerParty, ...enemyParty]
  const counts = new Map<string, number>()
  for (const creature of all) {
    const name = creatureName(names, creature.origin.templateId)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const labels = new Map<CreatureId, string>()
  for (const creature of all) {
    const name = creatureName(names, creature.origin.templateId)
    const side = creature.side === 'player' ? 'ally' : 'foe'
    labels.set(
      creature.id,
      counts.get(name)! > 1 ? `${name} (${side} ${creature.slot + 1})` : name,
    )
  }
  return labels
}

export interface LineUpEntry {
  readonly side: Side
  readonly label: string
  readonly level: number
  readonly hp: number
}

/** What the viewer reads about one fight, from the fight as `createCombat` sets it up. The
 * record's parties are fight-setup input: setup prepends innate spells to `equippedSpells`
 * (`spec/creatures.md#innate-spells`, so a `SpellCast`'s gem slot counts them) and sets HP to
 * effective max Health (`spec/statuses.md#health-is-a-modifiable-stat`). */
export interface FightView {
  /** Throws on an id in neither party: every event id belongs to one of them. */
  label(id: CreatureId): string
  readonly lineUp: readonly LineUpEntry[]
  /** Throws when the caster has no spell in that slot. */
  spellName(casterId: CreatureId, gemSlot: number): string
}

export function buildFightView(
  record: FightRecord,
  registries: CreateCombatRegistries,
  names: ReadonlyMap<string, string>,
): FightView {
  const setUp = createCombat({
    seed: record.seed,
    player: { party: record.playerParty, effects: record.playerEffects },
    enemy: { party: record.enemyParty },
    registries,
  })
  const creatures = [...setUp.playerParty, ...setUp.enemyParty]
  const labels = labelCreatures(setUp.playerParty, setUp.enemyParty, names)
  const label = (id: CreatureId): string => {
    const found = labels.get(id)
    if (found === undefined) throw new Error(`label: creature ${id} is in neither party`)
    return found
  }
  return {
    label,
    lineUp: creatures.map((creature) => ({
      side: creature.side,
      label: label(creature.id),
      level: creature.level,
      hp: creature.currentHp,
    })),
    spellName(casterId, gemSlot) {
      const caster = creatures.find((creature) => creature.id === casterId)
      if (!caster) throw new Error(`spellName: creature ${casterId} is in neither party`)
      const spell = caster.equippedSpells[gemSlot]
      if (!spell)
        throw new Error(`spellName: ${casterId} has no spell in slot ${gemSlot}`)
      return spell.name
    },
  }
}

/** The line-up split by side, each in line-up order. */
export function splitLineUp(lineUp: readonly LineUpEntry[]): {
  readonly allies: readonly LineUpEntry[]
  readonly foes: readonly LineUpEntry[]
} {
  return {
    allies: lineUp.filter((entry) => entry.side === 'player'),
    foes: lineUp.filter((entry) => entry.side === 'enemy'),
  }
}

export function lineUpText(entry: LineUpEntry): string {
  return `${entry.label}: level ${entry.level}, ${entry.hp} HP`
}
