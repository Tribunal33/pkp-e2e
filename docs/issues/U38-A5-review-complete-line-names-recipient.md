# The Activity Log names the editor who received a "Review complete" email as its sender

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; the email is not logged)
- **Introduced** `pkp/pkp-lib#10229` for `pkp/pkp-lib#9991` · [9b0f74a086](https://github.com/pkp/pkp-lib/commit/9b0f74a086a28ac0d1f2d22158fc42e3bc9a5d2c) · 2024-09-26 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U38 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a5)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a Reviewer submits a review, the journal emails "Review complete"
to each editor of the submission, from the journal's contact. The
submission's "Activity Log" lists one line per editor, "An email has been
sent: Review complete: …", and each line names under "User" the editor
who received it, as if that editor had sent it.

"User" should be empty there, as it is for the journal's other automatic
emails (the submission acknowledgement, the automatic review reminder).
"Review complete" is the only email the log records under someone who
did not send it.

## Impact

- **Lost**: nothing. The review, the email and its "View Email" are
  right; only the "User" column of the email's line is wrong.
- **Who**: every editor who reads a submission's "Activity Log" after a
  review was completed, on every journal and press; an editor reading
  the log to see who did what takes the recipient for the sender, once
  per editor for every completed review.
- **Way round**: "View Email" on the line shows the real "From:".

Low: nothing else in the application relies on the wrong name.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS or OMP).
- OMP only: submission 17, "Open Development: Networked Innovations in
  International Development", has no editor, so nobody would receive the
  email. Sign in as `dbarnes`, open it, and in "Participants" press
  "Assign", choose "Series editor", "Search", choose "David Buskins" and
  press "OK". (OJS submission 12 already has Daniel Barnes, David Buskins
  and Stephanie Berardo assigned.)

Steps:

1. Sign in as `jjanssen` (Julie Janssen, a reviewer).
2. Open the review of OJS submission 12, "Sodium butyrate improves
   growth performance of weaned piglets during the first period after
   weaning" (OMP: submission 17), from the dashboard.
3. Press "Accept Review, Continue to Step #2", then "Continue to Step #3".
4. Type a comment for the author and editor. OJS: choose the
   recommendation "Accept Submission". Press "Submit Review", then "OK".
   The page shows "Review Submitted".
5. Sign in as `dbarnes`, open the submission, and press "Activity Log".
6. On "History", read the lines "An email has been sent: Review
   complete: …". Press the arrow at the start of one and "View Email".

**Expected**: the "Review complete" lines leave "User" empty, as the
log does for the other emails the journal sends by itself (on the same
"History", e.g. the submission acknowledgement "Thank you for your
submission to Journal of Public Knowledge"; on OMP "Thank you for your
submission to Public Knowledge Press"). No line names an editor who only received the email.

**Observed** (OJS): three lines, one per editor, each naming the editor
it went to:

```
2026-10-04  David Buskins      An email has been sent: Review complete: Julie Janssen recommends Accept Submission for #12 Christopher — "Sodium butyrate improves growth performance of weaned piglets during the first period after weaning"
2026-10-04  Stephanie Berardo  An email has been sent: Review complete: Julie Janssen recommends Accept Submission for #12 Christopher — "Sodium butyrate …"
2026-10-04  Daniel Barnes      An email has been sent: Review complete: Julie Janssen recommends Accept Submission for #12 Christopher — "Sodium butyrate …"
```

"View Email" on David Buskins's line reads:

```
From: "Ramiro Vaca" <rvaca@mailinator.com>
To: "David Buskins" <dbuskins@mailinator.com>
```

Ramiro Vaca is the journal's principal contact. On OMP the one line
names "David Buskins", with the same "From:" and "To:".

Control: Julie Janssen's own email from step 3 of the Steps (the
accept), "An email has been sent: Review accepted: Julie Janssen accepted review assignment for
#12 …", names "Julie Janssen" under "User", and its "View Email" reads
`From: "Julie Janssen" <jjanssen@mailinator.com>`.

## Cause

`PKPReviewerReviewStep3Form::execute()` (lib/pkp
`classes/submission/reviewer/form/PKPReviewerReviewStep3Form.php`, line
243 on `main`) sends `ReviewCompleteNotifyEditors` once per editor
assigned to the stage, from the journal's contact
(`->from($context->getData('contactEmail'), $context->getData('contactName'))`),
to `$user`, the editor. It then logs it with
`Repo::emailLogEntry()->logMailable(SubmissionEmailLogEventType::REVIEW_COMPLETE, $mailable, $submission, $user)`.
The fourth argument of `logMailable()` is the sender
(`PKP\log\Repository::logMailable(…, ?User $sender = null)`, stored as
`email_log.sender_id`), so the recipient is stored as the sender.
`EventLogGridCellProvider` prints `EmailLogEntry::senderFullName` under
"User", hence the editor's name.

The call came with `pkp/pkp-lib#10229`, which started logging the
reviewer emails (`pkp/pkp-lib#9991`). The same change logged the
editor's request and reminders with the editor as sender, and the
`ReviewReminder` job's automatic reminder, the other email the journal
sends by itself, with none
(`logMailable(SubmissionEmailLogEventType::REVIEW_REMIND_AUTO, $mailable, $submission)`).
"Review complete" is also sent by no person, but the variable at hand
was the recipient.

Reach:

