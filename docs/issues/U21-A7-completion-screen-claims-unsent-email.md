# With submission confirmations turned off, "Submission complete" still tells authors a confirmation email was sent

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; with the "Submission Acknowledgement" email template disabled, 3.3 having no "Submission Confirmation" setting)
- **Introduced** not traced; present since at least [5880a5a87d](https://github.com/pkp/ojs/commit/5880a5a87dc4f47d5aaa77ea621e768d2c0ddc4f) (2019-09-27)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a7) (the part with confirmations turned off)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal, press or preprint server manager can set "Submission
Confirmation" (Settings › Workflow › "Emails") to "Do not send an
email." Confirmations are on by default ("Send an email to all
authors."), so this is a deliberate choice.

When it is off, an author who submits sees "Submission complete" say
"…you've been emailed a confirmation for your records." Not sending the
email is correct; only the sentence is wrong, so the author waits for an
email that will not come and may write to the journal about it.

## Impact

- **Lost:** the author's time looking for the promised email; the
  submission is not affected.
- **Who:** every author who submits where a manager turned confirmations
  off; a new journal, press or server has them on.
- **Way round:** none for the author. A manager can only leave
  confirmations on.

Low: a wrong sentence on one screen, with nothing lost; it would be
medium if confirmations were off by default.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (OJS, OMP or OPS).

1. Sign in as `rvaca` (the Journal, Press or Preprint Server manager).
2. Open Settings › Workflow › "Emails", set "Submission Confirmation"
   to "Do not send an email." and press "Save".
3. Sign out and sign in as `ccorino` (OJS, OPS) or `aclark` (OMP), who
   hold the Author role.
4. Open "New Submission" (`/index.php/publicknowledge/en/submission`).
5. Type the title "u21w34 Quiet Submission", choose the section
   "Articles" (OJS; OPS has one section and shows no choice) and the
   language "English", tick the checklist and privacy boxes, and press
   "Begin Submission".
6. "Upload Files": upload a PDF (OJS, OMP: choose its file type; OPS:
   "Add File", galley label "PDF"), then "Continue". [3.5: "Details" is
   the first step and "Upload Files" the second.]
7. "Details": type the abstract "Tides follow the moon.", then "Continue".
8. "Contributors": "Continue".
9. "For the Editors" (OMP: choose the series "Library & Information
   Studies"; OPS, "For Readers": choose "This preprint has not been
   published elsewhere."), then "Continue".
10. "Review": press "Submit", then "Submit" in the confirmation.
11. Read "Submission complete". Then check that no confirmation went
    out: the author's mailbox (`ccorino@mailinator.com`,
    `aclark@mailinator.com`, or wherever the install's mail goes), or
    the submission's email log, which holds no "Thank you for your
    submission to …" entry.

**Expected:** no email goes out, and "Submission complete" does not say
one was sent.

**Observed:** no email goes out, and "Submission complete" reads, on OJS:

```
The journal has been notified of your submission, and you've been emailed a confirmation for your records. Once the editor has reviewed the submission, they will contact you.
```

on OMP the same sentence with "The press has been notified…", and on OPS:

```
Thank you for submitting your preprint. The server has been notified of your submission and you have been emailed a confirmation for your records. Once the moderator has reviewed your submission, they will post your preprint or contact you.
```

Control: with "Submission Confirmation" left at "Send an email to all
authors.", the same text appears and the email "Thank you for your
submission to …" arrives.

## Cause

`lib/pkp/templates/submission/complete.tpl` prints
`submission.submit.whatNext.description` (from the OJS and OMP locale
files) for everyone, and OPS's `templates/submission/complete.tpl`
prints `submission.submit.complete.canNotPost` for everyone who may not
post. `PKPSubmissionHandler::complete()` passes the template nothing
about the "Submission Confirmation" setting.

The setting (`submissionAcknowledgement`, empty for "Do not send an
email.") stops the email in `SendSubmissionAcknowledgement::handle()`
since `pkp/pkp-lib#9797` (3.4.0-6); before that the email went out
anyway. In 3.3 the same sentence showed when the "Submission
Acknowledgement" email template was disabled.

Reach:

- OPS's text for submitters who may post ("You can now post your
  preprint publicly.") says nothing about an email, so it is right as it
  is (seen in the walk).
- Every translation of the two sentences carries the same claim.
- The sentence is also wrong, with confirmations on, for a submitter who
  chose a manager-level role in "Submit As": the listener mails only
  users with an Author assignment. That is a separate cause, reported as
  "Managers and editors who submit under their own role in "Submit As"
  get no confirmation email"
  ([U21-A7-OPS5-editorial-role-submitter-no-acknowledgement.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A7-OPS5-editorial-role-submitter-no-acknowledgement.md)).

## Proposed fix

A proposal; the team decides. Pass the template whether confirmations are on, and show a sentence
without the email when they are off. In `lib/pkp`:

```diff
             'workflowUrl' => $this->getWorkflowUrl($submission, $request->getUser()),
+            // Whether the "Submission Confirmation" setting is on (it says nothing of the recipients)
+            'acknowledgementEnabled' => (bool) $request->getContext()->getData('submissionAcknowledgement'),
         ]);
```

```diff
-        <p>{translate key="submission.submit.whatNext.description"}</p>
+        {if $acknowledgementEnabled}
+            <p>{translate key="submission.submit.whatNext.description"}</p>
+        {else}
+            <p>{translate key="submission.submit.whatNext.descriptionNoEmail"}</p>
+        {/if}
```

The apps add the new sentences:

- OJS, `submission.submit.whatNext.descriptionNoEmail`: "The journal has
  been notified of your submission. Once the editor has reviewed the
  submission, they will contact you."
- OMP, the same key: "The press has been notified of your submission.
  Once the editor has reviewed the submission, they will contact you."
- OPS, `submission.submit.complete.canNotPostNoEmail`: "Thank you for
  submitting your preprint. The server has been notified of your
  submission. Once the moderator has reviewed your submission, they will
  post your preprint or contact you.", with the same `{if}` in OPS's own
  `templates/submission/complete.tpl`.

There is one diff per app, each holding the same `lib/pkp` part (on OPS
the `lib/pkp` template change has no effect, since OPS uses its own
template):
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-email/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-email/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-email/fix-ops.diff).
It follows OPS's own `complete()`, which already passes a flag
(`canAuthorPublish`) that picks the sentence.

The flag reads the setting only. Whether the screen is then right for
every submitter depends on the other report's fix, which mails the
submitting user whatever role they submitted under; with both fixes in,
the setting alone decides whether the submitter gets an email.

Tried on `main` on the three apps: with "Do not send an email." each
app showed its new sentence and no email went out; with the setting at
"Send an email to all authors.", the old sentence showed and the email
arrived, with and without the fix.

**Alternatives:**

- Drop the email clause from the one sentence everywhere: no new keys,
  but authors who do get the email lose the pointer to it.
- Repeat the listener's own rule in the page (the setting is on and the
  viewer has an Author assignment on this submission): right today for a
  manager-level submitter, but it copies a rule the other report's fix
  changes, and the two would have to be kept in step.
- Look up whether a confirmation to this viewer is in the submission's
  email log: exact, but ties the page to the email log, which is a
  record of messages rather than a source for page text.

**What goes with it:**

- The new keys need translations; a language without them shows the
  raw key, so they go through the usual translation flow before a
  release.
- No stored data to repair.
- Backport: 3.5 and 3.4 have the same template and setting, and the
  diffs apply to 3.5 as written; 3.3 would key on the "Submission
  Acknowledgement" template's enabled state instead.
- Guard: an end-to-end check of "Submission complete" with
  confirmations off.

Medium: each change is a few lines, but the fix spans `lib/pkp`, the
three apps' locale files and OPS's template, and adds new strings for
translators.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/completion-screen-claims-unsent-email/walk.js)
  (the wizard steps in
  [submit.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-role-submitter-no-acknowledgement/submit.js)),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/completion-screen-claims-unsent-email/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1–11;
  `NEIGHBOUR=1` in front skips steps 1–2 (the control with the default
  setting). It also reads the setting and the submission's email log
  from the database.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/completion-screen-claims-unsent-email/fix-<app>.diff <app>`
  for each app, the script, the script with `NEIGHBOUR=1` in front, then
  `node bin/try-fix.js revert ojs omp ops`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` (OJS bade233f73, OMP 3b0ecf794, OPS
  c8af945bb7; their `lib/pkp` 2e377d27fc, 3dc90c81a6, 3dc90c81a6) and
  `stable-3_5_0` (OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd;
  `lib/pkp` a9c76aed62). Nothing here depends on the database.
