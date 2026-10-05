// Phase 4.1-C2a (PR #71 review): the test-only corpus builder behind the behaviour-tripwire
// digest (`corpus-digest.fixture.ts` / `corpus-digest.test.ts`). Pinned exactly per the review's
// own spec -- do not reshape without regenerating the digest in a deliberate-change PR.
//
// This module imports `src/data`, exactly like `__golden__` fixtures do. Engine SOURCE must
// never import it (it lives outside `src/engine`'s own files, in a leaf-only, test-facing
// directory) -- `src/engine` stays pure per CONVENTIONS' "engine purity" rule. It sits outside
// `__golden__/` on purpose, so `frozen-replay-sweep.test.ts`'s fixture glob doesn't pick it up.

import { generateFloor, materializeCreature } from '../generation'
import { createSeededRng } from '../rng'
import { createCombat } from '../combat'
import { createCreatureId } from '../ids'
import { BIOMES } from '../../data/biomes'
import {
  ALL_SPELLS,
  BLINDING_FLARE,
  BRAMBLE_WARD,
  CINDER_NOVA,
  DISORIENT,
  EMBER_LANCE,
  HOWLING_INSTINCT,
  PACIFY,
  PUPPET_STRING,
  RASPING_CHANT,
  ROOT_GRASP,
  SILENCE,
  SPORE_CYST,
  STINGER_SWARM,
  THORN_LASH,
  VENOM_BOLT,
  VINE_SNARE,
  WEAKENING_BITE,
  WITHERING_BOLT,
} from '../../data/spells'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { TRAIT_REGISTRY } from '../../data/traits'
import {
  BRUTE,
  SHIELDBARER,
  SORCERER,
  resolveSpecializationEffects,
} from '../../data/specializations'
import type { Specialization } from '../../data/specializations'
import { DEFAULT_BALANCE_CONFIG } from '../../data/balance'
import {
  BRUTE_STARTER,
  BRUTE_STARTER_SPECIES_ID,
  SHIELDBARER_STARTER,
  SHIELDBARER_STARTER_SPECIES_ID,
  SORCERER_STARTER,
  SORCERER_STARTER_SPECIES_ID,
  UNICORN,
  UNICORN_SPECIES_ID,
} from '../../data/species/starters'
import { RESONANT_OVERTONE, RESONANTS_SPECIES_ID } from '../../data/species/glimmerdark'
import {
  LULLPOLLEN_DOZER,
  LULLPOLLEN_SPECIES_ID,
  POLLINATOR_BENEFICIARY,
  POLLINATORS_SPECIES_ID,
  SNAPJAW_JAWS,
  SNAPJAWS_SPECIES_ID,
  SWARMHIVE_SPECIES_ID,
  SWARMHIVE_STRIKER,
} from '../../data/species/overgrowth'
import { HOLLOWKIN_SPECIES_ID, HOLLOWKIN_WRETCH } from '../../data/species/rotcap-hollow'
import type { EffectDef } from '../effect-types'
import type { SpeciesCreature } from '../generation'
import type { CombatState, Creature, Spell } from '../types'

export interface CorpusFight {
  readonly seed: number
  readonly player: readonly Creature[]
  readonly enemy: readonly Creature[]
  /** Phase 4.1-D2: player-wide effects (specialization perks), the `createCombat` side input.
   * Absent for Parts A and B, which pass none. */
  readonly playerEffects?: readonly EffectDef[]
}

/** The one place a corpus fight becomes a `CombatState` (the digest and the coverage test both
 * call it, so they cannot drift on registries or side inputs). */
export function createCorpusCombat(fight: CorpusFight): CombatState {
  return createCombat({
    seed: fight.seed,
    player: {
      party: fight.player,
      ...(fight.playerEffects ? { effects: fight.playerEffects } : {}),
    },
    enemy: { party: fight.enemy },
    registries: {
      scripts: STOCK_SCRIPTS_BY_ID,
      traits: TRAIT_REGISTRY,
      statuses: STATUS_REGISTRY,
    },
  })
}

