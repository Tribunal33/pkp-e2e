# "OK" in the window of a user's only Settings role takes the Settings pages away from everyone holding it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no "Permit changes to Settings")
  - 3.3: none (code; no "Permit changes to Settings")
- **Introduced** `pkp/pkp-lib#10380` for `pkp/pkp-lib#5504` · [1330ac1283](https://github.com/pkp/pkp-lib/commit/1330ac128326a8ee735549bb33f22ee7c9f019e6) · 2024-11-18 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Some users have exactly one role with "Permit changes to Settings"
ticked: an Editor whose only role is "Journal editor" ("Press editor"),
for example. When such a user opens that role's window on Settings ›
Users & Roles › "Roles", the box is ticked and greyed out, so they
cannot untick it. Yet "OK" in that window, even with nothing changed,
says "Your changes have been saved." and stores the role with the box
unticked. The user's next Settings page reads "The current role does not
have access to this operation.", and so does the next Settings page of
everyone else who holds that role.

So such a user cannot save any change to their own role, a new name
included. Every "OK" takes Settings away, and "Cancel" throws the change
away.

On 3.5, a Journal Manager pressing "OK" in the "Journal manager" window
locks every journal manager out in the same way, and so does the site
administrator.

## Impact

- **Lost**: the Settings pages, for every holder of the role, until the
  box is ticked again. Nothing says the role changed. The user learns it
  from the access-denied page, and the role's other holders learn it the
  next time they open Settings.
- **Who**: users whose only Settings role is the one they edit. On every
  journal and press, "Journal editor" ("Press editor") has the box
  ticked, so it applies to an Editor who holds no other manager-level
  role, as `dbarnes` in PKP's test data does. It also applies to a role
  created at the Manager level when its holder has no other Settings
  role. On `main` the "Journal manager" ("Press manager", "Preprint
  Server manager") row has no "Edit"
  ([pkp-e2e#182](https://github.com/jardakotesovec/pkp-e2e/issues/182)).
  So a default preprint server on `main` is not exposed, because its
  only manager-level role is that row. A server is exposed once it adds
  a manager-level role. On 3.5 that row can be edited. The fault only
  shows when someone saves their own role's window, which is occasional
  set-up work, but every such save triggers it.
- **Way round**: a manager who has another Settings role, or the site
  administrator, ticks the box again in the role's window. The edit the
  user came to make (a new name, a role option) can only be made by such
  a person.

Medium: one "OK" with nothing changed takes the Settings pages away from
a whole role, but someone with another Settings role, or the site
administrator, can restore them on screen. It would be high if the
Journal Manager's lockout on 3.5 had no site administrator to turn to.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main` (OMP in brackets
where it differs). `dbarnes` holds one role, "Journal editor" ["Press
editor"], with "Permit changes to Settings" ticked. Nothing else is
needed on a journal or a press.

On a preprint server (OPS `main`), the dataset's managers hold only
"Preprint Server manager", whose row has no "Edit" on `main`. So `rvaca`
creates another role at the Manager level and gives it to `dbuskins`
(Moderator), who has no Settings role:

- Sign in as `rvaca`. On Settings › Users & Roles › "Roles", press
  "Create New Role". Set "Permission level" to "Manager", "Role Name" to
  "u54w49 Managing editor" and "Abbreviation" to "u54w49". Tick "Permit
  changes to Settings" and press "OK".
- On the "Users" tab, press "Invite to a role". Search for
  `dbuskins@mailinator.com` ("Search User"). Under "Select a new role",
  choose "u54w49 Managing editor", with today as "Start Date" and either
  "Server Masthead" choice. Press "Save And Continue", then "Invite user
  to the role".
- Open the invitation email to `dbuskins@mailinator.com`. The dataset's
  `config.inc.php` sends mail by SMTP to `localhost` port 1025, where a
  mail catcher such as Mailpit shows it. Sign out, open its "Accept
  Invitation" link and press "Accept And Continue to …".

Editing one's own role, on a journal or a press:

1. Sign in as `dbarnes`.
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`) and its
   "Roles" tab.
3. Open the "Journal editor" ["Press editor"] row's arrow and press
   "Edit". Read "Permit changes to Settings".
4. Press "OK" without changing anything.
5. Reload the page, then open Settings › Website by typing its address
   (`/index.php/publicknowledge/en/management/settings/website`). The
   menu no longer offers Settings.
6. Sign in as `rvaca`, open the "Roles" tab and the "Journal editor"
   ["Press editor"] row's "Edit", and read "Permit changes to Settings".
   Press "Cancel".

On a preprint server, take steps 1-6 as `dbuskins` on "u54w49 Managing
editor".

The manager role, on 3.5 (the dataset of `stable-3_5_0`; all three
apps):

7. Sign in as `rvaca`, whose only role is "Journal manager" ["Press
   manager", "Preprint Server manager"]. On the "Roles" tab, open that
   row's "Edit" and read "Permit changes to Settings".
8. Press "OK" without changing anything, then reload Users & Roles.
9. Sign in as `admin` (site administrator), open the same row's "Edit"
   and read the box. Tick it and press "OK".

**Expected**: in step 3 the box is ticked and greyed out, so the window
will not let `dbarnes` take the Settings pages away from himself. "OK"
saves the role as it was. Users & Roles and Website still open in step
5, and in step 6 the box is ticked. Steps 7 and 8 behave the same for
`rvaca`. The site administrator's access does not depend on the role, so
for `admin` the box is open.

**Observed**: in step 3 the box is ticked and greyed out. "OK" closes
the window with "Your changes have been saved.". In step 5 both pages
show only:

```
The current role does not have access to this operation.
```

In step 6 the box is unticked and open. No request failed and no page
script failed.

On 3.5, step 7 shows the box ticked and greyed out, and in step 8
Users & Roles shows the same access-denied page. In step 9 the box is
unticked and open, and ticking it gives `rvaca` Settings back. Signed in
as `admin` before step 7, the box is ticked and greyed out for `admin`
too: "Journal manager" is `admin`'s only Settings role in the journal.
`admin`'s own "OK" with nothing changed unticks it in the same way.

A user with another Settings role is not affected. When `rvaca`, who
holds "Journal manager", unticks or ticks the box on "Journal editor",
the role is stored as he set it.

## Cause

The guard that stops a user locking themselves out lives only in the
browser:

- `UserGroupForm::initData()` (pkp-lib
  `controllers/grid/settings/roles/form/UserGroupForm.php`, lines
  120-131 on `main`) lists the context's groups that the signed-in user
  holds actively with `permitSettings` on (`mySettingsAccessUserGroupIds`).
- `updatePermitSettings()` in pkp-lib
  `js/controllers/grid/settings/roles/form/UserGroupFormHandler.js`
  starts at line 226. It sets `willLockOut` when that list holds one
  group and it is the one being edited (lines 235-236), and then
  disables the box (lines 244-245).

A disabled checkbox is not posted, so the form's request carries no
`permitSettings`. `UserGroupForm::execute()` stores what is posted
(line 274 on `main`, 258 on 3.5):

```php
$userGroup->permitSettings = $this->getData('permitSettings') && $userGroup->roleId == Role::ROLE_ID_MANAGER;
```

The server never checks the lockout rule. The list also holds the site
administrator's groups, although `CanAccessSettingsPolicy` lets a site
administrator through whatever their groups. So the window greys the
box for `admin` as well, and the save unticks it for them too.

Reach:

- The three apps share the form, the template and the handler from
  pkp-lib (checked in the code; seen on screen on all three).
- The window's other disabled boxes are not affected: what their
  missing value stores is what the rule wants, or the server sets the
  value itself (checked in the code):
  - `permitMetadataEdit` is forced on for
    `NOT_CHANGE_METADATA_EDIT_PERMISSION_ROLES` (lines 279-283).
  - `permitSelfRegistration` and `recommendOnly` are kept off outside
    their levels (lines 275, 298), and the window unticks them when it
    disables them.
  - A forbidden stage's box posts nothing, being disabled, and the role
    must not have that stage, so leaving it out is right. The server does
    not check forbidden stages on an edit:
    `_assignStagesToUserGroup()` reads `roleId` from the post (line 339),
    where the disabled level select is absent, so its check at line 356
    never matches.
  - The always-active stages of the Manager level are set in `execute()`
    from the stored level (lines 318-319).
- No other writer: only this form changes `permitSettings` of an
  existing role. The `userGroups` REST endpoint is read-only (checked in
  the code).
- Stored data: a role saved this way keeps `permit_settings = 0`. Nothing
  tells it apart from a role whose box a manager unticked on purpose, so
  no repair is proposed.

## Proposed fix

A proposal; the team decides. Enforce the rule on the server, and build the list in one method that
both the window and the save use. A site administrator gets an empty
list, because their Settings access does not depend on a role. The
whole change is in `UserGroupForm`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/fix.diff)):

```php
public function getMySettingsAccessUserGroupIds(): array
{
    if (Validation::isSiteAdmin()) {
        return [];
    }
    $userId = Application::get()->getRequest()->getUser()->getId();
    return UserGroup::withContextIds([$this->getContextId()])
        ->whereHas('userUserGroups', fn (EloquentBuilder $q) => $q->withActive()->withUserId($userId))
        ->get()
        ->filter(fn ($userGroup) => $userGroup->permitSettings)
        ->map(fn ($userGroup) => $userGroup->id)
        ->values()
        ->all();
}

// initData()
'mySettingsAccessUserGroupIds' => $this->getMySettingsAccessUserGroupIds(),

// execute(), editing an existing role
$isOnlySettingsAccess = $this->getMySettingsAccessUserGroupIds() == [$userGroup->id];
$userGroup->permitSettings = $isOnlySettingsAccess || ($this->getData('permitSettings') && $userGroup->roleId == Role::ROLE_ID_MANAGER);
```

This follows how `execute()` already treats the boxes the window
disables: it sets their value itself, as for `permitMetadataEdit`.

It was tried on OJS, OMP and OPS:

- `main`: "OK" in steps 1-6 kept the box ticked, Users & Roles and
  Website stayed open, and `rvaca` read the box ticked. `rvaca`, who
  holds another Settings role, could still untick and tick it, with the
  fix and without it.
- 3.5, steps 7-9: `rvaca` kept the box ticked and his Settings. `admin`
  found the box open, and an unchanged "OK" by `admin` kept it ticked.
  `admin` could still untick it and tick it again.

**Alternatives**:

- Post the box's value although it is disabled (a hidden field, or the
  box enabled just before the submit): the window would stop unticking
  it, but the rule would still live only in the browser.
- Leave the box open and warn before "OK": a product change, and it
  still needs the server check to mean anything.

**What goes with it**:

- Behavior change: a site administrator can now untick the box on their
  only role in the journal, since doing so cannot lock them out. Other
  users who hold another Settings role, and all other roles, behave as
  before.
- With the fix for U54 A10
  ([U54-A10-role-name-spaces-window-broken.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A10-role-name-spaces-window-broken.md)),
  which moves this list into `fetch()`, `fetch()` calls the new method
  instead
  ([fix-after-a10.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/fix-after-a10.diff)).
- No data repair (see Cause).
- Backport: [fix-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/fix-3_5.diff)
  is the same change on 3.5. 3.4 and 3.3 have no such setting.
- Guard: an e2e check in pkp-e2e's *Roles configuration* scenarios
  (spec U54 scenario 5): a user whose only Settings role is the one
  edited presses "OK" and still opens Settings.

Small: one method and one line in one pkp-lib file, tried on the three
apps.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/walk.js)
  (helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/lib.js))
  takes steps 1-6 and the OPS preconditions on PKP's default test dataset
  (pkp/datasets 38ab955, 2026-09-30, the `pgsql` dumps; PostgreSQL). It
  reads the stored `permit_settings` after each "OK", and what each
  request carried. It ends with the check on `rvaca`. `MANAGER_ONLY=1`
  takes steps 7-9, with the `admin` case first. Run it from pkp-e2e on a
  dataset fleet reset first:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Fix check: `node bin/try-fix.js apply shared/playwright/checks/issues/settings-role-window-ok-unticks-settings/fix.diff ojs omp ops`,
  the fleet reset, walk.js, then `node bin/try-fix.js revert … ojs omp ops`.
  On 3.5 the same was done with fix-3_5.diff, `PKP_E2E_LINE=stable-3_5_0`
  and `MANAGER_ONLY=1`.
- Branch tips: `main` ojs bade233f73, lib/pkp 2e377d27fc; omp 3b0ecf794
  and ops c8af945bb7, lib/pkp 3dc90c81a6; ui-library 280f98c5.
  `stable-3_5_0` ojs 92b9a16b48, omp 3081c9b00, ops cf4fce69bd; lib/pkp
  a9c76aed62.
- Steps 1-6 were taken on `main` and on 3.5 with the same outcome. On
  `main` the manager row offers no "Edit", so steps 7-9 ran on 3.5 only.
- Code read: `UserGroupForm.php` (`initData()`, `execute()`,
  `_assignStagesToUserGroup()`), `userGroupForm.tpl`,
  `UserGroupFormHandler.js`, `RoleDAO::getForbiddenStages()`,
  `CanAccessSettingsPolicy`, `Validation::isSiteAdmin()` and
  `api/v1/userGroups`, on `main` and on the 3.5 branch. 3.4 and 3.3
  (pkp-lib `origin/stable-3_4_0` df13621c2d, `origin/stable-3_3_0`
  d446601ebe): no `permitSettings` in `UserGroupForm` or anywhere in
  `classes/` and `controllers/`. Every manager-level role there has the
  Settings pages.
- Introduced: `git blame` on line 274 passes two rewrites of the line
  (785d4364b6 for `pkp/pkp-lib#11337`, 714d5d5aa4 for
  `pkp/pkp-lib#10506`). `git log -S` on `setPermitSettings` and
  `willLockOut` leads to the change in the header, which added the
  window's guard and the posted save together.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by "permit changes to settings", "lock out",
  "settings access", `permitSettings`, `mySettingsAccessUserGroupIds`
  and `UserGroupForm`. `pkp/pkp-lib#11946`, `pkp/pkp-lib#11337` and
  `pkp/pkp-lib#10854` are other faults of the same form.
- Diffs on this file: fix.diff applies together with the U54 A2/A3
  `fix-<app>.diff`, in either order. It conflicts with the U54 A10
  fix.diff in `initData()`, where both change the list. fix-after-a10.diff
  applies after A10's, and the three apply together in any order that
  puts A10's before fix-after-a10.diff (checked with `git apply` on
  `main`'s file). fix-after-a10.diff was not tried on screen.
- Not checked: a user whose Settings role assignment has ended. The
  window and the save both use `withActive()`.
