# After "Resubmit for Review", the author's "Resubmit for review." task stays once they upload their revisions

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code; a press's Internal Review too)
- **Introduced** `pkp/pkp-lib#3399` for `pkp/pkp-lib#2618` · [5d980888a6](https://github.com/pkp/pkp-lib/commit/5d980888a69def70c0569a482cfcb3b2a87300cf) · 2018-01-22 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U26 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a13)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an editor requests revisions that will go to a new review round
("Resubmit for Review"), the author's Tasks panel gets the task
"Resubmit for review.". After the author uploads a revised file, the
task is still there, although the round already reads "Revisions
submitted. A new review round needs to be created." and their My
Submissions row reads "Review update". When revisions are requested
without a new round, the task goes with the first upload.

The task stays until the editor records a decision such as "Create New
Review Round"; a recommendation or "Cancel Review Round" leaves it. It
sends no email. An author who takes it at its word and uploads again
adds a second file to the round.

## Impact

- **Lost**: nothing. The author's to-do list keeps a request they have
  answered.
- **Who**: authors on a journal's review or a press's External Review
  whose editor chose "Revisions will be subject to a new round of peer
  reviews.". A preprint server has no review stage.
- **Way round**: the author can delete the task from the panel. A second
  upload goes through the "Upload" button above "Revisions Uploaded" and
  adds a second file next to the first; the editors get no second
  "Revised Version Uploaded" message the same day unless they have
  signed in since the first.

Low: nothing is lost and the round's status shows the revisions are in.
It would be medium if a second upload confused the editor about which
file counts, which the screens do not show.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  Submission 10, "Condensing Water Availability Models to Focus on
  Specific Water Management Systems", is on "Review (Round 1)" with its
  reviews in; its author is `jnovak`.

1. Sign in as `dbarnes` and open submission 10
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=10`).
2. Press "Request Revisions", choose "Revisions will be subject to a new
   round of peer reviews.", press "Next", "Continue" through the steps,
   then "Record Decision".
3. Sign in as `jnovak`. On "My Submissions" press "Tasks" in the page
   header. It lists "Resubmit for review." with the submission's title,
   and the button reads "Tasks 1".
4. Open submission 10
   (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=10`).
   The round reads "Revisions requested from the author to be taken to
   a new review round.". Press "Upload revisions", choose "Article
   Text", attach a file (`h19v-revision.txt`), then "Continue",
   "Continue", "Complete". The round reads "Revisions submitted. A new
   review round needs to be created." and the file is listed under
   "Revisions Uploaded".
5. Back on "My Submissions", press "Tasks".

**Expected**: "No Items": the revisions the task asked for are in, and
the next step is the editor's.

**Observed**: the panel still lists "Resubmit for review." with the
submission's title and the button reads "Tasks 1", while the row of
submission 10 on "My Submissions" reads "Review update".

