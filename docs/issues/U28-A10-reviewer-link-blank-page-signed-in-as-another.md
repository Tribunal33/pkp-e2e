# A reviewer's one-click review link shows a blank page in a browser signed in as another user

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the link opens the review page's own refusal)
  - 3.3: none (code; the link opens the review page's own refusal)
- **Introduced** `pkp/pkp-lib#10013` for `pkp/pkp-lib#9887` · [011ebb8c2e](https://github.com/pkp/pkp-lib/commit/011ebb8c2ea29a01729e1420723cb39fd70180b2) · 2024-06-04 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#12807` (open; fix in PR `pkp/pkp-lib#13272` for `stable-3_5_0`, not yet merged, none yet for `main`)
- **Tracked in** spec U28 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The app fails on the server when a reviewer's one-click review link is
opened in a browser that is signed in as somebody else: the page is
entirely blank, with no message and no way on. The person expects the
review, or at least to be told that they are signed in to the wrong
account.

The link opens the review as before once the browser is signed out.

It needs "One-click Reviewer Access" turned on in the review settings,
which is off by default, and a browser signed in to another account: a
reviewer who also has a second account, an editor trying the link they
have just sent, or a shared computer.

pkp already tracks this, with a fix written for 3.5 and none for `main`.
This report adds that fix brought to `main` and tried there.

## Impact

- **Lost**: nothing stored; the server logs an uncaught error.
- **Who**: a reviewer invited at an address that belongs to a second
  account of theirs meets it on every request and reminder email while
  they are signed in to the first. A preprint server has no review, so
  it sends no such link.
- **Way round**: sign out and open the link again.

Medium: the blank page does not name the way round. It would be high if
the link stopped working afterwards; it does not.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 7, "Developing efficacy
  beliefs in the classroom", is in review round 1, and "Julie Janssen"
  (`jjanssen`) is not one of its reviewers.
- On a press, the default dataset, OMP `main`: submission 2, "The West
  and Beyond: New Perspectives on an Imagined Region", is in review
  round 1, and "Adela Gallego" (`agallego`) is not one of its reviewers.
  She takes Julie Janssen's place in step 2, and the author `afinkel`
  takes `dsokoloff`'s in step 5.
- A mail catcher that shows what the install sends. The dataset's
  `config.inc.php` sends mail by SMTP to `localhost:1025`, the port
  Mailpit and MailHog listen on. The link cannot be read from the
  `invitations` table, which stores the key hashed.

Steps:

1. Sign in as `dbarnes`. Open Settings > Workflow > Review > Setup, tick
   "Include a secure link in the email invitation to reviewers." under
   "One-click Reviewer Access", and press "Save".
2. Open submission 7. Under "Reviewers" press "Add Reviewer", press
   "Select Reviewer" on "Julie Janssen", then "Add Reviewer".
3. In the mail catcher, open the email "Invitation to review" sent to
   `jjanssen@mailinator.com` (on a press, "Manuscript Review Request" to
   `agallego@mailinator.com`) and copy its review link,
   `/index.php/publicknowledge/en/invitation/accept?id=…&key=…`.
4. Still signed in as `dbarnes`, paste the link into the address bar.
5. Sign out, sign in as the submission's author, `dsokoloff`, and paste
   the link again.
6. Sign out and paste the link once more.

**Expected**: steps 4 and 5 show a page saying that the browser is signed
in as a different user and that the link works after signing out. Step 6
signs Julie Janssen in and opens the review.

**Observed**: steps 4 and 5 each answer HTTP 500 with an empty page (no
title, no text); `dbarnes` and `dsokoloff` stay signed in. [The
dataset's `config.inc.php` has `display_errors = Off`; with it on, PHP
prints the fatal error below on the page instead (not driven).] The line
is written to PHP's error log:

```
PHP Fatal error:  Uncaught Exception: You are logged in as a different user. Please log out and try the invitation link again. in lib/pkp/classes/invitation/invitations/reviewerAccess/ReviewerAccessInvite.php:135
```

Step 6 opens "Review: Developing efficacy beliefs in the classroom",
signed in as `jjanssen`.

## Cause

`InvitationHandler::accept()` serves the link. For a reviewer's link it
calls `ReviewerAccessInviteRedirectController::acceptHandle()`, which
calls `ReviewerAccessInvite::handleAccess()` and then redirects to the
review page. `handleAccess()` runs `_validateAccessKey()`, which signs
the invited reviewer in. Nothing on this path marks the invitation
accepted (`finalize()`, which does, is not called here), so the link
stays pending and opens again after any number of refusals or uses.

`_validateAccessKey()` refuses when the session already belongs to
another user, and it refuses by throwing a plain `Exception` (line 135).
Neither `acceptHandle()` nor `InvitationHandler::accept()` has a `try`
around the call, so PHP ends the request as an uncaught error: HTTP 500
and an empty body. The handler's other refusals throw
`NotFoundHttpException` or show the "Invitation Unavailable" page.

Up to 3.4 the link went straight to the review page, with a key. When
somebody was already signed in, `ReviewerHandler::_validateAccessKey()`
ignored the key, and the review page's ordinary access check refused
that user with its usual message.

The first invitation-based version (`pkp/pkp-lib#9200`) behaved the same
for a signed-in user: after a failed check it still redirected to the
review page. "Invitation API Support" (`pkp/pkp-lib#10013`) put the
check into the invitation's `finalise()` as it was then, and made a
failed check `throw new Exception()`. On `main` the check sits in
`handleAccess()`, and `finalize()` only marks the invitation accepted.

`pkp/pkp-lib#12399` (for `pkp/pkp-lib#12398`) later added the message
text to the bare exception, for the server log. The PR's description
names a page for the user as follow-on work.

Reach:

- Every one-click link takes this path, because each email makes a
  `ReviewerAccessInvite` (code read): the request email in
  `EditorAction::createMail()` (`EditorAction.php` line 220), the scheduled reminders in `jobs/email/ReviewReminder.php` (line
  77), and the `ReviewRemind`, `ReviewRemindAuto` and
  `ReviewResponseRemindAuto` mailables through
  `OneClickReviewerAccess::setOneClickAccessUrl()`.
- `_validateAccessKey()` throws three more plain exceptions, for a
  review assignment, a submission or a reviewer account that no longer
  exists, and `acceptHandle()` one for a missing assignment. Code read,
  not driven: unassigning a reviewer cancels the invitation
  (`reviewAssignment\Repository::delete()`, on `main` and on 3.5), so
  an unassigned reviewer's link is answered "Invitation Unavailable" in
  `getInvitationByKey()` and never reaches the two missing-assignment
  exceptions. How a submission or an account could go missing under a
  pending invitation was not looked at.
- The role invitation's link has its own page, which shows "Invitation
  not accepted. You're logged in as a different user." (code read:
  ui-library `AcceptInvitationPageStore.js`).

## Proposed fix

Take the fix the team already has in review, `pkp/pkp-lib#13272`, and
bring it to `main` as well. It gives the refusal its own exception class,
`SignedInAsDifferentUserException`, catches it in
`InvitationHandler::accept()`, and shows a page in the style of
"Invitation Unavailable": the heading "You are signed in as a different
user", a sentence, and a "Sign out and continue" link that signs the
browser out and returns to the same invitation link.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-link-blank-page-signed-in-as-another/fix.diff)
is that PR cut against `main`. Nothing differs from the PR but the
place of its `locale/en/invitation.po` hunk, which is anchored to the
end of `main`'s file.

