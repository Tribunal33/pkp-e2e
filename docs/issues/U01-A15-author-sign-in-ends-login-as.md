# "Login As" ends and a save made as the user is silently lost when that user first signs in after an upgrade

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; a session is not tied to the password)
  - 3.3: none (code; a session is not tied to the password)
- **Introduced** `pkp/pkp-lib#10211` for `pkp/pkp-lib#9892` · [cbf8b01c12](https://github.com/pkp/pkp-lib/commit/cbf8b01c120d1b379f66603b15917b9f6a8eb2db) · 2024-08-13 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U01 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a15)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Journal Manager has used "Login As" on an Author. The Author then
signs in, in another browser, for the first time since the install was
upgraded from 3.4 or earlier. From then on, the manager's next request
signs them out of both accounts. A save they make as the Author is
dropped without a word: the form stays on screen with the typed values,
and nothing is stored. Their next page is the Login page.

The manager has to sign in again, use "Login As" again and redo the
change; the second impersonation holds. It can happen only at the
Author's first sign-in after the upgrade, because that sign-in stores
the Author's password again with today's hashing settings, and the app
treats the changed stored value as a password change.

## Impact

- **Lost.** The manager's change as the Author (walked with a phone
  number on the Author's profile), silently; then the manager's session
  and the impersonation.
- **Who.** Site Administrators, Journal Managers, Editors and
  Production editors who use "Login As" (Press and Preprint Server
  equivalents), on an install upgraded from 3.4 or earlier, while the
  user they impersonate signs in elsewhere for the first time since the
  upgrade.
- **Way round.** Sign in again, use "Login As" again and redo the
  change, once the manager notices the change is missing.

Medium: a change made for the user is lost without any message, but
only in a narrow window: during an impersonation, at that user's first
sign-in after the upgrade.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `stable-3_4_0` (OJS, OMP or OPS),
  upgraded to `main` with `php tools/upgrade.php upgrade`. Nothing
  added. Its accounts keep the password hashes 3.4 stored (bcrypt, cost
  10) until their first sign-in on `main`, as on any install upgraded
  from 3.4.
- Shortcut on the install you already have: PKP's default test dataset
  for `main`, with the Author's stored password replaced by a cost-10
  hash of the same password. This stands in for an account last saved
  by 3.4:

  ```sql
  -- the hash from: php -r "echo password_hash('ccorinoccorino', PASSWORD_BCRYPT, ['cost' => 10]);"
  UPDATE users SET password = '<that hash>' WHERE username = 'ccorino';
  ```
- `rvaca` is the Journal manager (OMP: Press manager; OPS: Preprint
  Server manager). The Author: OJS and OPS `ccorino` ("Carlo Corino"),
  OMP `afinkel` ("Alvin Finkel").
- Two browsers (or a normal and a private window): A and B.

Steps (OJS; OMP and OPS the same, with the Author named above):

1. Browser A: sign in as `rvaca`.
2. Settings › Users & Roles. On "Carlo Corino"'s row, open the row
   menu, choose "Login As", then "OK". The user menu now reads "You are
   currently logged in as ccorino" and offers "Logout as ccorino".
3. Browser A: open the user menu's "Edit Profile", then the "Contact"
   tab, and type a number in "Phone". Do not save yet.
4. Browser B: sign in as `ccorino`.
5. Browser A: press "Save".
6. Browser A: reload the page.

**Expected**: step 5 saves the phone number ("Your changes have been
saved."). After step 6, browser A still acts as `ccorino`, and "Logout
as ccorino" brings `rvaca` back to his own account.

**Observed**: at step 5 nothing appears: no notice and no error. The
tab stays as it was, with the typed number, and the number is not
stored. The save request is redirected to the Login page:

```
POST /index.php/publicknowledge/$$$call$$$/tab/user/profile-tab/save-contact  → 302
GET  /index.php/publicknowledge/en/login?source=…save-contact                 → 200
```

At step 6 browser A lands on "Login | Journal of Public Knowledge", with
no message, and the header offers "Register" and "Login". Both
`ccorino`'s session and `rvaca`'s own are gone.

A control: on PKP's default dataset for `main` without the shortcut,
where the Author's password is already stored at cost 12, the
impersonation survives step 4, and "Logout as ccorino" brings `rvaca`
back to his dashboard.

## Cause

At sign-in, `PKPUserProvider::rehashPasswordIfRequired()`
(`lib/pkp/classes/core/PKPUserProvider.php`) stores a fresh hash of the
password whenever the stored one `needsRehash()`. Laravel's
`SessionGuard::attempt()` calls it. Any bcrypt hash whose cost is not 12
needs a rehash. 3.4 stored PHP's default cost, which is 10 below PHP
8.4. So every account of an install upgraded from 3.4 or earlier gets
its hash replaced at its first sign-in, although its password did not
change. The same holds for accounts whose password was last saved by
3.5.0-0 or 3.5.0-1 on PHP 8.2 or 8.3: `pkp/pkp-lib#11933` pinned cost
12 from 3.5.0-2 on.

The stored hash decides whether a session may go on.
`PKPAuthenticateSession` extends Laravel's `AuthenticateSession`. The
parent keeps the account's password hash in the session
(`password_hash_web`) and compares it with the stored one on every
request. On a mismatch it calls `logout()`. PKP overrides that method:
it ends the session and redirects to the Login page
(`Validation::redirectLogin()`). That is how a real password change ends
the account's other sessions (`Auth::logoutOtherDevices()` in the
password forms). The rehash at sign-in trips the same check.

An impersonation session is tied to the impersonated account:
`PKPSessionGuard::signInAs()` stores the Author's hash under
`password_hash_web` (added with `pkp/pkp-lib#9596`). When the Author's
sign-in replaces that hash, the manager's next request fails the check.
The session holds both identities, so both are signed out. A legacy
form's save request is answered with that redirect. The form's script
gets the Login page back and shows nothing.

The rehash at sign-in came with the upgrade to Laravel 11
(`pkp/pkp-lib#10211`), which added `rehashPasswordIfRequired()` to the
user provider. Until `pkp/pkp-lib#11933` (2025-10-19) the app hashed
passwords at PHP's default cost while the check asked for 12, so every
sign-in rehashed.

Reach:

- The Author's own other sessions, checked in the code. An upgrade from
  3.4 or earlier drops every session (`I9566_SessionUpgrade`), and each
  later session starts with a sign-in that has already rehashed, so
  these are not ended. A session or "Keep me logged in" cookie from
  3.5.0-0 or 3.5.0-1 does survive an upgrade. It ends at the account's
  first sign-in elsewhere afterwards, because the cookie carries the
  hash too.
- Accounts created by a users import from a file holding a cost-10
  hash, which the import keeps on PHP older than 8.4
  (`UserXmlPKPUserFilter::importUserPasswordValidation()`). Checked in
  the code.
- `Validation::checkCredentials()` (Change Password, Confirm Access and
  the forced change at sign-in, `LoginChangePasswordForm`) rehashes only
  md5 and sha1 hashes from very old versions. The dataset holds none.
- On `main` only, `PKPAuthenticateSession::logout()` also records the
  audit event `AUTH_LOGOUT_IP_CHANGE` for this logout, although no
  address changed. 3.5's `logout()` records no audit event. That is a
  separate fault.

## Proposed fix

When a sign-in rehashes the password, keep a short-lived record of
which hash the new one replaced. Let the session check accept that old
hash while the stored hash is still the one the rehash wrote. The
account's other sessions then carry on, and the check stores the new
hash in each of them on their next request. A later real change writes
yet another hash, so it still ends every other session. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-sign-in-ends-login-as/fix.diff):

