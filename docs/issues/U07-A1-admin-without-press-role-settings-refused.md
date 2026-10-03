# A Site Administrator without a manager role in a press or preprint server is offered "Settings" and refused every page of it

- **Severity** medium
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code; not offered "Settings" and refused it, on every app)
- **Introduced** `pkp/pkp-lib#7906`, `pkp/omp#1116` and `pkp/ops#278` for `pkp/pkp-lib#7392` · [443e0e3](https://github.com/pkp/pkp-lib/commit/443e0e37d55732faff43139930005c76cc096375) (the side menu), [e2f79d6](https://github.com/pkp/omp/commit/e2f79d662519f78073ba6878c8397d4a3ee0d098) (OMP) and [a9e40b9](https://github.com/pkp/ops/commit/a9e40b91ae97226272bdb6dd50ac19ff5ee88dc8) (OPS) · 2022-05-09/10 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U07 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a journal, a Site Administrator opens every Settings page whether or
not they hold a manager role there. On a press or a preprint server, an
administrator who holds no manager role there still sees "Settings" in
the side menu. But each of its five entries ("Press" or "Server",
"Website", "Workflow", "Distribution", "Users & Roles") opens a page
reading "The current role does not have access to this operation.".

From the Administration pages the administrator can still change the
press's name, contact, theme, languages, indexing, plugins and users.
Everything else in Settings is closed to them: the masthead, series and
categories, the website's pages and menus, the workflow, emails,
licensing, DOIs and the rest of Distribution. To reach it they must first
give themselves the manager role.

Since 2022 administrators were meant to act as managers in every journal,
press and server without holding the role, and the side menu was opened
to them accordingly. On the press and the server these pages were not.

## Impact

- **Lost**: no data or settings. The administrator cannot reach the
  Settings areas named above until they take the manager role.
- **Who**: a Site Administrator in a press or preprint server where they
  hold no manager role. That happens when another administrator created
  it (its creator becomes its manager, nobody else does), or when their
  manager role there was removed.
- **Way round**: Administration › "Hosted Presses" ("Hosted Servers") ›
  "Settings wizard" changes the press's name, initials, principal
  contact, country, path, theme, languages, search indexing and plugins,
  and its "Users" tab edits users and their roles. Typing
  `/index.php/publicknowledge/en/management/access` opens "Users &
  Roles" with its users and roles. For anything else, the administrator
  gives themselves the manager role in the wizard's "Users" tab, and every
  Settings page opens.

Medium: the press's workflow, distribution and website settings are
closed to the administrator, with a way round on screen, in a setup that
is not the default. It would be high if the team counts installs with
several administrators, who hold no role in presses they did not create,
as an ordinary setup.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (OPS the same, with the names in
  brackets; OJS as the control). `admin` holds "Site administrator" and
  "Press manager" ("Preprint Server manager") in `publicknowledge`.
- No user, press or submission is created. Step 2 only makes step 4
  possible: without it, "Remove Role" on the last role answers "You
  cannot remove the role. At least one role must be assigned to the
  user.".

Steps:

1. Sign in as `admin` (password `admin`).
2. User menu › "View Profile" › "Roles": under "Public Knowledge Press"
   ("Public Knowledge Preprint Server"), tick "Reader" and press "Save".
3. Side menu "Settings" › "Users & Roles" › "Users": search "admin", then
   the row's "…" › "Edit".
4. On the "Press manager" ("Preprint Server manager") row press "Remove
   Role", then "Remove Role" in the window.
5. Open "Editor Dashboard". A window "Error", "The current role does not
   have access to this operation." opens, a separate fault
   ([U08 A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U08-A22-admin-without-role-dashboard-error.md)):
   press "OK". Look at the side menu's "Settings" group.
6. Press each "Settings" entry in turn: "Press" ("Server"), "Website",
   "Workflow", "Distribution", "Users & Roles".

**Expected**: each entry opens its page ("Setup" ("Server Settings"),
"Website Settings", "Workflow Settings", "Distribution Settings",
"Users & Roles"), as it does on the journal.

**Observed**: the side menu reads "Editor Dashboard", "Start A New
Submission", "DOIs", "Settings", "Content", "Statistics", "Tools",
"Administration" (OPS without "Content"), and "Settings" holds the five
entries. Each entry
(`/index.php/publicknowledge/en/management/settings/context`, …) lands
on

```
/index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied
```

a page in the press's public layout reading:

```
The current role does not have access to this operation.
```

Control: on OJS the same steps open each page ("Journal Settings",
"Website Settings", "Workflow Settings", "Distribution Settings", "Users
& Roles"), behind the same "Error" window.

## Cause

Each app's `SettingsHandler::__construct()` (`pages/management/SettingsHandler.php`)
assigns the page operations to roles. Every Settings page is the
`settings` operation with the page as its argument
(`management/settings/context`, `…/website`, `…/access`). OJS assigns it
to `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER`. OMP (line 35) and OPS
(line 40) give the site admin only `'access'`:

```php
$this->addRoleAssignment(
    [Role::ROLE_ID_SITE_ADMIN],
    [
        'access',
    ]
);
```

That `'access'` is a separate operation, `management/access`, which shows
the same Users & Roles page without `CanAccessSettingsPolicy`; it is not
the `management/settings/access` entry the menu links to. So
`ContextAccessPolicy`, which `ManagementHandler::authorize()` adds, lets
an administrator into the `settings` operation only by a manager role
held in the press or server, and refuses one without it with
`user.authorization.roleBasedAccessDenied`.

Everything else already treats the administrator as a manager.
`UserRolesRequiredPolicy`, which `PKPHandler::authorize()` adds for a
signed-in user, adds the site's groups to the context's, so the
administrator's group counts in every context. `CanAccessSettingsPolicy`,
also added for the `settings` operation, permits `ROLE_ID_SITE_ADMIN`
outright. The side menu (`PKPTemplateManager::setupBackendPage()`) builds
the "Settings" group for `ROLE_ID_MANAGER` or `ROLE_ID_SITE_ADMIN` from
the groups' `permitSettings`, which the administrator's group has.

`pkp/pkp-lib#7392` ("Ensure Site Administrators have "global" access
within journals") listed the site admin role beside the manager's across
the code. Its pkp-lib commit opened the side menu's manager entries,
"Settings" among them, to the site admin in every app. Its OJS commit,
[f81d9b9](https://github.com/pkp/ojs/commit/f81d9b90b5d3fcd14205c039be8eb6c47ae8e96c),
changed OJS's `SettingsHandler` from `'access'` to `'access', 'settings'`.
The OMP and OPS commits opened their other handlers but not this one. So
the press and the server gained a "Settings" entry that their handler
still refuses.

Reach:

- Every page under `management/settings/` on OMP and OPS is refused to
  such an administrator, including the side-menu entries outside the
  "Settings" group that open one: "Announcements" (when announcements are
  on), "Institutions" (when institutional statistics are on) and "Content"
  › "Comments" (when public comments are on). Their APIs admit the site
  admin, except Institutions' (below).
- The Institutions page's API, `PKPInstitutionController`, admits
  `ROLE_ID_MANAGER` only. With the fix the page opens on OMP and OPS, but
  its list stays refused to an administrator without a manager role,
  as it is on OJS today. That is a separate gap in pkp-lib, which the fix
  does not cover.
- The other files OJS's #7392 commit changed admit `ROLE_ID_SITE_ADMIN`
  in OMP and OPS too, in the same files or in the pkp-lib classes that
  replaced them (`SettingsPluginGridHandler`, the DOI APIs, OPS's export
  grids, `TemplateManager`), and so does `PKPToolsHandler`.

## Proposed fix

Give the site admin the `settings` operation in OMP's and OPS's
`SettingsHandler`, as OJS's does
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-without-press-role-settings-refused/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-without-press-role-settings-refused/fix-ops.diff)):

```diff
--- a/pages/management/SettingsHandler.php
+++ b/pages/management/SettingsHandler.php
         $this->addRoleAssignment(
             [Role::ROLE_ID_SITE_ADMIN],
             [
-                'access',
+                'access', 'settings',
             ]
         );
```

Tried on `main` in OMP and OPS. With it, the steps opened all five pages
for `admin` on both apps. With the fix in and out alike, the manager
`rvaca` still opened Settings › "Website", and `dbuskins` (Series editor,
Moderator) was still refused its address.

**Alternatives**

- Move the role assignment into pkp-lib's `ManagementHandler`, so the
  three apps cannot drift apart again: the same result, but changes in
  four repositories.
- Hide "Settings" from an administrator without a manager role on a press
  or server: ends the dead entries, but goes against #7392.
- Treat the site admin as a manager inside the role policies: considered
  on #7392 and set aside for listing the role in each handler (the
  issue's comment of 2022-05-06).

**What goes with it**

- No stored data changes. Managers and other roles are unchanged.
- Backport: the same line, as it stands, on `stable-3_5_0` and
  `stable-3_4_0` of OMP and OPS.
- Guard: an e2e check in pkp-e2e's U07 suite: an administrator without a
  manager role in a press and in a server opens each Settings page.

Small: the same one-line change in OMP's and OPS's handler, copying
OJS's, tried. This is a proposal; the team decides.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-without-press-role-settings-refused/walk.js),
  using the helpers of
  [admin-without-role-dashboard-error/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-without-role-dashboard-error/lib.js),
  [remove-user-upcoming-role-error/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-user-upcoming-role-error/lib.js)
  and
  [users-grid-roles-admin-empty-ended-listed/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-grid-roles-admin-empty-ended-listed/lib.js).
  From a pkp-e2e checkout, on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/admin-without-press-role-settings-refused/walk.js`.
  Its argument picks a mode: `nb` (`rvaca` and `dbuskins` open Settings ›
  "Website"), `wider` (steps 1–4, then each tab of the Settings wizard,
  the press's own form saved unchanged, and `management/access` with its
  "Users" and "Roles" tabs), `wayround` (the wizard's "Users" › "Edit
  User" › "Press manager", then Settings › "Website"). Step 6 opens each
  entry at the address the side menu gives it, not by a click.
- The fix, tried with `node bin/try-fix.js apply …/fix-omp.diff omp` and
  `node bin/try-fix.js apply …/fix-ops.diff ops`, then the steps and `nb`,
  then `revert`; `nb` also without it.
- Walked on `main` and 3.5, OJS, OMP and OPS (`wider` and `wayround` on
  `main`, OMP and OPS), PostgreSQL, each install loaded from
  pkp/datasets 566bb1f (2026-10-03). Tips: `main` OJS ff004d0973
  (lib/pkp 987776cd04), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp
  3dc90c81a6); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335). Nothing here
  depends on the database.
- `wider` saw: the wizard's tabs "Setup" (side tabs "Press"/"Server",
  "Appearance", "Languages", "Search Indexing", "Restrict Bulk Emails"),
  "Plugins" and "Users", each loaded; the "Press" form's "Save" answered
  200 and "Saved". `management/access` showed "Users & Roles" with
  "Users", "Roles", "Site Access Options" and "ORCID", the users list and
  the roles grid filled, behind the U08 A22 "Error" window.
- Code read on `main` and 3.5: the three `SettingsHandler.php` (3.5: OJS
  `'access', 'settings'`, OMP and OPS `'access'`), `ManagementHandler`
  (`authorize()`, `access()`), `PKPHandler::authorize()`,
  `CanAccessSettingsPolicy`, `UserRolesRequiredPolicy`,
  `PKPTemplateManager::setupBackendPage()`, OMP's and OPS's
  `TemplateManager`, `PKPContextController`, `PKPInstitutionController`,
  `PKPAnnouncementController`, `UserCommentController`, `AdminHandler`
  (the wizard) and `PKPContextService::add()` (its creator becomes the
  manager).
- 3.4, by code: OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b, pkp-lib
  767353f4fe. The #7392 commits are on the branch, `SettingsHandler.php`
  gives the site admin only `'access'` in OMP and OPS, and the side menu
  builds "Settings" inside its `[ROLE_ID_MANAGER, ROLE_ID_SITE_ADMIN]`
  block.
- 3.3, by code: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161, pkp-lib
  ac3fa73402. All three `SettingsHandler.inc.php` give the site admin only
  `'access'`, and `PKPTemplateManager.inc.php` builds "Settings" for
  `ROLE_ID_MANAGER` only. An administrator without that role was neither
  offered the pages nor admitted, on a journal too. 3.4 added the entry
  without the pages, so nothing that worked was lost.
- Introduced: `git blame` on OMP's and OPS's `'access'` line stops at the
  2021 moves of the file (01088072a8, ee952a951d5), so the line predates
  #7392; pkp-lib 443e0e3 (`pkp/pkp-lib#7906`) added `ROLE_ID_SITE_ADMIN`
  to the side menu's manager block. `pkp/pkp-lib#7392`'s comment of
  2022-05-06 names `pkp/ojs#3390`, `pkp/omp#1116` and `pkp/ops#278`,
  whose commits were pushed directly. Only `pkp/ojs#3390` touches
  `pages/management/SettingsHandler.inc.php`.
- Upstream searched 2026-10-03 in pkp/pkp-lib, pkp/omp, pkp/ops and
  pkp/ui-library, by the symptom's words and by `SettingsHandler`,
  `CanAccessSettingsPolicy` and "Administrators get all access". Related,
  not this fault: `pkp/pkp-lib#6375` (closed, OJS 3.2.1: the Users & Roles
  grid refused an administrator without a role, fixed in that grid's
  handler) and `pkp/pkp-lib#440` (closed, 2017: implicit manager access for
  administrators).
- Not driven: the "Announcements", "Institutions" and "Comments" pages
  (their settings are off in the dataset), so their reach is from the
  code; the actions on `management/access` (only its lists were read);
  saving on a Settings page with the fix; an administrator holding no
  role at all (the screens cannot remove the last one); the fix on 3.5.
