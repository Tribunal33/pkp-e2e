#!/bin/bash
# Fix trial for U30 A11 (OJS and OMP), from the repo root of a slot, under the slot's app lock:
#   FEATURE=<dataset fleet feature> DATASET=<n> AGENT=<id> \
#     bin/app-lock.sh exclusive ojs,omp -- bash shared/playwright/checks/issues/author-response-other-submission-round/fix-trial.sh
# The neighbour without the fix (nb-out), apply fix.diff, the Steps (fix) and the neighbour (nb-in)
# with it, each on a freshly reset fleet; a trap reverts the fix on any exit.
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/author-response-other-submission-round
DIFF=$DIR/fix.diff
WALK=$DIR/walk.js
APPS="ojs omp"
: "${FEATURE:?}" "${DATASET:?}" "${AGENT:?}"
reset() { npm run fleet-prep -- --feature "$FEATURE" --dataset "$DATASET" --reset --apps ojs,omp 2>&1 | tail -1; }
walk() { for a in $APPS; do env PROBE_FEATURE="$FEATURE" PROBE_AGENT="$AGENT" "$@" node bin/probe.js "$a" "$WALK" 2>&1 | grep -E '^\[a10|rror|crash|BROWSER' | cut -c1-900; done; }
cleanup() {
  echo "=== cleanup ==="
  node bin/try-fix.js revert "$DIFF" $APPS 2>&1 | tail -2
  node bin/try-fix.js status $APPS && echo "status clean"
}
node bin/try-fix.js status $APPS || { echo "a fix is applied: stop"; exit 1; }
trap cleanup EXIT

echo "=== nb-out ==="; reset; walk MODE=nb PROBE_RUN=nb-out
echo "=== apply ==="; node bin/try-fix.js apply "$DIFF" $APPS 2>&1 | tail -2
node bin/try-fix.js status $APPS && { echo "apply failed"; exit 1; }
echo "=== fix ==="; reset; walk PROBE_RUN=fix
echo "=== nb-in ==="; reset; walk MODE=nb PROBE_RUN=nb-in
echo "=== body done ==="
