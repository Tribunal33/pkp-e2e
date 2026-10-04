# Reviewers get no "After Due Date" reminder unless an earlier reminder was sent

- **Severity** high
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#9612` for `pkp/pkp-lib#5885` · [41b38eb240](https://github.com/pkp/pkp-lib/commit/41b38eb24052a5d7a51e658b3460d42da76e20c5) · 2024-08-30 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U29 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U29-review-setup-and-review-forms.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A journal or press that sets "Review Request Response - After Due Date"
or "Review Submission - After Due Date" expects a reminder to go out
when a reviewer has not responded, or has not submitted, by the due
date. No such reminder is ever sent to a reviewer who was not already
reminded before the due date. Settings keeps showing "1 days after due
date", and nobody is told that nothing went out.

So with the two "Before Due Date" sliders at "No reminder set", the
automatic reminders stop completely. Every journal and press that used
reminders in 3.4 is in that state after upgrading to 3.5 or later, and
so is a new install whose manager sets only the "After Due Date"
sliders. Setting a "Before Due Date" reminder too, or reminding
reviewers by hand before the due date, gets round it.

## Impact

- **Lost**: every automatic overdue reminder, for requests that are not
  answered and for reviews that are not submitted. The reviewer is not
  reminded, and the editor is not told that nothing was sent.
- **Who**: the reviewers of every journal and press with only "After
  Due Date" reminders set. That is every journal and press that set
  reminders in 3.4, since the upgrade (to 3.5 or to `main`) moves those
  settings onto the "After Due Date" sliders. It is also a new 3.5 or
  `main` install whose manager sets only those sliders: the "Before Due
  Date" ones have no default.
- **Way round**: set the matching "Before Due Date" slider too, so the
  overdue reminder follows an earlier one. Or press "Send Reminder" on
  each row before its due date: the editor's reminder stamps the same
  reminder date, so the automatic overdue reminder then follows.

High: an automatic reminder is a secondary task, and it fails for every
reviewer, silently (Settings still shows "1 days after due date"), on
every install upgraded from 3.4 that used reminders. That is the
ordinary state of the release, not a rare one, and the way round is only
found by someone who already knows the fault.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. For OMP, use the names in brackets.
  All four reminder sliders are at "No reminder set" in the dataset.
- The server runs the scheduled tasks (cron's `php
  lib/pkp/tools/scheduler.php run`, or the web task runner the
  dataset's config turns on). The reminder task runs once a day. Step 7
  starts it by hand with the same tool.

1. Sign in as `dbarnes`, open Settings › Workflow › "Review" › "Setup".
2. Leave both "Before Due Date" sliders at "No reminder set". Set
   "Review Request Response - After Due Date" and "Review Submission -
   After Due Date" to 1 day each ("1 days after due date"). Press
   "Save".
3. Sign in as `phudson` and open the review request for submission 12,
   "Sodium butyrate improves growth performance of weaned piglets
   during the first period after weaning"
   (`/index.php/publicknowledge/en/reviewer/submission/12`) [OMP: 17,
   "Open Development: Networked Innovations in International
   Development"]. Tick the privacy consent box and press "Accept Review,
   Continue to Step #2".
4. Sign in as `dbarnes` and open submission 12 [OMP: 17]. In
   "Reviewers", Julie Janssen has not responded. On her row, open "More
   Actions" › "Edit", pick the day three days ago as "Response Due
   Date", and press "OK".
5. On Paul Hudson's row, open "More Actions" › "Edit". Pick five days
   ago as "Response Due Date" and three days ago as "Review Due Date",
   then press "OK". Both rows now read "Overdue".
6. Wait a day, or go on to step 7.
7. On the server, in the application's directory, run the reminder
   task: `php lib/pkp/tools/scheduler.php test
   --name='PKP\task\ReviewReminder'`. Then run the jobs it queued:
   `php lib/pkp/tools/jobs.php run` (or load any page, when the web job
   runner is on). The task only queues the emails; a job sends them.
8. Read the mailboxes of `jjanssen@mailinator.com` and
   `phudson@mailinator.com`. In submission 12 [OMP: 17], press
   "Activity Log".

**Expected**: Julie Janssen receives "Will you be able to review this
for us?" [OMP: "Manuscript Review Request"], and Paul Hudson receives "A
reminder to please complete your review". The Activity Log lists "An
automatic reminder email was sent to Julie Janssen regarding their
review assignment", and the same line for Paul Hudson.

**Observed**: the task reports that it ran:

```
Running [PKP\task\ReviewReminder] ............................. 41.34ms DONE
```

Each reviewer's only email is the one from step 4 or 5, "Your review
assignment has been changed for Journal of Public Knowledge" [OMP:
"… for Public Knowledge Press"]. The Activity Log has no reminder line.
Both rows still read "Overdue".

## Cause

`PKP\task\ReviewReminder::executeActions()` (lib/pkp
`classes/task/ReviewReminder.php`) decides on each unfinished review
assignment. For an unanswered request it tests
`if ($reviewAssignment->getDateReminded() === null)` (line 93). When no
reminder has been sent, it checks only the "Before Due Date" threshold.
The "After Due Date" check (lines 104–117) is in the `else` branch, so
it is reached only when the assignment already carries a reminder date.
The branch for an accepted request has the same shape: line 122, with
the "After Due Date" check in the `else` at lines 133–146.

`dateReminded` is set only by a reminder: an automatic one
(`PKP\jobs\email\ReviewReminder::handle()`) or the editor's "Send
Reminder" (`ReviewReminderForm`, line 188). So an assignment that was
never reminded before its due date never gets the overdue reminder.
Inside the `else`, the `$dateReminded->lt($dateResponseDue)` test
already keeps the reminder from going out twice. The `if`/`else` adds a
second condition that the design does not call for: `pkp/pkp-lib#5885`
asked for reminders "prior to the due date", and its PR,
`pkp/pkp-lib#9612`, offers one reminder before and one after each due
date, set independently.

The `if`/`else` came with that PR (41b38eb240). Until then the task
sent its one reminder, "this many days after the response due date",
only to assignments without a reminder date. 3.4's
`ReviewReminder::executeActions()` skips any assignment with a reminder
date (line 141), then sends the review reminder once the review is
`numDaysBeforeSubmitReminder` days overdue and the request reminder once
the response is `numDaysBeforeInviteReminder` days overdue (lines
169–180). 3.3's `ReviewReminder.inc.php` does the same (lines 142,
165–176). The same PR's migration,
`I5885_RenameReviewReminderSettingsName` (lib/pkp
`classes/migration/upgrade/v3_5_0/`), renames the old
`numDaysBeforeInviteReminder` and `numDaysBeforeSubmitReminder`
settings to the two "After Due Date" settings, and leaves the "Before"
ones unset.

