#!/bin/bash
# bundle.sh <line> <base sha> <pr sha> — head + bundle stand-in, enable_minified = On
set -u
LINE=$1; BASE=$2; PR=$3
R=$(cd "$(dirname "$0")/../../../../.." && pwd)
if [ "$LINE" = main ]; then APP=$R/checkouts/ojs; FEAT=r13489; PFX=; DIFF=bundle-main.diff; else APP=$R/checkouts/stable-3_5_0/ojs; FEAT=r13489-3_5; PFX="PKP_E2E_LINE=stable-3_5_0"; DIFF=bundle-3_5.diff; fi
CFG=$APP/config.test.ds1.inc.php
cd $APP/lib/pkp && git checkout -q -B pr-$PR-merge $BASE && git cherry-pick $PR > /dev/null && echo "== head-bundle $(git rev-parse --short=10 HEAD)"
cd $R && env $PFX node bin/try-fix.js apply shared/playwright/checks/sync/pkp-lib-13490/$DIFF ojs > /tmp/s1-tryfix-$LINE.log 2>&1 || { echo "APPLY FAIL"; tail -n 5 /tmp/s1-tryfix-$LINE.log; exit 1; }
env $PFX npm run reset:ojs -- --dataset 1 > /tmp/s1-reset-$LINE-hb.log 2>&1
sed -i 's/^enable_minified = Off/enable_minified = On/' $CFG; grep '^enable_minified' $CFG
env $PFX ROUNDS=8 PROBE_FEATURE=$FEAT PROBE_AGENT=head-bundle node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-13490/stuck-editors.js 2>&1 | grep -v "known test-install"
sed -i 's/^enable_minified = On/enable_minified = Off/' $CFG
env $PFX node bin/try-fix.js revert shared/playwright/checks/sync/pkp-lib-13490/$DIFF ojs >> /tmp/s1-tryfix-$LINE.log 2>&1 || echo "REVERT FAIL"
cd $APP/lib/pkp && git checkout -q --detach $BASE && echo "== back at $(git rev-parse --short=10 HEAD)"
echo "BUNDLE DONE $LINE"
