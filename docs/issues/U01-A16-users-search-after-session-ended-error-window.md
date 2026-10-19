# After the session has ended, a search on an open back-office list (Users & Roles, the dashboard) opens an "Error" window instead of the Login page

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; the dashboard only)
  - 3.3: OJS, OMP, OPS (code; the dashboard only)
- **Introduced** not traced; present since at least [be8d379298](https://github.com/pkp/ui-library/commit/be8d379298ba3597c12c9d481d6164b21c614f3d) (2017-06-02)
- **Upstream** none found (2026-10-19)
- **Tracked in** U01 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a16)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-19: revised after review. The dashboard has steps of its
own; the window a dashboard showed by itself in the first walk came from
the walk's timing and is gone from the report; the fix's server half now
leaves a refusal that carries its own message unchanged, and was tried
again.

## Summary

Once a user's session has ended (after the idle limit, after the Site
Administrator's "Expire User Sessions", or with the site's cookies
cleared), the next thing they do should bring up the Login page, as
opening or reloading any page does. The lists of the newer back-office
pages do not: a search on Settings › Users & Roles or on the dashboard,
in a tab left open from before, opens a window headed "Error" reading
"You are not authorized to access the requested resource.".

The window tells the user they lack access, not that they have been
signed out. It opens once per search; a dashboard left alone shows
nothing until it is used.

## Impact

- **Lost**: nothing is stored or deleted; the search is not run. The
  user may take the window at its word and ask an administrator about
  an access they still have.
- **Who**: anyone with a dashboard left open past the end of their
  session (editors and managers walked; the authors' and reviewers'
  dashboards are the same page, code), and managers on Users & Roles;
  most often a
  tab left open longer than the idle limit (7 days by default) or open
  while an administrator presses "Expire User Sessions". Saves on these
  pages are refused with their own sentence, "You may have been logged
  out", so they are not part of this fault.
- **Way round**: reload the page, which shows the Login page; sign in
  and repeat the search.

Low: a misleading window where the Login page should show, with nothing
lost.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- Two browsers that do not share cookies (or a normal and a private
  window), called A and B below.

Users & Roles:

1. In B, sign in as `dbarnes` (password `dbarnesdbarnes`) on
   `/index.php/publicknowledge/en/login` and open "Settings" › "Users &
   Roles". The "Users" tab lists the users ("Current Users (39)" on OJS,
   38 on OMP, 25 on OPS).
2. In A, sign in as `admin` (password `admin`), open "Administration"
   (`/index.php/index/en/admin`), press "Expire User Sessions" and "OK"
   in the confirm. A shows the Login page.
3. In B, without reloading, type `h19i` in the box "Enter a user's name,
   role (e.g Journal editor), or affiliation" and press Enter.
4. In B, press "OK", then reload the page.

**Expected**: step 3 takes B to the Login page, as the reload in step 4
does.

**Observed**: at step 3 a window headed "Error" opens over the list:

```
Error
You are not authorized to access the requested resource.
OK
```

The search was refused by the REST API:

```
GET /index.php/publicknowledge/api/v1/users?searchPhrase=h19i&status=all&includePermissions=true&offset=0&count=25&page=1&perPage=25
  401  {"error":"You are not authorized to access the requested resource.","errorMessage":""}
```

After "OK" the list reads "Current Users (0)" with `h19i` in the box.
The reload shows the Login page
(`/index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Fmanagement%2Fsettings%2Faccess`).
Control: with nothing ending B's session, a search for `Barnes` lists
"Current Users (1)" and opens no window.

The dashboard:

1. In B, sign in as `dbarnes`. The dashboard opens on "Assigned to me".
   Wait a few seconds.
2. Do step 2 above in A.
3. In B, leave the dashboard untouched for half a minute: nothing
   changes on it.
4. In B, type `h19i` in "Search submissions" and press Enter.
5. In B, press "OK", then reload the page.

**Observed**: at step 4 the same "Error" window opens, once, over the
dashboard. The search and the side menu's counts were refused alike:

```
GET /index.php/publicknowledge/api/v1/_submissions/viewsCount?assignedWithRoles[]=1&…
  401  {"error":"You are not authorized to access the requested resource.","errorMessage":""}
GET /index.php/publicknowledge/api/v1/_submissions?searchPhrase=h19i&offset=0&count=30&page=1&perPage=30
  401  (the same)
```

After "OK" no other window opens; step 5 shows the Login page.

## Cause

The newer lists read their rows from the REST API with `useFetch()`
(`lib/ui-library/src/composables/useFetch.js`; the Users list through
`useFetchPaginated()` in `UserAccessManagerStore.js`). Once the session
has ended, the request arrives without a signed-in user.

`APIHandler::runRoutes()` runs the global middleware, `PolicyAuthorizer`
among them (`PKPRoutingProvider::$globalMiddleware`), before the
router dispatches to the route's own `has.user`. `PolicyAuthorizer`
(`lib/pkp/classes/middleware/PolicyAuthorizer.php`) runs the
controller's access checks; with no user, `UserRolesRequiredPolicy`
refuses without a message of its own, and the answer is `401` with
`api.403.unauthorized`, "You are not authorized to access the requested
resource.".

