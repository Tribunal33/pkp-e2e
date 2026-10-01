# "Merge user" and wizard user lists show no roles after a 3.4 upgrade or for a journal's creator, but list a just-ended role

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; roles have no start or end date)
  - 3.3: none (code; roles have no start or end date)
- **Introduced** `pkp/pkp-lib#11274` (main) and `pkp/pkp-lib#11216` (stable-3_5_0), the role invitation fixes · [73b84cf0](https://github.com/pkp/pkp-lib/commit/73b84cf02f91b9e639e289c9031da8214aa5ed6d) · 2025-04-02 · Ipula Ranasinghe (ipula)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a13), [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a17)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

2026-10-01: spec U53 A17 (a role just ended still listed) joined this report.

## Summary

Two older user lists leave roles out of their "Roles" column: the
"Merge user" window, opened from Settings › Users & Roles, and the
"Users" tab of a journal's (press's, server's) Settings wizard under
Administration. A role stored without a start date is missing from the
user's "Roles" cell, while Users & Roles names it.

On an install upgraded from 3.4, no role given before the upgrade has a
start date, so the column is blank on every row. That is every site that
upgraded to 3.5 rather than installing it new, which is most sites
running 3.5. On a new install, only the administrator who created a
journal has a blank cell, for their manager role there.

The wizard's "Users" tab also lists a role that has just ended. When the
administrator unticks a role in "Edit User" and presses "OK", "User
edited." shows, but the user's row still lists the role until the page
is reloaded.

Nothing is lost: the merge moves the merged account's roles to the
account kept, and the role edit is saved. Users & Roles, or a reload,
shows the real roles.

## Impact

- **Lost:** nothing. The roles, the role edit and the removal are stored
  as asked; only the lists' "Roles" cells are wrong.
- **Who:** the Site Administrator, in the "Merge user" window and on
  the wizard's "Users" tab. On an upgraded install, every row is blank;
  on a new install, their own row in each journal they created. After
  "Edit User" or "Remove" on the wizard's tab, the row usually still
  lists the role just ended.
- **Way round:** both lists cover one journal, and that journal's Users
  & Roles lists its roles. In the "Merge user" window itself, the search
  form's role filter ("Journal editor", …) still finds the accounts that
  hold a role. A reload clears a just-ended role.

Low: the column misleads, but no task goes wrong because of it. A merge
cannot be undone, but what it decides is which login survives: the
merged account's username, email and password are deleted, and its
roles in every journal move to the account kept. The names, usernames
and emails in the row are what that choice needs, and they are right.
It would be medium if the direction of a merge decided more than the
login. Today one thing does, a section editor's section assignments,
which is the separate fault in
[U53-A9-merge-drops-section-editor-assignment.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A9-merge-drops-section-editor-assignment.md).

## Steps to reproduce

No start date:

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), context
  `publicknowledge`. In it `admin` holds the journal's manager role
  ("Journal manager"; "Press manager" on OMP, "Preprint Server manager"
  on OPS). That role came from creating the journal, so it has no start
  date. Ramiro Vaca (`rvaca`) and Daniel Barnes (`dbarnes`) were given
  their roles with a start date. Nothing is created.

