# On its due date a review already reads as overdue, to the reviewer and to the editor

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#3995` for `pkp/pkp-lib#3894` · [7e2115fe48](https://github.com/pkp/pkp-lib/commit/7e2115fe485d6ed5d533e29bae4fe2597246646e) · 2018-08-16 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#3500` (closed; its fix, `pkp/pkp-lib#3524`, gave reviewers the whole due date, and the Introduced change took that back for the review date four months later)
- **Tracked in** spec U28 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a18)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5


## Summary

An editor sets "Review Due Date" as a day, and the reviewer expects
that day to be in time. On the due date, the reviewer's list already
reads "Deadline for completing this review has passed. Please complete
the review at the earliest." for an accepted review; the day before,
it read "Please complete this review by 2026-10-15 00:00:00." (the
midnight time is a separate fault,
[A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a5)).
The editor's row of the assignment reads "Overdue" with "Send
Reminder", and the editors' "Reviews overdue" view lists the
submission. A response date, by contrast, is in time on its day.

The same "Deadline for completing this review has passed" sentence,
with a "Finish review" button, shows on a request not yet answered
whose "Response Due Date" and "Review Due Date" are both today, though
the reviewer never agreed to review. Both dates fall on the same day
by default, four weeks after the request. The button still opens the
request, so the reviewer can accept or decline.

Nothing is lost, and the review can still be submitted that day.
"Today" is the server's date, in the time zone the install is set to.
The fix is a handful of comparisons in one shared library.

## Impact

- **Lost**: no data. A reviewer working to the agreed day is told they
  are already late, and the editor is invited to chase a reviewer who
  is still in time. The one message affected: the monthly editorial
  reminder email, sent on the 1st, lists a submission whose review is
  due that day as "A review is overdue." (read in the code). The
  automatic reminders to reviewers count a review late only from the
  next day (read in the code).
- **Who**: every reviewer of a journal or a press (a preprint server
  has no review), on the due date of each review, and the editors who
  look at the assignment that day. The unanswered-request case shows
  on every request whose two dates were left at the journal's or
  press's defaults ("Default Response Deadline" and "Default Completion
  Deadline", four weeks each unless a manager changed them).
- **Way round**: none needed; "Finish review" and "Submit Review" work
  as on any other day. The editor can read the date beside "Overdue"
  ("Review due: 2026-10-15") and see that it is today.

Low: nothing is lost and every task gets done. It would be medium if
editors commonly sent reminders or unassigned reviewers from the
"Overdue" mark on the due date itself.

## Steps to reproduce

Preconditions: the default dataset, OJS `main`. OMP is the same with
the names in brackets. "Today" is the server's date (`time_zone` in
`config.inc.php`; the walk ran with server and browser in UTC). OJS
submission 12, "Sodium butyrate improves growth performance of weaned
piglets during the first period after weaning" [OMP: submission 17,
"Open Development: Networked Innovations in International
Development", on "Internal Review"], has two unanswered requests, to
`jjanssen` (Julie Janssen) and `phudson` (Paul Hudson), each with
response and review due 2026-11-09 [OMP: 2026-11-10].

1. Sign in as `jjanssen`. Under "Action Required by me", submission
   12's row [OMP: 17] reads "Please accept or decline this request by
   2026-11-09", with "Respond to request".
2. Press "Respond to request", tick the privacy-consent box, and press
   "Accept Review, Continue to Step #2".
3. Open "Action Required by me" again. The row reads "Please complete
   this review by 2026-11-09 00:00:00." with "Finish review". Sign out.
