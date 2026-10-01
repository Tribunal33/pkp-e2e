# On a preprint server, authors cannot cancel their own draft: Cancel does nothing, Delete is refused

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ops#858` for `pkp/pkp-lib#10874` · [012e900283](https://github.com/pkp/ops/commit/012e9002836356a50769792eb1368b36e98aacaf) · 2025-02-03 (merged 2025-02-11) · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#13410` (open, no fix PR), covering the wizard's "Cancel"; the "My Submissions" deletion is not mentioned there
- **Tracked in** spec U21 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a preprint server the submission wizard offers the submitting author
the same "Cancel" control and "Cancel submission" dialog as everywhere
else, but confirming does nothing. The dialog closes, no message
appears, and the draft survives; the deletion is refused behind the
scenes. Deleting the draft from "My Submissions" with "Delete Incomplete
Submissions" is refused too, with the error "You do not have permission
to delete this submission."

On a journal or a press the author's own cancel works.

## Impact

- **Lost**: no data; the unwanted draft stays. The author finds out
  only later, when "My Submissions" still lists it with "Complete
  submission"; nothing tells them the cancel failed.
- **Who**: every author on every preprint server who abandons a draft.
  The draft bothers no one else much: no moderator is assigned to a
  draft, so no moderator sees it; it shows in the managers'
  "All Active" list beside submitted work (read in the code).
- **Way round**: none for the author. A manager or site administrator
  can delete the draft when asked.

Medium: a task fails for every author on every preprint server, but
nothing is lost and there is a way round. It would be high if the
stranded drafts got in the way of the server's editorial work.

## Steps to reproduce

Preconditions: PKP's default test dataset for OPS `main`. Nothing else.

Cancelling in the wizard:

1. Sign in as `ccorino` (an Author).
2. Open "New Submission" (`/index.php/publicknowledge/en/submission`).
3. Type the title "u21w36 Draft To Cancel", choose "English", tick every
   box, and press "Begin Submission".
4. The wizard opens on "Upload Files" (on 3.5, on "Details"). In its
   footer press "Cancel".
5. The dialog "Cancel submission" reads "Are you sure you wish to cancel
   this submission? This will delete the submission and all associated
   data. This action cannot be undone." Press "OK".

Deleting from My Submissions:

6. Open the dashboard's "My Submissions".
7. Open "More Actions" and choose "Delete Incomplete Submissions".
8. Tick "u21w36 Draft To Cancel" and press "Delete Incomplete
   Submissions".
9. The dialog "Confirm Delete of Incomplete Submissions" opens. Press
   "Confirm".

