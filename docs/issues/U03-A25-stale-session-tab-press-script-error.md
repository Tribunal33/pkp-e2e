# After a password change, a page left open in another browser drops its next save or tab press instead of going to the Login page

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the tab press there raises the alert reading "##user.authorization.userRequired##" instead, with no script failure)
  - 3.3: none (code; a password change leaves the other browsers signed in)
- **Introduced** `pkp/pkp-lib#9596` for `pkp/pkp-lib#9566` · [5b34729cfd](https://github.com/pkp/pkp-lib/commit/5b34729cfd6d19c78f6d6dd834c152a3a77d6110) · 2024-04-17 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-15)
- **Tracked in** U03 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a25)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-15: a settings form's "Save" sent as the first request
after the change shows "Saved" while nothing is stored, and a list's
"Search" does nothing; both were walked and the fix tried on them. The
alerts of the later presses are now reports of their own (U03 A26, U01
A16).

## Summary

A password change signs the account out of its other browsers. In such a
browser, a back-office page left open fails on the first thing it loads
or saves without a reload, and nothing says that the session has ended:

- "Save" on a settings form, such as Settings › Journal › "Masthead",
  shows "Saved", but nothing is stored.
- On the Profile page, a tab press throws a JavaScript error: the tab is
  marked open and its area keeps what it last showed there (empty for a
  tab not opened there before). A "Save" there keeps its spinner turning
  and stores nothing.
- A list's "Search", such as on Settings › Website › Plugins, keeps its
  spinner turning and the list does not change.

What was typed in that first save is not stored; a reload shows the
Login page. Later presses get alerts that do not say the session has
ended either ([U03 A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a26),
[U01 A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a16)).

By the code, the longer forms do the same: the submission wizard's
first autosave and a decision's "Record Decision" are taken as done, and
a reviewer's review form saves nothing. Every way an account's own
password changes does this: on the Profile page, under Users & Roles,
through "Reset Password" from the email, and at sign-in when asked to.

## Impact

- **Lost**: what was typed in the first save after the change. A
  settings form reports "Saved" and stores nothing; a Profile "Save"
  stores nothing and says nothing. Nothing saved earlier is lost.
- **Who**: any user whose own password changes (on the Profile page,
  under Users & Roles, through "Reset Password" or at sign-in) while a
  back-office page is open in another browser or device. An
  administrator setting a user's password deletes that user's sessions
  instead (code), so the user's open page gets the alerts of later
  presses, not this fault.
- **Way round**: none until the user notices; then reloading shows the
  Login page, and after signing in with the new password the user types
  the values again.

Medium: one save can be reported as done and dropped, which is worse
than an error, but only for the first request after a password change
made elsewhere, a state users meet rarely; the next press shows an alert
and a reload leads to the Login page. A walk showing the decision page
reporting an unrecorded decision as recorded (read in the code only)
would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Each group of
  steps below changes `dbarnes`'s password, so each starts from a
  freshly loaded dataset.
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

A first press on a tab opened there before ("Contact" at step 5 instead
of "Roles") fails the same way, but marks "Contact" open with the form
loaded in step 2 still showing.

At step 6 a browser alert reads "##user.authorization.userRequired##"
(U03 A26); after "OK", "Contact" is the open tab and
still shows the Contact form loaded in step 2. Step 7 shows the Login
page. Control: in A, the browser that changed the password, "Contact"
and "Roles" open as usual.

Saving a Profile tab (walked on OJS): after step 2, in B press
"Contact" again and type `555 0115` in "Phone"; do steps 3 and 4 in A; then in B press
"Save". The save's `POST …/profile-tab/save-contact` is answered `302` to
the Login page, "Save" stays greyed with its spinner turning, and no
message shows. After signing in again "Phone" is empty.

Searching a list:

1. From a freshly loaded dataset, in B sign in as `dbarnes` and open
   "Settings" › "Website", tab "Plugins". The "Installed Plugins" list
   shows.
2. Do steps 3 and 4 above in A.
3. In B, without reloading, press "Search" in the list's header, type
   `hkk7` in the box and press the "Search" button under it.
4. In B, press the "Search" button again.

**Expected**: step 3 takes B to the Login page.

**Observed**: at step 3 the search box stays open with `hkk7` in it, a
spinner turns beside "Search", the list is unchanged, and no message
shows; no script error is logged. The search was answered with the
Login page:

