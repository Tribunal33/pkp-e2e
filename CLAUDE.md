# pkp-e2e — working notes for agents

This repo is the whole home of the e2e campaign: product specs plus
Playwright suites for OJS, OMP and OPS. The process rules live in the docs,
not here. `docs/README.md` is the map of the documentation.

- **Start every feature session with `docs/process/RUNBOOK.md`** (the loop,
  what goes where, model discipline) **and `docs/tracking/PROGRESS.md`**
  (live state and the mode banner). Never re-derive the process from memory.
- **Maintenance sessions** (the resident QA agent) are two, each with its
  own list in `docs/process/MAINTENANCE.md`: the **upstream session**
  (the daily session) also reads `docs/tracking/upstream-sync.md`,
  `docs/tracking/ci-triage.md` and
  `docs/tracking/upstream-sync-stable-3_5_0.md` for the regression-only
  read of `stable-3_5_0`; the **housekeeping session** reads
  `docs/tracking/incidentals.md`, `docs/tracking/friction.md` and
  `ci-triage.md`. Check ci-triage FIRST when a CI failure is
  reported: one root cause often reds ojs, omp and ops as three messages.
  A PR or issue link shared with a request to check it before merging is
  a **PR review**: `docs/process/MAINTENANCE.md` "PR review", which
  produces a companion branch named like the app PR.
- Test contract: `docs/process/PRINCIPLES.md`. Report contract (a
  regression or defect write-up or GitHub issue for the team, with the
  severity and effort scales): `docs/process/REPORT.md`.
  Harness knowledge:
  `docs/process/{harness,patterns,scenarios,users}.md`. Spec contract:
  `docs/process/TEMPLATE.md` plus `docs/specs/GLOSSARY.md`.

Operational facts:

- App checkouts are named in `.env` (`OJS_ROOT`/`OMP_ROOT`/`OPS_ROOT`). The
  default is the self-contained, gitignored `checkouts/<app>` clones from
  `npm run fetch-apps` (pkp upstream `main`, with push URLs to pkp
  disabled). `npm run mount` copies the PHP overlays into them, with a guard
  against app-side edits; the checkouts are read-only and commits happen
  only in this repo (RUNBOOK step 10). Spec files and `--grep` selections
  run from here (`npx playwright test -c configs/<app>.config.js …`,
  `reset:<app>`); **whole suites run on CI** (`node bin/ci.js watch` or
  `dispatch`, harness.md "CI"), never on the VM by default.
- A second set of checkouts on `stable-3_5_0` lives in
  `checkouts/stable-3_5_0/<app>` (ports 9000/9100/9200, DBs
  `<app>_test_3_5`), for regression reads and side-by-side drives only:
  no suite or spec follows it. `PKP_E2E_LINE=stable-3_5_0` in front of a
  harness command selects it; `npm run fetch-apps -- --line stable-3_5_0`
  provisions it (harness.md "The stable line").
- Up to three sessions run at once, each in its own **slot**: a full clone
  of this repo (`/home/e2e/pkp-e2e`, `-s1`, `-s2`) with its own checkouts,
  ports, DBs and Mailpit (`PKP_E2E_SLOT` in `.env`). The SessionStart hook
  says which one you are in; work only there. Playwright runs share one
  machine-wide test lock, so start long runs in the background. A slot is
  freed only when the session leaves this clone committed and pushed.
  `node bin/slot.js status`; harness.md "Slots".
- CI: `.github/workflows/e2e.yml` (the matrix) and `run-app.yml` (reusable,
  also called by the app repos' thin hooks at run time). A broken `main`
  here breaks every app PR check, so keep `main` green.
