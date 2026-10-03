# On a press, recording a reviewer's competing interests in "Modify Review" submits an empty review for them

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: none (no "Modify Review")
  - 3.4: none (code; no "Modify Review")
  - 3.3: none (code; no "Modify Review")
- **Introduced** `pkp/pkp-lib#13196` for `pkp/pkp-lib#13117` · [d65efa07](https://github.com/pkp/pkp-lib/commit/d65efa0775ae5b60ca4ffd406582fb3fbd5a8f6b) · 2026-08-19 · Taslan A. Graham (taslangraham); reachable from the screens since `pkp/ui-library#993` and `pkp/pkp-lib#13394` for `pkp/pkp-lib#13282` (2026-09-28)
- **Upstream** no issue on the fault (searched 2026-10-03); the rule it breaks is written in `pkp/pkp-lib#13291` (closed), which asked whether a competing-interests-only change should complete the review, and `pkp/pkp-lib#13337` (closed), which answered that it should not
- **Tracked in** U27 [A40](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a40)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press with a "Competing Interests" policy, an editor opens "Modify
Review" on a request whose reviewer has not answered yet, or has accepted
but not submitted, records only the reviewer's competing-interests
declaration and presses "Save Changes". The save submits the review on
the reviewer's behalf: the row turns "Review Submitted" with "Read
Review", and both comment blocks read "-". Nothing on screen says the
save will submit anything.

The reviewer's request is closed: their list shows "Review submitted on
{date}" and "View" opens the read-only "4. Completion" page. The empty
review then counts as received for the round and is listed, with no
comments, in the decision emails to the author.

## Impact

- **Lost:** the reviewer's open request, closed by an empty review in
  their name; the review they were going to write, or had started, cannot
  be submitted. Nobody is told.
- **Who:** an editor of a press that sets a "Competing Interests" policy
  (Settings > Workflow > Review > "Reviewer Guidance"; empty by default),
  who records a declaration a reviewer sent by email before their review.
  Rare.
- **Way round:** none for that reviewer in that round: "Add Reviewer"
  refuses a person already in the round, cancelled or not, and "Reinstate
  Reviewer" after "Cancel Reviewer" brings the submitted review back. The
  editor can only ask another reviewer. The declaration stays on the
  closed request.

Medium: a reviewer's task is lost silently, in a state a press meets
rarely, and the editor can only get round it by asking another reviewer.

## Steps to reproduce

Preconditions: PKP's default test dataset, OMP `main`. Submission 2, "The
West and Beyond: New Perspectives on an Imagined Region", is in External
Review round 1, and Al Zacharia (`alzacharia`) has not answered his request.
The press has no "Competing Interests" policy, so step 2 sets one.

1. Sign in as `dbarnes`.
2. Settings > Workflow > "Review" > "Reviewer Guidance": type "Declare any
   competing interests." into "Competing Interests" and press "Save".
3. Open submission 2
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=2`).
   Al Zacharia's row reads "Request Sent".
4. On Al Zacharia's row, "More Actions" > "Review Details".
5. Press "Modify Review", then "Modify Review" in "Modify this review?".
6. Under "Competing Interests", tick "I may have competing interests
   (Specify below)" and type "The reviewer consults for the region's
   tourism board." Leave everything else as it is.
7. Press "Save Changes".
8. Sign out; sign in as `alzacharia` and open "My Assignments as Reviewer".

**Expected:** the declaration is saved and shown in "Review Details"; the
row still reads "Request Sent" and Al Zacharia is still asked to accept or
decline the request.

**Observed:** the window closes and the row reads "Review Submitted",
"Competing Interests" and "Read Review"; its menu has "Cancel Reviewer" in
place of "Unassign Reviewer" and no "Log Response". "Review Details" reads
"Last modified by Daniel Barnes", "Review Submitted: {the moment of the
save}", the declaration, and "-" under "For author and editor" and "For
editor only". The save sent:

```
PUT /index.php/publicknowledge/api/v1/submissions/2/reviewAssignments/{id}/review
{"competingInterests":"<p>The reviewer consults for the region's tourism board.</p>","comments":""}
→ 200
```

Al Zacharia's "Action Required by me" no longer lists the submission;
"All assignments" and "Completed" list it as "Review submitted on {date}"
with "View", which opens "4. Completion": "Review Submitted. Thank you for
completing the review of this submission."

An accepted request goes the same way (submission 17, Julie Janssen, who
accepted first and declared no competing interests while accepting): her
row read "Request Accepted", the editor changed the declaration in "Modify
Review" and saved, and the row turned "Review Submitted" with "Read
Review"; her own acceptance date was kept.

On a journal (OJS `main`, the same policy set, submission 12, Julie
Janssen) the same save shows "This field is required." under the empty
"Recommendation", sends nothing, and the request stays open.

## Cause

The "Modify Review" window always sends the "For author and editor" box
with the save: `getReviewPayload()` in ui-library
`src/managers/ReviewerManager/useReviewDetailsForm.js` puts
`comments: formData.comments` in the body, `""` when the box is empty. A
box where a comment was typed and then deleted sends `""` too, not empty
markup such as `<p></p>` (walked), so the fix below needs no wider
check.

`ReviewAssignmentController::editReview()` (lib/pkp
`api/v1/submissions/reviewAssignments/ReviewAssignmentController.php`)
takes `$commentsSubmitted = $validated['comments'] ?: ''` and compares it
with the stored comment, `$existingComment?->getData('comments')`, which is
`null` when the reviewer never wrote one. `'' !== null`, so the method
saves an empty comment, logs a "…Comments." change and sets
`$isReviewUpdated`. An updated review with no `dateCompleted` is then
submitted for the reviewer: `pkp/pkp-lib#13176` set `dateCompleted` on an
editor's first change, as `pkp/pkp-lib#13117` specified ("if the review
is changed by editor for the first time (dateCompleted is null) - than
consider it as review was completed"), and `pkp/pkp-lib#13338` added
`dateConfirmed` and `step` 4. Of the fields that decide the review's
state, the competing-interests block sets only `lastModifiedById`; it
never sets `$isReviewUpdated`. The empty box does.

That breaks a rule upstream wrote down. `pkp/pkp-lib#13291`, which added
the declaration to this endpoint, asked: "Should a competing interests
only change do that? Competing interests are declared at acceptance, not
when the review is written. It only comes up in OMP, since OJS requires a
recommendation in Modify Review so saving that form always changes review
content anyway." `pkp/pkp-lib#13337` answered: "This should only apply
when the editor's changes actually submit the review. Changing a review
that was already submitted, or changing only the competing interests
(#13291), should not affect what the reviewer sees."

The comparison came with `pkp/pkp-lib#13196` ("Fix: empty value does not
clear comments"). Before it, Laravel's empty-string-to-null conversion
turned `""` into `null` and `if ($commentsSubmitted !== null)` skipped it;
the fix replaced that by `exists('comments')` and `?: ''`, so that
emptying a stored comment clears it. An empty box against no comment was
not meant as an edit.

Reach:

- A press's save with nothing entered at all, or with a comment typed and
  deleted again, goes through the same comparison and submits an empty
  review (walked).
- A journal's save with a recommendation and an empty box still submits,
  as it should, but also writes an empty comment row and a "…Comments."
  activity-log line nobody entered (code).
- A review with a review form is not affected: for a form review the
  window sends `reviewFormResponses` and no `comments`, and
  `EditReview::withValidator()` refuses `comments` when the review has a
  form (code).
- A reviewer file uploaded in "Modify Review" goes through its own
  request and is not part of the save; a save after it, with the box
  empty, submits the review today only through the empty box (code).

## Proposed fix

Treat no stored comment as an empty one in `editReview()`, so that an
empty box left empty is not an edit
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-competing-interests-save-submits-review/fix.diff)):

```diff
                 $oldComments = $existingComment?->getData('comments');
-                if ($commentsSubmitted !== $oldComments) {
+                if ($commentsSubmitted !== ($oldComments ?? '')) {
```

Tried on OMP and OJS `main` with the Steps: on the press the save answered
200, the row stayed "Request Sent" with the "Competing Interests" badge,
"Review Details" showed the declaration, and Al Zacharia was still asked
to "Respond to request"; Julie Janssen's accepted request stayed "Request
Accepted" with the badge; the journal still asked for the
"Recommendation". Around it:

- A comment typed on another unanswered request (OMP submission 2,
  Gonzalo Favio; OJS submission 12, Paul Hudson, with a recommendation)
  still submitted the review for the reviewer.
- Emptying a submitted review's comment (Paul Hudson, OMP submission 12,
  OJS submission 7) still cleared it.
