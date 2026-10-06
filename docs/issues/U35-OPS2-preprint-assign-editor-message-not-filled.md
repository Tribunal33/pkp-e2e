# On a preprint server, choosing the predefined message "Assign Editor" leaves "Message" unfilled

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OPS (a server installed or created on `main`)
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ops#1365` for `pkp/pkp-lib#12593` · [cc258a164c](https://github.com/pkp/ops/commit/cc258a164c44d401d4d6c8011ca6216c9b744d36) · merged 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-06)
- **Tracked in** spec U35 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ops2), spec U37 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#ops1)
- **Checked** 2026-10-06 (OPS; the journal and press comparison walks 2026-10-02), each branch's tip (the commits in Evidence)

Update 2026-10-06: `pkp/pkp-lib#13385` is merged, though not yet in the
pkp-lib commit OPS uses, and its code does not change this fault.

## Summary

On a preprint server, the predefined message "Assign Editor" is
installed with no text. A manager or moderator who picks it in the
"Notify" or "Assign Participant" window gets nothing in "Message": the
request that fetches the text fails on the server because the text is
empty, and no error is shown. "Message" keeps what it held before. The
other predefined message, "Discussion (Production)", fills as it should.

With "Message" empty, "Notify" refuses to send and asks for a message.
"OK" on "Assign Participant" assigns the person and sends them nothing;
only "User added as a stage participant." shows.

The same empty text shows in "Tasks & Discussions". Picked in the "Add"
window, "Assign Editor" fills "Name" and leaves "Message" as it was, yet
"Save" answers "This field is required." until something is typed. Under
Settings the template's "Discussion" box is empty, and "Save" is refused
until a text is typed. With "Auto-add at stage" on, each new preprint
gets an "Assign Editor" discussion with no message.

Every preprint server created on `main` is affected: the server of a
new install, and a server added to a site that was upgraded from 3.5.
A server that existed before the upgrade keeps its letter.

## Impact

- **Lost**: the ready letter that tells a newly assigned moderator what
  the preprint is and what to do with it.
- **Who**: a Preprint Server manager or Moderator who assigns or
  notifies someone on a preprint, or adds a discussion, and picks
  "Assign Editor".
