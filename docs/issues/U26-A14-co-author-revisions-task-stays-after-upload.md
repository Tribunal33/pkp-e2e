# With two authors on a submission, a revised file clears only one author's "Revision required." task

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** not traced; present since at least [886f4103e8](https://github.com/pkp/pkp-lib/commit/886f4103e82353fe42a914735c6a20f09e5bc0d9) (2013-04-22)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U26 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a14)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When two authors with accounts are assigned to a submission and the
editor records "Request Revisions" without a new review round, each
author gets "Revision required." in their Tasks panel. Once either
author uploads a revised file, only one of the two tasks goes. The
other author keeps "Revision required.", while their My Submissions row
already reads "Review update" and the round reads "Revisions have been
submitted and a decision is needed.".

## Impact

- **Lost**: nothing. One author's to-do list keeps a request that has
  been answered. The task sends no email.
- **Who**: the authors after the first, when an editor has assigned more
  than one author account to a submission in "Participants", on a
  journal's review or a press's External Review. Which author keeps the
  task depends on the order the database returns their assignments, not
  on who uploaded. A preprint server has no review stage.
- **Way round**: the author can delete the task from the panel, and the
  editor's next decision that maps to a notification type ("Create New
  Review Round", "Accept Submission", "Decline Submission", another
  revisions request) removes it.

Low: nothing is lost, and the author's own round status shows the
revisions are in. It would be medium if co-authors were seen uploading
again because of it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`),
  on PostgreSQL. Submission 7, "Developing efficacy beliefs in the
  classroom", is on "Review (Round 1)"; its author is `dsokoloff`.
  `ccorino` (Carlo Corino) is another author account of the journal,
  assigned to submission 7 in step 2. Any review-stage submission
  serves: "Request Revisions" is offered whatever the reviews' state.

1. Sign in as `dbarnes` and open submission 7
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=7`).
2. In "Participants" press "Assign", choose "Author", type "Corino" in
   "Search User By Name", press "Search", choose Carlo Corino and press
   "OK".
3. Press "Request Revisions", leave "Revisions will not be subject to a
   new round of peer reviews." chosen, press "Next", "Continue" through
   the steps, then "Record Decision".
4. Sign in as `dsokoloff` and press "Tasks" in the page header: it
   lists "Revision required." with the submission's title.