/** `gen(floor, seed)`, per the review's own spec: `b = floor((floor-1)/10)`, one generated
 * floor's `[0].enemyParty`. Every corpus floor reference stays within floors 1-30 (biomes 1-3,
 * the only biomes with real content), so `BIOMES[b]` is always defined here. */
function gen(floor: number, seed: number): readonly Creature[] {
  const b = Math.floor((floor - 1) / 10)
  const biome = BIOMES[b]
  if (!biome) {
    throw new Error(`corpus: no biome at index ${b} for floor ${floor}`)
  }
  const [fight] = generateFloor(
    floor,
    biome,
    b + 1,
    ALL_SPELLS,
    createSeededRng(seed),
    DEFAULT_BALANCE_CONFIG,
  )
  if (!fight) {
    throw new Error(
      `corpus: generateFloor produced no fight for floor ${floor}, seed ${seed}`,
    )
  }
  return fight.enemyParty
}

/** Part A's own player-side re-siding: an enemy-generated party, flipped to the player side with
 * its ids rewritten (`-enemy-` -> `-player-`) so they don't collide with the real enemy party's
 * own ids in the same fight. */
function reSideToPlayer(party: readonly Creature[]): Creature[] {
  return party.map((c) => ({
    ...c,
    side: 'player' as const,
    id: createCreatureId((c.id as string).replace('-enemy-', '-player-')),
  }))
}

function buildPartA(i: number): CorpusFight {
  const enemy = gen(1 + (i % 30), 10000 + i)
  const player = reSideToPlayer(gen(1 + ((i * 7 + 3) % 30), 20000 + i))
  return { seed: i, player, enemy }
}

function withShieldbarerAtSlot0(party: readonly Creature[], level: number): Creature[] {
  return [
    materializeCreature(SHIELDBARER_STARTER, {
      level,
      side: 'enemy',
      slot: 0,
      speciesId: SHIELDBARER_STARTER_SPECIES_ID,
    }),
    ...party.slice(1),
  ]
}

/** Slot 1: replacing it if the party already has one, appending it (as the new slot 1) if the
 * party had only one creature -- per the review's own spec. */
function withWretchAtSlot1(party: readonly Creature[], level: number): Creature[] {
  const wretch = materializeCreature(HOLLOWKIN_WRETCH, {
    level,
    side: 'enemy',
    slot: 1,
    speciesId: HOLLOWKIN_SPECIES_ID,
  })
  if (party.length === 1) return [...party, wretch]
  return [party[0]!, wretch, ...party.slice(2)]
}

function buildPartB(i: number): CorpusFight {
  const level = 1 + (i % 25)
  const player: Creature[] = [
    materializeCreature(SORCERER_STARTER, {
      level,
      side: 'player',
      slot: 0,
      speciesId: SORCERER_STARTER_SPECIES_ID,
    }),
    materializeCreature(BRUTE_STARTER, {
      level,
      side: 'player',
      slot: 1,
      speciesId: BRUTE_STARTER_SPECIES_ID,
    }),
    materializeCreature(SHIELDBARER_STARTER, {
      level,
      side: 'player',
      slot: 2,
      speciesId: SHIELDBARER_STARTER_SPECIES_ID,
    }),
    materializeCreature(UNICORN, {
      level,
      side: 'player',
      slot: 3,
      speciesId: UNICORN_SPECIES_ID,
    }),
  ]
  if (i % 2 === 1) {
    player.push(
      materializeCreature(RESONANT_OVERTONE, {
        level,
        side: 'player',
        slot: 4,
        speciesId: RESONANTS_SPECIES_ID,
      }),
    )
  }

  const generated = gen(1 + (i % 30), 30000 + i)
  const first = generated[0]
  if (!first) throw new Error(`corpus: generated enemy party empty for i=${i}`)
  const lvl = first.origin.level

  let enemy = generated
  switch (i % 4) {
    case 0:
      enemy = withShieldbarerAtSlot0(enemy, lvl)
      break
    case 1:
      enemy = withWretchAtSlot1(enemy, lvl)
      break
    case 2:
      enemy = withWretchAtSlot1(withShieldbarerAtSlot0(enemy, lvl), lvl)
      break
    case 3:
      break
    default:
      throw new Error(`corpus: unreachable i % 4 = ${i % 4}`)
  }

  return { seed: 1000 + i, player, enemy }
}

