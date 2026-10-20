# On a preprint server, the manager's "a moderator needs to be assigned" task opens "A workflow stage was not specified." instead of the preprint

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** [9cbfcc323c](https://github.com/pkp/ops/commit/9cbfcc323c74f2ff54e9ecdd53cc1791424464c1) · 2019-06-05 · ajnyga (ajnyga), no PR: OPS kept only the production stage, while the task's shared link (pkp-lib, since 2013) names the submission stage
- **Upstream** `pkp/pkp-lib#5738` (closed; its fix, `pkp/ops#12`, sent only the new-submission notice to the production stage and left this task's link)
- **Tracked in** spec U05 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#ops3)
- **Checked** 2026-10-20, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-20: the report now names the "needs an editor" email the
managers receive and who goes without it; the Steps were walked again on
`main` and 3.5 with the same Observed.

## Summary

A Preprint Server Manager presses the task "A new preprint has been
submitted to which a moderator needs to be assigned." in the header's
Tasks window, expecting the preprint's workflow to open, as it does for
the same task on a journal or a press. The browser lands instead on a
reader-facing page whose whole text is "A workflow stage was not
specified.", and the task is marked read on the way.

The task no longer counts as unread, though it stays listed until a
moderator is assigned. Each manager who gets the task is also sent the
"needs an editor" email for the same preprint, and its link opens the
workflow. A manager who turned that email off gets none, so for them the
task is the only link, and they have to find the preprint in the
submissions list.

Every manager gets the task for each new preprint that no moderator is
assigned to automatically. A new server's section names no moderator, so
on such a server that is every preprint.

## Impact

- **Lost**: the task's link, and silently its unread mark. Assigning a
  moderator still removes the task. Nothing is stored wrong.
- **Who**: every Preprint Server Manager, on a server whose section
  names no moderator.
- **Way round**: the "needs an editor" email's link, for a manager who
  has not turned that email off, or the submissions list opens the
  preprint; "Mark New" restores the unread mark.

Medium: the task's only link fails, with a way round on screen, and the
silent read mark counts against it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`.
- The dataset's section "Preprints" assigns the Moderators David Buskins
  and Stephanie Berardo to every new preprint, so no task is raised.
  Steps 1 to 3 take them off, as a new server's section has none.

Steps:

1. Sign in as `dbarnes` (Preprint Server manager). Open Settings ›
   Server, tab "Sections".
2. On the "Preprints" row, open the row's arrow and press "Edit".
3. Untick "Assign David Buskins as Moderator" and "Assign Stephanie
   Berardo as Moderator", press "Save". The row's Editors column now
   reads "None". Sign out.
4. Sign in as `ccorino`. "New Submission", title "u05b needs a
   moderator", complete every step and press "Submit". Sign out.
5. Sign in as `dbarnes`. On the dashboard the header's "Tasks" bell shows
   "1".
6. Press "Tasks". The window lists "A new preprint has been submitted to
   which a moderator needs to be assigned." with "u05b needs a moderator"
   under it, unread.
7. Press the sentence.

**Expected**: the dashboard opens with the preprint's workflow over it, as
it does for a journal's or a press's "needs an editor" task.

**Observed**: the browser lands on a front-end page, titled
"| Public Knowledge Preprint Server", whose content reads "A workflow
stage was not specified.". Pressing the task sends the browser to the
submission stage's address, which redirects to the access-denied page:

```
GET /index.php/publicknowledge/en/workflow/submission/20      302
  Location: /index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.workflowStageRequired
GET /index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.workflowStageRequired   200
```

Back on the dashboard the bell shows no number, and the row reads as
read. No request failed on the server and no page script failed.

The same steps on OJS (section "Articles", untick its three editors,
author `ccorino`) and OMP (series "Library & Information Studies", untick
its two editors, author `aclark`) open the workflow: the same address
redirects to `workflow/index/<id>/1`, then to
`dashboard/editorial?workflowSubmissionId=<id>`.

## Cause

Pressing a task's text calls `NotificationsGridHandler::markRead()`
(`TaskNotificationsGridHandler`'s parent, lib/pkp
`controllers/grid/notifications/NotificationsGridHandler.php` line 216)
with `redirect=1`. It stores the read date first, then answers with
`NotificationManager::getNotificationUrl()` for the browser to follow.

OPS's `APP\notification\NotificationManager::getNotificationUrl()`
(ops `classes/notification/NotificationManager.php` lines 42–50) handles
only `NOTIFICATION_TYPE_SUBMISSION_SUBMITTED`, sending it to
`workflow/production/<id>`. Every other type falls through to
`PKPNotificationManager::getNotificationUrl()`, which hands
`NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_REQUIRED` to its delegate.

The delegate, `SubmissionNotificationManager::getNotificationUrl()`
(lib/pkp `classes/notification/managerDelegate/SubmissionNotificationManager.php`
line 64), builds `workflow/submission/<id>`: the address of the
submission stage. `PKPWorkflowHandler::authorize()` (line 89) reads the
stage from the operation's name (`identifyStageId()`: "submission" is
stage 1). It then applies `WorkflowStageAccessPolicy`, whose
`WorkflowStageRequiredPolicy::effect()` (line 59) refuses a stage
outside `Application::getValidStages()` (the application's stages plus
the non-workflow ones). OPS's only application stage is production, so
the request is refused with that policy's message,
`user.authorization.workflowStageRequired`. On OJS and OMP the stage
exists, and `submission()` forwards twice to the dashboard.

So the link names a stage that the application may not have.
pkp-lib's other links to a submission's workflow name no stage. Since
`pkp/pkp-lib#10670`
([9113dec7ed](https://github.com/pkp/pkp-lib/commit/9113dec7eda44fdf62eb130c5153b6ede0b07085),
2025) they go straight to `dashboard/editorial?workflowSubmissionId=<id>`,
which every app opens.

Reach:

- Every manager gets the task: `AssignEditors::handle()` (line 71)
  creates one per manager of the server when nobody is assigned
  automatically. In the dataset these are `admin`, `rvaca` and `dbarnes`,
  each with the same link (code).
- `NOTIFICATION_TYPE_SUBMISSION_SUBMITTED` shares the delegate's line.
  OPS's override already sends it elsewhere, and it is not a task, so the
  Tasks window never lists it (code).
- `AssignEditors::handle()` sends each manager it gives the task the
  "needs an editor" email (`SubmissionNeedsEditor`, subject
  `A new submission needs an editor to be assigned: "{$submissionTitle}"`)
  for the same preprint. Its title link is
  `dashboard/editorial?workflowSubmissionId=<id>`
  (`SubmissionEmailVariable::getSubmissionUrl()`, line 122), which opens
  the workflow (on screen).
- A manager who ticked "Do not send me an email for these types of
  notifications." for this notification under their profile's
  Notifications gets the task but no email (`AssignEditors` lines 80–92),
  so the task is their only link (code).
- Only when the server lacks the `SUBMISSION_NEEDS_EDITOR` template does
  `AssignEditors` mail the task's own link (line 104), which then fails
  the same way (code).
- The only other stage address among the notification links is the
  reviewer-comment notice's (`PKPNotificationManager` line 72). OPS never
  raises it, because a preprint server has no review (code).

## Proposed fix

Recommended: make the delegate link to the workflow the way pkp-lib's
other submission links do,
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-task-link-workflow-stage-not-specified/fix.diff):

```diff
--- a/lib/pkp/classes/notification/managerDelegate/SubmissionNotificationManager.php
+++ b/lib/pkp/classes/notification/managerDelegate/SubmissionNotificationManager.php
@@ -61,7 +61,7 @@
                 $contextDao = Application::getContextDAO();
                 $context = $contextDao->getById($notification->contextId);
 
-                return $dispatcher->url($request, PKPApplication::ROUTE_PAGE, $context->getPath(), 'workflow', 'submission', [$notification->assocId]);
+                return $dispatcher->url($request, PKPApplication::ROUTE_PAGE, $context->getPath(), 'dashboard', 'editorial', null, ['workflowSubmissionId' => $notification->assocId]);
             case Notification::NOTIFICATION_TYPE_SUBMISSION_NEW_VERSION:
                 // Route each recipient (including authors) to a workflow view they can access
                 $submission = Repo::submission()->get($notification->assocId);
```

The fix goes in the shared delegate that builds the address, so it covers
both of its types in all three apps. It follows the pattern
`pkp/pkp-lib#10670` set for the editor, copyeditor and layout assignment
notices (`PKPNotificationManager` line 64), `PKPApproveSubmissionNotificationManager`
(line 35) and `PKPEditingProductionStatusNotificationManager` (line 63).
OJS and OMP land where they land today, minus two redirects.

It was tried on `main`. On OPS the task now opens the dashboard with the
preprint's workflow over it, on its Production stage, and OJS and OMP
open the workflow as before. The neighbour check gave the same answer
with the fix in and out: the Moderator `minoue`, not assigned to the new
preprint, types the address the task now opens and gets "The current
role does not have access to this operation.".

**Alternatives**:

- Add `NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_REQUIRED` to OPS's override,
  which sends it to `workflow/production/<id>`. This is a workaround in
  one app: the shared delegate would still build an address that one of
  its apps cannot open.
- `Repo::submission()->getWorkflowUrlByUserRoles()`, as
  `SUBMISSION_NEW_VERSION` uses. It sends a manager who is also the
  preprint's author to their author view, which is the wrong place for a
  task asking them to assign a moderator.
- Let the old stage addresses forward to the dashboard even when the app
  lacks the stage. This changes the workflow handler's authorization for
  every caller, and nothing on screen needs it once the link is right.

**What goes with it**:

- No data repair: the address is built when the task is pressed, so the
  tasks already stored get the new link.
- OPS's own override for `SUBMISSION_SUBMITTED` (`pkp/ops`
  `classes/notification/NotificationManager.php`) is no longer needed
  and can go in a separate cleanup. The fix does not depend on it.
- Backport: 3.5 has the same line (64), and the diff applies as written.
  3.4 and 3.3 have no `dashboard/editorial` page. There the same line
  (3.4 line 63, 3.3 line 65) would name `workflow/access/<id>`, which
  their editor-assignment notices use; on 3.3 that line also serves
  `METADATA_MODIFIED`, so it changes three types there.
- Guard: the OPS U05 test that presses the task (spec U05 Rule 2c)
  asserts the landing on the workflow, which today it leaves out because
  of this fault. A unit test of the delegate's address also works.

Small: one line in the shared delegate, tried, plus a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-task-link-workflow-stage-not-specified/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on OJS, OMP and OPS,
  with OJS and OMP as the control. It runs as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-task-link-workflow-stage-not-specified/walk.js`
  on an install loaded from PKP's default test dataset (pkp/datasets
  35759b4c, 2026-10-19), PostgreSQL. With `neighbour` as its argument it
  runs the neighbour check alone. The walk tags the title with a run tag
  ("u05b… needs a moderator"). It records the browser's
  top-level requests and the reply to the task press. No crash was recorded on
  any run.
- Email control:
  [email.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-task-link-workflow-stage-not-specified/email.js),
  run right after the walk on the same install
  (`… node bin/probe.js ops …/email.js`), reads the email `dbarnes`
  received for the walk's preprint, and opens its title link,
  `dashboard/editorial?workflowSubmissionId=20`, as `dbarnes`: the
  preprint's workflow opens over the submissions list on its Production
  stage, on `main` and 3.5.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on 2026-10-04
  and again on 2026-10-20: the same Observed on OPS and the same control
  on OJS and OMP each time. The dataset
  gives `dbarnes` other unread tasks on OJS (3) and OMP (14), so the bell
  there showed more than "1".
- Fix tried with `node bin/try-fix.js apply …/fix.diff ojs omp ops` on
  `main` on 2026-10-04, the walk and the neighbour check run, then
  reverted; the neighbour check was run again without the fix. Not tried
  again on 2026-10-20: the delegate's line and its context are unchanged
  at today's tips, and the diff still applies to them.
- Tips (2026-10-20): `main` OPS f048e747b4, OJS 6b4323ced7, OMP
  5777025bec (lib/pkp 042726ebf6 in each); `stable-3_5_0` OPS
  110effdd6e, OJS b56f8b74ff, OMP 722d3e661e (lib/pkp cd82be0528 in
  each); `stable-3_4_0` OPS 0f1e21a117 (lib/pkp a71d6bd2ca);
  `stable-3_3_0` OPS c5532e2161 (lib/pkp 5e84acd11b).
- Code reads, 3.5: the delegate line (64) and OPS override (line 48) as
  on `main`; `getApplicationStages()` production only (line 175, `main`
  150), which `WorkflowStageRequiredPolicy` (line 48) checks directly.
- Code reads, 3.4: `SubmissionNotificationManager` line 63 builds
  `workflow/submission/<id>` for the task; OPS's override sends only
  `SUBMISSION_SUBMITTED` to production (line 48); `getApplicationStages()`
  lists only production; `AssignEditors` raises the task for every
  manager (line 77); `PKPWorkflowHandler::authorize()` applies
  `WorkflowStageAccessPolicy` (line 84), whose `WorkflowStageRequiredPolicy`
  refuses the missing stage.
- Code reads, 3.3: `SubmissionNotificationManager.inc.php` line 65, the
  same address; OPS's override line 35; `getApplicationStages()` production
  only; `PKPSubmissionSubmitStep4Form` raises the task for every manager
  when no editor is assigned (line 147), and OPS's
  `SubmissionSubmitStep4Form` calls it; the same policies in
  `PKPWorkflowHandler::authorize()` (line 56).
- Introduced, the trace: the delegate's line has named
  `workflow/submission` since
  [86a42a5aa8](https://github.com/pkp/pkp-lib/commit/86a42a5aa8b02cdca61f2a4295adc18e17213082)
  (2013-08-01, Alec Smecher), before OPS existed, and later changes only
  reshaped it (22af741d44, 2024; 0da2d4fa08 for `pkp/pkp-lib#10495`).
  OPS's `getApplicationStages()` dropped the submission stage in
  9cbfcc323c (no PR found through `commits/<sha>/pulls`).
  [af90df34e7](https://github.com/pkp/ops/commit/af90df34e7a060f68dfd2645e9c62a064d0887b3)
  (`pkp/ops#12`, 2020-04-16, ajnyga) for `pkp/pkp-lib#5738` redirected
  only `SUBMISSION_SUBMITTED`. The report in that issue was a mailed link
  of the same shape.
- Upstream search, 2026-10-04, repeated for the symptom and the delegate
  on 2026-10-20 with nothing new: pkp/pkp-lib, pkp/ops and pkp/ui-library
  issues and PRs for "workflow stage was not specified", "moderator needs
  to be assigned", "workflowStageRequired", `SubmissionNotificationManager`,
  `getNotificationUrl`, `EDITOR_ASSIGNMENT_REQUIRED`, "editorAssignmentTask";
  only `pkp/pkp-lib#5738` matched.
- Not driven: 3.4 and 3.3 (code only, as asked); the server without the
  "needs an editor" email template; a manager who turned that email off;
  the other managers' tasks;
  assigning a moderator, which deletes the task for every manager
  (`StageParticipantGridHandler::saveParticipant()`, line 361; code).
- MySQL not checked; nothing in the fault depends on the database.
