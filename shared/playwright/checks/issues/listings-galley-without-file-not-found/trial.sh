#!/usr/bin/env bash
# Fix trial for docs/issues/U13-A4-listings-galley-without-file-not-found.md (U13 A4).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/listings-galley-without-file-not-found/trial.sh
# Applies fix-ojs.diff and fix-ops.diff, resets the dataset fleet (FEATURE, DS), walks the Steps with the fix
# (PROBE_RUN=fix), reads the neighbour with the fix (PROBE_RUN=fix PHASE=neighbour), reverts (in a trap, so it
# reverts on failure too), reads the same neighbour without the fix on the same data (PROBE_RUN=nofix
# PHASE=neighbour), and prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/listings-galley-without-file-not-found
FEATURE=${FEATURE:-issues-ir2}
DS=${DS:-2}
AGENT=${AGENT:-u13a4}
reverted=0
revert() {
    if [ $reverted = 0 ]; then
        node bin/try-fix.js revert ojs ops
        reverted=1
    fi
}
trap revert EXIT
node bin/try-fix.js apply $D/fix-ojs.diff ojs || exit 1
node bin/try-fix.js apply $D/fix-ops.diff ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --apps ojs,ops --reset 2>&1 | tail -2
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js all $D/walk.js 2>&1 | cut -c1-900
PROBE_RUN=fix PHASE=neighbour PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js all $D/walk.js 2>&1 | cut -c1-900
revert
echo "=== neighbour without the fix"
PROBE_RUN=nofix PHASE=neighbour PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js all $D/walk.js 2>&1 | cut -c1-900
node bin/try-fix.js status
