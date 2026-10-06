# Email Reviewer with an empty Body sends the reviewer a blank email and leaves the window stuck

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code; no blank email: the send fails and the editor sees the general "There was a problem sending an email message" notice)
- **Introduced** commit for `pkp/pkp-lib#1320`, no pull request · [bc13ea9b4e](https://github.com/pkp/pkp-lib/commit/bc13ea9b4e8bd8515dc6e9884ca23cfb47f9b9b4) · 2016-03-30 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a13)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The "Email Reviewer" window opens with an empty Body and marks both
Subject and Body as required, but only the Subject is checked. When an
editor writes a Subject and sends, the reviewer receives a blank email,
and the server then fails. The window stays open, says nothing, and its
"Send Email" button stays greyed out.

The editor cannot tell that the email went out, and it is missing from
the submission's email log. Closing the window and sending again sends
the reviewer another blank email.

With both fields empty, the only error shown is "This field is
required." under Subject. The Body never shows one.

## Impact

- **Lost:** the reviewer gets an email with a subject and no text, once
  per attempt. The editor is told nothing, and the email is not recorded
  in the submission's email log.
- **Who:** any editor who uses a reviewer's "Email Reviewer" action on a
  journal or press. The window opens with an empty Body, so an editor
  who writes only a subject meets this.
- **Way round:** write something in the Body. Nothing on screen points
  the editor to it.

Medium: the window opens with an empty Body, so this is an easy slip in
ordinary use rather than a rare input; but the email does reach the
reviewer, and there is a way round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS or OMP. Nothing else.
- OJS uses submission 12, "Sodium butyrate improves growth performance
  of weaned piglets during the first period after weaning" (Review,
  round 1). OMP uses submission 17, "Open Development: Networked
  Innovations in International Development" (Internal Review, round 1).
  In both, Julie Janssen (`jjanssen`) has not answered her request.

Steps:

1. Sign in as `dbarnes`.
2. Open the submission (Dashboard › "Active submissions" › its title).
   The workflow opens on the review stage, with the "Reviewers" panel.
3. On Julie Janssen's row, press "More Actions" › "Email Reviewer". The
   window shows "To" (Julie Janssen), an empty "Subject*" and an empty
   "Body*".
4. Leave Subject and Body empty and press "Send Email".
5. Type the Subject "u27a: a question about your review", leave Body
   empty and press "Send Email".
6. Press the window's "Cancel", open "More Actions" › "Email Reviewer"
   again, type the same Subject and press "Send Email".
7. Read Julie Janssen's mailbox in the install's mail catcher
   (`jjanssen@mailinator.com`).

**Expected:** at step 4 the Subject shows "This field is required." At
step 5 the send is refused with "Please provide the email body text.",
the window stays open with "Send Email" usable, and no email is sent.
The same at step 6. The mailbox holds nothing new.

**Observed:** at step 4 the only error is "This field is required."
under Subject. At step 5 the request answers 500, and the window stays
open with no message and "Send Email" greyed out. "Cancel" closes it.
Step 6 gives the same 500 and the same stuck window. The mailbox holds
two emails "u27a: a question about your review", both with an empty
body. The server log, for each send:

```
PHP Fatal error:  Uncaught InvalidArgumentException: View must be instance of Illuminate\Contracts\Support\Htmlable or a string, null is given in lib/pkp/classes/mail/Mailer.php:81
#0 lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Mail/Mailer.php(256): PKP\mail\Mailer->renderView(NULL, Array)
#1 lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Mail/Mailable.php(294): Illuminate\Mail\Mailer->render('', Array)
…
#4 lib/pkp/classes/log/Repository.php(145): Illuminate\Mail\Mailable->render()
#5 lib/pkp/controllers/grid/users/reviewer/form/EmailReviewerForm.php(109): PKP\log\Repository->logMailable(…)
#6 lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php(1066): …\EmailReviewerForm->execute()
```

## Cause

`PKPReviewerGridHandler::sendEmail()`
(`lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php`,
lines 1065–1066 on `main`) handles the window's POST by calling
`$emailReviewerForm->readInputData()` and then `execute()`. It never
calls `validate()`. So the checks `EmailReviewerForm` declares in its
constructor, `email.subjectRequired` and `email.bodyRequired`, never
run on the server. The handler's other form posts validate first
(`thankReviewer()`, `sendReminder()`, `gossip()`), and so does
`UserGridHandler::sendEmail()`, which handles the same Subject and Body
form for Settings › Users.

The only check that runs is the browser's. The Body is a rich-text
editor, which hides the `message` textarea. The legacy form handler
(`js/controllers/form/FormHandler.js`) uses jQuery Validate with its
default of skipping hidden fields, so the Body's `required` is never
checked in the browser. The Subject, a plain text box, is checked.
That is why only the Subject shows an error. `EmailReviewerForm` has no
`initData()`, so the Body starts empty.

The empty Body then reaches `EmailReviewerForm::execute()`.
`Mail::send()` sends it, and `Repo::emailLogEntry()->logMailable()`
renders the email for the log. Laravel's `Mailer::render()` treats an
empty view as missing (`$view ?: $plain`), so `PKP\mail\Mailer::renderView()`
gets `null` and throws. This happens after the email is sent and before
the log entry is saved.

bc13ea9b4e (`pkp/pkp-lib#1320`) gave the reviewer email its own form
and handler. Before it, the window posted to `UserGridHandler::sendEmail()`,
which validated. The new handler copied the form's checks but not the
`validate()` call.

Reach:

- OJS and OMP use the same pkp-lib handler and form, with no app
  override (checked in the code). A preprint server has no reviewers.
