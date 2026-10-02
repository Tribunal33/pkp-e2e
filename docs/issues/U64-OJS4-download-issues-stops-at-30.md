# Statistics › Issues: "Download Issues" leaves out every issue after the first 30, without saying so

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no "Issues" statistics page)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` · [8a756b6b33](https://github.com/pkp/ojs/commit/8a756b6b33e4bf5b87d053465e09665aa34f5af7) · 2022-03-09 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U64 [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#ojs4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On Statistics › "Issues", an editor presses "Download Report", then
"Download Issues", and expects a file with every issue the table
counts for the chosen range. When more than 30 issues were visited in
the range, the page reads "30 of 31 issues" and has a second page, but
the file lists only 30 issues: the download is held to a fixed limit
of 30 that only the table's own requests lift.

The file opens with the range and looks complete; nothing says it is
cut short. When the visit counts differ, the issues left out are the
least visited ones; among issues with the same count, which ones are
left out is arbitrary.

The table on screen still shows every issue. "Download Timeline" on
the same page is complete.

## Impact

- **Lost.** The file misses the line of every issue past the 30th, so
  a sum made from the file comes out too low.
- **Who.** Journal managers and editors who download the issue
  figures. The page lists only issues visited in the chosen range, and
  it opens on the last 30 days. A journal with a long archive that
  readers browse meets it on any range; a journal with more than 30
  published issues meets it at the latest on "All dates", once each
  issue has had a visit.
- **Way round.** Typing a search narrows the file to the issues found,
  so the list can be downloaded in parts and joined by hand; this was
  seen to work. Pressing "Total" reverses the order, and a second
  download then holds the other end of the list; this was not tried
  here, and past 60 issues it leaves a middle that only searches
  reach.

Medium: the export misses rows without a word, on journals whose
readers visit more than 30 issues in the range, while the screen has
the full figures. The severity would be high if the file were the only
place to get them.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. It has one published
  issue, "Vol. 1 No. 2 (2014)". The "Issues" statistics page lists only
  issues visited in the range, so the steps publish 30 more and visit
  all 31.

Steps:

1. Sign in as `dbarnes`. Open Issues › "Future Issues" and press
   "Create Issue": Volume 3, Number 1, Year 2026, Title "u64c 01",
   "Save". Repeat for Number 2 to 30 ("u64c 02" to "u64c 30").
2. On each of the 30 new rows, press the arrow, then "Publish Issue",
   untick "Send an email about this to all registered users." and
   press "OK".
3. Sign out. Open "Archives" and open each of the 31 issues once, from
   every page of the list, in an ordinary browser (3.5 counts a
   headless browser as a robot and drops its visits).
4. The next day, sign in as `dbarnes` and open Statistics › "Issues"
   (`/index.php/publicknowledge/en/stats/issues/issues`). The date
   range never includes today, and a day's visits become figures when
   the daily "Usage statistics file loader task" and the jobs it queues
   have run. The dataset's config runs both on web requests
   (`task_runner = On`, `job_runner = On`).
5. Press "Download Report", then "Download Issues", and open the file.

In one sitting, instead of waiting for step 4's next day: after step
3, date the day's visits one day back, hand the log to the loader and
run the task and the queue, from the app's root. The log file keeps
the name the app gave it; only the `time` of each line changes.

```sh
cd <files_dir>/usageStats        # files_dir as in config.inc.php
mkdir -p stage
f=usageEventLogs/usage_events_$(date +%Y%m%d).log   # the day's log, dated in the install's time zone
php -r '$f = $argv[1]; file_put_contents("stage/" . basename($f), preg_replace_callback("/\"time\":\"([^\"]+)\"/", fn ($m) => "\"time\":\"" . date("Y-m-d H:i:s", strtotime($m[1] . " -1 day")) . "\"", file_get_contents($f))); unlink($f);' $f

cd <the app's root>
php lib/pkp/tools/scheduler.php test '--name=APP\tasks\UsageStatsLoader'
php lib/pkp/tools/jobs.php work --stop-when-empty   # main
php lib/pkp/tools/jobs.php run                      # 3.5: repeat until "No jobs available"
```

Then take step 4 without the wait. `metrics_issue` then holds one row
per visited issue, dated yesterday.

**Expected.** The page reads "30 of 31 issues" and has a second page.
The file holds every issue of the range: 31 lines under the column
names.

**Observed.** The page reads "30 of 31 issues" and page 2 reads "1 of
31 issues". The file holds 30 issue lines: one issue of the table is
missing. Here it was "Vol. 3 No. 30 (2026): u64c 30", the row on page
2. Thirty of the 31 issues have one view each, so which of them is
left out is the database's choice (PostgreSQL here).

```
GET /index.php/publicknowledge/api/v1/stats/issues?dateStart=2026-09-01&dateEnd=2026-10-01&orderBy=total&orderDirection=DESC   (Accept: text/csv)   200

