# Users & Roles: the reason typed when enabling a user is shown to them when disabled again

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [cca31520cc](https://github.com/pkp/pkp-lib/commit/cca31520cc641d5bae2195734da246c266ec7a1a) (2013-02-14, "port users grid from OMP")
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles, "Enable User" opens with the old disabling
reason in "Reason for enabling user", and whatever the box holds on
"OK" is stored as the account's reason. The next "Disable User" offers
that text, and if nobody clears it the Login page tells the user their
account was disabled "for the following reason:" followed by the reason
for enabling it.

The manager can clear or retype the box in either window, but neither
window says that the text will be shown to the user. So a note meant
for the journal's own record ("Appeal accepted") can reach the user as
the reason they were shut out.

It needs an account that is disabled, enabled and disabled again. The
older users grid (Administration › "Hosted Journals" › the journal's
arrow › "Settings wizard" › "Users") opens the same windows.

## Impact

- **Lost**: the reason the user is given. After the second disabling,
  the Login page and the password pages give the text typed when the
  account was enabled. When the manager left the enabling box as it
  opened, they give the first disabling reason again. No message tells
  the manager or the user that the text is not the new reason.
- **Who**: managers who disable an account a second time, and the
  account's owner.
- **Way round**: empty the box when enabling, or replace the text when
  disabling again.

Low: a wrong reason is shown, but only on a second disabling, and the
manager sees the text in the box before pressing "OK". It would rise if
the text reached the user without the manager seeing it first.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. The user is
  Carlo Corino (`ccorino`, password `ccorinoccorino`) [press: Arthur
  Clark, `aclark`, password `aclarkaclark`].

1. Sign in as `rvaca` (password `rvacarvaca`) and open Settings › Users
   & Roles (`/index.php/publicknowledge/en/management/settings/access`).
   In the search box type "Corino" [press: "Clark"] and press Enter.
2. Press the row's "…" button and choose "Disable User". Type "Spam" in
   "Reason for disabling user" and press "OK".
3. In a second browser, open the Login page
   (`/index.php/publicknowledge/en/login`) and sign in as `ccorino`
   [press: `aclark`]. The page reads "Your account has been disabled
   for the following reason: Spam".
4. As `rvaca`, press the row's "…" button and choose "Enable User".
   Read "Reason for enabling user".
5. Replace its text with "Appeal accepted" and press "OK". In the second
   browser, sign in as `ccorino` [press: `aclark`]: it succeeds. Sign
   out.
6. As `rvaca`, press the row's "…" button and choose "Disable User".
   Read "Reason for disabling user", then press "OK" without changing
   it.
7. In the second browser, sign in as `ccorino` [press: `aclark`].

**Expected:** in step 4 the window does not offer "Spam" as the reason
for enabling, and in step 6 "Reason for disabling user" is empty. In
step 7, with no reason typed, the Login page reads "Your account has
been disabled. Please contact the administrator for more information."

**Observed:** in step 4 the box holds "Spam". In step 6 it holds
"Appeal accepted". In step 7 the Login page reads:

```
Your account has been disabled for the following reason: Appeal accepted
```

## Cause

pkp-lib's `UserDisableForm` serves both windows (`UserGridHandler`
`editDisableUser()` and `disableUser()`, with `enable` set or not), and
both read and write one stored value, the user's `disabledReason`:

- `initData()` loads `$user->getDisabledReason()` into the box whichever
  window opens. "Enable User" opens on a disabled account, so the box
  holds the reason it was disabled for; "Disable User" opens on an
  enabled one, so the box holds whatever the last save left there.
- `execute()` stores the box as the reason in both directions:

  ```php
  $user->setDisabled($this->_enable ? false : true);
  $user->setDisabledReason($this->getData('disableReason'));
  ```

So the reason typed on enabling is kept on an enabled account, offered
at the next disabling, and quoted to the user by
`Validation::registerUserSession()` and `LoginHandler` once the account
is disabled again. The rule it breaks: a reason for disabling belongs to
a disabled account. The one other place that enables an account,
`RegistrationAccessInvite::setUserValid()` (run when an invited user
confirms their email address), clears the reason as it does so
(`setDisabled(false)`, `setDisabledReason('')`).

Nothing reads a reason for enabling. On `main` the audit log
([41df68c047](https://github.com/pkp/pkp-lib/commit/41df68c047e3a45b42da70f280d686e8ab0d0a5a),
`pkp/pkp-lib#12336`) records the reason on disabling only, and the
stable lines have no audit log.

Reach:

- Both entry points: the users list's "Disable User" / "Enable User"
  (on screen) and the older grid's "Disable User" / "Enable" (code).
- `LoginHandler` shows the stored reason of a disabled account on the
  Login page (`signIn()`), on the "Forgot your password?" page
  (`requestResetPassword()`) and on the page the emailed reset link
  opens (`resetPassword()`), and writes it into the
  `AUTH_LOGIN_DISABLED` audit entry of a refused sign-in (code).
- An account disabled by self-registration with email validation
  carries "user.login.accountNotValidated"'s text as its reason
  (`RegistrationForm`); a manager enabling it is offered that sentence
  as the reason for enabling (code).
- The REST API's full user record returns the stale `disabledReason` of
  an enabled account (code, `maps/Schema.php`); the users XML export
  writes it only for a disabled account.

## Proposed fix

Ask for no reason when enabling, clear the stored reason on enabling,
and open the disabling box empty
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/enabling-reason-kept-as-disabling-reason/fix.diff),
against the app root; inside pkp-lib apply it with `git apply -p3`):

