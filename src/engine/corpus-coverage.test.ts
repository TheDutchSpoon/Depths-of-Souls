// Phase 4.1-D2 (PR #74 review, ASSUMPTION 40): the corpus digest only protects what its corpus
// exercises, so this test enforces that the corpus covers ALL real content, against the
// registries (never hand-copied lists), so new content is covered or fails loudly:
//   - every spell in ALL_SPELLS is cast, with its effects landing;
//   - every status in STATUS_REGISTRY is applied;
//   - every specialization perk with effects MATTERS: re-running its fight with only that perk
//     removed changes the event log.
// Anything no shipped content can reach sits on an explicit exemption list with its reason. An
// exempt item that IS covered fails the test, so an exemption cannot outlive its reason.

import { describe, expect, it } from 'vitest'
import { resolveFight } from './combat'
import { PERK_FIGHT_VARIANTS, buildCorpus, createCorpusCombat } from './__corpus__/corpus'
import type { CorpusFight } from './__corpus__/corpus'
import { ALL_SPELLS } from '../data/spells'
import { STATUS_REGISTRY } from '../data/statuses'
import { SPECIALIZATIONS, resolvePerkEffects } from '../data/specializations'
import type { CombatEvent, Spell } from './types'

/** Statuses no shipped content can apply yet, each with its reason. */
const STATUS_EXEMPTIONS: ReadonlyMap<string, string> = new Map([
  [
    'stun',
    "applied only by the Phase-3 mechanism trait 'reeling' (data/traits/core.ts), which is in the " +
      'trait registry but carried by no shipped creature; no spell, perk or species trait applies it',
  ],
])

/** Perks whose effect cannot show in any fight yet, each with its reason. */
const PERK_EXEMPTIONS: ReadonlyMap<string, string> = new Map([
  [
    'clear-mind',
    "immunity to 'silenced', which is not authored until 4.1-F: nothing to be immune to, so " +
      'removing the perk changes nothing. 4.1-F must drop this entry',
  ],
  [
    'aggressive',
    "immunity to 'pacified', which is not authored until 4.1-F (Clear Mind's mirror): nothing " +
      'to be immune to. 4.1-F must drop this entry',
  ],
])

interface ResolvedFight {
  readonly fight: CorpusFight
  /** Each side's creatures as `createCombat` left them (innate spells prepended), by id. */
  readonly spellsByCaster: ReadonlyMap<string, readonly (Spell | null)[]>
  readonly events: readonly CombatEvent[]
}

function resolve(fight: CorpusFight): ResolvedFight {
  const state = createCorpusCombat(fight)
  const spellsByCaster = new Map(
    [...state.playerParty, ...state.enemyParty].map((c) => [
      c.id as string,
      c.equippedSpells,
    ]),
  )
  return { fight, spellsByCaster, events: resolveFight(state).events }
}

/** Do all of `spell`'s effects show up as consequence events of the cast at `events[at]`? The
 * window runs from the cast to the next cast or turn end (an echo or bonus cast opens its own). */
function castLanded(events: readonly CombatEvent[], at: number, spell: Spell): boolean {
  const cast = events[at]
  if (cast?.type !== 'SpellCast') throw new Error('castLanded: not a SpellCast')
  const casterId = cast.casterId
  const targets: readonly string[] =
    cast.targetShape === 'single' ? [cast.targetId] : cast.targetIds
  let end = at + 1
  while (end < events.length) {
    const t = events[end]!.type
    if (t === 'TurnEnded' || t === 'SpellCast') break
    end++
  }
  const window = events.slice(at + 1, end)
  const hits = (targetId: string, target: { kind: string }): boolean =>
    target.kind === 'self' ? targetId === casterId : targets.includes(targetId)

  return spell.effects.every((effect) => {
    switch (effect.kind) {
      case 'deal-damage':
        return window.some(
          (e) =>
            e.type === 'DamageDealt' &&
            e.sourceId === casterId &&
            e.damageSource === 'cast' &&
            hits(e.targetId, effect.target),
        )
      case 'heal':
        // a real heal: a wounded target, so the amount is above zero
        return window.some(
          (e) =>
            e.type === 'HealApplied' &&
            e.sourceId === casterId &&
            e.amount > 0 &&
            hits(e.targetId, effect.target),
        )
      case 'apply-status':
        return window.some(
          (e) =>
            e.type === 'StatusApplied' &&
            e.statusId === effect.status.statusId &&
            hits(e.targetId, effect.target),
        )
      case 'apply-stat-modifier':
        return window.some(
          (e) =>
            e.type === 'StatModifierApplied' &&
            e.sourceId === casterId &&
            e.stat === effect.stat &&
            e.factor === effect.factor &&
            hits(e.targetId, effect.target),
        )
      default:
        // A new spell effect kind needs its own landing rule here, not a silent pass.
        throw new Error(
          `corpus coverage: no landing rule for spell effect kind "${effect.kind}"`,
        )
    }
  })
}

