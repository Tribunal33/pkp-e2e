# An editor who empties the review request letter gets no answer, while a blank invitation goes to the reviewer

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code; from 3.4.0-8)
  - 3.3: OJS, OMP (code; no error: the add completes and the email holds only the journal's signature)
- **Introduced** `pkp/pkp-lib#10229` for `pkp/pkp-lib#9991` · [9b0f74a086](https://github.com/pkp/pkp-lib/commit/9b0f74a086a28ac0d1f2d22158fc42e3bc9a5d2c) · 2024-09-26 · Taslan A. Graham (taslangraham); on `stable-3_4_0` `pkp/pkp-lib#10230`, [c5b6af1b57](https://github.com/pkp/pkp-lib/commit/c5b6af1b57d49e647653535793cf3538db3434ca). The blank email is older: `pkp/pkp-lib#7221` for `pkp/pkp-lib#7141` · [875de4a8f3](https://github.com/pkp/pkp-lib/commit/875de4a8f3855882ea2a26506e935ce85282dc3d) · 2021-06-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a18)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

An editor adds a reviewer with the request letter ("Email to be sent to
reviewer") emptied. The server fails: the window stays open, "Add
Reviewer" stays greyed out, and nothing on screen says what happened.

Yet the reviewer is added and sits at "Request Sent", and receives the
review request email ("Invitation to review" in a journal) with a
subject and no text: no link, no due dates, no message. The assignment
shares none of the round's review files with the reviewer, and the email
is missing from the submission's email log.

## Impact

- **Lost**: a working review request. The reviewer can still find the
  request on their dashboard and accept it, but their review page lists
  "No Files" under "Review Files".
- **Who**: an editor, section editor or manager using "Add Reviewer".
  The letter is a free text box with no required mark, so an editor may
  clear it, for instance to write their own, and press "Add Reviewer"
  before typing. With "Do not send email to Reviewer." ticked the add
  works.
- **Way round**: once the editor reopens the workflow and sees the row:
  "Unassign Reviewer", then a new add with a letter. Until then the
  round waits on a reviewer who has nothing to review.

Medium: a core task half-completes silently, but only when the letter
is emptied, and there is a way round; it would be high if ordinary use
emptied the letter.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS; for OMP the names in
  "(OMP: …)". The journal (press) gives 4 weeks for the response and 4
  for the review, so the window opens with both due dates filled.
- Submission 12, "Sodium butyrate improves growth performance of weaned
  piglets during the first period after weaning" (OMP: submission 2,
  "The West and Beyond: New Perspectives on an Imagined Region"), in
  Review (OMP: External Review), round 1.
- Mail from the install reaches a mailbox you can read (a mail catcher).

Steps:

1. Sign in as `dbarnes`.
2. Open submission 12 from "Assigned to me" (OMP: open submission 2
   from "Active submissions"; `dbarnes` is not assigned to it). The
   workflow opens on Review (OMP: External Review).
3. Under "Reviewers", press "Add Reviewer".
4. Search "Adela Gallego" and press "Select Adela Gallego". The letter
   fills with "Dear {$recipientName}, I believe that you would serve as
   an excellent reviewer …".
5. Click in the letter, select all its text and press Delete.
6. Press "Add Reviewer".
7. Press "Add Reviewer" again.
8. Press "Cancel".
9. Open the submission's workflow again.
10. Read the reviewer's mailbox, `agallego@mailinator.com`.
11. Press "Add Reviewer" and search "Adela Gallego". Close the window.
12. Sign out, sign in as `agallego` and open the dashboard's review
    assignments.
13. Open the review of submission 12 (OMP: 2).

**Expected**: at step 6 the add is refused with a message that the
letter is empty, and nothing is added or sent.

**Observed**: at step 6 the window stays open and shows nothing: no
message, no notice. The request behind the button answers HTTP 500 with
an empty body, and the server log reads:

```
PHP Fatal error:  Uncaught InvalidArgumentException: View must be instance of Illuminate\Contracts\Support\Htmlable or a string, null is given in lib/pkp/classes/mail/Mailer.php:81
#4 lib/pkp/classes/log/Repository.php(145): Illuminate\Mail\Mailable->render()
#5 lib/pkp/classes/submission/action/EditorAction.php(149): PKP\log\Repository->logMailable()
#6 lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php(348): PKP\submission\action\EditorAction->addReviewer()
```

At step 7 "Add Reviewer" is greyed out and does nothing. "Cancel" closes
the window without a notice. At step 9 the panel lists "Adela Gallego
Request Sent Anonymous Reviewer/Anonymous Author". At step 10 the
mailbox holds an email from Daniel Barnes, subject "Invitation to
review" (OMP: "Manuscript Review Request"), whose body is empty. At step
11 the list reads "This reviewer has already been assigned to this
review round." and offers no "Select". At step 12 the review
assignments list the submission; at step 13 the page offers "Accept
Review, Continue to Step #2" and "Review Files" reads "No Files".

Control, on a freshly loaded dataset, after steps 1 to 3: "Select
Sabine Kumar" (OMP: "Select Lisset Von") with the letter left as filled
closes the window with "Sabine Kumar was assigned to review this
submission and sent an email notification." and the full letter
arrives. Then "Add Reviewer", "Select Catherine Turner", the letter
emptied and "Do not send email to Reviewer." ticked closes the window
with "… was not sent an email notification." and no email.

## Cause

`ReviewerForm` (`lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php`),
the form behind "Add Reviewer" and its "Create New Reviewer" and "Enroll
Existing User" modes, checks the two due dates, their order, POST and
the CSRF token; its subclasses check the chosen reviewer. Nothing checks
the letter (`personalMessage`), while the sibling `EmailReviewerForm`
refuses an empty body with `email.bodyRequired` ("Please provide the
email body text.").

`ReviewerForm::execute()` calls `EditorAction::addReviewer()`, which
reads `skipEmail` and `personalMessage` from the request itself. It
writes the assignment, the reviewer's task notification and the
"reviewer assigned" event, creates the reviewer access invitation when
one-click access is on, and then sends the email with the letter as its
body. Laravel sends the empty body as a blank message.

The failure comes after the send. `pkp/pkp-lib#9991` added
`Repo::emailLogEntry()->logMailable()` right after `Mail::send()` in
`addReviewer()`. `logMailable()` renders the mailable, and Laravel's
`Mailer::render()` passes `$view ?: $plain`, so the empty view becomes
`null`, which `PKP\mail\Mailer::renderView()` refuses with the
`InvalidArgumentException` above. `addReviewer()` catches only a
`TransportException`, so the request ends in a 500, and the rest of
`ReviewerForm::execute()` never runs: the files ticked under "Files To
Be Reviewed" are not granted, `dateNotified` stays empty, the success
notice is not created, and a matching reviewer suggestion is not marked
approved.

Before that change the same emptied letter went out as a blank email
and the add completed with its usual notice (2021 to 2024, since
`pkp/pkp-lib#7141` moved the send to Laravel mailables; code). Before 3.4,
`SubmissionMailTemplate::send()` appended the journal's signature to
the body, so the email held only the signature. The gap underneath, a
letter without text accepted, is as old as the form; the change that
turned it into the silent, half-made add is #9991's log call.

Reach:

- The half-made assignment: on 3.5 the database showed the new
  `review_assignments` row with no `date_notified` and no
  `review_files` grant, while the round's other assignments hold the
  round's file; no `email_log` row was written.
- Other reviewer emails that send an editable letter without a check:
  "Thank Reviewer" (`ThankReviewerForm`) and "Send Reminder"
  (`ReviewReminderForm`) take it as `message`; the unassign, reinstate
  and resend windows send `personalMessage` through
  `PKPReviewerGridHandler::createMail()`, each followed by
  `logMailable()` (code, not walked). "Email Reviewer" with an empty
  Body fails after sending for another cause (its handler never
  validates the form): spec U27
  [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a13)
  has its own report.

## Proposed fix

Refuse a letter without text in `ReviewerForm`, unless "Do not send
email to Reviewer." is ticked, before anything is written
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emptied-request-letter-half-adds-reviewer/fix.diff)):

```diff
+    public function validate($callHooks = true)
+    {
+        // The request email is sent from the letter as typed: refuse a letter without text unless no email goes out
+        if (!$this->getData('skipEmail')) {
+            $text = html_entity_decode(strip_tags((string) $this->getData('personalMessage')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
+            if (preg_replace('/[\s\x{00A0}]+/u', '', $text) === '') {
+                $this->addError('personalMessage', __('email.bodyRequired'));
+            }
+        }
+
+        return parent::validate($callHooks);
+    }
```

`ReviewerForm` is the one class behind the three add modes, and it reads
the same two request values `addReviewer()` sends from. The check
follows `EmailReviewerForm` (the same message key) and the `validate()`
override of `NavigationMenuForm`. Decoding entities and dropping
whitespace, non-breaking spaces included, also refuses a letter of
blank paragraphs such as `<p>&nbsp;</p>`. A
`FormValidator` of type `required` was not used: it would put a
`required` class on the letter for the browser-side check
(`Form::$cssValidation`), while the letter may stay empty when no email
goes out. The refusal shows through the form-error notice of
`Form::validate()`, as the due-date refusal does.

Tried on OJS and OMP `main`: step 6 now shows the notice "Please provide
the email body text." with the window open and its values kept, and
there is no row, no email and no server error; at step 7 "Add Reviewer"
is pressable and refuses again; "Select" is offered again at step 11.
The control adds, and a later due date saved through the row's "Edit",
behave the same with the fix and without.

**Alternatives**:

- Catch every exception around the send and the log in `addReviewer()`:
  the add would complete and the editor be told, but the blank email has
  already gone out.
- Wrap the add in a database transaction: no half-made row, but the
  blank email (and, with one-click access, the access invitation) is
  already out, and the editor still sees nothing.

**What goes with it**:

- The same refusal for the other editable reviewer emails named under
  Reach: in `ThankReviewerForm` and `ReviewReminderForm` on `message`,
  and for the unassign, reinstate and resend windows in their forms'
  `validate()` on `personalMessage`. They are left out of this fix: no
  emptied letter was walked there.
- A letter holding only a picture is refused too; the request template
  has none.
- No data repair: a half-made assignment shows as a row and can be
  unassigned.
- The diff applies as written to `stable-3_5_0`; on `stable-3_4_0` the
  form is the same (code).
- A guard: an e2e scenario in spec U27 that empties the letter and
  expects the refusal, no row and no email.

Small: one method in one shared form, following an existing pattern,
tried, with one test.

## Evidence

- The kept scripts, with their helpers in `lib.js` beside them:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emptied-request-letter-half-adds-reviewer/walk.js)
    takes steps 1 to 13 on OJS and OMP.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emptied-request-letter-half-adds-reviewer/neighbour.js)
    takes the two control adds, a later review due date saved through
    the control reviewer's "Edit", and one more add with a space typed
    into the emptied letter ("Select Stephen Hellier"); it ran with the
    fix and without. The typed space was not kept: that letter posted
    empty and behaved as in the steps, so `<p>&nbsp;</p>` was checked
    against the fix's test in PHP alone (refused; "<p>Dear à</p>"
    passes).
  - Command, on an install freshly loaded from the default dataset:
    `PROBE_FEATURE=<name> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/emptied-request-letter-half-adds-reviewer/walk.js`