```diff
     public function initData()
     {
-        if ($this->_userId) {
-            $user = Repo::user()->get($this->_userId, true);
-
-            if ($user) {
-                $this->_data = [
-                    'disableReason' => $user->getDisabledReason()
-                ];
-            }
-        }
+        // A stored reason belongs to an earlier disabling and is not offered again.
+        $this->_data = [
+            'disableReason' => '',
+        ];
     }
…
             $user->setDisabled($this->_enable ? false : true);
-            $user->setDisabledReason($this->getData('disableReason'));
+            $user->setDisabledReason($this->_enable ? '' : $this->getData('disableReason'));
```

```diff
 	{if $enable}
-		{fbvFormSection title="grid.user.enableReason" for="disableReason"}
-			<p class="mb-4">{translate key ="grid.user.enableReasonDescription"}</p>
-			{fbvElement type="textarea" id="disableReason" value=$disableReason size=$fbvStyles.size.LARGE}
-		{/fbvFormSection}
+		<p class="mb-4">{translate key ="grid.user.enableReasonDescription"}</p>
 	{else}
```

The "Enable" window keeps its note ("Once the user is enabled, they
will regain access to the site, …") and "OK". The box goes because no
version has a place for its text: no screen shows it, the audit log is
off by default on `main`, and 3.5, 3.4 and 3.3 have no audit log.
Clearing on enabling does what `setUserValid()` does. `initData()`
stops loading the stored reason as well, because accounts enabled
before the fix still hold an old one, which the disabling window would
otherwise keep offering. Every disabling writes a new reason, so those
old values never reach the sign-in pages again.

Tried on OJS, OMP and OPS `main`. With the fix, in the Steps the
"Enable Carlo Corino" window had no reason box and the user signed in
after "OK". The second "Disable User" opened with an empty box, and the
Login page then read "Your account has been disabled. Please contact
the administrator for more information." Second check, with the fix and
without: a reason typed when disabling ("Spam", then "Second reason")
reached the Login page as typed.

**Alternatives**

- Keep the box and send its text to the `USER_ENABLED` audit entry: the
  text is kept only where `log_audit` is on, and is dropped without a
  word on a default `main` install and on every stable line.
- Keep the box and show the reasons on screen (the account's history in
  the users list): a new feature, and a product decision.
- Keep the box and change its description to say the text is not kept:
  it would ask for something it then throws away.

**What goes with it**

- The `grid.user.enableReason` key ("Reason for enabling user") is no
  longer used and can be dropped from the locale files.
- The API's `disabledReason` of an account enabled before the fix stays
  stale until it is disabled again; emptying `disabled_reason` where
  `disabled = 0` is an optional cleanup.
- Backport: the same changes apply to `stable-3_5_0`, `stable-3_4_0`
  and (in `UserDisableForm.inc.php`) `stable-3_3_0`.
- Guard: an e2e check that disables, enables and disables an account
  again and reads the Login page.

Small: two lines in one form and one template branch, no data change
required.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/enabling-reason-kept-as-disabling-reason/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/disable-window-lists-ended-roles/lib.js))
  takes the Steps on each app, and with the argument `neighbour` the
  second check named under the fix. On an install freshly loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/enabling-reason-kept-as-disabling-reason/walk.js [neighbour]`.
- Driven on screen on OJS, OMP and OPS `main` and `stable-3_5_0`, on
  PostgreSQL; the fault does not depend on the database. Dataset:
  pkp/datasets c657990 (2026-10-01).
- Branch heads: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP
  3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6), `UserDisableForm.php`
  the same at both lib/pkp commits; `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0`
  pkp-lib 32b0f4b4af; `stable-3_3_0` pkp-lib f6ab331645.
- Code reads beyond those the Cause names: `stable-3_5_0`, the same
  form without the audit-log calls. `stable-3_4_0` (`UserDisableForm.php`)
  and `stable-3_3_0` (`UserDisableForm.inc.php`): the same `initData()`
  and `execute()` lines, and `LoginHandler` quoting the stored reason;
  their users lists are the older grid, whose "Enable" window has the
  same "Reason for enabling user" box.
- The trace: blame on the `setDisabledReason()` and `initData()` lines
  ends at e3f570bc37 (2021, reformatting) and 0976d10eba (2021); the
  same lines are in cca31520cc, the users grid's port from OMP, and
  `git log -S setDisabledReason` finds no earlier pkp-lib change.
- Not driven: the older grid's windows, the password pages, the audit
  entry and the REST API (code only); 3.4 and 3.3 (code only, as the
  team asked).
