# On a preprint server, a user given a "Reviewer"-level role lands after every sign-in on a page headed "undefined (0)" under an "Error" window

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code; such a user lands on the "Submissions" page)
  - 3.3: none (code; such a user lands on the "Submissions" page)
- **Introduced** [e9e12edf5d](https://github.com/pkp/ops/commit/e9e12edf5d5c10a1eca202117102769fb5012353)
  for `pkp/pkp-lib#10835` · 2025-03-11 · Taslan Graham (taslangraham)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U28 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#ops1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a preprint server, a manager can create a role at the "Reviewer"
permission level and invite a user to it. After every sign-in that user
lands on a reviewer page whose script fails in the browser: it is headed
"undefined (0)" with an empty table, under an "Error" window that reads
"The current role does not have access to this operation.". A user who
is also an Author expected to land on their own submissions, as before
the invitation.

An Author still reaches their submissions through "My Submissions as
Author" in the side menu. The menu also shows a "My Assignments as
Reviewer" group, which is empty. A user who holds only the new role can
do nothing on that page until a manager ends the role or adds another.

The install does not create such a role: a preprint server has no review
stage and no reviewer role, but "Create New Role" still offers the
level. The fix is three guards in pkp-lib.

## Impact

- **Lost.** Nothing is lost. The user's landing page is replaced by a
  broken one, and the "Error" window blames their role.
- **Who.** Every holder of a "Reviewer"-level role on a preprint server,
  even if they are an Author too.
- **Way round.** An Author presses "OK", then "My Submissions as Author"
  in the side menu. A user who holds only the new role has none of their
  own: a manager ends the role or adds another on Users & Roles. Once the
  role has ended, the user lands where they did before (code).

Low: the task gets done, in a setup only a manager's own choice brings
about. It would be medium on a server whose manager lets newcomers
choose such a role on the registration form.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), OPS (server
  `publicknowledge`). `rvaca` is a Preprint Server manager; `ccorino`
  holds "Author" and "Reader" and owns preprint 1.
- A mail catcher (Mailpit, MailHog) on the SMTP port the dataset's
  `config.inc.php` names (`smtp_server = localhost`, `smtp_port = 1025`),
  to read the invitation emails of steps 4 and 11.
- The dataset has no role at the "Reviewer" level on OPS, so step 2
  creates one.

Beside Author:

1. Sign in as `rvaca`. Open Settings › Users & Roles and its "Roles" tab.
2. Press "Create New Role". Choose the "Permission level" "Reviewer",
   type the "Role Name" "Referee" and the "Abbreviation" "REF", press
   "OK".
3. On the "Users" tab press "Invite to a role". Type
   `ccorino@mailinator.com` and press "Search User". Choose the role
   "Referee" and today as its start date, press "Save And Continue", then
   "Invite user to the role".
4. Sign out. Open the invitation email to `ccorino@mailinator.com`,
   follow its "Accept Invitation" link and press "Accept And Continue to
   OPS".
5. Sign in as `ccorino` on the server's login page
   (`/index.php/publicknowledge/en/login`).
6. Press "OK" in the "Error" window.
7. Press "Filters", then "Apply Filters". Press "OK" again.
8. In the side menu press "My Assignments as Reviewer".
9. In the side menu press "My Submissions as Author", then "Active
   submissions".

Alone:

10. As `rvaca`, press "Invite to a role" again for
    `referee@mailinator.com`, an address with no account: "Search User",
    a given and a family name, the role "Referee", today, "Save And
    Continue", "Invite user to the role".
11. Signed out, follow that email's link. Create the account (a
    username, a password, the privacy box, "Save and continue"; a
    country, "Save and continue"), then press "Accept And Continue to
    OPS".
12. Sign in with the new account on the server's login page, then type
    the `submissions` address
    (`/index.php/publicknowledge/en/submissions`).

**Expected.** Steps 5 and 12 land on a page that works for the user: for
`ccorino` their own list, "Active submissions (1)", as before the
invitation; for the newcomer the server's home page, as for a Reader.
The side menu shows no "My Assignments as Reviewer" group.

