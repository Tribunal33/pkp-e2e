# The Submission stage's "Assign Editor" email says it is automated and ends with two footers

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS (a server upgraded from 3.5)
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the letter has no signature and the email no footer)
- **Introduced** `pkp/ojs#3725`, `pkp/omp#1310` and `pkp/ops#446` for `pkp/pkp-lib#8423` · [6ec32f8f89](https://github.com/pkp/ojs/commit/6ec32f8f8926642727ef4b22fbf69e88a3760be6), [c86942f8de](https://github.com/pkp/omp/commit/c86942f8de3f18a495111601d4e80761155ad978), [bd2534e095](https://github.com/pkp/ops/commit/bd2534e09565f50d8d858566d235dff6fc33c37d) · 2023-01-25 (merged 2023-01-26) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a15)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor assigns someone from a submission's "Participants" panel on
the Submission stage and chooses the predefined message "Assign
Editor". The letter closes with "Kind regards," and then "— This is an
automated message from {journal name}." instead of the editor's own
signature. The email the new editor receives then adds the discussion
footer "— Reply to this comment at #{submission} {authors} or
unsubscribe from emails sent by {journal name}.", so it ends with two
footers. The Review and Production stages' "Assign Editor" letters are
signed by the editor and end with the discussion footer alone.

The automated line is the journal's email signature (Settings ›
Workflow › Emails, "Signature"). Every journal shows it unless its
manager has changed that default; a journal with its own signature gets
that signature instead of the editor's, still followed by the second
footer. On a preprint server the Production stage's "Editor Assigned"
letter does the same.

The fix is medium-sized because it spans three apps' letters, a pkp-lib
upgrade migration and the letter's translations.

## Impact

- **Lost:** nothing; the message arrives and the assignment is made.
  The new editor gets a personal letter that calls itself automated and
  is not signed by the editor who sent it.
- **Who:** the person assigned with the Submission stage's "Assign
  Editor" message, on every journal and press; on a preprint server,
  the Production stage's, on 3.4 and 3.5 and on servers upgraded from
  3.5.
- **Way round:** the sender sees the line in "Message" before pressing
  "OK" and can delete it.

Low: the wording and signature of one email are wrong.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS or OMP (on 3.5 also OPS).

The submission and the role to assign Minoti Inoue (`minoue`) in:

| App | Submission (stage) | Role |
|---|---|---|
| OJS | 4, "Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice" (Submission) | "Section editor" |
| OMP | 3, "The Political Economy of Workplace Injury in Canada" (Submission) | "Series editor" |
| OPS (3.5, or upgraded from 3.5) | 1, "The influence of lactation on the quantity and quality of cashmere production" (Production) | "Moderator" |

A fresh install:
1. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`.
2. In "Participants", press "Assign", choose the role, search for
   "Inoue" and choose Minoti Inoue.
3. Choose the predefined message "Assign Editor" ("Editor Assigned" on
   OPS 3.5). Leave "Message" as it fills, press "OK" and sign out.
4. Open Minoti Inoue's mailbox (`minoue@mailinator.com`) and read the
   end of the "Assign Editor" email.

An install upgraded from 3.5 (where the upgrade half of the fix shows):
5. Load the default test dataset for `stable-3_5_0`
   (pkp/datasets `<app>/stable-3_5_0/pgsql`) into a `main` checkout and
   run `php tools/upgrade.php upgrade`.
6. Take steps 1–4. On OPS choose "Assign Editor".

**Expected:** the letter closes with "Kind regards," and Daniel
Barnes's signature (his name, as he has none set), followed by one
footer, the discussion's "— Reply to this comment at … or unsubscribe
…".

**Observed:** after step 3, "Message" already ends with "Kind regards,
— This is an automated message from Journal of Public Knowledge.". The
email, from "Daniel Barnes" with the subject "Assign Editor", ends (text
part, OJS):

```
Thank you in advance.

Kind regards,

—

This is an automated message from Journal of Public Knowledge.

