# Plan review — Phase 4.2 — Slice A: The mechanical restructure

## Round 1

**Verdict:** approved, with the eight plan fixes below applied in the build (Duncan's call,
decide-point 1). Each fix is binding on the build exactly as written here; `plan.md` is not
revised. The report states, per fix, how it was applied and which evidence file shows it.

**Checked independently** (a probe on the pinned blobs, outside the repo, sharing no code with the
plan's): both sha prefixes; 2160 / 1347 lines; the brief's 66 map rows tile both files; every row
label passes the pieces-in-order rule (`…` split, `\|` unescaped), C:119 and C:555 included; the
unit rule gives **261 / 262**, and per slice **C 154, D 172, E 87, F 110 = 523**, the kickoff's
counts; rows-only bytes **match the size table for all 13 files**; **no line in either pinned file
has trailing whitespace or a tab**; there are no `~~~` fences. Under A4's "nothing inserted"
rule, 27 row joins inside one file and half have no blank line between them, and in every one
the next row opens with `- ` or a heading, so A4 changes no rendering.

### Plan fixes

1. **The stale-base fault is a no-op as written.** A commit on `main` alone doesn't move
   `git merge-base HEAD main`: the base is still the fork point, so `inventory B` keeps passing and
   the run proves nothing. Plant it as: generate a B inventory; commit on the clone's `main` a
   change to `content/overgrowth.md` that shifts its lines (insert a line near the top); run
   `inventory B` (still passes, the base hasn't moved, which is the intended behaviour); then
   `git merge main` into the slice branch and run again (expect rules 1/2, and 6). Fix the plan's
   "Stale base" bullet to say the base moves when the branch takes in `main`, not when `main` moves.
   (The phase brief said the same thing loosely; I've corrected it, see Docs edited.)
2. **The passing inventory's clone heading is wrong.** The brief's example row's New home is
   `spec/statuses.md#dot-and-regen-tick-from-the-appliers-snapshot`, so the heading added in the
   clone must be `### DoT and Regen tick from the applier's snapshot` (with "tick"). As planned,
   rule 4 fails the case that must pass. The example row is accepted exactly as the brief writes it.
3. **The two whitespace faults are vacuous.** No pinned line has trailing whitespace, so "`move`
   trims trailing whitespace" and "a trailing space trimmed" change no byte. Replace them with:
   - in `move`'s code: drop each row's trailing blank line. Expect placement to fail and multiset to
     pass (this is the real separator risk);
   - in a generated file: **add** a trailing space to one line. Expect placement to fail and
     multiset to pass;
   - in `move`'s code: `trimStart` on row lines (kills list-continuation indents). Expect both to
     fail.

   For every planted fault, the evidence shows where it was planted (generated file, brief, or
   script) and the non-empty `diff` it made, before the check's output. A fault that changes
   nothing is not evidence.
4. **The skeleton can't be redirected into `inventory.md`.** `npm run` prints its
   `> name@version docs:check` banner and the command line on **stdout** (checked), and Windows
   PowerShell 5.1's `>` writes UTF-16LE with a BOM. So `inventory-skeleton <slice>` writes
   `phases/4.2/<slice>/inventory.md` itself (UTF-8, no BOM, `\n`), stops if that file already
   exists, and prints the counts per source, the total and the base on stdout. Its evidence run
   writes into the scratch clone, and `unit-counts.txt` keeps the printed counts plus each
   skeleton's row count.
5. **Rule 6 (A7) must accept the skeleton's own labels.** The skeleton cuts labels at 70
   characters with `…` and escapes `|` as `\|`, so "normalised label is contained in the first
   line" fails on every truncated label. Normalise both sides the same way, unescape `\|`, then
   apply the pieces-in-order rule (split on `…`) the map label check uses. Add to the evidence: the
   skeleton rows for B to F, unedited, all pass rule 6 (C:119's label is cut mid-backtick-span and
   C:555's holds `\|`, so both are covered).
6. **Mark every 4.2-only declaration, not only the mode functions.** `MAP`, `READ_WHEN`, `SLICES`,
   `readPinned`, `unitsOf`, `assertUnitPartition`, the label check and the brief-table parser are
   used only by the 4.2 modes. Each carries `(Phase 4.2 only)`, or 4.2-G's grep removes the modes
   and leaves their helpers as dead code. The plan lists which declarations are lasting
   (expected: the anchor resolver, the git helpers, the mode dispatch).
7. **Slice argument case.** Accept `b` or `B` and normalise to uppercase. The mailboxes are `B`…`F`,
   and Linux CI (4.2-G) is case-sensitive where Duncan's Windows isn't.
8. **Resolver:** trim the heading text before slugging. Add to A8's known gaps: `_emphasis_` in a
   heading (GitHub drops the underscores; this resolver keeps them, as it must for `snake_case`).

### Assumptions

- **A1** (no vitest tests): **confirm.** Byte-identical policy and the test count equal to `main`'s.
  The planted-fault runs (with fixes 1–3) are the mechanism proof.
- **A2** (no ESLint/config change): **confirm.** `tseslint.configs.recommended` turns off `no-undef`
  for TS, so the browser globals don't matter. `tsconfig.node.json` already has `types: ["node"]`,
  `module: nodenext` and `erasableSyntaxOnly`, and `package.json` is `"type": "module"`.
- **A3** (separate maps, no shared code, label rule): **confirm.**
- **A4** (separator rule): **confirm.** The probe above shows the 27 unseparated joins all render
  correctly.
- **A5** (read-when insertion uses old line 2 as the trailing blank): **confirm.** That's the
  intent of "a blank line on each side". I've written it into the A brief so the two readings
  can't diverge.
- **A6** (paths relative to `.claude/`, `Decided in` blank): **confirm.** The skeleton to stdout:
  **correct** (fix 4).
- **A7** (Old-label check): **confirm with correction** (fix 5). It goes beyond the brief's list,
  but it's what catches a moved base whose line numbers happen to coincide, and it costs the
  condensing agent nothing once it accepts the skeleton's own labels.
- **A8** (New-home format, resolver rules): **confirm**, plus fix 8.
- **A9** (local `main`, no `origin/main` fallback): **confirm.** In Duncan's tree, `main` =
  `origin/main` = `ba18fa0`, the merge-base.
- **A10** (size `DIFF` is informational): **confirm.** All 13 match today, so the report should show
  13 × `MATCH`. Any `DIFF` is a finding the report explains.
- **A11** (an extra file in `spec/` fails): **confirm.**
- **A12** (`node scripts/docs-check.ts`): **confirm.**
- **A13** (a `dropped` row's New home must resolve if present): **confirm.**
- **A14** (fences as `^\s*```` toggles): **confirm.** Reproduced 261 / 262; no `~~~` fences.
- **A15** (first six-column table only): **confirm.**

Nothing in the phase brief's Assumptions checklist is changed by the plan, so there is no
bring-it-back signal. The golden policy matches the kickoff (byte-identical, no new tests,
file-by-file count reconciliation). The mechanism table covers every fault the kickoff lists. Its
gaps are the ones fixed above.

### Decide-points

1. **Fold these fixes into the build, or run a second plan round?** Recommendation: **fold.**
   `/slice-build` reads this file. Every fix states its exact expected outcome, and none touches the
   design of `move`, `line-proof` or the inventory modes: they correct three planted-fault
   procedures, one I/O path, one comparison rule, labeling, arg case and a trim. The PR review
   checks each one against `evidence/`. A second round would cost a cycle and tell us nothing the PR
   evidence won't. If you'd rather keep the workflow literal, run `/slice-plan 4.2-A` and I'll
   review round 2.

### Decisions

1. **Fold** (Duncan, 2026-10-10): no second plan round. `/slice-build` builds to `plan.md` as
   amended by plan fixes 1–8 above, and the PR review checks each fix against `evidence/`.

### Docs edited

- `phases/4.2/brief.md`, Target layout: `CLAUDE.md` "(condensed in E)" changed to "(condensed in F)".
  It was a typo: the Slices table and the paragraph below both put `CLAUDE.md` in F.
- `phases/4.2/brief.md`, "Inventory": the stale-base sentence now says the base moves only when the
  slice branch takes in a newer `main`. A commit on `main` alone doesn't move the merge-base.
- `phases/4.2/A/brief.md`: the read-when insertion in `CONVENTIONS.md`/`VISION.md` now states that
  old line 2 is the trailing blank (A5).
