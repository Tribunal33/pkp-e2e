# Registering with a journal that has no technical support contact ends on an empty page and locks the new account

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the email falls back to the principal contact)
- **Introduced** `pkp/pkp-lib#7221` for `pkp/pkp-lib#7141` · [875de4a8f3](https://github.com/pkp/pkp-lib/commit/875de4a8f3855882ea2a26506e935ce85282dc3d) · 2021-06-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#13130` (open; fix in PR `pkp/pkp-lib#13150` for `main` and `pkp/pkp-lib#13131` for 3.5, neither merged yet; the fix does nothing for accounts already locked)
- **Tracked in** spec U02 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#a6)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

When email validation is required and the journal has no technical
support contact, a visitor who presses "Register" with a valid form gets
an empty page: the app fails on the server. The account has still been
created, disabled with the reason "We've sent a confirmation email to
you at …", and no email is sent. Signing in is refused with that reason,
and registering again is refused because the username and email are
taken.

Adding a support contact afterwards helps only later registrations. An
account already locked stays locked until a manager finds it under Users
& Roles and presses "Enable User". Nothing on screen tells the manager
that this is needed.

It needs email validation, an install-wide setting (`require_validation`
in `config.inc.php`) that is off by default and that an administrator
turns on, with the envelope-sender settings left at their defaults. Only
a journal's own Register page is affected: the site-wide Register page
sends its email from the site's contact and works. The journal must
never have had its Contact settings saved, since that form will not save
without a support contact. That is the state of every journal created
under Administration › Hosted Journals until a manager completes
Settings › Journal › Contact.

## Impact

- **Lost**: the newcomer's registration, and nobody is told.
- **Who**: every visitor who registers on such a journal's Register page,
  on installs with validation on and no envelope sender configured
  (`allow_envelope_sender`, `force_default_envelope_sender` and
  `default_envelope_sender` unset, their defaults).
- **Way round**: the manager's "Enable User", one account at a time, once
  someone tells them. Otherwise the scheduled task "Remove unvalidated
  expired users" removes the account. It runs on the 1st of each month
  while validation is on, and deletes accounts registered more than
  `[general] user_validation_period` days earlier (28 by default; 0 turns
  it off) that were never validated and never signed in. So a locked
  account goes at the first monthly run after 28 days, up to about two
  months later, which frees the username and email (read in the code).

Medium: registration fails on the server and locks the account, but only
with validation on and the Contact settings never saved, and a manager
can unlock each account on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same, with
  the press and server words in brackets).
- `config.inc.php`, section `[email]`: `require_validation = On`, and
  `allow_envelope_sender`, `force_default_envelope_sender` and
  `default_envelope_sender` left unset, as they are by default.
- Mail as the dataset's `config.inc.php` sets it: `[email] default = smtp`
  to `localhost:1025`, with a mail catcher listening there (Mailpit, for
  instance), where the steps look for the email by its recipient.
- The dataset's `publicknowledge` already has a technical support contact,
  and its Settings › Journal › "Contact" will not save without one, so the
  steps create a journal that never had one.

Steps:

1. Sign in as `admin`. Open Administration › "Hosted Journals" ("Hosted
   Presses", "Hosted Servers") › "Create Journal" ("Create Press",
   "Create Server"). Fill in "Journal title" "u02a Journal", "Journal
   initials" "U02A", "Principal Contact Name" "u02a Contact", "Principal
   Contact Email address" `u02acontact@mailinator.com`, "Country"
   "Canada", "Path" `u02a`, "Languages" English (primary). Tick "Enable
   this journal to appear publicly on the site" and press "Save". Sign
   out.
2. Open the new journal's Register page,
   `/index.php/u02a/user/register`. Fill in Given Name "u02a", Family
   Name "Reader", Affiliation "Reader", Country "Canada", Email
   `u02areader@mailinator.com`, Username `u02areader`, Password and
   Repeat password `u02areaderu02areader`. Tick the privacy consent box
   and press "Register".