1. Sign in as `admin` and open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`). The row
   "admin admin" (pkpadmin@mailinator.com) reads "Journal manager" under
   "Roles", and "Start Date" is empty. Ramiro Vaca's row reads "Journal
   manager", "2026-09-30".
2. On Ramiro Vaca's row, open "More Actions" and choose "Merge user".
3. In the "Merge user" window, press "Search" above the "Current Users"
   list. Type `admin` into the box and press the form's "Search".
4. Read the admin's row. Then search for `dbarnes` the same way and read
   Daniel Barnes's row.
5. Close the window. Open Administration › "Hosted Journals" ("Hosted
   Presses", "Hosted Servers"). Open the arrow on the `publicknowledge`
   row and choose "Settings wizard", then open the "Users" tab.
6. Search for `admin` and then `dbarnes`, as in steps 3 and 4.

After an upgrade from 3.4:

7. Load PKP's default test dataset for `stable-3_4_0` and upgrade it to
   `main` (`php tools/upgrade.php upgrade`). Take steps 1 to 6 again.

**Expected:** the admin's "Roles" cell reads "Journal manager" ("Press
manager", "Preprint Server manager") in both lists, as it does on Users
& Roles.

**Observed:** in both lists, on all three apps, the admin's "Roles" cell
is empty:

```
Given Name  Family Name  Username  Roles  Email address
admin       admin        admin           pkpadmin@mailinator.com
```

Daniel Barnes's row reads "Journal editor" ("Press editor", "Preprint
Server manager") in both lists.

After the upgrade (step 7, OJS), Users & Roles still names every role,
with an empty "Start Date" on every row. In both older lists every row's
"Roles" cell is empty, Daniel Barnes's and Ramiro Vaca's included: the
"Merge user" list's first page holds 25 rows ("1 - 25 of 35 items"),
none with a role.

A role just ended, "Edit User":

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), context
  `publicknowledge`. In it Carlo Corino (`ccorino`) holds "Author" and
  "Reader"; on OMP, Arthur Clark (`aclark`) holds the same two. Nothing
  is created.
- The fault shows only when the save and the row's redraw are answered
  in the same second, which is the usual case on a fast install. On a
  slow one (Xdebug on, cold caches) the redraw can fall into the next
  second and the row is right. The browser's network panel shows it:
  the HTTP `Date` of the `update-user` request and of the `fetch-row`
  request that follows it.

1. Sign in as `admin`. Open Administration › "Hosted Journals" ("Hosted
   Presses", "Hosted Servers"), open the arrow on the `publicknowledge`
   row, choose "Settings wizard" and open the "Users" tab.
2. Press "Search" above the list, type `ccorino` (`aclark` on OMP) and
   press the form's "Search". The row reads "Author, Reader" under
   "Roles".
3. Open the arrow at the start of the row and choose "Edit User".
4. Under "User Roles", untick "Author" and press "OK".
5. Read the row as the grid redraws it.
6. Reload the page, open the "Users" tab, search for `ccorino` again and
   read the row.

**Expected:** after "OK" the row reads "Reader", as it does after the
reload in step 6.

**Observed:** "User edited." shows, and the row still reads:

```
Carlo  Corino  ccorino  Author, Reader  ccorino@mailinator.com
```

After the reload in step 6 it reads "Reader". In every walk, on all
three apps on `main` and `stable-3_5_0`, the save and the row's redraw
were answered in the same second, the second stored as the role's end.

A role just ended, "Remove" (walked on `main`):

7. On the same tab, search for `ckwantes` (Catherine Kwantes; `afinkel`,
   Alvin Finkel, on OMP), whose row reads "Author, Reader".
8. Open the arrow at the start of her row, choose "Remove" and confirm.

**Expected:** the redrawn row's "Roles" cell is empty: she holds no
role in the journal any more.

**Observed:** the redrawn row still reads "Author, Reader". After a
reload the cell is empty.

## Cause

The "Roles" column of the older users grid
(`UserGridHandler::initialize()`, the anonymous `GridColumn` for
`roles`, `lib/pkp/controllers/grid/settings/user/UserGridHandler.php`)
lists the user's groups in the context through
`UserUserGroup::scopeWithActiveAndActiveInFuture()`
(`lib/pkp/classes/userGroup/relationships/UserUserGroup.php`). That
scope opens with `whereNotNull('user_user_groups.date_start')`, so it
drops every assignment that has no start date, active or not.

The code base treats a missing start date as "held since before start
dates were stored". `scopeWithActive()` counts `date_start IS NULL` as
begun, as do the user `Collector`, `RoleDAO`, `ContextDAO`,
`PKPContextQueryBuilder` and `NotificationSubscriptionSettingsDAO`. The
Users XML import comments that "the export writes no start date for
roles from before start dates were stored". `scopeWithActiveAndActiveInFuture()`
is the one reader of current roles that breaks that rule.

Assignments without a start date are ordinary data:

- The upgrade to 3.5 (`I9462_UserUserGroupsStartEndDate`) added
  `date_start` as a nullable column and filled nothing in. So every
  assignment made before the upgrade has none (step 7: all 54 of the
  journal's assignments).
- `PKPContextService::add()` stores the creating user's manager
  assignment with `'dateStart' => null`. It is the only writer of
  undated roles on a new install: `assignUserToGroup()`, the
  invitations and the Users XML import all store a date, and a merge
  copies the date it finds.

Until [73b84cf0](https://github.com/pkp/pkp-lib/commit/73b84cf02f91b9e639e289c9031da8214aa5ed6d)
the column read `withActive()`, which counts these rows. That change
moved the column to the new scope so that roles starting on a future
date would show too. The new scope's `whereNotNull` dropped the undated
ones.

Reach:

- The "Merge user" window and the Settings wizard's "Users" tab share
  this grid (on screen, all three apps). The scope has no other caller
  (code).
- Filtering the grid's search form by a role such as "Journal manager"
  still returns these users, since the `Collector` counts a null start,
  but their "Roles" cell stays empty (code).
- Removal (`removeUser()`, `endAssignments()`), the role checks in
  `RoleDAO` and the user counts per role read null starts as begun, and
  are not affected (code).

The scope's end test breaks the code base's rule for ended roles. It
keeps a role whose `date_end >= now`. Everywhere else a role ends at its
`date_end`: `scopeWithActive()`, `RoleDAO`, the user `Collector`,
`UserGroup`, `PKPContextQueryBuilder` and
`NotificationSubscriptionSettingsDAO` and `ContextDAO` count it only
while `date_end > now`, and `scopeWithEnded()` calls it ended from
`date_end <= now`. So a role whose end date is the current second is
ended everywhere else, but this scope still lists it.

That second is usually when the grid reads it.
`Repository::endAssignments()` stamps `date_end` with
`Core::getCurrentDate()`, the save's own second (`Y-m-d H:i:s`). The
save answers with a "data changed" event, and the grid then fetches the
row again, within milliseconds. `UserForm::saveUserGroupAssignments()`
("Edit User") and `UserGridHandler::removeUser()` ("Remove") both end
roles this way. A redraw that falls into the next second (a save late
in its second, or a slow install) shows the row correctly.
`Core::getCurrentDate()` gives whole seconds, so both sides of the
comparison are to the second whatever the database. The `>=` came with the same change, 73b84cf0, where the column
had read `withActive()` and its `>`. The comment beside it says "End
date in the future", so `>` is what was meant.

Reach of the end test:

- The wizard's "Users" tab, after "Edit User" (on screen, all three
  apps, `main` and 3.5) and after "Remove" (on screen, `main`).
- The "Merge user" window has the same column, so it would list a role
  that ended in the very second its list was fetched. No action in the
  window ends a role, and it opens in a request of its own, so in
  practice only the wizard's tab shows a just-ended role (code).
- No other query in lib/pkp or the apps compares `date_end` with `>=`
  (code).

## Proposed fix

Make `UserUserGroup::scopeWithActiveAndActiveInFuture()` follow
`scopeWithActive()`: count a missing start date as begun, and count a
role as ended from its `date_end` on
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-grid-admin-roles-empty/fix.diff)):

```diff
         $currentDateTime = Core::getCurrentDate();
