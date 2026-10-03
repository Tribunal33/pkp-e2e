# A reviewer's response erases "Reviewer Reminded" from the assignment's History and the Review Report

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code)
- **Introduced** commit for `pkp/pkp-lib#6904`, no pull request · [14f9044681](https://github.com/pkp/pkp-lib/commit/14f904468134c8780d470e36bba9f7f63ff4055c) · 2021-04-01 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a15)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

Sending a reminder stamps a dated "Reviewer Reminded" milestone into the
assignment's History. Once the reviewer responds, the line is gone.

When the reviewer accepts or declines, the app clears the assignment's
stored reminder date. That clearing is what lets the automatic reminder
about the review go out later, but the History reads the same date, so
its line disappears, and the Review Report's "Date Reminded" column goes
empty for that reviewer. It happens to reminders the editor sends and to
automatic ones alike.

The assignment keeps one reminder date, the latest; a reminder about the
review sent after the response stamps it again and shows. The fix keeps
the date through the response; dates already cleared cannot be brought
back.

## Impact

- **Lost**: the date of the latest reminder sent before the reviewer
  accepted or declined, in the reviewer row's "History" and in the
  Review Report's "Date Reminded", with no sign that it was dropped.
- **Who**: editors of a journal or press who remind a reviewer about an
  unanswered request, each time the reviewer then responds.
- **Way round**: the submission's "Activity Log" keeps "{editor} sent a
  reminder to {reviewer} regarding their review assignment" (or "An
  automatic reminder email was sent to {reviewer}…") with its day.

Low: the reminder stays in the Activity Log, so only its copy in History
and in one report column is lost; a journal that relies on the Review
Report's "Date Reminded" to follow up reviewers would make it medium.
The effort is not small because the fix changes how the scheduled
reminder task decides, not only what the response saves.

## Steps to reproduce

Preconditions: the default dataset, OJS `main`. OMP is the same with the
names given in brackets. Nothing else.

1. Sign in as `dbarnes` and open submission 12, "Sodium butyrate
   improves growth performance of weaned piglets during the first
   period after weaning" [OMP: 17, "Open Development: Networked
   Innovations in International Development"]. In "Reviewers", Julie
   Janssen's row reads "Request Sent": she has not responded.
2. On her row, open "More Actions" › "Edit", pick yesterday as
   "Response Due Date" and press "OK". The row now reads "Overdue" and
   offers "Send Reminder".
3. Press the row's "Send Reminder", then the window's "Send Reminder".
4. Open "More Actions" › "History" on her row, read it, and close it.
5. Sign in as `jjanssen` and open the review request
   (`/index.php/publicknowledge/en/reviewer/submission/12` [OMP: 17]).
   Tick "Yes, I agree to have my data collected and stored according to
   the privacy statement." and press "Accept Review, Continue to Step #2".
6. Sign in as `dbarnes`, open submission 12 [OMP: 17], and open "More
   Actions" › "History" on Julie Janssen's row.
7. Open Statistics › Reports and press "Review Report"; in the file,
   read "Date Reminded" on Julie Janssen's row for submission 12 [OMP:
   17].
8. Back in submission 12, press "Activity Log".

[3.5: History names the milestones differently: "<date> Reminder" in
step 4, "<date> Confirm" for the acceptance.]

**Expected**: step 6 lists the reminder beside the acceptance, as
"Request Sent", "Reviewer Reminded" and "Request Accepted", each with
its date and time; step 7's "Date Reminded" holds the reminder's date
and time.