"Date Range","2026-09-01 to 2026-10-01"

ID,"Issue identification",Total,Views,Downloads
1,"Vol. 1 No. 2 (2014)",3,3,0
3,"Vol. 3 No. 1 (2026): u64c 01",1,1,0
…
31,"Vol. 3 No. 29 (2026): u64c 29",1,1,0
```

The table's own request names the page it wants
(`stats/issues?count=30&offset=0&…`, then `offset=30`); the download's
request names none.

With the search box holding "No. 3", the table reads "1 of 1 issues"
and "Download Issues" holds that one issue, so a file of 30 issues or
fewer is complete.

## Cause

`StatsIssueController::getMany()` (OJS
`api/v1/stats/issues/StatsIssueController.php`, lines 122 to 126)
answers the table's JSON and the download's CSV from one code path,
and starts both from the same defaults:

```php
$defaultParams = [
    'count' => 30,
    'offset' => 0,
    'orderDirection' => StatisticsHelper::STATISTICS_ORDER_DESC,
];
```

The table sends its own `count` and `offset`
(`StatsPublicationsPage.vue::getParams()`). The download is built by
`getReportParams()`, which sends neither, because a report is meant to
hold every row. So the default reaches the service.

`StatsIssueService::getQueryBuilder()` (lines 164 to 169) sets
`limit($args['count'])` and the offset whenever `count` is set.
`getTotals()` and `getCount()` both build their query there.
`getTotals()` passes the defaults on, so the CSV stops at 30;
`getCount()` unsets `count` and `offset` first, so it still counts 31.

`getTotals()` orders by the metric alone (lines 81 and 82), so among
issues with the same total the database decides which fall past the
limit. The request's `orderBy=total` plays no part: `getMany()` does
not allow `orderBy`, and only `orderDirection` is read.

The articles' controller had the same defaults. pkp-lib
[2711914871](https://github.com/pkp/pkp-lib/commit/27119148718b7052db4a30f406fe04eb95543266)
("remove required count parameter for stats publication API",
`pkp/pkp-lib#8308` for `pkp/pkp-lib#7318`) removed them when the
article download was built. The issues' controller lives in OJS and
kept them, and the "Issues" page's download window, added three weeks
later (`pkp/ui-library#217`, `pkp/ojs#3571`), reuses the articles'
`getReportParams()`.

A larger `count` sent from the browser would not help either:
`_processAllowedParams()` caps it at 100.

Reach ("seen" is on a running install, "code" is read in the source
only):

- "Download Issues" under any range, search and order, whenever more
  than 30 issues match (seen on the default range).
- "Download Timeline" on the "Issues" page is not touched:
  `getManyTimeline()` has no `count` (seen: 31 day lines).
- "Download Articles", "Download Files" and "Download Geographic" have
  no default `count` since the pkp-lib change above (code).
- `PKPStatsContextController::getMany()` in pkp-lib has the same two
  defaults and also answers CSV. No screen calls it: the "Journal"
  page reads `stats/contexts/{id}`. An API client asking for the CSV
  of more than 30 contexts gets 30 (code).

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/download-issues-stops-at-30/fix.diff),
applied to OJS. With it the file of the Steps holds 31 issue lines,
"Vol. 3 No. 30 (2026): u64c 30" the last.

The rest of the page behaves the same with the patch as without it,
checked on the same 31 issues both ways: the table read "30 of 31
issues" with 30 rows and page 2 "1 of 31 issues" with one, the search
"No. 3" gave one row and a file of that one issue, and "Download
Timeline" gave its 31 day lines.

Recommended: drop the two defaults in `getMany()`, as pkp-lib did for
the articles' controller:

```diff
         $defaultParams = [
-            'count' => 30,
-            'offset' => 0,
             'orderDirection' => StatisticsHelper::STATISTICS_ORDER_DESC,
         ];
```

`StatsIssueService::getQueryBuilder()` already limits only when
`count` is set, and the table always sends it, so the page is
unchanged.

One thing for the reviewer to decide with this in view: a JSON request
to `stats/issues` without `count` then returns every issue instead of
30, and the cap of 100 applies only to a `count` that is sent.
`stats/publications` has behaved so since 3.4.

**Alternatives:**

- Keep the defaults for JSON and drop them for CSV only
  (`if (!$responseCSV)`). It keeps the API's documented default of 30
  and its cap, but differs from how the articles' controller was
  mended.
- Send a `count` from the download window. `_processAllowedParams()`
  caps it at 100, so a journal with more than 100 visited issues would
  still lose lines.

