# "COUNTER Reports": the downloaded XML file names its report by a cut-off code path instead of "JR1" or "AR1"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; the report's class has no namespace there)
- **Introduced** [72bbb7a442](https://github.com/pkp/ojs/commit/72bbb7a442fd02f09b7d59f88c24af1316a881c1) for `pkp/pkp-lib#6091` · 2022-08-17 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U64 [OJS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#ojs6)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Statistics › "Reports" › "COUNTER Reports", an editor clicks a year
link beside "Journal Report 1:" or "Article Report 1:" and gets that
year's COUNTER Release 4.1 report as an XML file. Inside the file the
report's name reads `eports\counter\classes\reports\CounterReportJR1`
(or `…CounterReportAR1`), a cut-off internal code path, where the
report's code, "JR1" or "AR1", belongs.

The title beside it ("Journal Report 1", "Article Report 1"), the file
name and every figure in the file are right. A system that reads the
file and tells the reports apart by the name gets a meaningless one.
The editor has no way to correct it on screen; they can only edit the
file by hand.

The fix is a one-line change in the plugin.

## Impact

- **Lost.** Nothing tells the editor the name is wrong, so the file is
  passed on as it stands.
- **Who.** A journal manager or editor who downloads a Release 4.1
  report from "COUNTER Reports" and passes it on. The "Counter R5"
  page in the side menu, which serves the current release, does not
  have this fault.
- **Way round.** One attribute on one line, edited by hand.

Low: one attribute of a secondary export is wrong while the report's
title and all its figures are right, on a page that serves a
superseded COUNTER release. It would be medium if the Release 4.1
schema or a tool that reads these files rejected the file for its
name.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` or `stable-3_5_0`. Its
  published issue "Vol. 1 No. 2 (2014)" holds the article "The
  Signalling Theory Dividends" with a "PDF" galley. "COUNTER Reports"
  shows a year link only for a year with file views up to yesterday.
- On `main` the dataset's files already hold such views: the usage
  log of the day the dump was built, with two views of that PDF. Once
  the daily "Usage statistics file loader task" has run on a later
  day, the page offers that year's link, and steps 1 and 2 can be
  skipped. On `stable-3_5_0` the dump's views are a robot's and the
  loader drops them, so steps 1 and 2 are needed.

Steps:

1. Signed out, open the journal's home page, click "Current", open
   "The Signalling Theory Dividends" and click "PDF", in an ordinary
   browser (3.5 counts a headless browser as a robot and drops its
   visits).
2. The next day, sign in as `dbarnes`, open Statistics › "Reports" and
   click "COUNTER Reports".
3. Beside "Journal Report 1:", click the year link ("2026"). Open the
   downloaded file, "counter-4.1-JR1-{today's date}.xml", and read its
   `<Report>` line.
4. Beside "Article Report 1:", click the year link and open
   "counter-4.1-AR1-{today's date}.xml".

The next day's figures: the daily loader task turns the previous days'
usage logs into figures, through jobs it queues. The dataset's config
runs the task and the jobs on web requests (`task_runner = On`,
`job_runner = On`), so opening a few pages the next day is enough.
When the year link is missing, the task or its jobs have not run yet.

In one sitting, instead of waiting a day: after step 1, date the day's
views one day back, hand the log to the loader and run the task and
the queue, from the app's root. The log file keeps the name the app
gave it (the loader takes any file in `stage/`); only the `time` of
each line changes.

```sh
cd <files_dir>/usageStats        # files_dir as in config.inc.php
mkdir -p stage
f=usageEventLogs/usage_events_$(date +%Y%m%d).log   # the day's log, dated in the install's time zone
php -r '$f = $argv[1]; file_put_contents("stage/" . basename($f), preg_replace_callback("/\"time\":\"([^\"]+)\"/", fn ($m) => "\"time\":\"" . date("Y-m-d H:i:s", strtotime($m[1] . " -1 day")) . "\"", file_get_contents($f))); unlink($f);' $f

cd <the app's root>
php lib/pkp/tools/scheduler.php test '--name=APP\tasks\UsageStatsLoader'
# prints "Running [APP\tasks\UsageStatsLoader] … DONE"
```

Then, on `main`:

```sh
php lib/pkp/tools/jobs.php work --stop-when-empty
# ends after "Processed:  PKP\jobs\statistics\CompileMonthlyMetrics"
```

On `stable-3_5_0` (its `work` does not stop on its own):

```sh
php lib/pkp/tools/jobs.php run   # repeat until "No jobs available"
```

**Expected.** Each file's `<Report>` line carries the report's code as
its name, as 3.3 writes it: `Name="JR1" Title="Journal Report 1"` and
`Name="AR1" Title="Article Report 1"`.

**Observed.** The page reads "COUNTER Release 4.1", "Journal Report 1:
2026" and "Article Report 1: 2026". The two files open with:

```xml
<Report Created="2026-10-02T10:35:21+00:00" ID="54DB19F4-AA4F-41A8-A97F-D2F74D332A64" Version="4.1" Name="eports\counter\classes\reports\CounterReportJR1" Title="Journal Report 1">
```

```xml
<Report Created="2026-10-02T10:35:21+00:00" ID="2310A7E9-73FC-4119-A03B-A211A9E7842B" Version="4.1" Name="eports\counter\classes\reports\CounterReportAR1" Title="Article Report 1">
```

The rest of each file is as expected: the journal ("Journal of Public
Knowledge"), in the article report the article, and the month's count.

## Cause

`CounterReport::getCode()` (OJS
`plugins/reports/counter/classes/CounterReport.php`, line 90), "Get the
report code", derives the code from the name of the report's class, by
cutting the 13 characters of the prefix "CounterReport" off its front:

```php
return substr(get_class($this), strlen(self::COUNTER_CLASS_PREFIX));
```

That held while the class was named `CounterReportJR1`. Since
[72bbb7a442](https://github.com/pkp/ojs/commit/72bbb7a442fd02f09b7d59f88c24af1316a881c1)
("Move plugins to namespaces", `pkp/pkp-lib#6091`) the class is
`APP\plugins\reports\counter\classes\reports\CounterReportJR1`, and
`get_class()` returns that full name. The cut now takes
`APP\plugins\r` off the front and leaves
`eports\counter\classes\reports\CounterReportJR1`.

`CounterReport::createXML()` passes `getCode()` (line 239) to the
COUNTER library's `Report` as its name, which is written out as the
`Name` attribute.

What `Name` should hold rests on two things: the method's own purpose
(the report code, the part of the class name after the prefix) and
3.3, which wrote "JR1" and "AR1". The COUNTER library in the plugin
(`plugins/reports/counter/classes/COUNTER/Report.php`) documents the
field only as `Report attribute "Name"` and checks only that it is a
string.

Reach ("seen" is on a running install, "code" is read in the source
only):

- Both reports the page offers (seen: JR1 and AR1, 2026).
- `getCode()` has no other caller (code). The file's name and the year
  links take the code from the request's `report` parameter, which
  `CounterReportPlugin::getValidReports()` reads off the class files'
  names, so they stay "JR1" and "AR1" (seen).
- OMP and OPS ship no "COUNTER Reports" plugin (code).
- The same commit left `CounterReportPlugin::getReporter()` creating
  the class by its bare name, so the page failed outright until
  [99bc590211](https://github.com/pkp/ojs/commit/99bc59021118709de0b68c0076194c1193e9296a)
  ("Fixed class loader", `pkp/pkp-lib#8775`, 2023-03-10) gave it the
  full name. Neither that commit nor its companion of the same day,
  [fb3a2a66e3](https://github.com/pkp/ojs/commit/fb3a2a66e3e76ee702f9f9955f2d922ada68e6f1)
  ("Fixed namespaces", which edited `CounterReport.php`'s imports),
  touched `getCode()`, so 3.4.0 was released with the page working and
  the name wrong (code).

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-release-4-report-name-code-path/fix.diff),
applied to OJS. With it the files of the Steps read `Name="JR1"` and
`Name="AR1"`, and everything else in them is the same as without it.

The page itself is the same with and without the patch: it lists
"Journal Report 1: 2026" and "Article Report 1: 2026", and the year
link's address edited to `year=2001`, a year without figures, gives no
file and returns to the page.

Recommended: take the prefix off the class's short name.

```diff
     public function getCode()
     {
-        return substr(get_class($this), strlen(self::COUNTER_CLASS_PREFIX));
+        return substr(class_basename($this), strlen(self::COUNTER_CLASS_PREFIX));
     }
```

The fix sits in the one method that derives the code, so any report
class added later is covered too. `class_basename()` is the Laravel
helper the apps already load; no pkp code uses it yet.

**Alternatives:**

- Plain PHP: `substr(strrchr(static::class, '\\'), 1 + strlen(self::COUNTER_CLASS_PREFIX))`.
  The web feed plugins' `getName()` form,
  `substr(static::class, strlen(__NAMESPACE__) + 1)`, does not serve
  here, because the base class and the report classes sit in different
  namespaces.
- A `getCode()` in each report class returning "JR1" or "AR1". It says
  the same thing twice, since the plugin already finds reports by their
  class file's name.

**What goes with it:**

- No data repair: the file is built on each download. Files already
  downloaded keep the wrong name.
- Backport: 3.5 and 3.4 have the same line 90 and the same namespace,
  and both ship Laravel's helper, so the diff applies as written (not
  tried there).
- Guard: an e2e scenario in pkp-e2e's usage statistics spec, a year
  link's file reading `Name="JR1"`. The plugin has no unit tests to
  extend.

Small: one line in one OJS method.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/counter-release-4-report-name-code-path/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-release-4-report-name-code-path/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/counter-release-4-report-name-code-path/walk.js`;
  the argument `neighbour` runs the check of the page and the
  `year=2001` address. It ran on installs freshly loaded from PKP's
  default test dataset (pkp/datasets e8dafbc, 2026-10-02, the `main`
  and `stable-3_5_0` PostgreSQL dumps), on PostgreSQL.
- The script takes the "In one sitting" note in JavaScript (the same
  file handling, then the same task and queue commands). The note's
  shell block was also run once as written, on a freshly loaded `main`
  install with only the dump's own log: the `php -r` line staged the
  file with its times a day back, the task and the queue printed the
  lines quoted under the commands, and the figures held the dump's two
  PDF views, enough for the "2026" link.
- The walks ran on the dump's build day, so the loader took the dump's
  log together with step 1's view: on main the files counted 3 views,
  on 3.5 they counted 1 (the dump's lines dropped as a robot's).
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/counter-release-4-report-name-code-path/fix.diff ojs`.
  "Everything else the same" is a hash of each file with the
  `<Report>` line's `ID`, `Created` and `Name` blanked, equal with and
  without the patch on the same figures: the dump's two views only,
  since step 1's view did not happen in those two runs.
- main walked at OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363). 3.5 walked at OJS 091fb65453 (lib/pkp cf3f984335,
  lib/ui-library d4e01883): the same page and the same two `Name`
  values.
- Code read on main: OJS
  `plugins/reports/counter/classes/CounterReport.php` (`getCode()`,
  `createXML()`), `plugins/reports/counter/CounterReportPlugin.php`
  (`getValidReports()`, `getReporter()`, `display()`, `_getYears()`),
  `plugins/reports/counter/classes/reports/CounterReportJR1.php` (its
  namespace), `plugins/reports/counter/templates/index.tpl` (the year
  links), `plugins/reports/counter/classes/COUNTER/Report.php` (the
  attributes written), `classes/scheduler/Scheduler.php` and lib/pkp
  `classes/task/PKPUsageStatsLoader.php` (the daily loader takes every
  log but today's); OMP and OPS `plugins/reports`. A search of OJS and
  lib/pkp for `substr(get_class(`, `substr(static::class` and
  `class_basename` found the two web feed plugins' `getName()` (right
  as they stand) and no other instance. 3.5: the same line 90 and
  namespace.
- 3.4 by code: OJS `upstream/stable-3_4_0` (c1827e3527), the same
  `getCode()` at line 90, `CounterReportJR1` in
  `APP\plugins\reports\counter\classes\reports`, `getReporter()` with
  the full class name; lib/pkp `origin/stable-3_4_0` `composer.json`
  requires `laravel/framework ^9.0`.
- 3.3 by code: OJS `upstream/stable-3_3_0` (ac77c9fb35),
  `plugins/reports/counter/classes/CounterReport.inc.php` line 67 has
  the same cut on a class named `CounterReportJR1` with no namespace,
  which leaves "JR1".
- Introduced: `git blame` on line 90 gives 72bbb7a442, which added the
  `namespace` lines to the plugin's classes and changed the line only
  to read the prefix from a class constant. GitHub lists no PR for the
  commit. Its first release is 3.4.0.
- Upstream search, 2026-10-03, pkp/pkp-lib and pkp/ojs, issues and
  PRs, open and closed, by COUNTER report, JR1, AR1, report name, XML,
  `CounterReportJR1` and `CounterReport getCode`. The nearest is
  `pkp/pkp-lib#8775` (closed), the "Class CounterReportJR1 not found"
  failure named in the Cause.
- Unverified: whether the Release 4.1 schema or any tool that reads
  these files rejects the file for its `Name` (not checked), and how
  many journals still use this page.
