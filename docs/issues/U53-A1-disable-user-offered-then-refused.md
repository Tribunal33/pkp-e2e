# A manager's "Disable User" on a user they may not administer opens a window that refuses it

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; the older users grid)
  - 3.3: OJS, OMP, OPS (code; the older users grid)
- **Introduced** not traced; present since at least [cca31520](https://github.com/pkp/pkp-lib/commit/cca31520cc641d5bae2195734da246c266ec7a1a) (2013-02-14)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U53 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles, a manager who is not the Site
Administrator is offered "Disable User" (or "Enable User") on rows they
may not administer. The manager can be a journal, press or server
manager, or an editor. Those rows are the Site Administrator's, and
those of users with a current role in a journal the manager does not
manage.

Choosing the item opens the "Disable {name}" window, which then
refuses: "You do not have sufficient permissions to administer this
user. In order to administer a user, you must either be site
administrator, or administer all contexts that this user is enrolled
in.", with only "Close". The account stays as it was.

On the same rows the menu already leaves out "Login As" and "Merge
user". Those two follow their own rule only loosely: they are hidden on
some rows where they would work.

## Impact

- **Lost:** nothing. The manager spends a click on an action they may
  not take.
- **Who:** every manager who is not the Site Administrator. A Site
  Administrator who creates a journal is given its manager role, so the
  Site Administrator is listed in most journals' users. On a site with
  several journals, the same goes for each user who also holds a
  current role in another journal, such as a reader or author
  registered in two.
- **Way round:** ask the Site Administrator. A manager of every journal
  the user holds a current role in can also disable or enable them.

Low: the refusal is intended and the window explains it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`): the OJS
  journal, OMP press or OPS server `publicknowledge`. In it `admin`
  ("admin admin") is the Site Administrator and "Journal manager"
  ("Press manager", "Preprint Server manager"). `rvaca` (Ramiro Vaca) is
  a manager and nothing more. `zwoods` (Zita Woods; on OMP `zzedd`,
  Zayan Zedd) is an Author and Reader in `publicknowledge` only.
- A second journal, since the dataset has one. Sign in as `admin` and
  open Administration › "Hosted Journals" › "Create Journal" ("Create
  Press", "Create Server"). Fill in "Journal title" "u53r20 Second
  Journal", "Journal initials" "U53", "Principal Contact Name" "admin
  admin", "Principal Contact Email address" "pkpadmin@mailinator.com",
  any "Country", and "Path" "u53r20". Tick "English" under "Languages",
  pick "English" as "Primary locale", tick "Enable this journal to
  appear publicly on the site", then press "Save".
- Zita Woods takes a role there. Sign in as `zwoods` (`zzedd`), open
  "Edit Profile" › "Roles" › "Register with other journals" ("… other
  presses", "… other servers"), tick "Reader" under "u53r20 Second
  Journal", and press "Save".

Disabling:

1. Sign in as `rvaca`.
2. Open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`).
3. On "admin admin"'s row open "More Actions". It offers "Edit",
   "Email", "Remove User", "Disable User". Choose "Disable User".
4. Press "Close". On "Zita Woods"'s row open "More Actions" (the same
   four items) and choose "Disable User".

Enabling:

5. Sign in as `admin`. In Settings › "Users & Roles", choose "Disable
   User" on "Zita Woods"'s row, leave "Reason for disabling user" empty
   and press "OK".
6. Sign in as `rvaca` and open Settings › "Users & Roles". "Zita Woods"'s
   row now offers "Enable User". Choose it.

**Expected:** `rvaca`'s menu on "admin admin"'s and "Zita Woods"'s rows
offers neither "Disable User" nor "Enable User", as it already offers no
"Login As" or "Merge user" there. The Site Administrator's menu still
offers them on "Zita Woods"'s row (step 5).

**Observed:** at step 3 the window opens and refuses, with no reason box
and only "Close". Its content is the answer to the request it loads:

```
Disable admin admin
Current Roles : Journal manager
You do not have sufficient permissions to administer this user. In order to administer a user, you must either be site administrator, or administer all contexts that this user is enrolled in.
```

