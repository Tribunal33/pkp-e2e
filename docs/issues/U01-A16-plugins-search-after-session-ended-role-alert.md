# After the session has ended, an older back-office list, tab or form left open answers with a "no access" alert instead of the Login page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** [31106b7537](https://github.com/pkp/pkp-lib/commit/31106b7537751974abf937a3a8996fd9132046c8) · 2010-09-07 · jerico.dev, a commit with no PR
- **Upstream** `pkp/pkp-lib#1576` (closed without a fix in 2021, for a settings tab); its PR `pkp/pkp-lib#4531` (open since 2019) would change the alert's words, not lead to the Login page
- **Tracked in** U01 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a16)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-19: revised after review. A form's "Save" was walked,
with the fix in and out, and the title names the older pages in general.
The Proposed fix says what it does to requests that never had a
signed-in user.

## Summary

Once a user's session has ended (after the idle limit, after the Site
Administrator's "Expire User Sessions", or with the site's cookies
cleared), the next thing they do should bring up the Login page, as
opening or reloading any page does. The older parts of the back office,
left open in a tab from before, do not. A search on Settings › Website ›
"Plugins" raises the browser alert "The current role does not have
access to this operation.", and its spinner keeps turning. "Save" on a
Profile tab raises an alert of its own and stores nothing.

The alert does not say that the user has been signed out. What was
typed in the form cannot be saved without a new sign-in, and the reload
that leads there clears it, so it has to be typed again.

## Impact

- **Lost**: on a form, what was typed since its last save: "Save"
  stores nothing, and the reload that reaches the Login page clears the
  boxes. The ended session costs this, not the alert: going straight to
  the Login page, as expected, clears them too, and the alert at least
  leaves them on screen to copy. A search loses nothing.
- **Who**: every signed-in user on the Profile page; managers and
  administrators on the Settings lists (Plugins, Roles, Sections,
  Navigation Menus and the others still built the older way); editors
  and others assigned to a submission, pressing a file's link on its
  workflow; reviewers on the review page's file lists (code). Each meets
  it on a page left open past the end of their session, most often a
  tab left open longer than the idle limit (7 days by default) or open
  while an administrator presses "Expire User Sessions".
- **Way round**: copy what was typed, reload the page, sign in on the
  Login page it shows, and type or paste the values again.

