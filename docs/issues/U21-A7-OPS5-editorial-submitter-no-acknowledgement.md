# An editor or manager who submits under their own role gets no submission confirmation email

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the confirmation goes to whoever submits)
- **Introduced** `pkp/pkp-lib#8495` for `pkp/pkp-lib#7191` · [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77) · 2022-10-18 · Nate Wright (NateWr), in a PR opened by Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#11723` (open): co-authors' emails show a blank submitter name, another symptom of the same cause
- **Tracked in** U21 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a7), [OPS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal editor, press editor or preprint server manager who makes a
submission under their editorial role gets no confirmation email. An author
making the same submission gets "Thank you for your submission to …". On
OJS and OMP the "Submission complete" screen still tells the editor they
were emailed one.

On a preprint server this hits every manager who submits their own
preprint. OPS has a confirmation written for submitters who may post
without moderation, and it never reaches them.

Co-authors named on such a submission still get their own email, but it
reads "The submitter, , provided the following details". When the journal
copies confirmations to its primary contact or to other addresses, those
copies are lost as well.

## Impact

- **Lost**: the submitter's confirmation, and the copies sent with it under
  "Notify Primary Contact" and "Notify Anyone". The journal's editors still
  learn of the submission: the section's editors get "You have been
  assigned as an editor on a submission to …", or, when the section
  assigns nobody, every manager gets "A new submission needs an editor to
  be assigned".
- **Who**: users who submit under an editorial role. A user whose only
  role is editorial, and a site administrator, who is offered only
  editorial roles, always do. A user who also holds the Author role picks
  in "Submit As", which preselects the first role it lists. The code does
  not fix that order; for a section editor who is also an author, the
  editorial role comes first on the default dataset
  ([U21-A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A14-section-editor-submit-as-refused.md)).
- **Way round**: none.

Low: a confirmation is silently not sent, but only to editorial-role
submitters, who have the submission on their own dashboard, and the
journal's editors are notified by other emails. It would be medium if a
journal relied on the "Notify Primary Contact" or "Notify Anyone" copies
as its only notice of new submissions.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same way). Its
  "Submission Confirmation" setting is at the default, "Send an email to all
  authors." `dbarnes` is a "Journal editor" ("Press editor", "Preprint
  Server manager"). That is his only role, so the wizard shows no "Submit
  As" choice and submits under it.

Steps:

1. Sign in as `dbarnes`.
2. Start a new submission ("New Submission",
   `/index.php/publicknowledge/en/submission`): title "u21ir28 editor",
   section "Articles" (OMP: no section here; OPS: "Preprints"), tick the
   requirements and privacy boxes, "Begin Submission".
3. Upload a manuscript (OPS: add a galley labelled "PDF") and type an
   abstract on "Details". Leave "Contributors" as it is: `dbarnes` is not
   listed there, and do not add him. Press "Continue" up to "Review" (OMP:
   series "Library & Information Studies" on "For the Editors"; OPS:
   answer "Relation status" on "For Readers"). Press "Submit", then
   "Submit" in the confirmation.
4. Sign out, sign in as the author `ccorino` (OMP: `aclark`), and repeat
   steps 2 and 3 with the title "u21ir28 author".
5. As `dbarnes`, open each of the two submissions from the dashboard and
   press "Activity Log" in its header. Every email sent about the
   submission is listed there as "An email has been sent: <subject>".

**Expected**: `dbarnes` receives the confirmation, "Thank you for your
submission to Journal of Public Knowledge", as the author does, and his
submission's Activity Log lists it. On OPS he
receives the version for a submitter who may post: "…As a trusted author,
no moderation is required, so we invite you to post your preprint as soon
as you are ready."