**Observed.** Steps 5 and 12 land on
`/index.php/publicknowledge/en/dashboard/reviewAssignments`. The page is
headed "undefined (0)", its table reads "No Items" over "Showing 0 to 0
of 0", and an "Error" window over it reads "The current role does not
have access to this operation." with "OK". Each load of the page logs a
script error in the browser's console, and the list's request is refused:

```
TypeError: Cannot read properties of undefined (reading 'id')
GET /index.php/publicknowledge/api/v1/_submissions?offset=0&count=30&page=1&perPage=30  →  401
```

After step 6 the empty page remains. In step 7 the request is refused
again and the "Error" window reopens. In step 8 the group expands to
nothing and the page stays. Step 9 opens "Active submissions (1)" with
preprint 1. In step 12 the `submissions` address leads back to the same
page.

On a journal (`ccorino`) and a press (`aclark`) the same steps, with
every review stage box ticked in step 2 ("Review"; on a press "Internal
Review" and "External Review"), land both users on "Action Required by
me (0)" with no window and no script error.

## Cause

OPS has no reviewer lists, but pkp-lib still sends every holder of a
"Reviewer"-level role to the reviewer dashboard. OPS's
`APP\submission\Repository::mapDashboardViews()`
(`classes/submission/Repository.php`, lines 153–166 on `main`) passes
only the six editorial and author view types to pkp-lib's map, so
`getDashboardViews()` returns no view for `ROLE_ID_REVIEWER`. The
Introduced commit added that override to give OPS its own views.

Three places in pkp-lib key on the role level alone and never ask
whether the application has such views:

- `PKPPageRouter::getHomeUrl()` (`classes/core/PKPPageRouter.php`, lines
  430–432) returns `dashboard/reviewAssignments` for anyone at the
  Reviewer level, and checks it before the Author level. Sign-in and the
  `submissions` and `dashboard` addresses all redirect there, and
  `PKPNavigationMenuService` (line 309) gives the public site's
  "Dashboard" link the same address.
- `PKPDashboardHandler::__construct()`
  (`pages/dashboard/PKPDashboardHandler.php`, lines 101–104) opens the
  `reviewAssignments` operation to `ROLE_ID_REVIEWER`, and OPS's
  `pages/dashboard/index.php` routes it.
- `PKPTemplateManager` (`classes/template/PKPTemplateManager.php`, lines
  1256–1276) adds the "My Assignments as Reviewer" menu group whenever
  the user has the level, on OPS with an empty submenu.

The page then starts with `views: []`. In ui-library,
`dashboardPageStore.js` falls back to `views.value[0].id` (lines
114–115), which throws the TypeError. The heading prints
`store.currentView.name`, hence "undefined". With no view there is no
`op`, so the list is requested from the bare `_submissions` address,
which only managers may call, and the 401 opens the "Error" window.

The role itself comes from `PKPApplication::getRoleNames()`, which
offers `ROLE_ID_REVIEWER` in every application, so OPS's "Create New
Role" lists "Reviewer".

Reach, checked in the code on `main` unless marked:

- Every holder of a Reviewer-level role on OPS, alone or beside Author
  or Reader (both walked). A holder who is also a manager, moderator or
  assistant lands on the editorial dashboard, since `getHomeUrl()`
  checks those levels first, but still gets the empty menu group.
- OJS and OMP keep pkp-lib's full map, so their reviewer views exist
  (walked).
- On 3.4 and 3.3 `getHomeUrl()` returns `submissions` for every role,
  and that page and its list request accept the Reviewer level.

## Proposed fix

In pkp-lib, offer the reviewer dashboard only where the application has
a review stage, in the three places that now key on the role level
alone. The patch is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-reviewer-level-role-lands-on-undefined-list/fix.diff),
against the app root:

