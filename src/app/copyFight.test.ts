import { describe, expect, test } from 'vitest'
import { createCombat, resolveFight } from '../engine/combat'
import { DEFAULT_REGISTRIES } from '../data/registries'
import { resolvePerkEffects, SPECIALIZATIONS_BY_ID } from '../data/specializations'
import { createGameStore } from '../state/store'
import { fightToJson } from './copyFight'
import { startRun } from './startRun'

describe('fightToJson', () => {
  // One perk per spec whose effects change the log: Bulwark, the Shieldbarer's first, only
  // shortens damage taken per Defend and leaves these floor-1 fights as they were.
  const PERKS = [
    ['sorcerer', 'echo'],
    ['brute', 'flurry'],
    ['shieldbarer', 'armor-piercer'],
  ] as const
  test.each(PERKS)(
    '%s: every fight of a descent with a perk bought replays from its JSON',
    (specId, perkId) => {
      const store = createGameStore()
      startRun(store.getState(), specId, '99')
      store.getState().recordBossKill('broodmother')
      // Bought in full: its effects ride in the record.
      const perk = SPECIALIZATIONS_BY_ID.get(specId)!.perks.find((p) => p.id === perkId)!
      expect(resolvePerkEffects(perk, perk.maxLevel).length).toBeGreaterThan(0)
      expect(store.getState().setPerkLevel(perk.id, perk.maxLevel)).toEqual({ ok: true })

      const run = store.getState().descend(1)
      expect(run.ok).toBe(true)
      if (!run.ok) return
      let differsWithoutEffects = 0
      for (const record of run.outcome.fightRecords) {
        expect(record.playerEffects.length).toBeGreaterThan(0)
        const parsed = JSON.parse(fightToJson(record))
        expect(Object.keys(parsed).sort()).toEqual(['enemy', 'player', 'seed'])
        const replay = resolveFight(
          createCombat({ ...parsed, registries: DEFAULT_REGISTRIES }),
        )
        expect(replay.events).toEqual(record.events)

        const withoutEffects = resolveFight(
          createCombat({
            ...parsed,
            player: { party: parsed.player.party },
            registries: DEFAULT_REGISTRIES,
          }),
        )
        if (JSON.stringify(withoutEffects.events) !== JSON.stringify(record.events)) {
          differsWithoutEffects += 1
        }
      }
      // The check is sensitive: leaving the effects out changes at least one fight.
      expect(differsWithoutEffects).toBeGreaterThan(0)
    },
  )

  test('the JSON carries exactly the seed, both parties and the player effects', () => {
    const store = createGameStore()
    startRun(store.getState(), 'sorcerer', '5')
    const run = store.getState().descend(1)
    if (!run.ok) throw new Error('descent refused')
    const record = run.outcome.fightRecords[0]!
    const parsed = JSON.parse(fightToJson(record))
    expect(parsed.seed).toBe(record.seed)
    expect(parsed.player.party).toHaveLength(record.playerParty.length)
    expect(parsed.player.effects).toEqual(record.playerEffects)
    expect(parsed.enemy.party).toHaveLength(record.enemyParty.length)
    expect(parsed.enemy.effects).toBeUndefined()
  })
})
