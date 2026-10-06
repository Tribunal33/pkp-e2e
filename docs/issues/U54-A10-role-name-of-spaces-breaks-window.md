# A role name of spaces breaks the role window, and the second "OK" leaves Settings for a page of code

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [df4a90110c](https://github.com/pkp/pkp-lib/commit/df4a90110c8f3a9fd7191b359a2f48bac5f4a472) (2013-02-14)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager types only spaces as a role's "Role Name" or "Abbreviation"
in Settings › Users & Roles › "Roles" and presses "OK". There is no
"This field is required." under the box. The window stays open with
"Errors occurred processing this form" at its top, and a script error
the manager does not see breaks it. The window has lost its "Stage
Assignment" boxes. When it was opened with "Edit", it also no longer
knows which role it belongs to.

The manager corrects the box and presses "OK" a second time, and the
browser leaves Settings for a page of raw code. On "Create New Role" the
role is saved anyway, but without the stages ticked before the refusal,
and nothing says so. On "Edit" nothing is saved.

Only a name or abbreviation that is empty once its spaces are removed
leads there. The form has no other check a person can fail by typing.

## Impact

- **Lost**: an edit to a role; a new role's stages, silently.
- **Who**: a manager who leaves only spaces in the box, in "Create New
  Role" or a role's "Edit".
- **Way round**: none on the page of code. The manager has to press the
  browser's Back button, reload Settings › Users & Roles, and fill the
  window again. Then they have to tick the new role's stages in the
  list.

Medium: creating or changing a role goes wrong, a new role loses its
stages without a word, and the only way back is the browser's Back and
a reload. It sits no higher because only a blank-after-spaces name or
abbreviation reaches it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. The
  `stable-3_5_0` dataset, OMP and OPS take the same steps.

Creating a role:

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Users & Roles and open the "Roles" tab.
3. Press "Create New Role". Choose "Permission level" "Assistant" (the
   same label in all three apps) and tick "Copyediting" [OPS:
   "Production"] under "Stage Assignment". Type three spaces into "Role
   Name" and "U54G" into "Abbreviation".
4. Press "OK".
5. Replace the spaces in "Role Name" with "u54g role" and press "OK"
   again.
6. Press the browser's Back button, reload Settings › Users & Roles,
   open the "Roles" tab and look at the "u54g role" row.

Editing a role:

7. On the "Copyeditor" row [OPS: "Author"] press the "Settings" arrow,
   then "Edit".
8. Replace the "Abbreviation" "CE" [OPS: "AU"] with three spaces.
9. Press "OK".
10. Type "CE" [OPS: "AU"] back into "Abbreviation" and press "OK" again.

**Expected:** at steps 4 and 9 the window refuses the blank box and
stays as it was, its "Stage Assignment" boxes and "Permission level"
included, so the box can be corrected. Step 5 closes the window with
"Your changes have been saved.", and at step 6 "u54g role" has
"Copyediting" ticked. Step 10 closes the window and saves "Copyeditor".

**Observed:** at step 4 the window stays open with no message under the
box and this notice at its top:

```
Errors occurred processing this form
You need to define a role name. (English)
```

The browser console shows the page's script failing:

```
Failed to execute 'appendChild' on 'Node': Unexpected token ','
```

The "Stage Assignment" boxes are gone; only the heading and "You need
to define a stage to assign to." are left. Step 5 leaves Settings for
the address `…/$$$call$$$/grid/settings/roles/user-group-grid/update-user-group`,
which shows only:

```
{"status":true,"content":"","elementId":"0","events":[{"name":"dataChanged"},{"name":"userGroupUpdated","data":{"isGlobalEvent":true}}]}
```

At step 6 "u54g role" is listed at the "Assistant" level with every
stage box unticked.

Step 9 gives the same notice, naming "You need to define a role
abbreviature. (English)", and the same script failure. The stage boxes
are gone, and "Permission level" now reads "Journal Manager" [OMP:
"Press Manager"; OPS: "Manager"] instead of "Assistant" [OPS:
"Author"]. Step 10 leaves Settings for the same address, this time
showing the window's code as text (`{"status":true,"content":"<script
type=\"text\/javascript\">…`). "Copyeditor" is unchanged and no role
is added.

An empty "Role Name" or "Abbreviation", the neighbouring case, is
refused in the browser with "This field is required." under the box,
and nothing is sent.

## Cause

`UserGroupGridHandler::updateUserGroup()`
(`lib/pkp/controllers/grid/settings/roles/UserGroupGridHandler.php`)
reads the post with `readInputData()`. When `validate()` refuses it,
the handler returns `$userGroupForm->fetch($request)` to be drawn in
place of the window.

But `UserGroupForm`
(`lib/pkp/controllers/grid/settings/roles/form/UserGroupForm.php`) sets
the values its template needs only in `initData()`. That runs when the
window is first opened, not on this path, and the post carries none of
these values:

- `stages`, the list the "Stage Assignment" boxes are drawn from;
- `roleForbiddenStagesJSON`, which `userGroupForm.tpl` prints unescaped
  into the handler's options (`roleForbiddenStagesJSON: {$roleForbiddenStagesJSON},`);
- `userGroupId`, the hidden input that makes a save an edit;
- `roleId` of an existing role, whose "Permission level" select is
  disabled and so never posted;
- `mySettingsAccessUserGroupIds`, which greys out "Permit changes to
  Settings" on the manager's own Settings role.

So the refused window is drawn with `roleForbiddenStagesJSON: ,`, which
is a syntax error. jQuery's `replaceWith()` runs the inline script, the
script fails ("Unexpected token ','"), and `UserGroupFormHandler` is
never attached to the new form.

The new form's "OK" is then an ordinary form submission: the browser
posts to `update-user-group` and shows the JSON answer as a page. With
no stage boxes drawn, the post carries no `assignedStages[]`, so
`execute()` creates the role without stages. On an edit the post has
neither `userGroupId` nor `roleId`, so the form takes it for a new role
and refuses it with the `roleId` check of `__construct()`.

What reaches the refusal. The checks `UserGroupForm::__construct()`
adds are:

- `name` and `abbrev` required in the primary language
  (`FormValidatorLocale`, which trims);
- `roleId` required on a new role;
- `FormValidatorPost` and `FormValidatorCSRF`.

There is no length, duplicate or format check.

- The browser's own check refuses an empty primary-language box before
  anything is sent. But jQuery Validation's `required` does not trim, so
  spaces pass it. That is the only typed input the server refuses
  (walked).
- "Permission level" always holds a value, so the `roleId` check is
  never failed from the window.
- The POST and CSRF checks fail only on a request the window does not
  make, or on a session token that changed while the window was open
  (code, not walked).
- A plugin's `usergroupform::validate` hook can add refusals, and they
  take the same path (code).

Another legacy form, `navigationMenuItemsForm.tpl`, also prints
unescaped JSON into its handler's options. `PKPNavigationMenuItemsForm`
assigns it in `fetch()`, so its refused redraw is whole (code).

## Proposed fix

Set in `UserGroupForm::fetch()` the values the window needs on every
draw, and keep in `initData()` only the role's own editable values
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-name-of-spaces-breaks-window/fix.diff)).
The values are the stage list, the forbidden stages JSON, and for an
existing role its id, its level and `mySettingsAccessUserGroupIds`.
`assignedStages` defaults to `[]` there: a save with no stage ticked
posts none, and once the boxes are drawn again `checkboxGroup.tpl` calls
`in_array()` on it. The part in `fetch()`:

