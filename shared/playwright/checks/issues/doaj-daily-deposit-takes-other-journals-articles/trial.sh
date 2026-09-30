#!/usr/bin/env bash
# Fix trial for U63 A5 (docs/issues/U63-A5-doaj-daily-deposit-takes-other-journals-articles.md).
# Run from the repo root under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/doaj-daily-deposit-takes-other-journals-articles/trial.sh
# Applies fix.diff to OJS, walks the Steps and the neighbour with it, reverts
# (also on failure), walks the neighbour without it, and prints try-fix status.
# ONLY_NB=1 walks the neighbour only (in and out).
set -u
cd "$(dirname "$0")/../../../../.."
DIR=shared/playwright/checks/issues/doaj-daily-deposit-takes-other-journals-articles
FEATURE=${FEATURE:-issues-ir2}
DS=${DS:-2}
reset() { npm run fleet-prep -- --feature "$FEATURE" --dataset "$DS" --reset --apps ojs 2>&1 | tail -1; }
walk() { env MODE="$1" PROBE_RUN="$2" PROBE_FEATURE="$FEATURE" PROBE_AGENT=u63a5 node bin/probe.js ojs "$DIR/walk.js" 2>&1 | grep -E '^\[ojs\] (5|6|7) |FAILED|failed' ; }
reverted=0
revert() { if [ "$reverted" = 0 ]; then node bin/try-fix.js revert ojs; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply "$DIR/fix.diff" ojs || exit 1
if [ -z "${ONLY_NB:-}" ]; then echo "=== walk, fix in"; reset; walk walk fix; fi
echo "=== neighbour, fix in"; reset; walk neighbour nbfix
revert
echo "=== neighbour, fix out"; reset; walk neighbour nb
node bin/try-fix.js status
