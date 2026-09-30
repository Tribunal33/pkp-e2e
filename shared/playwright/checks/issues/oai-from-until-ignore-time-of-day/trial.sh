#!/usr/bin/env bash
# Fix trial for docs/issues/U19-A2-oai-from-until-ignore-time-of-day.md:
# apply fix-<app>.diff to each app, walk walk.js and neighbour.js on a
# fresh dataset fleet, revert whatever happens. Run from the repo root.
set -u
D=shared/playwright/checks/issues/oai-from-until-ignore-time-of-day
FEATURE=${PROBE_FEATURE:-issues-w06}; N=${DATASET:-2}; AGENT=${PROBE_AGENT:-w06}
node bin/try-fix.js status
for a in ojs omp ops; do node bin/try-fix.js apply $D/fix-$a.diff $a || { node bin/try-fix.js revert ojs omp ops; exit 1; }; done
npm run fleet-prep -- --feature $FEATURE --dataset $N --reset | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js all $D/walk.js
PROBE_RUN=fixn PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js all $D/neighbour.js
node bin/try-fix.js revert ojs omp ops
node bin/try-fix.js status