```php
// PKPUserProvider::rehashPasswordIfRequired()
$previous = $user->getAuthPassword();
$rehash = Validation::encryptCredentials($user->getUsername(), $credentials['password']);
$user->setPassword($rehash);
Repo::user()->edit($user);

$guard = Auth::guard();
Cache::put(
    static::rehashedPasswordCacheKey($user->getId()),
    ['from' => $guard->hashPasswordForCookie($previous), 'to' => $guard->hashPasswordForCookie($rehash)],
    now()->addMinutes(max(config('session.lifetime'), config('auth.guards.web.remember')))
);

// PKPAuthenticateSession
protected function validatePasswordHash($passwordHash, $storedValue)
{
    if (parent::validatePasswordHash($passwordHash, $storedValue)) {
        return true;
    }
    $user = $this->auth->user();
    $rehash = $user ? Cache::get(PKPUserProvider::rehashedPasswordCacheKey($user->getId())) : null;
    if (!is_array($rehash) || !hash_equals($rehash['to'], $this->guard()->hashPasswordForCookie($passwordHash))) {
        return false;
    }
    // the session holds the old hash as that digest, or raw (as signInAs() stores it)
    return hash_equals($rehash['from'], $storedValue)
        || hash_equals($rehash['from'], $this->guard()->hashPasswordForCookie($storedValue));
}
```

The record keeps both hashes only as the digest the session check
already uses (`hashPasswordForCookie()`), never in clear. A password
hash therefore never sits in the file cache, even though the record
must live as long as a session or a "Keep me logged in" cookie can come
back (up to `remember_me_lifetime`, 30 days by default). A shorter
lifetime would not work the same: a session that returns after the
record expires would be signed out as today.

The fix sits where the false change is made and where it is read, so
it covers every kind of session: an impersonation, the account's own
other sessions and the remember-me cookie. It follows two patterns the
code already has. `PKPSessionGuard::rehashUserPasswordForDeviceLogout()`
writes the new hash into the current session so that session survives
a change. Laravel's own `validatePasswordHash()` already accepts two
forms of the same hash. The cache is how pkp-lib keeps short-lived
records (`Cache::remember()` in `Core`, `userGroup\Repository`). The
rehash at sign-in stays, so old hashes still move up to cost 12, which
is what `pkp/pkp-lib#11933` relies on. `Validation::checkCredentials()`
and its callers are not touched.