- `walk.js` ran on OJS and OMP, `main` and `stable-3_5_0`, PostgreSQL,
  with the same result on all four: the letter posted as
  `personalMessage=` (empty), HTTP 500, no notice, no browser dialog,
  one email with an empty body (HTML `" \r\n"`, no text part).
  Datasets: pkp/datasets e8dafbc (2026-10-02).
- The database facts under Reach were read on the 3.5 install after the
  walk, and the file grant of a normal add ("Sabine Kumar") on `main`.
- Tips: OJS `main` ff004d0973 with lib/pkp 987776cd04; OMP `main`
  3b0ecf794 with lib/pkp 3dc90c81a6; OJS `stable-3_5_0` c1cee76b95 with
  lib/pkp 771474347e; OMP `stable-3_5_0` 9c5e24246 with lib/pkp
  cf3f984335; pkp-lib `stable-3_4_0` 767353f4fe and `stable-3_3_0`
  ac3fa73402 (2026-10-02).
- Introduced: `git blame` on `EditorAction.php` lines 147 to 156 gives
  9b0f74a086, whose diff adds the `logMailable()` call after
  `Mail::send()`; its 3.4 twin c5b6af1b57 is in tag `3_4_0-8` and
  later. 875de4a8f3 replaced `ReviewerForm`'s `SubmissionMailTemplate`
  send with `EditorAction::createMail()` and `Mail::send()`, without a
  log call. The 3.3 line that sets the body,
  `$mail->setBody($this->getData('personalMessage'))`, dates from
  a6f8aa0784 (2013-05-14).
- 3.4 (code): `ReviewerForm.php` has no letter check;
  `EditorAction::addReviewer()` sends through `Mail::send()`, catches
  only `TransportException` and then calls
  `SubmissionEmailLogDAO::logMailable()`, which renders the mailable;
  `Mailable::body()` and `Mailer::renderView()` are as on `main`.
  Laravel 9's `Mailer::render()` (vendor code, not in the branch) was
  not read, so the 3.4 server error is inferred, not seen.
- 3.3 (code): `ReviewerForm.inc.php` checks only the dates; `execute()`
  sends through `SubmissionMailTemplate`, whose `send()` appends
  `"<br/>"` and the context's `emailSignature` to the body, then shows
  "{name} was assigned …". Not walked.
- Not driven: the way round (unassigning the half-made row and adding
  the reviewer again); OPS (no review stage); "Create New Reviewer" and
  "Enroll Existing User" with an emptied letter; the other reviewer
  emails named under Reach; one-click reviewer access on (the dataset
  has it off); MySQL (the failure is in the mail code, not the
  database).
- Related, not the same fault: `pkp/pkp-lib#13287` (open) reports the
  same `InvalidArgumentException` from the Participants "Assign" form
  when an email template has no name in the journal's language.
