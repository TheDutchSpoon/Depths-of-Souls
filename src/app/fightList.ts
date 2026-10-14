import type { FightRecord } from '../state/store'
import { labelCreatures } from './fightView'

export interface FightRow {
  readonly number: number
  readonly result: FightRecord['result']
  readonly rounds: number
  readonly kills: number
  readonly xp: number
  /** `"<label> 1 -> 2"`, one per creature whose level rose after this fight. */
  readonly levelUps: readonly string[]
}

function fightRow(
  record: FightRecord,
  index: number,
  names: ReadonlyMap<string, string>,
): FightRow {
  const labels = labelCreatures(record.playerParty, record.enemyParty, names)
  // The side is read from the parties by exact id, the same events rewards read
  // (`spec/run.md#rewards-are-a-run-layer-consumer-of-the-event-log`).
  const enemyIds = new Set<string>(record.enemyParty.map((creature) => creature.id))
  let rounds = 0
  let kills = 0
  for (const event of record.events) {
    if (event.type === 'RoundStarted') rounds += 1
    if (event.type === 'CreatureDied' && enemyIds.has(event.creatureId)) kills += 1
  }
  const levelUps: string[] = []
  record.playerParty.forEach((creature, i) => {
    const after = record.partyLevelsAfter[i]!
    if (after > creature.level) {
      levelUps.push(`${labels.get(creature.id)!} ${creature.level} → ${after}`)
    }
  })
  return {
    number: index + 1,
    result: record.result,
    rounds,
    kills,
    // The record's own figure: recomputing from kills would drift from what the store banked.
    xp: record.xpBanked,
    levelUps,
  }
}

export function fightRows(
  records: readonly FightRecord[],
  names: ReadonlyMap<string, string>,
): FightRow[] {
  return records.map((record, index) => fightRow(record, index, names))
}

export interface FightHeader {
  readonly title: string
  /** The party's levels going into the fight, from the record's party. */
  readonly levelsIn: readonly string[]
  /** The fight's row: its XP and level-ups after the fight, from the one helper the list uses. */
  readonly row: FightRow
}

/** `fights` is the floor's fight count, so a floor lost early still reads "Fight 2 / 5". */
export function fightHeader(
  record: FightRecord,
  index: number,
  fights: number,
  names: ReadonlyMap<string, string>,
): FightHeader {
  const labels = labelCreatures(record.playerParty, record.enemyParty, names)
  return {
    title: `Fight ${index + 1} / ${fights}`,
    levelsIn: record.playerParty.map(
      (creature) => `${labels.get(creature.id)!}: level ${creature.level}`,
    ),
    row: fightRow(record, index, names),
  }
}
