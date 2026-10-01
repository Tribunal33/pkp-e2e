# The Submission stage's "Assign Editor" message ends "This is an automated message from…" instead of the editor's signature

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP (OPS has no "Assign Editor" letter there; see the Summary)
  - 3.5: OJS, OMP, OPS (OPS: the Production stage's message, there named "Editor Assigned")
  - 3.4: OJS, OMP, OPS (code; OPS as on 3.5)
  - 3.3: none (code; the letter has no signature and the email no discussion footer)
- **Introduced** `pkp/ojs#3725`, `pkp/omp#1310` and `pkp/ops#446` for `pkp/pkp-lib#8423` · [6ec32f8f89](https://github.com/pkp/ojs/commit/6ec32f8f8926642727ef4b22fbf69e88a3760be6) (OJS), [c86942f8de](https://github.com/pkp/omp/commit/c86942f8de3f18a495111601d4e80761155ad978) (OMP), [bd2534e095](https://github.com/pkp/ops/commit/bd2534e09565f50d8d858566d235dff6fc33c37d) (OPS) · 2023-01-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a15)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor who assigns a participant on the Submission stage and chooses
the predefined message "Assign Editor" sends a letter that closes, after
"Kind regards,", with "— This is an automated message from {journal
name}." where the editor's own signature is expected. The discussion
footer that follows it ("— Reply to this comment at #{submission
number} {authors} or unsubscribe from emails sent by {journal name}.")
is expected; only the "automated message" line is wrong, and with it
the email ends with two footers.

The letter opens a discussion the recipient can reply to, yet it says
it is automated and names nobody. The line is the journal's or press's
email signature: one that changed its signature under Settings gets its
own signature there, which is still not the editor's. The Review and
Production stages' "Assign Editor" letters close with the sender's
signature.

The wrong text is stored per journal or press when it is installed, so
a fix corrects new installs only; an existing one keeps the line until
a manager edits the message under Settings › Workflow. The fix is
medium because it changes each app's own files and adds a text in every
language. A preprint server installed on `main` has no "Assign Editor"
letter at all today, a separate fault; one on 3.5 has this one.

## Impact

- **Lost**: nothing. The person is assigned and gets the letter.
- **Who**: an editor who assigns someone on the Submission stage, or
  messages a participant there with "Notify", and picks "Assign
  Editor"; and the person who receives the letter.
- **Way round**: the editor deletes the line in "Message" and types
  their name before pressing "OK". A Journal manager or Press manager
  can correct the message's text under Settings › Workflow, for that
  journal or press only.

Low: wording in one predefined letter.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. Nothing else is created.
  OMP and 3.5 differ only where a bracket says so.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice", on its Submission
   stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4&workflowMenuKey=workflow_1`).
   [OMP: submission 3, "The Political Economy of Workplace Injury in
   Canada". OPS 3.5: submission 1, "The influence of lactation on the
   quantity and quality of cashmere production", on Production
   (`workflowMenuKey=workflow_5`).]
3. In "Participants" press "Assign".
4. Choose "Section editor" in the role list [OMP: "Series editor"; OPS
   3.5: "Moderator"], press "Search" and choose "Minoti Inoue".
5. In "Choose a predefined message to use, or fill out the form below."
   choose "Assign Editor" [OPS 3.5: "Editor Assigned"] and read the end
   of "Message". The fault already shows here.
6. Press "OK".
7. Read the email to `minoue@mailinator.com` in the install's mail
   catcher (Mailpit or whatever its `[email]` settings send to). An
   install without one stops at step 5.

**Expected**: "Message" and the email close with "Kind regards," and the
sender's signature, "Daniel Barnes"; the email then has the discussion
footer.

**Observed**: in step 5 "Message" ends:

```
Thank you in advance.
Kind regards,
—
This is an automated message from Journal of Public Knowledge.
```

Step 6 shows "Notification sent to users." and "User added as a stage
participant.", and the email arrives:

```
From: Daniel Barnes <dbarnes@mailinator.com>
To: minoue@mailinator.com
Subject: Assign Editor

…
Thank you in advance.
Kind regards,
—
This is an automated message from Journal of Public Knowledge.
—
Reply to this comment at #4 Montgomerie et al. or unsubscribe from emails sent by Journal of Public Knowledge.
```

[3.5: the same closing lines; the subject is "You have been assigned as
an editor on a submission to Journal of Public Knowledge".]

Control: the same steps, with "Assign Editor" chosen again, on a
submission in Review (OJS submission 7, "Developing efficacy beliefs in
the classroom"; OMP submission 15, "Expansive Discourses: Urban Sprawl
in Calgary, 1945-1978") give a letter that ends "Kind regards, Daniel
Barnes" and then the discussion footer.

## Cause

The predefined message takes the text of the automated "Editor Assigned"
email. In OJS's and OMP's `registry/taskTemplates.xml` the row
`EDITOR_ASSIGN_SUBMISSION` has `description="emails.editorAssign.body"`,
and that text (`locale/en/emails.po`) ends with `{$contextSignature}`,
the context's "Signature" setting. Its default is
`default.contextSettings.emailSignature`:

```
<br><br>—<br><p>This is an automated message from <a href="{$contextUrl}">{$contextName}</a>.</p>
```

`emails.editorAssign.body` is also the body of the `EDITOR_ASSIGN` email
template, which `PKP\mail\mailables\EditorAssigned` sends when a
submission is assigned to an editor automatically. There the context's
signature is right.

For a message a person sends from the Participants panel, the texts
follow one convention, which no code enforces: they close with
`{$signature}`, the sender's signature
(`emails.editorAssignReview.body`, `emails.editorAssignProduction.body`,
`emails.copyeditRequest.body`, `emails.layoutRequest.body`).
`PKPStageParticipantNotifyForm::getEmailVariableNames()` lists
`signature` for `EDITOR_ASSIGN_SUBMISSION` too. This one row does not
follow it.

`pkp/pkp-lib#8423` brought this. It restored `EDITOR_ASSIGN` as the
automated email's own template, changed `emails.editorAssign.body` from
`{$signature}` to `{$contextSignature}` for it, and gave the Review and
Production messages texts of their own with `{$signature}`. The registry
rows `EDITOR_ASSIGN_SUBMISSION` (OJS, OMP) and `EDITOR_ASSIGN_PRODUCTION`
(OPS) kept `emails.editorAssign.body` as their text.

The second footer is correct: every message sent from this window is a
discussion email, and `PKP\mail\traits\Discussion::setFooterText()`
gives it `emails.footer.unsubscribe.discussion`.

Reach:

- "Assign" with the message on the Submission stage, OJS and OMP, `main`
  and 3.5: on screen.
- "Notify" on a participant's row uses the same window, list and text:
  in the code, not driven.
- 3.5 and 3.4: the same row is in `registry/emailTemplates.xml`
  (`EDITOR_ASSIGN_SUBMISSION … body="emails.editorAssign.body"`). OPS
  has it as `EDITOR_ASSIGN_PRODUCTION`: on screen on 3.5, in the code on
  3.4.
- OPS `main`: the row names `emails.editorAssignProduction.body`, which
  OPS does not define, so a preprint server installed on `main` has no
  letter at all
  ([U35-OPS2-preprint-assign-editor-message-not-filled.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OPS2-preprint-assign-editor-message-not-filled.md)).
- An install upgraded from 3.5 to `main` keeps the 3.5 text:
  `I12593_EmailToTaskTemplates` copies the email template's text, the
  default as installed or the manager's edited one, into the new
  discussion template (in the code, not driven).
- No other predefined message on `main` or 3.5, in any of the three
  apps, closes with `{$contextSignature}` (checked by reading each
  registry row's text).

## Proposed fix

Give the Submission message a text of its own that closes with
`{$signature}`, as `pkp/pkp-lib#8423` did for Review and Production,
leave `emails.editorAssign.body` to the automated email, and add the new
text to every locale file in the same change. Per app:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/fix-ops.diff).

OJS and OMP, `registry/taskTemplates.xml`:

```diff
-	<template title="mailable.editorAssignedManual.name" description="emails.editorAssign.body" key="EDITOR_ASSIGN_SUBMISSION" stageId="WORKFLOW_STAGE_ID_SUBMISSION"/>
+	<template title="mailable.editorAssignedManual.name" description="emails.editorAssignSubmission.body" key="EDITOR_ASSIGN_SUBMISSION" stageId="WORKFLOW_STAGE_ID_SUBMISSION"/>
```

OJS and OMP, `locale/*/emails.po`: a new
`emails.editorAssignSubmission.body`, a copy of that locale's
`emails.editorAssign.body`. OPS, `locale/*/emails.po`: a new
`emails.editorAssignProduction.body`, the key OPS's registry row already
names, copied the same way.

The locale files are part of the fix, not left to the translators,
because `installTaskTemplates()` stores an empty text for a language
that lacks the key. With the key in `en` alone, a new install would
have no "Assign Editor" text in any other language, where today it has
a full text with the wrong closing. So the diffs add the key to every
locale whose `emails.editorAssign.body` has a text:

- 58 locales in OJS, 27 in OMP, 7 in OPS.
- Where the locale's text ends `{$contextSignature}`, the copy ends
  `{$signature}` (48 in OJS, 15 in OMP, 7 in OPS).
- Where the locale still has the older text without that variable (10
  in OJS, 12 in OMP, `fr_CA` among them, ending "Merci,"), the copy is
  unchanged, so that language keeps what it has today.
- A locale with no text for `emails.editorAssign.body` gets nothing and
  stays as it is today.

`pkp/pkp-lib#8423` changed the variable across the locale files in the
same way (6ec32f8f89).

On OPS, apply this report's change and not the registry change of the
OPS2 report (`pkp-e2e#337`), which points OPS's row at
`emails.editorAssign.body`: that gives a preprint server its letter
back with the "automated message" closing. Adding the key the row
already names gives it the letter with the sender's signature. OPS2's
other change, the `?? ''` in `fetchTemplateBody()`, is still wanted.

Tried on `main` on the three apps, with `installTaskTemplates()` run
again on the loaded dataset so that it takes the registry's new text
(Evidence). The Steps show the Expected: the letter ends "Kind regards,
Daniel Barnes" and then the discussion footer, on OPS as well, on its
Production stage. The Review stage's letter on OJS and OMP reads the
same with the fix and without it, and the stored French texts are full
on OJS and unchanged on OMP.

**Alternatives**

- Swap the variable in `StageParticipantGridHandler::fetchTemplateBody()`
  when the text is loaded into "Message". It touches one pkp-lib method,
  no locale file, and reaches installs already made. But the stored text
  stays wrong, the text under Settings › Workflow would differ from what
  the window fills in, and a manager who put `{$contextSignature}` in a
  message on purpose would lose it. Not tried.
- The new key in `en` only, with `installTaskTemplates()` falling back
  to the old key when a locale lacks the new one. It needs a second
  registry attribute or a rule in the installer for this one row, a new
  pattern for one text. Not tried.
- Change `emails.editorAssign.body` back to `{$signature}`. The
  automated email has no sender, so its letter would lose its closing;
  it undoes what `pkp/pkp-lib#8423` fixed.

**What goes with it**

- Stored text: a context already installed keeps the text it stored,
  and so does one upgraded from 3.5; the fix reaches new installs and
  new contexts. No repair is proposed, since a manager may have edited
  the text. Whether the upgrade should rewrite an unedited text is the
  team's call.
- No API or hook changes.
- Backport: on 3.5 and 3.4 the row to change is in
  `registry/emailTemplates.xml` (`body="…"`), with the same new string;
  OPS changes its `EDITOR_ASSIGN_PRODUCTION` row. Not tried there.
- Guard: an e2e scenario in spec U35 that sends "Assign Editor" from the
  Submission stage and reads the letter's closing lines.

Medium: a change in each of three app repos, with a generated text in
92 locale files.

## Evidence

- The kept script takes the Steps and the control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/walk.js).
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assign-editor-email-two-footers/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/assign-editor-email-two-footers/fix-ojs.diff ojs`
  (and `fix-omp.diff omp`, `fix-ops.diff ops`), then, in each app root,
  `PKP_CONFIG_FILE=<the install's config> php`
  [replay-install.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-assign-editor-message-not-filled/replay-install.php),
  which calls `installTaskTemplates()`. The neighbour check is the
  script's control (the Review stage's letter), walked with the fix in
  and out. The stored texts were read in `edit_task_template_settings`
  after the replay, for `en` and `fr_CA`, the dataset's two languages.