A signed-in user whom a check refuses gets the same status and sentence
(`PolicyAuthorizer` again, `HasRoles`), so nothing in the answer tells
the page that nobody is signed in any more. The client opens its "Error"
window for it as for any failed read: `useFetch()` hands the failure to
`modalStore.openDialogNetworkError()` (`lib/ui-library/src/stores/modalStore.js`)
unless the request was aborted, the caller's `onError` handled it, or it
is a 400 or 422 the caller expects; no list or count uses those ways
out. The older Vue components that call `$.ajax()` open the same window
through the `ajaxError` mixin's `ajaxErrorCallback()`.

Reach:

- Walked: the Users & Roles search; the dashboard's "Search
  submissions" and the side menu's counts fetched with it.
- A dashboard left alone after the session ended sends nothing and
  shows nothing (walked for half a minute). The side menu fetches its
  counts again only when the dashboard's list is fetched (a search, a
  view, a refresh after an action), through `appStore.triggerReloadViewsCount()`,
  throttled to once in five seconds with a trailing call; that trailing
  call can fire up to five seconds after a page has loaded.
- Not this fault: a save (`POST`, `PUT`) is refused first by the CSRF
  check (`ValidateCsrfToken`), `403` "The form could not be submitted.
  You may have been logged out. Please reload the page and try again.",
  shown as a notice with the typed values kept (walked on Settings ›
  Journal › "Masthead", "Save"; OMP: Press, OPS: Server).
- Not this fault: the reader-side pages (`src/frontend`, such as
  comments) show their window only for a save, through `usePkpFetch()`
  and `pkpModalStore.openDialogNetworkError()`, and a save meets the CSRF
  refusal above (code).
- 3.4 and 3.3: Users & Roles is the older list there (an alert, the
  other report). The dashboard's submission lists use the `fetch` mixin,
  whose error callback is `ajaxErrorCallback()`, and the API there
  refuses with `403` and the check's sentence
  (`APIRouter::handleAuthorizationFailure()`) (code).
- The older lists, tabs and forms (`$$$call$$$`) answer an ended session
  with an alert instead, a fault of their own in the component router
  ([U01 A16, Plugins list](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U01-A16-plugins-search-after-session-ended-role-alert.md)).
- After a password change made in another browser, the first API
  request gets a redirect to the Login page's HTML instead
  ([U03 A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a25));
  the requests after it get the `401` above.

## Proposed fix

Two halves, one in each repo
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-search-session-ended-error-window/fix.diff),
applied at the app root):

1. **The API says that nobody is signed in.** When a request has no user
   and its checks fail with no message and no exception,
   `PolicyAuthorizer::handle()` answers `401` with the locale key in
   `error` and its sentence in `errorMessage`, the body shape
   `APIRouter::handleAuthorizationFailure()` uses (that method answers
   `403`). `HasUser::handle()` answers the same:

   ```php
   if (!$exceptionStatusCode && empty($authorizationMessage) && !$request->user()) {
       return response()->json([
           'error' => 'user.authorization.loginRequired',
           'errorMessage' => __('user.authorization.loginRequired'),
       ], Response::HTTP_UNAUTHORIZED);
   }
   ```

2. **The page reloads on that answer.** A new helper,
   `isLoginRequired(status, data)` in `src/utils/loginRequired.js`, is
   true for a `401` whose `error` is `user.authorization.loginRequired`
   on a page rendered for a signed-in user (`pkp.currentUser.id`).
   `modalStore.openDialogNetworkError()` and `ajaxErrorCallback()` call
   `window.location.reload()` instead of opening the window when it is
   true. The reload reaches the Login page with the page's address as
   `source`, and signing in returns there.

Only the server knows that the request has no user, and every API
request without one that fails its checks passes one of these two
middlewares. Every failed read of the newer back-office pages ends in
one of the two client handlers, so no list needs a change of its own.
`user.authorization.loginRequired` ("Login required.") is the key
pkp-lib already uses for the same case (`PKPSiteAccessPolicy`); 54 of
pkp-lib's 71 locales translate it. The `pkp.currentUser.id` test keeps a
page rendered for a visitor who never signed in from reloading again and
again.

Tried on OJS, OMP and OPS `main`: with the fix, the Users & Roles
search of step 3 is answered `401`
`{"error":"user.authorization.loginRequired","errorMessage":"Login required."}`,
no window opens, and the page reloads onto the Login page with `source`
naming Users & Roles; the dashboard's search does the same. Unchanged
with the fix in and out: with the session alive, a search for `Barnes`
lists "Current Users (1)" with no window; a dashboard left alone after
the expiry sends nothing; the "Masthead" "Save" after the session ended
still shows its "You may have been logged out" notice with the typed
initials kept.

