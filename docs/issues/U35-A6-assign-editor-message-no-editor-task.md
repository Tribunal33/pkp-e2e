# An editor assigned with the "Assign Editor" message gets no "You have been assigned as an editor" task

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; "Assign Editor" still raises the task)
- **Introduced** `pkp/pkp-lib#8407` and `pkp/ojs#3609` for `pkp/pkp-lib#5716` · [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5), [8ff2353b4e](https://github.com/pkp/ojs/commit/8ff2353b4e1479db9ec658068265e76e0179657e) · 2022-11-03 (merged 2022-11-30) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor assigns someone from a submission's "Participants" panel and
chooses the predefined message "Assign Editor". The person's "Tasks"
list should gain the entry "You have been assigned as an editor to the
submission {title}". It gains only the message's own entry, "{sender}
started a discussion: Assign Editor: {message}", while the message
still arrives by email and as a discussion. Other predefined messages
that ask for work, such as "Request Copyedit" and "Ready for
Production", still add a task of their own.

The editor task is tied to the "Assign Editor" message alone: nothing
else in the application raises it. An assignment with no message, or
with any other message, never gave it. The role the person is assigned
in does not matter: a Journal editor or a manager assigned with this
message misses it the same way as a Section editor.

"Assign Editor" is offered on the Submission, Review and Production
stages of a journal or press, and on the Production stage of a preprint
server. Copyediting has never offered it.

## Impact

- **Lost:** nothing on the submission. The person's "Tasks" list lacks
  the one entry that says they were assigned.
- **Who:** anyone assigned or notified with the "Assign Editor" message.
- **Way round:** none needed.

Low: only the dedicated task is missing; the assignment is made and the
message is delivered.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS.

The submission and the role to assign Minoti Inoue (`minoue`) in:

| App | Submission (stage) | Role |
|---|---|---|
| OJS | 4, "Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice" (Submission) | "Section editor" |
| OMP | 16, "A Designer's Log: Case Studies in Instructional Design" (Review) | "Series editor" |
| OPS | 1, "The influence of lactation on the quantity and quality of cashmere production" (Production) | "Moderator" |

Assigning:
1. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`.
2. In "Participants", press "Assign", choose the role, search for
   "Inoue" and choose Minoti Inoue.
3. Choose the predefined message "Assign Editor" (on OPS 3.4 and 3.5
   it is named "Editor Assigned"). Replace the text in "Message" with
   "u35w34 assign editor" and press "OK". (On OPS `main`, "Message"
   stays empty after the choice, a separate fault; type the text into
   it all the same.) Sign out.

Reading:
4. Sign in as `minoue` and open "Tasks" in the header.

**Expected:** the list holds the entry "You have been assigned as an
editor to the submission {title}" (the title in quotes), as well as the
discussion's entry.

**Observed:** the window closes and Minoti Inoue is listed in
"Participants". Her mailbox holds the email from "Daniel Barnes",
subject "Assign Editor". Her "Tasks" list holds one entry, on OJS:

```
Daniel Barnes started a discussion: Assign Editor: u35w34 assign editor
Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice
```

and no "You have been assigned as an editor…" entry. On 3.5 the email's
subject and the discussion's title read "You have been assigned as an
editor on a submission to Journal of Public Knowledge" ("as a moderator
… Public Knowledge Preprint Server" on OPS), and the task is missing
the same way.

## Cause

`PKPStageParticipantNotifyForm::sendMessage()` (lib/pkp
`controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
lines 268–272 on `main`) raises the assignment task in a
`switch ($templateKey)` on the chosen message's key. The editor-task
branch is `case 'EDITOR_ASSIGN':`, which adds
`NOTIFICATION_TYPE_EDITOR_ASSIGN` ("You have been assigned as an editor
to the submission …") and logs the email as
`SubmissionEmailLogEventType::EDITOR_ASSIGN`.

No "Assign Editor" message has carried that key since 3.4. On OJS and
OMP the predefined messages are keyed `EDITOR_ASSIGN_SUBMISSION`,
`EDITOR_ASSIGN_REVIEW` and `EDITOR_ASSIGN_PRODUCTION`; OPS has only
`EDITOR_ASSIGN_PRODUCTION` (the apps' `registry/taskTemplates.xml` on
`main`, `registry/emailTemplates.xml` on 3.4 and 3.5). They fall to
`default:`, which only logs the email as a plain discussion message.
This branch is the only place that raises
`NOTIFICATION_TYPE_EDITOR_ASSIGN`, and the switch does not look at the
recipient's role. The same class's
`getEmailVariableNames()` already lists the three keys together with
`EDITOR_ASSIGN`; the switch below it was not given them.

How it got here:
- Through 3.3 the form offered `EDITOR_ASSIGN` itself (the apps'
  `StageParticipantNotifyForm::_getStageTemplates()`: Submission,
  Review and Production on OJS and OMP, Production on OPS), and the
  switch raised the task.
- [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5)
  and [8ff2353b4e](https://github.com/pkp/ojs/commit/8ff2353b4e1479db9ec658068265e76e0179657e)
  (`pkp/pkp-lib#5716`, the new "Manage Emails" screens) made the form
  offer only the stage's discussion email and its alternate templates,
  and made the per-stage "Assign Editor" templates alternates of each
  stage's discussion email in place of `EDITOR_ASSIGN` (its migration `I5716_EmailTemplateAssignments::modifyEditorAssignTemplate()`
  copies a journal's custom `EDITOR_ASSIGN` text into them). The switch
  kept the old key. `EDITOR_ASSIGN` itself stayed as the email of an
  automatic editor assignment (`EditorAssigned`), which never passes
  through this form.
- On `main`, `pkp/pkp-lib#12593` moved these messages to task templates
  with the same keys, so the branch is still never reached.

Reach ("code" marks what was read in the code, not reproduced on a
running install):
- Every "Assign Editor" message, from "Assign" and from "Notify" alike:
  the switch runs after both (code; "Assign" reproduced).
- The email log: these emails are logged as `DISCUSSION_NOTIFY`, not
  `EDITOR_ASSIGN`. Nothing on screen filters on either type
  (`PKPEmailController` lists only author email types), so nothing
  visible changes (code).
- The other branches' keys (`COPYEDIT_REQUEST`, `LAYOUT_REQUEST`,
  `INDEX_REQUEST`, `LAYOUT_COMPLETE`, `INDEX_COMPLETE`) match the
  installed templates' keys, and no other code compares a template key
  with `EDITOR_ASSIGN` (code).

## Proposed fix

Add the three per-stage keys to the editor branch of the switch in
`PKPStageParticipantNotifyForm::sendMessage()`, the way
`getEmailVariableNames()` in the same class already groups them
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-message-no-editor-task/fix.diff)):

