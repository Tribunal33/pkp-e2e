# "Submission complete" tells the submitter a confirmation was emailed when none was sent

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; only when the confirmation email template is disabled)
- **Introduced** not traced; present since at least [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77) (2022-10-18)
- **Upstream** none found (2026-10-01)
- **Tracked in** U21 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

After submitting, the "Submission complete" screen tells the submitter
"…you've been emailed a confirmation for your records." No email is sent
in two cases, and the screen says it anyway. One is a journal, press or
server whose "Submission Confirmation" setting is "Do not send an email."
The other is an editor who submitted under their editorial role.

The submission itself goes through. A submitter who looks for the promised
email finds nothing and may wonder whether it did.

## Impact

- **Lost**: nothing; the submission is made.
- **Who**: every submitter where "Submission Confirmation" is turned off
  (it is on by default, set to all authors). On a journal or press, also
  editors who submit under their editorial role; whether they should get
  the email is its own report
  ([U21-A7-OPS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A7-OPS5-editorial-submitter-no-acknowledgement.md)).
  On a preprint server, only submitters whose preprint a moderator must
  review read the claim, so editors there are not misled.
- **Way round**: none needed; the submission is on the submitter's
  dashboard.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same way). Its
  "Submission Confirmation" setting is at the default, "Send an email to all
  authors." `dbarnes` is a "Journal editor" ("Press editor", "Preprint
  Server manager"). That is his only role, so the wizard submits under it
  without a "Submit As" choice.

Editor submitting (OJS, OMP):

1. Sign in as `dbarnes`.
2. Start a new submission ("New Submission",
   `/index.php/publicknowledge/en/submission`): title "u21ir28 editor",
   section "Articles" (OMP: the start page has no section), tick the
   requirements and privacy boxes, "Begin Submission".
