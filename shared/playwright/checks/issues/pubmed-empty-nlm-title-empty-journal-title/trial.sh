#!/usr/bin/env bash
# Fix trial for docs/issues/U63-OJS3-pubmed-empty-nlm-title-empty-journal-title.md (U63 OJS3).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/pubmed-empty-nlm-title-empty-journal-title/trial.sh
# Applies fix.diff to OJS, resets dataset fleet 1, walks the Steps with the fix
# (PROBE_RUN=fix; includes the neighbour, steps 6-7), reverts (in a trap, so it
# reverts on failure too), resets again and walks the neighbour alone
# (NEIGHBOUR_ONLY=1) without the fix, then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/pubmed-empty-nlm-title-empty-journal-title
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63ojs3 node bin/probe.js ojs $D/walk.js 2>&1 | cut -c1-600
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR_ONLY=1 PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63ojs3 node bin/probe.js ojs $D/walk.js 2>&1 | cut -c1-600
node bin/try-fix.js status
