# "Requeue All Failed Jobs" fails with a database error when no failed job has stored data

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no Failed Jobs page)
- **Introduced** `pkp/pkp-lib#8534` for `pkp/pkp-lib#8306` · [8b6efd8ae0](https://github.com/pkp/pkp-lib/commit/8b6efd8ae0ada43d5fb02e4cea4685e6fe2f1cb3) · 2023-02-14 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U61 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The site administrator presses "Requeue All Failed Jobs" on
Administration › "View Failed Jobs". When none of the failed jobs on the
list has stored data, the application fails on the server. A window
titled "Error" shows the database's own error text (a "Not null
violation" naming the column "payload"), nothing is requeued, and the
list stays as it was. While at least one failed job has stored data, the
button requeues those, leaves the others on the list and shows "All
redispatchable failed jobs with valid payload have been requeued
successfully.".

No screen or job of the applications makes a failed job without stored
data, so no one meets this today. It is not specific to PostgreSQL:
MySQL and MariaDB refuse the same insert.

## Impact

- **Lost.** Nothing: the failed jobs keep their rows. The administrator
  gets a database message instead of a reason.
- **Who.** The site administrator, on Administration › "View Failed
  Jobs".
- **Way round.** "Delete" on each row clears the list. A job without
  stored data cannot be run again in any case ("Try Again" refuses it).

Low: latent; a plugin or queue change that records failed jobs without
their data would make it medium, a server error with "Delete" as the way
round.

## Steps to reproduce

None: no screen reaches this. It needs a failed job whose stored data
(`failed_jobs.payload`) is empty, and no code in the applications, their
plugins or the queue they use records one. A plugin that writes failed
jobs of its own, or a repair of the table by hand, would reach it.

To see the failure anyway on a test install, the state is made by hand:

- The default dataset, OJS `main` (OMP and OPS the same).
- Two failed jobs, made with the application's own command-line tool
  from the application's folder: `php lib/pkp/tools/jobs.php test
  --only=failed` twice, then `php lib/pkp/tools/jobs.php run --test`
  (each test job fails and is recorded on the failed list).
- Their stored data emptied:

  ```sql
  UPDATE failed_jobs SET payload = '';
  ```

1. Sign in as `admin`.
2. Open Administration and "View Failed Jobs". The page reads "There's a
   total of 2 failed job(s)." over two rows.
3. Press "Requeue All Failed Jobs".

**Expected.** The request is refused with a message, and the two rows
stay.

**Observed.** `POST index.php/index/api/v1/jobs/redispatch/all` answers
500, and a window titled "Error" shows the response's text:

```
SQLSTATE[23502]: Not null violation: 7 ERROR: null value in column "payload" of relation "jobs" violates not-null constraint …
```

After "OK" the two rows stay, and nothing was added to the queue. A
loading circle keeps turning beside the button until the page is
reloaded; that is reported separately: spec U61 A6. The server log has
the same error, as `PDOException(code: 23502)`.

With one failed job with data and one without, the same button shows
"All redispatchable failed jobs with valid payload have been requeued
successfully.", the first goes to the queue and the second stays on the
list.

## Cause

`PKPJobController::redispatchAllFailedJob()`
(`lib/pkp/api/v1/jobs/PKPJobController.php`, lines 128–141) collects the
ids of the failed jobs that have a payload,
`FailedJob::getRedispatchableJobsInQueue()` (`where('payload', '<>',
'')`), and passes them to `FailedJob::redispatchToQueue(null, $ids)`
(`lib/pkp/classes/job/repositories/FailedJob.php`, lines 66–93).

`redispatchToQueue()` reads an empty id list as "every failed job" (line
74, `if (!empty($failedIds))`), the meaning the command-line tool's
`failed --redispatch` relies on. So when no failed job has a payload,
the controller's filter leaves an empty id list. `redispatchToQueue()`
reads that as no filter, so it selects every failed job. Each row is copied into `jobs` with `'payload' => $failedJob->payload`;
the model's `array` cast reads the empty text as `null`, and `jobs.payload`
is `NOT NULL`, so the insert throws and the request answers 500. The
transaction is never committed and the delete
comes after it, so nothing changes.

The rule that breaks is "only a failed job with a payload can run
again". `getRedispatchableJobsInQueue()` and `redispatchFailedJob()` (406,
"The failed job missing the payload to be redispatched.") both apply it,
but `redispatchToQueue()`, the one method that writes requeued jobs, does
not. 8b6efd8ae0 added "Requeue All" with the payload filter in the
controller, on top of the empty-list-means-all argument f65908dc36 had
given the method for the command line (both `pkp/pkp-lib#8534`).

The reach:

- The command-line tool, `php lib/pkp/tools/jobs.php failed
  --redispatch` (all, or a list of ids), passes no payload filter at
  all, so it fails the same way whenever one payload-less failed job is
  on the list, even next to jobs with data, and requeues none of them
  (walked on `main`, three apps: `PHP Fatal error: Uncaught PDOException:
  SQLSTATE[23502]: Not null violation …`).
- "Try Again" on one row is not reached: `redispatchFailedJob()` refuses
  a job without a payload before calling the method (code).
- No stored data is written wrong: the failing request rolls back, and
  after each run `jobs` and `failed_jobs` held the same rows (code and
  database).
- `BaseRepository::deleteJobs()` shares the empty-list-means-all
  argument. Its callers are the command line's `failed --clear` and
  `purge --all` / `purge --queue=`; neither passes a filtered list, and
  for both an empty list does mean all (code).
- Nothing in pkp-lib, the three applications or their bundled plugins
  writes `failed_jobs` other than Laravel's
  `DatabaseFailedJobProvider::log()`, which stores the job's raw payload
  (code).

## Proposed fix

The proposal: apply the payload rule inside
`FailedJob::redispatchToQueue()`, the method every caller goes through,
and return 0 when nothing is left to requeue
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/fix.diff)):

