# Once one journal turns on "DOI Versioning", every journal's OAI-PMH requests answer a blank server error

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none (one OAI record per article)
  - 3.4: none (code; one OAI record per article)
  - 3.3: none (code; no DOI versioning)
- **Introduced** `pkp/ojs#5674` for `pkp/pkp-lib#12922` · [4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761) · 2026-07-27 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U19 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a22)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A Journal Manager sets "DOI Versioning" to "Yes, assign a unique DOI to
every version of an article." on one journal, where DOIs are on by
default. From then on, the server fails on Identify, ListRecords,
ListIdentifiers and GetRecord, and on ListMetadataFormats when it names
an identifier. Each answers an empty page, at every journal's OAI
address and at the site-wide one. ListSets still answers.

Harvesters get nothing from any journal on the install, and no one on
screen is told.

It happens on installs that run PostgreSQL, as soon as the setting is
saved: the journal needs nothing published.

## Impact

- **Lost.** Every journal's OAI-PMH feed, so indexes and aggregators that
  harvest the journals stop receiving new and changed articles. The
  settings page saves normally, and only the harvester sees the error.
- **Who.** Every journal of an install that runs PostgreSQL, once any one
  journal's manager sets "DOI Versioning" to "Yes". The setting is offered
  on each journal's Settings › Distribution › DOIs › Setup tab.
- **Way round.** Only by setting "DOI Versioning" back to "No" on that
  journal, which gives up one DOI per version. The other journals' managers
  cannot fix it from their own journals.

High: a setting one journal saves on screen silently stops the OAI-PMH
feed of every journal on the install.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` on PostgreSQL. Its journal
  `publicknowledge`, "Journal of Public Knowledge", has two published
  articles (1 "Signalling Theory Dividends" and 17), DOIs on, and "DOI
  Versioning" at "No". The dataset's repository identifier is
  `ojs2.localhost`.
- A second journal, created in step 3.

The journal has two languages, so an OAI address without `/en/` is first
redirected there; the addresses below include it.

1. Signed out, open `/index.php/publicknowledge/en/oai?verb=Identify`. It
   answers the journal's Identify record.
2. Open `/index.php/publicknowledge/en/oai?verb=ListRecords&metadataPrefix=oai_dc`.
   It lists articles 1 and 17.
3. Sign in as `admin`. Under Administration › "Hosted Journals", click
   "Create Journal". Fill in "Journal title" "Versions Journal",
   "Journal initials" "VJ", "Principal Contact Name" "Versions Contact",
   "Principal Contact Email" `versions.contact@mailinator.com`, "Country"
   "Canada" (the form refuses an empty country), "Path" `versions`, and
   English under "Languages" and "Primary locale". Click "Save".
4. Open the new journal's Settings › "Distribution" › "DOIs" › "Setup"
   (`/index.php/versions/en/management/settings/distribution`). Enter
   "DOI Prefix" `10.1234`, choose "Yes, assign a unique DOI to every
   version of an article." under "DOI Versioning", and click "Save".
5. Sign out, then open the addresses of steps 1 and 2 again, and these:
   - `/index.php/publicknowledge/en/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   - `/index.php/publicknowledge/en/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/1`
   - `/index.php/publicknowledge/en/oai?verb=ListMetadataFormats&identifier=oai:ojs2.localhost:article/1`
   - `/index.php/index/en/oai?verb=Identify` (the site-wide address)
   - `/index.php/publicknowledge/en/oai?verb=ListSets`

**Expected:** each address answers as in steps 1 and 2. Nothing changed at
"Journal of Public Knowledge", and "Versions Journal" has nothing
published.

**Observed:** every address but ListSets answers `500` with an empty
body, and the browser shows a blank page. The server log, for each one:

```
PHP Fatal error:  Uncaught PDOException: SQLSTATE[42804]: Datatype mismatch: 7 ERROR:  UNION types text and bigint cannot be matched
…
#9  lib/pkp/classes/oai/PKPOAIDAO.php(198): Illuminate\Database\Query\Builder->first()
#10 classes/oai/ojs/JournalOAI.php(201): PKP\oai\PKPOAIDAO->getEarliestDatestamp(Array)
#11 lib/pkp/classes/oai/OAI.php(295): APP\oai\ojs\JournalOAI->repositoryInfo()
```