A second upload (step 4 again, through "Upload" above "Revisions
Uploaded", with `h19v-second.txt`) lists both files under "Revisions
Uploaded", leaves the task in place, and sends `dbarnes` no second
"Revised Version Uploaded" message.

On a press (OMP `main`, submission 16, "A Designer's Log: Case Studies
in Instructional Design", author `mpower`, component "Book
Manuscript"), take the same steps. No editor is assigned to submission
16; `dbarnes` is a Press editor, whose role opens every submission, and
records the decision without being assigned. The task reads the same
before and after the upload.

Control, revisions requested without a new round: on OJS submission 13
("Hydrologic Connectivity in the Edwards Aquifer between San Marcos
Springs and Barton Springs during 2009 Drought Conditions"), which
already asks for them, take steps 3 to 5 as `lkumiega`: "Revision
required." before the upload, "No Items" after it. On OMP, on a freshly
loaded dataset, take steps 1 and 2 on submission 16 leaving "Revisions
will not be subject to a new round of peer reviews." chosen, then steps
3 to 5 as `mpower`: "Revisions to consider in External Review." before
the upload, "No Items" after it.

## Cause

The two ways of requesting revisions file different tasks. Without a
new round the decision is `Decision::PENDING_REVISIONS`, and
`EditorDecisionNotificationManager` gives each author a
`NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS` task ("Revision
required."). With a new round it is `Decision::RESUBMIT`, and the task
is `NOTIFICATION_TYPE_EDITOR_DECISION_RESUBMIT` ("Resubmit for
review."). Both are task-level
(`EditorDecisionNotificationManager::_getNotificationTaskLevel()`).

When a revised file is added, `PKP\submissionFile\Repository::add()`
updates the authors' revision tasks through
`PendingRevisionsNotificationManager::updateNotification()`
(`lib/pkp/classes/notification/managerDelegate/PendingRevisionsNotificationManager.php`).
That method knows only the first kind of request. It asks
`getActivePendingRevisionsDecision()` for `Decision::PENDING_REVISIONS`
(line 117), and once revisions have come in it deletes its own type and
`NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS` (lines 148 to
159). Nothing deletes `NOTIFICATION_TYPE_EDITOR_DECISION_RESUBMIT` on an
upload.

The task goes only through `EditorDecisionNotificationManager::updateNotification()`,
which deletes every editor-decision notification of the stage's authors.
It runs only for a decision that
`getNotificationTypeByEditorDecision()` maps to a notification type
(`PKP\decision\Repository::updateNotifications()`, line 448): "Create
New Review Round", "Accept Submission", "Decline Submission", another
revisions request. Recommendations and "Cancel Review Round" map to
none, so after them the task stays.

The resubmit notice became a task in
[5d980888a6](https://github.com/pkp/pkp-lib/commit/5d980888a69def70c0569a482cfcb3b2a87300cf)
(merged in `pkp/pkp-lib#3399`, "revision upload notifications"), which
added `NOTIFICATION_TYPE_EDITOR_DECISION_RESUBMIT` to
`_getNotificationTaskLevel()` beside the pending-revisions type. The
code that clears the pending-revisions task on an upload was not
extended to it.

Reach:

- A journal's review and a press's External Review, on screen in both
  apps.
- A press's Internal Review on `main`, 3.5 and 3.4 has no resubmit task
  to leave behind: `Decision::RESUBMIT_INTERNAL` maps to no notification
  type in OMP's `NotificationManager::getNotificationTypeByEditorDecision()`.
  On 3.3 it has one: OMP's `EditorDecisionHandler::_getNotificationTypeByEditorDecision()`
  (lines 155 and 156) maps `SUBMISSION_EDITOR_DECISION_RESUBMIT`, which
  the internal review also records, to the same task (read in the code).
- The stale task sends nothing. The decision files it through
  `createNotification()`, which sends no email, and no scheduled task
  reminds authors of open tasks (`EditorialReminders` mails editors).
- `PKPManageFileApiHandler::saveMetadata()` holds a second clean-up that
  deletes `NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS` for every
  author once revisions are in. It names that type only, and it never
  runs: the handler authorizes no review round, so
  `getAuthorizedContextObject(ASSOC_TYPE_REVIEW_ROUND)` is null, and the
  upload window posts `reviewRoundId=null`.
- Deleting the only revised file does not bring the task back, with or
  without the fix below; that is the delete path's own fault, spec U26
  [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a9)
  (pkp-e2e [#862](https://github.com/jardakotesovec/pkp-e2e/issues/862)).

## Proposed fix

Treat the resubmit task as done once a revised file has come in since
the "Resubmit for Review" decision, in the same delegate that already
does this for the pending-revisions task. Proposed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resubmit-task-stays-after-revisions-upload/fix.diff)),
in `PendingRevisionsNotificationManager::updateNotification()`:

```diff
+        // "Resubmit for Review" files its own task (EditorDecisionNotificationManager). It is
+        // done, as the pending revisions task is, once a revised file has come in since the decision.
+        $resubmitDecision = Repo::decision()->getActivePendingRevisionsDecision($submissionId, $expectedStageId, Decision::RESUBMIT);
+        if ($resubmitDecision && Repo::decision()->revisionsUploadedSinceDecision($resubmitDecision, $submissionId)) {
+            Notification::withAssoc(Application::ASSOC_TYPE_SUBMISSION, $submissionId)
+                ->withUserId($userId)
+                ->withType(Notification::NOTIFICATION_TYPE_EDITOR_DECISION_RESUBMIT)
+                ->withContextId($request->getContext()->getId())
+                ->delete();
+        }
+
         if ($removeNotifications) {
```

`getActivePendingRevisionsDecision()` already accepts
`Decision::RESUBMIT` for External Review and answers null for it on
Internal Review, and `revisionsUploadedSinceDecision()` is the check the
pending-revisions branch uses, so the resubmit task follows the same
rule.

The delegate also runs while a decision is recorded, right after the
resubmit task is filed. That is safe: no revised file is newer than the
decision yet, so the new block deletes nothing.

Tried on `main`, OJS and OMP: after the steps the author's panel reads
"No Items", and "Resubmit for review." is still listed between the
decision and the upload. The control shows the task before the upload
and "No Items" after it, with the fix in and out.

What the fix touches:

- It acts for the first author on the stage only, like the rest of the
  method. With several authors the others keep their resubmit task:
  spec U26
  [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a14)
  ([U26-A14-co-author-revisions-task-stays-after-upload.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U26-A14-co-author-revisions-task-stays-after-upload.md)),
  whose report gives the two fixes as one diff.
- A recommendation recorded after the "Resubmit for Review" decision and
  before the upload ends the decision's lookup
  (`getActivePendingRevisionsDecision()` stops at any newer decision),
  so the upload then leaves the task, as today (read in the code).

**Alternatives**

- Delete the resubmit task in `Repository::add()` after the delegate
  runs: it puts decision rules in the file repository, and misses the
  delegate's other callers (the metadata save, the delete path).
- Make the `saveMetadata()` clean-up run and name both types: it covers
  the upload window only, not an upload through the REST API.

**What goes with it**

- No data repair: tasks already left behind go at the editor's next
  decision that maps to a notification type, as today; after a
  recommendation or "Cancel Review Round" the author deletes them.
- Backport: the diff applies as written to `stable-3_5_0`. In
  `stable-3_4_0` the delegate deletes through `NotificationDAO::deleteByAssoc()`
  instead of the `Notification` model, so the same block is written with
  that call. In 3.3 `EditDecisionDAO::findValidPendingRevisionsDecision()`
  accepts `SUBMISSION_EDITOR_DECISION_RESUBMIT` on either stage, so the
  same block also clears a press's internal-review task.
- Guard: an e2e step that reads the author's Tasks panel after an
  upload on a "Resubmit for Review" round.

Small: a few lines in one method, following the branch beside it.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resubmit-task-stays-after-revisions-upload/walk.js)
  (`MODE=second` adds the second upload, `MODE=nb` is the control):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/resubmit-task-stays-after-revisions-upload/walk.js`.
  Stored rows: `jnovak` holds one `0x1000011`
  (`NOTIFICATION_TYPE_EDITOR_DECISION_RESUBMIT`, task level) before and
  after each upload; with the fix, none after.
- Walked on `main` (2026-10-19): OJS 6b4323ced7, OMP 5777025be (both
  lib/pkp 042726ebf6, ui-library 99abe252). Walked on `stable-3_5_0`:
  OJS 007c2cd0d6, OMP 2d575f250 (both lib/pkp 092ec34b0f, ui-library
  2576e00a), with the same Observed. Dataset: pkp/datasets eaf024c5
  (2026-10-18), PostgreSQL. The second upload was walked on OJS `main`
  only. OPS was not walked (no review stage).
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/resubmit-task-stays-after-revisions-upload/fix.diff ojs omp`,
  then the Steps and the control, then `revert`.
- Code reads. 3.5: `PendingRevisionsNotificationManager` differs from
  `main` in whitespace and a class alias only; `patch --dry-run` of the
  diff succeeds. 3.4 (pkp-lib `stable-3_4_0` a71d6bd2ca, OJS 0012bd1022,
  OMP e30fa7e38): the delegate asks for `Decision::PENDING_REVISIONS`
  (line 107) and deletes the pending-revisions types only; the resubmit
  type is task-level in `EditorDecisionNotificationManager` (line 176).
  3.3 (pkp-lib `stable-3_3_0` 5e84acd11b, OJS d7d9dd14ec, OMP 8e72fc883):
  `PendingRevisionsNotificationManager.inc.php` the same, with
  `EditDecisionDAO::findValidPendingRevisionsDecision()`; OMP's
  `EditorDecisionHandler.inc.php` lines 155 and 156; 5d980888a6 is on
  both branches.
- Introduced: `git log -L` on `_getNotificationTaskLevel()`; the commit
  (author simon, forgive38) came into pkp-lib through
  `pkp/pkp-lib#3399`, which also lists `pkp/pkp-lib#3278` and
  `pkp/pkp-lib#3326`.
- Upstream search: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library, by
  the symptom's words and by `PendingRevisionsNotificationManager` and
  `NOTIFICATION_TYPE_EDITOR_DECISION_RESUBMIT`. Read and found to be
  about other things: `pkp/pkp-lib#1682`, `pkp/pkp-lib#10622`,
  `pkp/pkp-lib#4976`, `pkp/pkp-lib#2665`.
- Not driven: the decisions that remove or keep the stale task, a
  recommendation recorded between the decision and the upload, the REST
  API upload. MySQL not checked; no query in the path depends on the
  database.
