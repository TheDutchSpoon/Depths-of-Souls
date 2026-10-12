# Kickoff — Phase 4.5 — Slice B: on-death-observed

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/effects.md` (the `## Engine rules` half, closely: `spec/effects.md#hooks`,
  `spec/effects.md#hook-execution`, `spec/effects.md#effect-instances`,
  `spec/effects.md#dead-creatures`, `spec/effects.md#damage-path-hook-order`,
  `spec/effects.md#action-reactions-actor-self-hooks-or-observation`,
  `spec/effects.md#damage-observation`, `spec/effects.md#validators`,
  `spec/effects.md#stacks-false`, `spec/effects.md#count-scaling`) and `spec/responses.md`
  (`spec/responses.md#triggering-source-is-never-the-firing-creature`,
  `spec/responses.md#fizzles`, `spec/responses.md#revive`).
- The brief: `phases/4.5/brief.md#on-death-observed`,
  `phases/4.5/brief.md#createcombat-validates-its-trait-registry`, and `phases/4.5/B/brief.md`.
  The first one was amended at this kickoff: a creature never observes its own death, and
  `relationship: 'self'` is rejected on the new hook. The spec still describes `main` (the two old
  hooks) until this slice's PR review; build against the brief.
- Content docs, for the 7 data triggers that move: `content/glimmerdark.md#flickerling-last-gleam`,
  `content/rotcap-hollow.md#rotfeeder-scavenger`, `content/rotcap-hollow.md#myconet-warder`,
  `content/rotcap-hollow.md#myconet-gravedigger`, `content/rotcap-hollow.md#necromoss-thicket`,
  `content/rotcap-hollow.md#rot-sovereign`.
