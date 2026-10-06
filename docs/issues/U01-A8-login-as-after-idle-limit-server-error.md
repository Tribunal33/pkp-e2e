# Kept logged in past the idle limit, users look signed out on the public site and "Login As" gives a blank page

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; there "Keep me logged in" only lengthens the session)
  - 3.3: none (code; the same)
- **Introduced** `pkp/pkp-lib#9596` for `pkp/pkp-lib#9566` · [5b34729cfd](https://github.com/pkp/pkp-lib/commit/5b34729cfd6d19c78f6d6dd834c152a3a77d6110) · 2024-04-17 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U01 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a8)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A user who signed in with "Keep me logged in" and comes back after the
idle limit (seven days without a visit, by default) is still signed
in to the dashboard and the other editorial pages. But the journal's
public pages offer "Register" and "Login" as if they were signed out,
and the Login page shows its form instead of taking them to the
dashboard. For a manager it goes further: "Login As" on a user fails on
the server, and the browser shows a blank page.

Signing in again, on that Login page or after signing out, clears both.
Until then nothing tells the user why the site treats them as signed
out, or why "Login As" shows nothing.

"Keep me logged in" is ticked when the Login page opens, so every user
who signs in the default way and is away a week meets this. The public
pages and "Login As" fail for one reason, so this report covers and
rates both, and its fix clears both.

## Impact

- **Lost**: nothing; no data is stored wrong.
- **Who**: every user signed in with "Keep me logged in" and back after
  the idle limit sees the public header offer "Register" and "Login".
  Managers, editors with the Manager role and the Site Administrator
  also lose "Login As" to a server error.
- **Way round**: sign in again.

Medium: the severity rests on "Login As" failing with a server error
and no message for managers, and on the public pages telling every
remembered user they are signed out, both in the state the default
sign-in reaches after a week away. Each is undone by signing in again.
No other task was found to fail in this state (the readers checked are
listed under Cause); one with no way round would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`.

Login As:

1. Signed out, open the Login page. Sign in as `rvaca` (password
   `rvacarvaca`) with "Keep me logged in" ticked, as the page shows it.
2. Leave the browser unused for longer than the idle limit,
   `[general] session_lifetime` in `config.inc.php` (seven days by
   default). Do not sign out.
3. Open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`). The
   list opens and the top bar reads "rvaca".
4. On the row "David Buskins", open the row's menu, choose "Login As",
   and press "OK" on "Log in as this user? All actions you perform will
   be attributed to this user."

**Expected**: the dashboard as David Buskins, the user menu reading
"rvaca" and "dbuskins", as after a fresh sign-in.

**Observed**: status 500 at
`/index.php/publicknowledge/en/login/signInAsUser/4`. With
`display_errors` off, as in the dataset's configuration, the page is
blank (an empty body); with it on, the page shows the error. The server
log has:

```
PHP Fatal error:  Uncaught TypeError: PKP\security\Validation::getAdministrationLevel(): Argument #2 ($administratorUserId) must be of type int, null given, called in …/lib/pkp/pages/login/LoginHandler.php on line 510
```

The public pages, in the same browser after step 4:

5. Open the journal's home page.
6. Open the Login page.

**Expected**: the header shows the signed-in user's name; the Login
page goes on to the dashboard.

**Observed**: the header ends "Search Register Login", and the Login
page shows the "Username or Email" and "Password" form.

Control: after signing out and in again, step 4 opens the dashboard as
`dbuskins`.

## Cause

Since the move to Laravel's authentication, "Keep me logged in" sets a
`remember_web_*` cookie that outlives the session (30 days against 7 by
default). When the session has lapsed on the server, Laravel's
`SessionGuard::user()` signs the user back in from that cookie
(`userFromRecaller()`, then `updateSession()`, which PKP overrides).
That path writes only Laravel's own login key into the new session.

