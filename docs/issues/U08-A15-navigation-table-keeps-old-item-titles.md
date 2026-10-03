# Website › "Navigation": after an item is renamed or removed, each menu's item list keeps the old items until a reload

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3346` for `pkp/pkp-lib#3287` · [02143ba508](https://github.com/pkp/pkp-lib/commit/02143ba5084228924e45be62dae1b4e82b5ef1b2) · 2018-01-31 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a15)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On Settings › Website › "Setup" › "Navigation", a Journal Manager
renames a navigation item, or removes one, and the "Navigation Menu
Items" table changes at once. The "Navigation" table above it does not
change until the page is reloaded. After a rename, each menu's
"Navigation Menu Items" cell still shows the old title. After a
removal, it still shows the removed item and the items that sat under
it.

The menus themselves are stored and shown to readers as changed. Adding
an item, and arranging items in a menu's window, leave the table
current. The Site Administrator's own "Navigation" tab behaves the same.

## Impact

- **Lost**: nothing. Only the overview of each menu is out of date,
  with no sign that it is.
- **Who**: whoever manages the navigation of a journal, press or
  server, or of the site, each time they rename or remove an item. That
  is an occasional task.
- **Way round**: reload the page. Or press the menu's title in the
  "Navigation" table: its window opens and lists the current items.
  Saving a menu from that window is safe, because the window loads its
  items afresh and cannot bring a removed item back.

Low: a summary on a settings page is out of date until a reload, and
every stored menu is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same,
  with their own items in the cell). Nothing else.

1. Sign in as `rvaca` (the journal manager).
2. Open Settings › Website › "Setup" › "Navigation"
   (`/index.php/publicknowledge/en/management/settings/website#setup/navigationMenus`).
3. Read the "Primary Navigation Menu" row's "Navigation Menu Items"
   cell in the "Navigation" table. It names "Contact" and "About" among
   the others.

Renaming:

4. In the "Navigation Menu Items" table, press the "Settings" arrow of
   "Contact", then "Edit".
5. Replace the "Title" "Contact" with "Reach us" and press "Save".
   "Navigation menu item was successfully updated" shows, and the items
   table lists "Reach us".
6. Read the "Primary Navigation Menu" cell again.

Removing:

7. Press the "Settings" arrow of "About" in "Navigation Menu Items",
   then "Remove", then "OK". "Navigation menu item was successfully
   removed" shows, and "About" leaves the items table.
8. Read the "Primary Navigation Menu" cell again.
9. Reload the page and read the cell.

(The site's own tab: sign in as `admin`, create a second journal under
Administration › "Hosted Journals" › "Create Journal", since the tab
shows only once there are two, then open Administration › "Site
Settings" › "Site Setup" › "Navigation" and rename "Dashboard" there.
The "User Navigation Menu" cell keeps "Dashboard" the same way.)

**Expected**: at step 6 the cell names "Reach us" and no longer
"Contact". At step 8 it no longer names "About" nor the items that sat
under it, and reads as it does after the reload at step 9.

**Observed**: the cell reads the same at steps 3, 6 and 8:

```
Current, About the Journal, Submissions, Archives, Announcements, Editorial Masthead, Privacy Statement, About, Contact
```

The browser sends no request for the "Navigation" table after either
save: no `…/$$$call$$$/grid/navigation-menus/navigation-menus-grid/fetch-grid`
in the network panel. Only the reload at step 9 brings the cell in
line:

```
Current, Archives, Announcements
```

Control: after step 5, pressing "Primary Navigation Menu" opens the
menu's window, and its "Assigned Menu Items" already list the new title.

## Cause

