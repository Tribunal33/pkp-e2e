#!/bin/bash
# src35.sh <base> <pr> — 3.5 OJS with enable_minified = Off (the source files), base then head
set -u
BASE=$1; PR=$2; R=$(cd "$(dirname "$0")/../../../../.." && pwd); APP=$R/checkouts/stable-3_5_0/ojs; CFG=$APP/config.test.ds1.inc.php
run() {
  cd $R; PKP_E2E_LINE=stable-3_5_0 npm run reset:ojs -- --dataset 1 > /tmp/s1-reset-35-$1.log 2>&1
  sed -i 's/^enable_minified = On/enable_minified = Off/' $CFG; grep '^enable_minified' $CFG
  PKP_E2E_LINE=stable-3_5_0 ROUNDS=8 PROBE_FEATURE=r13489-3_5 PROBE_AGENT=$1 node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-13490/stuck-editors.js 2>&1 | grep -v "known test-install"
}
cd $APP/lib/pkp && git checkout -q --detach $BASE && echo "== base-src $(git rev-parse --short=10 HEAD)"; run base-src
cd $APP/lib/pkp && git checkout -q -B pr-$PR-merge $BASE && git cherry-pick $PR > /dev/null && echo "== head-src $(git rev-parse --short=10 HEAD)"; run head-src
cd $APP/lib/pkp && git checkout -q --detach $BASE && echo "== back at $(git rev-parse --short=10 HEAD)"
cd $R; PKP_E2E_LINE=stable-3_5_0 npm run reset:ojs -- --dataset 1 > /dev/null 2>&1; grep '^enable_minified' $CFG
echo "SRC DONE"
