# A late, unanswered re-sent review request is not marked "Overdue" and offers no "Send Reminder"

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; no "Resend Review Request")
- **Introduced** `pkp/pkp-lib#8242` for `pkp/pkp-lib#4789` · [79daa420](https://github.com/pkp/pkp-lib/commit/79daa4200a7d8e49ddc9060bb74d771b07b9d580) · 2022-09-08 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U27 [A47](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a47)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor resends a review request that the reviewer declined, and the
reviewer then lets the new response date pass without answering. The
reviewer's row in "Reviewers" still reads "Request Resent", in plain
text, with no "Send Reminder" on the row or in its "More Actions" menu.
The round's status still reads "Awaiting responses from reviewers."
A request that was never re-sent and is late in the same way reads
"Overdue" in red and offers "Send Reminder".

So the editor is not told that this reviewer is late, and has to write
to them with "Email Reviewer" instead of sending the reminder.

Once the reviewer accepts, the row behaves normally again: a missed
review date shows "Overdue" as for any other request.

## Impact

- **Lost**: the prompt to chase a late reviewer. Automatic response
  reminders are off unless a journal or press sets them up (they are
  off in the default dataset). Without them, nothing else chases the
  reviewer. Where they are set up, they reach a re-sent request
  just as they reach a first one. The submissions list's indicator for
  that reviewer shows a pending request, not an overdue one. Nothing
  is stored wrong.
- **Who**: editors and section editors of journals and presses (a
  preprint server has no review) who resend a declined request. This
  is a rare step, and the fault shows only when that reviewer then
  misses the response date.
- **Way round**: the row's "Edit" window shows the response date, and
  "Email Reviewer" writes to the reviewer, though without the reminder's
  template.

Medium: the reviewer's lateness is hidden, and on an install without
automatic reminders nothing chases the reviewer unless the editor
notices the date. It would be low where automatic response reminders
are set up.

## Steps to reproduce

Preconditions: the default dataset, OJS `main`. OMP is the same with
the names given in brackets. Nothing else.

1. Sign in as `phudson` and open the review request for submission 12,
   "Sodium butyrate improves growth performance of weaned piglets during
   the first period after weaning"
   (`/index.php/publicknowledge/en/reviewer/submission/12`) [OMP:
   submission 17, "Open Development: Networked Innovations in
   International Development"].
2. Press "Decline Review Request", then the window's "Decline Review
   Request". Sign out.
3. Sign in as `dbarnes` and open submission 12 from "Assigned to me"
   [OMP: submission 17 from "Active submissions"]. Paul Hudson's row in
   "Reviewers" reads "Request Declined".
4. On that row, open "More Actions" › "Resend Review Request" and press
   the window's "Resend Review Request", keeping the dates it offers.
   The row reads "Request Resent".
5. To stand in for the reviewer letting the response date pass: on his
   row, open "More Actions" › "Edit", pick yesterday (2026-10-12 on the
   walk) as "Response Due Date" from the calendar, and press "OK".
6. Reload the page and open submission 12 again. Read Paul Hudson's row
   and the "Round 1 Status" box.
7. Open his row's "More Actions" menu.
8. Control: on Julie Janssen's row (her first request, also
   unanswered), open "More Actions" › "Edit", pick yesterday as
   "Response Due Date", press "OK", and reload.

**Expected**: in step 6, Paul Hudson's row reads "Overdue" in red with
"Response due: 2026-10-12" and a "Send Reminder" button, as Julie
Janssen's row does in step 8, and the round status reads "A review is
overdue."

**Observed** (OMP the same): his row reads

```
Paul Hudson  Request Resent  Response due: 2026-11-10
```

in plain text, with no "Send Reminder". (The date shown is the review
deadline, a separate fault: spec U27
[A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a2).)
The round status reads "Awaiting responses from reviewers." His menu
reads "Review Details", "Edit", "Unassign Reviewer", "Email Reviewer",
"History", "Login As", "Editorial Notes", "Log Response": no reminder.

After step 8, Julie Janssen's row reads "Overdue" in red, "Response
due: 2026-10-12", with "Send Reminder", and the round status turns to
"A review is overdue." Paul Hudson's row still reads "Request Resent".

## Cause

`ReviewAssignment::getStatus()` (lib/pkp
`classes/submission/reviewAssignment/ReviewAssignment.php`, line 698)
returns `REVIEW_ASSIGNMENT_STATUS_REQUEST_RESEND` for any request that
is flagged re-sent and not yet answered. It does so before it compares
any due date:

```php
if (!$this->getDeclined() && !$this->getDateConfirmed() && $this->getRequestResent()) {
    return self::REVIEW_ASSIGNMENT_STATUS_REQUEST_RESEND;
}
```

The date checks below it turn an unanswered request into
`REVIEW_ASSIGNMENT_STATUS_RESPONSE_OVERDUE` once the response date has
passed, or `REVIEW_OVERDUE` once the review date has. A re-sent request
never reaches them. `request_resent` stays 1 after the resend, and only
the reviewer's answer (`date_confirmed`) ends the state.

The re-sent state was meant as a kind of "awaiting response":
`getStatusKey()` maps it to `submission.review.status.awaitingResponse`.
That label fits only while the response date is still ahead.

The early return came with the resend feature itself
([79daa420](https://github.com/pkp/pkp-lib/commit/79daa4200a7d8e49ddc9060bb74d771b07b9d580),
`pkp/pkp-lib#4789`), which wanted the row to show that the request was
sent again.

Reach. Every screen keys on this status:

- The workflow's "Reviewers" row, in ui-library
  `src/managers/ReviewerManager/useReviewerManagerConfig.js`.
  `getCellStatusItems()` gives the "Overdue" title and the red
  (`isNegative`) only to the two overdue states, and gives
  `REQUEST_RESEND` its own title. `getItemPrimaryActions()` gives
  "Send Reminder" only to the two overdue states. Seen on the walk.
- The round status: `ReviewRound::determineStatus()` counts
  `REQUEST_RESEND` as an incomplete review, never an overdue one, so
  "A review is overdue." does not show. Seen on the walk.
- The editors' submissions list: the reviewer indicator and its
  popover come from the status-keyed map in ui-library
  `src/pages/dashboard/composables/useDashboardConfigReviewActivity.js`.
  Its `REQUEST_RESEND` entry (line 262) is drawn as in progress, while
  `RESPONSE_OVERDUE` is drawn in the attention colour with the
  "Overdue" icon.
- The reviewer's own submissions list:
  `useDashboardConfigEditorialActivity.js` (lines 575-605) shows "Please
  accept or decline this request by {date}" for both `AWAITING_RESPONSE`
  and `REQUEST_RESEND`. So a late re-sent request still asks the
  reviewer to answer by a date that has passed.
- The 3.4 Reviewers grid: `ReviewerGridCellProvider::getCellActions()`
  offers "Send Reminder" only for the two overdue states.

Two things select by the dates rather than the status, so they already
treat the request as late:

- The scheduled review reminders (`classes/task/ReviewReminder.php`).
  Declining clears the reminder date, and the resend clears the answer,
  so a re-sent request is reminded exactly like a first one.
- The editors' "Reviews overdue" view of the submissions list
  (`classes/submission/Collector.php`, lines 959-990), which lists the
  submission even though its row reads "Request Resent".

## Proposed fix

In `getStatus()`, remove the three-line early return and add a
two-line `elseif` for the re-sent case inside the "no answer yet"
branch. It goes after the two overdue checks and before the final
`AWAITING_RESPONSE`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resent-request-never-overdue/fix.diff)):