3. In a new private window, open the journal's Login page and sign in as
   `u02areader`. (Steps 5, 7 and 8 also start in a new private window,
   because after a refused sign-in the browser's next correct sign-in
   lands back on the Login page once. That is a separate fault.)
4. In the same window, open the Register page again and register with
   the same details.
5. In a new private window, sign in as `admin`. On journal `u02a`, open
   Settings › Journal (Press, Server) › "Contact". Under "Technical
   Support Contact", type Name "u02a Support" and Email address
   `u02asupport@mailinator.com`, then press "Save". Sign out.
6. In step 5's window, signed out, sign in as `u02areader` again. Then
   look in the mail catcher for messages to `u02areader@mailinator.com`.
7. In a new private window, register a second reader on `u02a`
   (`u02areader2`, the same form).
8. In a new private window, sign in as `admin`. On journal `u02a`, open
   Settings › Users & Roles › "Users", open `u02areader`'s "…" menu,
   choose "Enable User" and press "OK" in "Enable u02a Reader". Sign out,
   then sign in as `u02areader`.

**Expected** at step 2: the "Registration awaiting verification" page
("We've sent a confirmation email to you at u02areader@mailinator.com.
Please follow the instructions in that email to activate your new
account. …"), and a "Validate Your Account" email to
`u02areader@mailinator.com` in the mail catcher, from the journal's
principal contact, the only contact it has.

**Observed** on OJS, OMP and OPS:

- Step 2: an empty page. The POST answers 500, and the server log reads:

  ```
  PHP Fatal error:  Uncaught Symfony\Component\Mime\Exception\LogicException: An email must have a "From" or a "Sender" header. in lib/pkp/lib/vendor/symfony/mime/Message.php:132
  127.0.0.1:… [500]: POST /index.php/u02a/user/register - Uncaught Symfony\Component\Mime\Exception\LogicException: An email must have a "From" or a "Sender" header.
  ```

  No email arrives.
- Step 3 is refused: "Your account has been disabled for the following
  reason: We've sent a confirmation email to you at
  u02areader@mailinator.com. Please follow the instructions in that email
  to activate your new account. If you do not see an email, please check
  to see if it was put in your spam folder."
- Step 4 is refused: "The selected username is already in use by another
  user." and "The selected email address is already in use by another
  user."
- Step 6: still refused with the same reason, and still no email.
- Step 7, with the contact now set: the "Registration awaiting
  verification" page, and "Validate Your Account" arrives from "u02a
  Support <u02asupport@mailinator.com>".
- Step 8: after "Enable User", `u02areader` signs in and lands on the
  journal's home page.

## Cause

`PKP\observers\listeners\ValidateRegisteredEmail::manageEmail()` builds
the validation email for a journal-level registration and takes its
sender from the journal's technical support contact alone:

```php
$mailable->from($event->context->getData('supportEmail'), $event->context->getData('supportName'));
```

The support contact is optional in the context schema. Only `contactName`
and `contactEmail`, the principal contact, are required. A journal created
under Hosted Journals gets a principal contact from the create form and
no support contact. So the email has no From.

`PKP\mail\Mailer::setEnvelopeSenderDefault()` adds a Sender header only
when `[email] force_default_envelope_sender` and
`default_envelope_sender` are both set, or when `allow_envelope_sender`
is on and `default_envelope_sender` or the journal's envelope sender is
set. At the defaults none of these is set, so the message has neither
header, and Symfony's `Message::ensureValidity()` throws a
`LogicException` from `Mail::send()`. With a Sender set, the check
passes and the email goes out without a From (read in the code, not
driven).

`RegistrationHandler::register()` fires the event in a `try` that catches
only `Symfony\Component\Mailer\Exception\TransportException`, so this
exception reaches the top and the request ends with a 500 and no page.
By then the account exists. The handler calls `RegistrationForm::execute()`
before it fires the event, and that saves the user with `disabled = true`
and the `user.login.accountNotValidated` reason. The listener itself then
stores the pending invitation (`RegistrationAccessInvite::invite()`, just
before `Mail::send()`), whose link is never sent. No screen re-sends that
link.

The listener came with the move to Laravel mailables (`pkp/pkp-lib#7221`
for `pkp/pkp-lib#7141`). Before it, 3.3's `RegistrationForm` sent
`USER_VALIDATE` through `MailTemplate`. `MailTemplate` sets the From to
the journal's principal contact (or the site's), and `_setMailFrom()` sets
the Reply-To to the support contact, or to the site's contact when there
is none. The rewrite made the support contact the From. It kept neither
the From's fallback to the principal contact nor the Reply-To's fallback
to the site's contact.

