# On a press, "Mark as Complete" closes a review request that has no review, leaving the reviewer nothing to press

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none (a press's "Confirm" asks for a review file first)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#960`, `pkp/pkp-lib#13198` and `pkp/omp#2444` for `pkp/pkp-lib#13156` · [30beb5e3](https://github.com/pkp/ui-library/commit/30beb5e3ed17f98407654d5850e9b682a4005755) · 2026-08-27 · Blesilda Biazon (blesildaramirez)
- **Upstream** `pkp/pkp-lib#10544` (open), covering the reviewer left on step 1 after the older window's "Confirm", on journals and presses; `pkp/pkp-lib#6353` (open), asking that the older window's "Confirm" stay disabled until the reviewer has submitted, on a journal
- **Tracked in** U27 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#omp4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press, an editor opens "Review Details" on a review request the
reviewer has not answered yet, or has accepted but not yet submitted.
"Mark as Complete" is enabled. The dialog it opens, "Mark this review as
complete?", does not say that the reviewer has submitted nothing.
Confirming shows "The review has been marked as complete." and records a
completed review with nothing in it; the row turns "Complete".

The reviewer's request is closed. Their list reads "Review submitted on
{date}", and "View" opens the step they had reached ("1. Request" or "2.
Guidelines") with its only button disabled. An accepted reviewer's
acceptance date is replaced by the moment of the click. The editor cannot
reopen the request or send the same reviewer a new one in this round.

## Impact

- **Lost:** one reviewer's review for the round. The request is closed by
  an empty review in their name, and an accepted reviewer can no longer
  submit what they were writing. Nobody is told.
- **Who:** editors of any press who open "Review Details" on a request
  without a review (the row menu offers it on every request that is not
  cancelled) and press "Mark as Complete", for instance to log a review
  that came by email.
- **Way round:** none for that reviewer in that round. "Cancel Reviewer"
  and then "Reinstate Reviewer" bring back the "Complete" row, and "Add
  Reviewer" refuses the same person: "This reviewer has already been
  assigned to this review round." The editor can only ask another
  reviewer.
- **Afterwards:** the empty review counts as received. The round no
  longer waits for it, and the decision emails to the author list it as
  a reviewer with no comments (code).

Medium: a reviewer's task is lost without a word to them, but only after
the editor confirms a dialog on a request that has no review; it would be
high if the button closed requests without that dialog.

## Steps to reproduce

Preconditions: PKP's default test dataset, OMP `main`. Submission 17,
"Open Development: Networked Innovations in International Development", is
in Internal Review round 1 with two requests nobody has answered, Paul
Hudson's (`phudson`) and Julie Janssen's (`jjanssen`), neither with a
review form. Nothing is created.

Unanswered request:

1. Sign in as `dbarnes`.
2. Open submission 17
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`).
   Paul Hudson's row in "Reviewers" reads "Request Sent".
3. On Paul Hudson's row, "More Actions" > "Review Details".
4. Press "Mark as Complete", then "Mark as Complete" in "Mark this review
   as complete?".
5. Press "Cancel" to close the window and read Paul Hudson's row.
6. Sign out; sign in as `phudson`. Open "My Assignments as Reviewer" and,
   under "All assignments", press "View" on submission 17.
7. Sign in as `dbarnes`, open submission 17. On Paul Hudson's row, "More
   Actions" > "Cancel Reviewer", and "Cancel Reviewer" in its window.
8. Press "Add Reviewer", search for "Hudson" and read his entry; close the
   window.
9. On his row, "More Actions" > "Reinstate Reviewer", and "Reinstate
   Reviewer" in its window.

Accepted request:

1. Sign in as `jjanssen`. Open the request for submission 17, tick the
   privacy box and press "Accept Review, Continue to Step #2".
2. Sign in as `dbarnes`, open submission 17. On Julie Janssen's row, "More
   Actions" > "History" reads "Request Accepted: {the moment of step 1}".
3. On her row, "More Actions" > "Review Details", "Mark as Complete",
   "Mark as Complete".
4. Read her row and "History" again.
5. Sign in as `jjanssen` and open the review from "My Assignments as
   Reviewer".

**Expected:** "Mark as Complete" stays disabled while the reviewer has not
submitted a review and no reviewer file was uploaded for them, with "This
review is incomplete and cannot be marked as complete yet." beside it. The
requests stay open.

**Observed:** "Mark as Complete" is enabled with no message. The dialog
reads "Mark this review as complete? You can still modify this review
after marking it as complete. You will have the opportunity to thank the
reviewer in the next step."; confirming shows "The review has been marked
as complete." (`PUT …/reviewAssignments/{id}/consider` → 200). The window
then reads "Review Completed: {the moment of the click}" over "-" under
"For author and editor" and "For editor only", and "No Items" under
"Reviewer Files".

- Unanswered: Paul Hudson's row reads "Complete" with "Thank Reviewer" and
  "Revert Decision"; its menu offers "Cancel Reviewer" in place of
  "Unassign Reviewer" and no "Log Response". His "Action Required by me"
  no longer lists the submission; "All assignments" and "Completed" list
  "Review submitted on {date}" with "View", which opens "1. Request" with
  "Save and continue" disabled, steps 2 to 4 disabled, and no accept or
  decline.
- Accepted: Julie Janssen's row reads "Complete", and "History" reads
  "Request Sent: …", "Request Accepted: {the click}", "Review Submitted:
  {the click}", "Review Completed: {the click}". Her "View" opens "2.
  Guidelines" with "Continue to Step #3" disabled and steps 3 and 4
  disabled.
- The way round, on Paul Hudson's row: "Cancel Reviewer" shows "Reviewer
  cancelled." and the row "Request Cancelled"; "Add Reviewer", searched
  for "Hudson", lists him with "This reviewer has already been assigned to
  this review round." and no "Select" button; "Reinstate Reviewer" shows
  "Reviewer reinstated." and the row reads "Complete" again.

On a journal (OJS `main`, submission 12, the same two reviewers) the
window shows "Mark as Complete" disabled beside "A recommendation is
required before this review can be marked as complete.", and both
requests stay open.

## Cause

The window decides whether "Mark as Complete" may be pressed in
`confirmBlockedMessage`, ui-library
`src/managers/ReviewerManager/useReviewDetails.js`. It blocks for
`isOJS() && !reviewAssignment.reviewerRecommendationId`, and for an
unanswered required question of a review form. Nothing checks that the
reviewer has submitted. On a journal a request nobody has touched carries
no recommendation; one appears when the reviewer submits, when the
reviewer picks one and presses "Save for Later" on step 3
(`PKPReviewerReviewStep3Form::saveForLater()`), or when the editor saves
"Modify Review". On a press `isOJS()` is false, so on a request without a
review form nothing blocks the button.

Before the rework (3.5 and older) a press's window had a check of its
own. OMP's `templates/controllers/grid/users/reviewer/readReview.tpl`
attached lib/pkp's `ReadReviewHandler` with `reviewCompleted`, and its
`reviewFilesRequired_()` refused "Confirm" on a review not submitted
unless a reviewer file had been uploaded ("No Files Uploaded" / "You have
not uploaded any review files."). A journal's template attached the plain
form handler. `pkp/ui-library#960` replaced the window and carried over
the journal's check only; `pkp/pkp-lib#13198` and `pkp/omp#2444` removed
the template and the handler as unused. That lost check is the
regression: on 3.5 a press refused this click.

The reviewer's dead page is older. The button sends `PUT
…/reviewAssignments/{id}/consider` with `considered:
REVIEW_ASSIGNMENT_CONSIDERED`, and
`ReviewAssignmentController::markReviewConsidered()` (lib/pkp
`api/v1/submissions/reviewAssignments/`) completes a review that has no
`dateCompleted`: it sets `dateCompleted` and `dateConfirmed` to now and
leaves `step` as it was. `pkp/pkp-lib#13138` copied that branch from
`PKPReviewerGridHandler::reviewRead()`, the older window's "Confirm",
which still has it. The reviewer's page opens on the stored step and
refuses the steps past it, so the reviewer lands on step 1 or 2 of a
review that is complete. That is `pkp/pkp-lib#10544`, open since 2024.
`pkp/pkp-lib#13338` gave `editReview()`, the "Save Changes" path, `step` 4
and kept an existing `dateConfirmed`; neither completion branch got the
same.

Reach:

- A press, every request with no review and no review form: unanswered
  and accepted (walked); declined, where the window's date becomes the
  click and the row stays "Request Declined" (not walked here; see
  Evidence).
- A press, after a reviewer file was uploaded in "Modify Review", the case
  the window's guidance describes: the completion goes through and
  strands the reviewer on "1. Request" (walked).
- A journal, a reviewer's draft with a recommendation saved by "Save for
  Later": the journal's check passes, the completion goes through and the
  reviewer is left on "3. Download & Review" with "Save for Later" and
  "Submit Review" disabled, the acceptance date replaced by the click
  (walked on OJS `main`, submission 12, Julie Janssen, "Revisions
  Required"). The older window's "Confirm" does the same on 3.5 (walked),
  with no draft needed.
- The submissions list's review popover, "View details", opens the same
  window and the same check (code).
- `PKPReviewerGridHandler::reviewRead()` is still on `main`, still in the
  grid's review-assignment operations, with no screen left that calls it
  since `pkp/pkp-lib#13198`; OJS's `ReviewerGridHandler::reviewRead()`
  overrides it (code).

## Proposed fix

Give a press's window back its check, and make both completion branches
move the reviewer to the end as "Save Changes" does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-mark-complete-closes-unreviewed-request/fix.diff)):

