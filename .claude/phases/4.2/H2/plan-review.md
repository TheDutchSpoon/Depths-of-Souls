# Plan review — Phase 4.2 — Slice H2: Code comments, the sweep

## Round 1

Reviewed `plan.md` at `31832dc` against `kickoff.md`, `phases/4.2/H/brief.md`, the pre-split
`phases/4.2/H/plan.md` and its review, `phases/4.2/H1/record.md`, `CONVENTIONS.md` (the sections the
kickoff names, plus `CONVENTIONS.md#test-environments`), `WORKFLOWS.md`, `workflow/coding-rules.md`,
the tool on the branch (`comments.ts`'s `PATTERNS`, `comment-proof.ts`'s scope and mask), `deploy.yml`,
`ci.test.ts`, `corpus-digest.test.ts`, both configs, and probes of my own over the clean tree.

Reproduced: `comments --counts` (403 files, 7,178 comment ranges, 1,627 titles, the plan's table to the
digit), `--quotations` (47 comments and 1 title), `origin/main` = `0126c4a`, the nine inert-perk lines
and their perk ids, and each perk entry stating its wait (A21). `comment-proof`'s scope is `src`,
`vite.config.ts` and `eslint.config.js`, so the `deploy.yml` and `ci.test.ts` changes sit outside the
proof, as intended.

**Verdict: approved, with the plan fixes below binding at build.** The design carries the pre-split
plan and its review over faithfully: fix 1 (bare ids), fix 11 (capitalisation), D3 and the kickoff's
traps are all in. The fixes are small and fully specified, so they don't need a second plan round. The
biggest two widen the hand pass's searches (bare ids, history markers) where the plan's greps miss the
commonest shapes in this tree. One decide-point is open (D1), about how the corpus header is proved.

### Plan fixes

1. **Bare ids: run the grep after the mechanical pass, size it, and group the evidence (§4.2).** On the
   clean tree, `\b[A-Z]\d\b` hits 828 comment lines: 358 in goldens, corpus and fixtures, about 470
   elsewhere. Outside the fixtures most are provenance that no pattern sees: 4.1 slice names written
   bare (`H1`, `H2`, `H3`, `G1`, `F1`–`F3`; "mirroring H1's own Broodmother", "the POST-H3 shape",
   "the pre-G1 draw", "per the H1/H2 common checklist item 6") and plan items (`B1`–`B6`, `B2.2`, `A2`,
   `A8`, `R1`, `D3`, `P8`). Many sit inside tags the script removes, so grep after the real run. The
   hand pass decides every remaining one, not only id-only parentheticals (the kickoff's trap: "The
   hand pass decides each one"). `evidence/bare-ids.md`: one row per provenance id rewritten
   (`file:line`, old → new); derivation labels kept get one row per file
   (`golden-h2a-additional-levels.fixture.ts: L8, L11, T98, T99, kept`). Two-digit ids occur only as
   derivation labels (`T98`, `T99`, `L11`), so the one-digit grep misses no provenance.
2. **Widen the history-marker grep (§4.3).** The list misses the commonest shapes here. Comment lines
   on the clean tree: "the old" 39, `pre-<id>` 85, `post-<id>` 37, "Now a …" 12, "renamed" 9,
   "replacing" 8, "reworked" 5, "originally" 5, "any more"/"anymore" 4, "was deleted" 4. Add them.
   Judge "regression" (11 lines) one by one: it is mostly a test's purpose ("regression probe") or the
   integration-golden label `CONVENTIONS.md#two-tier-golden-discipline` requires, and those stay.
   Example of the line between the two: `combat.test.ts:182`, "Before B3, CombatState.rng was a
   closure shared by reference": the trap (a shared closure makes two resolves of one frozen state
   diverge) stays, in the present tense; "Before B3" goes.
3. **`vite.config.ts` cites `CONVENTIONS.md#test-environments` (§4.9).** That rule states the
   Node/jsdom split and that Node enforces engine purity; the config comment restates it. What the
   config adds, and keeps: the Node project's `include` is a catch-all minus the two jsdom folders,
   because an enumerated list silently drops a test under a new top-level folder. "ASSUMPTION 24 (any
   new top-level test folder defaults to Node unless it renders React)" has no home (the rule names
   the folders, not the default): a Spec question. "Review fix F2" and "verified: a throwaway
   `src/zzprobe/x.test.ts` …" are history and go. `eslint.config.js` keeps its
   `CONVENTIONS.md#the-engine-is-pure-and-deterministic` citation.
4. **Keep the why the `4.1-H2c` lines carry (`data/species/starters.ts:91, :93`).** §4.5 says they "go
   with" the `ASSUMPTION (Slice F)` blocks. The ids, the ASSUMPTION numbers and "was 10" go. The trap
   at `:93` stays: the Shieldbarer starter runs `warden`, not `taunter`, because a Provoke-only script
   never attacks. Check it against `data/scripts.ts` before writing it.
5. **Retitle `ci.test.ts`'s first test.** "the test job runs citations and budgets" goes stale when it
   asserts `comments` too: e.g. "the test job runs citations, budgets and comments". `scripts/` is
   outside `comment-proof`'s scope, so no mask entry; list it apart in `retitled-tests.md`.
