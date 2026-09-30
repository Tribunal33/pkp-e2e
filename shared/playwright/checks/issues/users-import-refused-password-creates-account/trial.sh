#!/usr/bin/env bash
# Fix trial for docs/issues/users-import-refused-password-creates-account.md (U63 A4).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/users-import-refused-password-creates-account/trial.sh
# Applies fix.diff (lib/pkp UserXmlPKPUserFilter::parseUser() and importUserPasswordValidation()) to OJS and
# OMP (OPS has no Users XML Plugin), resets dataset fleet 1, walks the Steps with the fix (PROBE_RUN=fix),
# resets and walks the neighbours with the fix (PROBE_RUN=fixnb), reverts (in a trap, so it reverts on
# failure too), resets and walks the neighbours without the fix (PROBE_RUN=nofix), then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/users-import-refused-password-creates-account
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a4 ONLY=ojs,omp node bin/probe.js all $D/walk.js
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR=1 PROBE_RUN=fixnb PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a4 ONLY=ojs,omp node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR=1 PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a4 ONLY=ojs,omp node bin/probe.js all $D/walk.js
node bin/try-fix.js status