The Navigation tab holds two separate legacy grids, each loaded into
its own `<div>` by `{load_url_in_div}` in
[`templates/management/website.tpl`](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/templates/management/website.tpl#L76)
(the site's tab: `templates/admin/settings.tpl`). The menus grid's
"Navigation Menu Items" column is rendered on the server when the grid
is fetched:
[`NavigationMenusGridCellProvider::getTemplateVarsFromRowColumn()`](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/controllers/grid/navigationMenus/NavigationMenusGridCellProvider.php#L89),
case `nmis`, joins the titles of `NavigationMenuItemDAO::getByMenuId()`.

An item is saved or removed through the items grid:
[`NavigationMenuItemsGridHandler::updateNavigationMenuItem()`](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/controllers/grid/navigationMenus/NavigationMenuItemsGridHandler.php#L196)
and
[`deleteNavigationMenuItem()`](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/controllers/grid/navigationMenus/NavigationMenuItemsGridHandler.php#L273)
answer `DAO::getDataChangedEvent($navigationMenuItemId)` and nothing
else.

That answer reaches the handler of the window or confirmation the items
grid opened. `ModalHandler` and `LinkActionHandler` pass `dataChanged`
on with `publishEvent()` to the grid whose link opened them, which is
the items grid, and it redraws the row. Nothing reaches the menus grid,
so its cells keep the HTML they were fetched with.

A removal also changes the menus without any code touching the menus
grid. The item's assignment rows, and those of the items under it, go
with it through the foreign keys' `ON DELETE CASCADE`.

The column was added in 02143ba508 to show each menu's items at a
glance (`pkp/pkp-lib#3287` found the menus confusing), without a way
for the items grid to refresh it.

Reach:

- The site's own "Navigation" tab: the same; checked on screen on
  `main`, OJS, OMP and OPS.
- "Add item": a new item sits in no menu, so no cell changes (code).
- A menu saved from its window, including items moved or nested there:
  `useNavigationMenuManagerForm.js` triggers `dataChanged` on the
  window's handler, which redraws the menus grid. Not affected (code).
- The menu window loads its items from the API when it opens; the row
  passes it only the menu's id, title and area. So a menu opened and
  saved from the stale table cannot bring back a removed item (code;
  on screen on `main`, the window listed a renamed item's new title
  while the cell still held the old one).

## Proposed fix

Have the items grid announce its changes as a global event, and reload
the menus grid's `<div>` on it. On the server side this is what
`UserGroupGridHandler::updateUserGroup()` does for the users list
(`$json->setGlobalEvent('userGroupUpdated')`). On the page side,
`{load_url_in_div}` already takes a `refreshOn` parameter, which
`UrlInDivHandler` binds to `reload()`; so no JavaScript changes and
nothing is rebuilt. This is a proposal.

```diff
--- a/lib/pkp/controllers/grid/navigationMenus/NavigationMenuItemsGridHandler.php
+++ b/lib/pkp/controllers/grid/navigationMenus/NavigationMenuItemsGridHandler.php
@@ updateNavigationMenuItem()
-            // Prepare the grid row data.
-            return \PKP\db\DAO::getDataChangedEvent($navigationMenuItemId);
+            // Prepare the grid row data, and redraw the menus grid, whose
+            // "Navigation Menu Items" column lists the items' titles.
+            $json = \PKP\db\DAO::getDataChangedEvent($navigationMenuItemId);
+            $json->setGlobalEvent('navigationMenuItemsChanged');
+            return $json;
@@ deleteNavigationMenuItem()
-            return \PKP\db\DAO::getDataChangedEvent($navigationMenuItemId);
+            $json = \PKP\db\DAO::getDataChangedEvent($navigationMenuItemId);
+            $json->setGlobalEvent('navigationMenuItemsChanged');
+            return $json;
--- a/lib/pkp/templates/management/website.tpl   (and templates/admin/settings.tpl)
-{load_url_in_div id="navigationMenuGridContainer" url=$navigationMenusGridUrl}
+{load_url_in_div id="navigationMenuGridContainer" url=$navigationMenusGridUrl refreshOn="navigationMenuItemsChanged"}
```

The items grid's row redraw is kept. `JSONMessage::setEvent()` appends
to the message's events, so `dataChanged` still travels with the new
event. `Handler::handleJson()` sends an event marked `isGlobalEvent`
only to `pkp.eventBus`, where the container listens, and triggers
`dataChanged` locally as before.

`updateNavigationMenuItem()` also serves "Add item", so an add reloads
the menus grid too. That is accepted rather than guarded: it costs one
fetch, the cells read the same, and it keeps one code path.

The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/navigation-table-keeps-old-item-titles/fix.diff).
It was tried on `main`, OJS, OMP and OPS. The Steps then showed the
Expected: "Reach us" at step 6, and "Current, Archives, Announcements"
at step 8, each after one fetch of the menus grid. A save the form
refused (an emptied "Title") reloaded nothing. The redrawn table's menu
title still opened its window. The site's tab updated too, and with the
fix taken out it stayed stale.

**Alternatives**:

- A JavaScript handler for the menus grid that binds the event and
  calls `refreshGridHandler()`, as `UserGridHandler.js` does for
  `userGroupUpdated`: the same result, but a new JS class, its
  registration and a build, for nothing over reloading the `<div>`.
- Drop the "Navigation Menu Items" column: it loses the overview
  `pkp/pkp-lib#3287` asked for.
- Replace the tab's grids with a Vue list, as `pkp/pkp-lib#12826`
  (remove the grid code) plans across the apps: that would retire the
  fault too, but it is a far larger change.

**What goes with it**:

- No stored data is wrong, so no repair. No REST API or plugin hook
  changes: the grid's JSON answer gains one event, which only the
  page's own handlers read.
- The diff applies as written to `stable-3_5_0`. On 3.4 the PHP hunk
  applies (the two `return` lines sit at L194 and L269), but the two
  template hunks do not, because the lines around them differ; the one
  `refreshOn` attribute is added by hand. On 3.3 the PHP hunk must be
  rewritten by hand too: the file is
  `NavigationMenuItemsGridHandler.inc.php` (L181, L258), indented with
  tabs, calling `DAO::getDataChangedEvent()` unqualified, and the
  template line is `website.tpl` L63. `refreshOn` and
  `setGlobalEvent()` exist on both.
- The guard: the e2e scenarios of spec U08 that rename and remove an
  item read the "Navigation" cell before a reload (a **Planned** item
  in the spec).

Small: three short edits in pkp-lib that follow patterns the code
already uses, and an e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/navigation-table-keeps-old-item-titles/walk.js)
  (helpers in `lib.js` beside it), run from a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/navigation-table-keeps-old-item-titles/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The argument
  `neighbour` runs the checks around the fix instead (the refused save,
  the redrawn table's menu title, the site's tab); there the second
  journal comes from pkp-e2e's test API rather than "Create Journal".
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on the default
  dataset (pkp/datasets e8dafbc, 2026-10-02), PostgreSQL. After each
  button press the walk waited for the requests it started, then read
  the cell. The OMP and OPS cells read "Catalog, About the Press,
  Submissions, Announcements, About, Editorial Masthead, Privacy
  Statement, Contact" and "Announcements, About the Server,
  Submissions, Archives, About, Editorial Masthead, Privacy Statement,
  Contact" at steps 3, 6 and 8, and "Catalog, Announcements" and
  "Announcements, Archives" after the reload. 3.5 gave the same cells
  as `main` on all three apps.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794c and
  OPS c8af945bb7 (pkp-lib 3dc90c81a6; the three files the fix touches
  are identical in both pkp-lib commits); `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335).
- 3.5 (walked, and read): `NavigationMenuItemsGridHandler.php` and the
  template lines are the same as on `main`.
- 3.4 and 3.3 (code): pkp-lib `stable-3_4_0` 9e41f10273 and
  `stable-3_3_0` ac3fa73402, read with `git show`. Both answer only
  `getDataChangedEvent()` in `updateNavigationMenuItem()` and
  `deleteNavigationMenuItem()`, render the `nmis` column from
  `getByMenuId()`, and load the menus grid with no `refreshOn`;
  02143ba508 is on both branches.
- Introduced: `git log -S nmis` on `controllers/grid/navigationMenus/`
  gives 02143ba508 as the commit that added the column; the items
  grid's `getDataChangedEvent()` answers go back to `pkp/pkp-lib#2178`
  (2017).
- Not walked: adding an item and saving a menu from its window (read in
  the code, Cause "Reach").
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched by symptom words and by `NavigationMenusGridCellProvider` and
  `NavigationMenuItemsGridHandler`; no match. `pkp/pkp-lib#12826` (open)
  is the general plan to remove grid code, not this fault.
