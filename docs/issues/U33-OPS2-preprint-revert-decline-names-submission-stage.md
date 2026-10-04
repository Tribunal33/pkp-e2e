# "Revert Decline" on a preprint says it is active "in the submission stage", and its email speaks of a review the preprint never had

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; "Revert Decline" asks for a confirmation only, with no email and no closing window)
- **Introduced** `pkp/ops#240` for `pkp/pkp-lib#7265` · [1cd7aad47c](https://github.com/pkp/ops/commit/1cd7aad47c4b523d7d5f74bb95c1220b11c50f3a) · 2022-02-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U33 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U33-production-stage.md#ops2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A Preprint Server Manager or Moderator who reverts the decline of a
preprint reads, on the closing window, "The submission, {title}, is now
active in the submission stage. The author has been notified, unless you
chose to skip that email." A preprint server has no Submission stage.
The preprint is back in Production, as its stage bubble and buttons
show.

The email this decision sends is named and described as if the preprint
had been declined without review. The "Notify Authors" page offers the
template "Reinstate Submission Declined Without Review" and asks the
moderator to tell the author "whether the submission is expected to
undergo further review". Settings › Workflow › Emails describes the
email as "This email notifies the author that a previous decision to
decline their submission without review is being reverted." The author
receives the right email, "We have reversed the decision to decline your
submission", which says "A moderator will look further at your
submission before deciding whether to decline or post the submission."

Nothing is lost, since the decline is reverted as intended. Only the
staff's screens mislead. The template's name is stored when a server is
installed, so existing servers keep the old name unless it is repaired.

## Impact

- **Lost**: nothing; the decision is recorded and the author's email is
  right.
- **Who**: a Preprint Server Manager or an assigned Moderator who
  reverts a decline, on every preprint server. Reverting a decline is a
  rare action. The author sees none of the wrong wording.
- **Way round**: a manager can rename the template in the email's
  "Edit" window on Settings › Workflow › Emails. The closing text and
  the "Notify Authors" instruction cannot be changed on screen.

Low: the wording is wrong, but nothing is lost and the task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`, or the one for
  `stable-3_5_0` on a 3.5 install (the server `publicknowledge`).
- Submission 4, "Genetic transformation of forest trees", is declined in
  Production in the dataset. Its author is Diaga Diouf (`ddiouf`).
  Nothing needs to be created.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`), a Preprint Server
   manager.
2. Open submission 4
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`,
   or "View" on its row in the dashboard's "Declined" view). The
   workflow opens on "Preprint: Title & Abstract", with the bubble
   "Declined".
3. Select "Production" in the workflow's menu. The buttons are "Post
   the preprint", "Revert Decline" and "Delete".
4. Press "Revert Decline". The "Revert Decline" page opens with one
   step, "Notify Authors". Read the template listed under "Email
   Templates".
5. Press "Record Decision" and read the window that opens.
6. Open Settings › Workflow › "Emails" and its link "Add and edit
   templates". Read the two decline emails, then press "Edit" on the
   one for reverting.

**Expected**: at step 5, "Submission Reactivated" with a sentence that
a preprint server can say: the preprint is active again in Production.
At steps 4 and 6, the email and the step's instruction speak of a
preprint server's moderation, as its neighbour "Submission Declined"
does, not of review.

**Observed**: step 5 shows:

```
Submission Reactivated
The submission, Genetic transformation of forest trees, is now active in the submission stage. The author has been notified, unless you chose to skip that email.
View Submission Summary
```

At step 4 the only template is "Reinstate Submission Declined Without
Review", and the step reads "Send an email to the authors to let them
know that a previous decision to decline this submission has been
reverted. Explain why the decision was reverted and let them know
whether the submission is expected to undergo further review." At step
6 the list holds:

```
Reinstate Submission Declined Without Review
This email notifies the author that a previous decision to decline their submission without review is being reverted.

