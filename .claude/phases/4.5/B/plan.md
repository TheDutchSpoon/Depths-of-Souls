# Plan — 4.5-B: on-death-observed + `createCombat` validates its trait registry

Read: `CLAUDE.md`, `workflow/coding-rules.md`, `CONVENTIONS.md`, the kickoff, `phases/4.5/brief.md`
(both sections), `phases/4.5/B/brief.md`, and the code the kickoff lists. The spec files
(`spec/effects.md`, `spec/responses.md`) still describe `main`; I build against the brief and kickoff
(amended: the dead creature is excluded by id, `relationship: 'self'` is rejected on the hook). The
change reaches no subsystem whose spec the kickoff doesn't name.

## Step 0 — baselines, before any edit (nothing lands in the repo)

- Record `main`'s test count per file (`npm run test`, per-file counts) for the reconciliation.
- Dump `main`'s full event log for every corpus fight (`buildCorpus()` + `createCorpusCombat`, run to
  completion) to a JSON file in the scratchpad (outside the repo, throwaway script). After the change
  the same script dumps the branch's logs; the comparison (hook-name map `on-ally-death` /
  `on-enemy-death` → `on-death-observed`, then byte-compare, then multiset-compare for order-only
  differences, plus result / rounds / final HPs) produces the table in `evidence/`.

## Approach and module changes, by file

### `engine/creature-lookup.ts`
- Add `export function livingIdsOf(state)`: living ids, player party then enemy party (tie-break order).
  It sits beside `findCreature`, which all three current users already import.
