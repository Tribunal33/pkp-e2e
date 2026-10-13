#!/bin/bash
# side.sh <base|head>: run the A9 walk and its control (SCRIPTS, default "walk neighbour assign"), each on a fresh default dataset, on all apps.
side=$1; cd "$(dirname "$0")/../../../../.."; mkdir -p .reports/pr-13506
S=shared/playwright/checks/sync/pkp-lib-13506
for a in ojs omp ops; do echo "$side $a lib/pkp $(git -C checkouts/$a/lib/pkp rev-parse --short HEAD)"; done
for m in ${SCRIPTS:-walk neighbour assign}; do
  echo "== $side $m"
  npm run -s fleet-prep -- --feature pr-13506 --dataset --reset > .reports/pr-13506/prep-$side-$m.log 2>&1 || { echo "prep failed $m"; tail -5 .reports/pr-13506/prep-$side-$m.log; }
  PROBE_RUN=$side-$m PROBE_FEATURE=pr-13506 PROBE_AGENT=pr node bin/probe.js all $S/$m.js > .reports/pr-13506/$m-$side.log 2>&1
  echo "$m exit $?"
done
echo "== $side done"
