# Latent today: a user signed back in by "Keep me logged in" looks signed out on the public site, and "Login As" gives a blank page

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS latent (the "Keep me logged in" cookie signs no one back in)
  - 3.5: OJS, OMP, OPS latent (the same)
  - 3.4: none (code; there "Keep me logged in" only lengthens the session)
  - 3.3: none (code; the same)
- **Introduced** `pkp/pkp-lib#9596` for `pkp/pkp-lib#9566` · [5b34729cfd](https://github.com/pkp/pkp-lib/commit/5b34729cfd6d19c78f6d6dd834c152a3a77d6110) · 2024-04-17 · Touhidur Rahman (touhidurabir); within reach only between two changes for the issue `pkp/pkp-lib#12780`: its pull request `pkp/pkp-lib#12790` ([a6d68f9547](https://github.com/pkp/pkp-lib/commit/a6d68f9547bb329f180f8340e309414ea17b0529), 2026-07-21) and the later commit [3407fc5bc0](https://github.com/pkp/pkp-lib/commit/3407fc5bc088cc6a29f2d27d1cf54a6b86d54b37) (2026-10-06)
- **Upstream** none found: no pkp issue reports this fault (2026-10-07). `pkp/pkp-lib#12780` (open: closed 2026-07-28, reopened 2026-10-07) is about "Login As" on a disabled account, and the comment that reopened it reports that "Keep me logged in" no longer keeps users signed in; the change that answers that comment is the one this report's fix goes into
- **Tracked in** spec U01 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a8)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-07: `pkp/pkp-lib`
[3407fc5bc0](https://github.com/pkp/pkp-lib/commit/3407fc5bc088cc6a29f2d27d1cf54a6b86d54b37)
(2026-10-06; on `stable-3_5_0` as
[edc3d36c74](https://github.com/pkp/pkp-lib/commit/edc3d36c745e2d478d174de1371eeb491c5a50ac))
stopped signing users back in from the "Keep me logged in" cookie, so
this fault no longer shows: the Steps, walked again on the three apps
on `main` and 3.5, end at the Login page. The report now describes a
latent fault (the title, severity medium → low, no Crash bullet) whose
fix waits for the change that makes the cookie work again (effort small
→ medium).

Update 2026-10-13: the fix now proposed for the "Keep me logged in"
regression
([docs/reports/2026-10-07-pkp-lib-12780.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/reports/2026-10-07-pkp-lib-12780.md),
its [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/sync/pkp-lib-12780/fix.diff))
asks Laravel's guard for the user as the session starts, so its cookie
restore runs before the session is saved, and carries this report's
override of `userFromRecaller()` (plus the removal of a cookie that
signs no one in, and no restore on API requests). It is the early call
this section says the override needs. With it applied, this report's walk on the three apps on `main`
ends as Expected: step 3 opens Users & Roles signed in, step 4 opens the
dashboard as `dbuskins`, the public header shows the user, and the
Login page goes on to the dashboard. The neighbour check gives the same
three results as listed below.

## Summary

Nothing to schedule now: no user meets this today. The fix travels with
the change that makes "Keep me logged in" sign users back in again (the
comment that reopened `pkp/pkp-lib#12780` reports that it no longer
does), and it must not be merged alone. Alone, it makes a return after
the idle limit worse: the first page shows the user signed in, the page's own requests
are refused (status 401) behind two alerts, and the next page is signed
out.

Today a user who signed in with the box ticked and comes back after the
idle limit (seven days without a visit, by default) is signed out on
every page, and signs in again. From 21 July to 6 October 2026 the
cookie signed that user back in, but only in part. The dashboard and
the other editorial pages opened signed in, while the journal's public
pages offered "Register" and "Login" and the Login page showed its
form. For a manager "Login As" on a user failed on the server, and the
browser showed a blank page. That half-signed-in state is the fault,
and it returns when the cookie signs users back in the same way.

"Keep me logged in" is ticked when the Login page opens, so every user
who signs in the default way and stays away a week would meet it. No
release has shown it.

## Impact

- **Lost**: nothing; no data is stored wrong.
- **Who**: no one today. Returned, it shows the public pages as signed
  out to every user back after the idle limit, and takes "Login As"
  from journal managers and the Site Administrator with a server error
  and no message.
- **Way round**: sign in again.

Low: a latent defect that no screen reaches today. Returned without the
fix it is medium, since both effects end at the next sign-in.

## Steps to reproduce

No screen reaches the fault today: the steps stop at step 3, signed
out. To see the fault itself, apply
[trial-cookie-read.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-as-after-idle-limit-server-error/trial-cookie-read.diff)
first; Evidence says what it holds.

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`.

Login As:

1. Signed out, open the Login page. Sign in as `rvaca` (password
   `rvacarvaca`) with "Keep me logged in" ticked, as the page shows it.
2. Leave the browser unused for longer than the idle limit,
   `[general] session_lifetime` in `config.inc.php` (seven days by
   default). Do not sign out. To skip the wait, delete the session
   cookie in the browser's developer tools (Application › Cookies;
   `OJSSID` by default, `session_cookie_name` in `config.inc.php`) and
   keep `remember_web_…`: the session cookie expires with the session,
   so that is what the wait leaves in the browser.
3. Open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`).
4. On the row "David Buskins", open the row's menu, choose "Login As",
   and press "OK" on "Log in as this user? All actions you perform will
   be attributed to this user."

The public pages, in the same browser:

5. Open the journal's home page.
6. Open the Login page.

**Expected**: at step 3 the list opens and the top bar reads "rvaca".
At step 4 the dashboard opens as David Buskins, the user menu reading
"rvaca" and "dbuskins", as after a fresh sign-in. At step 5 the header
shows the signed-in user's name, and at step 6 the Login page goes on
to the dashboard.

**Observed today** (`main` and 3.5 as they are): step 3 opens the Login
page, at
`/index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Fmanagement%2Fsettings%2Faccess`,
so step 4 cannot be taken. At step 5 the header ends "Search Register
Login" and at step 6 the Login page shows its form, as they do for any
signed-out visitor. No request fails and the server log stays empty.
After step 3 the browser no longer holds the `remember_web_…` cookie.

**Observed with the diff applied** (`main`): at step 3 the list opens
and the top bar reads "rvaca". Step 4 answers status 500 at
`/index.php/publicknowledge/en/login/signInAsUser/4`. With
`display_errors` off, as in the dataset's configuration, the page is
blank (an empty body); with it on, the page shows the error. The server
log has:

```
PHP Fatal error:  Uncaught TypeError: PKP\security\Validation::getAdministrationLevel(): Argument #2 ($administratorUserId) must be of type int, null given, called in …/lib/pkp/pages/login/LoginHandler.php on line 510
```

At step 5 the header ends "Search Register Login", and at step 6 the
Login page shows the "Username or Email" and "Password" form.

Control: after signing out and in again, step 4 opens the dashboard as
`dbuskins`, on today's code and with the diff.

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
`signOutAs()` call it; the cookie path never does. So a session restored
from the cookie has a user for Laravel's guard but no `userId`:
[`PKPSessionGuard::getUserId()`](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/classes/core/PKPSessionGuard.php#L103-L106)
returns null. This missing `userId` is the whole fault. The rule the
code breaks: every way into a signed-in session writes the same session
data.

The fault shows only while `PKPRequest::getUser()` asks Laravel's guard
for the user. `pkp/pkp-lib#9596` (5b34729cfd, for `pkp/pkp-lib#9566`,
"Convert session and cookie management to Laravel") moved sign-in to
the guard and its remember cookie, while `getUser()` and `getUserId()`
kept reading PKP's own `userId` key, so the cookie was set and signed
no one in. `pkp/pkp-lib#12790` (a6d68f9547, 2026-07-21) made
`getUser()` fall back on `Auth::user()`: the guard restored the user
from the cookie, `getUser()` returned it, and `getUserId()` stayed
null. That is the state this report describes.

Today no screen shows it. 3407fc5bc0 returned `getUser()` to
`if (Validation::isLoggedIn())` and the session's `userId`. `getUser()`,
`isLoggedIn()` and the session middleware's `$request->user()`, which
`Dispatcher::setUserResolver()` points at `getUser()`, now agree that a
lapsed session has no user.

The guard still restores the user on that request, too late for the
session to keep it (read in the code; the walks agree):

- `Dispatcher::initSession()` runs `PKPEncryptCookies`, `StartSession`
  and `PKPAuthenticateSession` to the end before the router, and
  `StartSession` ends by saving the session. Nothing has asked the
  guard by then, so the first call to it comes inside that save.
- `Store::save()` serialises the session and calls
  `DatabaseSessionHandler::write()`. To fill the row's `user_id`,
  `write()` goes through `userId()` → `Guard::id()` →
  `SessionGuard::user()` → `userFromRecaller()` →
  `PKPSessionGuard::updateSession()`.
- `migrate(true)` there deletes the row and gives the session a new id,
  while `write()` still holds the old id and the payload serialised
  before the restore. The row goes in under the old id, with the
  `user_id` and without the sign-in.
- `updateSession()` also sends the browser the new id and clears the
  remember cookie (`updateSessionCookieToResponse()`).
- The session is saved once more, by the shutdown function
  `PKPSessionServiceProvider::boot()` registers. That save is an
  update of the new id, which has no row, so nothing is stored.

So the first page after the lapse opens the Login page, the next
request starts an empty session, and the cookie is used up (walked).
Before 3407fc5bc0 the restore came earlier: `PKPAuthenticateSession`
calls `$request->user()` inside that middleware run, `getUser()` went to
`Auth::user()`, and the user was restored before the first save, so the
session was kept, without `userId`.

In that state, "Login As" is where the missing `userId` crashes. The
page's policy admits the manager, since it reads the user's roles
through `getUser()`. Then
[`LoginHandler::signInAsUser()`](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/pages/login/LoginHandler.php#L510)
passes `getUserId()`, null, to `Validation::getAdministrationLevel()`,
whose second parameter is `int`, and PHP throws.

The missing `userId` then also reaches:

- `Validation::isLoggedIn()`, which reads `getUserId()`: the public
  navigation menus offer "Register" and "Login" (`PKPNavigationMenuService`),
  and the Login page (`LoginHandler::index()`) shows its form instead of
  sending the user home (both walked with the diff applied). The
  same read in `RestrictedSiteAccessPolicy`, `PKPUserHandler`,
  `RegistrationHandler`, the template's `isUserLoggedIn`, and OJS's
  `PaymentHandler`, `ArticleHandler` and `IssueHandler` access checks
  (code). Each of these treats the user as signed out.
- `PKPSessionGuard::signInAs()` would store a null `signedInAs`, but
  `signInAsUser()` throws before it gets there (code).
- `ReviewerAccessInvite`, whose check for "logged in as a different
  user" reads `getUserId()`: a reviewer's one-click link opened in that
  browser signs the reviewer in in place of the restored user, instead
  of asking them to sign out first (code).

## Proposed fix

When the guard signs a user back in from the cookie, write the same
session data a password sign-in writes: give `PKPSessionGuard` an
override of Laravel's `userFromRecaller()` that calls
`setUserDataToSession()` on the user it returns
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

The override has one condition: the restore must have run before the
session is first saved. Reading the cookie in `getUser()` gives that,
since `PKPAuthenticateSession` calls `$request->user()` before
`StartSession` saves. So the override belongs in the change that makes
`getUser()` read the cookie through the guard again, the repair of the
regression that the comment reopening `pkp/pkp-lib#12780` reports. With
both, the
restored session is whole; with that change alone, this fault comes
back.

Do not apply the override on its own. On today's code the restore
fires inside the first save (Cause), so the override puts `userId` into
the session in memory, for that one request, and it is never stored.
Tried alone, on the three apps: step 3 opens "Users & Roles" with
"rvaca" in the top bar, the page's own requests are refused (status 401
at `/api/v1/users`, `/api/v1/invitations/userRoleAssignment` and
`/api/v1/_submissions/viewsCount`), the browser raises the alerts "The
current role does not have access to this operation." and "undefined",
the list of users never appears, and the next page is signed out.
Without the override that return is a clean sign-out.

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

Tried on the three apps on `main` at today's tips, over a stand-in for
the change that reads the cookie
([trial-cookie-read-fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-as-after-idle-limit-server-error/trial-cookie-read-fix.diff):
the diff the Steps name, plus the override). Step 4 then opens the
dashboard as `dbuskins`, the public header shows the user instead of
"Register" and "Login", and the Login page goes on to the dashboard.
The neighbour check passed with the override in:

- the "Login As" address (`/login/signInAsUser/4`) typed while signed
  out still leads to the Login page;
- the same restored session, typing the "Login As" address of the Site
  Administrator, gets "Sorry, you do not have administrative rights over
  this user." (without the override: the blank page);
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

- No data repair. A session restored without the fix stays incomplete
  until the user signs in again or the session lapses once more.
- For the change that reads the cookie again to decide: being signed
  back in removes the `remember_web_*` cookie from the browser.
  `updateSession()` calls `updateSessionCookieToResponse()`, which
  clears the cookie and sets one again only when a sign-in queued it.
  So the cookie carries a user over one lapsed session, not over every
  lapse in its 30 days (walked: gone from the browser after step 3,
  with and without the fix). The diff leaves that alone.
- The diff applies to `stable-3_5_0` with an offset of six lines;
  `setUserDataToSession()`, `getUserId()` and `signInAsUser()` are the
  same there.
- A test: a pkp-lib unit test that resolves `user()` from a remember
  cookie with an empty session and checks `getUserId()`, or the e2e
  scenario in U01 (a **Planned** item), which can only pass once the
  cookie is read again.

Medium: the override is one method and a unit test, small by itself,
but this finding cannot be closed by itself. The label counts landing
the override inside the change that restores the user before the first
save (`getUser()`, `PKPAuthManager` and `PKPUserProvider`, in the
authentication path) and testing the two together.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-as-after-idle-limit-server-error/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-as-after-idle-limit-server-error/lib.js),
  on a PKP default dataset install (pkp/datasets a130b9a, 2026-10-07,
  PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/login-as-after-idle-limit-server-error/walk.js steps gone`
  for the steps (`nb gone` for the neighbour check), with
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- How the walk takes step 2. It ages every row of `sessions` by eight
  days (`last_activity`), and with `gone` it also removes the session
  cookie from the browser, keeping `remember_web_…`. That second state
  is what a real wait leaves: the session cookie expires
  `session_lifetime` after the last response
  (`PKPSessionGuard::getCookieExpirationDate()`, Laravel's
  `StartSession::addCookieToResponse()`), the moment the row lapses, so
  the browser comes back with the remember cookie alone. The steps on
  the code as it is and the three trial stages were each taken both
  ways, the cookie kept (rows aged only) and the cookie removed, with
  the same result each time; the neighbour check on unpatched `main`
  was taken with the cookie kept only (both ways on 3.5). No walk
  waited in real time or shortened `session_lifetime`.
- The stand-in the Steps name, trial-cookie-read.diff, is
  `git show -R 3407fc5bc0` for `PKPAuthManager.php`, `PKPRequest.php`
  and `PKPUserProvider.php`. It is not a proposed repair of "Keep me
  logged in": it brings back what 3407fc5bc0 fixed for disabled
  accounts. It is only the read the fault needs.
- Walked 2026-10-07 on the code as it is, the three apps on `main` and
  3.5: the steps as under "Observed today", and the neighbour check
  (every address in it opens the Login page).
- The trial, 2026-10-07, `main`, three apps:
  `TRIAL_FEATURE=<feature> TRIAL_DATASET=<n> TRIAL_AGENT=<id> [TRIAL_SESSION_COOKIE=gone] bash shared/playwright/checks/issues/login-as-after-idle-limit-server-error/trial.sh`
  ([trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-as-after-idle-limit-server-error/trial.sh)).
  Three stages, each applied with `bin/try-fix.js` and reverted:
  fix.diff alone with the steps; trial-cookie-read.diff with the steps
  and the neighbour check; trial-cookie-read-fix.diff with both again.
  Not tried on 3.5, where both diffs apply.
- Both trial diffs change user resolution and were read for the call
  cycle this code can form (`getUser()` through `Auth::user()` while
  `retrieveById()` calls `getUser()`): the stand-in reverts both sides
  of it together, and trial.sh checks that after each apply.
- With the stand-in alone, the neighbour check's address for the Site
  Administrator answers 500 with the log line under Steps. With
  fix.diff alone, no request answers a server error and the server log
  stays empty; the three refused requests and the two alerts are the
  same on the three apps.
- The same fault was walked on 2026-10-04 on the code as it then was,
  before 3407fc5bc0 and edc3d36c74 (the session cookie kept): `main`
  OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and OPS
  c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335),
  where the log line names `LoginHandler.php` line 431.
- Tips walked 2026-10-07: OJS 3265fdc673, OMP 0c6a3ebed1, OPS 8ae6c68e04
  (lib/pkp f8285b0b8f in all three); 3.5 OJS 6d2a42555d, OMP 5861ebee10,
  OPS 6a8f83586c (lib/pkp 6910ca6d8e in all three).
- Code read on `main` for the path under Cause (lib/pkp f8285b0b8f,
  Laravel in `lib/vendor`): `Dispatcher::dispatch()`,
  `setUserResolver()` and `initSession()`;
  `StartSession::handleStatefulRequest()`;
  `AuthenticateSession::handle()` and `PKPAuthenticateSession::handle()`;
  `Store::save()`, `migrate()` and `regenerate()`;
  `DatabaseSessionHandler::write()`, `getDefaultPayload()`, `userId()`
  and `performUpdate()`; `SessionGuard::id()`, `user()`,
  `userFromRecaller()` and `queueRecallerCookie()` (called from
  `login()` alone on this path); `PKPSessionGuard::updateSession()` and
  `updateSessionCookieToResponse()`;
  `PKPSessionServiceProvider::boot()`. The path was read, not traced in
  a running request. What the walks add: a session row written on the
  first request after the lapse carries the user's id in `user_id` and
  no sign-in key in its payload, and the override applied alone
  changes what that request renders.
- Code read for what hides the fault, `main` and `stable-3_5_0`:
  `PKPRequest::getUser()`, `Validation::isLoggedIn()`,
  `PKPAuthManager::__construct()`, `PKPUserProvider::retrieveById()`
  and `retrieveByToken()`; `git show` of 3407fc5bc0, a6d68f9547 and
  5b34729cfd for `getUser()` (`git log -L` on the method names only
  these three since 2022). `PKPSessionGuard.php` and `LoginHandler.php`
  are unchanged between 987776cd04 and f8285b0b8f. No release:
  `getUser()` has no `Auth::user()` at `3_5_0rc2` and `3_5_0-0` to
  `3_5_0-5` (pkp's tag list ends there), and no tag holds 6d0d04f41a,
  the 3.5 twin of a6d68f9547.
- Read beside the steps on the code as it is (the script's `cookie` and
  `dash` modes, the three apps on `main` and 3.5, the session cookie
  kept): the first page opened after the lapse, Users & Roles, opens
  the Login page, and the `remember_web_…` cookie is gone from the
  browser afterwards. The bare Dashboard address opened first instead
  redirects to `/dashboard/editorial`, which opens the Login page, and
  the cookie is gone too: by the code, the guard already holds the user
  restored in the first save when `PKPPageRouter::getHomeUrl()` calls
  `Auth::user()`. Opened once the cookie is gone, the same address
  answers the server error of spec U01 A7.
- 3.4 and 3.3 (code): app `upstream/stable-3_4_0` OJS d68934d0d1, OMP
  0aec65441f, OPS acd8ae704b, lib/pkp `origin/stable-3_4_0` 767353f4fe;
  `upstream/stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc8836, OPS
  c5532e2161, lib/pkp ac3fa73402: `PKPRequest::getUser()`,
  `Validation::isLoggedIn()`, `signInAsUser()` and
  `SessionManager::refresh()`.
- Code read on `main` for the reach list: `Validation.php` line 378,
  `PKPNavigationMenuService::getDisplayStatus()`,
  `LoginHandler::index()`, `ReviewerAccessInvite.php` line 133,
  `PKPUserProvider::retrieveByToken()`.
- Not driven: `RestrictedSiteAccessPolicy`, the OJS subscription
  checks, `ReviewerAccessInvite`. MySQL not checked; nothing here
  depends on the database.
- Unverified: whether, once `getUser()` reads the cookie again, any
  request reaches the first save without `getUser()` having asked the
  guard. `getUser()` returns early for an API token and for a user
  already in the Registry; such a request would lose the restored
  session the way today's code does (code, not driven).
- Spec U01's A7 (the bare dashboard address, signed out) has another
  cause, `PKPPageRouter::getHomeUrl()` with no signed-out guard, and
  its own report. So does U09's A7 (a typed preview address).
- Related: [pkp-e2e#820](https://github.com/jardakotesovec/pkp-e2e/issues/820),
  "Keep me logged in" ticked every time the Login page shows, which
  makes the remember cookie the default.
- Upstream search (2026-10-07): pkp/pkp-lib, then the pkp
  organisation's other repositories, for "keep me logged in",
  "remember me", "login as" with blank page or session, remember cookie
  session, `signInAsUser`, `getAdministrationLevel`,
  `setUserDataToSession`, `userFromRecaller` and `remember_me_lifetime`.
  `pkp/pkp-lib#12780` was read through GitHub's API that day: titled
  for "Login As" on a user with a disabled account; `pkp/pkp-lib#12790`
  is its merged pull request; closed 2026-07-28, reopened 2026-10-07 by
  the comment of that day, which asks for the regression in "Keep me
  logged in" to be reviewed; no pull request for it is open. Not the
  same fault either: `pkp/pkp-lib#12547` and `pkp/pkp-lib#12586`
  (cookie lifetime settings) and `pkp/pkp-lib#9859` (stale session
  ids), read on 2026-10-04.