Reach:

- Both reminders: the request reminder (`ReviewResponseRemindAuto`)
  and the review reminder (`ReviewRemindAuto`); both walked.
- Journals and presses: OJS and OMP register the task daily in
  `classes/scheduler/Scheduler.php` (walked). OPS has no review and does
  not register it.
- With both sliders set, the after-due reminder still goes out whenever
  the before-due one went out first. It is missed whenever the before-due
  one was not sent: a due date the editor sets in the past, or days on
  which the server's scheduled tasks did not run (checked in the code).
- Nothing else reads the four settings or decides on these reminders
  (checked in the code).

## Proposed fix

Take the "After Due Date" checks out of the `else`, so that they run
whether or not a reminder was sent. Keep the existing "not already
reminded after the due date" test, extended to an assignment that was
never reminded
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/after-due-reminders-never-sent/fix.diff),
lib/pkp only, the same for OJS and OMP). For the unanswered request:

```diff
-                } else {
-                    // There has been a reminder already sent
-                    // need to check should we sent a AFTER REVIEW REQUEST RESPONSE reminder
-
-                    $dateReminded = Carbon::parse($reviewAssignment->getDateReminded());
-
-                    if ($numDaysAfterReviewResponseReminderDue > 0 &&
-                        $currentDate->gt($dateResponseDue) &&
-                        $dateReminded->lt($dateResponseDue) &&
+                }
+
+                // need to check should we sent a AFTER REVIEW REQUEST RESPONSE reminder:
+                // once, whether or not a reminder was sent before the due date
+                $dateReminded = $reviewAssignment->getDateReminded() === null
+                    ? null
+                    : Carbon::parse($reviewAssignment->getDateReminded());
+
+                if ($numDaysAfterReviewResponseReminderDue > 0 &&
+                    $currentDate->gt($dateResponseDue) &&
+                    ($dateReminded === null || $dateReminded->lt($dateResponseDue)) &&
```

The accepted-request branch gets the same change against `$dateDue` and
`$numDaysAfterReviewSubmitReminderDue`. The "before" test needs today
before the due date and the "after" test needs today past it, so at
most one of them fires.

The fix was tried on `main` on the journal and the press: with it
applied, the Steps showed their Expected. A second check repeated steps
1–5, had the editor press "Send Reminder" for Julie Janssen after her
due date, and then ran the task twice. With the fix in and out alike,
Julie Janssen got no automatic reminder. With the fix, Paul Hudson got
exactly one reminder over the two runs; without it, he got none.

How this was settled:

- **Where the rule lives, and the pattern.** In the task, which alone
  decides when a reminder is due; it decides as 3.4 did, keeping 3.5's
  one-reminder-after-the-due-date test.
- **Every instance.** The two `getDateReminded() === null` branches in
  this method are the only places that gate a reminder on an earlier
  one (searched in lib/pkp, OJS and OMP).
- **What the introducing change was for.** Kept: the before-due
  reminder is unchanged.
- **What it touches.** Only which assignments the daily task picks.
  Nothing changes in the REST API, the hooks, the schema or stored data.
- **The guard.** A unit test of the task (lib/pkp has none; the
  existing `tests/jobs/email/ReviewReminderTest.php` tests the job): a
  never-reminded assignment past its due date by the threshold gets the
  after-due reminder, and one reminded after its due date does not.

**Alternatives**

