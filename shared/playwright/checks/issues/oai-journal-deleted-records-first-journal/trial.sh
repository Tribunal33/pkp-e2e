#!/usr/bin/env bash
# Fix trial for docs/issues/U19-A1-oai-journal-deleted-records-first-journal.md (U19 A1).
#   bash shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/trial.sh
# Applies fix-ojs.diff to OJS and fix-omp.diff to OMP, resets the dataset
# fleet, walks the Steps (walk.js) and the neighbour check (neighbour.js) with
# the fix (PROBE_RUN=fix), reverts (in a trap, so it reverts on failure too),
# resets again, walks the neighbour check without the fix (PROBE_RUN=nofix),
# then prints try-fix status. FEATURE and DS name the dataset fleet
# (fleet-prep --feature … --dataset …).
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/oai-journal-deleted-records-first-journal
FEATURE=${FEATURE:-issues-w04}
DS=${DS:-1}
reset() { npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3; }
walk() { PROBE_RUN=$1 PROBE_FEATURE=$FEATURE PROBE_AGENT=w04 ONLY=ojs,omp node bin/probe.js all $D/$2 2>&1 | grep -v '^\[probe\] o.s: http'; }
reverted=0
revert() {
    if [ $reverted = 0 ]; then
        node bin/try-fix.js revert ojs
        node bin/try-fix.js revert omp
        reverted=1
    fi
}
trap revert EXIT
node bin/try-fix.js apply $D/fix-ojs.diff ojs || exit 1
node bin/try-fix.js apply $D/fix-omp.diff omp || exit 1
reset; walk fix walk.js
reset; walk fix neighbour.js
revert
reset; walk nofix neighbour.js
node bin/try-fix.js status
git -C checkouts/ojs status --short
git -C checkouts/omp status --short
