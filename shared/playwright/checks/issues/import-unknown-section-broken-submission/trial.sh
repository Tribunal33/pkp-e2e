#!/usr/bin/env bash
# Fix trial for docs/issues/import-unknown-section-broken-submission.md (U63 A9).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/import-unknown-section-broken-submission/trial.sh
# Applies fix.diff to OJS and OPS, resets dataset fleet 1, walks the Steps
# with the fix (PROBE_RUN=fix), reverts (in a trap, so it reverts on failure
# too), resets again and walks the neighbour check (NEIGHBOUR_ONLY=1) without
# the fix, then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/import-unknown-section-broken-submission
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs ops; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a9 ONLY=ojs,ops node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
NEIGHBOUR_ONLY=1 PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a9 ONLY=ojs,ops node bin/probe.js all $D/walk.js
node bin/try-fix.js status