/** A fight's event log as a string, with a perk effect's positional id ('perk-7') made anonymous:
 * the ids count the player's effects, so removing one perk renumbers every later one, which is
 * not the removed perk mattering. A trigger firing or not, a changed number or a changed draw all
 * still show. */
function logOf(fight: CorpusFight): string {
  return JSON.stringify(resolve(fight).events, (key, value: unknown) =>
    key === 'effectId' && typeof value === 'string' && /^perk-\d+$/.test(value)
      ? 'perk'
      : value,
  )
}

const resolved = buildCorpus().map(resolve)

describe('corpus coverage (Phase 4.1-D2)', () => {
  it('every spell in ALL_SPELLS is cast with its effects landing', () => {
    const landed = new Set<string>()
    for (const { spellsByCaster, events } of resolved) {
      events.forEach((e, at) => {
        if (e.type !== 'SpellCast') return
        const spell = spellsByCaster.get(e.casterId)?.[e.gemSlot]
        if (!spell)
          throw new Error(`SpellCast from ${e.casterId} slot ${e.gemSlot}: no spell`)
        if (castLanded(events, at, spell)) landed.add(spell.id)
      })
    }
    const missing = ALL_SPELLS.filter((s) => !landed.has(s.id)).map((s) => s.id)
    expect(missing, 'spells never cast with all their effects landing').toEqual([])
  })

  it('every status in STATUS_REGISTRY is applied, except the reasoned exemptions', () => {
    const applied = new Set<string>()
    for (const { events } of resolved) {
      for (const e of events) if (e.type === 'StatusApplied') applied.add(e.statusId)
    }
    const ids = [...STATUS_REGISTRY.keys()]
    expect(
      ids.filter((id) => !applied.has(id) && !STATUS_EXEMPTIONS.has(id)),
      'statuses never applied',
    ).toEqual([])
    expect(
      [...STATUS_EXEMPTIONS.keys()].filter((id) => !ids.includes(id) || applied.has(id)),
      'status exemptions that are stale (unregistered, or now applied): drop them',
    ).toEqual([])
  })

  it('every damage-modifier status is exercised: its bearer deals or takes damage while it holds', () => {
    // Applying Weaken or Vulnerability is not enough for the digest to see its magnitude: the
    // bearer must also deal (a 'dealt' modifier) or take (a 'taken' one) damage before it ends.
    const exercised = new Set<string>()
    for (const { events } of resolved) {
      const held = new Map<string, 'dealt' | 'taken'>() // "creature|status" -> direction
      for (const e of events) {
        if (e.type === 'StatusApplied') {
          const def = STATUS_REGISTRY.get(e.statusId)
          if (def?.category === 'damage-modifier')
            held.set(e.targetId + '|' + e.statusId, def.direction)
        } else if (e.type === 'StatusExpired') {
          held.delete(e.creatureId + '|' + e.statusId)
        } else if (e.type === 'DamageDealt') {
          for (const [key, direction] of held) {
            const [creatureId, statusId] = key.split('|') as [string, string]
            if (creatureId === (direction === 'dealt' ? e.sourceId : e.targetId)) {
              exercised.add(statusId)
            }
          }
        }
      }
    }
    const modifiers = [...STATUS_REGISTRY.values()].filter(
      (d) => d.category === 'damage-modifier',
    )
    expect(
      modifiers.map((d) => d.statusId).filter((id) => !exercised.has(id)),
      'damage-modifier statuses never exercised in damage',
    ).toEqual([])
  })

  it('every perk with effects matters: removing it alone changes its fight', () => {
    const mattersIn = new Map<string, string[]>()
    for (const spec of SPECIALIZATIONS) {
      const variants = PERK_FIGHT_VARIANTS.filter((v) => v.spec.id === spec.id)
      const whole = variants.map((v) => logOf(v.build()))
      for (const perk of spec.perks) {
        if (resolvePerkEffects(perk, perk.maxLevel).length === 0) continue
        const where = variants
          .filter((v, i) => logOf(v.build(perk.id)) !== whole[i])
          .map((v) => v.id)
        mattersIn.set(perk.id, where)
      }
    }
    const matters = (id: string): boolean => (mattersIn.get(id) ?? []).length > 0
    expect(
      [...mattersIn.keys()].filter((id) => !matters(id) && !PERK_EXEMPTIONS.has(id)),
      'perks whose removal changes no fight',
    ).toEqual([])
    const allPerkIds = SPECIALIZATIONS.flatMap((s) => s.perks.map((p) => p.id))
    expect(
      [...PERK_EXEMPTIONS.keys()].filter((id) => !allPerkIds.includes(id) || matters(id)),
      'perk exemptions that are stale (unregistered, or now mattering): drop them',
    ).toEqual([])
  })
})