```diff
--- a/lib/pkp/classes/core/PKPPageRouter.php
+++ b/lib/pkp/classes/core/PKPPageRouter.php
@@ getHomeUrl()
         $roleIdsArray = $userGroups->pluck('role_id')->all();
 
+        // An application without a review stage has no reviewer dashboard
+        if (!array_intersect([WORKFLOW_STAGE_ID_INTERNAL_REVIEW, WORKFLOW_STAGE_ID_EXTERNAL_REVIEW], Application::getApplicationStages())) {
+            $roleIdsArray = array_diff($roleIdsArray, [Role::ROLE_ID_REVIEWER]);
+            if (!array_diff($roleIdsArray, [Role::ROLE_ID_READER])) {
+                return $request->url(null, 'index');
+            }
+        }
--- a/lib/pkp/pages/dashboard/PKPDashboardHandler.php
+++ b/lib/pkp/pages/dashboard/PKPDashboardHandler.php
@@ __construct()
-        $this->addRoleAssignment(
-            Role::ROLE_ID_REVIEWER,
-            ['reviewAssignments']
-        );
+        if (array_intersect([WORKFLOW_STAGE_ID_INTERNAL_REVIEW, WORKFLOW_STAGE_ID_EXTERNAL_REVIEW], Application::getApplicationStages())) {
+            $this->addRoleAssignment(
+                Role::ROLE_ID_REVIEWER,
+                ['reviewAssignments']
+            );
+        }
--- a/lib/pkp/classes/template/PKPTemplateManager.php
+++ b/lib/pkp/classes/template/PKPTemplateManager.php
@@ the reviewer menu group
-                            $menu['reviewAssignments'] = [ … ];
+                            if ($viewsData->isNotEmpty()) {
+                                $menu['reviewAssignments'] = [ … ];
+                            }
```

The rule belongs to pkp-lib, which decides where each level lands, and
`Application::getApplicationStages()` is how pkp-lib already asks what an
application's workflow has (the section form directly, the role window's
stage boxes through `WorkflowStageDAO::getWorkflowStageTranslationKeys()`).
The two tests differ on purpose. The router and the handler have no
views at hand, so they ask for the stages; the menu has just built the
reviewer's views, so it asks whether there are any. On OPS both say no.

In `getHomeUrl()` the early return matters: a user left with no level
but Reader must go to the home page, because the `submissions` fallback
redirects home again.

Tried on `main`, every step. On OPS `ccorino` lands on "Active
submissions (1)" with no reviewer group in the side menu, and step 9
opens the same list. The newcomer lands on the server's home page, and
the `submissions` address leads there too. The typed
`dashboard/reviewAssignments` address shows each of them the
access-denied page, as it does an Author today. On OJS and OMP the steps give the same
result with the fix as without. A neighbour check, with and without the
fix: an installed reviewer (OJS `jjanssen`, OMP `phudson`) still lands on "Action
Required by me" with its menu group, an Author on "Active submissions",
`dbuskins` on "Assigned to me", and an Author typing the reviewer list's
address stays refused.

**Alternatives**