3. Upload a manuscript, type an abstract on "Details", leave "Contributors"
   as it is, and press "Continue" up to "Review" (OMP: series "Library &
   Information Studies" on "For the Editors"). Press "Submit", then
   "Submit" in the confirmation.

Confirmation turned off (all three apps):

4. Sign in as `rvaca`. Open Settings › Workflow › "Emails", choose "Do not
   send an email." under "Submission Confirmation", and press "Save".
5. Sign in as the author `ccorino` (OMP: `aclark`) and repeat steps 2 and 3
   with the title "u21ir28 author off" (OPS: section "Preprints", a galley
   labelled "PDF" instead of the manuscript, and a "Relation status" answer
   on "For Readers").
6. As `rvaca`, open each of the two submissions from the dashboard and
   press "Activity Log" in its header. Every email sent about the
   submission is listed there as "An email has been sent: <subject>".

**Expected**: after steps 3 and 5 "Submission complete" says the journal
(press, server) has been notified, and says nothing about an email.

**Observed**: after step 3 (OJS, OMP) and step 5 (all three apps) the
screen reads:

```
The journal has been notified of your submission, and you've been emailed a confirmation for your records.
```

OMP reads "The press has been notified…". OPS reads "Thank you for
submitting your preprint. The server has been notified of your submission
and you have been emailed a confirmation for your records." In step 6
neither Activity Log lists "An email has been sent: Thank you for your
submission to Journal of Public Knowledge". On OJS and OMP the only emails
listed are "You have been assigned as an editor on a submission to …"; on
OPS none.

Control: with the setting at its default, the author's screen shows the
same sentence, and the Activity Log lists "An email has been sent: Thank
you for your submission to Journal of Public Knowledge".

## Cause

`PKPSubmissionHandler::complete()`
(`lib/pkp/pages/submission/PKPSubmissionHandler.php`) gives the template
nothing about the confirmation. `lib/pkp/templates/submission/complete.tpl`
always prints `submission.submit.whatNext.description`, a fixed string in
the OJS and OMP locales: "…and you've been emailed a confirmation for your
records." OPS's own `templates/submission/complete.tpl` prints
`submission.submit.complete.canNotPost`, with the same claim, to viewers
who cannot post.

Whether the email goes out is decided in
`SendSubmissionAcknowledgement::handle()`. It stops at once when
"Submission Confirmation" is off, a check that
[64674f9b54](https://github.com/pkp/pkp-lib/commit/64674f9b54766bb2b867ff9edf03dc7866c97b3c)
(`pkp/pkp-lib#9808` for `pkp/pkp-lib#9797`) added without touching the
screen. It also mails only users with an Author-role stage assignment,
which leaves out an editorial-role submitter. The sentence is older than
both rules. It dates from when every submitter got the email unless the
template was disabled.

The reach of the cause:

- OJS and OMP share the template, so both cases show (checked on screen).
- OPS: a manager reads "You can now post your preprint publicly.", which
  makes no claim (checked on screen).
- `PKPSubmissionHandler` shows this screen for any later visit to a
  submitted submission's wizard address, so whoever opens it reads the
  claim, sent or not (checked in the code).

## Proposed fix

Let the screen say what happened. `complete()` looks in the submission's
email log for a confirmation sent to this user, and the templates choose
between the present sentence and one without the email:

```diff
+            // Whether this user was sent the submission acknowledgement
+            'confirmationEmailed' => Repo::emailLogEntry()->getByEventType(
+                $submission->getId(),
+                SubmissionEmailLogEventType::AUTHOR_SUBMISSION_ACK,
+                Application::ASSOC_TYPE_SUBMISSION,
+                $request->getUser()->getId()
+            )->isNotEmpty(),
```

```diff
-        <p>{translate key="submission.submit.whatNext.description"}</p>
+        {if $confirmationEmailed}
+            <p>{translate key="submission.submit.whatNext.description"}</p>
+        {else}
+            <p>{translate key="submission.submit.whatNext.descriptionNoEmail"}</p>
+        {/if}
```

The pkp-lib part, the handler and the shared template, is one change made
once. Each app adds a string: `submission.submit.whatNext.descriptionNoEmail`
in OJS and OMP ("The journal has been notified of your submission. Once
the editor has reviewed the submission, they will contact you."), and
`submission.submit.complete.canNotPostNoEmail` in OPS, which its own
template uses the same way. The three diffs, one per app root, each carry
the pkp-lib part beside the app's own lines:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-confirmation/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-confirmation/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-confirmation/fix-ops.diff).

The listener logs the confirmation under `AUTHOR_SUBMISSION_ACK` during
the submit request, so the entry exists before the screen loads.
`getByEventType()` with a user id is the repository method
`PKPAuthorDashboardHandler::readSubmissionEmail()` also uses, there for
`EDITOR_NOTIFY_AUTHOR`. Reading the log, not the setting, keeps the screen
right whatever decided the recipients: the setting, the "Submit As" role,
a fix to the recipients, a plugin.

Tried on `main` in all three apps. The editor's screen (OJS, OMP) and the
author's screen with confirmations off (all three) read the new sentence.
As a check that the fix goes no further, an author submitting with the
default setting still read the email sentence and received the
confirmation.

**Alternatives**:

- Pass the setting only: fixes the confirmation-off case, stays wrong for
  an editorial-role submitter, and repeats the listener's rules in the
  handler.
- Reword the sentence so it never mentions an email: no code, but the
  common case loses useful information; a product call.

**What goes with it**:

- The new strings in the other locales. Until a locale has them, it shows
  the raw key (`##submission.submit.whatNext.descriptionNoEmail##`), as
  `Locale::translate()` does for any missing key.
- An end-to-end check that with confirmations off the completion screen
  makes no email claim.
- No stored data to repair.
- 3.5 takes the diffs as they stand. 3.4 reads the log through
  `SubmissionEmailLogDAO::getByEventType()` with
  `SubmissionEmailLogEntry::SUBMISSION_EMAIL_AUTHOR_SUBMISSION_ACK`.

Medium: more than new wording, since the screen has to work out whether
this user was sent the email (one change in pkp-lib), and each app needs
a new sentence for when they were not.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-confirmation/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/lib.js)),
  run on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/completion-screen-claims-unsent-confirmation/walk.js`.
  The check with the default setting is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-confirmation/neighbour.js),
  walked with each app's diff applied to its root and without it.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, PKP
  datasets commit 27f1204 (2026-10-01). Tips: `main` OJS 4408b94def
  (pkp-lib f5bd392a69), OMP 3b0ecf794 and OPS c8af945bb7 (pkp-lib
  3dc90c81a6); `stable-3_5_0` OJS 18d097d94e, OMP b24879c3d, OPS
  3f0919468c (pkp-lib 1fb843f491); `stable-3_4_0` OJS 9571d8fde7, OMP
  0aec65441, OPS acd8ae704b (pkp-lib df13621c2d); `stable-3_3_0` OJS
  9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161 (pkp-lib d446601ebe).
- Code reads: `complete()`, both `complete.tpl` files and the strings on
  `main` and 3.5 (the same). On 3.4 the same template and strings, with
  the listener's setting check backported (`pkp/pkp-lib#9800`). On 3.3
  `templates/submission/form/complete.tpl` (pkp-lib's for OJS and OMP;
  OPS's own, through `author.submit.authorCanNotPublish` and
  `author.submit.authorCanPublish`) prints the same fixed claim, while
  `SubmissionSubmitStep4Form::execute()` sends `SUBMISSION_ACK` only when
  the template is enabled (`can_disable="1"` in each app's
  `registry/emailTemplates.xml`).
- The 3.5 walk ran before step 6 read the Activity Log, so on 3.5 the
  mailboxes alone show that no confirmation went out.
- Introduced: the sentence is already in OJS's locale when it was
  converted to PO in 2019 (`pkp/ojs` 5880a5a87d). The 3.4 template comes
  from e79fc21e20 (`pkp/pkp-lib#8495` for `pkp/pkp-lib#7191`), which also
  limited the email to Author-role assignments. The confirmation-off case
  became wrong with 64674f9b54 (`pkp/pkp-lib#9808`, Touhidur Rahman), which
  made the listener honour "Do not send an email."
