# When the mail server cannot be reached, a new registrant is told a confirmation email was sent and their account stays locked

- **Severity** medium
- **Effort** large
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [b615d0e4ce](https://github.com/pkp/pkp-lib/commit/b615d0e4ce9c377280858b585d88b51725f57959) (2018-11-15)
- **Upstream** `pkp/pkp-lib#4646` (open; asks for a way for managers to resend the validation email, which would give these accounts a way out, but would not change what the registrant is told)
- **Tracked in** spec U02 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#a6)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

When email validation is required and the mail server does not answer,
a visitor who registers is still shown "Registration awaiting
verification" and "We've sent a confirmation email to you at …". No
email goes out. The account is left disabled, and signing in is refused
with the reason "We've sent a confirmation email to you at …".

The registrant has no way to get a new link. The failure is written only
to the server log and to a notification for the new account, which its
owner cannot see while the account is disabled.

Email validation is an install-wide setting (`require_validation` in
`config.inc.php`), off by default, that an administrator turns on. Per
the code, a wrong mail setting (server, port or credentials) fails every
registration the same way, not only an outage.

## Impact

- **Lost**: the registration. The person waits for an email that never
  comes, and cannot register again with the same username or email.
- **Who**: every visitor who registers while mail cannot be sent, on
  installs with validation on. No editor or manager gets a message or a
  notice.
- **Way round**: a manager can use "Enable User" on the account under
  Users & Roles, if the registrant writes to the journal. Otherwise the
  scheduled task "Remove unvalidated expired users" removes the account.
  It runs on the 1st of each month while validation is on, and deletes
  accounts registered more than `[general] user_validation_period` days
  earlier (28 by default; 0 turns it off) that were never validated and
  never signed in. So the account goes at the first monthly run after 28
  days, up to about two months later, which frees the username and email
  (read in the code).

Medium: registration fails and the page says it succeeded, but only
while mail cannot be sent, and a manager can unlock each account on
screen. A resend path that registrants could use themselves would lower
this; outages that last for days would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- `config.inc.php`, section `[email]`: `require_validation = On`, and the
  mail server unreachable: `default = smtp` (the dataset's own setting),
  `smtp_server = 127.0.0.1`, `smtp_port = 1` (a port where nothing
  listens). `[general] sandbox = Off`, its default, since the sandbox
  sends nothing.

Steps:

1. Open the Register page of `publicknowledge`,
   `/index.php/publicknowledge/user/register`. Fill in Given Name "u02a",
   Family Name "Smtp", Affiliation "Smtp", Country "Canada", Email
   `u02asmtp@mailinator.com`, Username `u02asmtp`, Password and Repeat
   password `u02asmtpu02asmtp`. Tick the privacy consent box and press
   "Register".
2. Open the Login page of `publicknowledge` and sign in as `u02asmtp`.

**Expected** at step 1: a page that says the confirmation email could not
be sent and what to do next, with no locked account left behind, or a
way to get the email once mail works again.

**Observed** on OJS, OMP and OPS:

- Step 1 shows "Registration awaiting verification": "We've sent a
  confirmation email to you at u02asmtp@mailinator.com. Please follow the
  instructions in that email to activate your new account. If you do not
  see an email, please check to see if it was put in your spam folder."
  The POST answers 200. The server log reads:

  ```
  Connection could not be established with host "127.0.0.1:1": stream_socket_client(): Unable to connect to 127.0.0.1:1 (Connection refused)
  ```

- Step 2 is refused: "Your account has been disabled for the following
  reason: We've sent a confirmation email to you at
  u02asmtp@mailinator.com. Please follow the instructions in that email to
  activate your new account. If you do not see an email, please check to
  see if it was put in your spam folder."

## Cause

`PKP\pages\user\RegistrationHandler::register()` calls
`RegistrationForm::execute()`. That saves the new user with
`disabled = true` and the `user.login.accountNotValidated` reason
("We've sent a confirmation email…"). Only then does the handler fire
`UserRegisteredContext`, whose listener `ValidateRegisteredEmail` stores
the pending invitation and sends the email.

When the send throws `TransportException`, the handler catches it,
creates an `email.compose.error` notification for the new user, writes
the message as a warning, and falls through to the same "Registration
awaiting verification" page as a successful send. The notification
reaches only that user, and only after signing in, which the disabled
account cannot do.

No screen sends the activation link again, either to the registrant or
from Users & Roles (`pkp/pkp-lib#4646`). The notification on failure
came with `pkp/pkp-lib#2422` ("Notify user when email sending fails",
b615d0e4ce, 2018), in `RegistrationForm::execute()`, which had already
saved the user (3.3 still does it there). The move to mailables (commit 875de4a8f3, PR
`pkp/pkp-lib#7221` for issue `pkp/pkp-lib#7141`, 2021) moved the send
into the listener and put the `try`/`catch` in the handler, then catching
`Swift_TransportException`, with the same notification.

Reach:

- Journal-level and site-wide registration alike: `UserRegisteredContext`
  and `UserRegisteredSite` are fired in the same `try`/`catch` (checked
  in the code; on screen only at the journal level).
- Any failure Symfony reports as a `TransportException` takes this path:
  a connection that cannot be made, a failed login to the mail server, an
  unexpected answer from it (`UnexpectedResponseException` extends it).
  Only the first was walked.
- The three apps share the handler unchanged (checked on screen).
- A failure that is not a `TransportException` (a missing sender) is not
  caught at all and ends on an empty page. That fault and its fix are in
  a separate report,
  [U02-A6-register-no-support-contact-empty-page](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U02-A6-register-no-support-contact-empty-page.md).

## Proposed fix

Not tried: what should become of an account whose confirmation email
failed is a product decision. The recommendation is to undo the
registration and say so.

In the handler's `catch`, delete the account that was just created with
`Repo::user()->delete($user)`. On `main` and 3.5 the pending invitation
goes with it through `invitations.user_id`'s cascade. On 3.4 the
listener's `access_keys` row cascades the same way. Then show the
Register form again with the entered values and a form error such as
"Your account could not be created because the confirmation email could
not be sent. Please try again later."

- The `createTrivialNotification()` call goes, since its user is
  deleted. The `trigger_error()` warning stays for the server log.
- The error goes on the email field (`$regForm->addError('email', …)`,
  shown in the form's error list), with a new key in pkp-lib's
  `locale/en/user.po`.
- `Repo::user()->delete()` writes a `USER_DELETED` audit entry and calls
  the `User::delete::before` and `User::delete` hooks. That matches the
  `USER_CREATED` entry and `User::add` hook that `add()` has just written,
  so plugins see both.
- A database transaction around `execute()` and the send would leave no
  audit entries, but it would roll back the row behind the back of the
  `User::add` hook's listeners. The explicit delete keeps the two in
  step.

This keeps the intent of `pkp/pkp-lib#2422`, which was to tell the user
that the email failed.

**Alternatives**

- Keep the account and give it a way to get the link again: a "send the
  link again" action on the refused sign-in, or the manager action asked
  for in `pkp/pkp-lib#4646`. Such accounts can be found by a null
  `users.date_validated` and, on `main` and 3.5, a pending registration
  invitation. What a resend must settle is an unvalidated account that a
  manager has also disabled: activation enables any account whose
  `date_validated` is null (`RegistrationAccessInvite::setUserValid()`),
  so that would re-enable it.
- Keep everything as it is and only change the page's wording to "Your
  account was created, but the confirmation email could not be sent.
  Please contact the journal." This is smallest, but the account stays
  locked until a manager acts.

**What goes with it**

- No data repair: accounts already locked go as Impact's way round says.
- Backport: the same `catch` exists on 3.5 and 3.4. 3.3 does the same
  inside `RegistrationForm::execute()`.
- Guard: an e2e scenario in spec U02 (Rule 12) that registers with mail
  failing (a configuration whose SMTP port refuses connections) and
  expects no locked account.

Large: the fix cannot be written until the team decides between undoing
the account and offering a resend. Either choice changes what an
existing screen does, and the resend path is a feature of its own.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/register-no-support-contact-empty-page/walk.js)
  with the argument `smtp` (helpers in `lib.js` beside it) takes steps 1–2
  on OJS, OMP and OPS. It runs on an install freshly loaded from the
  default dataset. A second PHP server serves the same install under a
  copy of its `config.inc.php`. The copy keeps the dataset's
  `default = smtp`, `smtp_server = 127.0.0.1` and `sandbox = Off`, and
  changes `require_validation` to On, `smtp_port` to 1, `base_url` to the
  server's own port and the session cookie's name. It reads the
  page, the POST's status, the server log, the mailbox and the account's
  `disabled` and `disabled_reason`:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/register-no-support-contact-empty-page/walk.js smtp`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Datasets: pkp/datasets 566bb1f (2026-10-03), `main` and
  `stable-3_5_0`, on PostgreSQL. The fault does not depend on the
  database.
- Branch tips. `main`: OJS ff004d0973 (pkp-lib 987776cd04), OMP
  3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6). 3.5: OJS
  c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (pkp-lib cf3f984335). 3.4: pkp-lib 767353f4fe; OJS d68934d0d1, OMP
  0aec65441, OPS acd8ae704b. 3.3: pkp-lib ac3fa73402; OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161.
- Code reads. `main` and 3.5: `pages/user/RegistrationHandler.php::register()`,
  `classes/user/form/RegistrationForm.php::execute()`,
  `classes/observers/listeners/ValidateRegisteredEmail.php`,
  `classes/task/RemoveUnvalidatedExpiredUsers.php`,
  `classes/user/DAO.php::deleteUnvalidatedExpiredUsers()`,
  `classes/scheduledTask/PKPScheduler.php` (monthly, on the 1st), and a
  search of `pages/`, `controllers/` and `api/` for any resend of the
  activation link (none). 3.4: pkp-lib `stable-3_4_0`
  `pages/user/RegistrationHandler.php` (the same `catch`). 3.3: pkp-lib
  `stable-3_3_0` `classes/user/form/RegistrationForm.inc.php::execute()`
  (the user is inserted first; a failed `send()` only adds the
  notification).
- Introduced: the 3.3 lines that handle the failed send come from
  b615d0e4ce (`pkp/pkp-lib#2422`, 2018-11-15). The user was saved before
  the email in older code than that, and that history was not traced
  further.
- Not driven: 3.4 and 3.3 (read in the code); a site-wide registration
  during the outage; a mail server that accepts the connection and then
  refuses the login or the message (the same `catch` per the code,
  unverified on screen); whether the `email.compose.error` notification is
  shown once the account is enabled.
