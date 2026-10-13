#!/bin/bash
# side.sh <base|head> [scripts]: PR review pkp/pkp-lib#13507 (round 2, the heads after the author's amend) on PKP's
# default dataset, at one side.
#   head: ojs pkp/ojs#5928, omp pkp/omp#2506, ops pkp/ops#1447 (each with its submodule bumps: lib/pkp
#         pkp-lib#13508, lib/ui-library ui-library#1016, plugins/generic/crossref crossref-ojs#114 /
#         crossref-ops#73)
#   base: the three apps' main at the PRs' bases, lib/pkp at pkp-lib#13508's base, the other submodules as
#         the apps' main points them
# then the build and mount, and per script a freshly reset dataset fleet:
#   walk  this folder's walk.js (OJS, OPS), with the fleet's [proxy] on the Crossref stand-in
#   a13   ../../issues/bulk-action-refusal-no-message/walk.js (OJS, OMP, OPS), the U45 A13 issue walk
#   a18   ../../issues/deposit-unreachable-agency-stays-submitted/walk.js (OJS, OPS), U45 A18, on the dead proxy
# Logs and facts under .reports/pr-13507/.
set -u
side=$1; scripts=${2:-walk a13 a18}
cd "$(dirname "$0")/../../../../.." || exit 1
R=.reports/pr-13507; S=shared/playwright/checks/sync/pkp-lib-13508; mkdir -p $R
SLOT=$(sed -n 's/^PKP_E2E_SLOT=//p' .env); export PKP_E2E_SLOT=${SLOT:-0}
PKPLIB_BASE=5d962d743e
# round 1 (2026-10-13): ojs 2458eead21, omp 18f197514e, ops bd864266eb, lib/pkp base a4f625a068, ojs base 5c056f34b7
declare -A HEAD=([ojs]=12a0ae5bfb1108114107cef8db241921252792de [omp]=602f236674c77cc3b230322029592e76290aa234 [ops]=ce4b5111d7c2f034619ffb0e5f827e6849747047)
declare -A BASE=([ojs]=55914e80d4 [omp]=eb93813147 [ops]=1bc3f78888)
for a in ojs omp ops; do
  (cd checkouts/$a && git checkout -q --detach "$([ "$side" = base ] && echo "${BASE[$a]}" || echo "${HEAD[$a]}")" \
    && git submodule update -q lib/pkp lib/ui-library && { [ ! -e plugins/generic/crossref/.git ] || git submodule update -q plugins/generic/crossref; } \
    && { [ "$side" != base ] || git -C lib/pkp checkout -q --detach $PKPLIB_BASE; }) || { echo "checkout failed $a"; exit 1; }
  echo "$side $a $(git -C checkouts/$a rev-parse --short HEAD) lib/pkp $(git -C checkouts/$a/lib/pkp rev-parse --short HEAD) ui $(git -C checkouts/$a/lib/ui-library rev-parse --short HEAD) crossref $(git -C checkouts/$a/plugins/generic/crossref rev-parse --short HEAD 2>/dev/null || echo -)"
  (cd checkouts/$a && npm run build > /dev/null 2>&1) || { echo "build failed $a"; exit 1; }
done
npm run -s mount > $R/mount-$side.log 2>&1 || { echo "mount failed"; tail -3 $R/mount-$side.log; exit 1; }
for m in $scripts; do
  case $m in
    walk) apps=ojs,ops; file=$S/walk.js;;
    a13) apps=ojs,omp,ops; file=shared/playwright/checks/issues/bulk-action-refusal-no-message/walk.js;;
    a18) apps=ojs,ops; file=shared/playwright/checks/issues/deposit-unreachable-agency-stays-submitted/walk.js;;
  esac
  echo "== $side $m ($apps)"
  npm run -s fleet-prep -- --feature pr-13507 --dataset --reset --apps $apps > $R/prep-$side-$m.log 2>&1 || { echo "prep failed $m"; tail -5 $R/prep-$side-$m.log; continue; }
  if [ "$m" = walk ]; then
    for a in ojs ops; do
      port=$((8770 + 10 * PKP_E2E_SLOT + $([ $a = ojs ] && echo 1 || echo 3)))
      sed -i -E "s#^(https?_proxy) = .*#\1 = \"http://127.0.0.1:$port\"#" checkouts/$a/config.test.ds1.inc.php
      grep -E "^https?_proxy" checkouts/$a/config.test.ds1.inc.php | tr '\n' ' '; echo "($a)"
      npm run -s probe-servers -- --stop --dataset 1 --app $a > /dev/null 2>&1
      PHP_INI_SCAN_DIR=:$PWD/$R/stub/php npm run -s probe-servers -- --start --dataset 1 --app $a > $R/server-$side-$a.log 2>&1 || { echo "server restart failed $a"; tail -3 $R/server-$side-$a.log; }
    done
  fi
  PROBE_RUN=$side PROBE_FEATURE=pr-13507 PROBE_AGENT=pr node bin/probe.js $apps $file > $R/$m-$side.log 2>&1
  echo "$m exit $?"
done
echo "== $side done"