```diff
--- a/lib/pkp/classes/invitation/invitations/reviewerAccess/ReviewerAccessInvite.php
+++ b/lib/pkp/classes/invitation/invitations/reviewerAccess/ReviewerAccessInvite.php
         if ($loggedInUserId && $loggedInUserId != $this->invitationModel->userId) {
-            throw new Exception('You are logged in as a different user. Please log out and try the invitation link again.');
+            throw new SignedInAsDifferentUserException('You are logged in as a different user. Please log out and try the invitation link again.');
         }
--- a/lib/pkp/pages/invitation/InvitationHandler.php
+++ b/lib/pkp/pages/invitation/InvitationHandler.php
-        $invitationHandler->preRedirectActions(InvitationAction::ACCEPT);
-        $invitationHandler->acceptHandle($request);
+        try {
+            $invitationHandler->preRedirectActions(InvitationAction::ACCEPT);
+            $invitationHandler->acceptHandle($request);
+        } catch (SignedInAsDifferentUserException $e) {
+            $this->displaySignedInAsDifferentUserPage($request);
+        }
```

Tried on `main`, OJS and OMP: steps 4 and 5 then answer 200 with the
page "You are signed in as a different user", `dbarnes` and the author
stay signed in, and nothing is written to the server log. Pressing "Sign
out and continue" opens the review, signed in as the reviewer. With and
without the fix, a reviewer's own link opens the review both in a
browser signed in as that reviewer and in one that is not signed in.
Not tried on an install served from a sub-path: the page's sign-out link
returns through `login/signOut`'s `source`, built from `REQUEST_URI`.

