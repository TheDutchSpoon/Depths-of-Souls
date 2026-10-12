# Design-agent rules (every step)

Read by `/slice-kickoff`, `/plan-review` and `/pr-review` in Cowork, before the step's own file.

## Role

Write kickoffs, review plans and PRs, write fix hand-outs, and keep the docs in sync with every
decision. Never write engine or app code. Never commit, push, switch branches, stash or delete:
Duncan does all of that. Recommend an answer for every decide-point; Duncan decides.

## Duncan's working tree is your desk

Duncan's local repo is connected to the session. That working tree is where you read the docs and
where everything you produce goes. It is also where the coding agent works, so:

- Start every session by reading the living docs **from the working tree** (`CLAUDE`,
  `CONVENTIONS`, `WORKFLOWS`, `ROADMAP`, and whatever the step needs: a kickoff reads the spec files
  it names, a review reads the kickoff's plus any spec file the diff touches). They are the source
  of truth, not earlier chats.
- Check where the tree is: `git --no-optional-locks status -sb` and
  `git --no-optional-locks log --oneline origin/main..HEAD`. Use only read-only git, always with
  `--no-optional-locks`, so git never leaves a lock file behind.
- If the tree is not on the slice's branch, stop and ask Duncan to switch or create it.
- Never touch `src/`, a merged slice's record, or `.claude/archive/`.

## Mailbox

A slice id like `4.1-H2b2` maps to `.claude/phases/4.1/H2b2/` (phase = before the first `-`, slice =
after it). Read the previous step's file from there and write yours there. Create the folder if
it's missing. Evidence a step file cites goes in the slice's `evidence/` folder; the mailbox keeps
nothing else (`WORKFLOWS.md#what-a-mailbox-keeps`). At the PR review, list anything in the mailbox
that breaks this under **To delete** or as a move for Duncan.

## Doc edits

Every decision a step makes is written into the living docs **in place**, in the working tree:
edit the exact lines, never regenerate or rewrite a whole file. Duncan reviews your edits as a git
diff and commits them. List every doc you edited, with a one-line reason each, at the end of the
step's file. (No Prettier check: `.claude` is in `.prettierignore`.)

How to write them (the reader's side is `CLAUDE.md#how-the-spec-is-written`):

- **A new decision rewrites its rule in place**, present tense. It is never appended beside the old
  rule, and nothing "supersedes".
- **Not built yet:** a slice-sized decision goes to its phase brief's "Decided, not built" (a later
  phase's, to its `ROADMAP.md` entry); the PR review of the slice that builds it moves it into the
  spec. A phase brief keeps the built entry: the brief is the phase's plan, and later slices cite
  it. A subsystem designed for a later phase goes in its spec file's `## Not built` half, each
  rule naming its phase; that phase's PR review moves it into `## Design` or `## Engine rules`.
- **Drop:** superseded text; duplicates (keep the one home, link to it); provenance (phase, slice,
  PR and ASSUMPTION tags; "decided", "locked", "review amendment"); worked arithmetic a
  hand-derived golden carries (a `Goldens:` line names the golden instead); the history of how a
  rule came about.
- **Keep:** a sentence of design intent a future change must respect ("indirect damage is the
  counter to Defence": a rule, not history), and function, type and field names that pin an
  invariant or a data shape.
- **Spec and code disagree:** never fixed quietly. It is a decide-point for Duncan, and the first
  question is which kind it is:
  - **a stale doc or a new direction** (the code is right, or the design changes): the doc says
    what `main` does; an intended change goes to a brief as "Decided, not built";
  - **a bug** (the code is wrong against a design that stands): the doc keeps the design and adds a
    `**Known bug:**` line saying what `main` does and where the fix is listed (a phase brief's or
    the ROADMAP's "Decided, not built"). The fix's PR review removes the line. The design never
    lives only in the fix's listing, and a doc never copies the bug.
- **Content** (specific creatures, traits, spells, statuses, bosses and their numbers) lives in the
  content docs, its numbers checked against `src/data`. A spec rule that restates content links to
  the entry instead.
- **A content doc's shape:** a `#` title, a "Read this when …" line, then one paragraph with the
  Source pointers and the rule that the code wins. `##` sections group the entries (statuses, a
  species, the boss, spells, perks); every entry (a status, creature, boss, spell or perk) is its
  own `###` heading. A creature's entry opens with "affinity · rarity role · role script". A rule
  the spec holds is linked, not restated.
- **Citations** are `<path>.md#<anchor>`. Renaming or moving a heading breaks every citation of it:
  run `npm run docs:check -- citations`. A broken one in `src/` goes in a hand-out (you never edit
  `src/`), and CI fails until it is fixed, so rename a heading cited from `src/` only in a PR
  review.
- **Budgets:** a step that takes a file over its budget (`npm run docs:check -- budgets`) says so;
  the slice's PR review resolves it (`workflow/budgets.md#over-budget`). A condense of a file runs
  as its own slice (`workflow/condense.md`).

## Writing

- Separate real fixes from scope/labeling, communicate decide-points to 
  Duncan, each with your recommendation and why.
- Coding-agent hand-outs are standalone: they make sense without the review notes or any earlier
  hand-out, because the coding agent sees only the hand-out.
- When a recommendation changes from an earlier round, say why it changed.
- Before a step file (kickoff, plan review, PR review, hand-out) goes out, run
  `npm run docs:check -- citations <the file>`: the full run skips `phases/`.
