#!/usr/bin/env bash
# Fix trial for docs/issues/omp-tools-csv-import-blank-page.md (U63 OMP1).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/omp-tools-csv-import-blank-page/trial.sh
# Applies fix.diff (it creates plugins/importexport/csv/templates/index.tpl)
# to OMP, resets dataset fleet 1, walks the Steps (walk.js) and the neighbour
# check (neighbour.js) with the fix (PROBE_RUN=fix), reverts (in a trap, so it
# reverts on failure too; the diff's /dev/null side carries the epoch
# timestamp, so `patch -R` deletes the created file and its empty directory,
# and the trap removes them itself should patch leave them), resets again,
# walks the neighbour check without the fix (PROBE_RUN=nofix), then prints
# try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/omp-tools-csv-import-blank-page
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
NEW=checkouts/omp/plugins/importexport/csv/templates
reverted=0
revert() {
    if [ $reverted = 0 ]; then
        node bin/try-fix.js revert omp
        reverted=1
        # A leftover of the created file (empty) or its directory goes too,
        # but only when the marker is gone and the file is not tracked.
        if [ ! -f checkouts/omp/.pkp-e2e-fix.json ] && ! git -C checkouts/omp ls-files --error-unmatch plugins/importexport/csv/templates >/dev/null 2>&1; then
            rm -rf "$NEW"
        fi
        echo "trial: templates dir after revert: $( [ -e "$NEW" ] && echo present || echo absent )"
    fi
}
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff omp || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63omp1 node bin/probe.js all $D/walk.js
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63omp1 node bin/probe.js omp $D/neighbour.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63omp1 node bin/probe.js omp $D/neighbour.js
node bin/try-fix.js status
git -C checkouts/omp status --short
