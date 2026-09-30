#!/usr/bin/env bash
# Fix trial for docs/issues/U63-A15-users-import-existing-account-told-new-password.md (U63 A15).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/users-import-existing-account-told-new-password/trial.sh
# Applies fix.diff (lib/pkp UserXmlPKPUserFilter: the "new password sent" line moves from
# importUserPasswordValidation() into parseUser()'s new-user branch, beside the email) to OJS and OMP
# (OPS has no Users XML Plugin), resets dataset fleet 2, walks the Steps and the neighbour (a new
# account with a password stored another way) with the fix (PROBE_RUN=fix, NEIGHBOUR=1), reverts (in a
# trap, so it reverts on failure too), resets again and walks the neighbour alone without the fix
# (PROBE_RUN=nofix, NEIGHBOUR_ONLY=1), then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/users-import-existing-account-told-new-password
FEATURE=${FEATURE:-issues-ir2}
DS=${DS:-2}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR=1 PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a15 ONLY=ojs,omp node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR_ONLY=1 PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a15 ONLY=ojs,omp node bin/probe.js all $D/walk.js
node bin/try-fix.js status
