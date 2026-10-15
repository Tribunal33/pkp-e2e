# After a password change, the other browser's Profile page stops answering instead of going to the Login page

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the tab press there raises an alert reading "##user.authorization.userRequired##" and the tab stays empty, with no script failure)
  - 3.3: none (code; a password change leaves the other browsers signed in)
- **Introduced** `pkp/pkp-lib#9596` for `pkp/pkp-lib#9566` · [5b34729cfd](https://github.com/pkp/pkp-lib/commit/5b34729cfd6d19c78f6d6dd834c152a3a77d6110) · 2024-04-17 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-15)
- **Tracked in** U03 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a25)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A password change signs the account out of its other browsers. In such a
browser, still on the Profile page, the first press on a tab throws a
JavaScript error: the tab is marked as open, its area stays empty, and
nothing says that the session has ended. The next press raises a browser
alert reading "##user.authorization.userRequired##". A "Save" pressed
there instead keeps its spinner turning, and what was typed is not
stored. A reload shows the Login page.

By the code, every back-office page that loads tabs, lists, side windows
or forms in the older style does the same with the first such request
after the change: a tab throws the error, a list or a save does
nothing.

The other ways an account's password changes behave the same: changing
one's own password under Users & Roles, "Reset Password" from the email,
and the change asked for at sign-in. Signing out in another browser, a
session that expires, and an administrator setting the user's password
do not: the page's next request arrives signed out and gets the alert
above (code).

## Impact

- **Lost**: values typed on the other browser's page: its "Save" stores
  nothing and says nothing. Nothing saved earlier is lost.
- **Who**: users signed in on two browsers or devices who change their
  own password on one while a back-office page is open on the other.
  The first request that open page makes after the change is answered
  with the Login page, which the page cannot read.
- **Way round**: reloading the page shows the Login page; after signing
  in with the new password the user types the values again.

Medium: a save is dropped without a word, but only in a state users
meet rarely, and a reload gets them to the Login page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). The walk
  changes `dbarnes`'s password, so a second run (with a fix in, say)
  needs a freshly loaded dataset.
- Two browsers that do not share cookies (or a normal and a private
  window), called A and B below.

Steps:

1. In B, sign in as `dbarnes` (password `dbarnesdbarnes`) and choose
   "Edit Profile" in the user menu
   (`/index.php/publicknowledge/en/user/profile`). "Identity" shows.
2. In B, press the "Contact" tab, then the "Identity" tab again. Leave B
   on this page.
3. In A, sign in as `dbarnes`, choose "Edit Profile" and press the
   "Password" tab.
4. In A, type `dbarnesdbarnes` in "Current password" and `h15eNewPass1`
   in "New password" and "Repeat new password", then press "Save". "Your
   changes have been saved." shows.
5. In B, without reloading, press the "Roles" tab.
6. In B, press the "Contact" tab.
7. In B, reload the page.

**Expected**: step 5 takes B to the Login page, as the reload in step 7
does, since the password change ended B's session.

**Observed**: at step 5 "Roles" is marked as the open tab and its area
stays empty; nothing else changes and no message shows. The browser logs
an uncaught error, and the page's script stays busy from then on:

```
Uncaught SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

The tab's request was answered with a redirect to the Login page, whose
HTML the tab's script tried to read as JSON:

```
GET /index.php/publicknowledge/$$$call$$$/tab/user/profile-tab/roles?_=…
  302  Location: /index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2F%24%24%24call%24%24%24%2Ftab%2Fuser%2Fprofile-tab%2Froles%3F_%3D…
GET /index.php/publicknowledge/en/login?source=…
  200  text/html (the Login page)
