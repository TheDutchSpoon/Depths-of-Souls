// Phase 4.1-H1 (D1): the deterministic balance simulator. It drives the REAL store (`newGame`,
// `setSpec`, `runScriptedIntro`, `descend`, `summon`, `setPartySlot`, `setPerkLevel`) with the
// documented player policy below, over a fixed list of seeds, and builds a plain-data report of the
// design targets (T1-T5), the 4.1-H watch points and ASSUMPTION 22's thresholds. It REPORTS; it
// asserts nothing (the CI threshold test is 4.1-H2d's). It changes no number and no file under src/.
//
// Run the full report with `npm run sim` (vitest in `--mode sim`, the corpus pattern).
//
// ---- The player policy (brief ASSUMPTIONS 21, 96-102) ----
// One run = one spec x one seed: `newGame({ seed })`, `setSpec`, `runScriptedIntro`, then a loop of
// FLOOR RUNS (one `descend` each) until the seed clears the content frontier (`frontier`) or
// reaches RUN_CAP floor runs (`cap`).
//  - Which floor (ASSUMPTION 97): after a clear, push to `deepestFloor + 1`. After a FAILED PUSH the
//    next run re-farms `deepestFloor`; while `deepestFloor` is 0 there is nothing to re-farm, so a
//    failed floor-1 push is retried (floor 1 is `deepestFloor + 1` again: a push).
//  - Hard wall (ASSUMPTION 98): WALL_FAILED_PUSHES failed pushes at one floor, re-farm runs
//    between them not resetting the count. A walled seed KEEPS GOING; the simulator records the
//    first wall floor and the failed-push count per floor.
//  - After every run (and once before the first): (1) summon every creature id whose soul has
//    reached 100%, once per id, the first time (ASSUMPTION 96; ids already owned start in the
//    set; a pass walks `soulProgress` in key order); (2) set the party to the six highest-level
//    instances, ordered level descending then instance ordinal ascending, through `setPartySlot`
//    (ASSUMPTION 99); (3) refund and re-buy perks from scratch: each FUNCTIONAL perk (its
//    max-level effects are non-empty) in data order takes the most levels the remaining budget
//    allows, then the next (ASSUMPTION 100).
//  - Boss-floor lock probe (ASSUMPTION 101): before every run on a boss floor the simulator
//    snapshots the store state, runs the same floor once with the probe creature on its own script
//    plus `Cast <Pacify's slot> -> highest-hp-enemy` as the FIRST rule, restores the snapshot, and
//    only then plays the policy run. The policy run is the only one that advances the seed, and
//    both fight the identical floor (the floor's draw derives from `runSeed` and `runCounter`,
//    which the restore returns). The probe creature is the active-party instance with the highest
//    level (ties: ordinal) whose STORED gems already hold Pacify; its gems are never edited; no
//    such creature means the probe is `n/a`. The probe scripts are registered up front in the
//    store's script registry; a script nothing references is inert, and a test proves it.
//
// ---- The report's thresholds (ASSUMPTIONS 22, 107, 108) ----
// Read over the seeds of one spec: floor 1 = the first-try floor-1 clear rate (fails below 80%);
// first soul = the median over EVERY seed of the floor runs until a soul first reaches 100%, a seed
// that never completes one counting as infinite (fails above 30); floor 5 = some seed fought on
// floor 5 or deeper in its first FLOOR5_WINDOW_RUNS (20) floor runs (ASSUMPTION 126; T3's "first
// session" stays 10 floor runs). The walls' size (ASSUMPTION 108) is reported as the
// most failed pushes on one floor below 10 and the floor runs to the first floor-10 clear.
//
// Nothing here is pinned to a balance value: the simulator runs the store's default config, and
// the tuning passes (H2c, then H2d) move those numbers.

import type { BalanceConfig } from '../engine/balance-types'
import { ROUND_CAP, MAX_REVIVES_PER_CREATURE } from '../engine/config'
import type { StatusDef } from '../engine/effect-types'
import {
  biomeForFloor,
  contentFrontier,
  isBossFloor,
  type BiomeData,
  type SpeciesCreature,
} from '../engine/generation'
import type { BiomeId } from '../engine/ids'
import { bossLevel, enemyLevelRange, fightCount } from '../engine/curves'
import type { Rule, Script } from '../engine/scripting-types'
import type { CombatEvent } from '../engine/types'
import { BIOMES } from '../data/biomes'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import {
  resolvePerkEffects,
  SPECIALIZATIONS,
  SPECIALIZATIONS_BY_ID,
  type PerkDef,
  type Specialization,
} from '../data/specializations'
import {
  BRUTE_STARTER,
  SHIELDBARER_STARTER,
  SORCERER_STARTER,
  UNICORN,
} from '../data/species/starters'
import { STATUS_REGISTRY } from '../data/statuses'
import { TRAIT_REGISTRY } from '../data/traits'
import type { InstanceId } from './ids'
import { perkPointsFor, staticCreatureIdFor, type Instance } from './rewards'
import { createGameStore, PARTY_SIZE } from './store'
import type { GameActions, GameState } from './store'

// ---- Named constants ----

/** The fixed seed list of the full report (ASSUMPTION 105): 1..40. */
export const SIM_SEEDS: readonly number[] = Array.from({ length: 40 }, (_, i) => i + 1)
/** The normal suite's determinism seeds (ASSUMPTION 105). */
export const SMOKE_SEEDS: readonly number[] = [1, 2, 3]
/** A seed stops after this many floor runs (ASSUMPTION 98). */
export const RUN_CAP = 400
/** A hard wall: this many failed pushes at one floor (ASSUMPTION 98). */
export const WALL_FAILED_PUSHES = 5
/** "The first session" = the first this many floor runs (T3, ASSUMPTION 22). */
export const FIRST_SESSION_RUNS = 10
/** ASSUMPTION 126: the window the floor-5 threshold reads (was FIRST_SESSION_RUNS, 10, until the H2
 * grill). It is NOT the session: T3's party size is still read after FIRST_SESSION_RUNS. */
export const FLOOR5_WINDOW_RUNS = 20
/** ASSUMPTION 127: the matchup table covers fights on floors 1 to this one. */
export const MATCHUP_MAX_FLOOR = 5
/** How many traits per stack bucket the report prints. */
export const TOP_TRAIT_STACKS = 5
/** ASSUMPTION 107: the floor the third threshold asks a seed to reach within FLOOR5_WINDOW_RUNS. */
export const SESSION_TARGET_FLOOR = 5
/** The first boss floor: T4's "no wall before the floor-10 boss" and ASSUMPTION 108's measures. */
export const FIRST_BOSS_FLOOR = 10
export const PACIFY_SPELL_ID = 'pacify'
export const PACIFIED_STATUS_ID = 'pacified'
/** Highest cast slot a probe script is registered for (3 gem slots + up to 5 innate spells). */
const MAX_PROBE_SLOT = 8

// ---- Types: policy ----

export type RunKind = 'push' | 'farm'
export type StopReason = 'frontier' | 'cap'
export type LockScope = 'all' | 'attack' | 'cast'

export interface Progress {
  readonly runs: number
  readonly deepestFloor: number
  /** True iff the last run was a push that failed. */
  readonly lastRunFailedPush: boolean
  /** Failed pushes per floor (only floors with at least one). */
  readonly failedPushes: Readonly<Record<number, number>>
  readonly firstWallFloor: number | null
}

export const INITIAL_PROGRESS: Progress = {
  runs: 0,
  deepestFloor: 0,
  lastRunFailedPush: false,
  failedPushes: {},
  firstWallFloor: null,
}

/** ASSUMPTIONS 107, 126: one of the first FLOOR5_WINDOW_RUNS floor runs was on floor
 * SESSION_TARGET_FLOOR or deeper (fighting on it, not clearing it). Read from the finished runs, so a
 * seed that stops before the window (a small run cap) still gets the right value. */
export function reachedFloorInWindow(runs: readonly Pick<RunRecord, 'floor'>[]): boolean {
  return runs.slice(0, FLOOR5_WINDOW_RUNS).some((r) => r.floor >= SESSION_TARGET_FLOOR)
}

/** ASSUMPTION 97: the next run's floor and kind. */
export function nextRun(progress: Progress): { floor: number; kind: RunKind } {
  if (progress.lastRunFailedPush && progress.deepestFloor >= 1) {
    return { floor: progress.deepestFloor, kind: 'farm' }
  }
  return { floor: progress.deepestFloor + 1, kind: 'push' }
}

/** ASSUMPTION 98: why a seed stops, or null to keep going. */
export function stopReason(
  progress: Progress,
  frontier: number,
  runCap: number,
): StopReason | null {
  if (progress.deepestFloor >= frontier) return 'frontier'
  if (progress.runs >= runCap) return 'cap'
  return null
}

/** Folds one floor run's result into the progress (pure). */
export function advanceProgress(
  progress: Progress,
  floor: number,
  kind: RunKind,
  cleared: boolean,
): Progress {
  const failedPush = kind === 'push' && !cleared
  const failedPushes = failedPush
    ? { ...progress.failedPushes, [floor]: (progress.failedPushes[floor] ?? 0) + 1 }
    : progress.failedPushes
  const firstWallFloor =
    progress.firstWallFloor === null &&
    failedPush &&
    (failedPushes[floor] ?? 0) >= WALL_FAILED_PUSHES
      ? floor
      : progress.firstWallFloor
  return {
    runs: progress.runs + 1,
    deepestFloor: cleared
      ? Math.max(progress.deepestFloor, floor)
      : progress.deepestFloor,
    lastRunFailedPush: failedPush,
    failedPushes,
    firstWallFloor,
  }
}

