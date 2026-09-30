#!/usr/bin/env bash
# Fix trial for docs/issues/U19-OPS1-ops-oai-until-server-error.md (U19 OPS1).
# Applies fix.diff (classes/oai/ops/OAIDAO.php) to OPS, resets dataset fleet
# 1, walks the Steps (walk.js) and the neighbour check (neighbour.js) with
# the fix (PROBE_RUN=fix), reverts (in a trap, so it reverts on failure
# too), resets again, walks the neighbour check without the fix
# (PROBE_RUN=nofix), then prints try-fix status.
#   bash shared/playwright/checks/issues/ops-oai-until-server-error/trial.sh
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/ops-oai-until-server-error
FEATURE=${FEATURE:-issues-w01}
DS=${DS:-1}
AGENT=${AGENT:-w01}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ops; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --apps ops --reset 2>&1 | tail -2
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ops $D/walk.js
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ops $D/neighbour.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --apps ops --reset 2>&1 | tail -2
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ops $D/neighbour.js
node bin/try-fix.js status