**Observed**: the Activity Log of `dbarnes`'s submission lists no
confirmation. On OJS and OMP its only emails are "An email has been sent:
You have been assigned as an editor on a submission to Journal of Public
Knowledge" ("… to Public Knowledge Press"); on OPS it lists none. The
author's submission lists "An email has been sent: Thank you for your
submission to Journal of Public Knowledge" (Public Knowledge Press, Public
Knowledge Preprint Server). The mailboxes agree: `dbarnes@mailinator.com`
holds no confirmation, the author's holds one. His "Submission complete"
screen on OJS and OMP reads:

```
The journal has been notified of your submission, and you've been emailed a confirmation for your records.
```

## Cause

`SendSubmissionAcknowledgement::handle()`
(`lib/pkp/classes/observers/listeners/SendSubmissionAcknowledgement.php`,
lines 47–51) sends the confirmation to the users who hold a stage
assignment in an Author-role group:

```php
$assignedUserIds = StageAssignment::withSubmissionIds([$event->submission->getId()])
    ->withRoleIds([Role::ROLE_ID_AUTHOR])
```

`PKPSubmissionController::add()` accepts a Manager-role or an Author-role
group from "Submit As" and assigns the submitter in it. It makes the
submitter a contributor only when the group is Author. So a submitter
under a Manager-role group (the editorial roles) is neither a recipient
nor one of the "other authors", and the listener sends them nothing.

This breaks the rule in the listener's own `@brief` line, "Send an email
acknowledgement to the submitting author", and in the setting's label,
"Send an email to the submitting author only." Up to 3.3,
`SubmissionSubmitStep4Form::execute()` sent `SUBMISSION_ACK` to the user
who submitted, whatever role they chose. The new submission wizard of
`pkp/pkp-lib#7191` moved the sending into this listener and limited it to
Author-role assignments, while "Submit As" kept offering the editorial
roles.

The reach of the cause:

- OPS: `APP\observers\listeners\SendSubmissionAcknowledgement` switches to
  `SubmissionAcknowledgementCanPost` when every recipient passes
  `canCurrentUserPublish()`. That method is true for a non-author, but an
  Author-role recipient passes only through the
  `Publication::canAuthorPublish` hook. A manager, who could post, is never
  a recipient, so the "no moderation required" version never reaches one
  (checked on screen).
- `SubmissionAcknowledgementOtherAuthors` takes the submitter's name from
  the same empty recipient list (`pkp/pkp-lib#11723`; checked in the code).
- "Notify Primary Contact" and "Notify Anyone" are Bcc copies on the
  submitter's message, so they go only when it goes (checked in the code).
- The other Author-role selections (decision emails, the publication
  notice) address the submission's authors, not the person who submitted
  it, and are right as they are (checked in the code).

## Proposed fix

Add the user who started the submission to the recipients in the shared
listener. That user holds the submission's first stage assignment, which
`add()` makes in the group chosen in "Submit As" before any other
assignment exists
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/fix.diff)):

```diff
+        // The user who started the submission holds its first stage assignment, which
+        // PKPSubmissionController::add() makes in the group chosen in "Submit As". Under an
+        // editorial role that is not an Author assignment, so add that user here.
+        $starter = StageAssignment::withSubmissionIds([$event->submission->getId()])
+            ->orderBy('stage_assignment_id')
+            ->first();
+        if ($starter) {
+            $assignedUserIds = array_unique([...$assignedUserIds, $starter->userId]);
+        }
```

Taking the first assignment, not the user pressing "Submit", matters for
two reasons. `AssignEditors` listens to the same event and runs first
(pkp-lib's listeners are discovered before the app's), so by the time this
listener runs, a manager who is one of the section's editors already holds
an assignment. And a manager may finish and submit an author's draft. In
both cases the first assignment still belongs to the person who started
the submission, so the author is thanked and the manager is not. The
answer does not depend on listener order or on there being a request.

The rule lives in the shared listener, so all three apps follow. OPS's
subclass then picks the "no moderation required" version for a manager
through `canCurrentUserPublish()`. The co-author message gets the
submitter's name, which settles `pkp/pkp-lib#11723` too. The setting still
comes first: "Do not send an email." sends nothing.