**Expected**: after step 5, the "Submission cancelled" screen ("Submission
has been cancelled, and all associated data has been deleted."), and the
draft is gone. After step 9 the draft leaves the list.

**Observed**: after step 5 the dialog closes and nothing else happens.
The wizard stays on "Upload Files", no message appears, and the draft
still exists. The request behind "OK" was refused:

```
POST /index.php/publicknowledge/api/v1/_submissions?ids=20   (X-Http-Method-Override: DELETE)
403 {"error":"You do not have permission to delete this submission."}
```

After step 9 an "Error" dialog reads "You do not have permission to
delete this submission." with "OK". The same request answered the same
403, and after a reload the draft is still listed.

Control: on OJS (`ccorino`, choosing the section "Articles" on the start
form) and OMP (`aclark`), step 5 ends on "Submission cancelled" and
deletes the draft, so steps 6–9 are taken on a second draft, "u21w36
Second Draft", started the same way; it leaves "My Submissions" after
"Confirm". On OPS, `rvaca` (a manager) signed in and opening the
author's draft at `/index.php/publicknowledge/en/submission?id=20`, then
"Cancel" and "OK", reaches "Submission cancelled".

## Cause

Both screens send the request to the backend submissions endpoint
(`PKPBackendSubmissionsController::bulkDeleteIncompleteSubmissions()`).
It asks `PKP\submission\Repository::canCurrentUserDelete()`, which lets
an author delete an incomplete submission only through an Author
assignment whose user group has the Submission stage:

```php
StageAssignment::withSubmissionIds([$submission->getId()])
    ->withRoleIds([Role::ROLE_ID_AUTHOR])
    ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
    ->withUserId($currentUser->getId())
```

A preprint server has no Submission stage. `pkp/pkp-lib#10874` removed it
from OPS's roles: `pkp/ops#858` changed the Author group in
`registry/userGroups.xml` from `stages="1,5"` to `stages="5"`, and its
upgrade migration `I10874_UserGroupStagesRemoveSubmission` removed stage
1 from existing installs' `user_group_stage`. In the default dataset the
Author group holds stages 5 and 6 on `main` and 5 on 3.5; stage 6 is
`WORKFLOW_STAGE_ID_DONE`, which `pkp/pkp-lib#13109` added to the roles
on `main` later (OPS 16bbd9b90e) and which does not matter here. No OPS
author can pass this check.

The companion pkp-lib change (`pkp/pkp-lib#10883`) updated two queries
of the same kind to use the application's first stage
(`PKPSubmissionHandler::getWorkflowUrl()`, `PKPSectionForm::fetch()`),
but not this one. The screens' own checks still offer the action:
`PKPSubmissionHandler::showWizard()` shows "Cancel" for an Author
assignment on any stage, and the dashboard's `useDashboardBulkDelete`
`canBeDeleted()` does the same.

The wizard says nothing because `SubmissionWizardPage.vue`'s
`cancelSubmission()` error handler puts the response
(`{"error": "…"}`) into the form's field errors, where no field shows
it. The "My Submissions" path shows the generic error dialog.

Reach:

- The same mistake in `SubEditorsDAO`, which stops Moderators being
  emailed on assignment, is reported separately
  ([U35 OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OPS3-ops-moderator-assigned-email-never-sent.md)).
- Other uses of the Submission stage in lib/pkp (`CategoryForm`,
  `CategoryCategoryController`, `StartSubmission`) leave OPS out on
  purpose, as their comments say.

## Proposed fix

A proposal; the team decides. Filter on the stage a new submission enters in this application, the
pattern `pkp/pkp-lib#10883` set for `getWorkflowUrl()`'s author check
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-cancel-draft-refused/fix.diff)):

```diff
+        $stages = Application::getApplicationStages();
+
         // Only allow admins and journal managers to delete submissions, except
         // for authors who can delete their own incomplete submissions
@@
                 StageAssignment::withSubmissionIds([$submission->getId()])
                     ->withRoleIds([Role::ROLE_ID_AUTHOR])
-                    ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
+                    ->withStageIds([
+                        // WORKFLOW_STAGE_ID_SUBMISSION for OJS/OMP and WORKFLOW_STAGE_ID_PRODUCTION for OPS, see pkp/pkp-lib#10874
+                        array_shift($stages)
+                    ])
                     ->withUserId($currentUser->getId())
```

On a journal or press the first
stage is still the Submission stage, so nothing changes there. On a
preprint server it is Production, which OPS's Author group has.

The fix was tried on `main` in the three apps. The OPS author's
"Cancel" reached "Submission cancelled", and a second draft left "My
Submissions" after "Confirm". OJS and OMP authors cancelled and deleted
as before. With and without the fix, a manager's cancel of an author's
draft worked in all three apps, and the wizard address of the author's
own submitted submission offered no "Cancel".

**Alternatives**:

- Drop the stage filter, as the wizard's and the dashboard's own checks
  do. That would also let author-role groups that a journal configured
  without the Submission stage delete drafts, a change beyond this fault.
- Give OPS's Author group the Submission stage again. That reverses
  `pkp/pkp-lib#10874`, whose point is that OPS has no such stage.
- Hide "Cancel" from OPS authors. That removes a feature
  (`pkp/pkp-lib#8350`) instead of fixing it.

**What goes with it**:

