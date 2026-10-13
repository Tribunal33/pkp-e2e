#!/bin/bash
# clear-control.sh: the control for the issue's third expectation (pkp/ojs#5928, pkp/ops#1447 add
# libxml_clear_errors() to PubObjectsExportPlugin::exportXML()). Run after side.sh head (or fix) left the
# dataset fleet 1 of OJS and OPS at the head: on each, INVALID's first author loses the given name, VALID gets a
# DOI if it has none, the fleet's [proxy] points at the Crossref stand-in (started here), and buffer.php runs
# exportXML() on INVALID then VALID in one PHP process twice: as checked out, then with the
# libxml_clear_errors() line taken out (put back after). Without it VALID inherits INVALID's errors.
# Out: .reports/pr-13507/buffer-<with|without>-clear-<app>.out
set -u
cd "$(dirname "$0")/../../../../.." || exit 1
S=$PWD/shared/playwright/checks/sync/pkp-lib-13508; R=$PWD/.reports/pr-13507; mkdir -p "$R"
SLOT=$(sed -n 's/^PKP_E2E_SLOT=//p' .env); SLOT=${SLOT:-0}
for a in ojs ops; do
  port=$((8770 + 10 * SLOT + $([ $a = ojs ] && echo 1 || echo 3)))
  inv=$([ $a = ojs ] && echo 17 || echo 2); val=$([ $a = ojs ] && echo 1 || echo 5)
  db=$(sed -n 's/^name = //p' checkouts/$a/config.test.ds1.inc.php | head -1 | tr -d '"')
  psql -X -q -d "$db" -c "delete from author_settings where author_id = (select a.author_id from authors a join submissions s on s.current_publication_id = a.publication_id where s.submission_id = $inv order by a.seq, a.author_id limit 1) and setting_name = 'givenName'"
  psql -X -q -d "$db" -c "with d as (insert into dois (context_id, doi, status) select 1, '10.1234/control-$val', 1 where not exists (select 1 from publications p join submissions s on s.current_publication_id = p.publication_id where s.submission_id = $val and p.doi_id is not null) returning doi_id) update publications set doi_id = (select doi_id from d) where publication_id = (select current_publication_id from submissions where submission_id = $val) and exists (select 1 from d)"
  sed -i -E "s#^(https?_proxy) = .*#\1 = \"http://127.0.0.1:$port\"#" checkouts/$a/config.test.ds1.inc.php
  node "$S/crossref-stub.js" --dir "$R/stub" --port $port > "$R/stub-control-$a.log" 2>&1 & spid=$!
  sleep 1
  f=checkouts/$a/classes/plugins/PubObjectsExportPlugin.php
  for mode in with without; do
    [ $mode = without ] && sed -i '/^        libxml_clear_errors();$/d' $f
    (cd checkouts/$a && PKP_CONFIG_FILE=$PWD/config.test.ds1.inc.php PHP_INI_SCAN_DIR=:$R/stub/php timeout 120 php "$S/buffer.php" "$PWD" publicknowledge $inv $val > "$R/buffer-$mode-clear-$a.out" 2> "$R/buffer-$mode-clear-$a.err")
    echo "$a $mode the clear: $(tail -1 "$R/buffer-$mode-clear-$a.out" | python3 -c "import sys,json; print([(c['submissionId'], len(c['errors'])) for c in json.load(sys.stdin)['calls']])" 2>&1)"
  done
  git -C checkouts/$a checkout -- classes/plugins/PubObjectsExportPlugin.php
  kill $spid
done
