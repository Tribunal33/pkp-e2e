# Monthly editorial email's attachment counts every journal's active submissions, not the journal's own

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5342` for `pkp/pkp-lib#4844` ·
  [9a163f3502](https://github.com/pkp/pkp-lib/commit/9a163f35024d5bda2057350e696d78c9693e3782)
  · 2019-12-05 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U65 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The "Active Submissions" block of "editorial-report.csv" counts the
submissions in each stage across every journal of the installation,
not the journal the email is about, so on a multi-journal installation
each journal's editors get the same, inflated stage counts; a journal
with no submission at all gets counts above 0.

The email goes each month to every Journal Manager and Section Editor
of the journal (Press Managers and Series Editors, preprint server
Managers and Moderators). It is on by default: a journal can stop it
for everyone on Settings › Workflow › "Emails", and each recipient can
turn it off on their Profile › "Notifications". Only this one block is
wrong: the email's text and the file's "Trends" and "Users" blocks
count this journal alone, and so does the journal's "Editorial
Activity" page.

Each count is the whole site's total for that stage. On a site with a
few journals the figures can look plausible; on one with dozens or
hundreds they are plainly too large. These totals are all that crosses
between journals: the file names no submission, no person and no other
journal, and does not split the totals by journal.

## Impact

- **Lost**: the journal's own count of submissions in each stage in
  the monthly report, and nothing in the email says the figures are the
  whole site's.
- **Who**: the email's recipients on every site hosting more than one
  journal, press or server, every month.
- **Way round**: read the stage counts on Statistics › "Editorial
  Activity" instead. No setting makes the file show the journal's own
  counts.

Medium: one block of a monthly emailed file is wrong, silently, while
the statistics page editors work from is right. It would rise if the
file fed something further, such as a funder's or a publisher's report.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (or `stable-3_5_0`): OJS "Journal
  of Public Knowledge", OMP "Public Knowledge Press", OPS "Public
  Knowledge Preprint Server", each at the path `publicknowledge`.
- A shell in the application's root. The monthly task runs on the 1st of
  each month from the site's scheduler; step 5 runs it now with the
  scheduler's own command.

Steps (OJS words; OMP "Hosted Presses", "Create Press"; OPS "Hosted
Servers", "Create Server"):

1. Sign in as `admin` (the site administrator, also a Journal Manager
   of "Journal of Public Knowledge").
2. Open Statistics › "Editorial Activity" of "Journal of Public
   Knowledge" (`/index.php/publicknowledge/en/stats/editorial`). The
   chart reads "17 Active Submissions": Submission 5, Review 6,
   Copyediting 2, Production 4 (OMP "16 Active Submissions": 3, 4, 4, 4,
   1). [OPS: the page has no chart.]
3. Administration › "Hosted Journals" › "Create Journal": title "u65ir3
   Journal" (OMP "u65ir3 Press", OPS "u65ir3 Server"), initials "U65IR3", contact name "u65ir3 Journal", contact
   email "u65ir3@mailinator.com", country "Canada", path "u65ir3",
   English as the language and primary language, "Enable this journal to
   appear publicly on the site" ticked, "Save". The new journal has no
   submissions, and `admin` is now its Journal Manager.
4. Open the new journal's "Editorial Activity"
   (`/index.php/u65ir3/en/stats/editorial`). The chart reads "0 Active
   Submissions", 0 in every stage. [OPS: no chart.]
5. In the application's root, run the monthly task:
   `php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'`
6. Run the waiting jobs: `php lib/pkp/tools/jobs.php run`. Opening any
   page does the same, because the dataset runs jobs on web requests.
7. Open the mailbox of pkpadmin@mailinator.com in the mail catcher the
   install delivers to (not the public mailinator.com inbox). Two emails "Editorial
   activity for September, 2026" (the previous month; OPS "Preprint
   Server activity for …") have arrived: one from u65ir3@mailinator.com,
   the new journal's, and one from rvaca@mailinator.com, "Journal of
   Public Knowledge"'s. Open the new journal's attachment
   "editorial-report.csv".

**Expected**: the new journal's "editorial-report.csv" gives 0 for
every stage, as its chart does in step 4.

**Observed**: the new journal's attachment opens with the stage counts
of "Journal of Public Knowledge", the same as that journal's own
attachment and its chart in step 2. OJS:

```
"Active Submissions",Total
Submission,5
Review,6
Copyediting,2
Production,4

Trends,"September, 2026",Total
"Submissions Received",0,0
…
Users,Total
"All Users",1
```

OMP gives Submission 3, "Internal Review" 4, "External Review" 4,
Copyediting 4, Production 1. OPS's file has a single stage line, since a
preprint server has one stage: `Production,1`, the dataset server's one
active preprint, where the new server has none (Expected:
`Production,0`).

## Cause

`StatisticsReportMail::createCsvAttachment()`
([lib/pkp jobs/notifications/StatisticsReportMail.php](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/jobs/notifications/StatisticsReportMail.php#L126-L131))
writes the "Active Submissions" block with
`app()->get('editorialStats')->countActiveByStages($stageId)` and passes
no arguments. `PKPStatsEditorialService::getQueryBuilder()` adds a
context filter only when `contextIds` is given, so the query counts the
queued submissions of every context.

Every other statistics call of the job is scoped: in `handle()`,
`getOverview()` (twice) and `countSubmissionsReceived()` pass
`['contextIds' => [$context->getId()]]`, and the "Users" block in
`createCsvAttachment()` filters by `$this->contextId`. The "Editorial
Activity" page (`PKPStatsHandler::editorial()`) passes its own
`['contextIds' => [$context->getId()]]` to `countActiveByStages()`.

Reach:

- All three apps share the job, with each app's own stages (checked on
  screen).
- No other caller of `countActiveByStages()` or of the service's other
  methods omits the context: the stats page, the
  `stats/editorial` API (`PKPStatsEditorialController` sets
  `contextIds` from the request) and the job's other calls (checked in
  the code, lib/pkp and the three apps' plugins).
- Nothing is stored: the file is built afresh each month and deleted
  after sending, so there is nothing to repair.

## Proposed fix

Pass the job's context to the call, as the job's other statistics calls
do:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monthly-report-counts-other-journals/fix.diff).

```diff
-                    app()->get('editorialStats')->countActiveByStages($stageId)
+                    app()->get('editorialStats')->countActiveByStages($stageId, ['contextIds' => [$this->contextId]])
```

The diff uses `$this->contextId` because `$context` is a local of
`handle()` and not in scope in `createCsvAttachment()`. The fix stays in
the job: with no `contextIds` the service counts the whole site by
design, and the job is the caller that knows its context.

Tried on `main`, all three apps: the new journal's attachment now reads
0 in every stage, and "Journal of Public Knowledge"'s own attachment
still gives the counts its chart shows (OJS 5, 6, 2, 4).

**Alternatives**:

- Make `countActiveByStages()` (or the query builder) require a
  context: this would also guard future callers, but it changes the
  service's contract that plugins hooking `Stats::editorial::queryBuilder`
  may rely on, for one caller.
- Read the counts from the stats API in the job: more code for the same
  query.

**What goes with it**:

- Test: `tests/jobs/notifications/StatisticsReportMailTest.php` builds
  the service as a partial mock whose `shouldReceive([...])->withAnyArgs()`
  covers `getOverview()` and `countSubmissionsReceived()` only, so
  `countActiveByStages()` reaches the database unchecked. The job there
  carries context ID 1. Add a separate expectation after the mock is
  built, with a call count, since a partial mock passes a call that
  matches no expectation on to the real method:

  ```php
  $statsEditorialServiceMock
      ->shouldReceive('countActiveByStages')
      ->with(Mockery::any(), ['contextIds' => [1]])
      ->atLeast()->once()
      ->andReturn(0);
  ```

  `PKPTestCase::tearDown()` calls `Mockery::close()`, so the unscoped
  call of today's code fails the test there with
  `InvalidCountException`, and the fixed call passes.
- Backport: 3.5 takes the diff as written. 3.4 has the same line with
  `Services::get('editorialStats')`. 3.3 has it in
  `classes/notification/managerDelegate/EditorialReportNotificationManager.inc.php`,
  where the context is `$this->_context->getId()`.

Small: one argument in one shared job, and one expectation in its unit
test.

## Evidence

- Kept script, which takes the Steps on the three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monthly-report-counts-other-journals/walk.js)
  (with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monthly-report-counts-other-journals/lib.js));
  `neighbour` as its argument leaves out steps 3 and 4 and compares
  "Journal of Public Knowledge"'s attachment with its chart.
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/monthly-report-counts-other-journals/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/monthly-report-counts-other-journals/fix.diff ojs omp ops`,
  then the walk, and the walk with `neighbour` with the fix in and out.
- Walked on PostgreSQL, datasets pkp/datasets e8dafbc (2026-10-02), on
  2026-10-02 (UTC), so the report covers September 2026. The query has
  no database-specific part; MySQL not checked.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7 (lib/pkp
  ddd8ab243a for OJS, 3dc90c81a6 for OMP and OPS); `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335);
  `stable-3_4_0` OJS c1827e3527, OMP 0aec65441, OPS acd8ae704b (pkp-lib
  9e41f10273); `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161 (pkp-lib ac3fa73402).
- Code reads: on `main` and 3.5, `jobs/notifications/StatisticsReportMail.php`
  (identical on both, unscoped call at line 129),
  `PKPStatsEditorialService::getQueryBuilder()` and
  `PKPStatsEditorialQueryBuilder::countActiveByStages()` / `_getBaseQuery()`.
  On 3.4, pkp-lib's `jobs/notifications/StatisticsReportMail.php` (unscoped at line
  131, the other calls scoped). On 3.3, pkp-lib's
  `classes/notification/managerDelegate/EditorialReportNotificationManager.inc.php`
  (unscoped at line 111) and `classes/task/StatisticsReport.inc.php`.
  On both, each app's `registry/scheduledTasks.xml` registers the task.
- Introduced: `git blame` on the line goes to 4c31a12403 (the move to
  `app()->get()`), then 640018cfbe (the move into the job), then
  e3f570bc37 (PSR-12 reformat) and 82770488be (locale forwarding,
  `pkp/pkp-lib#6085`), which left the call unchanged, to 9a163f3502.
  GitHub's `commits/9a163f3502…/pulls` names `pkp/pkp-lib#5342`, merged
  2019-12-16.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched for the symptom ("editorial report csv active submissions",
  "monthly statistics email active submissions", "editorial report
  multiple journals", "\"Active Submissions\" email") and for
  `countActiveByStages`, `StatisticsReportMail`, `createCsvAttachment`,
  `editorial-report.csv`. No issue or PR describes the fault.
- The test expectation was checked with lib/pkp's own Mockery in a
  stand-alone script (a partial mock: the unscoped call ends in
  `InvalidCountException` at `Mockery::close()`, the scoped call
  passes); `StatisticsReportMailTest` itself was not run.
- Not driven: 3.4 and 3.3 (code only); the scheduler's own run on the
  1st (step 5 runs the same task by command).
