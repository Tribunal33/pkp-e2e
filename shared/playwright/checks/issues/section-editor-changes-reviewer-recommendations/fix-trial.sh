#!/bin/bash
# Fix trial for U29 A13 (OJS only), from the repo root of a slot:
#   FEATURE=<dataset fleet feature> DATASET=<n> AGENT=<id> [LOCK='bash <applock> {acquire|release} <id> ojs'] \
#     bash shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations/fix-trial.sh
# Neighbour without the fix (nb-out), apply fix.diff, the Steps (fix) and the neighbour (nb-in)
# with it; a trap reverts the fix (and releases the lock) on any exit.
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations
DIFF=$DIR/fix.diff
WALK=$DIR/walk.js
: "${FEATURE:?}" "${DATASET:?}" "${AGENT:?}"
reset() { npm run fleet-prep -- --feature "$FEATURE" --dataset "$DATASET" --reset --apps ojs 2>&1 | tail -1; }
walk() { env PROBE_FEATURE="$FEATURE" PROBE_AGENT="$AGENT" "$@" node bin/probe.js ojs "$WALK" 2>&1 | grep -E '^\[a13|rror|crash' | cut -c1-1500; }
cleanup() {
  echo "=== cleanup ==="
  node bin/try-fix.js revert "$DIFF" ojs 2>&1 | tail -2
  node bin/try-fix.js status ojs && echo "status clean"
  [ -n "${LOCK:-}" ] && ${LOCK/\{acquire|release\}/release}
}
if [ -n "${LOCK:-}" ]; then ${LOCK/\{acquire|release\}/acquire} || exit 1; fi
trap cleanup EXIT
node bin/try-fix.js status ojs || exit 1

echo "=== nb-out ==="; reset; walk MODE=nb PROBE_RUN=nb-out
echo "=== apply ==="; node bin/try-fix.js apply "$DIFF" ojs 2>&1 | tail -2
node bin/try-fix.js status ojs && { echo "apply failed"; exit 1; }
echo "=== fix ==="; reset; walk PROBE_RUN=fix
echo "=== nb-in ==="; reset; walk MODE=nb PROBE_RUN=nb-in
echo "=== body done ==="
