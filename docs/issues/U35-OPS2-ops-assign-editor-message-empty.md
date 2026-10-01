# On a preprint server, choosing "Assign Editor" when assigning a Moderator leaves "Message" empty

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ops#1365` for `pkp/pkp-lib#12593` · [cc258a164c](https://github.com/pkp/ops/commit/cc258a164c44d401d4d6c8011ca6216c9b744d36) · 2026-08-04 (merged 2026-08-21) · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ops2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, a manager or Moderator who assigns a Moderator
from a submission's "Participants" panel and chooses the predefined
message "Assign Editor" expects "Message" to fill with the assignment
letter, as it does on a journal or a press. Instead the request for the
letter fails on the server, nothing on screen says so, and "Message"
stays as it was.

In a fresh window "Message" stays empty, and "OK" assigns the Moderator
without sending anything. If the sender first chose "Discussion
(Production)", "Message" still holds that message's text, "Please enter
your message.". When they then choose "Assign Editor" and press "OK",
the new Moderator gets an email with the subject "Assign Editor" and
only that sentence as its text.

No released version is affected: only servers created on the
development version (`main`) have the fault, and a server upgraded from
3.5 keeps its letter. Servers already created on `main` keep the empty
letter after the fix, which matters only for test and development
installs, since `main` is unreleased.

## Impact

- **Lost:** the ready-made assignment letter; the new Moderator gets
  no letter, or the text of another message.
- **Who:** every manager and Moderator assigning a Moderator on a
  server created on `main`, each time they choose "Assign Editor".
- **Way round:** type the letter into "Message" before pressing "OK".

Low: the assignment is saved and the sender sees what "Message" holds
before pressing "OK"; it would be medium if the text that goes out were
hidden from them.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OPS.

1. Sign in as `dbarnes` and open submission 1, "The influence of
   lactation on the quantity and quality of cashmere production"
   (Production), from the editorial dashboard ("View").
2. In "Participants", press "Assign".
3. Choose "Moderator", type "Inoue" in "Search User By Name", press
   "Search" and choose "Minoti Inoue".
4. In "Choose a predefined message to use, or fill out the form below.",
   choose "Assign Editor" [3.5: the entry reads "Editor Assigned"].
5. Choose "Discussion (Production)" in the same list.
6. Choose "Assign Editor" again.
7. Press "OK".

**Expected:** step 4 fills "Message" with the Moderator's assignment
letter ("Dear NAME, The following preprint has been assigned to you to
see through the screening process in your role as Moderator. …"), as on
3.5; step 5 replaces it with "Please enter your message."; step 6 puts
the letter back; step 7 assigns Minoti Inoue and emails her the letter.

**Observed:** step 4 leaves "Message" empty, with nothing on screen. Step
5 fills "Please enter your message.", and step 6 leaves that text in
place. Steps 4 and 6 each answer 500:

```
POST …/grid/users/stage-participant/stage-participant-grid/fetch-template-body?stageId=5&submissionId=1 - Uncaught TypeError:
PKP\mail\Mailer::compileParams(): Argument #1 ($view) must be of type string, null given, called in
lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Mail/MailManager.php on line 623 and defined in lib/pkp/classes/mail/Mailer.php:95
```

Step 7 closes the window with "User added as a stage participant." and
"Notification sent to users.", and Minoti Inoue receives an email with
the subject "Assign Editor" whose whole text is "Please enter your
message." with the discussion footer.

Control: on a journal (OJS submission 5, "Section editor") and a press
(OMP submission 4, "Series editor"), the same steps fill "Message" with
"Dear NAME, The following submission has been assigned to you to see
through the production stage. …" and send that letter.

## Cause

OPS's `registry/taskTemplates.xml` declares the "Assign Editor" template
(`EDITOR_ASSIGN_PRODUCTION`) with `description="emails.editorAssignProduction.body"`.
OJS and OMP define that locale key in their own `locale/*/emails.po`;
OPS defines it nowhere, neither in its locale nor in lib/pkp's. Through
3.5, OPS's `EDITOR_ASSIGN_PRODUCTION` email template used
`emails.editorAssign.body`, the Moderator's letter. The change that
turned the discussion emails into task templates
(`pkp/pkp-lib#12593`) copied the OJS line into OPS's new registry
unchanged.

`Repo::editorialTask()->installTaskTemplates()` (lib/pkp
`classes/editorialTask/Repository.php`) writes each template when a
server is created, with a missing-key handler that returns `''`, so the
template is stored with an empty description in every locale and no
warning. `Template::getLocalizedData('description')` then returns `null`
(`LocalizedData::getBestLocalizedData()` skips empty values), and
`StageParticipantGridHandler::fetchTemplateBody()` passes that `null` to
`Mail::compileParams()`, whose `string` parameter throws.

Reach:
- "Assign Participant" on the Production stage, the only stage a
  preprint server offers (walked). "Notify" lists the same templates
  through `PKPStageParticipantNotifyForm::fetch()` and fetches the
  letter through the same handler (code).
- Servers created on `main` through Administration › Hosted Servers
  (walked on the default dataset and on a newly created server).
- "OK" with "Message" left empty: `PKPStageParticipantNotifyForm::execute()`
  sends only when a message is set, so the Moderator is assigned with
  no email and no discussion (code).
- A server upgraded from 3.5: `I12593_EmailToTaskTemplates` copies the
  3.5 letter from `email_templates_default_data`, so its "Assign
  Editor" keeps the Moderator's letter (the 3.5 dataset upgraded to
  `main`, read in the database; not walked).
