# Kickoff — Phase 4.5 — Slice A: placeholders to fixtures, one Splashing lookup, the 3.5 demo retired

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/effects.md` (`spec/effects.md#traits`, `spec/effects.md#validators`,
  `spec/effects.md#splashing-and-annihilate`) and `spec/combat.md#adjacency-targeting`.
- `phases/4.5/A/brief.md`; in `phases/4.5/brief.md`:
  `phases/4.5/brief.md#placeholder-traits-move-to-test-fixtures`,
  `phases/4.5/brief.md#one-copy-of-splashings-adjacency-lookup`, `phases/4.5/brief.md#why-this-order`
  (why the 3.5 demo goes now) and the 4.5-A line of `phases/4.5/brief.md#assumptions`.
- `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`,
  `CONVENTIONS.md#effect-carriers-live-in-libraries`, `CONVENTIONS.md#corpus-digest`,
  `CONVENTIONS.md#every-golden-replays-through-one-shared-runner`.
- Code to understand first:
  - `src/data/traits/core.ts`, `index.ts`, `core.test.ts`;
  - the six goldens that read a placeholder from `TRAIT_REGISTRY`: `golden-conditional-passive`
    (`bloodlust`), `golden-conditional-trigger` (`vengeful`), `golden-loop-safety` (`reckless`),
    `golden-round-end-interaction` (`catastrophic-collapse`), `golden-stun` (`reeling`),
    `golden-triggered-damage` (`retaliate`), all in `src/engine/__golden__/`;
  - `src/engine/resolution.test.ts`: the two `retaliate` loop-safety cases (around lines 192–270)
    and the `grudge` re-stacking case (around line 367), which also resolve placeholder ids
    through `TRAIT_REGISTRY`;
  - `src/engine/__fixtures__/scripts.ts` (`FIXTURE_SCRIPTS_BY_ID`, the naming precedent) and
    `held-statuses.ts` with its own test (precedent for a fixture module that carries a test);
  - `STATUS_EXEMPTIONS` in `src/engine/corpus-coverage.test.ts`;
  - `adjacentLivingTargets` in `src/engine/actions.ts` and `src/engine/targeting.ts`, and
    `golden-splashing`;
  - `src/app/App.tsx`, `src/app/demoFight.ts`, `src/app/demoFight.test.ts`.

## Scope

Three pieces, all behaviour-neutral. (1) The nine placeholder traits leave game data:
`data/traits/core.ts` moves to `src/engine/__fixtures__/traits.ts` (plain `mv`, see the rename map), its consts leave
`STOCK_TRAITS`/`TRAIT_REGISTRY` and the barrel, and every test that resolved them through
`TRAIT_REGISTRY` resolves them through a fixture registry instead. The trait library ends up as one
file per biome plus `starters.ts`, with no `core.ts` (decided:
`phases/4.5/brief.md#placeholder-traits-move-to-test-fixtures`). (2) Splashing imports
`adjacentLivingTargets` from `targeting.ts` and the private copy in `actions.ts` is deleted. (3)
The 3.5 demo is retired: `App.tsx` renders the stub and stops importing the demo; `demoFight.ts` and
its test are deleted by Duncan. **Not in scope:** `src/ui/CombatDemo.tsx` stays byte-unchanged and
unused (4.5-G1 moves its event text and beat grouping); Ember Lance, Venom Bolt and Cinder Nova
stay (4.5-E); Grudge's hook stays `on-ally-death` (4.5-B renames it in the fixture); no living or
content doc is edited.

Rename map (plain `mv`, listed in the report):

