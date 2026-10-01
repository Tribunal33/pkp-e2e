# A role name of only spaces breaks the role window, and saving again shows a page of raw code

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** pkp bug 8609 (no PR) · [ccef8b4309](https://github.com/pkp/pkp-lib/commit/ccef8b4309290702b7b81251f0d94176591b7d84) · 2014-03-19 · Bruno Beghelli (beghelli)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager types only spaces as a role's "Role Name" or "Abbreviation"
and presses "OK". The server refuses it, and the page's own script fails
in the browser. The window stays open under "Errors occurred processing
this form", but its "Stage Assignment" boxes are gone and it no longer
works.

The manager fixes the name and presses "OK" again. Instead of closing
the window, the browser replaces the whole Users & Roles page with raw
code. A new role is saved anyway, under the corrected name but without
the stages ticked before the refusal. An edited role is not changed at
all, and nothing says so.

## Impact

- **Lost**: an edit to a role (its name, abbreviation, options), with no
  message that it was not saved; the stages ticked for a new role. A
  manager who does not know that a new role was saved may create it a
  second time.
- **Who**: a Journal, Press or Preprint Server manager in Settings ›
  Users & Roles › "Roles" who leaves only spaces in a role's name or
  abbreviation; uncommon.
- **Way round**: the page of code has no menu or link. The manager goes
  back with the browser (Back, or Users & Roles' address), reopens the
  role and does the change again; a new role is already in the list and
  needs only its stages.

Medium: the save fails and misleads, and the manager must leave the
page through the browser, but only on a narrow input. It would be low if
only creating were affected, where the role is saved; high if an
ordinary refusal reached the same broken window.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`; nothing added.

Creating a role:

1. Sign in as `rvaca`.
2. Open Settings › Users & Roles and its "Roles" tab
   (`/index.php/publicknowledge/en/management/settings/access`).
3. Press "Create New Role".
4. "Permission level": choose "Assistant".
5. "Role Name": type three spaces. "Abbreviation": type "u54w46".
6. Press "OK".
7. Replace the spaces in "Role Name" by "u54w46 Desk".
8. Press "OK".

Editing a role:

9. Open Settings › Users & Roles › "Roles" again, by its address.
10. Open the arrow of the "Editorial Board Member" row and press "Edit".
11. Replace "Abbreviation" ("EBM") by three spaces.
12. Press "OK".
13. Type "EBM" back into "Abbreviation" and change "Role Name" to
    "Editorial Board Member u54w46".
14. Press "OK".

**Expected**: at step 6 and step 12 the window refuses the value as it
refuses an empty box, or shows the server's refusal and stays a working
window, its "Stage Assignment" boxes in place. Steps 8 and 14 then close
the window with "Your changes have been saved."; the list shows "u54w46
Desk" and "Editorial Board Member u54w46".

**Observed**: at step 6 the window stays open with this at its top, and
no message under "Role Name" or "Abbreviation":

```
Errors occurred processing this form
You need to define a role name. (English)
```

"Stage Assignment" is still headed but has no boxes, and the browser
console shows:

```
SyntaxError: Failed to execute 'appendChild' on 'Node': Unexpected token ','
```

Step 12 shows the same, with "You need to define a role abbreviature.
(English)", and "Permission level" now reads "Journal Manager" (OMP
"Press Manager", OPS "Manager"), greyed, instead of "Assistant".

At step 8 the page leaves Users & Roles for the address
`…/index.php/publicknowledge/$$$call$$$/grid/settings/roles/user-group-grid/update-user-group`,
which shows only this text, with no menu or link:

```
{"status":true,"content":"","elementId":"0","events":[{"name":"dataChanged"},{"name":"userGroupUpdated","data":{"isGlobalEvent":true}}]}
```

Back on "Roles", "u54w46 Desk" is listed. At step 14 the page leaves
for the same address and shows the window's own HTML as text
(`{"status":true,"content":"<script type=\"text\/javascript\">…`): the
form the manager had open, with its form token and the typed values,
nothing more. Back on "Roles", the row still reads "Editorial Board
Member", and no "Editorial Board Member u54w46" is listed.

An empty "Role Name" at step 5 is refused by the window itself with
"This field is required." under the box; nothing is sent, and the
window keeps working.

## Cause

`UserGroupGridHandler::updateUserGroup()` answers a refused "OK" with
the form again: `readInputData()`, `validate()` fails, `fetch()`. The
server's check is `FormValidatorLocale` on `name` and `abbrev`, which
trims the value, while the window's own check (the field's `required`)
does not; so a value of spaces is the input the screens let through to
this path. Every other refusal of this form would take it too.

The re-shown form lacks everything `UserGroupForm::initData()` alone
provides (`lib/pkp/controllers/grid/settings/roles/form/UserGroupForm.php`,
lines 106-151 on `main`), because only `editUserGroup()`, which opens
the window, calls `initData()`:

- `roleForbiddenStagesJSON` (line 116). The template prints it raw into
  the window's script (`userGroupForm.tpl` line 20,
  `roleForbiddenStagesJSON: {$roleForbiddenStagesJSON},`), so the
  re-shown script reads `roleForbiddenStagesJSON: ,`, a syntax error.
  The window's `UserGroupFormHandler` is never attached, and "OK" falls
  back to the browser's own form submit, which shows the JSON answer as
  a page. The introducing commit added this value and the template line.
- `stages` (line 110), so "Stage Assignment" has no boxes, and the next
  post carries no stage.
- `userGroupId` (line 134), so the re-shown edit window has no hidden
  `userGroupId`. The next post is handled as a new role
  (`_getUserGroupForm()` reads `(int) userGroupId`, 0), with no
  `roleId` either (its select is disabled on an edit, so never posted),
  and is refused by the `roleId` check: nothing is saved.
- `roleId` on an edit: `readInputData()` reads it from the post, which
  never carries the disabled select, so "Permission level" shows its
  first option.
- `mySettingsAccessUserGroupIds`, the list behind the guard that stops a
  manager unticking their only Settings role; the template defaults it
  to `[]`, so the guard is off in a re-shown edit window.

Reach:

- Other legacy forms that print a value raw into their script: only
  `navigationMenuItemsForm.tpl` (`itemTypeDescriptions`,
  `itemTypeConditionalWarnings`), whose form assigns both in `fetch()`,
  so a refused save there is shown whole (checked in the code).
- A second role of the same name: nothing in `UserGroupForm` refuses one
  (checked in the code), so a manager who creates the role again gets
  two.

## Proposed fix

A proposal; the team decides. Give the window what it needs in `UserGroupForm::fetch()`, which runs
for both the opened and the refused window, and keep only the stored
values in `initData()`. This is how the form already passes its other
script options (`selfRegistrationRoleIds`, `permitSettingsRoleIds`,
`recommendOnlyRoleIds`) and how `PKPNavigationMenuItemsForm::fetch()`
passes its JSON. The diff,
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-name-spaces-window-broken/fix.diff),
moves `stages`, `roleForbiddenStagesJSON`, `userGroupId` and
`mySettingsAccessUserGroupIds` from `initData()` to template assigns in
`fetch()`, sets an edited role's stored `roleId` there for display, and
makes an unposted `assignedStages` an empty list: with the boxes back,
the checkbox group otherwise fails on the server (`in_array(): Argument
#2 ($haystack) must be of type array, null given`) when no stage was
ticked.