/** ASSUMPTION 99: the six highest-level instances, level descending then ordinal ascending. */
export function orderedParty(
  collection: ReadonlyMap<InstanceId, Instance>,
): readonly InstanceId[] {
  return [...collection.values()]
    .sort((a, b) => b.level - a.level || ordinalOf(a.id) - ordinalOf(b.id))
    .slice(0, PARTY_SIZE)
    .map((instance) => instance.id)
}

function ordinalOf(id: InstanceId): number {
  return Number(String(id).slice('inst-'.length))
}

/** ASSUMPTION 100: a perk is functional when its max-level effects are non-empty (the rule the
 * data test pins for the nine inert Phase 8 perks). */
export function isFunctionalPerk(perk: PerkDef): boolean {
  return resolvePerkEffects(perk, perk.maxLevel).length > 0
}

/** ASSUMPTION 100: the greedy purchase from scratch -- each functional perk in data order takes
 * the most levels the remaining budget allows (up to its max), then the next. Only perks with at
 * least one level are listed. */
export function planPerkLevels(
  spec: Specialization,
  budget: number,
): readonly { readonly perkId: string; readonly level: number }[] {
  const plan: { perkId: string; level: number }[] = []
  let remaining = budget
  for (const perk of spec.perks) {
    if (!isFunctionalPerk(perk)) continue
    const level = Math.min(perk.maxLevel, Math.floor(remaining / perk.costPerLevel))
    if (level <= 0) continue
    plan.push({ perkId: perk.id, level })
    remaining -= level * perk.costPerLevel
  }
  return plan
}

// ---- Static creature lookup (the store's standalone list, mirrored for the probe) ----

const STANDALONE_CREATURES: readonly SpeciesCreature[] = [
  SORCERER_STARTER,
  BRUTE_STARTER,
  SHIELDBARER_STARTER,
  UNICORN,
]

function speciesCreatureFor(creatureId: string): SpeciesCreature | undefined {
  const standalone = STANDALONE_CREATURES.find((c) => c.id === creatureId)
  if (standalone) return standalone
  for (const biome of BIOMES) {
    for (const species of biome.speciesPool) {
      const found = species.creatures.find((c) => c.id === creatureId)
      if (found) return found
    }
  }
  return undefined
}

/** How many `innate-spell` effects a creature's innate traits carry: `createCombat` prepends them
 * to the gem slots, so stored gem N is cast slot `innateSpellCount + N` (ASSUMPTION 101). */
export function innateSpellCount(creature: SpeciesCreature): number {
  let count = 0
  for (const traitId of creature.innateTraitIds) {
    const trait = TRAIT_REGISTRY.get(traitId)
    if (!trait) continue
    for (const effect of trait.effects) {
      if (effect.category === 'innate-spell') count += 1
    }
  }
  return count
}

// ---- The probe: scripts, creature choice ----

export function probeScriptId(baseScriptId: string, castSlot: number): string {
  return `sim-probe/${baseScriptId}/${castSlot}`
}

const PROBE_FIRST_RULE = (castSlot: number): Rule => ({
  condition: { kind: 'always' },
  action: { kind: 'cast', gemSlot: castSlot },
  targeting: { kind: 'highest-hp-enemy' },
})

/** The stock registry plus one probe script per (stock script, cast slot): the creature's own
 * script with the Pacify cast added as the FIRST rule (ASSUMPTION 101). */
export function buildSimScripts(
  base: ReadonlyMap<string, Script> = STOCK_SCRIPTS_BY_ID,
): ReadonlyMap<string, Script> {
  const scripts = new Map(base)
  for (const [id, script] of base) {
    for (let slot = 0; slot <= MAX_PROBE_SLOT; slot++) {
      const probeId = probeScriptId(id, slot)
      scripts.set(probeId, {
        id: probeId,
        rules: [PROBE_FIRST_RULE(slot), ...script.rules],
      })
    }
  }
  return scripts
}

export interface ProbeChoice {
  readonly instanceId: InstanceId
  readonly castSlot: number
  readonly baseScriptId: string
}

/** ASSUMPTION 101: the active-party instance with the highest level (ties: ordinal) whose STORED
 * gems already hold Pacify; null when there is none (the probe is `n/a`). */
export function pickProbeCreature(
  state: Pick<GameState, 'collection' | 'activeParty'>,
): ProbeChoice | null {
  let best: Instance | null = null
  for (const id of state.activeParty) {
    if (id === null) continue
    const instance = state.collection.get(id)
    if (!instance || !instance.gems.includes(PACIFY_SPELL_ID)) continue
    if (
      best === null ||
      instance.level > best.level ||
      (instance.level === best.level && ordinalOf(instance.id) < ordinalOf(best.id))
    ) {
      best = instance
    }
  }
  if (best === null) return null
  const creature = speciesCreatureFor(staticCreatureIdFor(best))
  if (!creature) return null
  return {
    instanceId: best.id,
    castSlot: innateSpellCount(creature) + best.gems.indexOf(PACIFY_SPELL_ID),
    baseScriptId: best.scriptId ?? creature.defaultScriptId,
  }
}

// ---- Event analysis (pure, over a floor run's event list) ----

/** Splits a floor run's events into its fights (each starts at `FightStarted`). */
export function splitFights(events: readonly CombatEvent[]): CombatEvent[][] {
  const fights: CombatEvent[][] = []
  for (const event of events) {
    if (event.type === 'FightStarted') fights.push([])
    fights[fights.length - 1]?.push(event)
  }
  return fights
}

/** R1: a stat-modifier with a factor above 1 is GROWTH (the watch point's stall: Defence or Health
 * multiplied up), below 1 is SHRED (it cuts the target). A factor of exactly 1 changes nothing and
 * is no stack. */
export type StackDirection = 'growth' | 'shred'

export interface StackCount {
  readonly targetId: string
  readonly attribution: string
  readonly direction: StackDirection
  readonly count: number
}

/** The four maxima the report keeps: a direction on a side (the side is the target's combat id). */
export type StackBucket =
  'growth-player' | 'growth-enemy' | 'shred-player' | 'shred-enemy'
export const STACK_BUCKETS: readonly StackBucket[] = [
  'growth-player',
  'growth-enemy',
  'shred-player',
  'shred-enemy',
]
export type StackMaxima<T> = Readonly<Record<StackBucket, T | null>>
export const NO_STACKS: StackMaxima<never> = {
  'growth-player': null,
  'growth-enemy': null,
  'shred-player': null,
  'shred-enemy': null,
}
/** A seed's maxima: each stack with the floor of the fight it came from. */
export type SeedStackMaxima = StackMaxima<StackCount & { readonly floor: number }>

/** H2c (plan review, fix 4): the largest stack per (bucket, trait), so a trait that is not its
 * bucket's overall maximum (Rallying Cry once the Warden attacks, the Flare) still has its number.
 * Keyed by the attribution (a trait id, `(spell)` or `(unattributed)`). */
export type TraitStackMaxima<T> = Readonly<
  Record<StackBucket, Readonly<Record<string, T>>>
>
export const NO_TRAIT_STACKS: TraitStackMaxima<never> = {
  'growth-player': {},
  'growth-enemy': {},
  'shred-player': {},
  'shred-enemy': {},
}
export type SeedTraitStacks = TraitStackMaxima<StackCount & { readonly floor: number }>
export type SpecTraitStacks = TraitStackMaxima<
  StackCount & { readonly floor: number; readonly seed: number }
>

export interface StackAttribution {
  readonly stacks: readonly StackCount[]
  /** Applications attributed to no trigger or spell. */
  readonly unattributed: number
  readonly applications: number
}

export const UNATTRIBUTED = '(unattributed)'
export const SPELL_ATTRIBUTION = '(spell)'

/** ASSUMPTION 103: a `StatModifierApplied` is attributed to the latest `TriggerFired` effect id or
 * `SpellCast` from its source in the current turn (markers clear at each turn and round
 * boundary), else to `(unattributed)`. A stack is the number of such applications per (target,
 * attribution, direction): growth and shred are separate stacks (R1). Input: ONE fight's events. */
export function attributeStatModifiers(events: readonly CombatEvent[]): StackAttribution {
  const marker = new Map<string, string>()
  const counts = new Map<string, StackCount>()
  let unattributed = 0
  let applications = 0
  for (const event of events) {
    switch (event.type) {
      case 'FightStarted':
      case 'RoundStarted':
      case 'TurnStarted':
      case 'TurnEnded':
        marker.clear()
        break
      case 'TriggerFired':
        marker.set(event.sourceId, event.effectId)
        break
      case 'SpellCast':
        marker.set(event.casterId, SPELL_ATTRIBUTION)
        break
      case 'StatModifierApplied': {
        applications += 1
        const attribution = marker.get(event.sourceId) ?? UNATTRIBUTED
        if (attribution === UNATTRIBUTED) unattributed += 1
        const direction: StackDirection | null =
          event.factor > 1 ? 'growth' : event.factor < 1 ? 'shred' : null
        if (direction === null) break
        const key = `${event.targetId}|${attribution}|${direction}`
        const prev = counts.get(key)
        counts.set(key, {
          targetId: event.targetId,
          attribution,
          direction,
          count: (prev?.count ?? 0) + 1,
        })
        break
      }
      default:
        break
    }
  }
  return { stacks: [...counts.values()], unattributed, applications }
}

/** Status id -> the scopes of its `action-lock` effects, read from the registry (ASSUMPTION 102:
 * never hard-coded ids). */
