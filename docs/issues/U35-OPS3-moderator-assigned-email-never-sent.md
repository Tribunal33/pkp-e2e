# A preprint server never emails its moderators that a new preprint was assigned to them

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code)
  - 3.3: none (code; no automatic assignment email)
- **Introduced** `pkp/ops#858` and `pkp/pkp-lib#10883` for `pkp/pkp-lib#10874` · [012e900283](https://github.com/pkp/ops/commit/012e9002836356a50769792eb1368b36e98aacaf) · 2025-02-03 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** nothing found about this email (2026-10-01). A related
  open issue, `pkp/pkp-lib#13410`, covers another symptom of the same
  change (an author cannot cancel an incomplete submission on a preprint
  server)
- **Tracked in** spec U35 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ops3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A preprint server lists "Moderator Assigned (Auto)" under Settings ›
Workflow › Emails and lets it be edited, but never sends it. When an
author submits a preprint, the Moderators named under the section's
"Editorial Assignments" are added to it as on a journal, but "You have
been assigned as a moderator on a submission to {server name}" is not
sent to any of them: no send is attempted and the preprint's Activity Log
records none.

The managers' "A new submission needs an editor to be assigned" email is,
by design, sent only when nobody was assigned. So on a server whose
section names Moderators, no email at all says that a preprint waits for
moderation. A server with no Moderators under "Editorial Assignments" is
not affected: nobody is assigned there and the managers get their email.

## Impact

- **Lost**: the one email that tells a moderator a new preprint is theirs
  to screen.
- **Who**: every Moderator a section's "Editorial Assignments" puts on a
  new preprint, and a Preprint Server manager who submits a preprint
  themselves, for every submission.
- **Way round**: the preprint is listed on the moderator's dashboard, so a
  moderator who looks there finds it. A manager can also write to them
  from the preprint's "Participants" › "Notify".

Medium: the notification fails silently for every new preprint, but the
preprint is assigned and reachable on the dashboard.

## Steps to reproduce

Preconditions:

- The default dataset, OPS `main`. Its section "Preprints" already names
  David Buskins and Stephanie Berardo as Moderators under "Editorial
  Assignments".

The email is offered:

1. Sign in as `rvaca`. Open Settings › Workflow › "Emails" › "Add and
   edit templates"
   (`/index.php/publicknowledge/en/management/settings/manageEmails`),
   search "Moderator Assigned (Auto)" and press its "Edit". Read the
   subject, close the window and sign out.

An author submits:

2. Sign in as `ccorino` and open "New Submission"
   (`/index.php/publicknowledge/en/submission`). Type a title, choose
   "English" under "Submission Language", tick "Yes, my submission meets
   all of these requirements." and "Yes, I agree to have my data collected
   and stored…", then "Begin Submission".
3. On "Upload Files" press "Add File", type the label "PDF", "Save",
   choose "Preprint Text" and upload any PDF, and finish the upload
   window. Type an abstract. On "For Readers" choose "This preprint has
   not been published elsewhere.". Then "Submit" and confirm with
   "Submit". Sign out.

A manager submits:

4. Sign in as `rvaca` and submit a second preprint the same way. Sign
   out.

Reading:

5. Sign in as `rvaca`, open each of the two preprints from the Dashboard,
   read "Participants", then press "Activity Log".
6. Read the mail of `dbuskins@mailinator.com`, `sberardo@mailinator.com`
   and `rvaca@mailinator.com`.

**Expected.** Step 1 opens "Edit Template" with the subject "You have been
assigned as a moderator on a submission to {$contextName}". After step 3,
David Buskins and Stephanie Berardo each get "You have been assigned as a
moderator on a submission to Public Knowledge Preprint Server", and the
Activity Log holds "An email has been sent: You have been assigned as a
moderator on a submission to Public Knowledge Preprint Server" once per
recipient. After step 4, Ramiro Vaca, who is on his own preprint as
"Preprint Server manager", gets one as well.

**Observed.** Step 1 is as expected. Step 5 lists the moderators on both
preprints:

```
PARTICIPANTS
David Buskins      Moderator
Stephanie Berardo  Moderator
Carlo Corino       Author
```

(on the second preprint "Ramiro Vaca, Preprint Server manager" instead of
the author). Neither Activity Log holds an "assigned" row; the first holds
only "An email has been sent: Thank you for your submission to Public
Knowledge Preprint Server". None of the three mailboxes holds an email
about either preprint.

Control, on the default dataset of OJS and OMP, with "Editor Assigned
(Auto)" in step 1. On OJS `ccorino` and `rvaca` choose the section
"Articles" on the start page: Daniel Barnes, David Buskins and Stephanie
Berardo each get "You have been assigned as an editor on a submission to
Journal of Public Knowledge" for both submissions, each logged. On OMP
`aclark` and `rvaca` choose the series "Library & Information Studies" on
"For the Editors" (with no series the press assigns nobody): David Buskins
gets "…to Public Knowledge Press" for both. On neither is Ramiro Vaca
listed under "Participants" of his own submission or emailed: the
dataset's Journal manager and Press manager roles work on no stage, where
"Preprint Server manager" works on Production.

## Cause

`SubEditorsDAO::assignEditors()` (lib/pkp
`classes/context/SubEditorsDAO.php`, line 254) runs when a submission is
submitted. After it has built the stage assignments, it picks the
recipients of the email:

```php
$editorAssignments = StageAssignment::withSubmissionIds([$submission->getId()])
    ->withRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR])
    ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
    ->get();
```

`withStageIds()` keeps an assignment only when its user group is linked to
that stage in `user_group_stage`. A preprint server has one stage,
Production (`APP\core\Application::getApplicationStages()` in OPS), and
since `pkp/pkp-lib#10874` its user groups are linked to no other:
`pkp/ops#858` changed `registry/userGroups.xml` from `stages="1,5"` to
`stages="5"` (`"5,6"` on `main` today, 6 being the Done state), and the upgrade migration
`I10874_UserGroupStagesRemoveSubmission` deletes the stage 1 rows of
existing servers. So the query returns nothing on a preprint server, and
the `if ($editorAssignments->isNotEmpty() && $emailTemplate)` block that
sends and logs the email never runs.

`pkp/pkp-lib#10883`, the pkp-lib half of that change, replaced the
constant with the application's first stage in two other queries
(`PKPSectionForm::fetch()` and `PKPSubmissionHandler::getWorkflowUrl()`),
but not in this one. On 3.4 the same query asks for stage 1 and OPS's
groups still have it, so the email goes out there.

Reach:

- Two kinds of recipient lose the email, both walked: the moderators the
  section assigns, and a manager who submits and is put on the preprint
  as "Preprint Server manager" (`PKPSubmissionController::add()` takes
  the submitter's manager group). A category assigns nobody on a preprint
  server, since `CategoryForm` offers no "Editorial Assignments" there. A
  moderator who submits is given the Author group by the same `add()`
  (code read, not walked), so is not a recipient.
- New installs and upgraded ones are both affected: the registry file
  leaves stage 1 out on a new install, and the migration removes it on an
  upgraded one (code read).
- When a section assigns nobody, the `AssignEditors` listener emails the
  managers "A new submission needs an editor to be assigned" instead; that
  path does not use this query (code read, not walked here).
- Other queries that still ask for `WORKFLOW_STAGE_ID_SUBMISSION` on code
  a preprint server runs, among others (code read, not walked):
  - `submission\Repository::canCurrentUserDelete()`, which is
    `pkp/pkp-lib#13410`.
  - `PKPSubmissionHandler::getSubmitUserGroups()`: for a non-admin it
    finds no group on OPS and falls back to the Author group, so the
    start page offers a manager no "Submit As" choice; the manager is
    still assigned in the manager group by `add()` (walked: step 5 lists
    Ramiro Vaca as "Preprint Server manager").
  - `CategoryForm` and `StartSubmission::addUserGroups()`, whose comments
    say they leave OPS out on purpose.
  - `LibraryFileHandler` (line 99), `submissionFile\Repository` (lines 614
    to 617) and `SubmissionFileStageAccessPolicy` (lines 93 to 95) name
    the stage too; whether a preprint server reaches them was not
    checked.

## Proposed fix

Ask for the application's first stage, as `pkp/pkp-lib#10883` did in the
two sibling queries, with the same comment.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/moderator-assigned-email-never-sent/fix.diff):

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

The fix was tried on OPS, OJS and OMP `main`. With it applied, the Steps
on OPS produced what Expected describes: one email each to David Buskins and Stephanie Berardo for
both preprints and one to Ramiro Vaca for his own, each logged. The
author, Daniel Barnes (a manager not on the preprints) and Minoti Inoue (a
moderator not on them) got none, and nobody got two. OJS and OMP sent
exactly what they sent without the fix.

**Alternatives**

- Drop the stage filter and keep only the role filter. On OJS and OMP
  that would also email a manager-level or sub-editor-level role created
  without the Submission stage, which the filter is there to leave out.
- Put stage 1 back on OPS's user groups. That undoes `pkp/pkp-lib#10874`,
  which removed a stage the application does not have.

**What goes with it**

- The diff applies to `stable-3_5_0` as it stands.
- Moderators of upgraded servers start getting an email they have not had
  since 3.5.0. The query does not look at whether the author may post the
  preprint themselves, so moderators are emailed for those preprints too,
  as on 3.4 (code read, not walked); whether that is wanted is the team's
  call.
- The guard: the e2e scenario "The automatic 'Editor Assigned (Auto)'
  email" of spec U35, run on a preprint server too (it is OJS and OMP only
  today). lib/pkp has no unit test of `SubEditorsDAO` and no fixture that
  builds a context with its user groups.
