# A reviewer's "Request Resent" row reads "Response due:" with the review deadline, not the response deadline

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; no "Resend Review Request")
- **Introduced** `pkp/pkp-lib#8242` for `pkp/pkp-lib#4789` · [79daa420](https://github.com/pkp/pkp-lib/commit/79daa4200a7d8e49ddc9060bb74d771b07b9d580) · 2022-09-08 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

After an editor resends a review request to a reviewer who declined,
the reviewer's row in the Reviewers table reads "Request Resent" and
"Response due: {date}", but the date is the review deadline set in the
same window, not the response deadline. With a response due in two
weeks and a review in six, the row gives the six-week date as the day
the reviewer must answer by, until the reviewer answers.

Only this row is wrong: the reviewer's own list and the automatic
response reminder count from the response deadline. The real date is in
the row's "Edit" window.

## Impact

- **Lost** Nothing is stored wrong. The editor is shown a later answer
  deadline than the one just set. By the code, the reviewer's own
  assignments list and the automatic response reminder
  (`ReviewReminder`) use the response deadline. The resend email names
  a response deadline too, but the one the request had before the
  resend (the email sent in step 5 read "by 2026-10-30"), since its text is
  filled in when the window opens; that is a separate fault.
- **Who** Editors and section editors who resend a declined request, a
  rare step, and only when the two deadlines differ.
- **Way round** "More Actions" > "Edit" on the row shows the real
  "Response Due Date".

Low: a wrong date on a rarely met row, with the right one a window
away. The severity would rise if editors chase late reviewers by this
row alone, since they would wait until the review deadline.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 12, "Sodium butyrate
  improves growth performance of weaned piglets during the first period
  after weaning", is in review round 1; `jjanssen` (Julie Janssen) has
  been invited and has not answered.
- On a press, the default dataset, OMP `main`: submission 17, "Open
  Development: Networked Innovations in International Development", in
  Internal Review round 1, with the same reviewer.

Steps (the dates as on 2026-10-03):

1. Sign in as `jjanssen` and open the review request for submission 12
   (`/index.php/publicknowledge/en/reviewer/submission/12`).
2. Press "Decline Review Request", then "Decline Review Request" in the
   window.
3. Sign in as `dbarnes` and open submission 12. In the Reviewers table
   the row "Julie Janssen" reads "Request Declined". [On the press:
   submission 17, which opens on Internal Review, round 1.]
4. On that row, press "More Actions", then "Resend Review Request".
5. In the window, pick "Response Due Date" 2026-10-17 and "Review Due
   Date" 2026-11-14 from their calendars (any two future dates, the
   response date first, such as today plus 14 and 42 days; the window
   presets both from the journal's or press's review settings, four
   weeks each in the dataset). Press "Resend Review Request".
   [3.4: the window has no date fields; the request keeps the dates it
   had, so set them apart through the row's "Edit" first.]
6. Read the row's "Reviewer status".

On a press: the same steps with submission 17.

**Expected** The status reads "Request Resent" with "Response due:
2026-10-17" under it.

**Observed** The page notice "Request to reconsider the review
assignment was sent." shows, and the status cell reads, also after a
reload:

```
Request Resent
Response due: 2026-11-14
```

## Cause

`getCellStatusItems()` in
`lib/ui-library/src/managers/ReviewerManager/useReviewerManagerConfig.js`
builds each row's status cell. The branch for
`REVIEW_ASSIGNMENT_STATUS_REQUEST_RESEND` (line 141) puts the review due
date under the response-due label (line 147):

```js
title: t('editor.review.ReviewerResendRequest'),
description: t('editor.review.responseDue', {
	date: formatShortDate(reviewAssignment.dateDue),
}),
```

`dateDue` is the review deadline; the response deadline is
`dateResponseDue`. A resent request is one the reviewer has not answered
yet, so the response deadline is the one that applies. The other
branches pair each label with its own date.

The pairing is older than this table. `pkp/pkp-lib#8242` (for
`pkp/pkp-lib#4789`, "Permit declined reviews to be reinitiated") added
the state to the legacy grid's
`ReviewerGridCellProvider::_getStatusText()` with
`__('editor.review.responseDue', ['date' => substr($reviewAssignment->getDateDue(), 0, 10)])`,
and `pkp/ui-library#418` carried it into the Reviewers table that
replaced the grid.

Reach:

- Only the "Request Resent" row. "Request Accepted" and the overdue
  review state read `dateDue` under "Review due:", the overdue response
  state `dateResponseDue` under "Response due:" (read in the code;
  "Request Accepted" driven in a browser).
- The reviewer's own assignments list reads `dateResponseDue` for a
  resent request ("Please accept or decline this request by {date}",
  `useDashboardConfigEditorialActivity.js`), and
  `ReviewReminder` counts an unanswered request's reminders from
  `getDateResponseDue()`.
- The legacy `ReviewerGridCellProvider.php` is still in lib/pkp on
  `main` with the same line (199), but no screen loads that grid's rows
  any more; it is the line a 3.4 backport changes.

## Proposed fix

Read the response deadline
([fix-a2.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/fix-a2.diff)):

```diff
 						title: t('editor.review.ReviewerResendRequest'),
 						description: t('editor.review.responseDue', {
-							date: formatShortDate(reviewAssignment.dateDue),
+							date: formatShortDate(reviewAssignment.dateResponseDue),
 						}),
```

This copies the "Request Sent" branch's date, `dateResponseDue`. That
branch prints no date on screen itself today, because it passes the
line as `message`, which is not a prop the cell component takes
([its own report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A7-request-sent-row-no-response-due.md)).
The two one-line fixes sit in the same switch and are best landed
together.

Tried on `main`, journal and press: with the fix step 6 reads "Request
Resent" / "Response due: 2026-10-17". An accepted row whose two dates
differ (Paul Hudson's, set to 2026-10-17 and 2026-11-14 through "Edit")
reads "Request Accepted" / "Review due: 2026-11-14" with the fix and
without it.

**Alternatives**

- Keep `dateDue` and change the label to "Review due:". The reviewer
  has not accepted yet, so the deadline that matters next is the
  answer's.

**What goes with it**

- No stored data, API or plugin hook is involved. On 3.5 the lines are
  the same, so the diff applies there as written.
- A 3.4 backport is the same change in
  `ReviewerGridCellProvider::_getStatusText()` (`getDateDue()` to
  `getDateResponseDue()`). On `main` that line is never shown; changing
  it in the same pull request keeps the old grid from carrying the
  mistake.
- Test: a pkp-e2e check that a resent request with two different dates
  reads "Response due:" with the response date.

Small: one property name in one ui-library line.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/lib.js)),
  shared with the "Request Sent" report:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp
  shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/walk.js`.
  Its default mode first reads the unanswered row (the other report's
  step 2), then takes steps 1 to 6 here, with the dates as today plus
  14 and 42 days; it opens the workflow by its address
  (`…/dashboard/editorial?workflowSubmissionId=12`). The stored dates
  (response 2026-10-17, review 2026-11-14) were read from
  `review_assignments` after the 3.5 walk, and the resend email from
  the install's mail catcher.
- Tips walked: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c (lib/pkp cf3f984335), lib/ui-library d4e01883 on both.
  Dataset: pkp/datasets e8dafbc (2026-10-02), PostgreSQL.
- Code read on 3.4 (lib/pkp `stable-3_4_0` 767353f4fe; OJS d68934d0d1,
  OMP 0aec65441): the editor's reviewer list is the legacy grid, and
  `ReviewerGridCellProvider::_getStatusText()` prints the
  `REVIEW_ASSIGNMENT_STATUS_REQUEST_RESEND` state with
  `editor.review.responseDue` and `getDateDue()`; neither app overrides
  the cell provider. 3.4's "Resend Review Request" window has no date
  fields (pkp-lib bb5b711f added them in 2024, on 3.5 and `main` only),
  so the row prints the review date the request already had.
- Code read on 3.3 (lib/pkp ac3fa73402): the state does not exist, with
  no `REQUEST_RESEND` in lib/pkp's classes and no resend action.
- Introduced: `git log -S'STATUS_REQUEST_RESEND'` on the grid's cell
  provider leads to 79daa420, merged by `pkp/pkp-lib#8242` (merge commit
  aecccf0b), which added the state; `git blame` on the ui-library line
  leads to 619f90a9 (`pkp/ui-library#418`), which ported it.
- Upstream search (pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp):
  "Request Resent", "response due" reviewer, reviewer status due date,
  `REVIEW_ASSIGNMENT_STATUS_REQUEST_RESEND`, `getCellStatusItems`.
  `pkp/pkp-lib#11193` (closed) is about the resend action failing in the
  new table, not its date; nothing reports the date.
- Not driven: a resent request whose response date has passed; an
  install whose short date format differs from the dataset's; OPS (no
  review).