- ui-library `useReviewDetails.js`: load the review's reviewer files
  (`GET submissions/{id}/files/review/{reviewAssignmentId}?fileStages=`
  `SUBMISSION_FILE_REVIEW_ATTACHMENT`, the endpoint the window's own file
  list reads), reload them with the review and when "Modify Review"
  closes, and on a press (`!isOJS()`) block "Mark as Complete" with
  `editor.review.confirmReview.incomplete` while the review has no
  `dateCompleted` and no reviewer file. A journal keeps its recommendation
  check: the journal's window never asked for a file, and whether an
  editor may complete a reviewer's draft that carries a recommendation is
  a product question this regression does not settle.
- lib/pkp `ReviewAssignmentController::markReviewConsidered()` and
  `PKPReviewerGridHandler::reviewRead()`: when they complete a review, set
  `step` 4 and set `dateConfirmed` only when it is empty, the lines
  `pkp/pkp-lib#13338` gave `editReview()`:

```diff
         if (!$reviewAssignment->getDateCompleted()) {
-            // Editor completes the review.
-            $newReviewData['dateConfirmed'] = $newReviewData['dateCompleted'] = Core::getCurrentDate();
+            $now = Core::getCurrentDate();
+            $newReviewData['dateCompleted'] = $now;
+            $newReviewData['step'] = 4;
+            if (!$reviewAssignment->getDateConfirmed()) {
+                $newReviewData['dateConfirmed'] = $now;
+            }
         }
```

