#!/usr/bin/env bash
# Fix trial for docs/issues/U63-A6-upload-file-keyboard-unreachable.md (U63 A6).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/upload-file-keyboard-unreachable/trial.sh
# Applies fix.diff (lib/pkp/templates/controllers/fileUploadContainer.tpl) to
# OJS, OMP and OPS, resets dataset fleet 1, walks the Steps and the neighbour
# check with the fix (PROBE_RUN=fix), reverts (in a trap, so it reverts on
# failure too), resets again and walks the same script without the fix
# (PROBE_RUN=nofix), then prints try-fix status. A template change needs no build.
# REACH=1 (the editor's workflow upload) or AUTHOR=A1 (the author's revision
# upload) walks that OJS group of walk.js with the fix instead, and skips the
# walk without it (walk.js with the same variable on its own is that walk).
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/upload-file-keyboard-unreachable
FEATURE=${FEATURE:-issues-ir1}
DS=${DS:-1}
reverted=0
revert() { if [ $reverted = 0 ]; then node bin/try-fix.js revert ojs omp ops; reverted=1; fi; }
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs omp ops || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
if [ -n "${REACH:-}${AUTHOR:-}" ]; then
  PROBE_RUN=${AUTHOR:+author-fix}${REACH:+reach-fix} PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a6 node bin/probe.js ojs $D/walk.js
  revert
  node bin/try-fix.js status
  exit 0
fi
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a6 node bin/probe.js all $D/walk.js
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -4
PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63a6 node bin/probe.js all $D/walk.js
node bin/try-fix.js status
