# "Counter R5": the downloaded "counterReport.tsv" is comma-separated, not tab-separated

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; tab-separated)
  - 3.3: none (code; no "Counter R5" page)
- **Introduced** `pkp/pkp-lib#10149` for `pkp/pkp-lib#9666` · [0ab6693b](https://github.com/pkp/pkp-lib/commit/0ab6693bcfa01152097a5ce6b61fd9445ecdd455) · 2024-08-09 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U64 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Statistics › "Counter R5", an editor presses "Edit" on a report and
then "Download" in "Report Settings". The browser saves
"counterReport.tsv", a name that promises tab-separated values, but the
file's lines are comma-separated with quoted text
(`Report_Name,"Platform Master Report"`) and hold no tab. Expected:
tab-separated values, as the name says.

A program that reads the file as tab-separated puts each line in one
column. Read as comma-separated, the file is sound.

Each report the "Counter R5" page lists downloads this way, and a
program that asks the server for a report as tab-separated values,
without the page, gets the same comma-separated answer.

## Impact

- **Lost.** Nothing: the file holds the whole report. No message says
  that its contents are not what its name promises.
- **Who.** Editors, managers and section editors who download a COUNTER
  report from "Counter R5", whoever they pass the file to (a library
  that asked for the report), and a program that fetches the report as
  tab-separated values.
- **Way round.** Read the file as comma-separated: rename it to ".csv",
  or pick the comma as the separator when importing it. Whoever opens
  the file has to find this out: the editor before passing it on, or
  else the library that receives it. A program that fetches the report
  can ask for the JSON form instead.

Low: nothing is lost and the task gets done once the file is read as
comma-separated. It would be medium if the file could not be read at
all without editing it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. The press and the preprint
  server take the same steps.
- An install that is at least one whole calendar month old. On a newer
  one "Counter R5" shows "There are no COUNTER R5 usage statistics
  available yet." and "Download" is refused.
- The default dataset is such a new install: its dump carries the day
  it was built as the install date and as every publication's date,
  and no screen changes either. So run this SQL before the steps:

  ```sql
  UPDATE versions SET date_installed = '2026-06-15 12:00:00' WHERE product_type = 'core';
  UPDATE publications SET date_published = '2026-06-15' WHERE date_published IS NOT NULL;
  ```

Steps:

1. Sign in as `dbarnes` and open Statistics › "Counter R5".
2. Press "Edit" on "Platform Master Report (PR)". "Report Settings"
   opens with "Start Date" 2026-07-01 and "End Date" 2026-09-30.
3. Press "Download". The browser saves "counterReport.tsv".
4. Open the file in a text editor.

**Expected.** Tab-separated lines (a tab shown as `<TAB>`):

```
Report_Name<TAB>"Platform Master Report"
Report_ID<TAB>PR
…
Platform<TAB>Metric_Type<TAB>Reporting_Period_Total<TAB>Jul-2026<TAB>Aug-2026<TAB>Sep-2026
```

**Observed.** The file holds no tab. It reads:

```
Report_Name,"Platform Master Report"
Report_ID,PR
Release,5
Institution_Name,"The World"
Institution_ID,
Metric_Types,Total_Item_Investigations;Unique_Item_Investigations;Total_Item_Requests;Unique_Item_Requests
Report_Filters,
Report_Attributes,
Exceptions,"3030:No Usage Available for Requested Dates(No usage available for requested dates. Request was for 2026-07-01 to 2026-09-30.)"
Reporting_Period,Begin_Date=2026-07-01;End_Date=2026-09-30
Created,2026-10-02T22:07:14Z
Created_By,"Journal of Public Knowledge"

Platform,Metric_Type,Reporting_Period_Total,Jul-2026,Aug-2026,Sep-2026
```

The page asks for tab-separated values and the server answers with
comma-separated ones:

```
GET /api/v1/stats/sushi/reports/pr?begin_date=2026-07-01&end_date=2026-09-30&customer_id=0&metric_type=…
Accept: text/tab-separated-values; charset=utf-8

200
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename=user-report-2026-10-02.csv
```

## Cause

`PKPStatsSushiController::getReportResponse()` (lib/pkp
`api/v1/stats/sushi/PKPStatsSushiController.php`, line 381) builds the
tabular report and returns it with

```php
return response()->withFile($report, [], count($reportItems));
```

`withFile` is the response macro in `PKPRoutingProvider::boot()`. Its
fourth parameter, `$responseType`, sets the separator, the content type
and the file extension, and defaults to
`PKPRoutingProvider::RESPONSE_CSV`. The call leaves it out, so the
report is written with commas and answered as `text/csv`, although the
method has just read the request's `Accept` header and chosen the
tabular branch because it names `text/tab-separated-values`.

Passing `RESPONSE_TSV` alone would not work. The constant's separator
is written in single quotes, `'separator' => '\t'`
(`PKPRoutingProvider.php`, line 44), which in PHP is a backslash and a
"t", two characters, and `fputcsv()` refuses that:
`ValueError: fputcsv(): Argument #3 ($separator) must be a single character`.

3.4 does this right: `APIResponse::withCSV()` takes
`APIResponse::RESPONSE_TSV` from the controller and sets
`$separator = "\t"`.

The port to the new routing never returned tabs. `pkp/pkp-lib#10146`
added the macro, already named `withFile`, with the single-quoted
separator. The controller's tabular branch came to `main` with
`pkp/pkp-lib#10149`. Its first commit still called
`withCSV(…, PKPRoutingProvider::RESPONSE_TSV)`, a macro that did not
exist. Its commit "consider TSV stream response" changed the call to
`withFile` and dropped the `RESPONSE_TSV` argument, which is the line
as it is today.

`withFile` writes a UTF-8 byte order mark before the first line, as
3.4's `withCSV()` did. The page reads the answer as text, which drops
the mark, so the saved file starts with "Report_Name"; a client that
reads the answer's bytes gets the mark first.

The page saves whatever arrives under a fixed name:
`CounterReportsEditModal.vue` puts the answer into a `Blob` and sets
`link.download = 'counterReport.tsv'`, so the answer's own file name,
"user-report-2026-10-02.csv", is never used.

Reach:

- Every report of the "Counter R5" list, all through
  `getReportResponse()`: PR, PR_P1, TR, TR_J3, IR and IR_A1 on a
  journal; PR, PR_P1, TR and TR_B3 on a press; PR, PR_P1 and IR on a
  preprint server (walked, each one).
- A program that fetches a report from the API
  (`/api/v1/stats/sushi/reports/<id>`) with
  `Accept: text/tab-separated-values` gets the same comma-separated
  answer. This is read in the code, not run: the request goes through
  the same method, and the page's own request is such a request.
- The JSON answer of the same API address is a separate branch of the
  method and is not affected (walked: the address typed in the browser
  answers JSON).
- The statistics pages' "Download Report" files also come from
  `withFile`, are meant to be comma-separated and are named ".csv"
  (walked: unchanged).
- `RESPONSE_TSV` is read in one place only, the `Accept` test of this
  method, which reads its `mime`. Nothing reads its separator, so the
  single-quoted value has never been used (code: a search of lib/pkp
  and the three apps).

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-report-tsv-comma-separated/fix.diff),
applied to the three apps. With it every report's file is tab-separated
(`Report_Name<TAB>"Platform Master Report"`) and the answer is
`text/tab-separated-values` with the file name
"user-report-2026-10-02.tsv".

