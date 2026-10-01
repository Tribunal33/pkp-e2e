# Managers and editors who submit under their own role in "Submit As" get no confirmation email

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the confirmation went to whoever submitted)
- **Introduced** `pkp/pkp-lib#8495` for `pkp/pkp-lib#7191` · [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77) · 2022-10-18 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#11723` (open), covering another symptom of the same cause: the message to the submission's other authors leaves out the submitter's name
- **Tracked in** spec U21 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a7) (its editorial-role half), [OPS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A user who submits under a manager-level role in "Submit As" gets no
"Thank you for your submission" email. Those roles are Journal manager,
Journal editor and Production editor on a journal; Press manager, Press
editor and Production editor on a press; and Preprint Server manager on a
preprint server. A user who holds only such a role has no other choice:
the wizard submits under it.

On a journal or press, "Submission complete" still tells them "you've
been emailed a confirmation for your records". On a preprint server, the
confirmation that tells a submitter they may post the preprint
themselves is never sent to the manager it was written for.

The copies of the confirmation that the journal, press or server has set
up (to its primary contact and to any "Notify Anyone" address) are not
sent either, and the email cannot be sent afterwards.

## Impact

- **Lost:** one email per submission and the context's copies of it.
  The submission and the editors' notices are not affected.
- **Who:** managers and editors who submit their own work or an
  editorial, or who enter a submission for an author who sent it by
  email. On a preprint server, every preprint a manager submits, since
  managers hold no Author role by default. Section editors, series
  editors and moderators are not offered their own role in "Submit As",
  so they submit as Author and are not affected.
- **Way round:** a submitter who also holds the Author role can choose
  "Author" in "Submit As". Otherwise none.

Medium: every manager-level role is affected, entering submissions under
that role is ordinary editorial practice, and the context's record
copies go missing while the screen says the email went out. It would be
low if only the submitter's own email were lost.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Its
  "Submission Confirmation" (Settings › Workflow › "Emails") is "Send an
  email to all authors."
- `dbarnes` holds one role in `publicknowledge`: "Journal editor" (OJS),
  "Press editor" (OMP), "Preprint Server manager" (OPS). So the wizard
  shows no "Submit As" choice and submits under that role.

Steps:

1. Sign in as `dbarnes`.
2. Open "New Submission" (`/index.php/publicknowledge/en/submission`).
3. Type the title "u21w34 Editor's Own Paper", choose the section
   "Articles" (OJS; OPS has one section and shows no choice) and the
   language "English", tick the checklist and privacy boxes, and press
   "Begin Submission".
4. "Upload Files": upload a PDF (OJS, OMP: choose its file type; OPS:
   "Add File", galley label "PDF"), then "Continue". [3.5: "Details" is
   the first step and "Upload Files" the second.]
5. "Details": type the abstract "Tides follow the moon.", then "Continue".
6. "Contributors": "Continue" without adding anyone.
7. "For the Editors" (OMP: choose the series "Library & Information
   Studies"; OPS, "For Readers": choose "This preprint has not been
   published elsewhere."), then "Continue".
8. "Review": press "Submit", then "Submit" in the confirmation.
9. Read "Submission complete".
10. Open the mailbox of `dbarnes@mailinator.com`, or the submission's
    email log.

**Expected:** an email "Thank you for your submission to Journal of
Public Knowledge" reaches `dbarnes` (OMP: "…to Public Knowledge Press";
OPS: "…to Public Knowledge Preprint Server", with the text that invites
him to post the preprint).

**Observed:** no confirmation. OJS and OMP send `dbarnes` only "You have
been assigned as an editor on a submission to …"; OPS sends him nothing.
The completion screen reads, on OJS (OMP: "The press has been notified…"):

```
The journal has been notified of your submission, and you've been emailed a confirmation for your records. Once the editor has reviewed the submission, they will contact you.
```

On OPS it reads "Thank you for submitting your preprint. You can now
post your preprint publicly."

Control: the same steps as `ccorino` (OJS, OPS) or `aclark` (OMP), who
hold the Author role: "Thank you for your submission to …" arrives.

## Cause

`PKP\observers\listeners\SendSubmissionAcknowledgement::handle()`
(`lib/pkp/classes/observers/listeners/SendSubmissionAcknowledgement.php`,
lines 46–56) builds its recipients, `$submitterUsers`, from the
submission's stage assignments in an Author-role group. The wizard
(`PKPSubmissionController::add()`) assigns the submitter in the group
chosen in "Submit As", which offers the user's Manager-role and
Author-role groups. For a Manager-role group the list is empty, and the
`if ($submitterUsers->count())` block sends nothing.

The rule it breaks: the confirmation is for whoever submits, which the
completion screen promises. Before the new wizard, 3.3's
`SubmissionSubmitStep4Form` mailed the request's user whatever group
they submitted in. The new wizard (`pkp/pkp-lib#7191`, e79fc21e20)
moved the email into this listener and keyed it on Author assignments;
later changes (`pkp/pkp-lib#9674`, `pkp/pkp-lib#9797`) kept that.

Reach:

- With "Send an email to all authors.", the other authors' message,
  `SubmissionAcknowledgementOtherAuthors`, gets the same empty list, so
  its submitter name is blank (read in the code; `pkp/pkp-lib#11723`,
  reported on OMP 3.4).
- OPS: `APP\observers\listeners\SendSubmissionAcknowledgement::getSubmitterMailable()`
  sends `SubmissionAcknowledgementCanPost` only when every recipient may
  post. The recipients are Author-role users, who may post only when a
  screening plugin grants it through `Publication::canAuthorPublish`.
  So a manager, who may always post, never gets it (seen in the walk).
- The other reads of Author-role stage assignments (decision emails,
  `NotifyAuthorOnPublication`, author responses) address the authors in
  later stages, where a manager-level submitter is rightly not an
  author; they are not this fault (read in the code).

## Proposed fix

A proposal; the team decides. In `SendSubmissionAcknowledgement::handle()`, keep the one message to
the users with an Author assignment, and send the user who pressed
"Submit" a message of their own when they are not among them
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-role-submitter-no-acknowledgement/fix.diff)):

