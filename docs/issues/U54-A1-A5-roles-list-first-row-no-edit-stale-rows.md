# The Roles list offers no Edit or Remove on each page's first row and does not show saved changes

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12221` for `pkp/pkp-lib#12197` · [8a9c145806](https://github.com/pkp/pkp-lib/commit/8a9c14580699690fc2ba5b23e9fd5bcf02fb2b32) · 2026-01-26 · Hafsa-Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a1), [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On the "Roles" tab of Settings › Users & Roles, the first row of each
page of the list has no "Settings" arrow, so it offers no "Edit" and no
"Remove". On a journal, press or preprint server, new or long in use,
that row is normally the manager role ("Journal manager"). The list
keeps no fixed order, and the manager role is stored before every other
role, so it leads page 1 at every page size and every filtered list that
includes it. Its name and options therefore cannot be changed at all.
On a second page, or with a filter chosen, the role that comes first
there loses both actions instead.

The list also does not show a change it has saved. Each role's row has
a stage box, a box under each workflow stage, which ticks or unticks
that stage at once. A pressed stage box keeps its old look beside the
notice that says the change was saved, and a removed role stays listed.
Pressing the same box or "Remove" again fails on the server with no
message; it writes nothing, so what is stored stays as the first press
left it. The box then turns grey until the page is reloaded.

Both come from one cause and one small fix mends them. Any role but the
manager role can be reached by choosing another "Items per page" or a
filter, so that it is not the first row.

## Impact

- **Lost.** The manager can no longer edit or remove the manager role:
  rename it, change its options or how it shows on the masthead. The
  list misleads about stages and removals until the page is reloaded.
- **Who.** Every Journal Manager (Press Manager, Manager) on the "Roles"
  tab. Anyone who tries to change the manager role finds no "Edit".
  Anyone who sets a role's stages sees stale boxes after each press.
- **Way round.** None for the manager role. For any other role, another
  page size or filter moves it off the first row, and a reload after
  each press or removal shows what is stored.

Medium, since only one role is out of reach and a reload corrects the
list. It would be high if journals routinely rename or reconfigure the
manager role.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same,
  differences in brackets).

The first row:

1. Sign in as `rvaca` and open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`), tab
   "Roles".
2. Look at the start of each row, then press the "Settings" arrow of the
   second row, "Journal editor" ("Press editor"; "Moderator").
3. Under the list, choose "10" in "Items per page:" and press the page
   link "2". [A preprint server lists five roles and shows no "Items per
   page:"; skip this step.]
4. Reload the page, open "Roles", press "Search" and choose "Production"
   in "List roles assigned to".

A stage box pressed twice:

5. Reload the page and open "Roles".
6. On the "Copyeditor" row ("Editorial Board Member" on a preprint
   server), press the unticked box under "Production".
7. Press the same box again, and once more.
8. Reload the page and open "Roles".
9. Press the same box (now ticked), then press it again.

A removed role:

10. Press "Create New Role", choose "Assistant" in "Permission level",
    type "u54a Spare desk" in "Role Name" and "U54A" in "Abbreviation",
    and press "OK".
11. On the "u54a Spare desk" row, press "Settings" › "Remove" › "OK".
12. Press "Settings" › "Remove" › "OK" on the same row again, then
    "Cancel" in the "Confirm" window that stays open.
13. Reload the page and open "Roles".

**Expected.** Every row starts with a "Settings" arrow that opens "Edit"
and "Remove", on each page and in the filtered list. In step 6 the box
becomes ticked beside "Copyeditor role assigned to Production stage.".
In step 7 the second press unticks it with "Copyeditor role unassigned
from Production stage.", and the third ticks it again. In step 9 the
box unticks, then ticks again. In step 11 the row leaves the list beside
"u54a Spare desk role removed.".

**Observed.** The first row has no arrow in each view: "Journal manager"
("Press manager", "Preprint Server manager") on page 1, "Marketing and
sales coordinator" ("Proofreader") on page 2, and "Journal editor"
("Press editor", "Preprint Server manager") in the filtered list. Every
other row has one; the second row's opens "Edit" and "Remove".

In step 6 the notice "Copyeditor role assigned to Production stage."
shows and the box stays unticked. In step 7 the second press shows no
notice and the box turns grey; the third press does nothing. After the
reload in step 8 the box is ticked. In step 9 each press reads
"Copyeditor role unassigned from Production stage." while the box stays
ticked.

In step 11 the notice "u54a Spare desk role removed." shows and the row
stays. In step 12 the "Confirm" window stays open after "OK", with no
message. After the reload in step 13 the row is gone. The server log
for steps 7 and 12:

```
[500]: POST /index.php/publicknowledge/$$$call$$$/grid/settings/roles/user-group-grid/assign-stage?stageId=5&userGroupId=7 - Uncaught PDOException: SQLSTATE[23505]: Unique violation: 7 ERROR:  duplicate key value violates unique constraint "user_group_stage_unique"
[500]: POST /index.php/publicknowledge/$$$call$$$/grid/settings/roles/user-group-grid/remove-user-group?userGroupId=20 - Uncaught Exception: Invalid user group id! in …/lib/pkp/controllers/grid/settings/roles/UserGroupGridHandler.php:104
```

## Cause

A legacy grid uses the keys of the data that `loadData()` returns as its
row ids. `GridHandler::setGridDataElements()` keys a collection or a
`DAOResultFactory` by each item's id itself, but keeps the keys of a
plain array or any other `ItemIterator`, such as `VirtualArrayIterator`,
as they are. `UserGroupGridHandler::loadData()` (lib/pkp
`controllers/grid/settings/roles/UserGroupGridHandler.php`, lines
209–215) returns a `VirtualArrayIterator` over a plain array:

```php
$pageResults = $builder->offset($offset)
    ->limit($perPage)
    ->get()
    ->all();

