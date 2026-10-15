#!/usr/bin/env bash
# Kept check of the PR review of pkp/pkp-lib#13537 (issue pkp/pkp-lib#13536), 2026-10-15: a native XML
# import by CLI, the issue's first case. On PKP's default dataset for `main`: a published submission gets
# REFS (cite.php, the lookup off) and is exported with the native plugin's CLI; the file is then imported
# into the same context three times, as `admin`: lookup on without `--citation-metadata-lookup` (the CLI
# default; the issue's case), lookup on with it (the control: the lookup is queued), lookup off without it.
# After each import: the new submission's references with their identifiers and status, the job rows added.
#
#   shared/playwright/checks/sync/pkp-lib-13537/native.sh <ojs|omp|ops> [feature]
#
# Output: .reports/<feature>/native-<app>-<lib/pkp sha>.txt
set -uo pipefail
app=$1; feature=${2:-sync-13536}
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../../../../.." && pwd); cd "$repo"
root=checkouts/$app
config=$(node -e "console.log(require('./.reports/$feature/fleet.json').apps['$app'].configFile)")
db=$(node -e "console.log(require('./.reports/$feature/fleet.json').apps['$app'].db)")
sha=$(git -C "$root/lib/pkp" rev-parse --short=10 HEAD)
out=.reports/$feature/native-$app-$sha.txt; xml=$repo/.reports/$feature/native/$app-$sha.xml; mkdir -p ".reports/$feature/native"
case $app in ojs) st=journal_settings; sk=journal_id; entity=article;; omp) st=press_settings; sk=press_id; entity=monograph;; ops) st=server_settings; sk=server_id; entity=preprint;; esac
q() { psql -d "$db" -tA -F ' ' -c "$1"; }
lookup() { q "delete from $st where setting_name = 'citationsMetadataLookup'; insert into $st ($sk, locale, setting_name, setting_value) values ((select min($sk) from $st), '', 'citationsMetadataLookup', '$1')" >/dev/null; echo "## lookup set to $1 (Settings › Workflow › Submission › Metadata)"; }
php_() { (cd "$root" && PKP_CONFIG_FILE="$repo/$config" php "$@" 2>&1); }
refs() {
    q "select '    sub ' || p.submission_id || ' pub ' || c.publication_id || ' ' || split_part(c.raw_citation, ' ', 2) || ' ' || coalesce(string_agg(cs.setting_name || '=' || cs.setting_value, ' ' order by cs.setting_name), '-') from citations c join publications p on p.publication_id = c.publication_id left join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name in ('doi', 'arxiv', 'handle', 'url', 'urn', 'processingStatus') where p.submission_id > $1 and c.raw_citation like 'pr13537n %' group by c.citation_id, p.submission_id, c.publication_id, c.seq, c.raw_citation order by c.publication_id, c.seq"
}
import() {
    local mark=$(q 'select max(submission_id) from submissions') jobs=$(q 'select coalesce(max(id), 0) from jobs')
    echo "## importExport.php NativeImportExportPlugin import <file> publicknowledge admin $*"
    php_ tools/importExport.php NativeImportExportPlugin import "$xml" publicknowledge admin "$@" | grep -vE "^- The submission file|tempnam|^$" | head -8 | sed 's/^/  | /'
    echo "  new submissions: $(q "select coalesce(string_agg(submission_id::text, ','), 'none') from submissions where submission_id > $mark"); job rows added: $(q "select count(*) from jobs where id > $jobs")"
    refs "$mark"
}

{
echo "# $app, lib/pkp at $sha, db $db, $(date -u +%FT%TZ)"
src=$(q 'select min(submission_id) from submissions where status = 3')
echo "## cite.php: references on every publication of published submission $src (lookup $(q "select coalesce(max(setting_value), 'unset') from $st where setting_name = 'citationsMetadataLookup'"))"
cat <<'REFS' | php_ "$here/cite.php" "$src" | sed 's/^/  | /'
pr13537n Alpha, A. Study a. Journal of Tests. 2020;1:1-2. http://dx.doi.org/10.1234/pr13537n.a
pr13537n Beta, B. Study b. Preprint. 2021. arXiv:2101.12345v2
pr13537n Gamma, G. Thesis c. 2019. hdl:1885/12345
pr13537n Delta, D. Report d. 2018. Available from: https://example.org/reports/d.pdf
pr13537n Epsilon, E. Book e. 2017. urn:nbn:de:101:1-2019072802401757702913
pr13537n Zeta, Z. Study f. Journal of Tests. 2022;3:5-6. doi:10.1234/pr13537n.f https://publisher.example.com/article/f
pr13537n Eta, E. Study g. Test Press; 2016.
REFS
echo "## export $entity $src"
php_ tools/importExport.php NativeImportExportPlugin export "$xml" publicknowledge "$entity" "$src" | grep -vE "^- The submission file|^$" | head -5 | sed 's/^/  | /'
if [ "$app" = omp ]; then
    # OMP's CLI import of a publication format stops on a null context (NativeXmlPublicationFilter builds an
    # Onix30ExportDeployment from the request's, which the CLI has none of), whatever the references.
    perl -0 -i -pe 's#<publication_format\b.*?</publication_format>##gs' "$xml"
    echo "  publication formats removed from the file (OMP's CLI import fails on them; not this PR)"
fi
echo "  <citation> elements in the file: $(grep -c '<citation>' "$xml")"
q "delete from jobs" >/dev/null

echo; echo "# lookup on, CLI default (no --citation-metadata-lookup)"
lookup 1
import
echo; echo "# lookup on, --citation-metadata-lookup (control)"
import --citation-metadata-lookup
echo; echo "# lookup off, CLI default"
lookup 0
import
q "delete from jobs" >/dev/null; echo "## jobs table emptied"
} > "$out" 2>&1
echo "native $app: $out"