5. Sign in as `ccorino` and press "Tasks": the same.
6. Sign in as `dsokoloff` and open submission 7
   (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=7`).
   Press "Upload revisions", choose "Article Text", attach a file
   (`h19v-revision.txt`), then "Continue", "Continue", "Complete". The
   round reads "Revisions have been submitted and a decision is
   needed.".
7. On "My Submissions" press "Tasks".
8. Sign in as `ccorino`; on "My Submissions" press "Tasks".

**Expected**: "No Items" for both authors: the revisions both tasks
asked for are in.

**Observed**: one of the two authors keeps the task. On PostgreSQL it is
`ccorino`: their panel lists "Revision required." with the submission's
title and the button reads "Tasks 1", while their row of submission 7
reads "Review update". `dsokoloff` reads "No Items". A database that
returns the two assignments in the other order leaves the task with
`dsokoloff` instead.

On a press (OMP `main`, submission 18, "Transformative Impact of AI
Tools on Modern Education: Opportunities, Challenges, and Future
Directions", author `zzedd`, second author `afinkel`, Alvin Finkel,
searched as "Finkel", component "Book Manuscript"), the same steps end
the same way: `zzedd` reads "No Items" and `afinkel` keeps "Revision
required.". On a press the two tasks read differently from step 4 on:
`zzedd`'s "Revisions to consider in External Review.", `afinkel`'s
"Revision required.".

Control, one author on the stage: on OJS submission 13 ("Hydrologic
Connectivity in the Edwards Aquifer between San Marcos Springs and
Barton Springs during 2009 Drought Conditions"), which already asks for
revisions, sign in as `lkumiega` and take steps 6 and 7 on submission
13: "No Items". On OMP, sign in as `dbarnes`, record "Request
Revisions" on submission 16 as in step 3, then take steps 6 and 7 as
`mpower` on submission 16: "No Items".

## Cause

`PendingRevisionsNotificationManager::updateNotification()`
(`lib/pkp/classes/notification/managerDelegate/PendingRevisionsNotificationManager.php`)
builds or removes the authors' revisions task. Its callers pass the
user ids of several authors, and the method acts on the first of them
only (line 103):

```php
$userId = current($userIds);
```

Everything after it, the build (lines 125 to 140) and both deletes
(lines 148 to 159), is for that one user. The callers and the authors
they pass:

- `PKP\submissionFile\Repository::add()` (a revised file added) and
  `PKP\decision\Repository::updateNotifications()` (a decision
  recorded): the authors assigned to the review stage
  (`StageAssignment::withSubmissionIds()->withRoleIds()->withStageIds()`).
- `PKP\submissionFile\Repository::delete()` (a revised file deleted) and
  `PKPManageFileApiHandler::saveMetadata()` (a file's details saved):
  every author account assigned to the submission, with no stage filter.

None of these queries sorts, so which author is first is up to the
database.

The decision's own tasks are filed and removed for every author:
`EditorDecisionNotificationManager::updateNotification()` loops over
`$userIds`, since `4eee4846d2` (2015, "Improve handling of
notifications for multiple author assignments") made it do so. The
pending-revisions delegate kept `current()`, which it has had since it
moved into pkp-lib in
[886f4103e8](https://github.com/pkp/pkp-lib/commit/886f4103e82353fe42a914735c6a20f09e5bc0d9).

A press's two wordings come from the same line. OMP runs the delegate
twice after a decision, for the internal and then the external task
type. Both passes ask for `Decision::PENDING_REVISIONS`, which on the
internal stage finds nothing, so the internal pass takes its removal
branch: it deletes the first author's "Revision required." task. The
external pass then finds that author without the decision's task and
files its own, "Revisions to consider in External Review.", for that
author only. The second author keeps "Revision required.".

Reach:

- A journal's review and a press's External Review, on screen in both
  apps.
- A press's Internal Review builds no revisions task at all, because
  of that `Decision::PENDING_REVISIONS` argument (pkp-e2e
  [#555](https://github.com/jardakotesovec/pkp-e2e/issues/555)); once
  that is fixed, this line limits the internal task to one author too.
- `PKPManageFileApiHandler::saveMetadata()` holds a clean-up that
  deletes the decision's task for every author once revisions are in,
  but it never runs: the handler authorizes no review round, so
  `getAuthorizedContextObject(ASSOC_TYPE_REVIEW_ROUND)` is null, and the
  upload window posts `reviewRoundId=null`.
- Deleting the only revised file: the task does not come back for any
  author, a separate fault in `Repository::delete()`, spec U26
  [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a9)
  (pkp-e2e [#862](https://github.com/jardakotesovec/pkp-e2e/issues/862)).

## Proposed fix

Act for every user the caller passes, as
`EditorDecisionNotificationManager` does: decide once whether the task
is due, then build or delete it for each author. Proposed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/co-author-revisions-task-stays-after-upload/fix.diff)),
in `PendingRevisionsNotificationManager::updateNotification()`:

- replace `$userId = current($userIds)` and its check with one filter,
  before the `empty()` guard, that keeps every valid id:
  `$userIds = array_filter((array) $userIds, fn ($userId) => is_int($userId) && $userId > 0);`
- wrap the build and the two deletes in `foreach ($userIds as $userId)`.

Tried on `main`, OJS and OMP: after the steps both authors' panels read
"No Items", and before the upload both hold a task. On a press the
internal pass now deletes every author's "Revision required." task and
the external pass files "Revisions to consider in External Review." for
each, so co-authors read the same wording. With one author on the stage
the task shows before the upload and goes with it, with the fix in and
out.

With the fix for the "Resubmit for review." task that stays after an
upload (spec U26
[A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a13),
[U26-A13-resubmit-task-stays-after-revisions-upload.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U26-A13-resubmit-task-stays-after-revisions-upload.md)),
the two touch the same method: A13 adds a block before the removal
branch that deletes the resubmit task once revisions are in, and with
this fix that block loops over `$userIds` as well. Both as one diff:
[fix-with-a13.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/co-author-revisions-task-stays-after-upload/fix-with-a13.diff).
Tried on OJS `main`: with two authors, both lose "Resubmit for review."
after an upload on a "Resubmit for Review" round (without it both keep
it) and both lose "Revision required." after the steps above.

**Alternatives**

- Make the `saveMetadata()` clean-up run: it covers the upload window
  only, not an upload through the REST API, a deleted file, or the
  press's different wordings before any upload.
- Call the delegate once per author from each caller: four callers to
  change for a rule the delegate owns.

**What goes with it**

- The dead clean-up in `saveMetadata()` can go in the same change, since
  the delegate then covers every author; left in, it stays harmless.
- With the fix, `delete()` and `saveMetadata()` reach authors assigned
  to the submission on another stage only, as their queries do today.
  An author group assigned to some stages only would then get the task
  built or removed through these two callers; aligning them with
  `add()`'s stage filter avoids that.
- No data repair: tasks already left behind go at the editor's next
  decision that maps to a notification type, as today.
- Backport: the diff applies to `stable-3_5_0` with `patch -l` (its
  blank lines carry spaces). In `stable-3_4_0` and 3.3 the method has
  the same `current($userIds)` but deletes and builds through
  `NotificationDAO` instead of the `Notification` model, so the loop is
  written there by hand.
- Guard: an e2e step that assigns a second author, requests revisions,
  uploads as one author and reads both authors' Tasks panels.

Small: one method, following the loop of the decision delegate beside
it.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/co-author-revisions-task-stays-after-upload/walk.js)
  (`MODE=nb` is the control, `MODE=resubmit` the same steps after
  "Resubmit for Review"):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/co-author-revisions-task-stays-after-upload/walk.js`.
- Stored rows: after the decision `dsokoloff` and `ccorino` each hold one
  `0x1000010` (`NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS`);
  after the upload `ccorino` keeps theirs. On OMP `zzedd` holds
  `0x1000016` (`NOTIFICATION_TYPE_PENDING_EXTERNAL_REVISIONS`) and
  `afinkel` `0x1000010`; after the upload `afinkel` keeps theirs. With
  the fix, both OMP authors hold `0x1000016` and nobody holds a row
  after the upload.
- Which author keeps the task: on the default dataset, both apps and
  both lines, the author added in Participants. The spec's own check
  (2026-10-07, a scratch journal and press) saw the other way round.
  MySQL not checked.
- Walked on `main` (2026-10-19): OJS 6b4323ced7, OMP 5777025be (both
  lib/pkp 042726ebf6, ui-library 99abe252). Walked on `stable-3_5_0`:
  OJS 007c2cd0d6, OMP 2d575f250 (both lib/pkp 092ec34b0f, ui-library
  2576e00a), with the same Observed, the press's two wordings included.
  Dataset: pkp/datasets eaf024c5 (2026-10-18), PostgreSQL. OPS was not
  walked (no review stage).
- Fix trials: `node bin/try-fix.js apply shared/playwright/checks/issues/co-author-revisions-task-stays-after-upload/fix.diff ojs omp`
  (the Steps and the control), and `fix-with-a13.diff` on OJS
  (`MODE=resubmit` and the Steps), each followed by `revert`.
- Code reads. 3.5: the method differs from `main` in whitespace and a
  class alias only. 3.4 (pkp-lib `stable-3_4_0` a71d6bd2ca, OJS
  0012bd1022, OMP e30fa7e38): `current($userIds)` at line 99; the
  callers in `submissionFile\Repository` pass every author (lines 307 to
  319 and 434 to 446). 3.3 (pkp-lib `stable-3_3_0` 5e84acd11b, OJS
  d7d9dd14ec, OMP 8e72fc883): `PendingRevisionsNotificationManager.inc.php`
  with `current($userIds)`; 886f4103e8 and 4eee4846d2 are on both
  branches.
- Introduced: `git log -S 'current($userIds)'` reaches 886f4103e8, which
  moved the class from the apps into pkp-lib with the line; the apps'
  earlier history was not read.
- Upstream search: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library, by
  the symptom's words and by `PendingRevisionsNotificationManager`.
  Read and found to be about other things: `pkp/pkp-lib#1682`,
  `pkp/pkp-lib#10466`, `pkp/pkp-lib#4976`.
- Not driven: a second upload, deleting every revised file and a later
  upload (the spec's check, 2026-10-07, saw the task stay through
  them); the decisions that remove the task.