- **Way round**: type the message by hand in "Message". A manager can
  also restore the text once for the whole server: edit "Assign Editor"
  under Settings › Workflow › "Tasks and Discussions", type a text and
  save. This way round was walked in the "Add" window, which then fills
  the saved text; for "Notify" and "Assign" it was read in the code.
  It works on preprint servers today: the fault of templates added in
  Settings ([pkp-e2e#315](https://github.com/jardakotesovec/pkp-e2e/issues/315)),
  still present there, does not reach an edited "Assign Editor".

Low: the empty "Message" is in plain view and the letter can be typed
by hand; only the prepared text is missing.

## Steps to reproduce

Preconditions:

- The default dataset generated on OPS `main` (pkp/datasets
  `ops/main`). A 3.5 dataset upgraded to `main` keeps the letter and
  does not show the fault (Cause). Nothing else is created before the
  steps; step 20 submits one preprint.
- A mail catcher the install sends to, to read Minoti Inoue's mailbox
  (`minoue@mailinator.com`) after step 10.
- The PHP error log, or the output of the web server, to read the error
  behind the failed request.

"Notify":

1. Sign in as `dbarnes`.
2. Open submission 1, "The influence of lactation on the quantity and
   quality of cashmere production", on Production
   (`/index.php/publicknowledge/dashboard/editorial?workflowSubmissionId=1&workflowMenuKey=workflow_5`).
3. In "Participants", on David Buskins's row: "More Actions" › "Notify".
4. In "Choose a predefined message to use, or fill out the form below."
   choose "Assign Editor".
5. Press "Notify".
6. Choose "Discussion (Production)", then "Assign Editor" again.
7. Press "Cancel".

"Assign":

8. Press "Assign" in "Participants". Choose "Moderator" in the role
   list, press "Search", and choose "Minoti Inoue".
9. Choose "Assign Editor" in the predefined message list.
10. Press "OK".
11. Reload the page and read "Participants" and "Production Tasks &
    Discussions".

"Add" in "Tasks & Discussions":

12. In "Production Tasks & Discussions" press "Add".
13. Under "Templates to get you started!" press "DISCUSSION - Assign
    Editor".
14. Tick "David Buskins" under "Participants" and press "Save".
15. Press "DISCUSSION - Discussion (Production)", then "DISCUSSION -
    Assign Editor" again.
16. Press "Save", then "Cancel".

The template screen and "Auto-add at stage":

17. Settings › Workflow › "Tasks and Discussions". Under "Production
    Stage", on the "Assign Editor" row: "More Actions" › "Edit".
18. Press "Save", then "Cancel".
19. Tick "Auto-add at stage" on the "Assign Editor" row and answer "Yes"
    in "Confirm Automatic Addition".
20. Sign in as `ccorino`, start "New Submission" and submit a preprint
    with any title and a PDF galley.
21. Sign in as `dbarnes`, open the new preprint and, in "Production Tasks
    & Discussions", press "Assign Editor".

**Expected.** Steps 4, 6 and 9 fill "Message" with the letter: "Dear
…, The following preprint has been assigned to you to see through the
screening process in your role as Moderator. …". Step 5 sends it.
Step 10 closes the window with "Notification sent to users." and "User
added as a stage participant.", Minoti Inoue receives the letter by
email, and a discussion with it is listed. This is what 3.5 does, where
the entry is named "Editor Assigned". Steps 13 and 15 fill "Message"
with the same letter, and step 14 saves the discussion "Assign Editor"
with it as the first message. In step 17 the "Discussion" box holds the
letter, and step 18 saves. The discussion of step 21 opens with the
letter.

**Observed.** Step 4: "Message" stays empty. Step 5: the window stays
open with the notice "Please ensure that you have filled out the
message field and included someone other than yourself in the
discussion.". Step 6: "Message" takes "Please enter your message." from
"Discussion (Production)" and keeps it when "Assign Editor" is chosen.
Step 9: "Message" stays empty. No notice shows at steps 4, 6 and 9.
Each choice of "Assign Editor" sends a request that answers 500 with an
empty body; the error is in the PHP error log:

```
POST /index.php/publicknowledge/$$$call$$$/grid/users/stage-participant/stage-participant-grid/fetch-template-body?stageId=5&submissionId=1 → 500

Uncaught TypeError: PKP\mail\Mailer::compileParams(): Argument #1 ($view) must be of type string, null given
#2 lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php(614)
#3 PKP\controllers\grid\users\stageParticipant\StageParticipantGridHandler->fetchTemplateBody()
```

Step 10: the window closes with "User added as a stage participant."
only. After step 11 "Minoti Inoue, Moderator" is in "Participants", no
discussion is listed and no email about the assignment reached her.
The only mail in her mailbox was the unrelated monthly report
"Preprint Server activity for September, 2026".

Step 13: "Name" reads "Assign Editor" and "Message" stays empty. Step
14: "This field is required." under "Message"; nothing is sent and the
window stays open. Step 15: "Discussion (Production)" fills "Please
enter your message.", and "Assign Editor" then changes "Name" and leaves
that text in the box. Step 16: "Save" again answers "This field is
required." under "Message", which still shows "Please enter your
message.". Each press of a template answers 200, and the page shows no
error.

Step 17: the "Discussion" box is empty. Step 18: "This field is
required." under it. Step 19: "Your changes have been saved.". Step 21:
the panel lists "Assign Editor", "Created by: system", under "In
progress"; its window has no message, only "To add a new message, please
assign yourself as a participant.".

Control, on a journal and a press, each on its default dataset as
`dbarnes`, on the Production stage:

- Journal, submission 5, "Genetic transformation of forest trees":
  "Notify" on David Buskins's row, then "Assign" with the role "Section
  editor" and "Minoti Inoue"; "Add", ticking David Buskins.
- Press, submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture": "Notify" on Graham Cox's row, then "Assign" with the
  role "Series editor" and "Minoti Inoue"; "Add", ticking Graham Cox.

On both, each choice of "Assign Editor" fills "Dear …, The following
submission has been assigned to you to see through the production
stage. …". "OK" shows "Notification sent to users." and "User added as
a stage participant.", Minoti Inoue receives the email "Assign Editor",
and the discussion is listed. In the "Add" window the letter fills and
saves, and the discussion's first message opens "Dear David Buskins,"
(or "Dear Graham Cox,").

## Cause

OPS's `registry/taskTemplates.xml` (line 14) gives the predefined
message a text key that OPS does not have:

```xml
<template title="mailable.editorAssignedManual.name" description="emails.editorAssignProduction.body" key="EDITOR_ASSIGN_PRODUCTION" stageId="WORKFLOW_STAGE_ID_PRODUCTION"/>
```

`emails.editorAssignProduction.body` is defined in OJS's and OMP's
`locale/en/emails.po`, and neither in OPS's locale files nor in
pkp-lib's. The row came with `pkp/ops#1365`, which moved the predefined
messages from email templates to discussion templates and took the key
OJS and OMP use. On 3.5 the same message, `EDITOR_ASSIGN_PRODUCTION` in
OPS's `registry/emailTemplates.xml`, takes its text from
`emails.editorAssign.body`, which OPS has.

`PKP\editorialTask\Repository::installTaskTemplates()` translates each
registry key with a missing-key handler that returns an empty string, so
an install stores "Assign Editor" with an empty description in every
language and reports nothing.

`StageParticipantGridHandler::fetchTemplateBody()` (line 614 in pkp-lib
a7f5e3081b, the commit OPS's `lib/pkp` points to; line 622 on pkp-lib
`main`) then
passes the template's description to `Mail::compileParams()` (the Mail
facade, so `PKP\mail\Mailer::compileParams()`). For a
description empty in every language `getLocalizedData('description')`
returns null, and `compileParams(string $view, …)` refuses it with the
`TypeError` above. The window's script
(`StageParticipantNotifyHandler.js`) posts the request with a success
callback only, so a failed request changes nothing on screen.

The "Add" window of "Tasks & Discussions" reads the same template
through `EditorialTaskController::fromTemplate()`, which calls
`Template::promote()`. `promote()` passes the null description as the
task's head note, and `EditorialTask::fill()` makes a head note only
when one is set, so the answer (200) carries no message.
`setValuesFromTemplate()` in ui-library's `useDiscussionManagerForm.js`
(line 253) then sets the form's `description` to
`notes?.[0]?.contents`, which is `undefined`. The form's value is
cleared while the editor keeps showing its earlier text, and the
required field refuses "Save". Auto-add takes the same path:
`PKP\editorialTask\Repository::autoCreateFromTemplates()` saves the
item `promote()` makes, so the discussion has no first message. The
template screen's form (`useTaskTemplateManagerForm.js`) shows the
stored empty description and requires one.

Reach:

- "Notify" and "Assign Participant" on a preprint's Production stage,
  its only stage: walked.
- The "Add" window, the template's "Edit" window under Settings and
  "Auto-add at stage": walked. Step 20 reaches auto-add through
  `PKP\submission\Repository::submit()` (line 687); the other caller,
  `DecisionType::runAdditionalActions()` on a stage change, is reached
  by no OPS decision. Code.
- Why a new server is affected and an upgraded one is not:
  `PKPContextController::add()` calls `installTaskTemplates($context)`,
  which reads the registry row for every server created, whatever the
  site's history, and a language installed later
  (`InstallLanguageForm::execute()`) reads the same row. The upgrade
  (`I12593_EmailToTaskTemplates`) instead copies the 3.5 email
  template's text. Code, and the database (Evidence).
- Every other `title` and `description` key in the three apps'
  `registry/taskTemplates.xml` is defined in that app's or pkp-lib's
  English locale (checked by a search of each key).
- A template can also have no text on any app: the API's rules allow a
  null description (`AddTaskTemplate::rules()`), although the Settings
  form requires one. Such a template fails the same way in
  `fetchTemplateBody()` ("Notify", "Assign") and through `promote()`
  ("Add", auto-add). Read in the code only. On a journal or a press,
  only such a template sends a null to `compileParams()`.
- A template added in Settings has no `key`. On OPS and OJS, whose
  pkp-lib (a7f5e3081b) has `getEmailVariableNames(string $emailKey)`,
  it still fails one line after `compileParams()`
  ([pkp-e2e#315](https://github.com/jardakotesovec/pkp-e2e/issues/315)).
  `pkp/pkp-lib#13385` fixed that on pkp-lib `main`, which OMP uses.
- A text saved for "Assign Editor" in Settings fills "Message"
  afterwards. The Settings form sends `description` as a string,
  `PKPEditTaskTemplateController::update()` passes it to the model, and
  `MultilingualSettingAttribute::set()` stores a string under the
  manager's current language. The template keeps its `key`
  (`UpdateTaskTemplate::rules()` has none), so `EDITOR_ASSIGN_PRODUCTION`
  still reaches `getEmailVariableNames()` as a string and the fault
  above does not apply, and `getLocalizedData('description')` returns
  the saved text, for a reader in another language too.
- `PKPStageParticipantNotifyForm::sendMessage()` sends the text typed in
  "Message" under the template's title and does not read the
  description, so a message typed by hand goes out as typed. Code.

## Proposed fix

Give OPS the English text its registry row already names, and let both
readers of a template treat a missing text as an empty one
([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/fix-ops.diff)
for OPS;
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/fix.diff),
its pkp-lib and ui-library part, for OJS and OMP):

- OPS, `locale/en/emails.po`: a new `emails.editorAssignProduction.body`,
  a copy of `emails.editorAssign.body` that closes with `{$signature}`,
  the sender's signature, instead of `{$contextSignature}`, the closing
  of the automated assignment email ("This is an automated message
  from…"). OJS's and OMP's texts for this key close the same way. The
  registry row stays as it is.
- pkp-lib, `StageParticipantGridHandler::fetchTemplateBody()`:

  ```diff
  -                    'body' => Mail::compileParams($template->getLocalizedData('description'), $mailable->getData()),
  +                    'body' => Mail::compileParams($template->getLocalizedData('description') ?? '', $mailable->getData()),
  ```

- ui-library, `setValuesFromTemplate()` in `useDiscussionManagerForm.js`:

  ```diff
  -		setValue('description', templateData.value.notes?.[0]?.contents);
  +		setValue('description', templateData.value.notes?.[0]?.contents ?? '');
  ```

Only the English text is added, as a developer adds any new string in
PKP: the other languages come through translators on Weblate. Until a
language has it, its stored description is empty and the English
letter is shown, as for French on 3.5, where `emails.editorAssign.body`
has no `fr_CA` text either.

The two guards are part of the fix because a template without text
stays possible after the locale change: the API accepts one, and the
servers already created on `main` keep theirs (below). With them,
picking such a template empties "Message" on every app instead of
failing on the server or leaving the old text in view; "Save" then asks
for a message in a box that is visibly empty.

The locale change, like any registry text, does nothing on a server
already installed: `installTaskTemplates()` reads it when a server or a
language is installed. It was tried by replaying that step for the
test server (Evidence).

Tried on `main`: with the diff in and the stored text still empty,
"Assign Editor" answers 200 and empties "Message" in "Notify" and in the
"Add" window, where "Save" then answers "This field is required." with
the box empty. After the install step was replayed, steps 4, 6, 9, 13
and 15 fill the letter, step 10 shows both notices and Minoti Inoue
receives it, step 14 saves it as the first message, step 17 shows it and
step 18 saves, and the discussion of step 21 opens with it. "Discussion
(Production)" still fills "Please enter your message.", and the
journal's and the press's letters, emails and saved discussions are
unchanged with `fix.diff` in.

Not proposed here: an error shown when the fetch fails. The "Notify"
window's script has no failure handler, so any other failure of this
request stays silent after the fix.

**Alternatives**

- Point the registry row at `emails.editorAssign.body`, the text 3.5
  used for this message
  ([alt-registry-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/alt-registry-ops.diff)):
  one line, and the letter comes back, but closing with "This is an
  automated message from…", the fault
  [U35-A15-assign-editor-email-two-footers.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A15-assign-editor-email-two-footers.md)
  describes. Tried, with the pkp-lib line.
- Require a description in `AddTaskTemplate::rules()`, as the Settings
  form does, instead of the two guards: it changes what the REST API
  accepts and leaves the stored empty texts unhandled.
- Make `installTaskTemplates()` refuse or log a registry key with no
  translation instead of storing an empty text: it would have caught
  this at install. Worth adding; it does not fix the row.

**What goes with it**

- Stored data: no repair is proposed. Only servers installed or created
  on `main` since 2026-08-21 hold the empty text, and `main` is
  unreleased, so these are development and test installs; PKP's
  datasets are regenerated from `main` and pick the text up. With the
  guards, such a server shows an empty "Message" until a manager saves a
  text for the template (the way round) or the server is installed
  again. An upgrade step re-reading the text would be a migration
  written and kept for installs that no site runs.
- `installTaskTemplates()` run again is how the fix was tried, not a
  repair: for a template that exists it merges the registry's texts over
  the stored ones, so it resets the title and description of every
  default template, a manager's edits included, in each language it is
  given.
- U35-A15 proposes the same OPS key for its own symptom; one change
  serves both.
- A test: on a freshly installed preprint server, each predefined
  message of the Production stage fills "Message" in "Notify" and in the
  "Add" window; and a unit test of `fetchTemplateBody()` with a template
  without a description.

Medium: three repos (an English text in OPS, one line each in pkp-lib
and ui-library) and their tests, with no data repair.

## Evidence

- Kept script for steps 1 to 11, and the control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/walk.js),
  in pkp-e2e's harness:
  `PROBE_FEATURE=issues-r7 PROBE_AGENT=r7 node bin/probe.js all shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It presses
  "Cancel" where step 5 presses "Notify"; step 5 is taken by the second
  script's `notifyempty` step.
- Kept script for steps 5 and 12 to 21, the "Add" control and the way
  round:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-template-empty/walk.js)
  (helpers in its `lib.js`):
  `PROBE_FEATURE=issues-u37r6 PROBE_AGENT=u37r6 node bin/probe.js all shared/playwright/checks/issues/preprint-assign-editor-template-empty/walk.js`.
  `STEPS=` names its steps; `notifyempty` and `neighbour` (a fresh "Add"
  window: "Discussion (Production)", then "Assign Editor") run only when
  named; `TAG=` names the preprint and the text it creates. Each group
  of steps was walked on a freshly loaded dataset.
- The fix, tried on 2026-10-02, one app at a time:
  1. `node bin/try-fix.js apply` with `fix-ops.diff` on OPS, `fix.diff`
     on OJS and on OMP (each rebuilds ui-library's JavaScript).
  2. The dataset reloaded; on OPS the second script with
     `STEPS=add,neighbour` and the first with `STEPS=notify`: the guards,
     with the stored text still empty.
  3. [replay-install.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/replay-install.php),
     run from the OPS root with `PKP_CONFIG_FILE` naming the install's
     config. It calls `Repo::editorialTask()->installTaskTemplates()`
     for the site's languages, as `InstallLanguageForm::execute()` does.
  4. The first script whole, then (dataset reloaded, step 3 again) the
     second with `STEPS=add,settings,autoadd,neighbour`; on OJS and OMP
     both scripts as the control.
  5. `node bin/try-fix.js revert` for the same diff.
  The registry alternative was tried on 2026-10-01 the same way, with
  the pkp-lib line beside it. Neither the recommended fix nor the
  registry alternative was tried again on 2026-10-06: the OPS files they
  patch are unchanged since, and the pkp-lib hunk of `fix.diff` applies
  8 lines lower to pkp-lib with `pkp/pkp-lib#13385` (OMP's lib/pkp
  e39fdee199; `patch --dry-run`).
- Walked on `main` and on `stable-3_5_0`, each app on PKP's default
  dataset (pkp/datasets c657990, 2026-10-01), PostgreSQL, as `dbarnes`
  only, step 20 apart (`ccorino`). Walked again on 2026-10-06 on OPS
  only (pkp/datasets 5a53d3d, 2026-10-05): both scripts on `main`
  (the second with `STEPS=add,notifyempty,settings,autoadd,wayround`)
  and on 3.5, each on a freshly loaded dataset, with the same results.
  Mail was read in the test install's mail catcher (Mailpit), and the error in the web server's output.
- Tips on 2026-10-06, `main`: OPS 21e41026b2 (lib/pkp a7f5e3081b,
  which does not hold `pkp/pkp-lib#13385`; lib/ui-library 280f98c5);
  pkp-lib with #13385 read in OMP's lib/pkp e39fdee199.
  `stable-3_5_0`: OPS 38b61882d3 (lib/pkp cf3f984335). `stable-3_4_0`:
  OPS acd8ae704b (lib/pkp 767353f4fe). `stable-3_3_0`: OPS c5532e2161
  (lib/pkp ac3fa73402).
- Tips on 2026-10-01 and 2026-10-02, `main`: OJS 4408b94def (lib/pkp f5bd392a69), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5).
  `stable-3_5_0`: OJS 4fca1027f4, OMP c7b45f88ea, OPS 8eaf899468
  (lib/pkp 1fb843f491). `stable-3_4_0`: OPS acd8ae704b (lib/pkp
  df13621c2d). `stable-3_3_0`: OPS c5532e2161 (lib/pkp d446601ebe).
