# The Roles list hides its filters after each choice, so a filtered list looks like the whole list

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#4175` for `pkp/pkp-lib#3404` · [5ff57ad155](https://github.com/pkp/pkp-lib/commit/5ff57ad1557a123d285e87cfcf7802bb7452e342) · 2018-10-22 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles › "Roles", "Search" shows two filters above
the list: "List roles assigned to" and "With permission level set to".
When a manager chooses an entry in either filter, the list shows only the
matching roles, and both filters hide again behind "Search". The filters
stay hidden when the manager switches to another tab and comes back.

Nothing on screen then says the list is filtered. Its count line gives
only the filtered total ("1 - 8 of 8 items"), so a manager who comes back
to the tab can take the shorter list for all the journal's roles.

The same happens after each search on the older grid lists that have a
"Search" link above them, such as "Installed Plugins" under Settings ›
Website › Plugins.

## Impact

- **Lost**: nothing stored. The list is filtered correctly; only the sign
  that it is filtered is gone.
- **Who**: journal, press and preprint server managers, every time they
  filter the "Roles" list. The same filters hide after a search on
  "Installed Plugins" (walked) and, from the code, on the users lists of
  Administration's settings wizard and "Merge user", the Plugin Gallery,
  the submission file lists and a file's history log, OJS's subscription
  lists, and the export lists of the import/export and DOI plugins.
- **Way round**: "Search" shows the filters again with the entry still
  chosen; a reload clears the filter. The count line does not help: "1 - 8
  of 8 items" reads like a complete list of eight roles. A manager who
  misses this may not find a role they came to edit, and could take it
  for removed or create it again.

Low: nothing is stored wrong and every role is one press of "Search" or a
reload away; the cost is a manager's time and a wrong impression of the
journal's roles, which a duplicate role created on that impression would
raise to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS in brackets).

Level filter:

1. Sign in as `rvaca` (the journal manager).
2. Open Settings › Users & Roles and its "Roles" tab
   (`/index.php/publicknowledge/en/management/settings/access`). The line
   under the list reads "1 - 18 of 18 items" [OMP 19, OPS 5].
3. Press "Search" at the list's top right. The filters "List roles
   assigned to" ("All Workflow Stages") and "With permission level set
   to" ("All Permission Levels") show above the list.
4. Under "With permission level set to", choose "Assistant".
5. Open the "Site Access Options" tab, then the "Roles" tab again.
6. Press "Search".

Stage filter:

7. Reload the page, open the "Roles" tab and press "Search".
8. Under "List roles assigned to", choose "Production".

**Expected**: after step 4 the list holds the "Assistant" roles and both
filters stay open above it, with "Assistant" chosen. They are still open
after step 5. Step 6 hides them. After step 8 the filters stay open, with
"Production" chosen.

**Observed**:

- Step 4: the list redraws with eight roles, "Copyeditor" to "Editorial
  Board Member", and reads "1 - 8 of 8 items" [OMP the same; OPS
  "Editorial Board Member" alone, "1 - 1 of 1 items"]. Both filters are
  already hidden when the redrawn list shows; above it only "Current
  Roles", "Search" and "Create New Role" remain.
- Step 5: the same filtered list, the filters hidden.
- Step 6: the filters show again, with "Assistant" chosen.
- Step 8: the list redraws with "1 - 10 of 10 items" [OMP 11, OPS 3], and
  the filters are hidden again.

Control: "Search" pressed twice with nothing chosen shows the filters and
hides them again.

## Cause

`GridHandler.prototype.replaceGridResponseHandler_()` (pkp-lib,
`js/controllers/grid/GridHandler.js` lines 825-853) redraws a legacy grid
after its filter form is submitted. It notes whether the filter form is
visible (line 836), replaces the whole grid with the server's new markup,
and, when the form was open, "clicks" the new grid's "Search" link to
open it again (line 850).

The new markup sets up its own `GridHandler` inside a jQuery ready
callback (`templates/controllers/grid/grid.tpl` lines 16-37, `$(function()
{…})`). Since jQuery 3.0, a ready callback added after the page has loaded
no longer runs at once; it runs after the current code returns. So at line
850 the new "Search" link has no click handler yet, and the click does
nothing. Then the ready callback runs `initialize()`, which hides every
filter form of the grid (line 543), as on a first load. The server renders
the chosen entries into the new form, so the grid stays filtered with the
form hidden.