- Stop offering the "Reviewer" level on OPS (an OPS override of
  `getRoleNames()`). That is the open question
  [U54 OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#ops2),
  a product decision. It would stop new roles, but roles already created
  keep sending their holders to the broken page, so it needs this fix or
  a migration beside it. This fix holds whichever way that question is
  ruled.
- Guard the empty `views` in ui-library's `dashboardPageStore.js`. That
  silences the script error and leaves the user on an empty page with
  the "Error" window: a workaround.
- Drop the `reviewAssignments` case from OPS's `pages/dashboard/index.php`
  alone. Sign-in would then land the user on a "404 Not Found" page.

**What goes with it**

- No data repair.
- What the fix touches: on OPS only, where a Reviewer-level holder lands
  and where the public site's "Dashboard" link points
  (`PKPNavigationMenuService`, verified in the code). The `_submissions`
  routes `viewsCount` and `reviewerAssignments` still accept the level
  on OPS and are left alone.
- Backport: on `stable-3_5_0` the three places read the same (lines
  433–435, 90–93 and 1062–1081); the first hunk needs its context
  adjusted, since the user-groups query above it differs.
- Guard: a Planned item in spec U28 (a holder of a Reviewer-level role
  on a preprint server lands on their own list or the home page, with no
  reviewer group).

Medium: the guards are short and tried, but they sit in three pkp-lib
files and change where a role lands, which is past REPORT's "one place"
for small.

## Evidence

- A Playwright script that takes the Steps on an install loaded from
  PKP's default test dataset, on OPS and on OJS and OMP as the controls:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-reviewer-level-role-lands-on-undefined-list/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-reviewer-level-role-lands-on-undefined-list/lib.js).
  Run it from a pkp-e2e checkout with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/ops-reviewer-level-role-lands-on-undefined-list/walk.js`.
  `neighbour` as a last argument runs the neighbour check alone. For
  each sign-in it records the address, the heading, the table, the window, the side menu, the API answers and the console's
  errors.
- Where the walk differs from the Steps: the role is named "Referee
  u28m", the newcomer is `referee.u28m@mailinator.com` (Reffa Uquill,
  username `refu28m`, country Canada), and after step 9 the walk also
  types the `dashboard/reviewAssignments` and `dashboard/mySubmissions`
  addresses. In the role window "Reviewer" hides the "Stage Assignment"
  block on OPS; the invitation's role row shows no masthead choice for a
  Reviewer-level role, so step 3 chooses none.
- The fix, tried 2026-10-02 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/ops-reviewer-level-role-lands-on-undefined-list/fix.diff ojs omp ops`,
  then walk.js and its `neighbour` mode on the three apps, then `revert`;
  the `neighbour` mode was also run without the fix. The walk on OPS was
  run a second time with the fix, after a correction to the script's
  step 9.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02):
  - main: OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5),
    OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library 64d67363), OMP
    3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5).
  - stable-3_5_0: OPS 38b61882d3, OJS 091fb65453, OMP 9c5e24246c (each
    lib/pkp cf3f984335, lib/ui-library d4e01883): the same result at
    every step. The code read there: OPS's `mapDashboardViews()` (lines
    154–166), `getHomeUrl()`, the handler's role assignment and the menu
    group are as on `main`, and `dashboardPageStore.js` reads
    `views.value[0].id` at lines 108–109.
- 3.4, by code: OPS `stable-3_4_0` at acd8ae704b, pkp-lib 6f96165c90.
  `PKPPageRouter::getHomeUrl()` returns `submissions` for any user with a
  role other than a lone Reader; `DashboardHandler` opens that page to
  `ROLE_ID_REVIEWER`, and `PKPBackendSubmissionsHandler` lists
  `ROLE_ID_REVIEWER` for the list request. OPS has no
  `pages/dashboard/index.php` there.
- 3.3, by code: OPS `stable-3_3_0` at c5532e2161, pkp-lib 4156e50233.
  The same three reads in `PKPPageRouter.inc.php`,
  `DashboardHandler.inc.php` and `PKPBackendSubmissionsHandler.inc.php`.
- Introduced: `git log -L` on OPS's `mapDashboardViews()`; the commit
  added the method. `commits/e9e12edf5d/pulls` names no PR; the same
  change is 446dee5ab2 on `stable-3_5_0` (`pkp/ops#910`, closed
  unmerged) and is in every tag from `3_5_0rc2`, so no 3.5 release had
  reviewer views on OPS. pkp-lib's side of the redirect is older:
  `getHomeUrl()` has sent the Reviewer level to
  `dashboard/reviewAssignments` since 5c392d00ef (`pkp/pkp-lib#9931` for
  `pkp/pkp-lib#7495`, 2024-06-18), and OPS took the new dashboard with 6d23162966
  (2024-11-06). Between that commit and the Introduced one OPS used
  pkp-lib's full map; that state was not walked.
- Upstream search 2026-10-02, pkp/pkp-lib, pkp/ops and pkp/ui-library,
  issues and PRs: "undefined (0)", "My Assignments as Reviewer",
  `reviewAssignments` with OPS, `mapDashboardViews`, `getHomeUrl` with
  reviewer, "permission level" reviewer with OPS, reviewer role
  dashboard error. Nothing on this fault.
- Not driven: a Reviewer-level role held beside Moderator or Assistant
  (read in the code); ending the role, where `getHomeUrl()` reads only
  the user's active roles (`withActive()`), so the earlier landing
  returns; the reviewer wizard's address on OPS, which is a
  "404 Not Found" page for every account and not part of this fault.
- MySQL not checked; the fault does not depend on the database.
