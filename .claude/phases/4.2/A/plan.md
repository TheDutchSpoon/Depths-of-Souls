# Plan — Phase 4.2 — Slice A: The mechanical restructure

Read: `CLAUDE.md`, `workflow/coding-rules.md`, the kickoff, the A brief, the phase brief (the sections
the kickoff names), the pinned inputs' structure, `package.json`, `tsconfig.node.json`,
`tsconfig.app.json`, `eslint.config.js`, `.prettierignore`, `.gitattributes`, `vite.config.ts`.
Facts checked while planning (a throwaway probe in the session scratchpad, not in the repo):

- both pinned blobs hash to the expected prefixes (`91455dd2026ba18d`, `0970f347753833df`), have
  2160 and 1347 lines, no `\r`, and end with `\n`;
- the kickoff's unit rule (trap 1), with fences detected as `^\s*```` toggles, gives **261** for
  CONVENTIONS (29 headings, 214 list items, 18 paragraph starts) and **262** for GAME_DESIGN
  (26 / 181 / 55). Both match; no reading differs;
- line 2 of both old files is blank (matters for the read-when insertion, A5);
- Node here is v24.19.0 (CI: 24; engines `^22.22.2 || ^24.15.0`, both strip types unflagged);
- `git merge-base HEAD main` is `ba18fa0`; B's glob at that base is `content/*.md` (4),
  `specializations/*.md` (3) and `species/species-locked.md`.

## Golden policy (restated from the kickoff)

**Byte-identical.** `src/` is untouched (`git diff main -- src` empty). Every golden and the corpus
digest fixture are unchanged, and the test count equals `main`'s file by file. I add **no** vitest
test (A1): the test count would change, so the mechanisms are proven by planted-fault runs instead
(below), with their output in `evidence/`. Baseline: before editing anything I run `npm run test`
at the current HEAD (its `src/` equals `main`'s) and keep its per-file counts in the scratchpad;
the report reconciles the final run against them file by file.

## Files touched

| File | Change |
| --- | --- |
| `scripts/docs-check.ts` | new: the four modes |
| `package.json` | one script: `"docs:check": "node scripts/docs-check.ts"` (no dependency, lockfile unchanged) |
| `tsconfig.node.json` | `"include": ["vite.config.ts", "scripts"]` |
| the 13 files | written by `move` (see "move") |
| mailbox | `plan.md`, `report-r1.md`, `record.md`, `evidence/*.txt` |

No ESLint change: `src/**` is the only place with import restrictions, and the script gets `process`
from `import process from 'node:process'` (the config's `globals.browser` has `console` but not
`process`). No Prettier change: `scripts/` is formatted by the existing config. If lint or tsc
still objects to something in `scripts/`, I stop and ask rather than touch the config (A2).

## The script, `scripts/docs-check.ts`

One file, type-stripping-safe (no enums, namespaces or parameter properties; `import type` for
types; `.ts` extensions are not needed as it imports only `node:` modules). Each mode's function
carries a `// (Phase 4.2 only)` comment and the usage text marks them `(Phase 4.2 only)`; the
`docs:check` npm script has no marker. Exit code 0 = pass, 1 = any failure; every failure is
printed (one per line, prefixed by check name), not just the first. Output is UTF-8, `\n`.

### Shared pieces

- `readPinned(name)`: `execFileSync('git', ['show', '892f1b8:.claude/<name>'], { encoding:
  'buffer', maxBuffer })`, then sha256 of the bytes, prefix compared with the constant; a
  mismatch throws "pinned source differs: stop" before anything else runs. Every mode that touches
  the old text goes through it, so no mode can read the working tree's copy. Lines: decode UTF-8,
  split on `\n`, drop the final empty element; the blob has no `\r`, and I strip `\r` from any
  working-tree file read (trap 5).
- `writeFile`: `writeFileSync(path, text, 'utf8')`; the strings are built with `\n` and no BOM.
- `MAP` (used by `move` and the inventory modes): a hand-copied constant, one entry per row of the
  brief's two tables: `{ src: 'C' | 'G', from, to, label, target, half }`.
- Row **label check**, used by both `move` and `line-proof` on their own copy of the map: split the
  label on `…` and unescape `\|` to `|`; the old row's first line must contain every piece, in
  order. (Row C:555's label has `\|`; row C:119's label starts with a backtick and ends mid-span.)
- `READ_WHEN` constant (13 lines, verbatim from the A brief), used only by `move`.
- Git helpers via `execFileSync` with argument arrays (`merge-base`, `ls-tree`, `show`), never a
  shell string.

### `move` (Phase 4.2 only)

1. Read both pinned files (guard), assert line counts 2160 / 1347, label-check every `MAP` row,
   assert the rows of each source tile `1..N` exactly (contiguous, no gap or overlap).
2. For each of the 13 targets build the text:
   - `spec/<name>.md`: `# Spec — <Name>`, blank, read-when, blank, then for each present half in the
     order Design, Engine rules, To fold: a blank line (unless the previous line is already blank),
     the heading, one blank line, then the half's rows. Within a half, rows are in old order (one
     source file per half, so sorted by `from`).
   - `CONVENTIONS.md` / `VISION.md`: the rows in `MAP` order (VISION: GAME_DESIGN 1–71 then
     1276–1283); old line 1, then the read-when insertion (A5), then the rest.
   - `OPEN_QUESTIONS.md`: `# Open questions`, blank, read-when, blank, then 1284–1347.
