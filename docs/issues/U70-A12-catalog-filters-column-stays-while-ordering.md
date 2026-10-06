# Catalog ordering: an open "Filters" column still switches the list and can hide "Save Order" and "Cancel"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** [56b809dcd2](https://github.com/pkp/ui-library/commit/56b809dcd2ff5c472be84c418f7c9af952fbfe68) · 2017-09-05 · Nate Wright (NateWr), the list's first version, without a PR
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press's Catalog page, "Order Features" hides the "Filters" button
but not a "Filters" column that is already open. Choosing a category or
series there while ordering switches the rows to that list's books, and
the notice then names it ("…in Psychology."). The arrow moves made so
far are dropped without a word.

Where the chosen list has a featured book, "Save Order" stays and saves
that list's order, not the one the editor was arranging. Where nothing
in it is featured, the page shows only the notice: no rows, no "Save
Order", no "Cancel". Clearing the filter or reloading brings them back.

The editor expects the column to be hidden while ordering, as the
"Filters" button is.

## Impact

- **Lost**: the moves made since "Order Features"; what is stored is
  never wrong, as a save stores the order of the list on screen.
- **Who**: press managers and editors ordering featured books.
  Ordering a category's or a series' featured books starts with the
  column open, because choosing the category or series there leaves it
  open.
- **Way round**: clear the filter or reload, then make the moves again.

Low: nothing stored goes wrong and the page can be put right on screen;
the cost is a few arrow presses made again.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. Its two published books,
  5 "Bomb Canada and Other Unkind Remarks in the American Media" (no
  series) and 14 "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots" (series "Psychology"), are featured nowhere. Step 3
  features both in the whole catalog only, so "Psychology" still has
  nothing featured.

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open the Catalog page (`/index.php/publicknowledge/en/manageCatalog`).
3. Press the "Featured" box of "Bomb Canada and Other Unkind Remarks in
   the American Media", then that of "From Bricks to Brains: The
   Embodied Cognitive Science of LEGO Robots".
4. Press "Filters". The "Filters" column opens on the left, with
   "Categories" and "Series".

A series with nothing featured:

5. Press "Order Features". The rows read "Bomb Canada …", "From Bricks
   to Brains: …".
6. Press the down arrow of "Bomb Canada …".
7. In the "Filters" column, under "Series", press "Psychology".
8. Press the cross "Clear filter: Psychology".

A series with a featured book (on a freshly loaded dataset, after
steps 1 to 4):

9. In the "Filters" column press "Psychology", then the "Featured" box
   of "From Bricks to Brains: …".
10. Press the cross "Clear filter: Psychology".
11. Press "Order Features". The rows read "Bomb Canada …", "From Bricks
    to Brains: …".
12. Press the down arrow of "Bomb Canada …".
13. In the "Filters" column press "Psychology".
14. Press "Save Order".
15. Reload the page and press "Order Features".

**Expected.** At steps 5 and 11 the "Filters" column is hidden along
with the "Filters" button, "Search" and "Add Entry", and comes back
after "Save Order" or "Cancel". Steps 7, 8 and 13 cannot be taken, and
step 14 saves the whole catalog's order with "From Bricks to Brains: …"
first.

**Observed.**

- Step 5: the notice reads "Drag-and-drop or tap the up and down
  buttons to change the order of features on the homepage."; "Filters",
  "Search" and "Add Entry" are hidden, "Save Order" and "Cancel" shown,
  and the "Filters" column stays open with all its entries.
- Step 6: the rows read "From Bricks to Brains: …", "Bomb Canada …".
- Step 7: the notice reads "Drag-and-drop or tap the up and down
  buttons to change the order of features in Psychology." and nothing
  else shows beside the column: no row, no "Save Order", no "Cancel".
- Step 8: the whole catalog is back, still in ordering, with "Save
  Order" and "Cancel", and the rows read "Bomb Canada …", "From Bricks
  to Brains: …": the move of step 6 is undone.
- Step 13: the rows change to "From Bricks to Brains: …" alone, the
  notice ends "…in Psychology.", and "Save Order" and "Cancel" stay.
- Step 14: no message; ordering ends. The order saved is Psychology's:

  ```
  POST …/_submissions/saveFeaturedOrder
  assocType=530&assocId=5&featured[0][id]=14&featured[0][seq]=0
  ```

- Step 15: the rows read "Bomb Canada …", "From Bricks to Brains: …":
  the move of step 12 was never saved.

Control: with the column closed before "Order Features", nothing on the
page switches the list while ordering, as long as the list holds 30
books or fewer (Cause, the page links).

## Cause

