#!/bin/bash
# side.sh <base|head>: run the A22 walk's modes (MODES, default "steps reach nb"), each on a fresh default dataset, on all apps.
side=$1; cd "$(dirname "$0")/../../../../.."; mkdir -p .reports/pr-13502
W=shared/playwright/checks/sync/pkp-lib-13502/walk.js
for a in ojs omp ops; do echo "$side $a lib/pkp $(git -C checkouts/$a/lib/pkp rev-parse --short HEAD)"; done
for m in ${MODES:-steps reach nb}; do
  echo "== $side $m"
  npm run -s fleet-prep -- --feature issues-x5 --dataset 7 --reset > .reports/pr-13502/prep-$side-$m.log 2>&1 || { echo "prep failed $m"; tail -5 .reports/pr-13502/prep-$side-$m.log; }
  PROBE_RUN=$side-$m PROBE_FEATURE=issues-x5 PROBE_AGENT=x5 node bin/probe.js all $W $m > .reports/pr-13502/walk-$side-$m.log 2>&1
  echo "walk $m exit $?"
done
echo "== $side done"
