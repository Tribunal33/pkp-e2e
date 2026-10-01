# A message template added in Settings is offered on "Notify", but fills nothing and cannot be sent

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no "Tasks and Discussions" templates)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12842` for `pkp/pkp-lib#12593` · [30693f9e21](https://github.com/pkp/pkp-lib/commit/30693f9e21b4a4463a2e1604fffb7d5c52022ebe) · committed 2026-08-03, merged 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12593` (open; fix in PR `pkp/pkp-lib#13385`, open without a GitHub review on 2026-10-01, not yet in main)
- **Tracked in** spec U35 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A discussion template that a manager added under Settings › Workflow ›
"Tasks and Discussions" cannot be used from the Participants panel. The
editor is shown no error, while the request behind each action fails on
the server. Choosing the template in "Choose a predefined message…" on
"Notify" leaves "Message" empty. Pressing "Notify" with a typed message
leaves the window open and sends no email.

Each press of "Notify" still adds a discussion named after the template
to the stage's discussions panel, with the editor and the recipient as
participants and no message in it.

The failure follows the template that is chosen, not the text. The same
typed text is sent when one of the installed templates, such as
"Discussion (Production)", is chosen instead. Every template added on
the Settings screen fails, on every stage and whoever it is sent to.

## Impact

- **Lost**: the template's text never reaches "Message", and the typed
  message is not sent. It stays in the open window. Each attempt leaves
  an empty discussion on the submission, with both people as its
  participants.
- **Who**: every editor, section editor or assistant who picks an added
  template on "Notify", in any stage. "Assign" offers the same list and
  sends through the same code when a message is typed; it was read in
  the code and not tried on screen.
- **Way round**: choose an installed template in the same list and type
  the text again. The added template's own text has to be retyped too,
  since it never fills in.

Medium: an added template always fails and nothing on screen says so,
but the retyped message goes out under an installed template. It would
be high if the installed templates failed as well.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Nothing
  else.
- [OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", Bart Beaty's row (Author). OPS: submission 1, "The
  influence of lactation on the quantity and quality of cashmere
  production", Carlo Corino's row (Author). The "Production Stage"
  group, the "Production" stage and the "Participants" panel with
  "Notify" read the same in the three apps.]

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open Settings › Workflow and press the "Tasks and Discussions" tab.
3. In the "Production Stage" group press "Add template".
4. Type the Name "u35r2 proofs note". Type "u35r2 proofs are ready"
   into the editor under the "Discussion" heading. Do not choose "Limit
   access to specific roles", and leave "Enter task information" and
   "Automatically add this task and/or discussion when a submission
   reaches the stage" unticked. Press "Save".
5. Open submission 5, "Genetic transformation of forest trees", and its
   "Production" stage.
6. Under "Participants", open "More Actions" on Diaga Diouf's row and
   press "Notify".
7. In "Choose a predefined message to use, or fill out the form below."
   choose "u35r2 proofs note".
8. Type "u35r2 hello" into "Message" and press the "Notify" button at
   the bottom of the window.
9. Open the page again and look at "Production Tasks & Discussions".

**Expected:** step 7 puts "u35r2 proofs are ready" into "Message". Step
8 closes the window with the notice "Notification sent to users.", the
panel lists a discussion "u35r2 proofs note" holding "u35r2 hello", and
`ddiouf@mailinator.com` gets an email with the subject "u35r2 proofs
note".

**Observed:** step 7 leaves "Message" empty. Step 8 leaves the window
open, with the choice and "u35r2 hello" still in it, and shows no
notice. No email arrives. In step 9 the panel lists a discussion "u35r2
proofs note" whose window names Daniel Barnes and Diaga Diouf as
participants and holds no message. Both requests answer 500 with an
empty body; the PHP error log has the reason:

```
POST …/$$$call$$$/grid/users/stage-participant/stage-participant-grid/fetch-template-body?stageId=5&submissionId=5  500
POST …/$$$call$$$/grid/users/stage-participant/stage-participant-grid/send-notification?stageId=5&submissionId=5  500

PHP Fatal error:  Uncaught TypeError: PKP\controllers\grid\users\stageParticipant\form\PKPStageParticipantNotifyForm::getEmailVariableNames(): Argument #1 ($emailKey) must be of type string, null given, called in lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php on line 615
PHP Fatal error:  Uncaught TypeError: …getEmailVariableNames(): Argument #1 ($emailKey) must be of type string, null given, called in lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php on line 224
```

Control: "Discussion (Production)" chosen in the same window fills
"Please enter your message.", and "Notify" with a typed message closes
the window, opens the discussion with the message and sends the email.

## Cause

A template's `key` names the installed template it came from
(`DISCUSSION_NOTIFICATION_PRODUCTION`, `LAYOUT_REQUEST`, …). The column
is nullable, "Indicates the unique key of the default template", and
`PKPEditTaskTemplateController::add()` creates a template without one.
So every template added on the Settings screen has `key` null.

The two places that use a template from the Participants panel pass
that key to
`PKPStageParticipantNotifyForm::getEmailVariableNames(string $emailKey)`,
which does not accept null:

- `StageParticipantGridHandler::fetchTemplateBody()` (line 615), when a
  predefined message is chosen;
- `PKPStageParticipantNotifyForm::sendMessage()` (line 224), on "Notify"
  and on "OK" of "Assign".

`sendMessage()` reaches that line after it has created the discussion
and its two participants, and before it writes the message, the
notification and the email. That is why the empty discussion is left
behind.

Until 30693f9e21 both callers started from `$templateKey = ''` and
looked the key up by the template's title, so a template without a
match passed an empty string. That commit added the key to the template
and replaced the lookup with `$templateKey = $template->emailKey`
(renamed `$template->key` in dfe1a5a675), which is null for an added
template.

Reach:

- "Notify" on the three apps: checked on screen.
- "Assign": choosing an added template fails there as on "Notify" and
  leaves "Message" empty. `AddParticipantForm::execute()` inserts the
  assignment and then calls `PKPStageParticipantNotifyForm::execute()`,
  which calls `sendMessage()` only when "Message" is not empty. So "OK"
  with the box left empty assigns the person as usual. With a message
  typed, the person is assigned, the server error follows, and
  `saveParticipant()` never reaches its own log entry and notice (read
  in the code).
- A template carried over by the 3.6 upgrade from an email template
  that was added under "Discussion (…)" gets that added email
  template's own key (`I12593_EmailToTaskTemplates`), so it is not
  affected (read in the code).
- A template added with "Limit access to specific roles" fails earlier,
  on the access check
  ([U35-A10-role-limited-message-template-not-sent.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A10-role-limited-message-template-not-sent.md));
  with that fixed it reaches this fault (read in the code).
- The "Add" window of a stage's "Tasks & Discussions" panel reads
  templates through the REST API and never calls this method (read in
  the code).

## Proposed fix

Let `getEmailVariableNames()` accept a template without a key
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-message-template-not-sent/fix.diff)):

```diff
-    public function getEmailVariableNames(string $emailKey): array
+    public function getEmailVariableNames(?string $emailKey): array
```

A null key matches none of the method's cases, so it returns no
variables. The `switch ($templateKey)` further down in `sendMessage()`
takes its `default` branch and logs the email as a discussion message.
No other class calls or overrides the method. PR `pkp/pkp-lib#13385`
carries the same line, among its changes for the two other failures
reported on `pkp/pkp-lib#12593`.

It was tried on the three apps: the steps then gave the Expected result
(the text filled in, the window closed with "Notification sent to
users.", the discussion with its message, the email). The installed
templates behaved as without the fix: "Discussion (Production)" sent,
and "Ready for Production", one of the letters that have a key, still
showed its recipient placeholder as the "NAME" tag in "Message".

The fix leaves one gap, for an added template that holds placeholders.
The Settings editor's "Insert Content" offers `{$recipientName}` and
`{$submissionTitle}` among others. With the fix, a template holding
both put the submission's title into "Message" and left
`{$recipientName}` as typed. The discussion's message kept it as
typed; the email carried the recipient's name (walked on the three
apps). The installed letters name their recipient placeholders in this
method, which is what fills them in the discussion. An added template
has no such list.

