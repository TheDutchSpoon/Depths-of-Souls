# Report r3 — 4.5-G1: The demo, descent loop and viewer

Built to `handout-r2.md`. Nothing committed, nothing deleted.

## Precondition

`src/app/descendFlow.ts`, `descendFlow.test.ts`, `perkPoints.ts`, `perkPoints.test.ts` and
`registries.ts` are gone from the tree (checked with `ls src/app`). The gates ran on the tree as it
stands, with nothing moved aside.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | pass: 2152 tests, 2151 passed, 1 skipped (as on `main`) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | pass |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS |
| `npm run docs:check -- comments` | PASS |

Test count against round 2: 2151 → 2152; only `descentText.test.ts` changed, 8 → 9. Against
`main`: 1993 → 2152.

Golden policy: byte-identical. `git status` shows only `src/app/descentText.test.ts`,
`src/app/startRun.test.ts` and `.claude/phases/4.5/G1/record.md` modified; nothing under
`src/engine`, `src/state`, `src/data` or `src/ui`.

## Items

**C1.** `startRun.test.ts`: the title is now "the field accepts the largest seed newGame does, and
refuses the next". The body is unchanged.

**C2.** `descentText.test.ts`: new case "a first clear prints the points the outcome carries, not a
fixed figure", on `{ bossDefeated: 'broodmother', bossFirstCleared: true, perkPointsGained: 250 }`,
expecting `` `Defeated ${name}: first clear, +250 perk points` ``. Checked by mutation: with
`descentText.ts` temporarily printing a literal `+100`, the file ran 1 failed, 8 passed (this case
the one that failed). `descentText.ts` was restored afterwards and is unmodified.

**C3.** `record.md`: "Obsolete, to delete" is now "**Deleted:**" naming the five files and where
their rules went; "Not verified" points to `evidence/click-through-r2.md` for the side-heading
line-up and keeps `evidence/click-through-r1.md` for the rest; the test count reads 1993 → 2152.

## Corpus digest

Unchanged; `npm run corpus:update` not run.

## Spec questions

None.

## Content changes

None.

## To delete

Nothing.

## ASSUMPTION

None.