// ---- Part C (Phase 4.1-D2): coverage fights ----
//
// Appended after Part B, never interleaved: the digest compares entries by index, so appending is
// the only change that leaves every existing entry untouched. Part C's own seed ranges: combat
// seeds 2000+, generated-enemy seeds 50000+ (Part A uses `i`, Part B `1000 + i`). Real content
// only: shipped species, spells, stock scripts and specializations.

interface SpellFightSpec {
  readonly spell: Spell
  readonly caster: SpeciesCreature
  readonly speciesId: string
}

/** One fight per spell Parts A and B never cast. The stock `always-cast` script casts gemSlot 0,
 * so the spell sits in slot 0 of an affinity-matched caster (equip-gating) with no innate spell
 * ahead of it (the Sorcerer starter's Arcane Bolt would take slot 0). The caster fights beside
 * the Brute and Shieldbarer starters against `WALL_ENEMY`, which neither attacks nor controls:
 * the caster always gets its turn, and every round it casts again until the fight ends. Coverage
 * therefore rides on no random draw at all, so a later change to draw order cannot drop it. */
const SPELL_FIGHTS: readonly SpellFightSpec[] = [
  { spell: EMBER_LANCE, caster: BRUTE_STARTER, speciesId: BRUTE_STARTER_SPECIES_ID },
  { spell: CINDER_NOVA, caster: BRUTE_STARTER, speciesId: BRUTE_STARTER_SPECIES_ID },
  { spell: THORN_LASH, caster: BRUTE_STARTER, speciesId: BRUTE_STARTER_SPECIES_ID },
  {
    spell: WEAKENING_BITE,
    caster: BRUTE_STARTER,
    speciesId: BRUTE_STARTER_SPECIES_ID,
  },
  {
    spell: BLINDING_FLARE,
    caster: BRUTE_STARTER,
    speciesId: BRUTE_STARTER_SPECIES_ID,
  },
  {
    spell: WITHERING_BOLT,
    caster: BRUTE_STARTER,
    speciesId: BRUTE_STARTER_SPECIES_ID,
  },
  {
    spell: ROOT_GRASP,
    caster: SHIELDBARER_STARTER,
    speciesId: SHIELDBARER_STARTER_SPECIES_ID,
  },
  {
    spell: BRAMBLE_WARD,
    caster: SHIELDBARER_STARTER,
    speciesId: SHIELDBARER_STARTER_SPECIES_ID,
  },
  {
    spell: RASPING_CHANT,
    caster: SHIELDBARER_STARTER,
    speciesId: SHIELDBARER_STARTER_SPECIES_ID,
  },
  { spell: VENOM_BOLT, caster: LULLPOLLEN_DOZER, speciesId: LULLPOLLEN_SPECIES_ID },
  {
    spell: STINGER_SWARM,
    caster: LULLPOLLEN_DOZER,
    speciesId: LULLPOLLEN_SPECIES_ID,
  },
  {
    spell: HOWLING_INSTINCT,
    caster: LULLPOLLEN_DOZER,
    speciesId: LULLPOLLEN_SPECIES_ID,
  },
  { spell: DISORIENT, caster: LULLPOLLEN_DOZER, speciesId: LULLPOLLEN_SPECIES_ID },
  {
    spell: PUPPET_STRING,
    caster: LULLPOLLEN_DOZER,
    speciesId: LULLPOLLEN_SPECIES_ID,
  },
  {
    spell: SPORE_CYST,
    caster: POLLINATOR_BENEFICIARY,
    speciesId: POLLINATORS_SPECIES_ID,
  },
]

/** Phase 4.1-F3: Silence (a Brute caster, Violence) and Pacify (a Pollinator Beneficiary, Wit, no
 * innate spell). */