The fix was tried on `main` in all three apps. With it, the Steps show
the Expected: browser A still acts as the Author after the Author's
sign-in, and "Logout as" brings `rvaca` back. Two checks that the fix
must not change gave the same result with and without it. An Author's
first sign-in still stores the password at cost 12. After the Author
changes the password on Edit Profile › "Password", the manager's
impersonation still ends on the Login page.

**Alternatives**

- Turn off the rehash at sign-in. Old hashes would then stay at cost 10
  for good, which undoes what `pkp/pkp-lib#11933` was for.
- Tie an impersonation session to the manager's password instead of
  the Author's (`signInAs()`). That fixes the impersonation only, leaves
  the Author's own sessions to be logged out, and changes what a real
  password change by the Author does to an impersonation. That is a
  product decision.
- Skip the rehash while the account has other rows in `sessions`. Rows
  outlive a closed browser for `session_lifetime` days, so active
  accounts would wait days for the upgrade, and a remember-me cookie
  with no row is still logged out.

**What goes with it**

- No stored data to repair. If the cache is cleared before a session
  comes back, that session ends as it does today.
- 3.5 has the same two classes, with different imports in
  `PKPAuthenticateSession`, so the diff's context needs adjusting there.
- A unit test of `PKPAuthenticateSession::validatePasswordHash()`: the
  old hash accepted after a rehash, refused after a later change.
- Apart from this fix: a legacy form whose save is answered by the
  Login page could say so instead of staying silent.

Medium: two classes in pkp-lib and a cache record, plus a unit test.
The change is in the check that decides when a session ends, which a
reviewer will want to weigh carefully.

## Evidence

- Kept script:
  `shared/playwright/checks/issues/author-sign-in-ends-login-as/walk.js`
  (helpers in `lib.js`). Its modes:
  - `walk`: steps 1, 2, 4, 6 and "Logout as";
  - `save`: steps 1 to 6;
  - `nb`: the two checks the fix must leave unchanged;
  - `SHORTCUT=1`: the SQL precondition on the `main` dataset.

  The script opens Edit Profile by its address rather than through the
  user menu.

  It reads the Author's stored hash prefix, phone and session rows
  (`users`, `sessions`) beside the screens. Run with
  `node bin/probe.js all …/walk.js [walk|save|nb]` on an install loaded
  from the dataset named in the Preconditions.
- Walked:
  - `walk` on `main` and `stable-3_5_0`, OJS, OMP, OPS, on the upgraded
    `stable-3_4_0` dataset;
  - `save` and the SQL shortcut on OJS `main`;
  - the control on `main`, all three apps.

  The Author's hash went from `$2y$10$` to `$2y$12$` at the Author's
  sign-in each time. The manager's impersonation session row carries
  the Author's `user_id`. The `stable-3_4_0` dumps (pkp/datasets
  eaf024c5) hold every account at cost 10, the `main` and
  `stable-3_5_0` ones at cost 12. No response of 500 or more and no
  script error in any walk.
- Introduced: `git blame` on `rehashPasswordIfRequired()` gives
  cbf8b01c12 (the Laravel 11 upgrade, `pkp/pkp-lib#10211`, which added
  the method). `signInAs()` storing the target's hash is 5b34729cfd
  (`pkp/pkp-lib#9596`). The cost-12 pin is 8d8a37010b
  (`pkp/pkp-lib#11933`, first in 3.5.0-2).
- Tips: OJS `main` 6b4323ced7, OMP 5777025be, OPS f048e747b4, pkp-lib
  042726ebf6 (2026-10-16). `stable-3_5_0`: OJS 007c2cd0d6, OMP
  2d575f250, OPS e737a9e465, pkp-lib 092ec34b0f. `stable-3_4_0` (code):
  OJS 0012bd1022, OMP e30fa7e38, OPS 0f1e21a117, pkp-lib a71d6bd2ca.
  `stable-3_3_0` (code): OJS d7d9dd14ec, OMP 8e72fc883, OPS c5532e2161,
  pkp-lib 5e84acd11b.
- 3.4 and 3.3, code: `Validation::login()` → `verifyPassword()`
  rehashes only md5 and sha1 hashes, and `classes/session` compares no
  password. The impersonation (`LoginHandler::signInAsUser()`) keeps
  `signedInAs` and the user id only, so the Author's sign-in cannot end
  it.
- Not walked:
  - the save on OMP and OPS, and on 3.5 (the same session check ends
    every request after the Author's sign-in);
  - a Vue form's save;
  - the Author's own sessions from 3.5.0-0 or 3.5.0-1 (code only);
  - PHP 8.4.

  Database: PostgreSQL. The fault does not depend on the database.
