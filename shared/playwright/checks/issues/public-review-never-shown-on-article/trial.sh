#!/usr/bin/env bash
# Fix trial for U13 OJS12 (docs/issues/U13-OJS12-public-review-never-shown-on-article.md).
# Run from anywhere under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/public-review-never-shown-on-article/trial.sh
# Applies fix.diff to OJS, walks the Steps and the neighbour with it, reverts
# (also on failure), walks the neighbour without it, and prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/public-review-never-shown-on-article
FEATURE=${FEATURE:-issues-ir3}
DS=${DS:-3}
reset() { npm run fleet-prep -- --feature "$FEATURE" --dataset "$DS" --reset --apps ojs 2>&1 | tail -1; }
run() { env PROBE_RUN="$2" PROBE_FEATURE="$FEATURE" PROBE_AGENT=u13ojs12 node bin/probe.js ojs "$DIR/$1" 2>&1 | grep -E '^\[ojs\] (3|6|7|8|nb)|FAILED|failed|Error|crash' | cut -c1-1500; }
reverted=0
revert() { if [ "$reverted" = 0 ]; then node bin/try-fix.js revert ojs; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply "$DIR/fix.diff" ojs || exit 1
echo "=== walk, fix in"; reset; run walk.js fix
echo "=== neighbour, fix in"; reset; run neighbour.js nbfix
revert
echo "=== neighbour, fix out"; reset; run neighbour.js nb
node bin/try-fix.js status
