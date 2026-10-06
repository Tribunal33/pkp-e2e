# Signed out, the Dashboard address the monthly reminder email links to gives an empty error page

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the old "Submissions" page)
  - 3.3: none (code; the old "Submissions" page)
- **Introduced** `pkp/pkp-lib#10782` (with `pkp/ojs#4583`, `pkp/omp#1804`, OPS [5f7424f9e7](https://github.com/pkp/ops/commit/5f7424f9e7bece64fe22c3301592064fb62fb022)) for `pkp/pkp-lib#10670` · [9113dec](https://github.com/pkp/pkp-lib/commit/9113dec7eda44fdf62eb130c5153b6ede0b07085), in `PKPDashboardHandlerNext.php` (now `PKPDashboardHandler.php`) · 2025-01-14 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U01 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The server fails when a signed-out visitor opens the Dashboard address
that ends at the word "dashboard"
(`…/index.php/publicknowledge/en/dashboard`). The visitor gets an empty
error page instead of the Login page. Longer Dashboard addresses, such as
`…/dashboard/editorial`, open the Login page and return there after
signing in.

That address is the "submission dashboard" link in the monthly
"Outstanding editorial tasks" email to managers and section editors. A
bookmark or a typed address cut short at "dashboard" leads there too.

## Impact

- **Lost**: nothing stored. The empty error page has no message and no
  link onward.
- **Who**: anyone signed out who opens that address. The email goes out
  by default: an install runs the reminder on the first of each month,
  to every manager and section editor of a journal, press or preprint
  server who has submissions waiting on them, unless they have turned
  the reminder off under their profile's notifications. A sign-in ends
  after 7 days without a visit by default (30 with "Keep me logged in"),
  so an editor who has not visited since is signed out when they press
  the link. The same email's links to each submission work.
- **Way round**: open the home page, press "Login" and sign in. The
  Dashboard then opens from the user menu.

Medium: the link the app mails each month to the managers and section
editors with waiting submissions answers an empty error page whenever
they are signed out, with a way round once they know to sign in first.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (OMP and OPS the same).
  Nothing is created.

Steps:

1. Signed out (a fresh browser, or after "Logout"), open the Dashboard
   address with nothing after "dashboard":
   `/index.php/publicknowledge/en/dashboard`.
2. On the page that opens, sign in as `dbarnes` (password
   `dbarnesdbarnes`).
3. Control: sign out, then open
   `/index.php/publicknowledge/en/dashboard/editorial`.
4. On the Login page that opens, sign in as `dbarnes`.

**Expected**: step 1 opens the Login page, as step 3 does. Signing in
there (step 2) leads `dbarnes` to his Dashboard, "Assigned to me".

**Observed**: step 1 answers HTTP 500 with an empty error page, with no
title and no form, so step 2 cannot be taken. The server log:

```
PHP Fatal error:  Uncaught Error: Call to a member function getId() on null in …/lib/pkp/classes/core/PKPPageRouter.php:412
[500]: GET /index.php/publicknowledge/en/dashboard
```

`/index.php/publicknowledge/en/dashboard/index` and the address without a
language (`/index.php/publicknowledge/dashboard`, which redirects to the
first) answer the same. In steps 3 and 4 the Login page opens at
`login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Fdashboard%2Feditorial`,
and signing in leads to "Assigned to me (17)" (OMP "Assigned to me (4)",
OPS "Assigned to me (0)").

## Cause

`PKPDashboardHandler::authorize()`
(`lib/pkp/pages/dashboard/PKPDashboardHandler.php`, line 117) handles the
bare address before any authorization runs. The apps'
`pages/dashboard/index.php` send the operation `index` to the app's
`APP\pages\dashboard\DashboardHandler` (a `PKPDashboardHandler`
subclass) with no `DashboardPage`. For that handler, `authorize()` calls
`PKPPageRouter::redirectHome()` before it adds `PKPSiteAccessPolicy`:

```php
if (!$this->dashboardPage) {
    $pkpPageRouter = $request->getRouter();
    $pkpPageRouter->redirectHome($request);
}
$this->addPolicy(new PKPSiteAccessPolicy($request, null, $roleAssignments));
```

`PKPPageRouter::getHomeUrl()` chooses the dashboard by the user's roles
in the context and starts with `Auth::user()->getId()` (lines 411–412).
With no user signed in, that call is the fatal error. For every other
private address, `PKPSiteAccessPolicy` refuses a signed-out visitor and
`PKPPageRouter::handleAuthorizationFailure()` then calls
`Validation::redirectLogin()`, with the address asked for as `source`.
The early `redirectHome()` means neither is reached.

The role-based choice in `getHomeUrl()` is older than 9113dec. What
9113dec added, for `pkp/pkp-lib#10670` ("`/dashboard` -> to specific
dashboard based on role"), was sending the bare address through it: the
`redirectHome()` call in `authorize()`, ahead of any policy, and `index`
taken out of the editorial dashboard's role assignment. Before it,
`index` opened the editorial dashboard with `index` in that role
assignment, so the policies ran first and a signed-out visitor got the
Login page. The same change pointed the email variable `{$submissionsUrl}`
(`ContextEmailVariable::getSubmissionsUrl()`) at the bare address;
before, it pointed at `submissions`.

Reach:

- The "submission dashboard" link of "Outstanding editorial tasks"
  (`EditorialReminder`) is `{$submissionsUrl}` (read in the email the
  task sent on OJS). Any email template a journal, press or preprint
  server edits to use `{$submissionsUrl}` links there too (in the code).
- The old `/submissions` address is served by the legacy
  `PKP\pages\dashboard\DashboardHandler`, which authorizes first, so it
  opens Login and then the Dashboard (on screen). Not affected.
- The other callers of `redirectHome()` and `getHomeUrl()` run with a
  user signed in or after their policies (in the code):
  - `LoginHandler`: when already signed in, or after signing in;
  - `AdminHandler`, after its policies;
  - `PKPNavigationMenuService`, only for a signed-in user;
  - the legacy `PKP\pages\dashboard\DashboardHandler::index()`.

  One more is not settled: `LoginHandler::savePassword()` sends the
  user home after `Validation::login()` without checking the result
  (Evidence).

## Proposed fix

Send a signed-out visitor to Login before choosing the dashboard by role, the way
`PKPPageRouter::handleAuthorizationFailure()` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dashboard-address-signed-out-server-error/fix.diff)):

```diff
--- a/lib/pkp/pages/dashboard/PKPDashboardHandler.php
+++ b/lib/pkp/pages/dashboard/PKPDashboardHandler.php
@@ -45,3 +45,4 @@
 use PKP\security\Role;
+use PKP\security\Validation;
@@ -117,4 +118,8 @@
         if (!$this->dashboardPage) {
+            // Which dashboard is home depends on the user's roles: a signed-out visitor signs in first
+            if (!$request->getUser()) {
+                Validation::redirectLogin();
+            }
             $pkpPageRouter = $request->getRouter();  /** @var \PKP\core\PKPPageRouter $pkpPageRouter */
```

The diff is shortened here; the linked file has the full context.

The Login page then carries the bare address as `source`. After signing
in, that address chooses the dashboard by role, so `pkp/pkp-lib#10670`'s
rule holds and the email link needs no change.

Tried on `main` in the three apps. Step 1 opened the Login page at
`login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Fdashboard`, and step 2
led `dbarnes` to "Assigned to me". `/dashboard/index` and the address
without a language opened Login too.

Signed in, the bare address led `dbarnes` to `dashboard/editorial` and
the author (`amwandenga`, OMP `aclark`, OPS `ccorino`) to
`dashboard/mySubmissions`, and the old `/submissions` address behaved as
in Reach, the same with the fix in and out. No request failed with the
fix in.

**Alternatives**

- Return the journal's home page from `getHomeUrl()` when no user is
  signed in. That ends the crash, but the visitor lands on the home page
  instead of Login and the address is lost. It is worth adding as a
  hardening, but it does not replace the guard.
- Authorize first, as the old handler did: list `index` in the role
  assignments and choose the dashboard in `index()`. That also works, but a
  signed-in Reader at the bare address would get the access-denied page
  where today they go to the journal's home page.
- Point `{$submissionsUrl}` at `dashboard/editorial`. That fixes only
  the email, and the variable serves any recipient, so choosing by role
  is right.

**What goes with it**

- No stored data, REST API or plugin hook is involved.
- Backport: on 3.5 the diff applies as it stands (with an offset). 3.4
  and 3.3 do not need it.
- Guard: an end-to-end check that the bare Dashboard address, opened
  signed out, shows the Login page and leads to the Dashboard after
  signing in. In pkp-e2e this is a **Planned** item in spec U01.

This is a proposal; the team decides. Small: one guard and one import in
one shared handler, following the router's own pattern, and one check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dashboard-address-signed-out-server-error/walk.js),
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dashboard-address-signed-out-server-error/lib.js).
  It takes the Steps on an install freshly loaded from the default
  dataset (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL). From a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/dashboard-address-signed-out-server-error/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With `neighbour` as its
  argument it walks the fix's neighbour paths instead. The fix was tried
  with `node bin/try-fix.js apply shared/playwright/checks/issues/dashboard-address-signed-out-server-error/fix.diff ojs omp ops`.
