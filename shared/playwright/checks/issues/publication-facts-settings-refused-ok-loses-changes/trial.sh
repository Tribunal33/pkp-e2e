#!/usr/bin/env bash
# Fix trial for U13 OJS7 (docs/issues/U13-OJS7-publication-facts-settings-refused-ok-loses-changes.md).
# Run from the repo root under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/publication-facts-settings-refused-ok-loses-changes/trial.sh
# 1. fix.diff in: the Steps (walk.js: the entries stay after the refusal) and the neighbour.
# 2. Reverted (also on failure, by the trap): the neighbour without the fix; try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/publication-facts-settings-refused-ok-loses-changes
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
reset() { npm run fleet-prep -- --feature "$FEATURE" --dataset "$DS" --reset --apps ojs 2>&1 | grep 'ojs:' | tail -1; }
run() { env PROBE_RUN="$2" PROBE_FEATURE="$FEATURE" PROBE_AGENT=u13ojs7 node bin/probe.js ojs "$DIR/$1" 2>&1 | grep -E '^\[ojs\] |FAILED|failed|Error' | cut -c1-1200; }
applied=0
revert() { if [ "$applied" = 1 ]; then node bin/try-fix.js revert "$DIR/fix.diff" ojs; applied=0; fi; }
trap revert EXIT
node bin/try-fix.js apply "$DIR/fix.diff" ojs || exit 1; applied=1
echo "=== walk, fix in"; reset; run walk.js fix
echo "=== neighbour, fix in"; reset; run neighbour.js nbfix
revert
echo "=== neighbour, fix out"; reset; run neighbour.js nb
node bin/try-fix.js status
