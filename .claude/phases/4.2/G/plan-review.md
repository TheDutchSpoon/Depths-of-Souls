# Plan review — Phase 4.2 — Slice G

## Round 1

Reviewed `plan.md` (base `16c38b6`, commit `3e41800`) against the kickoff, `G/brief.md`, the phase
brief ("Rules for the new spec", "Checks", "Inventory format"), `CONVENTIONS.md`, `CLAUDE.md`,
`workflow/budgets.md`, `vite.config.ts`, `tsconfig.node.json`, `deploy.yml` and the code the
stale-comment table names. Checked independently: every one of the 243 Appendix anchors resolves
against today's headings (my own slugger, GitHub's dedupe), and the heading level of each target;
the label-form count in `.claude/`; the D1 template; the code facts behind the riskier stale-comment
rows (`calculateIndirectDamage`'s fifth of Defence, the three random selectors' peek, the
targeting-override and Provoke homes for the `GAME_DESIGN §7` rows).

**Verdict:** approved (D1–D3 decided, see Decisions). The plan fixes are small and fully specified
here, so they are **binding at build** rather than a second plan round.

Two kickoff slips the plan already handled correctly: the Vitest config is `vite.config.ts`, not
`vitest.config.ts`; and the kickoff's "164 backticked links" undercounted (it missed links wrapped
over a line break). The plan's 212 backticked (197 + 15) is right: I count 194 on one line plus the
wrapped ones.

### Plan fixes

