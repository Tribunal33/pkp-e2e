# "Counter R5": "Journal Article Requests (IR_A1)" also lists investigation rows, which its "Metric_Types" line leaves out

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no COUNTER R5 reports)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` · [5b00b02642](https://github.com/pkp/ojs/commit/5b00b026428b1c6856b24e7208fe17accc9c1235) · 2021-12-10 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U64 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#ojs5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Statistics › "Counter R5", an editor downloads "Journal Article
Requests (IR_A1)". The file's "Metric_Types" line reads
"Total_Item_Requests;Unique_Item_Requests", but its table also holds a
"Total_Item_Investigations" and a "Unique_Item_Investigations" row for
each article. An article whose page readers opened without opening any
of its files is listed too, with those two rows alone. Expected:
request rows only, as the file's "Metric_Types" line says and as the
report's name promises.

The request rows are there and their figures are right, and each row
names its metric, so the file can still be used. A program that takes
every row of this report for a request counts too much.

Every journal gets these rows once it has usage figures in the months
the report is asked for, in the downloaded file and in the answer of
the journal's SUSHI address.

## Impact

- **Lost.** Nothing. No message says that the file holds more than its
  "Metric_Types" line names.
- **Who.** Editors and managers who download this report, and the
  librarians or programs that receive it. It shows on every download.
- **Way round.** Leave out the rows whose "Metric_Type" is not a
  request type.

Low: the report holds more than it announces, and each extra row names
its metric. It would be medium if a harvester in use were shown to
count the extra rows as requests.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Its current issue holds
  "The Signalling Theory Dividends" and "Antimicrobial, heavy metal
  resistance and plasmid profile of coliforms isolated from nosocomial
  infections in a hospital in Isfahan, Iran", each with a "PDF" galley.
- A COUNTER report covers whole months only: from the month after the
  install date, or after the journal's first publication date if that
  is later, to the end of last month. The default dataset is installed
  and published on the day its dump was built, and no screen changes
  either date. So run this SQL before the steps:

  ```sql
  UPDATE versions SET date_installed = '2026-06-15 12:00:00' WHERE product_type = 'core';
  UPDATE publications SET date_published = '2026-06-15' WHERE date_published IS NOT NULL;
  ```

Steps:

1. Signed out, open "Current", press "The Signalling Theory Dividends",
   then "PDF" on the article page. The PDF opens.
2. Open "Current" again and press "Antimicrobial, heavy metal
   resistance …". Leave its PDF unopened.
3. Make the visits count for a past month, 2026-09 here. Copy the
   usage logs into the loader's `stage` folder as one file named for
   2026-09-15, with the date of each line's `time` rewritten to that
   day, and remove the originals. Then run the loader task and the job
   queue from the app's root:

   ```sh
   cd <files_dir>/usageStats        # files_dir as in config.inc.php
   mkdir -p stage
   sed -E 's/"time":"[0-9]{4}-[0-9]{2}-[0-9]{2} /"time":"2026-09-15 /' usageEventLogs/*.log > stage/usage_events_20260915.log
   rm usageEventLogs/*.log

   cd <the app's root>
   php lib/pkp/tools/scheduler.php test '--name=APP\tasks\UsageStatsLoader'
   php lib/pkp/tools/jobs.php work --stop-when-empty   # main
   php lib/pkp/tools/jobs.php run                      # 3.5: repeat until "No jobs available"
   ```

4. Sign in as `dbarnes` and open Statistics › "Counter R5".
5. Press "Edit" on "Journal Article Requests (IR_A1)". "Report
   Settings" opens with "Start Date" 2026-07-01 and "End Date"
   2026-09-30.
6. Press "Download" and open "counterReport.tsv".

Without step 3, the same shows by waiting: once the month of the
visits has ended and the daily "Usage statistics file loader task" has
run, the report offers that month and the rows are in its column.

The figures below are those of the dataset dump named in Evidence; the
shape of the rows is what matters. That dump's files already hold the
usage log of the day it was built, with the build's own visits to "The
Signalling Theory Dividends". Step 3 loads that log together with the
visits of steps 1 and 2, so on `main` the first article's figures are
higher than one visit gives. 3.5 discards the build's lines as a
robot's, and its figures are 2, 1, 1 and 1.

**Expected.** The table holds request rows only, as the "Metric_Types"
line says: two rows, both for "The Signalling Theory Dividends".
"Antimicrobial, heavy metal resistance …" had no request and is not
listed.

```
…,Metric_Type,Reporting_Period_Total,Jul-2026,Aug-2026,Sep-2026
"The Signalling Theory Dividends",…,Total_Item_Requests,3,0,0,3
"The Signalling Theory Dividends",…,Unique_Item_Requests,2,0,0,2
```

**Observed.** The "Metric_Types" line names two metric types and the
table holds six rows of four types. The second article is listed
although nobody requested it:

```
Report_Name,"Journal Article Requests"
Report_ID,IR_A1
…
Metric_Types,Total_Item_Requests;Unique_Item_Requests
…
…,Metric_Type,Reporting_Period_Total,Jul-2026,Aug-2026,Sep-2026
"The Signalling Theory Dividends",…,Total_Item_Investigations,7,0,0,7
"The Signalling Theory Dividends",…,Unique_Item_Investigations,2,0,0,2
"The Signalling Theory Dividends",…,Total_Item_Requests,3,0,0,3
"The Signalling Theory Dividends",…,Unique_Item_Requests,2,0,0,2
"Antimicrobial, heavy metal resistance …",…,Total_Item_Investigations,1,0,0,1
"Antimicrobial, heavy metal resistance …",…,Unique_Item_Investigations,1,0,0,1
```

The report's address typed in the browser
(`/index.php/publicknowledge/api/v1/stats/sushi/reports/ir_a1?begin_date=2026-07-01&end_date=2026-09-30&customer_id=0`)
answers JSON whose "Report_Filters" names
`Total_Item_Requests|Unique_Item_Requests`, while the first article's
figures hold all four metric types and the second article's the two
investigation types.

"Platform Usage (PR_P1)", the other requests-only report of the list,
names the same two metric types and holds only their rows.

## Cause

`IR_A1` (OJS `classes/sushi/IR_A1.php`) inherits its rows from `IR`.
`IR::getTSVReportItems()` (`classes/sushi/IR.php`, line 458) and
`IR::getReportItems()` (line 363) write one row, or one figure, per
entry of `$this->metricTypes`. That property is declared in
`CounterR5Report` (lib/pkp `classes/sushi/CounterR5Report.php`, line
63) with all four metric types as its default.

`IR_A1::setFilters()` (lines 87 to 120) puts the report's predefined
`Metric_Type` filter, `Total_Item_Requests|Unique_Item_Requests`, into
`$this->filters`, which the file's header lines are written from. It
does not call `CounterR5Report::setFilters()`, the only place that
turns a `Metric_Type` filter into `$this->metricTypes`, and it does
not set the property itself. So the "Metric_Types" line names two metric types
and the rows are written for the default four.

`PR_P1`, added in the same commit, has the same kind of `setFilters()`
and does not have the fault, because it also redeclares the property:

```php
class PR_P1 extends PR
{
    /** Requested metric types */
    public array $metricTypes = [
        'Total_Item_Requests',
        'Unique_Item_Requests'
    ];
