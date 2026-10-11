# Kickoff — Phase 4.2 — Slice H2: Code comments, the sweep

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: none as a whole. For each comment or title you rewrite by hand, read the rule or
  content entry it cites (or should cite), and check the comment against the **code**, never
  against the old comment.
- `phases/4.2/H/brief.md`, all of it. Its Scope bullets and Duncan's kickoff decisions are the
  rules; `phases/4.2/H/brief.md#split` is this slice's boundary; `phases/4.2/H/brief.md#known-from-42-gs-review`
  is residue you clear. Its `## Decided, not built` list is moved into the docs at this slice's PR
  review, not by you.
- The pre-split mailbox `phases/4.2/H/`, which this slice builds on:
  - `plan.md` §4 (the mechanical rules M1–M6 and the token grammar), §5 (the hand pass), §6
    (golden policy) and §8 (order of work and evidence), plus D3 and A12–A16. Carry this design
    into your own `plan.md` as the review corrected it; don't build from the old plan directly.
    Its §3 and §7 are built: read the tool on `main`, not the plan.
  - `plan-review.md`, Round 1: plan fixes 1, 4, 8, 9, 11 and 12, the calls on D3 and A12–A16, and
    the D5 decision (names are 4.2-H3's) are binding here.
- `phases/4.2/H1/record.md`: the tool as built (17 patterns, not the plan's 13; the mask rules; the
  pragma forms). `H1/evidence/quotations.txt` (48 quotations, your before list),
  `H1/evidence/word-patterns.txt` (every word-pattern hit on `main` is provenance) and
  `H1/evidence/g-rehearsal.txt` (a mask run end to end).
- `CONVENTIONS.md#comment-why-not-what`, `CONVENTIONS.md#open-questions-get-an-interface`,
  `CONVENTIONS.md#comment-only-golden-edits-are-allowed`,
  `CONVENTIONS.md#two-tier-golden-discipline`, `CONVENTIONS.md#corpus-digest`,
  `CONVENTIONS.md#every-feature-phase-ships-a-demo`,
  `CONVENTIONS.md#every-pull-request-runs-the-gates`.
- Code: `scripts/docs-check/comments.ts` (its `PATTERNS` table is the check you clear),
  `scripts/docs-check/comment-proof.ts`'s header and `USAGE` (the mask format),
  `.github/workflows/deploy.yml`, `scripts/docs-check/ci.test.ts`,
  `src/engine/corpus-digest.test.ts` with its fixture, and `src/data/specializations.ts` with its
  test (the nine inert perks).

## Scope

Bring every comment and every `describe`/`it`/`test` title in `src/`, `vite.config.ts` and
`eslint.config.js` to `CONVENTIONS.md#comment-why-not-what`, until
`npm run docs:check -- comments` passes. On `main` (0126c4a) it reports 2,962 problems in 343
files, 229 of them goldens, corpus or fixtures. Then add `comments` to `deploy.yml`'s `test` job,
with `ci.test.ts` asserting it. Do the mechanical part with a one-off script outside the repo
(plan §4, corrected by fixes 1 and 11), then the bounded hand pass (the brief's kickoff
decisions): every block the script touched, every history marker, the 48 quotations, the brief's
residue, the two `// ASSUMPTION:` markers and the forward pointers. Prove it with H1's
`comment-proof origin/main` from `main`.

**Out of scope:**
- Any code change.
- Any string literal other than test titles and the `renderFixture` template part. Error messages
  stay: `state/rewards.ts:53`'s "before Phase 8", and the regex in `state/rewards.test.ts:179`
  that matches it. The report counts what remains (A14).
- File names and identifiers, and comment mentions of them (`golden-h2b2-reapply`,
  `PHASE_4_PLACEHOLDER_BALANCE_CONFIG`). Those are 4.2-H3's.
- Any change under `scripts/` other than `ci.test.ts`. This slice never changes the tool that
  proves it: if the tool is wrong, stop and report.
- `scripts/` comments, any living doc, and comments that are correct but long.

Where a quotation's fact isn't in its target, or a comment's fact has no home, it goes under
**Spec questions**.

## Golden policy

**Byte-identical.** Every golden's expected values and the corpus digest are unchanged, and
`npm run corpus:update` is not run. Golden fixtures change only in comments, and each is listed
(`CONVENTIONS.md#comment-only-golden-edits-are-allowed`). Setup, arithmetic and random draws stay.
A derivation's history goes, though: "(Before H2a: 20, Defence ignored.)" is dropped, and only the
arithmetic that is true now is kept (A13). No test under `src/` is added or removed: titles
change, but the count per file doesn't.

## Traps

- **A bare id is never provenance on its own** (fix 1). The same shapes mean two things in this
  tree:
  - golden derivations: `TURN_STEPS = 4 (U1, U2, R1, R2).`, `O1 (T1):`, and the leading labels
    `R1:`, `R2:` and `E1: 100 -> 84 -> 64.`;
  - plan items: `// B5:` (`actions.ts`), `// F2:` (`combat.ts`), `/** R1:` (`balance-sim.ts`).

  `comment-proof` strips comments, so a deleted derivation would pass every gate. The script
  removes an id only when it sits in the same parenthetical as a non-id tag (`Phase …`, a slice id,
  `PR #…`, `ASSUMPTION …`, `review fix`) or directly follows one. A parenthetical or label made only
  of ids is residue, and you decide it by hand against the code. Pattern 8 catches only suffixed ids
  (`H2c`), so `comments` passing doesn't prove the bare plan-item ids are gone. The hand pass
  decides each one, and leaves the derivation labels.
- **"locked", "decided", "brief" and "review" are also plain words.** The script never strips the
  bare word. On `main`, every hit of patterns 11, 12 and 14–17 is provenance
  (`H1/evidence/word-patterns.txt`). If one fires on a true comment after your rewrite, report it as
  a tool finding. Don't reword a true comment to get past the check.
- **Capitalise only a plain lower-case word** after a leading label goes (fix 11). An identifier or
  a backticked word stays as it is: `isActionLocked returns …` must not become `IsActionLocked`.
- **A forward pointer cites the rule that states the wait** (fix 4, D3):
  - The demo harnesses (`app/demoFight.ts`, `ui/CombatDemo.tsx`) cite
    `CONVENTIONS.md#every-feature-phase-ships-a-demo`, which says Phase 7 replaces them. The
    Phase 7 ROADMAP entry doesn't mention the demos.
  - The nine `// Inert until Phase 8 (gem system) -- see sorcerer.md` lines (eight Sorcerer, plus
    the Shieldbarer's at `data/specializations.ts:412`) each cite the perk's own entry
    (`specializations/sorcerer.md#wit-mastery`, …, `specializations/shieldbarer.md#shield-specialist`).
    The entry states the wait, and this also replaces the bare `see sorcerer.md`. Keep "(gem
    system)" and "(equipment system)".
  - The others (`state/rewards.ts`, `engine/balance-types.ts`, `engine/effect-types.ts:833`, …)
    cite the `## Not built` rule or ROADMAP entry that states the wait. If none does, reword to
    what is true now and list the line under Spec questions (D3).
  - A **title** carries no anchor. It says what the test pins: "a perk inert until Phase 8 is
    buyable" becomes "an inert perk is buyable".
- **A phase as a past baseline is history.** "Unchanged from Phase 4", "Empty in Phase 1",
  "shipped in Phase 2" and "was deleted in Phase 4.1-C" each state what is true now, or go. Check
  against the code: the damage pools that comment calls empty are not empty now.
- **The corpus header and `renderFixture` change together**, to the same text
  (`CONVENTIONS.md#corpus-digest` is followed by its label echoed back). The template part is a
  mask entry (a non-title literal), and the proof prints it. Show that the template renders
  byte-equal to the committed header.
- **The mask is exact or it fails.** Build it from the script's title edits plus the hand pass's,
  never by widening an entry. If two titles converge (A9), rename one by hand. It goes in
  `evidence/mask.json`. That's plain-text JSON, kept because the reviewer re-runs the proof with
  it.
- **Prettier still runs.** A deleted comment line can leave a double blank line or an empty
  `/** */`. A shortened title may let Prettier join a call onto one line, which is fine because
  the tokens don't change. Don't rewrap prose.
- **A citation names the rule it means.** A new anchor must resolve *and* must name the heading
  that states the fact. A quotation beside an anchor is the target's own words, or it goes. A row
  that `--quotations` still lists after the pass must be shown to be a false positive, with the
  target line beside it (fix 9).
- **The two `// ASSUMPTION:` markers become plain why-comments.** Neither is a live open question:
  - `data/spells/index.test.ts:21` keeps the sharp edge on the duplicate-guard key;
  - `state/store.ts:104` cites `spec/store.md#newgame` (the seed comes from `src/app`).

  Check each against the code before writing it.
- **Residue already gone.** The brief's `spec/responses.md#flat-mode` "own named example" is no
  longer in `src/`, so show the grep. The rest is still there: `data/species/overgrowth.ts:2`, the
  two `` `specializations/sorcerer.md#starter-glyphmoth-seer` / sorcerer.md `` lines,
  `engine/effect-types.ts:328`, `engine/resolution-types.ts:97`, the corpus header, and the two
  `ASSUMPTION (Slice F)` blocks in `data/species/starters.ts`.
- **`origin/main` is the proof's base**, at 0126c4a (4.2-H1's merge) at this kickoff. If it moves,
  stop and ask Duncan. Don't switch to a merge-base (A15).

