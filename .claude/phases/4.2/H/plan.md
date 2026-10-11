# Plan — Phase 4.2 — Slice H: Code comments, the context diet for `src/`

Standing rules: `.claude/workflow/coding-rules.md`. Read for this plan: `CLAUDE.md`, `kickoff.md`,
`brief.md`, `CONVENTIONS.md` (the sections the kickoff names), 4.2-G's evidence
(`review-quotations.txt`, `comment-proof.txt`, `retitled-tests.md`, `fixtures-compare.txt`,
`test-counts.txt`), `scripts/docs-check.ts` and `scripts/docs-check/*`, `deploy.yml`,
`vite.config.ts`, `eslint.config.js`, `tsconfig.node.json`, and `corpus-digest.test.ts` with its
fixture. No spec file is read as a whole; the hand pass reads each rule a comment cites. No
conflict between the kickoff, the brief and the rules was found.

Nothing here is built. Numbers marked *(probe)* come from a throwaway TypeScript-parser probe I ran
read-only over the working tree at `69cafa6` (403 files: 401 under `src/` plus the two configs; 6,949
comment ranges and 1,627 titles). The build re-derives every one with the committed scanner.

## 0. Decisions I need at the plan review

**D1. Bare plan-item ids cannot be a `comments` pattern.** `E1`, `S1`, `P2`, `C4` are scenario
labels in the goldens ("S2 acts first", "(S1, S2 apply)", `(E1,`); the probe found 228 comment hits
for `\b[ESPC]\d\b`, and `(S1)` / `(S2,` / `(E1,` in parentheses alone is 20 comments. A bare
`(A7)` therefore cannot be told from `(S1)`. I propose: ids ride inside the tags that *are*
patterns (`Phase 4.1-A (A7)` fails on `Phase`, and the script removes the id with the tag), plus the
two unambiguous residue shapes the kickoff lists (§3, patterns 8 and 9). A free-standing id in prose
("mirroring H1's own Broodmother") is the hand pass's, not the check's. Alternative: a denylist of
ids per scenario; rejected, it rots. **Confirm or override.**

**D2. `comments` also reports, never fails on, two things** (`--counts`, `--quotations`: report-only
options of the same mode, exit 0), because the proof needs before/after tables and the quotation
list, and re-deriving them with a throwaway script is what 4.2-G did and the brief wants replaced.
The quotation check is **not** a failing check (ASSUMPTION A7): wrapped quotes and markup are where
it would false-positive. Alternative: no options, scratch scripts for the tables. **Confirm.**

**D3. A forward pointer with no rule that names the phase.** If no `## Not built` rule or ROADMAP
entry states that the feature waits, I do not invent an anchor and I do not keep "Phase N": I
reword to what is true now ("a throwaway harness") and list the line under **Spec questions**.
**Confirm.**

## 1. What is there today *(probe)*

Distinct comment ranges / test titles that match, per candidate pattern (a range with two hits
counts once; titles are `describe`/`it`/`test` first arguments):

| Pattern | Comments | Titles | Files |
| --- | ---: | ---: | ---: |
| `ASSUMPTION` not followed by `:` (`ASSUMPTION 14`, `ASSUMPTIONS`) | 377 | 76 | 141 |
| `ASSUMPTION:` (the allowed form) | 2 | 0 | 2 |
| `Phase <n>` | 608 | 161 | 266 |
| `Phase-<n>`, `Pre-<n>` | 7 | 4 | 8 |
| slice id `4.1-H2b2` | 588 | 142 | 259 |
| `Slice <X>` | 260 | 95 | 127 |
| `PR #64` | 102 | 20 | 74 |
| `review fix` / `Review fix` | 24 | 5 | 16 |
| bare `PR` (no number) | 108 | 20 | 77 |
| `locked` as a word | 25 | 3 | 17 |
| `decided` | 5 | 1 | 5 |
| `design-owner` / `design owner` | 9 | 0 | 8 |
| `grill`, `kickoff` | 7 | 1 | 7 |
| `§<n>` | 4 | 0 | 3 |
| history words (`no longer`, `used to`, `previously`, `formerly`, `before this`, `was … before`) | 60 | 2 | 47 |

