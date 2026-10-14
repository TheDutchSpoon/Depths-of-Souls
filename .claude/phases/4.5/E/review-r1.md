# PR review r1 — 4.5-E: Spell clean-up and Thorn Volley

Branch `4.5-E`, commit `d932616` ("build"), against `main` at `2bb9851`. Reviews `report-r1.md`,
built to `plan.md` as `plan-handout-r1.md` corrects it.

**Verdict: fixes.** The build is right: the content change, the seed shape, the fixture spells, the
new golden and the corpus attribution all check out, and every number the report gives reproduces.
What's left is comment text: one comment that is false (and false because my plan hand-out told
the agent to write it), and four small cleanups. All are comment-only, so round 2 is cheap and is
proved with `comment-proof` against this commit. Hand-out: `handout-r1.md`.

## Real fixes

1. **Disorient's comment is false** (`src/data/spells/glimmerdark.ts`). It says "Instinct has no
   other status-applying spell". Puppet String (Instinct, Rotcap Hollow, biome 3) applies
   Confusion. This is my mistake: `plan-handout-r1.md` item 4 dictated the sentence and the agent
   copied it. The comment on `main` was true only because Venom Bolt was the other spell it named.
   The true end state: Disorient is Instinct's only status-applying spell before the Rotcap
   Hollow's Puppet String, so it fills a real gap; distinct from Vine Snare by affinity.
   Hand-out item 1.

## Scope and labeling (cleanups, all in the hand-out)

2. **Blinding Flare's dedup neighbours are incomplete** (`glimmerdark.ts`). The dedup key is
   affinity, shape, payload, stat and spellPower (`dedupKey` in `data/spells/index.test.ts`), so
   Blinding Flare (Violence, single, damage, 0.7) sits beside Thorn Lash (1.0) **and** Withering
   Bolt (0.45). The comment names only Thorn Lash; my hand-out picked that wording too. Item 2.
3. **Withering Bolt's dedup sentence implies the rider counts** (`rotcap-hollow.ts`). "Blinding
   Flare (0.7, applies Vulnerability not Burn)": an `apply-status` rider never distinguishes two
   spells under the guard (`dedupKey`'s own comment). The slice edited the line above it. Item 3.
4. **`SPELL_FIGHTS`'s doc comment is stale** (`engine/__corpus__/corpus.ts`): "One fight per spell
   Parts A and B never cast." The slice's own mutation run disproves it for Thorn Volley (dropping
   its fight leaves the "every spell is cast" case green), and my corpus scan finds every one of
   the 13 spell-fight spells cast in Parts A and B (Thorn Volley 68 casts in 53 fights). The slice
   rewrote the list under that comment. Item 4.
5. **`THORN_VOLLEY`'s "why" isn't one** (`data/spells/overgrowth.ts`): "0.45 keeps it under the
   single-target Thorn Lash" is true of every value in the ~50% band, so it doesn't explain 0.45.
   The phase brief's reason is that it is Thorn Lash's area sibling and 45% is "about 50%".
   Item 5.
6. **`record.md`** says the comments "now cite surviving spells or
   `content/overgrowth.md#spell-power-convention`"; three of them drop the reference or cite the
   Rotcore trait instead. Item 6.

Not findings, my calls on the report's questions:

- **Spec questions 1–3** (`core.ts` in `CONVENTIONS.md`, the over-budget file, the stale
  `content/overgrowth.md`): done in this review's doc sync, below.
- **Spec question 4, Poison's coverage** (53 → 22 entries; Part B 11 → 2, Part C 2 → 0, which I
  reproduced): no dedicated fight. 22 generated fights apply it, and the coverage test fails loudly
  if that ever reaches zero. A fight for a status no spell applies would pin content that isn't
  there.
- **Spec question 6** ("Cinder Nova becomes Thorn Volley" in the briefs): no edit. A brief is the
  plan as written, and the sentence reads right as intent.
- **Spec question 5** is decide-point 1.

## Decide-points