- `canCurrentUserDelete()` and `getSubmitUserGroups()` are left to their
  own issues; a sweep of the remaining `WORKFLOW_STAGE_ID_SUBMISSION`
  queries for OPS would cover the class of fault.
- No data repair and no API change. Moderators who do not want the email
  already have the Notifications box the method checks ("Do not send me an
  email" on "A new preprint , "{$title}", has been submitted.").

Small: one query in one method, and no unit test fixture to build.

## Evidence

- The kept script takes the Steps on all three apps, OJS and OMP as the
  control, and counts the "assigned" emails per mailbox, which shows that
  the people who must get none get none and nobody gets two:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/moderator-assigned-email-never-sent/walk.js),
  with its helpers in `lib.js` beside it. It runs from a pkp-e2e checkout
  against installs freshly loaded from the default dataset
  (`PROBE_FEATURE` names the install set, `PROBE_AGENT` the output
  folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/moderator-assigned-email-never-sent/walk.js`
- Taken on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets c657990
  (2026-10-01). The fix was checked with the same command and the diff
  applied to the three apps.
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69), OMP `main` 3b0ecf794
  and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  4fca1027f4, OMP c7b45f88e, OPS 8eaf899468 (lib/pkp 1fb843f491);
  `stable-3_4_0` OPS acd8ae704b (lib/pkp df13621c2d); `stable-3_3_0` OPS
  c5532e2161 (lib/pkp d446601ebe).
- Code reads:
  - `main`: `SubEditorsDAO::assignEditors()`, the `AssignEditors`
    listener, OPS `Application::getApplicationStages()` and
    `registry/userGroups.xml` (`stages="5,6"` on the manager, moderator
    and author groups), the migration
    `I10874_UserGroupStagesRemoveSubmission`, lib/pkp ecf81ba72f (the two
    queries `pkp/pkp-lib#10883` changed), and a search of lib/pkp and OPS
    for `WORKFLOW_STAGE_ID_SUBMISSION`.
  - Introduced: the query's own line dates from 2022 and was only
    rewritten since; OPS 012e900283 (registry) and 1228378516 (migration),
    merged with `pkp/ops#858` on 2025-02-11, made it wrong.
  - The submitter's group: `PKPSubmissionController::add()`
    (`withRoleIds([ROLE_ID_MANAGER, ROLE_ID_AUTHOR])`) and
    `PKPSubmissionHandler::getSubmitUserGroups()`; the dataset's
    `user_group_stage` holds no row for OJS's Journal manager group or
    OMP's Press manager group.
  - 3.5: the same query (line 255) and `stages="5"` in OPS's registry
    file; the migration is in `dbscripts/xml/upgrade.xml`.
  - 3.4: `assignEditors()` calls
    `getBySubmissionAndRoleIds(…, WORKFLOW_STAGE_ID_SUBMISSION)` and OPS's
    registry file has `stages="1,5"`, so the query finds the moderators.
  - 3.3: `PKPSubmissionSubmitStep4Form::execute()` assigns the sub-editors
    and raises notifications; it sends no assignment email, and
    `EDITOR_ASSIGN` is a template for the manual "Assign" there.
- Upstream searches (2026-10-01): pkp/pkp-lib and pkp/ops, by the symptom
  ("moderator assigned email", "Editor Assigned email not sent",
  "moderator not notified", "moderator notification new submission
  preprint") and by `assignEditors`, `EDITOR_ASSIGN` and
  `WORKFLOW_STAGE_ID_SUBMISSION` with OPS.
- Unverified: MySQL; 3.4 and 3.3 were read in the code only, so "it
  worked on 3.4" rests on that read; an upgraded 3.5 install was not
  walked (the migration was read); a server with no Moderators under
  "Editorial Assignments" (the managers' "needs an editor" email), a
  moderator submitting, and an author who may post their own preprint
  were read in the code, not walked.