Tried on `main` in all three apps. `dbarnes` received "Thank you for your
submission to …" (on OPS with the "no moderation is required" text), and
the author still received exactly one. Two checks of nearby cases, with
the fix in:

- `ccorino` started a draft and `dbarnes` finished and submitted it:
  `ccorino` received the confirmation and `dbarnes` did not, though on OJS
  the section had assigned him by then. The same without the fix.
- With "Do not send an email.", `dbarnes`'s own submission sent him
  nothing.

**Alternatives**:

- Read the request's user, as `LogSubmissionSubmitted` does for the event
  log: wrong for the draft a manager finishes, and the obvious guard (the
  user holds an assignment) is defeated by `AssignEditors` running first.
- Carry the submitter on the `SubmissionSubmitted` event: the controller
  that fires it knows only who pressed "Submit", so it has the same
  problem, and it changes an event that plugins listen to.
- Send the submitter a message of their own: repeats the Bcc handling and
  the OPS choice of version the listener already has.
- Leave the recipients and correct only the completion screen: that is a
  separate fault, reported in
  [U21-A7-completion-screen-claims-unsent-confirmation.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A7-completion-screen-claims-unsent-confirmation.md),
  and on its own it leaves the email unsent.

**What goes with it**:

- A unit test of the listener with an editorial-role submitter and with a
  draft submitted by a manager, and an end-to-end check that an editor's
  own submission receives the confirmation.
- No stored data to repair.
- 3.5 takes the diff as it stands. 3.4 needs the same lookup through
  `StageAssignmentDAO::getBySubmissionAndStageId()`, taking the lowest
  assignment id.

Small: a few lines in one shared listener, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/lib.js)),
  run on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/walk.js`.
  The checks of nearby cases are
  [neighbour-draft.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/neighbour-draft.js)
  (the manager-finished draft) and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/neighbour.js)
  (confirmations off). They were walked with the diff applied to each app
  root and without it.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, PKP
  datasets commit 27f1204 (2026-10-01). Tips: `main` OJS 4408b94def
  (pkp-lib f5bd392a69), OMP 3b0ecf794 and OPS c8af945bb7 (pkp-lib
  3dc90c81a6); `stable-3_5_0` OJS 18d097d94e, OMP b24879c3d, OPS
  3f0919468c (pkp-lib 1fb843f491); `stable-3_4_0` OJS 9571d8fde7, OMP
  0aec65441, OPS acd8ae704b (pkp-lib df13621c2d); `stable-3_3_0` OJS
  9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161 (pkp-lib d446601ebe).
- Code reads: the listener and `PKPSubmissionController::add()` on `main`
  and 3.5 (the same Author-role selection, line 48 on 3.5); on 3.4 the
  listener selects with `getBySubmissionAndRoleIds(…, [Role::ROLE_ID_AUTHOR])`,
  and OPS's subclass and `SubmissionAcknowledgementCanPost` are there. The
  "Submit As" options come from `PKPSubmissionHandler::getSubmitUserGroups()`,
  a query with no order, and `StartSubmission::addUserGroups()` preselects
  the first.
- Introduced: `git log --follow` on the listener leads to its creation in
  e79fc21e20 (author Nate Wright, dated 2022-10-18), part of
  `pkp/pkp-lib#8495`, which Alec Smecher opened and which was merged on
  2022-12-14. The Author-role selection was there from the start; later
  commits only port it to Eloquent. OPS's subclass came in the matching
  OPS commit
  [8fd2c6d834](https://github.com/pkp/ops/commit/8fd2c6d8341aef30ca36115520f399af1e45494e).
- The 3.5 walk ran before step 5 read the Activity Log, so on 3.5 the
  mailboxes alone show the missing confirmation.
- Not walked: the co-author email's blank name and the lost Bcc copies,
  read in the code.