**Alternatives**:

- Reload on any `401` in the client alone: a signed-in user refused by
  a check gets a `401` too (`PolicyAuthorizer`, `HasRoles`), and the
  reload would throw away the page for them.
- Show a sentence that says the session may have ended, as the CSRF
  refusal of a save already does: needs the same marker from the
  server, and leaves the reload to the user.
- Answer a signed-in refusal `403`, so that `401` alone means "not
  signed in": the right status codes, but a change every API client
  and test that reads the code would have to follow.

**What goes with it**:

- The REST API's answer to a request without a user, refused by a check
  that gives no message of its own, changes its `error` from the
  sentence "You are not authorized to access the requested resource."
  to the key `user.authorization.loginRequired`, with "Login required."
  in `errorMessage`. A refusal that carries its own message, and one
  raised as an exception (a `404`), keep their answers. An API client
  that shows `error` as text would show the key.
- The fix proposed for
  [U03 A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a25)
  answers the first API request after a password change with a `401` of
  its own; giving it the same body makes that request reload too.
- 3.5 has the same code, but the diff's context lines need adapting
  there (`PolicyAuthorizer` and `modalStore.js` differ around the
  change). 3.4 and 3.3 refuse in `APIRouter::handleAuthorizationFailure()`
  and have their own `ajaxError` mixin; a backport there is a change of
  its own (not tried).
- The guard: a ui-library unit test for `isLoginRequired()` and
  `openDialogNetworkError()`, a pkp-lib test of the `401` body, and the
  e2e walk of the Steps in two browsers.

Medium: small changes, but in two repos (two pkp-lib middlewares; two
ui-library error handlers and a helper), and a changed `error` value in
an API answer.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-search-session-ended-error-window/walk.js)
  (helpers in `lib.js` beside it), on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js <app|all>
  shared/playwright/checks/issues/users-search-session-ended-error-window/walk.js`
  walks "Users & Roles"; `H19J_MODE=dash` "The dashboard";
  `H19J_MODE=nb` the neighbour check (a search with the session alive;
  after "Expire User Sessions", a dashboard in a second tab and the
  "Masthead" "Save"); `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The
  fix trial: `node bin/try-fix.js apply|revert
  shared/playwright/checks/issues/users-search-session-ended-error-window/fix.diff
  ojs omp ops` (it rebuilds the JavaScript).
- Walked 2026-10-19 on PostgreSQL, pkp/datasets eaf024c5 (2026-10-18),
  each run from a fresh load: `main` OJS 6b4323ced7, OMP 5777025be, OPS
  f048e747b4, lib/pkp 042726ebf6 and ui-library 99abe252 (all three);
  `stable-3_5_0` OJS 007c2cd0d6, OMP 2d575f250, OPS e737a9e465, lib/pkp
  092ec34b0f, ui-library 2576e00a. Both groups of Steps showed the
  Observed on all six installs; on 3.5 the dashboard's search goes to
  `…/_submissions/assigned?searchPhrase=h19i`, refused the same way. The
  session was ended only with "Expire User Sessions"; the idle limit and
  cleared cookies leave the request without a user the same way (code).
- The first walk saw a dashboard in a second tab of B open the window
  by itself: B had loaded it seconds before "Expire User Sessions", and
  the side menu's trailing count fetch (see Reach) fell after the
  expiry. The dashboard group waits before the expiry, and saw no
  request and no window in the half minute after it.
- Code reads: 3.5's `PolicyAuthorizer`, `HasUser`,
  `openDialogNetworkError()` and `ajaxErrorCallback()` behave as
  `main`'s, and its Users & Roles tab is the same `UserAccessManager`.
  3.4 (lib/pkp `origin/stable-3_4_0` a71d6bd2ca, ui-library ee684b341b;
  OJS 0012bd1022, OMP e30fa7e38c, OPS 0f1e21a117) and 3.3 (lib/pkp
  5e84acd11b, ui-library 96959f9ed4; OJS d7d9dd14ec, OMP 8e72fc8836, OPS
  c5532e2161): Users & Roles is the older `UserGridHandler` list
  (`templates/management/accessUsers.tpl`); the `fetch` mixin's error
  callback is `ajaxErrorCallback()`. Not walked there.
- Introduced: the client's handling is spread over several changes: the
  `ajaxError` mixin's error window since the first Vue lists
  (be8d379298, "Initial prototype", 2017), `useFetch()`'s default error
  window (bca29726, 2023, reworked in c991ce12d, 2024) and the Laravel
  API middlewares (71e79e31e3, `pkp/pkp-lib#7698`, 2023); none of them
  made a request without a user answer differently from a refusal.
- Upstream: searched pkp/pkp-lib and pkp/ui-library for the window's
  sentence, "session expired", `401` with "login", `HasUser`,
  `openDialogNetworkError`: nothing about this fault.
- Not verified: other newer pages' lists (read in the code); MySQL not
  checked (the fault does not depend on the database).