```php
// fetch(), before parent::fetch()
$templateMgr->assign('stages', WorkflowStageDAO::getWorkflowStageTranslationKeys());
$this->setData('assignedStages', (array) $this->getData('assignedStages')); // none ticked is not posted
$jsonMessage = new JSONMessage();
$jsonMessage->setContent($roleDao->getForbiddenStages());
$templateMgr->assign('roleForbiddenStagesJSON', $jsonMessage->getString());

$userGroup = $disableRoleSelect ? UserGroup::findById($this->getUserGroupId(), $this->getContextId()) : null;
$templateMgr->assign('userGroupId', $userGroup?->id);
if ($userGroup) {
    $this->setData('roleId', $userGroup->roleId);
    // … mySettingsAccessUserGroupIds, as initData() built it
    $templateMgr->assign('mySettingsAccessUserGroupIds', array_values($mySettingsAccessUserGroupIds));
}
```

Tried on OJS, OMP and OPS `main`: steps 6 and 12 show the refusal
with every stage box in place, "Assistant" kept and no script error;
steps 8 and 14 close the window with "Your changes have been saved.",
"u54w46 Desk" is created and "Editorial Board Member" is renamed, with
no second role. An empty "Role Name" is still refused by the window
alone, and a plain create and edit save as before.

The stored `roleId` is set in `fetch()`, not in `readInputData()`, on
purpose. Set there, it would also reach `_assignStagesToUserGroup()` on
every edit's save, whose stage filter (`getForbiddenStages($roleId)`)
today gets no role on an edit and filters nothing. Through the screens
that changes nothing, since the window's script disables the forbidden
boxes and a disabled box is not posted; but it changes what every edit
stores for a post the window does not send, which belongs to that
filter's own fix rather than to this one.

