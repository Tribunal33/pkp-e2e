# "Merge user" and the Settings wizard's user list show no roles after a 3.4 upgrade, and none for a journal's creator

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; roles have no start date)
  - 3.3: none (code; roles have no start date)
- **Introduced** `pkp/pkp-lib#11274` (main) and `pkp/pkp-lib#11216` (stable-3_5_0), the role invitation fixes · [73b84cf0](https://github.com/pkp/pkp-lib/commit/73b84cf02f91b9e639e289c9031da8214aa5ed6d) · 2025-04-02 · Ipula Ranasinghe (ipula)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a13)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The Site Administrator opens "Merge user" from Settings › Users &
Roles, or the "Users" tab of a journal's (press's, server's) Settings
wizard under Administration, where they add and edit a hosted
journal's users. Both lists show nothing under "Roles" for any role
stored without a start date, while Users & Roles names the role.

On an install upgraded from 3.4, every role given before the upgrade
has no start date, so the column is blank on every row: no account
appears to hold a role. On a new install only one row per journal is
blank: the manager role of the administrator who created the journal.

The merge itself works, and it moves the merged account's roles and
work to the account kept, so nothing is lost. But when picking which
account to keep, the administrator cannot see from the list which one
is the editor's or the manager's.

## Impact

- **Lost:** nothing stored. A merge cannot be undone, and the account
  merged away loses its username, email and password; its roles and
  work move to the account kept. A blank column does not lead to a
  wrong-way merge by itself, since the names, usernames and emails
  beside it are right.
- **Who:** the Site Administrator merging accounts or managing a hosted
  journal's users from Administration. On an install upgraded from 3.4,
  every row; on a new install, their own row in each journal they
  created.
- **Way round:** Settings › Users & Roles lists the roles of each
  account.

Low: the column is wrong, but nothing downstream reads it and the
merge's outcome does not depend on it. It would be medium if the merge
dropped the roles of the account merged away, which it does not.

## Steps to reproduce

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
- The scope's end test (`date_end >= now`, where `withActive()` has
  `> now`) is the subject of spec U53
  [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a17)
  and is left as it is here.

## Proposed fix

Count a missing start date as begun in
`UserUserGroup::scopeWithActiveAndActiveInFuture()`, the way
`scopeWithActive()` does
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
```

It keeps what 73b84cf0 was for: roles that start on a future date are
still listed, and ended roles are still left out.

The fix was tried on `main` on all three apps. The admin's row then read
"Journal manager" ("Press manager", "Preprint Server manager") in both
lists. Ended roles stayed out of the cell with the fix in:

- Stephanie Berardo's, after "Remove User" ended her one role.
- The admin's undated role, after the grid's own "Remove" ended it.
  This one may depend on timing: the row is redrawn in the same second
  the role ends, where the end test above (A17) still counts it.

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
- The guard: lib/pkp has no test for the `UserUserGroup` scopes, and one
  would need the database. The e2e guard is cheaper: on the default
  dataset, the admin's row in the "Merge user" list reads the manager
  role.

Small: one condition in one shared scope, and an e2e check.

## Evidence

- Kept script that takes the Steps on all three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-grid-admin-roles-empty/walk.js),
  run on an install freshly loaded from PKP's default test dataset with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/merge-grid-admin-roles-empty/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front).
  `NEIGHBOUR=1` runs the ended-role checks on a freshly loaded install:
  "Remove User" on Stephanie Berardo, then her "Merge user" row; and
  the wizard grid's "Remove" on the admin's own row, then that row again.
  The script also prints the `user_user_groups` rows it reads: the
  admin's manager row has `date_start` NULL, and Ramiro Vaca's and
  Daniel Barnes's have 2026-09-30.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/merge-grid-admin-roles-empty/fix.diff ojs omp ops`,
  the dataset reloaded, walk.js, the dataset reloaded again, walk.js with
  `NEIGHBOUR=1`, then `node bin/try-fix.js revert …`. Without the fix the
  ended-role checks show the same empty cells.
- Walked 2026-10-01 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). The scope is identical in both
    lib/pkp commits.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62). The Observed is the same as on `main`, word for word.
  - The fault is a NULL test, so it does not depend on the database.
- Introduced: at lib/pkp 2e377d27fc, `git blame` on the scope's
  `whereNotNull` line gives 73b84cf0. The grid's
  `withActiveAndActiveInFuture()` line blames to 8a586abc
  (`pkp/pkp-lib#12336`, re-indentation only); `git log -S` gives
  73b84cf0, which replaced `withActive()` there and
  added the scope. Its PR is `pkp/pkp-lib#11274`, a port of
  `pkp/pkp-lib#11216` (stable-3_5_0, commit 15de87340a, in every 3.5.0
  release tag), which links `pkp/pkp-lib#11014`, `#11016` and `#11026`.
  The undated manager assignment on journal creation came with
  714d5d5a (`pkp/pkp-lib#10506`, 2024-10-15). Before it, creation used
  `assignUserToGroup()`, which dates the role today.
- 3.4 and 3.3, code: lib/pkp `origin/stable-3_4_0` (df13621c2d) builds
  the column from `Repo::userGroup()->userUserGroups()`, and
  `origin/stable-3_3_0` (d446601ebe) has `UserGridHandler.inc.php`.
  Neither branch has `date_start` on `user_user_groups`, which arrives
  with the 3.5 upgrade. Not walked.
- Upstream: pkp/pkp-lib searched 2026-10-01 for "merge user roles
  empty", "merge users roles not shown", "user grid roles column", "date_start
  null roles", "admin journal manager role start date null" and
  `withActiveAndActiveInFuture` (no results). The nearest results,
  `pkp/pkp-lib#12017` (a scope that ignores the user) and
  `pkp/pkp-lib#11004` (a future-role message shown to users without a
  role), are other faults. pkp/ojs, pkp/omp and pkp/ops searched for
  "merge user roles": nothing related.
- The upgraded install (step 7), walked 2026-10-01 on OJS only:
  pkp/datasets 38ab955 `ojs/stable-3_4_0/pgsql` (schema 3.4.0.11) loaded
  and upgraded to 3.6.0.0 on the OJS `main` tip above with the app's
  `php tools/upgrade.php upgrade` ("Successfully upgraded to version
  3.6.0.0"), then walk.js. All 54 `user_user_groups` rows of the
  journal had `date_start` NULL. OMP and OPS share the migration and the
  grid in lib/pkp and were not walked upgraded.
- Unverified: whether the end-test timing above ever lists an ended role
  on screen.
