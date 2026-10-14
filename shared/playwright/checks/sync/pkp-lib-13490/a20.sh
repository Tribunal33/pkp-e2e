#!/bin/bash
# a20.sh <line> <pr sha> — U09 A20's kept walk on all three apps at each app's pointer, then with the PR cherry-picked
set -u
LINE=$1; PR=$2
R=$(cd "$(dirname "$0")/../../../../.." && pwd)
if [ "$LINE" = main ]; then C=$R/checkouts; FEAT=r13489-a20; PFX=; else C=$R/checkouts/stable-3_5_0; FEAT=r13489-a20-3_5; PFX="PKP_E2E_LINE=stable-3_5_0"; fi
declare -A BASE
for a in ojs omp ops; do BASE[$a]=$(git -C $C/$a/lib/pkp rev-parse HEAD); done
reset() { cd $R; for a in ojs omp ops; do env $PFX npm run reset:$a -- --dataset 2 > /tmp/s1-a20-reset-$LINE-$a.log 2>&1 || echo "RESET FAIL $a"; done; }
walk() { cd $R; env $PFX PROBE_FEATURE=$FEAT PROBE_AGENT=$1 node bin/probe.js all shared/playwright/checks/issues/first-language-content-box-stuck-loading/walk.js 2>&1 | grep -v "known test-install" > /tmp/s1-a20-$LINE-$1.log; echo "walk $1 done"; }
for a in ojs omp ops; do echo "base $a ${BASE[$a]:0:10}"; done
reset; walk base
for a in ojs omp ops; do (cd $C/$a/lib/pkp && git checkout -q -B pr-$PR-merge ${BASE[$a]} && git cherry-pick $PR > /dev/null && echo "head $a $(git rev-parse --short=10 HEAD)"); done
reset; walk head
for a in ojs omp ops; do git -C $C/$a/lib/pkp checkout -q --detach ${BASE[$a]}; echo "back $a $(git -C $C/$a/lib/pkp rev-parse --short=10 HEAD)"; done
echo "A20 DONE $LINE"
