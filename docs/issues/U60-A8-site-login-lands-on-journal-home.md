# Signing in on the site's Login page lands on the journal's home page, not its Dashboard

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/omp` commit, no PR · [7446048](https://github.com/pkp/omp/commit/74460485235a67de014608476c308ebe7b33c510) · 2012-07-27 · Alec Smecher (asmecher); moved into pkp-lib for every app by [325e411](https://github.com/pkp/pkp-lib/commit/325e41132c02291fca7a1976bbe073cbfec70252) (2017-03-28, same author)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U60 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a8)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a site with a "Journal redirect" saved, or with only one journal,
signing in on the site's Login page lands the Site Administrator,
editors, authors and reviewers on the journal's home page, as if they
were readers. Signing in on the journal's own Login page takes them to
their Dashboard.

The site's Login page is where "Logout" in the site's Administration
leads, so the Site Administrator meets this most often. Other users
reach that page by a bookmark or a typed address.

## Impact

- **Lost.** Nothing. The user is signed in and one click away from
  their Dashboard. No message or error appears.
- **Who.** The Site Administrator and the journal's editors, authors and
  reviewers, whenever they sign in on the site's Login page
  (`/index.php/index/en/login`). Everyday ways there:
  - "Logout" on the site's Administration pages, which ends on that
    page, so the next sign-in starts there;
  - a bookmark or a typed address.

  While the site has a target journal, the site's home page never
  shows, so its "Login" link is no way there.
- **Way round.** The "Dashboard" link in the home page's header.

Low: nothing is lost and the task gets done one click later.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (OMP and OPS in brackets).
  Its one journal is "Journal of Public Knowledge" [OMP "Public
  Knowledge Press", OPS "Public Knowledge Preprint Server"], path
  `publicknowledge`. `admin` (password `admin`) is the Site
  Administrator and a Journal Manager there; `dbarnes` is its editor.
- "Journal redirect" is offered on Site Settings only while the site
  holds two journals, so step 4 creates a second one.

One journal on the site:

1. Signed out, open the site's Login page,
   `/index.php/index/en/login`.
2. Sign in as `admin`.
3. Control: "Logout". Open the journal's own Login page,
   `/index.php/publicknowledge/en/login`, and sign in as `admin`.

With a "Journal redirect":

4. Signed in as `admin`, open Administration › "Hosted Journals" [OMP
   "Hosted Presses", OPS "Hosted Servers"] › "Create Journal" [OMP
   "Create Press", OPS "Create Server"]. Title "u60f Second Journal",
   initials "U60F", contact name "u60f Second Journal", contact email
   `u60f@mailinator.com`, country "Canada", path `u60fsecond`, English
   ticked as the language and the primary one, "Enable this journal to
   appear publicly on the site" ticked; "Save".
5. Administration › "Site Settings" › "Site Setup" › "Settings":
   "Site Name" (English) "u60f Site", since the dataset's site has none
   and the form will not save without one; "Journal redirect" [OMP
   "Press redirect", OPS "Server redirect"] set to "Journal of Public
   Knowledge" [the press, the server]; "Save".
6. "Logout". Open the site's Login page, `/index.php/index/en/login`,
   and sign in as `admin`.
7. "Logout". Open the site's Login page, `/index.php/index/en/login`,
   again and sign in as `dbarnes`.
8. Control: "Logout". Open the journal's own Login page,
   `/index.php/publicknowledge/en/login`, and sign in as `dbarnes`.

**Expected.** After steps 2, 6 and 7, the journal's Dashboard, "Assigned
to me" (`/index.php/publicknowledge/en/dashboard/editorial`), as after
steps 3 and 8.

**Observed.** After steps 2, 6 and 7, the journal's home page, headed
"Journal of Public Knowledge" [the press's, the server's name]. The
sign-in goes to the site's home page, which forwards to the journal:

```
POST /index.php/index/en/login/signIn  -> 302 /index.php/index/en/index
GET  /index.php/index/en/index         -> 302 /index.php/publicknowledge/en
```

## Cause

`LoginHandler::_redirectAfterLogin()`
(`lib/pkp/pages/login/LoginHandler.php`, lines 105–113) decides where a
sign-in without a `source` goes. When the site has a target context (the
request's own, the only enabled one, or the site's redirect, from
`PKPHandler::getTargetContext()`), it means to send a user holding one
of the listed roles (Site Administrator, Manager, Sub-editor, Author,
Reviewer, Assistant) to that context's `dashboard`. Anyone else goes to
`PKPPageRouter::redirectHome()`.

It reads the user's roles from
`getAuthorizedContextObject(Application::ASSOC_TYPE_USER_ROLES)`. That
object is filled by `UserRolesRequiredPolicy`, which
`PKPHandler::authorize()` adds only when a user is already signed in as
the request starts. A sign-in request starts signed out, so the roles
are always empty and the branch never runs. Every sign-in falls through
to `redirectHome()`.

In a journal that does no harm: `PKPPageRouter::getHomeUrl()` reads the
signed-in user's roles itself and sends editors to
`dashboard/editorial`, reviewers to `dashboard/reviewAssignments`,
authors to `dashboard/mySubmissions` and readers to the home page. At
the site level, `getHomeUrl()` has no context and returns the site's
home page. When the site has a target context, `IndexHandler::index()`
forwards that page to the journal's home.

7446048 (OMP, 2012, "Home / user home tweaks") added the role check to
OMP's own `_redirectAfterLogin()`. Until then, that method sent everyone
to the target press's Dashboard; the check was meant to send readers to
the home page instead. Because the roles it reads are empty during a
sign-in, this branch has sent nobody to the Dashboard since. 325e411
(2017) moved the method into pkp-lib for all three apps.

Reach:

- **A sign-in that must first change its password**
  (`savePassword()`) ends in `sendHome()`, which is `redirectHome()`.
  When it starts on the site's Login page, the form posts at the site
  level, and the user lands on the journal's home page the same way
  (read in the code, not walked).
- **"Login As"** (`signInAsUser()`) also ends in `sendHome()`, but it
  is offered only from a journal's user and participant lists. So it
  runs in that journal, where `getHomeUrl()` picks the right page (read
  in the code). Not affected.

## Proposed fix

Read the signed-in user's roles in the target context, instead of the
roles authorized before the sign-in
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-login-lands-on-journal-home/fix.diff)):

```diff
--- a/lib/pkp/pages/login/LoginHandler.php
+++ b/lib/pkp/pages/login/LoginHandler.php
@@ -103,11 +102,14 @@
     public function _redirectAfterLogin($request)
     {
         $context = $this->getTargetContext($request);
+        $user = $request->getUser();
 
         // If there's a context, send them to the dashboard after login.
-        if ($context && $request->getUserVar('source') == '' && array_intersect(
+        // The roles authorized for this request were read before the user signed in, so read the
+        // signed-in user's roles in that context instead.
+        if ($context && $user && $request->getUserVar('source') == '' && $user->hasRole(
             [Role::ROLE_ID_SITE_ADMIN, Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR, Role::ROLE_ID_AUTHOR, Role::ROLE_ID_REVIEWER, Role::ROLE_ID_ASSISTANT],
-            (array) $this->getAuthorizedContextObject(Application::ASSOC_TYPE_USER_ROLES)
+            $context->getId()
         )) {
             return $request->redirect($context->getPath(), 'dashboard');
         }
```

The diff is shortened here. The linked file also drops
`use APP\core\Application;`, which has no other user in the file. Its
paths are relative to the app root (`patch -p1` there, `-p3` from a
pkp-lib checkout).

`User::hasRole()` is how pkp-lib asks a user for its roles in a context
elsewhere. `PKPRequest::getUser()` returns the user the sign-in has just
authenticated. `PKPDashboardHandler::authorize()` forwards the bare
`dashboard` address through `redirectHome()`, so each user reaches the
same Dashboard page as from the journal's own Login page.

The Site Administrator role belongs to the site, not to a journal.
`hasRole()` reads one context's roles (`RoleDAO::getByUserId()`), so the
list's `ROLE_ID_SITE_ADMIN` entry no longer matches anything. That is
the choice here:

- A Site Administrator who holds a role in the journal, as the dataset's
  `admin` does, matches through that role.
- One with no role in the journal lands on the journal's home page,
  just as on the journal's own Login page.

Checking the site role on its own would not change that landing:
`getHomeUrl()` sends a user with no role in the journal from
`dashboard` to the home page. The entry can be dropped with the fix,
and no landing changes; the tried diff keeps it so as to touch only the
fault.

Tried on `main` on the three apps:

- Steps 2, 6 and 7 landed on "Assigned to me" (`dashboard/editorial`).
- On the site's Login page under the redirect, an author landed on
  "Active submissions" (`dashboard/mySubmissions`), and a reviewer
  (OJS, OMP) on `dashboard/reviewAssignments`.
- Sign-ins on the journal's own Login page (administrator, editor,
  author, reviewer) landed on the same pages with the fix and without
  it; with the fix they pass through `dashboard`, one extra redirect.
- With two journals and no redirect, there is no target, and the
  site's Login page still led to the site's home page.

- **Alternatives.**
  - Sending every user to the target's `dashboard`, without a role
    check, gives the same landings, because the dashboard forwards a
    reader to the home page. But a reader then goes through a page that
    is not theirs, which is what 7446048 set out to avoid.
  - Adding `UserRolesRequiredPolicy` again after `Validation::login()`
    would refill the authorized roles, but only the request context's
    (the site's) roles, so only a Site Administrator would be covered.
- **What goes with it.**
  - `savePassword()` (Reach) is left outside the tried fix. To cover
    it, call `$this->_redirectAfterLogin($request)` there in place of
    `sendHome()` after a successful `Validation::login()`; not tried.
  - No stored data, API or plugin hook is involved.
  - On 3.5, 3.4 and 3.3 the authorized roles are empty during a sign-in
    in the same way, and `User::hasRole()` exists on each. So the change
    applies as written, by hand on 3.3 (`LoginHandler.inc.php`).
  - The guard is an end-to-end check that a sign-in on the site's Login
    page, under a redirect, lands on the journal's Dashboard.

Small: one condition in one shared method.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-login-lands-on-journal-home/walk.js),
  with `lib.js` beside it. Its header gives the command, for an install
  freshly loaded from the default dataset. With `neighbour` as its
  argument, it walks the fix's neighbour checks.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL;
  nothing here depends on the database. Dataset: pkp/datasets 566bb1f
  (2026-10-03). 3.5 showed the same landings and redirects on each app.
  No server error came from any sign-in.
- Tips:
  - `main`: OJS ff004d0973 (pkp-lib 987776cd04), OMP 3b0ecf794c and
    OPS c8af945bb7 (pkp-lib 3dc90c81a6).
  - `stable-3_5_0`: OJS c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246c
    and OPS 38b61882d3 (pkp-lib cf3f984335).
  - `stable-3_4_0`: OJS d68934d0d1 (pkp-lib 767353f4fe), OMP 0aec65441f
    and OPS acd8ae704b (pkp-lib df13621c2d).
  - `stable-3_3_0`: OJS ac77c9fb35 (pkp-lib f6ab331645), OMP 8e72fc8836
    and OPS c5532e2161 (pkp-lib d446601ebe).
- Code reads:
  - `LoginHandler::_redirectAfterLogin()` and `signIn()` on `main`, 3.5,
    3.4 and 3.3 (pkp-lib `stable-3_4_0` 767353f4fe, `stable-3_3_0`
    ac3fa73402): the same role check on each.
  - `PKPHandler::authorize()` on each branch: `UserRolesRequiredPolicy`
    is added only when a user is signed in at the request's start (3.3
    also for the API router). `PKPHandler::getTargetContext()` on each:
    the only enabled context, or the site redirect when there are two
    or more. OJS `IndexHandler::index()` on 3.4 and 3.3: forwards to
    the target.
  - On `main`:
    - `UserRolesRequiredPolicy::effect()`;
    - `PKPPageRouter::getHomeUrl()` and `redirectHome()`;
    - `PKPDashboardHandler::authorize()`;
    - `User::hasRole()`, `getRoles()` and `RoleDAO::getByUserId()`;
    - `PKPRequest::getUser()`;
    - `LoginHandler::signOut()`, `savePassword()`, `signInAsUser()`
      and `sendHome()`;
    - `loginChangePassword.tpl`;
    - ui-library `useUserAuth.js`, whose "Logout" is `login/signOut` at
      the page's own context.

    The Logout landing was also walked by its address,
    `/index.php/index/login/signOut`, which ended on
    `/index.php/index/en/login`.
  - History: `git log -S` on the condition leads to 325e41132c in
    pkp-lib, which copied OMP's override. In OMP it leads to fed44f8bf
    (2011, everyone to the Dashboard) and 7446048 (2012, the role
    check).
- Not driven: a Journal Assistant or Section Editor, a user with a
  role only in another journal, a forced password change, and 3.4 and
  3.3.
- Tracker search (2026-10-04): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library for the sign-in landing on the home page instead
  of the Dashboard, the site redirect and login, `_redirectAfterLogin`,
  `LoginHandler`, `getTargetContext` and `ASSOC_TYPE_USER_ROLES`. None is
  about this landing. `pkp/pkp-lib#8971` (the user menu's "Dashboard"
  link for an author with no submission) is another fault.