ListSets answers `200` with the journal's sets. When "DOI Versioning" is
set back to "No" on "Versions Journal", every address of step 5 answers
`200` again, with articles 1 and 17.

## Cause

`APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()`
(`classes/oai/ojs/OAIDAO.php`) builds every record query as a UNION.
Since 4ea46f5f35 it can hold three branches:

- the current publication of each article (line 296), for journals that
  do not version DOIs;
- one row per published major version (lines 351–417), added whenever
  any journal on the install has both `doiVersioning` and `enableDois`
  set to 1 (line 279);
- the deleted records (`data_object_tombstones`, built at lines 420–466
  and united at line 474).

Both live branches select `NULL AS tombstone_id` (lines 300 and 357).
The deleted-records branch selects `dot.tombstone_id`, a `bigint`.
PostgreSQL resolves the column types of `a UNION b UNION c` as
`(a UNION b) UNION c`. Two untyped NULLs resolve to `text`, and `text`
cannot then be united with the tombstones' `bigint`, so PostgreSQL
refuses the whole statement. Before 4ea46f5f35 the current-publication
branch was united directly with the deleted records, so its NULL took
their `bigint` type.

`set_spec` and `oai_identifier` are NULL in both live branches too, and
also resolve to `text`. They do not fail, because the deleted records'
columns there are `varchar`, which PostgreSQL unites with `text`.
`tombstone_id` is the only column where two untyped NULLs come before a
numeric column.

Because the version branch is added for the whole install (line 279),
every journal's query and the site-wide one carry it. The branch's own
WHERE clause limits it to the requested journal, but PostgreSQL types the
whole statement before it reads any row. So the query fails at every
journal, whether or not anything is versioned there.

Reach:

- `PKPOAIDAO::getEarliestDatestamp()` (line 197), and therefore Identify,
  along with the record lists, GetRecord, and ListMetadataFormats when it
  names an identifier: all run this query (checked on screen).
- The DRIVER plugin's set (`plugins/generic/driver/DRIVERDAO.php`, line
  57) runs the same query (checked in the code).
- OMP and OPS: their `OAIDAO` classes have no version branch. They answer
  with "DOI Versioning" on (checked on screen, `main`).
- MySQL types a UNION's columns across all branches at once, so it is
  probably not affected (not tried).

## Proposed fix

Unite the version branch after the deleted-records branch, so that each
NULL column is typed by an earlier branch before the next one is added.
This is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/fix.diff)
in `classes/oai/ojs/OAIDAO.php`, `getRecordsRecordSetQuery()`, without
the five-line comment it adds on why the order matters:

```diff
+        $versionQuery = null;
         if (!empty($versioningJournalIds)) {
             $versionQuery = DB::table('submissions AS a')
 …
-            $query->union($versionQuery);
         }
 …
         return $query
             ->union($tombstoneQuery)
+            ->when($versionQuery, function ($query, $versionQuery) {
+                return $query->union($versionQuery);
+            })
             ->orderBy(DB::raw($orderBy . ', publication_id, tombstone_id'));
```

This restores the order the method had before 4ea46f5f35: the
current-publication branch united directly with the deleted records. The
rows, the column names (taken from the first branch) and the ordering do
not change, because the ORDER BY applies to the whole union.

Tried on `main`, OJS. The Steps then show Expected: every address of
step 5 answers `200`.

As a second check, with the fix in, "DOI Versioning" was turned on for
"Journal of Public Knowledge" itself, so its records came from the
version branch. These reads then gave the same identifiers, sets and
title as with versioning off:

- ListIdentifiers, plain, by set `publicknowledge:ART`, and from
  2020-01-01;
- GetRecord of `article/1`;
- Identify.

Without the fix, the same reads answered `500`.

**Alternatives:**

- Cast the NULL in the live branches (`CAST(NULL AS BIGINT)`). This
  states the type outright, but MySQL has no `BIGINT` cast target
  (`SIGNED`), so the query would need a branch per database driver.
- Put the deleted-records branch first. The union's column names come
  from its first branch, so `journal_id` and `section_id` would become
  `assoc_id`, and every row reader would need to change.

**What goes with it:**