1. **The explicit spell-fight seeds are pinned only by the corpus digest, and Silence's and
   Pacify's by nothing.** `workflow/pr-review.md` says a mechanism caught only by the digest is
   unpinned. Mutations: deriving the 13 spell fights' seeds from the index again fails only
   `corpus-digest.test.ts` (Disorient's Confusion rolls); deriving Silence's and Pacify's fails
   nothing, because those fights draw no random number.
   **Recommendation: accept it, no new test.** The seed field is corpus plumbing whose only job is
   to keep digest entries stable when an entry is deleted; the digest is the spec of that property
   and fails exactly when a moved seed changes something. A test of the 15 seed literals would
   restate them. In a fight that draws nothing a seed has no effect, so a moved seed there is
   harmless until the fight starts drawing, and then the digest catches it. Against: it bends the
   letter of the "digest is a tripwire" rule. If you'd rather pin it, the cheapest pin is one
   `corpus-coverage` case that every Part C seed is distinct and listed explicitly, and it goes in
   this round's hand-out.

## Decisions

1. **No test pins the spell-fight seeds** (Duncan agreed with the recommendation): the corpus
   digest is their pin, and Silence's and Pacify's draw-free seeds need none. The hand-out adds
   no test.

## Verified, and how

All in my own clone (`git clone` + worktrees for the branch and `main`), `npm ci` on both, Node
22.22.0; lockfile tools (`vitest` 5.0.3, `tsc` 6.0.3).

- **Gates on the branch:** `npm run test` (JSON reporter) 229 files, 1983 passed, 1 skipped,
  0 failed; `lint`, `format:check`, `build`, `npx tsc -b` clean; `docs:check -- citations` PASS
  (678 in 463 files), `-- comments` PASS (7448 comments, 1737 titles); `-- budgets` CONVENTIONS
  29.1 of 29 KB before my doc sync, 28,998 bytes after it.
- **Test count, file by file:** `main` 228 files, 1982 passed, 1 skipped. The only per-file
  difference is the new `golden-thorn-volley.test.ts` (+1). (`main`'s first run timed out one
  `balance-sim` test at 5 s while lint and build ran beside it; that file alone passes, 78 + 1
  skipped.)
- **The code against the spec:** `THORN_VOLLEY` is exactly the brief's spell
  (`phases/4.5/brief.md#spell-clean-up-and-thorn-volley`), first in `ALL_SPELLS` and in
  `OVERGROWTH_SPELLS`; Silence and Pacify added there (plan decision 1). Every biome-1 affinity
  still has at least three spells (`content/enemy-behaviour.md#three-biome-1-spells-per-affinity`):
  Violence 4, Wit 4, Endurance, Vitality and Instinct 3. The three fixture spells carry the old
  numbers, named by shape. `core.ts` is gone. The PR changes no production file in `src/engine`
  (only tests, goldens, the corpus and the fixtures), and no production engine file imports data,
  state or UI.
- **`golden-thorn-volley`, hand-derived:** I re-derived every hit from `spec/combat.md#damage-formula`,
  `#affinity-advantage` (Violence beats Wit, Vitality beats Violence, Endurance neutral) and
  `#damage-channels-and-the-additional` (level 11, Additional 0): 38.0625 → 38, 30.3375 → 30,
  20.45 → 20; at 0.3: 19 / 18 / 5; at 0.5: 44 / 34 / 25. AOE target order per
  `spec/combat.md#aoe-cast`. Seed inert: changing `SEED` to 1 leaves it green.
- **Golden identity:** every `__golden__/*.fixture.ts` imported on both trees with
  `import.meta.glob`, every export serialised and compared: 144 files, 1336 exports, 5 differ —
  `golden-6v6-scripted` `playerParty`/`enemyParty`, `golden-aoe-cast` `playerParty`, `golden-dot`
  `playerParty` (each equal once the spell objects' `id` and `name` are blanked) and
  `golden-aoe-cast`'s removed `CINDER_NOVA`. Every `expected*` export deep-equal. The three
  fixtures' text diffs are imports, identifiers and header comments only; `golden-6v6-scripted`'s
  derivation keeps 0.5 / 0.3.
- **Corpus digest** (fixture diff, plus my own dump of all 527 / 525 fights on both trees, which
  matches each committed fixture row for row): A 118, B 34 changed; results 190 win → draw, 252,
  254, 298, 460 win → loss; 435 fights have a differing rolled set, every changed fight among them,
  every differing creature Violence or Instinct, no Part A/B seed moved. Part C: Ember Lance (500)
  and Venom Bolt (509) removed; only Thorn Volley's fight (501 → 500) and `sorcerer` (515 → 513)
  changed; every other entry the same hash one or two indexes up; every surviving coverage fight's
  seed unchanged (2001–2008, 2010–2016, 2017, 2100–2108).
- **`sorcerer` sweep** (my own run, seeds 900000–900099, the coverage test's `logOf` comparison):
  Echo, Arcane Might and Spell Focus change the log at all 100 seeds; Clear Mind at none (it
  matters in `sorcerer-silenced`). Every seed is a win.
- **Mutations** (each alone, named tests run, restored): Thorn Volley 0.3 and 0.5 fail
  `golden-thorn-volley`; Thorn Volley appended fails the `index.test.ts` pin; spell-fight seeds from
  the index fail the digest only; Silence/Pacify seeds from the index pass (decide-point 1); fixture
  AOE 0.35 fails `golden-aoe-cast` and `golden-6v6-scripted`; fixture single 0.6 fails
  `golden-6v6-scripted` and `combat.test.ts`; Poison duration 4 and power 0.5 fail `golden-dot`;
  `golden-6v6-scripted` reading `THORN_VOLLEY` fails it (the trap); reading 524 + k fails the
  Silence and Pacify case; the `sorcerer` fight back on Puppet String fails only the digest (a
  coverage-fight content choice, not a mechanism).
- **Live behaviour** (corpus scan on both trees): no creature takes a turn, attacks or casts after
  its own `CreatureDied` without a `Revived`, in any of the 525 fights.
- **Leftover sweep** over `src/` and the living docs for the three ids, names, const names,
  `core.ts`, "core spells", "affinity-generic" and the old entry numbers: `src/` clean;
  `CONVENTIONS.md#effect-carriers-live-in-libraries` and `content/overgrowth.md` stale, fixed below.
- **Mailbox:** step files and `evidence/` only; nothing to delete.

## Docs edited

- `.claude/content/overgrowth.md`: Thorn Volley's entry added under Spells, as built (Violence ·
  every enemy · 45%); the "Core spells" section and its three entries deleted; the "Read this
  when" and Source lines lose the core spells and `core.ts`; the spell power convention's area
  line reads "deals about 50%" (Thorn Volley makes it literal) and drops "the core spells
  included".
- `.claude/CONVENTIONS.md#effect-carriers-live-in-libraries`: drops `core.ts` from `data/spells/`
  (it no longer exists). This also brings the file back under its budget, 28,998 bytes of 29,000,
  so the over-budget the kickoff opened needs no decision now; the next addition takes it over.
