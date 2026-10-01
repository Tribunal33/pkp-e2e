#!/usr/bin/env bash
# Fix trial for U13 OJS8 (docs/issues/U13-OJS8-publication-facts-start-date-typo-saved-as-other-date.md).
# Run from the repo root under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/publication-facts-start-date-typo-saved-as-other-date/trial.sh
# 1. fix.diff in: the Steps (walk.js: both typed dates refused, the calendar day saved) and the neighbour.
# 2. Reverted (also on failure, by the trap): the neighbour without the fix; try-fix status.
# WALK_ONLY=1 skips the two neighbour walks.
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/publication-facts-start-date-typo-saved-as-other-date
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
reset() { npm run fleet-prep -- --feature "$FEATURE" --dataset "$DS" --reset --apps ojs 2>&1 | grep 'ojs:' | tail -1; }
run() { env PROBE_RUN="$2" PROBE_FEATURE="$FEATURE" PROBE_AGENT=u13ojs8 node bin/probe.js ojs "$DIR/$1" 2>&1 | grep -E '^\[ojs\] |^\[probe\] .*fix|FAILED|failed|Error' | cut -c1-1200; }
applied=0
revert() { if [ "$applied" = 1 ]; then node bin/try-fix.js revert "$DIR/fix.diff" ojs; applied=0; fi; }
trap revert EXIT
node bin/try-fix.js apply "$DIR/fix.diff" ojs || exit 1; applied=1
echo "=== walk, fix in"; reset; run walk.js fix
if [ -z "${WALK_ONLY:-}" ]; then echo "=== neighbour, fix in"; reset; run neighbour.js nbfix; fi
revert
if [ -z "${WALK_ONLY:-}" ]; then echo "=== neighbour, fix out"; reset; run neighbour.js nb; fi
node bin/try-fix.js status
