# Account activation links stop working after 3 days, not the 14 days the configuration file sets

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; there the link expires after `validation_timeout` days)
  - 3.3: none (code; there the link expires after `validation_timeout` days)
- **Introduced** `pkp/pkp-lib#10013` for `pkp/pkp-lib#9887` · [011ebb8c2e](https://github.com/pkp/pkp-lib/commit/011ebb8c2ea29a01729e1420723cb39fd70180b2) · 2024-06-04 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#10351` (closed without a fix), about how `validation_timeout` is described. A comment there notes that `main` no longer reads `validation_timeout`.
- **Tracked in** spec U02 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

Where new accounts must confirm their email address, the emailed
activation link stops working three days after registration. The
configuration file sets 14 days for it (`validation_timeout`, "the
number of days a user has to validate their account"), and changing
that value changes nothing.

A newcomer who opens the email on day four sees "Invitation
Unavailable". Signing in is refused with a message telling them to
follow the email they already used, and registering again is refused
because the username and email are taken. Only a Journal Manager who
enables the account by hand lets them in.

It happens only where an administrator has turned on email validation
(`require_validation`, off by default). The link follows the lifetime
of all invitations instead (`[invitations] expiration_days`, 3 by
default).

## Impact

- **Lost.** Nobody at the journal is told that a newcomer is locked
  out.
- **Who.** Typically a newcomer who finds the email late in the spam
  folder. An administrator who raises `validation_timeout` gets no sign
  that the change does nothing.
- **Way round.** A Journal Manager can enable each account by hand
  (Users & Roles › Users, the row's "Enable User"), once the newcomer
  finds a way to ask. No screen they reach sends a new link. As a
  stopgap, an administrator can raise `[invitations] expiration_days`
  to 14 in `config.inc.php`. That also lengthens the links for role
  invitations sent from Users & Roles and for confirming a changed
  email address. It does not change the reviewer's one-click link,
  which has its own lifetime.

Medium: a newcomer cannot activate their account without a manager's
help, in a setup that is off by default. It would be high if most
installs turned validation on.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`.
- The install's `config.inc.php` reads `require_validation = On` under
  `[email]`, with `validation_timeout = 14` left as shipped, and its
  mail reaches a mailbox you can read.
- `config.inc.php` reads `expiration_days = 0` under `[invitations]`.
  This makes the link as old as it is on day four on a default install
  (`expiration_days = 3`): past the invitations' lifetime but well
  inside the 14 days of `validation_timeout`. Without this edit, wait
  four days between steps 1 and 2.

Steps:

1. Signed out, open the journal's "Register" page. Type "u02h" in
   "Given Name", "Reader" in "Family Name", "Reader" in "Affiliation",
   choose "Canada" in "Country", type `u02hreader@mailinator.com` in
   "Email", `u02hreader` in "Username" and `u02hreaderu02hreader` in
   "Password" and "Repeat password", tick the privacy consent box and
   press "Register".
2. Open the email "Validate Your Account" sent to
   `u02hreader@mailinator.com` and follow its link.
3. Press "Login" on that page and sign in as `u02hreader` /
   `u02hreaderu02hreader`.
4. Sign out, open "Register" again and fill it in exactly as in step 1.
5. Sign in as `rvaca` (Journal Manager). Open Settings › Users & Roles ›
   "Users", search for "u02h", open the "…" menu of "u02h Reader", choose
   "Enable User" and press "OK". Sign out and sign in as `u02hreader`.

**Expected.** Step 2 opens "Confirm and activate your account", since
the link is 14 days from expiring, and "Activate Account" activates the
account. Signing in at step 3 then works, so steps 4 and 5 are not
needed.

**Observed.** Step 1 lands on "Registration awaiting verification".
Step 2's page,
`/index.php/publicknowledge/en/invitation/accept?id=…&key=…`, answers
200 and shows:

```
Invitation Unavailable
This invitation is no longer available. It may have already been accepted, declined, or expired. Please contact the journal manager for further assistance.
Login   Register
```

Step 3 is refused on the Login page, and no new email is sent:

```
Your account has been disabled for the following reason: We've sent a confirmation email to you at u02hreader@mailinator.com. Please follow the instructions in that email to activate your new account. If you do not see an email, please check to see if it was put in your spam folder.
```

Step 4 is refused: "The selected username is already in use by another
user." and "The selected email address is already in use by another
user." After step 5's "Enable User", `u02hreader` signs in.

## Cause

The activation link's lifetime is the generic invitation lifetime,
because `PKP\invitation\invitations\registrationAccess\RegistrationAccessInvite`
(`lib/pkp/classes/invitation/invitations/registrationAccess/RegistrationAccessInvite.php`)
does not override `getExpiryDays()`.

`PKP\observers\listeners\ValidateRegisteredEmail::manageEmail()` makes
the link by creating a `RegistrationAccessInvite` and calling
`invite()`. `Invitation::invite()` sets
`expiryDate = now + $this->getExpiryDays()`, and the base
`Invitation::getExpiryDays()` returns
`Config::getVar('invitations', 'expiration_days', self::DEFAULT_EXPIRY_DAYS)`
(3). The accept page looks the invitation up through
`Repo::invitation()->getByIdAndKey()`, which keeps only unexpired rows,
so a link past that date answers "Invitation Unavailable". Nothing in
`lib/pkp`, `classes/` or `pages/` of the three apps reads
`[email] validation_timeout`.

Until 3.4 the link was an access key that lived
`validation_timeout` days
(`AccessKeyManager::createKey(…, Config::getVar('email', 'validation_timeout'))`
in `ValidateRegisteredEmail`). [596057ddfb](https://github.com/pkp/pkp-lib/commit/596057ddfbb8645b516584f664be1d55751b61ee)
(PR `pkp/pkp-lib#9200` for issue `pkp/pkp-lib#9197`) moved the link onto invitations and kept the key,
passing it to the invitation's constructor. [011ebb8c2e](https://github.com/pkp/pkp-lib/commit/011ebb8c2ea29a01729e1420723cb39fd70180b2)
(PR `pkp/pkp-lib#10013` for issue `pkp/pkp-lib#9887`) redesigned invitations: the lifetime moved into
the `getExpiryDays()` hook, `ReviewerAccessInvite` got its own override,
and the registration invitation's read of `validation_timeout` was
dropped without one.

The configuration file still documents the key. Its comment was
rewritten after the redesign, in
[a8ea47d93d](https://github.com/pkp/ojs/commit/a8ea47d93d804c7595d2b5f273f72b211ee41f5f)
(`pkp/ojs#4528`, `pkp/pkp-lib#8543`): "The number of days a user has to
validate their account before their access key expires."

Reach:

- The journal's Register page: checked on screen on OJS, OMP and OPS.
- The site-wide Register page: the same listener and invitation
  (`UserRegisteredSite`), checked in the code.
- Invitations sent from Users & Roles keep the invitations' lifetime,
  as they should: checked on screen.
- The reviewer's one-click access link keeps its own lifetime
  (`ReviewerAccessInvite::getExpiryDays()`, review weeks plus four
  weeks): checked in the code.
- The monthly removal of unvalidated accounts reads its own key
  (`[general] user_validation_period`, 28). `pkp/pkp-lib#10351` explains
  that default as twice the link's 14 days, so that a newcomer who
  missed the link can still ask the journal. With a 3-day link, that
  window is 25 days instead of 14.

## Proposed fix

Give `RegistrationAccessInvite` its own `getExpiryDays()` that reads
`[email] validation_timeout`, falling back to the invitations' lifetime
when the key is unset or 0. This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activation-link-expires-before-validation-timeout/fix.diff),
one file in pkp-lib that covers the three apps.

```diff
--- a/lib/pkp/classes/invitation/invitations/registrationAccess/RegistrationAccessInvite.php
+++ b/lib/pkp/classes/invitation/invitations/registrationAccess/RegistrationAccessInvite.php
 use Illuminate\Mail\Mailable;
+use PKP\config\Config;
 use PKP\core\Core;
@@
+    /**
+     * An activation link lives as long as `[email] validation_timeout` says, as the
+     * access key it replaced did; unset or 0 (a link dead on arrival) means the invitations' own lifetime.
+     */
+    protected function getExpiryDays(): int
+    {
+        $days = (int) Config::getVar('email', 'validation_timeout');
+        return $days > 0 ? $days : parent::getExpiryDays();
+    }
+
     public function updateMailableWithUrl(Mailable $mailable): void
```

The rule lives in the invitation type, the layer that owns each kind of
link's lifetime. This follows `ReviewerAccessInvite::getExpiryDays()`,
which the same redesign added for the reviewer's link. It keeps the
redesign's hook and restores what the key did in 3.4 and in
`pkp/pkp-lib#9200`'s version of the class. On 3.4 a `validation_timeout`
of 0 gave a link that had expired by the time anyone opened it. No one sets the
key to get that, so the fix reads 0 as unset. A search for other keys left
behind finds none: in 3.4 only the reviewer link and the activation
link used access keys, and the reviewer link already has its override.

Tried on `main`, OJS, OMP and OPS. The new invitation's expiry date is
14 days after registration, and step 2 opens "Confirm and activate your
account". "Activate Account" activates the account, and signing in at
step 3 works. As a neighbour check, a role invitation sent from Users &
Roles under the same configuration still opens "Invitation Unavailable",
with the fix in and out. The trial ran the earlier diff, whose code is
the same; only its comment was reworded since.

**Alternatives**

- Remove `validation_timeout` from the three apps' configuration
  templates and let activation links follow `expiration_days`: this
  needs no code, but a 3-day link is too short for an email that often
  lands in spam. It would also silently ignore the value existing
  installs have set.
- Raise `expiration_days` by default: that lengthens every invitation,
  including role invitations, which is not what the key is for.

**What goes with it**

- Stored data: activation invitations created before the fix keep their
  3-day expiry date. They need no repair, since they expire on their own
  and a manager can enable those accounts.
- Backport: the file is the same on `stable-3_5_0`, and the diff applies
  there as it stands. 3.4 and 3.3 need nothing.
- Guard: a unit test in pkp-lib that creates a `RegistrationAccessInvite`
  with `validation_timeout` set and checks its expiry date; and a
  Planned item in spec U02 (Rule 14) for these Steps.

Small: one method in one pkp-lib class, following the reviewer
invitation's existing override, tried on all three apps, with no data
repair.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activation-link-expires-before-validation-timeout/walk.js)
  (helper in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activation-link-expires-before-validation-timeout/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/activation-link-expires-before-validation-timeout/walk.js`.
  It serves the install from a copy of its configuration file with
  `require_validation = On` and `expiration_days = 0` on a port of its
  own (the helper `validationServer()` of
  [register-no-support-contact-empty-page/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/register-no-support-contact-empty-page/lib.js)).
  It reads the email's link from the mailbox and records each page and
  the invitation's row (`invitations.expiry_date`). With `neighbour` as
  its argument it runs the neighbour check alone: `rvaca` invites
  `fpaglieri` (OJS, OPS) or `lelder` (OMP) to a role, and the emailed
  accept link is opened signed out.
- The `expiration_days = 0` precondition stands in for waiting four
  days. It is a value an administrator can set, not a written database
  row. Waiting four days on the shipped values was not driven.
- Where the walk differs from the Steps: on `main`, step 5 first
  looked for the row on the users list without searching and did not
  find it there. It was taken again with the search, on the state the
  walk had left.
- No request in the walks answered an error and no page script failed.
  Two PHP warnings in the server logs are not part of this finding: on
  `stable-3_5_0`, `Undefined array key "redirectContextId"` in
  `SiteDAO.php` line 130; on `main`, during the neighbour check's role
  invitation (with the fix in and out), `Undefined array key
  "invitation_id"` in `InvitationModel.php` line 146.
- The fix, tried 2026-10-04 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/activation-link-expires-before-validation-timeout/fix.diff ojs omp ops`,
  then walk.js and walk.js `neighbour`, then `revert` and walk.js
  `neighbour` again.
- Walked 2026-10-04 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d) (2026-10-03):
  - main: OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
    64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
    lib/ui-library 280f98c5). `RegistrationAccessInvite.php` is the
    same in both pkp-lib commits.
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    and OPS 38b61882d3 (lib/pkp cf3f984335). Steps 1 to 4 behaved as on
    `main` on all three apps. `RegistrationAccessInvite.php` is the same
    file as on `main`, and 011ebb8c2e is in the branch's history. In
    step 5 the account was enabled and the sign-in was recorded (the
    account's last-login date was set), but the page after signing in
    showed the Login form. The same happened when `rvaca` signed in,
    who then used the users list as a signed-in manager. This is not
    part of this finding; it was not looked into (unverified).
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib 767353f4fe. `ValidateRegisteredEmail` creates
  the link's access key with
  `Config::getVar('email', 'validation_timeout')` days, and
  `AccessKeyDAO` accepts a key only while `expiry_date > now`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib ac3fa73402. `RegistrationForm.inc.php` creates
  the key the same way, and `AccessKeyDAO.inc.php` checks the same.
- Introduced: `git log -S validation_timeout` on pkp-lib's `classes/`
  gives 011ebb8c2e as the last commit that touched a read of the key.
  The commit's author is Alec Smecher, co-authored by Dimitris
  Efstathiou (defstat); `commits/<sha>/pulls` names PR
  `pkp/pkp-lib#10013` for it and PR `pkp/pkp-lib#9200` for 596057ddfb.
- Upstream search 2026-10-04: pkp/pkp-lib by "validation_timeout",
  "validation timeout", "RegistrationAccessInvite", "activation link
  expired", "validate account link expires", "registration validation
  email expired invitation", "expiration_days" and "getExpiryDays";
  pkp/ojs, pkp/omp and pkp/ops by "validation_timeout"; pkp/ojs by
  "activation link expired"; pkp/ui-library by "activation invitation
  expired". `pkp/pkp-lib#10351` (closed as not planned, 2024-09) asked
  whether `validation_timeout` and `user_validation_period` conflict.
  `pkp/pkp-lib#8543` (closed) rewrote the key's comment. Neither changed
  the code.
