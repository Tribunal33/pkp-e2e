# On the Roles list, the two filter lists fold away after a choice, so a filtered list looks complete

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#4175` for `pkp/pkp-lib#3404` · [5ff57ad155](https://github.com/pkp/pkp-lib/commit/5ff57ad1557a123d285e87cfcf7802bb7452e342) · 2018-10-22 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A manager on Settings › Users & Roles › "Roles" presses "Search" and
chooses an entry under "List roles assigned to" or "With permission
level set to". The roles list redraws with the matching roles, and at
once the two filter lists fold away again behind "Search". The page is
written to keep them open, and did until pkp-lib moved to jQuery 3 in
2018.

Nothing then says the roles list is filtered except its count line ("1
- 2 of 2 items" for "Author" on a journal). The filter stays in place,
still folded away, after a switch to another tab and back. A manager who
comes back to the tab can take the shorter list for all the journal's
roles. "Search" shows the entry still chosen, and a reload of the page
clears it.

Changing "Items per page:" while the two filter lists are shown folds
them away the same way.

## Impact

- **Lost**: nothing is saved or lost; only the sign that the roles list
  is filtered.
- **Who**: every manager who uses the two filter lists on the "Roles"
  tab, at every choice.
- **Way round**: the count line, "Search", or a reload.

Low: the filter works and nothing is lost. It would rank higher only if
the folded filter led managers to act on a role list they took for
complete; no such case is known.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same, with
  their own role names).

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`) and its
   "Roles" tab. The list reads "1 - 18 of 18 items" (a press: 19; a
   preprint server: 5).
3. Press "Search" above the list. Two filter lists show: "List roles
   assigned to" ("All Workflow Stages") and "With permission level set
   to" ("All Permission Levels").
4. Under "With permission level set to", choose "Author".
5. Press "Search".

**Expected**: after step 4 the roles list holds "Author" and
"Translator", "1 - 2 of 2 items" (a press: "Author", "Chapter Author",
"Translator" and "Volume editor", "1 - 4 of 4 items"; a preprint server:
"Author", "1 - 1 of 1 items"), and the two filter lists stay shown with
"Author" chosen.

**Observed**: after step 4 the roles list is filtered as expected, but
the two filter lists fold away behind "Search"; only "1 - 2 of 2 items"
says the list is filtered. Step 5 shows them again, with "Author" still
chosen under "With permission level set to". No request failed and the
page logged no error.

## Cause

`GridHandler.prototype.replaceGridResponseHandler_()` in
`lib/pkp/js/controllers/grid/GridHandler.js` (lines 825–853) redraws a
whole list: after a filter choice (`refreshGridWithFilterHandler_()`),
after a page-size change, and after a `dataChanged` that names no row
(`refreshGridHandler()`; one naming a row redraws only that row). It
notes whether
the filter form is open (`isFilterVisible`), replaces the grid's HTML,
and then clicks the new grid's "Search" link
(`.pkp_linkaction_search`) to open the form again. That reopening was
added with infinite scrolling in
[380b4da2b6](https://github.com/pkp/pkp-lib/commit/380b4da2b6f514a2dc2ed93b0fd49da7a353d55e)
(2015).

The click now comes before the new grid has a handler. The new HTML
attaches its `GridHandler` in `templates/controllers/grid/grid.tpl`
inside `$(function() { … $('#<gridId>').pkpHandler(…) })`. Since jQuery
3.0 a document-ready callback runs asynchronously, even when the
document is already ready. So when `replaceGridResponseHandler_()`
clicks, the new "Search" link has no click handler and nothing happens.
The new handler's `initialize()` runs a moment later and hides the form
(`this.getHtmlElement().find('.pkp_form').hide()`, line 543), so the form
ends hidden and the link loses `is_open`. Under jQuery 1.x, which pkp-lib
used until 5ff57ad155 moved `components/jquery` from `1.*` to `3.*`, the
callback ran synchronously inside `replaceWith()`, and the click found
the handler bound. The reopening was last changed in
[6f68fc9819](https://github.com/pkp/pkp-lib/commit/6f68fc9819c6294f8d69ef3df3d50a8c224dd3a3) (2015-08-05),
which gave it today's selectors, also under jQuery 1.

The chosen entries are kept: the redrawn form is rendered with the
filter values the server received, so "Search" shows them.

Reach:

- The Roles list's filter choice and its "Items per page:" with the
  filter open: both redraw through `replaceGridResponseHandler_()`
  (walked).
- Every other list whose filter folds behind "Search"
  (`GridHandler::isFilterFormCollapsible()` true, the default) takes the
  same path (code): Settings › Website › Plugins' installed plugins
  (`PluginGridHandler`) and the Plugin Gallery
  (`PluginGalleryGridHandler`), the users list of the site
  administrator's journal settings (`UserGridHandler`), the Users XML
  plugin's list (`ExportableUsersGridHandler`), every file list built on
  `SubmissionFilesGridHandler` (its `getFilterForm()` always returns
  `filesGridFilter.tpl`), and on OJS the subscriptions lists
  (`SubscriptionsGridHandler`) and the export plugins' issue and article
  lists (`PubIdExportIssuesListGridHandler`,
  `PubIdExportRepresentationsListGridHandler`,
  `ExportPublishedSubmissionsListGridHandler`,
  `ExportPublishedPublicationsListGridHandler`).
- The Users tab beside "Roles" is a separate Vue list on `main` and 3.5
  and is not affected. On 3.4 and 3.3 it is the `UserGridHandler` grid,
  whose search folds away the same way (code).
- A file's history (`SubmissionFileEventLogGridHandler`) is left out:
  its `eventLogGridFilter.tpl` form has no `filter` class, so
  `isFilterVisible` (line 836) is always false there and the reopening
  never runs, under any jQuery. That is a separate gap the fix does not
  cover; adding `filter` to that form would bring it in, untried.
- Lists whose filter never folds (`UserSelectGridHandler`,
  `SubscriberSelectGridHandler`,
  `SelectableSubmissionFileListCategoryGridHandler`) show the form in
  `initialize()` itself and are not affected (code).
- No other code clicks into HTML it has just replaced (a search of
  `lib/pkp/js` for `.click()` and `replaceWith(`).

## Proposed fix

A proposal for the team. Reopen the form when the new grid's handler
announces itself. `GridHandler.initialize()` already ends with
`this.trigger('gridInitialized')`, which fires on the grid element
through `triggerHandler()`, so one listener on the new element waits
for it ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-filter-lists-hide-after-choice/fix.diff)):

```diff
 			if (isFilterVisible) {
-				// Open search control again.
-				$newGrid.find('.pkp_linkaction_search').click();
+				// Open search control again, once the new grid's handler is
+				// attached: the grid template attaches it in a document-ready
+				// callback, which jQuery 3 runs asynchronously, and its
+				// initialize() hides the filter form.
+				$newGrid.one('gridInitialized', function() {
+					$newGrid.find('.pkp_linkaction_search').click();
+				});
 			}
```

It sits in the shared `GridHandler`, so every list in the reach is
covered, and it uses the event the handler already fires. Tried on all
three apps: with the fix the two filter lists stayed shown with "Author"
chosen after step 4, and after a switch to the "Users" tab and back.
With them closed, "Items per page:" "10" still left them closed, and
"Search" still closed them.

**Alternatives**:

- Attach the grid handler without `$(function() { … })` in `grid.tpl`:
  the script stands before the grid's markup, so it would have to move
  below it, on every list of every page; a far wider change.
- Show `.pkp_form` directly instead of clicking: the new handler's
  `initialize()` hides it again afterwards.
- Have the server render the form open on a redraw: a request flag and a
  change to every filter template, for the same result.

**What goes with it**:

- No API, plugin hook or stored data is touched. The same lines stand on
  `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`; in a pkp-lib
  checkout the diff applies with `patch -p3`, since its paths start at
  the app root (`lib/pkp/…`).
- The guard: an end-to-end check on the "Roles" tab that chooses a level
  and finds the two filter lists still shown with the entry chosen.

Small: a few lines in one shared JavaScript file, and one end-to-end
check.

## Evidence

- The kept script walks steps 1–5, and between steps 4 and 5 switches to
  the "Users" tab and back:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-filter-lists-hide-after-choice/walk.js),
  with its helpers in `lib.js` beside it. Run it from a pkp-e2e checkout,
  on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/roles-filter-lists-hide-after-choice/walk.js`
  (`<feature>` names the pkp-e2e install to drive, the one
  `npm run fleet-prep -- --feature <feature> --dataset 1 --reset` loads
  from the default dataset; `<id>` any short name for the output
  folder). The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/roles-filter-lists-hide-after-choice/fix.diff ojs omp ops`,
  `walk.js` and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-filter-lists-hide-after-choice/neighbour.js)
  each on a freshly loaded install, then `revert`. `neighbour.js`, run
  with the fix in and out, checks that the fix reaches no further than
  it should: filter lists closed stay closed after "Items per page:"
  "10", and "Search" still closes them. Without the fix it also shows the "Items
  per page:" "25" fold of Observed.
- Walked on PostgreSQL: OJS, OMP and OPS, `main` and `stable-3_5_0`.
  No request failed and no script error was recorded. Dataset: pkp/datasets c657990 (2026-10-01).
  Tips: `main` ojs b84f8e2e44, omp 3b0ecf794c, ops c8af945bb7, lib/pkp
  ddd8ab243a (ojs) and 3dc90c81a6 (omp, ops); `stable-3_5_0` ojs
  c346ee00a5, omp c7b45f88ea, ops 8eaf899468, lib/pkp 3bb4450bea (ojs)
  and 1fb843f491 (omp, ops); `stable-3_4_0` lib/pkp 32b0f4b4af;
  `stable-3_3_0` lib/pkp f6ab331645.
- Code read on `main` and 3.5: `js/controllers/grid/GridHandler.js`
  (`initialize()`, `replaceGridResponseHandler_()`),
  `templates/controllers/grid/grid.tpl`,
  `templates/controllers/grid/settings/roles/userGroupsGridFilter.tpl`,
  `js/controllers/form/ToggleFormHandler.js`,
  `classes/controllers/grid/GridHandler.php` (`initialize()`, the
  "Search" link; `isFilterFormCollapsible()`), `getFilterForm()` of each
  list in the reach, and the apps' `package.json` (`jquery` `^3.7.1`).
  The 3.5 walk served `js/pkp.min.js` (`enable_minified` on), `main` the
  separate files; both show the fault. On 3.4 and 3.3, lib/pkp's
  `GridHandler.js` holds the same `initialize()` and
  `replaceGridResponseHandler_()`, `grid.tpl` the same `$(function() {`
  wrapper and `userGroupsGridFilter.tpl` the same form, and
  `composer.lock` pins `components/jquery` v3.7.1.
- Introduced: `git blame` on `GridHandler.js` lines 836 and 850 (the
  check and the click) gives 6f68fc9819 (2015-08-05, Alec Smecher,
  "Manual rebase of Nate's header_ui branch"), which changed their
  selectors to `.filter` and `.pkp_linkaction_search`; `git log -S` gives
  the reopening itself to 380b4da2b6 (2015-01-16, Bruno Beghelli, PKP's
  earlier tracker 8759, "Implement infinite scrolling"). Both were
  written when pkp-lib used jQuery 1.11 (37fd452694). The lines were not
  changed after 6f68fc9819; they stopped working when
  5ff57ad155 moved `composer.json` from `"components/jquery": "1.*"` to
  `"3.*"` (PR `pkp/pkp-lib#4175`, "Update JQuery/JQueryUI to modern",
  for `pkp/pkp-lib#3404`). jQuery 3.0's upgrade guide lists
  document-ready handlers becoming asynchronous.
- Unverified: the fold was not walked on a jQuery 1 build; that the
  reopening worked before 2018 rests on jQuery's documented change. The
  other lists in the reach were not walked; the Plugin Gallery cannot
  load on an install without outside access.
- Upstream search 2026-10-02: pkp/pkp-lib, pkp/ojs and pkp/ui-library
  issues and PRs, by "filter hidden grid", "filter disappears", "roles
  filter", "permission level filter", "grid search form closes",
  `isFilterVisible`, `replaceGridResponseHandler`. `pkp/pkp-lib#12944`
  (a server error from the stage filter) is a different fault.
