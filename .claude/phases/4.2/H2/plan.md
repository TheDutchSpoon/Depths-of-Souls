# Plan — Phase 4.2 — Slice H2: Code comments, the sweep

Standing rules: `.claude/workflow/coding-rules.md`. Read for this plan: `CLAUDE.md`, `kickoff.md`,
`phases/4.2/H/brief.md` (all), `phases/4.2/H/plan.md` §4, §5, §6, §8, D3, A12–A16 and
`phases/4.2/H/plan-review.md` Round 1 (fixes 1, 4, 8, 9, 11, 12; D3, D5; A12–A16),
`phases/4.2/H1/record.md`, `CONVENTIONS.md#comment-why-not-what`, the tool on `main`
(`scripts/docs-check/comments.ts`, the `comment-proof.ts` header and mask loader),
`.github/workflows/deploy.yml`, `scripts/docs-check/ci.test.ts`, `src/engine/corpus-digest.test.ts`
with its fixture, `src/data/specializations.ts` and its test. No spec file is read whole; the hand pass
reads each rule a comment cites or should cite. No conflict between the kickoff, the brief and the
rules was found.

Nothing is built. Numbers below are from `npm run docs:check -- comments --counts` and `--quotations`
on the clean tree at `9572bac` (a docs-only commit over `main`'s `src/` at `0126c4a`).
`origin/main` is `0126c4a`, as the kickoff says.

## 1. What is there

403 files (401 under `src/`, plus the two configs), 7,178 comment ranges, 1,627 titles. Per pattern,
distinct comment blocks / titles (the check's own `--counts`):

| # | what | comments | titles | files |
| ---: | --- | ---: | ---: | ---: |
| 1 | ASSUMPTION marker | 356 | 76 | 142 |
| 2 | phase number | 576 | 161 | 268 |
| 3 | phase id | 7 | 4 | 8 |
| 4 | slice id | 530 | 142 | 260 |
| 5 | slice name | 223 | 95 | 127 |
| 6 | PR number | 103 | 20 | 74 |
| 7 | review round | 44 | 10 | 28 |
| 8 | plan item id | 139 | 50 | 140 |
| 9 | plan item range or rule | 5 | 1 | 4 |
| 10 | workflow word | 15 | 1 | 12 |
| 11 | locked as a decision | 8 | 0 | 5 |
| 12 | decided at a point | 3 | 1 | 3 |
| 13 | section sign | 4 | 0 | 3 |
| 14 | brief | 30 | 1 | 23 |
| 15 | the plan | 6 | 0 | 6 |
| 16 | plan review | 5 | 2 | 5 |
| 17 | sign-off | 1 | 0 | 1 |

`--quotations` lists 47 comments and 1 title (the kickoff's 48). The nine inert-perk lines are at
`data/specializations.ts:125, 133, 141, 149, 157, 185, 193, 201` (Sorcerer) and `:412` (Shieldbarer);
their perk ids are `wit-mastery`, `violence-mastery`, `endurance-mastery`, `vitality-mastery`,
`instinct-mastery`, `arcane-shields`, `arcane-versatility`, `true-wit` and `shield-specialist`, and
`specializations/sorcerer.md` and `shieldbarer.md` each hold a `###` heading for them.

## 2. Approach

Three phases, in this order. The tool is not touched (`comment-proof` and `comments` stay as H1 built
them); if either is wrong, I stop and report.

1. **Baseline** from an untouched tree: `git archive HEAD src vite.config.ts eslint.config.js .claude`
   into a scratch directory outside the repo; `comments --counts` and `--quotations --root <it>` give
   `evidence/counts.txt` (before) and the 48 quotations. A word-pattern list for patterns 11, 12 and 14–17
   is taken from `H1/evidence/word-patterns.txt` and re-derived.
2. **The mechanical script** (§3), a one-off in the scratchpad, never in the repo. Dry run, then the real
   run, then `prettier --write` on the changed files. It prints its rules, a table per rule and folder,
   the title edits (for the mask and `retitled-tests.md`) and a **residue list**.
3. **The hand pass** (§4), until `comments` passes, the residue list is empty and `--quotations` shows
   only shown false positives. Then the proof, the evidence and the gates (§7).

## 3. The mechanical script (plan §4 of the pre-split plan, corrected by fixes 1 and 11)

It is built on the scanner's ranges (it imports `scanSource` from `scripts/docs-check/scanner.ts`, read
only), edits only comment text and title-literal text by position, from the end of each file backwards,
and does not rewrap prose. It does not touch what it cannot parse as one of the rules; that goes to the
residue.

**Tokens.** A *non-id tag* is one of: `Phase <n>[.<m>][-<X>…]` (optionally with ` Slice <X>…`),
`<n>.<m>-<X>…`, `Slice <X>…`, `Pre-<n>.<m>-<X>`, `PR #<n>` (optionally ` review`),
`ASSUMPTIONS? <n>[, <n>]… [as amended]`, `review fix`, `grill`. An *id* is `<X><n><x>?` (`A7`, `S4`,
`D4`, `H2c`, `G4`).

**An id is removed only (fix 1)** when it is in the same parenthetical as a non-id tag
(`(Phase 4.1-C2a, G4)`), or directly follows one (`Phase 4.1-A (S4)`, `Review fix F2`). A
parenthetical or leading label made only of ids (`(U1, U2, R1, R2)`, `R1:`, `E1: 100 -> 84 -> 64.`,
`// B5:`, `/** R1:`, `(H2c)`) is **never edited by the script**: it is residue and goes to
`evidence/bare-ids.md` with my decision (a derivation kept, provenance rewritten).

| Rule | Does | Sample (real, from this tree) |
| --- | --- | --- |
| **M1** | leading label of non-id tags (+ attached ids), then `:`, at the start of a comment or sentence; the rest is capitalised **only if the next word is a plain lower-case word** (fix 11: an identifier, a backticked word or a word with an internal capital is left, so `isActionLocked returns …` stays) | `// Phase 4.1-G1 (D4): the three spells …` → `// The three spells …`; `/** ASSUMPTION 27: the run RNG …` → `/** The run RNG …` |
| **M2** | a parenthetical of only non-id tags and the ids attached to them, with its leading space | `(Phase 4.1-C2a, PR #71 review)` → removed; `(ASSUMPTION 23).` → `.` |
| **M3** | mixed parenthetical: tags and their separators go, the rest stays | `(D4; \`spec/scripting.md#role-scripts\`)` is residue (the `D4` is bare); `(\`spec/creatures.md#levels-and-xp\` / ASSUMPTION 5)` → `(\`spec/creatures.md#levels-and-xp\`)` |
| **M4** | `(<tag> -- <why>)` keeps the *why* | `(ASSUMPTION 14 -- living-adjacency, not raw slots, …)` → `(living-adjacency, not raw slots, …)` |
| **M5** | title: trailing parenthetical of non-id tags (+ attached ids) | `'creature roles (Phase 4.1-G1)'` → `'creature roles'`; `'Known-inert perks (Phase 4.1-G2, G4)'` → `'Known-inert perks'` |
| **M6** | a comment line left empty is deleted; a block left empty is deleted | `// Phase 4.1-A (S4):` alone → removed |

Not edited by any rule, residue for the hand pass: a tag inside a sentence ("per ASSUMPTION 5", "as
4.1-B did"), a forward pointer (`Phase 7`, `Phase 8`), a history marker, a quotation, an id-only
parenthetical or label, and any parenthetical with a word the grammar does not know. The bare words
"locked", "decided", "brief" and "review" are never touched. The kickoff's trap stands: a hit of
patterns 11, 12 and 14–17 that survives my rewrite of a *true* comment is reported as a tool finding, not
reworded away.

**Titles.** A title edit keeps the literal's quote character and escapes it and backslashes. Each edit is
recorded as `{ file, old, new }`. Before writing, the script computes the file's full test names after
the edit and holds a file where a new duplicate would appear (A9) for a hand-disambiguated title. The
mask is built from the script's edits plus the hand pass's, entry by entry; a `count` is set where the
same title occurs more than once in a file (or a `new` text already occurs there). I never widen an entry.

**Gate on the script.** Before the real run: the dry run's `file:line` list is compared with `comments`'
problem list, so every pattern hit is either edited or in the residue. After it: `comment-proof origin/main
--mask evidence/mask.json` passes on the mechanical diff alone (before the hand pass), which catches a
script bug that changed code.

## 4. The hand pass

Ordered by folder (`app`, `data`, `engine`, `state`, `ui`, then `vite.config.ts` and
`eslint.config.js`), each comment checked against the **code** it sits on, never against the old text.

1. **Every block the script touched.** Read in context: the sentence must still read, the *why* survives.
   Kept or fixed; the sample (≥ 1 per folder and per config, old → new, with the why quoted from both)
   goes to `evidence/hand-rewrites.md`. `ui` has one source file (`CombatDemo.tsx`), so its sample comes
   from there.
2. **Bare ids (fix 1, A12).** The residue of id-only parentheticals/labels, each decided against the
   code: derivation labels (`TURN_STEPS = 4 (U1, U2, R1, R2).`, `O1 (T1):`, `R1:`, `R2:`,
   `E1: 100 -> 84 -> 64.`) stay; plan items (`// B5:` in `actions.ts`, `// F2:` in `combat.ts`,
   `/** R1:` in `balance-sim.ts`, `(H2c)`, `(B1)`) are rewritten to the *why* or removed. Pattern 8 only
   catches suffixed ids, so `comments` passing does not prove these are gone: I list them by a scratch
   grep of `\b[A-Z]\d\b` in comments and decide each → `evidence/bare-ids.md`.
3. **History markers.** A scratch grep of "no longer", "used to", "previously", "formerly", "before
   this", "was … before", "now matches/reads/uses", "Unchanged from Phase", "Empty in Phase",
   "shipped in Phase", "deleted in …": each judged against the code. Kept when it states a live
   invariant ("a dead actor no longer ticks"); rewritten to what is true now, or dropped, when it narrates
   change. A phase as a past baseline is history; the damage pools a comment calls empty are checked
   against the code. Golden derivations drop history and keep the arithmetic that is true now
   ("(Before H2a: 20, Defence ignored.)" goes; A13) → `evidence/history-markers.md`.
4. **Quotations.** The 48 rows. Each: read the target section; if it holds the fact, the comment keeps
   the anchor and drops the quote (or uses the target's own words); if it does not, it goes under **Spec
   questions** and the quote goes. A citation must name the heading that states the fact, so some
   anchors are re-pointed. A row `--quotations` still lists afterward is shown to be a false positive,
   with the target line beside it → `evidence/quotations.txt` (before, after).
5. **The brief's residue**, each with a grep before and after:
   - `spec/responses.md#flat-mode` "own named example": already gone from `src/` (the kickoff); I show
     the grep. (`effect-types.ts:50` and the two flat-mode titles are not it.)
   - `data/species/overgrowth.ts:2` dropped possessive (`content/overgrowth.md#the-overgrowth-biome-1-floors-110` own table);
     the two `` `specializations/sorcerer.md#starter-glyphmoth-seer` / sorcerer.md `` lines;
     `engine/effect-types.ts:328` (echoed label `content/overgrowth.md#swarmhive-striker` Swarmhive Striker);
     `engine/resolution-types.ts:97` (`spec/responses.md#perform-action` B2 rule 2);
     the two `ASSUMPTION (Slice F)` blocks in `data/species/starters.ts:11, 18`, rewritten to the anchor
     plus the sharp edge each names (the 4.1-H2c numbers at `:91, :93` are provenance too and go with them).
6. **The corpus header and `renderFixture` change together.** Fixture lines 1–3 and the template literal in
   `corpus-digest.test.ts` drop the echoed label: "(`CONVENTIONS.md#corpus-digest`, corpus digest)"
   → "(`CONVENTIONS.md#corpus-digest`)", the same text on both sides. The test's own file header (lines
   1–5, `Phase 4.1-C2a (PR #71 review)`) and the title `'corpus digest (Phase 4.1-C2a, behaviour tripwire)'`
   change by hand. Proof: a scratch script renders the template (the function copied into the
   scratchpad, same text) with the fixture's rows and shows it byte-equal to the committed header (the
   header + body Prettier produces); the template literal is a **mask entry** (a non-title literal),
   printed by the proof. **Assumption A19**: Prettier keeps the template's text as is, so the header
   stays three lines.
7. **The two `// ASSUMPTION:` markers**, checked against the code first:
   - `data/spells/index.test.ts:21`: a plain why-comment on the duplicate-guard key (the key reads the
     primary effect's `spellPower`; an `apply-stat-modifier` primary keys as 1; a future stat-modifier
     spell reusing an `(affinity, targetShape)` pair with a different stat would collide falsely; none
     exists). I read the guard in that file and `dedupKey` before writing it.
   - `state/store.ts:104`: "a fixed default so the store is constructible with zero config; the seed comes
     from `src/app`", citing `spec/store.md#newgame` (checked there).
8. **Forward pointers (D3, fix 4).** Every `Phase <n>` that is a forward wait (38 lines in the brief):
   - demo harnesses (`app/demoFight.ts`, `ui/CombatDemo.tsx`) → `CONVENTIONS.md#every-feature-phase-ships-a-demo`;
   - the nine inert perks → `specializations/<spec>.md#<perk-id>` each, replacing "Phase 8 … see sorcerer.md",
     keeping "(gem system)" / "(equipment system)":
     `wit-mastery`, `violence-mastery`, `endurance-mastery`, `vitality-mastery`, `instinct-mastery`,
     `arcane-shields`, `arcane-versatility`, `true-wit` (all `sorcerer.md`) and
     `specializations/shieldbarer.md#shield-specialist`;
   - the others (`state/rewards.ts`, `engine/balance-types.ts`, `engine/effect-types.ts:833`, …): the
     `## Not built` rule or ROADMAP entry that states the wait, found by reading each; **if none states it, reword to
     what is true now and list the line under Spec questions**;
   - **titles** carry no anchor ("a perk inert until Phase 8 is buyable" → "an inert perk is buyable").
   - `rewards.ts:53`'s error message and the regex at `rewards.test.ts:179` stay (A14); the comments around
     them are swept.
   Each is recorded line → anchor → the sentence there that states the wait → `evidence/forward-pointers.md`.
9. **The two configs.** `vite.config.ts` (`Phase 4.1-A (S4)`, `Review fix F2`, `ASSUMPTION 24`, the docs-check
   project note) and `eslint.config.js` (`Phase 4.1-C2a (PR #71 review)`): the engine-purity and node-import
   *whys* are kept and cite `CONVENTIONS.md#the-engine-is-pure-and-deterministic`.
10. **History markers inside titles** and any convergent title (A9): renamed by hand, described in
    `retitled-tests.md`; no new duplicate full name.

Also `specializations.test.ts:54, 68` (the nine-inert-perks comment and `Known-inert perks (…)` title)
and the other comments naming a living-doc quote are covered by items 4 and 8.

## 5. `deploy.yml` and `ci.test.ts`

- `.github/workflows/deploy.yml`: add `- run: npm run docs:check -- comments` to the `test` job, after
  `budgets` and before `npm run test`. No other workflow change.
- `scripts/docs-check/ci.test.ts`: the first test asserts the job contains the `comments` step, and the
  second asserts it comes after `budgets` and before `- run: npm run test` (the only `scripts/` change;
  no test is added: the two tests widen their assertions). H1's count of `docs-check` tests is unchanged.

## 6. Golden policy (restated from the kickoff)

**Byte-identical.** Every golden's expected values and the corpus digest are unchanged;
`npm run corpus:update` is **not** run. Golden fixtures change only in comments, and each is listed
(`CONVENTIONS.md#comment-only-golden-edits-are-allowed`). Setup, arithmetic and random draws stay;
a derivation's history goes, only the arithmetic that is true now is kept (A13). No test under `src/` is
added or removed; titles change, the count per file does not. Shown by: (a) `evidence/fixtures-compare.txt`,
every changed fixture's exports deep-equal to `main`'s, by importing both trees (the `main` copy extracted
by `git archive` to scratch) in a scratch Vitest config; (b) the corpus digest test passing against the
committed fixture; (c) `evidence/test-counts.txt`, a `vitest run --reporter=json` count for `main`'s
archive and the branch, file by file.

## 7. Mechanism → the test that fails without it, at every site

This slice adds no new engine mechanism. Its mechanisms are the sweep, the CI step and the proof; the
tests that fail without each are:

| Mechanism | Site | What fails if it is removed |
| --- | --- | --- |
| `comments` runs in CI | `deploy.yml` `test` job | `ci.test.ts` (both assertions: step present; after `budgets`, before `npm run test`). Mutation: delete the step, the test fails; restore. |
| The sweep clears each pattern | every folder, comments and titles | `npm run docs:check -- comments` (blocking, now also in CI). Planted fault: one tag of each pattern (1–17) in a comment and a title, in one file under each of `app`, `data`, `engine`, `state`, `ui`, `__golden__`/`__corpus__`/`__fixtures__` and each config — exit 1 naming the file; saved in `evidence/planted-faults.txt` with the proof faults. |
| Comment-only diff | whole tree | `comment-proof origin/main --mask evidence/mask.json` (H1's tool). On this diff, a planted code change, a planted pragma change (the `@ts-expect-error` in `engine/injured-allies.test.ts:149` text and the token it sits before) and a planted unlisted title change each exit 1 naming the file; the mask is consumed exactly (`count`s match). |
| Corpus header ↔ template | `corpus-digest.fixture.ts`, `corpus-digest.test.ts` | No test compares them in the default run (the test reads the fixture only in `corpus-update` mode). The pairing is evidenced by the byte-equality check of §4.6 and by the mask entry; **I am not adding a test (the kickoff forbids it)** — flagged under Spec questions as a gap. |
| Titles change, counts do not | 150 test files | `evidence/test-counts.txt` file by file; the proof's duplicate-name check; the mask's exact consumption. |
| Inert-perk comments cite the entry | `data/specializations.ts` ×9 | `citations` (every anchor resolves; a mistyped perk anchor fails) and a scratch grep showing nine `specializations/…#<perk>` citations. The nine perk ids also match `KNOWN_INERT_PERK_IDS` in `specializations.test.ts`, which still pins them inert, so the comments cannot silently go false. |
| Quotation drop | the 48 rows | `--quotations` after the pass: zero real rows, every remaining row a shown false positive. |

## 8. Order of work and evidence

1. Baseline (scratch archive): `evidence/counts.txt` (before half), `evidence/quotations.txt` (before half).
2. Mechanical script dry run → real run → Prettier → `comment-proof origin/main --mask` on the mechanical
   diff; `evidence/mechanical-rules.txt` (per rule per folder), `evidence/retitled-tests.md` (old → new),
   `evidence/mask.json`, the residue list.
3. Hand pass in §4 order; `deploy.yml` and `ci.test.ts` (§5).
4. Proof and evidence: `evidence/comment-proof.txt`, `evidence/planted-faults.txt`, `evidence/counts.txt`
   (after, every count zero, comments and titles), `evidence/quotations.txt` (after), `evidence/bare-ids.md`,
   `evidence/retitled-tests.md` (no new duplicate full name), `evidence/forward-pointers.md`,
   `evidence/history-markers.md`, `evidence/hand-rewrites.md`, residue (each brief item before/after
   and the two ASSUMPTION markers), `evidence/fixtures-compare.txt`, `evidence/test-counts.txt`, the count of
   non-title literals that still carry provenance (A14), `evidence/gates.txt`.
5. Gates, all green: `npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
   `npm run docs:check -- citations`, `-- budgets`, `-- comments`. Node 24.19.0 is installed; I check the
   toolchain against `package-lock.json` first. The step files under `phases/4.2/h2/` also pass
   `citations <file>…`.
6. `report-r1.md` and `record.md`. Nothing committed; nothing deleted. If `origin/main` moves from
   `0126c4a`, I stop and ask Duncan (A15).

## 9. Pre-listed for the report

**Spec questions:**

- Living-doc lines this sweep makes stale: `spec/progression.md#inert-perks` quotes the old
  `// Inert until Phase 8 (gem system) -- see sorcerer.md` form (the brief's Decided, not built);
  `CONVENTIONS.md#every-pull-request-runs-the-gates`, `workflow/coding-rules.md#rules`, `CLAUDE.md`,
  `workflow/pr-review.md#2-install-and-run-the-gates` and `skills/slice-verify/SKILL.md` list the CI
  modes without `comments`; found by a grep of `docs:check` over `.claude/`, with line numbers.
- The corpus header/template has no test tying them together (§7).
- Any quotation fact, comment fact or forward pointer with no home, each with `file:line` (D3).

**Content changes:** none (comments and titles only).

**To delete:** none expected.

## Assumptions checklist

Carried from the pre-split plan as corrected by its review (A12–A16), plus the ones this plan adds.

- **A12** The mechanical script is one-off, outside the repo; its rules are §3's table and its printed
  tables are the evidence. Leading-label removal capitalises the first letter only of a plain
  lower-case word (fix 11); a bare id is removed only inside a parenthetical with a non-id tag or directly
  after one (fix 1). Id-only parentheticals/labels are residue, decided by hand.
- **A13** A history word is rewritten only when it narrates change and kept when it states a live
  invariant; a golden derivation drops its history and keeps the arithmetic true now. Each decision is listed.
- **A14** Non-title string literals that carry provenance (error messages, `toThrow` text, `rewards.ts:53`
  and `rewards.test.ts:179`) stay; only the `renderFixture` template changes. The report counts what remains.
- **A15** `origin/main` (local ref, `0126c4a`) is the proof's base; if it moves, I stop and ask Duncan. No
  merge-base.
- **A16** The test count under `src/` is verified by a Vitest JSON-reporter run per tree (`main` archive vs
  branch), file by file; the `docs-check` count is unchanged (two assertions widen in `ci.test.ts`, none added).
- **A17** I take the kickoff's 38 forward-pointer lines and 48 quotations as the starting counts and
  re-derive both with the tool; a count that differs is reported, not forced.
- **A18** "Hand pass is bounded" (the brief's decision): a restated rule elsewhere that no pattern flags
  and no history marker/quotation/residue item covers is not hunted; one found while reading is fixed.
- **A19** Prettier leaves the `renderFixture` template text as is, so the header stays three lines and the
  template and the fixture header stay byte-equal after both change.
- **A20** The mask is one entry per distinct `{ file, old }` title or literal, with `count` where a title
  repeats; a convergent title (A9) is disambiguated by hand rather than by widening an entry.
- **A21** Every perk anchor for the nine inert perks is the perk's `###` heading slug in
  `specializations/sorcerer.md` / `shieldbarer.md` (`wit-mastery` … `true-wit`, `shield-specialist`); I check
  each states the wait before citing it. `Arcane Shields`, `Arcane Versatility` and `True Wit` are checked
  separately, since their entries may state the wait differently.
- **A22** The `ci.test.ts` assertions grow inside the two existing tests (no test added or removed there).
- **A23** Comment lines in golden fixtures that mention a plan or slice id as *where a number came from*
  (e.g. "4.1-H2c remap") are provenance and go; the number's arithmetic stays.
