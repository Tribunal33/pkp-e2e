#!/bin/bash
# usage: CI_TALLY_DIR=<workdir> scrape.sh <repo> <runid>
# Fetches one run's job list and the test-level lines of its log into
# $CI_TALLY_DIR/logs/<repo>-<runid>.txt (skipped when already there; logs
# scraped before 2026-09-29 lack the numbered failure lines, whose pattern
# used a `\t` that grep -E reads as a literal t: delete them to re-scrape).
S=${CI_TALLY_DIR:?set CI_TALLY_DIR to the work directory}
repo=$1; id=$2; tag=$(echo $repo | tr '/' '_')
mkdir -p $S/logs
out=$S/logs/$tag-$id.txt
[ -s "$out" ] && exit 0; [ -e "$out.tmp" ] && exit 0
gh run view $id -R $repo --json jobs --jq '.jobs[] | "JOB\t\(.name)\t\(.conclusion)\t\(.startedAt)\t\(.completedAt)\t" + ([.steps[] | select(.conclusion=="failure") | .name] | join("|"))' > $out.tmp 2>>$S/logs/errors.txt
gh run view $id -R $repo --log 2>>$S/logs/errors.txt | grep -E '✘ |✓ .*retry #|retry #|Z +[0-9]+\) \[[a-z]+\] |[0-9]+ (failed|flaky|passed|skipped|did not run)|##\[error\]|Process completed with exit code|ECONNREFUSED|socket hang up|ETIMEDOUT|Timed out waiting|webServer|Test timeout of|Error: (page|locator|expect|browserContext|browser)|ENOSPC|EPIPE|net::ERR' | cut -c1-400 >> $out.tmp
mv $out.tmp $out
