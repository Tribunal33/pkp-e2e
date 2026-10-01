# On a preprint server, choosing the predefined message "Assign Editor" leaves "Message" unfilled

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OPS (a server installed or created on `main`)
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ops#1365` for `pkp/pkp-lib#12593` · [cc258a164c](https://github.com/pkp/ops/commit/cc258a164c44d401d4d6c8011ca6216c9b744d36) · merged 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ops2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, the request that fetches a predefined message's
text fails on the server when an editor chooses "Assign Editor" in the
list "Choose a predefined message to use, or fill out the form below."
on "Notify" or "Assign Participant". The editor is shown no error.

The choice is expected to fill "Message" with the letter to a newly
assigned moderator, as it does on a journal or a press. Instead
"Message" stays as it was. A newly opened window keeps it empty. A
window that already holds text, typed or filled by an earlier choice,
keeps that text.

With "Message" left empty, "OK" on "Assign Participant" assigns the
person and sends them nothing; only "User added as a stage participant."
shows. The editor can still write the message by hand.

Every preprint server created on `main` is affected: the server of a
new install, and a server added to a site that was upgraded from 3.5.
A server that existed before the upgrade is not: it keeps the text of
its "Assign Editor" message.

## Impact

- **Lost**: the ready letter that tells a newly assigned moderator what
  the preprint is and what to do with it.
- **Who**: a Preprint Server manager or Moderator who assigns or
  notifies someone on a preprint and picks "Assign Editor". The list
  offers two predefined messages, this one and "Discussion
  (Production)".
- **Way round**: type the message by hand in "Message". By the code, a
  manager can also restore the text once for the whole server: edit
  "Assign Editor" under Settings › Workflow › "Tasks and Discussions"
  and save a text for it. Read in the code, not tried.

Low: the person is assigned, and only the prepared text is missing.

## Steps to reproduce

Preconditions:

- The default dataset, OPS `main`. Nothing else is created.
- A mail catcher the install sends to, to read Minoti Inoue's mailbox
  (`minoue@mailinator.com`) after step 9.
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
5. Choose "Discussion (Production)", then "Assign Editor" again.
6. Press "Cancel".

"Assign":

7. Press "Assign" in "Participants". Choose "Moderator" in the role
   list, press "Search", and choose "Minoti Inoue".
8. Choose "Assign Editor" in the predefined message list.
9. Press "OK".
10. Reload the page and read "Participants" and "Production Discussions".

**Expected.** Steps 4, 5 and 8 fill "Message" with the letter: "Dear
…, The following preprint has been assigned to you to see through the
screening process in your role as Moderator. …". Step 9 closes the
window with "Notification sent to users." and "User added as a stage
participant.", Minoti Inoue receives the letter by email, and a
discussion with it is listed. This is what 3.5 does, where the entry is
named "Editor Assigned".

**Observed.** Step 4: "Message" stays empty. Step 5: "Message" takes
"Please enter your message." from "Discussion (Production)" and keeps it
when "Assign Editor" is chosen. Step 8: "Message" stays empty. No notice
shows at any of them. Each choice of "Assign Editor" sends a request
that answers 500 with an empty body; the error is in the PHP error
log:

```
POST /index.php/publicknowledge/$$$call$$$/grid/users/stage-participant/stage-participant-grid/fetch-template-body?stageId=5&submissionId=1 → 500

Uncaught TypeError: PKP\mail\Mailer::compileParams(): Argument #1 ($view) must be of type string, null given
#2 lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php(614)
#3 PKP\controllers\grid\users\stageParticipant\StageParticipantGridHandler->fetchTemplateBody()
```

Step 9: the window closes with "User added as a stage participant."
only. After step 10 "Minoti Inoue, Moderator" is in "Participants", no
discussion is listed and no email reached her.

Control, on a journal and a press, each on its default dataset as
`dbarnes`, on the Production stage:

- Journal, submission 5, "Genetic transformation of forest trees":
  "Notify" on David Buskins's row, then "Assign" with the role "Section
  editor" and "Minoti Inoue".
- Press, submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture": "Notify" on Graham Cox's row, then "Assign" with the
  role "Series editor" and "Minoti Inoue".

On both, each choice of "Assign Editor" fills "Dear …, The following
submission has been assigned to you to see through the production
stage. …". "OK" shows "Notification sent to users." and "User added as
a stage participant.", Minoti Inoue receives the email "Assign Editor",
and the discussion is listed.

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

`StageParticipantGridHandler::fetchTemplateBody()` (line 614) then
passes the template's description to `Mail::compileParams()` (the Mail
facade, so `PKP\mail\Mailer::compileParams()`). For a
description empty in every language `getLocalizedData('description')`
returns null, and `compileParams(string $view, …)` refuses it with the
`TypeError` above. The window's script
(`StageParticipantNotifyHandler.js`) posts the request with a success
callback only, so a failed request changes nothing on screen.

