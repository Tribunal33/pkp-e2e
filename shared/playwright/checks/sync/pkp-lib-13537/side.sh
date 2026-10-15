#!/usr/bin/env bash
# One side of the PR review of pkp/pkp-lib#13537 (issue pkp/pkp-lib#13536): puts lib/pkp of the three
# apps at <commit> (OJS at pkp/ojs#5940, a pointer bump only; OMP and OPS at their tips), loads PKP's
# default dataset afresh and runs paths.js, then extract.sh for each app on what it left; loads the
# dataset again and runs native.sh for each app. The checkouts stay where the side put them.
#
#   shared/playwright/checks/sync/pkp-lib-13537/side.sh <base|head> <commit>
#
# Output: .reports/sync-13536/<side>/
set -uo pipefail
side=$1; commit=$2; feature=sync-13536
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../../../../.." && pwd); cd "$repo"
out=.reports/$feature/$side; mkdir -p "$out"
for app in ojs omp ops; do
    git -C "checkouts/$app/lib/pkp" checkout -q "$commit" || exit 1
    echo "$app at $(git -C "checkouts/$app" rev-parse --short=10 HEAD), lib/pkp at $(git -C "checkouts/$app/lib/pkp" rev-parse --short=10 HEAD)"
done
npm run fleet-prep -- --feature "$feature" --dataset 1 --reset 2>&1 | tail -1
PROBE_FEATURE=$feature PROBE_AGENT=pr13537 PROBE_RUN=$side node bin/probe.js all "$here/paths.js" 2>&1 | grep -E "^\[fact\]|rror" | tee "$out/paths.txt"
cp .reports/$feature/pr13537/paths-facts-"$side"-*.json "$out"/ 2>/dev/null
for app in ojs omp ops; do "$here/extract.sh" "$app" "$feature"; cp .reports/$feature/extract-$app-"$(git -C "checkouts/$app/lib/pkp" rev-parse --short=10 HEAD)".txt "$out"/; done
npm run fleet-prep -- --feature "$feature" --dataset 1 --reset 2>&1 | tail -1
for app in ojs omp ops; do "$here/native.sh" "$app" "$feature"; cp .reports/$feature/native-$app-"$(git -C "checkouts/$app/lib/pkp" rev-parse --short=10 HEAD)".txt "$out"/; done
echo "side $side done: $out"