- The other legacy windows in the reviewer row that send an email with
  a rich-text body ("Send Reminder", "Thank Reviewer") validate on the
  server (checked in the code). No other handler in OJS, OMP, OPS or
  pkp-lib calls `execute()` on an email form without `validate()`
  (checked by a search).

## Proposed fix

Validate in `sendEmail()` and refuse with the form's own message, as the
handler's other sends do ([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/email-reviewer-sends-empty-body/fix.diff)):

```diff
         $emailReviewerForm->readInputData();
+        if (!$emailReviewerForm->validate()) {
+            return new JSONMessage(false, implode(' ', $emailReviewerForm->getErrorsArray()));
+        }
         $emailReviewerForm->execute();
```

It follows the refusal `sendReminder()` and `UserGridHandler::sendEmail()`
make (`JSONMessage(false, <message>)`, which the form handler shows as
an alert and then re-enables the form). It uses the form's own message
instead of the generic `validator.filled` ("This field is required."),
so the editor learns which field is missing.

Tried on OJS and OMP `main`. At step 5 an alert reads "Please provide
the email body text.", the window stays open with "Send Email" usable,
and no email is sent. With a Subject and a Body, the email still goes
out with its text and the window closes, with the fix in and out.

**Alternatives:**

- Re-render the form with its errors (`JSONMessage(true, $form->fetch(…))`).
  Tried first: nothing is sent, but this template has no place that
  shows a server error, so the window gives no reason.
- Make the browser check the rich-text Body (jQuery Validate's
  `ignore`). This changes every legacy form, and it still leaves the
  server unchecked.
- Let `logMailable()` accept an empty body. This stops the crash, but
  the reviewer still gets a blank email.

**What goes with it:**

- No data repair: a blank email sent this way left no log entry, so
  nothing stored is wrong.
- Backport: the same two lines are in 3.5 (lines 996–997) and 3.4
  (lines 987–988), where the diff applies as written. 3.3 has them too
  (lines 793–794 of `PKPReviewerGridHandler.inc.php`, tab-indented).
- Test: an e2e check that sends "Email Reviewer" with an empty Body and
  expects the refusal and no email.

Small: three lines in one handler, following its own pattern, with one
test.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/email-reviewer-sends-empty-body/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/email-reviewer-sends-empty-body/walk.js)
  (helpers in
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/email-reviewer-sends-empty-body/lib.js))
  takes the Steps on a journal and a press loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/email-reviewer-sends-empty-body/walk.js`.
  `WALK_MODE=neighbour` is the control run with a Subject and a Body.
  The script records what the browser posted (`message` was the empty
  string). It opens the submission at
  `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`,
  the address step 2's click leads to.
- `fix.diff` paths start at the app root (`a/lib/pkp/…`). In a pkp-lib
  clone, apply it with `-p3`.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, PostgreSQL, the
  default datasets of pkp/datasets 111d947 (2026-10-03). On 3.5 the walk
  took steps 1–5 and 7 (step 6 was added later and walked on `main`
  only): the subject-only error, the 500 with the same exception,
  "Send Email" greyed out, and one blank email.
- Branch tips: main OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c (lib/pkp cf3f984335); 3.4 OJS d68934d0d1,
  OMP 0aec65441f (lib/pkp 767353f4fe); 3.3 OJS ac77c9fb35, OMP
  8e72fc8836 (lib/pkp ac3fa73402).
- 3.5 (code): `sendEmail()` is the same (lines in "What goes with it"),
  and `log/Repository.php` line 138 renders the email for the log.
- 3.4 (code): `sendEmail()` is the same (lines in "What goes with it"),
  the form carries the same checks, and
  `SubmissionEmailLogDAO::logMailable()` (line 89) renders the email, so
  it fails the same way.
- 3.3 (code): `sendEmail()` is the same, with the same checks and
  template. There `EmailReviewerForm::execute()` calls `$email->send()`
  on a `SubmissionMailTemplate`, which hands the email to PHPMailer.
  PHPMailer refuses an empty body ("Message body empty"), so the send
  returns false and the form adds the `email.compose.error` notice
  ("There was a problem sending an email message. Please try again
  later, or contact your system administrator."). No email is sent. Not
  walked.
- Introduced: `git blame` on line 1066 gives 7706b635bf
  (`pkp/pkp-lib#7592`, which only dropped the `execute()` argument);
  the lines around it blame to a formatting commit.
  `git log -S'emailReviewerForm->readInputData'` gives bc13ea9b4e, which
  added the handler without `validate()`. The GitHub API lists no pull
  request for the commit.
- Kind regression: the last releases that validated this send are the
  OJS 3.0 beta (pkp-lib tag `ojs-3_0b1`, 2015-08-13, does not contain
  bc13ea9b4e; there the window posted to `UserGridHandler::sendEmail()`,
  checked with `git show ojs-3_0b1:…`) and, by date, OMP 1.1. The
  first tagged releases with the fault are OMP 1.2.0 (`omp-1_2_0-0`,
  2016-04-11) and OJS 3.0.1 (`ojs-3_0_1-0`); OJS 3.0.0 (2016-08-31)
  followed the commit, but its pkp-lib commit is not in the clone read.
- Upstream searched in pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library
  (the symptom's words, `EmailReviewerForm`, `sendEmail`, the
  exception's text). `pkp/pkp-lib#9493` shows the same exception for
  blank submission emails, but it comes from a missing template body in
  a locale, not from this form, so it is a different fault.
- MySQL not checked. Nothing here depends on the database.