Submission Declined
This email notifies the author that their preprint has been declined and will not be posted.
```

The "Edit" window lists the one template, "Reinstate Submission
Declined Without Review", marked "Default". After step 5 the workflow
shows the bubble "Production" and the buttons "Post the preprint" and
"Decline Submission".

## Cause

OPS's decision `APP\decision\types\RevertDecline`
(`classes/decision/types/RevertDecline.php`) subclasses lib/pkp's
`PKP\decision\types\RevertInitialDecline`. That class is the journal's
and press's way of reverting a decline made in the Submission stage.
The OPS subclass changes only `getStageId()` (Production) and the file
attachers. Everything it says comes from the parent:

- `getCompletedMessage()` reads
  `editor.submission.decision.revertInitialDecline.completed.description`
  ("The submission, {$title}, is now active in the submission
  stage. …", lib/pkp `locale/en/submission.po`).
- The decision sends `DecisionRevertInitialDeclineNotifyAuthor`. That
  email's name and description keys are
  `mailable.decision.revertInitialDecline.notifyAuthor.name` and
  `….description` ("Reinstate Submission Declined Without Review",
  "…without review is being reverted.", lib/pkp `locale/en/manager.po`).
  OPS's `registry/emailTemplates.xml` uses the same name key for the
  default template `EDITOR_DECISION_REVERT_INITIAL_DECLINE`.
- The "Notify Authors" step's instruction,
  `editor.submission.decision.revertDecline.notifyAuthorsDescription`
  ("…let them know whether the submission is expected to undergo further
  review.", lib/pkp `locale/en/submission.po`), assumes a journal's
  review too.

OPS gives its own words to the decline email that sits next to this one
on Settings › Emails. Its `locale/en/manager.po` overrides that email's
name and description ("Submission Declined", "…their preprint has been
declined and will not be posted."; added by
[1ffb5d31cb](https://github.com/pkp/ops/commit/1ffb5d31cb6f0dcf391dea0db640feb154eb99a3)
for `pkp/pkp-lib#8529`). Its `locale/en/emails.po` also overrides the
revert email's body ("A moderator will look further at your
submission…"), so what the author receives is right. The revert
decision's closing text, its step instruction and its email's name and
description have no override, so the journal's words show through.

The template's name is stored when a server is installed:
`EmailTemplate\DAO::installEmailTemplateLocaleData()` writes the
translated name into `email_templates_default_data.name`. The email's
own name and description in the Settings › Emails list are read from
the locale at each request. The template's name is the stored one, and
it shows on the "Notify Authors" template button and as the template's
entry, marked "Default", in the email's "Edit" window.

Reach:

- Other languages: OPS's French overrides of the decline email are
  empty, so a French server uses lib/pkp's journal wording for both
  emails. The dataset stores "Soumission refusée avant évaluation" as
  the French name of the decline template. This was checked in the code
  and the stored data, not walked.
- The revert decision's other strings, the email's subject and the
  Activity Log line, name no stage or review the server lacks (code).
- OPS's other decisions (`Decline`, `ReturnToWorkflow`, `ReturnToDone`)
  name no stage the server lacks (code).
- OJS and OMP: `RevertInitialDecline` runs in their Submission stage,
  where the text is right (code).

## Proposed fix

Give the revert decision OPS's own words, the way OPS already does for
the decline. The tried diff,
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-revert-decline-names-submission-stage/fix.diff),
makes these changes:

- In OPS's `locale/en/submission.po`, override
  `editor.submission.decision.revertInitialDecline.completed.description`
  with "The submission, {$title}, is now active in the production
  stage. The author has been notified, unless you chose to skip that
  email.", and `editor.submission.decision.revertDecline.notifyAuthorsDescription`
  with "Send an email to the authors to let them know that a previous
  decision to decline this submission has been reverted. Explain why the
  decision was reverted and let them know that a moderator will look at
  the preprint again before deciding whether to post it." The second key
  is shared with lib/pkp's after-review `RevertDecline`, which OPS does
  not offer.
- In OPS's `locale/en/manager.po`, next to the decline email's
  overrides, override
  `mailable.decision.revertInitialDecline.notifyAuthor.name` with
  "Reinstate Declined Submission" and `….description` with "This email
  notifies the author that a previous decision to decline their preprint
  is being reverted." "Reinstate Declined Submission" is word for word
  lib/pkp's name for the after-review revert email
  (`mailable.decision.revertDecline.notifyAuthor.name`). OPS's
  `classes/mail/Repository.php` does not register that email, so no two
  entries share the name.
- Add an OPS upgrade step,
  `classes/migration/upgrade/v3_6_0/RevertDeclineEmailName.php`. It is
  listed in `dbscripts/xml/upgrade.xml`'s `3.3.0.0`–`3.5.9.9` block,
  beside OPS's other 3.6.0 steps, so that every server upgrading to 3.6
  runs it. It reinstalls the default data of
  `EDITOR_DECISION_REVERT_INITIAL_DECLINE` through
  `installEmailTemplates(…, emailKey: …)`. The pattern is lib/pkp's
  `I12903_ReviewerUnassignEmailTemplate` for `REVIEW_CANCEL`, which
  OJS's and OMP's `upgrade.xml` list but OPS's does not today. The call
  deletes and rewrites the default name, subject and body in every
  installed language, not only the name. The subject and body come out
  as before, because their strings are unchanged, and French keeps its
  name, because it has no override. A manager's edits to the template
  are stored apart from the default data, in `email_templates` and
  `email_templates_settings`, so they are kept.

