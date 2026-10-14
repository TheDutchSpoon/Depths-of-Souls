import type { FightRecord } from '../state/store'

/** `createCombat`'s input without `registries`, so a test reproduces the fight with
 * `createCombat({ ...JSON.parse(json), registries })`. Plain `JSON.stringify` drops `undefined`
 * keys and turns non-finite numbers into `null`: the round-trip test is what shows the shape
 * survives. */
export function fightToJson(record: FightRecord): string {
  return JSON.stringify(
    {
      seed: record.seed,
      player: { party: record.playerParty, effects: record.playerEffects },
      enemy: { party: record.enemyParty },
    },
    null,
    2,
  )
}