**What goes with it:**

- No data repair.
- `docs/dev/swagger-source.json` gives `default: 30` and "Max is
  `100`" for `count` on `stats/issues` and `stats/publications`; both
  entries want the edit.
- The contexts' controller (Reach) has the same fault for API clients.
  It is a separate pkp-lib change of the same two lines, not part of
  this fix: no screen reaches it, so it was not tried.
- A second order key in `getTotals()` (the issue ID) would make the
  table's pages and the file stable among equal totals. Not needed for
  this fix, and not tried.
- Backport: 3.5 has the same lines (123 and 124); 3.4 has them in
  `api/v1/stats/issues/StatsIssueHandler.php` (110 and 111).
- Guard: an e2e scenario in pkp-e2e's usage statistics spec, more than
  30 visited issues and the file's line count. OJS has no unit tests
  for the stats controllers to extend.

Small: two lines in one OJS method.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/download-issues-stops-at-30/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/download-issues-stops-at-30/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/download-issues-stops-at-30/walk.js`;
  the argument `neighbour` runs the check of the rest of the page. It ran on installs freshly loaded
  from PKP's default test dataset (pkp/datasets e8dafbc, 2026-10-02,
  the `main` and `stable-3_5_0` PostgreSQL dumps).
- The script did not wait a day: it took the "In one sitting" note
  under the Steps, with the same file handling, task and queue
  commands. The `php -r` line of the note is the script's own
  JavaScript rewritten for a shell; it was run on a copy of a log,
  not in a walk. On 3.5 the reader's visits of step 3 came from a
  browser window with an ordinary Chrome user agent.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/download-issues-stops-at-30/fix.diff ojs`.
- main walked at OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363). 3.5 walked at OJS 091fb65453 (lib/pkp cf3f984335,
  lib/ui-library d4e01883): the same count lines, the same request and
  a file of 30 lines without "Vol. 3 No. 30 (2026): u64c 30".
- Code read on main: OJS `api/v1/stats/issues/StatsIssueController.php`
  (`getMany()`, `getManyTimeline()`, `_processAllowedParams()`),
  `classes/services/StatsIssueService.php` (`getQueryBuilder()`,
  `getTotals()`, `getCount()`), `pages/stats/StatsHandler.php` (`issues()`),
  `docs/dev/swagger-source.json`; lib/pkp
  `api/v1/stats/publications/PKPStatsPublicationController.php` and
  `api/v1/stats/contexts/PKPStatsContextController.php` (their
  defaults), `pages/stats/PKPStatsHandler.php` (the "Journal" page's
  API address), `classes/task/PKPUsageStatsLoader.php` and
  `jobs/statistics/PKPProcessUsageStatsLogFile.php` (what the loader
  takes and drops); lib/ui-library
  `src/components/Container/StatsPublicationsPage.vue` (`getParams()`,
  `getReportParams()`, `downloadReport()`), `StatsIssuesPage.vue` and
  `StatsContextPage.vue`. 3.5: the same controller lines and the same
  `getReportParams()`.
- 3.4 by code: OJS `upstream/stable-3_4_0` (c1827e3527),
  `api/v1/stats/issues/StatsIssueHandler.php` line 110, the same
  defaults before a CSV answer; lib/ui-library `origin/stable-3_4_0`
  (ee684b34), `getReportParams()` without `count` and
  `StatsIssuesPage.vue` extending the articles' page.
- 3.3 by code: OJS `upstream/stable-3_3_0` (ac77c9fb35) and lib/pkp
  `origin/stable-3_3_0` (ac3fa73402) have no `api/v1/stats/issues` and
  no issues page under `pages/stats`.
- Introduced: `git blame` on lines 123 and 124 gives 8a756b6b33, which
  created the file (then `StatsIssueHandler.inc.php`) with the CSV
  answer and the defaults. The screen that asks for the CSV came with
  `pkp/ui-library#217` (2022-10-27) and `pkp/ojs#3571`; all of it
  first shipped in 3.4.0.
- Upstream search, 2026-10-02, pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, open and closed, by "Download
  Issues", statistics issues report, CSV and count, and the class
  names. The related items are `pkp/pkp-lib#7318` and its PRs, which
  built the downloads.
- MySQL not checked for which issue is left out among equal totals;
  the limit itself does not depend on the database.
- Not seen on a running install here: the reversed order's file (the
  spec's probe of 2026-09-27 saw it drop the other end of the list;
  the request carries `orderDirection`, and the service applies it), a
  range other than the default, waiting a real day with the task and
  job runners on web requests, the contexts' API, and 3.4. Unverified:
  how many journals have more than 30 issues visited in a month.
