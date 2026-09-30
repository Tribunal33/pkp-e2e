#!/usr/bin/env bash
# Fix trial for docs/issues/U63-A13-users-import-unreadable-file-empty-results.md (U63 A13).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/users-import-unreadable-file-empty-results/trial.sh
# Applies fix.diff (lib/pkp PKPUserImportExportPlugin::display(), case 'import') to OJS and OMP
# (OPS has no Users XML Plugin), resets dataset fleet 3, walks the Steps and the
# two neighbours with the fix (PROBE_RUN=fix), reverts (in a trap, so it reverts on failure too),
# resets again and walks the neighbours alone without the fix (PROBE_RUN=nofix, NEIGHBOUR_ONLY=1),
# then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/users-import-unreadable-file-empty-results
FEATURE=${FEATURE:-issues-ir3}
DS=${DS:-3}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a13 ONLY=ojs,omp node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
NEIGHBOUR_ONLY=1 PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a13 ONLY=ojs,omp node bin/probe.js all $D/walk.js
node bin/try-fix.js status