return new VirtualArrayIterator($pageResults, $totalCount, $page, $perPage);
```

That line takes for granted that `get()` returns the roles keyed by
their id. It did, by a side effect: `SettingsBuilder`, which loads every
model with a settings table, keyed its rows by the primary key in
`getModelWithSettings()` (`$this->query->get()->keyBy($primaryKey)`), and
`getModels()` kept those keys. 6bcbd5c080 added a path that keeps every
row when one id comes back several times (for eager loads), and kept the
keyed path for results with one row per id. 8a9c145806 ("refined
SettingsBuilder handling of model settings") removed that remaining
keyed path; the commit gives no reason. Since then `get()` returns a
list keyed 0, 1, 2…, like plain Eloquent, and each page's rows get the
row ids 0, 1, 2….

Two symptoms follow:

- `UserGroupGridRow::initialize()` adds "Edit" and "Remove" only `if
  (!empty($rowId) && is_numeric($rowId))`, a guard meant for a new,
  unsaved row. Row id `0` fails it, so each page's first row gets no
  actions.
- A stage box (`_toggleAssignment()`) and "Remove" (`removeUserGroup()`)
  answer `DAO::getDataChangedEvent($userGroup->id)`, so the page asks
  `fetch-row` for that role's id. `getRowDataElement()` uses the id as a
  position. For the Copyeditor (id 7) it finds the role at position 7,
  which the page already shows as `…-row-7`, and the page redraws that
  row with the same role. For the removed role (id 20, in a list of 19)
  it finds nothing and answers `elementNotFound` for `…-row-20`, which
  the page does not have. `PagingFeature::fetchRow()` adds nothing to
  that answer. On a full page the reloaded page's first and last row ids
  (0 and n−1) match the page's own, so it takes the row for one outside
  the page and sends no `deletedRowReplacement`. On a page that is not
  full there is no next row to send, and `loadLastPage` follows only an
  emptied page. Either way the pressed row is never redrawn and keeps
  its old box and its old action (`assignStage`). A second press posts
  the same `assignStage`, and `UserGroupStage::create()` hits the unique
  key `user_group_stage_unique`. A second `unassignStage` deletes nothing
  and reports the untick again. A second "Remove" posts the deleted
  role's id, which `authorize()` refuses with an exception.

The manager role leads the list because `loadData()` sets no order
(spec U54 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a13)):
the database returns the roles in about the order they were stored, and
a context's roles are installed from `registry/userGroups.xml`, the
manager role first. The stage filter leaves it out on a journal and a
press, which store no stage for it; every other view that lists it
starts with it (walked: page 1 at 25 and 10 per page, a preprint
server's "Production" filter).

Reach:

- "Create New Role" and "Edit" › "OK" are not affected:
  `updateUserGroup()` answers a data-changed event without an id, which
  redraws the whole list (walked: the new role is listed at once).
- A scan of lib/pkp and the three apps found two other callers that read
  the keys of a settings-backed model's `get()` as ids:
  `SubEditorsDAO::assignEditors()` and
  `UpdateAuthorStageAssignments::handle()`. Both are already reported,
  each with its own fix at the caller
  ([U21-A8-section-editors-not-assigned-second-journal.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A8-section-editors-not-assigned-second-journal.md)).
- The other grids whose rows add their actions only for a non-empty row
  id (review forms, genres, navigation menus, announcement types,
  galleys, subscription types, users, stage participants) build their
  data keyed by id (code read).

## Proposed fix

Key the page's rows by the role's id in `UserGroupGridHandler::loadData()`,
where the grid's data is built. That is how pkp-lib fixed the same
assumption elsewhere (`Repository::getSortedMastheadUserGroups()` ends in
`->keyBy('id')`, and `AuthorReviewerGridHandler::loadData()` keys its
rows with `keyBy()`), and how the other paged grid that builds a
`VirtualArrayIterator`, `UserGridHandler`, keeps its rows keyed
(`iterator_to_array($iterator, true)`).
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-first-row-no-edit-stale-rows/fix.diff):

```diff
+        // Key the rows by the role's id: the grid's row ids, which its row actions
+        // and every single-row refresh (fetchRow) rely on, are these keys.
         $pageResults = $builder->offset($offset)
             ->limit($perPage)
             ->get()
