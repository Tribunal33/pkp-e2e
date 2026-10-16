#!/usr/bin/env bash
# U04 SW3 helper: run phase sets of sw3.js on one app, one run after another, under the app's shared lock.
#   shared/playwright/checks/U04/SW3/run.sh <app> "<run>:<phases> <run>:<phases> ..."
app=$1; shift
cd "$(dirname "$0")/../../../../.."
for spec in $1; do
  run=${spec%%:*}; phases=${spec#*:}
  out=".reports/U04/ccSW3-${phases//,/-}-$app-$run.log"
  echo "[sw3] $app $run $phases start $(date -u +%T)"
  PROBE_RUN=$run PHASES=$phases PROBE_FEATURE=U04 PROBE_AGENT=ccSW3 timeout 2400 bin/app-lock.sh shared "$app" -- node bin/probe.js "$app" shared/playwright/checks/U04/SW3/sw3.js > "$out" 2>&1
  echo "[sw3] $app $run $phases exit $? end $(date -u +%T)"
done
