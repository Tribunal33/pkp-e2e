# The "Assign Editor" message gives the new editor no "You have been assigned as an editor" task

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the message raises the task there)
- **Introduced** `pkp/ojs#3609` and `pkp/omp#1242` for `pkp/pkp-lib#5716` · [8ff2353b4e](https://github.com/pkp/ojs/commit/8ff2353b4e1479db9ec658068265e76e0179657e) (OJS), [807511e244](https://github.com/pkp/omp/commit/807511e2441b7f13dadd588773c41b8f0f972566) (OMP) · 2022-11-03 and 2022-11-07; `pkp/ops#446` for `pkp/pkp-lib#8423` · [bd2534e095](https://github.com/pkp/ops/commit/bd2534e09565f50d8d858566d235dff6fc33c37d) (OPS) · 2023-01-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When an editor assigns a participant, or messages one with "Notify",
and chooses the predefined message "Assign Editor", the person it is
sent to gets no task for the assignment. Their Tasks panel is expected
to gain "You have been assigned as an editor to the submission
"{title}"."; it gains only the discussion row, "{sender} started a
discussion: Assign Editor: {message}".

Only that row is missing: the person is assigned, and the email and the
discussion arrive. The other request messages still give a task beside
their discussion row; "Request Copyedit", for one, gives "You have been
asked to review copyedits for "{title}".".

It was seen on the Submission stage of a journal and a press and on the
Production stage of a preprint server, the only stage a preprint server
offers the message on. The Review and Production stages of a journal or
press have the same fault by the code. On a 3.5 preprint server the
message is listed as "Editor Assigned".

## Impact

- **Lost**: the "You have been assigned as an editor…" row in the
  recipient's Tasks panel. Nothing shows the sender or the recipient
  that a row is missing, and nothing else depends on it.
- **Who**: whoever is sent "Assign Editor", every time; in practice a
  newly assigned Section editor, Series editor or Moderator.
- **Way round**: none is needed. The discussion row sits in the same
  panel and opens the submission.

Low: the assignment and both things that announce it arrive, so no task
fails. It would be medium if the missing row were the recipient's only
notice.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. Nothing else is created.
  OMP, OPS and 3.5 differ only where a bracket says so.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice", on its Submission
   stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4&workflowMenuKey=workflow_1`).
   [OMP: submission 3, "The Political Economy of Workplace Injury in
   Canada". OPS: submission 1, "The influence of lactation on the
   quantity and quality of cashmere production", on Production
   (`workflowMenuKey=workflow_5`).]
3. In "Participants" press "Assign".
4. Choose "Section editor" in the role list [OMP: "Series editor"; OPS:
   "Moderator"], press "Search" and choose "Minoti Inoue".
5. In "Choose a predefined message to use, or fill out the form below."
   choose "Assign Editor" [OPS 3.5: "Editor Assigned"]. [OPS `main`:
   "Message" stays empty, a separate fault; type a line into it.]
6. Press "OK".
7. Sign out, sign in as `minoue` (password `minoueminoue`) and open
   "Tasks" in the page header.

**Expected**: two rows for the submission: the discussion row, and "You
have been assigned as an editor to the submission "Computer Skill
Requirements for New and Existing Teachers: Implications for Policy and
Practice"."

**Observed**: step 6 shows "Notification sent to users." and "User added
as a stage participant." The Tasks panel has the discussion row alone:

```
Daniel Barnes started a discussion: Assign Editor: Dear Minoti Inoue, The following submission has been assigned to you to see through the editorial process. Computer Skill Requirements for New and Existing Teachers: Implications for Policy and...
```

[3.5: the row reads "Daniel Barnes started a discussion: You have been
assigned as an editor on a submission to Journal of Public Knowledge:
Dear Minoti Inoue, …", the email's subject; it is still the discussion
row, and there is no second row.]

Control, on a journal or a press (a preprint server has no Copyeditor
and no "Request Copyedit"): signed in as `dbarnes`, open submission 3,
"The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
Construct Equivalence"
(`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3`),
which opens on Copyediting, the stage it is in [OMP: submission 7,
"Accessible Elements: Teaching Science Online and at a Distance"].
"Assign" with "Copyeditor", "Sarah Vogt" and "Request Copyedit", then
"OK". Signed in as `svogt` (password `svogtsvogt`), "Tasks" has both
rows: the discussion row and "You have been asked to review copyedits
for "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
Construct Equivalence"."

## Cause

`PKPStageParticipantNotifyForm::sendMessage()`
(`lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
line 268 on `main`) decides the extra task by the key of the predefined
message:

