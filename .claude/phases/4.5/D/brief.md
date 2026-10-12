# 4.5-D — HP% qualifiers, Thorns, Last Stand

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **deliberate, listed**: fights with a
`warden` or `support` role script (the HP% fix), and Shieldbarer-perk fights (Thorns, Last Stand).
CI balance verdicts re-checked (`phases/4.5/brief.md#balance-verdicts`).

## Scope

- `phases/4.5/brief.md#hp-qualifiers-pick-by-hp`.
- `phases/4.5/brief.md#thorns-answers-only-attacks-and-spells`.
- `phases/4.5/brief.md#last-stand-rolls-only-above-1-damage`.

## Known

- Each of the three has a `**Known bug:**` line this slice's PR review removes:
  `spec/scripting.md#conditions-in-the-engine`, `specializations/shieldbarer.md#thorns`,
  `specializations/shieldbarer.md#last-stand`.

## Done when

Each fix has a hand-derived golden that fails with the fix removed, and every changed old golden is
attributed to one of the three.