- Code, before planning: `engine/resolution.ts` (`applyDamageAndEmit`, `fireDeathObservers`,
  `livingIdsOf`, and `fireHook`'s two observation-filter blocks), `engine/actions.ts` and
  `engine/combat.ts` (each holds a private `livingIds`, identical to `livingIdsOf`),
  `engine/effect-types.ts` (`Hook`, `ObservationFilter`, `validateObservationFilters`,
  `validateStatusDef`), `engine/combat.ts` (`createCombat`'s status-registry loop),
  `data/traits/index.ts` (`validateTrait` and its load-time loop), `engine/__fixtures__/traits.ts`
  (Grudge).
- Goldens: `golden-damage-observed-lethal`, `golden-last-gleam`, `golden-rot-sovereign` and
  `golden-spore-spread` (its comments narrate `fireDeathObservers`).

## Scope

Two items from the phase brief, nothing else.

**1. `on-death-observed`.** `on-ally-death` and `on-enemy-death` leave the `Hook` union and
`on-death-observed` joins it (17 hooks become 16). When a creature dies, `fireDeathObservers` makes
**one** `fireHook('on-death-observed', …)` call whose observers are the living creatures in
tie-break order (side → slot → id) **minus the dead creature, by id**; the hook's `source` is the
dead creature. `relationship` compares the observer with the dead creature: `ally` (same side),
`enemy`, `any`; an absent filter or field matches everything, as on the other two observation
hooks. `validateObservationFilters` accepts a filter on the new hook, carrying `relationship`
only: `self` is rejected there (its home is `on-death`), and so are `actionKind`, `excludeActor`
and `selfInflicted`. The 8 triggers move: Last Gleam, Myconet Warder, Myconet Gravedigger,
Necromoss Thicket and Grudge to `ally`; Rotfeeder Scavenger to `enemy`; the Rot Sovereign's two
triggers become one `any` trigger (same `factor: 1.1`, same `self` target). `on-death` and
`on-kill` are untouched.

Reuse, don't copy (the slice brief's "Known"): the relationship comparison becomes one helper used
by all three observation hooks, and the three private copies of the living-ids helper
(`resolution.ts`, `actions.ts`, `combat.ts`) become one export. Both are byte-identical for the
existing hooks.

**2. `createCombat` validates its trait registry.** `validateTrait` moves to
`engine/effect-types.ts`, beside `validateStatusDef`, and is its only home (no re-export from
`data/traits`). `createCombat` runs it over `registries.traits`, beside the status-registry loop.
`data/traits/index.ts` keeps its load-time loop over `STOCK_TRAITS`, calling the engine export.
The fixture-trait validation test stays and imports from the engine.

**Not in this slice:** the dead-creature turn skip (4.5-C), any content number, validating the
side `effects` (perks) in `createCombat`, and any living-doc edit (they go under **Spec
questions**).

## Golden policy

Deliberate changes, listed. Every other golden, integration goldens included, stays
byte-identical: no other golden names the old hooks.

- `golden-damage-observed-lethal`, `golden-last-gleam`, `golden-rot-sovereign`: the `hook` field
  of the death-observer `TriggerFired` events, `'on-ally-death'` / `'on-enemy-death'` →
  `'on-death-observed'`, and nothing else. As I read them, none of the three has a listener on
  both sides of a death, so the new order moves no event in them; if the plan finds one that does,
  list it as an order change. Their comments are updated in the same edit.
- `golden-spore-spread`: comment-only (`CONVENTIONS.md#comment-only-golden-edits-are-allowed`).
- Unit tests that change: `engine/damage-observation.test.ts` (the lethal-ordering test, title
  included), `engine/resolution.test.ts` (Grudge re-stacking, see Traps),
  `data/traits/glimmerdark.test.ts`, `engine/__fixtures__/traits.test.ts`.
- **New hand-derived goldens**, through the shared runner: `ally`, `enemy` and `any`, each also
  showing a non-matching observer staying silent; and the new order: an enemy dies with a listening
  observer on each side, and the player-side one fires first (today the dead creature's allies all
  fire before its enemies). One golden may carry several of these if each claim stays readable.
- The corpus digest is regenerated **once**, through `npm run corpus:update`, with every changed
  fight attributed (`CONVENTIONS.md#corpus-digest`).

## Traps

- **Excluding the dead creature by `alive` is not enough.** A creature revived between its death
  and its observers (here, by its own `on-death` `revive` on `random-dead-ally`, a pool that holds
  only itself, so one draw) is alive again when the observers fire. Only the by-id exclusion keeps
  it from observing its own death. Pin it with a test that fails under an alive-only filter.
- **One `fireHook` call, not one per observer.** `stacks: false` claims are per call; today's
  per-creature loop resets them for each observer, which `spec/effects.md#stacks-false` doesn't
  allow ("across all living creatures"). No shipped death trigger is non-stacking, so no golden
  shows it: pin it with two carriers of one `stacks: false` death observer, which fire exactly
  once together.
- **Fail closed.** A candidate whose dead creature can't be found is skipped, like
  `on-damage-observed`'s. So the Grudge re-stacking test in `resolution.test.ts`, which fires the
  hook with an `ally` id that isn't in the state, would silently stop firing: give it a real dead
  ally. Don't loosen the gate.
- **The two existing filter blocks differ on a missing creature**: `on-action-observed` skips its
  `relationship` check when the actor isn't found (so it fires), `on-damage-observed` skips the
  candidate. Neither path is reachable from a call site today. If the shared helper unifies them,
  mark it as an ASSUMPTION and show that every call site always finds the creature.
- **`fireHook`'s `isDeathHook` is `hook === 'on-death'`.** The new hook is alive-gated like every
  hook but `on-death`; nothing that matches hooks by name may sweep it into the death branch.
- **The Sovereign's trait loses an effect**, so the instance ids of her later effects shift. Ids
  never appear in events, so no log changes: an id shift is not a golden diff to explain.
- **Write each migrated trigger's filter out**, the Sovereign's `{ relationship: 'any' }`
  included. An absent filter means `any`, so a migrated `ally` trigger that lost its filter would
  silently start firing on enemy deaths too.
- **Stale names outside the type checker.** `docs:check -- comments` doesn't catch an old hook
  name in a comment or test title: `data/traits/glimmerdark.ts`, `data/traits/rotcap-hollow.ts`,
  `engine/effect-types.ts` (`ObservationFilter`'s doc comment), `engine/resolution.ts` and the
  golden headers all name them today.
- **`createCombat` now throws on an invalid trait.** A test that hands it an invalid inline trait
  starts failing: stop and ask, never adjust the trait quietly (phase brief).

## Must stay green

All gates in `coding-rules.md`; every golden not listed above, byte-identical; the balance
threshold tests; the fixture-trait validation test; the stock-trait load-time loop and its data
tests.

## The PR must prove

- `grep -rn "on-ally-death\|on-enemy-death" src` is empty, and `Hook` has 16 members.
- Each listed old golden's change is only the `hook` field: shown by importing `main`'s and the
  branch's fixtures, mapping the two old names to the new one, and deep-comparing.
- Each new mechanism fails with it removed, at each site: the relationship helper (per
  relationship), the new order (allies-then-enemies brings it back), the by-id exclusion
  (alive-only), the single call (a per-observer loop), the `self` rejection, and the
  `createCombat` trait loop.
- The corpus: how many fights changed, and each one attributed. The shipped death observers are all
  deterministic, damage-free responses on their own side, so the new order can only move events
  inside one death's observer block. For every changed fight, `main`'s log with the hook names
  mapped holds the same events as the branch's (byte-identical: name only; same multiset: order),
  with the same result, rounds and final HPs. Anything else is a bug, not the listed change. The
  table goes in `evidence/`.
- The test count, reconciled file by file against `main`.

## Docs edited at this kickoff

- `.claude/phases/4.5/brief.md#on-death-observed`: the dead creature is left out of the observers
  by id, and `relationship: 'self'` is rejected on the hook (Duncan's call at kickoff); the PR
  review's rewrite list gains `spec/effects.md#damage-observation` and
  `spec/effects.md#count-scaling`, which also name the old hooks.
- `.claude/phases/4.5/B/brief.md#done-when`: follows suit: goldens for `ally`, `enemy` and `any`,
  and `self` rejected at load.