3. **Separator rule (A4):** nothing is inserted between two rows; a row's text is its lines each
   followed by `\n`, copied byte for byte (never trimmed). The only inserted lines are the title,
   the read-when line and its blank lines, and each half heading with its blank lines.
4. `mkdirSync('.claude/spec', { recursive: true })`, write the 13 files, print `sha256  path` for
   each (this is the determinism evidence). `GAME_DESIGN.md` is not touched.

### `line-proof` (Phase 4.2 only)

Independent of `move`: it shares no map constant, no assembly code and no read-when constant with
it (A3). It reads the pinned files (guard), then:

1. **Parse the map from `phases/4.2/brief.md`:** the two tables under `### CONVENTIONS.md (2160
   lines)` and `### GAME_DESIGN.md (1347 lines)`, cells split on unescaped `|` and `\|`
   unescaped. Also parse the "Size after 4.2-A" column of the Target layout table, and the
   read-when table from `phases/4.2/A/brief.md` (strip the backticks).
2. **Map checks:** rows tile each file exactly; each row's first line contains its label (same
   rule as above, its own implementation); each target is one of the 13 and each half is valid
   (`—` only for the three halfless files, and a halfless file's rows have no half).
3. **Expected files:** for each target, an array of expected **lines** (title, blank, read-when,
   blank, half blocks with the same separator rule, row lines taken from the pinned arrays). `move`
   builds strings by joining row slices; `line-proof` builds line arrays row by row, so a bug in
   one assembly is not repeated in the other.
4. **Multiset check:** non-blank lines with trailing whitespace stripped. Old two files vs the
   13 files read from the working tree (`\r` stripped, UTF-8), minus the allowed additions
   (each spec file's title, every file's read-when line, the half headings, `# Open questions`).
   A difference is printed as `line  old×n  new×m`.
5. **Placement check (exact):** for each of the 13 files, actual lines vs expected lines, whole
   lines, blank lines and trailing whitespace included; also that the file ends with exactly one
   `\n`. A difference prints the first differing line number, both versions, and which map row
   and half that line should belong to. Also fail on an extra file in `.claude/spec/`.
6. **Report (always printed):** per old file, line and non-blank counts; per new file, rows-only
   bytes and whole-file bytes, and the brief's table size next to the rows-only figure with
   `MATCH`/`DIFF` (equal when `round(bytes / 100) / 10` equals the table value). `DIFF` is
   informational, not a failure (A10): the table is a measurement, the two checks above are the
   proof. The first line of the output states pass/fail per check.

### `inventory-skeleton <slice>` and `inventory <slice>` (Phase 4.2 only)

- `SLICES` constant (the brief's per-slice file table): B no spec files; C creatures, run,
  progression, store, saves; D effects, responses, statuses; E combat, scripting; F `CONVENTIONS.md`,
  `VISION.md`, `OPEN_QUESTIONS.md`; and the other files (B: `content/*.md`, `specializations/*.md`,
  `species/species-locked.md`; F: `CLAUDE.md`, `ROADMAP.md`, `WORKFLOWS.md`). The per-slice table
  is printed by `inventory-skeleton` (stderr, with the counts).
- **Unit extraction** `unitsOf(lines)`: the kickoff's rule, with fences as `^\s*```` toggles (fence
  lines and their contents are never units): a heading `^#{1,6}\s`, a top-level `- ` item, or a
  line that is non-blank, starts at column 0, is not `>`, `|` or `---`, and follows a blank line
  or the top of the file. One unit per line (a `- ` item after a blank line is counted once).
  The label is the first line with markdown markers stripped, trimmed, cut at 70 characters with
  `…`, `|` escaped as `\|`.
- **Assertions made on every inventory run**, before the slice is looked at: CONVENTIONS = 261 and
  GAME_DESIGN = 262 units; every pinned unit falls in exactly one map row; the units of C, D, E
  and F's pinned files sum to 523 with no unit in two slices. (Done as a single `assertUnitPartition`.)
- **Sources of a slice:** pinned units whose row's target is one of the slice's spec files (ids
  `C:<line>`, `G:<line>`), plus every unit of its other files at `base = git merge-base HEAD main`
  (A9): the glob is expanded with `git ls-tree -r --name-only <base> -- .claude/<dir>` (one level,
  `.md` only; `_species-backlog.md` is not in B's list), content read with `git show <base>:<path>`
  (never the working tree). Ids are `<path>:<line>` with `<path>` relative to `.claude/` (A6).
- **`inventory-skeleton <slice>`:** stdout is the inventory table, header and separator in the brief's
  six columns, one row per unit in old-file order (pinned files first, then other files), `Unit`
  and `Old label` filled, the rest empty. stderr: counts per source and the total, and the base.
- **`inventory <slice>`:** reads `phases/4.2/<slice>/inventory.md` from the working tree (the only
  working-tree read besides the anchor targets), finds the table with the six-column header, and
  checks every row:
  1. every unit of the slice is in exactly one row (missing and repeated are reported separately);
  2. no row names a unit outside the slice (reported as "belongs to slice X" or "not a unit");
  3. `Fate` ∈ `kept | rewritten | merged | moved | dropped`;
  4. `New home` is one or more backticked `file#anchor`, comma-separated, each file existing under
     `.claude/` in the working tree and each anchor resolving there; blank only for `dropped`
     (and checked if present, A13);
  5. `Reason` non-empty for every fate but `kept`;
  6. the row's `Old label`, normalised (markup stripped, lowercased, whitespace collapsed), is
     contained in the unit's normalised first line (A7). This is also what makes a stale base fail
     (below).
  7. exactly six cells per row.
  Prints the counts checked and the base commit.
- **Stale base:** the unit set is recomputed at the current merge-base on every run. If `main`
  moved a B or F source file, its line numbers and labels change, so rows 1, 2 or 6 fail; the
  check never passes on shifted lines.
- **Anchor resolver** `resolveAnchors(markdownLines)` (built once, reused by 4.2-G): skip fenced
  lines; for each heading, take the text after `#`s, drop a trailing `#` run; for inline markup:
  `[text](url)` becomes `text`, backticks are removed (content kept), `*` and `**` removed, HTML
  tags removed; lowercase; remove every character that is not a letter, digit, mark, space, `-` or
  `_` (Unicode-aware); each space becomes `-` (so `a — b` becomes `a--b`); the n-th repeat of a slug
  gets `-<n-1>`. Returns the set of valid anchors. Table cells are split on unescaped `|` only.

## Mechanism → the test that fails with it removed

Run in a scratch clone in the session scratchpad, outside the repo: `git clone` of the repo, `git
branch main origin/main`, then my uncommitted `scripts/docs-check.ts`, `package.json`, and the 4.2
briefs copied in. Faults are applied by a scratch script (not kept in the repo); each run's output
goes in `evidence/`. For each fault I state the check expected to fail; the report says whether it did.

| Mechanism (every site) | Fault planted | Expected to fail |
| --- | --- | --- |
| Pinned-source guard (`readPinned`, the single site all four modes use) | wrong sha prefix in the constant | all four modes stop with the "pinned source differs" message, before output; one run per mode, for each of the two blobs |
| Verbatim row copy in `move` | `move` trims trailing whitespace (patched in the clone) | `line-proof` placement check (not multiset) |
| `line-proof` multiset check | a line deleted; a line duplicated; one byte changed inside a row | multiset **and** placement |
| `line-proof` placement check (order) | two rows swapped within a file | placement only (multiset cannot see order) |
| placement (half) | a row moved to the wrong half of its file | placement only |
| placement (file) | a row moved into the wrong file | placement only (the global multiset is unchanged) |
| separator rule, inside a row | a blank line dropped inside a row (C:1021–1023's neighbours, for example); a trailing space trimmed | placement only; shown with the multiset passing |
| Added-lines allowance | a read-when line missing / a half heading missing | multiset reports it as a missing allowed addition; placement fails |
| Map tiling check | a line range typo in the clone's `phases/4.2/brief.md` (gap, then overlap) | `line-proof` map check; `move` is unaffected (it uses its own `MAP`) |
| Independence of the two maps | a typo in `MAP` inside the clone's script | `move` stops on its label or tiling check; if the typo keeps both valid (shifted equally), `line-proof` placement catches the divergence from the brief |
| Row label check | a wrong label in the brief's table | `line-proof` map check |
| Stray file | an extra `.claude/spec/x.md` | placement check |
| Unit rule + 261/262 assertion | change the paragraph rule (parser-style, no "after a blank line") in the clone | the 261/262 assertion stops every inventory mode |
| 523 partition | drop one row from the slice table in the clone | the partition assertion |
| `inventory` checks (hand-made inventories for slice D, generated from the skeleton by a scratch script then edited): | | |
| unit missing | one row deleted | rule 1 |
| unit twice | one row duplicated | rule 1 |
| unit of another slice | a slice-E unit added | rule 2 |
| unknown fate | `fate = replaced` | rule 3 |
| New home anchor missing | `spec/statuses.md#nope` | rule 4 |
| non-`dropped` without New home | blank | rule 4 |
| non-`kept` without Reason | blank | rule 5 |
| wrong label | label changed | rule 6 |
| passing inventory | full table, including the brief's example row (`D`: C:349, needs a `###` heading `DoT and Regen from the applier's snapshot` in the clone's `spec/statuses.md`, added in the clone only) | exit 0 |
| anchor resolver | New homes covering inline code (`` ### `TriggeredDef.stacks?` flag ``), punctuation, an em dash, a repeated heading (`-1`, `-2`), a heading inside a fence (must not resolve) | pass for the real ones, fail for the fence one and for the wrong suffix |
| Stale base (B) | a commit on the clone's `main` that edits `content/overgrowth.md` after a B inventory was generated | rules 1, 2 or 6 |
| `move` determinism | two consecutive runs | identical sha256 for the 13 files (`evidence/move-determinism.txt`) |
| Packaging | `tsc -b` with `scripts` included | passes; a deliberate type error in the script fails `tsc -b` (shown in the clone) |

## Evidence files (all plain text, in `evidence/`)

`line-proof.txt` (full passing output), `move-determinism.txt`, `unit-counts.txt` (skeleton B to F
with counts, 261/262/523), `planted-faults-line-proof.txt`, `planted-faults-guard.txt`,
`planted-faults-inventory.txt`. No scratch scripts are kept; the report quotes each fault's rule.
Expected counts to compare with the kickoff: B 228 (content 140, specializations 42, locked 46), C
154, D 172, E 87, F's pinned 110. If mine differ, the report says which reading differs and I do
not adjust either.

## Order of work

1. Baseline `npm run test`; save per-file counts (scratchpad).
2. Write the script and the two config lines; run lint, format, `tsc -b`.
3. `npm run docs:check -- move` once, then `line-proof`; second `move` for determinism.
4. Skeletons B to F; the scratch-clone fault runs; collect `evidence/`.
5. All gates, then `report-r1.md` and `record.md`.

## To delete (for the report)

`.claude/GAME_DESIGN.md` (Duncan deletes; `move` never touches it). The scratch clone lives in the
session scratchpad, outside the repo.

## Assumptions checklist

- **A1** No vitest tests are added (test count must equal `main`'s); the mechanisms are proven by the
  planted-fault runs above, with output kept in `evidence/`.
- **A2** No ESLint or other config change is needed beyond `tsconfig.node.json`'s `include`
  (`process` comes from `node:process`). If lint/tsc says otherwise I stop and report.
- **A3** `move` uses its own hand-copied `MAP`; `line-proof` parses the brief's tables (map, sizes)
  and the A brief's read-when table; they share no code. Label rule: `…` splits the label into
  pieces that must appear in order in the row's first line; `\|` is unescaped first.
- **A4** Separator rule: nothing between rows; a blank line before each half heading unless the
  previous line is already blank; one blank line after it; rows copied byte for byte. Placement is
  exact on whole lines.
- **A5** Read-when insertion in `CONVENTIONS.md` and `VISION.md` (old line 2 is blank in both):
  `line 1, "", read-when`, then the old blank line 2 is the right-hand blank. A literal "blank
  on each side" would leave two blank lines in a row. Decide at the plan review if you want the
  literal version.
- **A6** Unit ids use paths relative to `.claude/` (`content/overgrowth.md:12`). The skeleton table
  goes to stdout and its counts and base to stderr, so `> inventory.md` stays clean. `Decided in`
  is left blank by the skeleton.
- **A7** `inventory` checks that each row's `Old label` (normalised) is contained in the unit's
  first line; this is what makes a stale base fail on shifted lines.
- **A8** `New home`: backticked `file#anchor` entries, comma-separated, file relative to `.claude/`,
  read from the working tree; the resolver follows GitHub's rules as stated above (markup
  stripped, `_` and `-` kept, other punctuation removed, `-n` suffix on repeats). Known gap: no
  handling of HTML entities or emphasis nested inside code.
- **A9** The base is `git merge-base HEAD main` with no fallback to `origin/main`: if `main` does not
  exist the mode stops. In the scratch clone I create the local `main`.
- **A10** The size comparison in `line-proof` is reported (`MATCH`/`DIFF`) but does not fail the run.
- **A11** `line-proof` reads the 13 files from the working tree (stripping `\r`) and expects exactly
  the files in `.claude/spec/` that `move` writes (an extra file fails).
- **A12** The npm entry is `node scripts/docs-check.ts`; Node 24 and 22.22+ strip types without a flag
  (a one-line experimental warning may appear on 22).
- **A13** A `dropped` row's `New home`, if present, must still resolve (B names where a duplicate
  lives).
- **A14** Fences are detected as lines matching `^\s*```` (the old files have indented fences inside
  list items); this gives exactly 261 / 262.
- **A15** Only the first table in `inventory.md` with the six-column header is read; other
  text in the file is ignored.
