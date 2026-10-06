# A reviewer's list shows an accepted review's due date with a midnight clock time, "2026-10-30 00:00:00"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the older list reads "Review Due: 2026-10-30")
  - 3.3: none (code; the older list reads "Review Due: 2026-10-30")
- **Introduced** `pkp/ui-library#364` for `pkp/pkp-lib#7495` · [0034beaf](https://github.com/pkp/ui-library/commit/0034beaf8079b3c8ab2df0aba6ee5dac5cb8b28f) · 2024-06-18 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U28 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Once a reviewer accepts a review request, the row of their assignments
list reads "Please complete this review by 2026-10-30 00:00:00.": the
due date followed by a midnight time. Before they accept, the same row
reads "Please accept or decline this request by 2026-10-30", and the
review page shows "Review Due Date" as 2026-10-30, the date alone.

The reviewer reads a deadline of midnight that nobody set, since an
editor chooses a day and no time. The day itself is not misleading: the
list calls the review overdue from the start of the 30th.

The clock time shows on every review the reviewer has accepted and not
yet submitted, while it is not overdue and the submission is still in
review. The fix is one line in one ui-library file.

## Impact

- **Lost** Nothing. A reviewer who takes the midnight to mean "by the
  end of the 29th" reads the day as the list does: its row turns to
  "Deadline for completing this review has passed." when the 30th
  begins.
- **Who** Every reviewer of a journal or a press, on each such row. On
  a journal that changed its short date format, this row alone ignores
  the setting.
- **Way round** None needed.

Low: a date in the wrong form on a row whose day reads as the list
itself counts it; a review that stayed in time through the due day
would make the row misleading and raise it.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 12, "Sodium butyrate
  improves growth performance of weaned piglets during the first period
  after weaning", is in review round 1; `phudson` has not answered the
  request.
- On a press, the default dataset, OMP `main`: submission 17, "Open
  Development: Networked Innovations in International Development", in
  Internal Review round 1, with the same reviewer.

Steps:

1. Sign in as `phudson` and open "Action Required by me" under "My
   Assignments as Reviewer"
   (`/index.php/publicknowledge/en/dashboard/reviewAssignments`). Read
   row 12.
2. Press "Respond to request" on row 12. On the review page, tick the
   box that agrees to the "privacy statement" (the dataset's journal
   and press show one) and press "Accept Review, Continue to Step #2".
3. Open "Action Required by me" again and read row 12.

On a press: the same steps with submission 17.

**Expected** The row of step 3 reads "Please complete this review by
2026-10-30.", the date as the row of step 1 and the review page show
it, in the journal's short date format (year-month-day in the dataset).

**Observed** In step 1 the row's "Editorial Activity" reads:

```
Please accept or decline this request by 2026-10-30
```

The review page of step 2 shows "Response Due Date" and "Review Due
Date" as 2026-10-30. In step 3 the row reads, with "Finish review"
beside it:

```
Please complete this review by 2026-10-30 00:00:00.
```

A submitted review's row in the same list reads "Review submitted on
2026-10-02", the date alone.

## Cause

`getEditorialActivityForMyReviewAssignments()` in
`lib/ui-library/src/pages/dashboard/composables/useDashboardConfigEditorialActivity.js`
builds the row's sentence from the assignment's status. The branch for
an accepted assignment passes the due date into the sentence as the API
sent it:

```js
const date = reviewAssignment.dateDue;
…
alert: t('dashboard.reviewAssignment.completeReviewByDate', {
	date,
}),
```

The list reads `_submissions/reviewerAssignments`, whose rows follow
`lib/pkp/schemas/reviewAssignment.json`: `dateDue` is a date and time
(`date:Y-m-d H:i:s`), and a due date is stored at midnight. So the
sentence gets "2026-10-30 00:00:00".

The three other branches that print a date format it with
`formatShortDate()`, which applies the journal's short date format: the
unanswered one (`dateResponseDue`), the declined one (`dateConfirmed`)
and the submitted one (`dateCompleted`). The accepted branch alone does
not, so its row also ignores that setting.

The branch has been so since the function was first written, in
`useEditorialLogic.js`, for `pkp/pkp-lib#7495`, which replaced the older
list. That list read "Review Due: {$date}" from a date the server had
already cut to the day.

Reach:

- A row shows it when the reviewer accepted, the review is not overdue
  and the submission is still in review; a submission in copyediting or
  production gets "Incomplete" before this branch is reached. Any view
  of the list can hold such a row; "Action Required by me" was walked,
  journal and press.
- When the row stops showing it: `ReviewAssignment::getStatus()` in
  lib/pkp moves a midnight due time to 23:59:59 and answers "review
  overdue" once that is before `strtotime('tomorrow')`, which is true
  from the first moment of the due day (read in the code, not driven).
- The editor's dashboard is not touched: its rows read a different
  endpoint, whose `Schema::getPropertyReviewAssignments()` in
  `lib/pkp/classes/submission/maps/Schema.php` already sends `dateDue`
  as `Y-m-d`, and `useReviewerManagerConfig.js` formats every date it
  prints (read in the code).
- No other sentence in ui-library's dashboard, managers or reviewer
  pages takes a review date unformatted. This comes from a search of
  the code for `dateDue`, `dateResponseDue` and a bare `date` passed to
  `t()`.

## Proposed fix

Format the date as the sibling branches do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/accepted-review-row-due-date-clock-time/fix.diff)):

