# Catalog page: once a filter is removed, the whole catalog is listed newest first, not in the press's order

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#429` for `pkp/pkp-lib#2708` · [dcd50306ed](https://github.com/pkp/omp/commit/dcd50306ed8546798992f81120a2774cdb917876) · 2017-08-14 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a3), together with [U70-A3-catalog-filter-order-reversed.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U70-A3-catalog-filter-order-reversed.md): both faults sit in OMP `CatalogListPanel::getConfig()` and can be fixed in one change, though each has its own cause and diff
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press sets its "Order of monographs" (Settings › Website ›
"Appearance" › "Setup"), for instance to "Title (Z-A)", and the Catalog
page opens in that order. Once a series or category filter has been
chosen and removed, the books that are not featured come back newest
first by publication date instead, and paging and search keep that
order until the page is reloaded. Presses on the default "Publication
date (newest first)" see no difference.

The press's order is set when the page is built but never handed to
the part of the page that rebuilds the list, which falls back to its
own default.

## Impact

- **Lost**: the press's chosen order of the books not featured, until
  the page is reloaded. Featured books keep their place at the top.
- **Who**: press managers and Press editors on Content › Catalog, on a
  press with any "Order of monographs" other than the default, each time
  they leave a filter.
- **Way round**: reload the page.

Low: every action on the page still acts on the book it is pressed for,
and nothing saved changes; the list only reads in another order. It
would be medium if the order fed anything readers see or the press
saves.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. It has two published books, both
  published on the day the dataset was built: "Bomb Canada and Other
  Unkind Remarks in the American Media" (submission 5) and "From Bricks
  to Brains: The Embodied Cognitive Science of LEGO Robots" (submission
  14). The press has no "Order of monographs" chosen, which lists newest
  first. No book is featured.
- "How Canadians Communicate: Contexts of Canadian Popular Culture"
  (submission 4) is in Production. Steps 2 to 4 publish it with an older
  date, so that newest first and the press's order differ whatever the
  day.

1. Sign in as `dbarnes` (Press editor).
2. Open submission 4
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`),
   Publication › "Catalog Entry".
3. "Date Published": 2020-01-01; "Series": "Psychology" (any series or
   category will do for step 7; this one only keeps the filtered list
   from being empty); "Save".
4. "Publish", and "Publish" in "Schedule For Publication".
5. Settings › Website › "Appearance" › "Setup": "Order of monographs"
   "Title (Z-A)"; "Save".
6. Open Catalog (`/index.php/publicknowledge/en/manageCatalog`).
7. "Filters", and under "Series" press "Psychology".
8. Press "Psychology" again, which removes the filter.

**Expected**: in steps 6 and 8, "How Canadians Communicate…", "From
Bricks to Brains…", "Bomb Canada…" (Title Z to A).

**Observed**: step 6 is as expected. In step 8 "How Canadians
Communicate…" comes last, after the two books dated today (whose order
between them is not fixed), and the list's request asks for the
publication date:

```
GET …/api/v1/_submissions?…&orderBy=datePublished&orderDirection=1
```

## Cause

OMP `CatalogListPanel::getConfig()`
(`classes/components/listPanels/CatalogListPanel.php`) writes the
press's order into the page's configuration and then replaces the whole
array, lines 53 to 66:

```php
        $config['catalogSortBy'] = $catalogSortBy;
        $config['catalogSortDir'] = $catalogSortDir;

        $this->getParams = array_merge(
            …
        );

        $config = parent::getConfig();
```

So the page never receives `catalogSortBy` and `catalogSortDir`.
`ManageCatalogHandler::index()` also passes them to the constructor, but
`ListPanel::set()` keeps only the properties the class declares, and it
declares neither.

ui-library `CatalogListPanel.vue` then keeps its prop defaults,
`datePublished` and `1`. Its `updateSortOrder()`, run whenever the
filter changes, takes the list's `orderBy` and `orderDirection` from
those defaults once no filter is left. lib/pkp
`PKPBackendSubmissionsController::getSubmissionCollector()` reads any
direction but `ASC` as descending.

The first load is right, because the server builds it with the press's
order (`ManageCatalogHandler::index()`'s query and the panel's
`getParams`). Paging and search are right too until a filter is first
chosen. The two lines landed above `parent::getConfig()` when
`pkp/omp#429` moved the order out of `$config['constants']`, which was
set after that call.

Reach:

- Every press order other than the default (walked: "Title (Z-A)").
- Every way back to the whole catalog: pressing the chosen filter again
  (walked) and its "Clear filter" cross, which both empty the active
  filters (code). Choosing another filter applies that filter's order.
