# 4.6-B: the widened comment check on the pre-sweep tree

`npm run docs:check -- comments`, patterns 21-27 added (`scripts/docs-check/comments.ts`), run on the
tree before the sweep (every other 4.6-B change is in). The check is red on this tree until the
sweep: 14 problems, all of them the new patterns; patterns 1-20 report nothing.

Line numbers are the current tree's. Review sites are `phases/4.6/review.md` V12.

## The 14 hits

| # | File:line | Pattern | Text | In the review's list? | Sweep action |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/engine/actions.ts:4` | 22 moved from | "the executors, moved here from combat.ts" | V12 `actions.ts:4` | fixed in the sweep |
| 2 | `src/engine/actions.ts:774` | 22 moved from | "the executors, moved here from combat.ts." | V12 `actions.ts:774` | fixed in the sweep |
| 3 | `src/engine/conditions.ts:141` | 23 first consumer | "is the first real consumer, via conditional-damage-bonus" | V12 `conditions.ts:134-141` | fixed in the sweep |
| 4 | `src/engine/effect-types.ts:108` | 24 existing behaviour | "`flat` is the existing implicit behavior, made explicit" | V12 `effect-types.ts:108` | fixed in the sweep |
| 5 | `src/engine/effects.ts:574` | 24 existing behaviour | "'flat' is the existing implicit behavior, made explicit" | the kickoff names it with `effect-types.ts:108` (the review's `effects.ts:322-324` is hit 6) | fixed in the sweep |
| 6 | `src/engine/effects.ts:352` | 25 importers keep working | "from THIS module keeps working unchanged" | V12 `effects.ts:322-324` (the line moved) | fixed in the sweep |
| 7 | `src/engine/resolution.ts:924` | 21 legacy path | "as the legacy cast path" (the phrase wraps over two lines) | V12 `resolution.ts:915-916` | fixed in the sweep |
| 8 | `src/engine/resolution.ts:1086` | 21 legacy path | "keeps the legacy cast path's association" | V12 `resolution.ts:1077-1078` | fixed in the sweep |
| 9 | `src/engine/resolution.ts:1366` | 21 legacy path | "can replay the legacy cast path on the same primitive" | V12 `resolution.ts:1350` | fixed in the sweep |
| 10 | `src/state/store.ts:1` | 26 file position | "src/state's first file" | V12 `store.ts:1` | fixed in the sweep |
| 11 | `src/data/traits/starters.ts:59` | 27 the new code span | "targeted at the new `all-allies` ResponseTarget" | V12 `traits/starters.ts:55` | fixed in the sweep, after the descriptions change |
| 12 | `src/data/traits/overgrowth.ts:124` | 27 the new code span | "the new `all-allies-of-species` ResponseTarget" | V12 `traits/overgrowth.ts:116` | fixed in the sweep, after the descriptions change |
| 13 | `src/engine/__golden__/golden-shieldbarer-starter.fixture.ts:3` | 27 the new code span | "targeted at the new `all-allies` ResponseTarget" | **no** | provenance (it records that the target was new when the fixture was written): fixed in the sweep, listed. A golden fixture, so a comment-only edit that `comment-proof` must accept |
| 14 | `src/engine/spell-effects.test.ts:1` | 21 legacy path | "BYTE-IDENTICAL to the legacy payload path" | **no** | provenance (it names the implementation the effect-list cast replaced): fixed in the sweep, listed |

## Not caught by the check, in the review's list

| File:line | Text | Why no pattern | Sweep action |
| --- | --- | --- | --- |
| `src/data/traits/glimmerdark.ts:134` | "made possible by conditions.ts completing that condition's non-scripting path" | "made possible by" is ordinary English for a dependency | fixed by hand in the sweep; the report lists it as the one V12 hit the check does not catch, with before and after |

## False positives and narrowing

None: every hit is a history comment, so no pattern was narrowed. Seen and left alone, because no
pattern matches them: `src/engine/rng.test.ts:68,69,72,75` ("the legacy createSeededRng API", a name
for an old API that the test pins) and the `spell-effects.test.ts` identifiers (`legacyCast`,
`LegacySpell`, `legacyPayload`: identifiers are not read by patterns 21-27, and the file's own header
is hit 14).

## Pattern fit

| Pattern | Regex | Real hits it covers |
| --- | --- | --- |
| 21 | `/\blegacy\s+(?:\w+\s+)?path\b/` | 7, 8, 9, 14 (`\s+`, so the wrapped hit 7 matches) |
| 22 | `/\bmoved here from\b/` | 1, 2 |
| 23 | `/\bfirst real consumer\b/` | 3 |
| 24 | `/\bexisting implicit behavio(?:u)?r\b/` | 4, 5 |
| 25 | `/\bkeeps?\s+working\s+unchanged\b/` | 6 |
| 26 | `/'s first file\b/` | 10 |
| 27 | ``/\b[Tt]he new `/`` | 11, 12, 13 |

Patterns 21-27 read comments and titles, not string literals (`comments.test.ts` pins that a literal
holding "the new `x`", "the legacy cast path" or "moved here from" passes).