- 3.5, walked: on OPS the entry is "Editor Assigned"; it fills the
  letter, "OK" shows both notices, and Minoti Inoue receives "You have
  been assigned as a moderator on a submission to Public Knowledge
  Preprint Server". OJS and OMP fill their letters too. 3.5 has no
  discussion templates and no auto-add; its "Add discussion" on OPS's
  "Production Discussions" offers "Editor Assigned", which fills the
  letter (`QueryForm::fetch()` lists the stage's email template and its
  alternates).
- 3.4 and 3.3, code: OPS's `registry/emailTemplates.xml` on
  `stable-3_4_0` gives `EDITOR_ASSIGN_PRODUCTION` the body
  `emails.editorAssign.body`, as 3.5 does, and pkp-lib's
  `QueryForm::fetch()` offers it in "Add discussion"; on `stable-3_3_0`
  OPS's `StageParticipantNotifyForm` offers `EDITOR_ASSIGN` on
  Production with the same body key, and `QueryForm.inc.php` offers no
  predefined messages. `registry/taskTemplates.xml` exists on `main`
  only (`git branch -r --contains cc258a164c`).
- The upgraded server: the `stable-3_5_0` dataset loaded on OPS `main`
  and upgraded by `tools/upgrade.php`; the `edit_task_template_settings`
  rows of `EDITOR_ASSIGN_PRODUCTION` read in the database (the English
  description the 3.5 letter, the `fr_CA` one empty).
