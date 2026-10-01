#!/usr/bin/env bash
# Fix trial for U13 OJS5 (docs/issues/U13-OJS5-publication-facts-panel-never-shown.md).
# Run from the repo root under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/publication-facts-panel-never-shown/trial.sh
# 1. fix.diff in: the Steps (walk.js) and the neighbour.
# 2. fix.diff plus a stand-in for the plugin's statistics request (trial-stats-stand-in.diff:
#    the test install has no outbound access): the Steps, which must show the panel.
# 3. Reverted (also on failure, by the trap): the neighbour without the fix; try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/publication-facts-panel-never-shown
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
reset() { npm run fleet-prep -- --feature "$FEATURE" --dataset "$DS" --reset --apps ojs 2>&1 | grep 'ojs:' | tail -1; }
run() { env PROBE_RUN="$2" PROBE_FEATURE="$FEATURE" PROBE_AGENT=u13ojs5 node bin/probe.js ojs "$DIR/$1" 2>&1 | grep -E '^\[ojs\] (0|2|4|5|nb)|FAILED|failed|Error' | cut -c1-1200; }
applied=0
revert() { if [ "$applied" = 1 ]; then node bin/try-fix.js revert ojs; applied=0; fi; }
trap revert EXIT
node bin/try-fix.js apply "$DIR/fix.diff" ojs || exit 1; applied=1
echo "=== walk, fix in"; reset; run walk.js fix
echo "=== neighbour, fix in"; reset; run neighbour.js nbfix
revert
node bin/try-fix.js apply "$DIR/trial-stats-stand-in.diff" ojs || exit 1; applied=1
echo "=== walk, fix in + statistics stand-in"; reset; run walk.js fixstub
revert
echo "=== neighbour, fix out"; reset; run neighbour.js nb
node bin/try-fix.js status
