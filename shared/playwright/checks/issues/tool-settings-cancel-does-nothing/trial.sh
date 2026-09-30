#!/usr/bin/env bash
# Fix trial for the two U63 OJS5 reports:
#   docs/issues/U63-OJS5-tool-settings-cancel-does-nothing.md (fix.diff here)
#   docs/issues/U63-OJS5-tool-settings-required-note-without-required-field.md
#     (../tool-settings-required-note-without-required-field/fix.diff)
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/tool-settings-cancel-does-nothing/trial.sh
# For each diff in turn: apply to OJS, reset dataset fleet 1, walk the Steps
# (walk.js), reset, walk the neighbour check (neighbour.js), revert (also in
# a trap, so it reverts on failure). Then reset and walk the neighbour check
# without either fix, and print try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/tool-settings-cancel-does-nothing
D2=shared/playwright/checks/issues/tool-settings-required-note-without-required-field
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
AGENT=${AGENT:-u63ojs5}
applied=0
revert() { if [ $applied = 1 ]; then node bin/try-fix.js revert ojs; applied=0; fi; }
trap revert EXIT
reset() { npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -1; }
probe() { PROBE_RUN=$1 PROBE_FEATURE=$FEATURE PROBE_AGENT=$AGENT node bin/probe.js ojs $2; }
RUNS=${RUNS:-"fixcancel fixnote"}      # e.g. RUNS=fixcancel WALK_ONLY=1 for one diff and the Steps alone
for pair in "fixcancel:$D/fix.diff" "fixnote:$D2/fix.diff"; do
  run=${pair%%:*}; diff=${pair#*:}
  case " $RUNS " in *" $run "*) ;; *) continue ;; esac
  echo "=== $run: $diff"
  node bin/try-fix.js apply $diff ojs || exit 1
  applied=1
  reset; probe $run $D/walk.js
  [ -z "${WALK_ONLY:-}" ] && { reset; probe $run $D/neighbour.js; }
  revert
done
if [ -z "${WALK_ONLY:-}" ]; then echo "=== nofix"; reset; probe nofix $D/neighbour.js; fi
node bin/try-fix.js status