## Must stay green

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`, and
`npm run docs:check -- citations`, `-- budgets` and, new, `-- comments`. Every golden and the
corpus digest are unchanged, and the test count under `src/` is unchanged file by file. The
`docs-check` project changes only in `ci.test.ts`'s assertion.

## The PR must prove

- **Comment-only:** `comment-proof origin/main --mask evidence/mask.json` passes and prints every
  changed file with its masked pairs → `evidence/comment-proof.txt`. On this diff it fails on a
  planted code change, a planted pragma change and a planted unlisted title change, each exit 1
  naming the file.
- **`comments`:** it passes. Show before/after counts per pattern, for comments and for titles,
  with every after count zero → `evidence/counts.txt`. It runs in `deploy.yml`'s `test` job after
  `budgets` and before `npm run test`, and `ci.test.ts` asserts that.
- **Bare ids:** every id-only parenthetical or label the script left as residue, with what you
  decided (a derivation kept, or provenance rewritten) → `evidence/bare-ids.md`.
- **Quotations:** the 48 before, re-derived on `main`, and the after list, with zero real ones.
  Each remaining row is a false positive, shown with its target line → `evidence/quotations.txt`.
- **Titles:** every changed title, old → new, and no new duplicate full names →
  `evidence/retitled-tests.md`.
- **Forward pointers:** every one, line → the anchor it now cites → the sentence there that
  states the wait → `evidence/forward-pointers.md`.
- **History markers:** each one kept (a live invariant) or rewritten (history), with the reason
  → `evidence/history-markers.md`.
- **Hand rewrites:** at least one per folder (`app`, `data`, `engine`, `state`, `ui`, plus the two
  configs), old → new, with the *why* quoted from both sides → `evidence/hand-rewrites.md`.
- **Residue:** each brief item, before and after, and the two `// ASSUMPTION:` markers.
- **Golden fixtures:** the list of changed fixtures, and every fixture's exports deep-equal to
  `main`'s → `evidence/fixtures-compare.txt`. The corpus digest test passes against the committed
  fixture.
- **Test counts**, file by file, `main` against the branch → `evidence/test-counts.txt`.
- **The mechanical script:** its rules and its printed table per rule and folder →
  `evidence/mechanical-rules.txt`. The script itself stays in scratch.
- **Non-title literals that still carry provenance**, counted (A14).
- **Gates** → `evidence/gates.txt`.
- **Spec questions** include the living-doc lines this sweep makes stale, such as
  `spec/progression.md#inert-perks`, which quotes the old comment form.
- **To delete:** none expected.

---

## Docs edited at this kickoff

- `ROADMAP.md`, Phase 4.2: "Done: 4.2-A to 4.2-H1" (4.2-H1 merged as 0126c4a).