Tried on OMP and OJS `main` with the Steps: on the press both windows
showed "Mark as Complete" disabled beside "This review is incomplete and
cannot be marked as complete yet." and both requests stayed open; the
journal kept its recommendation message. Around it:

- A file uploaded in "Modify Review" for Paul Hudson's unanswered request
  enabled the button on the press; the completion went through and his
  "View" opened "4. Completion" (without the fix: "1. Request" with
  "Save and continue" disabled).
- The journal reviewer's draft with a recommendation was completed as
  before, now with her acceptance date kept and her "View" on "4.
  Completion" (without the fix: "3. Download & Review", both buttons
  disabled).
- "Mark as Complete" on a submitted review (OMP submission 12, OJS
  submission 7, Paul Hudson) completed it, with and without the fix.

The window keeps completing a review that arrived elsewhere, which its
guidance still offers ("If the reviewer has submitted their review
elsewhere, you may upload the file below and then press "Mark as
Complete""), once there is a file; and an editor who completes for a
reviewer leaves the reviewer on the read-only "4. Completion", as
`pkp/pkp-lib#13337` asks.

**Alternatives:**

- Disable the button on both apps until the reviewer has submitted, as
  `pkp/pkp-lib#6353` asks: simpler, but a review that came as a file alone
  could then be completed only through "Modify Review" with a comment
  typed, and a journal could no longer complete a reviewer's draft.
- Delete `reviewRead()` instead of fixing it: it has no caller left, but
  the delete reaches OJS's override too (lib/pkp and ojs).
- Refuse the completion in `consider()` alone: the button would stay
  enabled and answer an error.
- The server half alone: the reviewer is no longer stranded, but one
  click still closes an empty request on a press.

**What goes with it:**

- Stored data: assignments already completed this way keep `step` below
  4. A repair (`step` = 4 where `date_completed` is set and `step` < 4)
  would free those reviewers' pages; it is not in the diff.