```diff
 						alert: t('dashboard.reviewAssignment.completeReviewByDate', {
-							date,
+							date: formatShortDate(date),
 						}),
```

Formatting a date for the screen belongs in the front end, not in the
API. `formatShortDate()` is the helper this file already uses for it.
The API's value stays a date and time, as its schema says.

Tried on `main`, journal and press: with the fix step 3 reads "Please
complete this review by 2026-10-30."; the unanswered row ("Please accept
or decline this request by 2026-10-30") and a submitted review's row
("Review submitted on 2026-10-02") read the same with the fix and
without it.

**Alternatives**

- Send `dateDue` as `Y-m-d` from the reviewer's endpoint, as the
  submission map does for the editor's list. That changes what an API
  client reads and goes against the assignment's schema, for one
  sentence.

**What goes with it**

- Left out, for the team to decide: of the four sentences that carry a
  date, this is the only one that ends with a period ("Please complete
  this review by {$date}." in `lib/pkp/locale/en/submission.po`, beside
  "Please accept or decline this request by {$date}"). Dropping it is a
  string change in pkp-lib and its translations.
- No stored data, API or hook is involved. On 3.5 the file has the same
  lines at the same place, so the diff applies there as written.
- Test: a pkp-e2e scenario for the reviewer's list, which checks that
  an accepted row reads "Please complete this review by" and the date
  in the form the unanswered row had.

Small: one call in one line of ui-library, following the lines around
it.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/accepted-review-row-due-date-clock-time/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/accepted-review-row-due-date-clock-time/lib.js)).
  It takes the steps on the journal and the press:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp
  shared/playwright/checks/issues/accepted-review-row-due-date-clock-time/walk.js`
  on a dataset fleet (harness.md "Dataset fleets"); `MODE=nb` in front
  runs the neighbour alone (`jjanssen`'s unanswered row on the same
  submission; a submitted review's row, journal submission 10 as
  `amccrae`, press submission 16 as `agallego`); `PKP_E2E_LINE=stable-3_5_0`
  in front walks 3.5.
- The script opens "Action Required by me" by its address
  (`…/dashboard/reviewAssignments?currentViewId=reviewer-action-required`)
  rather than through the sidebar.
- The fix was applied with `node bin/try-fix.js apply
  shared/playwright/checks/issues/accepted-review-row-due-date-clock-time/fix.diff
  ojs omp` (it rebuilds the JavaScript), walked, and reverted.
- Tips walked: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246c (lib/pkp
  cf3f984335, lib/ui-library d4e01883). Dataset: pkp/datasets e8dafbc
  (2026-10-02), PostgreSQL.
- Code read on 3.5: `useDashboardConfigEditorialActivity.js` differs
  from `main`'s in three constant names only; the accepted branch is the
  same, and so are the two `strtotime('tomorrow')` comparisons of
  `ReviewAssignment::getStatus()`.
- Kind: regression, because the older list showed the reviewer the same
  due date as a date alone and the change that replaced the list did
  not.
- Code read on 3.4 and 3.3 (lib/ui-library `stable-3_4_0` ee684b34,
  `stable-3_3_0` 96959f9e; lib/pkp 6f96165c90 and 4156e50233; OJS
  75cc2d488b and ac77c9fb35, OMP 0aec65441f and 8e72fc8836): the
  reviewer's list is `SubmissionsListItem.vue`, which prints "Review
  Due: {$date}" from the assignment's `due`. The server sends that as a
  date alone: `date('Y-m-d', …)` in 3.4's
  `classes/submission/maps/Schema.php`, the journal's short date format
  in 3.3's `PKPSubmissionService::getPropertyReviewAssignments()`. The
  string `dashboard.reviewAssignment.completeReviewByDate` is on neither
  branch.
- Introduced: `git blame` on the line leads to 0034beaf ("I7495
  activity (#364)"), where the branch was written in
  `src/pages/dashboard/composables/useEditorialLogic.js` as
  `t('dashboard.completeReviewByDate', {date})` beside
  `formatShortDate(date)` in the unanswered branch; later commits moved
  the function and renamed the key.
- Upstream search (pkp/pkp-lib, pkp/ui-library, pkp/ojs): "complete this
  review by", reviewer dashboard due date "00:00:00",
  `completeReviewByDate`. `pkp/pkp-lib#10970` (closed), the design of
  the reviewer's views, gives the sentence as "Please complete this
  review by 2023.04.21", a date alone; nothing reports the clock time.
- Not driven: the "All assignments" view's accepted row (the same
  function builds it); a journal with another short date format; the
  row on its due day; OPS (no review).
- Unverified: whether the row calling a review overdue from the start
  of its due day is intended. `ReviewReminder` counts it late only once
  today is after the due date, the day after, and the comment beside
  the comparison says "review due". If the due day is meant to be in
  time, that is a fault of its own in `getStatus()` and the midnight on
  this row would mislead by a day.
