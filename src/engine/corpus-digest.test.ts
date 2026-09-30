// Phase 4.1-C2a (PR #71 review): the corpus digest -- a behaviour tripwire, not a spec
// (CONVENTIONS "Testing"). Resolves every fight in the pinned corpus (`__corpus__/corpus.ts`)
// and compares each fight's event-log hash/count/result against the committed, GENERATED
// fixture (`__corpus__/corpus-digest.fixture.ts`). Byte-identical PRs leave the fixture
// unchanged; a deliberate-change PR regenerates it (`npm run corpus:update`) and attributes
// every changed fight in its own description.

import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'
import { createCombat, resolveFight } from './combat'
import { buildCorpus } from './__corpus__/corpus'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { TRAIT_REGISTRY } from '../data/traits'
import { STATUS_REGISTRY } from '../data/statuses'
import { CORPUS_DIGEST } from './__corpus__/corpus-digest.fixture'
import type { CorpusFight } from './__corpus__/corpus'
import type { CorpusDigestEntry } from './__corpus__/corpus-digest.fixture'

/** FNV-1a, 32-bit, over the UTF-16 code units of `str` -- small, fast, deterministic, and (unlike
 * a cryptographic hash) trivial to hand-verify for a spot check. 8 lowercase hex chars. */
function fnv1a32(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function digestFight(fight: CorpusFight): CorpusDigestEntry {
  const state = createCombat({
    seed: fight.seed,
    player: { party: fight.player },
    enemy: { party: fight.enemy },
    registries: {
      scripts: STOCK_SCRIPTS_BY_ID,
      traits: TRAIT_REGISTRY,
      statuses: STATUS_REGISTRY,
    },
  })
  const { state: finalState, events } = resolveFight(state)
  if (finalState.result === null) {
    throw new Error(
      'corpus digest: a fight resolved without a result -- ROUND_CAP too low?',
    )
  }
  return {
    hash: fnv1a32(JSON.stringify(events)),
    events: events.length,
    result: finalState.result,
  }
}

const FIXTURE_PATH = fileURLToPath(
  new URL('./__corpus__/corpus-digest.fixture.ts', import.meta.url),
)

function renderFixture(entries: readonly CorpusDigestEntry[]): string {
  const rows = entries
    .map((e) => `  { hash: '${e.hash}', events: ${e.events}, result: '${e.result}' },`)
    .join('\n')
  return `// GENERATED behaviour tripwire -- not hand-derived, not a spec. Regenerate only via
// \`npm run corpus:update\`, and only in a deliberate-change PR that attributes every changed
// fight (CONVENTIONS "Testing", corpus digest).

export interface CorpusDigestEntry {
  readonly hash: string
  readonly events: number
  readonly result: 'win' | 'loss' | 'draw'
}

export const CORPUS_DIGEST: readonly CorpusDigestEntry[] = [
${rows}
]
`
}

describe('corpus digest (Phase 4.1-C2a, behaviour tripwire)', () => {
  it('every fight matches the committed digest', async () => {
    const corpus = buildCorpus()
    const actual = corpus.map(digestFight)

    if (import.meta.env.MODE === 'corpus-update') {
      const config = await prettier.resolveConfig(FIXTURE_PATH)
      const formatted = await prettier.format(renderFixture(actual), {
        ...config,
        filepath: FIXTURE_PATH,
      })
      writeFileSync(FIXTURE_PATH, formatted)
      return
    }

    const changed: number[] = []
    for (let i = 0; i < actual.length; i++) {
      const got = actual[i]!
      const want = CORPUS_DIGEST[i]
      if (
        !want ||
        got.hash !== want.hash ||
        got.events !== want.events ||
        got.result !== want.result
      ) {
        changed.push(i)
      }
    }
    if (actual.length !== CORPUS_DIGEST.length) {
      changed.push(
        ...Array.from(
          { length: Math.abs(actual.length - CORPUS_DIGEST.length) },
          (_, k) => Math.min(actual.length, CORPUS_DIGEST.length) + k,
        ),
      )
    }

    if (changed.length > 0) {
      const first20 = changed.slice(0, 20)
      throw new Error(
        `corpus digest mismatch: ${changed.length} fight(s) changed (corpus has ${actual.length}, fixture has ${CORPUS_DIGEST.length}). ` +
          `First 20 changed indices: ${first20.join(', ')}. ` +
          `If this is a deliberate behaviour change, regenerate with \`npm run corpus:update\` and attribute every changed fight in the PR.`,
      )
    }

    expect(actual.length).toBe(CORPUS_DIGEST.length)
  }, 60_000) // ~4.1s measured vs. Vitest's 5s default -- explicit headroom, not a tuned budget.
})
