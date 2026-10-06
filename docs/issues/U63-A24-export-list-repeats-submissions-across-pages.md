# Paging the export list, the dashboard or a preprint server's archive repeats some submissions and skips others

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#2399` for `pkp/pkp-lib#2163` · [1d7faabe79](https://github.com/pkp/pkp-lib/commit/1d7faabe79a23cd2dd4ef8ef61e83a1f15848e30) · 2017-04-26 (merged 2017-07-26) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U63 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a24) · spec U17 [OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#ops7) · spec U23 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U23-submissions-dashboard.md#a16)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A manager who pages through the Native XML Plugin's export list expects
to meet each submission once. Where submissions share a submission
date, some show on two pages and others on none, and nothing says so.
The editorial dashboard's lists and a preprint server's public
"Archives" list do the same.

"Share a date" means the same stored value. A Native XML import stores
the day of each submission date with no time (midnight), so imported
submissions whose dates fall on the same day tie. Submissions made on screen carry their own time
and rarely tie. "Archives" sorts by publication date, which is a day,
so preprints posted on the same day tie.

A manager who exports one page at a time gets files that leave some
submissions out.

## Impact

- **Lost**: completeness. Exported files miss some submissions and
  hold others twice; some items never show on the lists' pages.
- **Who**: managers and editors, and readers of a preprint server's
  "Archives", wherever a list runs past one page (100 submissions on the
  export list, 30 on the dashboard, 25 on "Archives") and holds
  submissions that tie.