-        return $query->whereNotNull('user_user_groups.date_start')
+        return $query
             ->where(function ($q) use ($currentDateTime) {
                 $q->where(function ($q) use ($currentDateTime) {
-                    $q->where('user_user_groups.date_start', '<=', $currentDateTime) // Active ones
+                    // Active ones; no start date means a role held since before start dates were stored (as in scopeWithActive())
+                    $q->where(fn ($q) => $q->where('user_user_groups.date_start', '<=', $currentDateTime)->orWhereNull('user_user_groups.date_start'))
                         ->where(function ($q) use ($currentDateTime) {
                             $q->whereNull('user_user_groups.date_end') // No end date means still active
-                                ->orWhere('user_user_groups.date_end', '>=', $currentDateTime); // End date in the future
+                                ->orWhere('user_user_groups.date_end', '>', $currentDateTime); // End date in the future; a role ended now is ended (as in scopeWithActive())
```

It keeps what 73b84cf0 was for: roles that start on a future date are
still listed, and ended roles are still left out.

The fix was tried on `main` on all three apps. The admin's row then read
"Journal manager" ("Press manager", "Preprint Server manager") in both
lists. After "Edit User" unticked "Author", the redrawn row read
"Reader", and after "Remove" it was empty, each redrawn in the save's
own second. Roles ended earlier also stayed out of the cell with the fix
in, read after a reload:

- Stephanie Berardo's, after "Remove User" on Users & Roles ended her
  one role.
- The admin's undated role, after the wizard grid's own "Remove" ended
  it.

A role granted in the same second stays listed: ticking "Author" again
in "Edit User" redrew the row as "Author, Reader" with the fix in, as
without it.

**Alternatives:**

- Store a start date when a journal is created (`PKPContextService::add()`
  through `Repo::userGroup()->assignUserToGroup()`, as before
  `pkp/pkp-lib#10506`). This alone fixes nothing already stored, and it
  leaves every assignment made before the 3.5 upgrade undated. A backfill
  would have to invent dates. It is worth doing as well, since
  `assignUserToGroup()` also writes the audit log entry.
- Switch the column back to `withActive()`. This would drop roles that
  start on a future date, which 73b84cf0 added on purpose.
- The `withNotEnded()` scope proposed in
  [U53-A19-remove-user-role-not-yet-begun-kept.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A19-remove-user-role-not-yet-begun-kept.md)
  selects the same rows. If that fix lands, the grid can use it and
  `withActiveAndActiveInFuture()` can go.

**What goes with it:**

- No data repair, no API or hook change.
- The diff applies as it stands to `stable-3_5_0`, where the file is
  identical.
- Only the grid's "Roles" column reads the scope.
- The guard: a unit test of the scope, the reliable one for both
  conditions, since an e2e check of the end test passes on unfixed code
  whenever the redraw falls into the next second. lib/pkp has no test
  for the `UserUserGroup` scopes; one needs the test database, as
  `DatabaseTestCase` gives (`FilterDAOTest` uses it). Its rows: no start
  date, a past start, a future start, a past end, and an end equal to
  `Core::getCurrentDate()`, which must be left out. An e2e check on the
  default dataset covers the start test deterministically: the admin's
  row in the "Merge user" list reads the manager role.

Small: two conditions in one shared scope, tried, and a unit test.

## Evidence

- Kept script that takes the Steps on all three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-grid-admin-roles-empty/walk.js),
  run on an install freshly loaded from PKP's default test dataset with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/merge-grid-admin-roles-empty/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front).
  `NEIGHBOUR=1` runs two checks of roles ended earlier, on a freshly loaded install:
  "Remove User" on Stephanie Berardo, then her "Merge user" row; and
  the wizard grid's "Remove" on the admin's own row, then that row again.
  The script also prints the `user_user_groups` rows it reads: the
  admin's manager row has `date_start` NULL, and Ramiro Vaca's and
  Daniel Barnes's have 2026-09-30.
- Kept script for the role just ended (the second group of Steps):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-user-ended-role-still-listed/walk.js),
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/edit-user-ended-role-still-listed/walk.js`
  on a freshly loaded install (on `stable-3_5_0` with
  `PKP_E2E_LINE=stable-3_5_0` in front). It also ticks "Author" again
  (the check that a role granted in the same second stays listed), and
  prints the HTTP `Date` of the save (`update-user`) and of the row's
  redraw (`fetch-row`) with the user's `user_user_groups` rows. `REACH=1`
  walks the grid's "Remove" instead.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/merge-grid-admin-roles-empty/fix.diff ojs omp ops`,
  the dataset reloaded, walk.js, the dataset reloaded again, walk.js with
  `NEIGHBOUR=1`, then `node bin/try-fix.js revert …`. Without the fix the
  two `NEIGHBOUR=1` checks (Stephanie Berardo, the admin's own
  "Remove") show the same empty cells, since both are read after a
  reload. The widened diff (both
  conditions) was tried the same way with both scripts: the first
  group's walk.js, and the second group's walk.js plain and with
  `REACH=1`.
- Walked 2026-10-01 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). The scope is identical in both
    lib/pkp commits.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62). The Observed is the same as on `main`, word for word.
  - The start test is a NULL test, so it does not depend on the
    database. The end test compares whole seconds on either database
    (code); MySQL not walked.
- Introduced: at lib/pkp 2e377d27fc, `git blame` on the scope's
  `whereNotNull` line gives 73b84cf0. The grid's
  `withActiveAndActiveInFuture()` line blames to 8a586abc
  (`pkp/pkp-lib#12336`, re-indentation only); `git log -S` gives
  73b84cf0, which replaced `withActive()` there and
  added the scope. Its PR is `pkp/pkp-lib#11274`, a port of
  `pkp/pkp-lib#11216` (stable-3_5_0, commit 15de87340a, in every 3.5.0
  release tag), which links `pkp/pkp-lib#11014`, `#11016` and `#11026`.
  The end test's `>=` line blames to 8ac8f5fa (`pkp/pkp-lib#11424`,
  re-indentation only); before it, 73b84cf0 wrote it, and the same `>=`
  is in 15de87340a on stable-3_5_0.
  The undated manager assignment on journal creation came with
  714d5d5a (`pkp/pkp-lib#10506`, 2024-10-15). Before it, creation used
  `assignUserToGroup()`, which dates the role today.
- 3.4 and 3.3, code: lib/pkp `origin/stable-3_4_0` (df13621c2d) builds
  the column from `Repo::userGroup()->userUserGroups()`, and
  `origin/stable-3_3_0` (d446601ebe) has `UserGridHandler.inc.php`.
  Neither branch has `date_start` or `date_end` on `user_user_groups`,
  which arrive with the 3.5 upgrade. Ending a role deletes the
  assignment there (`removeUserFromGroup()` and
  `deleteAssignmentsByContextId()`), so a redrawn row cannot list it.
  Not walked.
- Upstream: pkp/pkp-lib searched 2026-10-01 for "merge user roles
  empty", "merge users roles not shown", "user grid roles column", "date_start
  null roles", "admin journal manager role start date null" and
  `withActiveAndActiveInFuture` (no results). The nearest results,
  `pkp/pkp-lib#12017` (a scope that ignores the user) and
  `pkp/pkp-lib#11004` (a future-role message shown to users without a
  role), are other faults. pkp/ojs, pkp/omp and pkp/ops searched for
  "merge user roles": nothing related. For the role just ended,
  pkp/pkp-lib searched for "edit user role still shown", "removed role
  still listed grid", "date_end role removed still" and "user roles not
  updated after edit", pkp/ojs for "edit user role removed still listed"
  and pkp/ui-library for "role still listed after removed": nothing
  related.
- The upgraded install (step 7), walked 2026-10-01 on OJS only:
  pkp/datasets 38ab955 `ojs/stable-3_4_0/pgsql` (schema 3.4.0.11) loaded
  and upgraded to 3.6.0.0 on the OJS `main` tip above with the app's
  `php tools/upgrade.php upgrade` ("Successfully upgraded to version
  3.6.0.0"), then walk.js. All 54 `user_user_groups` rows of the
  journal had `date_start` NULL. OMP and OPS share the migration and the
  grid in lib/pkp and were not walked upgraded.