1. **Four Appendix rows land on a `##` section where a `###` rule holds the fact.** Inventory rows
   C:1918 and C:16 point at a half-level heading; rule 4 makes the `###` the citable unit.
   - `engine/corpus-digest.test.ts:2`, `:52` (D1's string) and
     `engine/__corpus__/corpus-digest.fixture.ts:3`: `CONVENTIONS.md#testing` →
     `CONVENTIONS.md#corpus-digest` (each comment is about the corpus digest).
   - `engine/__corpus__/corpus.ts:7`: `CONVENTIONS.md#engine-purity` →
     `CONVENTIONS.md#the-engine-is-pure-and-deterministic`.
   - `engine/config.ts:2`: `OPEN_QUESTIONS.md#balance-numbers` → `OPEN_QUESTIONS.md#fight-length`.
     The plan's own stale-comment table already says `#fight-length` for this comment; the Appendix
     disagrees with it.
   - General rule for the dry run: an inventory row whose New home is a `#`/`##` heading is not
     used as-is if a `###` under it states the comment's fact; take the `###` and list the row in
     `mapping-src.md` as a hand-map. The other `##` targets I found are content-doc species
     sections (`content/glimmerdark.md#resonants-wit-caster-synergy` and the like) and the
     `OPEN_QUESTIONS.md#balance-numbers` cases for "every number here is parked"; those are right
     as they are.
2. **D1's second option isn't viable, and the chosen one needs one more proof line.** `citations`
   reads whole files, strings included, so leaving the old form in `renderFixture`'s template fails
   the check at once, not "at the next `corpus:update`". After rewriting the template (the backticks
   escaped, as `` \`npm run corpus:update\` `` already is), show in `evidence/` that the rendered
   header equals the committed fixture's header byte for byte, so the next regeneration makes no
   diff.
3. **Wrapped citations in `src/` comments.** The check's "whitespace, line breaks allowed" between a
   name and its quote misses a TypeScript comment wrap, where the gap is `\n// ` or `\n * `. In
   `src/` the gap may also contain one comment leader (`//` or `*`). The "wrapped over a line break"
   tests use a real `//`-wrapped and a ` * `-wrapped comment at the `src/` site.
4. **A6, tightened:** in `src/`, a `CONVENTIONS` token not followed by `.md#` fails too, as
   `GAME_DESIGN` and `species-locked` do. The rewrite leaves none, so it costs nothing today, and
   it is the one living-doc name `src/` historically cited without a label (61 bare cases): without
   it, `(CONVENTIONS)` can come back and nothing notices. Other names (`ROADMAP` in
   `data/biomes.ts:12`) stay 4.2-H's.
5. **A7, tightened:** detect the paren list `` `path.md` ("…" `` as a label form too. The plan
   converts the one case but leaves the shape undetected, so a later doc sync can bring it back.
   Add it to the label-form tests at both sites.
6. **A19, corrected to the kickoff:** a stale comment the brief lists is rewritten **whole** (its
   listed range) to "Comment why, not what": why, no provenance, cite, don't restate. The kickoff
   says the fixed comment is rewritten to the rule; only comments touched solely by the citation
   rewrite keep their other text. Fixing just the wrong sentences leaves 22 half-clean comments for
   4.2-H to reopen.
7. **A14:** the Splashing comment cites the ROADMAP item by anchor,
   `ROADMAP.md#phase-45--run-loop-demo-interlude`, not "tracked in ROADMAP Phase 4.5". Under fix 6
   the rest of that comment (ASSUMPTION 15, the `brute.md:` quote) is rewritten too: cite
   `specializations/brute.md` for the splash rule instead of quoting it.
8. **`eslint.config.js:28`** is code, not the design agent's text, so it doesn't belong under Spec
   questions. Rewrite its bare `(CONVENTIONS)` by the same rule (it maps to
   `CONVENTIONS.md#the-engine-is-pure-and-deterministic`) and include the file in the comment-only
   proof. The `citations` scan scope (A5) doesn't change.
9. **Reconcile the brief's line list.** The brief names `actions.ts` "header, `:346`, `:373-376`,
   `:397`" and `combat.ts:366`. The lines drifted: the Appendix has `actions.ts:334`, `:383`,
   `:390`, `combat.ts:367`, and the header carries no old citation. The report says which Appendix
   row answers each brief line, or that a line has none.
10. **Trap for the new tests:** `tsconfig.node.json` has `types: ["node"]` only, so a test under
    `scripts/` that relies on Vitest's `globals: true` runs but fails `tsc -b`. Import `describe`,
    `it` and `expect` from `vitest`.
11. **Depends on D2:** if Duncan picks "convert", the intra-file conversions use the full
    `` `<path>.md#<anchor>` `` form, so `citations` checks them. Same-file headings match exactly
    (case-insensitive, markup stripped); anything else is left alone. List them in
    `evidence/mapping-docs.md` under their own heading.
12. **Depends on D3:** if Duncan restores the rule, `data/species/starters.test.ts:52` keeps
    `spec/progression.md#specializations` and loses its `~`.

### Assumptions

| # | Call | Note |
| --- | --- | --- |
| A1 | confirm | Splitting the script is the honest fix: it runs `main()` on import. |
| A2 | confirm | A third Vitest project leaves both existing projects and every `src/` count untouched. Fix 10 applies. |
| A3 | confirm | |
| A4 | confirm | A `..` segment failing is right: citations are `.claude/`-rooted text, not relative links. |
| A5 | confirm | Excluding `scripts/` is needed anyway: its tests carry planted old forms. |
| A6 | **correct** | Fix 4: in `src/`, a bare `CONVENTIONS` fails too. The `.claude/` half stands (bare deleted-doc mentions in prose are allowed). |
| A7 | **correct** | Fix 5: detect the paren list. Unbackticked `content/x.md: "quote"` in `src/` passes: it quotes content, not a heading (4.2-H decides whether such quotes stay). |
| A8 | confirm | Verified: no indented heading, `_emphasis_` or entity in any living-doc heading. |
| A9 | confirm | |
| A10 | confirm | Matches the phase brief: reported, never fails CI. |
| A11 | confirm | One caution for the step file I rewrite at the PR review: the default base `HEAD` is the pre-condense text only while the condense is uncommitted, so `condense.md` will say to run the skeleton before committing, or pass `--base`. |
| A12 | confirm, with fix 1 | Four rows overridden there. The 23 `~` rows go to Spec questions with the fact each comment states: some may be rules lost between slices (D3 is one), and I check each at the PR review. |
| A13 | confirm | |
| A14 | **correct** | Fix 7. |
| A15 | confirm | Prefix matching is used only by the rewrite; the anchors it writes are full headings, which the check then resolves exactly. |
| A16 | confirm | As `coding-rules.md` asks: keep the printed tables, quote the rules. |
| A17 | confirm | Plus fix 2's header proof if D1 is "rewrite". |
| A18 | confirm | |
| A19 | **correct** | Fix 6. |
| A20 | confirm | |
| A21 | confirm | |

Mechanism → test: complete, apart from fix 3 (the `src/` wrap) and fix 5 (the paren list), whose
tests go in `citations.test` at the sites named there. Golden policy: matches the kickoff
(byte-identical; comment-only fixture edits; no `src/` test added or removed; 10 titles), with
D1's string as the one extra masked literal. Nothing in the phase brief's Assumptions checklist
changes: the generalized inventory keeps A9's unit definition and the row check.

### Decide-points

**D1. The citation inside `renderFixture`'s template string.**
Recommend: **rewrite it** (to `CONVENTIONS.md#corpus-digest`, fix 1) and mask that one template in
the proof. It isn't really a choice: the check scans strings, so leaving it fails CI on this PR.
The test compares hashes only, never the header, so no behaviour changes.

**D2. The ~55 same-file label references** (`("Damage formula")` inside `spec/combat.md`).
Recommend: **convert them** where the quoted text matches exactly one heading of the same file,
to the full `path#anchor` form (fix 11), with the list printed for review. I disagree with the
plan's "leave them". They are the same kind of reference as the cross-file ones, rule 4 makes
citations anchors, and a renamed heading breaks them silently. The full path is longer than
`#anchor`, but a bare-`#` form would make the check read "PR #73" as a broken anchor. The cost is
about 15 bytes each, well inside every budget. The check can't police new same-file labels
without guessing at quotes, so the guard going forward is the writing rule: at the PR review I add
"including within the same file" to `CLAUDE.md` "How the spec is written".

**D3. A rule lost between slices: the starters' distinct affinities.** `starters.test.ts:52`
asserts the three specializations' starters have distinct affinities. The rule was ratified (old
`species-locked.md:129`: Sorcerer Wit, Brute Violence, Shieldbarer Endurance, Unicorn Vitality,
"four distinct"). 4.2-B dropped it as a duplicate of `spec/progression.md` "9. Player
specializations", and 4.2-C's condense of that section no longer carries it. So the test pins a
rule no doc states.
Recommend: **restore it** as one bullet under `spec/progression.md` "Specializations": *the
starters and the Unicorn have four distinct affinities, one each* (the affinities themselves stay in
the starter entries). I write the edit once you confirm. Nobody decided to remove it: it fell into
the gap between B's drop and C's rewrite. If you'd rather it not be a rule, the test is pinning
seed content, and the title cites the starter entries instead.

### Decisions

- **D1 (Duncan): rewrite** the citation in `renderFixture`'s template, to
  `CONVENTIONS.md#corpus-digest`, and mask that template in the comment-only proof. Fix 2's
  header proof applies.
- **D2 (Duncan): convert** the same-file label references whose quoted text matches exactly one
  heading of the same file, to the full `` `<path>.md#<anchor>` `` form (fix 11), listed in
  `evidence/mapping-docs.md` under their own heading. Anything that doesn't match exactly one
  heading is left as it is. The writing rule goes in `CLAUDE.md` now, not at the PR review.
- **D3 (Duncan): not a rule; no spec edit.** The title of `data/species/starters.test.ts:52`
  becomes `the three specs settle on distinct affinities (spec/progression.md#specializations)`,
  and its `~` comes off. Fix 12 is replaced by this. Reasoning in "D3, revised" below.

### D3, revised

The test (`data/species/starters.test.ts:52`) checks only that the three shipped starters
(Glyphmoth Seer, Cragfang Mauler, Stonehorn Warden) don't share an affinity. The old text called it
"ideally distinct", a soft wish, not a constraint. As a lasting rule it would bind future content:
with more specializations, another starter could reasonably share an affinity (an Instinct starter
for a fourth spec says nothing about the first three). My first recommendation read "ratified" as
"a rule" without asking what it constrains going forward. It's a fact about the seed content, not a
design rule.

Recommendation now: **not a rule; no spec edit.** The title's citation goes to
`spec/progression.md#specializations` (the table that names the three starters) **without** the
`: "ideally distinct"` quote, which would otherwise claim the spec says it. New title:
`the three specs settle on distinct affinities (spec/progression.md#specializations)`. The `~`
comes off the row. Whether the test is worth keeping is 4.2-H's (a test pinning seed content);
this slice removes no test.

### Docs edited

- `CLAUDE.md` "How the spec is written": a rule is cited by anchor "within the same file too" (D2).
