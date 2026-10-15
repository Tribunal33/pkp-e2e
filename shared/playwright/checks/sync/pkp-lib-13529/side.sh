#!/bin/bash
# side.sh <base|head>: PR review pkp/pkp-lib#13528 on PKP's default dataset, at one side.
#   head: ojs pkp/ojs#5937 (its submodule bumps: lib/pkp pkp-lib#13529, lib/ui-library ui-library#1017);
#         omp and ops at their main tips with the same two submodule heads
#   base: ojs at the PR's base (the main tip), every app's lib/pkp and lib/ui-library at the shared PRs' bases
# then the build and mount, a freshly reset dataset fleet and this folder's walk.js in all three apps.
# Logs and facts under .reports/pr-13528/.
set -u
side=$1
cd "$(dirname "$0")/../../../../.." || exit 1
R=.reports/pr-13528; S=shared/playwright/checks/sync/pkp-lib-13529; mkdir -p $R
declare -A APP=([ojs]=$([ "$side" = base ] && echo e591926d118580914bd5ff2ffc25aa9e5db1cb40 || echo 5eed1f391b5a8767dc324b306236c54b92a259f5)
  [omp]=f4836d4fba825842ac23b2d735b9ebc538546ef3 [ops]=2ece50497f6319eee59ac9750264b0b40c642a4c)
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