```diff
-            ->getMany();
+            ->getMany()
+            ->collect();
 
-        if ($submitterUsers->count()) {
-            $mailable = $this->getSubmitterMailable($event, $submitterUsers);
+        $recipientGroups = $submitterUsers->isNotEmpty() ? [$submitterUsers] : [];
+        $submittingUser = Application::get()->getRequest()->getUser();
+        if ($submittingUser && !$submitterUsers->has($submittingUser->getId())) {
+            $recipientGroups[] = collect([$submittingUser->getId() => $submittingUser]);
+            $submitterUsers = $submitterUsers->union([$submittingUser->getId() => $submittingUser]);
+        }
 
-            if ($event->context->getData('copySubmissionAckPrimaryContact')) {
+        foreach ($recipientGroups as $i => $recipients) {
+            $mailable = $this->getSubmitterMailable($event, $recipients);
+
+            // The context's copies ride on the first message only
+            if ($i === 0 && $event->context->getData('copySubmissionAckPrimaryContact')) {
```

Each message goes through `getSubmitterMailable()`, so on OPS the
manager gets the can-post text while an author who cannot post gets the
ordinary one. The widened `$submitterUsers` also gives the other
authors' message its submitter name and keeps the submitter out of that
message's recipients. Under "Log in as", `getUser()` is the impersonated
user, the account the submission was made from, so that account is
mailed. (`LogSubmissionSubmitted`, for the same event, records the
administrator as `userId` and the impersonated user as
`impersonatedUserId`.) In pkp-lib and the three apps, the only caller of
`Repo::submission()->submit()` is the submissions API's `submit`
endpoint, so the request always has the submitting user; plugins
outside them (QuickSubmit) were not checked.

Tried on `main` on the three apps. `dbarnes` received "Thank you for
your submission to …" addressed to him alone (OPS: the can-post text),
and the Author still received exactly one. With "Submission
Confirmation" at "Do not send an email.", nobody received a
confirmation, with and without the fix. A Journal, Press or Preprint
Server manager (`rvaca`) who pressed "Submit" on an author's finished
draft received a message of their own, and the author received theirs,
each with one address in To:. On OPS the manager's was the can-post
text and the author's the ordinary one. Without the fix only the author
received one.

**Alternatives:**

- One message to the authors and the submitting user together: fewer
  lines, but recipients see each other's addresses, and on OPS a mixed
  list turns the can-post text off for the manager.
