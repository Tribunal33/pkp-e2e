# Runbook: how a feature gets its spec and its tests

**Goal.** Accurate specs a QA person or product owner can read without a
developer, and per-app Playwright tests derived from them with strong
coverage, for OJS, OMP and OPS (one FEATURE-MAP row per feature, anchored on
OJS). Every claim is driven on the screens before it ships, every spec gets
one readability pass, every suite runs green twice, and anything
security-shaped is quarantined in the maintainer's private file. When a rule
gets in the way of that, the rule changes.

This file and `docs/tracking/PROGRESS.md` are the source of truth; a session
becomes correct by reading them, never by memory. A session is either a
FEATURE session (one feature, then stop for the maintainer's review) or the
MAINTENANCE session (`MAINTENANCE.md`, with this loop binding underneath);
the PROGRESS banner says whether the resident agent is active. Paths are
relative to the repo root; `../e2e_ng/` is the maintainer's private
directory.

## The loop

Each role's rules live in its brief template, `docs/process/briefs/<role>.md`;
the orchestrator renders briefs from them (`briefs/README.md`), judges
results, and alone writes PROGRESS rows and `app-changes.md`. Every agent that
drives screens opens with the Frame (`briefs/frame.md`), which sets what this
testing is and is not. A feature session does the feature and nothing else.
Every step ends in a file, and `.reports/<feature>/phase-status.md` gets one
line per gate passed (`<gate> · <date> · <file>`), appended by the
orchestrator.

1. **Claim.** `node bin/slot.js claim U<nn>` first: other slots' sessions
   may be picking from the same PROGRESS at the same time (harness.md
   "Slots"), and a refusal means another session holds the feature, so
   take the next pending row. Then set the row to `in_progress`. Gate: the
   row.
2. **Fleet prep.** `npm run fleet-prep -- --feature U<nn> [--reset]`.
   Gate: `.reports/<feature>/fleet.json`.
3. **Draft.** A spec author writes `docs/specs/U<nn>-<feature>.md` per
   TEMPLATE, all three apps from the start, Coverage rows classed and
   `planned`, no scenarios, open questions as `to drive:` footnotes
   (`briefs/spec-author.md`). Gate: the spec, lint zero.
4. **Harness.** Only when the author's return names a scenario key
   `scenarios.md` lacks: a harness agent builds it with its parity row and
   re-runs the shipped suites that seed through it (`briefs/harness.md`); a
   test author who meets a missing key at step 8 sends the loop back here.
   Gate: `.reports/<feature>/harness/harness-log.md`.
5. **Claim check.** `npm run seed-facts -- --check` to zero, then
   `node docs/process/lint/lint-spec.mjs --claims <spec>` into
   `.reports/<feature>/claims.txt`. The orchestrator cuts `claims.txt` into
   screen clusters seeded from the spec's surfaces table
   (`claimcheck-chunks.md`); fresh checkers drive every line
   (`briefs/claim-check.md`); with three or more chunks a merge agent writes
   `claimcheck-merge.md` (`briefs/merge.md`), with two or fewer the fold reads
   the chunk reports directly; a fold agent folds the change list into the
   spec (`briefs/fold.md`). Gate: `claims.txt`, `fold-log.md`, lint zero,
   `claims.txt` regenerated.
6. **Scenarios.** A fresh writer spends the Coverage table by class ("Budget"),
   composes the canonical scenarios from the verified body, and turns the
   Coverage table into the "Left out" list after them
   (`briefs/scenario-writer.md`). Gate: scenarios in the spec, the
   Coverage table gone, lint zero.
7. **Readability.** One persona read of the body (`briefs/persona.md`), then
   one rewrite of the wording blockers (`briefs/rewrite.md`); no second read,
   no other persona anywhere in the feature. Gate: `persona.md`, lint zero.
8. **Tests.** One test author per app writes the suite and runs it green once
   (`briefs/test-author.md`); one fold agent folds the runs' findings, with
   `Basis: test run` on new entries (`briefs/fold.md`); then
   `npm run test:final -- --feature U<nn>` is the second green, re-run after
   any fix. Gate: `test-<app>-green.log`, `final-run-<app>.log`.
9. **Progress.** The orchestrator sets the frontmatter to `status: verified`
   (its one inline spec edit) and replaces the PROGRESS row: status, scenario
   count, tests per app, and a note in the fixed shape (tests per app ·
   register counts · one headliner ID · budget cuts as states / variants · open
   blocker · low-confidence IDs). Gate: the row, lint zero after the flip.
10. **Commit and push.** One commit in this repo, everything the campaign
    produced, pushed to `origin main` in the same step: the push's CI run
    is the fresh-box full run the local finals may not reach, and the app
    repos' PR checks call this `main`, so unpushed work counts for
    nothing. `.reports/` never (session scratch, gitignored, deletable
    after review; the kept checks under `shared/playwright/checks/` are
    the exception). App checkouts are read-only: pkp push URLs are
    disabled by construction, app changes go through maintainer-reviewed
    PRs, a bad push gets a follow-up commit, never a force-push. Before
    committing, `npm run check-models` must pass: it lists every agent of
    the session that was stopped or served another model and blocks on any
    but the security probe ("Model discipline"; for the probe, add
    `(finished on <model>)` to its entry's `verified-by` line). Gate: the
    commit on `origin/main`.
11. **Report.** What was built, the register highlights, each suite's summed
    test time from its final-run log ("Budget"), anything low-confidence; if
    anything was routed to the private file, the verification probe
    (`briefs/security-verify.md`) has run and the report gives counts only.
    Then stop; the next feature starts in a fresh session. Gate: `security ·
    <date> · none | routed, see private file` in phase-status.

## What goes where

| What | Where |
|---|---|
| Product findings: bugs, divergences, open questions, API misbehavior the browser's own traffic showed, or a direct check of an API no screen calls (the Frame's one exception), with no security dimension | the spec's Findings register; nowhere else (not `app-changes.md`, not a PROGRESS note) |
| A potential security concern | `../e2e_ng/security.md`, private and outside every repo; verified by one targeted probe before the session report; rules and entry shape in `briefs/security-verify.md`. The fact of routing is always stated; the content never appears in a spec, test, `.reports/` file, PROGRESS note or commit |
| A finding against an unmerged PR | the developer; the spec describes `main` (MAINTENANCE "A developer's PR fails the suite") |
| What a probe saw on another feature's screen | `docs/tracking/incidentals.md`, one line, written by the orchestrator from the fold log and the merge |
| Process friction | `docs/tracking/friction.md`, one line, appended by the screen-driving agent itself |
| Build blockers and any app-code change | `docs/tracking/app-changes.md`, orchestrator only |
| Builder parity | `docs/tracking/parity-ledger.md` |
| A write-up for the team | `docs/reports/`, in the shape of `REPORT.md` (impact, steps, cause, proposed fix, evidence last), deleted once acted on; the register footnote keeps the pointer |
| Process learnings | this file, TEMPLATE, PRINCIPLES or a brief template, through maintainer review; never a spec |
| Anything resolved | deleted; git keeps it. Tracking files hold what is open, and anything outside its canonical home is one sentence plus a link |

## Budget

Per app about 700 tests and 25 minutes for the full suite on a fresh
database; the measured sizes and times are in the PROGRESS banner, kept
current by the maintenance session. CI runs each app as three shards of
four workers (`run-app.yml`, since 2026-09-23), so the 25 minutes bind a
shard: a suite that grows past the cap gets another shard there, never a
cut. A feature's scenarios cover
everything important and everything a user meets in ordinary use,
whatever the count. The main and guard rows of the spec's classed
Coverage table (TEMPLATE "Coverage") are always covered, so a complex
feature grows by itself and stays one spec. A state rides as a bullet in
a scenario that passes through it or whose given already holds it; a
state nothing passes through gets a scenario of its own when an editor,
author or reviewer would meet it in an ordinary week of running the
journal, and goes under the section's "Budget" bullet with that reason
otherwise, never dropped silently, where the maintainer can pull it
back. Variants ride or are left out. No count per feature sizes this:
the bound is the suite's measured minutes, and each feature's report
(step 11) states its suites' summed test time so growth is seen when it
happens, not at the cap.

## The multi-app rules

Test files cite these by number, so the numbers are stable.

1. **One spec, all three apps.** No per-app copies. An unmarked claim asserts
   "verified identical in every app that has the surface": for a shared code
   path the subclass-chain check (rule 8) is the evidence; for permissions,
   exclusivity or what a screen offers, additionally a live cross-app probe
   (rule 4); anything else is probed or gets a marker. Divergences carry an
   inline marker to the register; an absent feature gets a title badge such
   as `{OJS OMP}` and one absence paragraph written as an install fact.
2. **Scenarios live in the spec, common ones first,** then the app-specific
   ones; a per-app difference inside a common scenario is marked inline, and
   a scenario an app cannot run names its analogue or absence. A scenario
   added to a shipped spec goes last; the earlier numbers never move
   ("Revising a shipped feature").
3. **Tests are written per app, derived from the spec.** Each suite covers
   the common scenarios in its app's own context plus its app-specific ones;
   duplication between suites is fine. An absent feature costs one absence
   test with a positive control per assertion. What a test may assert is
   PRINCIPLES M3 and M4.
4. **Probing is cross-app by construction.** Every exclusivity claim ("only X
   can", "never shows") gets a read-only control probe in the other apps, and
   a probe item that spans apps is owned by one agent driving all fleets.
5. **Corrections to the OJS text are expected.** A finding that touches
   shared text is re-checked on OJS before the spec is final.
6. **Age guides the verdict.** Behavior untouched since the app's early years
   reads as intent; behavior that broke in a modernization window reads as
   decay. The verdict is the register badge plus one sentence; the
   archaeology stays in footnotes.
7. **Divergence or own feature?** Different parameters on existing machinery
   stay a register divergence; a difference that needs rules of its own
   (screens no spec claims, replacement scenarios) earns its own FEATURE-MAP
   row. Forked-copy code with identical logic is one feature, but every
   shared claim there needs probe evidence. OMP/OPS-only surfaces stay out of
   scope until the maintainer extends it. Size alone never splits a
   feature: a complex feature stays one spec and its scenario list
   grows ("Budget").
8. **Look in the class hierarchy first.** For a load-bearing lib/pkp class
   read each app's subclass chain: an empty subclass is positive evidence of
   shared behavior, an override is intended divergence, a missing override
   is the classic silent one. `isOJS()`-style branches, registry and seed
   files and config-merge survivors are the secondary seams.

## Model discipline

- Fable or Opus, whichever the session runs on, runs every role; subagents
  inherit the session model, no per-role pins.
- A refusal or safeguard flag: discard the attempt, never re-press or
  reword; record the gate reached in the PROGRESS note and stop for
  maintainer review. A technical stall is not a flag: respawn on a narrower
  slice, at most twice.
- The one exception is the security verification probe: a stop there, or
  the rest of its run served on another model, does not hold up the
  feature. Its verdict stands with the model named on the entry's
  `verified-by` line, and an entry it could not settle stays `unverified`
  for the maintainer. It writes only to the private file and its own
  folder, so nothing it produced reaches other work.
- The orchestrator never probes, verifies or edits a spec inline (the
  `status:` flip excepted); agents that drive screens are always fresh, one
  or two at a time, cut for about 40 browser calls each (an agent still
  finishes its chunk past that).
- Returns are pointers and counts, never findings; the orchestrator judges
  by files (`ls`, `wc -l`, `grep -c`), reads only what must be judged, and
  runs no explore or plan agents during a feature. Between gates the files
  under `.reports/<feature>/` are the status.
- When context runs low, or two launches in a row fail: finish the gate,
  commit and push what is commit-worthy, end; a fresh session resumes.
- **Keep the thread ticking while waiting.** A session that runs inside
  claude-threads (the Mattermost bot) is paused as idle after 10 silent
  minutes, and a background agent, a full suite or a CI run is silence to
  it. Whenever the next event is more than a few minutes away, arm a
  keepalive (a Monitor that ticks every 6 minutes while agents or suites
  run on the VM, every 4 minutes while a CI run is the only thing in
  flight, since the platform's first idle warning comes within 5 minutes
  then; re-armed at its 30-minute expiry) and post one line per tick: the
  gate that is running and what the files show, nothing else. The ticks
  double as the polling points for the finals and the CI run; the
  keepalive stops at the report, never earlier: a quiet tick is fine, a
  stopped Monitor with work in flight is a paused session whose runs die
  with it. A Playwright run can also wait behind another slot's run for
  the machine's test lock (harness.md "Slots"), so suites, finals,
  fleet-prep and any run that may queue go to the background under the
  keepalive, never in a foreground command.

## Definition of done

Per feature: the spec is `verified` and lint-clean, all three apps are
covered per the multi-app rules, each suite is green twice, the PROGRESS row
is updated, everything is committed and pushed; team review of verdicts is never a gate.
Campaign: the unclaimed atom count in FEATURE-MAP is zero, every PROGRESS row
is `done` or `parked`, each app's suite is within the cap ("Budget").

## Resuming a feature mid-flight

When PROGRESS shows `in_progress` and the tree holds uncommitted work, read
`phase-status.md`, check the files it names exist, and re-run the first gate
whose file is missing. Only files count; a mid-feature commit's PROGRESS
note names the last gate reached.

## Revising a shipped feature

A spec shipped before a rule changed is brought up to it in a session of
its own, launched by the maintainer like a feature session (the
maintenance session never builds), one feature at a time, in queue
order. The body stays verified, so there is no draft and no claim check.
The queue is `docs/tracking/coverage-revision.md`, one row per spec still
to revise; the spec's classed Coverage table, in TEMPLATE's draft shape,
is `docs/tracking/coverage-revision/U<nn>.md`: `S<n>` in "Runs in" where
a scenario already covers the row, `planned` where none does, blank
where the writer decides, and under the table the plan for each gap
(rides in `S<n>`, a scenario of its own, or no seed) and the suite
mismatches `lint-spec.mjs --tests` reports. The writer spends the table
as "Budget" says. A spec whose "Left out" list was cut by count before
that rule has no table: its "Budget" items are the rows, decided the
same way, and its scenarios keep their shape.

1. **Claim and fleet prep** as steps 1 and 2.
2. **Scenarios.** A scenario writer (`briefs/scenario-writer.md`, situation
   "revision") spends the classed table by class: reshapes the existing
   scenarios into TEMPLATE's shape sentence for sentence, adds a bullet to
   the scenario a gap rides in, appends a scenario for each gap that needs
   one (numbers never move: the suites' `S<n>` titles and the PROGRESS
   notes cite them), strips the coverage sentences ("scenario 9 runs the
   on end", "no scenario because…") from the "Settings that modify
   behavior" bullets so the section holds facts only, settles
   every test without a scenario and every scenario without a test the
   queue file lists (the scenario becomes a "Left out" item with its
   reason, or the test's behavior gets a scenario when the body states
   it), and writes the "Left out" list. A state with no scenario key goes
   to step 4 or under "No seed". Gate: lint zero.
3. **Readability** as step 7, the persona reading the changed and new
   scenarios only.
4. **Tests.** One test author per app (`briefs/test-author.md`, situation
   "revision") extends the suite: a test per new scenario, an assertion
   per bullet added to a scenario already tested, every title opening
   `S<n>`, the header's "not covered" block cut to register IDs; then the
   fold and `test:final` as step 8. Gate: the green logs,
   `node docs/process/lint/lint-spec.mjs --tests <spec>` zero.
5. **Progress, commit and push, report** as steps 9 to 11: the PROGRESS row in the
   fixed shape with the scenario count; the feature's
   file under `coverage-revision/` and its queue row deleted.