**Alternatives**

- `$template->key ?? ''` at both callers: the same effect in two places,
  and the next caller has to remember it.
- Give every added template a generated key in
  `PKPEditTaskTemplateController::add()`: the column would stop telling
  installed templates from added ones, and templates already added
  would need a migration.

**What goes with it**

- The recipient placeholders of an added template: return
  `recipientName` and `recipientUsername` from the method's fall-through
  as well, so that they are filled in the discussion as they are in the
  email. A suggestion, not tried; the PR does not cover it either.
- The empty discussions left by failed attempts stay on their
  submissions. The code is unreleased, so no repair is proposed.
- `sendMessage()` creates the discussion before everything that can
  fail. Running it in a transaction would stop a later failure from
  leaving half a discussion; that is a separate change.
- Guard: an e2e scenario that adds a template in Settings and sends it
  from "Notify" (a Planned item in spec U35).

Small: one parameter type in one method.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-message-template-not-sent/walk.js),
  with its helpers in `lib.js` beside it.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-message-template-not-sent/neighbour.js)
  checks the installed templates ("Discussion (Production)" sent;
  "Ready for Production" chosen on OJS and OMP), with the fix and
  without it.
  [variables.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-message-template-not-sent/variables.js)
  adds a template with the two placeholders through "Insert Content"
  and sends it, with the fix in. On an install freshly loaded from the
  default dataset, from a pkp-e2e checkout (`<feature>` names the
  install's fleet, `<id>` the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/added-message-template-not-sent/walk.js`
- The discussion left in step 9 reads "Created by: ddiouf", the
  recipient. That is a separate known fault of every discussion this
  window opens (spec U35
  [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a5)).
- On OPS the script did not catch the "Notification sent to users."
  notice with the fix in; the window closed, the discussion opened and
  the email arrived there as on the other two.
- Taken on OJS, OMP and OPS `main`, on PostgreSQL. The fault is a PHP
  type error and does not depend on the database. Datasets: pkp/datasets
  c657990 (2026-10-01).
- Not driven: "Assign"; a template carried over by the upgrade; the
  suggested fall-through for recipient placeholders.
- Tips: OJS `main` 4408b94def with lib/pkp f5bd392a69; OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6 (the
  files named here are identical on the two lib/pkp commits);
  `stable-3_5_0` lib/pkp 1fb843f491; `stable-3_4_0` lib/pkp df13621c2d;
  `stable-3_3_0` lib/pkp d446601ebe.
- Code reads:
  - `main`: `PKPStageParticipantNotifyForm::fetch()`, `execute()`,
    `sendMessage()` and `getEmailVariableNames()`;
    `StageParticipantGridHandler::fetchTemplateBody()` and
    `saveParticipant()`; `AddParticipantForm::execute()`;
    `PKPEditTaskTemplateController::add()`; `editorialTask/Template`;
    the `edit_task_templates` table in `SubmissionsMigration` and
    `I12593_EmailToTaskTemplates`.
  - 3.5 and 3.4: no `classes/editorialTask/` templates. The list holds
    the stage's discussion email template and the email templates added
    under it, and `sendMessage()` passes `$template->getData('key')`,
    which every email template has. That is the behaviour this
    regression is measured against; it was read, not walked.
  - 3.3: the list is built from email templates by key, and
    `getEmailVariableNames($emailKey)` has no type.
- Upstream (searched 2026-10-01 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library): `pkp/pkp-lib#12593` (open) is the issue the
  introducing PR belongs to; PR `pkp/pkp-lib#13385` (open, head
  cf72cc78d8, 2026-09-25) changes the same parameter to `?string`.
  `pkp/pkp-lib#13287` (open) is a different fault of the same form on
  3.5: an email template with no name in the journal's language.