```
POST /index.php/publicknowledge/$$$call$$$/grid/settings/plugins/settings-plugin-grid/fetch-grid
  302  Location: /index.php/publicknowledge/en/login?source=…fetch-grid
GET /index.php/publicknowledge/en/login?source=…
  200  text/html (the Login page)
```

At step 4 a browser alert reads "The current role does not have access
to this operation." (U01 A16); the list stays unchanged. A reload shows
the Login page.

Saving a settings form (walked on OJS and OMP):

1. From a freshly loaded dataset, in B sign in as `dbarnes` and open
   "Settings" › "Journal" (OMP: "Press"); the "Masthead" tab shows.
   Replace "Journal initials" (OMP: "Press initials") with `hkk7`.
2. Do steps 3 and 4 of the first group in A.
3. In B, press "Save" under the form.
4. In B, reload, sign in with `h15eNewPass1` and open "Settings" ›
   "Journal" again.

**Expected**: step 3 takes B to the Login page, or at least says the
save failed.

**Observed**: at step 3 "Saving" and then "Saved" show beside "Save",
`hkk7` stays in the box, and no message shows. The save was answered
with the Login page:

```
POST /index.php/publicknowledge/api/v1/contexts/1
  302  Location: /index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2Fapi%2Fv1%2Fcontexts%2F1
GET /index.php/publicknowledge/en/login?source=…
  200  text/html (the Login page)
```

At step 4 the initials read as before the change (OJS `JPKJPK`, OMP
`JPK`): nothing was stored.

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

The newer forms save through the REST API, and there the HTML is taken
as success. `Form.vue`'s `submit()` posts with `$.ajax()` and no
`dataType`, so jQuery follows the `302`, receives the Login page with a
`200` and calls `success()`, which shows "Saved". The submission
wizard's autosave (the `autosave` mixin's `_sendAutosave()`, which has
already taken the payload out of local storage) and the decision page's
post to `…/decisions` (`DecisionPage.vue`, whose `success()` opens the
dialog saying the decision was recorded) are written the same way
(code).

The first request ends the session, so the next one arrives signed out
and is refused in JSON, which the page shows as an alert:
`UserRequiredPolicy`'s key `user.authorization.userRequired`, defined in
no locale file, on the Profile page (U03 A26), and
`RoleBasedHandlerOperationPolicy`'s "The current role does not have
access to this operation." on the Plugins list (U01 A16). Those alerts
are reported on their own; this report covers the first request only.

Reach of the same `redirectTo()`:

