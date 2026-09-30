#!/usr/bin/env bash
# Fix trial for docs/issues/U63-A1-tools-absent-tool-address-raw-json.md (U63 A1).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/tools-absent-tool-address-raw-json/trial.sh
# Applies fix.diff (lib/pkp/pages/management/PKPToolsHandler.php) to OJS, OMP
# and OPS, resets dataset fleet 1, walks the Steps (walk.js) and the
# neighbour check (neighbour.js) with the fix (PROBE_RUN=fix), reverts (in a
# trap, so it reverts on failure too), resets again, walks the neighbour
# check without the fix (PROBE_RUN=nofix), then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/tools-absent-tool-address-raw-json
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp ops; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a1 node bin/probe.js all $D/walk.js
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a1 node bin/probe.js all $D/neighbour.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a1 node bin/probe.js all $D/neighbour.js
node bin/try-fix.js status