- Make the wizard show a refused cancel. `cancelSubmission()`'s
  `error()` handler should pass the response to the error dialog,
  `this.ajaxErrorCallback(r)`, for a response with an `error` key too;
  its one call today, `this.ajaxErrorCallback({})`, shows only a
  generic "unknown error". A refusal then shows its message as on "My
  Submissions". This is a separate small ui-library change, not needed
  for this fix, and not tried.
- Fix the same query in `SubEditorsDAO` in the same pkp-lib PR (U35
  OPS3, linked above).
- The diff applies unchanged to `stable-3_5_0`, which has the same code
  and the same roles.
- A guard: an OPS test in which an author cancels their own draft from
  the wizard and expects "Submission cancelled".

Small: one query in one shared pkp-lib method, following a pattern the
code base already uses, and a test; no data repair.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-cancel-draft-refused/walk.js)
  takes the Steps on OPS and the control on OJS and OMP. `NEIGHBOUR=1`
  takes the manager's cancel and the submitted submission's wizard
  address instead. Each run starts from a freshly loaded dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/author-cancel-draft-refused/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/author-cancel-draft-refused/fix.diff ojs omp ops`,
  then the script and its `NEIGHBOUR=1` run on `main`, then `revert`.
- Walked on `main` and `stable-3_5_0` (OJS, OMP, OPS), PostgreSQL, PKP's
  default test dataset at pkp/datasets 38ab955 (2026-09-30). Tips:
  `main` OPS c8af945bb7, OJS bade233f73, OMP 3b0ecf794, lib/pkp
  3dc90c81a6 (OJS 2e377d27fc), ui-library 280f98c5; `stable-3_5_0` OPS
  cf4fce69bd, OJS 92b9a16b48, OMP 3081c9b00, lib/pkp a9c76aed62,
  ui-library 1a7a4750.
- 3.4 (code): OPS `upstream/stable-3_4_0` acd8ae704b,
  `registry/userGroups.xml` gives the Author group `stages="1,5"`, and
  lib/pkp `origin/stable-3_4_0` df13621c2d
  `Repository::canCurrentUserDelete()` filters on the Submission stage,
  which the author's assignment then has. The wizard has no "Cancel"
  there (`pkp/pkp-lib#8350` reached 3.5).
- 3.3 (code): OPS `upstream/stable-3_3_0` c5532e2161 gives the Author
  group `stages="1,5"` too, so a Submission-stage author check passes; lib/pkp
  `origin/stable-3_3_0` d446601ebe.
- Introduced: `git blame` on the `withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])`
  line leads to a 2024 refactor (`pkp/pkp-lib#9674`, 3ff0147d23) of a
  stage filter present since the method was written in 2021
  (1f48f6e4148). That filter was right until OPS's Author group lost the
  stage: [012e900283](https://github.com/pkp/ops/commit/012e9002836356a50769792eb1368b36e98aacaf)
  (fresh installs) and 1228378516 (the upgrade migration), both in
  `pkp/ops#858`. Its pkp-lib side,
  [ecf81ba72f](https://github.com/pkp/pkp-lib/commit/ecf81ba72f15131ccc48fe89f4da5fadb2d2d5b3)
  in `pkp/pkp-lib#10883`, adjusted two other queries but not this one.
  The wizard's "Cancel" ([e842a48b5e](https://github.com/pkp/pkp-lib/commit/e842a48b5eb8499aba2caa99e6a58fe9b8a0e62b),
  `pkp/pkp-lib#8350`, 2025-01-14) predates the change by a month.
- Upstream search 2026-10-01: pkp/pkp-lib, pkp/ops and pkp/ui-library,
  by "cancel incomplete submission author", "delete incomplete
  submissions OPS", "canCurrentUserDelete" and "submissionCancel".
  `pkp/pkp-lib#13410` describes the wizard path, the same cause and the
  silent error handler. Its only comment links it to `pkp/pkp-lib#10874`.
- Read in the code only: the managers' "All Active" list showing
  unsubmitted drafts (`Repository` dashboard view `TYPE_ACTIVE`, status
  queued with no incomplete filter). MySQL not checked; the fault does
  not depend on the database.