- Every legacy tab, grid, side window and form of a back-office page open
  in the other browser: the first request after the change gets the same
  `302` (code; walked on the Profile tabs, the Contact tab's "Save" and
  the Plugins list's "Search"). A reviewer's review form
  (`ReviewerReviewStep3FormHandler`, an `AjaxFormHandler`) is one of them
  (code).
- The REST API calls of the newer pages: the first one after the change
  gets the same `302` to the Login page's HTML. Walked on a settings
  form's "Save" (above) and on the dashboard: a search sends `api/v1/_submissions` and
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
  sessions (`invalidateOtherSessions()`); an expired session is gone, and
  so is every session after "Expire User Sessions" under Administration
  (`AdminHandler::expireSessions()`, `removeAllSession()`); so the next
  request arrives signed out and gets the refusals above. Signing out in
  another browser ends only that browser's session, so this page keeps
  working.

## Proposed fix

In `PKPAuthenticateSession::redirectTo()`, answer a request that expects
JSON in JSON, and leave browser navigations with the redirect they get
today. `redirectTo()` already receives the Illuminate request, whose
`expectsJson()` reads the `Accept` and `X-Requested-With` headers. A
legacy component request gets the JSON redirect components already use,
so the page itself goes to the Login page. A REST API request gets the
`401` the API gives any request without a signed-in user (`HasUser`);
the API has no way to send the page elsewhere, so a newer form shows an
error instead of "Saved", keeps the typed values, and the reload it asks
for reaches the Login page
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
page with no script error, the save variant (OJS) lands on the Login
page too, and so does the list's first "Search" (step 3 of "Searching a
list"), with no alert and no script error. The settings form's "Save"
(OJS and OMP) gets the `401` and shows "An unexpected error has
occurred. Please reload the page and try again." with `hkk7` still in
the box, and the reload reaches the Login page. Unchanged with the fix
in and out: a submission file's link pressed in B after the change opens
the Login page with the file's address as `source` (OJS and OMP); a full
page load in B reaches the Login page, and signing in there returns to
the Profile page; A's tabs keep opening. The dashboard's list requests
are unchanged as well: `useFetch()` sends `Accept: application/json`
only with a JSON body, so these GETs still get the `302`.

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

- Taking the newer pages to the Login page on that `401` is the client's
  part: `Form.vue`'s `error()`, the `ajaxError` mixin and `useFetch()`
  treating a `401` as an ended session, and `useFetch()` asking for JSON
  on its GETs too. That is ui-library and a rebuild, left out here: the
  server fix alone already ends the false "Saved" and keeps the typed
  values on screen.
- `logout()` records every sign-out it makes as `AUTH_LOGOUT_IP_CHANGE`,
  a password change included; the audit entry could name the reason.
- The Login page reached from a tab has no `source`, so after signing in
  the user lands on their default page rather than the Profile. The
  server knows only the tab's address; passing the `Referer`'s path as
  `source` would bring them back, which is the team's call.
- 3.5 has the same `redirectTo()`; its file lacks `main`'s audit-log
  imports, so a backport adapts the `use` lines.
- The fix proposed for `pkp/pkp-lib#12780` changes `logout()` in the same
  class; the two touch different methods.

Small: one method in one file, tried on the three apps, with the
client's handling of the `401` as a follow-up; the test that
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
  `H15E_FIRST=contact` presses "Contact" at step 5 instead of "Roles";
  `H15E_MODE=list` runs "Searching a list", `H15E_MODE=vue` "Saving a
  settings form";
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix trial:
  `node bin/try-fix.js apply|revert
  shared/playwright/checks/issues/stale-session-tab-press-script-error/fix.diff
  ojs omp ops`, then the walk, `list`, `vue` (OJS, OMP), `nb`, `nbdl`
  and (OJS) `save`, then `nbdl` again after the revert.
- Walked 2026-10-15 on PostgreSQL, pkp/datasets 7912e09 (2026-10-14):
  `main` OJS 378eced941, OMP f4836d4fb, OPS 2ece50497f, lib/pkp
  b17fadae59 (all three); `stable-3_5_0` OJS ca763c91cd, OMP a70bbb9c4,
  OPS 44aec6e131, lib/pkp 4045d9241e. The Steps reproduced on all six.
  With the dashboard open in a second tab of B (`H15E_REACH=1`), that
  tab's own background request can be the first after the change (seen
  once, on OPS 3.5), so the Steps are walked without it. The Profile save
  was walked on OJS `main` only, with the fix in and out.
- Walked again for the update, the same tips and dataset: the Steps and
  "Searching a list" on all six installs, with the Observed as written on
  each; the first press on "Contact" on OJS `main`; "Saving a settings
  form" on OJS and OMP `main`, with the fix in and out. The fix's trial
  covered "Searching a list" on OJS, OMP and OPS `main` and the settings
  form on OJS and OMP.
- The file-link neighbour ran on OJS and OMP; OPS's submission 7 has no
  review file, so OPS was not driven for it. An earlier version of the
  fix, branching on the router, was tried the same way and is replaced
  by this one: by the code it would answer such file links with JSON.
- Code reads, ui-library at `main` and 3.5: `Form.vue` `submit()`
  (`$.ajax()` without `dataType`, the same on 3.5), the `autosave` mixin,
  `DecisionPage.vue`, `useFetch()` and ofetch (which adds `Accept:
  application/json` only for a JSON body). 3.5's `PKPAuthenticateSession::redirectTo()`,
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
- Not verified: the other legacy pages (side windows, grids other than
  the Plugins list), the "Reset Password", sign-in password change, Users
  & Roles, "Keep me logged in" and `session_check_ip` paths, the expired
  session and the administrator's change, all read in the code only;
  "Expire User Sessions" and a sign-out in another browser were walked
  for U01 A16, not by this script. The submission wizard's autosave, the
  decision page and a reviewer's review form, with the fix in and out,
  read in the code only (each needs its own submission state, beyond
  this walk); the 3.5 settings form, read in the code. MySQL not checked
  (the fault does not depend on the database).
