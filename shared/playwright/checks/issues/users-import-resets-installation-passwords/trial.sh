#!/usr/bin/env bash
# Fix trial for docs/issues/users-import-resets-installation-passwords.md (U63 A16).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/users-import-resets-installation-passwords/trial.sh
# Applies fix.diff (lib/pkp UserXmlPKPUserFilter::importUserPasswordValidation() keeps any bcrypt hash)
# to OJS and OMP (OPS has no Users XML Plugin), resets dataset fleet 3, walks the Steps and the other
# password forms with the fix (PROBE_RUN=fix2, NEIGHBOUR=1), reverts (in a trap, so it reverts on failure
# too), resets again and walks the other password forms alone without the fix (PROBE_RUN=nofix2,
# NEIGHBOUR_ONLY=1), then prints try-fix status.
# The server's PHP must be older than 8.4 for the Steps to show the fault.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/users-import-resets-installation-passwords
FEATURE=${FEATURE:-issues-ir3}
DS=${DS:-3}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR=1 PROBE_RUN=fix2 PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a16 ONLY=ojs,omp node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR_ONLY=1 PROBE_RUN=nofix2 PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a16 ONLY=ojs,omp node bin/probe.js all $D/walk.js
node bin/try-fix.js status