export function lockScopesByStatus(
  statuses: ReadonlyMap<string, StatusDef>,
): ReadonlyMap<string, readonly LockScope[]> {
  const out = new Map<string, readonly LockScope[]>()
  for (const [id, def] of statuses) {
    const scopes: LockScope[] = []
    for (const effect of def.effects) {
      if (effect.category === 'action-lock') scopes.push(effect.scope)
    }
    if (scopes.length > 0) out.set(id, scopes)
  }
  return out
}

export interface BossLockStats {
  readonly bossTurns: number
  /** Turns the boss started while holding any action-lock status. */
  readonly lockedTurns: number
  readonly lockedByScope: Readonly<Record<LockScope, number>>
  /** `StatusApplied` of Pacified on the boss (a refresh counts as another landing). */
  readonly pacifyLands: number
}

/** ASSUMPTION 102: counts the boss's turns and its LOCKED turns (a turn it starts while holding any
 * status whose effects include an `action-lock`), tracked from StatusApplied / StatusExpired /
 * CreatureDied. A turn is counted once per distinct scope it is locked by. Input: one fight. */
export function bossLockStats(
  events: readonly CombatEvent[],
  bossId: string,
  lockScopes: ReadonlyMap<string, readonly LockScope[]>,
): BossLockStats {
  const held = new Set<string>()
  let bossTurns = 0
  let lockedTurns = 0
  let pacifyLands = 0
  const byScope: Record<LockScope, number> = { all: 0, attack: 0, cast: 0 }
  for (const event of events) {
    switch (event.type) {
      case 'StatusApplied':
        if (event.targetId === bossId) {
          held.add(event.statusId)
          if (event.statusId === PACIFIED_STATUS_ID) pacifyLands += 1
        }
        break
      case 'StatusExpired':
        if (event.creatureId === bossId) held.delete(event.statusId)
        break
      case 'CreatureDied':
        if (event.creatureId === bossId) held.clear()
        break
      case 'TurnStarted': {
        if (event.creatureId !== bossId) break
        bossTurns += 1
        const scopes = new Set<LockScope>()
        for (const statusId of held) {
          for (const scope of lockScopes.get(statusId) ?? []) scopes.add(scope)
        }
        if (scopes.size > 0) lockedTurns += 1
        for (const scope of scopes) byScope[scope] += 1
        break
      }
      default:
        break
    }
  }
  return { bossTurns, lockedTurns, lockedByScope: byScope, pacifyLands }
}

/** A combat creature id is `<template>-<side>-<slot>` (`materializeCreature`). */
const PLAYER_ID = /-player-\d+$/
const ENEMY_ID = /-enemy-\d+$/

/** The enemy-side creature ids that start round 1 (every living creature gets a TurnStarted). */
export function firstRoundEnemyIds(events: readonly CombatEvent[]): readonly string[] {
  const ids: string[] = []
  let round = 0
  for (const event of events) {
    if (event.type === 'RoundStarted') round = event.round
    else if (
      round === 1 &&
      event.type === 'TurnStarted' &&
      ENEMY_ID.test(event.creatureId)
    )
      ids.push(event.creatureId)
  }
  return ids
}

export interface FightMetrics {
  readonly result: 'win' | 'loss' | 'draw'
  readonly maxRound: number
  /** A draw that ran the full ROUND_CAP rounds. */
  readonly capDraw: boolean
  readonly deaths: number
  /** The largest stack in each bucket (direction x the target's side). */
  readonly largestStacks: StackMaxima<StackCount>
  /** The largest stack per (bucket, trait) in this fight (H2c). */
  readonly traitStacks: TraitStackMaxima<StackCount>
  /** The distinct enemy-side creature template ids that started the fight (ASSUMPTION 127). */
  readonly enemyTemplateIds: readonly string[]
  readonly unattributed: number
  readonly applications: number
  /** Revives by the Unicorn (source = its combat id); null when it isn't in the party. */
  readonly unicornRevives: number | null
  /** The most times one creature was revived in this fight. */
  readonly maxRevivesOnOne: number
  readonly boss: BossFightMetrics | null
}

export interface BossFightMetrics extends BossLockStats {
  readonly bossTemplateId: string
  /** Stat-modifier applications attributed to the boss's own trait id (when it has one). */
  readonly attributedToBossTrait: number
  readonly peakAttack: number
}

export interface FightContext {
  readonly unicornId: string | null
  readonly bossId: string | null
  readonly bossTemplateId: string | null
  /** The boss's innate trait ids (to attribute its own stat-modifier stacks, e.g. Attrition). */
  readonly bossTraitIds: readonly string[]
  readonly lockScopes: ReadonlyMap<string, readonly LockScope[]>
}

/** The bucket a stack belongs to, or null for a target that is on neither side. */
export function stackBucket(stack: StackCount): StackBucket | null {
  if (PLAYER_ID.test(stack.targetId)) return `${stack.direction}-player`
  if (ENEMY_ID.test(stack.targetId)) return `${stack.direction}-enemy`
  return null
}

/** A combat creature id without its `-<side>-<slot>` suffix: the template id. */
export function templateIdOf(combatId: string): string {
  return combatId.replace(/-(player|enemy)-\d+$/, '')
}

/** The largest stack per (bucket, attribution) among one fight's stacks (the first wins a tie). */
export function traitStackMaxima(
  stacks: readonly StackCount[],
): TraitStackMaxima<StackCount> {
  const next: Record<StackBucket, Record<string, StackCount>> = {
    'growth-player': {},
    'growth-enemy': {},
    'shred-player': {},
    'shred-enemy': {},
  }
  for (const stack of stacks) {
    const bucket = stackBucket(stack)
    if (bucket === null) continue
    const current = next[bucket][stack.attribution]
    if (current === undefined || stack.count > current.count) {
      next[bucket][stack.attribution] = stack
    }
  }
  return next
}

/** Folds one fight's per-trait maxima into a seed's: per (bucket, trait) the larger wins, with the
 * floor of its fight; a tie keeps the first. Pure. */
export function foldTraitStacks(
  acc: SeedTraitStacks,
  fight: Pick<FightMetrics, 'traitStacks'>,
  floor: number,
): SeedTraitStacks {
  const next: Record<StackBucket, Record<string, StackCount & { floor: number }>> = {
    'growth-player': { ...acc['growth-player'] },
    'growth-enemy': { ...acc['growth-enemy'] },
    'shred-player': { ...acc['shred-player'] },
    'shred-enemy': { ...acc['shred-enemy'] },
  }
  for (const bucket of STACK_BUCKETS) {
    for (const [attribution, candidate] of Object.entries(fight.traitStacks[bucket])) {
      const current = next[bucket][attribution]
      if (current === undefined || candidate.count > current.count) {
        next[bucket][attribution] = { ...candidate, floor }
      }
    }
  }
  return next
}

/** A bucket's traits, largest stack first (ties: attribution ascending), at most `limit`. */
export function topTraitStacks<T extends StackCount>(
  bucket: Readonly<Record<string, T>>,
  limit: number,
): T[] {
  return Object.values(bucket)
    .sort(
      (a, b) =>
        b.count - a.count ||
        (a.attribution < b.attribution ? -1 : a.attribution > b.attribution ? 1 : 0),
    )
    .slice(0, limit)
}

/** R2: folds one fight's maxima into a seed's, per bucket: the larger stack wins, the floor of the
 * fight it came from is recorded, and on a tie the first stays. Pure. */
export function foldFightStacks(
  maxima: SeedStackMaxima,
  fight: Pick<FightMetrics, 'largestStacks'>,
  floor: number,
): SeedStackMaxima {
  const next: Record<StackBucket, SeedStackMaxima[StackBucket]> = { ...maxima }
  for (const bucket of STACK_BUCKETS) {
    const candidate = fight.largestStacks[bucket]
    const current = next[bucket]
    if (candidate !== null && (current === null || candidate.count > current.count)) {
      next[bucket] = { ...candidate, floor }
    }
  }
  return next
}

export function analyzeFight(
  events: readonly CombatEvent[],
  ctx: FightContext,
): FightMetrics {
  let result: 'win' | 'loss' | 'draw' = 'draw'
  let maxRound = 0
  let deaths = 0
  let unicornRevives = ctx.unicornId === null ? null : 0
  const revivedCounts = new Map<string, number>()
  for (const event of events) {
    if (event.type === 'FightEnded') result = event.result
    else if (event.type === 'RoundStarted') maxRound = Math.max(maxRound, event.round)
    else if (event.type === 'CreatureDied') deaths += 1
    else if (event.type === 'Revived') {
      revivedCounts.set(event.targetId, (revivedCounts.get(event.targetId) ?? 0) + 1)
      if (ctx.unicornId !== null && event.sourceId === ctx.unicornId) {
        unicornRevives = (unicornRevives ?? 0) + 1
      }
    }
  }
  const attribution = attributeStatModifiers(events)
  let largestStacks: Record<StackBucket, StackCount | null> = { ...NO_STACKS }
  for (const stack of attribution.stacks) {
    const bucket = stackBucket(stack)
    if (bucket === null) continue
    const current = largestStacks[bucket]
    if (current === null || stack.count > current.count) {
      largestStacks = { ...largestStacks, [bucket]: stack }
    }
  }
  let boss: BossFightMetrics | null = null
  if (ctx.bossId !== null && ctx.bossTemplateId !== null) {
    let attributedToBossTrait = 0
    for (const stack of attribution.stacks) {
      if (stack.targetId === ctx.bossId && ctx.bossTraitIds.includes(stack.attribution)) {
        attributedToBossTrait += stack.count
      }
    }
    let peakAttack = 0
    for (const event of events) {
      if (
        event.type === 'StatModifierApplied' &&
        event.targetId === ctx.bossId &&
        event.stat === 'attack'
      ) {
        peakAttack = Math.max(peakAttack, event.effectiveAfter)
      }
    }
    boss = {
      ...bossLockStats(events, ctx.bossId, ctx.lockScopes),
      bossTemplateId: ctx.bossTemplateId,
      attributedToBossTrait,
      peakAttack,
    }
  }
  return {
    result,
    maxRound,
    capDraw: result === 'draw' && maxRound >= ROUND_CAP,
    deaths,
    largestStacks,
    traitStacks: traitStackMaxima(attribution.stacks),
    enemyTemplateIds: [...new Set(firstRoundEnemyIds(events).map(templateIdOf))],
    unattributed: attribution.unattributed,
    applications: attribution.applications,
    unicornRevives,
    maxRevivesOnOne: Math.max(0, ...revivedCounts.values()),
    boss,
  }
}

