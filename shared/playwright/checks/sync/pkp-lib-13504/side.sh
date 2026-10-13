#!/usr/bin/env bash
# One side of the PR review of pkp/pkp-lib#13504 (issue pkp/pkp-lib#13503): puts lib/pkp of the three
# apps at <commit> (the apps stay at their tips, the PR's base for pkp/ojs#5926), loads PKP's default
# dataset afresh and runs paths.js, then loads it again and runs cli.sh for each app (at the base the
# tool is absent and cli.sh records that). The checkouts stay where the side put them.
#
#   shared/playwright/checks/sync/pkp-lib-13504/side.sh <base|head> <commit>
#
# Output: .reports/sync-13503/<side>/
set -uo pipefail
side=$1; commit=$2; feature=sync-13503
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../../../../.." && pwd); cd "$repo"
out=.reports/$feature/$side; mkdir -p "$out"
for app in ojs omp ops; do
    git -C "checkouts/$app/lib/pkp" checkout -q "$commit" || exit 1
    echo "$app at $(git -C "checkouts/$app" rev-parse --short=10 HEAD), lib/pkp at $(git -C "checkouts/$app/lib/pkp" rev-parse --short=10 HEAD)"
done
npm run fleet-prep -- --feature "$feature" --dataset 1 --reset 2>&1 | tail -4
PROBE_FEATURE=$feature PROBE_AGENT=pr13504 PROBE_RUN=$side node bin/probe.js all "$here/paths.js" 2>&1 | grep -E "^\[fact\]|rror" | tee "$out/paths.txt"
cp .reports/$feature/pr13504/paths-facts-"$side"-*.json "$out"/ 2>/dev/null
npm run fleet-prep -- --feature "$feature" --dataset 1 --reset 2>&1 | tail -1
for app in ojs omp ops; do "$here/cli.sh" "$app" "$feature"; cp .reports/$feature/cli-$app-"$(git -C "checkouts/$app/lib/pkp" rev-parse --short=10 HEAD)".txt "$out"/ 2>/dev/null; cp .reports/$feature/seed-$app-*.json "$out"/ 2>/dev/null; done
echo "side $side done: $out"
