# Every stock trait and perk, with `description` stripped, equals `main`'s

A scratch test (in a copy of `origin/main` and in a copy of this branch, not committed) dumped, as JSON
with every `description` key removed: all 61 `STOCK_TRAITS` and all 3 `SPECIALIZATIONS` (spec fields, and
each of the 32 perks with its `effects` resolved at every level from 1 to `maxLevel` for a leveled
perk). `cmp` on the two dumps: identical (64892 bytes each).