// ---- Run records ----

type Store = ReturnType<typeof createGameStore>
type StoreState = GameState & GameActions

export interface BossVisit {
  readonly floor: number
  /** First time this seed fought this boss floor. */
  readonly firstVisit: boolean
  readonly bossTemplateId: string
  /** The simple policy's run (the canonical one). */
  readonly policy: {
    readonly cleared: boolean
    readonly metrics: BossFightMetrics | null
  }
  /** The probe run, or null when `n/a` (no party creature holds Pacify). */
  readonly probe: {
    readonly cleared: boolean
    readonly metrics: BossFightMetrics | null
  } | null
  /** Creatures that died in the policy run's boss fight (the Attrition view). */
  readonly policyDeaths: number
}

export interface RunRecord {
  readonly index: number
  readonly floor: number
  readonly kind: RunKind
  readonly cleared: boolean
  readonly partyLevels: readonly number[]
  readonly fightsRun: number
  readonly fightsWon: number
}

export interface UnicornTotals {
  readonly fightsWithUnicorn: number
  readonly winsWithUnicorn: number
  readonly fightsWithoutUnicorn: number
  readonly winsWithoutUnicorn: number
  readonly revives: number
  readonly fightsWithRevive: number
  readonly maxRevivesInFight: number
  /** Fights where some creature was revived MAX_REVIVES_PER_CREATURE times. */
  readonly fightsAtCap: number
}

export interface SeedResult {
  readonly specId: string
  readonly seed: number
  readonly stop: StopReason
  readonly runs: readonly RunRecord[]
  readonly deepestFloor: number
  readonly firstWallFloor: number | null
  readonly failedPushes: Readonly<Record<number, number>>
  readonly firstTryFloor1Clear: boolean
  readonly clearsToFirstSoul: number | null
  readonly runsToFirstSoul: number | null
  readonly partySizeAfterSession: number | null
  readonly deepestAfterSession: number | null
  /** ASSUMPTIONS 107, 126: one of the first FLOOR5_WINDOW_RUNS floor runs was on floor
   * SESSION_TARGET_FLOOR or deeper (fighting on it, not clearing it). */
  readonly reachedFloor5InWindow: boolean
  /** ASSUMPTION 127: every fight on floors 1..MATCHUP_MAX_FLOOR, for the matchup table. */
  readonly earlyFights: readonly EarlyFight[]
  readonly fights: number
  readonly draws: number
  readonly capDraws: number
  readonly largestStacks: SeedStackMaxima
  readonly traitStacks: SeedTraitStacks
  readonly unattributed: number
  readonly applications: number
  readonly unicorn: UnicornTotals
  readonly bossVisits: readonly BossVisit[]
}

/** One fight on an early floor: who the enemy side was and how it ended (ASSUMPTION 127). */
export interface EarlyFight {
  readonly floor: number
  readonly enemyTemplateIds: readonly string[]
  readonly result: 'win' | 'loss' | 'draw'
  /** A draw that ran the full ROUND_CAP rounds. */
  readonly capDraw: boolean
}

export interface SimOptions {
  readonly seeds: readonly number[]
  /** Defaults to RUN_CAP. */
  readonly runCap?: number
  /** Defaults to every spec. */
  readonly specIds?: readonly string[]
  /** Defaults to true; false skips the lock probe (the tests' policy-only comparison). */
  readonly probeBosses?: boolean
  /** Defaults to the stock registry plus the probe scripts. */
  readonly scripts?: ReadonlyMap<string, Script>
  readonly config?: BalanceConfig
}

// ---- Applying the policy to the store ----

/** ASSUMPTION 96. Mutates `summoned`; returns the ids summoned this pass. */
export function summonPass(store: Store, summoned: Set<string>): readonly string[] {
  const done: string[] = []
  for (const [creatureId, progress] of [...store.getState().soulProgress]) {
    if (progress < 100 || summoned.has(creatureId)) continue
    const result = store.getState().summon(creatureId)
    if (!result.ok) throw new Error(`balance-sim: summon(${creatureId}) refused`)
    summoned.add(creatureId)
    done.push(creatureId)
  }
  return done
}

/** ASSUMPTION 99, applied through `setPartySlot`. */
export function applyPartyOrder(store: Store): void {
  const ids = orderedParty(store.getState().collection)
  ids.forEach((id, slot) => {
    const result = store.getState().setPartySlot(slot, id)
    if (!result.ok) throw new Error(`balance-sim: setPartySlot(${slot}) refused`)
  })
}

/** ASSUMPTION 100, applied through `refundAllPerks` + `setPerkLevel`. */
export function applyPerkPlan(store: Store): void {
  const state = store.getState()
  if (state.chosenSpec === null) return
  const spec = SPECIALIZATIONS_BY_ID.get(state.chosenSpec)
  if (!spec) throw new Error(`balance-sim: unknown spec ${state.chosenSpec}`)
  state.refundAllPerks()
  for (const { perkId, level } of planPerkLevels(
    spec,
    perkPointsFor(state.bossesCleared),
  )) {
    const result = store.getState().setPerkLevel(perkId, level)
    if (!result.ok) throw new Error(`balance-sim: setPerkLevel(${perkId}) refused`)
  }
}

function partyLevels(state: StoreState): number[] {
  const levels: number[] = []
  for (const id of state.activeParty) {
    if (id === null) continue
    const instance = state.collection.get(id)
    if (instance) levels.push(instance.level)
  }
  return levels
}

/** The Unicorn's combat id (`<template>-player-<dense slot>`) for the current party, or null. */
function unicornCombatId(state: StoreState): string | null {
  let slot = 0
  for (const id of state.activeParty) {
    if (id === null) continue
    const instance = state.collection.get(id)
    if (!instance) continue
    if (staticCreatureIdFor(instance) === UNICORN.id)
      return `${UNICORN.id}-player-${slot}`
    slot += 1
  }
  return null
}

/** ASSUMPTION 102: true the first time a seed fights a boss floor; records the visit. */
export function noteBossVisit(seen: Set<number>, floor: number): boolean {
  const first = !seen.has(floor)
  seen.add(floor)
  return first
}

/** One probe descent: snapshot, run the floor with the probe creature on its probe script,
 * restore. Returns the outcome's events, or null when `n/a`. */
export function runProbe(
  store: Store,
  floor: number,
): { readonly cleared: boolean; readonly events: readonly CombatEvent[] } | null {
  const snapshot = store.getState()
  const choice = pickProbeCreature(snapshot)
  if (choice === null) return null
  const instance = snapshot.collection.get(choice.instanceId)
  if (!instance) return null
  const collection = new Map(snapshot.collection)
  collection.set(choice.instanceId, {
    ...instance,
    scriptId: probeScriptId(choice.baseScriptId, choice.castSlot),
  })
  store.setState({ collection })
  const result = store.getState().descend(floor)
  store.setState(snapshot, true)
  if (!result.ok) throw new Error(`balance-sim: probe descend(${floor}) refused`)
  return { cleared: result.outcome.cleared, events: result.outcome.events }
}

/** The analysis context for `floor`: the boss and its traits on a boss floor (the biome the store
 * fights, so it reads the store's own `atlasPins`: L2), else boss-free. The Unicorn's combat id
 * rides along. */
export function bossContext(
  floor: number,
  biomes: readonly BiomeData[],
  atlasPins: ReadonlyMap<number, BiomeId>,
  runSeed: number,
  unicornId: string | null,
): FightContext | null {
  if (!isBossFloor(floor)) return null
  const biomeId = biomeForFloor(floor, biomes, atlasPins, runSeed)
  const biome = biomes.find((b) => b.id === biomeId)
  if (!biome?.boss) return null
  return {
    unicornId,
    bossId: `${biome.boss.creature.id}-enemy-0`,
    bossTemplateId: biome.boss.creature.id,
    bossTraitIds: biome.boss.creature.innateTraitIds,
    lockScopes: lockScopesByStatus(STATUS_REGISTRY),
  }
}

function noBossContext(unicornId: string | null): FightContext {
  return {
    unicornId,
    bossId: null,
    bossTemplateId: null,
    bossTraitIds: [],
    lockScopes: new Map(),
  }
}

export interface FloorRunResult {
  readonly run: RunRecord
  /** One entry per fight actually resolved. */
  readonly fights: readonly FightMetrics[]
  /** The ids the analysis keyed on (boss, Unicorn), so a test can find them in `events`. */
  readonly context: FightContext
  readonly events: readonly CombatEvent[]
  readonly bossVisit: BossVisit | null
}

/** One floor run of the policy against the live store: pick the floor, probe it first when it is a
 * boss floor (rolled back), play the policy run through `descend`, analyse its events. Does not
 * advance `progress` and does not run the between-run preparation (`runSeed` does both). */
