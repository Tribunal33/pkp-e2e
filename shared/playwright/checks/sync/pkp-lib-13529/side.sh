#!/bin/bash
# side.sh <base|head>: PR review pkp/pkp-lib#13528 on PKP's default dataset, at one side.
#   head (round 2): ojs pkp/ojs#5937, omp pkp/omp#2513, ops pkp/ops#1452 (each with its submodule bumps:
#         lib/pkp pkp-lib#13529, lib/ui-library ui-library#1017)
#   (round 1: omp and ops at their main tips f4836d4fb / 2ece50497f with the same two submodule heads)
#   base: each app at its PR's base (the main tips), every app's lib/pkp and lib/ui-library at the shared PRs' bases
# then the build and mount, a freshly reset dataset fleet and this folder's walk.js in all three apps.
# Logs and facts under .reports/pr-13528/.
set -u
side=$1
cd "$(dirname "$0")/../../../../.." || exit 1
R=.reports/pr-13528; S=shared/playwright/checks/sync/pkp-lib-13529; mkdir -p $R
declare -A APP=([ojs]=$([ "$side" = base ] && echo e591926d118580914bd5ff2ffc25aa9e5db1cb40 || echo 5eed1f391b5a8767dc324b306236c54b92a259f5)
  [omp]=$([ "$side" = base ] && echo 45fb5a8a14be7e58339c5bec4606382ef1de9845 || echo 155e93bb9c9d844c435d0e5d19c109dd4ae872a2)
  [ops]=$([ "$side" = base ] && echo 2ece50497f6319eee59ac9750264b0b40c642a4c || echo 52c6b374e20203eda12397887d59509c04197ded))
PKPLIB=$([ "$side" = base ] && echo dce15320c71e44888bfbdf506c0cf7a3f0aceba7 || echo 223bface61ffd56a288a9effd5621f9d4a499cfb)
UI=$([ "$side" = base ] && echo dd86f760ddb932d65a14e4a9eb5345973b8c10f6 || echo 99abe2529078b1cf9b8f0d7c0c67c2fce2d2e020)
for a in ojs omp ops; do
  (cd checkouts/$a && git checkout -q --detach "${APP[$a]}" && git submodule update -q lib/pkp lib/ui-library \
    && git -C lib/pkp checkout -q --detach $PKPLIB && git -C lib/ui-library checkout -q --detach $UI) || { echo "checkout failed $a"; exit 1; }
  echo "$side $a $(git -C checkouts/$a rev-parse --short HEAD) lib/pkp $(git -C checkouts/$a/lib/pkp rev-parse --short HEAD) ui $(git -C checkouts/$a/lib/ui-library rev-parse --short HEAD)"
  (cd checkouts/$a && npm run build > /dev/null 2>&1) || { echo "build failed $a"; exit 1; }
done
npm run -s mount > $R/mount-$side.log 2>&1 || { echo "mount failed"; tail -3 $R/mount-$side.log; exit 1; }
npm run -s fleet-prep -- --feature pr-13528 --dataset --reset --apps ojs,omp,ops > $R/prep-$side.log 2>&1 || { echo "prep failed"; tail -5 $R/prep-$side.log; exit 1; }
PROBE_RUN=$side PROBE_FEATURE=pr-13528 PROBE_AGENT=pr node bin/probe.js all $S/walk.js > $R/walk-$side.log 2>&1
echo "walk exit $?"
grep '^\[fact\]' $R/walk-$side.log
echo "== $side done"
