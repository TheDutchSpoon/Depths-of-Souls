import { SPECIALIZATIONS } from '../data/specializations'
import { MAX_RUN_SEED } from '../state/store'
import type { GameActions } from '../state/store'
import { generateRunSeed } from './newGame'
import type { RandomSource } from './newGame'

export type SeedRefusal = 'not-a-whole-number' | 'seed-out-of-range'

export type SeedField =
  | { readonly ok: true; readonly seed: number | null }
  | { readonly ok: false; readonly reason: SeedRefusal }

/** The seed field is free text; a blank one means "draw a seed at Start" (`seed: null`). */
export function parseSeedField(text: string): SeedField {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, seed: null }
  if (!/^-?\d+$/.test(trimmed)) return { ok: false, reason: 'not-a-whole-number' }
  // `+ 0` turns a "-0" into 0, so the store never holds a negative zero.
  const seed = Number(trimmed) + 0
  if (seed < 0 || seed > MAX_RUN_SEED) return { ok: false, reason: 'seed-out-of-range' }
  return { ok: true, seed }
}

export type StartRunResult =
  | { readonly ok: true; readonly seed: number }
  | { readonly ok: false; readonly reason: SeedRefusal }

/** The one start path: the Start button and the presence test both call it. The calls and their
 * order are the balance simulator's run start, so a demo run matches a simulated one for the
 * same seed. The seed is validated first, so `newGame` never throws. */
export function startRun(
  store: Pick<GameActions, 'newGame' | 'setSpec' | 'runScriptedIntro'>,
  specId: string,
  seedText: string,
  source?: RandomSource,
): StartRunResult {
  const parsed = parseSeedField(seedText)
  if (!parsed.ok) return parsed
  const seed = parsed.seed ?? generateRunSeed(source)
  store.newGame({ seed })
  store.setSpec(specId)
  store.runScriptedIntro()
  return { ok: true, seed }
}

/** In the data's order. */
export const SPEC_CHOICES: readonly { readonly id: string; readonly name: string }[] =
  SPECIALIZATIONS.map((spec) => ({ id: spec.id, name: spec.name }))