PKP keeps its own copy of the signed-in user in the session: `userId`,
`username` and `email`, written by
[`PKPSessionGuard::setUserDataToSession()`](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/classes/core/PKPSessionGuard.php#L148-L159).
`Validation::registerUserSession()` (a password sign-in and the
reviewer's one-click link), a profile save, and `signInAs()` /
`signOutAs()` call it; the cookie path never does. So the restored
session has a user, which `$request->getUser()` returns, but no `userId`:
[`PKPSessionGuard::getUserId()`](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/classes/core/PKPSessionGuard.php#L103-L106)
returns null. This missing `userId` is the whole fault. The rule the
code breaks: every way into a signed-in session writes the same session
data.

"Login As" is where the missing `userId` crashes. The page's policy
admits the manager, since it reads the user's roles through
`getUser()`. Then
[`LoginHandler::signInAsUser()`](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/pages/login/LoginHandler.php#L510)
passes `getUserId()`, null, to `Validation::getAdministrationLevel()`,
whose second parameter is `int`, and PHP throws.

Introduced by `pkp/pkp-lib#9596` (5b34729cfd, for `pkp/pkp-lib#9566`,
"Convert session and cookie management to Laravel"). It moved sign-in
to Laravel's guard and its remember cookie, while `getUserId()` kept
reading PKP's own `userId` session key. Before it, the remember flag
lived on the session row (`SessionManager` in 3.4 and 3.3), so a lapsed
session signed the user out entirely, and the user and the id could not
part.

The missing `userId` also reaches:

- `Validation::isLoggedIn()`, which reads `getUserId()`: the public
  navigation menus offer "Register" and "Login" (`PKPNavigationMenuService`),
  and the Login page (`LoginHandler::index()`) shows its form instead of
  sending the user home (both checked on screen). The same read in
  `RestrictedSiteAccessPolicy`, `PKPUserHandler`, `RegistrationHandler`,
  the template's `isUserLoggedIn`, and OJS's `PaymentHandler`,
  `ArticleHandler` and `IssueHandler` access checks (code). Each of these
  treats the user as signed out.
- `PKPSessionGuard::signInAs()` would store a null `signedInAs`, but
  `signInAsUser()` throws before it gets there (code).
- `ReviewerAccessInvite`, whose check for "logged in as a different
  user" reads `getUserId()`: a reviewer's one-click link opened in that
  browser signs the reviewer in in place of the restored user, instead
  of asking them to sign out first (code).

## Proposed fix

When the guard signs a user back in from the cookie, write the same
session data a password sign-in writes. `PKPSessionGuard` overrides
Laravel's `userFromRecaller()` and calls `setUserDataToSession()` on
the user it returns. Laravel's `user()` then calls
`PKPSessionGuard::updateSession()`, PKP's override, whose
`migrate(true)` gives the session a new id and keeps its data, so the
values survive into the new session (the fix relies on that override)
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-as-after-idle-limit-server-error/fix.diff)):

```diff
+    protected function userFromRecaller($recaller)
+    {
+        $user = parent::userFromRecaller($recaller);
+
+        if ($user) {
+            $this->setUserDataToSession($user);
+        }
+
+        return $user;
+    }
```

The fix sits where the rule lives, so every reader of `getUserId()`
listed under Cause is covered at once. It follows what
`Validation::registerUserSession()`, `BaseProfileForm` and `signInAs()`
already do when they put a user into the session. A disabled account is
not restored: `PKPUserProvider::retrieveByToken()` loads the user with
`Repo::user()->get($userId)`, whose `$allowDisabled` defaults to
`false`, so it matches the disabled check `registerUserSession()` makes.

`registerUserSession()` also sets the account's `date_last_login`,
which the cookie restore does not. Whether a restore should count as a
sign-in there is the team's call: `Validation::generatePasswordResetHash()`
reads the date, so setting it would void an outstanding password-reset
link, as a password sign-in does (spec U01 Rule 8). The diff leaves the
date alone.

Tried on the three apps on `main`. The steps now open the dashboard as
`dbuskins`, and the public header shows the user instead of "Register"
and "Login". The neighbour check passed with the fix in:

- the "Login As" address (`/login/signInAsUser/4`) typed while signed
  out still leads to the Login page;
- the same restored session, typing the "Login As" address of the Site
  Administrator, gets "Sorry, you do not have administrative rights over
  this user." (without the fix: the blank page);
- a sign-in with the box unticked still ends at the idle limit.

**Alternatives**:

- Make `getUserId()` return Laravel's own `id()` and drop PKP's
  `userId` session key, which copies Laravel's login key. It is
  wider: `isLoggedIn()` runs on every request (the page cache check),
  so it would load the user on anonymous pages too. It also leaves
  `username` and `email` unset.
- Guard `signInAsUser()` against a null id. That is a workaround: the
  header and the Login page stay wrong, and the guard would send a
  manager who is signed in to the Login page.
- A listener on Laravel's `Login` event with `remember = true`. It has
  the same effect, but further from the guard that owns the data.

**What goes with it**:

- No data repair. Sessions restored before the fix stay incomplete
  until the user signs in again or the session lapses once more.
- The diff applies as it stands to `stable-3_5_0`, whose
  `PKPSessionGuard` and `signInAsUser()` are the same.
- A test: a pkp-lib unit test that resolves `user()` from a remember
  cookie with an empty session and checks `getUserId()`, or the e2e
  scenario in U01 (a **Planned** item).

Small: one method in one class, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-as-after-idle-limit-server-error/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-as-after-idle-limit-server-error/lib.js),
  on a PKP default dataset install (pkp/datasets 566bb1f, 2026-10-03,
  PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/login-as-after-idle-limit-server-error/walk.js`
  for the steps (add `nb` for the neighbour check), with
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Where the walk differs from the Steps: step 2's wait was stood in for
  by moving every row's `sessions.last_activity` back eight days, which
  is what seven idle days leave in the table. Laravel's
  `DatabaseSessionHandler::read()` then treats the session as expired.
  The browser kept its session cookie (its lifetime is the same seven
  days, refreshed on each request), as it does after a week away.
  A shortened `session_lifetime` was not walked: it also ends the
  session cookie itself, a different path, so the Steps do not offer
  it.
- The fix was applied with `node bin/try-fix.js apply …/fix.diff ojs omp ops`
  and the steps and the neighbour check walked on `main`. The neighbour
  check was walked again after the revert (the admin's address then
  answered 500 too).
- Tips walked: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335).
  On 3.5 the server log line names `LoginHandler.php` line 431.
- 3.4 and 3.3 (code): app `upstream/stable-3_4_0` OJS d68934d0d1, OMP
  0aec65441f, OPS acd8ae704b, lib/pkp `origin/stable-3_4_0` 767353f4fe;
  `upstream/stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc8836, OPS
  c5532e2161, lib/pkp ac3fa73402: `PKPRequest::getUser()`,
  `Validation::isLoggedIn()`, `signInAsUser()` and
  `SessionManager::refresh()`.
- Code read on `main` for the reach list: `Validation.php` line 378,
  `PKPNavigationMenuService::getDisplayStatus()`,
  `LoginHandler::index()`, `ReviewerAccessInvite.php` line 133,
  `PKPUserProvider::retrieveByToken()`. Laravel `SessionGuard::user()`
  and `userFromRecaller()` were read in the checkout's `lib/vendor`.
- Not driven: `RestrictedSiteAccessPolicy`, the OJS subscription
  checks, `ReviewerAccessInvite`. MySQL not checked; nothing here
  depends on the database.
- Spec U01's A7 (the bare dashboard address, signed out) has another
  cause, `PKPPageRouter::getHomeUrl()` with no signed-out guard, and
  its own report. So does U09's A7 (a typed preview address). The
  register's first lead for A8, a browser session that outlived a
  test-database reset, gave the same error line; that it was the same
  state stays unverified.
- Related: [pkp-e2e#820](https://github.com/jardakotesovec/pkp-e2e/issues/820),
  "Keep me logged in" ticked every time the Login page shows, which
  makes the remember cookie the default.
- Upstream search (2026-10-04): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, for "login as", "sign in as", "keep me logged
  in", "remember me", `signInAsUser`, `getAdministrationLevel`,
  `getUserId`, `userFromRecaller` and `administratorUserId`. Read and
  not the same fault: `pkp/pkp-lib#12780` (Login As a disabled user),
  `pkp/pkp-lib#12547` and `pkp/pkp-lib#12586` (cookie lifetime
  settings), `pkp/pkp-lib#9859` (stale session ids).