```
GET /index.php/publicknowledge/$$$call$$$/grid/settings/user/user-grid/edit-disable-user?rowId=1&enable
200 {"status":false,"content":"You do not have sufficient permissions to administer this user. In order to administer a user, you must either be site administrator, or administer all contexts that this user is enrolled in.","elementId":"0","events":[]}
```

Steps 4 and 6 show the same refusal under "Disable Zita Woods" and
"Enable Zita Woods", "Current Roles : Reader, Author". After step 6,
Zita Woods is still disabled.

Controls:

- After step 4, `rvaca`'s "Disable User" on "David Buskins"'s row
  (`dbuskins`, a role in this journal only) opens "Disable David
  Buskins" with "Reason for disabling user", "Cancel" and "OK".
- After step 6, have `admin` enable Zita Woods again ("Enable User" ›
  "OK"). Then sign in as `zwoods`, untick "Reader" under "u53r20 Second
  Journal", and save, which ends that role. `rvaca`'s "Disable User" on
  her row now opens with the reason box and "OK", because an ended role
  does not count. Her menu there still has no "Login As" or "Merge
  user".

## Cause

The list's menu is built in
`lib/ui-library/src/managers/UserAccessManager/useUserAccessManagerConfig.js`,
`getItemActions()`. It adds "Disable User" / "Enable User" on every row
but the manager's own, with no permission check. "Login As" and "Merge
user" wait for `user.canLoginAs` and `user.canMergeUsers`, which the
users API computes. They came with
`pkp/pkp-lib#10290`
([67ffa3ee](https://github.com/pkp/pkp-lib/commit/67ffa3ee0f341f2118f0c4f7a78617698916473e),
2025-02-03), for the issue `pkp/pkp-lib#10637`, which took the older
grid's guards as the reference. The older grid had no guard on
"Disable", so no flag was added for it.

All three actions refuse on the same server rule:
`Validation::getAdministrationLevel($targetId, $actorId)`, called
without a context, must be `ADMINISTRATION_FULL`. The handlers that
check it are `LoginHandler::signInAsUser()`,
`UserGridHandler::mergeUsers()`, and `editDisableUser()` /
`disableUser()`. The rule is never met for a Site Administrator's
account, whoever acts. A manager meets it only for a user whose every
current role sits in a context where the manager holds a current
manager role. Neither the manager's ended roles nor the user's count.

Until `pkp/pkp-lib#11791`
([e19cbb0a](https://github.com/pkp/pkp-lib/commit/e19cbb0a7905c082315168d89dc122afc01c46ee),
2025-11-29), `canLoginAs` and `canMergeUsers` computed exactly that
rule, one user at a time. To batch them, #11791 moved both flags to
`Repo::user()->permissionMapForManager()`, which differs from the rule
in three ways:

- it counts ended roles on both sides;
- it returns true for every row when the viewer is a Site
  Administrator;
- it never covered "Disable User", which still has no flag.

Reach, all from this one fault:

- "Disable User" / "Enable User" offered and refused: walked on the
  Site Administrator's row and on a user with a current role in another
  journal. The same happens for a Site Administrator on a second Site
  Administrator's row (code; the dataset has one Site Administrator).
- "Login As" and "Merge user" hidden where the server allows them:
  walked on a user whose only role in the other journal has ended.
- "Login As" and "Merge user" offered and refused (code). This happens
  for a Site Administrator on a second Site Administrator's row. It
  also happens for a manager whose own manager role in another journal
  has ended, on a user with a current role there.
- The older grid, which only a Site Administrator opens on main and 3.5
  (Administration › "Hosted Journals" › the Settings wizard's "Users"
  tab), and which serves Settings › Users & Roles on 3.4 and 3.3:
  `UserGridRow` adds "Disable" / "Enable" to every row with no
  condition (code). "Login As" and "Merge User" there already check
  `$canAdminister`.
- Not this fault: "Remove User" on the Site Administrator's row is also
  offered and refused, but it has its own server check
  (`ADMINISTRATION_PROHIBITED` with the context). Its error message is
  [pkp-e2e#48](https://github.com/jardakotesovec/pkp-e2e/issues/48)
  (U53 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a2)).

## Proposed fix

Make the batched map compute the handlers' rule, and let it drive all
three flags, with a new `canDisable` beside `canLoginAs` and
`canMergeUsers`. The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/disable-user-offered-then-refused/fix.diff):

- pkp-lib `classes/user/Repository.php`: `permissionMapForManager(int
  $managerUserId, array $userIds, bool $isSiteAdmin = false)` becomes
  `getAdministrationLevel(…) === ADMINISTRATION_FULL`, batched. It
  makes one query for the manager's current manager contexts and one
  for the listed users' current roles outside them. A Site
  Administrator's account always counts as outside. It uses
  `UserUserGroup`'s `withActive()` scope, so "current" means what it
  means in `getAdministrationLevel()`.
- pkp-lib `classes/user/maps/Schema.php`: `mapUsersWithPermissions()`
  calls the map for a Site Administrator too, instead of filling it
  with true. `getPropertyCanLoginAs()` and `getPropertyCanMergeUsers()`
  lose their `isSiteAdmin` shortcut and read the map, and a new
  `getPropertyCanDisable()` reads it the same way. All three are false
  on the viewer's own row.
- pkp-lib `schemas/user.json`: a read-only `canDisable` boolean
  (`apiSummary`, `apiDetail`), beside `canMergeUsers`.
- ui-library `useUserAccessManagerConfig.js`:

```diff
-			actions.push({
-				label: user.disabled ? t('grid.user.enable') : t('grid.user.disable'),
-				icon: user.disabled ? 'User' : 'DisableUser',
-				name: Actions.USER_ACCESS_DISABLE_USER,
-				isWarnable: !user.disabled,
-			});
+			user.canDisable &&
+				actions.push({
+					label: user.disabled ? t('grid.user.enable') : t('grid.user.disable'),
+					icon: user.disabled ? 'User' : 'DisableUser',
+					name: Actions.USER_ACCESS_DISABLE_USER,
+					isWarnable: !user.disabled,
+				});
```

This brings the flags back to what they computed before #11791, while
keeping its batching: one rule, one map, two queries per list.

Tried on `main` in all three apps:

- `rvaca`'s menu on "admin admin"'s and "Zita Woods"'s rows read
  "Edit", "Email", "Remove User".
- "David Buskins"'s row kept all six items.
- Zita Woods's row, once her other role had ended, offered "Disable
  User" and also "Login As" and "Merge user" again.
- The Site Administrator's menu on her row was unchanged.

**Alternatives:**

- Guard the item on `user.canMergeUsers`, a one-line ui-library change.
  Rejected: the map behind it counts ended roles, so it would hide
  "Disable User" where it works (walked), and it would keep the "Login
  As" / "Merge user" mismatch.
- Add a second, exact map for `canDisable` only, and leave
  `permissionMapForManager()` as it is. This was the first version of
  this fix, tried the same way. It gives two maps for one server rule
  and leaves "Login As" and "Merge user" wrong in both directions.
- Compute the flags per user with `Validation::getAdministrationLevel()`.
  This is exact by construction, but it costs one query per listed user
  on every user list, reviewer lists included, which is what #11791
  removed.

**What goes with it:**

- Behavior: "Login As" and "Merge user" come back on users whose roles
  elsewhere have all ended. They leave a second Site Administrator's
  row for a Site Administrator, and the rows a manager no longer
  manages. In each case the server already decides that way.
- API: one new read-only property on `/users` items. `canLoginAs` and
  `canMergeUsers` keep their names and meaning. Code outside the users
  map that calls `permissionMapForManager()` gets the corrected rule;
  the new parameter is optional.
- The older grid: guard its "Disable" / "Enable" with the
  `$canAdminister` that `UserGridRow` already computes for "Login As"
  and "Merge User". This is a few lines and was not tried, since the
  dataset has no second Site Administrator.
- ui-library: add `canDisable` to the `UserAccessManager` stories' mock
  users, or the stories lose the item.
- Backport: the diff applies to `stable-3_5_0` with line offsets
  (`patch --dry-run` on the OJS 3.5 tip, where the code is the same).
  3.4 and 3.3 have only the older grid, so the grid guard above is
  their fix.
- Guard: an e2e check that a manager's menu offers no "Disable User" on
  the Site Administrator's row or on a user with a current role in
  another journal, and that it offers "Disable User", "Login As" and
  "Merge user" on a user whose role elsewhere has ended. A pkp-lib unit
  test comparing the map with `getAdministrationLevel()` would need
  database fixtures that `tests/classes/security` does not have.

Medium: the fix spans pkp-lib and ui-library. It adds an API property,
rewrites the batched query behind two existing flags (whose menu
offers change), and leaves the older grid's guard as a follow-up.

## Evidence

- The kept script takes the Steps on all three apps, with both
  controls and the Site Administrator's own menu:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/disable-user-offered-then-refused/walk.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/disable-user-offered-then-refused/walk.js`
  (put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix was tried 2026-10-01 on the `main` tips below, on a freshly
  loaded dataset:
  `node bin/try-fix.js apply shared/playwright/checks/issues/disable-user-offered-then-refused/fix.diff ojs omp ops`,
  then walk.js, then `node bin/try-fix.js revert ojs omp ops`. Without
  the fix, both controls showed the same as with it, apart from "Login
  As" and "Merge user" on the ended-role row.
- Walked on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, and no
  upgrade was needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6); lib/ui-library 280f98c5 in all
    three.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62, lib/ui-library 1a7a4750). Observed matched `main` word
    for word. `useUserAccessManagerConfig.js`, the handlers and
    `permissionMapForManager()` are the same code there.
  - No request behind the Steps failed, and there was no page script
    error. MySQL not checked.
