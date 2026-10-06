# Reviewer empties a saved review text and saves again: the old text stays saved and is what the editor reads

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#5669` for `pkp/pkp-lib#3698` · [cb97145b09](https://github.com/pkp/pkp-lib/commit/cb97145b09ac2b91ca342ddfa39a93b874f59be7) · 2020-03-31 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U28 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A reviewer who has saved text in "For author and editor" or "For
editor" ("For editor only" on a press) with "Save for Later", then
deletes all of it and saves again, sees "Your changes have been
saved." and an empty box. The deleted text is still the saved one. It
is back in the box when the review is opened again, and when the
reviewer submits with the box showing nothing, the editor reads the
deleted text as the review.

The editor has no sign that the text was withdrawn. A withdrawn "For
author and editor" text also goes on by itself: the default emails
that ask the author for revisions or decline the submission open with
every submitted review's "For author and editor" text in them, so it
reaches the author unless the editor cuts it out. An editor-only
remark first typed into that box by mistake is the plain case.

It needs a review without a review form, which is the default. The
fix is in one place, this step's save.

## Impact

- **Lost**: the reviewer's deletion is not recorded; the review keeps
  the text they removed.
- **Who**: a reviewer of a journal or press who uses "Save for Later"
  and later empties one of the two boxes completely. One who opens the
  review again sees the text back in the box; one who empties the box
  and submits in the same visit never sees it again. The editor reads
  it in "Read Review", and the "For author and editor" text is in the
  default revisions and decline emails to the author. On `main` it is
  also in the article's public review record when the review is marked
  publicly visible, which is off by default.
- **Way round**: before submitting, a reviewer who notices can put a
  character in the box; nothing on the page says so. After submitting,
  the reviewer has none. On `main` the editor can clear the "For
  author and editor" text with "Modify Review" (read in the code, not
  walked) if the reviewer tells them. On 3.5 and older the editor
  cannot change either text, and the "For editor" text cannot be
  cleared on any version.

Medium: text a reviewer withdrew reaches the editor, and by default the
author, with nobody told, but only when a box saved with text is left
completely empty. Evidence that reviewers often empty a saved box
would raise it to high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS or OMP (the context `publicknowledge`). Nothing
  else. On the journal `jjanssen` has an unanswered review request on
  submission 12, "Sodium butyrate improves growth performance of weaned
  piglets during the first period after weaning"; on the press on
  submission 17, "Open Development: Networked Innovations in
  International Development".

Steps:

1. Sign in as `jjanssen` (password `jjanssenjjanssen`) and open the
   review (`/index.php/publicknowledge/en/reviewer/submission/12`; 17
   on the press).
2. Press "Accept Review, Continue to Step #2" (tick the privacy box
   when it shows), then "Continue to Step #3".
3. Type `u28c first text for the author` into "For author and editor"
   and `u28c first text for the editor` into "For editor" ("For editor
   only" on the press). Press "Save for Later".
4. Delete all the text in both boxes. Press "Save for Later".
5. Reload the page. The review opens on step 3 again.
6. Delete all the text in both boxes again. On the journal choose
   "Accept Submission" under "Recommendation". Press "Submit Review",
   then "OK".
7. Sign in as `dbarnes` (password `dbarnesdbarnes`), open the
   submission's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`;
   17 on the press). It opens on "Review" (on the press on "Internal
   Review", which `dbarnes` reaches as press editor), where Julie
   Janssen's row is. Press "Read Review" on that row.

**Expected**: after step 4 the saved review holds no text. Both boxes
are empty after step 5, and at step 7 the editor reads a review without
text.

**Observed**: steps 3 and 4 both show "Your changes have been saved.",
and the boxes are empty after step 4. After step 5 both boxes hold the
step-3 texts again. Step 6 ends on "4. Completion" with "Review
Submitted". At step 7 the "Review Details" window [3.5: the "Review"
window] shows, under "Reviewer Comments":

```
For author and editor
u28c first text for the author
For editor                      (press: For editor only)
u28c first text for the editor
```

The page sent both boxes empty at steps 4 and 6 (`comments=` and
`commentsPrivate=` in the form post, answered `"status": true`).

A saved text replaced by another text is stored, and the other box
keeps its own.

## Cause

`PKPReviewerReviewStep3Form::saveReviewForm()`
(`lib/pkp/classes/submission/reviewer/form/PKPReviewerReviewStep3Form.php`,
lines 318–324) writes each box only when it has text:

```php
if (strlen($comments = $this->getData('comments')) > 0) {
    Repo::reviewAssignment()->saveReviewComment($reviewAssignment, $comments, true);
}

if (strlen($commentsPrivate = $this->getData('commentsPrivate')) > 0) {
    Repo::reviewAssignment()->saveReviewComment($reviewAssignment, $commentsPrivate, false);
}
```

