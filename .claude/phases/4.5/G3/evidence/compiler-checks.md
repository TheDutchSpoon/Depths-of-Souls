# The compiler refuses: each directive made valid in turn

Run in a scratch copy of the branch (the committed test file untouched). With one line made valid,
`npx tsc -b` fails on that line's `@ts-expect-error`; the unused-import lines are only the mutation
leaving a type name unused.

(a) a `description` added to the `DescribedTrait` literal:

```
src/data/descriptions.types.test.ts(13,5): error TS2578: Unused '@ts-expect-error' directive.
```

(b) the plain `Trait` replaced by a `DescribedTrait`:

```
src/data/descriptions.types.test.ts(6,1): error TS6133: 'Trait' is declared but its value is never read.
src/data/descriptions.types.test.ts(20,5): error TS2578: Unused '@ts-expect-error' directive.
```

(c) the plain `PerkDef` replaced by a `DescribedPerkDef`:

```
src/data/descriptions.types.test.ts(2,45): error TS6196: 'PerkDef' is declared but never used.
src/data/descriptions.types.test.ts(35,5): error TS2578: Unused '@ts-expect-error' directive.
```

With the lines as committed, `npx tsc -b` is clean.
