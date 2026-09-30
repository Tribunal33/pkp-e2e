# An Editor without "Permit changes to Settings" is offered "Institutions" and refused the page

- **Severity** medium
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no "Permit changes to Settings")
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10380` for `pkp/pkp-lib#5504` · [1330ac1283](https://github.com/pkp/pkp-lib/commit/1330ac128326a8ee735549bb33f22ee7c9f019e6) · 2024-11-18 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U66 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

Users whose role has "Permit changes to Settings" turned off see
"Institutions" in the side menu, but clicking it shows "The current role
does not have access to this operation.". They should be able to use the
page: when the permission was added, the intent was that such roles lose
only the Settings pages and keep Institutions, as they keep
Announcements.

"Permit changes to Settings" is on by default for the Editor and
Production Editor roles, on a new install and after an upgrade from 3.4,
so on a journal or press this happens only after a manager turns it off
for one of them. A new role created at the manager level starts with it
off, so its members run into this at once; on a preprint server that is
the only way to run into it. "Institutions" is in the menu only while
institutional statistics are turned on (on a journal, also while
payments are turned on).

## Impact

- **Lost.** These roles cannot use the Institutions page (adding,
  editing and deleting institutions and their IP ranges). No data is
  lost, and the refusal is shown plainly.
- **Who.** Every member of such a role, every time they click
  "Institutions". Institutional statistics and payments are both off on
  a new install, so the entry shows only where a manager has turned one
  of them on.
- **Way round.** A manager whose role has the permission maintains the
  list, or turns the permission on for the role, which also opens every
  Settings page to it. Nothing gets worse with time.

Medium: the permission was designed to leave this task to these roles,
and it fails for them. The setup is not the default, and there is a way
round on screen. It would be low if the team rules that these roles
should not have Institutions and only the menu entry is wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main` (or
  `stable-3_5_0`), with its journal, press or server `publicknowledge`.
- Institutional statistics turned on. The dataset has them off, and
  without them the side menu has no "Institutions":
  - as `admin`: Administration › "Site Settings" › "Statistics", tick
    "Enable institutional statistics", "Save";
  - as `rvaca` (the manager): Settings › "Distribution" › "Statistics",
    tick "Enable institutional statistics", "Save".
- On a journal or press: as `rvaca`, Settings › "Users & Roles" ›
  "Roles", open the "Journal editor" ("Press editor") row's arrow,
  "Edit", untick "Permit changes to Settings", "OK". `dbarnes` has that
  role.

Journal or press:

1. Sign in as `dbarnes`.
2. Look at the side menu.
3. Press "Institutions".

**Expected:** "Institutions" opens the Institutions page, the list with
"Add Institution", as it does for `rvaca`.

**Observed:** the side menu reads "Editor Dashboard", "Start A New
Submission", "DOIs", "Institutions", "Content", "Statistics", "Tools" (no
"Settings"). "Institutions" opens
`/index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
a page reading:

```
The current role does not have access to this operation.
```

Control: `rvaca`'s side menu shows "Institutions" and "Settings", and
"Institutions" opens the page with "Add Institution".

Preprint server (the permission cannot be turned off for its only
manager role, "Preprint Server manager", so the steps create a second
one):

1. As `rvaca`: Settings › "Users & Roles" › "Roles" › "Create New Role",
   "Permission level" "Manager", "Role Name" "Associate Manager",
   "Abbreviation" "AM", "OK" ("Permit changes to Settings" is unticked
   from the start).
2. "Users" › "Invite to a role", search `dbuskins@mailinator.com`,
   "Search User", role "Associate Manager" from today, "Save And
   Continue", "Invite user to the role".
3. Signed out, open "Accept Invitation" from the invitation email and
   press "Accept And Continue to OPS".
4. Sign in as `dbuskins` and press "Institutions" in the side menu.

**Observed:** the side menu reads "Editor Dashboard", "Start A New
Submission", "DOIs", "Institutions", "Statistics", "Tools" (no
"Settings"), and "Institutions" opens the same refusal. The control is
the same as above.

