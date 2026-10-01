# Editors' messages typed in "Notify" or "Assign" without a predefined message fail and are not sent

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12842` for `pkp/pkp-lib#12593` · [b3b882bec9](https://github.com/pkp/pkp-lib/commit/b3b882bec95e2d328799f0a3d36724042ff246c4) · 2026-06-01 (merged 2026-08-21) · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12593` (open; fix in PR `pkp/pkp-lib#13385`, not yet in main, which still fails on a press's Internal Review)
- **Tracked in** spec U35 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a3), [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#omp1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In a submission's "Participants" panel, the "Notify" and "Assign
Participant" windows offer a list that reads "Choose a predefined message
to use, or fill out the form below." An editor who leaves the list on its
blank entry and types a message expects it to be sent. Instead the
request fails on the server and nothing on screen says so: after "Notify"
or "OK" the window does not close and still holds the text. "Assign
Participant" assigns the person all the same, but the Activity Log gets
no line for it. No email goes out and no discussion opens.

Choosing a predefined message first gets the message out. A press's
Internal Review offers no predefined message, so no message can be sent
from that stage's "Participants" panel. An editor who picks a predefined
message and then sets the list back to its blank entry meets the same
server failure at that moment, though the text stays.

## Impact

- **Lost:** the typed message; nobody tells the sender it was not sent.
- **Who:** every manager, editor and assistant who writes to a
  participant from the panel without picking a predefined message, on
  every stage; on a press's Internal Review, everyone who writes from
  that panel.
- **Way round:** pick a predefined message, then type over its text. On
  a press's Internal Review, open a discussion from the stage's
  discussions panel ("Add") instead (read in the code). Pressing "OK"
  again on "Assign Participant" fails the same way and makes no second
  assignment; with "Message" emptied, "OK" completes the assignment and
  its Activity Log line, without the message (read in the code).

Medium: the message is lost with a server error and no reason shown, but
every stage has another way to send it; on MySQL the same message is lost
behind a success notice (Observed), which changes how the failure looks,
not who meets it, and would make it high once seen on screen.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS, on PostgreSQL.

The submission, the person to notify and the person to assign:
- OJS: submission 4, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice" (Submission stage);
  "David Buskins"; "Minoti Inoue" as "Section editor".
- OMP: submission 6, "The Information Literacy User’s Guide" (Internal
  Review); "David Buskins"; "Stephanie Berardo" as "Series editor".
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production" (Production); "David Buskins";
  "Minoti Inoue" as "Moderator".

Notify:
1. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`
   (on OPS `dbarnes` is not assigned to submission 1, so it is not in his
   "Assigned to me" list).
2. In "Participants", open David Buskins's "More Actions" menu and
   choose "Notify".
3. Leave "Choose a predefined message to use, or fill out the form
   below." on its blank entry (on the press's Internal Review it has no
   other entry).
4. Type "u35w25 notify" in "Message" and press "Notify".

Assign:
5. In "Participants", press "Assign".
6. Choose the role, search for the person, and choose them.
7. Leave the predefined message list on its blank entry, type "u35w25
   assign" in "Message" and press "OK".
8. Open the submission again, then "Activity Log".

Setting the list back to its blank entry:
9. Open "Notify" on David Buskins's row (OJS and OPS, same submission) or
   on Graham Cox's row (OMP, submission 4, "How Canadians Communicate:
   Contexts of Canadian Popular Culture", Production). Choose the first
   predefined message ("Discussion (…)"), then the blank entry again.

**Expected:** "Notify" and "OK" close the window and send the typed
message: the person receives it by email and a discussion holding it
opens on the stage, as on 3.5. "Assign" also shows "User added as a
stage participant." and the Activity Log lists the assignment. Setting
the list back to its blank entry keeps the text, with no failure.

**Observed:** after "Notify" the window does not close and still holds
the text; no notice shows. After "OK" the "Assign Participant" window
does not close either, with no notice; after step 8 the person is listed
in "Participants", but the Activity Log has no line for the assignment.
No email arrives and no discussion opens. Each request answers 500, step
9's too (the text stays):

```
POST …/grid/users/stage-participant/stage-participant-grid/send-notification?stageId=1&submissionId=4 - Uncaught PDOException:
SQLSTATE[22P02]: Invalid text representation: 7 ERROR:  invalid input syntax for type bigint: ""
(SQL: select * from "edit_task_templates" where "context_id" = 1 and "edit_task_templates"."edit_task_template_id" =  limit 1)
```

`save-participant` and `fetch-template-body` fail with the same error.

On MySQL (read in the code, not walked) the empty id finds no message
instead of failing. "Notify" closes with "Notification sent to users."
and the Activity Log records a message as sent. "OK" closes with "User
added as a stage participant." and the assignment logged. Step 9 keeps
the text. Only the missing email and discussion show the fault.

Control: with a predefined message chosen, "Notify" sends under that
message's name ("Assign Editor") and closes.

## Cause

`PKPStageParticipantNotifyForm::sendMessage()` (lib/pkp
`controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`)
looks the chosen message up by id, `Template::withContextId($contextId)->find($templateId)`,
with whatever the list posted. The blank entry posts an empty string,
and PostgreSQL refuses `''` for the bigint key, so the request fails.
MySQL turns `''` into 0, finds no row, and `sendMessage()` returns early
with nothing sent; `execute()` then logs the message as sent and shows
"Notification sent to users.".

"Notify" posts to `StageParticipantGridHandler::sendNotification()`,
which runs the form. "Assign Participant" posts to `saveParticipant()`.
Its form, `AddParticipantForm`, extends this one. Its `execute()` saves
the assignment first and then calls the parent `execute()`, which sends
the message. When the lookup throws, the rest of `saveParticipant()` is
skipped, and that is where the "User added as a stage participant."
notice and the Activity Log line come from.

The rule it breaks is the list's wording: a predefined message is
optional. "Notify" requires a message. "Assign Participant" does not
(`isMessageRequired()` is false) and sends one only when "Message" holds
text, so it fails only then. Until 3.5, `sendMessage()` fell back to the
stage's own discussion message when nothing was chosen
(`Repo::emailTemplate()->getByKey()`, else the stage mailable's template,
through the `StageMailable` trait, which mapped both review stages to
`DiscussionReview`). The change that turned the discussion emails into
discussion templates (`pkp/pkp-lib#12593`) replaced that lookup with the
id lookup and dropped the fallback.

`StageParticipantGridHandler::fetchTemplateBody()`, which fills
"Message" when an entry is chosen, does the same `find()` with the blank
entry's empty id.

Reach:
- A press's Internal Review: OMP's `registry/taskTemplates.xml`
  (`pkp/omp#2423`) installs no template for that stage, so the list holds
  only the blank entry and every message fails there (walked).
- No other `find()` takes a template id from a form
  (`EditorialTaskController` reads a route segment) (code).

## Proposed fix

Restore the fallback: when no predefined message is chosen,
`sendMessage()` uses the stage's default discussion template, found by
its key the way `installTaskTemplates()` finds it, with both review
stages on `DISCUSSION_NOTIFICATION_REVIEW` as `StageMailable` had it.
`fetchTemplateBody()` skips the lookup for the blank entry and returns
nothing, so the text stays, as on 3.5.
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-without-predefined-not-sent/fix.diff))

