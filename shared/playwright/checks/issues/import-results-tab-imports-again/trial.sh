#!/usr/bin/env bash
# Fix trial for docs/issues/U63-A7-import-results-tab-imports-again.md (U63 A7).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/import-results-tab-imports-again/trial.sh
# Applies fix.diff (lib/pkp/js/controllers/TabHandler.js) to OJS, OMP and OPS,
# resets dataset fleet 2, walks the Steps and the neighbour checks with the fix
# (PROBE_RUN=fix), reverts (in a trap, so it reverts on failure too), resets
# again and walks the same script without the fix (PROBE_RUN=nofix), then
# prints try-fix status. The dataset config serves the unminified scripts
# (enable_minified Off), so no build is needed.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/import-results-tab-imports-again
FEATURE=${FEATURE:-issues-ir2}
DS=${DS:-2}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp ops; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a7 node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a7 node bin/probe.js all $D/walk.js
node bin/try-fix.js status
