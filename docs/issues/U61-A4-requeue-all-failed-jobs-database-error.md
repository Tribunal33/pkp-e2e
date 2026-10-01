# "Requeue All Failed Jobs" shows a database error when no failed job has its stored data

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no job queue)
- **Introduced** `pkp/pkp-lib#8534` for `pkp/pkp-lib#8306` · [8b6efd8ae0](https://github.com/pkp/pkp-lib/commit/8b6efd8ae0ada43d5fb02e4cea4685e6fe2f1cb3) · 2023-02-14 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U61 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U61-system-administration.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Administration › "View Failed Jobs", "Requeue All Failed Jobs" puts
back on the queue every failed job that still has its stored data (the
data the job was queued with) and leaves the others on the list, as its
notice says. When no failed job on the list has its stored data, the
application fails on the server instead: a window titled "Error" shows
the database's own error text, nothing is requeued, and the list stays
as it was.

Nothing is lost, and "Delete" clears such jobs. Nothing in the
application saves a failed job without its data, so no site
administrator meets this today. The only known way to get such a job
is an edit made directly in the database.

## Impact

- **Lost**: nothing. No failed job is requeued or removed.
- **Who**: on screen, a Site Administrator, and only when every listed
  failed job has empty data. On the command line, any operator can meet
  a related failure today. `php lib/pkp/tools/jobs.php failed
  --redispatch` with an empty failed-jobs list ends in an uncaught PHP
  error (exit status 255), for example in a script that requeues failed
  jobs on a schedule. The same command fails with the database error
  when even one listed failed job has empty data, and then requeues
  none of them, the jobs with data included.
- **Way round**: on screen, "Delete" removes the jobs with empty data.
  On the command line, the page's "Requeue All Failed Jobs" requeues
  the jobs with data, and an empty list needs nothing requeued.

Low: on screen it needs a state nothing in the application writes. The
command-line failure an operator can meet today comes with an empty
list, where there was nothing to requeue, so nothing is lost; the
script only sees an error exit. It would rise to medium if something
began saving failed jobs without their data, since the command line
would then requeue none of the good ones.

## Steps to reproduce

No screen reaches this. To see it, the state is set from the command
line and in the database.

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`), on
  PostgreSQL. The steps are the same in OJS, OMP and OPS.
- Two failed jobs. In the app root, run
  `php lib/pkp/tools/jobs.php test --only=failed`, then
  `php lib/pkp/tools/jobs.php run --test`. Run that pair of commands
  twice: each pair adds one failed job on the `queuedTestJob` queue.
- Their data emptied, in the database (no screen does this):
  `UPDATE failed_jobs SET payload = '' WHERE id IN (<the two ids>);`

1. Sign in as `admin`.
2. Open Administration › "View Failed Jobs". The table lists the two
   jobs: "There's a total of 2 failed job(s)".
3. Press "Requeue All Failed Jobs".

**Expected.** The application says that nothing could be requeued, and
the two rows stay.

**Observed.** `POST /index.php/index/api/v1/jobs/redispatch/all`
answers 500, and a window titled "Error" shows the database's error,
which begins:

```
SQLSTATE[23502]: Not null violation: 7 ERROR: null value in column "payload" of relation "jobs" violates not-null constraint
```

followed by the failing row and the SQL statement. After "OK" and a
reload, the two rows are still listed and no job was added to the
queue.

A control: add a third failed job with its data (one more pair of the
two commands, without the `UPDATE`) and press the button again. It
answers 200 with "All redispatchable failed jobs with valid payload
have been requeued successfully.", requeues the third job and leaves the
two.

## Cause

`FailedJob::redispatchToQueue()`
(`lib/pkp/classes/job/repositories/FailedJob.php`) has three callers:

- "Requeue All Failed Jobs": `PKPJobController::redispatchAllFailedJob()`
  (`lib/pkp/api/v1/jobs/PKPJobController.php`, line 138);
- "Try Again": `PKPJobController::redispatchFailedJob()` (line 162),
  with one id;
- the command line: `tools/jobs.php` `failed()` (line 122), with the
  ids given, or none.

`redispatchToQueue()` does not check the payload itself. It filters by
id only `if (!empty($failedIds))` (line 74), so an empty list means
"every failed job". "Try Again" checks the payload before calling it.
"Requeue All" first asks `getRedispatchableJobsInQueue()` for the
failed jobs whose `payload` is not empty and passes their ids. When
that finds none, it passes an empty list, which it means as "none".
The method reads that list as "all" and selects exactly the jobs
without data. The command line passes no payload filter at all.

The method then copies each selected job into `jobs` (lines 81–87). The
`FailedJob` model casts `payload` as `array`, so an empty payload reads
as `null`. The insert then breaks `jobs.payload`'s not-null
constraint. The copies are made in one transaction that is never
committed, so nothing is requeued.

When the selection is empty, the method fails at its last line instead
(line 92): `$failedJobs->toQuery()->delete()` throws Laravel's
`LogicException` "Unable to create query for empty collection.". The
command line's `catch` in `tools/jobs.php` rethrows anything that is not
a command error, so the exception goes uncaught.

Reach:

- "Try Again" on a failed job without data: refused with "The failed
  job missing the payload to be redispatched." (406) before it reaches
  the method (walked).
- `jobs.php failed --redispatch` with only jobs without data listed:
  the same not-null violation, uncaught (walked). With jobs with data
  listed too: the same, and none is requeued, since the transaction is
  never committed (code).
- `jobs.php failed --redispatch` with an empty selection: the
  `LogicException`. Walked with `--queue=` naming a queue that has no
  failed job; read in the code for an empty failed-jobs list, which
  reaches the same line.
- How a failed job loses its data: when a job fails, `PKPQueueProvider`
  saves `$event->job->getRawBody()`, the job's whole serialized data,
  through Laravel's `DatabaseFailedJobProvider`. Nothing else in
  pkp-lib, OJS, OMP or OPS writes `failed_jobs.payload` (code). Whether
  a plugin or an old install ever stored an empty one is unknown.

## Proposed fix

Make `redispatchToQueue()` check the payload itself: select only failed
jobs with stored data, using the condition `getRedispatchableJobsInQueue()`
already uses, and return 0 when nothing is left. The controller already
answers 0 with its existing 400 message. The diff,
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/fix.diff):

```diff
     public function redispatchToQueue(?string $queue = null, array $failedIds = []): int
     {
-        $failedJobs = $this->newQuery();
+        // Only a failed job with stored data can run again, as in getRedispatchableJobsInQueue()
+        $failedJobs = $this->newQuery()->where('payload', '<>', '');
 ...
         $failedJobs = $failedJobs->get();
 
+        if ($failedJobs->isEmpty()) {
+            return 0;
+        }
+
         DB::beginTransaction();
```

This is a proposal, and it was tried on main in OJS, OMP and OPS. With
the fix, the Steps answer 400, and a window titled "Error" reads
"Unable to redispatch failed job." with the two rows kept. The control
and "Try Again" read as before; "Try Again" checks the payload before
it calls the method, so the fix does not change it. Both command-line
cases print "0 jobs redispatched successfully back to queue.". On a list
with both kinds of job, the command line would then requeue the jobs
with data (code).

**Alternatives**

- A guard in `redispatchAllFailedJob()` (406 when the redispatchable
  list is empty) fixes the button only. The command line keeps both
  failures.
- Making `null` mean "all" and `[]` mean "none" in `redispatchToQueue()`
  changes a public method's contract, which the command line and any
  plugin rely on, for the same result.

**What goes with it**

- Optional: a clearer message, such as "No failed job with stored data
  to requeue.", would read better than "Unable to redispatch failed
  job.". It needs a new locale key.
- No data repair.
- Backport: the diff applies as it stands to 3.5. On 3.4 the same two
  changes apply, but the signature line reads `string $queue = null`,
  so the hunk needs adjusting.
- Test: a pkp-lib unit test for `FailedJob::redispatchToQueue()` with
  only jobs without data, with both kinds, and with no match. It should
  expect 0, 1 and 0, and no exception.

Small: one method in pkp-lib, no API change, no data repair, and a unit
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/walk.js).
  It sets up the preconditions as the Steps give them, takes the steps
  as `admin`, and runs the control and "Try Again". It then runs
  `jobs.php failed --redispatch` with the two jobs listed and with
  `--queue=` naming a queue that has none. It records each request's
  status and body, the window's text, the rows, and the `jobs` and
  `failed_jobs` tables. Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/walk.js`.
- Walked 2026-10-01 on PostgreSQL, each install loaded from
  pkp/datasets 38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`. main: OJS bade233f73 (lib/pkp
  2e377d27fc), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6),
  ui-library 280f98c5. stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00,
  OPS cf4fce69bd (lib/pkp a9c76aed62, ui-library 1a7a4750). Both lines
  showed the Observed above on all three apps. `FailedJob.php` and
  `PKPJobController.php` are identical on the three apps and on both
  lines.
- The fix was tried 2026-10-01 on the main tips above
  (`node bin/try-fix.js apply …/fix.diff ojs omp ops`), on a freshly
  loaded dataset, and reverted afterwards.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7, pkp-lib at
  df13621c2d, ui-library at ee684b34.
  `api/v1/jobs/PKPJobHandler.php` `redispatchAllFailedJob()` (line 148)
  has the same logic, and `redispatchToQueue()` (line 66) is the same
  apart from its signature. The `payload` cast, the not-null
  `jobs.payload`, the command line's call and the page's request to
  `redispatch/all` are the same too. 8b6efd8ae0 is on the branch. OMP
  and OPS run the same pkp-lib files.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, pkp-lib at
  d446601ebe. The branch has no `classes/job`, no `tools/jobs.php` and
  no Failed Jobs page.
- Introduced: `git blame` on `FailedJob.php` puts the
  `if (!empty($failedIds))` filter and `toQuery()->delete()` in
  f65908dc36 (2023-01-09). It puts `getRedispatchableJobsInQueue()` in
  8b6efd8ae0, which also added the requeue-all handler. Both are in
  `pkp/pkp-lib#8534`. 71e79e31e3 (`pkp/pkp-lib#7698`, 2023) later moved
  the handler to `PKPJobController` unchanged.
- Upstream searched 2026-10-01 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by the symptom's words and by both method names.
- MySQL not checked.
- Left open: a payload that is not valid JSON would also read as
  `null`, and the fix's condition does not cover it; nothing in the
  application writes one.