export function playFloorRun(
  store: Store,
  progress: Progress,
  seenBossFloors: Set<number>,
  options: { readonly probeBosses?: boolean } = {},
): FloorRunResult {
  const { floor, kind } = nextRun(progress)
  const before = store.getState()
  const levels = partyLevels(before)
  const unicornId = unicornCombatId(before)
  const bossCtx = bossContext(floor, BIOMES, before.atlasPins, before.runSeed, unicornId)

  // The probe runs first and is rolled back, so the policy run fights the identical floor.
  let probeRun: ReturnType<typeof runProbe> = null
  if (bossCtx !== null && options.probeBosses !== false) probeRun = runProbe(store, floor)

  const result = store.getState().descend(floor)
  if (!result.ok)
    throw new Error(`balance-sim: descend(${floor}) refused: ${result.reason}`)
  const outcome = result.outcome
  const context = bossCtx ?? noBossContext(unicornId)
  const fights = splitFights(outcome.events).map((e) => analyzeFight(e, context))

  let bossVisit: BossVisit | null = null
  if (bossCtx !== null && bossCtx.bossTemplateId !== null) {
    const probeMetrics =
      probeRun === null
        ? null
        : analyzeFight(splitFights(probeRun.events)[0] ?? [], bossCtx).boss
    bossVisit = {
      floor,
      firstVisit: noteBossVisit(seenBossFloors, floor),
      bossTemplateId: bossCtx.bossTemplateId,
      policy: { cleared: outcome.cleared, metrics: fights[0]?.boss ?? null },
      probe:
        probeRun === null ? null : { cleared: probeRun.cleared, metrics: probeMetrics },
      policyDeaths: fights[0]?.deaths ?? 0,
    }
  }

  return {
    run: {
      index: progress.runs + 1,
      floor,
      kind,
      cleared: outcome.cleared,
      partyLevels: levels,
      fightsRun: fights.length,
      fightsWon: fights.filter((f) => f.result === 'win').length,
    },
    fights,
    context,
    events: outcome.events,
    bossVisit,
  }
}

/** One seed under the policy. */
export function runSeed(specId: string, seed: number, options: SimOptions): SeedResult {
  const runCap = options.runCap ?? RUN_CAP
  const config = options.config ?? DEFAULT_BALANCE_CONFIG
  const store = createGameStore({
    scripts: options.scripts ?? buildSimScripts(),
    balanceConfig: config,
  })
  store.getState().newGame({ seed })
  store.getState().setSpec(specId)
  store.getState().runScriptedIntro()
  const frontier = contentFrontier(BIOMES)

  const summoned = new Set<string>()
  for (const instance of store.getState().collection.values()) {
    summoned.add(staticCreatureIdFor(instance))
  }
  const prepare = (): void => {
    summonPass(store, summoned)
    applyPartyOrder(store)
    applyPerkPlan(store)
  }
  prepare()

  let progress = INITIAL_PROGRESS
  const runs: RunRecord[] = []
  const bossVisits: BossVisit[] = []
  const seenBossFloors = new Set<number>()
  let firstTryFloor1Clear = false
  let clears = 0
  let clearsToFirstSoul: number | null = null
  let runsToFirstSoul: number | null = null
  let partySizeAfterSession: number | null = null
  let deepestAfterSession: number | null = null
  const earlyFights: EarlyFight[] = []
  let traitStacks: SeedTraitStacks = NO_TRAIT_STACKS
  let fights = 0
  let draws = 0
  let capDraws = 0
  let largestStacks: SeedStackMaxima = NO_STACKS
  let unattributed = 0
  let applications = 0
  const unicorn = {
    fightsWithUnicorn: 0,
    winsWithUnicorn: 0,
    fightsWithoutUnicorn: 0,
    winsWithoutUnicorn: 0,
    revives: 0,
    fightsWithRevive: 0,
    maxRevivesInFight: 0,
    fightsAtCap: 0,
  }

  for (;;) {
    const stop = stopReason(progress, frontier, runCap)
    if (stop !== null) {
      return {
        specId,
        seed,
        stop,
        runs,
        deepestFloor: progress.deepestFloor,
        firstWallFloor: progress.firstWallFloor,
        failedPushes: progress.failedPushes,
        firstTryFloor1Clear,
        clearsToFirstSoul,
        runsToFirstSoul,
        partySizeAfterSession,
        deepestAfterSession,
        reachedFloor5InWindow: reachedFloorInWindow(runs),
        earlyFights,
        fights,
        draws,
        capDraws,
        largestStacks,
        traitStacks,
        unattributed,
        applications,
        unicorn,
        bossVisits,
      }
    }

    const played = playFloorRun(store, progress, seenBossFloors, options)
    const { run } = played
    for (const m of played.fights) {
      fights += 1
      if (m.result === 'draw') draws += 1
      if (m.capDraw) capDraws += 1
      unattributed += m.unattributed
      applications += m.applications
      largestStacks = foldFightStacks(largestStacks, m, run.floor)
      traitStacks = foldTraitStacks(traitStacks, m, run.floor)
      if (run.floor <= MATCHUP_MAX_FLOOR) {
        earlyFights.push({
          floor: run.floor,
          enemyTemplateIds: m.enemyTemplateIds,
          result: m.result,
          capDraw: m.capDraw,
        })
      }
      if (m.unicornRevives === null) {
        unicorn.fightsWithoutUnicorn += 1
        if (m.result === 'win') unicorn.winsWithoutUnicorn += 1
      } else {
        unicorn.fightsWithUnicorn += 1
        if (m.result === 'win') unicorn.winsWithUnicorn += 1
        unicorn.revives += m.unicornRevives
        if (m.unicornRevives > 0) unicorn.fightsWithRevive += 1
        unicorn.maxRevivesInFight = Math.max(unicorn.maxRevivesInFight, m.unicornRevives)
      }
      if (m.maxRevivesOnOne >= MAX_REVIVES_PER_CREATURE) unicorn.fightsAtCap += 1
    }
    if (played.bossVisit) bossVisits.push(played.bossVisit)
    runs.push(run)
    if (progress.runs === 0) firstTryFloor1Clear = run.floor === 1 && run.cleared
    if (run.cleared) clears += 1
    progress = advanceProgress(progress, run.floor, run.kind, run.cleared)

    prepare()

    if (
      clearsToFirstSoul === null &&
      [...store.getState().soulProgress.values()].some((p) => p >= 100)
    ) {
      clearsToFirstSoul = clears
      runsToFirstSoul = progress.runs
    }
    if (progress.runs === FIRST_SESSION_RUNS) {
      partySizeAfterSession = store
        .getState()
        .activeParty.filter((id) => id !== null).length
      deepestAfterSession = progress.deepestFloor
    }
  }
}

// ---- The report ----

export interface FloorRow {
  readonly floor: number
  readonly attemptedSeeds: number
  readonly clearedSeeds: number
  readonly runs: number
  readonly clears: number
  readonly pushRuns: number
  readonly pushClears: number
  readonly failedPushes: number
  readonly fightsRun: number
  readonly fightsWon: number
  readonly fightsPerFloor: number
  readonly meanPartyLevel: number | null
  readonly enemyMin: number
  readonly enemyMax: number
  readonly bossLevel: number | null
}

export interface BossFloorRow {
  readonly floor: number
  readonly bossTemplateId: string
  readonly scope: 'first-visit' | 'all-visits'
  readonly visits: number
  readonly policyClears: number
  readonly probeAvailable: number
  readonly probeNotAvailable: number
  /** Over the visits that have a probe: the policy run's and the probe run's clears. */
  readonly policyClearsWhereProbed: number
  readonly probeClears: number
  readonly policyBossTurns: number
  readonly policyLockedTurns: number
  readonly policyLockedByScope: Readonly<Record<LockScope, number>>
  readonly probeBossTurns: number
  readonly probeLockedTurns: number
  readonly probeLockedByScope: Readonly<Record<LockScope, number>>
  /** Probe runs where Pacify landed on the boss at least once, and landings in total. */
  readonly probeRunsWithPacifyLand: number
  readonly probePacifyLands: number
}

export interface AttritionRow {
  readonly visits: number
  readonly policyClears: number
  readonly meanDeaths: number | null
  readonly maxAttritionStacks: number
  readonly maxPeakAttack: number
}

/** ASSUMPTION 22's loose CI thresholds, as read by ASSUMPTION 107. */
export const FLOOR1_MIN_CLEAR_PCT = 80
export const FIRST_SOUL_MAX_RUNS = 30

/** ASSUMPTION 22 / 107, each value next to its verdict (H2's CI test asserts the verdicts). */
export interface Thresholds {
  /** The first-try floor-1 clear rate over seeds (ASSUMPTION 106); passes at 80% exactly. */
  readonly floor1ClearRatePct: number
  readonly floor1Pass: boolean
  /** The median over EVERY seed of the floor runs until a soul first reaches 100%, a seed that
   * never completes one counting as +Infinity (so it is Infinity once half or more never do);
   * passes at 30 or fewer. */
  readonly medianRunsToFirstSoul: number
  readonly seedsWithoutSoul: number
  readonly firstSoulPass: boolean
  /** Seeds with one of their first FLOOR5_WINDOW_RUNS floor runs on floor 5 or deeper; passes
   * when at least one seed did. */
  readonly seedsReachingFloor5InWindow: number
  readonly floor5Pass: boolean
}

export interface Spread {
  readonly min: number
  readonly median: number
  readonly max: number
}

