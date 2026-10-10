# Verify report — Phase 4.2 — Slice B (round 2)

Coding agent → design agent. Checked the round-2 changes against `main`'s `src/`. The docs and the
code were not edited.

## Result

- `npm run docs:check -- inventory B`: **PASS**, 228 units and 228 rows, base `6abd67a`. (The
  command takes `B`; `4.2-B` is refused with "slice must be one of B, C, D, E, F".)
- Rows checked: this round re-checked the rows round 2 touched (`content/enemy-behaviour.md:61`,
  `content/rotcap-hollow.md:110`, `species/species-locked.md:112`); the other 225 are unchanged
  from round 1's pass. Fate counts unchanged (kept 13, rewritten 92, merged 30, moved 7, dropped 86).
- Findings: **0**.
- Spec and code disagree: **0** new cases.

## What was checked

1. **F1, Life Siphon's reason (`content/enemy-behaviour.md:75-78`).** Each clause holds:
   - Life Siphon is Vitality's only damage spell: the Vitality spells in `src/data/spells` are
     Afterglow (`glimmerdark.ts`, heal + Regen), Regrowth and Wild Vigor (`overgrowth.ts`, heal and
     buff), Charnel Feast (`rotcap-hollow.ts`, AOE heal) and Life Siphon (`overgrowth.ts:305-309`,
     `deal-damage` on the cast target plus a self heal).
   - No Vitality creature is a caster or opener: every `defaultScriptId: 'caster'` / `'opener'` in
     `src/data/species` sits on a non-Vitality creature (checked the two nearest Vitality entries,
     Pollinator Duster and Flickerling Wick, both `support`).
   - A support's rule 1 casts only ally-side gems: `scripts.ts:112`, `gemSide: 'ally'`.
   - Row `content/enemy-behaviour.md:61`'s Reason matches the text, including the dropped
     "while no ally is below 50% HP" clause.
2. **F2, Hollowkin Wretch (`content/rotcap-hollow.md:119-120`).** "warden (provoking draws the hits
   its trait answers)" gives a reason for the role and describes no turn; the `warden` script is
   `scripts.ts:61-73` (Provoke when the lowest ally is below 50%, else attack, else cast). Row
   `content/rotcap-hollow.md:110`'s Reason states the correction.
3. **F3, row `species/species-locked.md:112`.** `spec/progression.md:61`, under "## 9. Player
   specializations" (`:11`), says "its species sits **below the ≥3-creature minimum on purpose**".
   The named home holds the rule.
4. **F4, byte table.** `wc -c` gives 11,400 / 8,294 / 7,639 / 5,133 / 2,258 / 2,659 / 2,895, total
   **40,278**. The table matches.
5. **4.2-G brief.** `grep -rn species-locked src` gives 70 lines in 29 files, as the brief says. The
   four other stale comments from round 1 are in the brief's known list (`G/brief.md:17-24`).

## Findings

None.

## Spec and code disagree

None new. Thorns and Last Stand remain the two documented bugs (round 1, "Spec and code disagree").

## Stale comments in `src/` (for 4.2-G)

No new ones. Round 1's list stands: 70 `species-locked.md` citations in 29 files;
`engine/balance-types.ts:37` (boss level default 3, shipped 5); `data/statuses.ts:125-133` (act-first
"will be", built); `data/spells/glimmerdark.ts:3-24` and `data/traits/glimmerdark.ts:349-353`
(narration of deleted spells); the comment above `BROODMOTHER` in `data/species/overgrowth.ts`
(runner "unbuilt", built).