Reach:

- "Notify" and "Assign Participant" on a preprint's Production stage,
  its only stage: walked.
- A server created on `main`, on a new install or on a site upgraded
  from 3.5: `PKPContextController::add()` calls
  `installTaskTemplates($context)`, which reads the registry row for
  the new server whatever the site's history. A language installed
  later (`InstallLanguageForm::execute()`) reads the same row. Code.
- A server upgraded from 3.5 is not affected: the upgrade
  (`I12593_EmailToTaskTemplates`) copies the 3.5 email template's text.
  Seen in the database after loading the 3.5 dataset on `main`: the
  English description holds the letter.
- The upgraded server lists the entry as "Editor Assigned", a new one as
  "Assign Editor". That is not part of this fault. OPS 3.5 named the
  template `mailable.editorAssign.name` ("Editor Assigned"), the upgrade
  copies stored names as they are, and the new registry row uses
  `mailable.editorAssignedManual.name`. The upgrade's
  `templateKeyNameMap()` rewrites only a name stored as a bare key, as
  installs that came through 3.3 hold. It lists `EDITOR_ASSIGN_COPYEDIT`,
  a key no app's registry has, and no `EDITOR_ASSIGN_PRODUCTION`, which
  looks like a slip. It would leave such a name untranslated on a
  journal, press or server that came through 3.3. Code only; not
  checked on such an install, and not covered by this report.
- Every other `title` and `description` key in the three apps'
  `registry/taskTemplates.xml` is defined in that app's or pkp-lib's
  English locale (checked by a search of each key).
- A discussion template saved under Settings › Workflow › "Tasks and
  Discussions" without a description takes the same path in
  `fetchTemplateBody()`, on every app: the API's rules allow a null
  description (`AddTaskTemplate::rules()`). Read in the code only. On a
  journal or a press this is the one way to reach line 614 with a null,
  and the same request then fails on the next line for every template
  added in Settings, a fault with its own report
  ([U35-A10-added-message-template-not-sent.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A10-added-message-template-not-sent.md)).
- A text saved for "Assign Editor" in Settings fills "Message"
  afterwards, by the code. The Settings form sends `description` as a
  string, `PKPEditTaskTemplateController::update()` passes it to the
  model, and `MultilingualSettingAttribute::set()` stores a string
  under the manager's current language. The template keeps its `key`,
  and `getLocalizedData('description')` then returns the saved text,
  for a reader in another language too. Not tried.
- The typed message is not affected, by the code:
  `PKPStageParticipantNotifyForm::sendMessage()` sends the text typed in
  "Message" under the template's title and does not read the
  description. Read in the code only.

## Proposed fix

Point the registry row at the text OPS has, the one 3.5 used for this
message, and let `fetchTemplateBody()` answer an empty text for a
template without a description. Two diffs:
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/fix-ops.diff)
(OPS: both changes) and
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/fix.diff)
(the pkp-lib change alone).

OPS, `registry/taskTemplates.xml`:

```diff
-	<template title="mailable.editorAssignedManual.name" description="emails.editorAssignProduction.body" key="EDITOR_ASSIGN_PRODUCTION" stageId="WORKFLOW_STAGE_ID_PRODUCTION"/>
+	<template title="mailable.editorAssignedManual.name" description="emails.editorAssign.body" key="EDITOR_ASSIGN_PRODUCTION" stageId="WORKFLOW_STAGE_ID_PRODUCTION"/>
```

pkp-lib, `StageParticipantGridHandler::fetchTemplateBody()`:

```diff
-                    'body' => Mail::compileParams($template->getLocalizedData('description'), $mailable->getData()),
+                    'body' => Mail::compileParams($template->getLocalizedData('description') ?? '', $mailable->getData()),
```

The first change is the fix. The second covers the servers already
installed from `main`, whose stored description stays empty, and any
template without a description: the choice then empties "Message"
instead of failing. On a journal or a press the second change shows
only once the fault of U35-A10 is fixed too (Cause, reach).

Tried on `main`. With the pkp-lib change alone, "Assign Editor" on the
preprint server answers 200 and leaves "Message" empty. A registry
change does not reach a server already installed, so
`Repository::installTaskTemplates()` was then run again for it. After
that, steps 4, 5 and 8 fill the letter, step 9 shows both notices, the
email "Assign Editor" arrives and the discussion is listed. "Discussion
(Production)" still fills "Please enter your message.", and the
journal's and the press's letters are the same with and without the
fix.

Not proposed here: an error shown when the request fails. The window's
script has no failure handler, so any other failure of this request
stays silent after the fix.

**Alternatives**

- Add `emails.editorAssignProduction.body` to OPS's locale files: works,
  but it duplicates `emails.editorAssign.body` and needs translating
  again in every language.
- Make `installTaskTemplates()` refuse or log a registry key with no
  translation instead of storing an empty text: it would have caught
  this at install. Worth adding; it does not fix the row.