export interface SpecReport {
  readonly specId: string
  readonly seeds: number
  readonly t1: { readonly firstTryClears: number; readonly seeds: number }
  readonly t2: {
    readonly clearsToFirstSoul: readonly number[]
    readonly runsToFirstSoul: readonly number[]
    readonly seedsWithoutSoul: number
  }
  readonly t3: { readonly partySizeCounts: Readonly<Record<number, number>> }
  readonly t4: {
    readonly stopReasons: Readonly<Record<StopReason, number>>
    readonly deepestFloors: readonly number[]
    readonly firstWallFloors: Readonly<Record<number, number>>
    readonly seedsWalled: number
    /** Seeds whose first wall is on a floor below FIRST_BOSS_FLOOR (a wall AT it is not before it). */
    readonly seedsWalledBeforeFloor10: number
    readonly failedPushesByFloor: Readonly<Record<number, number>>
    /** ASSUMPTION 108: per seed, the most failed pushes on any one floor below FIRST_BOSS_FLOOR
     * (0 when it had none); the spread over seeds. */
    readonly worstFailedPushesBelow10: Spread | null
    /** ASSUMPTION 108: per seed, the floor runs until its first clear of FIRST_BOSS_FLOOR; the
     * spread over the seeds that clear it, and how many never do. */
    readonly runsToFirstFloor10Clear: {
      readonly spread: Spread | null
      readonly neverClearing: number
    }
  }
  readonly floors: readonly FloorRow[]
  readonly fights: number
  readonly draws: number
  readonly capDraws: number
  /** The largest stack of one trait's stat-modifier per bucket: growth (the watch point) and
   * shred, each on a player and on an enemy creature. */
  readonly largestStacks: StackMaxima<
    StackCount & { readonly floor: number; readonly seed: number }
  >
  /** H2c: per bucket, every trait's largest stack (the report prints the top few). */
  readonly traitStacks: SpecTraitStacks
  readonly unattributed: number
  readonly applications: number
  readonly unicorn: UnicornTotals
  /** ASSUMPTION 127: the floor 1-5 matchup rows, by (floor, enemy template). */
  readonly matchups: readonly MatchupRow[]
  /** ASSUMPTION 127: the first-try clear rate per floor. */
  readonly firstTry: readonly FirstTryRow[]
  readonly bosses: readonly BossFloorRow[]
  readonly attrition: AttritionRow
  readonly thresholds: Thresholds
}

export interface BalanceReport {
  readonly seeds: readonly number[]
  readonly runCap: number
  readonly frontier: number
  readonly specs: readonly SpecReport[]
}

function sumLocks(
  items: readonly Readonly<Record<LockScope, number>>[],
): Record<LockScope, number> {
  return {
    all: items.reduce((s, i) => s + i.all, 0),
    attack: items.reduce((s, i) => s + i.attack, 0),
    cast: items.reduce((s, i) => s + i.cast, 0),
  }
}

