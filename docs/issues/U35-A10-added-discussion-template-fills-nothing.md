# A discussion template added in Settings fills nothing in "Notify" or "Assign", and sending it fails

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no discussion templates)
  - 3.4: none (code; no discussion templates)
  - 3.3: none (code; no discussion templates)
- **Introduced** `pkp/pkp-lib#12842` for `pkp/pkp-lib#12593` · [30693f9e21](https://github.com/pkp/pkp-lib/commit/30693f9e21b4a4463a2e1604fffb7d5c52022ebe) · 2026-08-03 (merged 2026-08-21) · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12593` (open). Its follow-up PR `pkp/pkp-lib#13385` (open, read at head cf72cc78d8 on 2026-10-01, not yet in main) fixes this fault with the same one-word change proposed here, among other changes
- **Tracked in** spec U35 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The app fails on the server when an editor sends a message from a
submission's "Participants" panel with a discussion template that the
journal added in Settings › Workflow › "Tasks and Discussions". The
"Notify" and "Assign" windows list the template. Choosing it leaves the
message box empty. Pressing "Notify" or "OK" leaves the window open and
shows no error. No email goes out, but an empty discussion named after
the template is added to the stage on every try, and it stays there
until someone deletes it.

The way round is to choose a template that came with the install, such
as "Discussion (Production)", and type the text. The stage's "Tasks &
Discussions" panel also works: its "Add" window fills and sends the same
template.

Every template added in Settings fails like this, on every stage.
Templates limited to some roles have a second fault of their own,
reported separately.

## Impact

- **Lost.** The message is not sent, and the sender is not told. In
  "Assign", the person is still assigned; only the message is lost.
- **Who.** Every editor or assistant who picks a journal-added template
  in the Participants panel. Templates that came with the install work.
  Typing the text with no template chosen does not help here, because
  that path fails too
  ([U35-A3-OMP1-participant-message-without-predefined-not-sent.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A3-OMP1-participant-message-without-predefined-not-sent.md)).
- **Way round.** Yes, two (see Summary). The empty discussions pile up
  until they are deleted by hand.

Medium: talking to the others on a submission is a core task, and here
it fails with nothing shown and leaves junk discussions behind. It is
not higher because there are two ways round on screen. It would be high
if the "Tasks & Discussions" panel did not offer the template either.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`. Per app, the
submission at Production and its author:

- OJS: submission 5, "Genetic transformation of forest trees", author
  Diaga Diouf (`ddiouf`)
- OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", author Bart Beaty (`bbeaty`)
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production", author Carlo Corino (`ccorino`)

1. Sign in as `dbarnes`.
2. Open Settings › Workflow › "Tasks and Discussions".
3. In the "Production Stage" row, press "Add template".
4. Enter "u35w26 Proof questions" as the name. Type "Please check the
   proofs." in the text box under the "Discussion" heading. Leave
   "Enter task information" unticked and "Mark as unrestricted" chosen,
   then press "Save".
5. Open the submission at its Production stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`
   on OJS).
6. In "Participants", open the author's "More Actions" menu and choose
   "Notify".
7. In "Choose a predefined message to use, or fill out the form below.",
   choose "u35w26 Proof questions".
8. If "Message" is still empty, type "Hello" in it. Press "Notify".
9. Reload the page and look at "Production Tasks & Discussions".

**Expected:** after step 7, "Message" reads "Please check the proofs.",
so step 8 sends that text unchanged. The window closes with
"Notification sent to users.". The author receives an email with the
subject "u35w26 Proof questions" and the body "Please check the
proofs.". The discussion "u35w26 Proof questions" holds the same text.

**Observed:** after step 7, "Message" stays empty. After step 8 (with
"Hello" typed) the window stays open, and no notice or error appears.
No email is sent. After step 9, "In progress" lists "u35w26 Proof
questions", created by the author, with no message in it. Both requests
answer 500 with an empty body:

```
POST …/grid/users/stage-participant/stage-participant-grid/fetch-template-body?stageId=5&submissionId=5   500
POST …/grid/users/stage-participant/stage-participant-grid/send-notification?stageId=5&submissionId=5     500
```

The PHP error log has, for each:

```
Uncaught TypeError: PKP\controllers\grid\users\stageParticipant\form\PKPStageParticipantNotifyForm::getEmailVariableNames(): Argument #1 ($emailKey) must be of type string, null given
#0 lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php(224): …->getEmailVariableNames(NULL)
```

Control: the same steps with the installed "Discussion (Production)"
fill "Please enter your message.", send the email and add the
discussion with that text.

## Cause

`PKPStageParticipantNotifyForm::getEmailVariableNames(string $emailKey)`
accepts only a string. Both of its callers now pass a discussion
template's `key`, and that key is null for every template added in
Settings. Passing null to a `string` parameter throws a `TypeError`.

