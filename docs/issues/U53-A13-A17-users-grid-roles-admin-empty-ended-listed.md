# "Merge user" and the Settings wizard's "Users" grid hide roles without a start date and list a role just ended

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; roles carry no dates)
  - 3.3: none (code; no "Roles" column)
- **Introduced** `pkp/pkp-lib#11274` (main; `pkp/pkp-lib#11216` on 3.5) for `pkp/pkp-lib#11014`, `pkp/pkp-lib#11016`, `pkp/pkp-lib#11026` · [73b84cf02f](https://github.com/pkp/pkp-lib/commit/73b84cf02f91b9e639e289c9031da8214aa5ed6d) · 2025-04-02 · ipula (ipula)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a13), [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a17)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Two lists share one "Roles" column: the "Merge user" window, where a
manager picks the account to merge another into, and the "Users" tab of
a journal's Settings wizard under Administration. That column leaves
out every role that has no recorded start date. On an install upgraded
from 3.4, no role carried over from before the upgrade has one, so most
accounts show an empty "Roles" cell, or only the roles given since. On
a new install, the Site Administrator's manager role in a journal they
created shows the same gap. Settings › Users & Roles lists all these
roles correctly.

When the Site Administrator unticks a role on the wizard grid's "Edit
User" and presses "OK", the user's refreshed row can still list the
ended role beside the others until the page is reloaded. This happened
in five of the seven saves tried.

Nothing is stored wrong. Someone choosing an account to merge into is
shown roles that are not the account's, and a merge cannot be undone.
The way round is to check the account's roles on Settings › Users &
Roles first.

## Impact

- **Lost**: no data. On an upgraded install, the "Merge user" window
  shows little or nothing about the roles of the accounts it lists, so
  a manager loses that help in choosing the account to keep.
- **Who**: the manager-level roles with access to Settings, and the
  Site Administrator, who open "Merge user" from a row's "…" on
  Settings › Users & Roles. Also the Site Administrator on the Settings
  wizard's "Users" tab (Administration › "Hosted Journals" › a
  journal's "Settings wizard"), the only place with "Edit User" for
  this grid. On upgraded installs this means every account with roles
  from before the upgrade.
- **Way round**: Settings › Users & Roles names each account's roles,
  and a reload corrects the edited row on the wizard grid.

Medium: on most real installs, which are upgraded ones, the list used
to choose an irreversible merge misleads, and the way round is another
screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Nothing else is needed.

A role without a start date (the dataset's Site Administrator):

1. Sign in as `admin` (password `admin`).
2. Open Administration › "Hosted Journals" ("Hosted Presses" on OMP,
   "Hosted Servers" on OPS).
3. Press the arrow at the start of the `publicknowledge` row, then
   "Settings wizard" (`/index.php/index/en/admin/wizard/1`).
4. Open the tab "Users".
5. Press "Search" above the list, type `admin` in the "Search" box and
   press the form's "Search" button.
6. Read the row of `admin` under "Roles".
7. Open the journal's Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`) and
   read the row "admin admin".
8. On Ramiro Vaca's row there, press "…", then "Merge user". In the
   window "Merge user", press "Search", search for `admin` as in step
   5, and read the row of `admin` under "Roles". Close the window
   without merging.

A role ended on the wizard grid's "Edit User":

9. Go back to the Settings wizard's "Users" tab (steps 2–4) and search
   for `jjanssen` (OPS: `minoue`). Her row reads "Reviewer" under
   "Roles" (OMP: "Internal Reviewer"; OPS, Minoti Inoue: "Moderator").
10. Open the browser's network panel. Press the arrow at the start of
    the row, then "Edit User".
11. Under "User Roles", untick "Reviewer" ("Internal Reviewer",
    "Moderator") and tick "Reader". Press "OK".
12. Read the row under "Roles" as soon as the window closes. Compare
    the `Date` headers of the `…/user-grid/update-user` and
    `…/user-grid/fetch-row` responses. The symptom needs both in the
    same second. If they differ, the row reads "Reader" and the try
    proves nothing: repeat steps 10–12 on another user (any author
    whose row reads "Author, Reader", unticking "Author").
13. Wait a second, reload the page, open the tab "Users" again and
    search for the user as in step 9.

**Expected**: in steps 6 and 8, `admin`'s row reads "Journal manager"
("Press manager", "Preprint Server manager"), as Users & Roles does in
step 7. In step 12, the row reads "Reader".

**Observed**: in steps 6 and 8, the "Roles" cell is empty:

```
admin | admin | admin |  | pkpadmin@mailinator.com
```

Step 7 lists "Journal manager" under "Roles" with an empty "Start
Date". In step 12, "User edited." shows and the row reads "Reviewer,
Reader" ("Internal Reviewer, Reader"; "Moderator, Reader"). In step
13 it reads "Reader". The save stored the role as ended in its own
second, and the refresh came in that second:

```
Reviewer | date_start 2026-10-01 00:00:00 | date_end 2026-10-02 04:25:08
POST …/grid/settings/user/user-grid/update-user   200  Date: Fri, 02 Oct 2026 04:25:08 GMT
GET  …/grid/settings/user/user-grid/fetch-row     200  Date: Fri, 02 Oct 2026 04:25:08 GMT
```

When the refresh came a second later, the row read "Reader".

## Cause

The grid's "Roles" column (lib/pkp `UserGridHandler::initialize()`,
the `roles` column's `getTemplateVarsFromRow()`) lists each of the
user's groups in the context that has an assignment matching
`UserUserGroup::scopeWithActiveAndActiveInFuture()`
(`classes/userGroup/relationships/UserUserGroup.php`). That scope
writes its own version of "active" instead of using
`scopeWithActive()`, the rule beside it that every other reader uses
(`UserForm::saveUserGroupAssignments()`, `endAssignments()`,
`removeUser()`). The two versions disagree in two places:

- **A start date is required.** `->whereNotNull('user_user_groups.date_start')`
  (line 129) drops every assignment without one, where
  `scopeWithActive()` counts a null start as started. Such
  assignments are stored by design. `PKPContextService::add()` gives the
  user who creates a context its manager group with `'dateStart' =>
  null`. The 3.5 upgrade `I9462_UserUserGroupsStartEndDate::up()` adds
  `date_start` and `date_end` as nullable columns and fills neither, and
  no later migration fills `date_start`. So every assignment carried
  over from 3.4 has no start until it is assigned again. The filter
  works per group, so an account with dated and undated roles shows the
  dated ones only.
- **A role ended this second is still active.** `->orWhere('user_user_groups.date_end', '>=', $currentDateTime)`
  (line 135) keeps an assignment whose end equals the current second,
  where `scopeWithActive()` compares with `>`.
  `Repo::userGroup()->endAssignments()`, which "Edit User" calls for
  each unticked role, stamps `date_end` with `Core::getCurrentDate()`,
  the save's second. The `fetch-row` the grid sends after "OK", or a
  reload, still lists the role if it comes in that second.

73b84cf02f replaced `withActive()` in the column with this new scope so
that the grid also lists roles that begin in the future, such as a role
invitation with a later start date.

Reach:

- "Merge user" (`UserGridHandler::mergeUsers()`) and the wizard's
  "Users" tab are the one grid, and both show the fault (walked, all
  three apps, `main` and 3.5).
- No other code calls `scopeWithActiveAndActiveInFuture()` (checked in
  the code, `main`).
- Settings › Users & Roles reads the roles through the REST API and is
  right (walked: step 7).

## Proposed fix

Build the scope from the two scopes that already define the rule,
so that "active or starting later" means `withActive()` or
`withActiveInFuture()` and cannot drift again
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-grid-roles-admin-empty-ended-listed/fix.diff)):