/** Ascending, safe for +Infinity (`Infinity - Infinity` is NaN, so no subtraction). */
function ascending(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort(ascending)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** The median over EVERY seed, a missing value (`null`) counting as +Infinity (ASSUMPTION 107).
 * With an even count the middle two are averaged, so one infinite middle makes it infinite. */
export function medianOfSeeds(values: readonly (number | null)[]): number {
  return median(values.map((v) => v ?? Infinity)) ?? Infinity
}

export function spreadOf(values: readonly number[]): Spread | null {
  if (values.length === 0) return null
  const sorted = [...values].sort(ascending)
  return { min: sorted[0]!, median: median(sorted)!, max: sorted[sorted.length - 1]! }
}

/** ASSUMPTION 22 / 107, computed over the seeds of one spec. Pure. */
export function computeThresholds(
  results: readonly Pick<
    SeedResult,
    'firstTryFloor1Clear' | 'runsToFirstSoul' | 'reachedFloor5InWindow'
  >[],
): Thresholds {
  const seeds = results.length
  const firstTryClears = results.filter((r) => r.firstTryFloor1Clear).length
  const medianRuns = medianOfSeeds(results.map((r) => r.runsToFirstSoul))
  const reachFive = results.filter((r) => r.reachedFloor5InWindow).length
  return {
    floor1ClearRatePct: seeds === 0 ? 0 : (100 * firstTryClears) / seeds,
    floor1Pass: seeds > 0 && firstTryClears * 100 >= FLOOR1_MIN_CLEAR_PCT * seeds,
    medianRunsToFirstSoul: medianRuns,
    seedsWithoutSoul: results.filter((r) => r.runsToFirstSoul === null).length,
    firstSoulPass: medianRuns <= FIRST_SOUL_MAX_RUNS,
    seedsReachingFloor5InWindow: reachFive,
    floor5Pass: reachFive > 0,
  }
}

/** ASSUMPTION 127: one (floor, enemy creature) row of the matchup table. A fight counts once for
 * each DISTINCT enemy template in it, with the fight's own result: a row is "fights containing
 * this creature". On floor 1 there is one enemy, so its rows attribute each fight exactly. */
export interface MatchupRow {
  readonly floor: number
  readonly enemyTemplateId: string
  readonly fights: number
  readonly wins: number
  readonly losses: number
  readonly capDraws: number
  readonly otherDraws: number
}

export function buildMatchupRows(
  results: readonly Pick<SeedResult, 'earlyFights'>[],
): MatchupRow[] {
  const rows = new Map<string, MatchupRow>()
  for (const result of results) {
    for (const fight of result.earlyFights) {
      if (fight.floor > MATCHUP_MAX_FLOOR) continue
      for (const enemyTemplateId of new Set(fight.enemyTemplateIds)) {
        const key = `${fight.floor}|${enemyTemplateId}`
        const row = rows.get(key) ?? {
          floor: fight.floor,
          enemyTemplateId,
          fights: 0,
          wins: 0,
          losses: 0,
          capDraws: 0,
          otherDraws: 0,
        }
        rows.set(key, {
          ...row,
          fights: row.fights + 1,
          wins: row.wins + (fight.result === 'win' ? 1 : 0),
          losses: row.losses + (fight.result === 'loss' ? 1 : 0),
          capDraws: row.capDraws + (fight.result === 'draw' && fight.capDraw ? 1 : 0),
          otherDraws:
            row.otherDraws + (fight.result === 'draw' && !fight.capDraw ? 1 : 0),
        })
      }
    }
  }
  return [...rows.values()].sort(
    (a, b) =>
      a.floor - b.floor ||
      (a.enemyTemplateId < b.enemyTemplateId
        ? -1
        : a.enemyTemplateId > b.enemyTemplateId
          ? 1
          : 0),
  )
}

/** ASSUMPTION 127: per floor, over the seeds that ever ran it, how many cleared it on their FIRST
 * run there (a push or a farm, whichever came first). A floor no seed ran has no row. */
export interface FirstTryRow {
  readonly floor: number
  readonly seeds: number
  readonly firstTryClears: number
}

export function buildFirstTryRows(
  results: readonly Pick<SeedResult, 'runs'>[],
  frontier: number,
): FirstTryRow[] {
  const rows: FirstTryRow[] = []
  for (let floor = 1; floor <= frontier; floor++) {
    let seeds = 0
    let firstTryClears = 0
    for (const result of results) {
      const first = result.runs.find((run) => run.floor === floor)
      if (first === undefined) continue
      seeds += 1
      if (first.cleared) firstTryClears += 1
    }
    if (seeds > 0) rows.push({ floor, seeds, firstTryClears })
  }
  return rows
}

export function buildBossRows(
  results: readonly Pick<SeedResult, 'bossVisits'>[],
): BossFloorRow[] {
  const floors = [
    ...new Set(results.flatMap((r) => r.bossVisits.map((v) => v.floor))),
  ].sort((a, b) => a - b)
  const rows: BossFloorRow[] = []
  for (const floor of floors) {
    for (const scope of ['first-visit', 'all-visits'] as const) {
      const visits = results
        .flatMap((r) => r.bossVisits)
        .filter((v) => v.floor === floor && (scope === 'all-visits' || v.firstVisit))
      const probed = visits.filter((v) => v.probe !== null)
      const policyMetrics = visits.flatMap((v) =>
        v.policy.metrics ? [v.policy.metrics] : [],
      )
      const probeMetrics = probed.flatMap((v) =>
        v.probe?.metrics ? [v.probe.metrics] : [],
      )
      rows.push({
        floor,
        bossTemplateId: visits[0]?.bossTemplateId ?? '',
        scope,
        visits: visits.length,
        policyClears: visits.filter((v) => v.policy.cleared).length,
        probeAvailable: probed.length,
        probeNotAvailable: visits.length - probed.length,
        policyClearsWhereProbed: probed.filter((v) => v.policy.cleared).length,
        probeClears: probed.filter((v) => v.probe?.cleared).length,
        policyBossTurns: policyMetrics.reduce((s, m) => s + m.bossTurns, 0),
        policyLockedTurns: policyMetrics.reduce((s, m) => s + m.lockedTurns, 0),
        policyLockedByScope: sumLocks(policyMetrics.map((m) => m.lockedByScope)),
        probeBossTurns: probeMetrics.reduce((s, m) => s + m.bossTurns, 0),
        probeLockedTurns: probeMetrics.reduce((s, m) => s + m.lockedTurns, 0),
        probeLockedByScope: sumLocks(probeMetrics.map((m) => m.lockedByScope)),
        probeRunsWithPacifyLand: probeMetrics.filter((m) => m.pacifyLands > 0).length,
        probePacifyLands: probeMetrics.reduce((s, m) => s + m.pacifyLands, 0),
      })
    }
  }
  return rows
}

function buildFloorRows(
  results: readonly SeedResult[],
  frontier: number,
  config: BalanceConfig,
): FloorRow[] {
  const rows: FloorRow[] = []
  for (let floor = 1; floor <= frontier; floor++) {
    const runs = results.flatMap((r) => r.runs.filter((run) => run.floor === floor))
    const range = enemyLevelRange(floor, config)
    const meanLevels = runs
      .filter((run) => run.partyLevels.length > 0)
      .map((run) => run.partyLevels.reduce((s, l) => s + l, 0) / run.partyLevels.length)
    const pushes = runs.filter((run) => run.kind === 'push')
    rows.push({
      floor,
      attemptedSeeds: results.filter((r) => r.runs.some((run) => run.floor === floor))
        .length,
      clearedSeeds: results.filter((r) => r.deepestFloor >= floor).length,
      runs: runs.length,
      clears: runs.filter((run) => run.cleared).length,
      pushRuns: pushes.length,
      pushClears: pushes.filter((run) => run.cleared).length,
      failedPushes: results.reduce((s, r) => s + (r.failedPushes[floor] ?? 0), 0),
      fightsRun: runs.reduce((s, run) => s + run.fightsRun, 0),
      fightsWon: runs.reduce((s, run) => s + run.fightsWon, 0),
      fightsPerFloor: isBossFloor(floor) ? 1 : fightCount(floor, config),
      meanPartyLevel:
        meanLevels.length === 0
          ? null
          : meanLevels.reduce((s, l) => s + l, 0) / meanLevels.length,
      enemyMin: range.min,
      enemyMax: range.max,
      bossLevel: isBossFloor(floor) ? bossLevel(floor, config) : null,
    })
  }
  return rows
}

/** The per-spec aggregation over the seed results (pure; the tests feed it hand-built results). */
export function buildSpecReport(
  specId: string,
  results: readonly SeedResult[],
  frontier: number,
  config: BalanceConfig,
): SpecReport {
  const firstTryClears = results.filter((r) => r.firstTryFloor1Clear).length
  const soulClears = results.flatMap((r) =>
    r.clearsToFirstSoul === null ? [] : [r.clearsToFirstSoul],
  )
  const soulRuns = results.flatMap((r) =>
    r.runsToFirstSoul === null ? [] : [r.runsToFirstSoul],
  )
  const seedsWithoutSoul = results.length - soulClears.length
  const partySizeCounts: Record<number, number> = {}
  for (const r of results) {
    if (r.partySizeAfterSession === null) continue
    partySizeCounts[r.partySizeAfterSession] =
      (partySizeCounts[r.partySizeAfterSession] ?? 0) + 1
  }
  const firstWallFloors: Record<number, number> = {}
  const failedPushesByFloor: Record<number, number> = {}
  for (const r of results) {
    if (r.firstWallFloor !== null) {
      firstWallFloors[r.firstWallFloor] = (firstWallFloors[r.firstWallFloor] ?? 0) + 1
    }
    for (const [floor, count] of Object.entries(r.failedPushes)) {
      failedPushesByFloor[Number(floor)] =
        (failedPushesByFloor[Number(floor)] ?? 0) + count
    }
  }
  const largestStacks: Record<StackBucket, SpecReport['largestStacks'][StackBucket]> = {
    ...NO_STACKS,
  }
  for (const r of results) {
    for (const bucket of STACK_BUCKETS) {
      const candidate = r.largestStacks[bucket]
      const current = largestStacks[bucket]
      if (candidate !== null && (current === null || candidate.count > current.count)) {
        largestStacks[bucket] = { ...candidate, seed: r.seed }
      }
    }
  }
  const worstBelow10 = results.map((r) =>
    Math.max(
      0,
      ...Object.entries(r.failedPushes)
        .filter(([floor]) => Number(floor) < FIRST_BOSS_FLOOR)
        .map(([, count]) => count),
    ),
  )
  const runsToFloor10 = results.flatMap((r) => {
    const hit = r.runs.find((run) => run.floor === FIRST_BOSS_FLOOR && run.cleared)
    return hit ? [hit.index] : []
  })
  const traitStacks: Record<
    StackBucket,
    Record<string, SpecTraitStacks[StackBucket][string]>
  > = {
    'growth-player': {},
    'growth-enemy': {},
    'shred-player': {},
    'shred-enemy': {},
  }
  for (const r of results) {
    for (const bucket of STACK_BUCKETS) {
      for (const [attribution, candidate] of Object.entries(r.traitStacks[bucket])) {
        const current = traitStacks[bucket][attribution]
        if (current === undefined || candidate.count > current.count) {
          traitStacks[bucket][attribution] = { ...candidate, seed: r.seed }
        }
      }
    }
  }
  const sumUnicorn = (key: keyof UnicornTotals): number =>
    results.reduce((s, r) => s + r.unicorn[key], 0)
  const bosses = buildBossRows(results)

  const attritionVisits = results
    .flatMap((r) => r.bossVisits)
    .filter((v) => v.bossTemplateId === 'rot-sovereign')
  const attritionMetrics = attritionVisits.flatMap((v) =>
    v.policy.metrics ? [v.policy.metrics] : [],
  )

  return {
    specId,
    seeds: results.length,
    t1: { firstTryClears, seeds: results.length },
    t2: { clearsToFirstSoul: soulClears, runsToFirstSoul: soulRuns, seedsWithoutSoul },
    t3: { partySizeCounts },
    t4: {
      stopReasons: {
        frontier: results.filter((r) => r.stop === 'frontier').length,
        cap: results.filter((r) => r.stop === 'cap').length,
      },
      deepestFloors: results.map((r) => r.deepestFloor),
      firstWallFloors,
      seedsWalled: results.filter((r) => r.firstWallFloor !== null).length,
      seedsWalledBeforeFloor10: results.filter(
        (r) => r.firstWallFloor !== null && r.firstWallFloor < FIRST_BOSS_FLOOR,
      ).length,
      failedPushesByFloor,
      worstFailedPushesBelow10: spreadOf(worstBelow10),
      runsToFirstFloor10Clear: {
        spread: spreadOf(runsToFloor10),
        neverClearing: results.length - runsToFloor10.length,
      },
    },
    floors: buildFloorRows(results, frontier, config),
    fights: results.reduce((s, r) => s + r.fights, 0),
    draws: results.reduce((s, r) => s + r.draws, 0),
    capDraws: results.reduce((s, r) => s + r.capDraws, 0),
    largestStacks,
    traitStacks,
    unattributed: results.reduce((s, r) => s + r.unattributed, 0),
    applications: results.reduce((s, r) => s + r.applications, 0),
    matchups: buildMatchupRows(results),
    firstTry: buildFirstTryRows(results, frontier),
    unicorn: {
      fightsWithUnicorn: sumUnicorn('fightsWithUnicorn'),
      winsWithUnicorn: sumUnicorn('winsWithUnicorn'),
      fightsWithoutUnicorn: sumUnicorn('fightsWithoutUnicorn'),
      winsWithoutUnicorn: sumUnicorn('winsWithoutUnicorn'),
      revives: sumUnicorn('revives'),
      fightsWithRevive: sumUnicorn('fightsWithRevive'),
      maxRevivesInFight: Math.max(0, ...results.map((r) => r.unicorn.maxRevivesInFight)),
      fightsAtCap: sumUnicorn('fightsAtCap'),
    },
    bosses,
    attrition: {
      visits: attritionVisits.length,
      policyClears: attritionVisits.filter((v) => v.policy.cleared).length,
      meanDeaths:
        attritionVisits.length === 0
          ? null
          : attritionVisits.reduce((s, v) => s + v.policyDeaths, 0) /
            attritionVisits.length,
      maxAttritionStacks: Math.max(
        0,
        ...attritionMetrics.map((m) => m.attributedToBossTrait),
      ),
      maxPeakAttack: Math.max(0, ...attritionMetrics.map((m) => m.peakAttack)),
    },
    thresholds: computeThresholds(results),
  }
}

/** Runs every (spec, seed) and builds the plain-data report. Deterministic: same options, same
 * report. */
export function buildReport(options: SimOptions): BalanceReport {
  const config = options.config ?? DEFAULT_BALANCE_CONFIG
  const frontier = contentFrontier(BIOMES)
  const specIds = options.specIds ?? SPECIALIZATIONS.map((s) => s.id)
  const scripts = options.scripts ?? buildSimScripts()
  const specs = specIds.map((specId) => {
    const results = options.seeds.map((seed) =>
      runSeed(specId, seed, { ...options, scripts }),
    )
    return buildSpecReport(specId, results, frontier, config)
  })
  return { seeds: options.seeds, runCap: options.runCap ?? RUN_CAP, frontier, specs }
}

// ---- Formatting ----

function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`
}

function fmt(n: number | null, digits = 1): string {
  return n === null ? 'n/a' : n.toFixed(digits)
}

/** A median that may be +Infinity (a seed that never completes counts as infinite). */
function fmtMedian(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : 'never'
}

function fmtSpread(spread: Spread | null): string {
  return spread === null
    ? 'n/a'
    : `min ${spread.min} / median ${fmt(spread.median)} / max ${spread.max}`
}

function pad(value: string | number, width: number): string {
  return String(value).padStart(width)
}

function verdict(pass: boolean): string {
  return pass ? 'PASS' : 'FAIL'
}

function formatSpec(spec: SpecReport, frontier: number): string[] {
  const out: string[] = []
  const t = spec.thresholds
  out.push('', `=== ${spec.specId} (${spec.seeds} seeds) ===`)
  out.push(
    `T1 floor-1 first-try clear: ${spec.t1.firstTryClears}/${spec.t1.seeds} = ${pct(spec.t1.firstTryClears, spec.t1.seeds)} (target >= 95%)`,
  )
  out.push(
    `T2 first soul (target ~10): floor runs, median over all seeds ${fmtMedian(t.medianRunsToFirstSoul)} (seeds that never complete one: ${spec.t2.seedsWithoutSoul}); clears among the completing seeds: median ${fmt(median(spec.t2.clearsToFirstSoul))}, max ${fmt(spec.t2.clearsToFirstSoul.length === 0 ? null : Math.max(...spec.t2.clearsToFirstSoul), 0)}`,
  )
  const sizes = Object.entries(spec.t3.partySizeCounts)
    .map(([size, count]) => `${size}:${count}`)
    .join(' ')
  out.push(
    `T3 party size after ${FIRST_SESSION_RUNS} floor runs (size:seeds): ${sizes || 'n/a'} (target 6)`,
  )
  const walls = Object.entries(spec.t4.firstWallFloors)
    .map(([floor, count]) => `f${floor}:${count}`)
    .join(' ')
  out.push(
    `T4 stop: frontier ${spec.t4.stopReasons.frontier}, cap ${spec.t4.stopReasons.cap}; walled seeds ${spec.t4.seedsWalled} (before floor 10: ${spec.t4.seedsWalledBeforeFloor10}); first-wall floors ${walls || 'none'}; deepest floor median ${fmt(median(spec.t4.deepestFloors))}`,
  )
  out.push(
    `T4 walls' size (ASSUMPTION 108): most failed pushes on one floor below ${FIRST_BOSS_FLOOR}, per seed: ${fmtSpread(spec.t4.worstFailedPushesBelow10)}; floor runs to the first floor-${FIRST_BOSS_FLOOR} clear: ${fmtSpread(spec.t4.runsToFirstFloor10Clear.spread)} over the seeds that clear it, ${spec.t4.runsToFirstFloor10Clear.neverClearing} never do`,
  )
  out.push(
    `T5/compounding per floor (p = per-fight win rate, p^n = predicted clear for n fights):`,
    '  floor  reached cleared  runs  clear%  pushFail   fights    p    p^n   partyLv  enemyLv   boss',
  )
  for (const row of spec.floors) {
    const p = row.fightsRun === 0 ? null : row.fightsWon / row.fightsRun
    const predicted = p === null ? null : p ** row.fightsPerFloor
    out.push(
      `  ${pad(row.floor, 5)}  ${pad(row.attemptedSeeds, 7)} ${pad(row.clearedSeeds, 7)} ${pad(row.runs, 5)} ${pad(pct(row.clears, row.runs), 7)} ${pad(row.failedPushes, 8)} ${pad(row.fightsRun, 8)} ${pad(fmt(p, 3), 5)} ${pad(fmt(predicted, 3), 6)} ${pad(fmt(row.meanPartyLevel), 8)}  ${pad(`${row.enemyMin}-${row.enemyMax}`, 7)} ${pad(row.bossLevel ?? '', 5)}`,
    )
  }
  out.push(
    "First-try clear per floor (each seed's FIRST run on the floor, a push or a farm):",
    ...spec.firstTry.map(
      (row) =>
        `  floor ${pad(row.floor, 2)}: ${pad(row.firstTryClears, 2)}/${pad(row.seeds, 2)} = ${pct(row.firstTryClears, row.seeds)}`,
    ),
  )
  out.push(
    `Matchups on floors 1-${MATCHUP_MAX_FLOOR} (fights CONTAINING each enemy creature, with the fight's result; floor 1 has one enemy per fight, so its rows are exact):`,
    '  floor  enemy creature                  fights   wins  losses  capDraw  otherDraw   win%',
    ...spec.matchups.map(
      (row) =>
        `  ${pad(row.floor, 5)}  ${row.enemyTemplateId.padEnd(28)} ${pad(row.fights, 7)} ${pad(row.wins, 6)} ${pad(row.losses, 7)} ${pad(row.capDraws, 8)} ${pad(row.otherDraws, 10)} ${pad(pct(row.wins, row.fights), 7)}`,
    ),
  )
  out.push(
    `Floors 20-${frontier} (watch point), failed pushes by floor: ${
      Object.entries(spec.t4.failedPushesByFloor)
        .filter(([floor]) => Number(floor) >= 20)
        .map(([floor, count]) => `f${floor}:${count}`)
        .join(' ') || 'none'
    }`,
  )
  const u = spec.unicorn
  out.push(
    `Unicorn revives: in party for ${u.fightsWithUnicorn} fights (win ${pct(u.winsWithUnicorn, u.fightsWithUnicorn)}; not in party ${u.fightsWithoutUnicorn} fights, win ${pct(u.winsWithoutUnicorn, u.fightsWithoutUnicorn)}); ${u.revives} revives, ${u.fightsWithRevive} fights with one, max ${u.maxRevivesInFight} in a fight, ${u.fightsAtCap} fights with a creature at the cap (${MAX_REVIVES_PER_CREATURE})`,
  )
  out.push(
    `Draws: ${spec.draws}/${spec.fights} fights = ${pct(spec.draws, spec.fights)}; round-cap draws ${spec.capDraws} = ${pct(spec.capDraws, spec.fights)}`,
  )
  const stackText = (ls: SpecReport['largestStacks'][StackBucket]): string =>
    ls
      ? `${ls.count}x ${ls.attribution} (floor ${ls.floor}, seed ${ls.seed}, ${ls.targetId})`
      : 'none'
  out.push(
    `Largest GROWTH stack (the watch point: a stat-modifier factor above 1, stacked) of one trait, on a player creature: ${stackText(spec.largestStacks['growth-player'])}`,
    `Largest GROWTH stack (the watch point) of one trait, on an enemy creature: ${stackText(spec.largestStacks['growth-enemy'])}`,
    `Largest SHRED stack (a factor below 1, a cut to the target) of one trait, on a player creature: ${stackText(spec.largestStacks['shred-player'])}`,
    `Largest SHRED stack of one trait, on an enemy creature: ${stackText(spec.largestStacks['shred-enemy'])}; unattributed ${spec.unattributed}/${spec.applications} applications`,
  )
  for (const bucket of STACK_BUCKETS) {
    const top = topTraitStacks(spec.traitStacks[bucket], TOP_TRAIT_STACKS)
    out.push(
      `Top ${TOP_TRAIT_STACKS} traits by largest ${bucket} stack: ${
        top.length === 0
          ? 'none'
          : top
              .map(
                (t) => `${t.attribution} ${t.count}x (floor ${t.floor}, seed ${t.seed})`,
              )
              .join('; ')
      }`,
    )
  }
  out.push('Boss floors (policy run vs boss-aimed Pacify probe, same party, same floor):')
  for (const row of spec.bosses) {
    out.push(
      `  floor ${row.floor} ${row.bossTemplateId} [${row.scope}] visits ${row.visits}: policy clear ${pct(row.policyClears, row.visits)}; probe n/a ${row.probeNotAvailable}; where probed (${row.probeAvailable}): policy ${pct(row.policyClearsWhereProbed, row.probeAvailable)} vs probe ${pct(row.probeClears, row.probeAvailable)}; boss locked-turn share policy ${pct(row.policyLockedTurns, row.policyBossTurns)} (all ${row.policyLockedByScope.all} attack ${row.policyLockedByScope.attack} cast ${row.policyLockedByScope.cast}) vs probe ${pct(row.probeLockedTurns, row.probeBossTurns)} (all ${row.probeLockedByScope.all} attack ${row.probeLockedByScope.attack} cast ${row.probeLockedByScope.cast}); Pacify lands in ${row.probeRunsWithPacifyLand}/${row.probeAvailable} probe runs (${row.probePacifyLands} landings)`,
    )
  }
  const a = spec.attrition
  out.push(
    `Rot Sovereign's Attrition (policy runs): ${a.visits} visits, ${a.policyClears} cleared, mean deaths ${fmt(a.meanDeaths)}, max Attrition stacks ${a.maxAttritionStacks}, peak boss Attack ${fmt(a.maxPeakAttack)}`,
  )
  out.push(
    `ASSUMPTION 22: floor-1 clear >= ${FLOOR1_MIN_CLEAR_PCT}%: ${fmt(t.floor1ClearRatePct)}% ${verdict(t.floor1Pass)}; first soul median <= ${FIRST_SOUL_MAX_RUNS} floor runs: ${fmtMedian(t.medianRunsToFirstSoul)} ${verdict(t.firstSoulPass)}; a seed fights on floor ${SESSION_TARGET_FLOOR}+ in its first ${FLOOR5_WINDOW_RUNS} floor runs: ${t.seedsReachingFloor5InWindow} seeds ${verdict(t.floor5Pass)}`,
  )
  return out
}

export function formatReport(report: BalanceReport): string {
  const lines = [
    `Balance report: ${report.seeds.length} seeds (${report.seeds[0]}..${report.seeds[report.seeds.length - 1]}), run cap ${report.runCap}, content frontier floor ${report.frontier}`,
  ]
  for (const spec of report.specs) lines.push(...formatSpec(spec, report.frontier))
  lines.push('', 'ASSUMPTION 22 summary (reported, not asserted):')
  for (const spec of report.specs) {
    const t = spec.thresholds
    lines.push(
      `  ${spec.specId}: floor-1 ${verdict(t.floor1Pass)}, first soul ${verdict(t.firstSoulPass)}, floor 5 ${verdict(t.floor5Pass)}`,
    )
  }
  return lines.join('\n')
}
