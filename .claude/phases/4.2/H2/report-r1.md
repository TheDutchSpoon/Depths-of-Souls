# Report — Phase 4.2 — Slice H2: Code comments, the sweep — Round 1

Built to the approved plan (`plan.md`, approved in `plan-review.md` Round 1 with fixes 1-9 and decision D1). Nothing is
committed and nothing is deleted. Evidence is in `evidence/` and cited by path below.

## Result

`npm run docs:check -- comments` passes (it reported 2,962 problems in 343 files on `main`), and it runs in `deploy.yml`'s `test`
job after `budgets`, before `npm run test`, with `scripts/docs-check/ci.test.ts` asserting it. `comment-proof origin/main
--mask evidence/mask.json` passes on 346 changed files. Golden policy: byte-identical. The tool was not touched.

352 tracked files differ from `origin/main` (0126c4a, unchanged during the build): 346 under `src/`, `vite.config.ts` and
`eslint.config.js`; `deploy.yml`; `ci.test.ts`; and the kickoff, plan, plan review and `ROADMAP.md` line already committed on this branch.

## Gates

`evidence/gates.txt` (Node 24.19.0, npm 11.12.1):

| Gate | Result |
| --- | --- |
| `npm run test` | 210 files, 1,682 tests (1,681 passed, 1 skipped) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 620 citations in 436 files |
| `npm run docs:check -- budgets` | 12 files, 0 over budget |
| `npm run docs:check -- comments` | PASS, 6,918 comments and 1,627 titles in 403 files |
| `comment-proof origin/main --mask evidence/mask.json` | PASS, 346 changed files |

`citations <file>…` on `report-r1.md` and `record.md` passes (below).