`saveReviewComment()` updates the review's existing row in
`submission_comments` in place, so a box with text overwrites what was
saved. For an empty box nothing runs, and the row saved earlier stays
as it was. Both `saveForLater()` and `execute()` ("Submit Review") go
through this method. `initData()` then loads the row back into the box
on the next visit, and every reader of the review reads the same row.

The two `strlen(...) > 0` checks are older than "Save for Later". They
date from 2016
([d608dee64e](https://github.com/pkp/pkp-lib/commit/d608dee64e246788664b9ecfe5406edcb1916cce)),
when the form wrote a review once, on submit, and an empty box only
meant there was no row to create. `pkp/pkp-lib#5669` added "Save for
Later" and the update in place, and kept the checks. Since then an
empty box can also mean "remove what I saved", and the checks skip it.

Reach:

- Both boxes, on "Save for Later" and on "Submit Review" (walked on
  `main` and 3.5, OJS and OMP).
- What reads the kept row on `main`:
  - the editor's "Review Details"
    (`ReviewResource::getReviewComments()`, walked);
  - the decision emails (code): `PKP\mail\traits\ReviewerComments`
    fills `{$allReviewerComments}` with the "For author and editor"
    text of every completed review of the round, and the default
    bodies of the "Request Revisions", "Resubmit for Review" and
    "Decline Submission" emails to the author hold that variable (3.5
    too);
  - the author's "Read Review" (code), offered only for a review whose
    type is "Open" (`AuthorReviewerGridHandler`,
    `authorReadReview.tpl`);
  - the public review record of a published article (code):
    `PKP\API\v1\peerReviews\resources\SubmissionPeerReviewResource`,
    served by `PeerReviewController` and `OpenReviewComponent`, reads
    the "For author and editor" row of each review that is marked
    publicly visible (`isReviewPubliclyVisible`, false by default) and
    confirmed by the editor; `main` only;
  - the reviewer's round history (code):
    `PKPReviewController::getHistory()` reads both rows;
  - the review's PDF and XML downloads (`PKPReviewController`) and the
    Review Report (`ReviewReportDAO`) (code).
- A review with a review form is not affected (code): its answers go
  through `saveReviewFormResponse()` per question, with no such check.
- The editor's "Modify Review" on `main`
  (`ReviewAssignmentController::editReview()`) does clear: it saves an
  empty "For author and editor" text when the request carries the
  field (code).

## Proposed fix

When a box arrives empty, remove the text saved for it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emptied-review-text-kept-after-save/fix.diff),
two files in pkp-lib). `saveReviewForm()` becomes:

```php
// A box left empty removes the text saved for it earlier.
foreach (['comments' => true, 'commentsPrivate' => false] as $field => $viewable) {
    if (strlen($text = (string) $this->getData($field)) > 0) {
        Repo::reviewAssignment()->saveReviewComment($reviewAssignment, $text, $viewable);
    } else {
        Repo::reviewAssignment()->deleteReviewComment($reviewAssignment, $viewable);
    }
}
```

and `PKP\submission\reviewAssignment\Repository` gains
`deleteReviewComment()` beside `saveReviewComment()`: the same lookup
(`getReviewerCommentsByReviewerId()` for the assignment and the
visibility), then `SubmissionCommentDAO::deleteObject()` on what it
finds. A box that was never filled finds no row and nothing changes, so
a review without text still has no row, as today.

The row is deleted, not blanked, so that no reader needs a change: a
review whose text was removed then looks exactly like a review that
never had text, a state they all handle already.

Three things the diff does on purpose:

- A field missing from the request counts as empty and deletes. That
  holds today because `step3.tpl` prints both boxes whenever the
  review has no review form, so both are always posted. A save that
  may send one field only (the API planned in `pkp/pkp-lib#13296`)
  should test for the field first, as `editReview()` does.
- `deleteReviewComment()` deletes every row the lookup returns, while
  `saveReviewComment()` updates the newest only. This form keeps one
  row per box. The lookup and some readers (the XML download numbers
  the rows) allow for several; whether upgraded data holds several
  was not checked. Deleting all is meant: no reader should show an
  older row once the box is emptied.
- The event log's "comments modified" entries are not touched. They
  are written only by the editor's "Modify Review", and
  `SubmissionEventLogGridHandler` finds them by the ids of the rows
  that exist, so a deleted row would hide them. A reviewer cannot
  save after that: "Modify Review" leaves the review completed (it
  completes an unsubmitted one), `saveStep()` refuses a completed
  review, and nothing in pkp-lib sets a review back to uncompleted.

Tried on `main` on OJS and OMP. With the fix both boxes stay empty
after step 5, and at step 7 the editor's window shows "-" under "For
author and editor" and under "For editor". With the fix and without,
"Save for Later" on two boxes never filled stores nothing, and a
replaced text is stored as before.

**Alternatives**

