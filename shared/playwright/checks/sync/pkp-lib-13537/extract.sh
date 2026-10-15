#!/usr/bin/env bash
# Kept check of the PR review of pkp/pkp-lib#13537 (issue pkp/pkp-lib#13536), 2026-10-15: the new
# `citationLookup.php extract` walked on PKP's default dataset for `main`, after paths.js (whose
# references it reads too: Alpha's text edited with the lookup off, Zeta's DOI corrected by hand with the
# lookup on) and seed.php (references without identifiers, NOT_PROCESSED or without a status, and a
# PROCESSED and a QUEUED control). After every step: the tool's output and exit code, every pr13537
# reference's identifiers and status, the job rows. Then `queue` and one job run on the walk's submission,
# to compare what the lookup's own first job (ExtractPidsJob) does to the same references. At the PR's
# base the command is refused (usage, exit 1) and the walk goes on to the queue part.
#
#   shared/playwright/checks/sync/pkp-lib-13537/extract.sh <ojs|omp|ops> [feature]
#
# Output: .reports/<feature>/extract-<app>-<lib/pkp sha>.txt
set -uo pipefail
app=$1; feature=${2:-sync-13536}
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../../../../.." && pwd); cd "$repo"
root=checkouts/$app
config=$(node -e "console.log(require('./.reports/$feature/fleet.json').apps['$app'].configFile)")
db=$(node -e "console.log(require('./.reports/$feature/fleet.json').apps['$app'].db)")
sha=$(git -C "$root/lib/pkp" rev-parse --short=10 HEAD)
out=.reports/$feature/extract-$app-$sha.txt; mkdir -p ".reports/$feature"
case $app in ojs) st=journal_settings; sk=journal_id; sub=4;; omp) st=press_settings; sk=press_id; sub=3;; ops) st=server_settings; sk=server_id; sub=1;; esac
q() { psql -d "$db" -tA -F ' ' -c "$1"; }
state() {
    q "select '    pub ' || c.publication_id || ' ' || split_part(c.raw_citation, ' ', 2) || ' ' || coalesce(string_agg(cs.setting_name || '=' || cs.setting_value, ' ' order by cs.setting_name), '-') from citations c left join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name in ('doi', 'arxiv', 'handle', 'url', 'urn', 'processingStatus') where c.raw_citation like 'pr13537%' group by c.citation_id, c.publication_id, c.seq, c.raw_citation order by c.publication_id, c.seq"
    echo "  job rows: $(q 'select count(*) from jobs'); references not looked up (0 or no status), all: $(q "select count(*) from citations c left join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name = 'processingStatus' and cs.locale = '' where cs.setting_value is null or cs.setting_value = '0'")"
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
echo "## as paths.js left it (lookup $(q "select coalesce(max(setting_value), 'unset') from $st where setting_name = 'citationsMetadataLookup'"))"
q "delete from jobs" >/dev/null; echo "## jobs table emptied (paths.js s5's queued lookup)"
echo "## seed.php"
(cd "$root" && PKP_CONFIG_FILE="$repo/$config" php "$here/seed.php" "$sub" 2>&1) | sed 's/^/  | /'
state

echo; echo "# extract, lookup on"
tool extract
tool extract
seeded=$(q "select min(p.submission_id) from citations c join publications p on p.publication_id = c.publication_id where c.raw_citation like 'pr13537s %'")
tool extract submission "$seeded"

echo; echo "# extract, lookup off"
lookup 0
q "delete from citation_settings where setting_name in ('doi', 'arxiv', 'handle', 'url', 'urn') and citation_id in (select citation_id from citations where raw_citation like 'pr13537s %')" >/dev/null
echo "## the seeded references' identifiers deleted again"
tool extract context 999
tool extract submission "$sub"
tool extract
tool status
tool queue

echo; echo "# the lookup's own first job on the walk's references (lookup on)"
lookup 1
q "update citation_settings set setting_value = '$(printf 10.1234/pr13537.f-corrected)' where setting_name = 'doi' and citation_id = (select citation_id from citations where raw_citation like 'pr13537 Zeta,%')" >/dev/null
echo "## Zeta's DOI set back to the hand correction"
tool queue submission "$sub"
echo "## jobs.php run (the fleet's [proxy] is a dead port: Crossref's step is put back, a service retry)"
(cd "$root" && PKP_CONFIG_FILE="$repo/$config" timeout 300 php lib/pkp/tools/jobs.php run 2>&1) | grep -E "Completed|ERROR|Fatal|Exception" | head -20 | sed 's/^/  | /'
state
q "delete from jobs" >/dev/null; echo "## jobs table emptied"
} > "$out" 2>&1
echo "extract $app: $out"
