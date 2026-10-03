# A reviewer removed with "Unassign Reviewer" gets the email under the subject "Your review … has been cancelled"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#13035` for `pkp/pkp-lib#12903` · [bba45b682c](https://github.com/pkp/pkp-lib/commit/bba45b682c1ca0a1c5ee6e7c0e5b71ba56d81f97) · merged 2026-08-27 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a26)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

An editor who removes a reviewer who has not yet answered, with
"Unassign Reviewer", sends the reviewer an email whose subject reads
"Your review for "{title}" has been cancelled", the subject of the
"Review Cancel" email. The text under it is the removal notice ("…you
have been removed from the reviewer assignment for "{title}"…"). The
subject of the "Reviewer Unassign" email, "Your reviewer assignment for
"{title}" has been removed", is never sent.

So the subject tells the reviewer their review was cancelled, while
the text says they were removed from the assignment. A manager who
edits the subject of "Reviewer Unassign" under Settings › Workflow ›
Emails sees the edit ignored. The removal itself and the notice's text
are right.

## Impact

- **Lost**: the right subject line of the removal notice. Neither the
  editor nor the manager is shown that the other subject went out.
- **Who**: every reviewer removed before answering a request, on every
  journal and press. A reviewer removed after accepting goes through
  "Cancel Reviewer" instead and gets the cancel notice, whose subject
  is right.
- **Way round**: none. The editor's window has a message box and no
  subject field. A manager could edit the "Review Cancel" subject to fit
  both notices, but that changes the real cancellation email too.

Low: only the subject belongs to another email. A subject that misled
reviewers into a wrong action would raise the severity.

## Steps to reproduce

Preconditions:

- The default dataset of OJS or OMP `main` (pkp/datasets `ojs/main`,
  `omp/main`). Nothing is created before the steps.
- A mail catcher the install sends to, to read Lisset Von's mailbox
  (`lvon@mailinator.com`).

1. Sign in as `dbarnes`.
2. Open submission 20 on the journal (18 on the press), "Transformative
   Impact of AI Tools on Modern Education: Opportunities, Challenges,
   and Future Directions"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=20`
   on the journal, `…?workflowSubmissionId=18` on the press).
   It opens on Review, Round 1, with nine reviewers who have not
   answered.
3. In "Reviewers", on Lisset Von's row ("Request Sent"), open "More
   Actions" and choose "Unassign Reviewer".
4. Leave the window as it comes ("Reviewer Unassign" chosen, the
   message filled) and press "Unassign Reviewer".
5. Open the newest email to `lvon@mailinator.com`.

**Expected.** The email's subject is the "Reviewer Unassign" one:

```
Your reviewer assignment for "Transformative Impact of AI Tools on Modern Education: Opportunities, Challenges, and Future Directions" has been removed
```

**Observed.** The notice "Reviewer removed." shows and the row is gone.
The email's text is the removal notice the window showed ("Dear Lisset
Von, We are writing to let you know that you have been removed from the
reviewer assignment for "Transformative Impact of AI Tools …" in
Journal of Public Knowledge. …"), under the subject of "Review Cancel":

```
Your review for "Transformative Impact of AI Tools on Modern Education: Opportunities, Challenges, and Future Directions" has been cancelled
```

The same on the press, whose text also prints "{$journalName}"
([U27-OMP3-press-reviewer-notices-journal-placeholder.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-OMP3-press-reviewer-notices-journal-placeholder.md)).
On 3.5 one notice serves both actions, and the email reads "Request for
Review Cancelled" over the cancel text, as designed there.

## Cause

`PKPReviewerGridHandler::updateClearReview()` in pkp-lib (line 720)
sends both notices, the unassign one and the cancel one, and fetches the
email template for their subject by a fixed key:

```php
$template = Repo::emailTemplate()->getByKey($context->getId(), ReviewCancel::getEmailTemplateKey());
$mailable = $form->getMailable($context, $submission, $reviewAssignment);
```

`$form` is an `UnassignReviewerForm` (whose mailable is `ReviewerUnassign`,
key `REVIEWER_UNASSIGN`) or a `CancelReviewForm` (`ReviewCancel`, key
`REVIEW_CANCEL`). `createMail()` sets the mailable's subject from
`$template`, so both notices go out under the `REVIEW_CANCEL` subject. The
body is the window's message, which `ReviewerNotifyActionForm::initData()`
fills from the mailable's own template.