- ASSUMPTION A1: the shared `livingIdsOf` lives in `creature-lookup.ts` (the kickoff says only "one
  export"). Importing it from `resolution.ts` into `actions.ts` / `combat.ts` would also work, but
  `creature-lookup` is the module both already import and it has no cycle risk.

### `engine/actions.ts`, `engine/combat.ts`
- Delete the private `livingIds` copies (and the "duplicated on purpose" comment in `actions.ts`);
  import `livingIdsOf`. Call sites renamed: `actions.ts` ×5 (`on-action-observed`), `combat.ts` ×2.

### `engine/effect-types.ts`
- `Hook`: remove `'on-ally-death'`, `'on-enemy-death'`; add `'on-death-observed'` (16 members). Header
  comment "17 in all" → 16.
- `ObservationFilter` doc comment: add the third observation hook; `relationship` compares the observer
  with the dead creature on `on-death-observed`; `self` is rejected there; only `relationship` may sit
  on it. `TriggeredDef.observationFilter` comment lists three observation hooks.
- `validateObservationFilters`: the "observation hook" set becomes the three hooks. New rule: on
  `on-death-observed`, `relationship === 'self'` throws (message names `on-death` as its home);
  `actionKind`/`excludeActor` and `selfInflicted` already throw there (neither hook matches). Doc comment
  updated.
- `validateTrait` moves here (beside `validateStatusDef`), body unchanged, exported; comment ported.
  Its imports are validators already in this file.

### `engine/combat.ts` (`createCombat`)
- Beside the status loop: `for (const trait of traits.values()) validateTrait(trait)`. Same place in the
  function (before the empty-party check), same comment style.
- ASSUMPTION A2: the trait loop sits directly after the status loop and before the empty-party guard,
  so an invalid trait throws its own error even for an empty party. Nothing pins the relative order.

### `engine/resolution.ts`
- New private `relationshipMatches(relationship, observer, subject): boolean`: `any` → true; `self` →
  `subject.id === observer.id`; `ally` → same side; `enemy` → different side. A `never`-checked switch.
  Used by all three observation blocks in `fireHook`.
- The helper takes already-found creatures. The missing-creature behaviour stays exactly where it is at
  each site (the two existing blocks differ, see the kickoff's trap): `on-action-observed` still skips
  the relationship check when the actor isn't found (`actor && !relationshipMatches(...)`),
  `on-damage-observed` still skips the candidate. So the existing hooks are not unified on that point and
  the "every call site finds the creature" proof isn't needed. ASSUMPTION A3: this reading of "if the
  shared helper unifies them" — I don't unify.
- `fireHook`'s third block, `else if (hook === 'on-death-observed')`: inside `if (effect.observationFilter)`,
  find the dead creature from `source`; if not found, `continue` (fail closed, as `on-damage-observed`);
  `relationship` (default `any`) via the helper, observer = `self`, subject = dead. ASSUMPTION A4: a
  candidate on the new hook with **no** filter is not gated on finding the dead creature (the lookup is
  inside the filter check, exactly like `on-damage-observed`); an absent filter matches everything and
  needs no dead creature. No shipped or fixture trigger is filterless after the migration.
- `isDeathHook` stays `hook === 'on-death'`; the new hook is alive-gated. The comments naming
  `on-ally-death` in `fireHook` / `applyDamageAndEmit` / `FireHookOptions` are updated.
- `fireDeathObservers(deadId, state, ctx)` becomes one call:
  `fireHook('on-death-observed', livingIdsOf(state).filter((id) => id !== deadId), deadId, state, ctx).state`.
  The `findCreature(dead)` early-return is dropped (nothing else uses it). By-id exclusion, not `alive`.
  Export of `livingIdsOf` is imported from `creature-lookup`; the local private copy is deleted.
- Order consequence (the deliberate change): player side, then enemy side, in slot order, regardless of
  which side the dead creature was on.

### Data and fixtures (every filter written out)
- `data/traits/glimmerdark.ts`: Last Gleam → `on-death-observed`, `observationFilter: { relationship: 'ally' }`.
  Doc comment: the dead creature is excluded by id, so a Last Gleam never reacts to its own death.
- `data/traits/rotcap-hollow.ts`: Myconet Warder, Myconet Gravedigger, Necromoss Thicket → `ally`;
  Rotfeeder Scavenger → `enemy`; the Rot Sovereign's two triggers → ONE `any` trigger
  (`observationFilter: { relationship: 'any' }`, same `factor: 1.1`, same `self` target). Comments updated
  (the Sovereign block comment, Scavenger's comment).
- `engine/__fixtures__/traits.ts`: Grudge → `on-death-observed` + `{ relationship: 'ally' }`.
- `data/traits/index.ts`: delete `validateTrait` and its comment; the load loop calls the engine export
  (import from `engine/effect-types`). No re-export.

### Importers of `validateTrait` (no re-export, so they change)
`engine/damage-observation.test.ts`, `engine/status-snapshot.test.ts`, `engine/status-containers.test.ts`,
`engine/__fixtures__/traits.test.ts`: import from `./effect-types` / `../effect-types`.

## Golden policy (restated from the kickoff)

- **Changed, only the `hook` field of the death-observer `TriggerFired` events** (`'on-ally-death'` /
  `'on-enemy-death'` → `'on-death-observed'`), plus comments: `golden-damage-observed-lethal`,
  `golden-last-gleam` (both cases), `golden-rot-sovereign` (two events). I checked their orders: in each
  one the death has listening observers on one side only (lethal: Wick's allies Flare/Gleam/A, enemy E has
  no trait; Last Gleam: Gleam on K's opposing side only; Sovereign: ADD's death → Sovereign only, WEAK's
  death → Sovereign only, the other side carries no matching trait), so the new order moves no event. If
  the run shows otherwise I list it as an order change and stop.
- **Comment-only:** `golden-spore-spread` (its `fireDeathObservers` narration). Proved with
  `npm run docs:check -- comment-proof <base>`.
- **Every other golden byte-identical**, integration goldens included (no other golden names the old hooks:
  grep confirms the four fixture files above are the only ones). Shown by importing `main`'s and the
  branch's fixtures, mapping the two old names to the new one, and deep-comparing (one-off script in the
  scratchpad; its printed result goes in the report).
- **Unit tests that change:** `damage-observation.test.ts` (ALLY_DEATH trait uses the new hook + `ally`; the
  lethal-ordering test's title and expected `'on-death-observed@w'`), `resolution.test.ts` (Grudge
  re-stacking: the dead ally becomes a real creature, see below), `data/traits/glimmerdark.test.ts`
  (expected effect literal), `__fixtures__/traits.test.ts` (Grudge literal + import).
- **New hand-derived goldens**, through the shared runner (`golden-death-observed.fixture.ts` + `.test.ts`),
  mechanism fixture traits defined in the fixture file, a distinct `apply-stat-modifier` per trait so each
  firing is one `TriggerFired` + `StatModifierApplied`:
  - Case `enemyDies`: an enemy V dies to a player attack. Observers: player P-enemy (`enemy`, fires),
    P-ally (`ally`, silent: V is an enemy), P-any (`any`, fires); enemy E-ally (`ally`, fires), E-enemy
    (`enemy`, silent: V is on its side), E-absent (filter absent, fires). Expected order: all player-side
    firings in slot order, then all enemy-side ones — the order change (`main` fired V's allies first).
    The dead V also carries an `any` trait: silent. Setup, arithmetic and draws derived by hand in the
    header (no RNG: the fixture is `always-attack` at the lowest-HP enemy).
  - Case `playerDies`: a player creature dies to an enemy attack; mirrored roles prove `ally`/`enemy` read the
    dead creature's side in both directions.
  - ASSUMPTION A5: two cases in one fixture file (as `golden-last-gleam` does), not two files; the kickoff
    allows "one golden may carry several".
- **Corpus digest:** regenerated once via `npm run corpus:update`, after everything else is green. Every
  changed fight attributed with the Step 0 logs: name-mapped logs byte-identical, or the same multiset in
  a different order inside one death's observer block; same result, rounds, final HPs. Anything else is a
  bug. Table → `evidence/corpus-attribution.md`. ASSUMPTION A6: no corpus fight changes outside order
  inside observer blocks; if one does I stop rather than attribute it.

## Mechanism → the test that fails with it removed, at every site

| Mechanism | Site | Test (fails when removed) |
| --- | --- | --- |
| `relationshipMatches` `ally` branch | on-action-observed | existing `resolution.test.ts` `ally` rows (fires for ally, not enemy) |
| | on-damage-observed | existing `damage-observation.test.ts` filter matrix `ally` rows |
| | on-death-observed | new golden (Ea fires, Pb silent) + new `death-observed.test.ts` table row |
| `enemy` branch | the three sites | same: existing action/damage rows; new golden (Pa fires, Eb silent) + table row |
| `any` branch / absent filter | the three sites | existing rows for the first two; new golden (P-any, E-absent) + table row |
| `self` branch | action, damage | existing `self` rows. (Unreachable on the new hook: rejected at load; the helper still takes it, so a `self` test through `fireHook` for the new hook is NOT written. Instead the load-time rejection is tested.) |
| Mutation check | | I run each branch's removal once and report which test failed (three sites × branch) |
| New order (player then enemy) | `fireDeathObservers` | new golden `enemyDies`: the allies-then-enemies version moves E-ally before P-enemy; plus a unit `hookSequence` test in the new test file |
| One `fireHook` call | `fireDeathObservers` | new unit test: two carriers of one `stacks: false` death observer fire exactly once (the per-observer loop fires both) |
| By-id exclusion | `fireDeathObservers` | new unit test: a creature carrying the Unicorn-shaped `on-death` revive (`random-dead-ally`, pool = only itself, one draw) and an `any` death observer: revived before its observers fire, it still does not observe its own death. Fails under an `alive`-only filter |
| New hook alive-gated | `fireHook` | new unit test: `fireHook('on-death-observed', [deadObserver], …)` fires nothing for a dead observer (fails if `isDeathHook` is widened to the new hook) |
| Fail closed | `fireHook` block | `resolution.test.ts` Grudge re-stacking test uses a real dead ally (as the kickoff asks); a new unit test passes an unknown `source` with a filtered trait and expects nothing to fire |
| `self` rejected on the hook | `validateObservationFilters` | new rows: `self` throws, `ally`/`enemy`/`any`/absent accepted, `actionKind` / `excludeActor` / `selfInflicted` each throw on it; fails when the new branch is removed |
| `validateTrait` in `createCombat` | combat.ts | new test beside the status one in `damage-observation.test.ts`: an invalid trait (observation-filter violation) in `registries.traits` that **no creature carries** throws from `createCombat` (a trait nobody references proves the loop, not `resolveBaselineEffects`) |
| `validateTrait` load loop over `STOCK_TRAITS` | `data/traits/index.ts` | existing data tests; the 8 migrated triggers are pinned in `glimmerdark.test.ts` and a new/extended `rotcap-hollow.test.ts` assertion that each carries its exact filter (`ally` ×4, `enemy`, `any` as ONE trigger) — fails if a filter is dropped |
| Migrated `ally` triggers don't fire on enemy deaths | data | the new golden (Pb silent) covers the mechanism; the data tests above pin the written-out filters |
| Stale hook names | whole `src` | `grep -rn "on-ally-death\|on-enemy-death" src` empty; `Hook` has 16 members (type-level `Record<Hook, …>`-free, so counted by hand in the report) |

`resolution.test.ts` Grudge re-stacking: add a real second player creature `ally` to the party, wound it
to dead (or build `ally` with `alive: false` via the party helper / `updateCreature`), and fire
`'on-death-observed'` with `source = ally`; Grudge's `{ relationship: 'ally' }` then matches the live
bearer. Same asserted outcome (two distinct instance ids, Attack 45).

## Stop-and-ask triggers
- Any existing test that hands `createCombat` an invalid inline trait and now throws: I stop and report,
  not edit the trait.
- Any old golden whose events change beyond the `hook` field, or any order change in an old golden.
- Any corpus fight whose branch log is not the name-mapped `main` log up to order within one observer block.

## Out of scope (not touched)
The dead-creature turn skip; content numbers; validating side `effects` (perks) in `createCombat`; every
living doc. Under **Spec questions** in the report: `spec/effects.md#hooks`,
`#damage-path-hook-order`, `#action-reactions-actor-self-hooks-or-observation`, `#damage-observation`,
`#count-scaling` (as the kickoff lists), `#validators` (trait rule), `spec/responses.md` if it names the old
hooks, and the content docs for the 7 data triggers.

## Gates
`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `npm run docs:check -- comments`, `npm run docs:check -- comment-proof <base>`
(for the spore-spread header), test counts reconciled file by file against Step 0.

## Assumptions checklist
- [ ] A1: `livingIdsOf` is exported from `engine/creature-lookup.ts`.
- [ ] A2: the `createCombat` trait loop goes right after the status loop, before the empty-party guard.
- [ ] A3: the shared relationship helper takes found creatures; the two sites' differing missing-creature
      behaviour is left as it is (no unification, so no call-site proof).
- [ ] A4: a filterless candidate on `on-death-observed` does not need the dead creature to be found (the
      lookup is inside the filter check, as on `on-damage-observed`).
- [ ] A5: the new golden file carries two cases (`enemyDies`, `playerDies`), with fixture-local traits.
- [ ] A6: the only corpus changes are hook-name renames and order inside one death's observer block; any
      other difference stops the slice.
