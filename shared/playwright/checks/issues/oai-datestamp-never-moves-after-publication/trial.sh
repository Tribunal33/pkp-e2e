#!/usr/bin/env bash
# Fix trial for docs/issues/U19-A18-oai-datestamp-never-moves-after-publication.md (U19 A18).
# Applies fix-omp.diff and fix-ops.diff (classes/oai/{omp,ops}/OAIDAO.php) to OMP and OPS, resets dataset fleet 1,
# walks the Steps (walk.js) and the neighbour check (neighbour.js) with the fix (PROBE_RUN=fix),
# reverts (in a trap, so it reverts on failure too), resets again, walks the neighbour check
# without the fix (PROBE_RUN=nofix), then prints try-fix status.
#   bash shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/trial.sh
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication
FEATURE=${FEATURE:-issues-w05}
DS=${DS:-1}
AGENT=${AGENT:-w05}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert omp ops; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix-omp.diff omp || exit 1
node bin/try-fix.js apply $D/fix-ops.diff ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --apps omp,ops --reset 2>&1 | tail -2
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT ONLY=omp,ops node bin/probe.js all $D/neighbour.js
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT ONLY=omp,ops node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --apps omp,ops --reset 2>&1 | tail -2
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT ONLY=omp,ops node bin/probe.js all $D/neighbour.js
node bin/try-fix.js status