- **Way round**: no screen exports every submission at once: "Select
  All" ticks only the page shown, and ticks on other pages are not
  exported ([pkp-e2e#257](https://github.com/jardakotesovec/pkp-e2e/issues/257)).
  A manager can narrow the list with the search box or "Filters" until
  it fits on one page and export each slice; the command-line tool
  exports the submissions whose IDs it is given. On the dashboard,
  sorting by the "ID" column keeps the order from page to page. Readers
  of "Archives" can only search.

Medium: a full export can be done on screen by slicing the list, though
slowly, and nothing is lost from the site itself. A preprint server that
posts many preprints a day, whose readers page through "Archives",
would argue for high.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OJS: 20 submissions; OMP: 18; OPS: 19),
  on PostgreSQL. All were submitted on one day, each at its own time.
  MySQL was not checked: its manual says it too may return rows with
  equal sort values in any order under `LIMIT`, but whether it splits
  them across pages here is not known.
- More than 300 submissions in `publicknowledge` that share one
  submission date, made with the Native XML tool:
  1. Sign in as `dbarnes`; Tools › Import/Export › "Native XML Plugin".
  2. "Export Articles" tab ("Export" on a press, "Export Preprints" on a
     preprint server): "Select All", then "Export Articles" ("Export
     Submissions", "Export Preprints"), then "Download Exported File".
  3. Reload the page. On "Import", upload the downloaded file and press
     "Import".
  4. Import that same file again, reloading the page before each
     import, until the export list shows "Previous 1 2 ··· 4 Next": 15
     imports in all on OJS (320 submissions), 16 on OMP (306), 15 on OPS
     (304). Each copy gets the file's submission date, the day with no
     time.

Steps, as `dbarnes`:

Export list, one page at a time:

1. Tools › Import/Export › "Native XML Plugin", "Export Articles". The
   list shows 100 lines and "Previous 1 2 ··· 4 Next".
2. Press "Select All", then "Export Articles", then "Download Exported
   File" (file 1).
3. Reload the page and open "Export Articles". Press "2" under the list,
   then "Select All", export and download (file 2). Do the same for page
   3 (press "2", then "3") and page 4 ("2", "3", "4"), giving files 3
   and 4.

Dashboard (OJS, OMP):

4. Submissions, "Active submissions". The table reads "Showing 1 to 30
   of 272". Note the "ID" column.
5. Press "Next" until the last page, noting the IDs on each page.

"Archives" (OPS):

6. Sign out. Open "Archives" (`/index.php/publicknowledge/preprints`,
   "1-25 of 272").
7. Press "Next" until the last page, noting which preprint each title
   links to.

**Expected**: files 1 to 4 together hold every submission once. The
dashboard's pages show each of the 272 submissions once, and the
"Archives" pages each of the 272 preprints once.

**Observed**: each file holds the submissions its page showed, but the
four files together hold fewer different submissions than the list has:

| | submissions in files 1–4, counting repeats | different submissions | in two files | in no file |
|---|---|---|---|---|
| OJS | 320 | 301 | 19 (e.g. 21, in files 1 and 4) | 19 (e.g. 59) |
| OMP | 306 | 289 | 17 (e.g. 19, in files 1 and 3) | 17 (e.g. 101) |
| OPS | 304 | 286 | 18 (e.g. 20, in files 1 and 3) | 18 (e.g. 74) |

The dashboard's 10 pages showed 272 rows but 234 different submissions
on OJS and 235 on OMP. Submission 21 was on five of the pages, on both
apps.

On OPS, "Archives" showed 272 preprints over 11 pages, 268 of them
different. Submission 19, "Finocchiaro: Arguments About Arguments", was
on pages 1 to 5. Four preprints were on no page.

OPS has no dashboard view past one page here: the imported copies of
its published preprints are in none of the dashboard's views.

No request failed, and the page logged no script error.

## Cause

Every list here gets its submissions from `PKP\submission\Collector`,
one page per request (`LIMIT`/`OFFSET`). The export list asks
`GET /api/v1/submissions?count=100&offset=…` with no `orderBy`, and the
dashboard asks `GET /api/v1/_submissions?…&offset=…&count=30` with
none. So the Collector uses its default, `ORDERBY_DATE_SUBMITTED`
`DESC`, which `getQueryBuilder()` turns into `ORDER BY s.date_submitted
DESC` and nothing after it
([Collector.php#L531-L534](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/classes/submission/Collector.php#L531-L534)).
OPS's "Archives" orders by `ORDERBY_DATE_PUBLISHED` (`po.date_published`,
a date), again with nothing after it
([PreprintsHandler.php#L73-L78](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/pages/preprints/PreprintsHandler.php#L73-L78)).

SQL leaves the order of rows with equal sort values to the database.
Each page is a separate query, and the database may order the tied rows
differently in each one. When a group of tied rows crosses a page
boundary, a row can come back on two pages, and another on none.
PostgreSQL does this here, and MySQL documents the same freedom for
`ORDER BY … LIMIT`.

Ties are common. The Native XML export writes `date_submitted` as a day
(`date('Y-m-d', …)` in `SubmissionNativeXmlFilter::createSubmissionNode()`,
[L98](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/plugins/importexport/native/filter/SubmissionNativeXmlFilter.php#L98)),
and the schema types it `date`. The import stores midnight of that day
([NativeXmlSubmissionFilter.php#L126-L127](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/plugins/importexport/native/filter/NativeXmlSubmissionFilter.php#L126-L127)).
Publication dates are dates without a time.

Reach:

- The Native XML export list on all three apps (on screen). ONIX 3.0 and
  PubMed use the same list (code).
- The editorial dashboard's views (on screen, OJS and OMP). Unfinished
  submissions have no submission date at all, so they tie with each
  other in "Active submissions" too (code).
- "My Submissions", the author's dashboard: the same request and order
  (code; no dataset author has more than 30 submissions).
- `GET /api/v1/submissions` paged with `count` and `offset`, with or
  without `orderBy`: every ordering it accepts lacks a second key (code;
  the export list's own requests above are this API).
- OPS's "Archives" and its section pages (`SectionsHandler`, same order;
  "Archives" on screen). OMP's "Catalog" and its series and category
  pages order by publication date or title the same way (code; walked
  once with 34 books, the catalog showed no repeat).
- OMP's series pages sorted by position: `APP\submission\Collector`
  replaces the order (`reorder()`), so the fix below does not reach it
  (code).

## Proposed fix

Give the submission Collector a last sort key, the submission ID, in the
direction of the main order
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-repeats-submissions-across-pages/fix.diff)):

```diff
--- a/lib/pkp/classes/submission/Collector.php
+++ b/lib/pkp/classes/submission/Collector.php
@@ -532,6 +532,12 @@
             default:
                 $q->orderBy('s.date_submitted', $this->orderDirection);
                 break;
+        }
+
+        // Break ties (submissions sharing a date or a sequence), so that the order is the same
+        // on every request and the pages of a paged list neither repeat nor skip a submission
+        if ($this->orderBy !== self::ORDERBY_ID) {
+            $q->orderBy('s.submission_id', $this->orderDirection);
         }
 
         if (isset($this->statuses)) {
```

The author Collector already breaks ties by `a.author_id`
(`pkp/pkp-lib#13003`), and `ORDERBY_ID` already sorts by this column.
IDs grow with creation, so "newest first" stays newest first among
equals. Rows that do not tie keep their order.

Tried on main, all three apps: the Steps then showed the Expected. Files
1 to 4 held 320, 306 and 304 different submissions, the dashboards 272
of 272, and "Archives" 272 of 272. On the dataset as it loads, where
nothing ties, the export list and "Active submissions" kept their order
with the fix in and out.

**Alternatives**:

- Ask for `orderBy=id`. The dashboard's `/api/v1/_submissions` accepts
  it, but `/api/v1/submissions`, which the export list asks, ignores an
  `orderBy` outside its allowed list, and `id` is not on it
  (`PKPSubmissionController::getSubmissionCollector()`), so the export
  list would need an API change too. Either way the order people see
  changes: an ID is given when a submission is started, and the
  submission date when it is finished (`pkp/pkp-lib#2270`). It also
  leaves the public lists open.
- Export the time with `date_submitted`. The schema types the attribute
  `date`, so this changes the format. It also does nothing for
  submissions already imported, unfinished ones, or publication dates.

**What goes with it**:

- No stored data to repair, and no API field changes: a client paging
  the API gets every submission once instead of a varying set.
- The issue Collector has the same gap. The
  [Export Issues report](https://github.com/jardakotesovec/pkp-e2e/issues/271)
  gives that list an order, and the
  [Archives report](https://github.com/jardakotesovec/pkp-e2e/issues/412)
  suggests `i.issue_id` as the last key of `ORDERBY_PUBLISHED_ISSUES`.
- OMP's series-position order needs the same last key after its
  `reorder()`, in `APP\submission\Collector::getQueryBuilder()`. It is
  not in the diff. Other Collectors that page by a column that is not
  unique (the user list by name, the event log by date) are outside this
  fix.
- Backport: `stable-3_5_0` takes the diff as it stands (`patch
  --dry-run`). `stable-3_4_0` has no `ORDERBY_ID` constant, so the
  diff's condition would be an undefined constant there and every
  submission query would fail. On 3.4 the key goes in without the
  condition: 3.4 has no ID ordering for it to repeat. On `stable-3_3_0` the same key goes
  after the first `orderBy()` in `PKPSubmissionQueryBuilder::getQuery()`;
  that query already groups by `s.submission_id`.
- Guard: a unit test asserting that every `ORDERBY_*` query ends with
  `s.submission_id`, and an end-to-end check that pages a list of tied
  submissions (the script in Evidence does this).

Small: one statement in one shared class, plus a test.

## Evidence

- Script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-repeats-submissions-across-pages/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-list-repeats-submissions-across-pages/lib.js).
  It takes the preconditions and Steps 1–5 by default, the
  preconditions and Steps 6–7 with `reader`, and with `neighbour` reads
  the orders on the dataset as it loads. Run from the pkp-e2e repo
  after resetting the install to the dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/export-list-repeats-submissions-across-pages/walk.js [reader|neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/export-list-repeats-submissions-across-pages/fix.diff ojs omp ops`,
  then the script, then `revert`.
- Walked on PostgreSQL, pkp/datasets 1a5552c (2026-10-04), loaded fresh
  before each walk. MySQL not checked.
- 3.5 gave the same numbers as main for Steps 1–5 on all three apps.
  On Steps 6–7, OPS repeated preprint 11 on five pages (268 of 272).
- Tips, main: OJS ff004d0973 (pkp-lib 987776cd04, ui-library 64d67363),
  OMP 3b0ecf794 and OPS c8af945bb7 (both pkp-lib 3dc90c81a6, ui-library
  280f98c5). 3.5: OJS c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246 and
  OPS 38b61882d3 (both pkp-lib cf3f984335). The Collector's default
  order is the same on both branches.
- 3.4 (code): pkp-lib `stable-3_4_0` 767353f4fe has the same default
  case in `Collector::getQueryBuilder()` and no `ORDERBY_ID`, the same date-only export,
  and `count` 100 in `PKPNativeImportExportPlugin`. OJS d68934d0d1, OMP
  0aec65441 and OPS acd8ae704b ship the Native XML tool.
- 3.3 (code): pkp-lib `stable-3_3_0` ac3fa73402
  `PKPSubmissionQueryBuilder` sorts by `$orderColumn`
  (`s.date_submitted` by default) alone, and its export writes the date
  with `strftime('%Y-%m-%d', …)`. OJS ac77c9fb35 and OMP 8e72fc883 ship
  the Native XML tool. OPS c5532e2161 has no Native XML tool, but its
  "Archives" (`PreprintsHandler`, 25 to a page, `orderBy`
  `datePublished` on a `date` column) and its dashboard lists (30 to a
  page, `dateSubmitted` by default) sort by that one column.
- Introduced: `git blame` on the default case gives 1f48f6e414
  (`pkp/pkp-lib#5328`, 2021), the move to the Collector. `git log -S`
  on `$orderColumn = 's.date_submitted'` leads to 1d7faabe79, which added
  the query builder with that order; its PR is `pkp/pkp-lib#2399`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched 2026-10-04 by symptom (duplicates, pagination, missing on the
  next page, order) and by `ORDERBY_DATE_SUBMITTED` and the Collector.
- Not walked: ONIX 3.0 and PubMed exports, "My Submissions", unfinished
  submissions, the API outside the screens' own requests, OMP's series
  pages, MySQL. Unverified: how often realistic data (small groups of
  same-day submissions) hits a page boundary; the walks used one large
  group.
