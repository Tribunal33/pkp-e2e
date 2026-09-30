#!/usr/bin/env bash
# Fix trial for docs/issues/U63-OJS1-doaj-issue-window-headed-doi-plugin-settings.md (U63 OJS1).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/trial.sh
# Applies fix.diff (three export grid cell providers and the Issues page's two
# title lines) to OJS, resets the dataset fleet, walks the Steps (walk.js), the
# neighbour check (neighbour.js) and the "&" check (ampersand.js) with the fix
# (PROBE_RUN=fix), reverts (in a trap, so it reverts on failure too),
# resets again, walks the neighbour check without the fix (PROBE_RUN=nofix),
# then prints try-fix status. SKIP_WALK=1 leaves out the walk with the fix.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings
FEATURE=${FEATURE:-issues-ir4}
DS=${DS:-4}
AGENT=${AGENT:-u63ojs1}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs || exit 1
if [ -z "${SKIP_WALK:-}" ]; then
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ojs $D/walk.js
fi
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ojs $D/neighbour.js
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ojs $D/ampersand.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ojs $D/neighbour.js
node bin/try-fix.js status
