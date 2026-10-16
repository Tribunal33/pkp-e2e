#!/usr/bin/env bash
# U04 SW1 helper: run one phase set of sw1.js under the app's exclusive lock, after waiting (up to 20 min)
# until no other agent's probe drives that app (the `site` and `redirectwide` phases change the shared
# site record, so they wait for the fleet's other checker; set OTHER_AGENT, default ccSW2).
#   shared/playwright/checks/U04/SW1/wait-run.sh <app> <run> <phases>
app=$1; run=$2; phases=$3; other=${OTHER_AGENT:-ccSW2}
cd "$(dirname "$0")/../../../../.."
busy() { for p in $(pgrep -f "bin/probe.js"); do env=$(tr '\0' '\n' < /proc/$p/environ 2>/dev/null | grep -c "PROBE_AGENT=$other"); cmd=$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null); if [ "${env:-0}" -gt 0 ] && echo "$cmd" | grep -qE "probe.js ($app|all|[a-z,]*$app)"; then return 0; fi; done; return 1; }
for i in $(seq 1 120); do busy || break; sleep 10; done
echo "[sw1] $app $run $phases start $(date -u +%T)"
PROBE_RUN=$run PHASES=$phases PROBE_FEATURE=U04 PROBE_AGENT=ccSW1 timeout 900 bin/app-lock.sh exclusive "$app" -- node bin/probe.js "$app" shared/playwright/checks/U04/SW1/sw1.js > ".reports/U04/ccSW1-$phases-$app-$run.log" 2>&1
echo "[sw1] $app $run $phases exit $? end $(date -u +%T)"