- Backport: 3.5's press window keeps its file check; the server half
  applies as it stands to `reviewRead()` on 3.5, 3.4 and 3.3, which would
  close `pkp/pkp-lib#10544` there.
- The [report on the window's guidance](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A22-review-details-guidance-promises-upload.md)
  (it names an upload the window does not offer) rewords it to send the
  editor to "Modify Review" to upload a file before "Mark as Complete",
  the path this check keeps open. The
  [report on "Modify Review" offered then refused](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A30-A31-modify-review-offered-then-refused.md)
  edits the same `useReviewDetails.js` next to `confirmBlockedMessage`,
  so the two diffs need merging by hand.
- Guard: a ui-library test of `confirmBlockedMessage` on a press, and an
  e2e test that marks an unanswered press request complete.

Medium: two repos, the press check in ui-library with a request the window
did not make before, and the completion in two pkp-lib methods, with
their tests.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-mark-complete-closes-unreviewed-request/walk.js)
  and its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-mark-complete-closes-unreviewed-request/lib.js),
  run on an install freshly loaded from the default dataset:
  `node bin/probe.js ojs,omp shared/playwright/checks/issues/press-mark-complete-closes-unreviewed-request/walk.js`
  (the Steps, and on OMP the way round); `MODE=nb` runs the checks around
  the fix (a file uploaded in "Modify Review", then "Mark as Complete";
  a journal reviewer's draft with a recommendation; "Mark as Complete" on
  a submitted review). The uploaded file is a one-page PDF.
- Walked on `main` (OMP, OJS as the control) and on `stable-3_5_0`, both
  on PostgreSQL. On 3.5 the row's "Review Details" opens the older window,
  whose button is "Confirm": on OMP it showed "No Files Uploaded / You
  have not uploaded any review files." and both requests stayed open; on
  OJS it closed both requests, and also a reviewer's draft with a
  recommendation, leaving the reviewers on "1. Request" and "3. Download &
  Review" with their buttons disabled.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); OJS `main` ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), the same `useReviewDetails.js`, `ReviewAssignmentController.php`
  and `PKPReviewerGridHandler.php` as OMP's; OMP `stable-3_5_0` 9c5e24246
  (lib/pkp cf3f984335, lib/ui-library d4e01883); OJS `stable-3_5_0`
  c1cee76b95 (lib/pkp 771474347e); OMP `stable-3_4_0` 0aec65441 and
  `stable-3_3_0` 8e72fc883; lib/pkp `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402.
- Code reads: 3.4 and 3.3 OMP `readReview.tpl` attach `ReadReviewHandler`
  with `reviewCompleted`, and lib/pkp's `ReadReviewHandler.js` refuses an
  empty files grid, as on 3.5; OJS 3.4 and 3.3 attach the plain
  `AjaxFormHandler`. `reviewRead()` on all three lines and on `main` sets
  `dateConfirmed` and `dateCompleted` without `step`. "Add Reviewer"
  refuses a reviewer already in the round, cancelled or not
  (`ReviewerForm::_isValidReviewer()`, `AdvancedSearchReviewerForm`'s
  `currentlyAssigned`); `ReviewRound::determineStatus()` counts a received
  or complete assignment as in; the author decision emails list every
  completed review of the round (`ReviewerComments::setupReviewerCommentsVariable()`).
- Introduced: `git blame` on `confirmBlockedMessage` names 30beb5e3
  (`pkp/ui-library#960`); lib/pkp 4017a024f3 (`pkp/pkp-lib#13198`)
  removed `ReadReviewHandler.js`, `readReview.tpl` and the `readReview()`
  op that rendered the window, and left `reviewRead()`; OMP dd27031f5
  (`pkp/omp#2444`) removed OMP's `readReview.tpl`. The completion branch
  in `markReviewConsidered()` is 9f359f85f9 (`pkp/pkp-lib#13138`), a copy
  of the one in `reviewRead()`.
- Fix tried: applied to OJS and OMP `main` (ui-library rebuilt), the Steps
  and the `MODE=nb` checks walked with it, then reverted and the checks
  walked again. The `reviewRead()` hunk was read, not driven: no screen
  calls it.
- Not walked here: a declined request (driven on OMP `main` on
  2026-09-17); "Revert Decision" after the click (code:
  `markReviewUnconsidered()` resets only `considered` and
  `dateConsidered`, so the row returns to "Review Submitted"); the
  submissions list's popover; the decision emails.
