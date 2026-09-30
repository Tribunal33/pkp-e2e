# Kept claim checks

One directory per feature, one per claim-check chunk inside it
(`U05/K1/`, …); `sync/<pr>/` holds the reproductions of the regressions
the maintenance sync confirmed (`docs/tracking/ci-triage.md` "Open
regressions"), re-run each sync until the fix lands; `issues/<slug>/`
holds the walk of each issue report in `docs/issues/`, deleted with the
report. These are the scripts the claim checkers wrote while
driving the spec's sentences against the running apps (`docs/process/briefs/claim-check.md`). They are not tests: no assertions, no runner, no
fixtures. Each chunk has one entry script that seeds its own scratch
context, signs in from the roster and records every screen with the probe
kit's `screen()`, so a maintenance session can run the chunk again on a
later build and judge the snapshots against the spec lines the chunk
owns, instead of re-authoring the drive.

Run one the way any probe script runs; the outputs go under `.reports/`:

    PROBE_FEATURE=U05 PROBE_AGENT=sync node bin/probe.js all shared/playwright/checks/U05/K1/k1.js

Scripts import the kit as `require('../../../probe')`. They are run on
demand, never in CI, and a script that no longer runs on the current build
is itself a signal that the screen changed.