```diff
     public function scopeWithActiveAndActiveInFuture(Builder $query): Builder
     {
-        $currentDateTime = Core::getCurrentDate();
-        return $query->whereNotNull('user_user_groups.date_start')
-            ->where(function ($q) use ($currentDateTime) {
-                …
-            })
+        return $query->where(
+            fn (Builder $query) => $query->withActive()
+                ->orWhere(fn (Builder $query) => $query->withActiveInFuture())
+        )
             ->orderBy('user_user_groups.date_start', 'asc');
     }
```

Roles that begin in the future are still listed, as 73b84cf02f
intended. Tried on OJS, OMP and OPS `main`. With the fix in, `admin`'s
row read "Journal manager" ("Press manager", "Preprint Server manager")
in steps 6 and 8. In step 12 the edited row read "Reader", although on
every app the refresh came in the same second as the save. The roles of
`rvaca`, `dbarnes`, an author and a reviewer on the wizard grid read the
same with the fix in and out.

**Alternatives**:

- Correct the two conditions in place (drop the `whereNotNull`, make
  `>=` a `>`). This works, but it keeps a second copy of a rule that has
  already drifted from the first.
- Give every null `date_start` a value in a migration. This invents
  start dates that Users & Roles would then show, and it leaves the
  `>=` in place.