- No other key in the three apps' `registry/taskTemplates.xml` is
  missing from their locales (code).

## Proposed fix

Point OPS's template at the letter OPS already has, the one its
`EDITOR_ASSIGN_PRODUCTION` used through 3.5
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-assign-editor-message-empty/fix.diff)):

```diff
-	<template title="mailable.editorAssignedManual.name" description="emails.editorAssignProduction.body" key="EDITOR_ASSIGN_PRODUCTION" stageId="WORKFLOW_STAGE_ID_PRODUCTION"/>
+	<template title="mailable.editorAssignedManual.name" description="emails.editorAssign.body" key="EDITOR_ASSIGN_PRODUCTION" stageId="WORKFLOW_STAGE_ID_PRODUCTION"/>
```

OPS's `emails.editorAssign.body` has text in `en`, `bg`, `cs`, `de`,
`mk`, `pt_BR` and `uk`. It is empty in `fr_CA`, `es`, `ca` and `nb_NO`
and missing from `fr` and `pt`, so in those languages the template is
stored empty and the English letter is shown, as on 3.5.

Tried on OPS `main`, on a server created with the fix in: "Assign
Editor" fills "Message" with the Moderator's letter both times, with no
server error, and the Moderator receives it. "Discussion (Production)"
in the same list still fills "Please enter your message.".

**Alternatives:**
- Adding `emails.editorAssignProduction.body` to OPS's locale needs a
  new letter and its translations, while OPS's own Moderator letter
  already exists.
- Guarding `fetchTemplateBody()` with `?? ''` stops the server error
  but still fills nothing.

**What goes with it:**
- Servers created on `main` before the fix keep the empty letter, since
  templates are written when a server is created (the dataset's server
  still showed the fault with the fix in). No upgrade step is needed:
  `main` is unreleased, and an upgrade from 3.5 keeps the letter.
- Hardening, separate from this fix: `installTaskTemplates()` could
  report a key missing from the primary locale instead of storing `''`
  silently, and `fetchTemplateBody()` could treat a template without a
  description as empty text (`AddTaskTemplate` accepts a `null`
  description through the API).
- A test that chooses each predefined message on every app and checks
  that "Message" fills.

Small: one attribute in OPS's registry, using a letter OPS already has,
and a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-assign-editor-message-empty/walk.js)
  takes the Steps on the three apps (OJS and OMP as the control), signed
  in as `dbarnes`, on an install freshly reset to the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-assign-editor-message-empty/walk.js`.
- Fix check: [fixcheck.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-assign-editor-message-empty/fixcheck.js)
  creates a new preprint server (a manager, an author and a Moderator),
  has the author submit a preprint through the wizard, and takes Steps
  2–7 as the manager; without the fix it shows the fault as the dataset
  does.
- Not driven: "Notify" with "Assign Editor"; "OK" with "Message" left
  empty; a server upgraded from 3.5 through the screens (the 3.5
  dataset upgraded to `main`, its stored letter read in the database).
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). MySQL not checked; the fault does not depend on the
  database.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794c`
  and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`); `stable-3_5_0` OJS
  `92b9a16b48`, OMP `3081c9b00d`, OPS `cf4fce69bd` (lib/pkp
  `a9c76aed62`); `stable-3_4_0` OPS `acd8ae704b` (lib/pkp `df13621c2d`);
  `stable-3_3_0` OPS `c5532e2161` (lib/pkp `d446601ebe`).
- 3.5, walked: the list reads "Discussion (Production)", "Editor
  Assigned"; the letter fills ("… in your role as Moderator. …") and
  Minoti Inoue receives it under "You have been assigned as a moderator
  on a submission to Public Knowledge Preprint Server".
- 3.4 (code): OPS `stable-3_4_0` `registry/emailTemplates.xml` gives
  `EDITOR_ASSIGN_PRODUCTION` `emails.editorAssign.body`, which its
  `locale/en/emails.po` defines; there is no `taskTemplates.xml`.
- 3.3 (code): OPS `stable-3_3_0` `registry/emailTemplates.xml` has
  `EDITOR_ASSIGN` on stage 5 with `emails.editorAssign.body`, defined in
  `locale/en_US/emails.po`; lib/pkp's `fetchTemplateBody()` builds a
  `SubmissionMailTemplate` from it.
- Introduced: `git log` on OPS `registry/taskTemplates.xml` gives
  `cc258a164c`, which added the line with `emailKey=`, and `bd3f60f2f7`,
  which only renamed the attribute to `key=`; `commits/<sha>/pulls`
  gives `pkp/ops#1365`. `installTaskTemplates()` and its missing-key
  handler came with lib/pkp `30693f9e21` (`pkp/pkp-lib#12593`,
  2026-08-03).
- Upstream: `pkp/pkp-lib#8911` (closed) was the same missing key in OMP
  3.4.
