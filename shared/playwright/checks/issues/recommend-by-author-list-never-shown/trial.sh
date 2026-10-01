#!/usr/bin/env bash
# Fix trial for U13 OJS4 (docs/issues/U13-OJS4-recommend-by-author-list-never-shown.md).
# Run from the repo root under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/recommend-by-author-list-never-shown/trial.sh
# Applies fix.diff to OJS, walks the Steps and the neighbour with it, reverts
# (also on failure), walks the neighbour without it, and prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/recommend-by-author-list-never-shown
FEATURE=${FEATURE:-issues-ir2}
DS=${DS:-2}
reset() { npm run fleet-prep -- --feature "$FEATURE" --dataset "$DS" --reset --apps ojs 2>&1 | tail -1; }
run() { env PROBE_RUN="$2" PROBE_FEATURE="$FEATURE" PROBE_AGENT=u13ojs4 node bin/probe.js ojs "$DIR/$1" 2>&1 | grep -E '^\[ojs\] (4|5|6|7|nb)|FAILED|failed|Error' | cut -c1-900; }
reverted=0
revert() { if [ "$reverted" = 0 ]; then node bin/try-fix.js revert ojs; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply "$DIR/fix.diff" ojs || exit 1
echo "=== walk, fix in"; reset; run walk.js fix
echo "=== neighbour, fix in"; reset; run neighbour.js nbfix
revert
echo "=== neighbour, fix out"; reset; run neighbour.js nb
node bin/try-fix.js status