```diff
+        // What the window needs on every draw. A refused save is drawn again after
+        // readInputData(), not initData(), and the post carries none of this.
+        $this->setData('stages', WorkflowStageDAO::getWorkflowStageTranslationKeys());
+        $this->setData('assignedStages', $this->getData('assignedStages') ?? []); // no box ticked posts nothing
         $roleDao = DAORegistry::getDAO('RoleDAO'); /** @var RoleDAO $roleDao */
+        $jsonMessage = new JSONMessage();
+        $jsonMessage->setContent($roleDao->getForbiddenStages());
+        $this->setData('roleForbiddenStagesJSON', $jsonMessage->getString());
+
+        $userGroup = UserGroup::findById($this->getUserGroupId(), $this->getContextId());
+        if ($userGroup) {
+            // The level select is disabled for an existing role, so it is never posted.
+            $this->setData('userGroupId', $userGroup->id);
+            $this->setData('roleId', $userGroup->roleId);
+            // (the mySettingsAccessUserGroupIds query, moved here from initData())
+        }
```

The fix follows `PKPNavigationMenuItemsForm::fetch()` and this form's
own `fetch()`, which prepare their display values there, but it uses
`setData()` where they use `$templateMgr->assign()`. That is because
`Form::fetch()` assigns the form's data after them. After
`readInputData()` the data holds `roleId` and `assignedStages` as
`null`, and that `null` would overwrite an `assign()`d value. One way
for all five keeps it simple.

Tried on OJS, OMP and OPS `main`. With the fix in, steps 4 and 9 keep
the window whole with no script error: its stage boxes with
"Copyediting" still ticked, its level and its role. The second "OK"
saves without leaving Settings, and at step 6 "u54g role" has
"Copyediting" [OPS: "Production"] ticked.

**Alternatives**:

- A default in the template (`{$roleForbiddenStagesJSON|default:'{}'}`)
  stops the script failure but leaves the redrawn window without its
  stages, its level and its role's id. The second "OK" would still
  lose the stages or be refused.
- Calling `initData()` before `readInputData()` in `updateUserGroup()`
  works too, but it costs a second database read on every save, and the
  template keeps depending on the order of two calls.