6. **The mask (A20):**
   - the `renderFixture` entry's `old` is the template head's whole cooked text (from `// GENERATED`
     through `export const CORPUS_DIGEST: readonly CorpusDigestEntry[] = [` and its newline), since a
     mask matches a literal part's whole text, not a substring;
   - an entry maps base text to final text; a title the script changes and the hand pass changes again
     is one entry (a chain is exit 2);
   - `count` is how many literals in the base file, titles or not, have the `old` text. Strike "(or a
     `new` text already occurs there)": the tool groups by `new` for that;
   - two occurrences of one `old` can't take two different `new` texts (exit 2). If the hand pass wants
     that, they take the same new text.
7. **§7, the corpus row's wording.** The test reads the fixture's values on every run; only rendering
   and writing it is `corpus-update` mode. The conclusion stands: nothing ties the header to the
   template in the default run.
8. **The inert-perk check pairs each id with its anchor (§7).** `citations` passes nine citations of
   one valid anchor. The scratch check prints each line's perk `id:` beside its anchor's slug and shows
   they match. (Line 412 reads "-- see shieldbarer.md", not "see sorcerer.md": the kickoff was loose;
   the fix is the same.)
9. **Planted `comments` faults: one per folder, not seventeen per folder (§7).** H1 proved every
   pattern fails (`phases/4.2/H1/evidence/planted-faults.txt`), H2 doesn't touch the tool, and the
   kickoff doesn't ask again. Plant one tag in a comment and one in a title under each of `app`,
   `data`, `engine`, `state`, `ui`, `__golden__`, `__corpus__`, `__fixtures__` and each config: that
   proves the scope on the swept tree. Less evidence, same proof.

### Assumptions

| # | Call | Note |
| --- | --- | --- |
| A12 | **confirm** | fixes 1 and 11 carried; plan fix 1 above widens the residue search, not the script |
| A13 | **confirm** | with plan fix 2 (wider grep) and fix 4 (a why survives its id) |
| A14 | **confirm** | the title at `rewards.test.ts:169` is swept; the regex at `:179` and the message at `rewards.ts:53` stay and are counted |
| A15 | **confirm** | local `origin/main` is `0126c4a` |
| A16 | **confirm** | |
| A17 | **confirm** | the forward-pointer grep gives the nine perk lines plus about 30 others; re-derive and report the count |
| A18 | **confirm** | |
| A19 | **confirm** | Prettier never reflows a template literal's text. The proof is D1's call |
| A20 | **correct** | plan fix 6 |
| A21 | **confirm** | checked: all eight Sorcerer entries say "Inert (needs Phase 8)"; `specializations/shieldbarer.md#shield-specialist` says "needs Phase 8's equipment system" |
| A22 | **confirm** | with plan fix 5 (the first title) |
| A23 | **confirm** | with plan fix 4: the number's provenance goes, its why stays |

**Bring-it-back check:** the plan changes nothing the brief or kickoff decided
(`WORKFLOWS.md#the-humans-judgment-call-these-dont-remove`). The bare-id search is wider than the
kickoff's evidence line ("every id-only parenthetical or label"), but it is what the kickoff's trap
and the pre-split plan's hand pass ask for.

**Golden policy:** matches the kickoff (byte-identical; comment-only fixture edits listed; derivation
history dropped, arithmetic kept; no test added or removed under `src/`).

**Mechanism coverage:** complete with fixes 5 and 8. `comments` in CI fails `ci.test.ts` when the
step is removed; the sweep is held by `comments`; comment-only by `comment-proof` with three planted
faults; the corpus pairing by D1's proof.

### Decide-points

**D1. Prove the corpus header with the real `corpus:update`, in a scratch clone?** The plan copies
`renderFixture` into a scratch script and checks its output against the committed header. That proves
the copy, not the function. **Recommend: yes.** In a scratch clone of the finished branch, outside
Duncan's tree, run `npm run corpus:update`, then `git diff --exit-code
src/engine/__corpus__/corpus-digest.fixture.ts` → no diff, saved to `evidence/corpus-render.txt`. One
run then proves, with the real function and the real Prettier config, that the template, the header
and the digest agree byte for byte. The kickoff says `corpus:update` "is not run", but that rule
protects the committed fixture from regeneration, and a scratch run that leaves it byte-identical is
the opposite. You decide because it departs from the kickoff's letter. If no: keep the copy, built
from the `new` text that `comment-proof` prints for the mask entry, never retyped.

### Decisions

Duncan, 2026-10-11:

- **D1: yes, as recommended.** The corpus header is proved by running `npm run corpus:update` in a
  scratch clone of the finished branch, outside Duncan's tree. The fixture then shows no diff
  (`git diff --exit-code src/engine/__corpus__/corpus-digest.fixture.ts`), and that output goes in
  `evidence/corpus-render.txt`. This proof replaces §4.6's copy of `renderFixture` in a scratch script.
  The kickoff's "`npm run corpus:update` is not run" still holds for Duncan's working tree: the
  committed fixture is never regenerated. §7's corpus row cites this proof.

### Docs edited

None. D1 picks how this slice proves its own change, and no living-doc rule says anything about it.
`CONVENTIONS.md#corpus-digest` doesn't cover the header and its template, and the Spec question in plan
§9 raises that gap for the PR review.