- Paging and search reuse the list's parameters, so they keep the wrong
  order until a reload (code).

## Proposed fix

Set the two values after `parent::getConfig()`, where the class sets its
other values, and let ui-library take the direction as the string the
endpoint expects
([fix-press-order.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-page-order-with-filter/fix-press-order.diff),
OMP and ui-library):

```diff
-        $config['catalogSortBy'] = $catalogSortBy;
-        $config['catalogSortDir'] = $catalogSortDir;
-
         $this->getParams = array_merge(
…
         $config = parent::getConfig();
 
+        // The press's own order, which the list goes back to when a filter is removed
+        $config['catalogSortBy'] = $catalogSortBy;
+        $config['catalogSortDir'] = $catalogSortDir;
+
```

```diff
-		/** One of the `SORT_DIRECTION_*` constants. Default: `SORT_DIRECTION_ASC` */
+		/** The press's sort direction, `ASC` or `DESC`. Default: `DESC` */
 		catalogSortDir: {
-			type: Number,
+			type: String,
 			default() {
-				return 1; // SORT_DIRECTION_ASC
+				return 'DESC';
```

and the story's `catalogSortDir: '1'` becomes `'DESC'`. With the server
fix alone the page works, but it hands `'ASC'` or `'DESC'` to a prop
typed as a number: the built app does not check prop types (the walk
with the server fix alone logged no warning), but Vue's development
build does, and would warn on every load of the page.

Tried on `main`: with the fix in, step 8 listed Z to A and its request
asked for `orderBy=title&orderDirection=DESC`. On a press at the
default order, a removed filter gave newest first with the fix in and
out. The diff applies together with the companion report's.

**Alternatives**

- Declaring `catalogSortBy` and `catalogSortDir` on the class, so the
  values the handler already passes are kept: also works, but leaves
  two places parsing the press's option.
- Having the page remember its first `getParams` order: a ui-library
  change that leaves the unused props behind.

**What goes with it**

- No API, hook or template change. Backport: the same lines on 3.5 and
  3.4; on 3.3 the same two lines move in `CatalogListPanel.inc.php`,
  and its ui-library prop is the same.
- Test: a check that a press on "Title (Z-A)" keeps that order after a
  filter is chosen and removed.

Medium: two repositories, though each change is a few lines.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/catalog-page-order-with-filter/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-page-order-with-filter/walk.js)
  (helpers in its `lib.js`), one walk for both A3 reports; these Steps
  are its steps 1 to 8, and it records each list's titles and each list
  request's `orderBy` and `orderDirection`. `MODE=neighbour` runs the
  default-order check named under "Tried".
- Walked on `main` and `stable-3_5_0`, PostgreSQL, the default datasets
  of pkp/datasets 566bb1f (2026-10-03); both gave the same Observed and
  request. Books with the same publication date have no set order
  between them, so only the 2020 book's last place is checked (MySQL not
  checked).
- 3.4 (code): OMP `upstream/stable-3_4_0` `CatalogListPanel.php` sets
  the two values at lines 52 and 53, before `parent::getConfig()` at
  line 65; ui-library `stable-3_4_0` `CatalogListPanel.vue` has the
  defaults `datePublished` and `1` and the same `updateSortOrder()`;
  lib/pkp's list endpoint reads anything but `ASC` as descending.
- 3.3 (code): OMP `CatalogListPanel.inc.php` sets them at lines 45 and
  46, before `parent::getConfig()` at line 58; ui-library `stable-3_3_0`
  has the same defaults; lib/pkp `PKPBackendSubmissionsHandler` turns
  any `orderDirection` but `ASC` into `DESC`.
- Introduced: before `dcd50306ed` the order travelled in
  `$config['constants']` in OMP
  `controllers/list/submissions/CatalogSubmissionsListHandler.inc.php`,
  set after `parent::getConfig()`; that commit moved it into
  `$config['catalogSortBy']` and `['catalogSortDir']` above the call.
  The class later became `CatalogListPanel.inc.php` (`a9e5b9fda9`). The
  commit predates the oldest release tag in the OMP repository
  (3.1.2-0).
- Branch tips: main OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); 3.5 OMP 9c5e24246c (lib/pkp cf3f984335, lib/ui-library
  d4e01883); 3.4 OMP 0aec65441f (lib/pkp 767353f4fe, lib/ui-library
  ee684b34); 3.3 OMP 8e72fc8836 (lib/pkp ac3fa73402, lib/ui-library
  96959f9e).