- A comment typed and deleted again, nothing else (OMP submission 18, Jhon
  Doe) no longer submitted anything: the row stayed "Request Sent"
  (without the fix: "Review Submitted").

The change goes where the decision is made, so every client of the
endpoint gets it, and it is the rule of `pkp/pkp-lib#13337`.

**Alternatives:**

- Require "For author and editor" on a press while the review is not yet
  submitted, client and `EditReview` rules, as a journal requires the
  "Recommendation". It stops the empty review but refuses to record a
  declaration on its own, which `pkp/pkp-lib#13337` allows.
- Have the window leave an empty box out of the body. Other clients of the
  endpoint would still submit a review by sending `""`.

**What goes with it:**

- A product decision: after the fix, a save that follows a reviewer file
  upload with the box left empty no longer submits the review; the editor
  types a comment, or marks the review complete (the
  [report on "Mark as Complete"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-OMP4-press-mark-complete-closes-unreviewed-request.md)
  keeps that path open for a review that is only a file).
  `pkp/pkp-lib#13337` ties
  submitting to "the editor's changes", and the file is not part of the
  save, so it does not settle whether a file alone should submit.
- Stored data: requests already closed this way read as submitted with an
  empty comment; nothing tells them from a reviewer's empty review, so no
  repair is proposed.