```diff
         if (!empty($failedIds)) {
             $failedJobs = $failedJobs->whereIn('id', $failedIds);
         }
 
-        $failedJobs = $failedJobs->get();
+        // Only a failed job with a payload can run again (see getRedispatchableJobsInQueue())
+        $failedJobs = $failedJobs->where('payload', '<>', '')->get();
 
+        if ($failedJobs->isEmpty()) {
+            return 0;
+        }
+
         DB::beginTransaction();
```

It keeps what 8b6efd8ae0 meant: requeue every failed job that has a
valid payload. The controller needs no change: a 0 makes it answer its
existing 400, "Unable to redispatch failed job.". The command-line tool
requeues the jobs with data and leaves the others. The early return also
keeps `toQuery()` from being called on an empty collection, which
Laravel refuses.

The `array` cast also reads a payload that is not valid JSON as `null`,
so a corrupted non-empty payload would still fail. `<> ''` is enough
because the only writer stores Laravel's own JSON payload
(`Queue::createPayload()` throws rather than store text that does not
encode). Skipping undecodable payloads too would mean filtering after
`get()` with `filter(fn ($failedJob) => $failedJob->payload)`, the test
`redispatchFailedJob()` already uses; that variant was not tried.

Tried on `main`, OJS, OMP and OPS: the Steps then end in a window titled
"Error" reading "Unable to redispatch failed job.", with the rows kept
and no server error. With one failed job with data and one without, the
button still requeues the first and keeps the second; the command-line
`failed --redispatch` then requeued the two jobs with data and kept the
one without, where it failed before.

**Alternatives**

- A guard in `redispatchAllFailedJob()` that refuses an empty
  `$redispatchableFailedJobs`: fixes the button, but leaves the
  command-line tool failing, so it is a workaround at one caller.
- Making `null` mean "all" and `[]` mean "none" in `redispatchToQueue()`:
  a clearer argument, but it changes a public method's meaning for the
  command line and any plugin, and still leaves the payload rule out.

**What goes with it**