Reach:

- The site-wide Register page is not affected: it sends from the site's
  contact, which the installer requires (checked on screen, OJS, OMP,
  OPS).
- No other mailable takes its sender from `supportEmail`. The other
  context mails sent without a user (`AssignEditors`,
  `SendSubmissionAcknowledgement`, `PKPReviewerReviewStep3Form`,
  `SubEditorsDAO`, `NotifyAuthorOnPublication`) send from the principal
  contact (checked in the code).
- The listener is pkp-lib's, shared by the three apps unchanged (checked
  in the code and on screen).
- Accounts already locked stay locked when the contact is added later
  (checked on screen).

## Proposed fix

Give the validation email a sender that always exists. Use the support
contact when the journal has one, otherwise the principal contact, which
every context must have, and as a last resort the site's contact. This
goes in `ValidateRegisteredEmail`, the one place that builds the
email
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/register-no-support-contact-empty-page/fix.diff)):

```php
$mailable->from(...$this->getContextSender($event->context));
…
protected function getContextSender(Context $context): array
{
    if ($context->getData('supportEmail')) {
        return [$context->getData('supportEmail'), $context->getData('supportName')];
    }
    if ($context->getData('contactEmail')) {
        return [$context->getData('contactEmail'), $context->getData('contactName')];
    }
    $site = Application::get()->getRequest()->getSite();
    return [$site->getLocalizedContactEmail(), $site->getLocalizedContactName()];
}
```

This follows the code base's pattern: the other context mails sent
without a user use the principal contact, and 3.3 fell back the same way.
It also keeps the intent of `pkp/pkp-lib#7221`, which is that a journal
with a support contact still sends from it. The open PR
`pkp/pkp-lib#13150` (`pkp/pkp-lib#13131` on 3.5) makes the same change.

Tried on `main` on OJS, OMP and OPS. With the fix, step 2 shows
"Registration awaiting verification", and "Validate Your Account" arrives
from "u02a Contact <u02acontact@mailinator.com>". Step 7 still sends from
the support contact once it is set. Two nearby paths were also checked,
with the fix in and out alike. A journal given a support contact before
anyone registers sends from that contact, and the site-wide Register page
sends from the site's contact.

**Alternatives**

- Widen the handler's `catch` to every exception. That turns the empty
  page into the "awaiting verification" page, but the email is still not
  sent and the account is still locked.
- Require the support contact when a journal is created. That changes
  the Hosted Journals form and the REST API, and journals that already
  exist without a contact would still fail.

**What goes with it**

- No data repair: accounts already locked go as Impact's way round says.
- 3.5 takes the diff as written (`pkp/pkp-lib#13131`). 3.4's listener has
  the same `from()` line, but the file around it differs: it imports
  `PKP\core\PKPApplication` and no `APP\core\Application`, and it creates
  an `AccessKeyManager` key instead of an invitation. So the patch is
  redone there, with `PKPApplication::get()` for the site fallback.
- Guard: a unit test of `ValidateRegisteredEmail` with a context that has
  no `supportEmail`, or the e2e scenario in spec U02 (Rule 12) that
  registers on a journal without a support contact with validation on.

