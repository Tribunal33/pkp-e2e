# On a preprint server, Moderators assigned automatically to a new preprint are never emailed

- **Severity** high
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code)
  - 3.3: none (code; no automatic assignment email)
- **Introduced** `pkp/ops#858` for `pkp/pkp-lib#10874` · [012e900283](https://github.com/pkp/ops/commit/012e9002836356a50769792eb1368b36e98aacaf) · 2025-02-03 (merged 2025-02-11) · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ops3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When an author submits a preprint, the server assigns the Moderators its
section lists under "Editorial Assignments", and each of them should get
the email "You have been assigned as a moderator on a submission to
{server name}". None of them does: they appear in the preprint's
"Participants" panel, but no email goes out, the Activity Log records
none, and no task appears in their Tasks panel either.

Nobody else on the editorial side is told. The managers get no "A new
submission needs an editor to be assigned" email, because the preprint
already has Moderators. The only email the submission sends is the
author's acknowledgement, and nothing shows that the Moderators' emails
are missing.

It needs only a section with Moderators under "Editorial Assignments".

## Impact

- **Lost**: the email that tells each assigned Moderator that a new
  preprint is waiting for them. No task takes its place, and nobody is
  told that it was not sent.
- **Who**: every Moderator, or Preprint Server manager, whom a section
  lists under "Editorial Assignments", on every new preprint in that
  section. Servers that sent this email on 3.4 stop sending it once
  upgraded.
- **Way round**: the preprint is listed under "Assigned to me" on the
  Moderator's dashboard, and a manager can email a Moderator through
  the Participants panel's "Notify". Both rely on someone looking.

High: on every server whose sections assign Moderators, no editorial
person is told about a new preprint, by email or by a task, and nothing
shows that the email failed. Shown as an error it would be medium,
since the dashboard lists the preprint; the silence raises it one
level.

## Steps to reproduce

Preconditions:

- The default dataset, OPS `main`. Its one section, "Preprints", lists
  the Moderators David Buskins (`dbuskins`) and Stephanie Berardo
  (`sberardo`) under "Editorial Assignments", so the server assigns
  both to every new preprint in that section. Nothing else is needed.

Steps:

1. Sign in as `ccorino` (an author).
2. Open "New Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u35w31 Moderator email check", leave "Submission
   Language" at "English" (the server accepts English and French), tick
   "Yes, my submission meets all of these requirements." and "Yes, I
   agree to have my data collected and stored according to the privacy
   statement.", and press "Begin Submission".
3. On "Upload Files" press "Add File", type the Galley Label "PDF" and
   press "Save". In the upload window choose "Preprint Text", upload any
   PDF, then press "Continue", "Continue" and "Complete".
4. Press "Continue" to reach "Details", type an abstract, and press
   "Continue" through the remaining steps to "Review".
5. Press "Submit", then "Submit" in the confirmation. The page reads
   "Submission complete".
6. Sign out and sign in as `dbarnes` (a Preprint Server manager). Open
   the preprint from the dashboard, read its "Participants" panel, then
   open "Activity Log".
7. Read the mailboxes of dbuskins@mailinator.com and
   sberardo@mailinator.com.

**Expected**: David Buskins and Stephanie Berardo each receive one
email, "You have been assigned as a moderator on a submission to Public
Knowledge Preprint Server", from the server's contact, and the Activity
Log lists it once for each of them.

**Observed**: "Participants" lists David Buskins (Moderator), Stephanie
Berardo (Moderator) and Carlo Corino (Author). Neither Moderator's
mailbox holds any email about the preprint, and neither do the managers'
(`rvaca`, `dbarnes`). The Activity Log's History lists only these
entries about the submission and its emails:

```
Carlo Corino | Preprint submitted
             | An email has been sent: Thank you for your submission to Public Knowledge Preprint Server
```

On a journal, the same steps (`ccorino` into "Articles", whose editors
are `dbarnes`, `dbuskins` and `sberardo`) send each of the three editors
"You have been assigned as an editor on a submission to Journal of
Public Knowledge" once, and the Activity Log lists all three.

## Cause

`SubEditorsDAO::assignEditors()` (lib/pkp
`classes/context/SubEditorsDAO.php`) runs when a submission is
submitted. It assigns the section's and categories' editors, then
chooses whom to email with this query:

```php
$editorAssignments = StageAssignment::withSubmissionIds([$submission->getId()])
    ->withRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR])
    ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
    ->get();
```

`withStageIds()` keeps only assignments whose user group has a
`user_group_stage` row for that stage. A preprint server has no
Submission stage: its only workflow stage is Production
(`Application::getApplicationStages()` returns
`[WORKFLOW_STAGE_ID_PRODUCTION]`). Until 3.4, OPS still installed its
roles with the Submission stage (`registry/userGroups.xml`
`stages="1,5"`), so the query found the Moderators.

`pkp/pkp-lib#10874` ("OPS installs unsupported stages into
user_group_stage table") removed that stage from OPS's roles, both on
install (`pkp/ops#858`, `stages="5"`, now `"5,6"`) and on upgrade
(migration `I10874_UserGroupStagesRemoveSubmission`,
[1228378516](https://github.com/pkp/ops/commit/1228378516f0dff6f0057467a36e5c5b02c47ba3)).
The issue's pkp-lib PR (`pkp/pkp-lib#10883`,
[ecf81ba72f](https://github.com/pkp/pkp-lib/commit/ecf81ba72f15131ccc48fe89f4da5fadb2d2d5b3))
changed two other queries that filtered on the Submission stage to use
the application's first stage instead, but not this one. Since then no
OPS role has the Submission stage, the query returns nothing, and the
email loop never runs. The query was right when it was written, while
OPS's roles still had the Submission stage; the role change made it
wrong.

Reach:

- Every person the email should reach on a preprint server: the
  Moderators and Preprint Server managers a section lists under
  "Editorial Assignments" (checked on screen for Moderators, in the
  code for managers). Also a manager who chooses their manager role
  under "Submit As": the preprint is assigned to them in that role when
  it is submitted, and this query skips that assignment too (code).
  OPS offers that choice because it overrides
  `getSubmitUserGroups()` in its own `pages/submission/SubmissionHandler.php`,
  which filters by role (manager, site admin, author) with no stage
  filter.
- The in-app notice `assignEditors()` creates for each assigned editor
  (`NOTIFICATION_TYPE_SUBMISSION_SUBMITTED`) does not use this query,
  but it is created at `NOTIFICATION_LEVEL_NORMAL`, and the header's
  Tasks panel and its count list only `NOTIFICATION_LEVEL_TASK`
  (`PKPTemplateManager`, `TaskNotificationsGridHandler`). After the
  walk, `dbuskins`'s Tasks count still showed only the one unread task
  the dataset gives him. On a journal it is the same, but there the
  email goes out.
- The assignment itself and the managers' "needs an editor" fallback do
  not use this query (code). The fallback runs only when nobody was
  assigned, so it stays silent here.
- Other places that still filter on `WORKFLOW_STAGE_ID_SUBMISSION`,
  checked in the code:
  - `PKP\submission\Repository::canCurrentUserDelete()` has the same
    assumption, so an OPS author cannot cancel their own incomplete
    submission. pkp tracks that as `pkp/pkp-lib#13410` (open).
  - `PKPSubmissionHandler::getSubmitUserGroups()` filters on the same
    stage, but OPS overrides it (above), so it does not run there.
  - `CategoryForm`, `CategoryCategoryController` and `StartSubmission`
    leave OPS out on purpose, as their comments say.

## Proposed fix

Filter on the stage a new submission enters in this application, in the
same way `pkp/pkp-lib#10883` already does in `PKPSectionForm::fetch()`
and `PKPSubmissionHandler::getWorkflowUrl()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-moderator-assigned-email-never-sent/fix.diff)):

```diff
         // Send an email to assigned editors
         // Replaces StageAssignmentDAO::getBySubmissionAndRoleIds
+        $stages = Application::getApplicationStages();
         $editorAssignments = StageAssignment::withSubmissionIds([$submission->getId()])
             ->withRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR])
-            ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
+            ->withStageIds([
+                // WORKFLOW_STAGE_ID_SUBMISSION for OJS/OMP and WORKFLOW_STAGE_ID_PRODUCTION for OPS, see pkp/pkp-lib#10874
+                array_shift($stages)
+            ])
             ->get();
```

On a journal or press the first stage is still the Submission stage, so
nothing changes there. On a preprint server it is Production, which
every OPS editor role has. The fix belongs in the shared DAO because
that is the only place that sends this email.

The fix was tried on `main` in the three apps. With it, each of the two
Moderators received "You have been assigned as a moderator on a
submission to Public Knowledge Preprint Server" once, from the server's
contact, and the Activity Log listed both emails. On the journal and
the press each editor still received the email exactly once. The
managers who were not assigned and the author received no assignment
email in any app.

**Alternatives**:

- Filter on the submission's own stage (`$submission->getData('stageId')`).
  At submission time this is the same value, but it differs from the
  pattern `pkp/pkp-lib#10883` set for these queries.
- Drop the stage filter. Every manager-level assignment would then
  match, including one in a role without a workflow stage, which would
  widen who gets the email on journals and presses.
- Give OPS's editor roles the Submission stage again. That reverses
  `pkp/pkp-lib#10874`, whose point was that OPS has no such stage.

**What goes with it**:

- No data repair: the email belongs to the moment of submission, so
  past submissions stay as they are.
- Fix `canCurrentUserDelete()` (`pkp/pkp-lib#13410`) in the same
  pkp-lib PR, with the same pattern: it is the same mistake left by the
  same change, one line in the same repo, and OPS's Author role has the
  Production stage it would then filter on. That part was not tried
  here.
- The diff applies unchanged to `stable-3_5_0`, which has the same code
  and the same roles.
- A guard: an OPS unit or e2e test that submits a preprint into a
  section with a Moderator and expects the email.

Small: one query in one shared method (two with `canCurrentUserDelete()`),
following a pattern the code base already uses, plus a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-moderator-assigned-email-never-sent/walk.js)
  takes the Steps on OPS and the same steps as a control on OJS
  (`ccorino` into "Articles") and OMP (`aclark`, series "Library &
  Information Studies" picked on "For the Editors", editor `dbuskins`),
  on an install freshly reset to the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/ops-moderator-assigned-email-never-sent/walk.js`.
  It reads the mailboxes of the assigned editors, of `rvaca`, `dbarnes`
  and the author, and the Activity Log. The OJS and OMP runs, walked
  with the fix in and out, show the fix changes nothing on a journal or
  press.
- `dbuskins`'s dashboard was read once on OPS `main` after a walk:
  "Assigned to me" listed the preprint, and the header read "Tasks 1",
  the one unread task (on submission 3) the dataset gives him.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). No request failed and no page script failed in any walk.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`
  (lib/pkp `3dc90c81a6`), OPS `c8af945bb7` (lib/pkp `3dc90c81a6`);
  `stable-3_5_0` OJS `92b9a16b48`, OMP `3081c9b00`, OPS `cf4fce69bd`
  (lib/pkp `a9c76aed62`); OPS `stable-3_4_0` `acd8ae704b` (lib/pkp
  `df13621c2d`), `stable-3_3_0` `c5532e2161` (lib/pkp `d446601ebe`).
  `SubEditorsDAO.php` is byte-identical in the three `main` lib/pkp
  checkouts.
- 3.5, walked: the same Steps send no email to either Moderator on OPS,
  and the OJS and OMP controls send theirs. Code: `assignEditors()` has
  the same query, OPS's roles are `stages="5"`, and the OPS commit
  `012e900283` and the migration are on the branch. Both are in every
  OPS `3_5_0-*` release tag, so every OPS 3.5 release has the fault.
- 3.4 (code): `assignEditors()` uses
  `StageAssignmentDAO::getBySubmissionAndRoleIds(…, WORKFLOW_STAGE_ID_SUBMISSION)`,
  which joins `user_group_stage` on that stage. OPS's manager,
  Moderator and Author roles are `stages="1,5"` there, so the Moderators
  match. `012e900283` is not on the branch.
- 3.3 (code): `PKPSubmissionSubmitStep4Form::execute()` assigns the
  section's editors and creates notifications but sends no assignment
  email. The `EDITOR_ASSIGN` template there is the one for assigning an
  editor by hand.
- Introduced: `git blame` on the stage filter gives
  [3ff0147d23](https://github.com/pkp/pkp-lib/commit/3ff0147d23dedec8ed4a4094d1ffe03ded13e645),
  which only renamed the scopes (`withStageId` to `withStageIds`); the
  Eloquent port before it is
  [e5a7262830](https://github.com/pkp/pkp-lib/commit/e5a7262830b4a41ac710d3a11d2fb61c94b2b5f6),
  both for `pkp/pkp-lib#9674` (PR `pkp/pkp-lib#9675`), with the same
  filter. The query came from
  [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77)
  (`pkp/pkp-lib#7191`, the new submission wizard). `pkp/pkp-lib#10883`
  was read on GitHub: merged 2025-02-11 into `main`, one commit,
  `ecf81ba72f`.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ops and
  pkp/ui-library, issues and PRs, open and closed, searched for
  moderator assigned email, editor assigned email OPS, assignEditors,
  EditorAssigned, SubEditorsDAO and WORKFLOW_STAGE_ID_SUBMISSION OPS.
  `pkp/pkp-lib#6047` (OPS 3.2, the template missing from manual
  assignment) and `pkp/pkp-lib#8423` (where the template is used) are
  other faults.
- Not driven: 3.4 and 3.3 (the code reads above), and a manager
  submitting as "Preprint Server manager" (code only).