```

Reach:

- The downloaded file and the JSON answer of
  `/api/v1/stats/sushi/reports/ir_a1`, both built from
  `$this->metricTypes` (the file walked on `main` and 3.5, the JSON on `main`).
- The other reports whose `setFilters()` skips the parent are not
  affected (code, the three apps' `classes/sushi`): `PR_P1` redeclares
  the property in each app. OJS `TR_J3` names the four types its rows
  are written for, the default of `CounterR5Report`. OMP `TR_B3` names
  six, and its rows are written for OMP `TR`'s own six: `TR`
  redeclares the property with the two "Unique_Title_…" types added.
  `TR_J3` and OJS `PR_P1` were also walked.
- OMP and OPS have no `IR_A1` (code: OMP has no item reports, OPS has
  `IR` only).
- No stored data is wrong: the figures are read from
  `metrics_counter_submission_monthly` as they are.

## Proposed fix

A proposal, tried on `main`:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ir-a1-lists-investigation-rows/fix.diff).
With it the file holds the two request rows of "The Signalling Theory
Dividends" and nothing else. A second check, run with the patch
applied and without, gave the same files both times: "Item Master
Report (IR)" and "Journal Usage by Access Type (TR_J3)" keep their
investigation and request rows, and "Platform Usage (PR_P1)" its two
request rows.

Recommended: give `IR_A1` the property `PR_P1` has.

```diff
--- a/classes/sushi/IR_A1.php
+++ b/classes/sushi/IR_A1.php
 class IR_A1 extends IR
 {
+    /** Requested metric types */
+    public array $metricTypes = [
+        'Total_Item_Requests',
+        'Unique_Item_Requests'
+    ];
+
     /**
      * Get report name defined by COUNTER.
```

**Alternatives:**

- Call `parent::setFilters()` with the predefined filters at the end of
  `IR_A1::setFilters()`, so the property follows the filter. It would
  work, but no sibling report does it this way: `PR_P1`, `TR_J3` and
  `TR_B3` all skip the parent.
- Derive `$metricTypes` from the `Metric_Type` filter in
  `CounterR5Report`, for every report. One rule instead of two
  declarations that must agree, but it changes the three apps' reports
  for one faulty class.

**What goes with it:**

- A SUSHI client that fetches `ir_a1` stops getting the investigation
  figures, which the report never named. That this is what COUNTER
  defines for IR_A1 rests on the report's own "Metric_Types" line and
  on `PR_P1`; no file in the repos quotes the standard (Evidence), so a
  reviewer should check it against the Code of Practice.
- With the fix, the JSON answer still lists an article that had no
  request, with an empty "Instance" list (seen in the trial: the second
  article). `IR::getReportItems()` adds every article of the query and
  filters only its figures, so "Item Master Report (IR)" narrowed to
  some metric types does the same (code). The file has no such row,
  because `getTSVReportItems()` writes a row only for a figure above
  zero. The fix makes this show for `ir_a1` on every journal with an
  article that was only looked at, so the same PR should close it:
  `IR::getReportItems()` skips an article none of whose periods has a
  figure. That second change is not in the diff and was not tried.
- Backport: `IR_A1.php` is the same file on 3.5 and has the same class
  head on 3.4, so the diff applies there as written.
- Guard: an e2e scenario in pkp-e2e's usage statistics spec (with an
  article page visited and no file opened, the IR_A1 file's
  "Metric_Type" column holds only the types its "Metric_Types" line
  names).

Small: one property in one OJS class, plus a test. The JSON change
above, if taken, is a few more lines in `IR.php`.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/ir-a1-lists-investigation-rows/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ir-a1-lists-investigation-rows/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs <walk.js>`:
  no argument for the Steps, `neighbour` for the fix's control. It ran on installs freshly
  loaded from PKP's default test dataset (pkp/datasets e8dafbc,
  2026-10-02, the `main` and `stable-3_5_0` PostgreSQL dumps) and runs
  the two SQL statements of the preconditions first.
- Step 3 in the script is the same file handling in JavaScript and
  the same task and queue commands. The shell lines were also run as
  written, once, on a freshly loaded `main` install after the SQL and
  three page fetches (the two article pages and the first one's PDF):
  `metrics_counter_submission_monthly` then held the same two rows as
  after the walk. They were not run as written on 3.5. On 3.5 the
  reader's visits came from a browser window with an ordinary Chrome
  user agent, because 3.5 counts a headless browser as a robot.
- Both runs had one log file, the build's day and the walk's being the
  same day in UTC. With two days' logs joined, the lines are not in
  time order. Read in the code, not run: each line is loaded on its own
  (`PKPProcessUsageStatsLogFile`), and the order matters only to
  `PKPTemporaryTotalsDAO::removeDoubleClicks()`, which merges two
  lines of one visitor and address within 30 seconds.
- The waiting path of the Steps was not taken.
- The figures on `main`: the dataset's own log
  (`usage_events_20261002.log`, 65 lines) holds seven lines for the
  first article's page and two for its PDF from the dataset's build;
  the walk added one of each, and one for the second article's page.
  After the loader, which merges repeated visits within 30 seconds,
  `metrics_counter_submission_monthly` held
  `1|202609|7|2|3|2` and `17|202609|1|1|0|0` (submission, month,
  investigations, unique investigations, requests, unique requests).
  On 3.5 the build's lines name "HeadlessChrome" and are dropped:
  `1|202609|2|1|1|1` and `17|202609|1|1|0|0`.
- The SQL of the preconditions changes the two dates
  `CounterR5Report::getEarliestDate()` compares, as in
  `docs/issues/U64-A11-counter-report-tsv-comma-separated.md`;
  `PKPUsageStatsLoader::isDateValid()` reads the same start date, so
  the loader takes a September log only after it.
- The files are comma-separated under the name "counterReport.tsv" on
  both versions; that is the A11 report, and the lines above are quoted
  as they came.
- The JSON answer was read on `main` only. On 3.5 the walk typed the
  address without `customer_id` and got COUNTER's "Insufficient
  Information to Process Request" (400); 3.5's `IR_A1.php` and
  `IR.php` are the same files as `main`'s.
- Unverified: what COUNTER's Code of Practice defines for IR_A1. It
  was not read, and no file in the apps or lib/pkp quotes it: the
  repos hold only the report's description ("Reports on journal
  article requests at the article level.", `locale/en/sushi.po`) and
  the predefined filter in `IR_A1`. The Expected rests on the file's
  own "Metric_Types" line and on `PR_P1`, which keeps its rows to the
  types it names.
- Unverified: no COUNTER validator and no harvester was tried on the
  file or on the SUSHI answer. What the walk shows is that every row
  names its metric.
- The fix was applied with
  `node bin/try-fix.js apply <fix.diff> ojs`: the Steps with the fix
  in, and the control with the fix in and out.
- main walked at OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363). 3.5 walked at OJS 091fb65453 (lib/pkp cf3f984335,
  lib/ui-library d4e01883).
- Code read on main: OJS `classes/sushi/IR_A1.php`, `IR.php`
  (`setFilters()`, `getReportItems()`, `getTSVReportItems()`),
  `TR_J3.php`, `PR_P1.php`; OMP `classes/sushi/PR_P1.php`, `TR.php`,
  `TR_B3.php`; OPS `classes/sushi/PR_P1.php`, `IR.php`; lib/pkp
  `classes/sushi/CounterR5Report.php` (`$metricTypes`, `setFilters()`,
  `getTSVReportHeader()`) and `classes/task/PKPUsageStatsLoader.php`.
  A search of the three apps and lib/pkp for `metricTypes` found no
  other writer of the property.
- 3.4 by code: OJS `upstream/stable-3_4_0` (c1827e3527),
  `classes/sushi/IR_A1.php` has no `$metricTypes` and the same
  `setFilters()`, `IR.php` loops over `$this->metricTypes` at lines
  364 and 459, and `PR_P1.php` redeclares the property; lib/pkp
  `origin/stable-3_4_0` (9e41f10273) `CounterR5Report.php` has the
  default of four and the same `setFilters()`.
- 3.3 by code: OJS `upstream/stable-3_3_0` (ac77c9fb35) has no
  `classes/sushi`; its COUNTER reports are the Release 4 ones of
  `plugins/reports/counter`.
- Introduced: `git log --follow` on `classes/sushi/IR_A1.php` ends at
  5b00b02642, which added `IR_A1.inc.php` with today's `setFilters()`
  and no `$metricTypes`, `IR.inc.php` looping over
  `$this->metricTypes`, and `PR_P1.inc.php` with the property. The
  commit is part of `pkp/ojs#3465`, merged 2022-07-23; 3.4.0 is the
  first release with it. The file download came later, in the pkp/ojs
  commit 84bdee7ff0 (2023-12-12, for `pkp/pkp-lib#9666`), and loops
  over the same property.
- Upstream search, 2026-10-03, pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, open and closed, by IR_A1,
  "Journal Article Requests", "Article Requests", Total_Item_Investigations, Metric_Types, `metricTypes`
  and COUNTER with investigations and requests. The hits are the
  issues that built the feature (`pkp/pkp-lib#6781`, `#6782`),
  `pkp/pkp-lib#12287` (closed; whether the SUSHI address answers JSON
  or a file),
  `pkp/pkp-lib#12311` (closed; JATS usage) and `pkp/pkp-lib#13231`
  (open; figures per publication version). None is about this
  report's rows.
- The walks ran on PostgreSQL.