**Alternatives**:

- `|@json_encode` on `roleForbiddenStagesJSON` in the template: the
  script would then fail on `.content` of `null`, and the boxes and the
  edited role's id would still be missing.
- Call `initData()` again before `fetch()` in `updateUserGroup()`: it
  would overwrite what the manager typed with the stored values.
- Refuse spaces in the window as well (a trimming `required` check):
  worth doing for every legacy form, but it changes the shared
  validation script and leaves the refused window broken for any other
  refusal.

**What goes with it**:

- No stored data is wrong, so no repair.
- A plugin on the `usergroupform::display` hook that calls
  `getData('stages')` or `getData('roleForbiddenStagesJSON')` would now
  get null; the values are template variables.
- 3.5:
  [fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-name-spaces-window-broken/fix-stable-3_5_0.diff),
  the same change rebased (3.5's `initData()` also sets `showTitle`);
  it applies to the three apps' 3.5 pkp-lib (checked with `git apply
  --check`, not walked). 3.4 and 3.3 need it rewritten: they read the
  role with `Repo::userGroup()->get()` and `getId()` / `getRoleId()` (3.3
  through the DAO, without namespaces), and have no
  `mySettingsAccessUserGroupIds`.
- The fix for spec U54 A2 and A3
  ([U54-A2-A3-manager-role-stages-differ-until-saved.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A2-A3-manager-role-stages-differ-until-saved.md))
  also changes `UserGroupForm.php`, in `execute()` and
  `_assignStagesToUserGroup()`. The two diffs apply together on `main`
  in either order (`patch --dry-run` of this `fix.diff` and its
  `fix-ojs.diff`, one after the other).

Small: one pkp-lib file, following the form's own pattern, and tried.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-name-spaces-window-broken/walk.js),
  on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/role-name-spaces-window-broken/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1-14,
  records each answer, the window's text, its stage boxes, its hidden
  role id, the page's address, the script errors and the stored rows;
  then the neighbour: an empty "Role Name" (refused by the window,
  nothing sent), a plain "Create New Role" and a plain "Edit" (saved).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, each on a
  freshly loaded default dataset: the same Observed on both lines. The
  role saved at step 8 is stored as "u54w46 Desk" with abbreviation
  "u54w46". The neighbour gave the same result with and without the fix.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/role-name-spaces-window-broken/fix.diff ojs omp ops`
  and the same walk on `main`, on the three apps.
- Branch tips: `main`: pkp-lib 2e377d27fc (OJS) and 3dc90c81a6 (OMP,
  OPS), the same `UserGroupForm.php` in both. `stable-3_5_0`: OJS
  92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd, pkp-lib a9c76aed62.
  `stable-3_4_0`: pkp-lib df13621c2d. `stable-3_3_0`: pkp-lib
  d446601ebe. Default dataset from pkp/datasets 38ab955 (2026-09-30).
  Walks on PostgreSQL; the fault does not depend on the database.
- 3.4 and 3.3 (code): `UserGroupForm.php` (3.3 `.inc.php`) sets `stages`,
  `roleForbiddenStagesJSON` and `userGroupId` in `initData()` only, the
  template prints `roleForbiddenStagesJSON` raw, `updateUserGroup()`
  answers a refusal with `readInputData()`, `validate()`, `fetch()`, and
  `FormValidatorLocale` trims the value.
- Introduced: `git log -S roleForbiddenStagesJSON` gives ccef8b4309
  (blame shows only the PSR-12 reformat e3f570bc37). `stages` and
  `userGroupId` were already set only in `initData()` before it (read at
  its parent and at df4a90110c, 2013, where the roles grid moved from
  OMP), so a refused window lost its boxes and its edited role before
  2014; ccef8b4309 made its script fail.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by the
  symptom's words and by `UserGroupForm` and `roleForbiddenStagesJSON`.
  Read and not the same fault: `pkp/pkp-lib#11337`, `pkp/pkp-lib#11946`
  (other role-window errors), `pkp/pkp-lib#12826` (remove the grid
  code).
- Unverified: the browser's Back button from the page of code (the walk
  returned by Users & Roles' address); the wording of the refusal behind
  step 14's page (`settings.roles.roleIdRequired` expected from the
  code), which the window's script would have fetched; a second role of
  the same name (read in the code, not walked).