Small: one method in one pkp-lib listener, already written in an open
PR, plus a test.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/register-no-support-contact-empty-page/walk.js)
  (helpers in `lib.js` beside it) takes steps 1–8 through the screens on
  OJS, OMP and OPS. It runs on an install freshly loaded from the default
  dataset, and serves that install under a copy of its `config.inc.php`
  with `require_validation = On`, `base_url` on its own port and its own
  session cookie. It reads each page, the POST's status, the server log
  and the mailbox. The copy keeps the dataset's mail settings (SMTP, the
  envelope-sender keys unset). `neighbour` as its argument runs the
  check of the two nearby paths:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/register-no-support-contact-empty-page/walk.js [neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/register-no-support-contact-empty-page/fix.diff ojs omp ops`,
  then the steps and the nearby paths, then `revert` and the nearby paths
  again.
- On 3.5, step 8 ran as a second process (argument `enable`) on the
  state steps 1–7 had left, after the first process stopped at the
  admin's sign-in before step 8.
- The new private windows of steps 3, 5, 7 and 8 avoid spec U01's
  [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a12):
  after a refused sign-in, the browser's next correct sign-in lands back
  on the Login page once.
- Datasets: pkp/datasets 566bb1f (2026-10-03), `main` and
  `stable-3_5_0`, on PostgreSQL. The fault does not depend on the
  database.
- Branch tips. `main`: OJS ff004d0973 (pkp-lib 987776cd04), OMP
  3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6). 3.5: OJS
  c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (pkp-lib cf3f984335). 3.4: pkp-lib 767353f4fe; OJS d68934d0d1, OMP
  0aec65441, OPS acd8ae704b. 3.3: pkp-lib ac3fa73402; OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161.
- Code reads. `main` and 3.5:
  `classes/observers/listeners/ValidateRegisteredEmail.php`,
  `pages/user/RegistrationHandler.php::register()`,
  `classes/user/form/RegistrationForm.php::execute()`,
  `schemas/context.json` (required fields),
  `classes/components/forms/context/PKPContactForm.php`,
  `classes/mail/Mailer.php::setEnvelopeSenderDefault()`, every
  `->from(` and `supportEmail` read in pkp-lib and the apps' `classes/`,
  `classes/task/RemoveUnvalidatedExpiredUsers.php` and
  `classes/user/DAO.php::deleteUnvalidatedExpiredUsers()`. 3.4:
  pkp-lib `stable-3_4_0` has the same listener line and the same
  `catch`, in a listener that uses `AccessKeyManager`. 3.3: pkp-lib `stable-3_3_0`
  `classes/user/form/RegistrationForm.inc.php` (`execute()`,
  `_setMailFrom()`) and `classes/mail/MailTemplate.inc.php`
  (constructor: From is the principal contact or the site's).
- Introduced: `git blame` on the `from()` line gives 875de4a8f3, the
  commit that created the listener. `commits/<sha>/pulls` names the
  merged PR `pkp/pkp-lib#7221` (merged 2021-09-14). The commit is not on
  `stable-3_3_0` and is on `stable-3_4_0`, `stable-3_5_0` and `main`.
- Upstream: `pkp/pkp-lib#13130` reports the same 500 on 3.5. Its QA
  comments (2026-09-22, 2026-10-02) say the error could not be reproduced
  before or after the fix. The steps above reproduce it from the default
  dataset with a journal created under Hosted Journals. An install with
  an envelope sender configured does not fail (see Cause), which may be
  why QA could not reproduce it. The open PRs' diff matches `fix.diff`.
- Not driven: 3.4 and 3.3 (read in the code). The fix's last fallback
  (the site's contact for a journal with no principal contact) was not
  driven, because the schema requires a principal contact. A journal
  whose support contact was cleared through the REST API was not
  driven either.