```php
switch ($templateKey) {
    case 'EDITOR_ASSIGN':
        $this->_addAssignmentTaskNotification($request, Notification::NOTIFICATION_TYPE_EDITOR_ASSIGN, $user->getId(), $submission->getId());
        !$logRepository ?: $logRepository->logMailable(SubmissionEmailLogEventType::EDITOR_ASSIGN, $mailable, $submission);
        break;
    case 'COPYEDIT_REQUEST':
        …
    default:
        !$logRepository ?: $logRepository->logMailable(SubmissionEmailLogEventType::DISCUSSION_NOTIFY, $mailable, $submission);
```

No predefined message has the key `EDITOR_ASSIGN` any more. The "Assign
Editor" messages are `EDITOR_ASSIGN_SUBMISSION`, `EDITOR_ASSIGN_REVIEW`
and `EDITOR_ASSIGN_PRODUCTION` (each app's `registry/taskTemplates.xml`
on `main`, `registry/emailTemplates.xml` on 3.5 and 3.4), so they take
the `default` branch: no task, and the email is logged as a discussion
message instead of an editor assignment.

The task came with `pkp/pkp-lib#2082` (2017). At that time the entry
"Assign Editor" in the window's predefined-message list had the key
`EDITOR_ASSIGN`. `pkp/pkp-lib#5716` replaced
that entry with one message per stage in OJS's and OMP's registries and
left this `switch` as it was. OPS kept `EDITOR_ASSIGN` as its Production
message until `pkp/pkp-lib#8423` renamed it to
`EDITOR_ASSIGN_PRODUCTION`. `EDITOR_ASSIGN` is now the key of the
automated "Editor Assigned" email only, which this form never sends.

`pkp/pkp-lib#2082` tied the task to the message, not to the
assignment: its commit, "add a task when an editor is asked to see through a
submission", is three lines in this `switch`. The issue itself holds
only a link to a forum thread, so this is as far as it shows what was
asked. An editor assigned with another message, with none, or
automatically on submission got no such task on 3.3 either: this
`switch` is the only place that raises it there too (in the code).

Reach:

- "Assign" with the message, on the Submission stage (OJS, OMP) and on
  Production (OPS), `main` and 3.5: on screen.
- The Review and Production stages' "Assign Editor" on OJS and OMP, and
  "Notify" on a participant's row, which is the same form and method:
  in the code, not driven.
- Nothing else raises `NOTIFICATION_TYPE_EDITOR_ASSIGN`. A search of
  pkp-lib, the three apps and ui-library finds the constant, the two
  `case`s in `PKPNotificationManager` that give the task's text and
  its address, and this one call. So the text
  `notification.type.editorAssign` is unreachable today.
- The email log: an "Assign Editor" letter is stored with the event
  type `DISCUSSION_NOTIFY` instead of `EDITOR_ASSIGN`. The only other
  writer of `EDITOR_ASSIGN` is `SubEditorsDAO::assignEditors()`, for
  the automated "Editor Assigned" email. No code reads either type
  back to decide anything (in the code).
- Out of scope, `main` only: "Add" on a stage's discussions panel can
  start a discussion from the same templates
  (`EditorialTaskController`, the route
  `tasks/fromTemplate/{templateId}`). That path has no `switch` on the
  key: it raises no assignment task for any template, "Request
  Copyedit" included, and logs every email as `DISCUSSION_NOTIFY`. It
  never raised these tasks, so it is not part of this regression (in
  the code, not driven).
