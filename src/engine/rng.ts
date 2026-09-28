// mulberry32 — small, fast, deterministic PRNG. The only source of randomness allowed in
// src/engine: never Math.random() (see CONVENTIONS.md).
//
// Phase 4.1-B (B3): CombatState.rng is plain data, a bookmark { position: number } -- not a
// closure. `nextRandom(rng)` draws a value and ADVANCES `rng.position` IN PLACE (a deliberate,
// narrow exception to "never mutate" -- CONVENTIONS calls this out explicitly: rolls "advance
// the working copy's bookmark"). This is safe exactly because CALLERS are responsible for never
// handing `nextRandom` an rng object that's still shared with an input snapshot someone else
// might resolve again -- see combat.ts's `resolveTurn`, which clones `state.rng` into a fresh
// object at entry before any draw can reach it. Every helper below this point (target selectors,
// targeting, the interpreter, the resolver) just "advances the bookmark of the state it's given"
// -- it is the CALLER's job to have already handed them a genuinely fresh working copy.
//
// generation.ts keeps its own separate, unrelated RNG stream (the run-layer's persistent seed) --
// out of B3's scope, which is specifically CombatState.rng. `createSeededRng`/`SeededRng` stay
// exported for it, now implemented ON TOP of RngState/nextRandom so there is exactly one copy of
// the mulberry32 math to keep in step (B-2).

/** A plain-data RNG bookmark: the mulberry32 stream position. `position` is intentionally
 * mutable (not `readonly`) -- see this module's own doc comment above. Always stored as an
 * unsigned 32-bit integer (`>>> 0`), so a bookmark has exactly one representation regardless of
 * how it was produced -- this matters for position-equality checks (tests) and eventually saves. */
export interface RngState {
  position: number
}

/** Builds a fresh bookmark from a seed. */
export function createRngState(seed: number): RngState {
  return { position: seed >>> 0 }
}

/** Draws the next value in [0, 1) and advances `rng.position` in place. */
export function nextRandom(rng: RngState): number {
  rng.position = (rng.position + 0x6d2b79f5) >>> 0
  let t = Math.imul(rng.position ^ (rng.position >>> 15), 1 | rng.position)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// ---- Legacy closure API (generation.ts only; see this module's own doc comment) ----

export interface SeededRng {
  next(): number
}

/** A closure-based SeededRng, implemented on top of RngState/nextRandom so there is exactly one
 * copy of the mulberry32 math (B-2). Used only by generation.ts's own, unrelated RNG stream --
 * never by CombatState, which holds a plain RngState instead. */
export function createSeededRng(seed: number): SeededRng {
  const state = createRngState(seed)
  return {
    next(): number {
      return nextRandom(state)
    },
  }
}