- A trimming browser check (jQuery Validation's `normalizer`) would show
  "This field is required." for spaces, as an empty box gets. But a
  refusal from the server would still break the window. It can go with
  the fix.

**What goes with it**:

- Data: a role created without its stages shows them unticked in the
  list, where a manager can tick them. Nothing else is stored wrong.
- Callers: the grid handler is the form's only user in pkp-lib and the
  apps. Nothing reads `stages` or `userGroupId` from the form between
  `initData()` and `fetch()`.
- The fix for the "Permit changes to Settings" lock
  ([U54-A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A11-own-role-ok-removes-settings-access.md))
  moves the `mySettingsAccessUserGroupIds` query into a method,
  `getMySettingsAccessUserGroupIds()`. With both fixes in, `fetch()`
  calls that method.
- Backport:
  - **3.5:** the same lines, so the diff applies as written.
  - **3.4 and 3.3:** there is no `mySettingsAccessUserGroupIds`, so the
    backport moves four values: `stages`, `roleForbiddenStagesJSON`,
    `userGroupId` and `roleId`. It reads the role with
    `Repo::userGroup()->get()` on 3.4 (`UserGroupForm.php`) and
    `UserGroupDAO::getById()` on 3.3 (`UserGroupForm.inc.php`).
- Test: an e2e scenario that creates a role at "Assistant" with one
  stage ticked, refuses a name of spaces, then saves a real name, and
  expects the stage on the new row.

Small: values moved between two methods of one pkp-lib class, and one
scenario.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-name-of-spaces-breaks-window/walk.js)
  (helpers in `lib.js` beside it) takes both groups of Steps. It records
  each "OK"'s post, its answer, whether the browser left the page, and
  the page's script errors.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/role-name-of-spaces-breaks-window/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to. `WALK_PART=create` or `WALK_PART=edit` in front
    takes one group only.
  - **Neighbour check:**
    [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-name-of-spaces-breaks-window/neighbour.js),
    the same way. It read the same with the fix in and out:
    "Copyeditor" opened with its level, its ticked stage and its id; an
    empty "Role Name" was refused in the browser with nothing sent;
    `dbarnes`'s "Journal editor" [OMP: "Press editor"] had "Permit
    changes to Settings" ticked and greyed; an abbreviation change was
    stored.
- Walks:
  - On OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL;
    datasets from pkp/datasets c657990 (2026-10-01).
  - The creating group was first walked at the "Journal Manager" level
    on all six. The second post carried no stage there either, but
    `execute()` gives a manager-level role every stage.
  - The "Assistant" creating group (steps 1–6) was walked on all three
    apps on `main` and on OJS on `stable-3_5_0`. In every walk the new
    role had no stage stored.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/role-name-of-spaces-breaks-window/fix.diff ojs omp ops`,
  walk and neighbour check each on a freshly loaded dataset, then
  reverted. A first version without the `assignedStages` default
  answered 500 at step 4 (`in_array(): Argument #2 ($haystack) must be
  of type array, null given` in `checkboxGroup.tpl`).
- Not driven: 3.4 and 3.3; a changed session token while the window is
  open; the "Assistant" creating group on OMP and OPS `stable-3_5_0`.
- Tips:
  - **`main`:** OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794
    (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - **`stable-3_5_0`:** OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP
    c7b45f88e, OPS 8eaf899468 (lib/pkp 1fb843f491).
  - **`stable-3_4_0`:** OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 32b0f4b4af.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib f6ab331645.
- Code reads beyond those the Cause names:
  - `Form::fetch()` and `Form::validate()`, `AjaxFormHandler` and
    `Handler.replaceWith()`, `RoleDAO::getAlwaysActiveStages()`.
  - A search of every `.tpl` for an unescaped variable in a handler's
    options.
  - On pkp-lib `stable-3_4_0` and `stable-3_3_0`: `initData()`,
    `fetch()`, `updateUserGroup()` and the template, with the same four
    values set only in `initData()`. jQuery Validation 1.19.5 there,
    whose `required` does not trim either.
- The trace:
  - `git blame` on the `initData()` lines gives e3f570bc37 (the PSR-12
    reformat, `pkp/pkp-lib#5678`).
  - `git log -S` gives
    [ccef8b4309](https://github.com/pkp/pkp-lib/commit/ccef8b4309290702b7b81251f0d94176591b7d84)
    (2014-03-19, Bruno Beghelli (beghelli), bug 8609 in pkp's old
    tracker, no PR). It added `roleForbiddenStagesJSON` to `initData()`
    and the template, which brought the script failure.
  - df4a90110c (2013-02-14, Jason Nugent, "migrate roles grid from OMP")
    already set `stages` and `userGroupId` only in `initData()`; it is
    older than pkp-lib's copy.
- Upstream searches (2026-10-02) in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library:
  - Searched by role name spaces, "role abbreviature",
    roleForbiddenStagesJSON, UserGroupForm, "Errors occurred processing
    this form" and "Unexpected token".
  - Related but not this fault: `pkp/pkp-lib#11337` and
    `pkp/pkp-lib#10854` (server errors on saving a role option, fixed);
    `pkp/pkp-lib#12826` (removing the grid code, open), which would
    replace this window.