```diff
         switch ($templateKey) {
+            case 'EDITOR_ASSIGN_SUBMISSION':
+            case 'EDITOR_ASSIGN_REVIEW':
+            case 'EDITOR_ASSIGN_PRODUCTION':
             case 'EDITOR_ASSIGN':
                 $this->_addAssignmentTaskNotification($request, Notification::NOTIFICATION_TYPE_EDITOR_ASSIGN, $user->getId(), $submission->getId());
```

This restores what 3.3 did and keeps what `pkp/pkp-lib#5716` was for
(one "Assign Editor" letter per stage). OPS needs no change of its own:
its one key is in the list. It also logs these emails as
`EDITOR_ASSIGN` again. `EDITOR_ASSIGN` stays in the list to match
`getEmailVariableNames()`; it is harmless, as no message offered here
carries it.

Tried on `main` on the three apps: with the fix in, Minoti Inoue's
"Tasks" list gains the editor task as well as the discussion's entry.
A control run assigns her with the stage's plain "Discussion (…)"
message instead, and she gets only the discussion's entry, with the fix
in and out.

**Alternatives:**
- Match on a key prefix (`str_starts_with($templateKey,
  'EDITOR_ASSIGN')`). Shorter, but it would also catch any future key
  that starts that way, and the class names its keys one by one
  elsewhere.
- Drop the dead branch and the notice type, making the discussion's
  entry the only task. That is a product decision against 3.3's
  behaviour and the other predefined messages that ask for work.

**What goes with it:**
- No data repair: past assignments simply have no such task, and adding
  them now would only clutter "Tasks".
- The same change applies as written to `stable-3_5_0` and
  `stable-3_4_0`, which have the same switch and the same keys (three
  on OJS and OMP, `EDITOR_ASSIGN_PRODUCTION` on OPS).
- A test: the U35 e2e scenario that assigns an editor with "Assign
  Editor" already reads the new editor's "Tasks"; it would check for
  this entry.

