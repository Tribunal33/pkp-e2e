# Deleting the last revised or copyedited file leaves the author's task and editors' notice missing

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code; the copyediting notice only)
- **Introduced** `pkp/pkp-lib#8685` for `pkp/pkp-lib#8670` · [a68a22461a](https://github.com/pkp/pkp-lib/commit/a68a22461a39b3ac8b6665f357131de6ca2fa662) · 2023-02-22 · Nate Wright (NateWr), the revisions task; the copyediting notice: not traced; present since at least [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) (2020-10-19)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U26 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a9), spec U32 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U32-copyediting-stage.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When the only revised file on a round is deleted, by the editor or by
the author, the round's status and the author's My Submissions row
correctly return to their revisions-requested state. The revisions
task, however, never comes back: the Tasks panel shows no task where
the decision had put "Revision required."

The same happens on Copyediting. An editor who deletes the only file in
"Copyedited Files" expects the notice they read before that file was
added ("Assign a copyeditor…" or "Awaiting Copyedits.") to come back,
since the list is empty again. No notice shows: not on the same page,
not when the workflow is opened again, not later.

Only the prompt is missing: the author's row still reads "Revision
requested" with "Submit revisions", and the editor still sees the empty
list.

## Impact

- **Lost**: the author's to-do entry for a revision request that is
  open again, and the editors' notice that a copyeditor is to be
  assigned or copyedits are awaited. Nobody is told either is missing.
- **Who**: an author whose only revised file on a round is deleted, by
  themselves (a wrong file uploaded) or by an editor; and every editor
  assigned to a submission whose last copyedited file is deleted.
  Journals and presses alike, no setting involved; both are uncommon
  steps. The copyediting notice is not a task: it is stored at the
  normal level and shown only in the box above the lists on that
  submission's Copyediting page, so it never reaches the editor's
  header Tasks panel or the dashboard; an editor meets its absence only
  on a submission they have already opened.
- **Way round**: My Submissions shows the request and offers "Submit
  revisions", the round's status box reads "Revisions have been
  requested." and "Upload revisions" is offered; on Copyediting the
  empty "Copyedited Files" list and the Participants panel's "Assign"
  show where the work stands. The next upload sets both right.

Low: no data or work is lost and both tasks can still be done from the
screens in front of the user; the author loses a Tasks entry, and the
editor a hint on a page they are already looking at.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).

Revisions (submission 13, "Hydrologic Connectivity in the Edwards
Aquifer between San Marcos Springs and Barton Springs during 2009
Drought Conditions", on "Review (Round 1)" with revisions already
requested; its author is `lkumiega`):

1. Sign in as `lkumiega`. "My Submissions" opens; the row of
   submission 13 reads "Revision requested" with "Submit revisions".
2. Press "Tasks" in the page header. It lists "Revision required." with
   the submission's title, and the button reads "Tasks 1".
3. Open submission 13 (or go to
   `/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=13`).
   The round reads "Revisions have been requested.". Press "Upload
   revisions", choose "Article Text", attach a file
   (`u26w1-revision.txt`), then "Continue", "Continue", "Complete". The
   round reads "Revisions have been submitted and a decision is
   needed." and the file is listed under "Revisions Uploaded".
4. Back on "My Submissions", press "Tasks": "No Items", as expected.
5. Open submission 13 again. On the "u26w1-revision.txt" row under
   "Revisions Uploaded" press "More Actions", "Delete", and "OK" in
   "Are you sure you wish to delete this item? This action cannot be
   undone.".
6. The round reads "Revisions have been requested." again. On "My
   Submissions" the row reads "Revision requested" with "Submit
   revisions".
7. Press "Tasks".

**Expected**: the Tasks panel lists a revisions task for submission 13
again and the button reads "Tasks 1": the request stands and no
revised file answers it.

**Observed**: the panel reads "No Items" and "0 - 0 of 0 items"; the
button reads "Tasks" with no count. The author holds no task record on
the submission.