## Cause

`PKP\pages\management\ManagementHandler::authorize()` (lib/pkp
`pages/management/ManagementHandler.php`, lines 100–105) adds
`CanAccessSettingsPolicy` to every `settings` operation except the
`announcements` and `userComments` arguments. The Institutions page is
the `settings` operation with the argument `institutions`
(`ManagementHandler::institutions()`), so it requires "Permit changes
to Settings".

The side menu shows "Institutions" outside its "Settings" group, to
every manager-level role. That group is the only part of the menu the
permission hides. `PKPTemplateManager::setupBackendPage()` (lines
1329–1336) adds the entry while institutional statistics are on, and
OJS `TemplateManager::setupBackendPage()` (lines 206–216) while
payments are enabled.

This breaks the permission's own design, as `pkp/pkp-lib#5504` states
it: a role with "Permit changes to Settings" unticked "will have access
to all other left menu items except 'Settings'", naming Announcements,
DOIs, Statistics, Tools, Institutions and Payments.

The change that implemented the permission, `pkp/pkp-lib#10380`, put
the Institutions page behind the settings check, because the page's
address is under `management/settings`. The same change exempted
Announcements, whose address is there for the same reason ("moved out
of settings without changing its URL"), but not Institutions.

In the PR's review, a reviewer asked whether the institution API needed
the check. The PR's author answered on `pkp/pkp-lib#5504` that the API
is "used for production concerns outside of settings", and left it
open, but the page was not exempted to match. `pkp/pkp-lib#11325` later
exempted `userComments` the same way as Announcements.

Reach:

- The side menu's entries outside the "Settings" group that point at a
  `management/settings/…` address are `announcements`, `userComments` and
  `institutions` (checked in the code); only `institutions` is not
  exempted.
- On a journal with payments enabled, OJS's payments branch also offers
  the entry to the Subscription Manager, whom OJS's `SettingsHandler`
  does not admit to the page at all: a separate fault this fix does not
  cover, tracked as U51
  [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a16).

## Proposed fix

A proposal, tried on `main` ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-without-settings-permission/fix.diff)).

Recommended: exempt `institutions` in `ManagementHandler::authorize()`,
as Announcements and the Comments page already are:

```diff
-        // EXCEPT for the "announcements" and "userComments" areas, which were moved out of settings without changing their URL.
+        // EXCEPT for the "announcements", "userComments" and "institutions" areas, which live outside settings under a settings URL.
         $requestedArgs = $request->getRequestedArgs();
-        if ($request->getRequestedOp() == 'settings' && $requestedArgs != ['announcements'] && $requestedArgs != ['userComments']) {
+        if ($request->getRequestedOp() == 'settings' && $requestedArgs != ['announcements'] && $requestedArgs != ['userComments'] && $requestedArgs != ['institutions']) {
```

The exemption alone gives a working page: `ManagementHandler::institutions()`
builds a list and a form that read and write through the institutions
API, and `PKPInstitutionController::getRouteGroupMiddleware()` admits
`ROLE_ID_MANAGER` with no `CanAccessSettingsPolicy`.

Tried on all three apps: with it, `dbarnes` (journal, press) and
`dbuskins` in the new role (server) open "Institutions" from the side
menu and "Add Institution" saves, while the same users are still refused
Settings › Website and `sberardo`, whose role is below manager level, is
still refused the Institutions page's address, as without it.

**Alternatives:**

- Hide the entry from these roles instead: move the `institutions` block
  of `PKPTemplateManager::setupBackendPage()` under that method's local
  `$hasSettingsAccess`, and in OJS's `TemplateManager::setupBackendPage()`,
  which cannot see that variable, compute the same test from the
  authorized user groups before adding the entry in the payments branch.
  It takes Institutions away from roles the permission was designed to
  leave it to, and needs changes in two repos. It fits only if the team
  now wants the institution list treated as a setting.

**What goes with it:**

- The three apps' `SettingsHandler` extends the shared handler without
  overriding `authorize()`, so one pkp-lib change covers them. Nothing
  stored changes, and no API or hook changes.
