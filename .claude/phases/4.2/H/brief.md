# 4.2-H — Code comments: the context diet for `src/`

Phase brief: `.claude/phases/4.2/brief.md`. Loop: normal. Golden policy: **byte-identical** for
4.2-H1 and 4.2-H2 (4.2-H3's is under `## Split`); their `src/` diff is comment-only, proved by the `comment-proof` mode this slice adds (4.2-G's proof was a
one-off script, not committed). Decided with
Duncan at the 4.2-G kickoff (2026-10-11). Runs after 4.2-G merges.

## Why

Agents read `src/` as much as the docs, and its comments carry the same weight the docs did. On
2026-10-11, across 401 files and about 8,750 comment lines: ~330 lines cite plan-assumption numbers
("ASSUMPTION 14"), ~660 a phase ("Phase 4 Slice C"), ~625 a 4.1 slice id, ~105 a PR, ~130 say
"locked"; provenance sits in about 270 files. Most of the stale comments the 4.2 verify rounds found
were comments that restated a spec rule or narrated history.

## Scope

- Bring every comment in `src/` to `CONVENTIONS.md#comment-why-not-what` (rewritten at the 4.2-G
  kickoff): provenance stripped; a restated spec rule replaced by its anchor plus whatever this code
  adds; history ("was X before") dropped. The *why* a provenance tag carried is kept: an
  `ASSUMPTION 14 -- living-adjacency, because …` comment keeps the "because".
- The mechanical part (provenance tags and parentheticals) may be done by script; the rest is by
  hand. The plan lists the patterns the script removes and shows a sample of each.
- Golden fixtures: setup, arithmetic and random draws stay (`CONVENTIONS.md#two-tier-golden-discipline`); only provenance goes.
- `// ASSUMPTION:` markers tied to a live open question stay. On 2026-10-11 there are two, and
  neither qualifies: `data/spells/index.test.ts:21` records a plan's reading of a brief, and
  `state/store.ts:104`'s default seed is settled by `spec/store.md#newgame` (the seed comes from
  `src/app`). Both become plain why-comments, keeping the sharp edge each one names.
- **Decided at the kickoff (Duncan, 2026-10-11):**
  - **Test titles are in.** About 284 `describe`/`it`/`test` titles in 150 files carry provenance;
    they follow the same rule (`CONVENTIONS.md#comment-why-not-what`), `comment-proof` masks each
    changed title the plan lists, and `comments` scans titles as well as comments.
  - **The hand pass is bounded.** By hand: every comment block the mechanical pass touches (the
    sentence must still read, and its *why* survive), every history marker ("before this", "was
    X", "no longer", "previously"), the quotations below and the residue under "Known from 4.2-G's
    review". A restated rule elsewhere is fixed when found, not hunted.
  - **Forward phase pointers cite the rule.** "Inert until Phase 8", "Phase 7 replaces them" (38
    lines) cite the rule that names the phase (`CONVENTIONS.md#comment-why-not-what`), and
    `comments` fails on every `Phase <n>`, with no forward exception.
  - **`vite.config.ts` and `eslint.config.js` are in** (4 provenance lines): swept, scanned by
    `comments` and covered by `comment-proof`. `scripts/` is not: its tests plant provenance on
    purpose.
- **A quotation beside an anchor is the target's own words, or it goes** (Duncan, at the 4.2-G PR
  review). 4.2-G's rewrite swapped the old doc name for an anchor and kept the quotation after it,
  so about 40 comments and one test title now quote old `species-locked.md`, `GAME_DESIGN` or
  `CONVENTIONS` wording the condensed target doesn't contain
  (`phases/4.2/G/evidence/review-quotations.txt`, a regex scan: re-derive the list with the
  scanner). Where the target holds the fact in other words, the comment keeps the anchor and drops
  the quote; where it doesn't hold it at all, that's a Spec question, not a quote to keep. A test
  title may change for this (the proof masks titles only where the plan lists them).