On a press (OMP `main`, submission 16, "A Designer's Log: Case Studies
in Instructional Design", author `mpower`, component "Book
Manuscript"), first sign in as `dbarnes`, open submission 16, press
"Request Revisions", leave "Revisions will not be subject to a new
round of peer reviews." chosen, "Next", "Continue", "Record Decision";
then take steps 1 to 7 as `mpower`. Step 2 lists "Revisions to consider
in External Review."; step 7 shows the same "No Items".

Copyediting (submission 10, "Condensing Water Availability Models to
Focus on Specific Water Management Systems", on "Review (Round 1)" with
its reviews in; `dbarnes` is one of its assigned editors):

1. Sign in as `dbarnes` and open submission 10 (or go to
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=10`).
2. Press "Accept Submission"; "Continue" on "Notify Authors" and on
   "Notify Reviewers", then "Record Decision" on "Select Files". The
   window reads "Submission Accepted".
3. Open the submission's "Copyediting". Above the lists it reads
   "Assign a copyeditor using the Assign link in the Participants
   list.", and "Copyedited Files" reads "No Items".
4. Press "Upload/Select Files" above "Copyedited Files", then "Upload
   File"; choose "Article Text", attach a file (`u26w1-copyedit.txt`),
   "Continue", "Continue", "Complete", and "OK" in the window. The file
   is listed under "Copyedited Files" and the notice is gone, as
   expected.
5. On the file's row press "More Actions", "Delete", and "OK".
6. Open submission 10's "Copyediting" again.

**Expected**: "Copyedited Files" reads "No Items" and the notice "Assign
a copyeditor using the Assign link in the Participants list." is back.

**Observed**: "Copyedited Files" reads "No Items" and no notice shows,
on the same page and after the workflow is opened again.

On a press (OMP `main`, submission 16, component "Book Manuscript"),
no editor is assigned in the dataset and the notice is shown to
assigned editors only: as `dbarnes`, first press "Assign" in
"Participants", choose "Press editor", "Daniel Barnes", "OK"; then take
steps 2 to 6. The same notice shows at step 3 and is missing at step 6.

## Cause

`PKP\submissionFile\Repository::delete()`
(`lib/pkp/classes/submissionFile/Repository.php`, lines 477 to 512)
recomputes the tasks and notices that depend on the file before the
file is deleted:

```php
// Update tasks
$notificationMgr = new NotificationManager();
switch ($submissionFile->getData('fileStage')) {
    case SubmissionFile::SUBMISSION_FILE_REVIEW_REVISION:
        ...
        $notificationMgr->updateNotification(..., [NOTIFICATION_TYPE_PENDING_INTERNAL_REVISIONS, NOTIFICATION_TYPE_PENDING_EXTERNAL_REVISIONS], $authorUserIds, ...);
        break;
    case SubmissionFile::SUBMISSION_FILE_COPYEDIT:
        $notificationMgr->updateNotification(..., [NOTIFICATION_TYPE_ASSIGN_COPYEDITOR, NOTIFICATION_TYPE_AWAITING_COPYEDITS], null, ...);
        break;
}
...
$this->dao->delete($submissionFile);   // line 524
```

Each delegate it calls still finds the file being deleted, and nothing
recomputes once the row is gone:

- **The revisions task.** `PendingRevisionsNotificationManager::updateNotification()`
  builds the task only when `Repo::decision()->revisionsUploadedSinceDecision()`
  finds no revised file on the round newer than the decision. That
  check lists the round's files through `review_round_files`, where the
  file is still linked, so it answers "revisions were uploaded" and the
  delegate takes its removal branch. The round's stored status is
  right because it is recomputed after the delete (line 540); the
  status box on screen does not depend on it, since it is computed when
  the submission is read (`ReviewRound::determineStatus()`, called from
  the submission's API map in `classes/submission/maps/Schema.php`,
  line 764).
- **The copyediting notice.** `PKPEditingProductionStatusNotificationManager::updateNotification()`
  deletes both notices while `SUBMISSION_FILE_COPYEDIT` files exist on
  the submission, and builds one of them only when there are none. The
  count still includes the file being deleted, so both notices are
  deleted and none comes back.

The two halves have different histories. In 3.3 the same method (then
`PKPSubmissionFileService::delete()`) removed the file's round link
first (`deleteReviewRoundAssignment()`), so the revisions check no
longer counted the file and the task came back. The refactored
repository method had no task update at all until
[a68a22461a](https://github.com/pkp/pkp-lib/commit/a68a22461a39b3ac8b6665f357131de6ca2fa662)
(`pkp/pkp-lib#8685`, "Delete all related data and files when
submission file deleted") put it back, before the DAO delete. In the
refactored code the DAO delete itself removes the round link, where 3.3
had removed it before the task update. The copyediting count is by
file stage, not by round, and 3.3 already ran it before the file's row
was deleted, so the notice has never come back in any version that
recomputes it on delete.

Reach:

- The workflow's "Delete" (`PKPManageFileApiHandler::deleteFile()`),
  for the author and for the editor, and the REST API's file delete go
  through this method (code).
- Not covered: the upload window's "Cancel" after a first upload.
  `PKPManageFileApiHandler::cancelFileUpload()` deletes the `files` row,
  and the foreign key's cascade (`submission_files.file_id`,
  `onDelete('cascade')`) removes the submission file and its round link
  without `Repository::delete()`, so the author ends in the same state
  and the fix below does not reach it (code). Whether that "Cancel"
  should remove the file at all is spec U26
  [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a11),
  an open question.
- A press's Internal Review: `delete()` handles only
  `SUBMISSION_FILE_REVIEW_REVISION`, so deleting an internal-review
  revised file updates neither the tasks nor the stored round status,
  although `add()` treats both revision stages alike. No internal
  revisions task is built in the first place, for a separate reason in
  `PendingRevisionsNotificationManager` (pkp-e2e
  [#555](https://github.com/jardakotesovec/pkp-e2e/issues/555),
  "After "Request Revisions" on Internal Review, a press author gets no
  task in the Tasks panel"). The two meet there: with only that fix,
  deleting the only internal revised file would still leave no task
  (code).

## Proposed fix

Recompute the tasks and notices after the file and its round link are
gone, and treat both revision stages alike, as `add()` does. Proposed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deleted-revision-no-task-back/fix.diff)),
in `PKP\submissionFile\Repository::delete()`:

- move the "Update tasks" `switch` below the DAO delete, the file
  clean-up and the round's status update;
- add `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION` beside
  `SUBMISSION_FILE_REVIEW_REVISION` in that `switch`, in the round
  lookup before the delete and in the status update after it.

Tried on `main`, OJS and OMP: after the steps the author's panel reads
"Tasks 1" and lists "Revisions to consider in Review." (OMP: "…in
External Review.") with the submission's title. With two revised files
uploaded, deleting one leaves the round at "Revisions have been
submitted and a decision is needed." and the Tasks panel at "No Items",
with the fix in and out. On a journal's Copyediting stage ("Accept
Submission" on OJS submission 10, one file uploaded to "Copyedited
Files" and deleted again), the editors' notice "Assign a copyeditor
using the Assign link in the Participants list." comes back with the
fix and stays away without it.

What the fix touches:

- The task that comes back is the pending-revisions task, so a journal
  author reads "Revisions to consider in Review." where the decision's
  own task read "Revision required.".
- Deleting a whole submission deletes its files one by one through this
  method first; a task built on the way is removed by the submission's
  own clean-up at the end of `Submission\DAO::deleteById()`
  (`Notification::withAssoc(…)->delete()`) (code).
- No API or hook change: `SubmissionFile::delete::before` still runs
  first and `SubmissionFile::delete` last.
- Two limits of the task code stay as they are, out of scope here
  (code): `PendingRevisionsNotificationManager::updateNotification()`
  acts only on `current($userIds)`, so on a submission with several
  author accounts only the first gets the task back; and
  `Notification\Repository::build()` looks for an existing
  notification by user, level and submission but not by type, so an
  author who already holds another task-level notification on the
  submission gets no revisions task.

**Alternatives**

- Exclude the file being deleted inside
  `revisionsUploadedSinceDecision()`: it needs a new parameter on a
  shared repository method for one caller, and leaves the copyediting
  case as it is.
- Remove the round link early, as 3.3 did: it splits the DAO's delete
  in two again, which `pkp/pkp-lib#8685` had just gathered in one place.
- Covering the upload window's "Cancel" as well would mean running the
  same recomputation in `cancelFileUpload()` when a first upload is
  removed (or routing that removal through `Repository::delete()`); it
  waits on the answer to spec U26 A11.

**What goes with it**

- No data repair: an author or editor already in this state gets the
  task or notice back with the next file change.
- Backport: the diff applies as written to `stable-3_5_0` (35 lines up).
  `stable-3_4_0` has the same order but other context lines
  (`NoteDAO`, `StageAssignmentDAO`, `Services::get('file')`), so the
  same move is made by hand there.
- Guards, one per symptom: an e2e step in the review-round scenario
  that deletes the only revised file and reads the author's Tasks panel
  (a Planned item in spec U26), and one in the copyediting scenario
  that deletes the last copyedited file and reads the editors' notice
  (a Planned item in spec U32).

Small: one block moved within one method and one case added, with two
test steps.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deleted-revision-no-task-back/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps on OJS and OMP
  (`MODE=walk`, the default); `MODE=nb` is the two-files check and
  `MODE=ce` the Copyediting steps (OJS and OMP). Run on an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/deleted-revision-no-task-back/walk.js`
  (`MODE=ce` in front for the Copyediting steps,
  `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` for 3.5).
- The walk opens each workflow by its address
  (`dashboard/mySubmissions?workflowSubmissionId=<id>`, the editor's
  `dashboard/editorial?…&workflowMenuKey=workflow_4` for Copyediting),
  not through the row's buttons.
- Copyediting walked from the "Assign a copyeditor…" state only; spec
  U32's own check (2026-09-18, note f-a7) saw the "Awaiting Copyedits."
  state lose its notice the same way, on OJS and OMP.
- Walked on `main`: OJS ff004d0973 (lib/pkp 987776cd04, ui-library
  64d67363), OMP 3b0ecf794 (lib/pkp 3dc90c81a6, ui-library 280f98c5).
  Walked on `stable-3_5_0`: OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246 (lib/pkp cf3f984335), ui-library d4e01883; the same screens
  and the same Observed, both groups of steps. Dataset: pkp/datasets 566bb1f (2026-10-03),
  PostgreSQL. No request failed and no page script failed in any walk.
- Stored records: before the upload `lkumiega` holds one task of type
  `0x1000010` (`NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS`) on
  submission 13 and `mpower` one of type `0x1000016`
  (`NOTIFICATION_TYPE_PENDING_EXTERNAL_REVISIONS`) on submission 16;
  after the upload and after the delete, none. With the fix, after the
  delete each holds one of type `0x1000016`.
- Fix trial on `main`, the diff applied to OJS and OMP (the file is the
  same in both checkouts' lib/pkp), each check run with the fix in and
  out; the Copyediting steps were tried on OJS only. OPS has no review
  rounds or Copyediting stage and was not walked.
- Code reads. 3.5: `delete()` and both delegates as on `main`; `patch
  --dry-run` of the diff succeeds.
- Code reads. 3.4 (pkp-lib `stable-3_4_0` 767353f4fe, OJS d68934d0d1,
  OMP 0aec65441): `Repository::delete()` lines 430 to 464 (tasks, the
  copyediting case at 452) and 476 (DAO delete), and
  `revisionsUploadedSinceDecision()`; a68a22461a is on the branch.
- Code reads. 3.3 (pkp-lib `stable-3_3_0` ac3fa73402, OJS ac77c9fb35,
  OMP 8e72fc883): `PKPSubmissionFileService::delete()` lines 525 to 572
  and `EditDecisionDAO::responseExists()`; `git blame` on its
  copyediting case (lines 557 to 565) names 5f383f87c3
  (`pkp/pkp-lib#6057`, "Refactor submission files"); 3.2 was not read.
- Code reads, where the copyediting notice shows:
  `PKPEditingProductionStatusNotificationManager::_createNotification()`
  calls `createNotification()` with its default
  `NOTIFICATION_LEVEL_NORMAL`; the header's Tasks panel
  (`TaskNotificationsGridHandler`) lists `NOTIFICATION_LEVEL_TASK`
  only; the one screen that fetches the two types is ui-library's
  `WorkflowNotificationDisplay.vue`, for the open submission's
  Copyediting page.
- Introduced: `git blame` on the task-update lines names a68a22461a;
  its parent's `Repository::delete()` held only the DAO delete. The PR
  (`pkp/pkp-lib#8685`) is linked to `pkp/pkp-lib#8670` ("File
  attachments have no name when drafted in decision emails").
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library;
  issues and PRs, open and closed): by "revision file deleted task
  notification", "delete revision file notification author", "Revision
  required" deleted, "copyedited file deleted notification", and by
  `PendingRevisionsNotificationManager`,
  `revisionsUploadedSinceDecision` and "submission file delete
  updateNotification". `pkp/pkp-lib#1682` (tasks created when requesting
  revisions, 2016) is closed and about another fault.
- Not driven on screen: the editor-side deletion (the same request and
  method; the spec's own check saw it on both apps), the REST API's
  delete, a press's Internal Review, the fix on a press's Copyediting
  and the backport (code only).