A second check shows the fix reaches nothing else. Run once with the
patch applied and once without, "Download Articles" ("Download Monographs", "Download Preprints") on
the statistics page gave the same comma-separated `text/csv` file, the
report's address typed in the browser answered JSON, and a "Start Date"
of 2001-01 was refused with its message and no file.

Recommended: give the call its response type, and make the constant's
separator a real tab.

```diff
--- a/lib/pkp/api/v1/stats/sushi/PKPStatsSushiController.php
-            return response()->withFile($report, [], count($reportItems));
+            return response()->withFile($report, [], count($reportItems), PKPRoutingProvider::RESPONSE_TSV);
--- a/lib/pkp/classes/core/PKPRoutingProvider.php
     public const RESPONSE_TSV = [
         'mime' => 'text/tab-separated-values',
         'extension' => '.tsv',
-        'separator' => '\t'
+        'separator' => "\t"
     ];
```

**Alternatives:**

- Rename the download to "counterReport.csv" in
  `CounterReportsEditModal.vue` and ask for `text/csv`. The name and
  the contents would agree, but the code builds a "TSV report"
  and 3.4 delivers tabs, so it would settle the regression the wrong
  way.
- Convert commas to tabs in the browser. The server would still answer
  a `text/tab-separated-values` request with `text/csv`, also to a
  SUSHI client.

**What goes with it:**

- No data repair. A program that asks the API for
  `text/tab-separated-values` starts to get tabs, which is what it
  asked for.
- `fputcsv()` still puts double quotes round a value that holds a
  space, as on 3.4 (`"Platform Master Report"`). Whether COUNTER's
  tabular format wants those quotes is a separate question, left out
  here.
- Backport: 3.5 has both lines unchanged at the same places, so the
  diff applies as written.
- Guard: an e2e scenario in pkp-e2e's usage statistics spec (the
  downloaded file's first line, with a leading byte order mark
  stripped, split on a tab gives "Report_Name" and the report's name).