Low: the fault is a misleading message where the Login page should
show; the typed values are lost to the ended session either way. A
screen where the alert itself costs work would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), with
  `[debug] show_stacktrace = Off` in `config.inc.php` (the default; when
  it is On the alerts below end with the request's address).
- Two browsers that do not share cookies (or a normal and a private
  window), called A and B below.

Searching a list:

1. In B, sign in as `dbarnes` (password `dbarnesdbarnes`) on
   `/index.php/publicknowledge/en/login`, open "Settings" › "Website" and
   its "Plugins" tab. "Installed Plugins" lists the plugins.
2. In A, sign in as `admin` (password `admin`), open "Administration"
   (`/index.php/index/en/admin`), press "Expire User Sessions" and "OK"
   in the confirm ("Are you sure you want to expire all user sessions?
   All users who are currently logged into the system will be forced to
   log in again (yourself included)."). A shows the Login page.
3. In B, without reloading, press "Search" in the list's header, type
   `h19i` in the box and press the "Search" button under it.
4. In B, press "OK", then press the "Search" button again.
5. In B, reload the page.

**Expected**: step 3 takes B to the Login page, as the reload in step 5
does.

**Observed**: steps 3 and 4 each raise a browser alert reading:

```
The current role does not have access to this operation.
```

After "OK" a spinner turns beside "Search", `h19i` stays in the box and
the list keeps every plugin. Each search was refused in JSON:

```
POST /index.php/publicknowledge/$$$call$$$/grid/settings/plugins/settings-plugin-grid/fetch-grid
  200  {"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

Step 5 shows the Login page
(`/index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Fmanagement%2Fsettings%2Fwebsite`).
Control: with nothing ending B's session, a search for `Crossref` lists
the matching plugins with no alert.

Saving a form:

1. In B, sign in as `dbarnes`, choose "Edit Profile" in the user menu
   and press the "Contact" tab. Type `555 0119` in "Phone"; do not save.
2. Do step 2 above in A.
3. In B, press "Save" under the Contact form.
4. In B, press "OK", then reload the page; sign in again as `dbarnes`
   and open "Edit Profile" › "Contact".

**Observed**: step 3 raises the alert "##user.authorization.userRequired##"
(the Profile page's own sentence, missing from the language files:
[U03 A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a26));
`555 0119` stays in "Phone". The reload asks nothing before leaving and
shows the Login page; after signing in "Phone" is empty.

## Cause

When a request's access check fails, the router that serves it decides
what the browser gets (`PKPRouter::_authorizeInitializeAndCallRequest()`
calls `handleAuthorizationFailure()`). The page router sends a request
without a signed-in user to the Login page
(`PKPPageRouter::handleAuthorizationFailure()`, since
[05dd8b88d1](https://github.com/pkp/pkp-lib/commit/05dd8b88d1c9d382958b9c05e5a36fa6711ee30d)
in 2011):

```php
if (!$request->getUser()) {
    Validation::redirectLogin();
}
```

The component router serves every `$$$call$$$` request: the older
lists, tabs, side windows and forms, and file links. Its
`handleAuthorizationFailure()` (`lib/pkp/classes/core/PKPComponentRouter.php`)
has no such branch. It answers every refusal with the refusing check's
sentence as a failed `JSONMessage`, whether or not anyone is signed in:

```php
$translatedAuthorizationMessage = __($authorizationMessage, $messageParams);
…
return new JSONMessage(false, $translatedAuthorizationMessage);
```

The page's script shows the `content` of a failed answer with `alert()`
(`Handler.handleJson()`, `lib/pkp/js/classes/Handler.js`). An ended
session leaves the request without a user. The Plugins list's search is
checked by the app's `SettingsPluginGridHandler::authorize()`
(`controllers/grid/settings/plugins/` in each app), which for a request
naming no plugin adds `ContextAccessPolicy`; its
`RoleBasedHandlerOperationPolicy` finds no role and refuses with
`user.authorization.roleBasedAccessDenied`. A script's request can be
sent elsewhere with a JSON answer the page already follows
(`PKPRequest::redirectUrlJson()`, the `redirectRequested` event that
`SiteHandler` turns into a page load); the router never sends one for a
request without a user.

Reach, each older-style part answering with its own check's sentence:

- Settings › Website › "Plugins", the search (walked).
- Profile › "Contact", the tab press and "Save" (walked; every Profile
  tab is served the same way).
- A submission file's link on the workflow (submission 1's files, OJS
  and OMP walked): the new tab shows the JSON as text,
  `{"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}`.
- The other Settings lists still built this way (Roles, Sections,
  Genres, Languages, Library, Review Forms, Navigation Menus,
  Announcement Types, Plugin Gallery) and the reviewer's file lists on
  the review page (code).
- Every way a session ends with the page open: the idle limit
  (`session_lifetime`), "Expire User Sessions", the browser's cookies
  for the site cleared. After a password change made in another
  browser, the first request is answered with the Login page's HTML
  instead
  ([U03 A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a25)),
  and the later ones as here.
- The newer lists on the REST API show an "Error" window instead, a
  fault of its own
  ([U01 A16, Users & Roles](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U01-A16-users-search-after-session-ended-error-window.md)).

## Proposed fix

In `PKPComponentRouter::handleAuthorizationFailure()`, send a refused
request that has no signed-in user to the Login page, as
`PKPPageRouter::handleAuthorizationFailure()` does. A request that a
page's script reads as JSON gets the JSON redirect that components
already send (`PKPRequest::redirectUrlJson()`), and the page loads the
Login page. A browser navigation, such as a file link, gets an HTTP
redirect to the Login page (`Validation::redirectLogin()`)
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugins-search-session-ended-role-alert/fix.diff),
applied at the app root, with a `use PKP\security\Validation;` line):

```php
if (!$request->getUser()) {
    if (app('request')->expectsJson()) {
        return $request->redirectUrlJson(
            $request->getDispatcher()->url($request, PKPApplication::ROUTE_PAGE, null, 'login')
        );
    }
    Validation::redirectLogin();
}
```

The router is the one place every component refusal passes through,
whichever handler and check refused it, so the fix is one change.
Telling the two kinds of request apart follows `RedirectGuestToLogin`,
the API middleware that sends an anonymous browser request to the Login
page and lets one that asks for JSON through; `expectsJson()` reads the
`Accept` and `X-Requested-With` headers that jQuery sends. A signed-in
user whom a check refuses keeps today's alert.

The branch also covers visitors who were never signed in. The
components a signed-out visitor uses by design pass their checks and
never reach it: the stylesheets every page loads (`page/page/css`, still
`text/css` on the Login page with the fix) and the registration form's
username suggestion (code). What does reach it is a component a visitor
may not use, such as the link of a file that is not published: it now
shows the Login page, with the link as `source`, instead of JSON text,
and signing in may let the user in (code).

Tried on OJS, OMP and OPS `main`: with the fix, step 3 of "Searching a
list" lands B on the Login page with no alert and no script error, and
so does a Profile tab press. A file link pressed then (OJS, OMP) opens
the Login page in the new tab, with the file's address as `source`.
On the Profile's "Contact", "Save" (OJS) lands on the Login page at
once, with no alert and no question; after signing in "Phone" is empty,
as without the fix. Unchanged with the fix in and out: with the session alive, a
search lists its plugins with no alert.

**Alternatives**:

- Add a `UserRequiredPolicy` with a "Login required." message to every
  context check, as `pkp/pkp-lib#4531` does in `ContextPolicy`: the
  alert's words improve, but the page stays where it is, and every
  handler not built on `ContextPolicy` keeps the old sentence.
- Teach the page's script (`Handler.handleJson()`) to recognise a
  refusal of an ended session: only the server knows that nobody is
  signed in, and the answer carries nothing the script could test.

**What goes with it**:

- The JSON redirect names the Login page without a `source`, so after
  signing in the user lands on their home page, not the page they were
  on (the HTTP redirect keeps its `source`). `Dispatcher::url()` takes
  `$params`: passing `['source' => <the Referer's path>]` as its seventh
  argument would bring them back.
- With the fix, a refused "Save" of an older form leaves the page at
  once, so the typed values are not left on screen to copy as they are
  under the alert. Keeping them would take a question before leaving or
  the Login page in a new window; that is the team's call.
- With the fix, the Profile page's alert
  "##user.authorization.userRequired##"
  ([U03 A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a26))
  no longer shows after a session ends; that report's missing locale key
  stays a fault of its own.
- 3.5 has the same method, and the diff applies there with an offset.
  3.4 and 3.3 have the same method too, but no `app('request')` or
  `expectsJson()` in pkp-lib, so a backport there reads the
  `X-Requested-With` header itself (not tried).
- The guard: a unit test of `handleAuthorizationFailure()` with no user
  for the JSON branch (a `redirectRequested` event naming the Login
  page); the other branch ends in `redirectLogin()`, which exits, so the
  e2e walk of the Steps in two browsers covers it.

Small: one branch in one pkp-lib method, as the page router already
does it.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugins-search-session-ended-role-alert/walk.js)
  (helpers in `lib.js` beside it), on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js <app|all>
  shared/playwright/checks/issues/plugins-search-session-ended-role-alert/walk.js`
  walks "Searching a list"; `H19I_MODE=form` "Saving a form";
  `H19I_MODE=nb` the neighbour check (a search with the session alive;
  after "Expire User Sessions", a Profile tab press and, on OJS and OMP,
  a file link); `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix
  trial: `node bin/try-fix.js apply|revert
  shared/playwright/checks/issues/plugins-search-session-ended-role-alert/fix.diff
  ojs omp ops`; the walk and `nb` ran with the fix on the three apps,
  `form` on OJS.