- An install upgraded to `main` keeps the three keys:
  `I12593_EmailToTaskTemplates` copies each email key into the new
  template's `key` (in the code, not driven).
- 3.4: `sendMessage()` has the same `switch`. OJS's and OMP's
  registries have the three per-stage rows and OPS's has one,
  `EDITOR_ASSIGN_PRODUCTION` (in the code). 3.3: the window offers
  `EDITOR_ASSIGN` (`StageParticipantNotifyForm::_getStageTemplates()`)
  and the `switch` matches it (in the code).

## Proposed fix

Name the three keys in the `switch`, the way `getEmailVariableNames()`
in the same class does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-message-gives-no-task/fix.diff)):

```diff
         switch ($templateKey) {
+            case 'EDITOR_ASSIGN_SUBMISSION':
+            case 'EDITOR_ASSIGN_REVIEW':
+            case 'EDITOR_ASSIGN_PRODUCTION':
             case 'EDITOR_ASSIGN':
                 $this->_addAssignmentTaskNotification($request, Notification::NOTIFICATION_TYPE_EDITOR_ASSIGN, $user->getId(), $submission->getId());
```

`getEmailVariableNames()` lists the four keys together since
`pkp/pkp-lib#8973`. This `switch` is the one place in the form behind
"Assign" and "Notify" that maps a message to its task, so both windows
are covered on every stage. The fix restores what 3.3 did and keeps the
task tied to the message: it does not move the task to the assignment,
and it does not touch the discussions panel's "Add" (Reach).

Tried on `main` on the three apps: the Steps then show the Expected,
the second row "You have been assigned as an editor to the submission
"{title}".", and still one email. With the fix in and out, "Request
Copyedit" gives its two rows, and "Notify" with "Discussion
(Submission)" [OPS: "Discussion (Production)"] gives the discussion row
and no "assigned as an editor" row.

**Alternatives**

- Remove the task instead: delete the `EDITOR_ASSIGN` case, the
  constant and `notification.type.editorAssign`, if the team finds the
  discussion row enough. It settles the dead code but takes back what
  `pkp/pkp-lib#2082` asked for, and leaves the three other request
  messages with a task this one lacks. Not tried.
- Match by prefix (`str_starts_with($templateKey, 'EDITOR_ASSIGN')`).
  Shorter, but `switch` on whole keys is how this method and
  `getEmailVariableNames()` read, and a prefix would also catch a key
  added later for another purpose.

**What goes with it**

- The email log: "Assign Editor" letters are stored as
  `SubmissionEmailLogEventType::EDITOR_ASSIGN` again, as on 3.3, the
  type the automated email from `SubEditorsDAO` also has. Entries
  already stored as `DISCUSSION_NOTIFY` stay; no repair is
  proposed.
- The task goes to whoever the message is sent to, once per person and
  submission (`_addAssignmentTaskNotification()` skips an existing
  one). Like the copyedit and layout tasks, nothing clears it but the
  person's own "Delete" in the Tasks panel; whether those tasks should
  clear themselves is an open question of its own, not part of this
  fix.
- No API or hook changes.
- Backport: 3.5 and 3.4 have the same `switch`; the three lines apply
  there. Not tried there.
- Guard: an e2e scenario in spec U35 that sends "Assign Editor" and
  reads the recipient's Tasks panel for both rows.

Small: one method, no stored data to repair and nothing an API client
or plugin relies on.

## Evidence