const F3_SPELL_FIGHTS: readonly SpellFightSpec[] = [
  { spell: SILENCE, caster: BRUTE_STARTER, speciesId: BRUTE_STARTER_SPECIES_ID },
  {
    spell: PACIFY,
    caster: POLLINATOR_BENEFICIARY,
    speciesId: POLLINATORS_SPECIES_ID,
  },
]

function buildSpellFight(index: number, spec: SpellFightSpec): CorpusFight {
  const level = SPELL_FIGHT_LEVEL
  const player: Creature[] = [
    materializeCreature(spec.caster, {
      level,
      side: 'player',
      slot: 0,
      speciesId: spec.speciesId,
      gems: [spec.spell, null, null],
      scriptId: 'always-cast',
    }),
    materializeCreature(BRUTE_STARTER, {
      level,
      side: 'player',
      slot: 1,
      speciesId: BRUTE_STARTER_SPECIES_ID,
    }),
    materializeCreature(SHIELDBARER_STARTER, {
      level,
      side: 'player',
      slot: 2,
      speciesId: SHIELDBARER_STARTER_SPECIES_ID,
    }),
  ]
  return {
    seed: 2000 + index,
    player,
    enemy: buildParty(WALL_ENEMY, 'enemy', level),
  }
}

// ---- Perk fights ----

/** A spec with every perk at its max level: the fully maxed spec the design allows. */
export function maxedPerkSpend(spec: Specialization): ReadonlyMap<string, number> {
  return new Map(spec.perks.map((p) => [p.id, p.maxLevel]))
}

interface PartyMember {
  readonly creature: SpeciesCreature
  readonly speciesId: string
  readonly scriptId?: string
  readonly gems?: readonly (Spell | null)[]
}

function buildParty(
  members: readonly PartyMember[],
  side: 'player' | 'enemy',
  level: number,
): Creature[] {
  return members.map((m, slot) =>
    materializeCreature(m.creature, {
      level,
      side,
      slot,
      speciesId: m.speciesId,
      ...(m.gems ? { gems: m.gems } : {}),
      ...(m.scriptId ? { scriptId: m.scriptId } : {}),
    }),
  )
}

const brute = (scriptId?: string): PartyMember => ({
  creature: BRUTE_STARTER,
  speciesId: BRUTE_STARTER_SPECIES_ID,
  ...(scriptId ? { scriptId } : {}),
})
const shieldbarer = (scriptId?: string): PartyMember => ({
  creature: SHIELDBARER_STARTER,
  speciesId: SHIELDBARER_STARTER_SPECIES_ID,
  ...(scriptId ? { scriptId } : {}),
})
const sorcerer = (scriptId?: string): PartyMember => ({
  creature: SORCERER_STARTER,
  speciesId: SORCERER_STARTER_SPECIES_ID,
  ...(scriptId ? { scriptId } : {}),
})
const striker: PartyMember = {
  creature: SWARMHIVE_STRIKER,
  speciesId: SWARMHIVE_SPECIES_ID,
}
const jaws: PartyMember = { creature: SNAPJAW_JAWS, speciesId: SNAPJAWS_SPECIES_ID }
const dozerCaster = (spell: Spell): PartyMember => ({
  creature: LULLPOLLEN_DOZER,
  speciesId: LULLPOLLEN_SPECIES_ID,
  scriptId: 'always-cast',
  gems: [spell, null, null],
})
const beneficiaryCaster = (spell: Spell): PartyMember => ({
  creature: POLLINATOR_BENEFICIARY,
  speciesId: POLLINATORS_SPECIES_ID,
  scriptId: 'always-cast',
  gems: [spell, null, null],
})

const SPELL_FIGHT_LEVEL = 20

/** Phase 4.1-F3: a Violence caster whose only gem is `spell` (the Brute starter has no innate
 * spell, so the gem sits in slot 0 for the stock `always-cast` script). */
const bruteCaster = (spell: Spell): PartyMember => ({
  creature: BRUTE_STARTER,
  speciesId: BRUTE_STARTER_SPECIES_ID,
  scriptId: 'always-cast',
  gems: [spell, null, null],
})

