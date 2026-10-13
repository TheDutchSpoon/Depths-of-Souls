# 4.5-D — HP% qualifiers, retaliation, Last Stand

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **deliberate, listed**: the corpus
digest (fights where the HP% pick differs, a retaliator met non-direct damage, or Last Stand met a
lethal hit at 1 HP), and the two goldens that pinned the tick fizzle with real retaliators,
deleted. CI balance verdicts re-checked (`phases/4.5/brief.md#balance-verdicts`).

## Scope

- `phases/4.5/brief.md#hp-qualifiers-pick-by-hp`.
- `phases/4.5/brief.md#retaliation-answers-only-attacks-and-spells`.
- `phases/4.5/brief.md#last-stand-never-rolls-at-1-hp`.

## Known

- Three `**Known bug:**` lines this slice's PR review removes:
  `spec/scripting.md#conditions-in-the-engine`, `specializations/shieldbarer.md#thorns`,
  `specializations/shieldbarer.md#last-stand`. Snapjaw Jaws, Shellback Bulwark and Hollowkin Wretch
  change by design, so their entries have no such line: the PR review rewrites them.

## Done when

Each change has a hand-derived golden or test that fails with it removed, and every changed corpus
fight and golden is attributed to one of the three.