—
Reply to this comment at #4 Montgomerie et al. or unsubscribe from emails sent by Journal of Public Knowledge.
```

OMP ends the same way with "Public Knowledge Press" and "#3
Barnetson". On 3.5 the subject reads "You have been assigned as an
editor on a submission to Journal of Public Knowledge" ("… as a
moderator … Public Knowledge Preprint Server" on OPS), with the same
ending on all three apps. On the upgraded install the stored "Assign
Editor" letters (OJS and OMP Submission, OPS Production) end with the
journal-signature variable, the same text 3.5 sends.

Control: the same steps on the Review stage (OJS submission 7, OMP
submission 16) give an email that ends "Kind regards, Daniel Barnes"
and the discussion footer alone.

## Cause

The Submission stage's "Assign Editor" message reuses the letter of
the automatic editor-assignment email. OJS and OMP's
`registry/taskTemplates.xml` on `main` give `EDITOR_ASSIGN_SUBMISSION`
the text `emails.editorAssign.body` (3.4 and 3.5: that key's `body` in
`registry/emailTemplates.xml`; OPS's `EDITOR_ASSIGN_PRODUCTION` there
too). That locale string is also the body of `EDITOR_ASSIGN`, the email
sent when an editor is assigned automatically on submission. It ends
with `{$contextSignature}`, the journal's email signature, whose
default is "— This is an automated message from {journal}."
(`default.contextSettings.emailSignature`).

The signature is filled when the message is chosen.
`StageParticipantGridHandler::fetchTemplateBody()` compiles the stored
letter with `Mail::compileParams()` against a `TemplateVariables`
mailable (`classes/editorialTask/TemplateVariables.php`) whose sender
is the signed-in editor. Its `Sender` trait would fill `{$signature}`
with the editor's signature (or name), but this letter asks for
`{$contextSignature}`. `PKPStageParticipantNotifyForm::sendMessage()`
then sends "Message" through the same mailable, and its `Discussion`
trait adds `emails.footer.unsubscribe.discussion` underneath.

How it got here:
- `pkp/pkp-lib#8423` split the manual "Assign Editor" messages from the
  automatic `EDITOR_ASSIGN` email, and gave the Review and Production
  messages letters of their own, signed `{$signature}`
  ([261069374e](https://github.com/pkp/ojs/commit/261069374eedc6f9e6617cf3bf1fd7efe17dfa26)).
  The Submission message stayed on `emails.editorAssign.body`.
- Ten minutes later, in the same PR,
  [6ec32f8f89](https://github.com/pkp/ojs/commit/6ec32f8f8926642727ef4b22fbf69e88a3760be6)
  changed `emails.editorAssign.body` from `{$signature}` to
  `{$contextSignature}` in every locale, which is right for the
  automatic email: it has no sender (`EditorAssigned` has no `Sender`
  trait). OMP
  ([c86942f8de](https://github.com/pkp/omp/commit/c86942f8de3f18a495111601d4e80761155ad978))
  did the same. OPS
  ([bd2534e095](https://github.com/pkp/ops/commit/bd2534e09565f50d8d858566d235dff6fc33c37d))
  rewrote `emails.editorAssign.body`, which until then had no signature,
  ending it with `{$contextSignature}`; OPS's Production alternate
  ("Editor Assigned") uses that letter.
- Each context stores its own copy of the letter. A context created on
  `main` copies it from the locale
  (`Repo::editorialTask()->installTaskTemplates()`). On 3.5 every
  context holds an `email_templates` row with `alternate_to` and no
  settings for each "Assign Editor" message
  (`installAlternateEmailTemplates()`, run at context creation).
  `I12593_EmailToTaskTemplates` collects such rows in `$migrateDefault`
  and copies their default body from `email_templates_default_data`
  unchanged, so an upgraded context keeps 3.5's letter. A row the
  journal edited has settings and is copied as the journal wrote it.

Reach:
- "Notify" offers the same messages through the same path (code).
- OPS on `main`, a server created there: its Production message's text
  key, `emails.editorAssignProduction.body`, is defined nowhere in OPS,
  so the server stores the letter empty and choosing it fills nothing
  (a separate fault,
  [U35-OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OPS2-ops-assign-editor-message-empty.md),
  [pkp-e2e#128](https://github.com/jardakotesovec/pkp-e2e/issues/128);
  walked). A server upgraded from 3.5 stores 3.5's Moderator letter
  and has this fault (read in the database).
- No other predefined message ends with `{$contextSignature}`: the
  discussion, copyedit, layout, index and Review/Production "Assign
  Editor" letters end with `{$signature}` or `{$senderName}` (code, the
  three apps' `en` locale).

## Proposed fix

Give the manual letters their own text, signed with `{$signature}`
like the Review and Production letters, and have the upgrade from 3.5
copy the stock letters with that signature. One pkp-lib PR and three
app PRs:

- pkp-lib
  ([fix-pkp-lib.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/fix-pkp-lib.diff)):
  `I12593_EmailToTaskTemplates` gets a `defaultBody()` helper that, for
  an `EDITOR_ASSIGN_*` key, swaps `{$contextSignature}` for
  `{$signature}`. It is used at both places that read a body from
  `email_templates_default_data`; text a journal wrote itself is not
  touched.
- OJS and OMP
  ([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/fix-ojs.diff),
  [fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/fix-omp.diff)):
  add `emails.editorAssignSubmission.body`, the app's
  `emails.editorAssign.body` word for word with `{$signature}` in place
  of `{$contextSignature}`, and point `EDITOR_ASSIGN_SUBMISSION` at it:

  ```diff
  -	<template title="mailable.editorAssignedManual.name" description="emails.editorAssign.body" key="EDITOR_ASSIGN_SUBMISSION" stageId="WORKFLOW_STAGE_ID_SUBMISSION"/>
  +	<template title="mailable.editorAssignedManual.name" description="emails.editorAssignSubmission.body" key="EDITOR_ASSIGN_SUBMISSION" stageId="WORKFLOW_STAGE_ID_SUBMISSION"/>
  ```
- OPS
  ([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/fix-ops.diff)):
  define `emails.editorAssignProduction.body`, the key its registry
  already names, as the Moderator letter signed `{$signature}`.

The automatic `EDITOR_ASSIGN` email keeps its `{$contextSignature}`.

Tried on `main` on the three apps, with the 3.5 dataset upgraded with
the fix in (Steps 5–6): each email ends "Kind regards, Daniel Barnes"
and the discussion footer. A journal, press and server created with the
fix in store all their "Assign Editor" letters signed `{$signature}`.
The control (Review stage, OJS and OMP) ends the same with the fix in
and out.

**Alternatives:**
- Change `emails.editorAssign.body` back to `{$signature}`: the
  automatic email has no sender to sign it.
- Drop `{$contextSignature}` from discussion emails in code: that
  changes what a journal's own templates send when they use it on
  purpose.
- Registry and locale only: every context upgraded from 3.5 keeps the
  automated line.

**What goes with it:**
- One OPS change, not two. OPS2's proposed fix points OPS's message at
  the shared `emails.editorAssign.body`, which would bring this fault
  to every server created on `main`. The recommended change for both
  reports is this one: define `emails.editorAssignProduction.body`
  (the Moderator letter signed `{$signature}`), which fills OPS2's
  empty letter and signs it by the sender.
- Translations, recommended: copy each locale's existing
  `emails.editorAssign.body` into the new key with `{$signature}` in
  place of `{$contextSignature}`, as 6ec32f8f89 changed the variable in
  every locale. With the key in `en` only (as the diffs carry it,
  and as `pkp/pkp-lib#8423` added the Review and Production letters), a
  context created after the fix stores the letter empty in its other
  languages and shows the English one: a French journal loses the
  French Submission letter it gets today (`fr_CA` was empty in the
  journal created with the fix in).
- Contexts created on `main` before the fix keep the old letter; only
  development installs, since `main` is unreleased.
- Backport to 3.5 and 3.4: the messages there are email templates
  (`registry/emailTemplates.xml`, `email_templates_default_data`); a
  backport needs the new key, the registry `body` and an upgrade step
  that rewrites the stored default body.

Medium: one pkp-lib migration change and the letter in three app repos,
with its translations.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/walk.js)
  takes Steps 1–4 on the three apps, on an install freshly reset to the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assign-editor-email-two-footers/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/neighbour.js)
  is the Review-stage control;
  [newcontext.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-editor-email-two-footers/newcontext.js)
  creates a context and reads its stored letters.
- The upgraded install (Steps 5–6) was walked with the fix in only.
  Without the fix, its stored `EDITOR_ASSIGN_SUBMISSION` (OJS, OMP) and
  OPS's `EDITOR_ASSIGN_PRODUCTION` were read in the database: they end
  `{$contextSignature}`. The 3.5 dataset holds each of them as an
  `email_templates` row with `alternate_to` and no settings.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30).
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP
  `3b0ecf794c` and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`);
  `stable-3_5_0` OJS `92b9a16b48`, OMP `3081c9b00d`, OPS `cf4fce69bd`
  (lib/pkp `a9c76aed62`); `stable-3_4_0` OJS `9571d8fde7`, OMP
  `0aec65441f`, OPS `acd8ae704b` (lib/pkp `df13621c2d`);
  `stable-3_3_0` OJS `9fdb9bcf9a`, OMP `8e72fc8836`, OPS `c5532e2161`
  (lib/pkp `d446601ebe`).
- 3.4 (code): the same registry lines and locale endings as 3.5;
  lib/pkp's `sendMessage()` calls `allowUnsubscribe()` and the
  `Discussion` trait adds the discussion footer.
- 3.3 (code): OJS's `EDITOR_ASSIGN` letter (`locale/en_US/emails.po`)
  ends "Thank you." with no signature variable;
  `StageParticipantNotifyForm::_getMailTemplate()` sends it without the
  signature, and 3.3 has no unsubscribe footer.
- Not driven: "Notify" with "Assign Editor"; a journal whose signature
  is not the default; a journal that edited its "Assign Editor" text.
