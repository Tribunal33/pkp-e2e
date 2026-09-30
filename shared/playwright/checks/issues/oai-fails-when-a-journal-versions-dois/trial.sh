#!/usr/bin/env bash
# Fix trial for docs/issues/U19-A22-oai-fails-when-a-journal-versions-dois.md (U19 A22).
#   bash shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/trial.sh
# Applies fix.diff to OJS, resets the dataset fleet, walks the Steps (walk.js)
# and the neighbour check (neighbour.js) with the fix (PROBE_RUN=fix), reverts
# (in a trap, so it reverts on failure too), resets again, walks the
# neighbour check without the fix (PROBE_RUN=nofix), then prints try-fix status.
# FEATURE and DS name the dataset fleet (fleet-prep --feature … --dataset …).
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois
FEATURE=${FEATURE:-issues-w02}
DS=${DS:-2}
reverted=0
revert() {
    if [ $reverted = 0 ]; then
        node bin/try-fix.js revert ojs
        reverted=1
    fi
}
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=w02 node bin/probe.js ojs $D/walk.js
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=w02 node bin/probe.js ojs $D/neighbour.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=w02 node bin/probe.js ojs $D/neighbour.js
node bin/try-fix.js status
git -C checkouts/ojs status --short
