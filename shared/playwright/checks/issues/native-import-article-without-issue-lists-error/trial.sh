#!/usr/bin/env bash
# Fix trial for docs/issues/U63-A8-native-import-article-without-issue-lists-error.md (U63 A8).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/native-import-article-without-issue-lists-error/trial.sh
# Applies fix.diff (OJS plugins/importexport/native) to OJS, resets dataset fleet 3,
# walks the Steps and the neighbour (submission 17, in an issue) with the fix
# (PROBE_RUN=fix), reverts (in a trap, so it reverts on failure too), resets
# again and walks the neighbour alone without the fix (PROBE_RUN=nofix), then
# prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/native-import-article-without-issue-lists-error
FEATURE=${FEATURE:-issues-ir3}
DS=${DS:-3}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a8 node bin/probe.js ojs $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR_ONLY=1 PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a8 node bin/probe.js ojs $D/walk.js
node bin/try-fix.js status
