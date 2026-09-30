#!/usr/bin/env bash
# Fix trial for docs/issues/U19-A16-oai-repeated-argument-server-error.md (U19 A16).
# Applies fix.diff (lib/pkp/classes/oai/OAI.php) to OJS, OMP and OPS, resets
# dataset fleet 2, walks the Steps (walk.js) and the neighbour check
# (neighbour.js) with the fix (PROBE_RUN=fix, fix-neighbour), reverts (in a trap, so it
# reverts on failure too), resets again, walks the neighbour check without
# the fix (PROBE_RUN=nofix-neighbour), then prints try-fix status.
#   bash shared/playwright/checks/issues/oai-repeated-argument-server-error/trial.sh
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/oai-repeated-argument-server-error
FEATURE=${FEATURE:-issues-w03}
DS=${DS:-2}
AGENT=${AGENT:-w03}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp ops; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js all $D/walk.js
PROBE_RUN=fix-neighbour PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js all $D/neighbour.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=nofix-neighbour PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js all $D/neighbour.js
node bin/try-fix.js status
