# Roles list: a saved role jumps to the end, and its pages can repeat one role and skip another

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [d8f96f4249](https://github.com/pkp/pkp-lib/commit/d8f96f4249c18749e5bbd7bc20361332779c33af) (2014-03-20)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a13)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On an install that runs on PostgreSQL, the "Roles" tab of Settings ›
Users & Roles has no order of its own. When a Journal Manager changes a
role's options in its "Edit" window and presses "OK", that role leaves
its place and is listed last, also after a reload.

When the list runs to more than one page and someone saves a role
between the reading of page 1 and page 2 (a second manager, or the same
manager in another tab), page 2 shows a role that page 1 already showed
and leaves another role off both pages. A reload shows every role once.

A journal, press or preprint server shows 25 roles per page unless the
manager chooses fewer, and a new one has 5 to 19 roles, so the repeated
and missing roles need a smaller "Items per page" or a context with more
than 25 roles.

## Impact

- **Lost.** No data. The manager loses the order they know.
- **Who.** Every Journal Manager (Press Manager, Manager) on PostgreSQL
  who changes a role's options.
- **Way round.** A reload shows each role once; the changed order stays.

Low: nothing stored is lost and every role can still be found. It would
be medium if PostgreSQL often stored a new role ahead of the others: on
`main` such a role is then the first row, which has no "Edit" or
"Remove" (Cause).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, on PostgreSQL (OJS; OMP and OPS
  the same, differences in brackets).
- Two browsers, or a normal and a private window, for the second group.

A saved role moves to the end:

1. Sign in as `rvaca` and open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`), tab
   "Roles". Note where "Copyeditor" is listed [OPS: "Author"].
2. On the "Copyeditor" row [OPS: "Author"], press "Settings" › "Edit".
3. Tick "Consider role in masthead list" and press "OK".
4. Reload the page and open "Roles".

Two managers, a paged list. Steps 5–7 continue on the same install after
step 4 [OJS and OMP; a preprint server lists five roles and shows no
"Items per page:", so skip this group on OPS]:

5. As `rvaca`, choose "10" in "Items per page:".
6. In the second browser, sign in as `admin` (also a Journal manager
   [Press manager]) and open the same "Roles" tab. Press "Settings" ›
   "Edit" on "Production editor", tick "Consider role in masthead list"
   and press "OK". [This save also gives "Production editor" every stage
   ([U54-A3-manager-level-role-save-ticks-every-stage.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md));
   the order fault is the same with any role whose options change.]
7. In `rvaca`'s browser, press the page link "2".

**Expected.** One fixed order. In steps 3 and 4 "Copyeditor" stays
where it was. In step 7 page 2 holds the roles that page 1 did not, so
every role is on exactly one page.

**Observed.** In step 1 "Copyeditor" is the sixth row of "1 - 18 of 18
items" [OMP: fifth of 19; OPS: "Author" third of 5]. In step 3 the
notice "Your changes have been saved." shows, and "Copyeditor" is now the
last row, after "Editorial Board Member" [OMP: after "Volume editor";
OPS: "Author" after "Editorial Board Member"]. After the reload in step 4
it is still last. [OMP: from step 1 on, "Volume editor" is listed last of
the installed roles, although the press installs it thirteenth, after
"Author".]

In step 5 page 1 reads "1 - 10 of 18 items", from "Journal manager" to
"Marketing and sales coordinator", with "Production editor" third [OMP:
"1 - 10 of 19 items", "Press manager" to "Proofreader"]. In step 7 page 2
reads "11 - 18 of 18 items":

```
Author, Translator, Reviewer, Reader, Subscription Manager,
Editorial Board Member, Copyeditor, Production editor
```

"Production editor" is on both pages, and "Proofreader" is on neither
[OMP: "11 - 19 of 19 items", from "Chapter Author" to "Production
editor"; "Author" is on neither page].

## Cause

`UserGroupGridHandler::loadData()` (lib/pkp
`controllers/grid/settings/roles/UserGroupGridHandler.php`, lines
192–215) builds `UserGroup::withContextIds([$contextId])`, adds the level
and stage filters, and reads one page with `offset()->limit()`. It sets
no `orderBy`:

```php
$pageResults = $builder->offset($offset)
    ->limit($perPage)
    ->get()
    ->all();
```

A query without `ORDER BY` returns its rows in whatever order the
database finds them. PostgreSQL scans the table in storage order, and an
`UPDATE` stores a new version of the row where the table has room,
usually at its end. A role's options ("Consider role in masthead list"
and the other boxes) are columns of its `user_groups` row, so saving a
change to them moves the role to the end of the list.

An "OK" that changes none of those columns leaves the row where it is.
Eloquent's `save()` writes only changed attributes, and
`SettingsBuilder::update()` writes the `user_groups` row only when one of
its own columns changed; a new "Role Name" or "Abbreviation" goes to
`user_group_settings` alone. Walked: an "OK" with nothing changed left
"Copyeditor" ("Author") in its place, also after a reload.

Each page is its own query. Page 2 skips the first ten rows of the order
the table has when page 2 is read, not when page 1 was. A save in between
moves a page 1 role to the end, so page 2 shows it again. The role that
was eleventh moves up to tenth, onto page 1, which the manager has
already read.

Reach:

- The level and stage filters run the same query with a narrower
  `WHERE`, so a filtered list has the same fault (code read).
- A new row is stored wherever PostgreSQL's free space map offers room.
  On an install where roles or contexts have been removed, that can be
  ahead of the context's other rows, so a role just made can be listed
  first. On `main` the first row of the list has no "Edit" or "Remove"
  ([U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md),
  whose fix is proposed, not merged), so that role can then be neither
  changed nor removed. This report's fix lists created roles last, so it
  ends that case too; the A1–A5 fix gives any first row its actions back.
- Other lists of a context's roles are read with
  `UserGroup::withContextIds(...)->get()` and no order. They are read
  once and not paged, so their entries only move after a save (code
  read, not walked): the "Users" tab's role filter
  (`UserGridHandler::renderFilter()`), the role boxes of "Edit User"
  (`UserForm`), `ExportableUsersGridHandler`, `AdminHandler`,
  `PKPNotifyUsersForm`, the users statistics `ReportForm` and the
  invitation's `SendInvitationStep`.

## Proposed fix

Give the list an order in `UserGroupGridHandler::loadData()`, where the
query is built: the role's id, which is the order the roles were made
in, so a context's installed roles come in the order of
`registry/userGroups.xml` and created roles after them. The model
already has the scope (`UserGroup::scopeOrderById()`), and pkp-lib fixed
the same missing order for contributor roles the same way, with an
`orderBy` on the primary key (`pkp/pkp-lib#13102`).
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/fix.diff):