- Carry the submitting user in the `SubmissionSubmitted` event: keeps
  request state out of the listener, but changes the event's
  constructor, which plugins may dispatch or read.
- Keep the Author-only rule and only change the completion screen: the
  context's copies, the other authors' submitter name and OPS's can-post
  email stay broken.

**What goes with it:**

- Behaviour change: a manager who presses "Submit" on someone else's
  draft now gets a confirmation of their own besides the author's. In
  3.3 that manager got the confirmation and the authors the separate
  "named on a submission" notice.
- No stored data to repair; confirmations not sent cannot be sent later.
- Backport: applies to 3.5 as written. On 3.4 the listener still reads
  `StageAssignmentDAO::getBySubmissionAndRoleIds()`; the same change
  goes after its loop.
- Guard: a unit test of the listener with a submitter in a Manager-role
  group. `lib/pkp/tests` has no listener test yet, so this one needs the
  request user, `Mail` and the stage assignments faked or seeded.

Small: one method in one pkp-lib listener and a unit test, though the
test is the first of its kind.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-role-submitter-no-acknowledgement/walk.js)
  with the wizard steps in
  [submit.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-role-submitter-no-acknowledgement/submit.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/editorial-role-submitter-no-acknowledgement/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1–10,
  then the Author control (`CONTROL=0` in front skips it). `NEIGHBOUR=1`
  in front first sets "Submission Confirmation" to "Do not send an
  email." as `rvaca`; `OTHERS_DRAFT=1` in front walks the manager
  submitting an author's draft instead. It also reads each submission's
  stage assignments and email log from the database, which agreed with
  the mailbox on every walk.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/editorial-role-submitter-no-acknowledgement/fix.diff ojs omp ops`,
  the script, then with `OTHERS_DRAFT=1` and with `NEIGHBOUR=1` in
  front, then `node bin/try-fix.js revert ojs omp ops`; the last two
  were also walked without the fix.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` (OJS bade233f73, OMP 3b0ecf794, OPS
  c8af945bb7; their `lib/pkp` 2e377d27fc, 3dc90c81a6, 3dc90c81a6) and
  `stable-3_5_0` (OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd;
  `lib/pkp` a9c76aed62). Nothing here depends on the database.
- Roles: the dataset's Manager-role groups were read from `user_groups`
  (OJS: Journal manager, Journal editor, Production editor; OMP: Press
  manager, Press editor, Production editor; OPS: Preprint Server
  manager). `PKPSubmissionController::add()` offers only Manager-role
  and Author-role groups, and enrols a user holding neither as Author.
  The copy settings are on the shared `PKPEmailSetupForm`, so presses
  and servers have them too.
- 3.4 (code): `lib/pkp` `stable-3_4_0` (df13621c2d)
  `SendSubmissionAcknowledgement::handle()` reads only Author-role
  assignments; its `api/v1/submissions/PKPSubmissionHandler.php` offers
  the Manager-role and Author-role groups in "Submit As"; OPS
  `stable-3_4_0` (acd8ae704b) has the same can-post choice. The wizard
  commit e79fc21e20 is on the branch (since 3.4.0-0).
- 3.3 (code): OJS (9fdb9bcf9a), OMP (8e72fc883) and OPS (c5532e2161)
  `classes/submission/form/SubmissionSubmitStep4Form.inc.php` add the
  request's user as the `SUBMISSION_ACK` recipient and send
  `SUBMISSION_ACK_NOT_USER` to the other authors; `lib/pkp`
  `stable-3_3_0` (d446601ebe) `PKPSubmissionSubmitStep1Form` offers the
  manager groups as submit-as choices.
- Introduced: `git blame` on the recipients lines leads to e5a7262830
  and 3ff0147d23 (`pkp/pkp-lib#9674`, the DAO call replaced by
  `StageAssignment`) and 714d5d5aa4 (a column rename), all keeping the
  Author-role filter, which e79fc21e20 wrote. The GitHub API's
  `commits/<sha>/pulls` gives `pkp/pkp-lib#8495`, opened by Alec Smecher
  (asmecher) with Nate Wright's commits.
- Not driven: a user who holds both a manager-level role and Author and
  picks the manager-level group in "Submit As" (the same assignment
  code); the context's copies and the other authors' blank submitter
  name, read in the code only; "Log in as".