- The kept script takes the Steps, the control, and the "Notify" check
  named under the fix (the script's `neighbour` step):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-message-gives-no-task/walk.js).
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assign-editor-message-gives-no-task/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/assign-editor-message-gives-no-task/fix.diff ojs omp ops`,
  the same walk, then `revert`. The script's `control` ("Request
  Copyedit") and `neighbour` steps were walked with the fix in and out.
- The walks ran on PostgreSQL; the fault does not depend on the
  database. Datasets: pkp/datasets
  c657990 (2026-10-01).
- The Tasks row in Observed ends at the "..." where the panel itself
  cuts the message; the submission's title, which the panel prints
  after it, is left out.
- OPS `main`: choosing "Assign Editor" left "Message" empty (the request
  answered 500), the fault reported in
  [U35-OPS2-preprint-assign-editor-message-not-filled.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OPS2-preprint-assign-editor-message-not-filled.md);
  the walk typed a line there, as the Steps say.
- Code reads. `main`: `sendMessage()`, `getEmailVariableNames()` and
  `_addAssignmentTaskNotification()`; each app's
  `registry/taskTemplates.xml`; `PKPNotificationManager` (the task's
  link and sentence); a search for `NOTIFICATION_TYPE_EDITOR_ASSIGN`
  and for the two email log types; `I12593_EmailToTaskTemplates`; `EditorialTaskController`
  (`fromTemplate()` and the block that mails and logs a new
  discussion); `SubEditorsDAO::assignEditors()`. 3.5:
  the `switch` (line 259) and the three apps' `registry/emailTemplates.xml`
  rows. 3.4 (`stable-3_4_0`): the `switch`, `fetch()` (the list is the
  stage's discussion template and those `alternateTo` it) and the
  registry rows, three in OJS and OMP, `EDITOR_ASSIGN_PRODUCTION` in
  OPS. 3.3 (`stable-3_3_0`): `PKPStageParticipantNotifyForm.inc.php`
  (the `switch`) and each app's
  `StageParticipantNotifyForm::_getStageTemplates()`.
- Introduced: `git log -S'EDITOR_ASSIGN_SUBMISSION' -- registry` gives
  OJS 8ff2353b4e and OMP 807511e244, which replace the row
  `EDITOR_ASSIGN` with the three per-stage rows; pkp-lib's 1a7fbb216f
  (pull request `pkp/pkp-lib#8407`, for the same issue
  `pkp/pkp-lib#5716`) made the window
  list the registry's `alternateTo` rows instead of a fixed list. OPS's
  864f177d21 of that set kept `EDITOR_ASSIGN` as the Production
  stage's message, and bd2534e095 renamed it. All are on `stable-3_4_0`
  and none on `stable-3_3_0`. The task itself: pkp-lib 0449ca1498
  (`pkp/pkp-lib#2082`, 2017).
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library):
  "assigned as an editor" with "task"; "assign editor task notification
  participant"; "editor assigned no task tasks panel";
  `NOTIFICATION_TYPE_EDITOR_ASSIGN`; `EDITOR_ASSIGN_SUBMISSION`;
  `notification.type.editorAssign`. Read and not the same fault:
  `pkp/pkp-lib#2082` (the request that added the task, closed),
  `#12716` (an error in the Tasks panel for a task made from a
  template, closed), `#7031` (a new letter for recommend-only editors,
  open), `#13287` (the "Assign" form fails for a template without a
  name, open).
- Not driven: "Assign Editor" on the Review and Production stages of a
  journal or press; "Notify" with "Assign Editor"; a discussion started from "Assign
  Editor" with the discussions panel's "Add"; "Ready for
  Production" and "Index Requested", whose keys `LAYOUT_REQUEST` and
  `INDEX_REQUEST` the `switch` matches (in the code); an install
  upgraded from 3.5.
- Tips: OJS `main` 4408b94def with lib/pkp f5bd392a69; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  `stable-3_5_0` OJS 4fca1027f4, OMP c7b45f88ea, OPS 8eaf899468 with
  lib/pkp 1fb843f491; `stable-3_4_0` OJS 9571d8fde7 with lib/pkp
  30303e536a, OMP 0aec65441f and OPS acd8ae704b with lib/pkp
  df13621c2d; `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc8836, OPS
  c5532e2161 with lib/pkp d446601ebe.
