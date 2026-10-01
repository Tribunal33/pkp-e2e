# A preprint author's "Cancel" on their own draft closes the dialog and leaves the draft in place

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** issue `pkp/pkp-lib#10874`, OPS PR `pkp/ops#858` · [012e900283](https://github.com/pkp/ops/commit/012e9002836356a50769792eb1368b36e98aacaf) · 2025-02-11 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#13410` (open, no fix PR found)
- **Tracked in** spec U21 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, an author who presses "Cancel" in the submission
wizard and confirms "Cancel submission" sees the dialog close and
nothing else. The draft is not deleted, the wizard stays open, and no
message says why. Deleting the draft from My Submissions with "Delete
Incomplete Submissions" fails the same silent way.

The author cannot remove their own draft. Only a server manager can
delete it for them.

## Impact

- **Lost**: no work. The author's deletion is refused without a word,
  and the draft stays in their list.
- **Who**: every author on every preprint server, each time they try to
  abandon a draft. Holding the Moderator role as well does not help;
  only the Server Manager and Site Administrator roles pass.
- **Way round**: a server manager. The draft is not in the manager's
  default "Assigned to me" view, but a search of the editorial
  dashboard for its title finds it, and "Delete Incomplete Submissions"
  there deletes it. A moderator cannot delete it.

Medium: the task fails for every author and the refusal is silent, so
the author is left guessing whether the draft is gone. There is a way
round on screen, but only through a manager the author has to know to
ask. It would be high if a leftover draft got in the author's way, for
example by counting against a submission limit.

## Steps to reproduce

Preconditions:

- The default dataset, OPS `main`. Nothing else: `ccorino` is an author
  on "Public Knowledge Preprint Server".

Cancelling from the wizard:

1. Sign in as `ccorino`.
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u21ir30 cancel", choose the language "English", tick
   the requirement boxes and press "Begin Submission". [3.5: the wizard
   opens on "Details" rather than "Upload Files"; the steps are the
   same.]
3. In the wizard's footer press "Cancel".
4. The "Cancel submission" dialog reads "Are you sure you wish to cancel
   this submission? This will delete the submission and all associated
   data. This action cannot be undone."; press "OK".

**Expected**: the "Submission cancelled" page ("Submission has been
cancelled, and all associated data has been deleted.") opens, and the
draft is gone from My Submissions.

**Observed**: the dialog closes. The wizard stays on "Make a
Submission: Upload Files" and no message appears. My Submissions still
lists "u21ir30 cancel". The delete was refused:

```
POST /index.php/publicknowledge/api/v1/_submissions?ids=20
X-Http-Method-Override: DELETE
403 {"error":"You do not have permission to delete this submission."}
```

Deleting from My Submissions:

5. As `ccorino`, begin a second submission titled "u21ir30 neighbour",
   as in step 2.
6. Open My Submissions
   (`/index.php/publicknowledge/en/dashboard/mySubmissions`).
7. Press "More Actions", then "Delete Incomplete Submissions". Tick the
   box on the "u21ir30 neighbour" row and press "Delete Incomplete
   Submissions". In "Confirm Delete of Incomplete Submissions" press
   "Confirm".

**Expected**: the "u21ir30 neighbour" row leaves the list.

**Observed**: the dialog closes and the list reloads with the row still
in it, and no message appears. The request
(`/index.php/publicknowledge/api/v1/_submissions?ids[]=<id>`, a DELETE)
gets the same 403 and the same error.

Control: steps 1–4 and 5–7 on the default datasets of OJS (`ccorino`)
and OMP (`aclark`) delete the draft.

## Cause

Both screens send the same request, `DELETE _submissions?ids=…`, to
`PKPBackendSubmissionsController::bulkDeleteIncompleteSubmissions()`
(`lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController.php`).
The wizard builds that address in
`PKPSubmissionHandler::getSubmissionCancelUrl()`. For each submission
the method calls `Repo::submission()->canCurrentUserDelete()` (line 496)
and answers 403 when it is false.

`PKP\submission\Repository::canCurrentUserDelete()`
(`lib/pkp/classes/submission/Repository.php`, line 538) lets a user who
is not a manager or site administrator delete an incomplete submission
only through an author assignment whose user group is linked to the
Submission stage:

```php
StageAssignment::withSubmissionIds([$submission->getId()])
    ->withRoleIds([Role::ROLE_ID_AUTHOR])
    ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
    ->withUserId($currentUser->getId())
```

`withStageIds()` filters on the group's stages in `user_group_stage`.
Since `pkp/pkp-lib#10874`, OPS links no group to the Submission stage,
because OPS has only one stage (`Application::getApplicationStages()`
returns `[WORKFLOW_STAGE_ID_PRODUCTION]`). OPS commit 012e900283 changed
the Author group in `registry/userGroups.xml` from `stages="1,5"` to
`stages="5"` (now `"5,6"`). The upgrade migration
`I10874_UserGroupStagesRemoveSubmission` removes the same rows from
upgraded installs. So on OPS the author branch of the check can never
pass.

The pkp-lib side of that issue (`pkp/pkp-lib#10883`, ecf81ba72f) moved
two other Submission-stage filters to the application's first stage,
`PKPSubmissionHandler::getWorkflowUrl()` and `PKPSectionForm::fetch()`,
but not this one.

The wizard still offers "Cancel", because
`PKPSubmissionHandler::showWizard()` sets `canCancelSubmission` for any
author-group assignment on the submission, whatever its stage. The
wizard's error handler (`SubmissionWizardPage.vue`, `cancelSubmission()`)
closes the dialog and puts the response into `this.errors`, whose
watcher maps only form-field names, so `{error: …}` shows nowhere. My
Submissions reloads its list without reading the response.

Reach:

- Both delete paths go through the one endpoint and the one check
  (walked).
- The single-submission route `DELETE _submissions/{submissionId}`
  (`delete()`, line 428) calls the same check; no screen named here
  uses it (code).
- Other Submission-stage filters on user groups that OPS can no longer
  satisfy, not driven: `SubEditorsDAO::assignEditors()` (line 254, the
  "editor assigned" email to the editors assigned to a new submission)
  and `LibraryFileHandler` (line 99, `assignedTo($submissionId,
  WORKFLOW_STAGE_ID_SUBMISSION)`). `StartSubmission::addUserGroups()`,
  `CategoryForm` and OPS's own `SubmissionHandler::getSubmitUserGroups()`
  already handle OPS (code).

## Proposed fix

Proposed: in `canCurrentUserDelete()`, filter on the application's first
stage, as `pkp/pkp-lib#10874` did in `getWorkflowUrl()` and
`PKPSectionForm`:

```diff
         // Only allow admins and journal managers to delete submissions, except
         // for authors who can delete their own incomplete submissions
+        $stages = Application::getApplicationStages();
         return ($currentUser->hasRole([Role::ROLE_ID_MANAGER], $contextId) || $currentUser->hasRole([Role::ROLE_ID_SITE_ADMIN], Application::SITE_CONTEXT_ID))
             || (
                 $submission->getData('submissionProgress') &&
                 StageAssignment::withSubmissionIds([$submission->getId()])
                     ->withRoleIds([Role::ROLE_ID_AUTHOR])
-                    ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
+                    ->withStageIds([
+                        // WORKFLOW_STAGE_ID_SUBMISSION for OJS/OMP and WORKFLOW_STAGE_ID_PRODUCTION for OPS, see pkp/pkp-lib#10874
+                        array_shift($stages)
+                    ])
```

([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-cancel-draft-does-nothing/fix.diff),
one diff for all three apps.) On OJS and OMP the first stage is the
Submission stage, so nothing changes there. The `submissionProgress`
condition still limits authors to their drafts.

Tried on `main`: with the fix, steps 1–4 and 5–7 delete the draft on
OJS, OMP and OPS. The author's own submitted submission offers no box
in "Delete Incomplete Submissions" and stays listed, with the fix and
without it.

**Alternatives**:

- The submission's current stage, the workaround suggested on
  `pkp/pkp-lib#13410`: it works, since a draft sits on the first stage,
  but it ties a permission to a value that moves and departs from the
  pattern `pkp/pkp-lib#10874` set.
- Drop the stage filter and keep the role filter: also works, but on a
  journal or press it would let through an author whose group a manager
  has removed from the Submission stage.
- Hide "Cancel" from OPS authors: the screen would agree with the
  server, but authors would lose the deletion the method's own comment
  grants them.
- Put the Submission stage back on OPS's groups: undoes
  `pkp/pkp-lib#10874`, which removed a stage OPS does not have.

**What goes with it**:

- No stored data is wrong; the check runs on each request.
- Backport: the diff applies as written to `stable-3_5_0`, which has
  both the registry change and the same check.
- `SubEditorsDAO::assignEditors()`: a separate issue. It is the same
  one-line pattern, but it changes who is emailed, and that needs its
  own walk on a server with moderators assigned to a section.
- The silent error handler: a separate ui-library change. It would
  show any refused cancel on every app, and is not needed for this fix.
- Guard: an end-to-end check that an OPS author can cancel their own
  draft from the wizard, or a unit test of `canCurrentUserDelete()`
  on OPS.

Small: one method in pkp-lib, following the pattern of its sibling
callers.

## Evidence

- Script that takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-cancel-draft-does-nothing/walk.js),
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-cancel-draft-does-nothing/lib.js),
  run on installs loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/author-cancel-draft-does-nothing/walk.js`.
  Steps 5–7 and the submitted-submission check are
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-cancel-draft-does-nothing/neighbour.js),
  run with the fix applied and without it. The manager's way round is
  [wayround.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-cancel-draft-does-nothing/wayround.js)
  (OPS `main`). walk.js also has `rvaca` cancel the surviving draft from
  its wizard, which works.
- Tips walked: `main`: OJS 4408b94def (pkp-lib f5bd392a69, ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c5). `stable-3_5_0`: OJS 18d097d94e, OMP b24879c3d,
  OPS 3f0919468c (pkp-lib 1fb843f491, ui-library 7a3c244b). pkp/datasets
  27f1204 (2026-10-01). PostgreSQL; the fault does not depend on the
  database.
- 3.5 (walked with walk.js): OPS `registry/userGroups.xml` gives the
  Author group `stages="5"`, and pkp-lib's `canCurrentUserDelete()` has
  the same filter at line 504.
- 3.4 (code): OPS `upstream/stable-3_4_0` acd8ae704b gives the Author
  group `stages="1,5"`, so pkp-lib `origin/stable-3_4_0` df13621c2d's
  check (`getBySubmissionAndRoleIds(…, [Role::ROLE_ID_AUTHOR],
  WORKFLOW_STAGE_ID_SUBMISSION, …)`) passes for authors. Its wizard has
  no "Cancel", and ui-library ee684b34 has no bulk delete.
- 3.3 (code): OPS `upstream/stable-3_3_0` c5532e2161 gives the Author
  group `stages="1,5"`; pkp-lib `origin/stable-3_3_0` d446601ebe's
  `PKPSubmissionService::canCurrentUserDelete()` makes the same
  Submission-stage check, which passes.
- Introduced: `git blame` on line 538 gives 3ff0147d23d (2024-04-02),
  which ported the 3.4 check to `StageAssignment`. It was correct then,
  because OPS's Author group was still linked to stage 1. 012e900283
  (`pkp/ops#858`) removed that link, and 1228378516 in the same PR added
  the upgrade migration.
- Moderators (code): `canCurrentUserDelete()` passes only the Manager
  and Site Administrator roles outside the author branch;
  `showWizard()` offers "Cancel" to neither a moderator nor any other
  editorial role; the editorial dashboard offers "Delete Incomplete
  Submissions" to managers and administrators only
  (`useDashboardBulkDelete.js`).
- Upstream: `pkp/pkp-lib#13410` (opened 2026-09-29 from a forum report)
  describes the same fault and cause on OPS 3.5 and `main`. Searches of
  pkp/pkp-lib, pkp/ops and pkp/ui-library on 2026-10-01 found no PR for
  it.
- Not driven: the `SubEditorsDAO` and `LibraryFileHandler` filters (code
  only); an install upgraded from 3.4 (the migration was read, not run);
  whether the draft shows in the manager's "All Active" view (the search
  was used).
- Unverified: whether moderators on a preprint server miss the "editor
  assigned" email because of the `SubEditorsDAO` filter.