Line 850 was right when it was written (2015, on jQuery 1.11, where such a
callback ran at once), so the form stayed open through 3.1.1, which still
shipped jQuery 1.11. It became wrong with the update to jQuery 3
(`pkp/pkp-lib#3404`, PR `pkp/pkp-lib#4175`), first released in 3.1.2.
The same PR adapted `UrlInDivHandler` to the change
([acddf81e18](https://github.com/pkp/pkp-lib/commit/acddf81e18a4ebd8ebe626d790d6d35d5136c757))
but not this call.

Reach:

- Every legacy grid whose filter form opens with a "Search" link
  (`GridHandler::isFilterFormCollapsible()` true, the default) hides its
  form after each search. Walked: both filters of the "Roles" list;
  "Installed Plugins" under Settings › Website › Plugins (its category
  filter and "Search" button). Code: the users grid of Administration's
  settings wizard and of "Merge user" (`UserGridHandler`), the Plugin
  Gallery, the user export list of Tools' "Users XML Plugin"
  (`ExportableUsersGridHandler`), the submission file lists
  (`SubmissionFilesGridHandler` and its subclasses), a file's history log
  for editors (`SubmissionFileEventLogGridHandler`), OJS's subscription
  lists, and the export lists of the import/export and DOI plugins (OJS
  and OPS; OMP has none of its own).
- Any other full redraw while the form is open goes through the same
  callback and hides it too: a page link or "Items per page", or a change
  that redraws the whole grid (code; not walked).
- Grids whose filter has no "Search" link (`UserSelectGridHandler`,
  `SelectableSubmissionFileListCategoryGridHandler`, OJS's
  `SubscriberSelectGridHandler`) are not affected: `initialize()` shows
  their form itself (code).

## Proposed fix

A proposal; the team decides. Open the form again once the new grid's
handler is set up, on the `gridInitialized` event that `initialize()`
raises when it finishes (line 558)
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-filters-hide-after-choice/fix.diff)):

```diff
 			if (isFilterVisible) {
-				// Open search control again.
-				$newGrid.find('.pkp_linkaction_search').click();
+				// Open search control again, once the new grid's own handler
+				// has bound the search link and hidden the form: grid.tpl
+				// attaches that handler in a ready callback, which jQuery 3
+				// runs after this callback has returned.
+				$newGrid.one('gridInitialized', function() {
+					$newGrid.find('.pkp_linkaction_search').click();
+				});
 			}
```

The rule lives in `GridHandler`, which both hides the form on set-up and
opens it again after a redraw, so one change covers every grid under
Reach. `gridInitialized` has no other listener. The fix keeps the 2015
intent (the form stays open across redraws) without undoing the jQuery 3
update.

It works because the new grid's handler is set up after this callback
returns, so the listener is attached before `gridInitialized` fires. That
holds for every legacy grid today: `GridHandler::getTemplate()` defaults
to `grid.tpl`, which sets up the handler in a ready callback; the only
other grid template, `listbuilder.tpl` (listbuilders, which have no
filter form), does the same; and no grid in pkp-lib or the apps sets
another. A grid set up at once would fire the event before the listener
exists, and its form would stay hidden, as today.

A search for the same mistake (code that acts on a grid's new markup
before its handler is set up) found no other case in pkp-lib's legacy
JavaScript. The `activateRowActions_()` call four lines above the click
(line 846) binds the arrows directly, and `initialize()` unbinds and
binds them again; the other scripted clicks act on grids already set up.

Tried on `main` in the three apps: the Steps' Expected held. "Installed
Plugins" keeps its filter open after "Search". With the filters hidden,
"Items per page" "10" redraws the list and leaves them hidden; a row's
"Settings" arrow still opens "Edit" and "Remove" after a filtered redraw;
"Search" still shows and hides the filters.

**Alternatives**:

- Wrap the click in `$(function() {…})`, as `pkp/pkp-lib#3404` did for
  `UrlInDivHandler`: it runs after the new grid's set-up because ready
  callbacks run in the order they were added, and it would also survive a
  grid set up at once. It relies on that queue order rather than on the
  grid saying it is ready; either works today.