Small: two lines in lib/pkp, following the 3.4 code, plus a test.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/counter-report-tsv-comma-separated/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-report-tsv-comma-separated/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all <walk.js>`:
  no argument for the Steps, `neighbour` for the fix's control. It ran
  on installs freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, the `main` and `stable-3_5_0`
  PostgreSQL dumps), runs the two SQL statements of the preconditions
  first, and reads each download's request, the answer's headers and
  the file's lines as written. After the PR report it takes the same
  two presses on every other report of the list.
- The SQL of the preconditions changes the two dates
  `CounterR5Report::getEarliestDate()` compares: the COUNTER start and
  the journal's first `date_published`. The COUNTER start is
  `PKPStatsSushiService::getEarliestDate()`: the site setting
  `counterR5StartDate` when it is set (an upgrade from 3.3 sets it),
  else the install date (`VersionDAO::getInstallationDate()`). The
  default dataset has no such setting, so the install date decides
  there; on an install that has the setting, the first statement
  changes nothing and the setting's own date counts. The dataset was
  installed and published on 2026-10-02. `pkp/pkp-lib#12287` gives the
  same two statements for testing these reports on a new install.
- The dataset has no COUNTER figures, so each file held its header
  lines, the "3030" exception and the column names, and no rows of
  figures. A file with rows was not seen; they are written by the same
  `fputcsv()` loop.
- Unverified: no spreadsheet program and no COUNTER tool was tried on
  the file. That a tab-separated read gives one column per line
  follows from the file holding no tab, which the walk counted.
- The byte order mark: the walk read each saved file's first character
  and found none; that the answer itself starts with one is read in
  the `withFile` macro.
- The COUNTER Code of Practice was not read; the page links to it. The
  Expected rests on the file's name, the request's `Accept` header and
  3.4's code.
- The fix was applied with
  `node bin/try-fix.js apply <fix.diff> ojs omp ops`: the Steps with
  the fix in, and the control with the fix in and out. The control's
  typed address carried no dates, so its JSON answer was COUNTER's
  "Insufficient Information to Process Request" (400) both times.
- The `ValueError` for the two-character separator was read from
  `fputcsv()` itself on PHP 8.4 (`php -r`), not from the app: no
  request reaches that line today.
- main walked at OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5). 3.5 walked at OJS 091fb65453, OMP
  9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335, lib/ui-library
  d4e01883): the same request, answer and file on every report.
- Code read on main: lib/pkp
  `api/v1/stats/sushi/PKPStatsSushiController.php`
  (`getReportResponse()`), `classes/core/PKPRoutingProvider.php` (the
  two constants and the `withFile` macro), every `withFile` caller in
  lib/pkp and the apps, each app's `api/v1/stats/sushi` controller
  (they only call `getReportResponse()`); lib/ui-library
  `src/pages/counter/components/CounterReportsEditModal.vue`.
- 3.4 by code: lib/pkp `origin/stable-3_4_0` (9e41f10273),
  `api/v1/stats/sushi/PKPStatsSushiHandler.php` line 348
  (`withCSV($report, [], count($reportItems), APIResponse::RESPONSE_TSV)`)
  and `classes/core/APIResponse.php::withCSV()` (`$separator = "\t"`);
  lib/ui-library `origin/stable-3_4_0` (ee684b34),
  `CounterReportForm.vue` sends the same header and file name.
- 3.3 by code: lib/pkp `origin/stable-3_3_0` (ac3fa73402) has no
  `api/v1/stats/sushi`, and lib/ui-library `origin/stable-3_3_0`
  (96959f9e) no COUNTER component.
- Introduced: `git blame` on line 381 gives 0ab6693b, whose diff
  replaces
  `withCSV($report, [], count($reportItems), PKPRoutingProvider::RESPONSE_TSV)`
  with `withFile($report, [], count($reportItems))`. At its parent the
  provider registers `withFile` only, so the earlier call named no
  macro. 0ab6693b is one of the commits of `pkp/pkp-lib#10149`, merged
  2024-10-15, and the whole tabular branch reached `main` with that
  merge. The single-quoted separator blames to
  [c3fd1beb](https://github.com/pkp/pkp-lib/commit/c3fd1bebbc8f43893637ce991c81c30969390934)
  (2024-06-28, `pkp/pkp-lib#10146` for `pkp/pkp-lib#10145`, the same
  author). 3.5.0 is the first release with either.
- Upstream search, 2026-10-02, pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, open and closed, by COUNTER, TSV,
  comma, separator, tab-separated, SUSHI, "counterReport.tsv",
  `RESPONSE_TSV` and `withFile`. The hits are the issues that built the
  feature (`pkp/pkp-lib#8248`, `#9666`, `#10145`) and
  `pkp/pkp-lib#12287` (closed, fixed), which is about when the address
  answers the tabular form instead of JSON, not about its separator.
- The walks ran on PostgreSQL.
