# Plan review — Phase 4.2 — Slice H: Code comments, the context diet for `src/`

## Round 1

Reviewed `plan.md` at `61e1170` against `kickoff.md`, `brief.md`, `CONVENTIONS.md` (the sections
the kickoff names), `WORKFLOWS.md`, `workflow/coding-rules.md`, `scripts/docs-check/*`,
`deploy.yml`, both configs, and a TypeScript-parser probe of my own over the working tree (403
files, 1,627 titles: the plan's title count reproduces).

**Verdict: changes needed.** The tooling design is sound, and the pattern table holds up against
the tree: patterns 2 and 4 to 13 hit only provenance, and pattern 11 leaves every "locked" game use
alone. Two things must change before the build. First, the mechanical grammar treats a bare id as
provenance, which deletes golden derivation text that `comment-proof` cannot see. Second, pattern 1
lets `ASSUMPTIONS:` through. The rest are smaller fixes. There is also one decide-point the plan
doesn't raise: whether this is one slice or two.

### Plan fixes

1. **§4: a bare id is never a provenance token on its own.** D1 is right about the check, but §4's
   token list still includes `<X><n><x>` plan ids (`A7`, `S4`, `D4`), so M1 and M2 delete
   scenario labels. The same shapes mean both things in this tree:
   - golden derivations: `TURN_STEPS = 4 (U1, U2, R1, R2).` (`golden-h2a-flat-indirect.fixture.ts:13`),
     `O1 (T1):` (`golden-e-grant-during-granted-action.fixture.ts:9`), and leading labels
     `R1:` / `R2:` / `E1: 100 -> 84 -> 64.` in five golden fixtures. M1 reads these as "a run of
     provenance tokens, then `:`", and M2 reads them as "only provenance";
   - plan items, in exactly the same shapes: `// B5:` (`actions.ts:638`), `// F2:`
     (`combat.ts:478`), `/** R1:` / `/** R2:` (`balance-sim.ts:343, 646`), `(H2c)`, `(B1)`, `(F2)`.

   `comment-proof` compares code with comments stripped, so it cannot catch this. A deleted
   derivation would pass every gate. Rule: an id counts as provenance only when it is inside the
   same parenthetical as a non-id tag (`Phase …`, a slice id, `PR #…`, `ASSUMPTION …`, `review
   fix`), or directly follows one (`Phase 4.1-A (S4)`, `Review fix F2`). A parenthetical or
   leading label made only of ids goes to residue, for the hand pass. Add a before/after showing
   `(U1, U2, R1, R2)` and `R1:` untouched, and `(Phase 4.1-C2a, G4)` removed.
2. **Pattern 1 lets `ASSUMPTIONS:` through.** With `\bASSUMPTIONS?\b(?!:)`, `ASSUMPTIONS:` fails
   the lookahead, and A5's citation rule only looks for `ASSUMPTION:`, so `// ASSUMPTIONS: …`
   passes both. Use `\bASSUMPTIONS\b|\bASSUMPTION\b(?!:)`, and add the planted case to the pattern
   1 row of §7.
3. **Add the process words the table misses.** "brief" occurs in 34 comment lines and 1 title,
   all of them provenance ("Own addition (not named by the brief)", "brief ASSUMPTION 112", "the
   float trap this brief exists to avoid", the title `'flat-mode stat-derived magnitude
   (percent-hp-condition-ticks brief)'`). Add `\bbriefs?\b`, `\bthe plan(?:'s)?\b`,
   `\bplan review\b` and `\bsign-off\b`. Show, as for the other patterns, that the after-tree has
   no game use of them. Without these, `comments` goes green while that provenance stays.
4. **Forward pointers: cite the rule that states the wait.**
   - Demo harnesses ("throwaway harness; Phase 7 replaces them", `CombatDemo.tsx`,
     `demoFight.ts`): cite `CONVENTIONS.md#every-feature-phase-ships-a-demo`, which says "Phase
     7's real combat UI replaces them all". `ROADMAP.md#phase-7--combat-ui--feedback` says nothing
     about the demos.
   - Inert perks: there are **nine** `// Inert until Phase 8 (…) -- see sorcerer.md` lines (eight
     Sorcerer, one Shieldbarer), not six. Each should cite the perk's own content entry
     (`specializations/sorcerer.md#wit-mastery`, `specializations/shieldbarer.md#shield-specialist`,
     …). Each entry states the wait and the system ("Inert (needs Phase 8)"; "needs Phase 8's
     equipment system"), and this also replaces the bare `see sorcerer.md`. Keep the "(gem
     system)" / "(equipment system)" why. `spec/progression.md#inert-perks` quotes the old comment
     form; that rule's edit is in the brief's "Decided, not built" (Docs edited, below).
5. **Scanner: name the JSDoc skip's test.** "JSDoc nodes are not walked" is a mechanism:
   `getChildren()` returns a node's JSDoc as children, and reading comment ranges at the
   positions of its tokens re-scans the comment's inside as code, so `/** see http://x // y */`
   turns into extra "comments". Add a §7 row for it (one comment found, not more) and a mutation
   run that walks JSDoc.
6. **Block join at both sites.** Add `Phase\n * 8` inside a `/** */` beside the `//` wrap case:
   leader stripping is a separate code path for each.
7. **Pragma match is anchored.** Match A8's forms at the start of the comment body (after `//`,
   `/*` or `/**` and whitespace), as TypeScript and ESLint read them. `@vitest-environment` is
   the exception: it can be anywhere in the leading docblock. Anchored, prose that mentions
   "eslint-disable" is not mistaken for a pragma. Today the tree has one pragma comment
   (`injured-allies.test.ts:149`), but every later comment-only change reuses this mode.
8. **Samples the kickoff asks for.** §4 shows before/after for `(A7)`-, `(S4)`-, `(G4)`- and
   `D4`-style ids. Also show the intended after (by hand is fine) for `Review fix F2`
   (`vite.config.ts`), `B2 rule 2` (`resolution-types.ts:97`), `H3+` (`spells/index.test.ts:17`
   and the title at `:84`), `Pre-4.1-D` (`spells/index.test.ts:22`) and one `ASSUMPTION (Slice F)`
   block (`starters.ts:11`).
9. **Quotations, "after zero".** The report is approximate by design (A7). A row the scanner
   still lists after the hand pass is allowed only if it is shown to be the target's own words
   (a false positive), with the target line beside it in `evidence/quotations-after.txt`. The
   count of real out-of-target quotations is zero.
10. **`git.ts`'s comment goes stale.** It says "Used by the inventory modes only"; `comment-proof`
    now uses it. Update it along with `docs-check.ts`'s header. This is a comment the slice's own
    code change makes wrong, not part of the `scripts/` sweep.
11. **M1's capitalisation** leaves an identifier or a backticked word alone (`isActionLocked
    returns …` must not become `IsActionLocked`). It only capitalises a plain lower-case word.
12. **Drop one Spec question.** `CONVENTIONS.md#comment-why-not-what` should not list which
    patterns `comments` enforces. The table's one home is `comments.ts`, and a copy in the doc
    would rot. The gates line and `coding-rules.md`'s gate list do need `comments`; both are now
    in the brief's "Decided, not built".

Mechanism coverage is otherwise complete: every new mode has a failing test per site, the
mutation list covers the filters that matter, and the golden policy (§6) matches the kickoff
word for word.

### Assumptions

| # | Call | Note |
| --- | --- | --- |
| A1 | **confirm** | `typescript` 6.0.3 ships CJS with `export = ts`. A default import works under `nodenext` and Node's ESM interop. `usage.ts` is fine. |
| A2 | **confirm** | `src/index.css` has no comments and `src/data/.gitkeep` is empty, so "non-code byte-identical" costs nothing. |
| A3 | **confirm** | with plan fix 6 |
| A4 | **correct** | plan fixes 2 and 3; D1 stands for the check, plan fix 1 for the script |
| A5 | **confirm** | the kickoff's lean. `CONVENTIONS.md#open-questions-get-an-interface` ties the marker to an `OPEN_QUESTIONS.md` entry, so requiring the citation is the rule made checkable. |
| A6 | **confirm** | checking template titles on their literal parts only is the right trade |
| A7 | **confirm** | report-only, with plan fix 9 |
| A8 | **correct** | plan fix 7 (anchored match) |
| A9 | **confirm** | Known limit: two titles in one file that converge on the same new text (in different `describe`s, so no duplicate full name) fail the mask's count check. That fails closed. If it happens, give one of them a distinct title by hand; don't widen the mask. |
| A10 | **confirm** | `.gitattributes` is `* text=auto eol=lf`, so working tree and blobs agree on line endings |
| A11 | **confirm** | `kickoff.md`, `brief.md` and `plan.md` pass today under the living-doc rules (probe: 10, 12 and 20 citations, 0 problems) |
| A12 | **correct** | plan fixes 1 and 11 |
| A13 | **confirm** | this includes golden derivations: "(Before H2a: 20, Defence ignored.)" is history, and the derivation keeps only the arithmetic that is true now |
| A14 | **confirm** | `rewards.ts:53`'s error message ("…before Phase 8") stays, as the kickoff scopes it out; count it in the report |
| A15 | **correct** | Local `origin/main` is `a7c4fa2`, 4.2-G's merge, so it is current. If it is ever stale, stop and ask Duncan to fetch rather than switching to `main` or the merge-base: the kickoff names the proof's base, so that base is what the review checks. |
| A16 | **confirm** | |

### Decide-points

**D1** (bare ids are not a `comments` pattern). **Recommend: confirm**, extended to the script
(plan fix 1). The probe agrees: `(U1, U2, R1, R2)` and `(H2c)` have the same shape, and a
denylist of ids would rot.

**D2** (`--counts` / `--quotations`, report-only, on `comments`). **Recommend: confirm.** It's the
permanent version of 4.2-G's throwaway scripts, which is the brief's point, and the next
comment-only change gets the tables for free.

**D3** (no rule names the phase: reword to what's true now, list under Spec questions).
**Recommend: confirm.** It should be rare: Phase 8's ROADMAP entry names the `## Not built`
halves of `spec/creatures.md` and `spec/run.md`, the demos have
`CONVENTIONS.md#every-feature-phase-ships-a-demo`, and the perks have their content entries.

**D4 — split the slice: tooling first, then the sweep?** The plan is two jobs with a dependency
between them. One is about 1,500 lines of new tooling (scanner, three modes, tests). The other is
a comment and title rewrite touching roughly 270 files, which is proved by that same tooling.
**Recommend: split.** 4.2-H1 builds the scanner, `comments` (not yet in CI, since it fails on
`main` until the sweep), `comment-proof` and `citations <file>…`. 4.2-H2 does the sweep and adds
`comments` to `deploy.yml`. Three reasons:
- **Review the proof before trusting it.** As one PR, `comment-proof` arrives together with the
  diff it certifies. A bug in it (a too-broad mask, a missed file) is reviewed in the same pass
  as the 270 files it would hide changes in. Split, H2 is proved by a tool already reviewed and
  on `main`.
- **Fix rounds stay cheap.** A tooling fix found in the PR review forces the proof, the counts
  and the planted-fault runs to be redone over the whole sweep. Split, it only touches H1.
- **`citations <file>…` lands earlier.** Its "Decided, not built" line (step files are checked
  before they go out) can then go into `design-rules.md` at H1's review, and H2's kickoff, plan
  review and PR review are checked with it. That was the reason it was added.

The cost: one more kickoff, plan review and PR review. Most of this plan carries over (§3 and §7
to H1; §4 to §6 and §8 to H2), so H2's kickoff is short. **Keeping one slice is defensible**
(4.2-G shipped its rewrite and its proof together). If you keep it, the plan's build order
(tooling and its mutation runs green before any `src/` comment moves) is the mitigation, and
the PR review checks the tooling first.

**D5 — provenance in file and identifier names: accept, or track a follow-up?** 121 files under
`src/` carry a slice id in their name (`golden-h2b2-reapply.fixture.ts`,
`generation-g1.test.ts`), and `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` names a phase. Renaming them
is a code change, out of scope here, and `comments` doesn't see names. **Recommend: accept, no
follow-up.** The golden file names are stable handles that immutable records and evidence cite
(`phases/4.1/H2b2/report-r1.md` names `golden-h2b2-reapply`), so renaming them breaks history
for no reader gain. The consequence to know about: a comment explaining
`PHASE_4_PLACEHOLDER_BALANCE_CONFIG` can't say "Phase 4". It describes what the config is (the
numbers the pre-retune goldens were derived against), and the name carries the rest.

**Decisions** (Duncan, 2026-10-11):

- **D1–D3:** confirmed. D1 extends to the mechanical script (plan fix 1).
- **D4:** split. 4.2-H1 is the tooling, 4.2-H2 the sweep (`phases/4.2/H/brief.md#split`). Plan fixes 5–7 and
  10 and the A1/A8/A11 calls go to 4.2-H1's plan; fixes 1–4, 8, 9, 11, 12 and the rest of the
  calls go to 4.2-H2's. Each slice gets its own kickoff, built on this folder's kickoff, plan and
  this review.
- **D5:** overruled. Provenance in file and identifier names is provenance, and it goes. My
  recommendation changes, for two reasons. The cost I cited is weak: records are history, they
  already describe code that has changed since, `citations` skips `phases/`, and git follows
  renames. The benefit I underweighted is real: names are what new code copies. With 121 files
  named `golden-<slice>-…`, the next golden gets a slice id too, and `comments` can't see a name.
  The renames are 4.2-H3, after 4.2-H2 (Duncan, on the follow-up below).

**D5 follow-up: where the renames go.** Agreed as recommended. **Recommend: a third slice, 4.2-H3, after 4.2-H2**, with
two parts. First, the renames: files, plus `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` (13 uses), named
by what the config is for (every test pins it so tuning never moves them), and the comment
mentions of old names. Second, the guard: `comments` (or a sibling mode) also fails on a slice or
phase id in a `src/` file name or identifier. It can't go in 4.2-H2. A rename is a code and
file-set change, and `comment-proof` fails on renames by design; that's what makes its proof mean
"comment-only". It's also not a `sed` job: stripping the ids gives two goldens the same name
(`golden-b2-silenced-refuses-granted-cast` and `golden-f3-silenced-refuses-granted-cast`), so
each of about 130 fixture/test pairs is named by what it pins, by hand. Golden policy is
byte-identical. Its proof is a rename map plus file content identical except for import
specifiers and the renamed identifier, which is a `comment-proof` option for 4.2-H3's plan to
design.

### Docs edited

- `phases/4.2/H/brief.md`: a new `## Split` section (D4); the Decided, not built lines name the
  slice whose PR review moves each one (4.2-H1 for `design-rules.md`, 4.2-H2 for the rest).
- `phases/4.2/brief.md`, its slice table: 4.2-H becomes 4.2-H1, 4.2-H2 and 4.2-H3.
- `phases/4.2/H/brief.md` (again): 4.2-H3 added to `## Split` (D5); the naming rule for
  `CONVENTIONS.md#comment-why-not-what` added to Decided, not built.
- `ROADMAP.md`, Phase 4.2: names 4.2-H1 to 4.2-H3, and that `src/` names lose provenance too.

- `phases/4.2/H/brief.md`, its Decided, not built list: `CONVENTIONS.md#every-pull-request-runs-the-gates`
  and `workflow/coding-rules.md#rules` gain `comments`, which the brief already makes blocking in
  CI. `spec/progression.md#inert-perks` stops quoting the old comment form (plan fix 4). Both are
  moved into the spec at this slice's PR review.