- 3.5 answered the same 500 at line 412 on each app, and steps 3 and 4
  behaved as on `main`. Nothing here depends on the database.
- The email: on the OJS `main` install, the editorial reminder task was
  run by hand (`php lib/pkp/tools/scheduler.php test
  --name='PKP\task\EditorialReminders'`, then `php lib/pkp/tools/jobs.php
  run`). The email to `dbarnes`, "Outstanding editorial tasks for Journal
  of Public Knowledge", links "submission dashboard" to
  `/index.php/publicknowledge/en/dashboard`, and each listed submission
  to `dashboard/editorial?workflowSubmissionId=<id>`. OMP and OPS send
  the same text from the shared pkp-lib (read in the code, not sent).
- Tips:
  - `main`: OJS ff004d0973 (pkp-lib 987776cd04), OMP 3b0ecf794c and OPS
    c8af945bb7 (pkp-lib 3dc90c81a6).
  - `stable-3_5_0`: OJS c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246c
    and OPS 38b61882d3 (pkp-lib cf3f984335).
  - `stable-3_4_0`: OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b
    (pkp-lib 767353f4fe).
  - `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161
    (pkp-lib ac3fa73402).
- Code reads:
  - `PKPDashboardHandler::authorize()` on `main` (the guard at line 117,
    `redirectHome()` at 119) and 3.5 (lines 106 and 108), and
    `getHomeUrl()` on both (lines 411–412). On 3.5 the apps'
    `pages/dashboard/index.php` also route `index` to
    `APP\pages\dashboard\DashboardHandler` without a page, and
    `ContextEmailVariable::getSubmissionsUrl()` also gives `dashboard`.
  - 3.4 and 3.3: none of the apps has `pages/dashboard/index.php`.
    pkp-lib's `PKP\pages\dashboard\DashboardHandler` (3.3: the
    unnamespaced `DashboardHandler` in `DashboardHandler.inc.php`) lists
    `index` in its role assignment and
    authorizes through `PKPSiteAccessPolicy` before `index()` runs. On
    3.4, `getSubmissionsUrl()` gives `submissions`.
  - Every `redirectHome()` and `getHomeUrl()` caller in pkp-lib and the
    apps, for the reach.
- Introduced: `git blame` on the `redirectHome()` call names 9113dec
  (`pkp/pkp-lib#10782`); the `if` line above it blames to 6e9bcb91c0c, a
  reformat. 9113dec changed `pages/dashboard/PKPDashboardHandlerNext.php`,
  which fca196cf22 (`pkp/pkp-lib#10766`, 2025-03-18) renamed to
  `PKPDashboardHandler.php`, so read it with `git show 9113dec --
  pages/dashboard/PKPDashboardHandlerNext.php`. The app commits that
  route `index` to `APP\pages\dashboard\DashboardHandler` without a page
  are OJS b065b61a94 (`pkp/ojs#4583`), OMP
  57b0965dc (`pkp/omp#1804`) and OPS 5f7424f9e7 (no PR found). Before
  them, 0608d6e204 (OJS), 98e9fbdba (OMP) and 6d23162966 (OPS) sent
  `index` to the editorial dashboard.
- Not driven: a reviewer's or an assistant's landing through the fixed
  Login page, and 3.4 and 3.3.
- Unverified: whether `LoginHandler::savePassword()` (the forced
  password change) can reach `getHomeUrl()` with no user. It sends the
  user home after `Validation::login()` whatever the result, and
  `Validation::registerUserSession()` refuses a disabled account, but
  whether `Auth::user()` is then empty was not settled. The getHomeUrl()
  hardening under Alternatives would cover it.
- Tracker search (2026-10-04): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library, for the dashboard address signed out, an empty error
  page or 500, "getId() on null", `getHomeUrl`, `redirectHome` and
  `PKPDashboardHandler`. None is this fault. `pkp/pkp-lib#10670` is the
  closed issue that set the redirect rules.
