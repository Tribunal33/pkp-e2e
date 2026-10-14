#!/bin/bash
# sides.sh <line: main|stable-3_5_0> <base sha> <pr sha>  — base, head, head with enable_minified = On
set -u
LINE=$1; BASE=$2; PR=$3
R=$(cd "$(dirname "$0")/../../../../.." && pwd)
if [ "$LINE" = main ]; then APP=$R/checkouts/ojs; FEAT=r13489; PFX=; else APP=$R/checkouts/stable-3_5_0/ojs; FEAT=r13489-3_5; PFX="PKP_E2E_LINE=stable-3_5_0"; fi
CFG=$APP/config.test.ds1.inc.php
run() { # side
  cd $R
  env $PFX npm run reset:ojs -- --dataset 1 > /tmp/s1-reset-$LINE-$1.log 2>&1 || { echo "RESET FAIL $1"; return; }
  [ "$1" = head-min ] && sed -i 's/^enable_minified = Off/enable_minified = On/' $CFG
  grep '^enable_minified' $CFG
  env $PFX ROUNDS=8 PROBE_FEATURE=$FEAT PROBE_AGENT=$1 node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-13490/stuck-editors.js 2>&1 | grep -v "known test-install"
  sed -i 's/^enable_minified = On/enable_minified = Off/' $CFG
}
cd $APP/lib/pkp && git checkout -q --detach $BASE && echo "== base $(git rev-parse --short=10 HEAD)"; run base
cd $APP/lib/pkp && git checkout -q -B pr-$PR-merge $BASE && git cherry-pick $PR > /dev/null && echo "== head $(git rev-parse --short=10 HEAD)"; run head
echo "== head-min"; run head-min
cd $APP/lib/pkp && git checkout -q --detach $BASE && echo "== back at $(git rev-parse --short=10 HEAD)"
echo "SIDES DONE $LINE"
