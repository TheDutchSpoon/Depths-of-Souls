# Report — Phase 4.2 — Slice H3: Names — Round 3

Built to `handout-r2.md`. Nothing is committed and nothing is deleted. `origin/main` is still `590d82a`. This round changes `scripts/docs-check/`
(`names.ts`, `tokens.ts`, `comments.ts`, `names.test.ts`), `record.md` and `evidence/`; no file under `src/` changes, no living doc is edited, no rename, no deletion.

## 1. `ASSUMPTION:` in a value literal fails

- `comments.ts` exports `ASSUMPTION_COLON` and passes it to `findNameProblems(root, sourceFiles, patterns, assumptionColon)` beside `PATTERNS` (a value
  import would make `comments.ts` and `names.ts` import each other, so it is a parameter, as `patterns` is). One regex, no second copy.
- `names.ts`: a new `valueHit` runs patterns 1-9, then `ASSUMPTION:`; the colon form is reported as pattern 1 (`ASSUMPTION marker`), under pattern 20, so `--counts`
  keeps three guard rows. A value with a slice-id hit is not tested further. A title is not touched (`comments` owns it).
- Tests (`name guard, provenance words in value literals`): `'ASSUMPTION: floor-1 clear'` and `` `ASSUMPTION: ${x} clear` `` fail, each naming
  `src/x.ts:2: … (pattern 1, ASSUMPTION marker)`; `it('ASSUMPTION: x', …)` is reported once, as `pattern 1, ASSUMPTION: in a title`, with no pattern 20.
- Mutation M70 (the `ASSUMPTION:` branch removed): both fail cases fail.

## 2. The two unpinned edges

- `'items B2+ only'` added to the fail list, asserting `(pattern 9, plan item range or rule)`. M71 (`LAST_VALUE_PATTERN = 8`): that test fails.
- `tier2Phase3` added to `name guard, identifiers` fails. M72 (lookbehind narrowed to `(?<=[a-z])`): that test fails, which also shows no other arm
  catches it with the digit dropped (the `^`/`_` alternative and the camel-id arm do not match it).

## 3. JSX text is read

- `tokens.ts`: new `jsxTextsOf(file, text)` returns each `JsxText` node that is not only whitespace, with its text from the first non-blank character and
  the line of that character. `literalsOf` is unchanged, so `comment-proof --renames` is unaffected.
- `names.ts` reads each as a value: `literalHit(text, false)`, then `valueHit`; reported under pattern 20 through the same message builder as a literal.
- Tests, new block `name guard, JSX text`, `.tsx` files: `<p>not available before Phase 8</p>` (pattern 2) and `<p>h2b2-x</p>` (the slice-id message) fail
  naming `src/x.tsx:2:`; a text on the third line of a multi-line `<div>` fails naming `src/x.tsx:3:`; `<p>a brief stun</p>` passes.
- Mutation M73 (the JSX read removed): the three fail cases fail.

Mutations (`evidence/mutation-check.txt`, rows 70-73, run on the final code, the file restored byte-equal after each): 4 mutations, 0 survive.

**Measurement** (`evidence/counts.txt`, round 3 sections): the three `.tsx` files hold 6 non-blank JSX text nodes (`App.tsx` 1, `CombatDemo.tsx` 5, `main.tsx` 0);
none is a hit, on the branch or on `git archive 590d82a`. The branch's `scripts/` over the `590d82a` extraction still reads rows 18 / 19 / 20 as 127 / 25 / 118 hits
(118 in 52 files) and the same 7 value literals as round 2, nothing new. The branch itself reads 0 / 0 / 0.

## Gates (`evidence/gates.txt`, Node 24.19.0, npm 11.12.1)

| Gate | Result |
| --- | --- |
| `npm run test` | 212 files, 1,849 tests (1,848 passed, 1 skipped): `src/` 1,358 (unchanged), `scripts/` 491 |
| `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 642 citations |
| `npm run docs:check -- budgets` | 12 files, 0 over budget |
| `npm run docs:check -- comments` | PASS, 7,008 comments and 1,629 titles in 403 files |

**`comment-proof origin/main --mask evidence/mask.json --renames evidence/renames.json`**: 151 OK and the single FAIL `engine/corpus-digest.test.ts`, exit 1;
the output is byte-equal to `evidence/comment-proof.txt`.

**Test counts** (`evidence/test-counts.txt`): `src/` unchanged at 1,358, file by file (no `src/` file changed). `scripts/`: 482 → 491, all in `names.test.ts`
(75 → 84: three added fail cases, the ASSUMPTION title, `tier2Phase3`, four JSX tests); other files unchanged.

The golden policy and corpus digest are as round 1 left them: no `src/` file changed, `npm run corpus:update` was not run.

`names.ts`'s header comment and `record.md`'s guard bullet (and its `scripts/` count, now 491) say what the guard now reads.

## Could not do as written

Nothing.

## Spec questions

- `CONVENTIONS.md#comment-why-not-what` (when the name-guard text is folded) should say the guard also fails `ASSUMPTION:` in a value and reads JSX text;
  rounds 1 and 2's notes stand.

## Content changes

None.

## To delete

Nothing.