**Alternatives**:

- Redirect to the app's general refusal page (`user/authorizationDenied`)
  with the sentence as a new locale key: fewer files, but that page
  offers no way on, where the PR's page signs out and continues.
- Go back to 3.4's behaviour and redirect to the review page without
  signing in: the review page's refusal speaks of roles and access, not
  of being signed in to the wrong account.
- Sign the other user out and the reviewer in without asking: a person
  who clicked a link loses their session unannounced.

**What goes with it**:

- No stored data is involved and no API answer changes.
- The fix catches only the new class, so the four other plain exceptions
  on this path still end as a server error. By the code read above, no
  action on screen leads to the two missing-assignment ones.
- Guard: an e2e check that opens a reviewer's one-click link in a browser
  signed in as another user and expects the page with "Sign out and
  continue", then the review after pressing it.

Medium: the fix is written, but it is five pkp-lib files with a new
page and three locale texts to translate, and `main` still needs its own
PR, with the locale hunk re-anchored, and the guard. Small would be a
few lines in one place.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-link-blank-page-signed-in-as-another/walk.js)
  takes steps 1–6 on OJS and OMP, on an install freshly loaded from the
  default dataset, and reads each pasted link's HTTP status, page text
  and the server log lines written during the request (with
  `WALK_MODE=neighbour`, the fix's neighbour check):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reviewer-link-blank-page-signed-in-as-another/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Datasets: pkp/datasets e8dafbc (2026-10-02), `main` and `stable-3_5_0`,
  on PostgreSQL.
- Branch tips. `main`: OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP
  3b0ecf794c (pkp-lib 3dc90c81a6). 3.5: OJS 091fb65453, OMP 9c5e24246c;
  pkp-lib cf3f984335. 3.4: pkp-lib 6f96165c90, OJS 75cc2d488b, OMP
  0aec65441. 3.3: pkp-lib 4156e50233, OJS ac77c9fb35, OMP 8e72fc883.
- Code reads. `main` and 3.5:
  `classes/invitation/invitations/reviewerAccess/ReviewerAccessInvite.php`,
  its `handlers/ReviewerAccessInviteRedirectController.php` and
  `pages/invitation/InvitationHandler.php` (these three are the same in
  the two pkp-lib commits OJS and OMP `main` sit on and, but for
  whitespace in the handler, on 3.5),
  `classes/submission/action/EditorAction.php`,
  `jobs/email/ReviewReminder.php`,
  `classes/mail/traits/OneClickReviewerAccess.php` and the three
  mailables that use it,
  `classes/submission/reviewAssignment/Repository.php::delete()`,
  `pages/login/LoginHandler.php::signOut()` (the `source` the fix's link
  returns to). 3.4: OJS and OMP `pages/reviewer/ReviewerHandler.php`,
  whose `_validateAccessKey()` returns when the session has a user, and
  pkp-lib `classes/mail/traits/OneClickReviewerAccess.php`, whose link
  is `reviewer/submission?…&key=…`. 3.3: OJS
  `pages/reviewer/ReviewerHandler.inc.php`, the same early return; OMP's
  handler there reads no key at all.
- Introduced: `git blame` on line 135 gives 722a7f222d
  (`pkp/pkp-lib#12399`), which only added the message to a
  `throw new Exception()` that 011ebb8c2e (`pkp/pkp-lib#10013`) brought;
  the commit before it returned `false` and redirected to the review
  page.
- Upstream: `pkp/pkp-lib#12807` reports this case and the unassigned
  reviewer's link on OJS 3.5.0-4. `pkp/pkp-lib#12398` (closed) reported
  the same blank page; its PR changed the log line only.
- Not driven: a reminder email's link opened as somebody else; the four
  other exceptions on the path; the page with `display_errors` on;
  `pkp/pkp-lib#13272` on the 3.5 install; the fix on an install served
  from a sub-path.