- Guard: lib/pkp has no tests of API controllers (`tests/classes` and
  `tests/jobs` only), so a test of `editReview()` needs that scaffolding
  first; otherwise an e2e test that saves a declaration alone on a press
  and finds the row still "Request Sent".

Small: one comparison in one method, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-competing-interests-save-submits-review/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-mark-complete-closes-unreviewed-request/lib.js)),
  run on an install freshly loaded from the default dataset:
  `node bin/probe.js ojs,omp shared/playwright/checks/issues/press-competing-interests-save-submits-review/walk.js`
  (the Steps, then the same save on an accepted request); `MODE=nb` runs
  the checks around the fix (a comment typed on another unanswered
  request; a submitted review's comment emptied; a comment typed and
  deleted again). The walk's texts carry the tag `u27k10`.
- Walked on `main` (OMP, OJS as the control) and on `stable-3_5_0`, both
  on PostgreSQL.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); OJS `main` ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), the same `ReviewAssignmentController.php`, `EditReview.php`
  and `useReviewDetailsForm.js` as OMP's; OMP `stable-3_5_0` 9c5e24246
  (lib/pkp cf3f984335, lib/ui-library d4e01883); OJS `stable-3_5_0`
  c1cee76b95 (lib/pkp 771474347e).
- Code reads: `editReview()` and `EditReview` on `main`; 3.5, 3.4 (lib/pkp
  767353f4fe) and 3.3 (lib/pkp ac3fa73402) have no
  `api/v1/submissions/reviewAssignments/` controller and no ui-library
  `ReviewDetailsEditModal`. The way round and what the empty review does
  next: `ReviewerForm::_isValidReviewer()`, `ReinstateReviewerForm`,
  `ReviewRound::determineStatus()`, `ReviewerComments::setupReviewerCommentsVariable()`;
  the refused "Add Reviewer" and the reinstated row were walked for the
  same closed state in the
  [report on "Mark as Complete"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-OMP4-press-mark-complete-closes-unreviewed-request.md).
- Introduced: `git blame` on the comparison names b5c86a8cb7
  (`pkp/pkp-lib#13176`, the endpoint, with `if ($commentsSubmitted !==
  null)`) and d65efa0775 (`pkp/pkp-lib#13196`, the `exists('comments')`
  and `?: ''`); the declaration came with 5af3b39336 (`pkp/pkp-lib#13369`,
  the API) and c4303c66af (`pkp/pkp-lib#13394`, with `pkp/ui-library#993`,
  the window).
- Fix tried: applied to OJS and OMP `main`, the Steps and the `MODE=nb`
  checks walked with it, then reverted and the checks walked again.
- Not walked: a save after a reviewer file upload (code); the decision
  emails (code).