```diff
-        $pageResults = $builder->offset($offset)
+        // Give the list one fixed order, the order the roles were made in, so that a
+        // saved role keeps its place and each page is cut from the same order.
+        $pageResults = $builder->orderById()
+            ->offset($offset)
             ->limit($perPage)
```

The fix was tried on OJS, OMP and OPS `main`, and the Steps then gave
the Expected: "Copyeditor" ("Author") kept its place after "OK" and after
the reload. Page 2 held "Marketing and sales coordinator" to "Editorial
Board Member" (OMP "Proofreader" to "Editorial Board Member"), with no
role on both pages and none missing. OMP then lists "Volume editor"
thirteenth, after "Author".

The fix changes nothing else on the list. With and without it, the whole
list, the "Assistant" level filter and the "Production" stage filter
showed the same roles and the same count lines. A role made with "Create
New Role" was listed last both times.

**Alternatives**

- Order by permission level, then id (`orderByRoleId()`, as
  `getUserGroupsByStage()` does). It groups the roles by level, which is
  neither the order the registry installs them in nor the order managers
  see today on a new context.
- A default order on the `UserGroup` model (a global scope). It would
  cover every list at once, but would change every user group query,
  including those that order by role already, so it reaches much further
  than this list.

**What goes with it**

- The other unordered lists under Reach could take the same
  `orderById()` for one consistent order. They are not paged, so they
  are left out of this fix.
- A guard: the e2e scenario that saves a role's options and finds it in
  the same place, and that reads two pages around a save (spec U54). A
  unit test of a legacy grid handler needs a request and a context,
  which lib/pkp's tests do not build for grids.
- No data repair and no API change. The line applies to 3.5 as written.
  On 3.4 the grid has three branches. The no-filter branch and the stage
  filter branch take `->orderBy(Collector::ORDERBY_ID)` on their
  collector. The level filter branch calls the shared
  `Repository::getByRoleIds()`, which has about 13 other callers, some
  of them taking the first match; it should build the grid's own
  collector (`filterByRoleIds()`, `filterByContextIds()`,
  `orderBy(Collector::ORDERBY_ID)`) instead, so that those callers are
  untouched. On 3.3 the fix is `ORDER BY ug.user_group_id` in
  `UserGroupDAO::getByContextId()`.

