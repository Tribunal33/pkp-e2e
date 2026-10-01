#!/usr/bin/env bash
# Fix trial for docs/issues/U13-A11-permissions-reset-reverses-book-keywords.md, on main, three apps.
# Run under the slot's exclusive lock:  flock -x .reports/issues/main-code.lock bash <this file>
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/keywords-lose-typed-order
FIX=$DIR/fix.diff
RUN() { PROBE_FEATURE=issues-ir3 PROBE_AGENT=u13a11 PROBE_RUN="$1" node bin/probe.js all $DIR/walk.js "$2" 2>&1 | grep -E '^\[(ojs|omp|ops)\]|applied|rror'; }
PREP() { npm run fleet-prep -- --feature issues-ir3 --dataset 3 --reset 2>&1 | tail -3; }
node bin/try-fix.js status || { echo "a fix is already applied: stop"; exit 1; }
trap 'node bin/try-fix.js revert $FIX ojs omp ops' EXIT
node bin/try-fix.js apply $FIX ojs omp ops || exit 1
echo "=== fix in: the Steps"; PREP; RUN fix reset
echo "=== fix in: neighbour (a deliberate reorder is kept)"; PREP; RUN fixnb reorder
node bin/try-fix.js revert $FIX ojs omp ops; trap - EXIT
echo "=== fix out: neighbour"; PREP; RUN nofixnb reorder
node bin/try-fix.js status; echo "status rc=$?"