```diff
-        if (!$this->getDeclined() && !$this->getDateConfirmed() && $this->getRequestResent()) {
-            return self::REVIEW_ASSIGNMENT_STATUS_REQUEST_RESEND;
-        }
-
         if (!$this->getDateCompleted()) {
 …
                 } elseif ($reviewDueTime < strtotime('tomorrow')) { // review overdue but not response
                     return self::REVIEW_ASSIGNMENT_STATUS_REVIEW_OVERDUE;
+                } elseif ($this->getRequestResent()) { // request resent after a decline, response not due yet
+                    return self::REVIEW_ASSIGNMENT_STATUS_REQUEST_RESEND;
                 } else { // response not due yet
                     return self::REVIEW_ASSIGNMENT_STATUS_AWAITING_RESPONSE;
                 }
```

The new check can drop `!getDeclined()` and `!getDateConfirmed()`
because it can be reached only when those already hold: declined and
cancelled requests return earlier, and the branch it sits in is the
one for requests without an answer. So a re-sent request that is still
in time keeps "Request Resent". Only a late one changes, to the overdue
state a first request gets. No screen needs a change of its own.

The reviewer's own submissions list changes too, and that is intended.
A late re-sent request will show "Deadline for responding to this
request has passed. Please accept or decline this request at the
earliest.", as a late first request does. The reviewer's action stays
"Respond to request", because `DashboardCellReviewAssignmentActions.vue`
treats both states alike.

This was tried on `main` in OJS and OMP. With the same steps, Paul
Hudson's row read "Overdue" in red, "Response due: 2026-10-12", with
"Send Reminder", and the reminder window sent the reminder. The round
status read "A review is overdue."