**Test count, reconciled file by file against `main`** (`evidence/test-counts.txt`): a `vitest run --reporter=json` of a clean
checkout of `main` and of the branch: 210 files, 1,682 tests each, and 0 files whose count differs. `ci.test.ts` still has its two
tests (their assertions grew; `docs-check` keeps H1's count). No test under `src/` was added or removed; 343 title parts changed.

## Golden policy

**Byte-identical**, held three ways:

- **Fixtures** (`evidence/fixtures-compare.txt`): the 123 changed fixtures (122 golden fixtures and the corpus digest fixture) were
  imported from `main`'s tree and from the branch's, in a scratch Vitest test, and every export compared: 123 EQUAL, 0 differ
  (functions by their source with comments removed). The list is the file's own. This is the imports method, not a read of the diff.
- **Only comments changed in them**: `comment-proof` passes with the mask, which lists only title literals and one template part.
  A golden's history is dropped and its arithmetic kept (A13), e.g. "(Before H2a: 20, Defence ignored.)" and "(At the old 20%: 20 - 10 = 10.)".
- **Corpus digest**: unchanged. The fixture's header comment lost the echoed label and the same text was written into
  `renderFixture`'s template (the one non-title mask entry). `npm run corpus:update` was **not** run in the repo. Per D1 it was run in
  a scratch clone of the finished branch: the fixture came out byte-equal (`git diff --exit-code` exit 0, `cmp` equal;
  `evidence/corpus-render.txt`). The corpus digest test passes in `npm run test`.

## The mechanical script

`evidence/mechanical-rules.txt`: rules M1-M6, the token grammar and the printed table per rule and folder; 1,182 edits
(M1 350, M1d 106, M2 266, M3 122, M4 64, M5 274 title edits; no comment line was left empty, so M6 had nothing to delete). Before any hand edit,
`comment-proof` passed on the mechanical diff alone (325 files, 274 mask entries) and the residue was 686 problems in 133 files.
The script is in the scratchpad, not the repo.

## The hand pass

- **Bare ids** (`evidence/bare-ids.md`, fix 1): 583 lines in 150 files had one after the script; 332 were rewritten (each row old -> new),
  259 lines in 45 files are kept: derivation labels and test-data names (`R1` is round 1, `E1`/`M2`/`N1` are creatures, `G1` a
  grant, `L1->L2` levels) and the design targets `T1`..`T5`, which `CONVENTIONS.md#balance-simulator` defines and the simulator prints as
  report rows. A grep of `\b[A-Z]\d\b` is the check; `comments` does not prove them gone.
- **History markers** (`evidence/history-markers.md`, fix 2, A13): the widened word list (no longer, used to, previously, before this,
  was ..., now ..., renamed, replacing, reworked, originally, the old, pre-/post-<id>, regression, unchanged, byte-identical, legacy,
  earlier draft): 734 hits after the script, 484 rewritten, 300 kept with the reason per marker (a live invariant, a scenario step, a
  term of the code).
- **Forward pointers** (`evidence/forward-pointers.md`, D3, fix 4): all 38 lines. The demo harnesses cite
  `CONVENTIONS.md#every-feature-phase-ships-a-demo`; the nine inert perks each cite their own entry
  (`specializations/sorcerer.md#wit-mastery` … `#true-wit`, `specializations/shieldbarer.md#shield-specialist`), with the `id:` on the next line
  matching the slug and "(gem system)" / "(equipment system)" kept; the rest cite `spec/creatures.md#fusion`, `#gems-as-items`,
  `#equipment`, `#summoning-at-the-soul-altar`, `spec/run.md#facilities`, `spec/saves.md#the-stores-plain-data-boundary`,
  `spec/progression.md#inert-perks`, `spec/scripting.md#scripts-and-rules`. Titles carry no anchor.
- **Quotations** (`evidence/quotations.txt`): 47 comments and 1 title before (the kickoff's 48, A17); 0 after, so no false positive to show.
- **Titles** (`evidence/retitled-tests.md`): 343 old -> new; no new duplicate full name (main 0, branch 0; the proof checks it too).
- **Residue** (`evidence/residue.md`): each brief item with the grep before and after, and the two `// ASSUMPTION:` markers, both now plain
  why-comments (`spells/index.test.ts` keeps the sharp edge, checked against `dedupKey`; `store.ts` cites `spec/store.md#newgame`).
  The flat-mode "own named example" was already gone from `src/` before the slice (grep empty on both sides). While reading I found and fixed
  three more of the same kind the tool does not see: `/ sorcerer.md` after an anchor in `species/starters.ts` and `traits/starters.ts`, and
  two dropped possessives (`traits/glimmerdark.ts`, `traits/starters.ts`).
- **Hand rewrites** (`evidence/hand-rewrites.md`): at least one per folder (`app`, `data`, `engine`, `state`, `ui`) and per config, with the
  *why* quoted from both sides.
- **The configs**: `vite.config.ts` cites `CONVENTIONS.md#test-environments` and keeps the catch-all-versus-enumerated `include` trap;
  `eslint.config.js` lost only its provenance label (its citation was already there). Fix 3's "ASSUMPTION 24" has no home: a Spec question.
- **Non-title literals that still carry provenance** (A14, `evidence/non-title-literals.txt`): 6, out of scope as the kickoff says:
  `rewards.ts:52` (the error message, with `rewards.test.ts:179`'s regex, both left alone), three report strings in `balance-sim.ts`
  (`"ASSUMPTION 22 summary"` …) with `balance-sim.test.ts:164`, and a reason string in `corpus-coverage.test.ts:27`.

## Mechanisms and the test that fails without each

| Mechanism | Site | Fails without it |
| --- | --- | --- |
| `comments` in CI | `deploy.yml` `test` job | `ci.test.ts`: deleting the step fails both tests; moving it after `npm run test` fails the order test (`evidence/mutation-check.txt`, run in a scratch clone) |
| The sweep | every scanned folder, comments and titles | `comments` itself; planted tag under each of `app`, `data`, `engine`, `state`, `ui`, `__golden__`, `__corpus__`, `__fixtures__` and both configs, plus a title in six test files: all exit 1 naming the file (`evidence/planted-faults.txt`, fix 9) |
| Comment-only diff | whole tree | `comment-proof` (H1's): a planted code change, a planted pragma change (`@ts-expect-error` -> `@ts-ignore`), a planted unlisted title change and an added file each exit 1 naming the file; the mask is consumed exactly |
| Corpus header and template | the fixture, `corpus-digest.test.ts` | no test in the default run (see Spec questions); the pairing is proved by D1's scratch `corpus:update` |
| Inert-perk comments | `data/specializations.ts` x9 | `citations` fails a mistyped slug; each `id:` matches its slug (checked by grep); `KNOWN_INERT_PERK_IDS` in `specializations.test.ts` still pins the nine ids |

Scratch checks (clones, copies and the script) are outside the repo and are not in the evidence.

## Spec questions

**Living-doc lines this sweep makes stale** (file + line, as of this branch):

- `spec/progression.md` lines 85-87 (`#inert-perks`): quotes the old comment form (`// Inert until Phase 8 (gem system) -- see sorcerer.md`) and says each inert
  perk has "a code comment"; it should cite the entry form (`// Inert (gem system): specializations/<spec>.md#<perk>`). This is the brief's Decided, not built item.
- The lists of docs checks that gain `comments` (the brief's other Decided, not built item), found by grep of `docs:check`:
  `CONVENTIONS.md` lines 285-286 (`#every-pull-request-runs-the-gates`); `workflow/coding-rules.md` lines 47-49 (the gate list);
  `CLAUDE.md` lines 69-75 (`#how-the-spec-is-written`: the `citations` and `budgets` sentences); `workflow/pr-review.md` lines 45-46
  (`#2-install-and-run-the-gates`); `skills/slice-verify/SKILL.md` lines 15-16.
- `ROADMAP.md`, Phase 4.2: "Done: 4.2-A to 4.2-H1" gains 4.2-H2 when this merges.
- `CONVENTIONS.md#comment-why-not-what` says nothing about file names and identifiers; the brief's Decided, not built item for 4.2-H3 stands.

**Questions the docs do not answer** (each fact was dropped from a comment or reworded to what is true now):

1. `CONVENTIONS.md#test-environments` names the Node and jsdom folders but not the default for a new top-level folder (Node unless it renders
   React); the old `vite.config.ts` comment called that "ASSUMPTION 24". The config comment keeps the mechanism (the catch-all `include`), not the default.
2. The coverage rule behind per-creature affinity: the old comments quoted "balance at creature-stamping (affinity is per-creature)" and a
   "Coverage" note (Vitality sprinkled into single-lean species, Endurance/Instinct thin at the lean level). `spec/creatures.md#affinity`
   says an affinity lives on the creature but not that it is stamped to round out a 5-affinity spread, and the content docs list the spread
   (`content/glimmerdark.md#affinity-spread`) without the rule. `data/species/overgrowth.ts:14-19` keeps the sentence; `species/glimmerdark.ts:11-16` now
   states only what the data does.
3. `engine/types.ts` (`DamageDealt.statusId`): the comment said Phase 7 would attribute status damage in combat text. No rule names that consumer
   (`spec/effects.md#consequence-events` names it for `StatModifierApplied` only), so the pointer was dropped. `state/rewards.ts:4` ("the
   save-v1 shape, decided before Phase 5") was history and went.
4. **The corpus header and `renderFixture` have no test tying them together** in the default run (`corpus-digest.test.ts` reads the fixture's
   values on every run, but renders and writes it only in `corpus-update` mode). A one-off edit of one side would leave a header that the next
   `corpus:update` rewrites. The kickoff forbids a new test here; the gap is for the PR review.
5. `CONVENTIONS.md#balance-simulator` defines T1-T5; the report strings in `balance-sim.ts` still print `ASSUMPTION 22` and `ASSUMPTION 108`
   (non-title literals, out of scope: A14). A later slice that may edit strings should reword them.

## Content changes

None. Comments and titles only; no creature, trait, spell or status changed (the fixtures compare equal).

## To delete

- `.claude/phases/4.2/H2/evidence/counts-before.tmp` — a scratch capture of the "before" half of `counts.txt`, superseded by `counts.txt`.
- `.claude/phases/4.2/H2/evidence/planted-faults.tmp2` — a copy made while adding the header to `planted-faults.txt`.

(I do not delete files; Duncan does.)

The scratch clones, the mechanical script and the other scratch files are in the session's scratchpad, outside the repo.
