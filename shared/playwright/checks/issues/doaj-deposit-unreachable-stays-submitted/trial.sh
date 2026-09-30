#!/usr/bin/env bash
# Fix trial for docs/issues/U63-OJS9-doaj-deposit-unreachable-stays-submitted.md (U63 OJS9).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/trial.sh
# Applies fix.diff to OJS, resets the dataset fleet (FEATURE, DS), walks the Steps with the
# fix (PROBE_RUN=fix; the walk also reads the neighbour: the untouched
# article keeps "Not Deposited" and the "Error" filter lists only the
# deposited one), reverts (in a trap, so it reverts on failure too), and
# prints try-fix status. The same neighbour without the fix is the plain
# walk on main (walk.js without PROBE_RUN).
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted
FEATURE=${FEATURE:-issues-ir3}
DS=${DS:-3}
reverted=0
revert() {
    if [ $reverted = 0 ]; then
        node bin/try-fix.js revert ojs
        reverted=1
    fi
}
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63ojs9 node bin/probe.js ojs $D/walk.js 2>&1 | cut -c1-900
revert
node bin/try-fix.js status
git -C checkouts/ojs status --porcelain
