# PR review r2 — Phase 4.5 — Slice A: placeholders to fixtures, one Splashing lookup, the 3.5 demo retired

Reviews `report-r2.md`, the answer to `handout-r1.md`, on top of `review-r1.md`. Branch `4.5-a` at
`07f0459` ("fix"), cloned and run in my own sandbox against `origin/main` at `00e9cb4` and against
the r1 build `1472a55`. The fix diff (`git diff be70e1f 07f0459`) is `report-r2.md` plus the two
`src` files.

## Verdict: approved

Both hand-out items are fixed as asked, the fix touches nothing else in `src`, and every golden
export, test and gate is unchanged from the build r1 approved. No hand-out.

## Hand-out items, checked in the code

1. **Stun exemption reason** (`corpus-coverage.test.ts`): now
   `'applied by no shipped spell, perk or trait; only test fixtures apply it'`, and the entry stays.
   It is true: outside tests, `__fixtures__`, `__golden__` and `__corpus__`, the only `'stun'` in
   `src` is the status's own definition (`data/statuses.ts:94`). The diff is that string plus
   Prettier joining the entry onto one line, as the report says.
2. **`SplashingDef` doc** (`effect-types.ts`): "Adjacency is living adjacency
   (`spec/combat.md#adjacency-targeting`)." The target states it in those words ("Living adjacency,
   not raw slot adjacency") and names `adjacentLivingTargets`. Nothing else in the comment changed.

## Scope and labeling (no action needed)

- **`report-r2.md` says "nothing committed"**: true of the coding agent. Duncan committed the fix as
  `07f0459`, which is what I reviewed.
- **Citations 637 → 636**: not the fix. The r1 build has 637; my r1 doc edit removed the
  `**Known bug:**` line in `CONVENTIONS.md`, which carried one citation.
- **A correction to `review-r1.md`'s counts:** it says 135 golden fixtures and 138 modules. `main`
  and this branch have **134** `__golden__/*.fixture.ts` and 3 `__corpus__` modules, **137** in all.
  The comparison r1 describes holds on all 137 (rerun below); only the count was wrong.