- Drop the `$(function() {…})` wrapper in `grid.tpl` so the handler is set
  up at once: the script comes before the grid's markup, so it would have
  to move below it, which changes the set-up order of every legacy grid.

**What goes with it**:

- Each app commits a rebuilt `js/pkp.min.js` (`lib/pkp/tools/buildjs.sh`),
  which serves this handler when `enable_minified` is on. No PHP, REST
  API, plugin hook or stored data changes.
- `GridHandler.js` is the same file on `main`, 3.5, 3.4 and 3.3, so the
  diff applies as written on each, with each branch's `js/pkp.min.js`
  rebuilt.
- Guard: an end-to-end check that chooses a filter entry and finds both
  filters still open with the entry chosen (spec U54, Rule 3b); the
  legacy JavaScript has no unit test harness.

Small: a few lines in one pkp-lib file and the usual `js/pkp.min.js`
rebuild.

## Evidence
## Evidence

- Kept script, on an install loaded from PKP's default test dataset
  (PostgreSQL; pkp/datasets 38ab955, 2026-09-30):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-filters-hide-after-choice/walk.js)
  takes steps 1-8, reading the form's visibility as the redraw answers and
  1.5 s later, then the neighbour checks (a row's arrow after the redraw,
  "Search" twice, "Items per page" "10" with the filters hidden, the
  "Installed Plugins" filter). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/roles-filters-hide-after-choice/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/roles-filters-hide-after-choice/fix.diff ojs omp ops`,
  the script, then `revert` with the same arguments. The dataset's
  configuration has `enable_minified = Off`, so the patched source file
  was served; `js/pkp.min.js` was not rebuilt.
- The script also runs `jQuery(function () {…})` in the page after load:
  on `main` and 3.5, all three apps, jQuery 3.7.1 did not run it at once.
  The jQuery 1.x behaviour before the 2018 update is read from the code
  and jQuery 3.0's upgrade notes ("document-ready handlers are now
  asynchronous"), not walked.
- No request answered 500 and no page script failed, with or without the
  fix, apart from the Plugin Gallery's list on Settings › Website ›
  Plugins, which fails on these test installs because they have no route
  to pkp's plugin server.
- Tips walked: `main` OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7
  (pkp-lib 2e377d27fc for OJS, 3dc90c81a6 for OMP and OPS); 3.5 OJS
  92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (pkp-lib a9c76aed62).
  `GridHandler.js` is the same file at these commits and at the 3.4 and
  3.3 ones below (`git diff` empty).
- Code read for 3.4 (pkp-lib `stable-3_4_0` df13621c2d, OJS 9571d8fde7)
  and 3.3 (pkp-lib `stable-3_3_0` d446601ebe, OJS 9fdb9bcf9a):
  `GridHandler.js` lines 836-851 (the same re-open) and 543 (the same
  hide), `grid.tpl` line 17 (the same ready callback),
  `userGroupsGridFilter.tpl` (both filters, submitted on change), the
  "Search" action in `GridHandler.php` (3.3: `GridHandler.inc.php`), and
  `composer.json` (`components/jquery` 3.7.1 on both). The three apps
  take all of it from pkp-lib.
- Introduced: `git blame` puts line 850 at 6f68fc9819 (2015-08-05, a
  rebase that renamed the link's class) and the re-open itself at
  380b4da2b6 (2015-01-16), when pkp-lib required jQuery 1.11. 5ff57ad155
  moved `components/jquery` from 1.* to 3.* (1.12.4 to 3.3.1); PR
  `pkp/pkp-lib#4175` ("Update JQuery/JQueryUI to modern") merged it. Its
  first tag is `3_1_2-0`; `stable-3_1_1`'s `composer.json` pins jQuery
  1.11.0.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by "grid
  filter hidden", "search form hides grid", "filter disappears", "filter
  closes", "roles filter search", `isFilterVisible` and
  `replaceGridResponseHandler`; `pkp/pkp-lib#12944` (the stage list
  answered 500, fixed) and `pkp/pkp-lib#8696` (paging kept across user
  searches) are other faults on the same lists.
- Not walked: the other grids under Reach apart from "Installed Plugins",
  a redraw by paging or a saved change with the form open, and any release
  before 3.5 (the 3.1.1 behaviour is read from the code).