Small: one line in the shared handler, and an e2e check.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/walk.js),
  with its helpers in `lib.js` beside it. The check of the fix's reach
  is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/neighbour.js),
  and the unchanged "OK" is
  [unchanged-ok.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/unchanged-ok.js).
  In a pkp-e2e checkout, on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/walk.js`
  Step 6 runs in a second browser of the same script.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL;
  the two lines gave the same lists, row for row. Dataset: pkp/datasets
  c657990 (2026-10-01). Tips: `main` ojs b84f8e2e44, omp 3b0ecf794, ops
  c8af945bb7, lib/pkp ddd8ab243a (ojs) and 3dc90c81a6 (omp, ops);
  `stable-3_5_0` ojs c346ee00a5, omp c7b45f88e, ops 8eaf899468, lib/pkp
  3bb4450bea (ojs) and 1fb843f491 (omp, ops); `stable-3_4_0` lib/pkp
  32b0f4b4af; `stable-3_3_0` lib/pkp f6ab331645.
- MySQL not walked; a code and engine read. InnoDB answers `SELECT …
  FROM user_groups WHERE context_id = ? LIMIT … OFFSET …` in the order
  of the index it reads: the clustered primary key, or the
  `user_groups_context_id` index, whose entries carry the primary key
  after `context_id`. Either way one context's roles come in id order.
  An `UPDATE` changes the row in place in the clustered index, so a
  saved role does not move. SQL does not promise this order, but on
  InnoDB the fault is not expected to show.
- Items per page: the dataset's three contexts store `itemsPerPage` 25.
  The dataset lists 18 roles on OJS, 19 on OMP and 5 on OPS. A choice of
  "10" lasts until the page is reloaded.
- OMP's "Volume editor": read in the test database after a load of the
  dataset, its `user_groups` row (id 14) is stored after id 20, the last
  of the press's other roles, as a saved row is.
- A role just made listed first was not walked: on the default dataset
  the roles table fits in one block with room at its end, so a new role
  is stored last. Spec U54 register
  [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a13)
  records it on the campaign's own test installs, where many contexts had
  been created and deleted: in one setup a created role came first in 10
  of 10 runs, and in another on about one new journal in eighty.
- 3.4 code (`UserGroupGridHandler.php`, `classes/userGroup/Collector.php`,
  `DAO.php`, `Repository.php`): `loadData()` reads the collector (no
  filter, stage filter) or `getByRoleIds()` (level filter), none with an
  order (the Collector orders only when asked). The no-filter and level
  filter branches return the whole list, which `GeneralPagingFeature`
  pages in PHP; the stage filter branch pages in SQL with `limit()` and
  `offset()`. Either way each page read is a new query.
  `EntityDAO::_update()` writes the whole `user_groups` row on every
  save, so on 3.4 an unchanged "OK" moves a role too.
- 3.3 code (`UserGroupGridHandler.inc.php`, `UserGroupDAO.inc.php`):
  `loadData()` reads `getByContextId($contextId, $rangeInfo)`, a `SELECT`
  without `ORDER BY` paged by `retrieveRange()` (the level filter's
  `getByRoleId()` orders by `user_group_id`, the stage filter's
  `getUserGroupsByStage()` by `role_id` alone); `updateObject()` runs
  `UPDATE user_groups`.
- Introduced: `git blame` on `main` gives 0cca3e323b (the paging,
  2026-05-27) for the query line; the list was unordered before it on
  every branch read. `git log -S` on 3.3's grid gives d8f96f4249
  (Bruno Beghelli, 2014-03-20, `*8637*`) as the commit that paged the
  list over `getByContextId()`, which had no `ORDER BY` then either.
- Upstream search (2026-10-02): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, by the symptom's words (roles
  order, user groups order, roles grid sort, role list order changes,
  roles pagination duplicate) and by `UserGroupGridHandler` and
  `orderById`. Nearest, not the same fault: `pkp/pkp-lib#13102`
  (contributor roles without an order), `pkp/pkp-lib#12944` (the Roles
  stage filter's error), `pkp/pkp-lib#13370` (masthead order).
