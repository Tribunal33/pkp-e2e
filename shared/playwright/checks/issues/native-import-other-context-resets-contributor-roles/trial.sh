#!/usr/bin/env bash
# Fix trial for docs/issues/U63-A8-native-import-other-context-resets-contributor-roles.md (U63 A8).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/trial.sh
# Applies fix.diff (lib/pkp/plugins/importexport/native: the author export and
# import filters and pkp-native.xsd) to OJS, OMP and OPS, resets dataset fleet 3,
# walks the Steps (PROBE_RUN=fix) and the neighbour, an import into the same
# context (SAME_CONTEXT=1, PROBE_RUN=fixsame), reverts (in a trap, so it reverts
# on failure too), resets again and walks the neighbour without the fix
# (PROBE_RUN=nofixsame), then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles
FEATURE=${FEATURE:-issues-ir3}
DS=${DS:-3}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp ops; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a8 node bin/probe.js all $D/walk.js
SAME_CONTEXT=1 PROBE_RUN=fixsame PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a8 node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
SAME_CONTEXT=1 PROBE_RUN=nofixsame PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a8 node bin/probe.js all $D/walk.js
node bin/try-fix.js status
