# A Site Administrator holding only Reader in a journal gets an "Error" window on every editorial page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the old "Submissions" page)
  - 3.3: none (code; the old "Submissions" page)
- **Introduced** `pkp/pkp-lib#9469` for `pkp/pkp-lib#8887` · [aafa2d5](https://github.com/pkp/pkp-lib/commit/aafa2d56e5e0402ddf100d04465e3aa77a0279c9) · 2023-09-26 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-03)
- **Tracked in** U08 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a22)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Site Administrator whose manager role in a journal has been removed keeps
the manager's side menu there. Every editorial page of that journal then
opens with a window "Error", "The current role does not have access to
this operation.". On 3.5 the dashboard's page script also fails in the
browser.

"Editor Dashboard" offers none of its usual lists ("Assigned to me",
"Active submissions" and the rest). On `main` it holds only the search
box, which finds nothing. On 3.5 the page shows the journal's submissions
in one list headed "undefined (…)". The window closes with "OK" and the
page behind it works (Tools, Statistics, a journal's Settings).

The manager role can only be removed while the administrator holds
another role there, so in practice this is an administrator left with
Reader alone.

## Impact

- **Lost**: nothing stored. The administrator loses the dashboard's
  lists and counts, and dismisses the window on every page.
- **Who**: a Site Administrator who holds Reader alone in a journal, on
  every editorial page of that journal. An administrator with no role at
  all there would meet the same in the code, but the screens cannot leave
  one in that state: they make no second administrator, and the creator
  of a journal becomes its manager.
- **Way round**: giving the administrator a manager role in the journal
  again restores the dashboard.

Low: a rarely met setup, nothing lost, and a way round on screen. It would
be medium on installs with administrators who hold no role in journals
they did not create.

## Steps to reproduce

Preconditions:
- PKP's default test dataset, OJS `main` (OMP and OPS the same, with the
  names in brackets). `admin` holds "Site administrator" and "Journal
  manager" in `publicknowledge`.

Steps:
1. Sign in as `admin`.
2. User menu › "View Profile" › "Roles": under "Journal of Public
   Knowledge" ("Public Knowledge Press", "Public Knowledge Preprint
   Server"), tick "Reader" and press "Save".
3. Settings › "Users & Roles" › "Users": search "admin", then the row's
   "…" › "Edit".
4. On the "Journal manager" ("Press manager", "Preprint Server manager")
   row press "Remove Role", then "Remove Role" in the window.
5. Open "Editor Dashboard" in the side menu
   (`/index.php/publicknowledge/en/dashboard/editorial`).
6. Open "Tools", "Statistics" › "Articles" ("Monographs", "Preprints") and
   "Settings" › "Website" from the side menu.

Step 2 is needed only to make step 4 possible: without it, "Remove Role"
answers "You cannot remove the role. At least one role must be assigned
to the user.".

**Expected**: as before step 2, when `admin` was the journal's manager:
"Editor Dashboard" lists "Assigned to me", "Active submissions" and the
other views with their counts, and no page opens with an error.

**Observed**: each page of steps 5 and 6 opens with this window:

```
Error
The current role does not have access to this operation.
OK
```

The side menu offers "Editor Dashboard", "Start A New Submission", "DOIs",
"Settings", "Content" (OJS, OMP), "Statistics", "Tools" and
"Administration". "Editor Dashboard" holds the "Search submissions" box and
no views; the dashboard opens on "Search Results (0)", "No Items". The
side menu's count request answers 401 on every page:

```
GET /index.php/publicknowledge/api/v1/_submissions/viewsCount?assignedWithRoles[]=1&assignedWithRoles[]=16&assignedWithRoles[]=17&assignedWithRoles[]=4097
401 {"error":"user.authorization.roleBasedAccessDenied","errorMessage":"The current role does not have access to this operation."}
```