The key is null by design. `edit_task_templates.key` is nullable
("Indicates the unique key of the default template"), and
`PKPEditTaskTemplateController::add()` never sets it. b5f25158c2 ("Move
key to primary table as a mandatory attribute") made `key` required
only in the installed templates' XML (`dtd/taskTemplates.dtd`). It left
the column nullable for templates added in Settings.

The two callers:

- `StageParticipantGridHandler::fetchTemplateBody()` runs when the
  template is chosen. It builds its answer with
  `$notifyForm->getEmailVariableNames($templateKey)`, so it fails before
  returning the text.
- `PKPStageParticipantNotifyForm::sendMessage()` runs on "Notify" or
  "OK". It reads the key at line 223 and calls the method at line 224.
  By then it has already created the `EditorialTask` and its
  participants, but not yet the head note or the email. That is why an
  empty discussion is left behind.

The method only maps the installed templates' keys to the extra
variables a message may use. Any other key gets `[]`, so null needs no
handling beyond the type.

How it came in: pkp/pkp-lib#12593 moved the panel's predefined messages
from email templates, which always have a key, to discussion templates.
Its first commit, b3b882bec9, looked the key up from the template's
title and fell back to `''`. 30693f9e21 ("Add email key to task
templates") replaced that lookup with `$template->emailKey`, an optional
setting that is null when absent. b5f25158c2 then added the nullable
`key` column, and dfe1a5a675 switched both callers to `$template->key`.
On 3.5 the list holds the stage's email template and its alternates,
which all have a key, so a journal's own messages could be sent from
this panel.

Reach:

- "Assign" in the Participants panel uses the same list and the same two
  requests, since `AddParticipantForm` extends the notify form. Its
  `execute()` saves the assignment before the parent form sends the
  message. That is why the person is assigned while the message fails
  (code; seen on screen on 2026-09-22 and recorded in the
  [register entry](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a10),
  not walked for this report).
- The stage's "Tasks & Discussions" "Add" window is not affected. It
  fills and saves the same template through the API (seen on screen on
  2026-09-23, not walked for this report).
- Templates limited to some roles fail before this point, in
  `Repository::isTemplateAccessibleToUser()`. That is a different cause
  with its own report,
  [U35-A10-role-limited-discussion-template-fails.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A10-role-limited-discussion-template-fails.md).
  A role-limited template added in Settings needs both fixes.
- Stored data: each failed send leaves an `edit_tasks` row with no note.
  They can be deleted on screen, so no repair script is needed.

## Proposed fix

Let `getEmailVariableNames()` take a template without a key
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-discussion-template-fills-nothing/fix.diff)):

```diff
-    public function getEmailVariableNames(string $emailKey): array
+    public function getEmailVariableNames(?string $emailKey): array
```

The fix goes in the method rather than in its two callers, so both are
covered. The method's `switch` already returns `[]` for any unknown
key. The `switch ($templateKey)` further down in `sendMessage()` (line
268) already sends null to its `default` branch (`DISCUSSION_NOTIFY` in
the email log). No other caller exists in pkp-lib or the three apps.

Tried on `main` in OJS, OMP and OPS:

- Choosing "u35w26 Proof questions" filled "Please check the proofs.".
- "Notify" closed the window with "Notification sent to users.".
- The author received the email "u35w26 Proof questions" from
  `dbarnes`, and the discussion held the text.
- The installed "Discussion (Production)" still filled and sent as
  before.

**Alternatives**

- Give templates added in Settings a generated key on save. That adds
  meaning to a column kept for the installed templates, and the method
  still could not take a template without a key.
- Cast at each caller (`$template->key ?? ''`). That covers today's two
  callers but not a future one.

**What goes with it**

- A unit test on `getEmailVariableNames(null)`, and an e2e check that
  sends a template added in Settings from "Notify" (a **Planned** item
  in U35).
- Optional: the form could create the `EditorialTask` only after the
  steps that can still fail, so that a later failure leaves no empty
  discussion. This fault does not need it.

Small: one type in one method, plus a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-discussion-template-fills-nothing/walk.js)
  takes steps 1–9 and then the control on a fresh load of the default
  dataset. Its helpers are in
  [common.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-discussion-template-fills-nothing/common.js).
  It was walked with the fix out and with it applied. Command:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/added-discussion-template-fills-nothing/walk.js`.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), OJS, OMP and OPS on `main`. The
  `TypeError` does not depend on the database, so MySQL was not checked.
- Branch tips: OJS `main` bade233f73 (lib/pkp 2e377d27fc), OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7 (both lib/pkp 3dc90c81a6). 3.5:
  OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp a9c76aed62).
- 3.5, 3.4 and 3.3 were read in the code, not walked: they have no
  discussion templates (no `classes/editorialTask/`). In 3.5
  (`checkouts/stable-3_5_0`) and 3.4 (`origin/stable-3_4_0`),
  `sendMessage()` passes `$template->getData('key')` from an email
  template. 3.3's `getEmailVariableNames($emailKey)` is untyped.
- Introduced: found by `git blame` on line 223, then `git log` on the
  form back to 30693f9e21, as in the Cause. All four commits are in PR
  `pkp/pkp-lib#12842`.
- Not walked: "Assign" (see Reach).