/** Never attacks, never controls: a Provoking Shieldbarer and two Defending ones. Player damage
 * against it is mostly the 1% chip floor, so it outlasts a fight of many rounds. */
const WALL_ENEMY: readonly PartyMember[] = [
  shieldbarer(),
  shieldbarer('always-defend'),
  shieldbarer('always-defend'),
]

/** What most perk fights face: a Shieldbarer that Provokes (so a Provoke-immunity perk has
 * something to ignore, and the fight lasts), a Puppet String caster (so a Confusion-immunity perk
 * has a Confusion to ignore) and plain attackers (damage for the defensive perks to answer). */
const PERK_ENEMY: readonly PartyMember[] = [
  shieldbarer(),
  dozerCaster(PUPPET_STRING),
  brute(),
  striker,
  jaws,
]

export interface PerkFightVariant {
  readonly id: string
  readonly spec: Specialization
  /** The fight, with every perk of `spec` at max level, minus `withoutPerkId` when given. */
  readonly build: (withoutPerkId?: string) => CorpusFight
}

function perkVariant(
  id: string,
  spec: Specialization,
  index: number,
  levels: { readonly player: number; readonly enemy: number },
  playerMembers: readonly PartyMember[],
  enemyMembers: readonly PartyMember[] = PERK_ENEMY,
): PerkFightVariant {
  return {
    id,
    spec,
    build: (withoutPerkId) => {
      const spend = new Map(maxedPerkSpend(spec))
      if (withoutPerkId !== undefined) spend.delete(withoutPerkId)
      return {
        seed: 2100 + index,
        player: buildParty(playerMembers, 'player', levels.player),
        enemy: buildParty(enemyMembers, 'enemy', levels.enemy),
        playerEffects: resolveSpecializationEffects(spec, spend),
      }
    },
  }
}

/** One fight per specialization, then a variant wherever a perk did not yet matter in it (the
 * coverage test's "removing it changes the event log" rule decides which are needed). */