**What goes with it**

- Stored data: only servers installed or created on `main`, which is
  unreleased, hold the empty description. The proposal is to repair
  nothing: with the pkp-lib change the entry empties "Message" there
  instead of failing. If the team wants those servers repaired, an
  upgrade step that fills the `EDITOR_ASSIGN_PRODUCTION` description
  where it is empty would do it; not written, not tried.
- Running `installTaskTemplates()` again is how the fix was tried, not
  a repair. For a template that exists it merges the registry's texts
  over the stored ones, so it resets the title and description of every
  default template, a manager's edits included, in each language it is
  given.
- French: `emails.editorAssign.body` has no `fr_CA` translation in OPS,
  so the French description stays empty and the English letter is shown.
  3.5 does the same.
- A test: on a freshly installed preprint server, each predefined
  message of the Production stage fills "Message". The e2e scenario is a
  Planned item of spec U35.

Small: one registry line in OPS and one line in pkp-lib.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/walk.js)
  takes the steps on OPS and the control on OJS and OMP. Its step 5
  also shows what the fix must leave alone: "Discussion (Production)"
  filling its text. It runs in pkp-e2e's harness:
  `PROBE_FEATURE=issues-r7 PROBE_AGENT=r7 node bin/probe.js all shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r7-3_5`
  in front for 3.5.
- The fix was tried in this order:
  1. `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/fix-ops.diff ops`,
     and the same with `fix.diff` for `ojs omp`.
  2. `walk.js` on OPS with `STEPS=notify` in front: the pkp-lib change
     alone.
  3. [replay-install.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/replay-install.php)
     run from the OPS root with `PKP_CONFIG_FILE` naming the install's
     config. It calls `Repo::editorialTask()->installTaskTemplates()`
     for the site's languages, as `InstallLanguageForm::execute()` does.
  4. `walk.js` whole, on the three apps.
  5. `node bin/try-fix.js revert` for both diffs.
- Walked on `main` and on `stable-3_5_0`, each app on PKP's default
  dataset (pkp/datasets c657990, 2026-10-01), PostgreSQL, as `dbarnes`
  only. Mail was read in the test install's mail catcher (Mailpit), and
  the error in the web server's output.
- Tips, `main`: OJS 4408b94def (lib/pkp f5bd392a69), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6). `stable-3_5_0`: OJS 4fca1027f4,
  OMP c7b45f88ea, OPS 8eaf899468 (lib/pkp 1fb843f491). `stable-3_4_0`:
  OPS acd8ae704b (lib/pkp df13621c2d). `stable-3_3_0`: OPS c5532e2161
  (lib/pkp d446601ebe).
- 3.5, walked: on OPS the entry is "Editor Assigned"; it fills the
  letter, "OK" shows both notices, and Minoti Inoue receives "You have
  been assigned as a moderator on a submission to Public Knowledge
  Preprint Server". OJS and OMP fill their letters too.
- 3.4 and 3.3, code: OPS's `registry/emailTemplates.xml` on
  `stable-3_4_0` gives `EDITOR_ASSIGN_PRODUCTION` the body
  `emails.editorAssign.body`, as 3.5 does; on `stable-3_3_0` OPS's
  `StageParticipantNotifyForm` offers `EDITOR_ASSIGN` on Production,
  with the same body key. `registry/taskTemplates.xml` exists on `main`
  only (`git branch -r --contains cc258a164c`).
- The upgraded server: the `stable-3_5_0` dataset loaded on OPS `main`
  and upgraded by `tools/upgrade.php`; the `edit_task_template_settings`
  rows of `EDITOR_ASSIGN_PRODUCTION` read in the database (title "Editor
  Assigned", the English description the 3.5 letter, the `fr_CA` one
  empty).
- Introduced: `git blame` on line 14 of OPS's
  `registry/taskTemplates.xml` names bd3f60f2f7, which only renamed the
  row's `emailKey` attribute to `key`; the row with its description key
  was added by cc258a164c, both in `pkp/ops#1365` (merged 2026-08-21).
- Upstream: searched pkp/pkp-lib and pkp/ops for
  `editorAssignProduction`, `taskTemplates`, `fetchTemplateBody` and
  "Assign Editor predefined message preprint". Read
  `pkp/pkp-lib#10288` (the same request failing in 2024 for another
  reason, closed and fixed) and `pkp/pkp-lib#8911` (missing email
  template texts in OMP, closed). The open PR `pkp/pkp-lib#13385`
  changes three pkp-lib files and no registry.
- Not driven: the upgraded server's screens; a server added to an
  upgraded site; "Assign Editor" edited in Settings; a message typed by hand
  with "Assign Editor" chosen; an install that came through 3.3; a
  server created on screen on `main`; a language installed later; the
  French interface; roles other than the Preprint Server manager.
