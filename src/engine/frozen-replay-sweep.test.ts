// Phase 4.1-B (B3 proof, design-review amendment): the single frozen double-resolve test
// (combat.test.ts) proves the claim on ONE fixture. This sweep proves it across every golden
// fixture that exports the uniform shape (`SEED`, `playerParty`, `enemyParty`, optionally
// `scripts`/`traits`/`statuses`, and either `expectedEvents` alone -- run to completion via
// resolveFight -- or `TURN_STEPS` + `expectedEvents` -- run turn-by-turn via resolveTurn,
// re-freezing the state before EACH turn, not just the first): for every one of them, deep-
// freezing the constructed `CombatState` and replaying it reproduces the exact committed event
// log. A handful of fixtures use a genuinely different shape (two seeds, non-`expectedEvents`
// summary stats, etc.); those are listed explicitly below rather than silently skipped.

import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight, resolveTurn } from './combat'
import { deepFreeze } from './test-utils/deep-freeze'
import type { CombatEvent, CombatState, Creature, FightResult } from './types'
import type { Script } from './scripting-types'
import type { StatusDef, Trait } from './effect-types'

interface FixtureModule {
  readonly SEED?: number
  readonly playerParty?: readonly Creature[]
  readonly enemyParty?: readonly Creature[]
  readonly scripts?: ReadonlyMap<string, Script>
  readonly traits?: ReadonlyMap<string, Trait>
  readonly statuses?: ReadonlyMap<string, StatusDef>
  readonly TURN_STEPS?: number
  readonly expectedEvents?: readonly CombatEvent[]
  readonly expectedResult?: FightResult
}

const modules = import.meta.glob<FixtureModule>('./__golden__/*.fixture.ts', {
  eager: true,
})

// Fixtures with a genuinely different export shape (not `SEED` + `playerParty` + `enemyParty` +
// `expectedEvents`), so this sweep can't drive them generically. Each is covered by its own
// dedicated golden test instead.
const KNOWN_NON_UNIFORM = [
  './__golden__/golden-6v6-scripted.fixture.ts', // summary stats, no expectedEvents
  './__golden__/golden-seed-sensitivity.fixture.ts', // no playerParty/enemyParty exported
  './__golden__/golden-shieldbarer-starter.fixture.ts', // expectedFirstTurnEvents, not expectedEvents
  './__golden__/golden-chance-percent.fixture.ts', // two seeds (Success/Fail), not one
  './__golden__/golden-cheat-death.fixture.ts', // two seeds (Success/Fail), not one
]

// Fixtures that DO export the uniform shape, but whose own `.test.ts` drives them with logic
// this sweep's generic replay (resolveFight to completion, or a TURN_STEPS-counted loop) can't
// reproduce: a single bare `resolveTurn` call (not a full fight), a hardcoded loop count that
// isn't exported, or a post-createCombat setup step (e.g. `updateCreature` wounding a creature
// before the run starts) that the fixture doesn't expose generically. Verified individually:
// each one's OWN dedicated golden test already covers it with the exact right driving logic;
// this sweep would otherwise silently replay the WRONG scenario (e.g. a full-HP creature instead
// of the wounded one the fixture's own test sets up) and fail for a reason that has nothing to
// do with B3.
const KNOWN_BESPOKE_DRIVER = [
  './__golden__/golden-action-observed.fixture.ts',
  './__golden__/golden-dot.fixture.ts',
  './__golden__/golden-gloomjaw-ravager.fixture.ts',
  './__golden__/golden-heal-scaling-count.fixture.ts',
  './__golden__/golden-heal-scaling-stat.fixture.ts',
  './__golden__/golden-hollowkin-wretch-self-dot.fixture.ts',
  './__golden__/golden-lullpollen-dozer.fixture.ts',
  './__golden__/golden-necromoss-reclaim.fixture.ts',
  './__golden__/golden-resonant-harmonize.fixture.ts',
  './__golden__/golden-resonant-overtone.fixture.ts',
  './__golden__/golden-rot-sovereign.fixture.ts',
  './__golden__/golden-round-end-mid-sweep-poison-refresh.fixture.ts',
  './__golden__/golden-round-end-mid-sweep-poison.fixture.ts',
  './__golden__/golden-sleep-wake.fixture.ts',
  './__golden__/golden-sparkeater-voidmaw.fixture.ts',
  './__golden__/golden-spider-broodwarden.fixture.ts',
  './__golden__/golden-sporch-cinderlord-burn-stacks.fixture.ts',
  './__golden__/golden-spore-spread-dot-kill.fixture.ts',
  './__golden__/golden-spore-spread-filter.fixture.ts',
  './__golden__/golden-spore-spread-fizzle.fixture.ts',
  './__golden__/golden-spore-spread.fixture.ts',
  './__golden__/golden-treant-grovekeep.fixture.ts',
  './__golden__/golden-web-break-free.fixture.ts',
]

const EXCLUDED = new Set([...KNOWN_NON_UNIFORM, ...KNOWN_BESPOKE_DRIVER])

const covered: [string, FixtureModule][] = []
const uncovered: string[] = []

for (const [path, mod] of Object.entries(modules)) {
  if (EXCLUDED.has(path)) continue
  if (
    mod.SEED !== undefined &&
    mod.playerParty !== undefined &&
    mod.enemyParty !== undefined &&
    mod.expectedEvents !== undefined
  ) {
    covered.push([path, mod])
  } else {
    uncovered.push(path)
  }
}

function replay(mod: FixtureModule): CombatEvent[] {
  const created = createCombat({
    seed: mod.SEED!,
    player: { party: mod.playerParty! },
    enemy: { party: mod.enemyParty! },
    registries: { scripts: mod.scripts, traits: mod.traits, statuses: mod.statuses },
  })

  const events: CombatEvent[] = []
  if (mod.TURN_STEPS !== undefined) {
    let state: CombatState = created
    for (let i = 0; i < mod.TURN_STEPS; i++) {
      // Re-freeze before EVERY turn, not just the first: each turn's own input must be
      // provably untouched, not merely the fight's original starting snapshot.
      const step = resolveTurn(deepFreeze(state))
      events.push(...step.events)
      state = step.state
    }
  } else {
    const result = resolveFight(deepFreeze(created))
    events.push(...result.events)
  }
  return events
}

describe('frozen replay sweep across golden fixtures (Phase 4.1-B, B3 proof)', () => {
  it('every fixture with a non-uniform export shape is accounted for (no silent gaps)', () => {
    expect(uncovered.sort()).toEqual([])
  })

  it('this sweep + the exclusion lists together account for every fixture on disk', () => {
    const allFixturePaths = Object.keys(modules).sort()
    const accountedFor = [...covered.map(([path]) => path), ...EXCLUDED].sort()
    expect(accountedFor).toEqual(allFixturePaths)
  })

  it.each(covered)(
    '%s: replaying a deep-frozen snapshot reproduces the committed event log exactly',
    (_path, mod) => {
      expect(replay(mod)).toEqual(mod.expectedEvents)
    },
  )
})