export const PERK_FIGHT_VARIANTS: readonly PerkFightVariant[] = [
  perkVariant('sorcerer', SORCERER, 0, { player: 20, enemy: 20 }, [
    sorcerer(),
    beneficiaryCaster(VINE_SNARE),
    dozerCaster(VENOM_BOLT),
    shieldbarer(),
  ]),
  // Concussive Blows is a 25% roll per attack: five attackers against a wall three times their
  // level, so the party swings hundreds of times and the roll cannot miss in practice.
  perkVariant(
    'brute',
    BRUTE,
    1,
    { player: 20, enemy: 60 },
    [brute(), brute(), brute(), striker, jaws, sorcerer()],
    WALL_ENEMY,
  ),
  // A Weakened creature only matters if it then hits something. Tanky attackers (Shieldbarers on
  // Attack) trade blows with two hard-hitting Brutes, so Weaken lands on Brutes that go on to
  // strike, and twice the swings of the party keep Concussive Blows rolling.
  perkVariant(
    'brute-weakened',
    BRUTE,
    6,
    { player: 50, enemy: 60 },
    [
      shieldbarer('always-attack'),
      shieldbarer('always-attack'),
      shieldbarer('always-attack'),
      shieldbarer('always-attack'),
      shieldbarer('always-attack'),
      shieldbarer('always-attack'),
    ],
    [shieldbarer(), brute(), brute()],
  ),
  // Bulwark counts the bearer's own Defends, so a Defender must also be hit: enemies target the
  // lowest-HP creature, which a Provoker would otherwise shield, so this party has none.
  perkVariant('shieldbarer-defenders', SHIELDBARER, 3, { player: 20, enemy: 20 }, [
    sorcerer('always-defend'),
    brute(),
    brute('always-defend'),
  ]),
  // Lucidity only changes anything when a Confused creature takes harmful actions (each one rolls
  // the 50% redirect, which immunity skips), so four attackers face two Puppet String casters
  // that a Provoking Shieldbarer keeps out of reach: Confusion is reapplied every round. The enemy
  // is level 40 so the casters outlive the party's early swings at any seed (at 20 they died
  // after one or two casts at some seeds, leaving Lucidity nothing to skip).
  perkVariant(
    'shieldbarer-confusion',
    SHIELDBARER,
    4,
    { player: 20, enemy: 40 },
    [
      shieldbarer('always-attack'),
      shieldbarer('always-attack'),
      shieldbarer('always-attack'),
      shieldbarer('always-attack'),
    ],
    [shieldbarer(), dozerCaster(PUPPET_STRING), dozerCaster(PUPPET_STRING)],
  ),
  // Last Stand is a 50% roll each time a hit would kill. Six waiting creatures facing hard hitters
  // each meet at least one lethal hit, and a saved one meets another, so the roll happens many
  // times and no draw order can leave it unrolled.
  perkVariant(
    'shieldbarer-doomed',
    SHIELDBARER,
    5,
    { player: 20, enemy: 40 },
    [
      shieldbarer('always-wait'),
      shieldbarer('always-wait'),
      shieldbarer('always-wait'),
      shieldbarer('always-wait'),
      shieldbarer('always-wait'),
      shieldbarer('always-wait'),
    ],
    [brute(), brute(), striker, jaws, brute()],
  ),
  perkVariant('shieldbarer', SHIELDBARER, 2, { player: 20, enemy: 20 }, [
    shieldbarer(),
    shieldbarer('always-defend'),
    brute(),
    sorcerer(),
  ]),
  // Phase 4.1-F3 (ASSUMPTION 59), appended last (corpus entries 522-523, seeds 2107-2108): Clear
  // Mind and Aggressive only matter against a Silenced / Pacified bearer that would otherwise
  // use the locked action. Rides on no chance: the enemy caster is `always-cast` and four times
  // the player's level (it outlives the early swings), its target is the player's lowest-HP
  // creature, and every player creature is a user of the locked action -- an all-Seer party
  // (Seers cast every turn) against Silence, an all-Brute party (Brutes attack every turn)
  // against Pacify. With the perk the creature still casts / attacks; without it, the script
  // falls through (a Seer attacks, a Brute waits), so the log differs. The Pacifier is a
  // Pollinator Beneficiary (Wit, no innate spell, so Pacify sits in slot 0).
  perkVariant(
    'sorcerer-silenced',
    SORCERER,
    7,
    { player: 20, enemy: 80 },
    [sorcerer(), sorcerer(), sorcerer(), sorcerer()],
    [shieldbarer(), bruteCaster(SILENCE)],
  ),
  perkVariant(
    'brute-pacified',
    BRUTE,
    8,
    { player: 20, enemy: 80 },
    [brute(), brute(), brute(), brute()],
    [shieldbarer(), beneficiaryCaster(PACIFY)],
  ),
]

/** The ordered list of fights the digest hashes -- Part A (300 generated fights), Part B (200
 * fights with the shipped player creatures), then Part C (coverage fights, Phase 4.1-D2). A and B
 * are pinned exactly per the review's own spec; C only ever appends. */
export function buildCorpus(): readonly CorpusFight[] {
  const partA = Array.from({ length: 300 }, (_, i) => buildPartA(i))
  const partB = Array.from({ length: 200 }, (_, i) => buildPartB(i))
  const partC = [
    ...SPELL_FIGHTS.map((spec, i) => buildSpellFight(i, spec)),
    ...PERK_FIGHT_VARIANTS.map((v) => v.build()),
    // Phase 4.1-F3 (ASSUMPTION 58): the Silence and Pacify spell fights, after the perk fights
    // (entries 524-525, seeds 2015-2016): appended, never interleaved. Same shape as
    // SPELL_FIGHTS (an `always-cast` caster against WALL_ENEMY), so the status landing rides on
    // no random draw.
    ...F3_SPELL_FIGHTS.map((spec, i) => buildSpellFight(SPELL_FIGHTS.length + i, spec)),
  ]
  return [...partA, ...partB, ...partC]
}