- **A comment scanner and two modes in `docs:check`** (Duncan, at the 4.2-G PR review). 4.2-G
  committed none: its rewrite and its comment-only proof were one-off scripts, and `citations` reads
  whole files. Build the scanner on TypeScript's scanner, not a line regex (`//` occurs in strings
  and URLs), in `scripts/docs-check/`, and on it:
  - `comments`, blocking in CI: fails on the provenance patterns in `src/` comments. The plan lists
    the patterns; golden fixtures are not exempt.
  - `comment-proof <base>`, run by hand: for every `src/` file changed since `<base>`, comments
    stripped (TypeScript printer, `removeComments: true`), compares the two prints byte for byte,
    and fails on a changed pragma comment (`@ts-…`, `eslint-…`, `/// <`, ESLint's `/* eslint … */`,
    `/* global … */` and `/* exported … */`, the bundler's `#__PURE__` annotations): its text, or
    the token it sits before, since a moved pragma governs different code. Listed test titles may be
    masked. It reads `<base>` with `git show`, so it never runs in CI. Every later comment-only
    change reuses it.
- **`citations <file>…`** (Duncan, after this kickoff): `citations` also takes file paths and
  checks exactly those files, `phases/` included, by the rules it applies to a living doc (every
  anchor resolves; no old form, no label form). With no paths it does what it does today, and CI is
  unchanged. It exists so a step file is checked before it goes out: the 4.2-H kickoff went out with
  a label-form reading list, because `citations` skips `phases/`.

Out of scope: any code change; comments that are correct but long (length alone is not a finding).

## Split

Built as three slices, in order, each with its own mailbox, PR and record (Duncan, at the plan
review):

- **4.2-H1, the tooling:** the scanner, `comments` (not in CI yet: it fails on `main` until
  4.2-H2's sweep), `comment-proof <base>` and `citations <file>…`, each with its tests. No `src/`
  change. Everything the plan and its review put in `scripts/` is H1's: the plan's module changes
  and test table, plan-review fixes 2, 3, 5–7 and 10, D1 and D2 as they bear on the check, and
  A1–A11 (Duncan, at the 4.2-H1 kickoff), so 4.2-H2 never changes the tool that proves it.
- **4.2-H2, the sweep:** every comment and test title in scope brought to
  `CONVENTIONS.md#comment-why-not-what`, proved by `comment-proof origin/main` with 4.2-H1's tool
  from `main`; `comments` added to `deploy.yml`. It takes the plan's mechanical rewrite and hand
  pass, plan-review fixes 1, 4, 8, 9, 11 and 12, D3 and A12–A16.
- **4.2-H3, the names:** provenance stripped from `src/` file names (127 files carry a slice id:
  121 with a digit, such as `golden-h2b2-reapply`, plus the three `golden-e-…` pairs; most are
  golden fixture/test pairs), identifiers (`PHASE_4_PLACEHOLDER_BALANCE_CONFIG`, `B5_FIXTURE`) and
  fixture data ids (about 100 trait, script and status ids in 46 files, such as
  `'h2b2-reapply-p1'`; Duncan, at the 4.2-H3 kickoff), each renamed by hand for what it pins or is
  for, since stripping the id alone collides (`golden-b2-silenced-refuses-granted-cast` and
  `golden-f3-silenced-refuses-granted-cast`; `'b6-always-wait'` and the shared fixture script
  `'always-wait'`). Comment mentions of the old names follow.
  - **Golden policy: deliberate changes, one kind only.** A fixture data id appears in expected
    events (`effectId: trait.id`), so a golden whose fixture renames one changes in those ids and
    nothing else. The corpus digest is unchanged.
  - **Proved by** a rename map plus each file's content identical except import specifiers, the
    renamed identifiers and the renamed ids (a `comment-proof` option, the plan's to design), and by
    every fixture's exports deep-equal to `main`'s under the id map.
  - `comments`, or a sibling mode, also fails on a phase or slice id in a `src/` file name or
    identifier, so a new name can't copy the old pattern.

This folder keeps the brief and the pre-split kickoff, plan and plan review, which each slice's
kickoff builds on.

## The PR must prove

- Comment-only: `comment-proof origin/main` passes on the branch, and fails on a planted code
  change and a planted pragma.
- The quotations: before/after counts of a quotation beside an anchor that isn't in the target's
  section, the after count zero (the plan says whether `comments` checks it).
- The `comments` mode passes, fails on a planted tag of each pattern, and runs in CI.
- Before/after counts of each provenance pattern, in comments and in titles, the after counts
  zero.
- Every changed test title, old → new, and the test count unchanged file by file.
- `citations <file>…` passes on this slice's own `kickoff.md`, and fails on a planted label form
  and a planted unresolved anchor in a scratch file under `phases/`.
- A sample of hand rewrites (at least one per `src/` folder) showing the *why* kept.

## Decided, not built

- `CONVENTIONS.md#comment-why-not-what`: file names, identifiers and fixture data ids follow the
  same rules (no phase, slice or plan ids), and the check covers file names and identifiers
  (4.2-H3's PR review).
- `comments` catches the shapes it misses today: a lower-case `pre-` before a slice name
  (`pre-Slice-B`), `Slice-<X>` with a hyphen, a plan-item id with a hyphen (`B-2`), and review
  words without "fix" or "round" (`design-review`, `(nit, review)`, `Nit (review)`); and a bare
  suffixed plan-item id (`H2b2`): pattern 8 becomes `\b[A-I]\d[a-z]\d?\b`.
  `--quotations` also catches a quotation that ends within four words before its anchor
  (4.2-H3's PR review).
- No string literal in `src/` carries provenance: the fixture data ids are renamed (`## Split`),
  and the six strings that carry a provenance word are reworded: the
  `state/rewards.ts` error message ("before Phase 8") with the `rewards.test.ts` regex that matches
  it, the three `state/balance-sim.ts` report strings ("ASSUMPTION 22", "ASSUMPTION 108") with
  `balance-sim.test.ts`'s assertion, and `engine/corpus-coverage.test.ts`'s reason string
  (4.2-H3's PR review).
- `CONVENTIONS.md#corpus-digest`: the committed fixture is exactly `renderFixture`'s formatted
  output for its own rows (header, body template and formatting), and the default test run checks
  that, so the two can't drift apart (4.2-H3's PR review).

## Known from 4.2-G's review

- At this slice's kickoff, the design agent sets `ROADMAP.md`'s Phase 4.2 line to "Done: 4.2-A to
  4.2-G" (G's kickoff did the same for F).
- The citation rewrite left residue a hand pass should clean while it's there: a dropped
  possessive (`` `content/overgrowth.md#the-overgrowth-biome-1-floors-110` own table ``,
  `` per `spec/responses.md#flat-mode` own named example ``), a label echoed after its anchor
  (`` `content/overgrowth.md#swarmhive-striker` Swarmhive Striker ``,
  `` (`CONVENTIONS.md#corpus-digest`, corpus digest) `` in the corpus fixture header and its
  template in `corpus-digest.test.ts`, which must change together), a file name after it
  (`` (`specializations/sorcerer.md#starter-glyphmoth-seer` / sorcerer.md) ``), and old rule
  numbers beside an anchor (`` `spec/responses.md#perform-action` B2 rule 2 `` in
  `engine/resolution-types.ts`).
- `ASSUMPTION (Slice F)` blocks in `data/species/starters.ts` quote the old docs at length; the
  4.2-G fix round rewrote the affinity one only.

## Known from 4.2-H2's review

- `SORCERER_STARTER_TRAIT`'s doc comment in `data/traits/starters.ts` has one 135-column line
  ("through fusion, whichever parent the Seer is. … fight-setup prepends"), left by the sweep's
  rewrap. Rewrap the block at the width of the lines around it (about 100); the proof strips
  comments, so it costs nothing under 4.2-H3's.