and on the dashboard `GET …/api/v1/_submissions/assigned?…` answers the
same 401. Tools, Statistics and the journal's Settings › Website open
behind the window. On a press and a server, Settings › Website gives the
access-denied page instead, a separate fault: there an administrator
without a manager role is refused every Settings page
([Journal identity & about pages, A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#a1)).

[3.5: "Editor Dashboard" has no search box and no views. The dashboard's
heading reads "undefined (20)" (OMP "undefined (18)", OPS
"undefined (19)") over a list of the journal's submissions, and on OJS and
OMP the browser console logs `TypeError: ….currentUserAssignedRoles.forEach
is not a function` 26 and 24 times while the list renders.]

## Cause

The side menu follows pkp/pkp-lib#7392, under which a Site Administrator
acts as a manager in every context. `PKPTemplateManager::setupBackendPage()`
builds the menu from the handler's `ASSOC_TYPE_USER_ROLES`.
`UserRolesRequiredPolicy` fills that from the context's groups and the
site's, so the administrator's site-wide `ROLE_ID_SITE_ADMIN` grants
"Editor Dashboard" and the manager's entries. `DashboardHandler` admits the
same role.

The editorial dashboard's own code, added by pkp/pkp-lib#8887, does not
count that role:

- `PKPBackendSubmissionsController::getGroupRoutes()` (lib/pkp
  `api/v1/_submissions/`) gives the `viewsCount` and `assigned` routes a
  `has.roles` list of manager, sub-editor, assistant, author (and
  reviewer), without `ROLE_ID_SITE_ADMIN`. `PolicyAuthorizer` builds its
  role map from those lists, and `RoleBasedHandlerOperationPolicy` refuses
  the request with `user.authorization.roleBasedAccessDenied`. The side
  menu (ui-library `SideNav.vue`) asks `viewsCount` for the site admin's
  views on every page that shows "Editor Dashboard", and `useFetch`'s
  default error handling turns the 401 into the window.
- `Repository::getDashboardViews()` and `getSearchView()` (lib/pkp
  `classes/submission/Repository.php`) read the user's roles with
  `RoleDAO::getByUserId($user->getId(), $context->getId())`, which matches
  the context's groups only. The site admin role never reaches `$roleIds`,
  so no editorial view (each lists `ROLE_ID_SITE_ADMIN` among its roles)
  passes `filterViewsByUserRoles()`. `$canAccessUnassignedSubmission`,
  which tests for `ROLE_ID_SITE_ADMIN`, stays false. `getDashboardViews()`
  feeds the side menu's "Editor Dashboard" group
  (`PKPTemplateManager::setupBackendPage()`), the dashboard page
  (`PKPDashboardHandler`) and the counts (`getViewsCount()`).

The 3.4 "Submissions" page this replaced read the roles from
`ASSOC_TYPE_USER_ROLES` and called `_submissions`, which admits the site
admin. So on 3.4 an administrator without a role listed every submission
there.

Reach:
- An administrator with no role at all in the journal takes the same path
  (code): `UserRolesRequiredPolicy` adds the site admin role either way.
- On 3.5 the dashboard, without views, falls back to `_submissions`, which
  admits the site admin and filters by the request's context
  (`getSubmissionCollector()`), hence the one unlabelled list (code; 20 is
  the dataset journal's count).
- The DOIs page's list and the workflow window call the submissions API
  (`PKPSubmissionController`), whose seven route groups admit no
  `ROLE_ID_SITE_ADMIN` either. The DOIs list answers 401 (checked on
  screen), and so does opening a submission the fixed dashboard lists
  (below). This gap predates the dashboard: 3.4's `PKPSubmissionHandler`
  lists the same roles.

## Proposed fix

A proposal: make the dashboard count the site admin role, the way
pkp/pkp-lib#7392 did for the other routes. Add `ROLE_ID_SITE_ADMIN` to the
`viewsCount` and `assigned` routes. In `getDashboardViews()` and
`getSearchView()`, add it to the roles read when the user holds it
site-wide, with the same `hasRole([ROLE_ID_SITE_ADMIN], SITE_CONTEXT_ID)`
check that `userComment\Repository` and `PKPNavigationMenuService` make
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-without-role-dashboard-error/fix.diff)):

```diff
--- a/lib/pkp/classes/submission/Repository.php
+++ b/lib/pkp/classes/submission/Repository.php
@@ getDashboardViews() and getSearchView() alike
         foreach ($roles as $role) {
             $roleIds[] = $role->getRoleId();
+        }
+        // The site admin role is held site-wide, not in the context (pkp/pkp-lib#7392)
+        if ($user->hasRole([Role::ROLE_ID_SITE_ADMIN], Application::SITE_CONTEXT_ID)) {
+            $roleIds[] = Role::ROLE_ID_SITE_ADMIN;
         }
--- a/lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController.php
+++ b/lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController.php
@@ the 'assigned' and 'viewsCount' routes alike
                 self::roleAuthorizer([
+                    Role::ROLE_ID_SITE_ADMIN,
                     Role::ROLE_ID_MANAGER,
```

Tried on `main` only, in all three apps. The steps then showed every view
with its count ("Active submissions" 17, 16 and 1) and no window on the
dashboard, Tools, Statistics or Settings. The journal's manager, a section
editor and an author saw the same dashboard, counts and refusals with the
fix in and out.

**Alternatives**
- Hide "Editor Dashboard" from an administrator without an editorial role
  in the journal: ends the window, but goes against pkp/pkp-lib#7392 and
  leaves the menu's other manager entries, which work.
- Treat the site admin as a manager centrally (`PolicyAuthorizer`'s role
  map, or `RoleBasedHandlerOperationPolicy`): would also open the
  submissions API, so the workflow and the DOIs list. It changes every
  API's authorization at once, a decision on how far #7392 reaches; with
  the recommended fix in, a listed submission still opens with the
  "Error" window until that is decided.

**What the fix touches**
- A site administrator who holds Section editor or Assistant in a journal,
  and no manager role, now counts as able to see unassigned submissions:
  their "Active submissions", the other views and the search show every
  submission in that journal, not only their assigned ones. That follows
  #7392's rule and is likely intended; not walked. Users who are not site
  administrators are unchanged: `$selectedRoleIds` keeps the added role out
  of the author's and reviewer's views, and `hasRole()` is false for them.
- Backport to 3.5: the route lines and the `getDashboardViews()` hunk
  apply; 3.5 has no `getSearchView()`. Whether the fix also ends 3.5's
  `TypeError` and "undefined (…)" heading is unverified.
- The guard: a unit test on `getDashboardViews()` for a site admin with no
  editorial role in the context, or an e2e case on U08's Planned list (the
  administrator with Reader alone opens "Editor Dashboard" and sees the
  views with no window).

