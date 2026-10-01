# On PostgreSQL a saved role jumps to the end of the Roles list, and pages can repeat or skip roles

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (PostgreSQL)
  - 3.5: OJS, OMP, OPS (PostgreSQL)
  - 3.4: OJS, OMP, OPS (code; PostgreSQL)
  - 3.3: OJS, OMP, OPS (code; PostgreSQL)
- **Introduced** not traced; present since at least [d8f96f4249](https://github.com/pkp/pkp-lib/commit/d8f96f4249c18749e5bbd7bc20361332779c33af) (2014-03-20)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a13)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The "Roles" list on Settings › Users & Roles keeps no fixed order on a
PostgreSQL install. When a manager changes a role's options in its window
and presses "OK", that role moves to the end of the list, and it stays
there after a reload. A role the manager has just created is usually
listed last, but on a site with several journals it can be listed first.

With the list on more than one page, a role saved between reading page 1
and page 2 (by another manager, or in another tab) makes page 2 show a
role page 1 already showed, while another role appears on neither page.
A reload shows every role again.

Installs on MySQL keep the roles in the order they were created. The fix
is a fixed sort on the list's query.

## Impact

- **Lost**: nothing stored. The order the manager has learned changes for
  good after each save, and a paged list can leave a role off both pages
  without saying so.
- **Who**: journal, press and preprint server managers on PostgreSQL, on
  the "Roles" tab, after any role is saved. The paging case is rare: a
  new journal, press or server shows 25 roles a page and holds 18, 19 or
  5, so the list has one page until the manager picks "10" or the context
  has more than 25 roles, and it then needs a role saved while the list is
  open in another tab or by another manager.
- **Way round**: none for the moved role; a reload for the paged list.

Low: the list misleads but nothing is lost and every role can still be
found. On `main` a role listed first also has no "Edit" or "Remove"; that
comes from a separate fault,
[pkp-e2e#182](https://github.com/jardakotesovec/pkp-e2e/issues/182), and
is rated there.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, PostgreSQL (the `pgsql` dump)
  (OJS; OMP and OPS in brackets).

Saving a role:

1. Sign in as `rvaca` (the journal manager).
2. Open Settings › Users & Roles and its "Roles" tab
   (`/index.php/publicknowledge/en/management/settings/access`). Note the
   order of the rows.
3. Press the "Settings" arrow of the "Copyeditor" row [OPS: "Author"],
   then "Edit".
4. Tick "Consider role in masthead list" and press "OK".
5. Reload the page and open the "Roles" tab.

Two pages [OJS and OMP; a preprint server's five roles show no "Items per
page:"]:

6. Choose "10" under "Items per page:". Note the ten rows.
7. Open the same page in a second browser tab, open its "Roles" tab,
   press the "Settings" arrow of "Designer", then "Edit", tick "Consider
   role in masthead list" and press "OK".
8. Back in the first tab, press the page link "2".

**Expected**: one fixed order, the roles the journal was created with in
their order, then the roles created later. Step 2 lists them that way [OMP:
"Volume editor" between "Author" and "Chapter Author"]. After step 4
"Copyeditor" keeps its sixth place [OMP fifth; OPS "Author" third], also
after step 5. Step 8's page 2 lists the eight roles page 1 left out [OMP
nine], none of page 1's.

**Observed**:

- Step 2: OJS and OPS list the roles in the order they were created. OMP
  lists "Volume editor" last, after "Editorial Board Member".
- Step 4: "Your changes have been saved.", and "Copyeditor" is now the last
  row (18th of 18) [OMP 19th of 19; OPS "Author" 5th of 5]. Step 5: it is
  still last.
- Step 6: page 1 reads "1 - 10 of 18 items" ["1 - 10 of 19 items"] and
  ends "Designer", "Funding coordinator", "Indexer", "Layout Editor",
  "Marketing and sales coordinator" [OMP: … "Marketing and sales
  coordinator", "Proofreader"].
- Step 8: page 2 reads "11 - 18 of 18 items" and lists "Author",
  "Translator", "Reviewer", "Reader", "Subscription Manager", "Editorial
  Board Member", "Copyeditor", "Designer". "Designer" is on both pages, and
  "Proofreader" is on neither [OMP: page 2 "11 - 19 of 19 items" from
  "Chapter Author" to "Designer"; "Designer" on both pages, "Author" on
  neither].

Control: with nothing saved between them, page 1 and page 2 hold every
role once.

A new role listed first has no steps here: it needs a role removed and
the database's own clean-up (`VACUUM`) to run, so it is shown only in
Evidence.

## Cause

`UserGroupGridHandler::loadData()` (pkp-lib,
`controllers/grid/settings/roles/UserGroupGridHandler.php` lines 192-213)
reads the roles with `UserGroup::withContextIds([$contextId])`, adds the
level and stage filters, and fetches each page with
`->offset($offset)->limit($perPage)->get()`. Nothing sets an order. SQL
without `ORDER BY` returns rows in whatever order the database reads
them.

PostgreSQL reads a small table in the order its rows are stored. Saving
a role's window (`UserGroupForm::execute()`, `$userGroup->save()` at line
300) updates its `user_groups` row when a column changes (the masthead
box, the permission boxes). An update writes a new copy of the row after
the existing ones, so the next read reaches the saved role last (step 2's
OMP order comes from the `pgsql` dump, which stores row 14 after row 20).
Each page is its own query, so a
save between two page reads moves a row across the page boundary.

A new role goes into the first free space in the table. When roles have
been removed and PostgreSQL has cleaned up after them, a role created on
a journal added later fills the gap ahead of that journal's own roles, and
is listed first in its list.

MySQL is not affected in practice: InnoDB reads the rows through the
`context_id` index, whose entries are kept in primary key order, so the
roles come in id order whatever was saved. That order is the server's
choice, not a guarantee.

Reach:

- The three apps, every page and both filters: the filters run the same
  query with a narrower `WHERE` (walked: the "Assistant" level and the
  "Production" stage list the same roles, in storage order).
- A new role listed first on a second journal (walked, with one
  `VACUUM`; Evidence).
- Other screens list a context's roles with no order and so follow the
  same storage order (code; not walked): the role boxes of "Add User" and
  "Edit User" (`UserForm`, lines 110 and 149), the "Users" tab's role
  filter (`UserGridHandler` line 256), "Notify Users"
  (`PKPNotifyUsersForm`), the invitation's role list
  (`SendInvitationStep`), "Submit As" (`PKPSubmissionHandler`; see
  [pkp-e2e#159](https://github.com/jardakotesovec/pkp-e2e/issues/159)) and
  the REST API's `GET /userGroups`. Each reads the whole list in one query,
  so none repeats or skips a role.
- `UserGroup\Repository::getUserGroupsByStage()` orders by `role_id` only,
  so roles of one permission level come in storage order among
  themselves (code).

## Proposed fix

A proposal; the team decides. Order the page by role id in `UserGroupGridHandler::loadData()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-order-changes/fix.diff)):

```diff
-        $pageResults = $builder->offset($offset)
+        // A fixed order, so that a saved or new role keeps its place and each page
+        // continues the one before it: the order the roles were created in. Added
+        // after count(), which would otherwise carry the ORDER BY (PostgreSQL refuses it).
+        $pageResults = $builder->orderById()
+            ->offset($offset)
             ->limit($perPage)
```

The grid owns its order. `UserGroup` already defines the scope
`orderById()`, though nothing calls it today; the repository's
`getUserGroupsByStage()` and `getSortedMastheadUserGroups()` use its
sibling `orderByRoleId()`. `pkp/pkp-lib#13102` closed the same gap for
contributor roles with an `orderBy()` on the id. Id order is the order
the roles are installed in (what a new journal shows today), puts
created roles after them, and is unique, which paging needs: two pages of
a total order never overlap. The call must stay after
`$builder->count()`: Laravel's count keeps the builder's `ORDER BY`, and
PostgreSQL refuses `select count(*) … order by user_group_id`.

Tried on `main` in the three apps: "Copyeditor" (OPS "Author") keeps its
place after "OK" and a reload, page 2 lists exactly the roles page 1 left
out after a save in the second tab, OMP lists "Volume editor" after
"Author", and a new role on a second journal comes last. The "Assistant"
level filter, the "Production" stage filter and two pages read with
nothing saved between each show the same roles and counts as without the
fix ("1 - 8 of 8 items" for "Assistant"; "1 - 10 of 18 items", then "11 -
18 of 18 items"), now in id order.

**Alternatives**:

- `orderByRoleId()` alone: ties within a permission level keep storage
  order, so pages can still overlap. `orderByRoleId()->orderById()` would
  group roles by level, a different order from what managers see today;
  a product choice, not needed for the fix.
- A default order on the `UserGroup` model (a global scope): it would also
  sort the screens and the REST API listed under Reach, but it changes
  every caller's query, the API's order included.
- Ordering by name: needs a join to the settings table and changes with
  the interface language.

**What goes with it**:

- No data repair; no API, hook or plugin change.
- 3.5: the diff applies as written, four lines higher.
- 3.4: `loadData()` has three branches, and each needs the order. The
  stage filter's and the unfiltered collector take
  `->orderBy(Collector::ORDERBY_ID)`; the level filter calls
  `Repo::userGroup()->getByRoleIds()`, which builds its own collector
  with no way to pass an order, so it needs a new parameter or a
  collector built in the grid.
- 3.3: the level filter's `UserGroupDAO::getByRoleId()` already orders by
  `user_group_id`. The stage filter's `getUserGroupsByStage()` orders by
  `ug.role_id` only and needs `, ug.user_group_id` as a tiebreaker. The
  unfiltered `getByContextId()` is a shared DAO method: an `ORDER BY
  ug.user_group_id` there sorts every 3.3 caller, the default order this
  report turns down for `main`.
- The other screens under Reach are left out: they read the whole list,
  so only their order moves. Whether they should follow the same order is
  a separate call.
- Guard: an e2e check that saves a role and reads the list order, and
  one that reads two pages around a save (spec U54, Rules 2 and 4).

Small: one line in one handler.

## Evidence

- Kept scripts, on an install loaded from PKP's default test dataset
  (PostgreSQL; pkp/datasets 38ab955, 2026-09-30):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-order-changes/walk.js)
  takes steps 1-8, then reads the filters and the paging with nothing
  saved (a fresh read, the "Assistant" level filter, the "Production"
  stage filter, two pages at 10 per page). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/roles-list-order-changes/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/roles-list-order-changes/fix.diff ojs omp ops`,
  then both scripts, then `revert` with the same arguments. No request
  answered 500 and no page script failed, with or without the fix. The
  comment in the diff was extended after the walk; the code line is the
  one tried.
- A new role listed first:
  [created-first.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-order-changes/created-first.js),
  signed in as `admin`: creates "u54w50 Spare desk" on `publicknowledge`,
  a second journal (press, server) "u54w50 Second" in Administration ›
  Hosted Journals, removes "u54w50 Spare desk", runs `VACUUM user_groups`
  (the one step not on screen: what autovacuum does by itself once enough
  rows of the table have changed), then creates "u54w50 Data editor" on
  the second journal. On `main` and 3.5, all three apps, it was listed
  first, stored in the removed role's place, after "OK" and after a
  reload; on 3.5 its row had "Edit" and "Remove", on `main` it had
  neither. With the fix it was listed last.
- MySQL 9.4 (InnoDB, a temporary copy of `user_groups` with the same
  columns and indexes, 18 roles for one context, then 18 for a second):
  the context's rows came back in id order after an update, a page read
  at offset 10 after an update listed the eight roles the first page
  left out, and a role created after another was removed came last. The
  plan reads the `user_groups_context_id` index. Not driven on a MySQL
  install of the apps.
- Tips: `main`: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `UserGroupGridHandler.php` is the
  same in both lib/pkp commits, and pkp-lib's `main` (887ad73d6c) has no
  later change to it or to `classes/userGroup/UserGroup.php`.
  `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd, lib/pkp
  a9c76aed62; its `loadData()` has the same query, paged the same way.
- 3.4 (code): pkp-lib `stable-3_4_0` df13621c2d. With no filter,
  `loadData()` returns `Repo::userGroup()->getCollector()->filterByContextIds([$contextId])->getMany()->toArray()`;
  `userGroup\Collector::getQueryBuilder()` orders only when `orderBy()` was
  called, and `userGroup\DAO::update()` rewrites the row on each save. The
  grid pages the whole list again on each request
  (`GeneralPagingFeature::setGridDataElements()`), so a save between two
  page reads shifts rows the same way. OJS `stable-3_4_0` 9571d8fde7.
- 3.3 (code): pkp-lib `stable-3_3_0` d446601ebe.
  `UserGroupDAO::getByContextId()` runs `SELECT ug.* FROM user_groups ug
  WHERE ug.context_id = ?` with no `ORDER BY`, paged by `retrieveRange()`,
  and `updateObject()` rewrites the row. OJS `stable-3_3_0` 9fdb9bcf9a.
- Introduced: `git blame` on `loadData()` gives the query to
  [714d5d5aa4](https://github.com/pkp/pkp-lib/commit/714d5d5aa490a412cce789b94596009b53dda7e8)
  (`pkp/pkp-lib#10506`, 2024-10-15, the move to an Eloquent `UserGroup`)
  and the paging to
  [0cca3e323b](https://github.com/pkp/pkp-lib/commit/0cca3e323b034e6a1d74712b4db70b6b6fc1e2bd)
  (`pkp/pkp-lib#12796` for `pkp/pkp-lib#11947`, 2026-05-27); neither
  dropped an order, as there was none before. The flat, paged list was
  first read with the unordered `UserGroupDAO::getByContextId()` in
  d8f96f4249 (2014-03-20, pkp-lib `*8637*`).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library, by the symptom's words (roles order, sort, list,
  pagination) and by `UserGroupGridHandler`, `orderById` and `ORDER BY
  user_group`. Read and not the same fault: `pkp/pkp-lib#11947` (the
  roles list showing no page links, fixed by the paging above),
  `pkp/pkp-lib#13102` (contributor roles in no fixed order, fixed),
  `pkp/pkp-lib#12944` (the stage filter answering 500, fixed).
- Unverified: whether an "OK" that changes only the role's name, or
  nothing, moves the row. The form saves through Eloquent, which updates
  the `user_groups` row only when one of its own columns changed; not
  walked.
