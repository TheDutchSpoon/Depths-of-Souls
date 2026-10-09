# Hand-out r1 — Phase 4.1 — Slice H2b2: status rules (two test gaps)

Standing rules: `.claude/workflow/coding-rules.md`. Branch `phase-4.1-slice-h2b2`, on top of the
current build (`9dcdc14`). Answer with `report-r2.md` in this folder.

The PR review found the engine and data correct. Two mechanisms can each be removed with every
non-digest test green. Add one test per gap, each failing with its mutation applied. **Test-only:**
no change to `src/engine` or `src/data` source, no change to any existing golden's expected
events, and the corpus digest stays exactly as committed.

## Fix 1 — the bearer's taken factors on a tick

The tick formula (CONVENTIONS "DoT and Regen from the applier's snapshot") is
`potency × affinity(snapshot vs bearer) × Π(bearer's taken factors) − 0.2 × bearer's effective
Defence`, `MAX(1, floor(...))`. In `applyTickDamage` (`src/engine/resolution.ts`) the taken factors
are Defend's (from `resolveDefenceAndTakenFactors`) followed by the bearer's status and perk factors
(`gatherTakenFactors`). Nothing but the corpus digest fails when the second part is dropped.

**Mutation to kill** (in `applyTickDamage`):

```ts
// from
    takenFactors: [...defendFactors, ...gatherTakenFactors(bearer, state)],
// to
    takenFactors: [...defendFactors],
```

**Add** a hand-derived focused golden, `golden-h2b2-tick-taken-factors` (`.fixture.ts` +
`.test.ts`, the same shape as the other `golden-h2b2-*` goldens): a living applier's Poison ticking
on a bearer that is **Vulnerable** (the real `vulnerability` status from `STATUS_REGISTRY`, ×1.5
taken, applied before any turn like the Poison). Pick stats so the tick is well above the minimum
and differs with and without the factor (e.g. applier Attack 100 → potency 20, bearer Defence 20,
all vitality: 20 × 1.5 − 4 = 26 with Vulnerability, 16 without). Show the arithmetic in the header,
including the value the mutation would give. If you want the factor order pinned too, add a round
where the bearer Defends (Defend's ×0.65 comes first, then Vulnerability), with the arithmetic.

## Fix 2 — "the same status" in the pass-on rule

ASSUMPTION 145: an `apply-status` fired by a status's own effect copies the firing instance's
snapshot **only when it applies that same status** (`context.statusId === response.status.statusId`
in `executeResponse`'s `apply-status` branch). Every other application snapshots its applier fresh.
Nothing tests the "same status" half: no shipped status applies a different status.

**Mutation to kill** (in `executeResponse`, `apply-status`):

```ts
// from
          context.statusId === response.status.statusId ? context.snapshot : undefined
// to
          context.statusId !== undefined ? context.snapshot : undefined
```

With it, the whole suite stays green today, digest included.

**Add** a unit test in `src/engine/status-snapshot.test.ts`: a fixture status `X` (local to the
test) that declares a potency and carries its one tick, plus a second trigger whose response is
`apply-status` of **Poison** (a different ticking status) on some living creature. Apply `X` to a
bearer from an applier whose snapshot differs from the bearer's own Attack-based Poison snapshot
(different id, and a different potency). Fire `X`'s second trigger. Assert the new Poison's snapshot
is the **firing creature's own fresh one** (`applierId` = `X`'s bearer, potency = 20% of its
Attack), not `X`'s snapshot. Validate `X` with `validateStatusDef` so it is a legal status.

## Report (`report-r2.md`)

- The two tests, with the mutation run against the **full suite** for each: what fails before
  your test exists (only `corpus-digest.test.ts` for fix 1; nothing for fix 2) and after.
- The five gates.
- Test count, file by file against `9dcdc14`: expect `+1` file / `+1` test for fix 1 and `+1` test
  in `status-snapshot.test.ts` for fix 2.
- Every existing golden's expected exports unchanged (import both trees' fixtures and deep-compare,
  as in r1), and `corpus-digest.fixture.ts` byte-identical to `9dcdc14`.
- Append both rows to the H2b2 mutation table in your phase-record section
  (`.claude/phases/phase-4.1-fix-and-consolidation.md`, "4.1-H2b2", "Mutations"), and the new
  golden to its file list. Edit no living doc and no content doc.
