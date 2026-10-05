#!/bin/bash
# Fix trial for U29 A13 (OJS only): acquire the session's OJS lock, neighbour without the
# fix (nb-out), apply fix.diff, the Steps (fix) and the neighbour (nb-in) with it, then a
# trap reverts the fix and releases the lock on any exit.
set -u
cd /home/e2e/pkp-e2e
DIR=shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations
DIFF=$DIR/fix.diff
WALK=$DIR/walk.js
RUN="PROBE_FEATURE=issues-x9 PROBE_AGENT=x9"
reset() { npm run fleet-prep -- --feature issues-x9 --dataset 2 --reset --apps ojs 2>&1 | tail -1; }
cleanup() {
  echo "=== cleanup ==="
  node bin/try-fix.js revert "$DIFF" ojs 2>&1 | tail -2
  node bin/try-fix.js status ojs
  python3 .reports/issues/sx/applock.py release x9 ojs
}
python3 .reports/issues/sx/applock.py acquire x9 ojs || exit 1
trap cleanup EXIT
node bin/try-fix.js status ojs || exit 1

echo "=== nb-out ==="; reset
env $RUN MODE=nb PROBE_RUN=nb-out node bin/probe.js ojs "$WALK" 2>&1 | grep '^\[a13'

echo "=== apply ==="; node bin/try-fix.js apply "$DIFF" ojs 2>&1 | tail -2 || exit 1

echo "=== fix ==="; reset
env $RUN PROBE_RUN=fix node bin/probe.js ojs "$WALK" 2>&1 | grep '^\[a13\|crash'

echo "=== nb-in ==="; reset
env $RUN MODE=nb PROBE_RUN=nb-in node bin/probe.js ojs "$WALK" 2>&1 | grep '^\[a13'
echo "=== body done ==="