The fix was tried on OPS `main`, on a server upgraded from the 3.5
dataset so that the upgrade step ran. The closing window read "…is now
active in the production stage…", and the step read the new
instruction. The template button and the list entry read "Reinstate
Declined Submission", with the new description, and the author's email
kept its subject and body. The control was "Decline Submission" on
submission 1: its template, step instruction, closing text, list entry
and email were the same with the fix in and out.

**Alternatives**:

- Override `getCompletedMessage()` in OPS's `RevertDecline` with a new
  key. This works too, but it adds a key and a method where a locale
  override, OPS's pattern for this pair, is enough.
- Make lib/pkp's text stage-neutral ("is active again"). This changes
  the OJS and OMP wording, which is right there, and every translation.
- Leave out the upgrade step. Servers that already exist would then keep
  "Reinstate Submission Declined Without Review" on the template button
  until a manager renames it.

**What goes with it**:

- The four keys are new English overrides, and OPS's other languages
  need them translated.
- For 3.5 and 3.4, backport the locale lines alone; they apply as
  written. No database step is proposed on a stable branch for a
  wording fix. Servers on those branches keep the stored template name
  until they upgrade to 3.6, which runs the step.
- The guard: U33's scenario 9 ("Decline, revert and delete a preprint")
  reads the closing text and the template name.

Medium: four strings in OPS's English locale are a small change, but
renaming the stored template on existing servers needs an upgrade step.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-revert-decline-names-submission-stage/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps through the
  screens on PKP's default test dataset. `MODE=nb` runs the control,
  "Decline Submission" on submission 1, alone. Run from pkp-e2e on a
  dataset fleet:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/preprint-revert-decline-names-submission-stage/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on OPS `main` and 3.5, on PostgreSQL, with the same Observed
  on both. The decision request answered 200, the stored status went
  from declined (4) to queued (1) at Production (stage 5), and no
  request failed and no script error was logged.
- Tips: `main` OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 OPS 38b61882d3
  (lib/pkp cf3f984335); 3.4 OPS acd8ae704b (lib/pkp 767353f4fe); 3.3
  OPS c5532e2161 (lib/pkp ac3fa73402). Datasets: pkp/datasets 1a5552c
  (2026-10-04).
- Code reads: OPS `RevertDecline`, lib/pkp `RevertInitialDecline`, the
  three locale keys, OPS's `locale/en` overrides and
  `registry/emailTemplates.xml` on `main` and 3.5 (the same lines). On
  3.4 (`upstream/stable-3_4_0`, lib/pkp `origin/stable-3_4_0`): the same
  subclass at Production, the same inherited message and keys, and only
  the decline email overridden in OPS's `manager.po`. On 3.3: OPS's
  `EditorDecisionActionsManager` offers "Revert Decline" at Production
  through lib/pkp's `RevertDeclineForm`, whose template asks only "Are
  you sure you want to reverse the decision to decline this
  submission?". There is no email and no closing text.
- Introduced: the method, the keys and their English text came with
  lib/pkp `f75706ba57` (`pkp/pkp-lib#7631` for `pkp/pkp-lib#7265`), for
  the journal's Submission stage, where they are right. OPS's subclass,
  which carries them into Production, came with `1cd7aad47c`
  (`pkp/ops#240`).
- Upstream search (2026-10-04): pkp/pkp-lib and pkp/ops, by "revert
  decline" with OPS, "submission stage" with preprint, "Reinstate
  Submission Declined Without Review", `RevertInitialDecline`,
  `RevertDecline` and the message key. The nearest hits are
  `pkp/pkp-lib#5819` (OPS could not revert a decline, closed with the 3.3
  form), `pkp/ops#600` (decision constants migration) and
  `pkp/pkp-lib#5730` (email wording, before this decision existed).
  None is about this wording.
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-revert-decline-names-submission-stage/fix.diff ops`.
  The fleet was loaded from the 3.5 dataset with
  `PKP_E2E_DATASET_BRANCH=stable-3_5_0`, which runs the 3.6.0 upgrade
  and its new step, and the stored English name became "Reinstate
  Declined Submission". The walk ran as above, then `MODE=nb` on the
  `main` dataset with the fix in and after
  `node bin/try-fix.js revert … ops`. The author's email was read in
  the mailbox on the fix walk; its subject and body match the default
  template stored on the unpatched `main` dataset.
- Not driven: the Moderator's view of the same pages (code: the same
  decision and the same texts); a French server (code and stored data).
- MySQL not checked; nothing here depends on the database.