```

At step 6 a browser alert reads "##user.authorization.userRequired##";
after "OK", "Contact" is the open tab and still shows the Contact form
loaded in step 2. Step 7 shows the Login page. Control: in A, the browser
that changed the password, "Contact" and "Roles" open as usual.

Saving instead (walked on OJS): after step 2, in B press "Contact" again
and type `555 0115` in "Phone"; do steps 3 and 4 in A; then in B press
"Save". The save's `POST …/profile-tab/save-contact` is answered `302` to
the Login page, "Save" stays greyed with its spinner turning, and no
message shows. After signing in again "Phone" is empty.

## Cause

A password change ends the account's other sessions through the password
hash each session keeps. `ChangePasswordForm::execute()` calls
`Auth::logoutOtherDevices()`, which saves the new hash on the user and
copies it into the current session
(`PKPSessionGuard::rehashUserPasswordForDeviceLogout()`); the other
sessions keep the old one.

`Dispatcher::initSession()` runs the session middleware
`PKPAuthenticateSession` on every request, whatever router serves it:
page, legacy component (`$$$call$$$`) or REST API. Its parent, Laravel's
`AuthenticateSession::handle()`, finds that the session's hash no longer
matches and calls `logout()`. `PKPAuthenticateSession::logout()` signs
the session out and ends with `redirectTo()`
(`lib/pkp/classes/middleware/PKPAuthenticateSession.php`, added by
5b34729cfd):

```php
protected function redirectTo(Request $request)
{
    Validation::redirectLogin();
}
```

`Validation::redirectLogin()` answers `302` to the Login page, with the
requested address as `source`, and exits, whatever the request. That is
right for a browser navigation: a page, and also the component addresses
a browser opens directly (a submission file's link,
`$$$call$$$/api/file/file-api/download-file`). It is wrong for a request a
page's script sends and reads as JSON: the Profile page's
`TabHandler.dataFilter()` passes the answer to `$.parseJSON()`, which
throws on the Login page's HTML, and the grids' and forms' `$.get()` and
`$.post()` with `'json'` drop it without calling back. Those requests say
what they read: the tab asks for `Accept: application/json` and jQuery
sends `X-Requested-With: XMLHttpRequest`. When such a request is to go
elsewhere, components answer in JSON (`PKPRequest::redirectUrlJson()`,
the `redirectRequested` event that `SiteHandler` turns into a page load).

The first request ends the session, so the next one arrives signed out.
`ProfileTabHandler`'s `UserRequiredPolicy` refuses it with a JSON message
whose key, `user.authorization.userRequired`, exists in no locale file:
the alert of step 6, a fault of its own.

Reach of the same `redirectTo()`:

- Every legacy tab, grid, side window and form of a back-office page open
  in the other browser: the first request after the change gets the same
  `302` (code; walked on the Profile tabs and the Contact tab's "Save").
- The REST API calls of the editorial pages: the first one after the
  change gets the same `302` to the Login page's HTML. Walked on the
  dashboard: a search sends `api/v1/_submissions` and
  `api/v1/_submissions/viewsCount`; whichever left first got the `302`
  (on OMP and OPS the list, which then read "Search Results (0)"), and
  the other, signed out by then, got `401` and the "Error" window "You
  are not authorized to access the requested resource.".
- Every other way a session's hash goes stale: "Reset Password"
  (`ResetPasswordForm`), the change asked for at sign-in
  (`LoginChangePasswordForm`) and one's own password set under Users &
  Roles (`UserDetailsForm`) call `Auth::logoutOtherDevices()`; a "Keep me
  logged in" cookie holding an old hash, and an address change under
  `[security] session_check_ip = On`, call the same `logout()` (code).
- Not this fault: a new email address saved on Contact, and an
  administrator setting another user's password, delete the other
  sessions (`invalidateOtherSessions()`); an expired session is gone; so
  the next request arrives signed out and gets the alert of step 6.
  "Logout" in another browser ends only that browser's session (code).

## Proposed fix

In `PKPAuthenticateSession::redirectTo()`, answer a request that expects
JSON in JSON, and leave browser navigations with the redirect they get
today. `redirectTo()` already receives the Illuminate request, whose
`expectsJson()` reads the `Accept` and `X-Requested-With` headers. A
legacy component request gets the JSON redirect components already use,
so the page itself goes to the Login page; a REST API request gets the
`401` the API gives any request without a signed-in user (`HasUser`)
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stale-session-tab-press-script-error/fix.diff),
applied at the app root, with its `use` lines):

```php
protected function redirectTo(Request $request)
{
    if ($request->expectsJson()) {
        $pkpRequest = Application::get()->getRequest();
        $pkpRequest->getSessionGuard()->sendCookies();

        if ($pkpRequest->getRouter() instanceof APIRouter) {
            response()->json([
                'error' => __('api.403.unauthorized'),
            ], Response::HTTP_UNAUTHORIZED)->send();
            exit;
        }

        header('Content-Type: application/json');
        echo $pkpRequest->redirectUrlJson(
            $pkpRequest->getDispatcher()->url($pkpRequest, PKPApplication::ROUTE_PAGE, null, 'login')
        )->getString();
        exit;
    }

    Validation::redirectLogin();
}
```

The middleware that ends the session is the one place every request and
every reason passes through. Branching on what the request expects,
rather than on the router, keeps the navigations served by components
(file links, the profile image's "Delete", a form posted as a page load
that `ProfileTabHandler::deleteProfileImage()` answers with a redirect)
and by the API (the user report export opens `api/v1/users/report` in the
browser) on the Login page.

Tried on OJS, OMP and OPS `main`: with the fix, step 5 lands on the Login
page with no script error, and the save variant (OJS) lands on the Login
page too. Unchanged with the fix in and out: a submission file's link
pressed in B after the change opens the Login page with the file's
address as `source` (OJS and OMP); a full page load in B reaches the
Login page, and signing in there returns to the Profile page; A's tabs
keep opening. The dashboard's API calls are unchanged as well: they send
no JSON `Accept` header, so they still get the `302`.

**Alternatives**:

- Branch on the router: a component's file link or an API export opened
  in the browser would then show JSON text instead of the Login page.
- Teach the legacy scripts to treat an HTML answer as an ended session
  (`TabHandler.dataFilter()`, `AjaxFormHandler`, `GridHandler`): one change
  per handler, and the server keeps answering JSON readers with HTML.
- End the other sessions by deleting them, as the email change does: the
  tab press would get the alert instead of the Login page, and the stale
  "Keep me logged in" cookie and IP-change cases stay as they are.

**What goes with it**:

- The dashboard's API calls: `useFetch()` in ui-library sending
  `Accept: application/json` would bring them under the fix's `401`. That
  is a second repository and a rebuild; left out here, since the next
  call's `401` already shows the "Error" window.
- The Login page reached from a tab has no `source`, so after signing in
  the user lands on their default page rather than the Profile. The
  server knows only the tab's address; passing the `Referer`'s path as
  `source` would bring them back, which is the team's call.
- 3.5 has the same `redirectTo()`; its file lacks `main`'s audit-log
  imports, so a backport adapts the `use` lines.
- The fix proposed for `pkp/pkp-lib#12780` changes `logout()` in the same
  class; the two touch different methods.