`pkp/pkp-lib#13035` split the one notice into two (`pkp/pkp-lib#12903`):
its first commit, bba45b682c, created `updateClearReview()` and gave it
`ReviewCancel` for both the template and the mailable, while
`UnassignReviewerForm::getMailable()` kept `ReviewerUnassign`, whose
template fills the window's text. A review comment on the PR pointed at
this line ("Oops, you are right, thanks!"); the follow-up commit
[774240665a](https://github.com/pkp/pkp-lib/commit/774240665a5ae98f5a640e58b274d4f57cf53329)
took the mailable and the log entry's type from the form, and left the
template line as it was.

Reach:

- OPS has no review stage, so no such notice.
- "Cancel Reviewer" sends the cancel notice under its own subject, which
  is right; walked, with and without the fix.
- The email log: the entry is written with the unassign event type
  (`REVIEWER_UNASSIGN`) and the cancel subject (read in the code).
- An edit of the "Review Cancel" subject reaches unassign notices too
  (read in the code).
- Every other `getByKey(…::getEmailTemplateKey())` in pkp-lib, OJS and
  OMP names the class of the mailable it sends (searched); this line is
  the only mismatch.

## Proposed fix

Fetch the template of the mailable the form gives, as
`ReviewerNotifyActionForm::initData()` already does for the window's
text
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unassign-notice-cancel-subject/fix.diff)):

```diff
--- a/lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php
+++ b/lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php
@@ -717,8 +717,8 @@
             $reviewer = Repo::user()->get($reviewAssignment->getReviewerId());
             $user = $request->getUser();
             $context = app()->get('context')->get($submission->getData('contextId'));
-            $template = Repo::emailTemplate()->getByKey($context->getId(), ReviewCancel::getEmailTemplateKey());
             $mailable = $form->getMailable($context, $submission, $reviewAssignment);
+            $template = Repo::emailTemplate()->getByKey($context->getId(), $mailable::getEmailTemplateKey());
```

`I12903_ReviewerUnassignEmailTemplate` installs `REVIEWER_UNASSIGN` as a
site-wide default template, which `getByKey()` falls back to for every
journal and press, so the lookup finds a template on upgraded installs
too.

Tried on `main`, OJS and OMP: with the diff in, step 5's email reads
"Your reviewer assignment for "…" has been removed" over the same text.
"Cancel Reviewer", run as a control on an accepted reviewer (the
response logged with "Log Response"), still sends "Your review for "…"
has been cancelled", and "Reinstate Reviewer" "Can you still review
something for …?", as without the diff.

**Alternatives**

- Pass the template key from each caller (`updateUnassignReviewer()`,
  `updateCancelReview()`) into `updateClearReview()`: it works, but
  keeps two places that must agree with the form's mailable, which is
  how this fault came in.

Not proposed here, read in the code only: the windows' "Choose a
predefined message to use" list changes only the message. The form
posts no template key (`ReviewerNotifyActionForm::readInputData()`), so
an alternative template's subject is never sent by any of these
actions.

**What goes with it**

- No stored data to repair: the emails sent cannot be changed, and the
  templates are right.
- A test: unassign a reviewer and read the subject of the email the
  reviewer receives ("Your reviewer assignment for … has been
  removed"); cancel an accepted reviewer and read "Your review for …
  has been cancelled".

Small: one line in pkp-lib, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unassign-notice-cancel-subject/walk.js)
  (helpers in its `lib.js`), run in pkp-e2e's harness with
  `node bin/probe.js ojs,omp shared/playwright/checks/issues/unassign-notice-cancel-subject/walk.js`.
  It takes steps 1 to 5, then cancels the round for the press report;
  with `PHASE=nb` it runs "Cancel Reviewer" as a control instead.
  The fix was tried by applying `fix.diff` to the OJS and OMP checkouts
  and walking again on a freshly loaded dataset.
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, each on PKP's
  default dataset (pkp/datasets e8dafbc, 2026-10-02), PostgreSQL, as
  `dbarnes`. Mail was read in the test install's mail catcher
  (Mailpit). No request failed and the server logged no error.
- Tips, `main`: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
  (lib/pkp 3dc90c81a6). `stable-3_5_0`: OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c (lib/pkp cf3f984335). `stable-3_4_0`:
  pkp-lib 767353f4fe. `stable-3_3_0`: pkp-lib ac3fa73402.
- 3.5, walked and read: `updateUnassignReviewer()` sends
  `ReviewerUnassign` with the template of its own key, which is
  `REVIEW_CANCEL` there, so subject and text come from one template
  ("Request for Review Cancelled"); "Cancel Reviewer" goes through the
  same form and template.
- 3.4 and 3.3, code: 3.4's `updateUnassignReviewer()` is 3.5's;
  3.3's `UnassignReviewerForm::getEmailKey()` returns `REVIEW_CANCEL`
  and `ReviewerNotifyActionForm` builds subject and text from it.
- Not driven: a customised "Reviewer Unassign" or "Review Cancel"
  subject; the email log's entry; "Unassign Reviewer" by a section or
  series editor; the French interface; MySQL.