- Introduced: the unguarded "Disable" and the handler's `canAdminister`
  refusal are both in pkp-lib's
  [cca31520](https://github.com/pkp/pkp-lib/commit/cca31520cc641d5bae2195734da246c266ec7a1a)
  ("port users grid from OMP", 2013-02-14, Jason Nugent), the oldest
  commit in the history read.
  - The Vue list carried the fault over in ui-library
    [e65555cf](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38)
    (`pkp/ui-library#437` for `pkp/pkp-lib#9658`, 2025-02-04, Ipula
    Indeewara, ipula; found with `git log -S USER_ACCESS_DISABLE_USER`).
    It added permission checks for "Login As" and "Merge user" only, and
    [2e15e1d9](https://github.com/pkp/ui-library/commit/2e15e1d9333eace07b8bb8562e4a513f721814f9)
    (2025-04-17) kept that.
  - The flags' drift from the handlers came with
    [e19cbb0a](https://github.com/pkp/pkp-lib/commit/e19cbb0a7905c082315168d89dc122afc01c46ee)
    (Hafsa-Naeem; `git show e19cbb0a -- classes/user/maps/Schema.php`
    shows the replaced `getAdministrationLevel()` calls).
- 3.4 and 3.3 (code): read lib/pkp `origin/stable-3_4_0` (df13621c2d) and
  `origin/stable-3_3_0` (d446601ebe), and lib/ui-library
  `origin/stable-3_4_0` (ee684b34) and `origin/stable-3_3_0` (96959f9e).
  The ui-library branches have no `UserAccessManager`.
  - `templates/management/accessUsers.tpl` loads the
    `grid.settings.user.UserGridHandler` grid, and `UserGridRow` adds
    "Disable" / "Enable" to every row with no condition.
  - `editDisableUser()` and `disableUser()` refuse with
    `grid.user.cannotAdminister` unless `getAdministrationLevel()` is
    `ADMINISTRATION_FULL` (3.4) or `Validation::canAdminister()` is true
    (3.3).
  - App tips: OJS 9571d8fde7 / 9fdb9bcf9a, OMP 0aec65441 / 8e72fc883,
    OPS acd8ae704b / c5532e2161. No app file is involved.
  - Not walked, so how the older grid shows the refusal there is not
    checked.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for the
  symptom's words, "sufficient permissions to administer",
  `cannotAdminister` and `canMergeUsers`. The nearest,
  `pkp/pkp-lib#10637`, asked for `canLoginAs` and `canMergeUsers` and
  does not mention disabling.
- Unverified:
  - Read in the code only: the second Site Administrator's row (Vue list
    and older grid), the manager whose own manager role elsewhere has
    ended, and a manager with no current manager role anywhere.
  - Not pressed: "Login As" and "Merge user" on the ended-role row with
    the fix. The fix offers them there because they share the server
    rule that "Disable User" passed on that row.
