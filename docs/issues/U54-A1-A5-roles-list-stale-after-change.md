# Roles list shows stage ticks and removals only after a reload, and its first row cannot be edited

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12221` for `pkp/pkp-lib#12197` · [8a9c145806](https://github.com/pkp/pkp-lib/commit/8a9c14580699690fc2ba5b23e9fd5bcf02fb2b32) · 2026-01-26 · Hafsa Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a1), [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles › "Roles", a manager presses a stage box.
The notice says the change was saved, but the box keeps its old look
until the page is reloaded, so the manager presses it again. If the
first press ticked the box, the second press fails on the server: no
notice shows, and the box turns grey until the page is reloaded. If the
first press unticked it, the second press shows the same "unassigned"
notice again. A role the manager has just removed also stays in the
list, and pressing one of its stage boxes or its "Remove" again fails on
the server with no message.

The first row of the list has no "Settings" arrow, so it offers no
"Edit" and no "Remove". On most journals that row is the manager role,
so its name and options, such as whether managers appear on the
Editorial Masthead, cannot be changed. The first row of a second page,
or of a filtered list, loses both actions the same way.

A reload shows every change as the notice reported it. For the first
row there is no way round: no filter, page size or page link moves it
down, and no other screen edits a role. Released versions are not
affected; the "Roles" tab works there.

## Impact

- **Lost**: nothing stored is lost or wrong. The manager role, or
  whichever role the list shows first, cannot be renamed, and none of
  its options can be changed.
- **Who**: every manager who changes a role's stages or removes a role,
  and every manager who wants to change the manager role. The manager
  role is left off the Editorial Masthead by default, so a journal that
  wants its managers listed there must edit it. That is occasional
  set-up work, not a weekly task.
- **Way round**: a reload after each stage change or removal. None for
  the first row.

Medium: a reload shows the truth after every change, and the role that
cannot be edited is one most journals set up once, if at all.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; the same on OMP and OPS,
  with the differences in brackets).

A stage box:

1. Sign in as `rvaca` (the journal manager).
2. Open Settings › Users & Roles and its "Roles" tab
   (`/index.php/publicknowledge/en/management/settings/access`).
3. Press the unticked "Production" box of the "Copyeditor" row [a
   preprint server: "Editorial Board Member"].
4. Press the same box again, without reloading.
5. Reload the page and open the "Roles" tab.
6. Press the now ticked "Production" box of "Copyeditor".
7. Press it again, without reloading.
8. Reload the page and open the "Roles" tab.

A removed role:

9. Press "Create New Role", choose "Assistant" under "Permission level",
   type "u54w45 Spare desk" in "Role Name" and "u54w45" in
   "Abbreviation", and press "OK".
10. Press the "Settings" arrow of the "u54w45 Spare desk" row, then
    "Remove", then "OK".
11. Press the "Production" box of the "u54w45 Spare desk" row.
12. Press that row's "Remove" again, then "OK".
13. Reload the page and open the "Roles" tab.

The first row:

14. Look at the first row, "Journal manager" ["Press manager",
    "Preprint Server manager"].
15. Choose "10" under "Items per page:" and press the page link "2" [not
    on a preprint server, whose five roles show no "Items per page:"].

**Expected**: each press flips the box at once: step 3 ticks it and
shows "Copyeditor role assigned to Production stage.", step 4 unticks it
again with "Copyeditor role unassigned from Production stage.", and
steps 6 and 7 do the same in reverse. After step 10's "u54w45 Spare desk
role removed." the row leaves the list. In steps 14 and 15 the first row
has a "Settings" arrow with "Edit" and "Remove", like every other row.

**Observed**:

- Step 3: "Copyeditor role assigned to Production stage.", and the box
  stays unticked.
