# The documentation, and where to start

Everything the e2e campaign knows lives under `docs/`. This page says what
each file is for and who should read it.

## If you want to understand a feature

Read its spec in `docs/specs/`. A spec describes one feature across OJS, OMP
and OPS in product language: who can do what, the rules, the side effects,
the scenarios a tester can act out, and a register of everything that looks
broken or needs a product decision. The one-paragraph legend for the markers
and badges is in `docs/specs/GLOSSARY.md` under "Reading a spec". The rest of
the glossary defines the product vocabulary the specs use and maps OJS terms
to their OMP and OPS names.

## If you want to know what is built and what is next

Tracking files hold what is open; resolved items are deleted and live on
in git history. The parity ledger and app-changes are the exception: they
record changes still in effect.

- `docs/tracking/PROGRESS.md`: one row per feature with its status, test
  counts and a short note; the banner names the mode.
- `docs/tracking/FEATURE-MAP.md`: the 75 features and the screens and
  behaviors each one covers.
- `docs/tracking/ci-triage.md`: known CI failures, flake classes and the
  companion branches waiting on developers' app PRs; check it before
  calling a red build new.
- `docs/tracking/upstream-sync.md`: the last app commits the suite was
  reviewed against.
- `docs/tracking/upstream-sync-stable-3_5_0.md`: the last `stable-3_5_0`
  commits read for regressions (no suite runs on that branch).
- `docs/tracking/app-changes.md`: app defects the tests work around, and
  any app code the campaign changed.
- `docs/tracking/parity-ledger.md`: evidence that the test-data builders
  produce the state a real user would.
- `docs/tracking/incidentals.md`: what a session saw in passing on another
  feature's screens, kept until that spec absorbs it.
- `docs/tracking/friction.md`: what made an agent's task harder than it
  needed to be, appended by the agents that drive screens; rows are
  deleted once acted on.
- `docs/tracking/UNASSIGNED.md` and `docs/tracking/atlas/`: the inventory
  of every screen and action in the apps, and the leftovers no spec claims.
- `docs/reports/`: regression and defect write-ups handed to the team,
  deleted once acted on.
- `docs/issues/`: the specs' defects written up for the team, one file
  per GitHub issue on pkp-e2e, deleted when the issue closes; the order
  they are written in is `docs/tracking/issues-queue.md`.

## If you are building specs and tests

Read in this order:

1. `docs/process/RUNBOOK.md`: what the project is trying to achieve, how a
   feature moves from nothing to a verified spec with green tests, and where
   each kind of finding goes. `docs/process/briefs/` holds the brief
   template for each subagent role plus the shared Frame (`frame.md`) and
   digest block (`digest-block.md`); the orchestrator fills the slots.
2. `docs/process/TEMPLATE.md`: how a spec is written, section by section;
   `docs/process/REPORT.md`: how a regression or defect report, or a
   GitHub issue, handed to the team is written, and the severity and effort scales.
3. `docs/process/PRINCIPLES.md`: the rules every test follows.
4. `docs/process/harness.md`: how the Playwright harness is laid out and run.
   Then `patterns.md` (conventions and pitfalls), `scenarios.md` (seeding
   test data and asserting on email) and `users.md` (the seeded accounts).

- `docs/process/seed-facts.md`: what a fresh test install contains and how
  it is configured; check a probe premise against it before writing the
  question. Its generated part is kept true by `npm run seed-facts -- --check`.

`docs/process/MAINTENANCE.md` is for the resident QA agent: keeping the
suite in step with the moving apps, helping a developer whose PR fails the
suite, answering coverage requests, and talking to the team on Mattermost.