- The default: `lib/pkp/schemas/context.json` gives
  `submissionAcknowledgement` the default `allAuthors`.
- 3.4 (code): `lib/pkp` `stable-3_4_0` (df13621c2d)
  `templates/submission/complete.tpl` prints the sentence for everyone,
  and its listener returns early when the setting is empty (the
  `pkp/pkp-lib#9797` backport, 3d77275802, `pkp/pkp-lib#9800`); OJS
  `stable-3_4_0` (9571d8fde7) carries the same sentence and OPS
  (acd8ae704b) the same `canNotPost` branch.
- 3.3 (code): `lib/pkp` `stable-3_3_0` (d446601ebe)
  `templates/submission/form/complete.tpl` prints
  `submission.submit.whatNext.description` for everyone, while OJS
  (9fdb9bcf9a) and OMP (8e72fc883) `SubmissionSubmitStep4Form` send the
  confirmation only when the `SUBMISSION_ACK` template is enabled
  (`can_disable="1"` in their `registry/emailTemplates.xml`). OPS
  (c5532e2161) shows `author.submit.authorCanNotPublish`, which makes
  the same claim, whether or not the template is enabled.
- Introduced: the oldest commit found carrying the sentence is OJS's
  5880a5a87d, the locale files' conversion to PO, on `stable-3_3_0`.
- Not driven: "Send an email to the submitting author only." (the
  sentence is true there); languages other than English.