- **The phase brief's header was stale** in the way r1 fixed in the ROADMAP: it said the demo
  "replaces the 3.5 demo on the live site". Corrected (Docs edited). Its assumption A ("one line of
  text with the game's title; no controls") matches the built stub.
- **Mailbox:** only step files; no `evidence/`. **To delete:** nothing.
- **CI:** I still can't read check runs from this session. Please glance that CI is green on
  `07f0459`; my local run of every gate is.

## Decide-point

**1. What happens to a built entry under the phase brief's "Decided, not built"?** 4.5-A is the
first 4.5 slice to ship, so this sets the pattern for B to F. `workflow/design-rules.md#doc-edits` says the
PR review of the building slice "moves it into the spec". For 4.5-A, everything durable in the two
entries is already in its spec home: the no-placeholders rule in
`CONVENTIONS.md#mechanism-goldens-vs-content-goldens`, the library layout in
`CONVENTIONS.md#effect-carriers-live-in-libraries` (rewritten at r1), and the single lookup in
`spec/combat.md#adjacency-targeting`. So the open question is only whether the two entries leave the
brief.
- **Recommendation: leave them.** The brief is the phase's plan, kept, and read as intent (its own
  header: "this brief places each decision in a slice"). Its slice table links both anchors, and
  `#placeholder-traits-move-to-test-fixtures` is still the cited source for the spell-library half
  that 4.5-E builds (`phases/4.5/brief.md`'s Thorn Volley entry and `phases/4.5/E/brief.md`).
  Deleting it now breaks those citations for a rule not yet built. Cost: after merge, the Splashing
  entry's first sentence describes code `main` no longer has, under a heading that says "not
  built"; a reader is told by `record.md` existing (`WORKFLOWS.md`) that 4.5-A shipped.
- **If you'd rather remove them:** I delete the Splashing entry now (only the slice table links it,
  and I'd unlink that cell), and the placeholder entry at 4.5-E's review, once the spell half is
  built. Same rule for B to F.

## Decisions

- **Verdict: approved.** No hand-out.
- **Decide-point 1 (Duncan: agreed):** a built entry stays in the phase brief's "Decided, not
  built"; its rules move into the spec, as they already have for 4.5-A. Written into
  `workflow/design-rules.md#doc-edits`, so B to F follow it.

## What I verified, and how

**Gates** (fresh `npm ci` on all three trees; `vitest` 5.0.3, matching `package-lock.json`):
`npm run test` 212 files, **1851 passed | 1 skipped**; `lint`, `format:check`, `build`, `npx tsc -b`
green; `docs:check -- citations` PASS (636 citations in 435 files); `-- comments` PASS (6977
comments, 1630 titles); `-- budgets` 12 files, 0 over.

**comment-proof** `1472a55`: `effect-types.ts` OK; `corpus-coverage.test.ts` FAIL at the string
literal only (expected: Fix 1 is a literal, not a comment). `git diff 1472a55 07f0459 -- src` is the
two places and nothing else.

**Tests reconciled file by file** (`vitest --reporter=json`, by file and full title and status):
`1472a55` → `07f0459` identical in all 212 files. `main` → `07f0459` differs only as r1 recorded:
`data/traits/core.test.ts` 10 → gone, `app/demoFight.test.ts` 1 → gone,
`__fixtures__/traits.test.ts` new with 9, `data/traits/index.test.ts` new with 3; net +1.

**Byte-identical, by import** (a throwaway test in each tree, removed after; `import.meta.glob`
over the 134 golden fixtures and the 3 `__corpus__` modules, every export canonicalised with Maps,
Sets and functions):
- `1472a55` → `07f0459`: key sets equal in all 137 modules, **0 exports changed**.
- `main` → `07f0459`: key sets equal; **51** exports changed, all of them the r1 registry move: the
  six named goldens' `traits` hold exactly the nine and each deep-equals `main`'s entry; 41 other
  `traits` exports equal `main`'s with the nine removed, same order; the four sub-fixtures
  (`allyDies`, `gleamDies`, `aloneAndHurt`, `hurtOthersFull`) differ only in their `traits` field.
  No `expected*` export changed.
- `git diff 1472a55 07f0459 -- src/engine/__golden__ src/engine/__corpus__` is empty, and so is
  `git diff main -- src/engine/__corpus__`.

**Mutation** (the fix touched the exemption's line): the `'stun'` entry removed from
`STATUS_EXEMPTIONS` fails `corpus-coverage.test.ts > every status in STATUS_REGISTRY is applied,
except the reasoned exemptions` and nothing else (1 failed | 1850 passed). Restored. The `SplashingDef`
change is a comment, so it has no mechanism to remove.

**Leftovers** in the living docs (outside `phases/` and `archive/`) for `traits/core`, `demoFight`,
"3.5 demo", "private copy" and "placeholder trait": none. The remaining `core.ts` mentions are
`data/spells/core.ts`, which stays until 4.5-E.

**Live behaviour (step 6):** not run. The fix is a string and a comment; every export and the
digest are byte-identical to the build r1 reviewed.

## Docs edited

- `workflow/pr-review.md`: the leftover sweep covers moved and renamed names in every form and
  claims a slice corrects in `src`, and the approving round always reruns it (the
  `spec/responses.md` miss above).
- `workflow/design-rules.md#doc-edits`: a phase brief keeps a built entry (decide-point 1).
- `spec/responses.md#flat-mode`: `CATASTROPHIC_COLLAPSE` dropped from the `StatPercent` readers.
  It was never one (its cost is a literal `flatAmount: 999`), and it is now a test fixture. The
  `StatPercent` doc in `effect-types.ts` lost the same name in the build; r1's leftover search
  missed this copy.
- `phases/4.5/brief.md` (header): the demo replaces the stub on the live site, not the 3.5 demo,
  which 4.5-A retired.
