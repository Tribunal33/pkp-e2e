# Editors see no "Response due" date on a reviewer's "Request Sent" row in the Reviewers table

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the older grid reads "Request Sent" / "Response due: {date}")
  - 3.3: none (code; the same)
- **Introduced** `pkp/ui-library#418` for `pkp/pkp-lib#7495` · [619f90a9](https://github.com/pkp/ui-library/commit/619f90a9a38cf0e88aab74bd0b081ea4b7ed9f70) · 2024-10-03 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an editor has invited a reviewer who has not answered yet, the
reviewer's row in the submission's Reviewers table reads "Request Sent"
and nothing else. The "Response due: {date}" line under it is missing,
though the date is set and the row's "Edit" window shows it. An
accepted row prints "Review due: {date}" there, and a request past its
response date "Response due: {date}".

The editor has to open "Edit" on each row to see by when a reviewer
should answer.

## Impact

- **Lost** Nothing is stored wrong. The editor loses the answer
  deadline from the table, the one place that lists every reviewer of
  the round.
- **Who** Editors and section editors of a journal or a press, on every
  invited reviewer's row until the reviewer answers or the date passes.
- **Way round** "More Actions" > "Edit" on the row shows "Response Due
  Date", one row at a time.

Low: a missing line on a row whose state and deadline are both correct
in the app and one window away; nothing is lost and the task gets done.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 12, "Sodium butyrate
  improves growth performance of weaned piglets during the first period
  after weaning", is in review round 1; `jjanssen` (Julie Janssen) and
  `phudson` (Paul Hudson) have been invited and have not answered.
- On a press, the default dataset, OMP `main`: submission 17, "Open
  Development: Networked Innovations in International Development", in
  Internal Review round 1, with the same two reviewers.

Steps (the dates as on 2026-10-03):

1. Sign in as `dbarnes` and open submission 12. The workflow opens on
   Review, round 1. [On the press: submission 17, which opens on
   Internal Review, round 1.]
2. In the Reviewers table, read the "Reviewer status" of the row "Julie
   Janssen". Press "More Actions", then "Edit": "Response Due Date" and
   "Review Due Date" both read 2026-10-30. Press "Cancel".
3. On the row "Paul Hudson", press "More Actions", then "Edit". Pick
   "Response Due Date" 2026-10-17 and "Review Due Date" 2026-11-14 from
   their calendars (any two future dates, the response date first, such
   as today plus 14 and 42 days), and press "OK".
4. Read the "Reviewer status" of the row "Paul Hudson".

**Expected** Julie Janssen's row reads "Request Sent" with "Response
due: 2026-10-30" under it. Paul Hudson's row reads "Request Sent" with
"Response due: 2026-10-17", his response date, not his review date.

**Observed** Both status cells hold one line:

```
Request Sent
```

## Cause

`getCellStatusItems()` in
`lib/ui-library/src/managers/ReviewerManager/useReviewerManagerConfig.js`
builds each row's status cell as props for
`ReviewerManagerCellStatusInfo.vue`. The branch for
`REVIEW_ASSIGNMENT_STATUS_AWAITING_RESPONSE` (line 34) passes the date
line under the key `message` (line 39):

```js
title: t('editor.review.requestSent'),
message: t('editor.review.responseDue', {
	date: formatShortDate(reviewAssignment.dateResponseDue),
}),
```

`ReviewerManagerCellStatusInfo.vue` has no `message` prop. It declares
`title`, `description`, `isNegative`, `tooltip`, `recommendation` and
`competingInterests`, and prints the second line from `description`
only. So the line is never rendered; Vue hands the unknown prop on as an
attribute of the component's root element. Every other branch of the
function passes its date line as `description`.

The legacy reviewer grid printed this line
(`ReviewerGridCellProvider::_getStatusText()` in lib/pkp). The Reviewers
table that replaced it lost the line by passing it under the wrong key:
an oversight, not a design choice.

Reach:

- Only the unanswered request ("Request Sent"). The other dated
  branches show their line (read in the code; "Request Accepted" and
  "Request Resent" driven in a browser). The "Request Resent" row prints
  a "Response due:" line, but with the review date:
  [its own report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A2-request-resent-row-shows-review-deadline.md).
- The reviewer's own assignments list is built by another function and
  shows the date ("Please accept or decline this request by
  2026-10-30"); authors never see the status column.

## Proposed fix

Pass the line under the name the component reads, as the sibling
branches do
([fix-a7.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/fix-a7.diff)):

```diff
 						title: t('editor.review.requestSent'),
-						message: t('editor.review.responseDue', {
+						description: t('editor.review.responseDue', {
 							date: formatShortDate(reviewAssignment.dateResponseDue),
 						}),
```

Tried on `main`, journal and press: with the fix the rows of steps 2
and 4 read the Expected lines. Once Paul Hudson has accepted, his row
reads "Request Accepted" / "Review due: 2026-11-14" with the fix and
without it.

**Alternatives**

- Add a `message` prop to `ReviewerManagerCellStatusInfo.vue`. That
  gives one line two names, for one caller.

**What goes with it**

- The "Request Resent" branch, further down the same
  switch, needs its own one-line fix
  ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A2-request-resent-row-shows-review-deadline.md));
  the two are best landed together.
- No stored data, API or plugin hook is involved. On 3.5 the lines are
  the same, so the diff applies there as written.
- Test: a pkp-e2e check that an unanswered row reads "Request Sent"
  with "Response due:" and the response date.

Small: one word in one ui-library line, following the branches around
it.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/lib.js)),
  shared with the "Request Resent" report:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp
  shared/playwright/checks/issues/unanswered-reviewer-row-response-due-line/walk.js`.
  Its default mode takes step 2 (and then the other report's steps);
  `MODE=nb` takes steps 3 and 4 and Paul Hudson's acceptance. It picks
  the dates as today plus 14 and 42 days and opens the workflow by its
  address (`…/dashboard/editorial?workflowSubmissionId=12`).
- Tips walked: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c (lib/pkp cf3f984335), lib/ui-library d4e01883 on both.
  Dataset: pkp/datasets e8dafbc (2026-10-02), PostgreSQL.
- Code read on 3.4 and 3.3 (lib/pkp `stable-3_4_0` 767353f4fe,
  `stable-3_3_0` ac3fa73402; OJS d68934d0d1 and ac77c9fb35, OMP
  0aec65441 and 8e72fc883): `ReviewerGridCellProvider::_getStatusText()`
  prints "Request Sent" with `editor.review.responseDue` and the
  response due date on both branches. Neither app overrides the cell
  provider.
- Introduced: `git blame` on line 39 leads to 619f90a9, the commit that
  added the file; the GitHub API's `commits/619f90a9…/pulls` names
  `pkp/ui-library#418`.
- Upstream search (pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp):
  "response due" reviewer, "Request Sent" response due, reviewer status
  due date, `getCellStatusItems`. `pkp/pkp-lib#10743` (closed), the
  Reviewer manager's design, does not mention the line; nothing reports
  it.
- Not driven: an install whose short date format differs from the
  dataset's; OPS (no review).