```diff
-        $templateId = $this->getData('template');
-        $template = Template::withContextId($context->getId())->find($templateId);
+        $templateId = (int) $this->getData('template');
+        $template = $templateId
+            ? Template::withContextId($context->getId())->find($templateId)
+            : $this->getDefaultTemplate($context->getId());
…
+    protected function getDefaultTemplate(int $contextId): ?Template
+    {
+        $key = match ((int) $this->_stageId) {
+            WORKFLOW_STAGE_ID_SUBMISSION => 'DISCUSSION_NOTIFICATION_SUBMISSION',
+            WORKFLOW_STAGE_ID_INTERNAL_REVIEW, WORKFLOW_STAGE_ID_EXTERNAL_REVIEW => 'DISCUSSION_NOTIFICATION_REVIEW',
+            WORKFLOW_STAGE_ID_EDITING => 'DISCUSSION_NOTIFICATION_COPYEDITING',
+            WORKFLOW_STAGE_ID_PRODUCTION => 'DISCUSSION_NOTIFICATION_PRODUCTION',
+            default => null,
+        };
+
+        return $key ? Template::withKeys([$key], $contextId)->first() : null;
+    }
```

The fix sits in the shared form, so "Notify" and "Assign Participant"
are both covered on every app. The keys are unique per context, and both
a fresh install and the 3.6 upgrade write them. Tried on OJS, OMP and
OPS `main`: the walks send the typed message as "Discussion
(Submission)", "Discussion (Review)" (a press's Internal Review) and
"Discussion (Production)", close the windows, log the assignment, and
keep the text when the list is set back to its blank entry, with no
failure. Two controls behave the same with the fix in and out: a chosen
"Assign Editor" still goes out under its own name, and an empty
"Message" is still refused with "Please ensure that you have filled out
the message field and included someone other than yourself in the
discussion."