- Step 4: no notice, and the box turns grey. The request answers 500:

  ```
  [500]: POST /index.php/publicknowledge/$$$call$$$/grid/settings/roles/user-group-grid/assign-stage?stageId=5&userGroupId=7 - Uncaught PDOException: SQLSTATE[23505]: Unique violation: 7 ERROR:  duplicate key value violates unique constraint "user_group_stage_unique"
  ```

- Step 5: the box is ticked and can be pressed again.
- Steps 6 and 7: "Copyeditor role unassigned from Production stage."
  twice, and the box stays ticked. Step 8: the box is unticked.
- Step 10: "u54w45 Spare desk role removed.", and the row stays in the
  list.
- Step 11: no notice, and the box turns grey. Step 12: no notice. Both
  requests answer 500 (`assign-stage`, then `remove-user-group`, each
  with `userGroupId=20` [OMP 21, OPS 7]):

  ```
  Uncaught Exception: Invalid user group id! in lib/pkp/controllers/grid/settings/roles/UserGroupGridHandler.php:104
  ```

- Step 13: the row is gone.
- Step 14: the first row has no "Settings" arrow; every other row has
  one.
- Step 15: the second page reads "11 - 18 of 18 items" ["11 - 19 of 19
  items"], and its first row, "Marketing and sales coordinator"
  ["Proofreader"], has no arrow.

## Cause

A legacy grid uses the keys of the array its `loadData()` returns as row
ids. The row's links reach the right role either way, since
`UserGroupGridRow::initialize()` builds them from `$userGroup->id`
(line 44). Two things depend on the row id. First, a refresh: after a
change the handler answers `DAO::getDataChangedEvent($userGroup->id)`,
the grid's script asks `fetch-row` for the row with that id
(`GridHandler::getRowDataElement()` looks it up among the keys), and an
answer of `elementNotFound` removes the row with that id. Second,
`UserGroupGridRow::initialize()` adds "Edit" and "Remove" only
`if (!empty($rowId) && is_numeric($rowId))` (line 48).

`UserGroupGridHandler::loadData()` (pkp-lib,
`controllers/grid/settings/roles/UserGroupGridHandler.php` lines 209-215)
returns `new VirtualArrayIterator($builder->offset()->limit()->get()->all(), …)`
and so takes its keys from the query's collection. Until
[8a9c145806](https://github.com/pkp/pkp-lib/commit/8a9c14580699690fc2ba5b23e9fd5bcf02fb2b32),
`SettingsBuilder::getModelWithSettings()`, which loads every model that
keeps settings (`UserGroup` among them), keyed its models by id. It now
returns them as a plain list (`classes/core/SettingsBuilder.php` line
337), so the rows get ids 0 to n−1.

So the refresh finds the wrong row or none. A press on "Copyeditor"
(role id 7) refreshes the row with id 7, which is "Funding coordinator",
and the pressed row keeps its old box and its `assignStage` link. A
second press sends `assignStage` again for a stage the role already has.
After a removal, `elementNotFound` names id 20, which no row on the page
has, so the removed row stays. And the row with id 0, the first of each
page, gets no "Edit" or "Remove".

Reach:

- The three apps on `main`, every page and filter of the list (walked:
  first page, page 2 at 10 per page).
- The role window's "OK" and "Create New Role" redraw the whole grid
  (`getDataChangedEvent()` with no id) and are not affected (walked).
- The other legacy grids are not affected (code). `UserGridHandler`,
  `ExportableUsersGridHandler`, `UserSelectGridHandler`, and OJS's
  `SubscriberSelectGridHandler` and `ExportableIssuesListGridHandler`
  wrap a collector's `getMany()`, which keys by id;
  `StageParticipantGridHandler` and `TaskNotificationsGridHandler` key
  their arrays by id themselves; `SubmissionEventLogGridHandler` is
  positional on purpose (it merges three logs) and refreshes no row;
  grids that return an Eloquent collection are re-keyed by
  `GridHandler::toAssociativeArray()`.
- Other code that read ids from the keys of a settings model's
  collection broke with the same commit: `SubEditorsDAO::assignEditors()`
  ([pkp-e2e#145](https://github.com/jardakotesovec/pkp-e2e/issues/145),
  editors never assigned automatically on a second journal) and
  `UpdateAuthorStageAssignments::handle()` (no visible effect, as that
  report explains). A search of pkp-lib and the three apps for
  `->keys()`, `array_keys()`, `->get($id)` and `->has($id)` on such
  collections found no other (code).
- The list's changing order (spec [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a13):
  a saved role moves down, a paged list can show a role twice and skip
  another) has another cause: `loadData()` pages with `offset()` and
  `limit()` and no `ORDER BY`, the same on 3.5. Only A13's "a role just
  created and listed first has no Edit or Remove" comes from this fault.
- Which role is first: with no `ORDER BY`, PostgreSQL returns the roles
  in storage order, which on a journal whose roles were never saved is
  the order they were created in, so the manager role comes first (the
  default dataset's three contexts, walked). A role saved since moves to
  the end (A13). MySQL not checked.

## Proposed fix

A proposal; the team decides. Key the page of roles by role id in
`UserGroupGridHandler::loadData()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-stale-after-change/fix.diff)):

```diff
         $pageResults = $builder->offset($offset)
             ->limit($perPage)
             ->get()
+            ->keyBy('id')
             ->all();
```

The fix belongs in the caller, not in `SettingsBuilder`. `pkp/pkp-lib#12197`
found that a `belongsToMany` eager load
(`Template::with('userGroups')->get()`) lost user groups, because a
group linked to several templates comes back once per template and
keying by id kept only one of them. A plain list is what every other
Eloquent model in pkp-lib returns and what Eloquent promises; the id
keys were a side effect the callers above relied on without a contract.
The grid decides its own row ids, so it sets them, as the code base
already does: `UserGroup\Repository::getSortedMastheadUserGroups()` ends
in `->keyBy('id')`, `TaskNotificationsGridHandler::loadData()` keys by id
("Checkbox selection requires the array keys match the notification
id"), and `GridHandler::setGridDataElements()` re-keys an Eloquent
collection by id. `VirtualArrayIterator` keeps the keys, so paging is
unchanged.

Tried on `main` in the three apps: every press flips the box at once, a
removed role leaves the list, the first row of each page has "Edit" and
"Remove", and no request fails. Removing a role the context was created
with is still refused ("The role Designer is a default one and can't be
removed.") and its row stays, and OJS's paging still reads "1 - 10 of 18
items" and "11 - 18 of 18 items".

**Alternatives**:

- Key `SettingsBuilder`'s results by id again when no model appears
  twice (the state after
  [6bcbd5c080](https://github.com/pkp/pkp-lib/commit/6bcbd5c0802e65b67c57296a321df2924ae2eeee)):
  it would mend the three callers at once, but the keys would then
  depend on whether the query returned a model twice, a behaviour no
  other Eloquent model has, and a caller relying on them would still
  break on the duplicate case. Not tried.
- Re-key models in `GridHandler::setGridDataElements()`'s `ItemIterator`
  branch: it changes the base of every legacy grid for one caller.

**What goes with it**:

- No data repair; no API, hook or plugin change. `SubEditorsDAO` gets
  its own one-line fix (pkp-e2e#145).
- The diff applies to `stable-3_5_0` as written and changes no behaviour
  there, where the keys are already ids; no backport is needed.
- A press from a second, older tab still sends `assignStage` for a stage
  already assigned and answers 500. Guarding against that is a separate
  change, and not `UserGroupStage::firstOrCreate()` as it stands: the
  model's camel-case attributes are not translated in lookups, so the
  check needs snake-case keys or a `withContextId()->withUserGroupId()->withStageId()->exists()`
  test before `create()`.

Small: one line in one handler, following an existing pattern.

## Evidence

- Kept script, on an install loaded from PKP's default test dataset
  (PostgreSQL; pkp/datasets 38ab955, 2026-09-30):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-stale-after-change/walk.js)
  takes steps 1-15, then the neighbour check (removing "Designer", or
  "Editorial Board Member" on OPS, and the paging). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/roles-list-stale-after-change/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix was tried
  with `node bin/try-fix.js apply shared/playwright/checks/issues/roles-list-stale-after-change/fix.diff ojs omp ops`,
  then `walk.js`, then `revert` with the same arguments: no request
  answered 500 and no page script failed.
- Tips: `main`: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `UserGroupGridHandler.php` is the
  same in both lib/pkp commits, and pkp-lib's `main` (887ad73d6c) has no
  later change to it, to `SettingsBuilder.php` or to `GridHandler.php`.
  `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd, lib/pkp
  a9c76aed62 (pkp-lib `stable-3_5_0` 1fb843f491 has no later change to
  `SettingsBuilder.php`).
- Walked on `main` and 3.5, the three apps. On 3.5 every step showed
  Expected: its `UserGroupGridHandler::loadData()` has the same line,
  but its `SettingsBuilder::getModelWithSettings()` (line 333) still
  keys rows with `->keyBy($primaryKey)`, as `pkp/pkp-lib#12197` was not
  backported (`git log origin/stable-3_5_0 --grep=12197` is empty).
- 3.4 (code): pkp-lib `stable-3_4_0` df13621c2d,
  `UserGroupGridHandler::loadData()` returns
  `Repo::userGroup()->getCollector()->…->getMany()->toArray()`, and
  `userGroup\DAO::getMany()` yields `$row->user_group_id => …`, so the
  rows are keyed by id; `ArrayItemIterator` slices with keys preserved.
  OJS `stable-3_4_0` 9571d8fde7.
- 3.3 (code): pkp-lib `stable-3_3_0` d446601ebe,
  `UserGroupGridHandler.inc.php` returns a `DAOResultFactory`, which
  `GridHandler::setGridDataElements()` turns into an array keyed by id
  with `toAssociativeArray()`. OJS `stable-3_3_0` 9fdb9bcf9a.
- Introduced: `git blame` on `loadData()`'s `->get()->all()` gives
  [0cca3e323b](https://github.com/pkp/pkp-lib/commit/0cca3e323b034e6a1d74712b4db70b6b6fc1e2bd)
  (`pkp/pkp-lib#11947`, 2026-05-27), which wrapped the list in a
  `VirtualArrayIterator` for paging; it came after 8a9c145806, so the
  list it wrapped was already positional. Before it,
  [d011a7a681](https://github.com/pkp/pkp-lib/commit/d011a7a681fb61c7e4529ceaa4e140ca0e15f47f)
  (`pkp/pkp-lib#10506`, 2024-12-15) wrote `return $builder->get()->all();`,
  which was keyed by id at the time. In `pkp/pkp-lib#12221`,
  [6bcbd5c080](https://github.com/pkp/pkp-lib/commit/6bcbd5c0802e65b67c57296a321df2924ae2eeee)
  (2026-01-19) kept the keys by id for results with one row per model,
  and 8a9c145806 (2026-01-26) dropped them; the PR was merged to `main`
  on 2026-01-28.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  by the symptom's words and by `UserGroupGridHandler`,
  `user_group_stage_unique`, `SettingsBuilder` and
  `getModelWithSettings`. Read and not the same fault:
  `pkp/pkp-lib#12944` (the stage filter answering 500, fixed),
  `pkp/pkp-lib#12705` (other `SettingsBuilder` gotchas, open),
  `pkp/pkp-lib#12826` (removing the grid code, open).
- The caller search for id keys covered pkp-lib's `classes`,
  `controllers`, `pages`, `api` and `plugins` and the three apps' own
  code and plugins, for the twelve models that use `ModelWithSettings`;
  templates were not searched.
- MySQL not checked: the order of the first row, and the second press's
  500, which comes from the `user_group_stage_unique` key that both
  databases have.