- Optional: a message of its own for this refusal (say, "None of the
  failed jobs has the data needed to run again.") in place of the
  generic one; that needs a new locale key.
- Backport: the method is the same on 3.5 and 3.4 (where its caller is
  `PKPJobHandler`), so the diff applies there as written.
- Guard: a pkp-lib unit test for `redispatchToQueue()` with failed jobs
  without a payload, alone (returns 0, adds no job) and next to one with
  a payload (requeues only that one).

Small: a few lines in one repository method, and a unit test.

## Evidence

- Kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/walk.js)
  (the Steps' preconditions and steps, three apps) and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/neighbour.js)
  (one failed job with data and one without, through the button; then
  the command-line `failed --redispatch`), with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/lib.js).
  Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/walk.js`
  on an install freshly reset to the default dataset. The fix was tried
  with `node bin/try-fix.js apply …/fix.diff ojs omp ops`, both scripts
  walked, and taken out again; `neighbour.js` was walked with the fix out
  and in.
- The Steps' test jobs are `PKP\jobs\testJobs\TestJobFailure`
  (`$tries = 1`), recorded through Laravel's failed-job provider.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets c657990 (2026-10-01). MySQL and MariaDB were not
  walked; by the code they fail too. `jobs.payload` is `longText` NOT
  NULL on every driver (`JobsMigration`), each requeued job is a
  single-row insert with an explicit `NULL`, and MySQL refuses that with
  error 1048 ("Column 'payload' cannot be null") in strict and
  non-strict mode alike. PKP sets no `strict` key for the connection
  (`PKPContainer`), so the server's own `sql_mode` applies.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794 and
  OPS c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS c346ee00a5
  (pkp-lib 3bb4450bea), OMP c7b45f88e and OPS 8eaf899468 (pkp-lib
  1fb843f491); `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441, OPS
  acd8ae704b, pkp-lib 32b0f4b4af; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161, pkp-lib f6ab331645.
- Code reads. On `main`: `PKPJobController`
  (`redispatchAllFailedJob()`, `redispatchFailedJob()`), `FailedJob`
  and `BaseRepository` (repositories), the `Job` and `FailedJob` models'
  casts, `install/JobsMigration`, `tools/jobs.php` (`failed()`, `test()`,
  `run()`), `FailedJobsPage.vue`'s
  `requeueAll()`, and a search of pkp-lib, the three apps and their
  plugins for writers of `failed_jobs`; the three apps share this code
  through pkp-lib and override none of it. On 3.5:
  `redispatchAllFailedJob()` and `redispatchToQueue()`, the same as
  `main`'s in all three apps. On 3.4: `api/v1/jobs/PKPJobHandler.php` `redispatchAllFailedJob()` (the
  same pre-filter), `FailedJob.php` (the same `redispatchToQueue()`), the
  models' `array` casts, `JobsMigration` and `tools/jobs.php`. On 3.3:
  no failed-jobs repository, handler or Administration page (`git
  ls-tree` and `git grep` for `failedJob`, `redispatch`).
- Introduced: `git blame` on the controller's lines gives 71e79e31e3
  (`pkp/pkp-lib#9176`, the move from Slim handlers to Laravel
  controllers, 2023-10-13), which carried the handler over unchanged; `git
  log -S getRedispatchableJobsInQueue` gives 8b6efd8ae0, which added the
  "Requeue All" handler with the pre-filter. `if (!empty($failedIds))`
  blames to 20b9b60e93 (formatting) and before it f65908dc36
  (2023-01-09). Both commits are in `pkp/pkp-lib#8534` (GitHub's
  `commits/<sha>/pulls`). The case never worked, so the Kind is defect.
- Upstream, searched 2026-10-02 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library for "requeue all failed jobs", "failed job payload",
  "redispatch failed jobs error", `redispatchToQueue` and
  `redispatchAllFailedJob`. Read: `pkp/pkp-lib#8306` (the feature),
  `pkp/pkp-lib#8534` (its PR) and `pkp/pkp-lib#11862` (the Details page
  showing another job's payload), none of them this fault.
- Not driven: 3.4 and 3.3 (read in the code). Unverified: whether any
  third-party plugin or queue setup records failed jobs without a
  payload; the loading circle after "OK" in Observed was not read by
  `walk.js` (spec U61 A6's own walk saw it after this failure).