**Alternatives:**
- PR `pkp/pkp-lib#13385` looks the default up among the four keys by the
  stage's own id. A press's Internal Review has none, so
  `$template->promote()` runs on null and the message still fails there;
  giving both review stages the review key, as above, is all the PR
  needs for it. The PR also answers the blank entry with an empty body,
  which clears the typed text (`updateTemplate()` writes the body it
  gets; read in the code).
- Sending without a template (a generic, localized discussion title)
  would also cover the cases left out below, but it means reworking
  `sendMessage()` around a mailable that does not come from a template.
- Refusing a message without a predefined one contradicts the list's
  wording and leaves a press's Internal Review with no way to write.

**What goes with it:**
- The fallback can still find nothing usable: when a manager deleted the
  stage's "Discussion (…)" template under Settings › Workflow › "Tasks
  and Discussions", or limited it to user groups the recipient is not in
  (`sendMessage()` checks the template against the recipient). Then
  `sendMessage()` returns early, while `execute()` still logs the message
  as sent and shows "Notification sent to users." Covering both needs
  `sendMessage()` to say whether it sent. Left out here (read in the
  code).
- If a press's Internal Review should offer its predefined messages
  again (3.5 listed "Discussion (Review)" and "Assign Editor" there),
  OMP's registry needs Internal Review entries, with an upgrade step for
  existing presses. That is a separate change; the message goes out
  without it.
- A test: a typed message with the list blank, from "Notify" and
  "Assign Participant", a press's Internal Review included.

Small: a few lines in one shared form and its handler, following a key
lookup the code base already uses.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-without-predefined-not-sent/walk.js)
  takes the Steps on the three apps, signed in as `dbarnes`
  (`node bin/probe.js all shared/playwright/checks/issues/participant-message-without-predefined-not-sent/walk.js`
  on an install freshly reset to the default dataset); the controls are in
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-without-predefined-not-sent/neighbour.js).
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30).
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794c`,
  OPS `c8af945bb7` (lib/pkp `3dc90c81a6`); `stable-3_5_0` OJS
  `92b9a16b48`, OMP `3081c9b00d`, OPS `cf4fce69bd` (lib/pkp
  `a9c76aed62`); lib/pkp `stable-3_4_0` `df13621c2d`, `stable-3_3_0`
  `d446601ebe`.
- 3.5, walked: the same steps send the typed message on all three apps
  (subject "A message regarding {the context's name}"), close both
  windows, log the assignment, and keep the text when the list is set
  back to its blank entry; a press's Internal Review lists "Discussion
  (Review)" and "Assign Editor". Code: `sendMessage()` falls back to the
  stage mailable's template (`StageMailable`, Internal Review on
  `DiscussionReview`).
- 3.4 (code): `sendMessage()` has the same fallback through
  `getStageMailable()`, and `StageMailable` maps Internal Review to
  `DiscussionReview`.
- 3.3 (code): `sendMessage()` builds the email from the typed message
  with `ArticleMailTemplate` / `MonographMailTemplate` and the posted
  key, and opens the discussion without any template lookup by id.
- Introduced: the parent of `b3b882bec9` has the `getByKey()` lookup
  with the stage fallback. OMP's Internal Review gap came with its
  `registry/taskTemplates.xml` in `914b392b10` (`pkp/omp#2423`).
- Upstream: `pkp/pkp-lib#12593` reports the blank-list failure in its
  2026-09-24 comment (it fails on PostgreSQL and sends nothing on MySQL);
  PR `pkp/pkp-lib#13385` read at head `cf72cc78d8`.
- Read in the code, not driven: the MySQL behavior (`find('')` finding
  no row, then `execute()`'s "message sent" log and notice); the
  discussions panel and its "Add" on a press's Internal Review (OMP's
  editorial workflow config in ui-library lists `DiscussionManager` for
  that stage, and its "Add" is offered to managers, sub-editors and
  assistants); a second "OK" on "Assign Participant"
  (`StageAssignment` `build()` returns the existing assignment, then the
  send fails again); the deleted or role-limited default template.