- A guard: pkp's Cypress OAI test (`lib/pkp/cypress/tests/integration/oai/Verbs.cy.js`)
  runs the verbs on the default dataset, where no journal versions DOIs.
  A pass with one journal set to "Yes", on the PostgreSQL job, would have
  caught this. In pkp-e2e, a U19 scenario with "DOI Versioning" on.
- No backport, and no stored data to repair.

Small: three lines in one method, plus a test pass.

## Evidence

- Kept scripts, under
  [shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/walk.js)
    takes the Steps on a fresh load of the default dataset and records
    each OAI answer's status, its raw body and the server log lines. It
    also sets "DOI Versioning" back to "No" and reads the addresses
    again. It walks OMP and OPS the same way ("Create Press", "Create
    Server"), as the app-level control. Run it with
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/neighbour.js)
    is the neighbour check (OJS only), walked with the fix in and out.
  - [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/trial.sh)
    tried the fix: `node bin/try-fix.js apply fix.diff ojs`, the walk and
    the neighbour check, then the revert and the neighbour check without
    the fix.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` and `stable-3_5_0`. MySQL not checked.
- The walk typed the OAI addresses without `/en/` and followed the
  redirect; the 500s were answered and logged at the `/en/` addresses the
  Steps give. The wizard that opens after "Create Journal"
  also logged a `500` on its Plugin Gallery grid, because the test
  install cannot reach pkp.sfu.ca. That error is unrelated to this
  report.
- 3.5, walked: OJS and OMP have no "DOI Versioning" control on the DOIs
  "Setup" tab, so steps 3 and 4 cannot be taken there; steps 1 and 2
  answer. OPS has the control ("Yes, assign a unique DOI to every
  version of a preprint."). The full Steps there leave every address at
  `200`. In the code, `classes/oai/ojs/OAIDAO.php` on `stable-3_5_0`
  unites one live branch with the deleted records, and OJS's
  `OAIDAO` does not read `doiVersioning` (`pkp/pkp-lib#12922` is not
  on the branch).
- 3.4 (code): `classes/oai/ojs/OAIDAO.php` on `upstream/stable-3_4_0`
  has the same two-branch union, with no version branch, and nothing in
  it reads versions.
- 3.3 (code): `classes/oai/ojs/OAIDAO.inc.php` builds the query as raw
  SQL, with a two-branch `UNION`. The branch has no `doiVersioning`
  setting (it was added by the 3.4 migration `I8027_DoiVersioning`).
- Introduced: `git blame` on the version branch and on the
  `$query->union($versionQuery)` line (417) gives 4ea46f5f35, the squash
  of `pkp/ojs#5674` (GitHub's `commits/<sha>/pulls`). Its parent had the
  two-branch union. On `main`, the "DOI Versioning" control on the
  journal's DOI form dates from pkp-lib bd8b99b7eb (2025-08-13,
  `pkp/pkp-lib#10553`). Between those two commits OJS's `OAIDAO` did
  not read the setting, so OAI answered with versioning on (code). The OJS upgrade to 3.4 stores `doiVersioning` 0 for
  every journal, so only a manager's "Yes" reaches the fault.
- Upstream search (2026-09-30), pkp/pkp-lib and pkp/ojs, issues and PRs:
  "OAI versioning", "OAI UNION types", "OAI tombstone_id", "OAI 500 DOI",
  "Datatype mismatch", `getRecordsRecordSetQuery`, and recent OJS OAI
  PRs. The introducing issue `pkp/pkp-lib#12922` (closed) does not
  mention it, and its follow-up PRs (`pkp/ojs#5709`, `pkp/ojs#5753`)
  fix other parts (tombstones, an empty abstract). `pkp/pkp-lib#13112`
  (open) asks for the same records on OMP and OPS. `pkp/pkp-lib#12917` is
  a different PostgreSQL OAI error (a date argument).
- Tips:
  - OJS `main`
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - OMP `main`
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS `main`
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb)
    and OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - OJS `stable-3_4_0`
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - OJS `stable-3_3_0`
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Unverified: that MySQL answers with versioning on; and what a
  versioning journal lists once an article has two published major
  versions. The dataset's article 1 has 1.0 published and 1.1 unpublished,
  one major version, so it gave one record in every read.