- Every `logMailable()` caller was read on `main`. Only this one passes
  a user who is not the email's sender. The journal's other automatic
  emails (`SendSubmissionAcknowledgement`, `AssignEditors`,
  `SubEditorsDAO`, the `ReviewReminder` job) pass none and send from the
  contact, so their lines are empty (read in the code; the
  acknowledgement and "You have been assigned as an editor …" lines
  also seen on screen).
  The opposite fault, emails an editor sends from the workflow logged
  with nobody under "User", is a separate report
  ([U38 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U38-A1-sent-email-lines-name-no-sender.md)).
- Stored data: every "Review complete" entry written since the change
  names its recipient. The default OJS dataset already holds 18 such
  lines on submissions 7, 10 and 13 (six completed reviews, three
  editors each; read in its `email_log` table); the OMP dataset none.
- `sender_id` also follows the editor through a user merge
  (`PKP\log\Repository::changeUser()`); nothing else reads it for these
  entries.
- OPS has no reviews.

## Proposed fix

Log the email without a sender, like the journal's other automatic
emails ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-complete-line-names-recipient/fix.diff)):

```diff
             Mail::send($mailable);
-            Repo::emailLogEntry()->logMailable(SubmissionEmailLogEventType::REVIEW_COMPLETE, $mailable, $submission, $user);
+            // The context (journal or press) sends this email from its contact address: no user is its sender
+            Repo::emailLogEntry()->logMailable(SubmissionEmailLogEventType::REVIEW_COMPLETE, $mailable, $submission);
```

The line then reads empty under "User", and "View Email" keeps the
contact as "From:". The fix sits in the one caller that passes the
wrong user; `logMailable()` itself cannot tell a sender from a
recipient.

Tried on `main`, OJS and OMP, with the Steps' result as just described.
The paths the fix must leave alone kept their names with the fix in and
out: a second reviewer's own "Review accepted" line named Paul Hudson,
and the dataset's review-request lines named Daniel Barnes.

**Alternatives**:

- Name the Reviewer, whose submit triggers the email. The email does
  not come from her, so "User" and "View Email" would disagree. If the
  team decides the email should be sent as the Reviewer (one email to
  all editors, as `pkp/pkp-lib#12126` asks for the recipients), the
  mailable would take `->sender($reviewer)` and the log the same user,
  as `ReviewerAction` does for the reviewer's answer.
- Make `logMailable()` read the sender from the mailable (the `Sender`
  trait's user) and drop the argument. It would cover this caller and
  the two behind the editors' emails logged with nobody under "User",
  but changes a method that plugins call; one argument here is
  enough for this finding.

**What goes with it**:

- Stored lines: the fix stops new wrong lines; it does not change the
  lines already logged, which installs with completed reviews already
  hold. Repairing them is optional and not part of the recommended fix:
  an upgrade migration in `classes/migration/upgrade/v3_6_0/` (and one in
  the 3.5 upgrade folder for a backport) running `UPDATE email_log SET
  sender_id = NULL WHERE event_type = 1073741836` (`REVIEW_COMPLETE`,
  `0x4000000C`), since no person sends that email. Adding it would make
  the effort medium. Not tried.
- Backport: the same line is in 3.5 (`PKPReviewerReviewStep3Form.php`
  line 238) and in 3.4, where it reads
  `$submissionEmailLogDao->logMailable(SubmissionEmailLogEntry::SUBMISSION_EMAIL_REVIEW_COMPLETE, $mailable, $submission, $user)`;
  dropping the last argument applies the same way. 3.4's
  `SubmissionEmailLogDAO::logMailable()` stores a missing sender as `0`,
  not NULL, and 3.5's `I8333_AddMissingForeignKeys` turns `0` into NULL
  on upgrade, so the repair statement above fits `main` and 3.5 only.
- Guard: an e2e check that a "Review complete" line leaves "User" empty
  (a **Planned** item in the spec). lib/pkp has no test of
  `PKPReviewerReviewStep3Form` or of `logMailable()`, so a unit test
  would first need that scaffolding (a context, a request and a faked
  mailer).

Small: one argument in one caller, the pattern the journal's other
automatic emails follow, with no data repair and no change to an API or
a hook.

## Evidence

- Kept script: [shared/playwright/checks/issues/review-complete-line-names-recipient/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-complete-line-names-recipient/walk.js)
  (helpers in `lib.js` beside it), run with pkp-e2e's own probe runner on
  an install loaded from PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/review-complete-line-names-recipient/walk.js`;
  `MODE=nb` in front runs the check of the paths the fix must leave
  alone. The fix was applied with `node bin/try-fix.js apply …/fix.diff ojs omp` and reverted after.
- Branch tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794
  (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c (lib/pkp cf3f984335); 3.4 and 3.3 read in
  pkp-lib `origin/stable-3_4_0` 767353f4fe and `origin/stable-3_3_0`
  ac3fa73402.
- No request failed and no page script failed in any walk.
- Code reads beyond the Cause: every `logMailable()` caller in `main`'s
  lib/pkp (none in the apps' own code). The only other reader of
  `sender_id` is `PKPReviewController`'s `withSenderId()`, which reads
  `REVIEW_DECLINE` entries only. 3.4: the call is at
  `PKPReviewerReviewStep3Form.php` line 244, from the backport
  `pkp/pkp-lib#10230` (c5b6af1b57, 2024-09-26, same author).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched by
  symptom words and by the class and method names. `pkp/pkp-lib#12126`
  (open) is about who receives the "Review complete" email, not the log
  line.
- Not driven: the repair statement; MySQL (the stored value is a plain
  id).