- Go back to `withActive()` in the column. That drops the future roles
  the change was made for.

**What goes with it**:

- No stored data needs repair: a null start keeps its meaning of
  "started".
- No API or plugin hook changes, because the grid column is the scope's
  only caller.
- A backport to `stable-3_5_0` is the same change (the same file; the
  diff applies inside pkp-lib with its `lib/pkp/` prefix stripped,
  `patch -p3`).
- The guard: lib/pkp has no tests of the `UserUserGroup` scopes, and one
  needs database rows, so a unit test would extend lib/pkp's
  `DatabaseTestCase` (it backs up and restores the tables it names),
  in a new `tests/classes/userGroup/`, and insert assignments with a
  null start, an end equal to now and a start in the future. The lighter guard is the e2e U53 scenario that reads the Site
  Administrator's row on the wizard grid (**Planned** in the spec).

Small: one method in one shared class, built from the two scopes beside
it, plus its test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-grid-roles-admin-empty-ended-listed/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-grid-roles-admin-empty-ended-listed/lib.js))
  takes the Steps and records the response `Date` headers and the
  stored role dates. Its `nb` mode reads the roles of rows the fix must
  leave alone. On an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-grid-roles-admin-empty-ended-listed/walk.js [nb]`.
- Driven on screen on OJS, OMP and OPS on `main` and on
  `stable-3_5_0`, on PostgreSQL. Dataset: pkp/datasets c657990
  (2026-10-01). Steps 6 and 8 showed the empty cell on every app and
  line. Step 12 listed the ended role on OJS and OPS `main` and on all
  three apps on 3.5. On OMP `main`, and in a first OJS try that
  unticked "Author" from Carlo Corino, the refresh came a second after
  the save and read "Reader".
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6; `UserUserGroup.php`,
  `UserGridHandler.php` and `UserForm.php` are the same in both);
  `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
  (lib/pkp cf3f984335); pkp-lib `stable-3_4_0` 32b0f4b4af,
  `stable-3_3_0` f6ab331645.
- Code reads: on `main` and `stable-3_5_0`, `UserUserGroup` (the
  scopes), `UserGridHandler::initialize()` (the column) and
  `mergeUsers()`, `UserForm::saveUserGroupAssignments()`,
  `Repository::endAssignments()`, `PKPContextService::add()`. The
  upgrade path, read in the code and not walked (no 3.4 dataset was
  loaded and upgraded): `I9462_UserUserGroupsStartEndDate::up()`;
  `I9709_UserUserGroupsMasthead` and
  `I10041_UserGroupsAndUserUserGroupsMastheadValues` (masthead only);
  the other v3_5_0 and v3_6_0 migrations of lib/pkp and the apps'
  `classes/migration` and `dbscripts/xml/upgrade.xml` (no `date_start`
  backfill). On `stable-3_4_0`, `UserGridHandler.php` (the column reads
  `Repo::userGroup()->userUserGroups()`) and
  `RolesAndUserGroupsMigration.php` (no date columns). On
  `stable-3_3_0`, `UserGridHandler.inc.php` (columns "Given Name",
  "Family Name", "Username", "Email").
- Related but not this fault: `pkp/pkp-lib#12783` ("Remove" offered on
  the wizard's grid after a user has no role left, closed).
- MySQL not checked (the scope's comparisons are database-neutral).