Small: a few lines in two pkp-lib files, following #7392's pattern, and a
test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-without-role-dashboard-error/walk.js)
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-without-role-dashboard-error/lib.js),
  run on an install reset to the default dataset (pkp/datasets `e8dafbc`):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/admin-without-role-dashboard-error/walk.js`
  (`noreader` as its argument walks the steps without step 2, `nb` the
  neighbour check). Before step 2 it reads the dashboard as the dataset's
  `admin` (the control: views, counts, no window). It also reads the DOIs
  page, and, only when the dashboard lists "Active submissions", that view
  and its first submission.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/admin-without-role-dashboard-error/fix.diff ojs omp ops`.
- Walked: `main` and 3.5 on OJS, OMP and OPS, the steps and `noreader`,
  PostgreSQL. Tips: `main` ojs b84f8e2e44 (lib/pkp ddd8ab243a,
  lib/ui-library 64d67363), omp 3b0ecf794c and ops c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5); `stable-3_5_0` ojs 091fb65453,
  omp 9c5e24246c, ops 38b61882d3 (lib/pkp cf3f984335, lib/ui-library
  d4e01883).
- The no-role state could not be reached on screen: the dataset has one
  administrator, the manager `rvaca`'s "Remove User" on `admin` is refused
  ("You do not have sufficient permissions to administer this user. …"),
  and `admin`'s own row offers no "Remove User". The code reads behind
  Who: no screen assigns `ROLE_ID_SITE_ADMIN` (`UserGridHandler` and
  `PKPUserController` only test it), and `PKPContextService::add()` makes
  the creating user the new context's manager.
- Code read: on `main` and 3.5, `PKPTemplateManager::setupBackendPage()`,
  `UserRolesRequiredPolicy`, `PolicyAuthorizer`,
  `RoleBasedHandlerOperationPolicy`, `PKPBackendSubmissionsController`,
  `PKPSubmissionController`, `Repository::getDashboardViews()` /
  `getSearchView()` / `mapDashboardViews()`, `RoleDAO::getByUserId()`,
  `PKPDashboardHandler`, ui-library `SideNav.vue`. 3.4 and 3.3 (pkp-lib
  `stable-3_4_0` 9e41f10273, `stable-3_3_0` ac3fa73402): no
  `DashboardView`; `PKPBackendSubmissionsHandler` admits
  `ROLE_ID_SITE_ADMIN`, and `DashboardHandler` (3.4) and the `_submissions`
  list read `ASSOC_TYPE_USER_ROLES`, where `UserRolesRequiredPolicy` adds
  the site admin role. The fault is in pkp-lib alone; the apps' own
  branches were not read.
- Introduced: `git blame` on the `viewsCount` route lines leads to
  fca196cf22 (pkp/pkp-lib#10766, which moved the routes), and `git log -S`
  to aafa2d5, which added the route without the site admin and
  `getDashboardViews()` with the context-only role read.
- Not driven: a site administrator holding Section editor or Assistant
  without a manager role (needs an accepted invitation); MySQL (nothing
  here depends on the database).