- The diffs were generated from each app's committed locale files; the
  counts in the Proposed fix are the generator's. A locale entry marked
  `#, fuzzy` is copied with its mark.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL;
  the fault does not depend on the database. Datasets: pkp/datasets
  c657990 (2026-10-01).
- OPS `main` without the fix: "Assign Editor" left "Message" empty (the
  request answered 500, the fault of the OPS2 report), the person was
  assigned and no email was sent.
- The email in Observed is the end of its text part, with the footer's
  addresses left out. In the dataset the "automated message" line links
  to `http://localhost/…`, the address the dataset was built on.
- The discussion the Steps leave reads "Created by: minoue", the
  recipient: a separate known fault (spec U35
  [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a5)).
- Code reads. `main`: each app's `registry/taskTemplates.xml` and the
  English text of every row; `ContextEmailVariable` (`contextSignature`
  is the context's `emailSignature`); `sendMessage()`,
  `fetchTemplateBody()`, `installTaskTemplates()`. 3.5 and 3.4: the
  rows named under Reach; pkp-lib's
  `default.contextSettings.emailSignature`, the discussion footer and
  the `allowUnsubscribe()` call in `sendMessage()`, all present on 3.4.
  3.3 (`stable-3_3_0`): `emails.editorAssign.body` ends "Thank you."
  with no signature variable, and
  `PKPStageParticipantNotifyForm::sendMessage()` sends the mail template
  with no discussion footer.
- Introduced: `git log -S'{$contextSignature}'` on OJS's
  `locale/en_US/emails.po` gives 6ec32f8f89 ("Update signature variable
  in editor assign template"), the line `-"{$signature}"`
  `+"{$contextSignature}"` in `emails.editorAssign.body`; 261069374e of
  the same pull request added the Review and Production texts and left
  `EDITOR_ASSIGN_SUBMISSION` on `emails.editorAssign.body`. OMP's
  c86942f8de and OPS's bd2534e095 did the same. All three are on
  `stable-3_4_0` and not on `stable-3_3_0`.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp; not pkp/ui-library,
  which holds none of these files): "automated message" with "assign
  editor", "signature", "discussion"; `EDITOR_ASSIGN_SUBMISSION`;
  `contextSignature`; `editorAssign.body`. Read and not the same fault:
  `pkp/pkp-lib#8423` (the change above, closed), `#8348` (missing
  variables in the automated submission emails, closed), `#7797` (the
  reviewer confirmation email should say it is automated, closed),
  `#13287` (the "Assign" form fails for a template without a name,
  open).
- Not driven: a journal with a changed "Signature" setting; a window in
  a language other than English.
- Unverified: whether an upgrade refreshes an unedited default text on
  3.5 or 3.4, where the text is stored as email template default data.
- Tips: OJS `main` 4408b94def with lib/pkp f5bd392a69; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  `stable-3_5_0` OJS 4fca1027f4, OMP c7b45f88ea, OPS 8eaf899468 with
  lib/pkp 1fb843f491; `stable-3_4_0` OJS 9571d8fde7 with lib/pkp
  30303e536a, OMP 0aec65441f and OPS acd8ae704b with lib/pkp
  df13621c2d; `stable-3_3_0` OJS 9fdb9bcf9a, lib/pkp d446601ebe.