- Introduced: `git blame` on line 14 of OPS's
  `registry/taskTemplates.xml` names bd3f60f2f7, which only renamed the
  row's `emailKey` attribute to `key`; the row with its description key
  was added by cc258a164c, both in `pkp/ops#1365` (merged 2026-08-21).
- Upstream: pkp/pkp-lib, pkp/ops and pkp/ui-library searched on
  2026-10-01, 2026-10-02 and 2026-10-06. Read and not this fault: `pkp/pkp-lib#10288`
  (the same request failing in 2024 for another reason, fixed),
  `pkp/pkp-lib#8911` (missing email texts in OMP, closed),
  `pkp/pkp-lib#13385` (merged; read in OMP's lib/pkp: it changes
  neither the registry nor the line that fails here), `pkp/pkp-lib#12700` (the wording of task assignment emails,
  open), `pkp/pkp-lib#13287` (a null email template name passed to
  `compileParams()` in `PKPStageParticipantNotifyForm::fetch()` on 3.5,
  open).
- Not driven: the upgraded server's screens; a server added to an
  upgraded site; "Assign Editor" edited in Settings and then used on
  "Notify" or "Assign"; a message typed by hand with "Assign Editor"
  chosen; a template created through the API without a description; an
  install that came through 3.3; a server created on screen on `main`; a
  language installed later; the French interface; roles other than the
  Preprint Server manager.
- Unverified: the out-of-scope naming of the upgraded entry ("Editor
  Assigned" against "Assign Editor"), and `templateKeyNameMap()` in the
  upgrade listing `EDITOR_ASSIGN_COPYEDIT` but no
  `EDITOR_ASSIGN_PRODUCTION`, read in the code only and not reported
  here.