Small: three case labels in one method, and a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-message-no-editor-task/walk.js)
  takes the Steps on the three apps, on an install freshly reset to the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assign-editor-message-no-editor-task/walk.js`.
  It also reads Minoti Inoue's `NOTIFICATION_TYPE_EDITOR_ASSIGN` rows
  in the database: none without the fix, one with it
  (`NOTIFICATION_LEVEL_TASK`).
- Control run: [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-message-no-editor-task/neighbour.js)
  takes the same Steps with "Discussion (Submission)", "Discussion
  (Review)" and "Discussion (Production)"; no editor task with the fix
  in or out.
- Reproduced on PostgreSQL, the default dataset of pkp/datasets
  `38ab955` (2026-09-30). MySQL not checked; the fault does not depend
  on the database. On OPS `main` choosing "Assign Editor" answers a
  server error and leaves "Message" empty; that is the separate report
  [U35-OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OPS2-ops-assign-editor-message-empty.md),
  and the typed message was sent all the same.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794c`
  and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`), the form identical in
  both lib/pkp commits; `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00d`, OPS `cf4fce69bd` (lib/pkp `a9c76aed62`);
  `stable-3_4_0` OJS `9571d8fde7`, OMP `0aec65441f`, OPS `acd8ae704b`
  (lib/pkp `df13621c2d`); `stable-3_3_0` OJS `9fdb9bcf9a`, OMP
  `8e72fc8836`, OPS `c5532e2161` (lib/pkp `d446601ebe`).
- The Summary's reach, from the code on `main`:
  `NOTIFICATION_TYPE_EDITOR_ASSIGN` is raised only in
  `sendMessage()`'s `EDITOR_ASSIGN` branch (lib/pkp and the three apps
  searched); `execute()` calls `sendMessage()` only when a message is
  typed; the default task templates set no `restrictToUserGroups`, so
  `isTemplateAccessibleToUser()` lets any recipient have "Assign
  Editor"; the apps' `registry/taskTemplates.xml` hold no "Assign
  Editor" template for Copyediting (nor OMP's Internal Review).
- 3.5: the apps' `registry/emailTemplates.xml` key the messages
  `EDITOR_ASSIGN_SUBMISSION`/`_REVIEW`/`_PRODUCTION` on OJS and OMP and
  `EDITOR_ASSIGN_PRODUCTION` on OPS ("Editor Assigned"), as alternates
  to the discussion emails.
- 3.4 (code): lib/pkp `stable-3_4_0` `PKPStageParticipantNotifyForm`
  offers only the stage's discussion email and its alternates in
  `fetch()`, and its switch has only `case 'EDITOR_ASSIGN':`. OJS and
  OMP's `registry/emailTemplates.xml` hold the three per-stage keys,
  OPS's only `EDITOR_ASSIGN_PRODUCTION`, named "Editor Assigned".
- 3.3 (code): lib/pkp `stable-3_3_0` `PKPStageParticipantNotifyForm.inc.php`
  switches on `EDITOR_ASSIGN` and raises `NOTIFICATION_TYPE_EDITOR_ASSIGN`;
  each app's `StageParticipantNotifyForm::_getStageTemplates()` offers
  `EDITOR_ASSIGN` (OJS and OMP on Submission, Review and Production,
  OPS on Production).
- Introduced: `git blame` on `case 'EDITOR_ASSIGN':` gives
  [640018cfbe](https://github.com/pkp/pkp-lib/commit/640018cfbed748456338f03dfc7c3ded72728cb5)
  (`pkp/pkp-lib#7286`, 2022-08-03), written while the form still
  offered `EDITOR_ASSIGN`. 1a7fbb216f (lib/pkp) and 8ff2353b4e (OJS)
  then replaced that offer with the per-stage templates; both are on
  `stable-3_4_0`, neither on `stable-3_3_0`. The OMP and OPS sides of
  the same change are `807511e24` (`pkp/pkp-lib#5716`) and
  `bd2534e095` (`pkp/pkp-lib#8423`).
- Upstream: the open PR `pkp/pkp-lib#13385` (for `pkp/pkp-lib#12593`)
  changes how this method picks its template but not the switch.
- Not reproduced: "Notify" with "Assign Editor"; each stage's "Assign
  Editor" message on more than one app.