- Backport: on 3.5 the condition exempts `['announcements']` only and
  there is no Comments page, so the change there adds
  `&& $request->getRequestedArgs() != ['institutions']` to it.
- Guard: an e2e scenario in U66 (a Planned item) that unticks the
  permission on the Journal editor role and has the editor open
  "Institutions" from the side menu and add an institution.

Small: one condition in one shared handler, and an e2e scenario.

## Evidence

- Kept script that runs the Steps (journal and press) and the preprint
  server steps in the browser, on a fresh load of the default dataset,
  with `rvaca` as control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-without-settings-permission/walk.js),
  run with
  `PROBE_FEATURE=issues-rv3 PROBE_AGENT=rv3 node bin/probe.js all shared/playwright/checks/issues/institutions-menu-without-settings-permission/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front). Where the page
  opens it adds an institution; it ends with the neighbour check (the
  same user types Settings › Website's address, `sberardo` the
  Institutions page's).
- The fix, tried 2026-09-30 on the main tips below: `node bin/try-fix.js
  apply shared/playwright/checks/issues/institutions-menu-without-settings-permission/fix.diff ojs omp ops`,
  the dataset reloaded, the same `probe.js` command, then `node
  bin/try-fix.js revert ojs omp ops`. The neighbour check was also walked
  without the fix, with the same refusals.
- Walked 2026-09-30 on PostgreSQL, each install loaded from pkp/datasets
  c0f9f10 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`: main OJS 7ce98ec09e, OMP 3b0ecf794c, OPS
  c8af945bb7 (lib/pkp 3dc90c81a6); stable-3_5_0 OJS 040e916378, OMP
  4f90dadac, OPS 0bb1ca0f6e (lib/pkp 8809a197de). All six showed the
  Observed above.
- The setup, by code on main: `registry/userGroups.xml` of each app gives
  the manager, Editor and Production Editor groups `permitSettings="true"`
  (the dataset has the same); the 3.5.0 upgrade
  `I5504_UserGroupsSettings::up()` sets `permit_settings` to 1 on every
  `ROLE_ID_MANAGER` group; `UserGroupForm` gives a new role no value, so
  its box starts unticked (seen on screen on OPS). The site's and the
  context's `enableInstitutionUsageStats` default to false
  (`schemas/site.json`, `schemas/context.json`).
- Payments without institutional statistics: OJS
  `TemplateManager::setupBackendPage()` adds the entry with "Payments"
  whenever payments are enabled; not in this walk, seen on screen for
  the Editor in the spec's probe of 2026-09-28
  ([q1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#fn-q1)).
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d
  (`ManagementHandler::authorize()` adds `ContextAccessPolicy` only; no
  `CanAccessSettingsPolicy`, no `permitSettings` anywhere), OJS
  `stable-3_4_0` at 9571d8fde7. Every manager-level role can open the
  page the menu offers.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe (no `permitSettings`;
  `ManagementHandler` has no `institutions` case), OJS `stable-3_3_0` at
  9fdb9bcf9a. OMP and OPS 3.3 have no institutions.
- Introduced: `git blame` on the exemption line and on the
  `$hasSettingsAccess` block of `PKPTemplateManager::setupBackendPage()`
  in pkp-lib main stops at 1330ac1283, which added the gate, the
  Announcements exemption and `$hasSettingsAccess`.
  - The intent is quoted from the "Update" at the top of
    `pkp/pkp-lib#5504`. The review question is bozana's review of
    `pkp/pkp-lib#10380` (2024-09-30); the answer quoted is asmecher's
    comment on `pkp/pkp-lib#5504` of 2024-10-23.
  - The `userComments` exemption: commit 1346f74dd0, `pkp/pkp-lib#11325`.
- Upstream searched 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by the symptom's words and by
  `CanAccessSettingsPolicy`, `permitSettings` and `ManagementHandler`:
  nothing about this fault.
- Not driven: the preprint server steps on OJS and OMP (the same code);
  the Production editor role, which carries the same box on the same
  code path; the fix on 3.5.