ui-library's `CatalogListPanel.vue` makes ordering a mode limited to the
books on screen: its `.listPanel--catalog.-isOrdering` styles hide every
control that would change them, namely the header buttons other than
"Save Order" and "Cancel" (so "Filters" and "Add Entry"), `.pkpSearch`,
the row actions and the rows not featured. The "Filters" column,
`ListPanel`'s `.listPanel__sidebar`, is shown by `isSidebarVisible`
alone, and the styles that hide controls while ordering leave it out.
So the column's entries and its "Clear filter" cross keep working.

A press on the column sets `activeFilters`, and the `fetch` mixin's
watcher fetches the chosen list while `isOrdering` stays true. The fetch
replaces the items, which drops the moves not yet saved. "Save Order"
and "Cancel" sit inside `<template v-if="canOrderCurrent">`, false when
no book of the new list is featured in it; the styles hide every row not
featured, so only the notice is left. When a book is featured there,
"Save Order" calls `setItemOrderSequence()`, which posts the new list's
`filterAssocType` and `filterAssocId`, so the save stores that list's
order.

The column has been left out of those styles since the component's
first version (2017), and each later rewrite of the styles kept them
that way.

Reach:

- The column's category and series entries and its "Clear filter" cross
  (both walked).
- The page links under the list (`Pagination`, shown when a list holds
  more than 30 books) also stay while ordering and fetch another page
  the same way (code).
- No other ordering list in ui-library has a filter column (code).

## Proposed fix

Recommended (a proposal; the team decides): add the column to the
styles that hide controls while ordering, in ui-library's
`src/components/ListPanel/submissions/CatalogListPanel.vue`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-filters-column-stays-while-ordering/fix.diff)):

```diff
 	.pkpSearch,
+	.listPanel__sidebar,
 	.listPanel__itemActions--catalog,
```

The column's open or closed state is kept: open before ordering, it is
open again after "Save Order" or "Cancel"; closed, it stays closed.

Tried on `main` with the first group of steps: at step 5 the column is
hidden with the "Filters" button, so steps 7 and 8 cannot be taken, and
"Save Order" and "Cancel" stay. A neighbour check gave the same results
with and without the fix:

- After "Cancel" or "Save Order", the column is as it was before
  ordering.
- With "Psychology" chosen before "Order Features", the notice ends
  "…in Psychology.", "Save Order" saves, and "Psychology" stays chosen.
- After "Save Order", focus is on "Order Features".
- "Filters" opens and closes the column.

**Alternatives**

- Bind `:is-sidebar-visible="isSidebarVisible && !isOrdering"` on the
  `ListPanel`: the same on screen, but `ListPanel`'s `isSidebarVisible`
  watcher moves focus into the column each time it reappears, so focus
  would jump there after every "Save Order" or "Cancel".
- Close the column in `toggleOrdering()`: also works, but the editor
  loses an open column after each ordering.
- End ordering, or ask, when the list changes: keeps the column usable
  while ordering, but needs a decision about the unsaved moves and more
  code.

**What goes with it**

- The page links (`Pagination`) could be hidden by the same styles;
  left out here as untried, and ordering across pages is the subject of
  `pkp/pkp-lib#7648` (only one page of featured books kept on "Save
  Order").
- Backport: the styles hide the same controls on 3.5, 3.4 and 3.3; the
  line goes after `.pkpSearch,` there too.
- Test: an end-to-end check that the column is hidden while ordering.

Small: one selector added to existing styles in one component.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-filters-column-stays-while-ordering/walk.js),
  on PKP's default dataset (pkp/datasets 566bb1f, 2026-10-03). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/catalog-filters-column-stays-while-ordering/walk.js [steps|nonempty|nb]`
  (`steps` takes steps 1 to 8, `nonempty` steps 1 to 4 and 9 to 15,
  `nb` the neighbour check). The fix was tried with
  `node bin/try-fix.js apply …/fix.diff omp`, `steps` and `nb` each on a
  fresh dataset, and `nb` again after `revert`.
- No request failed and no script error was logged on any walk.
- Tips walked, on PostgreSQL (the fault does not depend on the
  database): main OMP 3b0ecf794c, ui-library 280f98c5; 3.5 OMP
  9c5e24246c, ui-library d4e01883. Steps 9 to 15 were walked on main
  only.
- Code read on 3.4 (OMP 0aec65441f, ui-library ee684b34) and 3.3 (OMP
  8e72fc8836, ui-library 96959f9e): `CatalogListPanel.vue` and
  `ListPanel.vue`. The introducing commit was found by blame on the
  `-isOrdering` styles, back through b5c3fb2c (2019) to the component's
  earlier name, `CatalogSubmissionsListPanel.vue`.