4. Sign in as `dbarnes` and open submission 12
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`)
   [OMP: `…?workflowSubmissionId=17`].
5. In "Reviewers", on Julie Janssen's row, open "More Actions" ›
   "Edit", pick today (2026-10-15 on the walk) as "Response Due Date"
   and as "Review Due Date" from the calendars, and press "OK".
6. Do the same on Paul Hudson's row. (If the calendar opens behind the
   window, reload the page and open the submission again first.)
7. Reload and read both rows. Then open the dashboard view "Reviews
   overdue". Sign out.
8. Sign in as `jjanssen` and read submission 12's row [OMP: 17] under
   "Action Required by me". Sign out.
9. Sign in as `phudson`, read submission 12's row [OMP: 17] under
   "Action Required by me", and press its button.

**Expected**: on the due date both reviewers are in time. In step 8
the row reads "Please complete this review by 2026-10-15 …" with
"Finish review". In step 9 it reads "Please accept or decline this
request by 2026-10-15" with "Respond to request". In step 7 neither
row reads "Overdue", and "Reviews overdue" does not list the
submission.

**Observed** (OMP the same): in step 8 Julie Janssen's row reads

```
12  Sodium butyrate improves …  Deadline for completing this review has passed. Please complete the review at the earliest.  Finish review
```

In step 9 Paul Hudson's row reads the same sentence with "Finish
review", and the button opens "Review: Sodium butyrate improves …" on
"1. Request" with "Accept Review, Continue to Step #2" and "Decline
Review Request". In step 7 both rows read

```
Overdue  Review due: 2026-10-15  …  Send Reminder
```

and the view reads "Reviews overdue (1)", listing the submission.

Control: with both dates set to yesterday instead, Julie Janssen's
rows read as above, Paul Hudson's list row reads "Deadline for
responding to this request has passed. Please accept or decline this
request at the earliest." with "Respond to request", and his editor's
row "Overdue  Response due: 2026-10-14".

## Cause

`ReviewAssignment::getStatus()` (lib/pkp
`classes/submission/reviewAssignment/ReviewAssignment.php`, lines
702-726) first moves a due date stored without a time
(`2026-10-15 00:00:00`, as every screen stores it) to 23:59:59 of that
day, with the comment "If no due time, set it to the end of the day".
It then compares the response time with now, but the review time with
the start of tomorrow:

```php
if ($responseDueTime < time()) { // response overdue
    return self::REVIEW_ASSIGNMENT_STATUS_RESPONSE_OVERDUE;
} elseif ($reviewDueTime < strtotime('tomorrow')) { // review overdue but not response
    return self::REVIEW_ASSIGNMENT_STATUS_REVIEW_OVERDUE;
…
    if ($reviewDueTime < strtotime('tomorrow')) { // review due
        return self::REVIEW_ASSIGNMENT_STATUS_REVIEW_OVERDUE;
```

23:59:59 of today is always before the start of tomorrow, so a review
is `REVIEW_OVERDUE` all through its due date. For an unanswered
request the second comparison runs when the response is not yet late,
so a request whose two dates are both today becomes `REVIEW_OVERDUE`
too. The reviewer's list maps that status to the "Deadline for
completing this review has passed" sentence and to "Finish review"
(ui-library `useDashboardConfigEditorialActivity.js` and
`DashboardCellReviewAssignmentActions.vue`). "Today" is PHP's date in
the zone `PKPApplication::initializeTimeZone()` sets from
`[general] time_zone`.

The reviewer was given the whole due date by the fix for
`pkp/pkp-lib#3500` in 2018: the end-of-day move, and both comparisons
against `time()` (complete from 23324cf0f6, 2018-04-10). Four months
later `pkp/pkp-lib#3894` asked that the status and the submission
list's "overdue" filter agree. That filter compared the stored date
with the start of tomorrow, and the change made the status's review
comparison match the filter, instead of changing the filter to match
the status. The response comparison kept `time()`.

Where the wrong day shows ("code" marks a place read in the code and
not driven):

- The reviewer's list ("Action Required by me", "All assignments"):
  seen on the walk.
- The editor's "Reviewers" row ("Overdue", red, "Send Reminder"), from
  ui-library `useReviewerManagerConfig.js`: seen on the walk.
- The round status "A review is overdue."
  (`ReviewRound::determineStatus()`), the monthly editorial reminder
  email that lists it (`jobs/email/EditorialReminder.php`), the
  reviewer indicator's popover on the editors' list ("The reviewer has
  missed the review due date.") and the REST API's `statusId`: all
  read the status (code).
- Three SQL copies of the same day rule, which do not read the status:
  - `Submission\Collector::buildReviewStageQueries()` (lib/pkp
    `classes/submission/Collector.php`, lines 976-988), behind the
    editors' "Reviews overdue" view and the backend `/_submissions`
    API's `reviewsOverdue` and `isOverdue`: seen on the walk. It also
    counts a request whose response alone is due today as overdue,
    while its row reads "Request Sent" (code).
  - `Submission\Collector::getQueryBuilder()` (lines 567-601), behind
    the public `/submissions` API's `isOverdue` alone; no screen sends
    it (code).
  - `reviewAssignment\Collector::getQueryBuilder()` (lines 521-539),
    switched on by `filterByIsOverdue()`, which nothing in pkp-lib, OJS
    or OMP calls (code).
- The scheduled reminders to reviewers (`classes/task/ReviewReminder.php`)
  compare dates themselves and send the "after due date" reminder only
  once today is after the due date (code): the rule the status should
  follow.

## Proposed fix

Compare the review time with now, as the response time already is
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-due-today-reads-overdue/fix.diff)):

```diff
-                } elseif ($reviewDueTime < strtotime('tomorrow')) { // review overdue but not response
+                } elseif ($reviewDueTime < time()) { // review overdue but not response
…
-                if ($reviewDueTime < strtotime('tomorrow')) { // review due
+                if ($reviewDueTime < time()) { // review overdue
```

and in the three SQL copies, make every `date_due` and
`date_response_due` comparison, under both aliases (`ra.`, `raod.`),
count a date as late from the day after it: four lines in
`classes/submission/Collector.php` and two in
`classes/submission/reviewAssignment/Collector.php`, for example

```diff
-    $q->where('raod.date_due', '<', Core::getCurrentDate(strtotime('tomorrow')))
+    $q->where('raod.date_due', '<', Core::getCurrentDate(strtotime('today')))
…
-    $q->where('ra.date_response_due', '<', Core::getCurrentDate(strtotime('tomorrow')))
+    $q->where('ra.date_response_due', '<', Core::getCurrentDate(strtotime('today')))
```

The `getStatus()` change and the `buildReviewStageQueries()` copy
change what the screens show. The other two copies change only the
public `/submissions` API's `isOverdue` and a filter nothing calls, and
keep the three in step with the status, which is what
`pkp/pkp-lib#3894` asked for.

Tried on `main` in OJS and OMP: with the same steps, Julie Janssen's
row read "Please complete this review by 2026-10-15 00:00:00." with
"Finish review", Paul Hudson's "Please accept or decline this request
by 2026-10-15" with "Respond to request", the editor's rows "Request
Accepted" and "Request Sent", and "Reviews overdue (0)". To check that
the fix reaches no further, the control (both dates yesterday) read the
same with the fix in and out: both reviewers late, both editor's rows
"Overdue", the submission under "Reviews overdue".

**Alternatives**:

- Change only `getStatus()`. The reviewer's list and the editor's row
  would be right, but "Reviews overdue" would still list the
  submission on its due date and disagree with its own rows.
- Keep the due date late and change the wording instead. That goes
  against `pkp/pkp-lib#3500`, against the response date's rule and
  against the reminders, which all give the reviewer the day.

**What goes with it**:

- A due date stored with a time of day (no screen stores one) is late
  from that minute for the status and from the next day for the
  filters, as the response date behaves now.
- The accepted row's midnight time
  ([U28-A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U28-A5-accepted-review-row-due-date-clock-time.md))
  would then mislead by a day ("by 2026-10-15 00:00:00" while the
  whole 15th is in time). Its fix drops the time, so the two fit
  together.
- The fix proposed for a late re-sent request
  ([U27-A47](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A47-resent-request-never-overdue.md))
  edits the lines around these comparisons; the two diffs apply
  together with a context adjustment.
- Backport: 3.5, 3.4 and 3.3 have the same comparisons (3.3 in
  `ReviewAssignment.inc.php` and
  `PKPSubmissionQueryBuilder.inc.php`); the change is the same there.
- A guard: no unit test covers `getStatus()` today, so a new test
  class, with an accepted review and an unanswered request due today
  and yesterday; and an e2e check in U28 that reads the reviewer's row
  on a review due today.

Small: the comparisons follow the rule the response date already uses,
all in one pkp-lib area, with no stored data to repair; plus the new
test class.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-due-today-reads-overdue/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1–9 on a dataset
  install, opening the workflow by its address and reloading it before
  each "Edit", and reads each row by the submission's ID:
  `PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/review-due-today-reads-overdue/walk.js`;
  `MODE=nb` runs the control alone. The fix was tried with
  `node bin/try-fix.js apply …/fix.diff ojs omp`, the walk and the
  control, then `revert` and the control again.
- Walked on 2026-10-15 on OJS and OMP, `main` and `stable-3_5_0`, each
  install freshly reset to the default dataset (pkp/datasets 7912e09,
  PostgreSQL), server and browser in UTC. Every walk gave the Observed
  above; no request answered 400 or more and no page script failed.
  On 3.5 the dataset's dates differ (OMP 2026-11-08); the steps are
  the same.
- The fault does not depend on the database: the status is worked out
  in PHP, and the filters compare a stored `YYYY-MM-DD 00:00:00` with
  a date string. MySQL not checked.
- Tips walked or read: OJS `main` 378eced941, OMP `main` f4836d4fb,
  both with lib/pkp b17fadae59 and ui-library 47b565cb; OJS
  `stable-3_5_0` ca763c91cd, OMP `stable-3_5_0` a70bbb9c4, both with
  lib/pkp 4045d9241e and ui-library 2576e00a; lib/pkp `stable-3_4_0`
  55c8e406b3 (OJS daf0ca971d, OMP 0aec65441, ui-library ee684b34) and
  `stable-3_3_0` 5e84acd11b (OJS d7d9dd14ec, OMP 8e72fc883, ui-library
  96959f9e).
- 3.5 code: `getStatus()` has both `strtotime('tomorrow')` comparisons
  (lines 695 and 701), and the three SQL copies the same comparisons
  (`Collector.php` 546-551 and 917-922, `reviewAssignment/Collector.php`
  436-441).
- 3.4 code: `getStatus()` lines 673 and 679, and `Collector.php` lines
  416-421. The reviewer's older list (`SubmissionsListItem.vue`) shows
  the status's own notice for `REVIEW_OVERDUE`, "The reviewer has
  missed the review due date.", and the Reviewers grid
  (`ReviewerGridCellProvider`) "Overdue" with "Review due".
- 3.3 code: `ReviewAssignment.inc.php` lines 500 and 506, and
  `PKPSubmissionQueryBuilder.inc.php` lines 344-348; the same list
  and grid.
- Default dates: `schemas/context.json` gives `numWeeksPerResponse`
  and `numWeeksPerReview` 4 each; `HasReviewDueDate` offers today plus
  those weeks for both (falling back to 3 and 4 only when a setting is
  0). The dataset's journal and press store 4 and 4.
- Monthly email: `classes/scheduler/Scheduler.php` runs
  `EditorialReminders` `monthlyOn(1)`; `EditorialReminder::handle()`
  calls `ReviewRound::determineStatus()`, which returns
  `REVIEWS_OVERDUE` for any assignment in `REVIEW_OVERDUE`.
- Introduced: `git log -S"strtotime('tomorrow')"` on the file (blame
  stops at the 2021 PSR-12 reformat e3f570bc37) leads to 7e2115fe48,
  which changed both review comparisons from `time()`;
  `commits/7e2115fe/pulls` gives `pkp/pkp-lib#3995` (merged
  2018-08-28). The `#3500` fix landed in eae5416d90 (2018-03-29), which
  passed the response date twice to the end-of-day move, and
  23324cf0f6 (2018-04-10), which passed the review date.
- Upstream search (2026-10-15) in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, by the symptom's words and then by
  `REVIEW_ASSIGNMENT_STATUS_REVIEW_OVERDUE` and `strtotime('tomorrow')`.
  `pkp/pkp-lib#13472` (closed) fixed the day count and wording in the
  dashboard popovers, and `pkp/pkp-lib#10752` (open) is about the
  stored round status not updating when a date passes: different
  faults.
- Not driven: the round status line, the monthly editorial email and
  the editors' list popover on the due date; the "Reviews overdue"
  view for a request whose response alone is due today; the REST
  API's `isOverdue`; a server whose time zone is not UTC; 3.4 and 3.3.
