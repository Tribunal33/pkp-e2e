#!/bin/bash
# side.sh <base|head>: PR review pkp/pkp-lib#13543 on PKP's default dataset (OJS), at one side.
#   head: ojs pkp/ojs#5946 87b9df9594 (its submodule bumps: lib/pkp pkp-lib#13545 c9cd7d31c4,
#         lib/ui-library ui-library#1021 936b915c56), `npm ci` from the PR's lockfile
#   base: ojs main 79c3676d1b (the PR's base), lib/pkp 6ff76591a9 and lib/ui-library 9cfb898731 (the shared PRs' bases)
# then the build and mount, a freshly reset dataset fleet 1 and this folder's walk.js.
# Logs and facts under .reports/pr-13543/.
set -u
side=$1
cd "$(dirname "$0")/../../../../.." || exit 1
R=.reports/pr-13543; S=shared/playwright/checks/sync/pkp-lib-13545; mkdir -p $R
APP=$([ "$side" = base ] && echo 79c3676d1b91e033e313e454b2d3c4ef17618963 || echo 87b9df95941d71658ba84e8199a4156eaee2d6ff)
PKPLIB=$([ "$side" = base ] && echo 6ff76591a99d08c8bf5a160fdec0f3a5c711dc64 || echo c9cd7d31c439c69adc27328655c302491f712ca0)
UI=$([ "$side" = base ] && echo 9cfb898731e5afbfa13932f27056c5d1ac2f6fb2 || echo 936b915c56698a76afd2d9149f171cbeda3d5b97)
(cd checkouts/ojs && git checkout -q --detach "$APP" && git submodule update -q lib/pkp lib/ui-library \
  && git -C lib/pkp checkout -q --detach $PKPLIB && git -C lib/ui-library checkout -q --detach $UI) || { echo "checkout failed"; exit 1; }
echo "$side ojs $(git -C checkouts/ojs rev-parse --short HEAD) lib/pkp $(git -C checkouts/ojs/lib/pkp rev-parse --short HEAD) ui $(git -C checkouts/ojs/lib/ui-library rev-parse --short HEAD)"
(cd checkouts/ojs && npm ci --no-audit --no-fund > /dev/null 2>&1 && npm run build > /dev/null 2>&1) || { echo "build failed"; exit 1; }
npm run -s mount > $R/mount-$side.log 2>&1 || { echo "mount failed"; tail -3 $R/mount-$side.log; exit 1; }
npm run -s fleet-prep -- --feature pr-13543 --dataset --reset --apps ojs > $R/prep-$side.log 2>&1 || { echo "prep failed"; tail -5 $R/prep-$side.log; exit 1; }
PROBE_RUN=$side PROBE_FEATURE=pr-13543 PROBE_AGENT=pr node bin/probe.js ojs $S/walk.js > $R/walk-$side.log 2>&1
echo "walk exit $?"
grep '^\[fact\]' $R/walk-$side.log
echo "== $side done"
