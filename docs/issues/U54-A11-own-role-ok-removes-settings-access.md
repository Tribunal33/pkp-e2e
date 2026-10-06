# "OK" in an Editor's own role window takes the Settings pages away from every holder of the role

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no "Permit changes to Settings")
  - 3.3: none (code; no "Permit changes to Settings")
- **Introduced** `pkp/pkp-lib#10380` for `pkp/pkp-lib#5504` · [1330ac1283](https://github.com/pkp/pkp-lib/commit/1330ac128326a8ee735549bb33f22ee7c9f019e6) · 2024-11-18 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An Editor opens the window of their own role in Settings › Users & Roles
› "Roles". When that role is the only one that gives them the Settings
pages, "Permit changes to Settings" is ticked and greyed out, so the
Editor expects it to stay on. Yet "OK" in that window, even with nothing
changed, saves the role with the box unticked. The window closes with
"Your changes have been saved.", the browser shows the alert "Access
denied.", and the Editor's next Settings page is the access-denied
page. Every other holder of the role loses the Settings pages as well,
without being told.

As installed, "Journal editor" ("Press editor") and "Production editor"
have "Permit changes to Settings" ticked, so on every journal and press
this reaches each holder of those roles who has no other role with
Settings access. It also reaches the only holder of a role that a
journal, press or preprint server creates at the manager level with the
box ticked. A Journal Manager can tick the box again.

## Impact

- **Lost**: the Settings pages, Users & Roles included, for everyone who
  holds the role. The Editor who pressed "OK" gets only a bare "Access
  denied." alert; the other holders are told nothing.
- **Who**: a user whose only role with Settings access is "Journal
  editor" ("Press editor") or "Production editor", who opens that role's
  window to rename it or change an option, or opens it and presses "OK".
  Also the only holder of a role created at the Journal Manager level with
  the box ticked (a "Managing editor", say), in the same way; on a
  preprint server this is the only case, since the installed manager
  role's window cannot be opened (below).
- **Way round**: a Journal Manager ticks "Permit changes to Settings"
  again in the role's window, which gives the holders their Settings pages
  back. The Editor cannot do it.

Medium: a Journal Manager can restore it on screen. It would be high in a
journal where no one else holds a role with Settings access, because then
only the site administrator could restore it.

## Steps to reproduce

Journal and press, the Editor's own role:

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. `dbarnes`
  holds one role, "Journal editor", which is at the Journal Manager level
  and has "Permit changes to Settings" ticked, so it alone gives
  `dbarnes` the Settings pages. The `stable-3_5_0` dataset takes the same
  steps. [OMP: "Press editor", at the Press Manager level.]

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Go to Settings › Users & Roles and open the "Roles" tab.
3. On the "Journal editor" row press the "Settings" arrow, then "Edit".
   Look at "Permit changes to Settings" under "Role Options".
4. Change nothing and press "OK".
5. Reload Settings › Users & Roles.
6. Sign out and sign in as `rvaca` (the Journal Manager). Open Settings ›
   Users & Roles › "Roles", then the "Journal editor" row's "Edit", and
   look at "Permit changes to Settings".

Preprint server, a role created at the manager level (the dataset's only
manager-level role, "Preprint Server manager", is the first row of the
list, and [each page's first row of the Roles list has no "Edit"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md)):

Preconditions (the invitation needs the email to reach `dbuskins`, so the
install must send mail to a mailbox you can read, or to any mail catcher):

- PKP's default test dataset for OPS `main`, freshly loaded.
- As `rvaca`: Settings › Users & Roles › "Roles" › "Create New Role",
  "Permission level" "Manager", "Role Name" "u54c manager",
  "Abbreviation" "U54C", "Permit changes to Settings" ticked, "OK".
- As `rvaca`: "Users" tab › "Invite to a role", `dbuskins@mailinator.com`
  (a moderator), role "u54c manager", "Save And Continue", "Invite user
  to the role". Signed out, open "Accept Invitation" in the email to
  `dbuskins` and press "Accept And Continue to OPS".

1. Sign in as `dbuskins`.
2. Go to Settings › Users & Roles and open the "Roles" tab.
3. On the "u54c manager" row press the "Settings" arrow, then "Edit".
   Look at "Permit changes to Settings".
4. Change nothing and press "OK".
5. Reload Settings › Users & Roles.

**Expected:** at step 3 the box is ticked and greyed out, and the save at
step 4 keeps it on. Step 5 opens Settings › Users & Roles again. At step
6 the box is ticked.

**Observed:** at step 3 the box is ticked and greyed out. Step 4 closes
the window with "Your changes have been saved.", and the browser shows an
alert reading "Access denied.". It comes from the Roles list
redrawing itself after the save, which the server now refuses:

```
GET …/$$$call$$$/grid/settings/roles/user-group-grid/fetch-grid?…   200
{"status":false,"content":"Access denied.","elementId":"0","events":[]}
```

Step 5 lands on the journal's (press's, server's) public page, at
`…/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
which reads:

```
Home /
The current role does not have access to this operation.
```

At step 6 the box is unticked and open.

## Cause

Only the browser enforces the lock. `UserGroupForm::initData()`
(`lib/pkp/controllers/grid/settings/roles/form/UserGroupForm.php`) lists
the groups of the context that the signed-in user holds actively and that
have `permitSettings` on (`mySettingsAccessUserGroupIds`).
`UserGroupFormHandler.updatePermitSettings()`
(`lib/pkp/js/controllers/grid/settings/roles/form/UserGroupFormHandler.js`)
disables the box when that list holds only the group being edited
(`willLockOut`). `AjaxFormHandler` posts `$form.serialize()`, which leaves
a disabled checkbox out.

`UserGroupForm::execute()` then stores what was posted, line 274 on
`main`:

```php
$userGroup->permitSettings = $this->getData('permitSettings') && $userGroup->roleId == Role::ROLE_ID_MANAGER;
```

With no `permitSettings` in the post this is false, so every save of a
locked window turns off the very setting the lock protects.
`CanAccessSettingsPolicy` then refuses every holder of the group,
starting with the grid's own refresh after the save
(`UserGroupGridHandler::authorize()`), which `Handler.handleJson()` shows
as the alert. `pkp/pkp-lib#5504`'s to-do list asked to "protect users
from footgunning themselves by unchecking the setting in their own user
group"; the lock was the answer, but `execute()` was never told about it.

Reach, read in the code:

- What the holders lose is every page and endpoint behind
  `CanAccessSettingsPolicy`: the Settings pages, Users & Roles (with
  "Invite to a role"), the email templates, the navigation menus, the
  plugin and language grids, and the context's settings API.
- The registry (`registry/userGroups.xml`) installs "Journal manager",
  "Journal editor" and "Production editor" (OMP: "Press manager", "Press
  editor", "Production editor"; OPS: "Preprint Server manager") with
  `permitSettings="true"`, on `main` and 3.5.
- Holders of "Journal manager" usually hold no other role with Settings
  access, so its window would lock the box the same way. It cannot be
  opened today, because its row is normally the first of the list, and
  [each page's first row of the Roles list has no "Edit"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md).
  Once that is fixed, the same save would take the Settings pages from
  every journal manager.
- The window's other greyed boxes agree with the save. "Allow user
  self-registration" and the recommend-only box ("This role is only
  allowed to recommend a review decision …") are greyed unticked for the
  levels where `execute()` stores them off. "Permit submission metadata
  edit." is greyed ticked at the manager level, and `execute()` forces it
  on for that level (`NOT_CHANGE_METADATA_EDIT_PERMISSION_ROLES`). Only
  "Permit changes to Settings" is shown locked on and saved off.

## Proposed fix

Make `execute()` keep the lock the window shows. Move the query that
builds `mySettingsAccessUserGroupIds` into a method of the form, so that
`initData()` and `execute()` use the same rule, and keep `permitSettings`
on when the group being saved is the user's only settings group
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/own-role-ok-removes-settings-access/fix.diff)).
This is the part of the diff in `execute()`:

```diff
+            // The form locks "Permit changes to Settings" ticked on the only user group
+            // giving the current user access to the settings, and a disabled box is not
+            // posted: keep it on, as the form shows it.
+            $isOnlySettingsAccess = $this->getMySettingsAccessUserGroupIds() == [$userGroup->id];
+
             // update localized fields
             $userGroup = $this->_setUserGroupLocaleFields($userGroup, $request);
-            $userGroup->permitSettings = $this->getData('permitSettings') && $userGroup->roleId == Role::ROLE_ID_MANAGER;
+            $userGroup->permitSettings = ($this->getData('permitSettings') || $isOnlySettingsAccess) && $userGroup->roleId == Role::ROLE_ID_MANAGER;
```

The form is the only writer of `permitSettings` apart from the installer
and the registry. So the rule belongs in its `execute()`, as the
manager-level metadata-edit lock already does (shown ticked and greyed by
`updatePermitMetadataEdit()`, forced on by `execute()`). The save then
overrides the posted value without a message, so a hand-made post that
leaves the box out cannot remove the user's last Settings access either.

The site-administrator group belongs to no journal, so the lock and the
fix both leave it out. A site administrator whose only journal role with
Settings access is the one edited (the dataset's `admin` holds "Journal
manager") gets the lock although the administrator role keeps their
access anyway. That is harmless, since nothing is lost, and the fix keeps
the window and the save in step; `pkp/pkp-lib#5504` does not say whether
it was meant.

Tried on OJS, OMP and OPS `main` with the steps: the box stayed on, no
alert appeared, and Settings › Users & Roles opened again for `dbarnes`
and `dbuskins`. A Journal Manager could still untick the box where the
window leaves it open.

**Alternatives**

- Send the locked value from the browser (a hidden field, or a box
  made read-only by script instead of disabled). The rule would then
  live only in the browser, and any other client could still remove the
  last access.
- Refuse the save with a message when it would remove the user's last
  Settings access. This needs a new message and a refusal path, while the
  greyed box already tells the user the setting stays on.

**What goes with it**

- Data: a role already unticked this way looks the same as one a manager
  unticked on purpose, so there is nothing to repair automatically. A
  Journal Manager ticks it again on screen.
- Left out: on "Edit" the greyed "Permission level" is not posted either,
  and `_assignStagesToUserGroup()` checks forbidden stages against the
  posted `roleId`. No effect on screen was found, because the window
  posts no forbidden stage. The stages of manager-level roles are a
  separate report:
  ["OK" in a manager-level role's window, such as "Production editor", gives the role every workflow stage](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md).
- Backport: on `stable-3_5_0` the save line is line 258, and the diff
  needs new context lines there, because 3.5 has no audit-log block
  around it.
- Guard: an e2e scenario in which the Editor presses "OK" in their own
  role's window and still opens Settings.

Small: a few lines in one form, following a lock the form already has.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/own-role-ok-removes-settings-access/walk.js)
  (helpers in `lib.js` beside it) takes both groups of Steps, recording
  the browser's dialogs and the Roles list's redraw around "OK". Its
  neighbour checks: a Journal Manager unticks the open box on "Production
  editor" (OJS, OMP) or "u54c manager" (OPS) and the role is saved
  without it, with the fix and without (the fix must not lock a box the
  window leaves open); and the way round, a Journal Manager ticking the
  box again. On an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/own-role-ok-removes-settings-access/walk.js`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL;
  the fault does not depend on the database. Datasets: pkp/datasets
  c657990 (2026-10-01). On every walk the save posted no
  `permitSettings` and answered 200, the role's `permit_settings` went
  from 1 to 0, and the Roles list's redraw answered 200 with
  `"status":false` and the "Access denied." alert. With the fix in there
  was no alert. No server error and no page script error. The way round
  was walked on OJS and OMP, both lines.
- Not driven: a second holder of the role (the dataset has one per
  role); "Production editor" held as an Editor's only Settings role (the
  dataset gives it no holder); 3.4 and 3.3. An email-free way to give
  `dbuskins` the role exists by [the Users management spec](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md)
  (the site administrator's Settings Wizard › "Users" › "Edit User" › "User
  Roles"), but was not walked.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a), OMP `main` 3b0ecf794
  (lib/pkp 3dc90c81a6), OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88e,
  OPS 8eaf899468 (lib/pkp 1fb843f491); pkp-lib `stable-3_4_0`
  32b0f4b4af, `stable-3_3_0` f6ab331645.
- Code reads: on `main`, `UserGroupForm` (`initData()`, `execute()`,
  `_assignStagesToUserGroup()`), the four `update…()` methods of
  `UserGroupFormHandler`, `userGroupForm.tpl`, `CanAccessSettingsPolicy`
  and what adds it, `UserGroupGridHandler::authorize()`,
  `RoleDAO::getForbiddenStages()`, every writer of `permitSettings` and
  the three registries; on `stable-3_5_0`, the same lock and save line
  and the registries; on pkp-lib `stable-3_4_0` and `stable-3_3_0`, a
  search for `permitSettings` in `classes`, `controllers`, `js`,
  `templates` and `schemas` (none).
- The trace: `git blame` on line 274 gives 785d4364b6
  (`pkp/pkp-lib#11337`, a rename of `getRoleId()`); `git log -S
  mySettingsAccessUserGroupIds` gives 1330ac1283. The to-do quoted under
  Cause is asmecher's comment of 2024-09-09 on `pkp/pkp-lib#5504`.
- Upstream searches (2026-10-02), pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by "permit changes to settings", permitSettings,
  mySettingsAccessUserGroupIds, UserGroupForm settings and words for a
  lost Settings access. Related but not this fault: `pkp/pkp-lib#11337`
  and `pkp/pkp-lib#11946` (server errors around the setting, fixed),
  `pkp/pkp-lib#10612` (removing one's own Settings role in "Edit User"
  gives contradicting messages; closed without a fix).
