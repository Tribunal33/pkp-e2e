# An Editor without "Permit changes to Settings" is offered "Institutions" and refused the page

- **Severity** medium
- **Effort** small
- **Kind** intention gap
- **Introduced** `pkp/pkp-lib#10380` for `pkp/pkp-lib#5504` · [1330ac1283](https://github.com/pkp/pkp-lib/commit/1330ac128326a8ee735549bb33f22ee7c9f019e6) · 2024-11-18 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U66 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On a journal, press or preprint server that collects institutional
statistics, a user whose manager-level role has "Permit changes to
Settings" unticked (a Journal or Press editor or Production editor, or a
role created at the manager level, which arrives unticked) is shown
"Institutions" in the side menu, but pressing it opens "The current role
does not have access to this operation.". The change that added the
permission meant these roles to lose only the Settings pages and keep
Institutions, as they keep Announcements.

Such a user cannot maintain the institution list, and a manager with the
permission has to do it for them.

Every app since 3.5.

## Impact

- **Lost.** The use of the Institutions page (adding, editing, deleting
  institutions and their IP ranges) by the roles a journal restricted
  from Settings only. No data is lost, and the refusal is shown plainly.
- **Who.** An Editor or Production Editor whose manager unticked "Permit
  changes to Settings" for that role, on a journal or press, and a
  member of any role created at the manager level, which starts
  unticked, on any of the three apps. Always, once institutional
  statistics are on (or, on a journal, payments are enabled), because
  the side menu offers the entry.
- **Way round.** A manager whose role has the permission maintains the
  list, or ticks the permission, which also opens every Settings page to
  the role. Nothing gets worse with time.

Medium: a task the permission's design left to these roles fails for
them, in a setup that is not the default, with a way round on screen; it
would be low if the team rules that these roles should not have
Institutions and only the menu entry is wrong.

| Affects | main | 3.5 | 3.4 | 3.3 |
|---|---|---|---|---|
| OJS | yes | yes | no (code) | no (code) |
| OMP | yes | yes | no (code) | n/a |
| OPS | yes | yes | no (code) | n/a |

3.4 and 3.3 have no "Permit changes to Settings"; OMP and OPS 3.3 have no Institutions page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main` (or
  `stable-3_5_0`), with its journal, press or server `publicknowledge`.
- Institutional statistics on, which the dataset leaves off and without
  which the side menu offers no "Institutions":
  - as `admin`: Administration › "Site Settings" › "Statistics", tick
    "Enable institutional statistics", "Save";
  - as `rvaca` (the manager): Settings › "Distribution" › "Statistics",
    tick "Enable institutional statistics", "Save".
- On a journal or press: as `rvaca`, Settings › "Users & Roles" ›
  "Roles", open the "Journal editor" ("Press editor") row's arrow,
  "Edit", untick "Permit changes to Settings", "OK". `dbarnes` holds
  that role.

Journal or press:

1. Sign in as `dbarnes`.
2. Look at the side menu.
3. Press "Institutions".

**Expected:** "Institutions" opens the Institutions page, the list with
"Add Institution", as it does for `rvaca`: the permission's issue lists
Institutions among the side menu items a role without it keeps.

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

Preprint server (its one manager role, "Preprint Server manager", cannot
lose the permission, so the steps create a second one):

1. As `rvaca`: Settings › "Users & Roles" › "Roles" › "Create New Role",
   "Permission level" "Manager", "Role Name" "Associate Manager",
   "Abbreviation" "AM", "OK" ("Permit changes to Settings" arrives
   unticked).
2. "Users" › "Invite to a role", search `dbuskins@mailinator.com`,
   "Search User", role "Associate Manager" from today, "Save And
   Continue", "Invite user to the role".
3. Signed out, open the "Accept Invitation" link of the email to
   `dbuskins@mailinator.com` and press "Accept And Continue to OPS".
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
(`ManagementHandler::institutions()`), so it asks for "Permit changes to
Settings".

The side menu (`PKPTemplateManager::setupBackendPage()`,
lines 1329–1336; OJS `TemplateManager::setupBackendPage()`, lines
206–216, while payments are enabled) offers "Institutions" to every
manager-level role outside the "Settings" group, which is the only part
of the menu that `$hasSettingsAccess` hides.

The rule broken is the permission's own design. `pkp/pkp-lib#5504`
states it: a role with "Permit changes to Settings" unticked "will have
access to all other left menu items except 'Settings'", naming
Announcements, DOIs, Statistics, Tools, Institutions and Payments.

The change that implemented it, `pkp/pkp-lib#10380`, put the Institutions
page behind the settings gate, because its address sits under
`management/settings`. It exempted Announcements for that same reason
("moved out of settings without changing its URL") but not Institutions,
which the PR's review discussion also counts among the concerns outside
the settings area. `pkp/pkp-lib#11325` later exempted `userComments` the
same way.

Reach:

- The side menu's entries outside the "Settings" group that point at a
  `management/settings/…` address are `announcements`, `userComments` and
  `institutions` (checked in the code of the three apps); only
  `institutions` is not exempted.
- The same gate answers the page's address typed directly: the same
  refusal (on screen, all three apps).
- On a journal or press it reaches the default Journal editor, Press
  editor and Production editor roles once unticked; on all three apps, any
  role created at the manager level, whose "Create New Role" window
  offers the box unticked (on screen, OPS).

## Proposed fix

A proposal, not tried.

Recommended: exempt `institutions` in `ManagementHandler::authorize()`,
as Announcements and the Comments page already are:

```php
// The "settings" operation is off limits to managers who don't have access to settings,
// EXCEPT for the "announcements", "userComments" and "institutions" areas, which live
// outside the settings menu without changing their URL.
$requestedArgs = $request->getRequestedArgs();
if ($request->getRequestedOp() == 'settings' && !in_array($requestedArgs, [['announcements'], ['userComments'], ['institutions']])) {
    $this->addPolicy(new CanAccessSettingsPolicy());
}
```

Why here: the handler is where the settings gate and its exemptions
live, and the exemption list is the code base's own pattern for pages
that sit outside the Settings menu under a settings address
(`pkp/pkp-lib#10380` for Announcements, `pkp/pkp-lib#11325` for the
Comments page).

It keeps the intent of `pkp/pkp-lib#5504`, which kept Institutions for
these roles, and it makes the page agree with the side menu of both
`PKPTemplateManager` and OJS's `TemplateManager` without touching
either.

**Alternatives:**

- Hide the entry from these roles instead, by moving the `institutions`
  block of `PKPTemplateManager::setupBackendPage()` under
  `$hasSettingsAccess` and adding the same test to OJS's payments
  branch. It removes the dead end but takes Institutions from roles the
  permission was designed to leave it to, and needs changes in two
  repos; the team would choose it only if it now wants the institution
  list treated as a setting.

**What goes with it:**

- One change: the three apps share the handler, so one pkp-lib change
  covers them.
- Nothing stored changes, and no API or hook changes.
- Backport: it applies to 3.5 as written, where the exemption list holds
  `announcements` alone.
- Guard: an e2e scenario in U66 (a Planned item) that unticks the
  permission on the Journal editor role and has the editor open
  "Institutions" from the side menu and add an institution.

Small: one condition in one shared handler, following the exemption
already there, and an e2e scenario.

## Evidence

- Kept script, taking the Steps (journal and press) and the preprint
  server steps through the screens, with `rvaca` as control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-without-settings-permission/walk.js),
  run on an install freshly loaded from the default dataset with
  `npm run fleet-prep -- --feature issues-rv3 --dataset 3 --reset`, then
  `PROBE_FEATURE=issues-rv3 PROBE_AGENT=rv3 node bin/probe.js all shared/playwright/checks/issues/institutions-menu-without-settings-permission/walk.js`
  (stable-3_5_0: `PKP_E2E_LINE=stable-3_5_0` in front of both, feature
  `issues-rv3-3_5`, and `PROBE_RUN=r35` in front of the run).
  - The harness builds nothing: the statistics boxes, the unticked
    permission, the new role, the invitation and its acceptance are done
    on screen, as the Steps say, by the dataset's own users.
  - The walk's new role was named "Associate Manager" plus a run tag
    (`u66rv3…`), so its invitation email could be told apart from
    others; the side menu is read on the context's `submissions` page.
- Walked 2026-09-30 on PostgreSQL, each install loaded from PKP's default
  test dataset at pkp/datasets c0f9f10 (2026-09-30), `<app>/main/pgsql`
  and `<app>/stable-3_5_0/pgsql`, whose versions matched the code (no
  upgrade): main OJS 7ce98ec09e, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
  3dc90c81a6); stable-3_5_0 OJS 040e916378, OMP 4f90dadac, OPS 0bb1ca0f6e
  (lib/pkp 8809a197de). All six showed the Observed above.
  - In the dataset, the site's and the context's "Enable institutional
    statistics" are off, OJS payments are off, and every manager-level
    role has "Permit changes to Settings" ticked.
  - On 3.5 the side menus read "Editor Dashboard", "Issues" ("Catalog" on
    OMP, nothing on OPS), "DOIs", "Institutions", "Statistics", "Tools",
    with no "Settings".
  - Settings › Website, typed as the same user, gave the same refusal on
    every app.
  - No request answered an error and no page script failed in the walks.
  - The database does not bear on this fault.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d
  (`ManagementHandler::authorize()` adds `ContextAccessPolicy` only; no
  `CanAccessSettingsPolicy`, no `permitSettings` anywhere), OJS
  `stable-3_4_0` at 9571d8fde7. Every manager-level role opens the page
  the menu offers.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe (no `permitSettings`;
  `ManagementHandler` has no `institutions` case), OJS `stable-3_3_0` at
  9fdb9bcf9a. OMP and OPS 3.3 have no institutions.
- Introduced: `git blame` on the exemption line and on the `$hasSettingsAccess`
  block of `PKPTemplateManager::setupBackendPage()` in pkp-lib main stops at
  1330ac1283, which added the gate, the Announcements exemption and the
  menu's `$hasSettingsAccess`; the `institutions` menu block is older
  (2021, Bozana Bokan) and was not changed.
  - The intent is quoted from the "Update" at the top of
    `pkp/pkp-lib#5504`, and the review discussion from that issue's
    comment of 2024-10-23.
  - The `userComments` exemption: commit 1346f74dd0, `pkp/pkp-lib#11325`.
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library (institutions with settings, access, permit settings,
  menu, editor, "does not have access", `authorizationDenied`;
  `CanAccessSettingsPolicy`, `permitSettings`, `ManagementHandler`,
  "Access to Settings"): nothing about this fault; `pkp/pkp-lib#11515`
  (the Production editor role's stages) is another fault, and
  `pkp/ui-library#197` built the Institutions page.
- Not driven: the preprint server steps on OJS and OMP (the same code);
  the Production editor role, which carries the same box on the same
  code path; the page's actions for these roles after the proposed fix
  (not tried).