- Save the empty string into the existing row, as the editor's "Modify
  Review" does on `main`. Smaller by one method, but it leaves a row
  without text, and two readers show a text section whenever a row
  exists: the author's "Read Review" (`authorReadReview.tpl`,
  `$comments->getCount()`) and 3.5's editor window (`readReview.tpl`)
  would print the "Reviewer Comments" headings over nothing.
- Do it in the page: refuse an empty box that had text. That changes
  what a reviewer may do, and the fault is in the server's save, so
  the fix belongs there.

**What goes with it**

- No repair: a kept text cannot be told from a text the reviewer meant
  to keep.
- The editor's "Modify Review" on `main` writes an empty row when it
  clears the text (the first alternative's state). It could call
  `deleteReviewComment()` too. It is left out of the diff: its event
  log entry is found through the row, so deleting the row there would
  hide the entry the same edit writes.
- `pkp/pkp-lib#12534` and `pkp/pkp-lib#13296` (both open) plan to move
  this step to Vue and its save to the review API. Until that lands,
  and on 3.5, the form is the reviewer's only save.
- Backport: 3.5, 3.4 and 3.3 have no `saveReviewComment()`; the form
  holds the lookup and the update inline under each `strlen` guard. The
  same change there is an `else` branch per box that deletes the row
  the lookup finds. Not tried on those lines.
- Guard: an e2e scenario in pkp-e2e (a reviewer saves a text, empties
  the box, saves, and reopens the review to an empty box), or a pkp-lib
  test of `saveReviewForm()` with an empty `comments` over a saved row.

Small: one form method and one short repository method in pkp-lib.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emptied-review-text-kept-after-save/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emptied-review-text-kept-after-save/lib.js).
  It takes the Steps on an install loaded from the default dataset
  (pkp/datasets e8dafbc, 2026-10-02; PostgreSQL) and records, per
  step, what each box shows, what the form posted, the answer, the
  notice, the review's rows in `submission_comments`, and the editor's
  window:
  `PROBE_FEATURE=issues-u28c PROBE_AGENT=u28c node bin/probe.js all shared/playwright/checks/issues/emptied-review-text-kept-after-save/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` and that line's install for 3.5;
  `MODE=nb` in front for the control: a never-filled save and a
  replaced text).
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, 2026-10-02. No
  request failed and no page script failed in any walk. After step 4
  the review's two rows still held the step-3 texts; with the fix they
  were gone.
- Where the walk differed from the text: on OJS 3.5 steps 5 to 7 were
  taken in a second run on the same install, without a reset.
- Fix trial on `main`, OJS and OMP:
  `node bin/try-fix.js apply shared/playwright/checks/issues/emptied-review-text-kept-after-save/fix.diff ojs omp`,
  the walk and the control, `revert`; the control also ran without the
  fix.
- Branch tips the walks and code reads were made on. `main`: OJS
  b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
  3dc90c81a6). `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c (lib/pkp
  cf3f984335). `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, lib/pkp
  6f96165c90. `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, lib/pkp
  4156e50233.
- Code read on 3.5: `PKPReviewerReviewStep3Form::saveReviewForm()` has
  the two `strlen(...) > 0` checks (lines 340 and 369) around an
  inline lookup and update in place; `readReview.tpl` prints the rows
  and has no box to change them (3.4 and 3.3 the same).
- Code reads on 3.4 and 3.3: the same method in
  `PKPReviewerReviewStep3Form.php` (3.4, lines 349 and 378) and
  `PKPReviewerReviewStep3Form.inc.php` (3.3, lines 262 and 292) has
  the same guards over the same update in place, and `saveForLater()`
  calls it; the introducing commit is on both branches.
- Introduced: `git log -S` for the guard gives d608dee64e (2016, when
  the form inserted a row once, on submit). cb97145b09 added
  `saveForLater()`, moved the save into `saveReviewForm()` and made it
  update the existing row, keeping the guard; the GitHub API names
  `pkp/pkp-lib#5669` as its pull request, whose description names
  `pkp/pkp-lib#3698`. The lines' later blame (e3f570bc37, b5c86a8cb7)
  is a reformat and the move of the update into
  `saveReviewComment()`.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, for reviewer comments "save for
  later" empty, review comments cleared or deleted and back, reviewer
  cannot remove comments, `saveReviewForm`, `saveReviewComment`,
  `PKPReviewerReviewStep3Form`. `pkp/pkp-lib#13296` and
  `pkp/ui-library#873` (for `pkp/pkp-lib#12534`) are the planned move
  of the step, not this fault.
- Not driven: the decision emails, the author's "Read Review", the
  public review record, the round history, the PDF and XML downloads
  and the Review Report (the readers of the same row, code); one box
  emptied while the other keeps text (the method treats the boxes
  alike, code); the editor's "Modify Review"; the backport on 3.5;
  3.4 and 3.3; OPS (no review).
- Unverified: whether the decision page shows the editor the kept
  text itself or the `{$allReviewerComments}` placeholder while the
  email is composed (the page was not opened); the sent email holds
  the text either way.