**Observed**: step 4 reads (the dates are the walk's):

```
Request Sent: 2026-10-02 12:04 PM
Reviewer Reminded: 2026-10-03 05:26 AM
```

Step 6 reads:

```
Request Sent: 2026-10-02 12:04 PM
Request Accepted: 2026-10-03 05:27 AM
```

In step 7, Julie Janssen's row for submission 12 has "Date Confirmed"
2026-10-03 05:27:05 and an empty "Date Reminded".

Control: step 8's Activity Log still lists "Daniel Barnes sent a
reminder to Julie Janssen regarding their review assignment", dated
2026-10-03, below the acceptance.

## Cause

The response is recorded by `ReviewerAction::confirmReview()` (lib/pkp
`classes/submission/reviewer/ReviewerAction.php`, lines 90–95), for the
reviewer's own answer and for an editor's "Log Response" alike. It
saves the assignment with `'dateReminded' => null` and
`'reminderWasAutomatic' => 0`.

`date_reminded` is the only record of when the reviewer was last
reminded. The History reads it (`PKPReviewerGridHandler::reviewHistory()`,
lib/pkp `classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php`,
line 1086, the "Reviewer Reminded" line), and so does the Review Report
(`ReviewReportDAO`, `plugins/reports/reviewReport/ReviewReportDAO.php`,
line 73, in OJS and OMP).

The clearing was added in 14f9044681 for `pkp/pkp-lib#6904`. The
scheduled reminder task of that time skipped every assignment with a
reminder date, so a reminder about the request kept the reminder about
the review from ever going out; clearing the date at the response let
the second one go. Today's task, `PKP\task\ReviewReminder::executeActions()`
(lib/pkp `classes/task/ReviewReminder.php`), still reads a null
`dateReminded` on an answered request as "no reminder since the
response" (line 122). So one column serves as the task's flag and as
the History's record, and resetting the flag erases the record.

Reach:

- A decline, and an editor's "Log Response": the same method.
- Both kinds of reminder: the editor's "Send Reminder"
  (`ReviewReminderForm`, line 188) and the automatic ones
  (`jobs/email/ReviewReminder.php`, line 95) stamp the same column.
- The Review Details window's latest-activity line reads
  `dateReminded` too, but after a response it shows the response
  anyway.

## Proposed fix

Keep the reminder date through the response, and let the task tell a
reminder about the request from one about the review by comparing it
with the response date
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-response-erases-reminder-history/fix.diff),
lib/pkp only, the same for OJS and OMP):

```diff
 // classes/submission/reviewer/ReviewerAction.php, confirmReview()
+            // dateReminded is kept: it is the History's "Reviewer Reminded" milestone. The scheduled
+            // ReviewReminder task treats a reminder dated before this response as none.
             Repo::reviewAssignment()->edit($reviewAssignment, [
-                'dateReminded' => null,
-                'reminderWasAutomatic' => 0,
                 'declined' => $decline,

 // classes/task/ReviewReminder.php, executeActions(), the answered-request branch
-                if ($reviewAssignment->getDateReminded() === null) {
+                $remindedSinceResponse = $reviewAssignment->getDateReminded() !== null
+                    && Carbon::parse($reviewAssignment->getDateReminded())->gte(Carbon::parse($reviewAssignment->getDateConfirmed()));
+
+                if (!$remindedSinceResponse) {

 // controllers/grid/users/reviewer/form/ResendRequestReviewerForm.php, execute()
                 'dateConfirmed' => null,
+                // A resent request starts its reminders afresh (the scheduled ReviewReminder task)
+                'dateReminded' => null,
+                'reminderWasAutomatic' => 0,
```

What it restores, and what it does not:

- After a response, History and "Date Reminded" keep the latest
  reminder until a reminder about the review replaces it. The column
  holds one date, so neither shows how many reminders were sent.
- After the response, a reminder dated before it no longer counts, so
  the task still sends the reminder about the review, as `#6904`
  wanted.
- A declined request that is resent still loses its "Reviewer Reminded"
  line, now at the resend instead of the decline. The resend must clear
  the date, or the task would take the old reminder as one about the new
  request and skip that request's reminder before its due date; the
  resend stamps no new request date that the task could compare with.
  This change was not walked.
- Dates already cleared by earlier responses stay lost: the Activity
  Log's reminder entries store the recipient but not the assignment, so
  they cannot be matched back reliably, and no repair is proposed.

Tried on `main`, on the journal and the press. With the diff applied,
step 6 read "Request Sent", "Reviewer Reminded" and "Request Accepted",
each dated, and the report's "Date Reminded" held the reminder's time.
A second check set "Review Submission - Before Due Date" to 7 days and
the review due in 5 days, sent the editor's reminder, had the reviewer
accept, then ran the daily reminder task once. With the fix in and out
alike, the reviewer received a second "A reminder to please complete
your review", and the Activity Log listed "An automatic reminder email
was sent to Julie Janssen regarding their review assignment".

