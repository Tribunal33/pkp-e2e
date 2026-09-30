#!/usr/bin/env bash
# Fix trial for docs/issues/U63-OJS2-doaj-tool-listed-when-doaj-plugin-off.md (U63 OJS2).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off/trial.sh
# Applies fix.diff (classes/plugins/PubObjectsExportGenericPlugin.php) to OJS,
# resets dataset fleet 1, walks the Steps (walk.js) and the neighbour check
# (neighbour.js) with the fix (PROBE_RUN=fix), reverts (in a trap, so it
# reverts on failure too), resets again, walks the neighbour check without
# the fix (PROBE_RUN=nofix), then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
AGENT=${AGENT:-u63ojs2}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ojs $D/walk.js
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ojs $D/neighbour.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ojs $D/neighbour.js
node bin/try-fix.js status
