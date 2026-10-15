# An account whose only roles are two Reader-level roles, or only Subscription Manager, lands on an access-denied page after every sign-in

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [41d2c84f7d](https://github.com/pkp/pkp-lib/commit/41d2c84f7d33fffbaebd7a4b97c312e2365a32f6) (2013-06-17)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U22 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U22-my-submissions.md#a7)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An account whose only roles in the journal are two Reader-level roles
(the built-in Reader role and a custom role at the "Reader" permission
level) signs in on the journal's login page and lands, every time, on a
page reading "The current role does not have access to this operation."
instead of the journal's home page. Holding either role alone, the
account lands on the home page. On a journal, an account whose only role
is Subscription Manager lands on the same page after every sign-in.

The user is signed in, and the page's "Home" link opens the journal. The
fault is in where sign-in sends an account that holds no back-office
role.

## Impact

- **Lost**: nothing; the user is signed in. The first thing they see is a
  refusal that reads as if their account were broken.
- **Who**: a reader whose roles are Reader and a custom Reader-level role
  and nothing else. A journal creates such a role under Settings › "Users
  & Roles" › "Roles"; with "Allow user self-registration" ticked, any
  reader can add it on their profile. On a journal, also an account
  given Subscription Manager as its only role. A default install has
  neither kind of account. An added editorial, Reviewer or Author role
  sends the account to that role's dashboard as usual; a further
  Reader-level role does not. A sign-in started from a page that asked
  for it (a "log in to download" link) returns to that page instead.
- **Way round**: the page's "Home" link opens the journal's home page.

Low: the user is signed in and loses nothing, in a setup the journal has
to create.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (context `publicknowledge`).

Two Reader-level roles:

1. Sign in as `rvaca` (the manager) on the journal's own "Login" page.
2. Open Settings › "Users & Roles" › "Roles" and press "Create New
   Role".
3. Choose "Permission Level" "Reader", type "Role Name" "hkk22
   Subscriber" and "Abbreviation" "HKK22", tick "Allow user
   self-registration", and press "OK".
4. Press "Logout".
5. On the journal, press "Register" and fill in: "Given Name" "hkk22",
   "Family Name" "Newcomer", "Affiliation" "Newcomer", "Country"
   "Canada", email `hkk22reader@mailinator.com`, "Username"
   `hkk22reader`, "Password" and "Repeat password"
   `hkk22readerhkk22reader`; tick the privacy statement box and press
   "Register". The page reads "Registration complete"; the account holds
   the "Reader" role.
6. Open the user menu's "View Profile", tab "Roles". "Reader" is ticked;
   tick "hkk22 Subscriber" too and press "Save".
7. Press "Logout".
8. On the journal's "Login" page, sign in as `hkk22reader`.

Subscription Manager alone (OJS):

9. Press "Logout". On the journal, press "Register" and fill in "Given
   Name" "hkk22", "Family Name" "Newcomer", "Affiliation" "Newcomer",
   "Country" "Canada", email `hkk22subs@mailinator.com`, "Username"
   `hkk22subs`, "Password" and "Repeat password"
   `hkk22subshkk22subs`; tick the privacy statement box and press
   "Register".
10. Press "Logout" and sign in as `admin`. Open "Administration" ›
    "Hosted Journals", the journal's row › "Settings wizard", tab
    "Users"; search `hkk22subs`, press "Edit User", tick "Subscription
    Manager", untick "Reader", and press "OK".
11. Press "Logout". On the journal's "Login" page, sign in as
    `hkk22subs`.

**Expected**: after step 8, the journal's home page, as for an account
holding "Reader" alone. After step 11, a page the Subscription Manager
may open: the journal's home page.

**Observed**: after step 8 and after step 11, a page with the breadcrumb
"Home /" and the text "The current role does not have access to this
operation.", on OJS, OMP and OPS alike. The sign-in passes through the
old "submissions" address:

```
302 /index.php/publicknowledge/en/login/signIn -> /index.php/publicknowledge/en/submissions
302 /index.php/publicknowledge/en/submissions  -> /index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied
```

No request fails on the server and no page script fails.

## Cause

`PKPPageRouter::getHomeUrl()` (`lib/pkp/classes/core/PKPPageRouter.php`)
picks where a user lands in a context. It sends an account to the home
page only when it holds no group there, or exactly one group with
`ROLE_ID_READER` (line 420). It then tries the editorial roles, Reviewer
and Author in turn (lines 426–436). Anything left falls through to the
context's `submissions` page (line 438).

That fallback refuses everyone who reaches it. `submissions` is served by
`PKP\pages\dashboard\DashboardHandler`, whose role assignment admits the
site administrator, manager, sub-editor, author, reviewer and assistant,
never Reader or Subscription Manager, so the request ends at
`user/authorizationDenied`. An account that matched none of the earlier
branches holds none of those roles. `submissions` is what remains of the
old submissions dashboard, which admitted the same back-office roles and
never a reader; since 3.5 its `index()` only calls `redirectHome()`
again.

So the method breaks the rule "an account with no back-office role goes
to the home page": it counts the account's groups instead of asking
whether any of them has a dashboard.

The group-count test dates from 2013, when
[41d2c84f7d](https://github.com/pkp/pkp-lib/commit/41d2c84f7d33fffbaebd7a4b97c312e2365a32f6)
("Clean up old role code") wrote `redirectHome()` with `getCount() <= 1`
and the `dashboard` page as the fallback; that dashboard did not admit
readers either.
[3d998b27db](https://github.com/pkp/pkp-lib/commit/3d998b27dbc64b93fec9ec97194724a1e5c8fa68)
(2016) changed the fallback to `submissions`, and later rewrites kept
both.

Where else the same redirect is reached, checked in the code on `main`
unless marked:

- Signing in on the "Login" page: `LoginHandler::signIn()` calls
  `_redirectAfterLogin()`, which calls `redirectHome()` for an account
  with no back-office role (walked). A sign-in carrying a `source` (the
  page that sent the user to sign in) returns to that page first.
- Opening the "Login" page while signed in, and the end of "Login As" and
  its sign-out (`LoginHandler::sendHome()`).
- The typed `dashboard` and `submissions` addresses: both call
  `redirectHome()` for such an account, so both lead to the same page.
- The public menu's "Dashboard" item does not use `getHomeUrl()` for
  these accounts (`PKPNavigationMenuService` sends them to the profile).
- 3.5 has the same branches (walked). On 3.4 and 3.3 the method sends
  every account with two groups, or one group other than Reader, to
  `submissions`, whose handler has the same role assignment there, so
  the same accounts are refused (read in the code, not walked).

## Proposed fix

In pkp-lib, end `getHomeUrl()` at the context's home page instead of
`submissions`, and drop the group-count test. The fix stays in the
method that owns the rule, so every app and every caller of
`redirectHome()` gets it. The patch,
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/two-reader-roles-sign-in-access-denied/fix.diff), against the app root on `main`:

```diff
--- a/lib/pkp/classes/core/PKPPageRouter.php
+++ b/lib/pkp/classes/core/PKPPageRouter.php
@@ -417,9 +417,6 @@
                 $query->withUserId($userId)->withActive();
             })
             ->get();
-        if ($userGroups->isEmpty() || ($userGroups->count() == 1 && $userGroups->first()->role_id == Role::ROLE_ID_READER)) {
-            return $request->url(null, 'index');
-        }
 
         $roleIdsArray = $userGroups->pluck('role_id')->all();
 
@@ -435,7 +432,10 @@
             return $request->url(null, 'dashboard', 'mySubmissions');
         }
 
-        return $request->url(null, 'submissions');
+        // No role in the context, or only roles with no dashboard (Reader-level roles, the
+        // Subscription Manager): the context's home page. The "submissions" page would only
+        // refuse them, as its handler admits none of these roles.
+        return $request->url(null, 'index');
     }
 
     //
```

With `index` as the final return the early return is no longer needed:
an account with no group, or with one Reader group, reaches the final
return and lands where it does today.

Tried on `main`, OJS, OMP and OPS: after step 8 `hkk22reader` lands on
the journal's home page, and on OJS after step 11 `hkk22subs` does too.
A regression check of the roles beside it, the same with the fix and
without: an Author (`ccorino`, `aclark` on OMP) still lands on "My
Submissions", `dbarnes` on the editorial dashboard, and a newcomer
holding "Reader" alone on the home page; that newcomer typing the
`submissions` address still gets the access-denied page, since the
handler's own role check is untouched.

**Alternatives**

- Widen the special case to "every group is at the Reader level": fixes
  the two readers but leaves the Subscription Manager on the refusal and
  keeps a fallback no account can use.
- Admit Reader and Subscription Manager to `DashboardHandler`: its
  `index()` calls `redirectHome()`, which would send them back to
  `submissions` in a loop.
- Send the Subscription Manager to OJS's "Payments" page, the one
  back-office page that role opens, through an override in OJS's
  `APP\core\PageRouter`. A product choice that can follow the fix; the
  home page is a safe landing until then.

**What goes with it**

- No stored data to repair, and no API or hook changes.
- 3.5 needs its own diff, since the query above the first hunk differs
  there:
  [fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/two-reader-roles-sign-in-access-denied/fix-stable-3_5_0.diff),
  the same two changes (`git apply --check` passes on the three apps'
  3.5 pkp-lib; not walked with the fix).
- 3.4 and 3.3 still send editors and authors to `submissions`, so the
  final return cannot change there. A backport would add a test before
  it: when the account holds none of the roles `DashboardHandler`
  admits, return `index`. Not written or tried.
- The guard: a unit test of `getHomeUrl()` with two Reader-level groups
  and with a Subscription Manager group, or an end-to-end check of the
  landing after sign-in for those accounts.

Small: one method in pkp-lib, tried on `main`, plus a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/two-reader-roles-sign-in-access-denied/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/two-reader-roles-sign-in-access-denied/lib.js).
  It takes the Steps on an install freshly loaded from the default
  dataset (pkp/datasets 7912e09, 2026-10-14, PostgreSQL). From a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/two-reader-roles-sign-in-access-denied/walk.js`;
  the argument `neighbour` runs the regression check alone. The 3.5 walk
  is the same command with `PKP_E2E_LINE=stable-3_5_0` in front, on that
  line's dataset (`<app>/stable-3_5_0/pgsql`).
- Walks on 2026-10-15: the Steps on `main` and 3.5, three apps each
  (steps 9–11 on OJS only, the one app with the Subscription Manager
  role), all as Observed; then on `main` with fix.diff applied
  (`node bin/try-fix.js apply <fix.diff> ojs omp ops`, reverted after),
  and the regression check with the fix and without. After step 10 the
  stored roles read: `hkk22subs`'s Reader assignment ended, Subscription
  Manager active.
- Tips (2026-10-15): `main` OJS 378eced941, OMP f4836d4fb, OPS
  2ece50497f (lib/pkp b17fadae59 for each); `stable-3_5_0` OJS
  ca763c91cd, OMP a70bbb9c4, OPS 44aec6e131 (lib/pkp 4045d9241e);
  `stable-3_4_0` lib/pkp 55c8e406b3 (apps OJS daf0ca971d, OMP 0aec65441,
  OPS acd8ae704b); `stable-3_3_0` lib/pkp 5e84acd11b (apps OJS
  d7d9dd14ec, OMP 8e72fc883, OPS c5532e2161).
- Code reads beyond the Cause's lines: `LoginHandler` on `main`
  (`signIn()` lines 122–235, the `source` return at 190–193,
  `_redirectAfterLogin()` 103–117, `sendHome()` 581–585);
  3.5 `getHomeUrl()` lines 404–442; 3.4 `classes/core/PKPPageRouter.php`
  lines 440–456 and `pages/dashboard/DashboardHandler.php` line 48; 3.3
  `classes/core/PKPPageRouter.inc.php` lines 421–434 and
  `DashboardHandler.inc.php` line 33; `pages/submissions/index.php` on
  each line. No app overrides `getHomeUrl()` (each app's
  `classes/core/PageRouter.php` on `main`). OMP's 2013 dashboard
  ([893720fbd](https://github.com/pkp/omp/commit/893720fbdf)) admitted
  the same six roles.
- Trace: `git blame` on `main` puts the test and the `submissions`
  return on
  [0ae901e55b](https://github.com/pkp/pkp-lib/commit/0ae901e55b81a7789a1db3594ce4e0966df2ba67)
  (2025, an indentation refactor); on 3.3 on
  [78aaf4eef2](https://github.com/pkp/pkp-lib/commit/78aaf4eef20ab1fe6f3eded3b328b8e760ba5aaf)
  (2020, the same test rewritten for a DAO iterator), then 3d998b27db
  (2016) and 41d2c84f7d (2013), which replaced older role code; not
  traced further.
- Upstream: `pkp/pkp-lib#488` (closed 2015) reported the same page for a
  reader sent to the dashboard after registration, fixed by calling
  `redirectHome()`; it is not about two Reader-level roles or the
  Subscription Manager.
- Unverified: how many journals run a custom Reader-level role. The
  `source` return was read in the code, not walked.
- Not driven: 3.4 and 3.3 (code only); the typed `dashboard` address
  for these accounts (code); MySQL (the fault does not depend on the
  database).