How this was settled:

- **Where the rule lives.** The task owns the question "has a reminder
  been sent since the response"; the fix answers it from two dates it
  already has, instead of having the response destroy one of them.
- **How the code base does it.** The task already compares
  `dateReminded` with the due dates (`$dateReminded->lt($dateDue)`, line
  140); the fix adds the same comparison with `dateConfirmed`.
- **Every instance.** `confirmReview()` is the only writer that clears
  the date; the readers are the History, the Review Report, the Review
  Details window and the task.
- **What it touches.** The task's choice for answered requests (the
  same outcome), the resend, and the History, the report and the REST
  API's `dateReminded`, which now keep the date. `reminderWasAutomatic`
  is read by nothing but the API; the response no longer resets it, and
  the editor's "Send Reminder" has never set it back to 0, so after an
  automatic reminder followed by the editor's it already reads
  "automatic" for the editor's date. That older mismatch is left as it
  is.
- **The test.** A new unit test of the task
  (`classes/task/ReviewReminder.php`; the existing
  `tests/jobs/email/ReviewReminderTest.php` tests the job of the same
  name) for an answered request reminded before the response, and the
  e2e step that reads History after a response (a Planned item in spec
  U27).

**Alternatives**

- Build the History's line from the Activity Log's reminder entries:
  those entries store the recipient but not the assignment, so a
  reviewer on two rounds of one submission cannot be told apart, and
  the report would stay empty.
- A second column for the task's flag: a schema change and a migration
  for what two existing dates already answer.

**What goes with it**

- Backport: 3.5 has the same three files and the fix applies as
  written. 3.4's task is older: it skips every assignment with a
  reminder date ("Avoid review assignments that a reminder exists
  for"), so a 3.4 backport needs that check to ignore a date older than
  the response.

Medium: three files in pkp-lib and a change to the scheduled task's
logic, with its test; tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/reviewer-response-erases-reminder-history/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-response-erases-reminder-history/walk.js)
  (helpers in
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-response-erases-reminder-history/lib.js))
  takes the Steps on a journal and a press loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reviewer-response-erases-reminder-history/walk.js`.
  `WALK_MODE=neighbour` runs the second check of the trial; it runs the
  task with `php lib/pkp/tools/scheduler.php test
  --name='PKP\task\ReviewReminder'` (what cron's `scheduler.php run`
  starts daily) and then the jobs it queued.
- `fix.diff` paths start at the app root (`a/lib/pkp/…`); in a pkp-lib
  clone apply it with `-p3`.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, PostgreSQL, the
  default datasets of pkp/datasets e8dafbc (2026-10-02). The stored
  `date_reminded` went from the reminder's time to null at the
  acceptance on both lines.
- Branch tips: main OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c (lib/pkp cf3f984335); 3.4 OJS d68934d0d1,
  OMP 0aec65441f (lib/pkp 767353f4fe); 3.3 OJS ac77c9fb35, OMP
  8e72fc8836 (lib/pkp ac3fa73402).
- 3.4 (code): `ReviewerAction::confirmReview()` calls
  `setDateReminded(null)` and `setReminderWasAutomatic(0)` (lines
  92–93), and `reviewHistory()` lists `common.reminder` from
  `getDateReminded()` (line 1009).
- 3.3 (code): `ReviewerAction::confirmReview()` sets only the declined
  flag and the confirmation date, and `reviewHistory()` lists
  `common.reminder` from `getDateReminded()` (line 812), so the History
  keeps "Reminder"; 14f9044681 is on `stable-3_4_0` and later, not on
  `stable-3_3_0`.
- Introduced: `git blame` on the reset lines gives 0a492918f1
  (`pkp/pkp-lib#8887`, which rewrote the setters as one `edit()` call);
  `git log -S'setDateReminded(null)'` gives 14f9044681 as the change
  that added them. The GitHub API lists no pull request for it.
- MySQL not checked; nothing here depends on the database.
