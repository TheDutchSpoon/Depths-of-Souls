# Plan — Phase 4.2 — Slice G: Citations, budgets, CI, clean-up

Slice 4.2-G, branch `4.2-g`, base `16c38b6`. Read: `coding-rules.md`, `kickoff.md`, `G/brief.md`,
phase `brief.md` (rule 4, "The file map", "Checks", "Condensing rules", "Inventory format",
"Phase-4.2-only text"), the B–F inventories, `B/verify-r1.md`, `CONVENTIONS.md` ("Comment why, not
what", "Comment-only golden edits are allowed", "Every pull request runs the gates", "Local runs
match CI's toolchain"), `scripts/docs-check.ts` (whole), `deploy.yml`, `tsconfig.node.json`,
`vite.config.ts`, `workflow/budgets.md`, and the spec rule behind each stale-comment fix (read
again at build, against the code). No spec file beyond the kickoff's list is reached. The kickoff
and `coding-rules.md` do not disagree.

Everything below was measured on the branch tree today (scan scripts in my scratchpad, not in the
repo). Toolchain: Node 24.19.0, TypeScript 6.0.3 (lockfile `~6.0.2`).

## 0. Decisions I need at the plan review

**D1. A citation inside a string that is not a test title (the kickoff's "stop and list").**
Exactly one: `src/engine/corpus-digest.test.ts:52-54`, the template literal `renderFixture` writes
as the header of the generated `src/engine/__corpus__/corpus-digest.fixture.ts`
(`// fight (CONVENTIONS "Testing", corpus digest).`). The test compares the hashes only, never the
header, so editing it changes no behaviour.
- **Recommended: rewrite it** (`CONVENTIONS.md#testing`) and mask that one template in the proof.
  Both files then agree, and the fixture's header comment is rewritten with the others.
- Otherwise: leave the template, and rewrite only the fixture's header. The next `corpus:update`
  puts the old form back and `citations` then fails, which is loud but late.

**D2. Intra-file label references.** 55 quoted heading names in `spec/`, `CONVENTIONS.md`,
`content/` and `workflow/` that name no file (`("Damage formula")` inside `spec/combat.md`;
`see "Phase record"` in `coding-rules.md`; `under "Goldens are layered and additive"`). The kickoff's
shapes (c) need a doc name, so the check cannot see them, and a script cannot tell a reference from
a quoted phrase without reading each one.
- **Recommended: leave them.** List them for the design agent (they are its text), who can adopt a
  `see <path>#anchor` convention or keep them. Every cross-file label is converted.
- Otherwise: I convert the ones whose quoted text equals exactly one heading of the same file
  (about 50), printed for review in `evidence/`.

Everything else I decided is marked **ASSUMPTION** inline and collected at the end (A1–A21).

## 1. What I found (counts, today)

### `src/` (old forms)

243 tokens on 241 lines, in 86 files; all found with the TypeScript AST (leading and trailing
trivia of every token, including punctuation), then reconciled against a raw `grep` of the three
names (243 = 243, per line).

| Where | CONVENTIONS | GAME_DESIGN | species-locked | Total |
| --- | --- | --- | --- | --- |
| Comments | 118 | 47 | 67 | 232 |
| `describe`/`it`/`test` titles | 2 | 5 | 3 | 10 |
| Another string (D1) | 1 | 0 | 0 | 1 |
| **Total** | **121** | **52** | **70** | **243** |

By shape: `CONVENTIONS "Label"` 60 (the kickoff's 53 `CONVENTIONS "` lines plus possessive and
wrapped forms), `GAME_DESIGN §N` 42 (sections 4, 5, 6, 7, 8, 9, 13 and `§4/§10`), `GAME_DESIGN`
with a quote 2 and bare 8 (`GAME_DESIGN's ranges` ×4 in titles), `CONVENTIONS` bare 61
(`(CONVENTIONS)`, `CONVENTIONS'`, `CONVENTIONS calls this out`), `species-locked.md` 70 (6 followed
by a quote, 64 bare; in 29 files, 12 of them golden fixtures; 3 in titles). Some labels wrap over
two comment lines; the extractor joins comment lines before matching and rewrites the whole span.
Some labels spell `—` as `--` ("Data layer -- carriers vs. composition"); matching normalises it.

By destination: `data/` 98, `engine/` 115, `state/` 29, `app/` 1. Files in `__golden__/`: 27 (12
cite `species-locked`), plus `__corpus__/corpus-digest.fixture.ts`, `__corpus__/corpus.ts` and
`__fixtures__/biomes.ts`.

### `.claude/` outside `phases/` and `archive/` (label forms)

219 label-form cross-links carrying 235 labels (16 are chained after the first). **All 235 resolve
today** to exactly one heading in the file they name: 232 by exact heading text (case-insensitive,
markup stripped), 3 by a unique prefix.

| Form | Count | Example |
| --- | --- | --- |
| `` `<dir>/<file>.md` "Label" `` | 197 | `` `spec/combat.md` "Damage formula" `` |
| `` `<TOP>.md` "Label" `` (top-level file, backticked) | 15 | `` `CONVENTIONS.md` "No magic numbers" `` |
| bare `<NAME> "Label"` | 6 | `WORKFLOWS "What a mailbox keeps"` (`coding-rules.md:15`, `design-rules.md:31`), `WORKFLOWS "Golden policy"` (`coding-rules.md:42`), `WORKFLOWS "The human's judgment call"` (`plan-review.md:18`), `CONVENTIONS "Local runs match CI's toolchain"` (`coding-rules.md:34`), `CONVENTIONS "A mechanism at more than one site is tested at each site"` (`WORKFLOWS.md:126`) |
| `` `path.md` ("A", "B", "C", "D") `` (paren list) | 1 | `skills/slice-verify/SKILL.md:11` |
| Chained labels after the first (`"A", "B" and "C"`) | 16 labels in 9 forms | `ROADMAP.md:102`, `spec/effects.md:115,117`, `spec/run.md`, `specializations/{brute,shieldbarer,sorcerer}.md:7`, `SKILL.md:11` |
| Targets in the phase brief | 3 | `workflow/condense.md:5` spells `.claude/phases/4.2/brief.md`; `WORKFLOWS.md:113` spells `phases/4.2/brief.md`; `SKILL.md:11` |

By citing file: `spec/combat.md` 32, `spec/effects.md` 26, `spec/creatures.md` 20, `ROADMAP.md` 16,
`spec/statuses.md` 16, `spec/run.md` 14, `spec/responses.md` 13, `spec/scripting.md` 12,
`OPEN_QUESTIONS.md` 11, `CLAUDE.md` 8, `content/*` 19, `workflow/*` 6, `spec/progression.md`,
`spec/saves.md`, `spec/store.md`, `CONVENTIONS.md` 4 each, `VISION.md` 3, `WORKFLOWS.md` 3,
`specializations/*` 3, `skills/slice-verify/SKILL.md` 1.

The three labels that are only a prefix of one heading (accepted only when the label is a prefix of
exactly one heading; **ASSUMPTION A15**, approve here):
`WORKFLOWS "Golden policy"` → `WORKFLOWS.md#golden-policy-one-per-pr`;
`WORKFLOWS "The human's judgment call"` →
`WORKFLOWS.md#the-humans-judgment-call-these-dont-remove`;
`phases/4.2/brief.md "Condensing rules"` (in `SKILL.md:11`) → `phases/4.2/brief.md#condensing-rules-42-b-to-f`.

Old forms (`CONVENTIONS "…"`, `GAME_DESIGN §`) outside `phases/`/`archive/`: 2 (the two bare
`CONVENTIONS "…"` rows above). Deleted-doc names in `.claude/` outside `phases/`: `ROADMAP.md:57`
("most of it CONVENTIONS and GAME_DESIGN", prose) and `skills/slice-verify/SKILL.md:20`
(`` `git show 892f1b8:.claude/CONVENTIONS.md` / `GAME_DESIGN.md` ``, a command). Neither is a
citation. **No prose example of a forbidden form** exists in `workflow/` or `skills/`; if one turns
up at build I list it and do not special-case it.

Headings (the three gaps of `resolveAnchors`): 563 headings in the 35 living docs. **None** is
indented, has `_emphasis_` or an HTML entity, a closing `#`, a Setext underline, or a `~~~` fence,
and **no two share a slug**. `phases/` (810 headings) and `archive/` (308) have none of the gaps
either, but `phases/` has 37 duplicate slugs and targets there are allowed, so the collision fix
(trap 1) matters for them. Gaps (2) and (3) stay unfixed and stay listed in the doc comment.

## 2. Approach

1. **Split the script** so it can be tested. `scripts/docs-check.ts` runs `main()` on import, so
   nothing in it can be imported by a test. It becomes a thin entry (header comment, dispatch,
   exit code), and the logic moves to `scripts/docs-check/*.ts`, every function taking the root
   directory as an argument. **ASSUMPTION A1.** The entry stays `node scripts/docs-check.ts`; the
   npm script `docs:check` does not change. Erasable syntax only, `.ts` import specifiers, no new
   dependency (`typescript` stays out of the permanent script: the check reads text with regexes).
2. **Write the two new modes and generalize the inventory modes**, with tests, before any rewrite.
3. **Rewrite the citations by a one-off script** that lives in my scratchpad, not the repo (coding
   rules: keep the printed table and quote the rule, not the script; **ASSUMPTION A16**). It uses the
   TypeScript AST to find comment ranges, edits only matched spans in comments and the 10 titles
   (plus D1), and edits the living docs by their text. It refuses to write unless **every** match
   has an answer from the inventory rule or the hand-map (Appendix) and every answer resolves
   today.
4. **Fix the stale comments by hand** (section 7), then prove the diff is comments and titles only.
5. **Remove `move` and `line-proof`** with everything only they used. Add the `deploy.yml` steps.
6. Gates, evidence, report, record.

Order inside the build is in section 10.

## 3. Module changes, by file

| File | Change |
| --- | --- |
| `scripts/docs-check.ts` | Thin entry. New header comment naming what stays: the git helper, `resolveAnchors`, the unit/inventory modes, the dispatch; and the two new modes. |
| `scripts/docs-check/text.ts` (new) | `splitLines`, `splitCells`, `readWorkingLines`, `FENCE`, `lineOf`. |
| `scripts/docs-check/git.ts` (new) | `git(root, args)` and `showAt(root, sha, path)` only. Used by the inventory modes **only**. |
| `scripts/docs-check/anchors.ts` (new) | `resolveAnchors` with GitHub's dedupe loop (trap 1), `anchorsOfFile`. |
| `scripts/docs-check/citations.ts` (new) | `collectFiles(root)`, `findProblems(root)`, `runCitations(root)`. No git. |
| `scripts/docs-check/budgets.ts` (new) | `parseBudgets(text)`, `runBudgets(root)`. No git. |
| `scripts/docs-check/inventory.ts` (new) | `unitsOf`, `makeLabel`, `normalise`, `inventoryLabelOk`, `FATES`, `INVENTORY_HEADER`, `runInventorySkeleton(root, mailbox, files, base)`, `runInventory(root, mailbox)`. |
| `scripts/docs-check/cli.ts` (new) | `main(argv, io)`: mode dispatch, usage, a `--root <dir>` option on every mode (default: the repo root) so tests and the planted-fault runs can point a mode at a scratch tree (**ASSUMPTION A3**). Exit 0 pass, 1 problems found, 2 bad usage (**ASSUMPTION A21**). |
| `scripts/docs-check/*.test.ts` (new, 6 files) | Section 9. |
| `vite.config.ts` | A third Vitest project `docs-check`: `environment: 'node'`, `include: ['scripts/**/*.test.ts']`. The `engine-data-state` and `ui-app` projects are untouched, so their counts are too. **ASSUMPTION A2.** |
| `.github/workflows/deploy.yml` | Two steps in the `test` job after `format:check` and before `npm run test`, so a citation failure shows before the long step (**ASSUMPTION A13**): `npm run docs:check -- citations`, `npm run docs:check -- budgets`. |
| `src/**` (86 files for citations, plus 1 stale-only: 87) | Comment and title edits only (sections 4 and 7). |
| `.claude/**` living docs | Citation edits only, by script (section 4). Nothing else, `workflow/budgets.md`, the briefs, step files and skills included. |
| `package.json`, lockfile | Unchanged. |

**What stays of the 1205-line script and what goes** (`noUnusedLocals` is on for `scripts/`):
- Stays, moved: `git` (now parameterised by root), `splitLines`, `readWorkingLines`, `splitCells`,
  `FENCE`, `resolveAnchors` (fixed), `unitsOf`, `makeLabel`, `normalise`, `inventoryLabelOk`,
  `FATES`, `INVENTORY_HEADER`, the row check.
- Goes: `PINNED_COMMIT`, `SrcKey`, `PINNED`, `pinnedCache`, `readPinned`, `HalfName`, `HALF_ORDER`,
  `MapRow`, `D`/`E`/`F`, `row`, `MAP`, `rowLabelOk`, `READ_WHEN`, `SPEC_NAMES`, `capitalise`,
  `sha256`, `runMove`, `BriefRow`, `tableAfter`, `parseBriefMap`, `parseBriefSizes`,
  `parseBriefReadWhen`, `Expected`, `countLines`, `runLineProof`, `SliceDef`, `SLICES`,
  `pinnedUnits`, `assertUnitPartition`, `inventoryBase`, `otherFiles`, `SliceUnits`, `sliceUnits`,
  `sliceArg`, and the `createHash`, `readdirSync` imports. `tsc -b` is the check that none is left.

## 4. Citations: the check, the rewrite, and the mapping

### The `citations` mode (blocking in CI, working tree only, no git)

Scans every `*.ts`/`*.tsx` under `src/` and every `*.md` under `.claude/` except `phases/` and
`archive/` (**ASSUMPTION A5**; `scripts/`, `eslint.config.js` and the other root files are not
scanned; `eslint.config.js:28` has a bare "(CONVENTIONS)" that I list under Spec questions rather
than touch). It reads the whole text of each file, fenced code included, and fails on:

- **(a) an anchor that does not resolve**: `<path>.md#<anchor>` where the path is
  `.claude/`-rooted plain text (`spec/combat.md`, `phases/4.2/brief.md`; a leading `.claude/` is
  tolerated), the file does not exist under `.claude/`, or `<anchor>` is not one of the file's
  heading anchors. The slugger is the fixed one, so "exactly one heading" holds by construction:
  every anchor GitHub generates is unique, and `a`, `a`, `a-1` give `a`, `a-1`, `a-1-1`. Targets in
  `phases/` and `archive/` are allowed. A path with a `..` segment fails ("citation paths are
  `.claude/`-rooted", **ASSUMPTION A4**). URLs and `<placeholder>` forms (`spec/<file>.md#<anchor>`
  in `CONVENTIONS.md:423`) do not match the regex; the one real example (`CLAUDE.md:70`) resolves.
- **(b) an old form**: `CONVENTIONS "…"` (also `CONVENTIONS.md`, `CONVENTIONS'`, `CONVENTIONS:`,
  `CONVENTIONS,` before the quote) and `GAME_DESIGN §…` (also `GAME_DESIGN.md §`), anywhere in
  `src/` or `.claude/`. In `src/` **only**, also any `GAME_DESIGN` or `species-locked` token, since
  no comment has a reason to name a deleted doc and 4.2-H's stricter check will want it zero. In
  `.claude/` a bare mention of a deleted doc is allowed (`ROADMAP.md:57`, `SKILL.md:20`).
  **ASSUMPTION A6**, the kickoff's open question.
- **(c) a label form**: `` `<path>.md` "…" `` or a bare top-level name (`CLAUDE`, `VISION`,
  `OPEN_QUESTIONS`, `ROADMAP`, `WORKFLOWS`, `CONVENTIONS`, with or without `.md`) followed by an
  optional `,` or `:`, whitespace (a line break and indentation count) and a double quote.
  **ASSUMPTION A7**: the paren list `` `path.md` ("A", "B") `` is converted by the script but not
  detected by the check, and an unbackticked `content/overgrowth.md: "quote"` in `src/` (two in
  `integration.test.ts`) is a quotation, not a label, so it passes.

Output: one line per problem, `<path>:<line>: <what>`, sorted, then
`citations: FAIL, N problems` (exit 1) or `citations: PASS, N citations in M files` (exit 0).

### `resolveAnchors` (trap 1)

GitHub's loop: take the slug; while it is already used, bump a per-original-slug counter and try
`slug-<counter>`; record the result. Replaces the current `seen`/`n` pair that lets `a-1` (a real
heading) collide with `a`'s second copy. Used at two sites: the citation check and the inventory's
New-home check. Gaps (2) indented headings and (3) `_emphasis_`/HTML entities stay unfixed and stay listed in the
doc comment, because none of the 1,681 headings in `.claude/` has either (**ASSUMPTION A8**).

### The rewrite: rules

For a match in a comment (or a title, or D1's string), the **span** is the old-name token, an
optional `.md`, an optional possessive of the name (`CONVENTIONS'` before a label), an optional
`:`/`,` and, if present, the following `"Label"` or `§N`. The span is replaced by the anchor in
backticks (`` `spec/run.md#biomes` ``), without backticks in a title; a span already wrapped in
backticks (`.claude/species/species-locked.md`) is replaced together with them.
Everything outside the span is untouched, provenance and `ASSUMPTION` tags included (4.2-H's job),
so `GAME_DESIGN §4's decade cadence` keeps its `'s decade cadence`. **ASSUMPTION A9**: this
format (backticks in comments, none in titles; text after the span kept as it is).
Wrapped labels: the replaced span runs over the line break and drops the `//` or ` * ` leader, so a
two-line label becomes one line (no reflow of the rest).

Mapping, in this order, first hit wins:
1. **Hand-map** (Appendix B1–B4): 208 of 243. Authority over the rest.
2. **Inventory row** (Appendix A): the label (normalised: lowercased, markup stripped, `--` as `—`,
   cut at `...`) must be contained in exactly one unit's first line at `892f1b8`; that unit's row in
   B–F must be non-`dropped` with exactly one New home anchor; the anchor must resolve in today's
   tree. 35 of 243, used as-is; the 3 where the row's anchor is overridden by the hand-map are in B2.
3. Anything else stops the script with the list.

Results: **inventory rows answer 35 of 243 (14%) as they stand**; 3 more have an inventory answer
that I override (B2); the other 205 have none and are hand-mapped, because of the shapes in the
Appendix: `GAME_DESIGN §N` names a section whose heading row is `dropped` (§6, §7, §8) or lands on
the file title (§5 → `spec/creatures.md#spec--creatures`, so all 42 are mapped to the rule the
comment names); 61 + 8 bare names carry no label; the 70 `species-locked.md` citations name a
deleted file whose rows are `dropped` or spread over many entries. Of the 28 labelled citations in
B2: 11 never matched an old unit (the brief's seven are among them), 4 match several units, 9 hit a
spread row (`Role scripts`, `Data layer — carriers vs. composition`, `The bright line`, `Stat
growth is linear…`), 3 are the overrides. A few more labels wrapped over a comment line in a way
my first-pass matcher missed (they show as bare in B3 and are marked "wrapped label"); the real
extractor reads them as labels, and the dry run reports any row that comes out differently.

**B's three stale New-home anchors** (`specializations/shieldbarer.md:59` →
`spec/progression.md#9-player-specializations`; `species/species-locked.md:186` →
`spec/run.md#4-the-cave-world--structure`; `species/species-locked.md:143` →
`OPEN_QUESTIONS.md#13-open-questions--parked-items`): **none of the 243 citations maps through
them** (every citation that reaches those units is hand-mapped), and the script's
resolve-every-anchor step would refuse them. For the record, the current homes are
`spec/progression.md#specializations`, `spec/run.md#the-cave` and `OPEN_QUESTIONS.md#sacrifice-revive`.

`GAME_DESIGN §13` (now `OPEN_QUESTIONS.md` "Balance numbers") is mapped to the narrowest heading
that matches the comment: `#balance-numbers` (5), `#content-numbers` (4, "every percent/factor
number"), `#drops-and-costs` (1). Every §4 is mapped to `#biomes` (the decade cadence),
`#spells-unlock-cumulatively` (the 4–5 spells bar) or `#currencies`; none to `#the-cave`.

**The 23 rows marked `~` in the Appendix** have no heading that states the cited fact exactly
(the rule was split, or was history that the condense dropped); I used the closest home and say so
in the note column. Examples: `golden-shieldbarer-starter:9` ("precedent for goldens whose target
never dies") → `CONVENTIONS.md#golden-replay-tests`; `starters.test.ts:52` ("ideally distinct")
→ `spec/progression.md#specializations`. Each is a place the design agent may want a rule; they
also go under **Spec questions** (**ASSUMPTION A12**: the hand-map is the authority for every row
it lists, `~` rows included; the reviewer may override any row).

### The living docs

Same rules: the label is matched to a heading **by its text** (case-insensitive, markup stripped)
in the named file, which must give exactly one heading; the replacement is `` `path#anchor` `` with
the rest untouched. A paren or chained list becomes `` `path#a`, `path#b` and `path#c` ``. A
`.claude/` prefix on a path is dropped. 219 + 16 labels: the dry run resolves all of them
(count above). A label with no or several matching headings stops the script.

## 5. The `budgets` mode

Reads `workflow/budgets.md` (the table `| \`file\` | KB |`) and the working tree; no git.
Size = the file's UTF-8 bytes with `\r` removed (the repo is `eol=lf`, but a Windows checkout with
`autocrlf` would otherwise differ from CI), 1 KB = 1000 bytes. Prints
`file  size  budget  used%  ok|OVER` for all 12 rows and `budgets: 12 files, N over budget`. A
spec file with no row prints `no budget`. **Never fails** (**ASSUMPTION A10**): over budget, a
listed file that is missing (prints `MISSING`) and an unreadable or empty table (prints the
problem, "0 files budgeted") all exit 0, because the phase brief says only the design agent can fix
a budget, so a blocking check would fail an unrelated PR. Exit 2 only for bad arguments. Today all
12 are under budget (sizes 2.8–35.5 KB against 4–43); the rewrite shortens most lines
(`"Label"` → `#slug`), so none moves.

## 6. Inventory modes, generalized

Interface (**ASSUMPTION A11**; the kickoff leaves it to me):

```
npm run docs:check -- inventory-skeleton <mailbox> <file>... [--base <rev>]
npm run docs:check -- inventory <mailbox>
```

- `<mailbox>` is a directory path relative to the root (`.claude/phases/4.5/A`); `<file>` is a
  living-doc path relative to `.claude/` (`spec/store.md`). One or more files.
- The skeleton resolves `--base` (default `HEAD`: the committed file, i.e. before an uncommitted
  condense) to a full 40-hex sha with `git rev-parse --verify <rev>^{commit}`, reads every file at
  that sha with `git show <sha>:.claude/<file>`, and writes `<mailbox>/inventory.md`:
  ```
  # Inventory — spec/store.md, spec/saves.md

  Base: `<sha>`
  Files: `spec/store.md`, `spec/saves.md`

  | Unit | Old label | Decided in | Fate | New home | Reason |
  ```
  with one empty row per unit, ids `<file>:<line>`. It still refuses to overwrite.
- The check reads `Base:` and `Files:` from the file, reads the units of those files at that sha, and
  checks the rows against them. Because the sha is in the file, a check run after Duncan commits the
  condense still sees the pre-condense text. New homes are resolved in the **working tree** (the
  condensed docs), with the fixed slugger.
- Unchanged: the unit definition (phase brief "Inventory", A9), the five fates, the row checks (one
  row per unit, label contained in the unit's first line, New home `file#anchor` entries for every
  fate but `dropped`, Reason for every fate but `kept`, no row for a unit outside the files).
- Gone: the pinned commit, the map, the `C:`/`G:` ids, the slice table, the 523/261/262 partition
  asserts, `git merge-base`. Nothing in the permanent script names `main`.
- `citations` and `budgets` never import `git.ts`.

## 7. Stale `src/` comments (rewritten to "Comment why, not what")

Each is rewritten to say why (not history), cite by anchor instead of restating a rule, and drop
the wrong claim. **ASSUMPTION A19**: I fix the wrong claim and the provenance in the same
sentences, and leave the rest of the comment as it is (4.2-H sweeps it). I check **the code**, not the old comment, and stop and report if the fact differs
from the brief's. The table is the fact I will verify and what the new comment says; the report
carries file:line, old → new and the code location.

| Location | Wrong claim | Code fact to check | New comment says |
| --- | --- | --- | --- |
| `data/statuses.ts:17-18` | Poison "20% … (decided at the 4.1-H2d grill; 20% before)" | `POISON` potency in `statuses.ts` (40) | Poison ticks for a share of the applier's Attack; the number lives in the status def and `content/`; no grill history |
| `engine/balance-types.ts:37` | boss level offset "Default 3" | `data/balance.ts:18` (5) | what the offset is; defaults live in `data/balance.ts` |
| `data/statuses.ts:125-133` | Blindclaws' act-first status "will be" the Web primitive | `GRANT_ACT_FIRST` in `statuses.ts` | the two statuses are the two poles of one `turn-order` primitive |
| `data/spells/glimmerdark.ts:3-24` | narrates nine deleted spells | the file's own exports | why the biome authors only its own spells (cumulative unlock), cite `spec/run.md#spells-unlock-cumulatively` |
| `data/traits/glimmerdark.ts:349-353` | narrates a superseded `species-locked` framing | the three Gloomjaw traits | the three verbs, cite `content/glimmerdark.md#gloomjaws-violence-execute-the-weak` |
| `data/species/overgrowth.ts` (above `BROODMOTHER`, ~366-376) | "left the runner unbuilt" | `BiomeData.boss`, the Overgrowth biome entry (`OVERGROWTH_BOSS`) | the boss floor is built, wired through `BiomeData.boss`; cite `spec/run.md#boss-floor-generation` |
| `engine/effect-types.ts:670-673` | a trigger condition "cannot reference the triggering source" | `HpSubject 'target'` resolved by `fireHook` | it can, via the `'target'` subject |
| `engine/effects.ts:434` | Splashing follows "Attack/Cast main hits" | `hasSplashing` use in `actions.ts` | attacks only |
| `engine/effects.ts:501-503` | every creature lacks a `speciesId` | `generateFloor`, `materializeCreature` set it | only a creature without one reads 0 |
| `engine/types.ts:130-135` | `living-allies-of-species` inert until `speciesId` is threaded | `materializeCreature` | it is threaded; unset only for a hand-built creature |
| `engine/effect-types.ts:121-127` | `all-allies-of-species` "dormant until wired" | `resolveResponseTargets` | empty only for a creature with no `speciesId` |
| `engine/effect-types.ts:277` | `remove-status` is "the final response verb (per … hold the line)" | `spec/responses.md#no-side-doors` | the rule is "no side doors", not a verb ceiling |
| `engine/scripting-types.ts:9-22` | the `'target'` subject comment appears twice | the file | once |
| `engine/scripting-types.ts:78-89` | `acted-before-target` in a trigger "always evaluates false"; only `random-enemy` can't peek | `conditions.ts`, `target-selectors.ts` `peekTargetSelector` | falls back to the creature being resolved against; all three random selectors peek to no target |
| `engine/target-selectors.ts:53-55` | `random-enemy` is "the one blessed RNG draw site" | `random-ally` also draws | both draw; name where the winning rule is the only caller |
| `data/scripts.ts:132` | Stonehorn Warden is a `taunter` | the Warden's `defaultScriptId` (`warden`) | the `warden` role |
| `engine/scripting-types.ts:144-149` | `targetSelectorHasCandidate` still handles `'random'` | `target-selectors.ts:36`, `:132` throw | it throws; `actions.ts` resolves it |
| `engine/types.ts:323-325` | a status tick skips Defence | `resolution.ts` `calculateIndirectDamage` | only a cost skips Defence; a tick meets a fifth of it |
| `engine/effect-types.ts:760` | Splashing's lookup is `targeting.ts`'s `adjacentLivingTargets` | `actions.ts:458` private copy | Splashing uses `actions.ts`'s private copy (**comment only**; the dedupe is ROADMAP 4.5; `targeting.test.ts` untouched; **ASSUMPTION A14**: the wording names `actions.ts`'s private `adjacentLivingTargets` and says `targeting.ts`'s copy is not on Splashing's path) |
| `engine/config.ts:1-2` | `ROUND_CAP` "exact number TBD" | the constant, `OPEN_QUESTIONS.md#fight-length` | what the cap is for; cite the open question if the number is still parked |
| `data/balance.ts:1-4` | the balancing pass "tunes the rest", numbers parked "until then" | the pass ran | numbers are tuned; cite `OPEN_QUESTIONS.md#balance-numbers` |
| `data/scripts.ts:7-8` | "Every role ends in the same fallback" | `caster` casts first and ends in Attack | cite `spec/scripting.md#role-scripts` |

The `GAME_DESIGN §7` / `CONVENTIONS "…"` lines the brief lists for `engine/types.ts:44-47`,
`actions.ts:334,390,668,346,373-376,397`, `combat.ts:160,366,385,410,500` and `types.ts:33` are
citation rewrites (Appendix), not stale comments.

## 8. Golden policy (restated from the kickoff)

**Byte-identical.** Every golden's expected values and the corpus digest are unchanged;
`npm run corpus:update` is not run. Golden fixtures change only in comments
(`CONVENTIONS.md#comment-only-golden-edits-are-allowed`): 27 `__golden__` fixtures, plus
`__corpus__/corpus-digest.fixture.ts` (its header comment) and `__fixtures__/biomes.ts`. No test is
added or removed under `src/`; 10 titles change (list below). Every golden still replays through
the shared runner. New tests exist only under `scripts/`.

The 10 retitled tests (old → new, titles only):

| File:line | New title (the rest of each title is unchanged) |
| --- | --- |
| `data/biomes.test.ts:27` | `ships exactly 10 slots (spec/run.md#biomes decade cadence)` |
| `data/species/{glimmerdark,overgrowth,rotcap-hollow,starters}.test.ts:57,52,58,39` | `base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat` |
| `data/species/overgrowth.test.ts:125` | `… (content/overgrowth.md#broodmother: "adds: spiderlings")` |
| `data/species/starters.test.ts:52` | `… (spec/progression.md#specializations: "ideally distinct")` |
| `data/species/starters.test.ts:183` | `… (specializations/brute.md#starter-cragfang-mauler: "twice at 100%")` |
| `engine/actor-death.test.ts:123` | `an action ends when its actor dies (spec/combat.md#an-action-ends-when-its-actor-dies, 4.1-C2c)` |
| `engine/damage-observation.test.ts:458` | `hook order in the damage path (4.1-H2b1; spec/effects.md#hook-execution)` |

How I show it:
- **Comment-and-title-only diff.** A one-off proof script (scratchpad) takes every changed `src/`
  file at `main` and at the branch, masks the first argument of every `describe`/`it`/`test` call
  (including `.skip`, `.only`, `.each`) and, if D1 is approved, the corpus template literal, then
  prints each file with the TypeScript printer, `removeComments: true`, and compares bytes. It
  also fails if a changed comment is a pragma (`@ts-`, `eslint-`, `/// <`). Output in
  `evidence/comment-proof.txt`, and I run it once on a planted code-token change to show it fails
  (**ASSUMPTION A17**).
- **Expected values compared by importing.** For the 28 changed fixtures, a scratch Vitest run
  imports each fixture from `git archive main` and from the branch and deep-compares the exports
  (**ASSUMPTION A18**). Fallback if the scratch config fights the repo's: the printer proof above
  (identical ASTs imply identical values) plus the unchanged corpus digest.
- **Test count.** `vitest run --reporter=json` on `main` and the branch, compared file by file
  under `src/`; the new `scripts/` files are listed separately.

## 9. Mechanism → the test that fails without it, at every site

All new tests are in `scripts/docs-check/` and run in the new `docs-check` Vitest project. A "site"
is a place the mechanism lives; `describe.each` runs the citations tests at both the `src/` site
and the `.claude/` site, since they are separate scan paths. Count: about 55 tests (final number
reconciled in the report).

| Mechanism | Sites | Test that fails with it removed |
| --- | --- | --- |
| GitHub's slug dedupe (trap 1) | `anchors.ts`; citation resolution; inventory New home | `anchors.test`: `a, a, a-1` gives `a, a-1, a-1-1`; `a-1, a, a` gives `a-1, a, a-2`. `citations.test`: a citation to `a-1-1` resolves (headings `a, a, a-1`), at src and `.claude`. `inventory.test`: New home `x.md#a-1-1` passes. |
| (a) unresolved anchor | src scan; `.claude` scan | `citations.test`: heading missing; file missing; wrong case; `..` segment; each exits 1 with `path:line`. A resolving anchor passes. URL and `<placeholder>` forms are not citations. |
| (b) old forms | src scan; `.claude` scan | `CONVENTIONS "X"`, `CONVENTIONS' "X"`, `CONVENTIONS.md "X"`, `GAME_DESIGN §4`, `GAME_DESIGN.md §13`: each fails at both sites. src-only: bare `GAME_DESIGN's`, `species-locked.md` fail in `src/` and pass in `.claude/ROADMAP.md`. |
| (c) label forms | src scan; `.claude` scan | `` `spec/x.md` "L" ``, wrapped over a line break, `` `x.md`, "L" ``, `` `CONVENTIONS.md` "L" ``, bare `WORKFLOWS "L"`: each fails at both sites. Passes: prose mention without a quote, `content/x.md: "quote"` unbackticked, `("Label")` intra-file. |
| Scope: `phases/`, `archive/` skipped; targets there allowed; only `.ts/.tsx` and `.md` read | scan | `citations.test`: an old form in `phases/` passes; a citation into `phases/a/brief.md#process-for-42` (duplicate slugs there) resolves. |
| No git in `citations` and `budgets` | both modes | `cli.test`: spawn the real entry with `PATH=''` in a directory with no `.git`; both exit as expected (a `git` call would fail). |
| `budgets` report | `budgets.ts` | `budgets.test`: sizes/budgets/ok printed; planted over-budget file prints `OVER` and exits 0; CRLF file sized without `\r`; missing file → `MISSING`, exit 0; no table → message, exit 0; unbudgeted spec file → `no budget`. |
| Inventory: base sha in the file | skeleton; check | `inventory.test`: skeleton writes a 40-hex `Base:`; **after committing the condense** the check still passes; edit `Base:` to the post-condense sha and the check fails (labels and units no longer match). |
| Inventory: default base `HEAD`, `--base`, no `main` | skeleton | repo with only a branch `trunk`: skeleton and check work; `--base <older>` reads older text; unknown rev errors. |
| Inventory: units across several files, mailbox argument | skeleton; check | two files give `<file>:<line>` ids; a mailbox outside `phases/4.2`; a row for a unit in a file not listed fails. |
| Unit definition and row checks unchanged | `unitsOf`, `runInventory` | ported cases: heading, `- ` item, paragraph start after a blank line, numbered item after a blank, nested bullet/table/quote/`---`/fenced code not units; missing row, duplicate row, unknown fate, New home missing/not `file#anchor`/no such file/no such heading, Reason missing, label not in the unit, wrong cell count. |
| `move`, `line-proof` removed | dispatch | `cli.test`: both print usage and exit 2; the usage text has no "Phase 4.2". |
| `--root` | all modes | `cli.test`: the same tree checked from another cwd. |
| CI runs both modes | `deploy.yml` | `ci.test`: the `test` job contains both commands (**ASSUMPTION A20**; reads the repo's real file). |
| Comment-only rewrite of `src/` | the proof | planted fault: change one code token in a scratch copy; the proof prints the file and fails. |
| Citation rewrite of the docs | the dry run | the script refuses to write on a label with no or several headings (shown on a planted bad label). |

## 10. Order of work, evidence, gates

1. `npm ci`; baseline: `vitest run --reporter=json` on the branch; save the per-file counts.
2. Re-run `docs:check -- inventory C`, `D`, `E` (old interface, all pass today at base `3fd6a8f`);
   output to `evidence/inventory-CDE-before.txt`. B and F cannot be re-run (their base files are gone).
3. Write `anchors`, `text`, `git`, `citations`, `budgets`, `inventory`, `cli` and their tests; delete
   the 4.2 code; `tsc -b` clean.
4. Dry-run the rewrite; compare its mapping with the Appendix; every difference goes in the report.
5. Rewrite `src/` and the docs by script; hand-fix the stale comments and the Splashing comment.
6. `citations` passes; planted-fault runs on scratch copies of the tree (slug collision `a, a, a-1`,
   unresolved anchor, each old form, each label form), each exiting non-zero with `file:line`;
   `budgets` on the tree and with a planted over-budget file (exit 0); `deploy.yml` diff.
7. The proof, the fixture comparison, the test-count reconciliation, the before/after counts of old
   forms and label forms in `src/` and `.claude/` (outside `phases/`/`archive/`; after = 0), the
   `grep -rn "Phase 4.2 only" .claude src scripts --exclude-dir=phases` (finds nothing in `src/` or
   `scripts/`, and in `.claude/` only `workflow/coding-rules.md`, `WORKFLOWS.md`,
   `workflow/condense.md`, `skills/slice-verify/SKILL.md`).
8. The generalized-inventory demonstration: scratch clone, condense `spec/store.md` (drop a
   paragraph), skeleton, fill all rows but one, show the check fail on the missing row, fill it,
   **commit the condense in the clone**, show the check pass.
9. Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`,
   `docs:check -- budgets`. Report `report-r1.md`, `record.md`.

`evidence/` (outputs only): `inventory-CDE-before.txt`, `mapping-src.md` (file:line, old → new,
source), `mapping-docs.md`, `stale-comments.md` (file:line, old → new, code fact), `retitled-tests.md`,
`comment-proof.txt`, `fixtures-compare.txt`, `test-counts.txt`, `planted-faults.txt`,
`budgets.txt`, `old-forms-before-after.txt`, `phase-4.2-only-grep.txt`, `deploy-yml.diff`,
`inventory-demo.txt`.

## 11. Pre-listed for the report: Spec questions and To delete

**Spec questions** (design agent's text, not touched here):
- `CLAUDE.md` "How the spec is written": add the two one-liners (citations are checked in CI by
  `docs:check -- citations`; each spec file has a size budget in `workflow/budgets.md`, reported by
  `docs:check -- budgets`), and point the over-budget rule in `workflow/pr-review.md` at it.
- Text made stale by this slice: `workflow/condense.md:13-23` (`move`, `line-proof`,
  `inventory-skeleton <slice>`, `inventory <slice>`), `skills/slice-verify/SKILL.md:15`
  (`inventory <slice>`), `phases/4.2/brief.md` "Checks" (history, immutable).
- The 55 intra-file label references (D2) with their files and lines, if D2 is "leave".
- The 23 `~` rows (closest home, no exact rule): list with the fact each comment states.
- `eslint.config.js:28`: "(CONVENTIONS)" bare, outside the check's scope (maps to
  `CONVENTIONS.md#the-engine-is-pure-and-deterministic`).
- `ROADMAP.md:57` and `SKILL.md:20` name the deleted docs (allowed, listed).

**To delete:** none. Nothing is deleted in this slice.

**Not in this slice:** provenance in comments not otherwise touched (4.2-H), any code change in
`src/` (the Splashing dedupe is ROADMAP 4.5), editing `workflow/budgets.md`, the briefs, step files
and skills.

---

## Appendix. Every `src/` citation and where it goes (243)

Keys are `file:line`; `(#2)` is a second token on the same line. "Old text" shows the matched
span with a little context (wrapped labels shown joined). The rewrite uses this table verbatim; I
re-derive it at the dry run and report any difference. Anchors were resolved against today's
headings (all 243 resolve). Rows marked `title` are the 10 retitled tests; `string` is D1.

### A. Mapped through an inventory row, as-is (35)

| Location | Old text | Old unit | New anchor (inventory row, used as-is) | Note |
| --- | --- | --- | --- | --- |
| data/species/glimmerdark.ts:351 | `boss branch and CONVENTIONS' "Boss floors". H2 authored her` | C:84 | `spec/run.md#boss-floor-generation` |  |
| data/species/overgrowth.ts:373 | `boss branch and CONVENTIONS' "Boss floors". H1 authored her` | C:84 | `spec/run.md#boss-floor-generation` |  |
| data/species/rotcap-hollow.ts:357 | `boss branch and CONVENTIONS' "Boss floors". H3 authored her` | C:84 | `spec/run.md#boss-floor-generation` |  |
| engine/actions.ts:383 | `died. Rule 4 (CONVENTIONS "Every action source obeys the same rules", 4.1-C2c): a dead previou` | C:1082 | `spec/combat.md#every-action-source-obeys-the-same-rules` |  |
| engine/actions.ts:411 | `nce-list model (CONVENTIONS' "action instance-list", locked): an Attack or C` | C:187 | `spec/combat.md#action-instance-list` |  |
| engine/actions.ts:471 | `/** CONVENTIONS "An action ends when its actor dies" (4.1-C2c, PR #73 review):` | C:1113 | `spec/combat.md#an-action-ends-when-its-actor-dies` |  |
| engine/combat.ts:385 | `e skip (4.1-F1, CONVENTIONS "Action locks"): a turn is skipped if an` | C:555 | `spec/statuses.md#action-locks` |  |
| engine/corpus-digest.test.ts:2 | `// (CONVENTIONS "Testing"). Resolves every fight in` | C:1918 | `CONVENTIONS.md#testing` |  |
| engine/effect-types.ts:83 | `// CONVENTIONS "count-scaling" + the brief's magnitudeSo` | C:435 | `spec/effects.md#count-scaling` |  |
| engine/effect-types.ts:277 | `ponse verb (per CONVENTIONS' "hold the line"): clear a status` | C:257 | `spec/responses.md#no-side-doors` |  |
| engine/effect-types.ts:369 | `Phase 4.1-H2b1 (CONVENTIONS "Damage observation"): the load-time validator` | C:1476 | `spec/effects.md#damage-observation` |  |
| engine/effect-types.ts:406 | `(PR #71 review, CONVENTIONS "One action pipeline"): ''random'' is an INTENT` | C:1029 | `spec/combat.md#one-action-pipeline` |  |
| engine/effect-types.ts:743 | `plyStatus. Per CONVENTIONS' "immunity suppresses the effect, not the application": the status still applie` | C:659 | `spec/statuses.md#immunity-suppresses-the-effect-not-the-application` |  |
| engine/effect-types.ts:849 | `/** CONVENTIONS "Action locks": read by 'checkLegality'` | C:555 | `spec/statuses.md#action-locks` |  |
| engine/effects.ts:279 | `mulation' mode (CONVENTIONS' "Taken-reduction accumulation"). ''multiplicative'' (def` | C:446 | `spec/effects.md#taken-reduction-accumulation` |  |
| engine/effects.ts:465 | `ase 4.1-F1 (A3, CONVENTIONS "Action locks"): true iff an active 'act` | C:555 | `spec/statuses.md#action-locks` |  |
| engine/generation.ts:1 | `eration module (CONVENTIONS "Generation & the run layer"). Pure, seeded, RNG-free` | C:40 | `spec/run.md#generation-is-a-pure-seeded-module` |  |
| engine/generation.ts:58 | `ME' encounter (CONVENTIONS "Boss floors"). 'speciesId' is explicit` | C:84 | `spec/run.md#boss-floor-generation` |  |
| engine/generation.ts:79 | `- Equip gating (CONVENTIONS "Spell affinity & equip-gating") ----` | C:1752 | `spec/creatures.md#spell-affinity-gate` |  |
| engine/generation.ts:98 | `, boss floors): CONVENTIONS "Boss floors" -- a floor is a boss flo` | C:84 | `spec/run.md#boss-floor-generation` |  |
| engine/resolution.ts:438 | `Phase 4.1-H2b1 (CONVENTIONS "Damage observation"): supplied ONLY by 'apply` | C:1476 | `spec/effects.md#damage-observation` |  |
| engine/resolution.ts:1226 | `143, 144, 146; CONVENTIONS "DoT and Regen from the applier's snapshot"): a status's damage tick` | C:349 | `spec/statuses.md#the-applier-snapshot` |  |
| engine/status-snapshot.test.ts:2 | `// snapshot (CONVENTIONS "DoT and Regen from the applier's snapshot", ASSUMPTIONS 113, 114, 14` | C:349 | `spec/statuses.md#the-applier-snapshot` |  |
| engine/test-utils/golden-runner.ts:1 | `(PR #73 review, CONVENTIONS "Every golden replays through one shared runner"):` | C:2047 | `CONVENTIONS.md#every-golden-replays-through-one-shared-runner` |  |
| engine/types.ts:34 | `ture.affinity, CONVENTIONS "Spell affinity & equip-gating") -- the damage affinity c` | C:1752 | `spec/creatures.md#spell-affinity-gate` |  |
| engine/__corpus__/corpus-digest.fixture.ts:3 | `// fight (CONVENTIONS "Testing", corpus digest).` | C:1918 | `CONVENTIONS.md#testing` |  |
| engine/__corpus__/corpus.ts:7 | `stays pure per CONVENTIONS' "engine purity" rule. It sits outside` | C:16 | `CONVENTIONS.md#engine-purity` |  |
| engine/__fixtures__/biomes.ts:151 | `-identical (see CONVENTIONS "Boss floors").` | C:84 | `spec/run.md#boss-floor-generation` |  |
| engine/__golden__/golden-f2-stun-one-turn.fixture.ts:2 | `(Phase 4.1-F2; CONVENTIONS "Status lifecycle": durations count the bear` | C:1610 | `spec/statuses.md#timing` |  |
| engine/__golden__/golden-f2-weaken-three-turns.fixture.ts:2 | `(Phase 4.1-F2, CONVENTIONS "Status lifecycle"). Under round-end` | C:1610 | `spec/statuses.md#timing` |  |
| engine/__golden__/golden-h2b1-observed-lethal.fixture.ts:2 | `// CONVENTIONS "Hook execution model"): DamageDealt -> (on-dama` | C:1402 | `spec/effects.md#hook-execution` |  |
| state/integration.test.ts:35 | `h deferred (see CONVENTIONS "Boss floors" and the Slice I phase-rec` | C:84 | `spec/run.md#boss-floor-generation` |  |
| state/store.ts:1 | `e's first file (CONVENTIONS "Generation & the run layer" -- "the` | C:40 | `spec/run.md#generation-is-a-pure-seeded-module` |  |
| engine/damage-observation.test.ts:458 | `path (4.1-H2b1; CONVENTIONS "Hook execution model")'` | C:1402 | `spec/effects.md#hook-execution` | title. |
| engine/corpus-digest.test.ts:52 | `(CONVENTIONS "Testing", corpus digest)` | C:1918 | `CONVENTIONS.md#testing` | string. |

### B1. `GAME_DESIGN §N` (42): the section-heading row is `dropped` or lands on the file title, so each is mapped by hand to the rule the comment names

| Location | Old text | New anchor | Note |
| --- | --- | --- | --- |
| app/demoFight.ts:17 | `exist yet, see GAME_DESIGN.md §13), just enough to run the` | `OPEN_QUESTIONS.md#balance-numbers` |  |
| data/balance.ts:4 | `parked balance (GAME_DESIGN §13) until then.` | `OPEN_QUESTIONS.md#balance-numbers` | stale comment, rewritten |
| data/biomes.ts:7 | `ed biome slots (GAME_DESIGN §4's decade` | `spec/run.md#biomes` |  |
| data/species/glimmerdark.ts:1 | `(floors 11-20, GAME_DESIGN §4's decade cadence / ASSUMP` | `spec/run.md#biomes` |  |
| data/species/glimmerdark.ts:12 | `parked balance (GAME_DESIGN §13), picked only to be flavo` | `OPEN_QUESTIONS.md#content-numbers` |  |
| data/species/glimmerdark.ts:63 | `// bar (GAME_DESIGN §4). This grouping is no lon` | `spec/run.md#spells-unlock-cumulatively` |  |
| data/species/overgrowth.ts:1 | `h (floors 1-10, GAME_DESIGN §4's decade cadence / ASSUMP` | `spec/run.md#biomes` |  |
| data/species/overgrowth.ts:15 | `ts (10-30/stat, GAME_DESIGN §5) and every percent/factor` | `spec/creatures.md#core-stats` |  |
| data/species/overgrowth.ts:16 | `parked balance (GAME_DESIGN §13), picked only to be flavo` | `OPEN_QUESTIONS.md#content-numbers` |  |
| data/species/rotcap-hollow.ts:1 | `(floors 21-30, GAME_DESIGN §4's decade cadence / ASSUMP` | `spec/run.md#biomes` |  |
| data/species/rotcap-hollow.ts:13 | `parked balance (GAME_DESIGN §13), picked only to be flav` | `OPEN_QUESTIONS.md#content-numbers` |  |
| data/spells/core.ts:27 | `ell anchor from GAME_DESIGN.md §7's own example.` | `content/overgrowth.md#spell-power-convention` | ~ |
| data/spells/glimmerdark.ts:19 | `// (GAME_DESIGN §4) as spice on top of the i` | `spec/run.md#spells-unlock-cumulatively` | stale comment, rewritten |
| data/spells/rotcap-hollow.ts:4 | `-per-biome bar (GAME_DESIGN §4) the same` | `spec/run.md#spells-unlock-cumulatively` |  |
| data/statuses.ts:189 | `y ... spread", GAME_DESIGN §4). No existing 'ResponseTa` | `spec/run.md#biomes` |  |
| engine/actions.ts:334 | `line entirely (GAME_DESIGN §7). Returns 'null' when no` | `spec/combat.md#targeting-override` | also in the brief list |
| engine/actions.ts:390 | `e step applies (GAME_DESIGN §7: ally-side actions are ex` | `spec/combat.md#provoke` | also in the brief list |
| engine/actions.ts:668 | `rdless of side (GAME_DESIGN §7).` | `spec/combat.md#provoke` | also in the brief list |
| engine/balance-types.ts:49 | `(quadratic -- GAME_DESIGN §5 / ASSUMPTION 5). */` | `spec/creatures.md#levels-and-xp` |  |
| engine/balance-types.ts:66 | `t 0 (free), per GAME_DESIGN §9. Nothing reads it until P` | `spec/creatures.md#souls` | ~ (cited §9; summon is in Souls) |
| engine/config.ts:2 | `Placeholder per GAME_DESIGN §13 (exact number TBD).` | `OPEN_QUESTIONS.md#balance-numbers` | stale comment, rewritten |
| engine/curves.ts:3 | `parked balance (GAME_DESIGN §13); retuning happens in` | `OPEN_QUESTIONS.md#balance-numbers` |  |
| engine/effect-types.ts:1 | `s type surface (GAME_DESIGN §6, CONVENTIONS "Unified eff` | `spec/effects.md#one-effect-framework` |  |
| engine/generation.ts:38 | `ns as an enemy (GAME_DESIGN §5). */` | `spec/run.md#enemy-script-and-gem-set` |  |
| engine/generation.ts:89 | `/** GAME_DESIGN §4: v1 ships exactly 10 biom` | `spec/run.md#biomes` |  |
| engine/generation.ts:92 | `/** GAME_DESIGN §4: each biome spans 10 floo` | `spec/run.md#biomes` |  |
| engine/leveling.test.ts:12 | `/ Hand-derived, GAME_DESIGN §5's own worked example: bas` | `spec/creatures.md#levels-and-xp` |  |
| engine/leveling.ts:2 | `// no RNG. GAME_DESIGN §5 / CONVENTIONS "Stat growt` | `spec/creatures.md#levels-and-xp` |  |
| engine/leveling.ts:26 | `^2' (quadratic, GAME_DESIGN §5): XP per floor clear grow` | `spec/creatures.md#levels-and-xp` |  |
| engine/scripting-types.ts:57 | `/** GAME_DESIGN §8's "affinity advantage vs` | `spec/scripting.md#conditions` |  |
| engine/scripting-types.ts:105 | `The v1 set from GAME_DESIGN §8: the 5-member enemy set (` | `spec/scripting.md#target-selectors` |  |
| engine/support-spells.test.ts:73 | `// GAME_DESIGN §7: "Provoke applies only to` | `spec/combat.md#provoke` |  |
| engine/types.ts:47 | `line entirely (GAME_DESIGN §7: "Provoke applies only to` | `spec/combat.md#targeting-override` | also in the brief list |
| state/integration.test.ts:330 | `00 perk points (GAME_DESIGN §9), derived, never stored.` | `spec/progression.md#perk-points` |  |
| state/rewards.ts:79 | `// GAME_DESIGN §4/§10: Essence (gems), Ore (equ` | `spec/run.md#currencies` | §4/§10: both cite the currency list |
| state/rewards.ts:102 | `s soul%/XP, per GAME_DESIGN §7 and CONVENTIONS both gro` | `spec/combat.md#encounters-rewards--wipes` |  |
| state/rewards.ts:104 | `re-INDEPENDENT (GAME_DESIGN §4's "global depth-scaled d` | `spec/run.md#currencies` |  |
| state/rewards.ts:108 | `parked balance (GAME_DESIGN §13). Parameterized by Balanc` | `OPEN_QUESTIONS.md#drops-and-costs` |  |
| state/rewards.ts:118 | `// "rarer" per GAME_DESIGN §4` | `spec/run.md#currencies` |  |
| state/rewards.ts:124 | `// GAME_DESIGN §9: "100 points per boss...` | `spec/progression.md#perk-points` |  |
| state/store.ts:254 | `-clear-only per GAME_DESIGN §9). Own addition (not named` | `spec/progression.md#perk-points` |  |
| state/store.ts:459 | `-clear-only per GAME_DESIGN §9). Shared by 'recordBossKi` | `spec/progression.md#perk-points` |  |

### B2. Labelled citations the inventory rows cannot answer (28): label never matched an old unit, matched several, or the row is spread, or an override

| Location | Old text | New anchor | Note |
| --- | --- | --- | --- |
| data/perform-action.data.test.ts:1 | `action' grants (CONVENTIONS "perform-action").` | `spec/responses.md#perform-action` | label hits 3 units |
| data/scripts.test.ts:37 | `ase 4.1-G1 (D4; CONVENTIONS "Role scripts"): the seven role scripts,` | `spec/scripting.md#role-scripts` | spread row (role-scripts, stock-scripts) |
| data/scripts.ts:3 | `ase 4.1-G1, D4; CONVENTIONS "Role scripts"). A` | `spec/scripting.md#role-scripts` | spread row |
| data/species/starters.ts:7 | `mposition only (CONVENTIONS "Data layer — carriers vs. composition"): the starter traits and` | `CONVENTIONS.md#composition-files-only-reference-carriers` | spread row (carriers/composition) |
| data/spells/core.ts:45 | `ied status, per CONVENTIONS' "Spell gains an optional status-application."` | `spec/combat.md#spells-carry-responses` | label never matched an old unit |
| data/spells/glimmerdark.ts:57 | `uses.ts) -- per CONVENTIONS' "statuses are shared primitives" and species-locked.md's` | `spec/statuses.md#a-status-is-a-timed-effect` | label never matched ("statuses are shared primitives") |
| data/spells/index.ts:37 | `library barrel (CONVENTIONS "Data layer — carriers vs. composition"): re-exports every` | `CONVENTIONS.md#effect-carriers-live-in-libraries` | spread row (the barrel is a library) |
| data/statuses.ts:105 | `One instance (GAME_DESIGN: "one instance + duration"). */` | `spec/statuses.md#no-stacking` | label never matched ("one instance + duration") |
| data/traits/index.ts:85 | `library barrel (CONVENTIONS "Data layer — carriers vs. composition"): re-exports every` | `CONVENTIONS.md#effect-carriers-live-in-libraries` | spread row (the barrel is a library) |
| engine/combat.ts:160 | `leanup, part 1 (CONVENTIONS "Status lifecycle", Phase 4.1-F2): the BEARE` | `spec/statuses.md#turn-end-cleanup` | ov: row says #timing; the comment is the cleanup step |
| engine/combat.ts:367 | `// per CONVENTIONS' "explicit boundary even for no-op turns". A dead creature must not` | `spec/combat.md#turn-structure` | label never matched |
| engine/combat.ts:500 | `RN-END CLEANUP (CONVENTIONS' "Turn structure", 4.1-F2): bookkeeping onl` | `spec/combat.md#turn-structure` | label hits 2 units |
| engine/curves.ts:48 | `; NOT rolled -- CONVENTIONS "Generation & the run layer": the fight *count* is st` | `spec/run.md#fights-per-floor` | ov: the comment is about the fight count, not generation as a whole |
| engine/effect-types.ts:481 | `* Phase 4.1-F1 (CONVENTIONS "The bright line"): the load-time validator` | `spec/effects.md#no-temporary-stat-modifier` | spread row (validators, no-temporary-stat-modifier) |
| engine/effects.ts:149 | `d here, once** (CONVENTIONS "Immunity"): every effect, of every` | `spec/effects.md#immunity` | label hits 3 units |
| engine/generation.ts:264 | `d' is its role (CONVENTIONS "Role scripts"); 'caster', 'support' and` | `spec/scripting.md#role-scripts` | spread row |
| engine/generation.ts:400 | `biome list, per CONVENTIONS' "biomeForFloor's fixed 1-100 sequence is positional" -- generation.ts stays i` | `spec/run.md#biomeforfloor` | label never matched |
| engine/leveling.ts:2 (#2) | `AME_DESIGN §5 / CONVENTIONS "Stat growth is linear and derived from base stats."` | `spec/creatures.md#levels-and-xp` | spread row (levels-and-xp, materializecreature) |
| engine/types.ts:28 | `ed target; see CONVENTIONS "Spells carry responses" and 'validateSpellEffects` | `spec/combat.md#spells-carry-responses` | label never matched |
| engine/types.ts:38 | `based, matching GAME_DESIGN's "Biome 1"/"Biome 2" numbering) at w` | `spec/run.md#biomes` |  |
| engine/__golden__/golden-g1-leech-sovereign-pacified.fixture.ts:2 | `boss loadouts; CONVENTIONS "Role scripts"). Real content: the real` | `spec/scripting.md#role-scripts` | spread row |
| engine/__golden__/golden-heal-scaling-count.fixture.ts:8 | `rty member, per CONVENTIONS "duplicate/dead slots" -- never gets a turn,` | `spec/combat.md#turn-queue` | ~ label never matched ("duplicate/dead slots") |
| state/rewards.ts:59 | `end() call, per CONVENTIONS "XP goes to the whole active party regardless of survival") and resolves any resulti` | `spec/run.md#rewards` | label never matched |
| state/rewards.ts:61 | `ppen mid-fight (CONVENTIONS: "the engine never sees a mid-fight level change"); this is the POST-fight` | `spec/run.md#rewards` | label never matched |
| state/store.ts:161 | `first non-win (CONVENTIONS: "the fight ends the instant a side has no living creatures"; a floor's remaining figh` | `spec/combat.md#resolution--timing` | label never matched |
| state/store.ts:181 | `n refuse -- see CONVENTIONS "State & persistence". 'beyond-content-frontie` | `spec/store.md#how-store-actions-fail` | ov: row says #one-store |
| state/store.ts:216 | `this order, per CONVENTIONS "Specializations". */` | `spec/progression.md#specializations` | label hits 2 units |
| state/store.ts:786 | `ltimately ends (CONVENTIONS: "never held pending fight outcome").` | `spec/run.md#rewards` | label never matched |

### B3. Bare `CONVENTIONS` / `GAME_DESIGN` with no label (68)

| Location | Old text | New anchor | Note |
| --- | --- | --- | --- |
| data/specializations.ts:1 | `izations/perks (CONVENTIONS "Specializations are data` | `spec/progression.md#specializations-are-data` |  |
| data/specializations.ts:59 | `/** CONVENTIONS' stated invariant: a spec` | `spec/progression.md#specializations-are-data` |  |
| data/specializations.ts:296 | `-stat consumer (CONVENTIONS names this exact perk und` | `spec/combat.md#cross-stat-contribution` |  |
| data/specializations.ts:334 | `// consumer (CONVENTIONS names this exact perk und` | `spec/combat.md#cross-stat-contribution` |  |
| data/specializations.ts:442 | `H action kinds (CONVENTIONS names this exact perk).` | `spec/combat.md#cross-stat-contribution` |  |
| data/species/glimmerdark.ts:18 | `pells' library (CONVENTIONS "Data layer -- carriers v` | `CONVENTIONS.md#composition-files-only-reference-carriers` | wrapped label |
| data/species/rotcap-hollow.ts:27 | `pells' library (CONVENTIONS "Data layer -- carriers v` | `CONVENTIONS.md#composition-files-only-reference-carriers` | wrapped label |
| data/species/starters.ts:5 | `// through, per CONVENTIONS.` | `spec/creatures.md#materializecreature` |  |
| data/species/starters.ts:18 | `tats (10-30 per GAME_DESIGN) are parked balance, pick` | `spec/creatures.md#core-stats` |  |
| data/spells/index.test.ts:129 | `olls to spells (CONVENTIONS "determinism is` | `CONVENTIONS.md#combat-is-reproducible-from-its-inputs` | ~ ("determinism is sacred") |
| data/traits/core.test.ts:34 | `brary grouping (CONVENTIONS "Data layer — carriers vs` | `CONVENTIONS.md#effect-carriers-live-in-libraries` | wrapped label |
| data/traits/glimmerdark.ts:172 | `rter/spec tree (CONVENTIONS).` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` |  |
| data/traits/glimmerdark.ts:440 | `alingStat', per CONVENTIONS' own named example): whene` | `spec/responses.md#flat-mode` | ~ (scalingStat) |
| data/traits/overgrowth.ts:92 | `exact species (CONVENTIONS' own Phase 4 addenda names` | `spec/effects.md#count-scaling` |  |
| engine/actions.ts:509 | `ok above -- see CONVENTIONS' actor-vs-observer routing` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` |  |
| engine/actions.ts:513 | `// B5 (CONVENTIONS): the pre-hit hooks may h` | `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles` |  |
| engine/actions.ts:633 | `'cast') -- see CONVENTIONS' actor-vs-observer routing` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` |  |
| engine/actions.ts:666 | `// CONVENTIONS; a support cast on your o` | `spec/combat.md#targeting-override` | ~ (Confusion) |
| engine/actor-death.test.ts:1 | `ts actor dies" (CONVENTIONS). The actor is` | `spec/combat.md#an-action-ends-when-its-actor-dies` |  |
| engine/balance-types.ts:2 | `/balance.ts) -- CONVENTIONS "Where each` | `CONVENTIONS.md#where-each-number-lives` | wrapped label |
| engine/combat.ts:410 | `okkeeping only (CONVENTIONS' "Turn` | `spec/combat.md#turn-structure` | wrapped label |
| engine/effect-types.ts:1 (#2) | `GAME_DESIGN §6, CONVENTIONS "Unified effect` | `spec/effects.md#one-effect-framework` | wrapped label |
| engine/effect-types.ts:23 | `rately omitted (CONVENTIONS' Phase 4 addenda). Phase 4` | `spec/effects.md#hooks` |  |
| engine/effect-types.ts:26 | `r routing rule, CONVENTIONS).` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` |  |
| engine/effect-types.ts:98 | `by the brief -- CONVENTIONS/the vocabulary table nam` | `spec/effects.md#count-scaling` |  |
| engine/effect-types.ts:105 | `made explicit" (CONVENTIONS). Flagged for review: 'st` | `spec/effects.md#count-scaling` |  |
| engine/effect-types.ts:327 | `d in Slice E2): CONVENTIONS' count-scaling primitive n` | `spec/effects.md#count-scaling` |  |
| engine/effect-types.ts:588 | `ger must carry (CONVENTIONS): a 'chancePercent' stri` | `spec/responses.md#perform-action` |  |
| engine/effect-types.ts:651 | `ther primitive (CONVENTIONS' "action` | `spec/combat.md#action-instance-list` | wrapped label |
| engine/effect-types.ts:783 | `on-hit effects (CONVENTIONS' locked "option a" consump` | `spec/effects.md#splashing-and-annihilate` |  |
| engine/effects.ts:496 | `/** CONVENTIONS' count-scaling primitive:` | `spec/effects.md#count-scaling` |  |
| engine/effects.ts:545 | `ade explicit" (CONVENTIONS); 'count' delegates to re` | `spec/effects.md#count-scaling` |  |
| engine/environment.test.ts:4 | `documents it -- CONVENTIONS "src/engine... run in Nod` | `CONVENTIONS.md#test-environments` |  |
| engine/generation.ts:2 | `RNG-free where CONVENTIONS says it must be RNG-free` | `spec/run.md#generation-is-a-pure-seeded-module` |  |
| engine/generation.ts:396 | `NG stream, per CONVENTIONS) -- re-descending the sam` | `spec/run.md#floor-runs` |  |
| engine/resolution-types.ts:97 | `ng of its own (CONVENTIONS B2 rule 2). */` | `spec/responses.md#perform-action` | ~ ("B2 rule 2") |
| engine/resolution.ts:1043 | `review item 2; CONVENTIONS, heal).` | `spec/combat.md#the-stat-a-spells-magnitude-scales-off` |  |
| engine/rng.ts:2 | `h.random() (see CONVENTIONS.md).` | `CONVENTIONS.md#the-engine-is-pure-and-deterministic` |  |
| engine/rng.ts:6 | `ever mutate" -- CONVENTIONS calls this out explicitly` | `CONVENTIONS.md#combat-is-reproducible-from-its-inputs` |  |
| engine/__golden__/golden-6v6-scripted.fixture.ts:9 | `// CONVENTIONS' two-tier golden disciplin` | `CONVENTIONS.md#two-tier-golden-discipline` |  |
| engine/__golden__/golden-action-observed.fixture.ts:6 | `per instance" (CONVENTIONS).` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` |  |
| engine/__golden__/golden-defend-count-additive-cap.fixture.ts:11 | `xture small per CONVENTIONS' testing discipline while` | `CONVENTIONS.md#golden-replay-tests` | ~ ("keep fixtures small") |
| engine/__golden__/golden-defend-count.fixture.ts:14 | `e never clamps (CONVENTIONS: "reductions trend toward` | `spec/effects.md#taken-reduction-accumulation` |  |
| engine/__golden__/golden-dot.fixture.ts:15 | `at fight-start (GAME_DESIGN: "currentHp inits to effe` | `spec/combat.md#fight-setup` | ~ (currentHp at fight start) |
| engine/__golden__/golden-dot.fixture.ts:171 | `at fight-start (GAME_DESIGN), so TARGET's` | `spec/combat.md#fight-setup` | ~ |
| engine/__golden__/golden-gloomjaw-ravager.fixture.ts:15 | `ctive core, per CONVENTIONS). off 26: core max(26-14,` | `spec/combat.md#armor-penetration` |  |
| engine/__golden__/golden-h2b2-tick-no-retaliation.fixture.ts:2 | `Phase 4.1-H2b2, CONVENTIONS "'triggering-source'` | `spec/responses.md#triggering-source-is-never-the-firing-creature` |  |
| engine/__golden__/golden-revive.fixture.ts:3 | `ax HP (20%, per CONVENTIONS' worked example), with NO` | `spec/responses.md#revive` |  |
| engine/__golden__/golden-shieldbarer-starter.fixture.ts:9 | `Turn' call, per CONVENTIONS' precedent for goldens` | `CONVENTIONS.md#golden-replay-tests` | ~ no exact home ("precedent for goldens whose target never dies") |
| engine/__golden__/golden-spore-spread.fixture.ts:21 | `k's own damage (CONVENTIONS): SEEDER's Infest trait a` | `spec/effects.md#hook-execution` | ~ (on-attack before the damage) |
| engine/__golden__/golden-sporecloud-reaper-no-spore.fixture.ts:14 | `k's own damage (CONVENTIONS): Bloomburst's bonus ride` | `spec/effects.md#hook-execution` | ~ |
| state/integration.test.ts:3 | `/spec data. Per CONVENTIONS'` | `CONVENTIONS.md#two-tier-golden-discipline` |  |
| state/integration.test.ts:192 | `rgeting fizzle (CONVENTIONS),` | `spec/responses.md#fizzles` |  |
| state/integration.test.ts:326 | `reward banking (CONVENTIONS: boss kill = XP/currency,` | `spec/run.md#rewards` |  |
| state/integration.test.ts:397 | `lost the 10th (CONVENTIONS' accepted "per-fight loss` | `spec/run.md#fights-per-floor` | ~ (OPEN_QUESTIONS "Fight count" holds the risk) |
| state/integration.test.ts:399 | `rst non-win per CONVENTIONS, so ten wins means a clea` | `spec/run.md#a-descent-is-atomic` | ~ |
| state/rewards.ts:103 | `_DESIGN §7 and CONVENTIONS both grouping soul%/XP/cu` | `spec/run.md#rewards` |  |
| state/store.test.ts:1057 | `entual outcome (CONVENTIONS). The boss then` | `spec/run.md#rewards` |  |
| state/store.ts:258 | `ly described by CONVENTIONS' Biome Atlas facility). N` | `spec/run.md#facilities` |  |
| state/store.ts:741 | `s.biomes' list (CONVENTIONS'` | `spec/run.md#biomeforfloor` |  |
| state/store.ts:764 | `AND it's won -- CONVENTIONS "winning a boss fight add` | `spec/run.md#rewards-are-a-run-layer-consumer-of-the-event-log` |  |
| state/store.ts:793 | `ot collectable, CONVENTIONS' Rewards clause) -- and is` | `spec/run.md#rewards` |  |
| data/biomes.test.ts:27 | `actly 10 slots (GAME_DESIGN §4 decade cadence)'` | `spec/run.md#biomes` | title. title |
| data/species/glimmerdark.test.ts:57 | `ats fall within GAME_DESIGN's ranges: Health 20-45 (4.1-H2c, ASSUM` | `spec/creatures.md#core-stats` | title. title |
| data/species/overgrowth.test.ts:52 | `ats fall within GAME_DESIGN's ranges: Health 20-45 (4.1-H2c, ASSUM` | `spec/creatures.md#core-stats` | title. title |
| data/species/rotcap-hollow.test.ts:58 | `ats fall within GAME_DESIGN's ranges: Health 20-45 (4.1-H2c, ASSUM` | `spec/creatures.md#core-stats` | title. title |
| data/species/starters.test.ts:39 | `ats fall within GAME_DESIGN's ranges: Health 20-45 (4.1-H2c, ASSUM` | `spec/creatures.md#core-stats` | title. title |
| engine/actor-death.test.ts:123 | `its actor dies (CONVENTIONS, 4.1-C2c)'` | `spec/combat.md#an-action-ends-when-its-actor-dies` | title. title |

### B4. `species-locked.md` (70): the content entry that now holds what the comment quotes

| Location | Old text | New anchor | Note |
| --- | --- | --- | --- |
| data/species/glimmerdark.ts:2 | `.claude/species/species-locked.md''s own table, built` | `content/glimmerdark.md#glimmerdark-biome-2-floors-1120` |  |
| data/species/glimmerdark.ts:8 | `// species-locked.md names one shared mechanic` | `content/glimmerdark.md#resonants-wit-caster-synergy` |  |
| data/species/glimmerdark.ts:13 | `ly consistent. species-locked.md's own "Coverage" note for t` | `content/glimmerdark.md#affinity-spread` |  |
| data/species/glimmerdark.ts:203 | `olence lean per species-locked.md) -- closed mechanic: stat` | `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites` |  |
| data/species/glimmerdark.ts:344 | `// species-locked.md: "Fast steal-race ... Eve` | `content/glimmerdark.md#leech-sovereign` |  |
| data/species/overgrowth.ts:2 | `.claude/species/species-locked.md''s own table, built` | `content/overgrowth.md#the-overgrowth-biome-1-floors-110` |  |
| data/species/overgrowth.ts:7 | `tal), following species-locked.md's own "roles ...` | `content/overgrowth.md#enabler-payoff-amplifier` | ~ ("roles") |
| data/species/overgrowth.ts:19 | `// species-locked.md's own "Coverage" note: "bal` | `content/overgrowth.md#reading-this-biome` | ~ ("Coverage" note) |
| data/species/overgrowth.ts:363 | `// species-locked.md: "Target-priority ... Cou` | `content/overgrowth.md#broodmother` |  |
| data/species/overgrowth.ts:388 | `r members, per species-locked.md's "adds: spiderlings (Spider pool)"; both already share SPIDE` | `content/overgrowth.md#broodmother` |  |
| data/species/rotcap-hollow.ts:2 | `.claude/species/species-locked.md''s own table, built` | `content/rotcap-hollow.md#rotcap-hollow-biome-3-floors-2130` |  |
| data/species/rotcap-hollow.ts:8 | `tal), following species-locked.md's own "roles ...` | `content/rotcap-hollow.md#species-roles` | ~ ("roles") |
| data/species/rotcap-hollow.ts:14 | `mostly follows species-locked.md's` | `content/rotcap-hollow.md#species-roles` | ~ (affinities) |
| data/species/rotcap-hollow.ts:347 | `// species-locked.md: "Attrition-management (f` | `content/rotcap-hollow.md#rot-sovereign` |  |
| data/species/rotcap-hollow.ts:372 | `wn spawn pool" (species-locked.md names no specific pair f` | `content/rotcap-hollow.md#rot-sovereign` |  |
| data/species/starters.ts:1 | `+ the Unicorn (species-locked.md's "Starter` | `spec/progression.md#starter-species-are-stubs` |  |
| data/species/starters.ts:11 | `ies is stubbed (species-locked.md: "for` | `spec/progression.md#starter-species-are-stubs` |  |
| data/species/starters.ts:19 | `X" description (species-locked.md/the spec docs) --` | `spec/progression.md#starter-species-are-stubs` | ~ |
| data/species/starters.ts:22 | `TION (Slice F): species-locked.md explicitly left the Brute` | `spec/progression.md#starter-species-are-stubs` | ~ |
| data/species/starters.ts:41 | `quipped spell" (species-locked.md / sorcerer.md). Its` | `specializations/sorcerer.md#starter-glyphmoth-seer` |  |
| data/species/starters.ts:48 | `// (species-locked.md) is authored in a later b` | `spec/progression.md#starter-species-are-stubs` |  |
| data/species/starters.ts:106 | `r party member (species-locked.md);` | `content/overgrowth.md#unicorn-lightbearer` |  |
| data/spells/glimmerdark.ts:28 | `next round, per species-locked.md's own "a spell may apply an` | `spec/run.md#the-onboarding-ramp` |  |
| data/spells/glimmerdark.ts:58 | `rimitives" and species-locked.md's own "a spell may apply an` | `spec/run.md#the-onboarding-ramp` |  |
| data/spells/rotcap-hollow.ts:10 | `ducer of Spore (species-locked.md: "a spell may apply any status, including another species' signature one" -- statuses are shared p` | `spec/run.md#the-onboarding-ramp` |  |
| data/statuses.ts:128 | `site pole" per species-locked.md). Deliberately light per` | `content/glimmerdark.md#grant-act-first` |  |
| data/statuses.ts:170 | `pposite pole" (species-locked.md). No 'breakChancePercent'` | `content/glimmerdark.md#grant-act-first` |  |
| data/statuses.ts:232 | `fensive action (species-locked.md's own "3-turn default ... 5` | `content/rotcap-hollow.md#confusion` |  |
| data/traits/glimmerdark.ts:9 | `// species-locked.md names a single shared mec` | `content/glimmerdark.md#resonants-wit-caster-synergy` |  |
| data/traits/glimmerdark.ts:125 | `re its target" (species-locked.md), now the spec'd numeric` | `content/glimmerdark.md#blindclaws-striker` |  |
| data/traits/glimmerdark.ts:132 | `nd: 'attack'' (species-locked.md's own wording is Attack-spe` | `content/glimmerdark.md#blindclaws-striker` |  |
| data/traits/glimmerdark.ts:168 | `// species-locked.md names ONE shared mechanic` | `content/glimmerdark.md#resonants-wit-caster-synergy` |  |
| data/traits/glimmerdark.ts:216 | `with echo-cast, species-locked.md's actual spec'd mechanic:` | `content/glimmerdark.md#resonant-overtone` |  |
| data/traits/glimmerdark.ts:247 | `olence lean per species-locked.md) -- closed mechanic: stat` | `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites` |  |
| data/traits/glimmerdark.ts:248 | `parasites ---- species-locked.md: "Drainers (on-attack ->` | `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites` |  |
| data/traits/glimmerdark.ts:256 | `-- "free", per species-locked.md's own "~free (2x apply-sta` | `content/glimmerdark.md#sparkeater-leech` |  |
| data/traits/glimmerdark.ts:349 | `bs, superseding species-locked.md's original "single` | `content/glimmerdark.md#gloomjaws-violence-execute-the-weak` |  |
| data/traits/glimmerdark.ts:428 | `ff/"attacker"): species-locked.md's "attacker uses stat-remap Defence->Attack" -- its Attack action read` | `content/glimmerdark.md#shellback-brawler` |  |
| data/traits/glimmerdark.ts:460 | `// species-locked.md: "Every hit steals a stat` | `content/glimmerdark.md#leech-sovereign` |  |
| data/traits/overgrowth.ts:70 | `rone (enabler): species-locked.md calls it a "cheap body,"` | `content/overgrowth.md#swarmhive-drone` |  |
| data/traits/overgrowth.ts:271 | `big retaliate", species-locked.md). It was 30% in 4.1-H2c` | `content/overgrowth.md#snapjaw-jaws` |  |
| data/traits/overgrowth.ts:313 | `et on attack -- species-locked.md explicitly calls out "cha` | `content/overgrowth.md#lullpollen-sleeper` |  |
| data/traits/rotcap-hollow.ts:12 | `ngth by rarity (species-locked.md's own "heal/buff scaling of` | `content/rotcap-hollow.md#myconet-endurancewit-death-network` |  |
| data/traits/rotcap-hollow.ts:214 | `s/H2 pattern -- species-locked.md names ONE closed mechanic` | `content/rotcap-hollow.md#necromoss-witvitality-reclaim` |  |
| data/traits/rotcap-hollow.ts:344 | `ike Spore), per species-locked.md's own "strong non-spreadin` | `content/rotcap-hollow.md#sporch-violencewit-strong-non-spreading-burn` |  |
| data/traits/rotcap-hollow.ts:362 | `+% to Burning" (species-locked.md), the target-conditional` | `content/rotcap-hollow.md#sporch-ashborn` |  |
| data/traits/rotcap-hollow.ts:400 | `// species-locked.md: "Attrition-management (f` | `content/rotcap-hollow.md#rot-sovereign` |  |
| data/traits/starters.ts:10 | `quipped spell" (species-locked.md / sorcerer.md).` | `specializations/sorcerer.md#starter-glyphmoth-seer` |  |
| data/traits/starters.ts:56 | `provokes stack (species-locked.md's own "ramping team-Defence` | `specializations/shieldbarer.md#starter-stonehorn-warden` |  |
| data/traits/starters.ts:78 | `r party member (species-locked.md);` | `content/overgrowth.md#unicorn-lightbearer` |  |
| engine/effect-types.ts:329 | `e board count", species-locked.md's Swarmhive Striker). Delib` | `content/overgrowth.md#swarmhive-striker` |  |
| engine/targeting.ts:107 | `n or lose, per species-locked.md's "Confusion consumes combat RNG"); on success, draws a se` | `content/rotcap-hollow.md#confusion` |  |
| engine/turn-order.test.ts:61 | `opposite pole (species-locked.md).` | `content/glimmerdark.md#grant-act-first` |  |
| engine/__golden__/golden-blindclaws-striker.fixture.ts:1 | `ignature combo (species-locked.md) -- Setter grants the` | `content/glimmerdark.md#blindclaws-instinct-ambush-via-turn-order` |  |
| engine/__golden__/golden-broodmother.fixture.ts:1 | `he Broodmother (species-locked.md's "Count-scales off` | `content/overgrowth.md#broodmother` |  |
| engine/__golden__/golden-brute-starter.fixture.ts:2 | `onal instance" (species-locked.md /` | `specializations/brute.md#starter-cragfang-mauler` |  |
| engine/__golden__/golden-brute-starter.fixture.ts:11 | `.claude/species/species-locked.md' ("Attack executes` | `specializations/brute.md#starter-cragfang-mauler` |  |
| engine/__golden__/golden-gloomjaw-stalker.fixture.ts:1 | `ature mechanic (species-locked.md) -- "execute the weak",` | `content/glimmerdark.md#gloomjaws-violence-execute-the-weak` |  |
| engine/__golden__/golden-hollowkin-wretch.fixture.ts:1 | `llowkin Wretch (species-locked.md's "Puppet" mechanic) -- the real,` | `content/rotcap-hollow.md#hollowkin-wretch` |  |
| engine/__golden__/golden-leech-sovereign.fixture.ts:1 | `floor-20 boss (species-locked.md) -- "every hit` | `content/glimmerdark.md#leech-sovereign` |  |
| engine/__golden__/golden-necromoss-reclaim.fixture.ts:1 | `Necromoss Wisp (species-locked.md's "Reclaim" mechanic) -- the real,` | `content/rotcap-hollow.md#necromoss-wisp` |  |
| engine/__golden__/golden-overgrowth-web-exploit.fixture.ts:1 | `ignature combo (species-locked.md) -- Spiders' Web-> "+% dm` | `content/overgrowth.md#spiders-wit-trap--exploit` |  |
| engine/__golden__/golden-resonant-harmonize.fixture.ts:1 | `ature mechanic (species-locked.md) -- "members` | `content/glimmerdark.md#resonants-wit-caster-synergy` |  |
| engine/__golden__/golden-rot-sovereign.fixture.ts:1 | `Rot Sovereign (species-locked.md's "Attrition-` | `content/rotcap-hollow.md#rot-sovereign` |  |
| engine/__golden__/golden-spore-spread-fizzle.fixture.ts:2 | `ready Spored -- species-locked.md's own "fizzles if none [qua` | `content/rotcap-hollow.md#spore` |  |
| engine/__golden__/golden-spore-spread.fixture.ts:1 | `ion end-to-end (species-locked.md) -- Sporecloud Seeder's` | `content/rotcap-hollow.md#sporecloud-seeder` |  |
| state/integration.test.ts:182 | `ignature trait (species-locked.md: "whenever this creature` | `content/overgrowth.md#unicorn-lightbearer` |  |
| data/species/overgrowth.test.ts:125 | `roster members (species-locked.md: "adds: spiderlings")'` | `content/overgrowth.md#broodmother` | title. title |
| data/species/starters.test.ts:52 | `nct affinities (species-locked.md: "ideally distinct")'` | `spec/progression.md#specializations` | title. title; ~ (no rule says the starter affinities are distinct) |
| data/species/starters.test.ts:183 | `ttack instance (species-locked.md: "twice at 100%")'` | `specializations/brute.md#starter-cragfang-mauler` | title. title |


## Assumptions checklist

Marked inline above; confirm or override each at the plan review. D1 and D2 (section 0) are
decisions, not assumptions.

- **A1** `scripts/docs-check.ts` becomes a thin entry and the logic moves to `scripts/docs-check/*.ts`
  (one module per concern, root passed as an argument), so tests can import it without running
  `main`. The entry file name and the npm script do not change.
- **A2** Tests live in `scripts/docs-check/*.test.ts`, run by a new third Vitest project
  `docs-check` (`environment: 'node'`, `include: ['scripts/**/*.test.ts']`) in `vite.config.ts`. The
  two existing projects and every count under `src/` are untouched; the total rises by the number of
  new tests (about 55, reconciled in the report).
- **A3** Every mode takes `--root <dir>` (default: the repo root), for the tests and the planted-fault
  runs.
- **A4** Citation paths are `.claude/`-rooted plain text; a leading `.claude/` is tolerated and
  normalised away; a path with a `..` segment is a failure, not skipped.
- **A5** `citations` scans `src/**/*.{ts,tsx}` and `.claude/**/*.md` outside `phases/` and
  `archive/`, whole files including fenced code. `scripts/`, `eslint.config.js` and the other root
  files are out of scope.
- **A6** Beyond the kickoff's shapes: in `src/` only, any `GAME_DESIGN` or `species-locked` token
  fails; in `.claude/` a bare mention of a deleted doc is allowed (so `ROADMAP.md:57` and
  `SKILL.md:20` pass untouched). A bare `CONVENTIONS` in `src/` is not flagged by the check (the
  rewrite leaves none).
- **A7** Label-form shapes: a backticked `.md` path, or a bare top-level name, then optional
  `,`/`:`, whitespace (line breaks allowed), then `"`. The paren list and an unbackticked
  `path.md: "quote"` are not detected by the check; the script still converts the paren list.
- **A8** Gaps (2) indented headings and (3) `_emphasis_`/entities in `resolveAnchors` stay unfixed
  and documented: none of the 1,681 headings in `.claude/` has them. Gap (1) is fixed.
- **A9** Rewrite format: the anchor in backticks inside comments, bare inside titles; the span is the
  old name plus its label or `§N`; every other word of the comment stays, provenance included.
- **A10** `budgets` never fails: an over-budget file, a missing listed file, a missing or empty
  table all print and exit 0. Size is UTF-8 bytes with `\r` removed, 1 KB = 1000 bytes.
- **A11** Inventory interface: `inventory-skeleton <mailbox> <file>... [--base <rev>]` and
  `inventory <mailbox>`; `Base: <40-hex sha>` and `Files:` lines in `inventory.md` are the check's
  source of truth; unit ids are `<file>:<line>` with `.claude/`-relative files; default base `HEAD`,
  resolved to a sha at skeleton time.
- **A12** The Appendix hand-map is the authority for the 208 rows it lists, including the 23 `~`
  closest-home rows and the 3 overrides; the reviewer may override any row.
- **A13** The two `deploy.yml` steps go in the `test` job after `format:check` and before
  `npm run test`.
- **A14** The Splashing comment (`effect-types.ts:760`) names `actions.ts`'s private
  `adjacentLivingTargets` as the lookup Splashing uses and does not mention a dedupe beyond
  "tracked in ROADMAP Phase 4.5".
- **A15** A label that is not a full heading text is accepted when it is a prefix of exactly one
  heading in the named file. Three cases: `WORKFLOWS "Golden policy"`, `WORKFLOWS "The human's
  judgment call"`, `phases/4.2/brief.md "Condensing rules"`.
- **A16** The rewrite script and the proof script live in my scratchpad and are not committed;
  the report quotes their rules and keeps their output in `evidence/`.
- **A17** The comment-only proof uses the TypeScript printer with `removeComments: true`, masks the
  first argument of every `describe`/`it`/`test` call (and the corpus template literal if D1 is
  approved), and rejects a changed pragma comment; it is shown to fail on a planted code change.
- **A18** "Expected values compared by importing" is done for the changed fixtures in a scratch
  Vitest run against a `git archive` of `main`; if that fights the repo's config, the printer proof
  plus the unchanged corpus digest stands in and the report says so.
- **A19** Stale-comment fixes change the wrong claim and the provenance in the same sentences, and
  leave the rest of each comment alone.
- **A20** A test reads the repo's real `.github/workflows/deploy.yml` and asserts the `test` job
  runs both modes (guards "CI runs both modes").
- **A21** Exit codes: 0 pass, 1 problems found (or a tool error), 2 bad usage; `budgets` follows A10.