Small: one method in one file, tried on the three apps; the test that
would have caught it is an e2e walk of two browsers, a password change
in one and a tab press in the other.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stale-session-tab-press-script-error/walk.js)
  (helpers in `lib.js` beside it), on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js <app|all>
  shared/playwright/checks/issues/stale-session-tab-press-script-error/walk.js`.
  `H15E_MODE=save` runs the save variant, `H15E_MODE=nb` the neighbour
  check (dashboard search, B's page load and sign-in, A's tabs),
  `H15E_MODE=nbdl` the file-link neighbour (submission 7's review file);
  `H15E_REACH=1` adds the dashboard tab to the Steps' walk;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix trial:
  `node bin/try-fix.js apply|revert
  shared/playwright/checks/issues/stale-session-tab-press-script-error/fix.diff
  ojs omp ops`, then the walk, `nb`, `nbdl` and (OJS) `save`, then `nbdl`
  again after the revert.
- Walked 2026-10-15 on PostgreSQL, pkp/datasets 7912e09 (2026-10-14):
  `main` OJS 378eced941, OMP f4836d4fb, OPS 2ece50497f, lib/pkp
  b17fadae59 (all three); `stable-3_5_0` OJS ca763c91cd, OMP a70bbb9c4,
  OPS 44aec6e131, lib/pkp 4045d9241e. The Steps reproduced on all six.
  The `main` walks and the first 3.5 walks also kept the dashboard open
  in a second tab of browser B (`H15E_REACH=1`). On OPS 3.5 that tab sent
  its own `api/v1/_submissions/viewsCount` request right after the change
  and took the `302` first, so the Roles press got the alert of step 6;
  walked again without that tab, OPS 3.5 showed the Steps' Observed. The
  save was walked on OJS `main` only, with the fix in and out.
- The file-link neighbour ran on OJS and OMP; OPS's submission 7 has no
  review file, so OPS was not driven for it. An earlier version of the
  fix, branching on the router, was tried the same way and is replaced
  by this one: by the code it would answer such file links with JSON.
- Code reads: 3.5's `PKPAuthenticateSession::redirectTo()`,
  `ChangePasswordForm::execute()` (`Auth::logoutOtherDevices()`),
  `Dispatcher::initSession()` and `TabHandler.dataFilter()` match
  `main`'s; 5b34729cfd is on `stable-3_5_0`. 3.4 (lib/pkp
  `origin/stable-3_4_0` 55c8e406b3, OJS `upstream/stable-3_4_0`
  daf0ca971d): no `PKPAuthenticateSession` and no session middleware in
  `Dispatcher`; `ProfileTabHandler::savePassword()` deletes the other
  sessions (`SessionManager::invalidateSessions()`), so a tab press there
  arrives signed out and `UserRequiredPolicy` refuses it in JSON with the
  same missing key (not walked). 3.3 (lib/pkp `origin/stable-3_3_0`
  5e84acd11b, OJS `upstream/stable-3_3_0` d7d9dd14ec):
  `ProfileTabHandler::savePassword()` ends no other session.
- Upstream, read and not this fault: `pkp/pkp-lib#1576` (2016, a tab
  press after a session timeout showing "The current role does not have
  access to this operation."), `pkp/pkp-lib#11933` (signing in on one
  browser signing out the other), `pkp/pkp-lib#12606` (cross-tab CSRF),
  `pkp/pkp-lib#7877` (a closed PR for `pkp/pkp-lib#6983`, the 3.4 work
  that deletes the other sessions on a password change).
- Not verified: the other legacy pages (grids, side windows), the "Reset
  Password", sign-in password change, Users & Roles, "Keep me logged in"
  and `session_check_ip` paths, the expired session and the
  administrator's change, all read in the code only; an API call that
  asks for JSON (none was met) under the fix. MySQL not checked (the
  fault does not depend on the database).