To check that the fix reaches no further, a re-sent request was
accepted and then had its response date moved to yesterday. It read
"Request Accepted" with the fix in and with it out.

**Alternatives**:

- Teach each screen to treat a late re-sent request as overdue (the
  Reviewers row, the round status, both submissions lists). That means
  four places to keep in step with the dates instead of one.
- Clear the re-sent flag once the response date passes. That needs a
  scheduled job, and it loses the record that the request was sent
  again.

**What goes with it**:

- REST API: a late re-sent request now reports `statusId` 4 (or 6)
  instead of 11, as a first request does.
- Backport: 3.5 (line 678) and 3.4 (line 656) have the same lines. The
  diff applies to both with only a line offset. It matters more on 3.4:
  "Resend Review Request" there keeps the request's old dates, which
  have often passed already, so the row reads "Request Resent" while
  the request is already late.
- A guard: a unit test of `getStatus()` for a re-sent request whose
  response date has passed, and an e2e check in U27 that resends a
  declined request, moves its response date to yesterday and reads the
  row.

Small: one method in pkp-lib changes, a three-line check removed and a
two-line one added, plus a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resent-request-never-overdue/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1–8 on a dataset
  install, but in step 3 it opens the workflow by its address
  (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`)
  rather than from the list. Run it with
  `PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/resent-request-never-overdue/walk.js`.
  When the row offers "Send Reminder" (the fix in), the script opens
  the window and sends the reminder. `WALK_MODE=neighbour` runs the
  accepted-request check alone.
- Walked on 2026-10-13 on OJS and OMP, `main` and `stable-3_5_0`, each
  install freshly reset to the default dataset (pkp/datasets 384e28b,
  PostgreSQL). Every walk gave the Observed above. The resend answered
  200, and "Edit" stored the response date 2026-10-12 with
  `request_resent` still 1. No request answered 400 or more, and no page
  script failed. With the fix in, step 4's row still read "Request
  Resent".
- The fault does not depend on the database: the status is worked out
  in PHP from the stored dates. MySQL was not checked.
- Tips walked or read: OJS `main` 7c6fba2064 and OMP `main` eb9381314,
  both with lib/pkp f4c2578c94 and ui-library c9889f00. OJS
  `stable-3_5_0` 5fc74d6213 (lib/pkp f4f8fcdbc0) and OMP `stable-3_5_0`
  486cbf9eb (lib/pkp 8094f06bf5), both with ui-library 2576e00a. lib/pkp
  `stable-3_4_0` 55c8e406b3 and `stable-3_3_0` 5e84acd11b.
- 3.5 code: the same early return in `getStatus()` (line 678 in both
  apps' lib/pkp), and the same `getCellStatusItems()` and
  `getItemPrimaryActions()` in the ui-library.
- 3.4 code (lib/pkp `origin/stable-3_4_0`): the same early return
  (line 656). `ReviewerGridCellProvider::getCellActions()` (lines
  148-149) offers "Send Reminder" only for `RESPONSE_OVERDUE` and
  `REVIEW_OVERDUE`. `ResendRequestReviewerForm::execute()` keeps the
  request's dates.
- 3.3 code (lib/pkp `origin/stable-3_3_0`): `getStatus()` has no
  re-sent state, and there is no `ResendRequestReviewerForm`.
- Automatic reminders, from the code on `main`: `ReviewReminder`
  selects incomplete assignments (`filterByIsIncomplete()`: notified,
  not completed, not declined, not cancelled), and that includes a
  re-sent request. With no answer, it sends the "before" reminder only
  while the response date is ahead. It sends the "after" reminder only
  when a reminder went out before that date. Declining clears
  `date_reminded` (`ReviewerAction::confirmReview()`), and the resend
  clears `date_confirmed`, so the re-sent request starts like a fresh
  one. The four reminder settings have no default in
  `schemas/context.json`, and the default dataset stores 0 for each.
- Introduced: `git blame` on line 698 gives 79daa4200a ("pkp/pkp-lib#4789
  Permit declined reviews to be reinitiated", authored 2022-09-08). That
  commit added the re-sent flag and state. `commits/79daa420/pulls`
  gives `pkp/pkp-lib#8242` (merged 2022-09-20).
- Upstream search (2026-10-13), in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library. `pkp/pkp-lib#13472` (closed) is about the day count
  and wording in the dashboard popovers, which is a different fault.
- Not driven: the editors' and the reviewer's submissions lists and the
  "Reviews overdue" view for the re-sent request; the scheduled
  reminders; a re-sent request whose review date has passed as well
  (the register entry's own probe saw it read "Request Resent" too); the
  3.4 grid; the backport diff, which was only checked with
  `patch --dry-run`.