- Walked 2026-10-19 on PostgreSQL, pkp/datasets eaf024c5 (2026-10-18),
  each run from a fresh load: `main` OJS 6b4323ced7, OMP 5777025be, OPS
  f048e747b4, lib/pkp 042726ebf6 (all three); `stable-3_5_0` OJS
  007c2cd0d6, OMP 2d575f250, OPS e737a9e465, lib/pkp 092ec34b0f.
  "Searching a list" showed the Observed on all six installs; "Saving a
  form" on the three `main` installs and OJS 3.5. The session was ended
  only with "Expire User Sessions"; the idle limit and cleared cookies
  leave the request without a user the same way (code).
- The file link was not driven on OPS: submission 1's workflow there
  opens on the posted preprint, with no file link.
- Code reads: `PKPComponentRouter::handleAuthorizationFailure()` is the
  same on `stable-3_5_0`, on `stable-3_4_0` (lib/pkp
  `origin/stable-3_4_0` a71d6bd2ca; OJS 0012bd1022, OMP e30fa7e38c, OPS
  0f1e21a117 at `upstream/stable-3_4_0`) and on `stable-3_3_0` (lib/pkp
  5e84acd11b; OJS d7d9dd14ec, OMP 8e72fc8836, OPS c5532e2161), each with
  the page router's sign-in branch beside it;
  `SettingsPluginGridHandler` adds `ContextAccessPolicy` there too (read
  in OMP 3.4 and OJS 3.3). The older-style Settings lists and the
  reviewer's file lists are the `component=` grids of
  `lib/pkp/templates/management/*.tpl`, `templates/management/context.tpl`
  and `lib/pkp/templates/reviewer/review/step{1,3}.tpl` on `main`.
  Components open to visitors: `PageHandler` (`css`) and `UserApiHandler`
  (`suggestUsername`) allow every visitor (`PKPSiteAccessPolicy` with
  `SITE_ACCESS_ALL_ROLES`); `FileApiHandler` checks each file with
  `SubmissionFileAccessPolicy`.
- Introduced: `git blame` on the `JSONMessage(false, …)` line leads
  through the PSR-12 reformat e3f570bc37 (2021) to 31106b7537 (2010,
  "fixed message display for component requests"), which wrote the
  method; the page router's sign-in branch came in 05dd8b88d1 (2011) and
  was never added here.
- Not verified: the other older-style lists, side windows and the
  reviewer's file lists (code); the username suggestion and an
  unpublished file's link opened by a visitor, with the fix (code);
  MySQL not checked.
