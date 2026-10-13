#!/usr/bin/env bash
# Kept check of the PR review of pkp/pkp-lib#13504 (issue pkp/pkp-lib#13503), 2026-10-13: the new
# `lib/pkp/tools/citationLookup.php` walked on PKP's default dataset for `main`, on the state seed.php
# leaves (the issue's migrated archive: references NOT_PROCESSED, the oldest submission's without a
# status). After every step: the tool's output and exit code, the references per status, the job
# queue (rows, distinct references, the contextId the chains carry). At the PR's base the tool is
# absent and the walk records that alone.
#
#   npm run fleet-prep -- --feature sync-13503 --dataset 1 --reset --apps <app>
#   shared/playwright/checks/sync/pkp-lib-13504/cli.sh <ojs|omp|ops> [feature]
# Round 2 (PR head c3a89aa3e3): `repair --status=processed` is refused, scope IDs that are not digits are
# refused by name, `queue` goes in ascending submission ID order, a lookup-off context gets its own note.
#
# Output: .reports/<feature>/cli-<app>-<lib/pkp sha>.txt
set -uo pipefail
app=$1; feature=${2:-sync-13503}
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../../../../.." && pwd); cd "$repo"
root=checkouts/$app
config=$(node -e "console.log(require('./.reports/$feature/fleet.json').apps['$app'].configFile)")
db=$(node -e "console.log(require('./.reports/$feature/fleet.json').apps['$app'].db)")
sha=$(git -C "$root/lib/pkp" rev-parse --short=10 HEAD)
out=.reports/$feature/cli-$app-$sha.txt; mkdir -p ".reports/$feature"
case $app in ojs) st=journal_settings; sk=journal_id;; omp) st=press_settings; sk=press_id;; ops) st=server_settings; sk=server_id;; esac
q() { psql -d "$db" -tA -F ' ' -c "$1"; }
state() {
    echo "  references per status:"
    q "select coalesce(cs.setting_value, 'none'), count(*), count(distinct c.publication_id) from citations c left join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name = 'processingStatus' and cs.locale = '' where c.raw_citation like 'pr13504 %' group by 1 order by 1" | sed 's/^/    status /'
    echo "  job queue: $(q "select count(*) || ' rows, ' || count(distinct substring(payload from 'citationId[^;]*;i:([0-9]+)')) || ' references, contextId ' || coalesce(string_agg(distinct substring(payload from 'contextId[^;]*;i:([0-9]+)'), ','), '-') || ', jobs ' || coalesce(string_agg(distinct substring(payload from '\"displayName\":\"([^\"]+)\"'), ','), '-') from jobs"); failed_jobs: $(q 'select count(*) from failed_jobs')"
}
tool() {
    echo "## citationLookup.php $*"
    (cd "$root" && PKP_CONFIG_FILE="$repo/$config" php lib/pkp/tools/citationLookup.php "$@" 2>&1) | sed 's/^/  | /'
    echo "  exit ${PIPESTATUS[0]}"
    state
}
lookup() { q "delete from $st where setting_name = 'citationsMetadataLookup'; insert into $st ($sk, locale, setting_name, setting_value) values ((select min($sk) from $st), '', 'citationsMetadataLookup', '$1')" >/dev/null; echo "## lookup set to $1 (Settings › Workflow › Submission › Metadata)"; }

{
echo "# $app, lib/pkp at $sha, db $db, $(date -u +%FT%TZ)"
if [ ! -f "$root/lib/pkp/tools/citationLookup.php" ]; then echo "lib/pkp/tools/citationLookup.php: absent"; exit 0; fi
echo "## seed.php"
(cd "$root" && PKP_CONFIG_FILE="$repo/$config" php "$here/seed.php" 2>&1) > ".reports/$feature/seed-$app-$sha.json"
q "select p.submission_id, count(distinct p.publication_id) from publications p join citations c on c.publication_id = p.publication_id group by 1 having count(distinct p.publication_id) > 1" | sed 's/^/  submission with versions: /'
multi=$(q "select p.submission_id from publications p group by 1 having count(*) > 1 order by 1 limit 1"); multi=${multi:-$(q 'select min(submission_id) from submissions')}
state

echo; echo "# refusals"
tool
tool bogus
tool -h
tool status context 999
tool status submission 999
tool status submission abc
tool status context 1x
tool queue submission 1 -3
tool status context
tool status journal 1
tool queue --limit=0
tool queue --limit=x
tool repair
tool repair --status=bogus
tool repair --status=processed

echo; echo "# lookup off, as the dataset arrives"
tool status
tool queue

echo; echo "# lookup on"
lookup 1
tool status
tool queue --limit=1
echo "  submissions queued: $(q "select string_agg(distinct p.submission_id::text, ',') from citations c join publications p on p.publication_id = c.publication_id join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name = 'processingStatus' and cs.setting_value = '-2'") (lowest $(q 'select min(submission_id) from submissions'), highest $(q 'select max(submission_id) from submissions'))"
tool queue --limit=1
tool queue --limit=3
tool queue submission "$multi"
tool status submission "$multi"
tool queue
tool queue
tool status
tool repair --status=queued

echo; echo "# the job queue lost"
q "delete from jobs" >/dev/null; echo "## jobs table emptied"
tool status
tool repair --status=queued
tool status

echo; echo "# the jobs run (the fleet's [proxy] is a dead port: Crossref's step is put back 5 min, a service retry)"
runjobs() {
    start=$(date +%s)
    for i in 1 2 3 4 5 6 7 8; do
        [ "$(q 'select count(*) from jobs where available_at <= extract(epoch from now())')" = 0 ] && break
        echo "## jobs.php run ($i)"
        (cd "$root" && PKP_CONFIG_FILE="$repo/$config" timeout 900 php lib/pkp/tools/jobs.php run 2>&1) | grep -E "Completed|ERROR|Fatal|Exception" | sed 's/^/  | /'
    done
    echo "  took $(( $(date +%s) - start )) s; delayed jobs left: $(q 'select count(*) from jobs where available_at > extract(epoch from now())')"
    state
}
runjobs
tool status

echo; echo "# repair"
some=$(q "select string_agg(c.citation_id::text, ',') from (select c.citation_id from citations c join publications p on p.publication_id = c.publication_id where p.submission_id = $multi and c.raw_citation like 'pr13504 %' order by c.citation_id limit 2) c")
other=$(q "select c.citation_id from citations c join publications p on p.publication_id = c.publication_id where p.submission_id <> $multi and c.raw_citation like 'pr13504 %' order by c.citation_id desc limit 1")
q "update citation_settings set setting_value = '-1' where setting_name = 'processingStatus' and citation_id in ($some,$other)" >/dev/null
echo "## references $some (submission $multi) and $other set to FAILED (-1)"
tool repair --status=failed submission "$multi"
tool repair --status=failed
q "update citation_settings set setting_value = '5' where setting_name = 'processingStatus' and setting_value = '1'" >/dev/null
echo "## every PID_EXTRACTED reference set to PROCESSED (5), as if the services had answered"
tool repair --status=processed submission "$multi"
runjobs
tool status submission "$multi"
q "delete from jobs" >/dev/null; echo "## jobs table emptied"
lookup 0
tool repair --status=queued
tool status
} > "$out" 2>&1
echo "cli $app: $out"