+            ->keyBy(fn (UserGroup $userGroup) => $userGroup->id)
             ->all();
```

The fix was tried on OJS, OMP and OPS `main`, and the Steps then gave the
Expected. A neighbour check read, with and without the fix, the same
roles on each page and in each filter, the same count lines, the same
greyed boxes on the manager row, and the same redraw after "Edit" ›
"OK". With the fix, a role removed from a full page is replaced by the
next page's first row (`deletedRowReplacement`, code read; not walked).

**Alternatives**

- Restore 6bcbd5c080's keyed path in
  `SettingsBuilder::getModelWithSettings()` for results with one row per
  id. That keeps eager loads intact and mends this list and the two
  callers above at once. Against it: `get()` on a model with settings
  would then be keyed by id only when no id repeats, so a caller still
  cannot rely on either shape, and pkp-lib has fixed the masthead at the
  caller. Since the commit that removed the path gives no reason, its
  author is the one to ask before choosing this.
- Return the Eloquent collection to the grid, which
  `setGridDataElements()` keys by id itself. This does not work here:
  the paging needs the `VirtualArrayIterator` for its total, and that
  keeps the plain array's keys.

**What goes with it**

- A guard: the e2e scenario that every row of the Roles list, the first
  included, offers "Edit" and "Remove", and that a pressed stage box
  shows its new state without a reload (spec U54). A unit test of a
  legacy grid handler needs a request and a context, which lib/pkp's
  tests do not build for grids.
- Not needed for this fix, but worth a thought: `_toggleAssignment()`
  could create the stage row only when it is missing, and a removal of
  a role that no longer exists could answer `elementNotFound` instead of
  an exception, since a second tab with the same list still posts stale
  actions.
- No data repair and no API change. `stable-3_5_0` does not need it,
  since its `SettingsBuilder` still keys by id; the line applies there as
  written, should `pkp/pkp-lib#12197`'s change ever be backported.

Small: one line in the shared handler, and an e2e check.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-first-row-no-edit-stale-rows/walk.js),
  with its helpers in `lib.js` beside it; the neighbour check is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-first-row-no-edit-stale-rows/neighbour.js).
  In a pkp-e2e checkout, on an install freshly loaded from the default
  dataset (`<feature>` names that install's fleet, `<id>` any short name
  for the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/roles-list-first-row-no-edit-stale-rows/walk.js`
  For step 7's third press the script reads the box as greyed out
  (disabled) instead of pressing it.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL.
  The fault does not depend on the database. The role names in Observed
  do: the list has no order, so they follow the database's row order
  (MySQL not checked). Dataset: pkp/datasets c657990 (2026-10-01).
  Tips: `main` ojs b84f8e2e44, omp 3b0ecf794, ops c8af945bb7, lib/pkp
  ddd8ab243a (ojs) and 3dc90c81a6 (omp, ops); `stable-3_5_0` ojs
  c346ee00a5, omp c7b45f88e, ops 8eaf899468, lib/pkp 3bb4450bea (ojs) and
  1fb843f491 (omp, ops); `stable-3_4_0` lib/pkp 32b0f4b4af;
  `stable-3_3_0` lib/pkp f6ab331645.
- The walk on `main` read each row's DOM id: the rows of every view were
  numbered from 0 (`…-row-0`, `…-row-1`, …); on `stable-3_5_0`, and on
  `main` with the fix, they carry the role ids (`…-row-2` for the manager
  role, …).
- Introduced: `git blame` on the `loadData()` lines gives 0cca3e323b
  (`pkp/pkp-lib#11947`, the paging, which kept the `->get()->all()`),
  then d011a7a681 (`pkp/pkp-lib#10667` for `pkp/pkp-lib#10506`,
  Vitaliy-1, 2024-12-15), which first returned `->get()->all()`. Before
  d011a7a681, 714d5d5aa4 returned the collection itself, which the grid
  keys by id. `git log -L` on `SettingsBuilder::getModelWithSettings()`
  gives 6bcbd5c080, then 8a9c145806; both are in `pkp/pkp-lib#12221`
  (merged 2026-01-28) and neither is on `stable-3_5_0`.
- 3.4 code (`UserGroupGridHandler.php`): `loadData()` returns
  `Repo::userGroup()->getCollector()…->getMany()->toArray()` or
  `getByRoleIds()->toArray()`, and the DAO's `getMany()` yields each group
  under its `user_group_id`, so the row ids are the role ids.
- 3.3 code (`UserGroupGridHandler.inc.php`): `loadData()` returns a
  `UserGroupDAO` `DAOResultFactory`, which the grid keys by id.
- Upstream search (2026-10-02): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, by the symptom's words (roles grid,
  first row, edit, remove, stage checkbox, role still listed) and by
  `UserGroupGridHandler` and `user_group_stage_unique`. Nearest, not the
  same fault: `pkp/pkp-lib#11947` (missing paging), `pkp/pkp-lib#12944`
  (stage filter error), `pkp/pkp-lib#6452` (a 3.3 error on "Remove").