- `src/data/traits/core.ts` → `src/engine/__fixtures__/traits.ts`
- `src/data/traits/core.test.ts` → `src/engine/__fixtures__/traits.test.ts` (it keeps the tests of
  the nine traits' behaviour; the two registry-assembly tests move out, see Traps)

To delete (Duncan, at a checkpoint the plan names, before the gates run):
`src/app/demoFight.ts`, `src/app/demoFight.test.ts`. They import the placeholders from
`data/traits`, so `tsc -b` can't pass while they exist.

## Golden policy

**Byte-identical.** No golden's `expectedEvents`/`expectedResult` (or any other expected export)
changes, `src/engine/__corpus__/corpus-digest.fixture.ts` is untouched and `corpus:update` is not
run. The six golden fixtures above change only their `TRAIT_REGISTRY` import and their `traits`
export; nothing else in any golden fixture or golden test changes. Any other difference is a bug.

## Traps

- **Don't keep the ids resolvable by putting them back in a production registry.**
  `resolveBaselineEffects` throws on an unknown trait id, so every test that still reaches a
  placeholder through `TRAIT_REGISTRY` fails loudly. Fix each site by passing the fixture registry,
  never by re-exporting the nine from `data/`. The six goldens and the three `resolution.test.ts`
  cases each carry one placeholder and no real trait, so a fixture registry of the nine is enough;
  a test that needs both merges them locally. Recommended export: `FIXTURE_TRAITS_BY_ID`, after
  `FIXTURE_SCRIPTS_BY_ID`; no `__fixtures__` module imports `src/data` today, and this one
  needn't.
- **The nine lose load-time validation.** `data/traits/index.ts` runs `validateTrait` on every
  `STOCK_TRAITS` entry at import; once they leave, nothing validates them. `traits.test.ts` runs
  `validateTrait` on each of the nine (`spec/effects.md#validators`); Bloodlust's stat-modifier
  condition is what `validateStatModifierConditions` checks.
- **The registry-assembly tests in `core.test.ts` belong to `data/`, not to the fixture.**
  "Registers every stock trait by id" and "every library grouping is spread into STOCK_TRAITS" move
  to a new `src/data/traits/index.test.ts`. The grouping test loses its `BRUTISH` line (there is no
  core grouping) and changes nothing else.
- **Stun stays exempt in `corpus-coverage.test.ts`.** Stun stays in `STATUS_REGISTRY` with no
  shipped applier (`content/overgrowth.md#stun` already says so). Only the reason string changes
  (it names `data/traits/core.ts` and "in the trait registry"). Dropping the entry fails the test.
- **Labels that only look like placeholders aren't lookups.** `'brutish'` in `conditions.test.ts` and
  `effects.test.ts` is a `sourceTraitId`/`statusId` label, not a registry read: leave those tests
  alone.
- **Don't consolidate the other Retaliate look-alikes.** `RETALIATE_FIXTURE` in
  `golden-actor-dies-attack` and `golden-grant-actor-dies-first`, and the `RETALIATE()` helpers in
  `actor-death.test.ts` and `spell-effects.test.ts`, are separate fixtures. Folding them into the new
  module is out of scope.
- **Comments to reword**, each to cite the fixture or the rule, never as game data. This list is
  longer than the slice brief's:
  - the moved file's header ("Representative & temporary trait content — real data … until the
    actual creature roster replaces it" is now false);
  - the `STOCK_TRAITS` comment in `data/traits/index.ts` ("the representative-and-temporary set
    above");
  - `data/specializations.ts` (Defensive Stance cites "traits.ts's GRUDGE");
  - `data/statuses.ts`: Regen's `defaultDuration` cites `demoFight.ts`, and Stun's cites `REELING`;
  - `engine/resolution.ts` (the tick-damage comment naming `CATASTROPHIC_COLLAPSE`);
  - `engine/effect-types.ts`: the stat-percent doc names `CATASTROPHIC_COLLAPSE` as a firing-creature
    stat reader, but its cost is `flatAmount: 999`, so check the claim before rewording it; also
    the `'brutish'` example in the `BaselineEffectEntry` doc, and the `SplashingDef` doc, which
    describes the two copies and cites the ROADMAP.
  - Golden fixture headers that name the trait they exercise stay: they describe the fixture.
- **Splashing.** `targeting.ts` imports nothing from `actions.ts`, so there's no cycle. The export
  carries the same doc comment as the private copy, so nothing is lost. The comment on the caller
  in `actions.ts` (the "look it up before the main hit" ordering) stays.
- **The stub carries no phase id** in its text (`npm run docs:check -- comments` fails a string
  literal holding one). Its content is the 4.5-A assumption: confirm it or correct it in the plan.

## Must stay green

Every golden, `golden-splashing` and the six above in particular; `corpus-digest.test.ts`,
`corpus-coverage.test.ts`, `targeting.test.ts`, `resolution.test.ts`; the data tests that read
`TRAIT_REGISTRY` (`species/*.test.ts` "every trait id resolves", `perform-action.data.test.ts`,
`scripts.test.ts`, `innate-spells.test.ts`, `traits/glimmerdark.test.ts`); `combat.test.ts`; the
`src/state` store, integration and balance-sim tests; `npm run build`;
`npm run docs:check -- citations` and `-- comments`.

## The PR must prove

- **Byte-identical, checked by import:** every changed golden fixture's expected exports
  deep-equal to `main`'s, compared by importing both versions (`main` in a scratch worktree
  outside the repo), not by reading the diff. Each changed fixture's diff shows only the import and
  the `traits` line. `git diff main -- src/engine/__corpus__/` is empty.
- **The rule holds, and a test enforces it:** no placeholder in game data. A test in
  `data/traits/index.test.ts` fails if any `FIXTURE_TRAITS_BY_ID` id is in `TRAIT_REGISTRY`. Show
  it failing with one fixture trait put back into `STOCK_TRAITS`. Plus an acceptance grep for the
  nine ids and const names over `src/data`, `src/state`, `src/app` and `src/ui`, with its output.
- **The fixture traits are validated:** the `validateTrait` test, shown failing with one fixture
  trait broken so a validator throws.
- **One adjacency lookup:** `adjacentLivingTargets` is defined once (grep). A deliberate break of
  the `targeting.ts` export (say, dropping the `after` neighbour) fails both `targeting.test.ts`
  and `golden-splashing`: the unit test now pins code Splashing runs.
- **Tests reconciled file by file against `main`:** every test of the nine maps one to one from
  `core.test.ts` to `traits.test.ts`; the two registry tests to `index.test.ts`; the demo smoke test
  is gone. State the net delta and its parts.
- **The stub:** `npm run build` green and the built page renders only the stub (preview
  screenshot or rendered text). The live URL is checked after merge.
- The rename map, and the **To delete** list confirmed done.

## Doc edits at this kickoff

- `phases/4.5/brief.md#placeholder-traits-move-to-test-fixtures`: `data/traits/core.ts` is deleted,
  and a carrier library has no `core.ts` (Duncan's decision at this kickoff); this PR's review
  rewrites `CONVENTIONS.md#effect-carriers-live-in-libraries` for traits.
- `phases/4.5/brief.md#spell-clean-up-and-thorn-volley`: the same for the spell library, at 4.5-E's
  review.