Title shapes (probe): 1,598 plain string titles, 19 `.each` (16 `it.each`, 3 `test.each`), 2
`describe.skipIf`, 8 template titles with `${…}` (the kickoff's numbers). No title is a
`NoSubstitutionTemplateLiteral`. The only `// @ts-expect-error` in `src/` is
`engine/injured-allies.test.ts:149`; `vite.config.ts` imports only `vitest/config` and the React
plugin (it has no pragma).

"locked": 18 files use it as a game word (`lockedTurns`, "a locked CASTER", "locked rounds 2-4",
"(locked)" after SLOW, "the tier-2 bolt is still locked") and about 8 uses are provenance ("locked
design principle", "locked semantics", "(…, locked)", "decided at the 4.1-H2d grill").

## 2. Approach

Five pieces, in this order (the first three are code in `scripts/`, each with tests that land with
it; the last two are the `src/` diff):

1. **The scanner** (`scripts/docs-check/scanner.ts`), the base of both modes.
2. **`comments`** (`comments.ts`), wired into `cli.ts`, `docs-check.ts`'s header, `deploy.yml` and
   `ci.test.ts`.
3. **`comment-proof <base>`** (`comment-proof.ts`) and **`citations <file>…`** (in `citations.ts`).
4. **The mechanical rewrite**: a one-off script in the scratchpad (not committed, per
   `coding-rules.md`), built on the scanner's ranges, applying only the rules of §4 to comment and
   title text. Run once; its printed tables go to `evidence/`.
5. **The hand pass**: every block the script touched, every history marker, the quotations, the
   residue, the two `// ASSUMPTION:` markers, the forward pointers. Then `comments` goes green, and
   `comment-proof origin/main` proves the whole diff comment-only.

The scanner and the check are built and tested before any `src/` comment moves, so the "before"
counts are taken by the committed tool on an untouched tree (extracted with `git archive HEAD` into
a scratch directory and read with `--root`).

## 3. Module changes, by file

### `scripts/docs-check/scanner.ts` (new)

`scanSource(file, text): Scan`, pure (no fs, no git):

```ts
interface Comment { pos; end; line; text; standalone: boolean }   // standalone: only whitespace before it on its line
interface Block   { comments: Comment[]; text: string; offsets }  // see below
interface Title   { pos; end; line; call: string; parts: string[] }
interface Scan    { comments: Comment[]; blocks: Block[]; titles: Title[]; pragmas: string[] }
```

- **Parser, not scanner.** `ts.createSourceFile(file, text, Latest, false, kind)` with `ScriptKind`
  by extension (`.ts` TS, `.tsx` TSX, `.js` JS). Walk `getChildren(sf)` to the leaf tokens; at each
  token read `ts.getLeadingCommentRanges(text, token.getFullStart())` and
  `getTrailingCommentRanges(text, token.end)`, de-duplicated by `pos`, and **keep a range only if it
  ends at or before `token.getStart(sf)`** (this is what stops a `//` that begins a `JsxText` token
  or sits in a template from reading as a comment). JSDoc nodes are not walked; their text arrives
  as the leading comment of the first token. End-of-file token included.
- **Block.** Consecutive `//` comments on consecutive lines, each standalone, form one block; a
  `/* */` comment or a trailing comment is a block alone. A block's `text` is its comments' bodies
  (leader `//`, `/*`, `*/`, leading ` * ` stripped) joined with a single space, with an offset map
  back to `(comment, offset)`. Patterns match on `text`, so a tag wrapped over a line break
  ("Phase\n// 8") is still found; a hit reports the line of its first character.
- **Titles.** A call whose callee's root identifier is `describe | it | test | suite`, through any
  chain of property accesses and calls (`it.each(table)(…)`, `describe.skipIf(c)(…)`, `.only`,
  `.skip`, `.todo`, `.concurrent`, `.runIf`), takes its first argument. A string literal or a
  substitution-free template gives `parts = [text]`; a template with substitutions gives its literal
  head/middle/tail texts as `parts` (**the substitution expressions are code and are not checked; a
  pattern that straddles a `${…}` is not seen**). An identifier or other expression gives no title.
- **Pragmas.** Any comment matching `@ts-(expect-error|ignore|nocheck|check)`, `eslint-`,
  `^///\s*<`, `@vitest-`, `@jsx`, `@vite-ignore`, `prettier-ignore`, `v8 ignore` or `istanbul`
  (ASSUMPTION A8), in source order.

`export` also: `PROVENANCE` is not here; the patterns live in `comments.ts`.

### `scripts/docs-check/comments.ts` (new)

`findCommentProblems(root)`, `runComments(root, opts, log)`. Walks `src/**/*.{ts,tsx}`,
`vite.config.ts` and `eslint.config.js` under `root` (sorted, no exemptions: `__golden__`,
`__corpus__`, `__fixtures__` and tests are all scanned; `scripts/` is not), scans each, and checks
every block and every title part against the pattern table below. Output
`file:line: <message>: "<snippet>"`, then `comments: PASS, N comments and M titles in K files` or
`comments: FAIL, N problems` (exit 1). It reads the working tree and never calls git.

**The patterns** (a hit in any comment block or title part fails). Every pattern is
case-sensitive; the false positives each one avoids are the reason for its shape:

| # | Pattern | Avoids |
| --- | --- | --- |
| 1 | `\bASSUMPTIONS?\b(?!:)` | allows the `// ASSUMPTION:` form (§ below); lower-case "assumption" prose is untouched |
| 2 | `\bPhases?\s+\d` | an anchor slug such as `phase-8` (lower case, hyphen); no forward exception (the brief) |
| 3 | `\b(?:Pre\|Phase)-\d` | n/a (the `Pre-4.1-D` / `Phase-8` spellings pattern 2 misses) |
| 4 | `\b\d+\.\d+-[A-Z]\w*` (slice id `4.1-H2b2`, `4.2-G`) | `1.5-second`, `0.25-x` (the letter after the hyphen must be upper case) |
| 5 | `\b[Ss]lice\s+[A-Z]\d*[a-z]?\b` | "a slice of the list", "slice 3" (lower-case or digit after) |
| 6 | `\bPRs?\s*#?\d+` | bare "PR" ("a deliberate-change PR regenerates it" is process prose the corpus comments keep, and its text is `CONVENTIONS.md#corpus-digest`'s) |
| 7 | `\b(?:[Rr]eview\|content-review\|PR) (?:fix\|round\|amendment\|revision\|finding\|review)s?\b`, `\bcontent-review\b` | bare "review" ("reviewer", "code review") |
| 8 | `\b[A-I]\d[a-z]\b` (plan id with a letter suffix: `H2c`, `C2a`) | `S1`/`E1`/`P2` scenario labels (never a letter suffix); D1 |
| 9 | `\b[A-I]\d[a-z]?\+`, `\b[A-I]\d[a-z]?\s+rule\s+\d` (`H3+`, `B2 rule 2`) | script rule numbers ("rule 4: default lowest-hp-enemy" has no id before it) |
| 10 | `\bdesign[- ]owner\b`, `\bgrill\b`, `\bkickoff\b` | n/a |
| 11 | `\blocked\s+(?:design\|content\|seed\|semantics\|option\|decision\|number\|principle)\b`, `,\s*locked\)`, `\blocked\s+"` | `isActionLocked`, `lockedTurns`, "a locked CASTER", "locked rounds 2-4", "(locked)" after a creature, "locked-turn share", "the tier-2 bolt is still locked" |
| 12 | `\bdecided\s+(?:at\|in\|before\|by\|with)\b` | "has already decided this round's defending status", `"decided"` in the scripting types |
| 13 | `§\s?\d+` | n/a |

History words ("no longer", "used to", "previously", "was … before") are **not** a pattern: the
same words state live invariants. They are the hand pass's (§5), listed in `evidence/`.

**`// ASSUMPTION:`.** The form `ASSUMPTION:` is not a pattern-1 hit. A block containing it must also
contain `OPEN_QUESTIONS.md#<anchor>` (ASSUMPTION A5), the rule `CONVENTIONS.md#open-questions-get-an-interface`
made checkable; `citations` then proves the anchor resolves. After the slice `src/` has none, so the
form is exercised by the tests only.

**Options (D2).** `comments --counts` prints, per pattern, comments / titles / files and exits 0.
`comments --quotations` prints each `<path>.md#<anchor>` followed within four words (across a
comment wrap, in a block or a title) by a `"quoted"` string whose first 40 characters, normalised
(markup stripped, lowercased, whitespace collapsed), do not occur in that anchor's section (its
heading through its sub-headings), and exits 0. Same normalisation as 4.2-G, so the counts compare;
the section extraction is a new `sectionOf(lines, anchor)` next to `resolveAnchors` in `anchors.ts`
(same slug rule, same fence skipping) and `ANCHOR_CITATION` is exported from `citations.ts`.

### `scripts/docs-check/comment-proof.ts` (new)

`runCommentProof(root, base, maskPath, log)`; CLI `comment-proof <base> [--mask <file>]`. Never in
CI; the only mode besides inventory that calls git (`resolveRev`, `git ls-tree`, `showAt` from
`git.ts`).

1. **File set.** Base set: `git ls-tree -r --name-only <sha> -- src vite.config.ts eslint.config.js`.
   Working-tree set: a walk of the same paths (so an untracked file counts). Any path in one set
   and not the other fails: *added*, *deleted*, or (a rename shows as both) *renamed*. This slice
   changes no file set.
2. **Per changed file** (text differs from base): a `.ts`/`.tsx`/`.js` file is printed with
   `ts.createPrinter({ removeComments: true }).printFile(sf)` on both sides and the prints compared
   byte for byte; any other file (CSS, JSON) must be byte-identical.
3. **Pragmas** are compared apart (`removeComments` strips them): the scanner's `pragmas` lists must
   be equal, in order, as exact text.
4. **Masks.** `--mask` is a JSON array of `{ file, old, new, count? }` (count defaults 1). Before
   printing, in the base source every string literal, substitution-free template, and template part
   whose cooked text equals `old` (in that file) is replaced, token and quotes included, by the
   canonical `'MASK<i>'` (a template part keeps its `` ` `` / `${` / `}` delimiters); in the head
   source the same for `new`. A masked literal therefore passes whatever quote style Prettier chose
   for it. **Each entry must be consumed exactly `count` times on both sides, else the file fails**
   (a stale or too-broad mask can't hide a change); a literal that is changed and not listed makes
   the prints differ. The output prints, per file, `OK <path> (masked <n>)` and under it each
   masked pair `  "<old>" -> "<new>"`.
5. **Duplicate names.** For each changed file, the full test names (describe chain + title, real
   text, template parts joined by `${}`) of the head must not contain more duplicated names, or
   more excess copies, than the base (ASSUMPTION A9). Catches "(4.1-G1)" / "(4.1-G2)" collapsing two
   titles into one.
6. **Exit codes:** 0 all OK; 1 any failure (each prints `FAIL <path>: <reason>`, with the first
   differing printed line for a code change) or a git error; 2 bad usage.

### `scripts/docs-check/citations.ts`, `cli.ts`, `docs-check.ts`

- `citations.ts`: `findProblemsForFiles(root, paths)` returns the same `CitationsResult` by running
  `scanText` on exactly the named files with `SITES.claude` (the living-doc rules: resolve, old
  form, label form; not `src/`'s extra bare names) and the working-tree anchors. Paths are
  repo-relative or absolute under `--root`; normalised to `/` relative paths. A path that escapes
  the root, does not exist, or is a directory throws `UsageError` (exit 2, never 1). `runCitations`
  takes an optional `paths`; with none, **it is the current code path, byte for byte** (CI's call
  and output are unchanged). `phases/` is not skipped for a named file. It never calls git.
  Output: the same `file:line: what` lines and `citations: PASS|FAIL …` summary.
- `cli.ts`: `citations [<file>…]`; `comments [--counts|--quotations]`; `comment-proof <base>
  [--mask <file>]`; `UsageError` for `--counts`/`--quotations` anywhere but `comments`, both
  together, `--mask` anywhere but `comment-proof`, a missing `<base>`, extra arguments; `USAGE`
  grows three lines. `UsageError` must be exported for `citations.ts` to throw (it is a module-local
  class today) or move to a small `usage.ts`; I take the move (ASSUMPTION A1).
- `docs-check.ts`: header lists the three additions and replaces "no dependencies" with "imports
  `typescript`, a devDependency `npm ci` installs; `comments` and `citations` still read the working
  tree and never call git; `comment-proof` and the inventory modes call git".
- `.github/workflows/deploy.yml`: `- run: npm run docs:check -- comments` in the `test` job, after
  `citations` and before `npm run test`.
- `tsconfig.node.json`, `vite.config.ts`: unchanged in structure (`scripts` is already included and
  the `docs-check` Vitest project already globs `scripts/**/*.test.ts`); only `vite.config.ts`'s own
  provenance comments change (§5).

## 4. The mechanical rewrite (rules the script applies)

One scratchpad script on the scanner's ranges. It edits **only** comment text and title-literal
text, by position, from the end of the file backwards, then runs `prettier --write` on the changed
files. It does not rewrap prose. It touches nothing it cannot parse as one of the rules below;
everything else with a provenance hit is printed as **residue** for the hand pass. Rules are listed
with a real before/after from this tree:

| Rule | Before | After |
| --- | --- | --- |
| **M1** leading label (a run of provenance tokens, optional parenthetical, then `:`) at the start of a comment or sentence; the rest is capitalised | `// Phase 4.1-G1 (D4): the three spells that give every affinity a third biome-1 entry.` | `// The three spells that give every affinity a third biome-1 entry.` |
| M1 (block form) | `/** ASSUMPTION 27: the run RNG stream's seed + an advance counter, NOT a live SeededRng object` | `/** The run RNG stream's seed + an advance counter, NOT a live SeededRng object` |
| M1 (PR/review label) | `// PR #60 review (C2): per-creature affinity stamped to match the stat each one steals, not the` | `// Per-creature affinity stamped to match the stat each one steals, not the` |
| **M2** parenthetical that is only provenance tokens, with its leading space | `... when both apply (ASSUMPTION 23). */` | `... when both apply. */` |
| M2 (several tags) | `(Phase 4.1-C2a, PR #71 review)` | *(removed)* |
| **M3** mixed parenthetical: provenance tokens and their separator go, the rest stays | `(D4; \`spec/scripting.md#role-scripts\`)` ; `(\`spec/creatures.md#levels-and-xp\` / ASSUMPTION 5)` | `(\`spec/scripting.md#role-scripts\`)` ; `(\`spec/creatures.md#levels-and-xp\`)` |
| **M4** parenthetical that opens with a tag and `--` and continues with the *why* | `(ASSUMPTION 14 -- living-adjacency, not raw slots, ...)` | `(living-adjacency, not raw slots, ...)` |
| **M5** title, trailing parenthetical that is only provenance | `describe('creature roles (Phase 4.1-G1)'` ; `it('every species declares a positive draw weight (ASSUMPTION 5)'` | `describe('creature roles'` ; `it('every species declares a positive draw weight'` |
| M5 (mixed) | `describe('Known-inert perks (Phase 4.1-G2, G4)'` | `describe('Known-inert perks'` |
| **M6** a comment line left empty by M1-M5 is deleted; a block left empty is deleted | `// Phase 4.1-A (S4):` alone on a line | *(line removed)* |

A *provenance token* is exactly one of: `Phase <n>[.<m>][-<X>…]` (optionally ` Slice <X>…`),
`<n>.<m>-<X>…`, `Slice <X>…`, `Pre-<n>.<m>-<X>`, `PR #<n>` (optionally ` review`), `ASSUMPTIONS?
<n>[, <n>]… [as amended]`, `review fix <X><n>`, `<X>.<n><x>` plan ids (`A7`, `S4`, `D4`, `H2c`),
`grill`. Separators are `,`, `;`, `/`, `+`, `and`, `--`. A parenthetical counts as "only provenance"
when every token between its parentheses is one of these.

Never touched by M1-M6 (residue, by hand): a provenance token inside a sentence ("per ASSUMPTION
5", "as 4.1-B did"), a forward pointer, a history marker, a quotation, and any parenthetical with a
word the grammar does not know. The script prints each as `file:line: residue: <hit>`; the hand
pass must empty the list. Test-title edits keep the literal's quote character, escape it and
backslashes, and are collected as `{ file, old, new }` for the mask file and for
`evidence/retitled-tests.md`. **Before writing a title** the script computes the file's full names
after the edit and holds any file where a new duplicate appears for a hand-disambiguated title.

The "locked" game uses are never edited by script: none of M1-M6 matches the bare word.

## 5. The hand pass

Ordered by folder (`app`, `data`, `engine`, `state`, `ui`, then `vite.config.ts` and
`eslint.config.js`), each against the code, never against the old comment:

1. **Every block M1-M6 touched.** Read in context; the sentence must still read; the *why* the tag
   carried survives. The diff is reviewed block by block and the edits listed in
   `evidence/hand-rewrites.md` (old → new, with the reason kept).
2. **Residue** (the script's list), including free-standing ids and `Phase 4 Slice E2`-style
   mentions mid-sentence.
3. **History markers.** `grep` list of "no longer", "used to", "previously", "formerly", "before
   this", "was … before", "now matches/reads/uses": each judged, and `evidence/history-markers.md`
   records kept (a live invariant, "a dead actor no longer ticks") or rewritten (history).
4. **Quotations.** The `--quotations` list, before and after, each row: target read, comment
   re-pointed to the heading that states the fact (a citation must name the rule it means), quote
   dropped or replaced by the target's own words; a fact the target lacks goes under **Spec
   questions** (not into a doc).
5. **The brief's residue**, each shown fixed with a grep before/after: the dropped possessive
   (`content/overgrowth.md#the-overgrowth-biome-1-floors-110` own table, `spec/responses.md#flat-mode`
   own named example), the echoed label (`content/overgrowth.md#swarmhive-striker` Swarmhive
   Striker), the file name after an anchor (`specializations/sorcerer.md#starter-glyphmoth-seer` /
   sorcerer.md), the old rule numbers (`spec/responses.md#perform-action` B2 rule 2 in
   `engine/resolution-types.ts`), and the two `ASSUMPTION (Slice F)` blocks in
   `data/species/starters.ts` (rewritten to anchor + the sharp edge each names, not the old docs'
   text).
6. **The corpus header and its template, together.** The fixture header
   (`engine/__corpus__/corpus-digest.fixture.ts`, a comment) and the `renderFixture` template
   literal (`engine/corpus-digest.test.ts`, a string) both drop "(`CONVENTIONS.md#corpus-digest`,
   corpus digest)" to the same text, so `npm run corpus:update` rewrites the header it already has.
   Proof: a one-off run of `renderFixture`'s template against the fixture header is byte-equal, and
   `comment-proof` masks the template by a `{ file, old, new }` entry that names the literal (not a
   title), printed in its report.
7. **The two `// ASSUMPTION:` markers.** `data/spells/index.test.ts:21` → a plain why-comment on the
   duplicate-guard key, keeping the sharp edge (a future stat-modifier spell that deliberately
   reuses an `(affinity, targetShape)` pair with a different stat would collide falsely; none exists
   in v1 content); `state/store.ts:104` → "a fixed default so the store is constructible with zero
   config; the seed comes from `src/app`" citing `spec/store.md#newgame` (its "The seed is generated
   in `src/app`" line). I check both against the code before writing.
8. **Forward pointers (38 lines).** Each "inert until Phase 8", "Phase 7 replaces them" cites the
   rule that states the wait: the six sorcerer perks and the other inert ones →
   `spec/progression.md#inert-perks`; the demo harnesses →
   `ROADMAP.md#phase-7--combat-ui--feedback`; others as the code and docs say (D3 if none). The
   table (line → anchor → the heading's sentence that states the phase) goes in
   `evidence/forward-pointers.md`.
9. **The two configs.** `vite.config.ts` (the 4 provenance lines, `Phase 4.1-A (S4)`, `Review fix
   F2`, `ASSUMPTION 24`, the docs-check project note) and `eslint.config.js` (`Phase 4.1-C2a (PR
   #71 review)`): the engine-purity and node-import *whys* kept, cited to
   `CONVENTIONS.md#the-engine-is-pure-and-deterministic`.

At least one old → new rewrite per folder (`app`, `data`, `engine`, `state`, `ui`, the two configs)
is shown in the report, with the *why* quoted from both sides. `ui` has few provenance lines
(*probe*: the folder's share is small), so its sample comes from whichever block the script touches.

## 6. Golden policy (restated from the kickoff)

**Byte-identical.** Every golden's expected values and the corpus digest are unchanged; the corpus
fixture changes **only** its header comment (listed). Golden fixtures change only in comments and
are listed (`CONVENTIONS.md#comment-only-golden-edits-are-allowed`); setup, arithmetic and random
draws stay in place. No test under `src/` is added or removed; titles change, the per-file count
doesn't (shown by a `vitest run --reporter=json` count on main's `git archive` vs the branch, file
by file, as in 4.2-G's `test-counts.txt`). `npm run corpus:update` is **not** run; the corpus digest
test passes against the committed fixture. No fixture or corpus value is touched, so none is
regenerated. Fixture exports are deep-compared by importing from the extracted main and the branch
in a scratch Vitest config (4.2-G's method), listing every changed fixture.

## 7. Mechanism → the test that fails without it, at every site

All new tests are under `scripts/docs-check/`, in the `docs-check` Vitest project. Each row fails if
the named mechanism is removed; the build records the removal run in `evidence/mutation-check.txt`.

| Mechanism | Site | Test |
| --- | --- | --- |
| Comments read at **token** positions with the right `ScriptKind` | `.ts`, `.tsx`, `.js` | scanner tests, one per kind: a comment is found in each; a `//` in a string, a URL, a regex literal, a template (`${ /* c */ x }` is a comment, `// x` in the template text is not), JSX text (`<p>http://x</p>`), and the `renderFixture` shape (three `//` lines inside a template) yield **no** comment |
| Comment ranges kept only if they end before the token's start | JSX text | the `<p>// not a comment</p>` case |
| Block grouping and wrap-safe matching | `//` run, `/* */`, trailing | "Phase\n// 8" across a wrap fails with the line of `Phase`; two `//` runs separated by a blank line are two blocks; a trailing comment is its own block |
| Title extraction | `it`, `describe`, `it.each(…)(…)`, `test.each`, `describe.skipIf(…)(…)`, `.only`, template with `${}` (literal parts only), identifier title (ignored) | one planted pattern per shape, each fails with the title's line; a pattern split by `${x}` is documented as not seen (a test pins it) |
| Pragma extraction | `@ts-expect-error`, `eslint-disable`, `/// <reference`, `@vitest-environment` | scanner returns each, in order |
| Each `comments` pattern (1-13) | comment **and** title | `it.each` over pattern × {comment, title}: a planted tag of that pattern fails with file:line; the same text one character off (the "avoids" column) passes |
| "locked"/"decided" are not banned | game uses | a fixture with `isActionLocked`, `lockedTurns`, "a locked CASTER", "locked rounds 2-4", "SLOW attack (locked)", "the tier-2 bolt is still locked", "has already decided this round's status" passes; the provenance forms of patterns 11 and 12 fail |
| `ASSUMPTION:` allowed only with an `OPEN_QUESTIONS.md#` citation in its block | comment | passes with the citation (same block, across a wrap), fails without, fails in a title, fails when the citation is in the *next* block |
| No exemption for goldens / scope of the walk | `__golden__`, `__corpus__`, `src/ui`, `vite.config.ts`, `eslint.config.js`; not `scripts/` | a planted tag in each of those fails; one in `scripts/x.ts` passes |
| `comments` never calls git | CLI | added to the existing "no git on PATH, no `.git`" test (spawn with `PATH: ''`) |
| `--counts` / `--quotations` report-only | CLI | exit 0 on a tree that fails; the tables are asserted |
| Quotation scan | `//` comment, `/* */`, title, across a wrap | a quote not in the target's section is listed; a quote that is, is not; wrapped quote is whole (not cut at the wrap); markup stripped |
| `sectionOf` | `anchors.ts` | heading through its sub-headings, stops at the next same-or-higher heading, skips fenced `#`, repeats use `-1` slugs |
| `comment-proof` print equality | `.ts`, `.tsx`, `.js` | comment-only change passes in each; a changed identifier / number / string literal fails in each, naming the file |
| `comment-proof` pragmas | `@ts-expect-error`, `eslint-disable`, `/// <` | a changed pragma text fails; an unchanged one passes (the print comparison alone would pass both) |
| `comment-proof` file set | added, deleted, renamed, untracked | each fails with the file; non-code file with a byte change fails |
| `comment-proof` masks | title, template part, non-title literal | a listed change passes and is printed; an unlisted title change fails; an unconsumed entry fails; an entry consumed twice when `count` is 1 fails; a change of quote style on a masked title passes |
| `comment-proof` duplicate names | same-file | two titles differing only by an id that collapse after masking-free rename fail; a pre-existing duplicate does not |
| `comment-proof` reads `<base>` with `git` | CLI | a scratch repo (`gitIn`) with two commits; a bad rev is exit 1 |
| `citations <file>…` | CLI + module | passes on a clean scratch file under `phases/`; fails on a planted label form and on a planted unresolved anchor (both under `phases/`), with `file:line`; fails on an old form; a path outside the root, a missing file and a directory are exit 2; absolute under `--root` and repo-relative both work; **with no paths the output on the real tree equals today's** (captured string compared in a test against a tree fixture, and diffed on the branch for the report) |
| CLI wiring | `cli.ts` | bad-argument table grows: `comments extra`, `comments --counts --quotations`, `citations --counts`, `comment-proof` (no base), `comment-proof x --counts`, `budgets --mask f` → exit 2 |
| CI wiring | `deploy.yml` | `ci.test.ts`: the `test` job has `docs:check -- comments`, after `citations`, before `npm run test` |
| The `src/` rewrite | whole tree | not a unit test: `comments` PASS, `comment-proof origin/main` PASS, `citations` PASS, plus planted-fault runs (one tag of each pattern in a comment and a title; a code change; a pragma change; an unlisted title; an added file) each exiting non-zero with the file, saved in `evidence/planted-faults.txt` |

Mutation runs (each removed, tests must fail, then restored): drop the `end <= token start` filter;
drop pragma comparison; drop the file-set check; drop the mask-consumed check; make pattern 11
match a bare `locked`; drop the `OPEN_QUESTIONS` citation requirement; drop the CI step.

## 8. Order of work, evidence, gates

1. Scanner + tests → `comments` + tests + CLI/header/`deploy.yml`/`ci.test.ts` → `citations <file>…` +
   tests → `comment-proof` + tests. `npm run test` on the docs-check project after each.
2. `git archive HEAD src vite.config.ts eslint.config.js .claude | tar -x` into a scratch directory
   outside the repo; run `comments --counts` and `comments --quotations --root <it>` →
   `evidence/counts-before.txt`, `evidence/quotations-before.txt`. Run the real `citations` on the
   branch, saved for the no-paths diff.
3. Mechanical script, dry run (print only), then the real run → `evidence/mechanical-rules.txt`
   (hits per rule per folder), `evidence/retitled-tests.md` (every title, old → new),
   `evidence/title-mask.json`, the residue list.
4. Hand pass in the §5 order. `comments` stops failing; residue list empty.
5. Proof: `comment-proof origin/main --mask evidence/title-mask.json` → `evidence/comment-proof.txt`
   (each file, its masked titles and literals); planted faults → `evidence/planted-faults.txt`;
   `evidence/counts-after.txt`, `evidence/quotations-after.txt`; `evidence/test-counts.txt`
   (file by file); `evidence/fixtures-compare.txt` (changed fixtures, exports deep-equal);
   `evidence/citations-files.txt` (this kickoff passes; the planted label form and unresolved anchor
   fail, scratch file under `phases/`); `evidence/duplicate-names.txt`;
   `evidence/forward-pointers.md`, `evidence/hand-rewrites.md`, `evidence/history-markers.md`;
   `evidence/mutation-check.txt`; `evidence/gates.txt`.
6. Gates, all green: `npm run test`, `npm run lint`, `npm run format:check`, `npm run build`,
   `npx tsc -b`, `npm run docs:check -- citations`, `-- budgets`, `-- comments`. Node and tool
   versions checked against `package-lock.json` first (`--version`); `npm ci` if `node_modules`
   differs.
7. `report-r1.md` and `record.md`. Nothing committed; nothing deleted.

Note on `origin/main`: the proof's base. If the local `origin/main` is stale (4.2-G merged on
GitHub), I fetch nothing (no network step in this repo's loop); I use the local `main` or the
merge-base and say which in the report. `src/` at `69cafa6` is main's `src/` (the kickoff commit
touches docs only).

## 9. Pre-listed for the report

**Spec questions** (to be extended by the hand pass):

- `workflow/design-rules.md#writing` gains the `citations <file>…` instruction (the brief's
  "Decided, not built"): for the PR review.
- `CONVENTIONS.md#every-pull-request-runs-the-gates` lists `citations` and `budgets` as the docs
  checks; it needs `comments` (blocking) once this lands. `CLAUDE.md`'s `docs:check` mentions
  likewise.
- `CONVENTIONS.md#comment-why-not-what` could state which `comments` patterns enforce it and that
  bare plan-item ids are the hand pass's (D1).
- Quotation facts, and comment facts with no home, found by the hand pass (each with file:line).
- Forward pointers with no rule naming the phase (D3).

**Content changes:** none (no content behaviour changes; comments and titles only).

**To delete:** none expected.

## Assumptions checklist

Marked inline above as A<n>; confirm or override each at the plan review. D1-D3 (§0) are decisions.

- **A1** New modules `scanner.ts`, `comments.ts`, `comment-proof.ts` (each with a `.test.ts`) in
  `scripts/docs-check/`; `UsageError` moves out of `cli.ts` (to `usage.ts`) so `citations.ts` can
  throw it; `import ts from 'typescript'` (default import) type-checks under `module: nodenext` and
  runs under Node's type stripping. If it does not, I use `import * as ts`.
- **A2** Scope of `comments`: `src/**/*.{ts,tsx}` (tests, goldens, fixtures, `.d.ts` included, no
  exemption), `vite.config.ts`, `eslint.config.js`; not `scripts/`, not other root files.
- **A3** Matching is on a comment *block* (consecutive standalone `//` lines, or one `/* */`), bodies
  joined with a space, so a tag wrapped over a line is found; titles are matched per literal part.
- **A4** The pattern table of §3 is the whole check: `Phase <n>` fails everywhere, bare `PR` and
  bare `review`/`locked`/`decided` pass, and plan-item ids are caught only inside tags, as
  `H2c`-style suffixed ids, `H3+` and `B2 rule 2` (D1).
- **A5** `// ASSUMPTION:` additionally requires `OPEN_QUESTIONS.md#<anchor>` in the same block
  (the kickoff leans yes); `ASSUMPTION:` in a title fails.
- **A6** A title is the first argument of a `describe|it|test|suite` call through any `.each(…)`,
  `.skipIf(…)`, `.only`, `.skip`, `.todo`, `.concurrent`, `.runIf` chain; a template title is checked
  on its literal parts only (a pattern split by `${…}` is not seen); an identifier title is ignored.
- **A7** `comments` does not fail on quotations (D2); `--quotations` is a report with the 4.2-G
  normalisation (first 40 characters, markup stripped, lowercased) and a four-word window.
- **A8** The pragma list is `@ts-(expect-error|ignore|nocheck|check)`, `eslint-`, `/// <`,
  `@vitest-`, `@jsx`, `@vite-ignore`, `prettier-ignore`, `v8 ignore`, `istanbul`; compared as exact
  text, in order.
- **A9** `comment-proof` also fails a file whose head has more duplicated full test names (or more
  excess copies) than its base; this is a heuristic for "no new duplicate full names", not an exact
  per-title mapping.
- **A10** `comment-proof` compares the *working tree* to `<base>` (the usual state before Duncan
  commits), counting untracked files; the mask file is `evidence/title-mask.json`, passed with
  `--mask`; non-code files under `src/` must be byte-identical.
- **A11** `citations <file>…`: a named file is checked with the `claude` site rules whatever its
  extension; paths outside `--root`, missing, or directories are exit 2; no-paths output is unchanged.
- **A12** The mechanical script is one-off and uncommitted (scratchpad); its rules are §4's table and
  its printed tables are the evidence. Leading-label removal capitalises the first letter of what
  follows when it began a sentence.
- **A13** A history word ("no longer", "previously", …) is rewritten only when it narrates change,
  and kept when it states a live invariant; each decision is listed.
- **A14** Non-title string literals that carry provenance (error messages, `toThrow` text) stay: only
  the corpus template changes (the kickoff). The report counts any that remain.
- **A15** `origin/main` as the proof's base is the local ref (no fetch); a stale one is replaced by
  `main`/merge-base and named in the report.
- **A16** The test count under `src/` is verified by a Vitest JSON-reporter run per tree (4.2-G's
  `test-counts.txt` method); the `docs-check` project's count rises by the new tests only, reconciled
  file by file.