- Stamp a reminder date when the request is sent, so the `else` is
  always reached: the History's "Reviewer Reminded" and the Review
  Report's "Date Reminded" would then show reminders that were never
  sent.
- Have the upgrade also set the "Before Due Date" sliders: that sends
  reminders the journal never asked for, and leaves new installs with
  the fault.

**What goes with it**

- After the fix, the first run sends one reminder to each assignment
  that is already overdue and was never reminded, however old it is.
  3.4 did the same. Release notes could mention it.
- Duplicates: the task decides from the reminder date, but only the
  queued job writes it, so if the job queue does not run between two
  daily task runs, the next run queues the same reminder again. The
  before-due reminder has this today; the fix extends it to
  never-reminded overdue assignments, the first-run backlog included.
  Making `PKP\jobs\email\ReviewReminder` a unique job keyed on the
  review assignment (`ShouldBeUnique` with `uniqueId()`, as
  `jobs/orcid/SendAuthorMail` does) would close it; that is not in the
  tried diff.
- Overlap: the report on spec U27 A15 (a reviewer's response erasing
  the reminder date) proposes `$remindedSinceResponse` for the
  accepted-request branch of the same method. With that fix the
  reminder date survives the response, so this report's check would
  read a reminder sent before acceptance, and skip the overdue review
  reminder whenever that reminder is dated on or after the review due
  date (a late acceptance, or a reminder about a long-overdue request).
  With both fixes in, the accepted-request check reads:

  ```php
  if ($numDaysAfterReviewSubmitReminderDue > 0 &&
      $currentDate->gt($dateDue) &&
      (!$remindedSinceResponse || $dateReminded->lt($dateDue)) &&
      (int)abs($currentDate->diffInDays($dateDue)) >= $numDaysAfterReviewSubmitReminderDue) {
  ```

  The two diffs touch different lines and apply cleanly in either
  order, so whichever lands second must take this condition.
- Backport: 3.5 has the same file, and the diff applies as written. 3.4
  and 3.3 do not have the fault.

Small: two conditions in one method of pkp-lib and a unit test, with no
data repair; tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/after-due-reminders-never-sent/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/after-due-reminders-never-sent/walk.js)
  (helpers in
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/after-due-reminders-never-sent/lib.js)
  and in
  [`../reviewer-response-erases-reminder-history/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-response-erases-reminder-history/lib.js))
  takes the Steps on a journal and a press loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/after-due-reminders-never-sent/walk.js`
  (a preprint server is skipped). Step 7 runs `php
  lib/pkp/tools/scheduler.php test --name='PKP\task\ReviewReminder'`
  under the install's config, then runs the jobs it queued.
  `WALK_MODE=neighbour` runs the second check of the trial.
- `fix.diff` paths start at the app root (`a/lib/pkp/…`). In a pkp-lib
  clone, apply it with `-p3`.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, PostgreSQL, on the
  default datasets of pkp/datasets 1a5552c (2026-10-04). On both lines
  the stored `date_reminded` of the two assignments stayed empty after
  the task ran; with the fix applied on `main`, both were stamped and
  `reminder_was_automatic` was 1.
- Branch tips: main OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c (lib/pkp cf3f984335); 3.4 OJS d68934d0d1,
  OMP 0aec65441f (lib/pkp 767353f4fe); 3.3 OJS ac77c9fb35, OMP
  8e72fc8836 (lib/pkp ac3fa73402).
- 3.5 (walked, and code): `classes/task/ReviewReminder.php` is the same
  file as on `main`.
- 3.4 and 3.3 (code): lib/pkp `classes/task/ReviewReminder.php` (3.4)
  and `ReviewReminder.inc.php` (3.3), read as the Cause says, and
  `locale/en/manager.po`, whose 3.4 setting reads "Send an email
  reminder if a reviewer has not responded to a review request this
  many days after the response due date". OJS and OMP register the task
  in `registry/scheduledTasks.xml` on both.
- Not driven: the editor's "Send Reminder" before the due date as the
  way round (read in the code: it stamps the date the task tests).
- Introduced: `git blame` on lines 93–146 gives 41b38eb240 for the
  `if`/`else` and the conditions. The only later change is 6d7f36369f
  (`pkp/pkp-lib#11772`, 2025-09-09), which made the day counts absolute
  for Carbon 3 and left the branch structure as it was. The GitHub API
  lists PR `pkp/pkp-lib#9612` for 41b38eb240.
- Upstream search (2026-10-04; pkp-lib, ojs, omp and ui-library, by
  symptom and by class): `pkp/pkp-lib#11772` and `pkp/pkp-lib#11870`
  are about the after-due and before-due day counts coming out negative
  under Carbon 3 (closed, fixed by 6d7f36369f). That is a different
  fault. The QA steps in `pkp/pkp-lib#11772` set both "Before Due Date" sliders to 14
  days, which hides this one. `pkp/pkp-lib#9455` (several reminders) is
  a feature request.
- MySQL not checked; nothing here depends on the database.
- Not driven: the web task runner (`task_runner = On`). The walks
  started the task with the scheduler tool; the task's choice does not
  depend on what starts it.
